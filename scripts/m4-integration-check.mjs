import { randomBytes,randomUUID,createHash } from 'node:crypto';
import { writeFileSync,mkdirSync } from 'node:fs';
import pg from 'pg';
import nextEnv from '@next/env';
import { chromium } from '@playwright/test';
import { isMatchingProject } from './m3-target.mjs';
nextEnv.loadEnvConfig(process.cwd());
const p=process.env,base='http://127.0.0.1:3100',digest=x=>createHash('sha256').update(x).digest('hex');
let sql,browser,hostToken,stage='target check',maxOnline=0;const identities=[];let contexts=[];
async function api(path,{method='GET',cookie,payload}={}){const response=await fetch(`${base}/api/v1/${path}`,{method,headers:{...(method==='POST'?{origin:base,'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},...(payload?{body:JSON.stringify(payload)}:{})});return {status:response.status,data:await response.json()}}
try{
 if(p.M3_TEST_DISPOSABLE_DATABASE!=='yes'||!isMatchingProject(p.SUPABASE_URL,p.NEXT_PUBLIC_SUPABASE_URL,p.M3_TEST_DATABASE_URL))throw new Error('target');
 sql=new pg.Client({connectionString:p.M3_TEST_DATABASE_URL,connectionTimeoutMillis:10000});await sql.connect();
 const state=await sql.query("select status,(select count(*)::integer from public.m3_players) as seats,(select count(*)::integer from public.m4_assignments) as assignments from public.m3_session where singleton");
 const players=await sql.query("select id,identity_hash,display_name from public.m3_players order by reserved_at,id");
 const online=await sql.query("select count(distinct player_id)::integer as n from public.m3_connections where revoked_at is null and lease_expires_at>clock_timestamp()");
 if(state.rows[0].status!=='waiting'||state.rows[0].seats!==15||state.rows[0].assignments!==0||online.rows[0].n!==0||players.rows.some(x=>!/^Concurrent ([1-9]|1[0-6])$/.test(x.display_name)))throw new Error('not the isolated fixture');
 stage='Host authorization at zero online';hostToken=randomBytes(32).toString('base64url');await sql.query('select public.m3_create_host_session($1)',[digest(hostToken)]);
 const hostCookie=`lw_host=${hostToken}`;const host=await api('host/session',{cookie:hostCookie});if(host.status!==200){stage=`Host authorization status ${host.status} code ${host.data.code||'none'}`;throw new Error('Host auth')}
 const unauthorized=await api('host/start',{method:'POST',payload:{requestId:randomUUID(),confirmationToken:host.data.confirmationToken}});if(unauthorized.status!==401){stage=`unauthorized start status ${unauthorized.status} code ${unauthorized.data.code||'none'}`;throw new Error('unauthorized start')}
 const missing=await api('host/start',{method:'POST',cookie:hostCookie,payload:{requestId:randomUUID()}});if(missing.status!==403){stage=`missing confirmation status ${missing.status} code ${missing.data.code||'none'}`;throw new Error('missing confirmation')}
 const zero=await api('host/start',{method:'POST',cookie:hostCookie,payload:{requestId:randomUUID(),confirmationToken:host.data.confirmationToken}});
 if(zero.status!==409||zero.data.code!=='START_CONDITION_NOT_MET'){stage=`zero online start status ${zero.status} code ${zero.data.code||'none'}`;throw new Error('zero online start')}
 stage='preparing independent players';
 for(const row of players.rows){const token=randomBytes(32).toString('base64url');identities.push({id:row.id,original:row.identity_hash,token});await sql.query('update public.m3_players set identity_hash=$1 where id=$2',[digest(token),row.id])}
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 contexts=await Promise.all(identities.map(async({token})=>{const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await context.addCookies([{name:'lw_player',value:token,url:base,httpOnly:true,sameSite:'Lax'}]);const page=await context.newPage();await page.addInitScript(()=>{window.__m4RevealAt=0;const timer=setInterval(()=>{if(location.pathname==='/reveal'&&document.querySelector('.spin-stage .eyebrow')?.textContent==='COMPANY REVEAL'){window.__m4RevealAt=Date.now();clearInterval(timer)}},20)});return {context,page}}));
 const waitFor=async(check,limit=30000)=>{const until=Date.now()+limit;while(Date.now()<until){if(await check())return;await new Promise(r=>setTimeout(r,250))}throw new Error('timed out')};
 stage='fourteen online without auto start';
 for(let i=0;i<14;i++){
  stage=`waiting for player ${i+1} online`;
  await contexts[i].page.goto(base+'/');
  await waitFor(async()=>{const r=await api('session');maxOnline=Math.max(maxOnline,Number(r.data.onlineCount)||0);return r.status===200&&r.data.onlineCount===i+1},15000);
 }
 if((await api('session')).data.phase!=='waiting')throw new Error('early auto start');
 stage='fifteenth heartbeat and coordinated auto start';await contexts[14].page.goto(base+'/');
 await waitFor(async()=>{const r=await api('session');return r.data.phase==='committed'},30000);
 const committed=await sql.query('select status,start_source,reveal_start_at from public.m3_session where singleton');
 if(committed.rows[0].status!=='committed'||committed.rows[0].start_source!=='auto')throw new Error('auto source');
 const rows=await sql.query('select company_id,count(*)::integer as n from public.m4_assignments group by company_id order by company_id');
 if(rows.rows.length!==3||rows.rows.some(r=>r.n!==5))throw new Error('team balance');
 stage='coordinated reveal timing';
 await Promise.all(contexts.map(({page})=>page.waitForFunction(()=>window.__m4RevealAt>0,undefined,{timeout:25000})));
 const observed=await Promise.all(contexts.map(({page})=>page.evaluate(()=>window.__m4RevealAt)));
 const skew=Math.max(...observed)-Math.min(...observed);
 stage='idempotent start and reconnect';
 const retry=await api('host/start',{method:'POST',cookie:hostCookie,payload:{requestId:randomUUID(),confirmationToken:host.data.confirmationToken}});
 if(retry.status!==200||retry.data.alreadyCommitted!==true)throw new Error('repeat start');
 const after=await sql.query('select player_id,company_id from public.m4_assignments order by player_id');
 if(after.rows.length!==15)throw new Error('missing assignments');
 const late=randomBytes(32).toString('base64url');const denied=await api('join',{method:'POST',cookie:`lw_player=${late}`,payload:{displayName:'Late'}});
 if(denied.status!==409||denied.data.code!=='SESSION_STARTED')throw new Error('join remained open');
 const own=await api('me',{cookie:`lw_player=${identities[0].token}`});
 if(own.status!==200||!own.data.companyId)throw new Error('own result');
 await contexts[0].page.close();const replay=await contexts[0].context.newPage();await replay.goto(base+'/');await replay.waitForURL('**/reveal',{timeout:15000});
 await replay.locator('.spin-stage .eyebrow').getByText('COMPANY REVEAL').waitFor({timeout:10000});
 await replay.locator('.reveal-title').getByText(/Tech|Design|E-Com/).waitFor({timeout:10000});
 const ownAgain=await api('me',{cookie:`lw_player=${identities[0].token}`});if(ownAgain.data.companyId!==own.data.companyId)throw new Error('reroll');
 mkdirSync('test-results/m4',{recursive:true});writeFileSync('test-results/m4/sync.json',JSON.stringify({contexts:15,skewMs:skew,source:'auto',assignments:{tech:5,design:5,ecommerce:5}},null,2));
 console.log(`Real M4 auto start passed: 15 assignments, 5/5/5, reveal skew ${skew} ms; replay and join rejection passed.`);
 if(skew>1000){console.error('Initial reveal skew exceeds the 1-second target.');process.exitCode=1}
 await Promise.all(contexts.map(({context})=>context.close()));
}catch{const paths=contexts.length?await Promise.all(contexts.map(async({page})=>{try{return new URL(page.url()).pathname}catch{return 'closed'}})):[];console.error(`M4 integration stopped during ${stage}; max online ${maxOnline}; browser paths ${JSON.stringify(paths)}; private details withheld.`);process.exitCode=1}
finally{if(browser)await browser.close().catch(()=>{});if(sql){for(const identity of identities)await sql.query('update public.m3_players set identity_hash=$1 where id=$2',[identity.original,identity.id]).catch(()=>{});if(hostToken)await sql.query('select public.m3_revoke_host_session($1)',[digest(hostToken)]).catch(()=>{});await sql.end().catch(()=>{})}}
process.exit(process.exitCode||0);
