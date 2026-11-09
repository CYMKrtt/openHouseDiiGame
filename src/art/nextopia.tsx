/**
 * Landing hero: pixel-art take on the CAMT NEXTopia poster — glowing glass room-cubes stacked in a
 * night city, one per company (Tech on top, E-Com and Design below), with floating glass cubes.
 * Drawn on a 2px grid with crisp edges. `monitor-glow` and `sparkle` reuse the page's existing
 * animations (and their reduced-motion rule).
 */
import type { ReactNode } from 'react';

type Theme = { back: string; side: string; floor: string; ceil: string; neon: string; halo: string };
const TECH: Theme = { back: '#231A5E', side: '#1A1349', floor: '#33287A', ceil: '#140E3B', neon: '#B48CFF', halo: '#7B5CFF' };
const DESIGN: Theme = { back: '#3D1446', side: '#2E0E35', floor: '#552059', ceil: '#24092A', neon: '#FF7AC8', halo: '#E0479E' };
const ECOM: Theme = { back: '#3E2611', side: '#2E1C0B', floor: '#573818', ceil: '#24160A', neon: '#FFB347', halo: '#FF8A3D' };
const D = 14; // depth offset (up-right), oblique projection

/** One open-front glass room. Children are drawn in room-local coordinates (0,0 = front top-left). */
function Room({ id, x, y, w, h, t, children }: { id: string; x: number; y: number; w: number; h: number; t: Theme; children: ReactNode }) {
  return <g>
    {/* exterior shell: top and right faces */}
    <polygon points={`${x},${y} ${x + D},${y - D} ${x + w + D},${y - D} ${x + w},${y}`} fill="#2C3184" />
    <polygon points={`${x + w},${y} ${x + w + D},${y - D} ${x + w + D},${y + h - D} ${x + w},${y + h}`} fill="#1A1E5C" />
    <polygon points={`${x + 4},${y - 2} ${x + D},${y - D + 2} ${x + w + D - 4},${y - D + 2} ${x + w - 4},${y - 2}`} fill={t.neon} opacity=".18" />
    <rect x={x + D} y={y - D} width={w} height="2" fill={t.neon} opacity=".55" />
    <rect x={x + w + D - 2} y={y - D} width="2" height={h} fill={t.neon} opacity=".35" />
    <clipPath id={id}><rect x={x} y={y} width={w} height={h} /></clipPath>
    <g clipPath={`url(#${id})`}>
      <rect x={x} y={y} width={w} height={h} fill={t.back} />
      <polygon points={`${x},${y} ${x + D},${y + D * 0} ${x + D},${y + h - D} ${x},${y + h}`} fill={t.side} />
      <polygon points={`${x},${y + h} ${x + D},${y + h - D} ${x + w + D},${y + h - D} ${x + w},${y + h}`} fill={t.floor} />
      <rect x={x} y={y} width={w} height="6" fill={t.ceil} />
      {/* light spilling down the back wall, and a neon strip along the floor */}
      <rect x={x + D} y={y + 6} width={w - D} height="12" fill={t.neon} opacity=".14" />
      <rect x={x + D} y={y + 18} width={w - D} height="10" fill={t.neon} opacity=".07" />
      <rect x={x + D} y={y + h - D - 2} width={w - D} height="2" fill={t.neon} opacity=".6" />
      {/* ceiling light strip */}
      <rect x={x + 22} y={y + 6} width={w - 40} height="2" fill="#FFFFFF" opacity=".85" />
      <rect x={x + 18} y={y + 8} width={w - 32} height="4" fill={t.neon} opacity=".28" />
      <g transform={`translate(${x},${y})`}>{children}</g>
      {/* glass glare */}
      <polygon points={`${x + w - 34},${y} ${x + w - 22},${y} ${x + w - 58},${y + h} ${x + w - 70},${y + h}`} fill="#FFFFFF" opacity=".07" />
      <polygon points={`${x + w - 16},${y} ${x + w - 12},${y} ${x + w - 48},${y + h} ${x + w - 52},${y + h}`} fill="#FFFFFF" opacity=".08" />
    </g>
    {/* neon frame with pixel halo */}
    <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} fill="none" stroke={t.halo} strokeWidth="2" opacity=".35" />
    <rect x={x} y={y} width={w} height={h} fill="none" stroke={t.neon} strokeWidth="2" />
  </g>;
}

