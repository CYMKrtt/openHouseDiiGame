import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
await db.exec('create role anon; create role authenticated; create role service_role; alter default privileges in schema public grant select on tables to public;');
await db.exec(await readFile(new URL('../../supabase/migrations/202611070001_m3_core.sql', import.meta.url), 'utf8'));
await db.exec(await readFile(new URL('../../supabase/migrations/202611070002_m3_host_auth.sql', import.meta.url), 'utf8'));
await db.exec(await readFile(new URL('../../supabase/migrations/202611070003_m3_request_limits.sql', import.meta.url), 'utf8'));
after(()=>db.close());
const hash=n=>n.toString(16).padStart(64,'0');
const rpc=async(name,params)=> (await db.query(`select public.${name}(${params.map((_,i)=>'$'+(i+1)).join(',')}) as value`,params)).rows[0].value;
test('retries retain seat, duplicates allowed, capacity is capped', async()=>{
 const first=await rpc('m3_join',[hash(1),'Same']); assert.equal((await rpc('m3_join',[hash(1),'Ignored'])).playerId,first.playerId);
 for(let i=2;i<=15;i++) await rpc('m3_join',[hash(i),'Same']);
 await assert.rejects(()=>rpc('m3_join',[hash(16),'No seat']),/CAPACITY_FULL/);
 assert.equal((await rpc('m3_host_state',[])).reservedCount,15);
});
test('distinct presence and stale disconnect preserve reservations',async()=>{
 const c1=randomUUID(),g1=randomUUID(),c2=randomUUID(),g2=randomUUID();
 await rpc('m3_heartbeat',[hash(1),c1,g1]); await rpc('m3_heartbeat',[hash(1),c2,g2]);
 assert.equal((await rpc('m3_public_state',[])).onlineCount,1);
 await rpc('m3_disconnect',[hash(1),c1,randomUUID()]);assert.equal((await rpc('m3_public_state',[])).onlineCount,1);
 await rpc('m3_disconnect',[hash(2),c1,g1]);assert.equal((await rpc('m3_public_state',[])).onlineCount,1);
 await rpc('m3_disconnect',[hash(1),c1,g1]);assert.equal((await rpc('m3_public_state',[])).onlineCount,1);
 await rpc('m3_disconnect',[hash(1),c2,g2]);assert.equal((await rpc('m3_public_state',[])).onlineCount,0);
 assert.equal((await rpc('m3_host_state',[])).reservedCount,15);
 await assert.rejects(()=>rpc('m3_heartbeat',[hash(1),c1,g1]),/CONNECTION_CONFLICT/);
 const fresh=randomUUID(), freshGen=randomUUID(); await rpc('m3_heartbeat',[hash(1),fresh,freshGen]); await db.query("update public.m3_connections set lease_expires_at=clock_timestamp()-interval '1 second' where id=$1",[fresh]);
 assert.equal((await rpc('m3_public_state',[])).onlineCount,0);
});
test('anon cannot read roster or execute privileged functions',async()=>{
 await db.exec('set role anon');
 try {await assert.rejects(()=>db.query('select * from public.m3_players'),/permission denied/); await assert.rejects(()=>rpc('m3_host_state',[]),/permission denied/); const r=await db.query('select revision from public.m3_revision_notice');assert.equal(r.rows.length,1);} finally {await db.exec('reset role');}
});

test('host access tokens expire or revoke and login attempts are limited',async()=>{
 const hostHash=hash(990);assert.equal(await rpc('m3_host_authenticated',[hostHash]),false);
 await rpc('m3_create_host_session',[hostHash]);assert.equal(await rpc('m3_host_authenticated',[hostHash]),true);
 await rpc('m3_revoke_host_session',[hostHash]);assert.equal(await rpc('m3_host_authenticated',[hostHash]),false);
 const expired=hash(991);await rpc('m3_create_host_session',[expired]);await db.query("update public.m3_host_sessions set expires_at=clock_timestamp()-interval '1 second' where token_hash=$1",[expired]);assert.equal(await rpc('m3_host_authenticated',[expired]),false);
 for(let i=0;i<5;i++)assert.equal(await rpc('m3_reserve_login_attempt',[]),true);
 assert.equal(await rpc('m3_reserve_login_attempt',[]),false);
 await db.exec('set role anon');try{await assert.rejects(()=>rpc('m3_create_host_session',[hostHash]),/permission denied/)}finally{await db.exec('reset role')}
});

test('16 competing calls never reserve more than 15 in embedded PostgreSQL',async()=>{
 const other=new PGlite();try{
  await other.exec('create role anon; create role authenticated; create role service_role;');
  await other.exec(await readFile(new URL('../../supabase/migrations/202611070001_m3_core.sql', import.meta.url),'utf8'));
  const results=await Promise.allSettled(Array.from({length:16},(_,i)=>other.query('select public.m3_join($1,$2)',[hash(i+100),'Concurrent'])));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,15);assert.equal(results.filter(r=>r.status==='rejected').length,1);
  assert.equal((await other.query('select count(*)::integer as n from public.m3_players')).rows[0].n,15);
 } finally {await other.close()}
});

test('committed session permits existing identity but rejects a new one',async()=>{
 await db.exec("update public.m3_session set status='committed' where singleton");
 try{const player=await rpc('m3_join',[hash(1),'Changed']);assert.equal(player.displayName,'Same');assert.equal(player.phase,'committed');await assert.rejects(()=>rpc('m3_join',[hash(99),'New']),/SESSION_STARTED/)}finally{await db.exec("update public.m3_session set status='waiting' where singleton")}
});




test('shared request limits throttle a caller and recover after the window',async()=>{
 const key=hash(9999);for(let i=0;i<120;i++)assert.equal(await rpc('m3_allow_request',[key]),true);
 assert.equal(await rpc('m3_allow_request',[key]),false);
 await db.query("update public.m3_request_limits set window_start=clock_timestamp()-interval '61 seconds' where bucket=$1",['id:'+key]);
 assert.equal(await rpc('m3_allow_request',[key]),true);
 await db.exec('set role anon');try{await assert.rejects(()=>rpc('m3_allow_request',[key]),/permission denied/)}finally{await db.exec('reset role')}
});
