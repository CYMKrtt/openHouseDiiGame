import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const directory = new URL('../../supabase/migrations/', import.meta.url);
const migrations = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort();
const hash = n => n.toString(16).padStart(64, '0');
const hostHash = hash(1000);
const ALL = track => [track, track, track, track, track];

async function fresh() {
  const db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role;');
  for (const name of migrations) await db.exec(await readFile(new URL(name, directory), 'utf8'));
  const call = async (sql, args) => (await db.query(`select ${sql} as result`, args)).rows[0].result;
  return {
    db,
    round: async () => (await call('public.m3_public_state()', [])).roundId,
    join: (round, n) => call('public.m5_join($1::uuid, $2, $3)', [round, hash(n), `Player ${n}`]),
    online: (round, n) => call('public.m5_presence($1::uuid, $2, $3::uuid, $4::uuid, false)', [round, hash(n), randomUUID(), randomUUID()]),
    submit: (round, n, answers, candidates) =>
      call('public.m6_submit_quiz($1::uuid, $2, $3::text[], $4::text[])', [round, hash(n), answers, candidates]),
    close: round => call(`public.m5_start($1::uuid, 'host')`, [round]),
    player: n => call('public.m3_player_state($1)', [hash(n)]),
    host: () => call('public.m3_host_state()', []),
  };
}

test('quiz answers are validated and the company is returned on submit', async t => {
  const api = await fresh();
  t.after(() => api.db.close());
  const round = await api.round();
  await api.join(round, 1);
  await assert.rejects(api.submit(round, 1, ['dev', 'dev'], ['tech']), /INVALID_INPUT/);
  await assert.rejects(api.submit(round, 1, ['dev', 'dev', 'dev', 'dev', 'ops'], ['tech']), /INVALID_INPUT/);
  await assert.rejects(api.submit(round, 1, ALL('dev'), ['it']), /INVALID_INPUT/);
  await assert.rejects(api.submit(round, 2, ALL('dev'), ['tech']), /PLAYER_REQUIRED/);
  await assert.rejects(api.submit(randomUUID(), 1, ALL('dev'), ['tech']), /ROUND_CHANGED/);
  assert.equal((await api.player(1)).companyId, null);
  const own = await api.submit(round, 1, ['design', 'design', 'design', 'dev', 'dev'], ['design']);
  assert.equal(own.companyId, 'design', 'result is available immediately');
  assert.equal(own.phase, 'waiting', 'the round stays open for others');
  assert.deepEqual(own.quizAnswers, ['design', 'design', 'design', 'dev', 'dev']);
  const again = await api.submit(round, 1, ALL('dev'), ['tech']);
  assert.equal(again.companyId, 'design', 'a result never changes');
  assert.deepEqual(again.quizAnswers, ['design', 'design', 'design', 'dev', 'dev']);
  const host = await api.host();
  assert.equal(host.players[0].companyId, 'design', 'Host sees the live result');
  assert.equal(JSON.stringify(host).includes('quiz'), false, 'Host state must not expose quiz answers');
});

test('ties go to the smaller company at submit time; clear winners are never moved', async t => {
  const api = await fresh();
  t.after(() => api.db.close());
  const round = await api.round();
  for (let n = 1; n <= 7; n++) await api.join(round, n);
  for (const n of [1, 2, 3, 4]) assert.equal((await api.submit(round, n, ALL('dev'), ['tech'])).companyId, 'tech');
  assert.equal((await api.submit(round, 5, ['design', 'design', 'design', 'dev', 'biznet'], ['design'])).companyId, 'design');
  assert.equal((await api.submit(round, 6, ['dev', 'biznet', 'design', 'biznet', 'dev'], ['tech', 'ecommerce'])).companyId,
    'ecommerce', 'tie tech/ecommerce goes to ecommerce (0 < 4)');
  assert.equal((await api.submit(round, 7, ['design', 'dev', 'biznet', 'dev', 'design'], ['design', 'tech'])).companyId,
    'design', 'tie design/tech goes to design (1 < 4)');
});

test('a tie with equal company counts keeps the question 5 / question 1 choice', async t => {
  const api = await fresh();
  t.after(() => api.db.close());
  const round = await api.round();
  await api.join(round, 1);
  assert.equal((await api.submit(round, 1, ['dev', 'biznet', 'design', 'biznet', 'dev'], ['tech', 'ecommerce'])).companyId, 'tech');
});