function GlassCube({ x, y, s, c, delay = 0 }: { x: number; y: number; s: number; c: string; delay?: number }) {
  const d = Math.round(s / 2);
  return <g className="nx-float" style={{ animationDelay: `${delay}s` }}>
    <polygon points={`${x},${y} ${x + d},${y - d} ${x + s + d},${y - d} ${x + s},${y}`} fill={c} opacity=".85" />
    <polygon points={`${x + s},${y} ${x + s + d},${y - d} ${x + s + d},${y + s - d} ${x + s},${y + s}`} fill={c} opacity=".45" />
    <rect x={x} y={y} width={s} height={s} fill={c} opacity=".6" />
    <rect x={x} y={y} width={s} height={s} fill="none" stroke="#FFFFFF" strokeWidth="1" opacity=".6" />
    <rect x={x + 2} y={y + 2} width="2" height={Math.max(2, s - 6)} fill="#FFFFFF" opacity=".85" />
  </g>;
}

const px = (x: number, y: number, w: number, h: number, fill: string, extra?: { className?: string; opacity?: number }) =>
  <rect x={x} y={y} width={w} height={h} fill={fill} className={extra?.className} opacity={extra?.opacity} />;

function Person({ x, y, shirt, hair = '#2B1B10' }: { x: number; y: number; shirt: string; hair?: string }) {
  return <g>{px(x + 1, y, 6, 2, hair)}{px(x, y + 2, 8, 6, '#F2C29B')}{px(x, y + 2, 8, 2, hair)}{px(x - 1, y + 8, 10, 8, shirt)}{px(x + 1, y + 16, 2, 4, '#1B1F5C')}{px(x + 5, y + 16, 2, 4, '#1B1F5C')}</g>;
}

