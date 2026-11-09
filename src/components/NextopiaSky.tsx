/**
 * Nextopia sky: a stepped night sky with a neon pixel skyline (after the CAMT NEXTopia poster), drawn behind the top of each player page.
 * Lit windows use the `nx-win` class; on the result page they switch to the company colour (see nextopia.css).
 */
type Rect = { x: number; y: number; w: number; h: number };
const WIDTH = 1440, HEIGHT = 140, GROUND = 134;

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function row(seed: number, minW: number, maxW: number, minH: number, maxH: number, gap: number) {
  const rand = seeded(seed), out: Rect[] = [];
  for (let x = -10; x < WIDTH; ) {
    const w = Math.round((minW + rand() * (maxW - minW)) / 4) * 4, h = Math.round((minH + rand() * (maxH - minH)) / 4) * 4;
    out.push({ x, y: GROUND - h, w, h });
    x += w + gap;
  }
  return out;
}
const far = row(7, 36, 76, 44, 96, 0);
const near = row(19, 28, 60, 26, 78, 6);
// The spire sits at the centre, so phones (which see the middle slice) always show it.
const spire: Rect = { x: 704, y: 22, w: 32, h: GROUND - 22 };
const windows: Rect[] = [];
{
  const rand = seeded(31);
  for (const b of [...near, spire]) {
    for (let y = b.y + 8; y < GROUND - 10; y += 12) for (let x = b.x + 6; x <= b.x + b.w - 10; x += 10) if (rand() < 0.42) windows.push({ x, y, w: 4, h: 6 });
  }
}

export function NextopiaSky({ variant }: { variant: 'landing' | 'quiz' | 'reveal' | 'lobby' }) {
  // The anchor sits in the page flow where the skyline belongs; the sky behind it extends upward
  // to the top of the page, so text above the skyline always reads on open sky.
  return <div className={`nx-sky-anchor nx-sky-${variant}`} aria-hidden="true"><div className="nx-sky">
    <span className="nx-stars" /><span className="nx-moon" />
    <svg className="nx-skyline" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges">
      <g className="nx-far">{far.map((b, i) => <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} />)}</g>
      {/* floating garden platform: the "utopia" in Nextopia */}
      <g className="nx-island"><rect x="808" y="34" width="56" height="8" /><rect x="816" y="42" width="40" height="6" /><rect x="828" y="48" width="16" height="6" /><rect className="nx-leaf" x="820" y="18" width="16" height="16" /><rect className="nx-leaf" x="840" y="24" width="12" height="10" /><rect x="826" y="30" width="4" height="4" /></g>
      <g className="nx-near">{near.map((b, i) => <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} />)}</g>
      <g className="nx-edges">{near.filter((_, i) => i % 3 === 0).map((b, i) => <rect key={i} className={i % 2 ? 'nx-edge-b' : 'nx-edge-a'} x={b.x} y={b.y} width={b.w} height="2" />)}</g>
      <g className="nx-near"><rect x={spire.x} y={spire.y} width={spire.w} height={spire.h} /><rect x="716" y="6" width="8" height="16" /><rect x="718" y="0" width="4" height="6" className="nx-beacon" /></g>
      <g className="nx-lights">{windows.map((w, i) => <rect key={i} className={`nx-win ${i % 3 ? 'nx-win-a' : 'nx-win-b'}`} style={{ transitionDelay: `${(i % 9) * 70}ms` }} x={w.x} y={w.y} width={w.w} height={w.h} />)}</g>
      <rect className="nx-ground" x="0" y={GROUND} width={WIDTH} height={HEIGHT - GROUND} />
    </svg>
  </div></div>;
}
