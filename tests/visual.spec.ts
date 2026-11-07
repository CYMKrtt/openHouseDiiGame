import { test, expect } from '@playwright/test';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import fs from 'node:fs';
import path from 'node:path';
const screens = [
  { route:'/', baseline:'landing-join-cp01-v1.1.html', target:'#joinForm', count:0 },
  { route:'/lobby', baseline:'waiting-lobby-v1.html', target:'.count-block', count:9 },
  { route:'/reveal', baseline:'company-reveal-v1.1.html', target:'.spin-stage', count:1 },
  { route:'/host', baseline:'host-dashboard-v1-review.html', target:'[aria-labelledby=gateTitle]', count:10 },
];
for (const size of [{width:320,height:640},{width:390,height:844},{width:1440,height:900}]) for(const screen of screens) {
 test(`visual ${screen.route} ${size.width}x${size.height}`, async ({ browser }, info) => {
   const context=await browser.newContext({viewport:size,reducedMotion:'reduce'}); const page=await context.newPage();
   const players=Array.from({length:screen.count},(_,i)=>({id:`p${i}`,name:i===0?'Mimi':['Mint','Ploy','Beam','Nana','Mimi','Bank','Ice','Fern','Pang','Ton'][i]||`Player ${i}`,online:i<(screen.route==='/host'?8:screen.count),...(screen.route==='/reveal'?{company:'tech'}:{})}));
   await page.addInitScript(({players, started})=>{localStorage.setItem('little-world-m2-mock-v1',JSON.stringify({players,started}));sessionStorage.setItem('little-world-player','p0')},{players,started:screen.route==='/reveal'});
   await page.goto(`http://127.0.0.1:3101/${screen.baseline}`); await page.locator(screen.target).waitFor(); if(screen.route==='/reveal') await expect(page.locator('#phase')).toHaveText('COMPANY REVEAL'); const baseline=await page.screenshot({caret:"initial"});
   await page.goto(`http://127.0.0.1:3100${screen.route}`); await page.locator(screen.target).waitFor(); await page.waitForLoadState('networkidle'); if(screen.route==='/reveal') await expect(page.locator('.spin-stage .eyebrow')).toHaveText('COMPANY REVEAL'); if(screen.route==='/host') await expect(page.locator('.metrics')).toContainText('10'); if(screen.route==='/lobby') await expect(page.locator('.current')).toHaveText('9');
   const actual=await page.screenshot({caret:"initial"}); const a=PNG.sync.read(baseline), b=PNG.sync.read(actual); const diff=new PNG({width:a.width,height:a.height}); const changed=pixelmatch(a.data,b.data,diff.data,a.width,a.height,{threshold:0.15});
   const folder=info.outputPath('visual'); fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'baseline.png'),baseline);fs.writeFileSync(path.join(folder,'actual.png'),actual);fs.writeFileSync(path.join(folder,'diff.png'),PNG.sync.write(diff));
   const percentage=100*changed/(a.width*a.height); console.log(`VISUAL ${screen.route} ${size.width}x${size.height}: ${percentage.toFixed(2)}% pixels differ`); await context.close(); expect(percentage).toBeLessThan(2);
 });
}
