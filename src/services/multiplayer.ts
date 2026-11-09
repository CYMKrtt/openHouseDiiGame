import { createClient } from '@supabase/supabase-js';

import type { Track } from '@/lib/quizScoring';
export type CompanyId='tech'|'design'|'ecommerce';
export type PublicSession = {roundId:string;phase:'waiting'|'committed'; onlineCount:number; capacity:number; revision:number; serverTime:string;revealStartAt:string|null};
export type Player = {roundId:string;playerId:string;displayName:string;phase:'waiting'|'committed';companyId:CompanyId|null;revealStartAt:string|null;serverTime:string;quizAnswers?:Track[]|null};
export type HostSession = PublicSession & {reservedCount:number;confirmationToken:string;canNextRound:boolean;nextRoundToken:string|null;players:Array<{id:string;displayName:string;isOnline:boolean;companyId:CompanyId|null}>};
export class ServiceError extends Error { constructor(public code:string,public status:number){super(code)} }
async function request<T>(path:string, body?:object, keepalive=false):Promise<T>{
 const response=await fetch(`/api/v1/${path}`,{method:body===undefined?'GET':'POST',headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',credentials:'same-origin',keepalive});
 const data=await response.json();if(!response.ok)throw new ServiceError(data.code||'SERVICE_UNAVAILABLE',response.status);return data as T;
}
export const multiplayer = {
 bootstrap:()=>request<{own:Player|null;state:PublicSession}>('bootstrap'),
 join:(roundId:string,displayName:string)=>request<Player>('join',{roundId,displayName}),
 me:()=>request<Player>('me'),
 submitQuiz:(roundId:string,answers:Track[])=>request<Player>('quiz',{roundId,answers}),
 session:()=>request<PublicSession>('session'),
 hostLogin:(password:string)=>request<{ok:boolean}>('host/login',{password}),
 hostLogout:()=>request<{ok:boolean}>('host/logout',{}),
 hostSession:()=>request<HostSession>('host/session'),
 hostStart:(roundId:string,confirmationToken:string)=>request<PublicSession & {alreadyCommitted:boolean}>('host/start',{roundId,confirmationToken}),
 hostNextRound:(roundId:string,confirmationToken:string)=>request<{roundId:string;alreadyRotated:boolean}>('host/next-round',{roundId,confirmationToken}),
};

export function watchSession(onState:(state:PublicSession|null)=>void,pollMs:number){
 let stopped=false,refreshing=false;
 async function refresh(){
  if(stopped||refreshing)return;
  refreshing=true;
  try{const state=await multiplayer.session();if(!stopped)onState(state)}
  catch{if(!stopped)onState(null)}
  finally{refreshing=false}
 }
 const timer=window.setInterval(refresh,pollMs);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const realtime=url&&key?createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}):null;
 const channel=realtime?.channel('m3-revision').on('postgres_changes',{event:'UPDATE',schema:'public',table:'m3_revision_notice'},()=>void refresh()).subscribe();
 return ()=>{stopped=true;clearInterval(timer);if(realtime&&channel)void realtime.removeChannel(channel)};
}

/** Realtime messages are hints. All counts come from the server and polls re-evaluate expired leases. */
export function watchLobby(roundId:string,onState:(state:PublicSession|null)=>void,onRoundChanged:()=>void){
 const connection=()=>({roundId,connectionId:crypto.randomUUID(),generation:crypto.randomUUID()});
 let data=connection(),stopped=false,verified=false,epoch=0,latestRevision=-1,latestServerTime='';
 const publish=(state:PublicSession)=>{
  if(stopped)return;
  if(state.roundId!==roundId){onRoundChanged();return}
  if(!verified||state.revision<latestRevision)return;
  if(state.revision===latestRevision&&state.serverTime<latestServerTime)return;
  latestRevision=state.revision;latestServerTime=state.serverTime;onState(state);
 };
 const beat=async()=>{
  const current=epoch;
  try{const state=await request<PublicSession>('presence/heartbeat',data);if(stopped||current!==epoch)return;verified=true;publish(state)}
  catch(error){
   if(stopped||current!==epoch)return;
   verified=false;
   if(error instanceof ServiceError&&error.code==='ROUND_CHANGED')onRoundChanged();else onState(null);
  }
 };
 const foreground=()=>{if(document.visibilityState==='visible')void beat()};
 const disconnected=()=>{epoch++;verified=false;if(!stopped)onState(null)};
 const pagehide=()=>{epoch++;verified=false;navigator.sendBeacon('/api/v1/presence/disconnect',JSON.stringify(data))};
 const pageshow=(event:PageTransitionEvent)=>{if(event.persisted){epoch++;data=connection();void beat()}};
 void beat();const heartbeatTimer=window.setInterval(()=>void beat(),15000);
 const stopWatching=watchSession(state=>{if(state)publish(state);else onState(null)},2000);
 document.addEventListener('visibilitychange',foreground);window.addEventListener('online',foreground);window.addEventListener('offline',disconnected);window.addEventListener('pagehide',pagehide);window.addEventListener('pageshow',pageshow);
 return ()=>{stopped=true;clearInterval(heartbeatTimer);stopWatching();document.removeEventListener('visibilitychange',foreground);window.removeEventListener('online',foreground);window.removeEventListener('offline',disconnected);window.removeEventListener('pagehide',pagehide);window.removeEventListener('pageshow',pageshow);void request('presence/disconnect',data,true).catch(()=>{});};
}
