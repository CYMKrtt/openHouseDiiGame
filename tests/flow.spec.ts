import { test, expect, type Page } from '@playwright/test';
import { quizQuestions } from '../src/lib/quiz';
import type { Track } from '../src/lib/quizScoring';

const nameLabel = 'ก่อนเริ่มกิจกรรม บอกชื่อของคุณหน่อย!';
const optionText = (question: number, track: Track) => quizQuestions[question].options.find(o => o.track === track)!.text;
type MockPlayer = { name: string; company?: string; quiz?: { answers: string[]; candidates: string[] } };
const mockState = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('little-world-m2-mock-v1') || '{}'));

/** Answer all five questions with the given tracks; the result page opens right away. */
async function answerQuiz(page: Page, tracks: Track[]) {
  await expect(page).toHaveURL(/\/quiz/);
  for (let i = 0; i < tracks.length; i++) {
    await expect(page.locator('.quiz-count')).toHaveText(`${i + 1}/5`);
    await page.getByRole('radio', { name: optionText(i, tracks[i]) }).click();
  }
  await page.getByRole('button', { name: 'ส่งคำตอบ' }).click();
  await expect(page).toHaveURL(/\/reveal/);
}

async function openHost(page: Page) {
  const host = await page.context().newPage(); await host.goto('/host');
  await host.getByLabel('รหัสผ่าน Host (สำหรับ Prototype)').fill('demo-host');
  await host.getByRole('button', {name:'เข้าสู่ Host Dashboard'}).click();
  return host;
}

test('a player sees their company right after the quiz; Host sees it live and closes the round', async ({ page, context }) => {
  await page.goto('/');
  await page.getByLabel(nameLabel).fill('ผู้เล่น');
  await page.getByRole('button', {name:'Join'}).click();
  const submittedAt = Date.now();
  await answerQuiz(page, ['dev', 'dev', 'design', 'dev', 'biznet']);
  await expect(page.getByText('COMPANY ASSIGNMENT COMPLETE', {exact:false})).toBeVisible({timeout:10000});
  expect(Date.now()-submittedAt, 'the original 4 s star reveal still plays').toBeGreaterThanOrEqual(4000);
  // Three DEV answers is a clear win, so the result comes from the score, not a draw.
  await expect(page.locator('.reveal-title')).toHaveText('Tech');
  await expect(page.getByRole('region', {name:'CODE อ่านกัน!'})).toContainText('สะสมแสตมป์');
  const insight = page.getByRole('region', {name:/คุณเหมาะกับสาย/});
  await expect(insight).toBeVisible();
  await expect(insight.locator('li.mine')).toContainText('60%');
  await expect(insight).toContainText('DII');

  const host = await openHost(page);
  await expect(host.getByText('1 คนที่จองแล้ว')).toBeVisible();
  await expect(host.locator('.roster')).toContainText('Tech');
  await expect(host.locator('.roster')).not.toContainText('DEV');
  const late = await context.newPage(); await late.goto('/');
  await late.getByLabel(nameLabel).fill('ยังไม่เสร็จ'); await late.getByRole('button',{name:'Join'}).click(); await expect(late).toHaveURL(/\/quiz/);
  await host.getByRole('button',{name:'ปิดรอบ ✦'}).focus(); await host.getByRole('button',{name:'ปิดรอบ ✦'}).press('Space');
  await expect(host.getByRole('dialog',{name:'ปิดรอบนี้?'})).toContainText('ได้บริษัทแล้ว 1 คน');
  await host.getByRole('button',{name:'ยืนยันปิดรอบ'}).focus(); await host.getByRole('button',{name:'ยืนยันปิดรอบ'}).press('Space');
  await expect(host.getByRole('button',{name:'ปิดรอบแล้ว ✓'})).toBeDisabled();
  // The unfinished player is placed in a least-filled company and sent to their result.
  await expect(late).toHaveURL(/\/reveal/, {timeout:10000});
  const state = await mockState(page);
  expect(state.started).toBe(true);
  expect(['design','ecommerce']).toContain(state.players.find((p:MockPlayer)=>p.name==='ยังไม่เสร็จ').company);
  await page.goto('/'); await expect(page).toHaveURL(/reveal/); await expect(page.locator('.reveal-title')).toHaveText('Tech',{timeout:10000});
  const newcomer = await context.newPage(); await newcomer.goto('/');
  await newcomer.getByLabel(nameLabel).fill('มาใหม่'); await newcomer.getByRole('button',{name:'Join'}).click();
  await expect(newcomer.getByRole('status')).toContainText('กิจกรรมเริ่มแล้ว');
});

