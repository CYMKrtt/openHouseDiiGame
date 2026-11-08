import { randomBytes,randomUUID,createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import pg from 'pg';
import nextEnv from '@next/env';
import { chromium } from '@playwright/test';
import { isMatchingProject } from './m3-target.mjs';
nextEnv.loadEnvConfig(process.cwd());
const p=process.env,base='http://127.0.0.1:3100',hash=value=>createHash('sha256').update(value).digest('hex');
let sql,browser,first,second,originalHash,hostToken,playerToken,secondConnection,secondGeneration;
let stage='target check';
try{
 if(p.M3_TEST_DISPOSABLE_DATABASE!=='yes'||!isMatchingProject(p.SUPABASE_URL,p.NEXT_PUBLIC_SUPABASE_URL,p.M3_TEST_DATABASE_URL))throw new Error('target');
 sql=new pg.Client({connectionString:p.M3_TEST_DATABASE_URL,connectionTimeoutMillis:10000});await sql.connect();
 const fixture=await sql.query("select id,identity_hash,display_name from public.m3_players order by reserved_at,id");
 if(fixture.rows.length!==15||fixture.rows.some(row=>!/^Concurrent ([1-9]|1[0-6])$/.test(row.display_name)))throw new Error('fixture');
 [first,second]=fixture.rows;originalHash=first.identity_hash;
 playerToken=randomBytes(32).toString('base64url');hostToken=randomBytes(32).toString('base64url');
 await sql.query('update public.m3_players set identity_hash=$1 where id=$2',[hash(playerToken),first.id]);
 await sql.query('select public.m3_create_host_session($1)',[hash(hostToken)]);
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 mkdirSync('test-results/m3-server-ui',{recursive:true});
 for(const viewport of [{width:320,height:640},{width:390,height:844},{width:1440,height:900}]){
  stage=`responsive browser check ${viewport.width}`;
  const context=await browser.newContext({viewport,reducedMotion:'reduce'});
  await context.addCookies([{name:'lw_player',value:playerToken,url:base,httpOnly:true,sameSite:'Strict'},{name:'lw_host',value:hostToken,url:base,httpOnly:true,sameSite:'Strict'}]);
  let blocked=0;await context.routeWebSocket('**/realtime/v1/websocket**',socket=>{blocked++;socket.close()});
  stage=`lobby navigation ${viewport.width}`;
  const landing=await context.newPage();await landing.goto(base+'/');await landing.waitForURL('**/lobby',{timeout:15000});
  stage=`lobby presence ${viewport.width}`;
  await landing.locator('.current').waitFor({timeout:15000});
  await landing.locator('.current').getByText('1',{exact:true}).waitFor({timeout:15000});
  const lobbyWidth=await landing.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
  if(lobbyWidth.scroll>lobbyWidth.viewport+1)throw new Error('lobby overflow');
  await landing.screenshot({path:`test-results/m3-server-ui/lobby-${viewport.width}.png`});
  stage=`Host navigation ${viewport.width}`;
  const host=await context.newPage();await host.goto(base+'/host');
  stage=`Host metrics ${viewport.width}`;
  await host.getByText('จองที่นั่งแล้ว').waitFor();
  await host.waitForFunction(()=>document.querySelectorAll('.metrics .metric')[1]?.querySelector('b')?.textContent?.trim().startsWith('15'),undefined,{timeout:15000});
  stage=`Host controls ${viewport.width}`;
  if(!(await host.getByRole('button',{name:/เริ่มเปิดเผยบริษัท/}).isDisabled()))throw new Error('M4 control enabled');
  if(await host.getByRole('dialog',{name:'เฉพาะผู้จัดกิจกรรม'}).count())throw new Error('host auth failed');
  stage=`Host layout ${viewport.width}`;
  const hostWidth=await host.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
  if(hostWidth.scroll>hostWidth.viewport+1)throw new Error('host overflow');
  await host.screenshot({path:`test-results/m3-server-ui/host-${viewport.width}.png`});
  if(viewport.width===390){
   stage='polling fallback with blocked Realtime';
   secondConnection=randomUUID();secondGeneration=randomUUID();
   await sql.query('select public.m3_heartbeat($1,$2,$3)',[second.identity_hash,secondConnection,secondGeneration]);
   await landing.locator('.current').getByText('2',{exact:true}).waitFor({timeout:12000});
   await sql.query('select public.m3_disconnect($1,$2,$3)',[second.identity_hash,secondConnection,secondGeneration]);secondConnection=undefined;
   await landing.locator('.current').getByText('1',{exact:true}).waitFor({timeout:12000});
   if(blocked===0)throw new Error('Realtime was not blocked');
  }
  await context.close();
  console.log(`Server-mode responsive UI ${viewport.width}x${viewport.height} passed.`);
 }
 console.log('Server-mode lobby polling fallback passed with Realtime blocked; Host start stayed disabled.');
}catch{console.error(`Server-mode browser check failed during ${stage}; private details withheld.`);process.exitCode=1}
finally{
 if(browser)await browser.close().catch(()=>{});
 if(sql){
  if(secondConnection)await sql.query('select public.m3_disconnect($1,$2,$3)',[second.identity_hash,secondConnection,secondGeneration]).catch(()=>{});
  if(first&&originalHash)await sql.query('update public.m3_players set identity_hash=$1 where id=$2',[originalHash,first.id]).catch(()=>{});
  if(hostToken)await sql.query('select public.m3_revoke_host_session($1)',[hash(hostToken)]).catch(()=>{});
  await sql.end().catch(()=>{});
 }
}
process.exit(process.exitCode||0);
