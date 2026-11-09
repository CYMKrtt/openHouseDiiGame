import { NextRequest, NextResponse } from 'next/server';
import { hash, hostConfirmation, isToken, token, validHostConfirmation, verifyPassword } from '@/server/auth';
import { rpc } from '@/server/database';
import { normalizeDisplayName } from '@/server/validation';
import { isCompleteAnswers, scoreQuiz } from '@/lib/quizScoring';

export const runtime = 'nodejs';
const playerCookie='lw_player', hostCookie='lw_host';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Context={params:Promise<{path:string[]}>};
function response(data:unknown,status=200){return NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});}
function error(code:string,status:number){return response({code},status);}
function cookieOptions(maxAge:number){return {httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict' as const,path:'/',maxAge};}
function identity(req:NextRequest,name:string){const value=req.cookies.get(name)?.value;return isToken(value)?hash(value):null;}

function sameOrigin(req:NextRequest){
 const previewHost=process.env.VERCEL_ENV==='preview'?process.env.VERCEL_URL:undefined;
 const expected=process.env.APP_ORIGIN||(previewHost?`https://${previewHost}`:undefined);
 return !!expected&&req.headers.get('origin')===expected;
}
async function body(req:NextRequest):Promise<Record<string,unknown>> {
 const reader=req.body?.getReader();if(!reader)throw new Error('INVALID_INPUT');
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();throw new Error('INVALID_INPUT')}chunks.push(value)}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 const value:unknown=JSON.parse(new TextDecoder().decode(bytes));if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('INVALID_INPUT');return value as Record<string,unknown>;
}
async function allowed(req:NextRequest,name=playerCookie){return rpc<boolean>('m3_allow_request',{p_key:identity(req,name)??hash('anonymous')});}
async function hostAllowed(req:NextRequest){const h=identity(req,hostCookie);return h && await rpc<boolean>('m3_host_authenticated',{p_hash:h});}
function handle(err:unknown){
 const message=err instanceof Error?err.message:'';
 if(message.includes('CAPACITY_FULL'))return error('CAPACITY_FULL',409);
 if(message.includes('SESSION_STARTED'))return error('SESSION_STARTED',409);
 if(message.includes('PLAYER_REQUIRED'))return error('PLAYER_REQUIRED',401);
 if(message.includes('CONNECTION_CONFLICT'))return error('CONNECTION_CONFLICT',409);
 if(message.includes('START_CONDITION_NOT_MET'))return error('START_CONDITION_NOT_MET',409);
 if(message.includes('ROUND_CHANGED'))return error('ROUND_CHANGED',409);
 if(message.includes('REVEAL_IN_PROGRESS'))return error('REVEAL_IN_PROGRESS',409);
 if(message.includes('HOST_AUTH_REQUIRED'))return error('HOST_AUTH_REQUIRED',401);
 if(message.includes('INVALID_INPUT') || err instanceof SyntaxError)return error('INVALID_INPUT',422);
 return error('SERVICE_UNAVAILABLE',503);
}
export async function GET(req:NextRequest,ctx:Context){
 try {
  const route=(await ctx.params).path.join('/');
  if(route==='bootstrap'){
   if(!await allowed(req))return error('RATE_LIMITED',429);
   const existing=req.cookies.get(playerCookie)?.value;const value=isToken(existing)?existing:token();
   const snapshot=await rpc<unknown>('m5_bootstrap',{p_hash:hash(value)});
   const out=response(snapshot);if(!isToken(existing))out.cookies.set(playerCookie,value,cookieOptions(60*60*24*30));return out;
  }
  if(route==='session'){if(!await allowed(req))return error('RATE_LIMITED',429);return response(await rpc('m3_public_state'));}
  if(route==='me'){const id=identity(req,playerCookie);if(!id)return error('PLAYER_REQUIRED',401);if(!await allowed(req))return error('RATE_LIMITED',429);const data=await rpc('m3_player_state',{p_hash:id});return data?response(data):error('PLAYER_REQUIRED',401);}
  if(route==='host/session'){
   const h=identity(req,hostCookie);
   if(!h||!await hostAllowed(req))return error('HOST_AUTH_REQUIRED',401);
   if(!await allowed(req,hostCookie))return error('RATE_LIMITED',429);
   const state=await rpc<{roundId:string;canNextRound:boolean}>('m3_host_state');
   return response({...state,confirmationToken:hostConfirmation(h,'start',state.roundId),
    nextRoundToken:state.canNextRound?hostConfirmation(h,'next-round',state.roundId):null});
  }
  return error('NOT_FOUND',404);
 }catch(err){return handle(err)}
}
export async function POST(req:NextRequest,ctx:Context){
 try {
  if(!sameOrigin(req))return error('ORIGIN_REJECTED',403);
  const route=(await ctx.params).path.join('/');const payload=await body(req);
  if(route==='host/login'){
   if(typeof payload.password!=='string'||payload.password.length>256)return error('INVALID_INPUT',422);
   if(!await allowed(req))return error('RATE_LIMITED',429);
   if(!await rpc<boolean>('m3_reserve_login_attempt'))return error('RATE_LIMITED',429);
   if(!await verifyPassword(payload.password))return error('INVALID_CREDENTIALS',401);
   const value=token();await rpc('m3_create_host_session',{p_hash:hash(value)});const out=response({ok:true});out.cookies.set(hostCookie,value,cookieOptions(8*60*60));return out;
  }
  if(route==='host/logout'){const h=identity(req,hostCookie);if(h)await rpc('m3_revoke_host_session',{p_hash:h});const out=response({ok:true});out.cookies.set(hostCookie,'',cookieOptions(0));return out;}
  if(route==='host/start'||route==='host/next-round'){
   const h=identity(req,hostCookie);if(!h||!await hostAllowed(req))return error('HOST_AUTH_REQUIRED',401);
   const action=route==='host/start'?'start':'next-round';
   const roundId=payload.roundId;
   if(typeof roundId!=='string'||!uuid.test(roundId)||!validHostConfirmation(h,action,roundId,payload.confirmationToken))return error('CONFIRMATION_REQUIRED',403);
   if(!await allowed(req,hostCookie))return error('RATE_LIMITED',429);
   return response(action==='start'
    ?await rpc('m5_start',{p_round:roundId,p_source:'host'})
    :await rpc('m5_next_round',{p_round:roundId,p_host_hash:h}));
  }
  const id=identity(req,playerCookie);if(!id)return error('PLAYER_REQUIRED',401);
  if(!await allowed(req))return error('RATE_LIMITED',429);
  if(route==='join'||route==='quiz'||route==='presence/heartbeat'||route==='presence/disconnect'){
   if(typeof payload.roundId!=='string'||!uuid.test(payload.roundId))return error('ROUND_CHANGED',409);
  }
  if(route==='quiz'){
   if(!isCompleteAnswers(payload.answers))return error('INVALID_INPUT',422);
   // Score on the server; the client only sends which track each answer belongs to.
   const {candidates}=scoreQuiz(payload.answers);
   return response(await rpc('m6_submit_quiz',{p_round:payload.roundId,p_hash:id,p_answers:payload.answers,p_candidates:candidates}));
  }
  if(route==='join'){const name=normalizeDisplayName(payload.displayName);if(name===null)return error('INVALID_NAME',422);return response(await rpc('m5_join',{p_round:payload.roundId,p_hash:id,p_name:name}));}
  if(route==='presence/heartbeat'||route==='presence/disconnect'){
   if(typeof payload.connectionId!=='string'||typeof payload.generation!=='string'||!uuid.test(payload.connectionId)||!uuid.test(payload.generation))return error('INVALID_INPUT',422);
   return response(await rpc('m5_presence',{p_round:payload.roundId,p_hash:id,p_connection:payload.connectionId,p_generation:payload.generation,p_disconnect:route.endsWith('disconnect')}));
  }
  return error('NOT_FOUND',404);
 }catch(err){return handle(err)}
}