test('Host close works with nobody online, fills unfinished players and locks the round', async t => {
  const api = await fresh();
  t.after(() => api.db.close());
  const round = await api.round();
  await assert.rejects(api.close(round), /START_CONDITION_NOT_MET/, 'an empty round cannot close');
  for (let n = 1; n <= 5; n++) await api.join(round, n);
  for (const n of [1, 2, 3]) await api.submit(round, n, ALL('dev'), ['tech']);
  const closed = await api.close(round);
  assert.equal(closed.phase, 'committed');
  const late = [(await api.player(4)).companyId, (await api.player(5)).companyId].sort();
  assert.deepEqual(late, ['design', 'ecommerce'], 'unfinished players fill the smallest companies');
  assert.equal((await api.player(1)).companyId, 'tech');
  const before = (await api.player(4)).companyId;
  assert.equal((await api.submit(round, 4, ALL('dev'), ['tech'])).companyId, before, 'a late submit cannot change the result');
  await api.join(round, 1);
  await assert.rejects(api.join(round, 9), /SESSION_STARTED/, 'no new joins after close');
  await assert.rejects(api.db.query(`update public.m6_quiz_answers set candidates = array['design']`), /QUIZ_LOCKED/);
  await assert.rejects(api.db.query(`update public.m4_assignments set company_id = 'design'`), /ASSIGNMENTS_IMMUTABLE/);
});

test('the round closes by itself when all 15 seats have a result, and presence does not close it early', async t => {
  const api = await fresh();
  t.after(() => api.db.close());
  const round = await api.round();
  for (let n = 1; n <= 15; n++) await api.join(round, n);
  for (let n = 1; n <= 14; n++) await api.submit(round, n, ALL('design'), ['design']);
  for (let n = 1; n <= 15; n++) await api.online(round, n);
  assert.equal((await api.host()).phase, 'waiting', '15 online is not enough while one player is still answering');
  assert.equal((await api.submit(round, 15, ALL('biznet'), ['ecommerce'])).phase, 'committed');
  const host = await api.host();
  assert.equal(host.players.filter(p => p.companyId === 'design').length, 14, 'unanimous answers are not rebalanced');
  assert.equal(host.players.find(p => p.displayName === 'Player 15').companyId, 'ecommerce');
});

test('Next Round starts with no answers and keeps the previous round history', async t => {
  const api = await fresh();
  t.after(() => api.db.close());
  await api.db.query('select public.m3_create_host_session($1)', [hostHash]);
  const round = await api.round();
  await api.join(round, 1);
  await api.submit(round, 1, ['biznet', 'biznet', 'biznet', 'dev', 'dev'], ['ecommerce']);
  await api.close(round);
  await api.db.query(`update public.m3_session set committed_at = committed_at - interval '12 seconds',
    reveal_start_at = reveal_start_at - interval '12 seconds' where singleton`);
  const next = (await api.db.query('select public.m5_next_round($1::uuid, $2) as result', [round, hostHash])).rows[0].result.roundId;
  assert.notEqual(next, round);
  await api.join(next, 1);
  const own = await api.player(1);
  assert.equal(own.roundId, next);
  assert.equal(own.quizAnswers, null);
  assert.equal(own.companyId, null);
  assert.equal((await api.submit(next, 1, ALL('dev'), ['tech'])).companyId, 'tech');
  const rows = (await api.db.query('select count(*)::int as n from public.m4_assignments')).rows[0].n;
  assert.equal(rows, 2, 'previous round result is kept');
  await assert.rejects(api.submit(round, 1, ALL('dev'), ['tech']), /ROUND_CHANGED/);
});

test('browser roles cannot read answers or call the quiz functions', async t => {
  const api = await fresh();
  t.after(() => api.db.close());
  const round = await api.round();
  for (const role of ['anon', 'authenticated']) {
    await api.db.exec(`set role ${role}`);
    try {
      await assert.rejects(api.db.query('select * from public.m6_quiz_answers'), /permission denied/);
      await assert.rejects(api.submit(round, 1, ALL('dev'), ['tech']), /permission denied/);
      await assert.rejects(api.close(round), /permission denied/);
    } finally { await api.db.exec('reset role'); }
  }
});
