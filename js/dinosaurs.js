// Procedural anatomy: every specimen is assembled from tubes, ellipsoids and
// sheets, then sampled into a point cloud that the hologram shader morphs between.
import * as THREE from 'three';

const TAU = Math.PI * 2;
const rad = (d) => (d * Math.PI) / 180;
const lerp = (a, b, t) => a + (b - a) * t;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const V = (p) => new THREE.Vector3(p[0], p[1], p[2] || 0);
const arr = (v) => [v.x, v.y, v.z];

class Builder {
  constructor(seed) {
    this.rand = mulberry32(seed);
    this.parts = [];
    this.anchors = {};
    this.meta = { flap: 0, lift: 0 };
  }

  add(area, sampler, { w = 1, min = 0 } = {}) {
    this.parts.push({ area: Math.max(area, 1e-6) * w, sampler, min });
  }

  // Tapered tube along a Catmull-Rom spline; radii are given per control point.
  tube(pts, radii, o = {}) {
    const { sy = 1, sz = 1, w = 1, min = 0, jitter = 0.05 } = o;
    const curve = new THREE.CatmullRomCurve3(pts.map(V), false, 'catmullrom', 0.5);
    const n = pts.length - 1;
    const K = Math.max(24, n * 36);
    const radiusAt = (t) => {
      const f = Math.min(t, 0.99999) * n;
      const i = Math.floor(f);
      const l = f - i;
      const s = l * l * (3 - 2 * l);
      return lerp(radii[i], radii[i + 1], s);
    };
    const P = [], T = [], R = [], cdf = [0];
    for (let k = 0; k <= K; k++) {
      const t = k / K;
      P.push(curve.getPoint(t));
      T.push(curve.getTangent(t));
      R.push(radiusAt(t));
    }
    let area = 0;
    for (let k = 1; k <= K; k++) {
      area += P[k].distanceTo(P[k - 1]) * TAU * ((R[k] + R[k - 1]) / 2) * ((sy + sz) / 2);
      cdf.push(area);
    }
    const rand = this.rand;
    const nrm = new THREE.Vector3(), bin = new THREE.Vector3(), up = new THREE.Vector3();
    const p = new THREE.Vector3(), tg = new THREE.Vector3();
    this.add(area, (out) => {
      const x = rand() * area;
      let lo = 1, hi = K;
      while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] < x) lo = m + 1; else hi = m; }
      const k = lo;
      const f = (x - cdf[k - 1]) / (cdf[k] - cdf[k - 1] || 1);
      p.copy(P[k - 1]).lerp(P[k], f);
      tg.copy(T[k - 1]).lerp(T[k], f).normalize();
      const r = lerp(R[k - 1], R[k], f) * (1 - jitter + jitter * 2 * rand());
      if (Math.abs(tg.y) > 0.92) up.set(1, 0, 0); else up.set(0, 1, 0);
      nrm.crossVectors(tg, up).normalize();
      bin.crossVectors(nrm, tg).normalize();
      const th = rand() * TAU;
      out.copy(p).addScaledVector(bin, Math.cos(th) * r * sy).addScaledVector(nrm, Math.sin(th) * r * sz);
    }, { w, min });
    return { curve, radiusAt, sy, sz };
  }

  cone(base, tip, r, o = {}) {
    return this.tube([base, tip], [r, r * 0.04], { min: 24, ...o });
  }

  ellipsoid(c, r, o = {}) {
    const { w = 1, min = 0, rot = 0 } = o;
    const [a, b, cc] = r;
    const pw = 1.6;
    const area = 4 * Math.PI * Math.pow((Math.pow(a * b, pw) + Math.pow(a * cc, pw) + Math.pow(b * cc, pw)) / 3, 1 / pw);
    const rand = this.rand;
    const cr = Math.cos(rot), sr = Math.sin(rot);
    this.add(area, (out) => {
      const u = rand() * 2 - 1, th = rand() * TAU, s = Math.sqrt(1 - u * u);
      const x = s * Math.cos(th) * a, y = u * b, z = s * Math.sin(th) * cc;
      out.set(c[0] + x * cr - y * sr, c[1] + x * sr + y * cr, (c[2] || 0) + z);
    }, { w, min });
  }

  // Parametric surface fn(u, v) with a share of points pushed to its outline.
  sheet(fn, area, o = {}) {
    const { w = 1, min = 0, edge = 0.35, quant = 0, quantShare = 0.5, rimOnly = false } = o;
    const rand = this.rand;
    this.add(area, (out) => {
      let u = rand(), v = rand();
      if (quant && rand() < quantShare) u = (Math.floor(u * quant) + 0.5) / quant;
      else if (rand() < edge) {
        const e = rand();
        if (rimOnly || e < 0.6) v = 1; else if (e < 0.8) u = 0; else u = 1;
      }
      const q = fn(u, v);
      out.set(q[0], q[1], q[2] || 0);
    }, { w, min });
  }

  // Row of teeth as short vertical ticks between two points.
  teeth(from, to, count, h, o = {}) {
    const rand = this.rand;
    const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
    this.add(len * h * 2, (out) => {
      const k = Math.floor(rand() * count);
      const u = (k + 0.5) / count;
      const v = rand();
      out.set(
        lerp(from[0], to[0], u) + (rand() - 0.5) * h * 0.25,
        lerp(from[1], to[1], u) - v * h * (1 - 0.45 * u),
        lerp(from[2] || 0, to[2] || 0, u)
      );
    }, { min: o.min || 60, w: 0.1 });
  }

  build(N) {
    const total = this.parts.reduce((s, p) => s + p.area, 0);
    const mins = this.parts.reduce((s, p) => s + p.min, 0);
    const free = Math.max(0, N - mins);
    const counts = this.parts.map((p) => p.min + Math.floor((free * p.area) / total));
    let diff = N - counts.reduce((s, c) => s + c, 0);
    const order = this.parts.map((_, i) => i).sort((a, b) => this.parts[b].area - this.parts[a].area);
    for (let i = 0; diff !== 0; i++) {
      const idx = order[i % order.length];
      if (diff > 0) { counts[idx]++; diff--; } else if (counts[idx] > 0) { counts[idx]--; diff++; }
    }
    const out = new Float32Array(N * 3);
    const v = new THREE.Vector3();
    let o = 0;
    this.parts.forEach((p, i) => {
      for (let k = 0; k < counts[i]; k++) {
        p.sampler(v);
        out[o++] = v.x; out[o++] = v.y; out[o++] = v.z;
      }
    });
    return out;
  }
}

