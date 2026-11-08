import { readFile } from 'node:fs/promises';
import pg from 'pg';
import nextEnv from '@next/env';
import { isMatchingProject } from './m3-target.mjs';

nextEnv.loadEnvConfig(process.cwd());
const dbUrl=process.env.M3_TEST_DATABASE_URL;
const appUrl=process.env.SUPABASE_URL;
const acknowledged=process.env.M3_TEST_DISPOSABLE_DATABASE==='yes';
let stage='checking the development configuration';
let client;
try {
 if(!dbUrl||!appUrl||!acknowledged)throw new Error('Configuration incomplete');
 if(!isMatchingProject(appUrl,process.env.NEXT_PUBLIC_SUPABASE_URL,dbUrl))throw new Error('Project mismatch');
 stage='connecting to the designated project';
 client=new pg.Client({connectionString:dbUrl,connectionTimeoutMillis:10000});await client.connect();
 stage='checking existing data and schema';
 await client.query('begin');
 await client.query('select pg_advisory_xact_lock(7120567301)');
 const objects=await client.query("select count(*)::integer as n from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p','v','m') and c.relname not like 'pg_%'");
 if(objects.rows[0].n!==0)throw new Error('Public schema is not empty');
 const authTable=await client.query("select to_regclass('auth.users') is not null as exists");
 if(authTable.rows[0].exists){const users=await client.query('select count(*)::integer as n from auth.users');if(users.rows[0].n!==0)throw new Error('Auth users are present')}
 for(const relation of ['storage.buckets','storage.objects']){
  const table=await client.query('select to_regclass($1) is not null as exists',[relation]);
  if(table.rows[0].exists){const result=await client.query(`select count(*)::integer as n from ${relation}`);if(result.rows[0].n!==0)throw new Error('Storage data is present')}
 }
 const publication=await client.query("select exists(select 1 from pg_catalog.pg_publication where pubname='supabase_realtime') as exists");
 if(!publication.rows[0].exists)throw new Error('Realtime publication is not available');
 stage='applying development migrations';
 for(const file of ['202611070001_m3_core.sql','202611070002_m3_host_auth.sql','202611070003_m3_request_limits.sql']){
  const sql=await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8');await client.query(sql);
 }
 await client.query('commit');
 console.log('Development migrations applied to the verified empty project.');
} catch {
 if(client)await client.query('rollback').catch(()=>{});
 // Connection errors can include the database URL. Never print them.
 console.error(`M3 setup stopped while ${stage}; details and connection values withheld.`);
 process.exitCode=1;
} finally {if(client)await client.end().catch(()=>{})}
