import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
let browser,stage='starting browser';
try{
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 mkdirSync('test-results/m3-server-visual',{recursive:true});
 for(const viewport of [{width:320,height:640},{width:390,height:844},{width:1440,height:900}]){
  stage=`opening reference ${viewport.width}`;
  const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage();
  await page.addInitScript(()=>{
   localStorage.setItem('little-world-m2-mock-v1',JSON.stringify({players:[{id:'p0',name:'Concurrent 16',online:true}],started:false}));
   sessionStorage.setItem('little-world-player','p0');
  });
  await page.goto('http://127.0.0.1:3101/waiting-lobby-v1.html?name=Concurrent%2016');
  stage=`setting reference count ${viewport.width}`;
  await page.locator('summary').click();
  for(let i=0;i<8;i++)await page.getByRole('button',{name:'− ผู้เล่นออฟไลน์'}).click();
  await page.locator('summary').click();
  await page.locator('.current').getByText('1',{exact:true}).waitFor();
  const baseline=await page.screenshot();
  stage=`comparing images ${viewport.width}`;
  const actual=readFileSync(`test-results/m3-server-ui/lobby-${viewport.width}.png`);
  const a=PNG.sync.read(baseline),b=PNG.sync.read(actual);if(a.width!==b.width||a.height!==b.height)throw new Error('size mismatch');
  const diff=new PNG({width:a.width,height:a.height});const changed=pixelmatch(a.data,b.data,diff.data,a.width,a.height,{threshold:0.15});
  const percent=100*changed/(a.width*a.height);
  writeFileSync(`test-results/m3-server-visual/baseline-${viewport.width}.png`,baseline);
  writeFileSync(`test-results/m3-server-visual/diff-${viewport.width}.png`,PNG.sync.write(diff));
  console.log(`Server-mode Lobby versus approved prototype ${viewport.width}x${viewport.height}: ${percent.toFixed(2)}% pixels differ`);
  if(percent>=2)throw new Error('fidelity threshold');
  await context.close();
 }
}catch{console.error(`Server-mode visual comparison failed during ${stage}; private details withheld.`);process.exitCode=1}
finally{if(browser)await browser.close().catch(()=>{})}
process.exit(process.exitCode||0);
