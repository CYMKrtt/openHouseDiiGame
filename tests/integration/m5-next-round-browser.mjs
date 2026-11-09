// Isolated browser/API smoke. The loopback RPC adapter runs the real SQL in PGlite.
import assert from 'node:assert/strict';
import { randomBytes, scryptSync } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { setTimeout as delay } from 'node:timers/promises';
import { PGlite } from '@electric-sql/pglite';
import { chromium, expect } from '@playwright/test';
import { quizQuestions } from '../../src/lib/quiz.ts';

const require = createRequire(import.meta.url);
const db = new PGlite();
const rpcServer = createServer(async (req, res) => {
 res.setHeader('content-type', 'application/json');
 try {
  const rpc = req.url.match(/^\/rest\/v1\/rpc\/([a-z_0-9]+)$/)?.[1];
  assert.ok(req.method === 'POST' && rpc);
  let body = '';
  for await (const chunk of req) body += chunk;
  const args = Object.entries(JSON.parse(body || '{}'));
  assert.ok(args.every(([name]) => /^p_[a-z_]+$/.test(name)));
  const sqlArgs = args.map(([name], index) => name + ' => $' + (index + 1)).join(',');
  const result = await db.query('select public.' + rpc + '(' + sqlArgs + ') as result', args.map(([, value]) => value));
  res.end(JSON.stringify(result.rows[0].result ?? null));
 } catch (error) {
  res.statusCode = 400;
  res.end(JSON.stringify({message: error.message}));
 }
});

