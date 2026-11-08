import pg from 'pg';
import nextEnv from '@next/env';
import { isMatchingProject } from './m3-target.mjs';
nextEnv.loadEnvConfig(process.cwd());
const dbUrl=process.env.M3_TEST_DATABASE_URL;
const expectedTables=['m3_session','m3_players','m3_connections','m3_revision_notice','m3_host_sessions','m3_login_limit','m3_request_limits'];
const expectedFunctions=['m3_bump_revision','m3_join','m3_heartbeat','m3_disconnect','m3_public_state','m3_player_state','m3_host_state','m3_reserve_login_attempt','m3_create_host_session','m3_host_authenticated','m3_revoke_host_session','m3_allow_request'];
class CheckFailure extends Error {}
let client;let stage='checking development target';
try {
 if(process.env.M3_TEST_DISPOSABLE_DATABASE!=='yes' || !isMatchingProject(process.env.SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_URL,dbUrl))throw new Error('invalid target');
 stage='connecting to the development database';client=new pg.Client({connectionString:dbUrl,connectionTimeoutMillis:10000});await client.connect();
 await client.query('begin read only');stage='verifying database protections';
 const tables=await client.query(`select c.relname,c.relrowsecurity,has_table_privilege('anon',c.oid,'SELECT') as anon_select,has_table_privilege('authenticated',c.oid,'SELECT') as auth_select,has_table_privilege('anon',c.oid,'INSERT,UPDATE,DELETE') as anon_write,has_table_privilege('authenticated',c.oid,'INSERT,UPDATE,DELETE') as auth_write from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=any($1::text[]) and c.relkind in ('r','p')`,[expectedTables]);
 if(tables.rows.length!==expectedTables.length || tables.rows.some(r=>!r.relrowsecurity || r.anon_write || r.auth_write || r.anon_select!==(r.relname==='m3_revision_notice') || r.auth_select!==(r.relname==='m3_revision_notice')))throw new CheckFailure('Table privileges or RLS failed');
 const policies=await client.query("select policyname,tablename,roles,cmd,qual from pg_catalog.pg_policies where schemaname='public' and tablename=any($1::text[])",[expectedTables]);
 if(policies.rows.length!==1 || policies.rows[0].policyname!=='m3_public_revision' || policies.rows[0].tablename!=='m3_revision_notice' || policies.rows[0].cmd!=='SELECT' || policies.rows[0].qual!=='true' || !policies.rows[0].roles.includes('anon') || !policies.rows[0].roles.includes('authenticated'))throw new CheckFailure('Unexpected RLS policies');
 const functions=await client.query(`select p.proname,p.prosecdef,has_function_privilege('anon',p.oid,'EXECUTE') as anon_exec,has_function_privilege('authenticated',p.oid,'EXECUTE') as auth_exec,has_function_privilege('service_role',p.oid,'EXECUTE') as service_exec from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any($1::text[])`,[expectedFunctions]);
 if(functions.rows.length!==expectedFunctions.length || functions.rows.some(r=>!r.prosecdef || r.anon_exec || r.auth_exec || (r.proname!=='m3_bump_revision'&&!r.service_exec)))throw new CheckFailure('Function privileges failed');
 const checks=await client.query(`select c.relname,contype,pg_get_constraintdef(t.oid) as definition from pg_catalog.pg_constraint t join pg_catalog.pg_class c on c.oid=t.conrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('m3_session','m3_players','m3_connections')`);
 const has=(table,type,part)=>checks.rows.some(r=>r.relname===table && r.contype===type && r.definition.includes(part));
 if(!has('m3_session','p','singleton') || !has('m3_session','c','singleton') || !has('m3_players','p','id') || !has('m3_players','u','identity_hash') || !has('m3_connections','p','id') || !has('m3_connections','f','player_id'))throw new CheckFailure('Required constraints missing');
 const columns=await client.query(`select column_name from information_schema.columns where table_schema='public' and table_name='m3_revision_notice' order by column_name`);
 if(columns.rows.map(r=>r.column_name).join(',')!=='revision,singleton')throw new CheckFailure('Revision publication exposes extra data');
 const publication=await client.query("select exists(select 1 from pg_catalog.pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='m3_revision_notice') as present");
 if(!publication.rows[0].present)throw new CheckFailure('Revision table is absent from Realtime publication');
 const count=await client.query('select count(*)::integer as n from public.m3_players');
 await client.query('rollback');
 console.log(`Schema checks passed: RLS, role privileges, key constraints, revision publication. Reserved seats: ${count.rows[0].n}.`);
} catch (err) {
 if(client)await client.query('rollback').catch(()=>{});
 console.error(err instanceof CheckFailure ? `M3 schema verification failed: ${err.message}.` : `M3 schema verification failed while ${stage}; connection details withheld.`);process.exitCode=1;
} finally {if(client)await client.end().catch(()=>{})}
