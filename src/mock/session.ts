export type CompanyId = 'tech' | 'design' | 'ecommerce';
export type Player = { id: string; name: string; online: boolean; company?: CompanyId };
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
    if (!name || [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(name)].length > 30 || /[\p{Cc}\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u.test(name)) return 'กรุณากรอกชื่อผู้เล่น 1–30 ตัวอักษร';
    const id = this.currentId(); const existing = cached.players.find(p => p.id === id);
    if (existing) { this.presence(existing.id, true); return null; }
    if (cached.started) return 'กิจกรรมเริ่มแล้ว';
    if (cached.players.length >= 15) return 'กิจกรรมเต็ม 15 ที่นั่งแล้ว';
    const player = { id: crypto.randomUUID(), name, online: true };
    sessionStorage.setItem('little-world-player', player.id);
    save({ ...cached, players: [...cached.players, player] });
    this.autoStart(); return null;
  },
  presence(id: string, online: boolean) { save({ ...cached, players: cached.players.map(p => p.id === id ? { ...p, online } : p) }); if (online) this.autoStart(); },
  addDemo() { if (cached.started || cached.players.length >= 15) return; save({ ...cached, players: [...cached.players, { id: crypto.randomUUID(), name: `Player ${cached.players.length + 1}`, online: true }] }); this.autoStart(); },
  autoStart() { if (!cached.started && cached.players.filter(p => p.online).length === 15) this.start(); },
  start() {
    if (cached.started || !cached.players.some(p => p.online)) return false;
    const companies: CompanyId[] = ['tech', 'design', 'ecommerce'];
    const shuffled = [...cached.players];
    for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    const offset = Math.floor(Math.random() * 3);
    const assignment = new Map(shuffled.map((p, i) => [p.id, companies[(i + offset) % 3]]));
    save({ started: true, players: cached.players.map(p => ({ ...p, company: assignment.get(p.id) })) }); return true;
  },
  reset() { sessionStorage.removeItem('little-world-player'); save(EMPTY); },
};