/* ------------------------------------------------------------------ */
/* Body-part helpers                                                   */
/* ------------------------------------------------------------------ */

function head(b, base, o) {
  const a = rad(o.pitch ?? -10);
  const dir = [Math.cos(a), Math.sin(a)];
  const up = [-Math.sin(a), Math.cos(a)];
  const L = o.len, H = o.h, W = o.w;
  const z0 = base[2] || 0;
  const P = (f, u, z = 0) => [base[0] + dir[0] * f * L + up[0] * u * H, base[1] + dir[1] * f * L + up[1] * u * H, z0 + z];
  const prof = o.profile || [0.5, 0.52, 0.4, 0.2];
  b.tube([P(-0.12, 0.08), P(0.25, 0.1), P(0.62, 0.02), P(1, -0.06)], prof.map((v) => v * H), { sy: 1, sz: W / H, w: o.weight ?? 1.7 });
  const ja = a - rad(o.jaw ?? 6);
  const jd = [Math.cos(ja), Math.sin(ja)];
  const hinge = P(0.04, -0.3);
  const J = (f) => [hinge[0] + jd[0] * f * L, hinge[1] + jd[1] * f * L, z0];
  b.tube([J(0), J(0.45), J(0.9)], [H * 0.25, H * 0.19, H * 0.07], { sy: 0.8, sz: (W / H) * 0.85, w: 1.4 });
  for (const s of [-1, 1]) {
    b.ellipsoid(P(0.2, 0.3, s * W * 0.42), [H * 0.085, H * 0.085, H * 0.085], { w: 4, min: 45 });
  }
  if (o.teeth) {
    for (const s of [-1, 1]) {
      b.teeth(P(0.3, -0.3, s * W * 0.32), P(0.93, -0.22, s * W * 0.12), o.teeth, H * (o.toothH ?? 0.16));
    }
  }
  b.anchors.eye = P(0.2, 0.36, W * 0.45);
  b.anchors.jaw = J(0.6);
  b.anchors.head = P(0.35, 0.6);
  return { P, dir, up, L, H, W };
}

function biLeg(b, hipJ, H, r, phase, toe) {
  const [hx, , hz] = hipJ;
  const knee = [hx + H * 0.2 + phase * H * 0.18, H * 0.56, hz];
  const ankle = [hx - H * 0.1 + phase * H * 0.34, H * 0.2 + Math.max(0, -phase) * H * 0.1, hz];
  const ball = [hx + H * 0.03 + phase * H * 0.45, H * 0.035, hz];
  b.tube([hipJ, knee, ankle, ball], [r * 1.15, r * 0.72, r * 0.34, r * 0.24]);
  const dx = knee[0] - hx, dy = knee[1] - hipJ[1];
  const tl = Math.hypot(dx, dy);
  b.ellipsoid([lerp(hx, knee[0], 0.4), lerp(hipJ[1], knee[1], 0.4), hz], [r * 1.25, tl * 0.42, r * 0.95], { rot: Math.atan2(-dx, dy) });
  for (const k of [-1, 0, 1]) {
    const ang = k * 0.38;
    const tip = [ball[0] + Math.cos(ang) * toe, H * 0.008, hz + Math.sin(ang) * toe * 0.75];
    b.tube([ball, tip], [r * 0.17, r * 0.05], { min: 28 });
  }
  return { knee, ankle, ball };
}

function arm(b, sh, len, r, fingers, claw, reach = 0.42) {
  const elbow = [sh[0] + len * 0.06, sh[1] - len * 0.5, sh[2]];
  const wrist = [elbow[0] + len * reach, elbow[1] - len * 0.1, sh[2]];
  b.tube([sh, elbow, wrist], [r * 1.35, r, r * 0.7]);
  for (let f = 0; f < fingers; f++) {
    const sp = fingers > 1 ? (f / (fingers - 1) - 0.5) : 0;
    const c = f === 0 && claw.thumb ? claw.thumb : claw.len;
    b.tube(
      [wrist, [wrist[0] + c * 0.55, wrist[1] - c * 0.15, wrist[2] + sp * c * 0.5], [wrist[0] + c * 0.9, wrist[1] - c * 0.6, wrist[2] + sp * c * 0.6]],
      [r * 0.42, r * 0.28, r * 0.03], { min: 22 }
    );
  }
  return { elbow, wrist };
}

// Feathered wing: quills fan backwards from an arm spline.
function wing(b, armPts, o) {
  const curve = new THREE.CatmullRomCurve3(armPts.map(V));
  b.tube(armPts, armPts.map((_, i) => o.r * (1 - (i / armPts.length) * 0.6)), { min: 40 });
  const s = o.side;
  const dirAt = (u) => new THREE.Vector3(-1 + u * u * o.fan, -0.08 + (o.droop || 0), s * (0.12 + u * u * o.fan * 0.9)).normalize();
  const lenAt = (u) => lerp(o.L0, o.L1, Math.pow(u, 1.2));
  const pt = new THREE.Vector3();
  b.sheet((u, v) => {
    curve.getPoint(u, pt);
    const d = dirAt(u);
    return arr(pt.addScaledVector(d, lenAt(u) * v));
  }, (o.L0 + o.L1) * 0.5 * curve.getLength(), { w: o.w ?? 1.1, edge: 0.3, quant: o.feathers || 16, quantShare: 0.45 });
  const mid = curve.getPoint(0.7);
  return arr(mid.addScaledVector(dirAt(0.7), lenAt(0.7) * 0.5));
}

