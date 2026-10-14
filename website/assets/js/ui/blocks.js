import { html, useState, useEffect } from '../lib/html.js';

// Isometric unit cubes with studs — a nod to classic Roblox bricks.
const A = 22;
const DX = A * Math.cos(Math.PI / 6);
const DY = A / 2;

const PALETTE = {
  base: ['#2c313a', '#1b1f25', '#23272e', '#3a404a'],
  base2: ['#323842', '#1e2228', '#272b33', '#41474f'],
  orange: ['#ff9152', '#c4561a', '#e66a28', '#ffb07f'],
  light: ['#ffb27f', '#d4702c', '#ef8742', '#ffd0ae'],
  white: ['#f2eee8', '#b5afa7', '#d6d0c8', '#ffffff'],
  blue: ['#7cb4ff', '#3a6bbd', '#548ee3', '#a9ceff'],
};

const f = (n) => n.toFixed(2);

function cube(b, extraClass = '') {
  const [top, left, right, stud] = PALETTE[b.c] ?? PALETTE.orange;
  const { cx, cy } = b;
  return html`<g class=${'cube ' + extraClass} style=${`--i:${b.order}`}>
    <path class="face-top" d=${`M${f(cx)} ${f(cy - DY)}L${f(cx + DX)} ${f(cy)}L${f(cx)} ${f(cy + DY)}L${f(cx - DX)} ${f(cy)}Z`} fill=${top} />
    <path class="face-l" d=${`M${f(cx - DX)} ${f(cy)}L${f(cx)} ${f(cy + DY)}L${f(cx)} ${f(cy + DY + A)}L${f(cx - DX)} ${f(cy + A)}Z`} fill=${left} />
    <path class="face-r" d=${`M${f(cx + DX)} ${f(cy)}L${f(cx)} ${f(cy + DY)}L${f(cx)} ${f(cy + DY + A)}L${f(cx + DX)} ${f(cy + A)}Z`} fill=${right} />
    <ellipse cx=${f(cx)} cy=${f(cy + 1.6)} rx=${f(DX * 0.36)} ry=${f(DY * 0.36)} fill=${left} opacity=".55" />
    <ellipse cx=${f(cx)} cy=${f(cy - 0.4)} rx=${f(DX * 0.36)} ry=${f(DY * 0.36)} fill=${stud} opacity=".55" />
  </g>`;
}

function layout(blocks) {
  const items = blocks.map((b) => ({ ...b, cx: (b.i - b.j) * DX, cy: (b.i + b.j) * DY - b.k * A }));
  [...items]
    .sort((a, b) => a.k - b.k || a.i + a.j - (b.i + b.j) || a.i - b.i)
    .forEach((b, n) => { b.order = n; });
  const draw = [...items].sort((a, b) => a.i + a.j + a.k - (b.i + b.j + b.k) || a.k - b.k);
  const xs = items.flatMap((b) => [b.cx - DX, b.cx + DX]);
  const ys = items.flatMap((b) => [b.cy - DY, b.cy + DY + A]);
  const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  return { draw, box };
}

// ---------------------------------------------------------------- auth scene
const SCENE = (() => {
  const b = [];
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) b.push({ i, j, k: 0, c: (i + j) % 2 ? 'base2' : 'base' });
  for (let i = 1; i < 4; i++) for (let j = 1; j < 4; j++) if (!(i === 1 && j === 1)) b.push({ i, j, k: 1, c: 'orange' });
  for (const [i, j] of [[2, 2], [3, 2], [2, 3], [3, 3]]) b.push({ i, j, k: 2, c: 'light' });
  b.push({ i: 3, j: 3, k: 3, c: 'white' });
  b.push({ i: 0, j: 4, k: 1, c: 'blue' });
  b.push({ i: 4, j: 0, k: 1, c: 'blue' });
  b.push({ i: 4, j: 4, k: 1, c: 'white' });
  return layout(b);
})();

// Builds block by block, holds, fades out as one piece, then rebuilds.
function useBuildLoop(count, step, hold, frozen) {
  const [round, setRound] = useState(0);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    if (frozen || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const built = count * step + 700;
    const t1 = setTimeout(() => setFading(true), built + hold);
    const t2 = setTimeout(() => { setFading(false); setRound((r) => r + 1); }, built + hold + 650);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [round, frozen]);
  return { round, fading: fading && !frozen };
}

export function IsoScene() {
  const { draw, box } = SCENE;
  const { round, fading } = useBuildLoop(draw.length, 85, 3600, false);
  const pad = 30;
  return html`<svg class=${'iso' + (fading ? ' fading' : '')} style="--step:85ms" viewBox=${`${f(box.x - pad)} ${f(box.y - pad - 50)} ${f(box.w + pad * 2)} ${f(box.h + pad * 2 + 50)}`} aria-hidden="true">
    <ellipse class="iso-shadow" cx="0" cy=${f(box.y + box.h - 4)} rx=${f(box.w * 0.46)} ry=${f(box.h * 0.13)} fill="#000" />
    <g key=${round} class="iso-build">${draw.map((b) => cube(b))}</g>
  </svg>`;
}

// ---------------------------------------------------------------- waiting tower
const TOWER = layout([
  { i: 0, j: 0, k: 0, c: 'base' }, { i: 1, j: 0, k: 0, c: 'base2' }, { i: 0, j: 1, k: 0, c: 'base2' }, { i: 1, j: 1, k: 0, c: 'base' },
  { i: 0, j: 0, k: 1, c: 'orange' }, { i: 0, j: 0, k: 2, c: 'orange' }, { i: 0, j: 0, k: 3, c: 'light' }, { i: 0, j: 0, k: 4, c: 'white' },
]);

export function Tower({ done }) {
  const { draw, box } = TOWER;
  const { round, fading } = useBuildLoop(draw.length, 230, 1100, done);
  const pad = 16;
  const vb = `${f(box.x - pad)} ${f(box.y - pad - 40)} ${f(box.w + pad * 2)} ${f(box.h + pad * 2 + 40)}`;
  return html`<svg class=${'gate-tower iso' + (fading ? ' fading' : '')} style="--step:230ms" viewBox=${vb} aria-hidden="true">
    <ellipse cx="0" cy=${f(box.y + box.h - 2)} rx=${f(box.w * 0.5)} ry=${f(box.h * 0.12)} fill="#000" opacity=".4" />
    <g key=${round} class="iso-build">${draw.map((b) => cube(b))}</g>
    <g class="done-check">
      <circle cx="0" cy=${f(box.y - 18)} r="16" fill="#3ddc97" />
      <path d=${`M-7 ${f(box.y - 18)}l5 5 9-10`} fill="none" stroke="#06281a" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
    </g>
  </svg>`;
}
