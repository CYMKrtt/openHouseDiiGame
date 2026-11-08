// Test-only reset for the owner-confirmed disposable Supabase project.
import pg from 'pg';import nextEnv from '@next/env';import { isMatchingProject } from './m3-target.mjs';
nextEnv.loadEnvConfig(process.cwd());const p=process.env;let sql,stage='target check';
try{
 if(p.M3_TEST_DISPOSABLE_DATABASE!=='yes'||!isMatchingProject(p.SUPABASE_URL,p.NEXT_PUBLIC_SUPABASE_URL,p.M3_TEST_DATABASE_URL))throw new Error('target');
 sql=new pg.Client({connectionString:p.M3_TEST_DATABASE_URL,connectionTimeoutMillis:10000});await sql.connect();
 stage='fixture verification';await sql.query('begin');await sql.query('select pg_advisory_xact_lock(7120567301)');await sql.query('select singleton from public.m3_session where singleton for update');
 const history=await sql.query("select 1 from information_schema.columns where table_schema='public' and table_name='m3_session' and column_name='round_id'");
 if(history.rowCount!==0)throw new Error('round history must be preserved');
 const result=await sql.query(`select
  (select status from public.m3_session where singleton) as phase,
  (select start_source from public.m3_session where singleton) as source,
  (select count(*)::integer from public.m3_players) as players,
  (select count(*)::integer from public.m3_players where display_name !~ '^Concurrent ([1-9]|1[0-6])$') as other_players,
  (select count(*)::integer from public.m4_assignments) as assignments,
  (select count(*)::integer from auth.users) as auth_users,
  (select count(*)::integer from storage.buckets) as storage_buckets,
  (select count(*)::integer from storage.objects) as storage_objects`);
 const x=result.rows[0];if(x.phase!=='committed'||x.source!=='auto'||x.players!==15||x.other_players!==0||x.assignments!==15||x.auth_users!==0||x.storage_buckets!==0||x.storage_objects!==0)throw new Error('unexpected data');
 stage='resetting verified synthetic session';
 await sql.query('truncate table public.m4_assignments');await sql.query('delete from public.m3_connections');
 await sql.query("update public.m3_session set status='waiting',committed_at=null,reveal_start_at=null,start_source=null where singleton");
 await sql.query('select public.m3_bump_revision()');await sql.query('commit');console.log('Verified synthetic M4 session reset to waiting; 15 test seats retained.');
}catch{if(sql)await sql.query('rollback').catch(()=>{});console.error(`M4 test reset stopped during ${stage}; private details withheld.`);process.exitCode=1}
finally{if(sql)await sql.end().catch(()=>{})}