/* Room interiors in room-local coordinates (118 x 86 room). `extra` adds result-page details. */
function EcomInterior({ extra = false }: { extra?: boolean }) {
  return <>
      {px(18, 18, 2, 46, '#6B4520')}{px(18, 30, 30, 2, '#8A5A2A')}{px(18, 48, 30, 2, '#8A5A2A')}
      {px(22, 22, 10, 8, '#C98A4B')}{px(26, 22, 2, 8, '#F1D08A')}{px(34, 24, 8, 6, '#D9A060')}
      {px(22, 40, 8, 8, '#D9A060')}{px(32, 38, 12, 10, '#C98A4B')}{px(37, 38, 2, 10, '#F1D08A')}
      {px(58, 16, 44, 30, '#120B05')}{px(60, 18, 40, 26, '#2A1A08')}
      <g className="monitor-glow">{px(64, 36, 4, 6, '#FFE07A')}{px(70, 32, 4, 10, '#FFE07A')}{px(76, 28, 4, 14, '#FFB347')}{px(82, 24, 4, 18, '#FFB347')}{px(88, 20, 6, 4, '#FFFFFF')}{px(92, 22, 4, 2, '#FFFFFF')}</g>
      {px(74, 46, 4, 6, '#3A2410')}
      {/* coin */}{px(46, 10, 8, 8, '#FFD45A')}{px(48, 12, 4, 4, '#FFF1B0')}
      {/* cart on the floor */}{px(70, 60, 22, 2, '#E9ECFA')}{px(72, 62, 18, 6, '#C8CDE8', { opacity: .9 })}{px(74, 63, 4, 4, '#C98A4B')}{px(80, 63, 6, 4, '#FFB347')}{px(74, 70, 4, 4, '#E9ECFA')}{px(86, 70, 4, 4, '#E9ECFA')}{px(90, 56, 2, 6, '#E9ECFA')}
      <Person x={40} y={50} shirt="#FFB347" />
      {extra && <g>
        {/* SALE sign, price tags and a parcel pile */}
        {px(20, 8, 22, 8, '#FF8A3D')}{px(22, 10, 2, 4, '#1A0E05')}{px(26, 10, 2, 4, '#1A0E05')}{px(30, 10, 2, 4, '#1A0E05')}{px(34, 10, 2, 4, '#1A0E05')}{px(38, 10, 2, 4, '#1A0E05')}
        {px(96, 60, 12, 10, '#C98A4B')}{px(101, 60, 2, 10, '#F1D08A')}{px(98, 52, 10, 8, '#D9A060')}{px(102, 52, 2, 8, '#F1D08A')}
        {px(104, 22, 6, 4, '#FFE07A', { className: 'sparkle' })}{px(52, 30, 4, 4, '#FFD45A', { className: 'sparkle' })}
      </g>}
    </>;
}
function DesignInterior({ extra = false }: { extra?: boolean }) {
  return <>
      {[['#FF7AC8', 18, 16], ['#7CFFB2', 28, 16], ['#43D9FF', 38, 16], ['#FFE07A', 18, 26], ['#B48CFF', 28, 26], ['#FF8A3D', 38, 26]].map(([c, x, y], i) => <rect key={i} x={x as number} y={y as number} width="8" height="8" fill={c as string} />)}
      {px(62, 14, 30, 26, '#FFF3FA')}{px(64, 16, 26, 22, '#FFE4F2')}
      <g className="monitor-glow">{px(66, 18, 10, 8, '#FF7AC8')}{px(76, 26, 12, 6, '#7CFFB2')}{px(68, 30, 6, 6, '#43D9FF')}</g>
      {px(66, 40, 2, 22, '#8A4E7A')}{px(86, 40, 2, 22, '#8A4E7A')}{px(76, 40, 2, 18, '#8A4E7A')}
      {px(22, 46, 30, 4, '#7A3C74')}{px(24, 50, 2, 12, '#5A2A56')}{px(48, 50, 2, 12, '#5A2A56')}{px(26, 42, 16, 4, '#2A0E2E')}{px(28, 43, 10, 2, '#FF7AC8')}
      {/* plant */}{px(98, 52, 8, 8, '#B86A4A')}{px(96, 42, 4, 10, '#45E0B4')}{px(102, 38, 4, 14, '#7CFFB2')}{px(100, 46, 2, 6, '#2FA87F')}
      <Person x={30} y={52} shirt="#FF7AC8" hair="#4A2A1A" />
      {extra && <g>
        {/* hanging lamp, sticky notes and a mood board */}
        {px(58, 6, 2, 6, '#8A4E7A')}{px(54, 12, 10, 4, '#FF7AC8')}{px(56, 16, 6, 2, '#FFE4F2', { className: 'monitor-glow' })}
        {px(98, 14, 6, 6, '#FFE07A')}{px(98, 22, 6, 6, '#7CFFB2')}{px(106, 18, 6, 6, '#43D9FF')}
        {px(14, 38, 2, 2, '#FFE07A', { className: 'sparkle' })}{px(92, 34, 2, 2, '#FFFFFF', { className: 'sparkle' })}
      </g>}
    </>;
}
function TechInterior({ extra = false }: { extra?: boolean }) {
  return <>
      <g className="monitor-glow">
        {px(48, 14, 2, 2, '#E6D9FF')}{px(46, 16, 2, 2, '#E6D9FF')}{px(44, 18, 2, 2, '#E6D9FF')}{px(46, 20, 2, 2, '#E6D9FF')}{px(48, 22, 2, 2, '#E6D9FF')}
        {px(60, 12, 2, 2, '#E6D9FF')}{px(58, 15, 2, 3, '#E6D9FF')}{px(56, 18, 2, 3, '#E6D9FF')}{px(54, 21, 2, 3, '#E6D9FF')}
        {px(64, 14, 2, 2, '#E6D9FF')}{px(66, 16, 2, 2, '#E6D9FF')}{px(68, 18, 2, 2, '#E6D9FF')}{px(66, 20, 2, 2, '#E6D9FF')}{px(64, 22, 2, 2, '#E6D9FF')}
        {px(40, 10, 34, 2, '#B48CFF', { opacity: .5 })}{px(40, 26, 34, 2, '#B48CFF', { opacity: .5 })}
      </g>
      {/* server rack */}{px(16, 18, 12, 46, '#0F0B2E')}{[22, 30, 38, 46, 54].map(y => <g key={y}>{px(18, y, 8, 4, '#1E1752')}{px(19, y + 1, 2, 2, y % 16 ? '#7CFFB2' : '#FF7AC8', { className: 'sparkle' })}</g>)}
      {/* desks with monitors */}
      {[34, 72].map(x => <g key={x}>{px(x, 34, 22, 15, '#0F0B2E')}{px(x + 2, 36, 18, 11, '#43D9FF')}{px(x + 4, 38, 10, 2, '#0F5A7A')}{px(x + 4, 42, 14, 2, '#0F5A7A')}{px(x + 9, 49, 4, 4, '#0F0B2E')}{px(x - 4, 53, 30, 4, '#5A4BB0')}{px(x - 2, 57, 2, 10, '#3E3290')}{px(x + 22, 57, 2, 10, '#3E3290')}</g>)}
      <Person x={41} y={52} shirt="#43D9FF" />
      <Person x={79} y={52} shirt="#B48CFF" hair="#1A1A1A" />
      {extra && <g>
        {/* code poster, a mug and a robot buddy */}
        {px(96, 14, 14, 18, '#0F0B2E')}{px(98, 16, 8, 2, '#7CFFB2')}{px(98, 20, 10, 2, '#43D9FF')}{px(98, 24, 6, 2, '#B48CFF')}{px(98, 28, 9, 2, '#7CFFB2')}
        {px(60, 50, 4, 4, '#FFFFFF')}{px(64, 51, 2, 2, '#FFFFFF')}
        {px(98, 56, 10, 8, '#C9CFE8')}{px(100, 58, 2, 2, '#43D9FF', { className: 'sparkle' })}{px(104, 58, 2, 2, '#43D9FF', { className: 'sparkle' })}{px(100, 64, 2, 4, '#8F96C0')}{px(104, 64, 2, 4, '#8F96C0')}{px(102, 52, 2, 4, '#C9CFE8')}{px(102, 50, 2, 2, '#FF7AC8')}
      </g>}
    </>;
}

