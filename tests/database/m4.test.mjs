import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
const migrations=await Promise.all(['202611070001_m3_core.sql','202611070002_m3_host_auth.sql','202611070003_m3_request_limits.sql','202611080001_m4_assignment_reveal.sql','202611080002_m4_reveal_lead.sql'].map(n=>readFile(new URL(`../../supabase/migrations/${n}`,import.meta.url),'utf8')));
async function fresh(){const db=new PGlite();await db.exec('create role anon; create role authenticated; create role service_role;');for(const sql of migrations)await db.exec(sql);return db}
const hash=n=>n.toString(16).padStart(64,'0');
const rpc=async(db,name,...params)=>(await db.query(`select public.${name}(${params.map((_,i)=>'$'+(i+1)).join(',')}) as value`,params)).rows[0].value;
const seats=async(db,n)=>{for(let i=1;i<=n;i++)await rpc(db,'m3_join',hash(i),`Player ${i}`)};
const online=async(db,n)=>{for(let i=1;i<=n;i++)await rpc(db,'m3_heartbeat',hash(i),randomUUID(),randomUUID())};
const assignments=async(db)=>(await db.query('select player_id,company_id from public.m4_assignments')).rows;
test('Host rejects zero online and accepts one; results remain immutable',async()=>{const db=await fresh();try{
 await seats(db,1);await assert.rejects(()=>rpc(db,'m4_start','host'),/START_CONDITION_NOT_MET/);
 assert.equal((await assignments(db)).length,0);await online(db,1);
 const first=await rpc(db,'m4_start','host');assert.equal(first.alreadyCommitted,false);assert.equal(first.phase,'committed');assert.ok(first.revealStartAt);
 const timing=(await db.query('select committed_at,reveal_start_at from public.m3_session where singleton')).rows[0];assert.equal(new Date(timing.reveal_start_at)-new Date(timing.committed_at),5000);
 const before=await assignments(db);assert.equal(before.length,1);
 assert.equal((await rpc(db,'m4_start','host')).alreadyCommitted,true);assert.deepEqual(await assignments(db),before);
 await assert.rejects(()=>db.query("update public.m4_assignments set company_id='design'"),/ASSIGNMENTS_IMMUTABLE/);
 await assert.rejects(()=>rpc(db,'m3_join',hash(99),'Late'),/SESSION_STARTED/);
}finally{await db.close()}});
test('every reserved count 1–15 is balanced, including offline seats',async()=>{
 for(let n=1;n<=15;n++){const db=await fresh();try{await seats(db,n);await online(db,1);await rpc(db,'m4_start','host');
  const rows=await assignments(db);assert.equal(rows.length,n,`N=${n}`);assert.equal(new Set(rows.map(r=>r.player_id)).size,n);
  const counts=['tech','design','ecommerce'].map(id=>rows.filter(r=>r.company_id===id).length);
  assert.ok(Math.max(...counts)<=5&&Math.max(...counts)-Math.min(...counts)<=1,`N=${n} counts=${counts}`);
 }finally{await db.close()}}
});
test('ten reserved and eight online assigns all ten; auto requires fifteen fresh leases',async()=>{const db=await fresh();try{
 await seats(db,10);await online(db,8);const state=await rpc(db,'m4_start','host');assert.equal(state.onlineCount,8);
 assert.equal((await assignments(db)).length,10);assert.equal((await rpc(db,'m3_host_state')).players.filter(p=>p.companyId).length,10);
 const own=await rpc(db,'m3_player_state',hash(10));assert.ok(own.companyId);assert.equal(own.phase,'committed');
}finally{await db.close()}
 const other=await fresh();try{await seats(other,15);await online(other,14);
  await assert.rejects(()=>rpc(other,'m4_start','auto'),/START_CONDITION_NOT_MET/);
  assert.equal((await rpc(other,'m3_public_state')).phase,'waiting');
  await rpc(other,'m3_heartbeat',hash(15),randomUUID(),randomUUID());
  const state=await rpc(other,'m3_public_state');assert.equal(state.phase,'committed');
  assert.equal((await other.query('select start_source from public.m3_session where singleton')).rows[0].start_source,'auto');
  const rows=await assignments(other);const counts=['tech','design','ecommerce'].map(id=>rows.filter(r=>r.company_id===id).length);
  assert.deepEqual(counts,[5,5,5]);
  await assert.rejects(()=>rpc(other,'m3_join',hash(16),'Late'),/SESSION_STARTED/);
 }finally{await other.close()}
});
test('disconnect after auto commit leaves original assignments unchanged',async()=>{const db=await fresh();try{
 await seats(db,15);await online(db,14);const c=randomUUID(),g=randomUUID();
 await rpc(db,'m3_heartbeat',hash(15),c,g);assert.equal((await rpc(db,'m3_public_state')).phase,'committed');
 const before=await assignments(db);await rpc(db,'m3_disconnect',hash(15),c,g);
 assert.equal((await rpc(db,'m4_start','auto')).alreadyCommitted,true);assert.deepEqual(await assignments(db),before);
}finally{await db.close()}});
test('secure index distributes remainder destinations without fixed first team',async()=>{const db=await fresh();try{
 const counts=[0,0,0];for(let i=0;i<600;i++)counts[(await rpc(db,'m4_random_index',3))-1]++;
 assert.ok(counts.every(n=>n>150&&n<250),`distribution ${counts}`);
 await db.exec('set role anon');try{await assert.rejects(()=>rpc(db,'m4_start','host'),/permission denied/);await assert.rejects(()=>db.query('select * from public.m4_assignments'),/permission denied/)}finally{await db.exec('reset role')}
}finally{await db.close()}});
