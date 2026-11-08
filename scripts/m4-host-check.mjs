// Real HTTP Host-start race on the isolated synthetic fixture. No production data.
import { randomBytes,randomUUID,createHash } from 'node:crypto';
import pg from 'pg';
import nextEnv from '@next/env';
import { isMatchingProject } from './m3-target.mjs';

nextEnv.loadEnvConfig(process.cwd());
const p=process.env,base='http://127.0.0.1:3100';
const digest=value=>createHash('sha256').update(value).digest('hex');
const token=()=>randomBytes(32).toString('base64url');
let sql,stage='target check',identity,hosts=[];
async function api(path,{method='GET',cookie,payload}={}){
 const response=await fetch(`${base}/api/v1/${path}`,{method,headers:{...(method==='POST'?{origin:base,'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},...(payload?{body:JSON.stringify(payload)}:{})});
 return {status:response.status,data:await response.json()};
}
try {
 if(p.M3_TEST_DISPOSABLE_DATABASE!=='yes'||!isMatchingProject(p.SUPABASE_URL,p.NEXT_PUBLIC_SUPABASE_URL,p.M3_TEST_DATABASE_URL))throw new Error('target');
 sql=new pg.Client({connectionString:p.M3_TEST_DATABASE_URL,connectionTimeoutMillis:10000});await sql.connect();
 const state=await sql.query(`select status,(select count(*)::integer from public.m3_players) as seats,
 (select count(*)::integer from public.m4_assignments) as assignments,
 (select count(*)::integer from auth.users) as auth_users,
 (select count(*)::integer from storage.objects) as storage_objects from public.m3_session where singleton`);
 const player=await sql.query("select id,identity_hash from public.m3_players where display_name='Concurrent 1'");
 const other=await sql.query("select count(*)::integer as n from public.m3_players where display_name !~ '^Concurrent ([1-9]|1[0-6])$'");
 const s=state.rows[0];if(s.status!=='waiting'||s.seats!==15||s.assignments!==0||s.auth_users!==0||s.storage_objects!==0||player.rows.length!==1||other.rows[0].n!==0)throw new Error('unexpected fixture');
 stage='one online and two Host confirmations';
 identity={...player.rows[0],token:token()};await sql.query('update public.m3_players set identity_hash=$1 where id=$2',[digest(identity.token),identity.id]);
 const beat=await api('presence/heartbeat',{method:'POST',cookie:`lw_player=${identity.token}`,payload:{connectionId:randomUUID(),generation:randomUUID()}});
 if(beat.status!==200||beat.data.onlineCount!==1)throw new Error('one online');
 for(let i=0;i<2;i++){
  const value=token();hosts.push(value);await sql.query('select public.m3_create_host_session($1)',[digest(value)]);
 }
 const confirmations=await Promise.all(hosts.map(async value=>{
  const response=await api('host/session',{cookie:`lw_host=${value}`});
  if(response.status!==200)throw new Error('Host session');return response.data.confirmationToken;
 }));
 stage='simultaneous Host starts';
 const results=await Promise.all(hosts.map((value,i)=>api('host/start',{method:'POST',cookie:`lw_host=${value}`,payload:{requestId:randomUUID(),confirmationToken:confirmations[i]}})));
 if(results.some(x=>x.status!==200)||results.filter(x=>x.data.alreadyCommitted===false).length!==1||results.filter(x=>x.data.alreadyCommitted===true).length!==1)throw new Error('first commit race');
 const committed=await sql.query("select status,start_source,committed_at,reveal_start_at from public.m3_session where singleton");
 const assignments=await sql.query('select company_id,count(*)::integer as n from public.m4_assignments group by company_id order by company_id');
 const c=committed.rows[0];if(c.status!=='committed'||c.start_source!=='host'||assignments.rows.length!==3||assignments.rows.some(x=>x.n!==5))throw new Error('balance');
 if(new Date(c.reveal_start_at)-new Date(c.committed_at)!==5000)throw new Error('reveal lead');
 const own=await api('me',{cookie:`lw_player=${identity.token}`});
 if(own.status!==200||!own.data.companyId)throw new Error('own assignment');
 const late=await api('join',{method:'POST',cookie:`lw_player=${token()}`,payload:{displayName:'Late'}});
 if(late.status!==409||late.data.code!=='SESSION_STARTED')throw new Error('late join');
 console.log('Real Host race passed: 1 online, one commit, 15 reserved assignments (5/5/5), immutable retry and closed joins.');
}catch{
 console.error(`M4 Host check stopped during ${stage}; private details withheld.`);process.exitCode=1;
}finally{
 if(sql){if(identity)await sql.query('update public.m3_players set identity_hash=$1 where id=$2',[identity.identity_hash,identity.id]).catch(()=>{});
  for(const value of hosts)await sql.query('select public.m3_revoke_host_session($1)',[digest(value)]).catch(()=>{});
  await sql.end().catch(()=>{});
 }
}
