// Tiny procedural "pencil" geometry: every shape is generated in JS from a seed,
// with jittered, doubled strokes so it reads as hand-drawn.

export type Pt = [number, number];

export const rng = (seed: number) => {
  let a = Math.floor(seed * 9973) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const jit = (r: () => number, amount: number) => (r() - 0.5) * 2 * amount;
const f = (n: number) => n.toFixed(1);

const strokeSegment = (
  a: Pt,
  b: Pt,
  r: () => number,
  rough: number,
): string => {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const nx = -(b[1] - a[1]) / len;
  const ny = (b[0] - a[0]) / len;
  const off = Math.min(rough, len * 0.08);
  const bow = jit(r, rough * 0.6 + len * 0.012);
  const s: Pt = [a[0] + jit(r, off), a[1] + jit(r, off)];
  // Overshoot the end slightly, like a quick pencil flick
  const e: Pt = [b[0] + jit(r, off * 1.5), b[1] + jit(r, off * 1.5)];
  const c1: Pt = [
    s[0] + (e[0] - s[0]) * 0.33 + nx * bow,
    s[1] + (e[1] - s[1]) * 0.33 + ny * bow,
  ];
  const c2: Pt = [
    s[0] + (e[0] - s[0]) * 0.66 + nx * bow * 0.7,
    s[1] + (e[1] - s[1]) * 0.66 + ny * bow * 0.7,
  ];
  return `M${f(s[0])} ${f(s[1])} C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(e[0])} ${f(e[1])} `;
};

export const roughLine = (
  a: Pt,
  b: Pt,
  seed: number,
  rough = 3,
  passes = 2,
): string => {
  const r = rng(seed);
  let d = "";
  for (let p = 0; p < passes; p++) {
    d += strokeSegment(a, b, r, rough);
  }
  return d;
};

export const roughPoly = (
  pts: Pt[],
  seed: number,
  closed = true,
  rough = 3,
  passes = 2,
): string => {
  const r = rng(seed);
  let d = "";
  for (let p = 0; p < passes; p++) {
    const count = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < count; i++) {
      d += strokeSegment(pts[i], pts[(i + 1) % pts.length], r, rough);
    }
  }
  return d;
};

export const roughRect = (
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number,
  rough = 3,
) =>
  roughPoly(
    [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ],
    seed,
    true,
    rough,
  );

// Catmull-Rom through points -> smooth cubic path
export const smoothPath = (pts: Pt[]): string => {
  if (pts.length < 2) return "";
  let d = `M${f(pts[0][0])} ${f(pts[0][1])} `;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])} `;
  }
  return d;
};

// Loose ellipse that overshoots its start, drawn twice
export const roughEllipse = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number,
  rough = 3,
  passes = 2,
): string => {
  const r = rng(seed);
  let d = "";
  for (let p = 0; p < passes; p++) {
    const steps = 22;
    const start = r() * Math.PI * 2;
    const turn = Math.PI * 2 * (1.06 + r() * 0.08);
    const pts: Pt[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = start + (turn * i) / steps;
      const k = 1 + jit(r, rough / Math.max(rx, ry)) * 1.6;
      pts.push([cx + Math.cos(t) * rx * k, cy + Math.sin(t) * ry * k]);
    }
    d += smoothPath(pts);
  }
  return d;
};

// Diagonal pencil shading inside a rectangle
export const hatchRect = (
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number,
  gap = 14,
): string => {
  const r = rng(seed);
  let d = "";
  let i = 0;
  for (let s = gap / 2; s < w + h; s += gap) {
    const a: Pt = [x + Math.min(s, w), y + Math.max(0, s - w)];
    const b: Pt = [x + Math.max(0, s - h), y + Math.min(s, h)];
    // Alternate direction for a zig-zag scribble feel
    d += i % 2 === 0 ? strokeSegment(a, b, r, 1.5) : strokeSegment(b, a, r, 1.5);
    i++;
  }
  return d;
};

// A wobbly freehand path through given points
export const scribble = (pts: Pt[], seed: number, rough = 3): string => {
  const r = rng(seed);
  return smoothPath(pts.map(([x, y]) => [x + jit(r, rough), y + jit(r, rough)]));
};

// Simple doodled rocket centred at (cx, cy), nose pointing up
export const rocketParts = (cx: number, cy: number, s: number, seed: number) => {
  const body = roughPoly(
    [
      [cx, cy - 95 * s],
      [cx + 30 * s, cy - 45 * s],
      [cx + 30 * s, cy + 45 * s],
      [cx - 30 * s, cy + 45 * s],
      [cx - 30 * s, cy - 45 * s],
    ],
    seed,
    true,
    2.5 * s,
  );
  const window = roughEllipse(cx, cy - 25 * s, 14 * s, 14 * s, seed + 1, 2 * s);
  const fins =
    roughPoly(
      [
        [cx - 30 * s, cy + 5 * s],
        [cx - 58 * s, cy + 55 * s],
        [cx - 30 * s, cy + 45 * s],
      ],
      seed + 2,
      false,
      2 * s,
    ) +
    roughPoly(
      [
        [cx + 30 * s, cy + 5 * s],
        [cx + 58 * s, cy + 55 * s],
        [cx + 30 * s, cy + 45 * s],
      ],
      seed + 3,
      false,
      2 * s,
    );
  const flame = scribble(
    [
      [cx - 18 * s, cy + 50 * s],
      [cx - 8 * s, cy + 95 * s],
      [cx, cy + 70 * s],
      [cx + 8 * s, cy + 100 * s],
      [cx + 18 * s, cy + 50 * s],
    ],
    seed + 4,
    4 * s,
  );
  return { body, window, fins, flame };
};
