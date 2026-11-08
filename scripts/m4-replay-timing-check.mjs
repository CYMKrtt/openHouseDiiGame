// One-browser check of the approved four-second Star on a committed, disposable fixture.
import { randomBytes,createHash } from 'node:crypto';
import pg from 'pg';
import nextEnv from '@next/env';
import { chromium } from '@playwright/test';
import { isMatchingProject } from './m3-target.mjs';

nextEnv.loadEnvConfig(process.cwd());
const p=process.env,base='http://127.0.0.1:3100';
let sql,browser,player,originalHash,stage='target check';
try {
 if(p.M3_TEST_DISPOSABLE_DATABASE!=='yes'||!isMatchingProject(p.SUPABASE_URL,p.NEXT_PUBLIC_SUPABASE_URL,p.M3_TEST_DATABASE_URL))throw new Error('target');
 sql=new pg.Client({connectionString:p.M3_TEST_DATABASE_URL,connectionTimeoutMillis:10000});await sql.connect();
 const session=await sql.query("select status,committed_at,(select count(*)::integer from public.m4_assignments) as assignments from public.m3_session where singleton");
 const fixture=await sql.query("select id,identity_hash from public.m3_players where display_name='Concurrent 1'");
 if(session.rows[0].status!=='committed'||session.rows[0].assignments!==15||fixture.rows.length!==1)throw new Error('unexpected fixture');
 player=fixture.rows[0];originalHash=player.identity_hash;const value=randomBytes(32).toString('base64url');
 await sql.query('update public.m3_players set identity_hash=$1 where id=$2',[createHash('sha256').update(value).digest('hex'),player.id]);
 stage='four-second local replay';
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await context.addCookies([{name:'lw_player',value,url:base,httpOnly:true,sameSite:'Strict'}]);
 const page=await context.newPage();
 await page.addInitScript(()=>{
  window.__m4Replay={start:0,done:0};
  const observer=new MutationObserver(()=>{
   if(!window.__m4Replay.start&&document.querySelector('.spin-stage .eyebrow')?.textContent==='COMPANY REVEAL')window.__m4Replay.start=performance.now();
   if(window.__m4Replay.start&&!window.__m4Replay.done&&document.body?.classList.contains('done')){window.__m4Replay.done=performance.now();observer.disconnect()}
  });observer.observe(document,{subtree:true,childList:true,attributes:true,characterData:true});
 });
 await page.goto(base+'/');await page.waitForURL('**/reveal',{timeout:15000});
 await page.waitForFunction(()=>window.__m4Replay?.done>0,undefined,{timeout:10000});
 const duration=await page.evaluate(()=>Math.round(window.__m4Replay.done-window.__m4Replay.start));
 const unchanged=await sql.query('select committed_at from public.m3_session where singleton');
 if(duration<3700||duration>4300||new Date(unchanged.rows[0].committed_at).getTime()!==new Date(session.rows[0].committed_at).getTime())throw new Error('timing or mutation');
 console.log(`M4 one-browser local replay passed: Star ${duration} ms; original commit unchanged.`);
}catch{
 console.error(`M4 one-browser replay check stopped during ${stage}; private details withheld.`);process.exitCode=1;
}finally{
 if(browser)await browser.close().catch(()=>{});
 if(sql){if(player&&originalHash)await sql.query('update public.m3_players set identity_hash=$1 where id=$2',[originalHash,player.id]).catch(()=>{});await sql.end().catch(()=>{})}
}