function biped(b, o) {
  o = {
    H: 1, tail: 2.2, tailLift: -0.08, body: 1, R: 0.3, sag: 0.04, rise: 0.05,
    neck: 0.7, neckAng: 45, neckS: 0.2, neckR: 0.13, arm: 0.5, armR: 0.05, fingers: 3,
    claw: { len: 0.1 }, legR: 0.15, stride: 0.35, toe: 0.22, sy: 1.15, sz: 0.8, ...o,
  };
  const { H, tail, tailLift: tl, body, R } = o;
  const tailR = o.tailR ?? R * 0.62;
  const chest = [body, H + o.rise];
  const a = rad(o.neckAng), s = o.neckS;
  const n1 = [chest[0] + Math.cos(a + s) * o.neck * 0.5, chest[1] + Math.sin(a + s) * o.neck * 0.5];
  const n2 = [n1[0] + Math.cos(a - s) * o.neck * 0.5, n1[1] + Math.sin(a - s) * o.neck * 0.5];
  const spine = [
    [-tail, H + tl * H], [-tail * 0.66, H + tl * H * 0.5 + R * 0.06], [-tail * 0.33, H + tl * H * 0.18 + R * 0.12],
    [0, H + R * 0.18], [body * 0.5, H + R * 0.06 - o.sag], chest, n1, n2,
  ].map((p) => [p[0], p[1], 0]);
  const radii = [0.012 * H, tailR * 0.42, tailR * 0.8, R * 0.92, R, R * 0.82, o.neckR * 1.2, o.neckR];
  const torso = b.tube(spine, radii, { sy: o.sy, sz: o.sz });
  b.torso = torso;
  const hd = head(b, [n2[0] - o.neckR * 0.3, n2[1], 0], o.head);

  const legs = [];
  for (const side of [1, -1]) {
    legs.push(biLeg(b, [0, H - R * 0.1, side * R * o.sz * 0.62], H, o.legR, side * o.stride, o.toe));
  }
  b.anchors.foot = legs[0].ball;
  if (o.arm > 0) {
    const arms = [];
    for (const side of [1, -1]) {
      arms.push(arm(b, [body * 0.86, H - R * 0.25 + o.rise * 0.5, side * R * o.sz * 0.62], o.arm, o.armR, o.fingers, o.claw, o.reach));
    }
    b.anchors.hand = arms[0].wrist;
    b.arms = arms;
  }
  b.anchors.neck = [n1[0], n1[1], o.neckR];
  b.anchors.back = [body * 0.35, H + R * 1.1, 0];
  b.anchors.tail = [spine[1][0], spine[1][1], 0];
  b.anchors.hip = [0, H, 0];
  b.meta.tailX = 0;
  return { spine, torso, hd, legs, chest, n1, n2, o };
}

function quad(b, o) {
  o = {
    hipH: 1, shH: 0.9, body: 1.5, R: 0.5, sy: 1.1, sz: 0.9, hump: 0.15, tail: 2, tailDrop: 0.4,
    neck: 0.6, neckAng: 10, neckS: 0.05, neckR: 0.2, legR: 0.15, fLegR: 0.13, stride: 0.25,
    columnar: false, sprawl: 0, ...o,
  };
  const { hipH, shH, body, R } = o;
  const tailR = o.tailR ?? R * 0.5;
  const hipC = [0, hipH + R * 0.25];
  const chest = [body, shH + R * 0.25];
  const mid = [body * 0.5, (hipC[1] + chest[1]) / 2 + R * o.hump];
  const tipY = hipH * (1 - o.tailDrop);
  const ty = (f) => hipC[1] - (hipC[1] - tipY) * Math.pow(f, 1.3);
  const a = rad(o.neckAng), s = o.neckS;
  const n1 = [chest[0] + Math.cos(a + s) * o.neck * 0.5, chest[1] + Math.sin(a + s) * o.neck * 0.5];
  const n2 = [n1[0] + Math.cos(a - s) * o.neck * 0.5, n1[1] + Math.sin(a - s) * o.neck * 0.5];
  const spine = [
    [-o.tail, ty(1)], [-o.tail * 0.66, ty(0.66)], [-o.tail * 0.33, ty(0.33)], hipC, mid, chest, n1, n2,
  ].map((p) => [p[0], p[1], 0]);
  const radii = [0.015 * R + 0.01 * hipH, tailR * 0.45, tailR * 0.8, R * 0.9, R, R * 0.86, o.neckR * 1.2, o.neckR];
  const torso = b.tube(spine, radii, { sy: o.sy, sz: o.sz });
  b.torso = torso;
  const hd = head(b, [n2[0] - o.neckR * 0.3, n2[1], 0], o.head);

  const hind = [], front = [];
  for (const side of [1, -1]) {
    const ph = side * o.stride;
    const hz = side * R * o.sz * 0.7;
    const spr = side * o.sprawl * hipH * 0.35;
    const hipJ = [0, hipH, hz];
    if (o.columnar) {
      const knee = [ph * 0.3 * hipH + 0.05 * hipH, hipH * 0.5, hz];
      const ankle = [ph * 0.4 * hipH, hipH * 0.08, hz];
      b.tube([hipJ, knee, ankle], [o.legR * 1.4, o.legR * 1.02, o.legR * 0.95]);
      b.ellipsoid([ankle[0] + o.legR * 0.2, hipH * 0.05, hz], [o.legR * 1.15, hipH * 0.05, o.legR * 1.1]);
      hind.push({ knee, foot: ankle });
    } else {
      const knee = [0.16 * hipH + ph * 0.2 * hipH, hipH * 0.55, hz + spr * 0.6];
      const ankle = [-0.06 * hipH + ph * 0.35 * hipH, hipH * 0.18, hz + spr];
      const foot = [ankle[0] + 0.12 * hipH, 0.03 * hipH, hz + spr];
      b.tube([hipJ, knee, ankle, foot], [o.legR * 1.3, o.legR * 0.85, o.legR * 0.55, o.legR * 0.45]);
      hind.push({ knee, foot });
    }
    const dx = hind[hind.length - 1].knee[0], dy = hind[hind.length - 1].knee[1] - hipH;
    b.ellipsoid([dx * 0.4, hipH + dy * 0.4, hz], [o.legR * 1.4, Math.hypot(dx, dy) * 0.45, o.legR * 1.05], { rot: Math.atan2(-dx, dy) });

    const fz = side * R * o.sz * 0.66;
    const fph = -ph;
    const sh = [body * 0.95, shH, fz];
    if (o.columnar) {
      const elbow = [sh[0] - 0.03 * shH + fph * 0.2 * shH, shH * 0.5, fz];
      const wrist = [sh[0] + fph * 0.35 * shH, shH * 0.08, fz];
      b.tube([sh, elbow, wrist], [o.fLegR * 1.35, o.fLegR * 1.0, o.fLegR * 0.95]);
      b.ellipsoid([wrist[0], shH * 0.05, fz], [o.fLegR * 1.1, shH * 0.05, o.fLegR * 1.05]);
      front.push({ elbow, foot: wrist });
    } else {
      const elbow = [sh[0] - 0.1 * shH + fph * 0.15 * shH, shH * 0.52, fz + spr * 0.6];
      const wrist = [sh[0] + fph * 0.35 * shH, shH * 0.14, fz + spr];
      const foot = [wrist[0] + 0.07 * shH, 0.03 * shH, fz + spr];
      b.tube([sh, elbow, wrist, foot], [o.fLegR * 1.3, o.fLegR * 0.95, o.fLegR * 0.7, o.fLegR * 0.6]);
      front.push({ elbow, foot });
    }
  }
  b.anchors.foot = hind[0].foot;
  b.anchors.frontleg = front[0].elbow;
  b.anchors.neck = [n1[0], n1[1], o.neckR];
  b.anchors.back = [mid[0], mid[1] + R * o.sy, 0];
  b.anchors.tail = [spine[1][0], spine[1][1], 0];
  b.meta.tailX = 0;
  return { spine, torso, hd, mid, chest, n1, n2, o };
}

