import { assignCompanies, emptyCounts, isCompleteAnswers, pickCompany, randomAnswers, scoreQuiz, type CompanyId, type Track } from '@/lib/quizScoring';
import { clearAllQuizProgress } from '@/lib/quizProgress';
export type { CompanyId };
export type PlayerQuiz = { answers: Track[]; candidates: CompanyId[] };
export type Player = { id: string; name: string; online: boolean; company?: CompanyId; quiz?: PlayerQuiz };
function quizFor(answers: Track[]): PlayerQuiz { return { answers: [...answers], candidates: scoreQuiz(answers).candidates }; }
function countsOf(players: Player[]) { const counts = emptyCounts(); for (const p of players) if (p.company) counts[p.company] += 1; return counts; }
/** `started` means the Host closed the round: no new joins, every seat has a company. */
export type Session = { players: Player[]; started: boolean };
const KEY = 'little-world-m2-mock-v1';
const EMPTY: Session = { players: [], started: false };
let cached: Session = EMPTY;
let initialized = false;
const listeners = new Set<() => void>();
function load() { if (typeof window === 'undefined') return; try { const value = localStorage.getItem(KEY); cached = value ? JSON.parse(value) : EMPTY; } catch { cached = EMPTY; } initialized = true; }
function emit() { for (const fn of listeners) fn(); }
function save(next: Session) { cached = next; localStorage.setItem(KEY, JSON.stringify(next)); emit(); }
if (typeof window !== 'undefined') window.addEventListener('storage', event => { if (event.key === KEY) { load(); emit(); } });
export const mockSession = {
  subscribe(fn: () => void) { listeners.add(fn); if (!initialized) { load(); queueMicrotask(emit); } return () => { listeners.delete(fn); }; },
  getSnapshot() { return cached; },
  getServerSnapshot() { return EMPTY; },
  currentId() { return typeof window === 'undefined' ? null : sessionStorage.getItem('little-world-player'); },
  join(raw: string): string | null {
    const name = raw.trim().normalize('NFC');
    if (!name || [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(name)].length > 30 || /[\p{Cc}؜‎‏‪-‮⁦-⁩]/u.test(name)) return 'กรุณากรอกชื่อผู้เล่น 1–30 ตัวอักษร';
    const id = this.currentId(); const existing = cached.players.find(p => p.id === id);
    if (existing) { this.presence(existing.id, true); return null; }
    if (cached.started) return 'กิจกรรมเริ่มแล้ว';
    if (cached.players.length >= 15) return 'กิจกรรมเต็ม 15 ที่นั่งแล้ว';
    const player = { id: crypto.randomUUID(), name, online: true };
    sessionStorage.setItem('little-world-player', player.id);
    save({ ...cached, players: [...cached.players, player] });
    return null;
  },
  presence(id: string, online: boolean) { save({ ...cached, players: cached.players.map(p => p.id === id ? { ...p, online } : p) }); },
  /** The company is decided at submit time, from the answers and the current company sizes. */
  submitQuiz(id: string, answers: unknown): string | null {
    if (!isCompleteAnswers(answers)) return 'กรุณาตอบให้ครบ 5 ข้อ';
    const own = cached.players.find(p => p.id === id);
    if (!own) return 'ไม่พบผู้เล่น กรุณาเข้าร่วมใหม่';
    if (own.company) return null; // Result already given; it never changes.
    if (cached.started) return 'กิจกรรมเริ่มแล้ว';
    const quiz = quizFor(answers);
    const company = pickCompany(quiz.candidates, countsOf(cached.players));
    save({ ...cached, players: cached.players.map(p => p.id === id ? { ...p, quiz, company } : p) });
    this.autoClose(); return null;
  },
  addDemo() {
    if (cached.started || cached.players.length >= 15) return;
    const quiz = quizFor(randomAnswers());
    save({ ...cached, players: [...cached.players, { id: crypto.randomUUID(), name: `Player ${cached.players.length + 1}`, online: true, quiz, company: pickCompany(quiz.candidates, countsOf(cached.players)) }] });
    this.autoClose();
  },
  /** The round closes by itself once all 15 seats have a result. */
  autoClose() { if (!cached.started && cached.players.length === 15 && cached.players.every(p => p.company)) this.start(); },
  /** Host "close round": stop new joins and give players who have not finished the least-filled companies. */
  start() {
    if (cached.started || cached.players.length === 0) return false;
    const waiting = cached.players.filter(p => !p.company).map(p => ({ id: p.id, candidates: p.quiz?.candidates }));
    const assignment = assignCompanies(waiting, Math.random, countsOf(cached.players));
    save({ started: true, players: cached.players.map(p => ({ ...p, company: p.company ?? assignment.get(p.id) })) }); return true;
  },
  isLoaded() { return initialized; },
  reset() { sessionStorage.removeItem('little-world-player'); clearAllQuizProgress(); save(EMPTY); },
};