export function NextopiaCity() {
  return <svg className="scene nx-cubes" viewBox="0 0 360 262" shapeRendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
    {/* stars */}
    <g className="room">{[[22, 20], [66, 8], [300, 14], [338, 46], [12, 120], [350, 128], [190, 6]].map(([x, y], i) => <rect key={i} className="sparkle" x={x} y={y} width="2" height="2" fill={i % 2 ? '#FFE9B8' : '#CFE8FF'} />)}</g>
    {/* platform: dark slab with orange neon rim and floor reflections */}
    <polygon points="34,238 50,226 326,226 342,238" fill="#161A4D" />
    <rect x="34" y="238" width="308" height="8" fill="#0E1138" />
    <rect x="34" y="236" width="308" height="2" fill="#FF8A3D" />
    <rect x="26" y="246" width="324" height="2" fill="#FF8A3D" opacity=".35" />
    <rect x="70" y="252" width="236" height="2" fill="#7B5CFF" opacity=".3" />
    <rect x="110" y="257" width="156" height="2" fill="#43D9FF" opacity=".22" />

    {/* E-Com: shelves of parcels, a sales chart and a cart */}
    <Room id="nx-room-ecom" x={54} y={140} w={118} h={86} t={ECOM}><EcomInterior /></Room>
    {/* Design: colour swatch wall, easel with canvas, drawing desk */}
    <Room id="nx-room-design" x={186} y={140} w={118} h={86} t={DESIGN}><DesignInterior /></Room>
    {/* Tech on top: neon </> sign, two desks with code screens, a server rack */}
    <Room id="nx-room-tech" x={120} y={52} w={118} h={86} t={TECH}><TechInterior /></Room>

    {/* floating glass cubes */}
    <GlassCube x={18} y={150} s={14} c="#FF8A3D" />
    <GlassCube x={34} y={98} s={10} c="#43D9FF" delay={0.6} />
    <GlassCube x={322} y={96} s={14} c="#43D9FF" delay={1.1} />
    <GlassCube x={318} y={172} s={10} c="#B48CFF" delay={0.3} />
    <GlassCube x={86} y={44} s={12} c="#B48CFF" delay={1.6} />
    <GlassCube x={262} y={30} s={10} c="#FF7AC8" delay={0.9} />
  </svg>;
}

const ROOMS = { tech: [TECH, TechInterior], design: [DESIGN, DesignInterior], ecommerce: [ECOM, EcomInterior] } as const;

/** Result page: the player's company as one large glowing glass room on a neon platform. */
export function NextopiaCompanyRoom({ company }: { company: 'tech' | 'design' | 'ecommerce' }) {
  const [t, Interior] = ROOMS[company];
  return <svg className="scene nx-cubes nx-company-room" viewBox="0 0 186 150" shapeRendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
    <g className="room">{[[10, 14], [36, 4], [150, 8], [176, 30], [6, 90], [180, 96]].map(([x, y], i) => <rect key={i} className="sparkle" x={x} y={y} width="2" height="2" fill={i % 2 ? '#FFE9B8' : '#CFE8FF'} />)}</g>
    <polygon points="16,132 30,122 156,122 170,132" fill="#161A4D" />
    <rect x="16" y="132" width="154" height="6" fill="#0E1138" />
    <rect x="16" y="130" width="154" height="2" fill={t.neon} />
    <rect x="10" y="140" width="166" height="2" fill={t.neon} opacity=".35" />
    <rect x="40" y="145" width="106" height="2" fill={t.halo} opacity=".25" />
    <Room id={`nx-result-${company}`} x={34} y={36} w={118} h={86} t={t}><Interior extra /></Room>
    <GlassCube x={8} y={58} s={10} c={t.neon} />
    <GlassCube x={160} y={44} s={8} c="#43D9FF" delay={0.7} />
    <GlassCube x={164} y={98} s={10} c={t.halo} delay={1.2} />
    <GlassCube x={18} y={22} s={7} c="#B48CFF" delay={0.4} />
  </svg>;
}