// Point on the torso surface at spline parameter t, angle phi from the top (radians, + = near side).
function onTorso(b, t, phi, lift = 1) {
  const { curve, radiusAt, sy, sz } = b.torso;
  const p = curve.getPoint(t);
  const tg = curve.getTangent(t);
  const upv = new THREE.Vector3(-tg.y, tg.x, 0).normalize();
  const r = radiusAt(t) * lift;
  return {
    p: [p.x + upv.x * Math.cos(phi) * r * sy, p.y + upv.y * Math.cos(phi) * r * sy, Math.sin(phi) * r * sz],
    up: [upv.x, upv.y], tg: [tg.x, tg.y], r,
  };
}

/* ------------------------------------------------------------------ */
/* Specimens                                                           */
/* ------------------------------------------------------------------ */

const BUILDERS = {
  euparkeria(b) {
    const q = quad(b, {
      hipH: 0.17, shH: 0.14, body: 0.2, R: 0.055, sy: 1.1, sz: 0.95, hump: 0.2, tail: 0.34, tailDrop: 0.75,
      neck: 0.07, neckAng: 25, neckR: 0.028, legR: 0.018, fLegR: 0.014, stride: 0.3, sprawl: 0.35,
      head: { len: 0.085, h: 0.036, w: 0.03, pitch: -12, jaw: 8, teeth: 9, profile: [0.5, 0.5, 0.36, 0.16] },
    });
    for (let i = 0; i < 26; i++) {
      const t = lerp(0.14, 0.86, i / 25);
      for (const s of [-1, 1]) {
        const { p } = onTorso(b, t, s * 0.22, 1.05);
        b.ellipsoid(p, [0.008, 0.004, 0.006], { min: 10 });
      }
    }
    b.anchors.back = onTorso(b, 0.5, 0.2, 1.1).p;
    return q;
  },

  eoraptor(b) {
    biped(b, {
      H: 1, tail: 2.0, tailLift: -0.05, body: 0.75, R: 0.2, neck: 0.55, neckAng: 42, neckS: 0.2, neckR: 0.085,
      arm: 0.45, armR: 0.032, fingers: 3, claw: { len: 0.12 }, legR: 0.1, stride: 0.4, toe: 0.2,
      head: { len: 0.38, h: 0.16, w: 0.11, pitch: -8, jaw: 6, teeth: 10, profile: [0.5, 0.5, 0.38, 0.2] },
    });
  },

  herrerasaurus(b) {
    biped(b, {
      H: 1, tail: 2.4, tailLift: -0.06, body: 1.0, R: 0.3, neck: 0.62, neckAng: 36, neckS: 0.24, neckR: 0.13,
      arm: 0.55, armR: 0.05, fingers: 3, claw: { len: 0.16 }, legR: 0.15, stride: 0.38, toe: 0.24,
      head: { len: 0.62, h: 0.26, w: 0.16, pitch: -12, jaw: 10, teeth: 12, profile: [0.5, 0.52, 0.42, 0.2] },
    });
  },

  coelophysis(b) {
    biped(b, {
      H: 1, tail: 2.5, tailLift: 0, body: 0.82, R: 0.17, neck: 0.95, neckAng: 52, neckS: 0.4, neckR: 0.065,
      arm: 0.45, armR: 0.028, fingers: 3, claw: { len: 0.1 }, legR: 0.09, stride: 0.42, toe: 0.2,
      head: { len: 0.5, h: 0.14, w: 0.085, pitch: -4, jaw: 5, teeth: 14, toothH: 0.12, profile: [0.5, 0.44, 0.3, 0.14] },
    });
  },

  plateosaurus(b) {
    const r = biped(b, {
      H: 1.4, tail: 3.0, tailLift: -0.16, body: 1.35, R: 0.42, sag: 0.12, rise: 0.12,
      neck: 1.45, neckAng: 34, neckS: 0.16, neckR: 0.12, arm: 0.8, armR: 0.07, fingers: 3,
      claw: { len: 0.14, thumb: 0.26 }, legR: 0.2, stride: 0.3, toe: 0.28, reach: 0.3,
      head: { len: 0.4, h: 0.18, w: 0.14, pitch: -22, jaw: 4, profile: [0.5, 0.5, 0.38, 0.2] },
    });
    return r;
  },

  dilophosaurus(b) {
    const r = biped(b, {
      H: 1.1, tail: 2.6, tailLift: -0.05, body: 1.0, R: 0.28, neck: 0.82, neckAng: 44, neckS: 0.24, neckR: 0.115,
      arm: 0.55, armR: 0.05, fingers: 3, claw: { len: 0.14 }, legR: 0.15, stride: 0.36, toe: 0.24,
      head: { len: 0.62, h: 0.22, w: 0.14, pitch: -8, jaw: 7, teeth: 12, profile: [0.5, 0.5, 0.36, 0.18] },
    });
    const { P, H, W } = r.hd;
    for (const s of [-1, 1]) {
      b.sheet((u, v) => {
        const f = lerp(0.08, 0.88, u);
        const hc = H * 0.95 * Math.pow(Math.sin(Math.PI * u), 0.7);
        const q = P(f, 0.42 + (v * hc) / H, s * (W * 0.12 + v * hc * 0.18));
        return q;
      }, r.hd.L * H * 0.8, { w: 2.2, edge: 0.55, min: 220 });
    }
    b.anchors.crest = P(0.45, 1.3);
  },

  stegosaurus(b) {
    quad(b, {
      hipH: 2.0, shH: 1.25, body: 2.4, R: 0.8, sy: 1.15, sz: 0.78, hump: 0.4, tail: 3.8, tailDrop: 0.3, tailR: 0.5,
      neck: 1.1, neckAng: -24, neckS: 0.06, neckR: 0.28, legR: 0.3, fLegR: 0.24, stride: 0.22,
      head: { len: 0.62, h: 0.26, w: 0.22, pitch: -30, jaw: 4, profile: [0.5, 0.48, 0.38, 0.22] },
    });
    const plates = 17;
    for (let k = 0; k < plates; k++) {
      const t = lerp(0.12, 0.88, k / (plates - 1));
      const hgt = 0.28 + 0.62 * Math.pow(Math.sin(Math.PI * Math.min(1, (t - 0.1) / 0.66)), 1.4);
      const side = k % 2 ? 1 : -1;
      const { p, up, tg } = onTorso(b, t, side * 0.12, 0.92);
      const wid = hgt * 0.95;
      b.sheet((u, v) => {
        const across = (u - 0.5) * 2;
        const hw = 0.5 * wid * (0.55 + 0.45 * Math.sin(Math.PI * v * 0.9)) * (1 - v * v);
        return [
          p[0] + tg[0] * across * hw + up[0] * v * hgt,
          p[1] + tg[1] * across * hw + up[1] * v * hgt,
          p[2] + side * v * hgt * 0.16,
        ];
      }, wid * hgt * 0.8, { w: 1.5, edge: 0.5, min: 60 });
      if (k === 8) b.anchors.plates = [p[0], p[1] + hgt * 0.8, 0];
    }
    for (const t of [0.035, 0.085]) {
      const { p } = onTorso(b, t, 0, 0.6);
      for (const s of [-1, 1]) {
        const d = new THREE.Vector3(-0.5, 0.55, s * 0.7).normalize().multiplyScalar(0.75);
        b.cone(p, [p[0] + d.x, p[1] + d.y, p[2] + d.z], 0.07, { w: 2 });
        if (t < 0.05 && s === 1) b.anchors.spikes = [p[0] + d.x, p[1] + d.y, d.z];
      }
    }
  },

  brachiosaurus(b) {
    const q = quad(b, {
      hipH: 4.0, shH: 5.3, body: 5.0, R: 1.6, sy: 1.1, sz: 0.82, hump: 0.08, tail: 7.5, tailDrop: 0.52, tailR: 0.9,
      neck: 8.6, neckAng: 64, neckS: 0.08, neckR: 0.42, legR: 0.55, fLegR: 0.5, stride: 0.14, columnar: true,
      head: { len: 1.05, h: 0.45, w: 0.36, pitch: -34, jaw: 3, weight: 3, profile: [0.5, 0.55, 0.42, 0.28] },
    });
    const { P, H } = q.hd;
    b.ellipsoid(P(0.3, 0.55), [H * 0.42, H * 0.3, H * 0.3], { w: 3 });
    b.anchors.neck = [lerp(q.chest[0], q.n1[0], 0.6), lerp(q.chest[1], q.n1[1], 0.6), 0.6];
  },

  allosaurus(b) {
    const r = biped(b, {
      H: 1.2, tail: 2.9, tailLift: -0.05, body: 1.2, R: 0.38, neck: 0.72, neckAng: 36, neckS: 0.26, neckR: 0.17,
      arm: 0.66, armR: 0.07, fingers: 3, claw: { len: 0.2 }, legR: 0.2, stride: 0.34, toe: 0.28,
      head: { len: 0.78, h: 0.34, w: 0.2, pitch: -10, jaw: 11, teeth: 13, profile: [0.5, 0.52, 0.42, 0.22] },
    });
    const { P, H, W } = r.hd;
    for (const s of [-1, 1]) b.cone(P(0.16, 0.5, s * W * 0.3), P(0.24, 0.9, s * W * 0.35), H * 0.12, { w: 3 });
    for (const s of [-1, 1]) {
      b.sheet((u, v) => P(lerp(0.32, 0.9, u), 0.44 + v * 0.12 * Math.sin(Math.PI * u), s * W * 0.18), r.hd.L * H * 0.1, { w: 2, min: 40 });
    }
  },

  archaeopteryx(b) {
    const o = biped(b, {
      H: 0.6, tail: 1.05, tailLift: 0.12, body: 0.55, R: 0.15, neck: 0.42, neckAng: 62, neckS: 0.35, neckR: 0.065,
      arm: 0, legR: 0.065, stride: 0.3, toe: 0.13, tailR: 0.05,
      head: { len: 0.26, h: 0.13, w: 0.1, pitch: -6, jaw: 6, teeth: 7, toothH: 0.12, profile: [0.5, 0.5, 0.34, 0.16] },
    });
    const H = 0.6, body = 0.55;
    let wingAnchor;
    for (const s of [1, -1]) {
      const pts = [
        [body * 0.86, H + 0.02, s * 0.1], [body * 0.72, H + 0.14, s * 0.36],
        [body * 0.86, H + 0.2, s * 0.64], [body * 0.8, H + 0.18, s * 0.88],
      ];
      const w = wing(b, pts, { side: s, r: 0.02, L0: 0.24, L1: 0.42, fan: 0.55, feathers: 16 });
      if (s === 1) wingAnchor = w;
      for (let f = 0; f < 3; f++) {
        const base = pts[2];
        b.tube([base, [base[0] + 0.07, base[1] + 0.01 - f * 0.012, base[2] + s * (f * 0.02 - 0.01)]], [0.012, 0.002], { min: 16 });
      }
    }
    b.anchors.wing = wingAnchor;
    b.anchors.hand = wingAnchor;
    const tailCurve = b.torso.curve;
    for (const s of [-1, 1]) {
      b.sheet((u, v) => {
        const p = tailCurve.getPoint(lerp(0.01, 0.3, u));
        return [p.x - v * 0.05, p.y - v * 0.015, s * (0.03 + v * 0.13 * (0.6 + 0.4 * (1 - u)))];
      }, 0.12, { w: 1.3, edge: 0.3, quant: 14, quantShare: 0.5 });
    }
    b.meta.flap = 0.15;
    return o;
  },

  spinosaurus(b) {
    const r = biped(b, {
      H: 0.9, tail: 3.3, tailLift: -0.06, body: 1.55, R: 0.34, sag: 0.02, rise: 0.02,
      neck: 0.95, neckAng: 30, neckS: 0.32, neckR: 0.12, arm: 0.68, armR: 0.065, fingers: 3,
      claw: { len: 0.18, thumb: 0.26 }, legR: 0.17, stride: 0.32, toe: 0.26, reach: 0.34,
      head: { len: 1.05, h: 0.2, w: 0.13, pitch: -6, jaw: 4, teeth: 16, toothH: 0.2, profile: [0.5, 0.42, 0.28, 0.2] },
    });
    const sail = (u) => 0.95 * Math.pow(Math.sin(Math.PI * u), 0.75) * (0.85 + 0.15 * Math.sin(Math.PI * u * 2 + 0.5));
    b.sheet((u, v) => {
      const t = lerp(0.3, 0.74, u);
      const { p, up } = onTorso(b, t, 0, 0.85);
      const h = sail(u);
      return [p[0] + up[0] * v * h, p[1] + up[1] * v * h, 0];
    }, 1.55 * 0.6, { w: 1.4, edge: 0.4, quant: 24, quantShare: 0.55, min: 900 });
    const sm = onTorso(b, lerp(0.3, 0.74, 0.45), 0, 0.85);
    const sh = sail(0.45) * 0.85;
    b.anchors.sail = [sm.p[0] + sm.up[0] * sh, sm.p[1] + sm.up[1] * sh, 0];
    for (const dir of [1, -0.6]) {
      b.sheet((u, v) => {
        const t = lerp(0.02, 0.32, u);
        const { p, up } = onTorso(b, t, dir > 0 ? 0 : Math.PI, 0.9);
        const h = Math.abs(dir) * 0.32 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), 0.8);
        const sgn = dir > 0 ? 1 : -1;
        return [p[0] + up[0] * v * h * sgn, p[1] + up[1] * v * h * sgn, 0];
      }, 0.3, { w: 1.2, edge: 0.45, quant: 18, quantShare: 0.4 });
    }
    return r;
  },

  argentinosaurus(b) {
    quad(b, {
      hipH: 4.6, shH: 4.9, body: 7.4, R: 2.3, sy: 1.05, sz: 0.9, hump: 0.12, tail: 12, tailDrop: 0.55, tailR: 1.3,
      neck: 10.5, neckAng: 22, neckS: 0.12, neckR: 0.55, legR: 0.78, fLegR: 0.72, stride: 0.12, columnar: true,
      head: { len: 1.25, h: 0.5, w: 0.42, pitch: -22, jaw: 3, weight: 4, profile: [0.5, 0.55, 0.42, 0.28] },
    });
  },

  velociraptor(b) {
    const r = biped(b, {
      H: 0.72, tail: 2.0, tailLift: 0.06, body: 0.82, R: 0.2, sag: 0.0, rise: 0.02, neck: 0.55, neckAng: 48, neckS: 0.4, neckR: 0.07,
      arm: 0.6, armR: 0.034, fingers: 3, claw: { len: 0.14 }, legR: 0.1, stride: 0.36, toe: 0.16, reach: 0.5,
      head: { len: 0.52, h: 0.14, w: 0.1, pitch: 2, jaw: 5, teeth: 12, profile: [0.5, 0.46, 0.34, 0.16] },
    });
    const leg = r.legs[0];
    const bl = leg.ball;
    const clawPts = [[bl[0] + 0.01, bl[1] + 0.02, bl[2]], [bl[0] + 0.06, bl[1] + 0.1, bl[2]], [bl[0] + 0.14, bl[1] + 0.11, bl[2]], [bl[0] + 0.18, bl[1] + 0.06, bl[2]]];
    b.tube(clawPts, [0.025, 0.02, 0.012, 0.002], { w: 3, min: 120 });
    const bl2 = r.legs[1].ball;
    b.tube(clawPts.map((p) => [p[0] - bl[0] + bl2[0], p[1], bl2[2]]), [0.025, 0.02, 0.012, 0.002], { w: 3, min: 90 });
    b.anchors.claw = clawPts[2];
    for (const [i, a] of b.arms.entries()) {
      const s = i === 0 ? 1 : -1;
      const c = new THREE.CatmullRomCurve3([V(a.elbow), V(a.wrist)]);
      b.sheet((u, v) => {
        const p = c.getPoint(u);
        return [p.x - v * 0.12 * (0.6 + u * 0.6), p.y - v * 0.18 * (0.5 + u * 0.7), p.z + s * v * 0.03];
      }, 0.08, { w: 1.4, edge: 0.3, quant: 10, quantShare: 0.6, min: 160 });
    }
    const tc = b.torso.curve;
    for (const s of [-1, 1]) {
      b.sheet((u, v) => {
        const p = tc.getPoint(lerp(0.0, 0.2, u));
        return [p.x, p.y + (v - 0.5) * 0.04, s * (0.02 + v * 0.14 * Math.sin(Math.PI * Math.min(1, u * 1.2 + 0.1)))];
      }, 0.15, { w: 1.1, edge: 0.3, quant: 12, quantShare: 0.5 });
    }
  },

  ankylosaurus(b) {
    const q = quad(b, {
      hipH: 1.3, shH: 1.12, body: 2.8, R: 0.95, sy: 0.72, sz: 1.42, hump: 0.12, tail: 3.0, tailDrop: 0.32, tailR: 0.5,
      neck: 0.45, neckAng: -12, neckS: 0.02, neckR: 0.42, legR: 0.3, fLegR: 0.27, stride: 0.15, sprawl: 0.12,
      head: { len: 0.72, h: 0.4, w: 0.68, pitch: -14, jaw: 3, profile: [0.5, 0.52, 0.45, 0.32] },
    });
    const rnd = b.rand;
    for (let i = 0; i < 110; i++) {
      const t = lerp(0.3, 0.8, rnd());
      const phi = (rnd() * 2 - 1) * 1.25;
      const { p } = onTorso(b, t, phi, 1.02);
      const s = 0.07 + rnd() * 0.07;
      b.ellipsoid(p, [s, s * 0.6, s], { w: 1.2, min: 10 });
    }
    for (let i = 0; i < 9; i++) {
      const t = lerp(0.36, 0.76, i / 8);
      for (const s of [-1, 1]) {
        const { p } = onTorso(b, t, s * 1.45, 1.0);
        b.cone(p, [p[0] - 0.05, p[1] - 0.02, p[2] + s * 0.28], 0.07, { w: 2, min: 20 });
      }
    }
    const tip = q.spine[0];
    b.ellipsoid([tip[0] + 0.28, tip[1] + 0.02, 0], [0.34, 0.2, 0.46], { w: 2.5, min: 380 });
    b.anchors.club = [tip[0] + 0.28, tip[1] + 0.2, 0.3];
    const { P, W } = q.hd;
    for (const s of [-1, 1]) {
      b.cone(P(0.1, 0.4, s * W * 0.45), P(-0.1, 0.55, s * W * 0.7), 0.06, { w: 2 });
      b.cone(P(0.05, -0.1, s * W * 0.45), P(-0.12, -0.35, s * W * 0.7), 0.06, { w: 2 });
    }
  },

  triceratops(b) {
    const q = quad(b, {
      hipH: 1.9, shH: 1.6, body: 3.0, R: 1.1, sy: 1.05, sz: 0.92, hump: 0.2, tail: 2.8, tailDrop: 0.45, tailR: 0.55,
      neck: 0.5, neckAng: -10, neckS: 0.0, neckR: 0.62, legR: 0.4, fLegR: 0.36, stride: 0.2,
      head: { len: 1.9, h: 0.8, w: 0.66, pitch: -18, jaw: 4, weight: 2.4, profile: [0.5, 0.54, 0.4, 0.14] },
    });
    const { P, dir, up, H, W } = q.hd;
    const fc = P(0.02, 0.5);
    const e2 = new THREE.Vector3(-dir[0] * 0.62 + up[0] * 0.78, -dir[1] * 0.62 + up[1] * 0.78, 0).normalize();
    const e1 = new THREE.Vector3(0, 0, 1);
    const FR = 1.45;
    // Saddle-shaped shield: the sides curl forward and down around the skull.
    b.sheet((u, v) => {
      const a = (u - 0.5) * rad(190);
      const rr = FR * Math.sqrt(v) * (1 + 0.045 * Math.sin(a * 14) * v);
      const s2 = Math.sin(a) * Math.sin(a);
      return [
        fc[0] + e2.x * Math.cos(a) * rr + dir[0] * s2 * rr * 0.7 - up[0] * s2 * rr * 0.35,
        fc[1] + e2.y * Math.cos(a) * rr + dir[1] * s2 * rr * 0.7 - up[1] * s2 * rr * 0.35,
        e1.z * Math.sin(a) * rr * 0.8,
      ];
    }, Math.PI * FR * FR * 0.58, { w: 1.6, edge: 0.3, rimOnly: true, min: 1300 });
    b.anchors.frill = [fc[0] + e2.x * FR * 0.85, fc[1] + e2.y * FR * 0.85, 0.25];
    const hornDir = new THREE.Vector3(dir[0] * 0.8 + up[0] * 0.6, dir[1] * 0.8 + up[1] * 0.6, 0).normalize();
    for (const s of [-1, 1]) {
      const base = P(0.3, 0.5, s * W * 0.28);
      const tipH = [base[0] + hornDir.x * 1.3, base[1] + hornDir.y * 1.3, base[2] + s * 0.14];
      b.cone(base, tipH, H * 0.16, { w: 3, min: 220 });
      if (s === 1) b.anchors.horn = [lerp(base[0], tipH[0], 0.7), lerp(base[1], tipH[1], 0.7), tipH[2]];
    }
    const nb = P(0.82, 0.32);
    b.cone(nb, [nb[0] + up[0] * 0.3 + dir[0] * 0.08, nb[1] + up[1] * 0.3 + dir[1] * 0.08, 0], H * 0.1, { w: 3 });
  },

  trex(b) {
    biped(b, {
      H: 1.3, tail: 3.25, tailLift: -0.04, body: 1.3, R: 0.52, sag: 0.05, rise: 0.02, neck: 0.62, neckAng: 32, neckS: 0.32, neckR: 0.29,
      arm: 0.34, armR: 0.055, fingers: 2, claw: { len: 0.09 }, legR: 0.28, stride: 0.32, toe: 0.32, reach: 0.4,
      head: { len: 1.12, h: 0.56, w: 0.44, pitch: -12, jaw: 13, teeth: 12, toothH: 0.2, weight: 2, profile: [0.5, 0.56, 0.46, 0.26] },
    });
  },

  bird(b) {
    b.ellipsoid([0, 0, 0], [0.48, 0.19, 0.2], { rot: 0.05 });
    b.tube([[0.35, 0.04, 0], [0.5, 0.1, 0], [0.58, 0.12, 0]], [0.15, 0.13, 0.11]);
    b.ellipsoid([0.62, 0.13, 0], [0.14, 0.12, 0.11], { w: 1.4 });
    b.cone([0.7, 0.11, 0], [0.95, 0.06, 0], 0.05, { w: 2, min: 80 });
    for (const s of [-1, 1]) b.ellipsoid([0.67, 0.17, s * 0.075], [0.018, 0.018, 0.018], { w: 4, min: 40 });
    b.sheet((u, v) => {
      const a = (u - 0.5) * 0.95;
      return [-0.38 - v * 0.55 * Math.cos(a), -0.02 - v * 0.04, Math.sin(a) * v * 0.55];
    }, 0.3, { w: 1.2, edge: 0.4, quant: 12, quantShare: 0.5 });
    let wa;
    for (const s of [1, -1]) {
      const pts = [[0.16, 0.08, s * 0.14], [0.06, 0.16, s * 0.6], [0.14, 0.18, s * 1.05], [-0.02, 0.14, s * 1.62]];
      const w = wing(b, pts, { side: s, r: 0.035, L0: 0.55, L1: 0.5, fan: 0.9, feathers: 22, droop: 0.02, w: 1.3 });
      if (s === 1) wa = w;
    }
    for (const s of [-1, 1]) b.tube([[-0.1, -0.12, s * 0.06], [-0.3, -0.18, s * 0.06]], [0.03, 0.012], { min: 40 });
    b.anchors.wing = wa;
    b.anchors.head = [0.62, 0.3, 0];
    b.meta.flap = 1;
    b.meta.lift = 0.45;
    b.meta.tailX = -0.2;
    b.meta.roll = -0.62;
    b.meta.pitch = 0.12;
  },
};

