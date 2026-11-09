/**
 * Pure quiz scoring and company assignment.
 * No imports and only erasable TypeScript, so `node --test` can load this file directly.
 * The SQL in supabase/migrations/202611090001_m6_quiz_assignment.sql mirrors assignCompanies.
 */
export type Track = 'dev' | 'design' | 'biznet';
export type CompanyId = 'tech' | 'design' | 'ecommerce';

export const TRACKS: readonly Track[] = ['dev', 'design', 'biznet'];
export const COMPANY_IDS: readonly CompanyId[] = ['tech', 'design', 'ecommerce'];
export const TRACK_COMPANY: Readonly<Record<Track, CompanyId>> = { dev: 'tech', design: 'design', biznet: 'ecommerce' };
export const COMPANY_TRACK: Readonly<Record<CompanyId, Track>> = { tech: 'dev', design: 'design', ecommerce: 'biznet' };
export const QUESTION_COUNT = 5;

export type QuizResult = {
  scores: Record<Track, number>;
  percents: Record<Track, number>;
  /** Track chosen by score, then question 5, then question 1. */
  winner: Track;
  /** True when two or more tracks share the top score. */
  tied: boolean;
  /** Companies the player may join: the winner first, then the other tied companies. */
  candidates: CompanyId[];
};

export function isTrack(value: unknown): value is Track {
  return value === 'dev' || value === 'design' || value === 'biznet';
}

export function isCompleteAnswers(value: unknown): value is Track[] {
  return Array.isArray(value) && value.length === QUESTION_COUNT && value.every(isTrack);
}

export function scoreQuiz(answers: readonly Track[]): QuizResult {
  if (!isCompleteAnswers(answers)) throw new Error('INVALID_ANSWERS');
  const scores: Record<Track, number> = { dev: 0, design: 0, biznet: 0 };
  for (const answer of answers) scores[answer] += 1;
  const best = Math.max(scores.dev, scores.design, scores.biznet);
  const top = TRACKS.filter(track => scores[track] === best);
  // Tie-break: the answer to question 5, then question 1. With five questions
  // only a 2-2-1 split can tie, and one of those two answers is always a tied track.
  const winner = top.length === 1
    ? top[0]
    : [answers[QUESTION_COUNT - 1], answers[0]].find(track => top.includes(track)) ?? top[0];
  const ordered = [winner, ...top.filter(track => track !== winner)];
  const percents: Record<Track, number> = { dev: 0, design: 0, biznet: 0 };
  for (const track of TRACKS) percents[track] = Math.round((scores[track] * 100) / answers.length);
  return { scores, percents, winner, tied: top.length > 1, candidates: ordered.map(track => TRACK_COMPANY[track]) };
}

export type AssignmentInput = { id: string; candidates?: readonly CompanyId[] | null };
export type CompanyCounts = Record<CompanyId, number>;

export function emptyCounts(): CompanyCounts { return { tech: 0, design: 0, ecommerce: 0 }; }

/**
 * Company for one player, given how many members each company already has.
 * A clear winner (one candidate) always gets that company. A tied player gets the
 * tied company with fewer members; equal counts keep the question 5 / question 1 order.
 */
export function pickCompany(candidates: readonly CompanyId[], counts: Readonly<CompanyCounts>): CompanyId {
  const list = candidates.filter(c => COMPANY_IDS.includes(c));
  if (list.length === 0) throw new Error('INVALID_CANDIDATES');
  let pick = list[0];
  for (const company of list) if (counts[company] < counts[pick]) pick = company;
  return pick;
}

/**
 * Assign players who do not have a company yet, on top of `initial` existing members.
 * 1. A clear winner always gets that company.
 * 2. A tied player, in join order, goes through pickCompany.
 * 3. A player without quiz answers joins a least-filled company, chosen at random among equals.
 */
export function assignCompanies(players: readonly AssignmentInput[], random: () => number = Math.random, initial: Readonly<CompanyCounts> = emptyCounts()): Map<string, CompanyId> {
  const counts: CompanyCounts = { ...initial };
  const result = new Map<string, CompanyId>();
  const give = (id: string, company: CompanyId) => { result.set(id, company); counts[company] += 1; };
  const valid = (list: AssignmentInput['candidates']) => (list ?? []).filter((c): c is CompanyId => COMPANY_IDS.includes(c));

  for (const player of players) {
    const list = valid(player.candidates);
    if (list.length === 1) give(player.id, list[0]);
  }
  for (const player of players) {
    const list = valid(player.candidates);
    if (list.length >= 2) give(player.id, pickCompany(list, counts));
  }
  const rest = players.filter(player => valid(player.candidates).length === 0).map(player => player.id);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  for (const id of rest) {
    const fewest = Math.min(counts.tech, counts.design, counts.ecommerce);
    const open = COMPANY_IDS.filter(company => counts[company] === fewest);
    give(id, open[Math.min(open.length - 1, Math.floor(random() * open.length))]);
  }
  return result;
}

/** Stable shuffled option order for one question, so a refresh does not reorder the choices. */
export function optionOrder(seed: string, questionIndex: number, size = 3): number[] {
  let hash = 2166136261;
  for (const char of `${seed}:${questionIndex}`) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  const next = () => {
    hash = (hash + 0x6d2b79f5) >>> 0;
    let t = hash;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const order = Array.from({ length: size }, (_, i) => i);
  for (let i = size - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Random complete answers, used only by the mock demo players. */
export function randomAnswers(random: () => number = Math.random): Track[] {
  return Array.from({ length: QUESTION_COUNT }, () => TRACKS[Math.min(2, Math.floor(random() * 3))]);
}