test('quiz keeps answers on back and refresh, and hides track labels', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel(nameLabel).fill('ทดสอบ'); await page.getByRole('button',{name:'Join'}).click();
  await expect(page).toHaveURL(/\/quiz/);
  await expect(page.getByRole('progressbar',{name:'ความคืบหน้าแบบทดสอบ'})).toHaveAttribute('aria-valuenow','1');
  await expect(page.getByRole('button',{name:/ย้อนกลับ/})).toBeDisabled();
  await page.getByRole('radio',{name:optionText(0,'biznet')}).click();
  await expect(page.locator('.quiz-count')).toHaveText('2/5');
  await page.getByRole('radio',{name:optionText(1,'design')}).click();
  await expect(page.locator('.quiz-count')).toHaveText('3/5');
  await page.getByRole('button',{name:/ย้อนกลับ/}).click();
  await expect(page.locator('.quiz-count')).toHaveText('2/5');
  await expect(page.getByRole('radio',{name:optionText(1,'design')})).toHaveAttribute('aria-checked','true');
  const order = await page.locator('.quiz-text').allInnerTexts();
  await page.reload();
  await expect(page.locator('.quiz-count')).toHaveText('2/5');
  await expect(page.getByRole('radio',{name:optionText(1,'design')})).toHaveAttribute('aria-checked','true');
  expect(await page.locator('.quiz-text').allInnerTexts(), 'option order survives refresh').toEqual(order);
  await expect(page.locator('main')).not.toContainText(/DEV|BIZNET|DESIGN/);
  await page.getByRole('button',{name:/ถัดไป/}).click();
  for (const [i, track] of [[2,'biznet'],[3,'biznet']] as const) {
    await expect(page.locator('.quiz-count')).toHaveText(`${i+1}/5`);
    await page.getByRole('radio',{name:optionText(i,track)}).click();
  }
  await expect(page.locator('.quiz-count')).toHaveText('5/5');
  await page.getByRole('radio',{name:optionText(4,'dev')}).click();
  await page.getByRole('button',{name:'ส่งคำตอบ'}).click();
  await expect(page).toHaveURL(/\/reveal/);
  const state = await mockState(page);
  expect(state.started, 'one result does not close the round').toBe(false);
  expect(state.players[0].quiz).toEqual({answers:['biznet','design','biznet','biznet','dev'],candidates:['ecommerce']});
  expect(state.players[0].company).toBe('ecommerce');
  await page.goto('/quiz'); await expect(page).toHaveURL(/\/reveal/);
});

test('name validation, keyboard join and old lobby links', async ({ page }) => {
 await page.goto('/'); const input=page.getByLabel(nameLabel);
 await input.fill('ก'.repeat(31)); await input.press('Enter'); await expect(page.getByRole('status')).toContainText('1–30');
 await input.fill('คีย์บอร์ด'); await input.press('Enter'); await expect(page).toHaveURL(/quiz/);
 await page.goto('/lobby'); await expect(page).toHaveURL(/quiz/);
 await answerQuiz(page, ['design', 'design', 'design', 'dev', 'dev']);
 await page.goto('/lobby'); await expect(page).toHaveURL(/reveal/, {timeout:5000});
 await expect(page.locator('.reveal-title')).toHaveText('Design', {timeout:10000});
});


test('responsive overflow, focus and reduced motion', async ({ browser }) => {
 for(const size of [{width:320,height:640},{width:390,height:844},{width:1440,height:900}]) {
  const context=await browser.newContext({viewport:size,reducedMotion:'reduce'});const page=await context.newPage();
  for(const route of ['/','/lobby','/reveal','/host']){await page.goto(route); await page.locator('body').waitFor(); const dimensions=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth}));expect(dimensions.document,`${route} ${size.width}`).toBeLessThanOrEqual(dimensions.viewport);}
  await page.goto('/'); await page.keyboard.press('Tab'); await expect(page.getByLabel(nameLabel)).toBeFocused();
  const focus=await page.getByLabel(nameLabel).evaluate(el=>getComputedStyle(el).outlineStyle); expect(focus).not.toBe('none');
  const animations=await page.locator('.scene .monitor-glow').first().evaluate(el=>getComputedStyle(el).animationName); expect(animations).toBe('none');
  await page.getByLabel(nameLabel).fill('จอเล็ก'); await page.getByRole('button',{name:'Join'}).click(); await expect(page).toHaveURL(/quiz/);
  await expect(page.locator('.quiz-option').first()).toBeVisible();
  const quiz=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth,height:Math.min(...[...document.querySelectorAll('.quiz-option')].map(el=>el.getBoundingClientRect().height))}));
  expect(quiz.document,`/quiz ${size.width}`).toBeLessThanOrEqual(quiz.viewport);
  expect(quiz.height,'option buttons are large tap targets').toBeGreaterThanOrEqual(56);
  await context.close();
 }
});

test('the round closes by itself once all 15 seats have a result', async ({ page }) => {
 await page.goto('/');await page.getByLabel(nameLabel).fill('หนึ่ง');await page.getByRole('button',{name:'Join'}).click();
 await answerQuiz(page, ['design', 'biznet', 'design', 'design', 'dev']);
 await expect(page.locator('.reveal-title')).toHaveText('Design',{timeout:10000});
 await expect(page.getByRole('region',{name:'จับผิดภาพ'})).toBeVisible();
 const host = await openHost(page);
 await host.locator('summary').click();
 for(let i=0;i<13;i++) await host.getByRole('button',{name:'+ ผู้เล่นจำลอง'}).click();
 await expect(host.getByText('14 คนที่จองแล้ว')).toBeVisible();
 await expect(host.getByRole('button',{name:'ปิดรอบ ✦'})).toBeEnabled();
 await host.getByRole('button',{name:'+ ผู้เล่นจำลอง'}).click();
 await expect(host.getByRole('button',{name:'ปิดรอบแล้ว ✓'})).toBeDisabled();
 const state=await mockState(page);expect(state.started).toBe(true);expect(state.players).toHaveLength(15);
 expect(state.players[0].company).toBe('design');
 for(const p of state.players as MockPlayer[]){
  expect(['tech','design','ecommerce']).toContain(p.company);
  if(p.quiz?.candidates.length===1)expect(p.company,'clear winners are never moved').toBe(p.quiz.candidates[0]);else expect(p.quiz?.candidates).toContain(p.company);
 }
});