let app, browser, stage = 'database setup';
/** Answer every question with one track; the result page opens right away. */
const answerQuiz = async (page, track) => {
 await page.waitForURL('**/quiz');
 for (let i = 0; i < quizQuestions.length; i++) {
  await expect(page.locator('.quiz-count')).toHaveText(`${i + 1}/5`);
  await page.getByRole('radio', {name: quizQuestions[i].options.find(o => o.track === track).text}).click();
 }
 await page.getByRole('button', {name: 'ส่งคำตอบ'}).click();
 await page.waitForURL('**/reveal');
};
const appPort = createServer();
try {
 await db.exec('create role anon; create role authenticated; create role service_role;');
 const migrations = new URL('../../supabase/migrations/', import.meta.url);
 for (const file of (await readdir(migrations)).filter(name => name.endsWith('.sql')).sort()) {
  await db.exec(await readFile(new URL(file, migrations), 'utf8'));
 }
 const fixtureRound = (await db.query('select round_id from public.m3_session where singleton')).rows[0].round_id;
 rpcServer.listen(0, '127.0.0.1');
 await once(rpcServer, 'listening');
 appPort.listen(0, '127.0.0.1');
 await once(appPort, 'listening');
 const port = String(appPort.address().port);
 const origin = 'http://127.0.0.1:' + port;
 const password = randomBytes(24).toString('base64url');
 const salt = randomBytes(16);
 const verifier = ['scrypt', salt.toString('base64url'), scryptSync(password, salt, 64).toString('base64url')].join(':');
 const env = {...process.env, NODE_ENV: 'production', M3_TEST_DIST_DIR: '.next-m4',
   NEXT_PUBLIC_SESSION_MODE: 'server', APP_ORIGIN: origin, HOST_PASSWORD_SCRYPT: verifier,
   SUPABASE_URL: 'http://127.0.0.1:' + rpcServer.address().port, SUPABASE_SERVICE_ROLE_KEY: 'local-test-only',
   NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: ''};
 const next = require.resolve('next/dist/bin/next');
 const options = {stdio: 'ignore', windowsHide: true, env};
 stage = 'production build';
 const build = spawn(process.execPath, [next, 'build'], options);
 const [buildExit] = await once(build, 'exit');
 assert.equal(buildExit, 0);
 console.log('Next Round production build passed.');
 stage = 'local server startup';
 await new Promise(resolve => appPort.close(resolve));
 app = spawn(process.execPath, [next, 'start', '--hostname', '127.0.0.1', '--port', port], options);
 for (let i = 0; ; i++) {
  assert.ok(i < 60 && app.exitCode === null, 'Local app failed to start');
  const response = await fetch(origin + '/api/v1/session').catch(() => null);
  if (response?.ok && (await response.json()).roundId === fixtureRound) break;
  await delay(500);
 }

 stage = 'first join and Host authorization';
 browser = await chromium.launch({executablePath: process.env.CHROMIUM_EXECUTABLE ??
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const viewport = {width: 320, height: 640};
 const player = await browser.newPage({viewport, reducedMotion: 'reduce'});
 const host = await browser.newPage({viewport});
 const checkWidth = async page => {
  const dimensions = await page.evaluate(() => ({page: document.documentElement.scrollWidth, viewport: innerWidth}));
  assert.ok(dimensions.page <= dimensions.viewport, 'Page overflows at 320 CSS pixels');
 };
 const resetPath = origin + '/api/v1/host/next-round';
 const headers = {Origin: origin};
 assert.equal((await player.request.post(resetPath, {headers, data: {}})).status(), 401);
 await player.goto(origin);
 await checkWidth(player);
 const name = player.getByLabel('ก่อนเริ่มกิจกรรม บอกชื่อของคุณหน่อย!');
 await name.fill('W'.repeat(31));
 await name.press('Enter');
 await expect(name).toHaveAttribute('aria-invalid', 'true');
 await expect(name).toBeFocused();
 await name.fill('W'.repeat(30));
 await expect(name).toHaveAttribute('aria-invalid', 'false');
 await player.getByRole('button', {name: /Join/}).click();
 await player.waitForURL('**/quiz');
 await checkWidth(player);
 stage = 'instant result';
 await answerQuiz(player, 'biznet');
 await expect(player.locator('.reveal-stage')).toBeVisible({timeout: 15000});
 await expect(player.getByRole('status')).toContainText('ยินดีต้อนรับเข้าสู่ E-Com');
 await expect(player.getByRole('region', {name: /คุณเหมาะกับสาย BIZNET/})).toContainText('100%');
 await expect(player.getByRole('region', {name: 'Circus Pitching'})).toContainText('Bingo!');
 await expect(player.getByRole('img', {name: /ภาพห้องทำงาน Pixel Art/})).toBeVisible();
 await checkWidth(player);

 stage = 'Host live view and close round';
 await host.goto(origin + '/host');
 const passwordField = host.getByLabel('รหัสผ่าน Host');
 await expect(passwordField).toBeFocused();
 await host.keyboard.press('Shift+Tab');
 await expect(host.getByRole('button', {name: 'เข้าสู่ Host Dashboard'})).toBeFocused();
 await host.keyboard.press('Tab');
 await expect(passwordField).toBeFocused();
 await passwordField.fill(password);
 await passwordField.press('Enter');
 const closeButton = host.getByRole('button', {name: 'ปิดรอบ ✦'});
 const nextButton = host.getByRole('button', {name: 'Next Round'});
 await expect(closeButton).toBeEnabled();
 await expect(host.getByRole('heading', {name: 'ภาพรวมกิจกรรม'})).toBeFocused();
 await checkWidth(host);
 await expect(nextButton).toBeDisabled();
 await expect(host.locator('.roster')).toContainText('E-Com');
 await expect(host.locator('.roster')).not.toContainText('BIZNET');
 // The result page keeps a presence lease, so the Host sees the player online.
 await expect(host.locator('.roster .presence')).toHaveText(/Online/, {timeout: 15000});
 const state = await (await host.request.get(origin + '/api/v1/host/session')).json();
 assert.equal((await host.request.post(resetPath, {headers, data: {
  roundId: state.roundId, confirmationToken: state.confirmationToken,
 }})).status(), 403, 'Close confirmation cannot be used to rotate');
 await closeButton.click();
 await host.getByRole('button', {name: 'ยืนยันปิดรอบ'}).click();
 await expect(host.getByRole('button', {name: 'ปิดรอบแล้ว ✓'})).toBeDisabled({timeout: 10000});
 await expect(player.getByRole('status')).toContainText('ยินดีต้อนรับเข้าสู่ E-Com');
 await expect(nextButton).toBeEnabled({timeout: 20000});

 const finished = await (await host.request.get(origin + '/api/v1/host/session')).json();
 stage = 'Host rotation and old player redirect';
 const reset = {roundId: finished.roundId, confirmationToken: finished.nextRoundToken};
 assert.equal((await host.request.post(resetPath, {headers: {Origin: 'https://untrusted.example'}, data: reset})).status(), 403);
 await nextButton.click();
 const dialog = host.getByRole('dialog', {name: 'เปิดรอบใหม่?'});
 await expect(dialog).toContainText('0 ที่นั่งและ 0 ผู้เล่นออนไลน์');
 await expect(dialog.getByRole('button', {name: 'ยกเลิก'})).toBeFocused();
 await host.keyboard.press('Shift+Tab');
 await expect(dialog.getByRole('button', {name: 'ยืนยันเปิดรอบใหม่'})).toBeFocused();
 await host.keyboard.press('Escape');
 await expect(dialog).toHaveCount(0);
 await expect(nextButton).toBeFocused();
 await nextButton.click();
 await dialog.getByRole('button', {name: 'ยืนยันเปิดรอบใหม่'}).click();
 await expect(host.getByRole('status')).toContainText('เปิดรอบใหม่แล้ว');
 await expect(host.locator('.metric b')).toHaveText(['0 / 15', '0 / 15', '0']);
 await player.waitForURL(origin + '/', {timeout: 12000});
 await expect(player.getByRole('button', {name: /Join/})).toBeEnabled();
 assert.equal((await player.request.get(origin + '/api/v1/me')).status(), 401);
 const replay = await host.request.post(resetPath, {headers, data: reset});
 assert.equal(replay.status(), 200);
 assert.equal((await replay.json()).alreadyRotated, true);

 stage = 'same QR and retained history';
 const newcomer = await browser.newPage();
 await newcomer.goto(origin);
 await newcomer.getByLabel('ก่อนเริ่มกิจกรรม บอกชื่อของคุณหน่อย!').fill('Second participant');
 await newcomer.getByRole('button', {name: /Join/}).click();
 await answerQuiz(newcomer, 'dev');
 await expect(newcomer.getByRole('status')).toContainText('ยินดีต้อนรับเข้าสู่ Tech', {timeout: 15000});
 assert.equal((await db.query('select count(*)::integer as n from public.m3_session')).rows[0].n, 2);
 assert.equal((await db.query('select count(*)::integer as n from public.m4_assignments')).rows[0].n, 2, 'first-round result kept, newcomer placed instantly');
 assert.equal((await db.query('select count(*)::integer as n from public.m6_quiz_answers')).rows[0].n, 2);
 console.log('Server-mode flow passed: instant quiz result, Host live view and close, auth, confirmation, zero seats, polling redirect, idempotence, same QR and retained assignment.');
} catch (error) {
 console.error('Next Round smoke failed during ' + stage + ': ' + error.message.split('\n')[0]);
 process.exitCode = 1;
} finally {
 await browser?.close();
 app?.kill();
 appPort.close();
 rpcServer.closeAllConnections();
 rpcServer.close();
 await db.close();
}
