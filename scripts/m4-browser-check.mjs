import { randomBytes,createHash } from 'node:crypto';
import { mkdirSync,writeFileSync } from 'node:fs';
import pg from 'pg';
import nextEnv from '@next/env';
import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { isMatchingProject } from './m3-target.mjs';

nextEnv.loadEnvConfig(process.cwd());
const p=process.env,base='http://127.0.0.1:3100',reference='http://127.0.0.1:3101/company-reveal-v1.1.html';
const hash=value=>createHash('sha256').update(value).digest('hex');
let sql,browser,player,originalHash,playerToken,hostToken,stage='target check';
try {
 if(p.M3_TEST_DISPOSABLE_DATABASE!=='yes'||!isMatchingProject(p.SUPABASE_URL,p.NEXT_PUBLIC_SUPABASE_URL,p.M3_TEST_DATABASE_URL))throw new Error('target');
 sql=new pg.Client({connectionString:p.M3_TEST_DATABASE_URL,connectionTimeoutMillis:10000});await sql.connect();
 const fixture=await sql.query(`select p.id,p.identity_hash,p.display_name from public.m3_players p
 join public.m4_assignments a on a.player_id=p.id where a.company_id='tech' order by p.reserved_at limit 1`);
 const state=await sql.query("select status,(select count(*)::integer from public.m4_assignments) as assignments from public.m3_session where singleton");
 if(fixture.rows.length!==1||!/^Concurrent ([1-9]|1[0-6])$/.test(fixture.rows[0].display_name)||state.rows[0].status!=='committed'||state.rows[0].assignments!==15)throw new Error('unexpected fixture');
 player=fixture.rows[0];originalHash=player.identity_hash;playerToken=randomBytes(32).toString('base64url');hostToken=randomBytes(32).toString('base64url');
 await sql.query('update public.m3_players set identity_hash=$1 where id=$2',[hash(playerToken),player.id]);
 await sql.query('select public.m3_create_host_session($1)',[hash(hostToken)]);
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 mkdirSync('test-results/m4/visual',{recursive:true});
 for(const viewport of [{width:320,height:640},{width:390,height:844},{width:1440,height:900}]){
  stage=`responsive and visual ${viewport.width}`;
  const context=await browser.newContext({viewport,reducedMotion:'reduce'});
  await context.addCookies([{name:'lw_player',value:playerToken,url:base,httpOnly:true,sameSite:'Strict'},{name:'lw_host',value:hostToken,url:base,httpOnly:true,sameSite:'Strict'}]);
  const baseline=await context.newPage();await baseline.goto(reference);await baseline.locator('#phase').getByText('COMPANY REVEAL').waitFor();
  const oldSpin=await baseline.screenshot();await baseline.locator('body.done').waitFor({timeout:10000});const oldDone=await baseline.screenshot();
  const page=await context.newPage();await page.goto(base+'/');await page.waitForURL('**/reveal',{timeout:15000});
  await page.locator('.spin-stage .eyebrow').getByText('COMPANY REVEAL').waitFor({timeout:10000});
  const spin=await page.screenshot();await page.locator('body.done').waitFor({timeout:10000});
  const done=await page.screenshot();
  const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
  if(width.scroll>width.viewport+1)throw new Error('horizontal overflow');
  for(const [phase,oldImage,newImage] of [['spin',oldSpin,spin],['done',oldDone,done]]){
   const a=PNG.sync.read(oldImage),b=PNG.sync.read(newImage);if(a.width!==b.width||a.height!==b.height)throw new Error('image size');
   const diff=new PNG({width:a.width,height:a.height});const changed=pixelmatch(a.data,b.data,diff.data,a.width,a.height,{threshold:0.15});
   const percent=100*changed/(a.width*a.height);
   writeFileSync(`test-results/m4/visual/${phase}-${viewport.width}-reference.png`,oldImage);
   writeFileSync(`test-results/m4/visual/${phase}-${viewport.width}-actual.png`,newImage);
   writeFileSync(`test-results/m4/visual/${phase}-${viewport.width}-diff.png`,PNG.sync.write(diff));
   console.log(`M4 Reveal ${phase} ${viewport.width}x${viewport.height}: ${percent.toFixed(2)}% pixels differ`);
   if(percent>=2)throw new Error('fidelity threshold');
  }
  const host=await context.newPage();await host.goto(base+'/host');
  await host.waitForFunction(()=>document.querySelectorAll('.metrics .metric')[1]?.querySelector('b')?.textContent?.trim().startsWith('15'),undefined,{timeout:15000});
  if(await host.getByRole('dialog',{name:'เฉพาะผู้จัดกิจกรรม'}).count())throw new Error('Host auth');
  if(!(await host.getByRole('button',{name:/ผลบริษัทล็อกแล้ว/}).isDisabled()))throw new Error('Host start not locked');
  const hostWidth=await host.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
  if(hostWidth.scroll>hostWidth.viewport+1)throw new Error('Host overflow');
  await host.screenshot({path:`test-results/m4/visual/host-${viewport.width}-actual.png`});
  await context.close();
 }
 console.log('M4 server Reveal and committed Host responsive checks passed at all three viewports.');
}catch{
 console.error(`M4 browser check stopped during ${stage}; private details withheld.`);process.exitCode=1;
}finally{
 if(browser)await browser.close().catch(()=>{});
 if(sql){if(player&&originalHash)await sql.query('update public.m3_players set identity_hash=$1 where id=$2',[originalHash,player.id]).catch(()=>{});
  if(hostToken)await sql.query('select public.m3_revoke_host_session($1)',[hash(hostToken)]).catch(()=>{});
  await sql.end().catch(()=>{});
 }
}
