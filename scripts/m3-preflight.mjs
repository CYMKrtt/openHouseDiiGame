import pg from 'pg';
import nextEnv from '@next/env';
import { isMatchingProject } from './m3-target.mjs';
nextEnv.loadEnvConfig(process.cwd());
const dbUrl=process.env.M3_TEST_DATABASE_URL;
let client;let stage='checking the development configuration';
try {
 if(process.env.M3_TEST_DISPOSABLE_DATABASE!=='yes' || !isMatchingProject(process.env.SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_URL,dbUrl))throw new Error('target');
 stage='connecting to the designated project';client=new pg.Client({connectionString:dbUrl,connectionTimeoutMillis:10000});await client.connect();
 await client.query('begin read only');stage='checking the project contents';
 const objects=await client.query("select count(*)::integer as n from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p','v','m') and c.relname not like 'pg_%'");
 const counts={publicObjects:objects.rows[0].n};
 for(const [key,relation] of [['authUsers','auth.users'],['storageBuckets','storage.buckets'],['storageObjects','storage.objects']]){
  const table=await client.query('select to_regclass($1) is not null as exists',[relation]);
  if(table.rows[0].exists){const result=await client.query(`select count(*)::integer as n from ${relation}`);counts[key]=result.rows[0].n}else counts[key]=0;
 }
 const publication=await client.query("select exists(select 1 from pg_catalog.pg_publication where pubname='supabase_realtime') as present");
 await client.query('rollback');
 console.log(JSON.stringify({...counts,realtimePublication:publication.rows[0].present}));
 if(Object.values(counts).some(n=>n!==0)||!publication.rows[0].present)process.exitCode=1;
} catch {
 if(client)await client.query('rollback').catch(()=>{});
 console.error(`M3 preflight failed while ${stage}; connection details withheld.`);process.exitCode=1;
} finally {if(client)await client.end().catch(()=>{})}
