import { QUESTION_COUNT, isTrack, type Track } from './quizScoring';

/** In-progress quiz answers, kept in localStorage so a refresh keeps them. */
export type QuizProgress = { index: number; answers: (Track | null)[] };
const PREFIX = 'lw-quiz:';

export function quizProgressKey(scope: string, playerId: string) { return `${PREFIX}${scope}:${playerId}`; }

export function emptyProgress(): QuizProgress { return { index: 0, answers: Array.from({ length: QUESTION_COUNT }, () => null) }; }

export function loadQuizProgress(key: string): QuizProgress {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? 'null') as Partial<QuizProgress> | null;
    if (!raw || !Array.isArray(raw.answers) || raw.answers.length !== QUESTION_COUNT) return emptyProgress();
    const answers = raw.answers.map(value => (isTrack(value) ? value : null));
    const index = Number.isInteger(raw.index) ? Math.min(Math.max(raw.index as number, 0), QUESTION_COUNT - 1) : 0;
    return { index, answers };
  } catch { return emptyProgress(); }
}

export function saveQuizProgress(key: string, progress: QuizProgress) {
  try { localStorage.setItem(key, JSON.stringify(progress)); } catch { /* storage unavailable: progress lives in memory only */ }
}

export function clearQuizProgress(key: string) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

export function clearAllQuizProgress() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith(PREFIX)) localStorage.removeItem(key);
    }
  } catch { /* ignore */ }
}