/* ------------------------------------------------------------------ */

const FIT = { x: 5.4, y: 3.3, z: 5.2 };

export function buildSpecimen(id, N, seed = 7) {
  const b = new Builder(seed + id.length * 131);
  BUILDERS[id](b);
  const raw = b.build(N);
  // Optional attitude (banking flight): roll about x, then pitch about z.
  if (b.meta.roll || b.meta.pitch) {
    const cr = Math.cos(b.meta.roll || 0), sr = Math.sin(b.meta.roll || 0);
    const cp = Math.cos(b.meta.pitch || 0), spp = Math.sin(b.meta.pitch || 0);
    const rot = (x, y, z) => {
      const y1 = y * cr - z * sr, z1 = y * sr + z * cr;
      return [x * cp - y1 * spp, x * spp + y1 * cp, z1];
    };
    for (let i = 0; i < N; i++) {
      const q = rot(raw[i * 3], raw[i * 3 + 1], raw[i * 3 + 2]);
      raw[i * 3] = q[0]; raw[i * 3 + 1] = q[1]; raw[i * 3 + 2] = q[2];
    }
    for (const k of Object.keys(b.anchors)) {
      const a = b.anchors[k];
      b.anchors[k] = rot(a[0], a[1], a[2] || 0);
    }
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < N; i++) {
    const x = raw[i * 3], y = raw[i * 3 + 1], z = raw[i * 3 + 2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  const s = Math.min(FIT.x / (maxX - minX), FIT.y / (maxY - minY), FIT.z / (maxZ - minZ));
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  // Mirror on x so specimens face left, toward the reading column.
  const tf = (x, y, z) => [-(x - cx) * s, (y - minY) * s, (z - cz) * s];

  const idx = new Uint32Array(N).map((_, i) => i);
  const xs = new Float32Array(N);
  for (let i = 0; i < N; i++) xs[i] = raw[i * 3];
  idx.sort((a, c) => xs[c] - xs[a]);

  const positions = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const j = idx[i];
    const q = tf(raw[j * 3], raw[j * 3 + 1], raw[j * 3 + 2]);
    positions[i * 3] = q[0]; positions[i * 3 + 1] = q[1]; positions[i * 3 + 2] = q[2];
  }
  const anchors = {};
  for (const [k, v] of Object.entries(b.anchors)) anchors[k] = tf(v[0], v[1], v[2] || 0);
  return {
    id, positions, anchors,
    height: (maxY - minY) * s,
    tailX: -((b.meta.tailX ?? 0) - cx) * s,
    flap: b.meta.flap || 0,
    lift: b.meta.lift || 0,
  };
}

export const SPECIMEN_IDS = Object.keys(BUILDERS);
