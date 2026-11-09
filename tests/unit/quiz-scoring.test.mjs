import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assignCompanies, isCompleteAnswers, optionOrder, pickCompany, randomAnswers, scoreQuiz } from '../../src/lib/quizScoring.ts';

test('clear winner 4-1-0 picks the top track', () => {
  const result = scoreQuiz(['dev', 'dev', 'design', 'dev', 'dev']);
  assert.deepEqual(result.scores, { dev: 4, design: 1, biznet: 0 });
  assert.deepEqual(result.percents, { dev: 80, design: 20, biznet: 0 });
  assert.equal(result.winner, 'dev');
  assert.equal(result.tied, false);
  assert.deepEqual(result.candidates, ['tech']);
});

test('clear winner 3-1-1 and 3-2-0 ignore question 5', () => {
  const a = scoreQuiz(['biznet', 'design', 'biznet', 'biznet', 'dev']);
  assert.equal(a.winner, 'biznet');
  assert.deepEqual(a.candidates, ['ecommerce']);
  const b = scoreQuiz(['design', 'design', 'dev', 'design', 'dev']);
  assert.equal(b.winner, 'design');
  assert.deepEqual(b.percents, { dev: 40, design: 60, biznet: 0 });
});

test('all answers in one track gives 100%', () => {
  const result = scoreQuiz(['design', 'design', 'design', 'design', 'design']);
  assert.deepEqual(result.percents, { dev: 0, design: 100, biznet: 0 });
  assert.equal(result.winner, 'design');
  assert.deepEqual(result.candidates, ['design']);
});

test('2-2-1 tie is decided by question 5', () => {
  const result = scoreQuiz(['dev', 'design', 'biznet', 'dev', 'design']);
  assert.deepEqual(result.scores, { dev: 2, design: 2, biznet: 1 });
  assert.equal(result.tied, true);
  assert.equal(result.winner, 'design');
  assert.deepEqual(result.candidates, ['design', 'tech']);
});

test('2-2-1 tie falls back to question 1 when question 5 is the low track', () => {
  const result = scoreQuiz(['biznet', 'dev', 'dev', 'biznet', 'design']);
  assert.deepEqual(result.scores, { dev: 2, design: 1, biznet: 2 });
  assert.equal(result.winner, 'biznet');
  assert.deepEqual(result.candidates, ['ecommerce', 'tech']);
});

test('percentages always total 100', () => {
  for (let i = 0; i < 200; i++) {
    const { percents } = scoreQuiz(randomAnswers());
    assert.equal(percents.dev + percents.design + percents.biznet, 100);
  }
});

test('incomplete or unknown answers are rejected', () => {
  assert.equal(isCompleteAnswers(['dev', 'dev']), false);
  assert.equal(isCompleteAnswers(['dev', 'dev', 'dev', 'dev', 'ops']), false);
  assert.equal(isCompleteAnswers('dev'), false);
  assert.throws(() => scoreQuiz(['dev']), /INVALID_ANSWERS/);
});

test('clear winners are never moved, even when one company is crowded', () => {
  const players = Array.from({ length: 9 }, (_, i) => ({ id: `d${i}`, candidates: ['tech'] }));
  players.push({ id: 'x', candidates: ['design'] });
  const result = assignCompanies(players);
  for (let i = 0; i < 9; i++) assert.equal(result.get(`d${i}`), 'tech');
  assert.equal(result.get('x'), 'design');
});

test('tied players go to the tied company with fewer members', () => {
  const players = [
    { id: 'a', candidates: ['tech'] },
    { id: 'b', candidates: ['tech'] },
    { id: 'c', candidates: ['design'] },
    { id: 'tie1', candidates: ['tech', 'design'] },
    { id: 'tie2', candidates: ['tech', 'design'] },
  ];
  const result = assignCompanies(players);
  assert.equal(result.get('tie1'), 'design');
  // Now tech 2, design 2: equal counts keep the question 5 / question 1 choice.
  assert.equal(result.get('tie2'), 'tech');
});

test('players without answers fill the smallest companies', () => {
  const players = [
    { id: 'a', candidates: ['tech'] },
    { id: 'b', candidates: ['tech'] },
    { id: 'c', candidates: ['design'] },
    { id: 'none1' },
    { id: 'none2', candidates: null },
  ];
  const result = assignCompanies(players, () => 0);
  assert.equal(result.size, 5);
  const counts = { tech: 0, design: 0, ecommerce: 0 };
  for (const company of result.values()) counts[company]++;
  assert.deepEqual(counts, { tech: 2, design: 2, ecommerce: 1 });
  assert.equal(result.get('none1') === 'tech' || result.get('none2') === 'tech', false);
});

test('option order is a stable permutation per player and question', () => {
  const order = optionOrder('player-1', 0);
  assert.deepEqual([...order].sort(), [0, 1, 2]);
  assert.deepEqual(optionOrder('player-1', 0), order);
  const seen = new Set();
  for (let i = 0; i < 30; i++) seen.add(optionOrder(`p${i}`, 0).join(''));
  assert.ok(seen.size > 1, 'different players should see different orders');
});

test('instant pick: a clear winner ignores crowding', () => {
  assert.equal(pickCompany(['tech'], { tech: 12, design: 0, ecommerce: 0 }), 'tech');
});

test('instant pick: a tie goes to the tied company with fewer members at submit time', () => {
  assert.equal(pickCompany(['tech', 'design'], { tech: 3, design: 1, ecommerce: 0 }), 'design');
  assert.equal(pickCompany(['tech', 'design'], { tech: 1, design: 3, ecommerce: 0 }), 'tech');
  // Equal counts keep the question 5 / question 1 choice (first candidate).
  assert.equal(pickCompany(['design', 'tech'], { tech: 2, design: 2, ecommerce: 0 }), 'design');
  assert.throws(() => pickCompany([], { tech: 0, design: 0, ecommerce: 0 }), /INVALID_CANDIDATES/);
});

test('closing a round fills only players without a company, on top of existing members', () => {
  const result = assignCompanies([{ id: 'late1' }, { id: 'late2' }], () => 0, { tech: 3, design: 1, ecommerce: 1 });
  assert.deepEqual([...result.values()].sort(), ['design', 'ecommerce']);
});
