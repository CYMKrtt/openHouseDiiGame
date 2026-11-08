// Apply the follow-up reveal timing migration only to the verified disposable fixture.
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import nextEnv from '@next/env';
import { isMatchingProject } from './m3-target.mjs';

nextEnv.loadEnvConfig(process.cwd());
const p=process.env;
let client,stage='target check';
try {
 if(p.M3_TEST_DISPOSABLE_DATABASE!=='yes'||!isMatchingProject(p.SUPABASE_URL,p.NEXT_PUBLIC_SUPABASE_URL,p.M3_TEST_DATABASE_URL))throw new Error('target');
 client=new pg.Client({connectionString:p.M3_TEST_DATABASE_URL,connectionTimeoutMillis:10000});
 await client.connect();
 stage='fixture verification';
 await client.query('begin');
 await client.query('select pg_advisory_xact_lock(7120567301)');
 const check=await client.query(`select
  (select count(*)::integer from public.m3_players) as players,
  (select count(*)::integer from public.m3_players where display_name !~ '^Concurrent ([1-9]|1[0-6])$') as other_players,
  (select count(*)::integer from auth.users) as auth_users,
  (select count(*)::integer from storage.buckets) as buckets,
  (select count(*)::integer from storage.objects) as objects,
  pg_get_functiondef('public.m4_start(text)'::regprocedure) like '%interval ''2 seconds''%' as old_lead`);
 const x=check.rows[0];
 if(x.players!==15||x.other_players!==0||x.auth_users!==0||x.buckets!==0||x.objects!==0||!x.old_lead)throw new Error('unexpected target');
 stage='applying follow-up migration';
 await client.query(await readFile(new URL('../supabase/migrations/202611080002_m4_reveal_lead.sql',import.meta.url),'utf8'));
 await client.query('commit');
 console.log('M4 five-second reveal lead applied to verified disposable development project.');
}catch{
 if(client)await client.query('rollback').catch(()=>{});
 console.error(`M4 timing migration stopped during ${stage}; private details withheld.`);
 process.exitCode=1;
}finally{if(client)await client.end().catch(()=>{})}
