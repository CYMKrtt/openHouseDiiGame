import { readFile } from 'node:fs/promises';
import pg from 'pg';
import nextEnv from '@next/env';
import { isMatchingProject } from './m3-target.mjs';
nextEnv.loadEnvConfig(process.cwd());
const p=process.env;let client,stage='target check';
try{
 if(p.M3_TEST_DISPOSABLE_DATABASE!=='yes'||!isMatchingProject(p.SUPABASE_URL,p.NEXT_PUBLIC_SUPABASE_URL,p.M3_TEST_DATABASE_URL))throw new Error('target');
 client=new pg.Client({connectionString:p.M3_TEST_DATABASE_URL,connectionTimeoutMillis:10000});await client.connect();
 stage='existing schema and fixture';await client.query('begin');await client.query('select pg_advisory_xact_lock(7120567301)');
 const schema=await client.query("select to_regclass('public.m3_players') is not null as m3,to_regclass('public.m4_assignments') is not null as m4");
 if(!schema.rows[0].m3||schema.rows[0].m4)throw new Error('unexpected schema');
 const state=await client.query(`select
  (select status from public.m3_session where singleton) as phase,
  (select count(*)::integer from public.m3_players) as players,
  (select count(*)::integer from public.m3_players where display_name !~ '^Concurrent ([1-9]|1[0-6])$') as other_players,
  (select count(distinct player_id)::integer from public.m3_connections where revoked_at is null and lease_expires_at>clock_timestamp()) as online`);
 const row=state.rows[0];if(row.phase!=='waiting'||row.players>15||row.other_players!==0||row.online!==0)throw new Error('unexpected participant state');
 for(const relation of ['auth.users','storage.buckets','storage.objects']){const count=await client.query(`select count(*)::integer as n from ${relation}`);if(count.rows[0].n!==0)throw new Error('unexpected external data')}
 stage='applying M4 migrations';
 for(const name of ['202611080001_m4_assignment_reveal.sql','202611080002_m4_reveal_lead.sql']){
  const sql=await readFile(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8');
  await client.query(sql);
 }
 await client.query('commit');console.log('M4 development migration applied to the verified disposable project.');
}catch{if(client)await client.query('rollback').catch(()=>{});console.error(`M4 migration stopped during ${stage}; private details withheld.`);process.exitCode=1}
finally{if(client)await client.end().catch(()=>{})}
