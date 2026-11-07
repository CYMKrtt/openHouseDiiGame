import { test, expect } from '@playwright/test';

test('player and host share local mock state, include offline and retain assignment', async ({ page, context }) => {
  await page.goto('/');
  await page.getByLabel('ก่อนเริ่มกิจกรรม บอกชื่อของคุณหน่อย!').fill('ผู้เล่น');
  await page.getByRole('button', {name:'Join'}).click();
  await expect(page).toHaveURL(/\/lobby/);
  await expect(page.getByText('ผู้เล่น', {exact:true})).toBeVisible();
  await page.locator('summary').click();
  await page.getByRole('button',{name:'+ ผู้เล่นใหม่'}).click();
  await page.getByRole('button',{name:'− ผู้เล่นออฟไลน์'}).click();
  const host = await context.newPage(); await host.goto('/host');
  await host.getByLabel('รหัสผ่าน Host (สำหรับ Prototype)').fill('demo-host');
  await host.getByRole('button',{name:'เข้าสู่ Host Dashboard'}).click();
  await expect(host.getByText('2 คนที่จองแล้ว')).toBeVisible();
  await host.getByRole('button',{name:'เริ่มเปิดเผยบริษัท ✦'}).focus(); await host.getByRole('button',{name:'เริ่มเปิดเผยบริษัท ✦'}).press('Space');
  await expect(host.getByRole('dialog',{name:'เริ่มเปิดเผยบริษัท?'})).toBeVisible();
  const revealStartedAt=Date.now();
  await host.getByRole('button',{name:'ยืนยันการเริ่ม'}).focus(); await host.getByRole('button',{name:'ยืนยันการเริ่ม'}).press('Space');
  await expect(host.getByRole('button',{name:'ผลบริษัทล็อกแล้ว ✓'})).toBeDisabled();
  await expect(page).toHaveURL(/\/reveal/, {timeout:10000});
  await expect(page.getByText('COMPANY ASSIGNMENT COMPLETE', {exact:false})).toBeVisible({timeout:10000});
  expect(Date.now()-revealStartedAt).toBeGreaterThanOrEqual(4000);
  const label=await page.locator('.reveal-title').innerText();
  await page.goto('/'); await expect(page).toHaveURL(/reveal/); await expect(page.locator('.reveal-title')).toHaveText(label,{timeout:10000});
});

test('name, keyboard, disconnect and reconnect', async ({ page }) => {
 await page.goto('/'); const input=page.getByLabel('ก่อนเริ่มกิจกรรม บอกชื่อของคุณหน่อย!');
 await input.fill('ก'.repeat(31)); await input.press('Enter'); await expect(page.getByRole('status')).toContainText('1–30');
 await input.fill('คีย์บอร์ด'); await input.press('Enter'); await expect(page).toHaveURL(/lobby/);
 await page.locator('summary').click(); await page.getByRole('button',{name:'เน็ตคุณหลุด'}).click(); await expect(page.locator('.offline-banner')).toContainText('ยังยืนยันจำนวนออนไลน์ล่าสุดไม่ได้');
 await page.getByRole('button',{name:'เชื่อมต่อกลับ'}).click(); await expect(page.getByText('✓ เข้าร่วมแล้ว')).toBeVisible();
});


test('responsive overflow, focus and reduced motion', async ({ browser }) => {
 for(const size of [{width:320,height:640},{width:390,height:844},{width:1440,height:900}]) {
  const context=await browser.newContext({viewport:size,reducedMotion:'reduce'});const page=await context.newPage();
  for(const route of ['/','/lobby','/reveal','/host']){await page.goto(route); await page.locator('body').waitFor(); const dimensions=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth}));expect(dimensions.document,`${route} ${size.width}`).toBeLessThanOrEqual(dimensions.viewport);}
  await page.goto('/'); await page.keyboard.press('Tab'); await expect(page.getByLabel('ก่อนเริ่มกิจกรรม บอกชื่อของคุณหน่อย!')).toBeFocused();
  const focus=await page.getByLabel('ก่อนเริ่มกิจกรรม บอกชื่อของคุณหน่อย!').evaluate(el=>getComputedStyle(el).outlineStyle); expect(focus).not.toBe('none');
  const animations=await page.locator('.scene .monitor-glow').first().evaluate(el=>getComputedStyle(el).animationName); expect(animations).toBe('none');
  await context.close();
 }
});

test('automatic start balances all 15 and blocks new admission', async ({ page, context }) => {
 await page.goto('/');await page.getByLabel('ก่อนเริ่มกิจกรรม บอกชื่อของคุณหน่อย!').fill('หนึ่ง');await page.getByRole('button',{name:'Join'}).click();await expect(page).toHaveURL(/lobby/);
 await page.locator('summary').click();for(let i=0;i<14;i++) await page.getByRole('button',{name:'+ ผู้เล่นใหม่'}).click();
 await expect(page).toHaveURL(/reveal/,{timeout:10000});
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('little-world-m2-mock-v1')||'{}'));expect(state.started).toBe(true);expect(state.players).toHaveLength(15);
 for(const id of ['tech','design','ecommerce'])expect(state.players.filter((p:{company:string})=>p.company===id)).toHaveLength(5);
 const newcomer=await context.newPage();await newcomer.goto('/');await newcomer.getByLabel('ก่อนเริ่มกิจกรรม บอกชื่อของคุณหน่อย!').fill('มาใหม่');await newcomer.getByRole('button',{name:'Join'}).click();await expect(newcomer.getByRole('status')).toContainText('กิจกรรมเริ่มแล้ว');
});
