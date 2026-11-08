import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';

export type CompanyId='tech'|'design'|'ecommerce';
export type PublicSession = {phase:'waiting'|'committed'; onlineCount:number; capacity:number; revision:number; serverTime:string;revealStartAt:string|null};
export type Player = {playerId:string;displayName:string;phase:'waiting'|'committed';companyId:CompanyId|null;revealStartAt:string|null;serverTime:string};
export type HostSession = PublicSession & {reservedCount:number;confirmationToken:string;players:Array<{id:string;displayName:string;isOnline:boolean;companyId:CompanyId|null}>};
export class ServiceError extends Error { constructor(public code:string,public status:number){super(code)} }
async function request<T>(path:string, body?:object, keepalive=false):Promise<T>{
 const response=await fetch(`/api/v1/${path}`,{method:body===undefined?'GET':'POST',headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',credentials:'same-origin',keepalive});
 const data=await response.json();if(!response.ok)throw new ServiceError(data.code||'SERVICE_UNAVAILABLE',response.status);return data as T;
}
export const multiplayer = {
 bootstrap:()=>request<{own:Player|null;state:PublicSession}>('bootstrap'),
 join:(displayName:string)=>request<Player>('join',{displayName}),
 me:()=>request<Player>('me'),
 session:()=>request<PublicSession>('session'),
 hostLogin:(password:string)=>request<{ok:boolean}>('host/login',{password}),
 hostLogout:()=>request<{ok:boolean}>('host/logout',{}),
 hostSession:()=>request<HostSession>('host/session'),
 hostStart:(confirmationToken:string)=>request<PublicSession & {alreadyCommitted:boolean}>('host/start',{confirmationToken,requestId:crypto.randomUUID()}),
};

/** Realtime messages are hints. All counts come from the server and polls re-evaluate expired leases. */
export function watchLobby(onState:(state:PublicSession|null)=>void){
 let data={connectionId:crypto.randomUUID(),generation:crypto.randomUUID()};let stopped=false;let verified=false;let epoch=0;let latestServerTime='';let realtime:SupabaseClient|undefined;let channel:RealtimeChannel|undefined;
 const publish=(state:PublicSession)=>{if(!stopped&&verified&&state.serverTime>=latestServerTime){latestServerTime=state.serverTime;onState(state)}};
 const refresh=async()=>{try{const state=await multiplayer.session();publish(state)}catch{if(!stopped)onState(null)}};
 const beat=async()=>{const current=epoch;try{const state=await request<PublicSession>('presence/heartbeat',data);if(current!==epoch)return;verified=true;publish(state)}catch{if(current!==epoch)return;verified=false;if(!stopped)onState(null)}};
 const foreground=()=>{if(document.visibilityState==='visible')void beat()};
 const disconnected=()=>{epoch++;verified=false;if(!stopped)onState(null)};
 const pagehide=()=>{epoch++;verified=false;navigator.sendBeacon('/api/v1/presence/disconnect',JSON.stringify(data))};
 const pageshow=(event:PageTransitionEvent)=>{if(event.persisted){epoch++;data={connectionId:crypto.randomUUID(),generation:crypto.randomUUID()};void beat()}};
 void beat();const heartbeatTimer=window.setInterval(()=>void beat(),15000);const pollTimer=window.setInterval(()=>void refresh(),2000);
 document.addEventListener('visibilitychange',foreground);window.addEventListener('online',foreground);window.addEventListener('offline',disconnected);window.addEventListener('pagehide',pagehide);window.addEventListener('pageshow',pageshow);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(url&&key){realtime=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});channel=realtime.channel('m3-revision').on('postgres_changes',{event:'UPDATE',schema:'public',table:'m3_revision_notice'},()=>void refresh()).subscribe();}
 return ()=>{stopped=true;clearInterval(heartbeatTimer);clearInterval(pollTimer);document.removeEventListener('visibilitychange',foreground);window.removeEventListener('online',foreground);window.removeEventListener('offline',disconnected);window.removeEventListener('pagehide',pagehide);window.removeEventListener('pageshow',pageshow);void request('presence/disconnect',data,true).catch(()=>{});if(realtime&&channel)void realtime.removeChannel(channel);};
}
