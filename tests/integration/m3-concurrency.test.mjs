import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes,createHash,randomUUID } from 'node:crypto';
import pg from 'pg';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { isMatchingProject } from '../../scripts/m3-target.mjs';
nextEnv.loadEnvConfig(process.cwd());
const url=process.env.M3_TEST_DATABASE_URL;
const acknowledged=process.env.M3_TEST_DISPOSABLE_DATABASE==='yes';
const digest=value=>createHash('sha256').update(value).digest('hex');
const freshToken=()=>randomBytes(32).toString('base64url');
const timeout=(promise,ms)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout')),ms))]);
test('real disposable Supabase: concurrent reservations, identity, presence, RLS, realtime and Host authorization',{skip:!url||!acknowledged,timeout:120000},async()=>{
 let stage='checking the isolated project and local app';let control,realtime,channel;
 try {
  if(!isMatchingProject(process.env.SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_URL,url))throw new Error('Project mismatch');
  const publicKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!publicKey)throw new Error('Missing public key');
  const base=new URL(process.env.M3_TEST_APP_URL||'http://127.0.0.1:3100');
  if(base.protocol!=='http:'||!['127.0.0.1','localhost'].includes(base.hostname)||base.port!=='3100')throw new Error('Unsafe test app');
  const origin=base.origin;
  async function api(path,{method='GET',payload,cookie,originHeader=origin}={}){
   const res=await fetch(new URL(`/api/v1/${path}`,base),{method,headers:{...(method==='POST'?{'content-type':'application/json',origin:originHeader}:{}),...(cookie?{cookie}: {})},...(payload?{body:JSON.stringify(payload)}:{})});
   let data;try{data=await res.json()}catch{throw new Error('Non-JSON API response')}return {status:res.status,data,setCookie:res.headers.get('set-cookie')};
  }
  assert.equal((await api('session')).status,200);
  control=new pg.Client({connectionString:url,connectionTimeoutMillis:10000});await control.connect();
  stage='verifying the disposable session is empty';
  const before=await control.query('select (select count(*)::integer from public.m3_players) as players,status from public.m3_session where singleton');
  assert.equal(before.rows[0]?.players,0);assert.equal(before.rows[0]?.status,'waiting');
  stage='checking anonymous RLS and Realtime subscription';
  realtime=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const blocked=await realtime.from('m3_players').select('id');assert.ok(blocked.error || (Array.isArray(blocked.data)&&blocked.data.length===0));
  const visible=await realtime.from('m3_revision_notice').select('*');assert.equal(visible.error,null);assert.equal(visible.data.length,1);
  let changed;const event=new Promise(resolve=>{changed=resolve});channel=realtime.channel('m3-integration-'+randomUUID()).on('postgres_changes',{event:'UPDATE',schema:'public',table:'m3_revision_notice'},payload=>changed(payload));
  await timeout(new Promise((resolve,reject)=>{channel.subscribe(status=>{if(status==='SUBSCRIBED')resolve();else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')reject(new Error('Realtime unavailable'))})}),15000);
  stage='checking sixteen concurrent HTTP joins';
  const bootstraps=await Promise.all(Array.from({length:16},()=>api('bootstrap')));
  assert.ok(bootstraps.every(result=>result.status===200 && /^lw_player=[A-Za-z0-9_-]{43};/.test(result.setCookie||'')));
  const cookies=bootstraps.map(result=>result.setCookie.split(';')[0]);
  assert.equal(new Set(cookies).size,16);
  const results=await Promise.all(cookies.map((cookie,i)=>api('join',{method:'POST',cookie,payload:{displayName:`Concurrent ${i+1}`}})));
  assert.equal(results.filter(result=>result.status===200).length,15);
  assert.equal(results.filter(result=>result.status===409 && result.data.code==='CAPACITY_FULL').length,1);
  assert.equal((await control.query('select count(*)::integer as n from public.m3_players')).rows[0].n,15);
  await control.query('select public.m3_bump_revision()');
  const update=await timeout(event,15000);assert.deepEqual(Object.keys(update.new).sort(),['revision','singleton']);
  const accepted=results.findIndex(r=>r.status===200),rejected=results.findIndex(r=>r.status===409);const playerCookie=cookies[accepted];
  stage='checking identity and capacity through the server API';
  const existing=await api('me',{cookie:playerCookie});assert.equal(existing.status,200);
  const duplicate=await api('join',{method:'POST',cookie:playerCookie,payload:{displayName:'Ignored'}});assert.equal(duplicate.status,200);assert.equal(duplicate.data.playerId,existing.data.playerId);
  const full=await api('join',{method:'POST',cookie:cookies[rejected],payload:{displayName:'New'}});assert.equal(full.status,409);assert.equal(full.data.code,'CAPACITY_FULL');
  const cross=await api('join',{method:'POST',cookie:playerCookie,originHeader:'https://untrusted.example',payload:{displayName:'New'}});assert.equal(cross.status,403);
  stage='checking multi-tab presence, reconnect and server-time expiry';
  const a={connectionId:randomUUID(),generation:randomUUID()},b={connectionId:randomUUID(),generation:randomUUID()};
  assert.equal((await api('presence/heartbeat',{method:'POST',cookie:playerCookie,payload:a})).status,200);
  assert.equal((await api('presence/heartbeat',{method:'POST',cookie:playerCookie,payload:b})).data.onlineCount,1);
  assert.equal((await api('presence/disconnect',{method:'POST',cookie:playerCookie,payload:a})).data.onlineCount,1);
  assert.equal((await api('presence/disconnect',{method:'POST',cookie:playerCookie,payload:b})).data.onlineCount,0);
  const c={connectionId:randomUUID(),generation:randomUUID()};assert.equal((await api('presence/heartbeat',{method:'POST',cookie:playerCookie,payload:c})).data.onlineCount,1);
  await control.query("update public.m3_connections set lease_expires_at=clock_timestamp()-interval '1 second' where id=$1",[c.connectionId]);
  assert.equal((await api('session')).data.onlineCount,0);
  stage='checking Host authorization and session revocation';
  assert.equal((await api('host/session')).status,401);
  const incorrect=await api('host/login',{method:'POST',payload:{password:'intentionally incorrect test password'}});assert.equal(incorrect.status,401);
  const hostToken=freshToken();await control.query('select public.m3_create_host_session($1)',[digest(hostToken)]);const hostCookie=`lw_host=${hostToken}`;
  const host=await api('host/session',{cookie:hostCookie});assert.equal(host.status,200);assert.equal(host.data.reservedCount,15);
  assert.equal((await api('host/logout',{method:'POST',cookie:hostCookie,payload:{}})).status,200);assert.equal((await api('host/session',{cookie:hostCookie})).status,401);
  console.log('Real Supabase checks passed. Positive password login and browser polling fallback require separate verification.');
 } catch {
  // Connection errors and SDK messages can contain credentials. Never print them.
  console.error(`Integration check stopped during ${stage}; private details withheld.`);
  throw new Error(`Integration test failed while ${stage}; connection details withheld.`);
 } finally {
  if(channel&&realtime)await Promise.race([realtime.removeChannel(channel),new Promise(resolve=>setTimeout(resolve,1000))]).catch(()=>{});
  realtime?.realtime.disconnect();
  if(control)await control.end().catch(()=>{});
 }
});
