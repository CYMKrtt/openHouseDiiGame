import pg from 'pg';
import nextEnv from '@next/env';
import { isMatchingProject } from './m3-target.mjs';
nextEnv.loadEnvConfig(process.cwd());
const p=process.env;let client;let stage='target check';
try{
 if(p.M3_TEST_DISPOSABLE_DATABASE!=='yes'||!isMatchingProject(p.SUPABASE_URL,p.NEXT_PUBLIC_SUPABASE_URL,p.M3_TEST_DATABASE_URL))throw new Error('target');
 client=new pg.Client({connectionString:p.M3_TEST_DATABASE_URL,connectionTimeoutMillis:10000});await client.connect();
 stage='fixture inspection';await client.query('begin');await client.query('select singleton from public.m3_session where singleton for update');
 const history=await client.query("select 1 from information_schema.columns where table_schema='public' and table_name='m3_session' and column_name='round_id'");
 if(history.rowCount!==0)throw new Error('round history must be preserved');
 const state=await client.query(`select
  (select count(*)::integer from public.m3_players) as players,
  (select count(*)::integer from public.m3_players where display_name !~ '^Concurrent ([1-9]|1[0-6])$') as other_players,
  (select count(*)::integer from public.m3_connections c left join public.m3_players p on p.id=c.player_id where p.id is null or p.display_name !~ '^Concurrent ([1-9]|1[0-6])$') as other_connections,
  (select count(*)::integer from public.m3_host_sessions where revoked_at is null and expires_at>clock_timestamp()) as active_host_sessions,
  (select status from public.m3_session where singleton) as phase`);
 const row=state.rows[0];
 if(row.players!==15||row.other_players!==0||row.other_connections!==0||row.active_host_sessions!==0||row.phase!=='waiting')throw new Error('not only the expected fixture');
 stage='removing only the verified test fixture';
 await client.query("delete from public.m3_connections where player_id in (select id from public.m3_players where display_name ~ '^Concurrent ([1-9]|1[0-6])$')");
 await client.query("delete from public.m3_players where display_name ~ '^Concurrent ([1-9]|1[0-6])$'");
 await client.query('select public.m3_bump_revision()');
 await client.query('commit');console.log('Verified concurrency fixture removed; reserved seats: 0.');
}catch{if(client)await client.query('rollback').catch(()=>{});console.error(`Fixture reset stopped during ${stage}; private details withheld.`);process.exitCode=1}
finally{if(client)await client.end().catch(()=>{})}
