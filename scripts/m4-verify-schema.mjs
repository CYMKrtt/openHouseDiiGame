import pg from 'pg';
import nextEnv from '@next/env';
import { isMatchingProject } from './m3-target.mjs';

nextEnv.loadEnvConfig(process.cwd());
const p=process.env;
let sql,stage='target check';
try {
 if(!isMatchingProject(p.SUPABASE_URL,p.NEXT_PUBLIC_SUPABASE_URL,p.M3_TEST_DATABASE_URL))throw new Error('target');
 sql=new pg.Client({connectionString:p.M3_TEST_DATABASE_URL,connectionTimeoutMillis:10000});await sql.connect();
 stage='schema verification';
 const result=await sql.query(`select
  (select relrowsecurity from pg_class where oid='public.m4_assignments'::regclass) as rls,
  (select count(*)::integer from pg_trigger where tgrelid='public.m4_assignments'::regclass and tgname='m4_assignment_guard' and not tgisinternal) as immutable_trigger,
  (select count(*)::integer from pg_constraint where conname='m4_commit_metadata' and conrelid='public.m3_session'::regclass) as metadata_check,
  has_table_privilege('anon','public.m4_assignments','select') as anon_read,
  has_table_privilege('authenticated','public.m4_assignments','select') as user_read,
  has_table_privilege('anon','public.m4_assignments','insert') as anon_write,
  has_function_privilege('anon','public.m4_start(text)','execute') as anon_start,
  has_function_privilege('authenticated','public.m4_start(text)','execute') as user_start,
  has_function_privilege('service_role','public.m4_start(text)','execute') as server_start,
  (select count(*)::integer from information_schema.columns where table_schema='public' and table_name='m3_session' and column_name in ('committed_at','reveal_start_at','start_source')) as metadata_columns`);
 const x=result.rows[0];
 if(!x.rls||x.immutable_trigger!==1||x.metadata_check!==1||x.anon_read||x.user_read||x.anon_write||x.anon_start||x.user_start||!x.server_start||x.metadata_columns!==3)throw new Error('schema');
 console.log('M4 schema verified: metadata constraint, assignment RLS and immutability trigger, service-role-only start RPC.');
}catch{
 console.error(`M4 schema verification stopped during ${stage}; private details withheld.`);process.exitCode=1;
}finally{if(sql)await sql.end().catch(()=>{})}
