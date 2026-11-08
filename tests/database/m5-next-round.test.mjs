import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const directory = new URL('../../supabase/migrations/', import.meta.url);
const migrations = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort();
const hash = n => n.toString(16).padStart(64, '0');
const hostHash = hash(100);

test('Next Round preserves an M4 session and isolates all new-round activity', async t => {
 const db = new PGlite();
 t.after(() => db.close());
 const rpc = async (name, ...args) => {
  const params = args.map((_, index) => '$' + (index + 1)).join(', ');
  return (await db.query(`select public.${name}(${params}) as result`, args)).rows[0].result;
 };
 const apply = async name => db.exec(await readFile(new URL(name, directory), 'utf8'));
 const snapshot = identity => rpc('m5_bootstrap', identity);
 const present = (round, identity, connection = randomUUID(), generation = randomUUID(), disconnect = false) =>
  rpc('m5_presence', round, identity, connection, generation, disconnect);
 const history = async () => (await db.query(
  'select p.id, p.display_name, p.identity_hash, a.company_id, a.committed_at from public.m3_players p join public.m4_assignments a on a.player_id=p.id order by p.id'
 )).rows;
 const finishReveal = () => db.query(`update public.m3_session
  set committed_at = committed_at - interval '12 seconds', reveal_start_at = reveal_start_at - interval '12 seconds'
  where singleton`);

 await db.exec('create role anon; create role authenticated; create role service_role;');
 for (const migration of migrations.filter(name => name < '202611080003')) await apply(migration);
 await rpc('m3_create_host_session', hostHash);
 const original = await rpc('m3_join', hash(1), 'Previous participant');
 const connection = randomUUID();
 const generation = randomUUID();
 await rpc('m3_heartbeat', hash(1), connection, generation);
 await rpc('m4_start', 'host');
 const before = await history();
 await apply('202611080003_m5_next_round.sql');
 const old = (await snapshot(hash(1))).own;
 assert.equal(old.playerId, original.playerId);
 assert.deepEqual(await history(), before);

 await t.test('Host and reveal completion are required', async () => {
  assert.equal((await rpc('m3_host_state')).canNextRound, false);
  await assert.rejects(rpc('m5_next_round', old.roundId, hash(99)), /HOST_AUTH_REQUIRED/);
  await assert.rejects(rpc('m5_next_round', old.roundId, hostHash), /REVEAL_IN_PROGRESS/);
  for (const role of ['anon', 'authenticated']) {
   await db.exec(`set role ${role}`);
   try {
    await assert.rejects(rpc('m5_next_round', old.roundId, hostHash), /permission denied/);
    await assert.rejects(db.query('select * from public.m4_assignments'), /permission denied/);
   } finally { await db.exec('reset role'); }
  }
 });

 let next;
 await t.test('duplicate requests return one successor and preserve the original result', async () => {
  await finishReveal();
  const completed = await rpc('m3_host_state');
  assert.equal(completed.canNextRound, true);
  const results = await Promise.all(Array.from({length: 4}, () => rpc('m5_next_round', old.roundId, hostHash)));
  assert.equal(results.filter(result => !result.alreadyRotated).length, 1);
  next = results[0].roundId;
  assert.notEqual(next, old.roundId);
  assert.ok(results.every(result => result.roundId === next));
  const active = await rpc('m3_host_state');
  assert.equal(active.roundId, next);
  assert.ok(active.revision > completed.revision);
  assert.equal(active.phase, 'waiting');
  assert.equal(active.revealStartAt, null);
  assert.equal(active.canNextRound, false);
  assert.equal(active.reservedCount, 0);
  assert.equal(active.onlineCount, 0);
  assert.deepEqual(active.players, []);
  assert.deepEqual(await history(), before);
  const archived = (await db.query(
   'select status, ended_at, reveal_start_at from public.m3_session where round_id=$1', [old.roundId]
  )).rows[0];
  assert.equal(archived.status, 'committed');
  assert.ok(archived.ended_at);
  assert.equal(new Date(archived.reveal_start_at).toISOString(), new Date(completed.revealStartAt).toISOString());
  assert.ok((await db.query('select revoked_at from public.m3_connections where id=$1', [connection])).rows[0].revoked_at);
 });

 await t.test('old tabs cannot join or affect presence in the active round', async () => {
  const current = await snapshot(hash(1));
  assert.equal(current.own, null);
  assert.equal(current.state.roundId, next);
  await assert.rejects(rpc('m5_join', old.roundId, hash(2), 'Delayed join'), /ROUND_CHANGED/);
  await assert.rejects(present(old.roundId, hash(1), connection, generation), /ROUND_CHANGED/);
  await assert.rejects(present(old.roundId, hash(1), connection, generation, true), /ROUND_CHANGED/);
  await assert.rejects(present(next, hash(1)), /PLAYER_REQUIRED/);
  await assert.rejects(rpc('m5_start', old.roundId, 'host'), /ROUND_CHANGED/);
  await assert.rejects(rpc('m5_start', next, 'host'), /START_CONDITION_NOT_MET/);
  const explicitJoin = await rpc('m5_join', next, hash(1), 'New registration');
  assert.notEqual(explicitJoin.playerId, old.playerId);
  assert.equal((await snapshot(hash(1))).own.playerId, explicitJoin.playerId);
  await assert.rejects(present(next, hash(1), connection, generation), /CONNECTION_CONFLICT/);
 });

 await t.test('new rounds can start by Auto at 15 and by Host at one', async () => {
  for (let n = 1; n <= 15; n++) {
   await rpc('m5_join', next, hash(n), 'Player ' + n);
   const state = await present(next, hash(n));
   assert.equal(state.onlineCount, n);
   assert.equal(state.phase, n === 15 ? 'committed' : 'waiting');
  }
  const retryStart = await rpc('m5_start', next, 'host');
  assert.equal(retryStart.startSource, 'auto');
  assert.equal(retryStart.alreadyCommitted, true);
  const roster = (await rpc('m3_host_state')).players;
  assert.deepEqual(['tech', 'design', 'ecommerce'].map(company => roster.filter(p => p.companyId === company).length), [5, 5, 5]);
  assert.ok((await snapshot(hash(15))).own.companyId);
  assert.equal((await history()).length, 16);
  await finishReveal();
  const third = await rpc('m5_next_round', next, hostHash);
  assert.equal((await rpc('m5_next_round', old.roundId, hostHash)).roundId, next);
  assert.equal((await rpc('m3_public_state')).roundId, third.roundId);
  await rpc('m5_join', third.roundId, hash(1), 'Host round');
  await present(third.roundId, hash(1));
  assert.equal((await rpc('m5_start', third.roundId, 'host')).startSource, 'host');
  assert.ok((await snapshot(hash(1))).own.companyId);
  assert.equal((await history()).length, 17);
 });
});
