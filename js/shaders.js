// GLSL shared by the scene: noise, planet, atmosphere, hologram particles, FX.

export const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x - floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
float fbm(vec3 p){
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 5; i++) { s += a * snoise(p); p *= 2.03; a *= 0.5; }
  return s;
}
float fbm3(vec3 p){
  return 0.5 * snoise(p) + 0.25 * snoise(p * 2.03) + 0.125 * snoise(p * 4.1);
}
float ridge(vec3 p){
  return 1.0 - abs(snoise(p * 5.0)) * 0.7 - abs(snoise(p * 11.0)) * 0.3;
}
`;

/* ---------------- Planet ---------------- */

export const planetVert = /* glsl */ `
varying vec3 vObj;
varying vec3 vN;
varying vec3 vV;
void main(){
  vObj = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vV = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

export const planetFrag = /* glsl */ `
uniform float uTime, uBurn, uAsh, uOpacity, uHolo;
uniform vec3 uPlates[7];
uniform float uPlateR[7];
uniform vec3 uSun, uLandA, uLandB, uOceanA, uOceanB, uGrid, uImpact;
varying vec3 vObj;
varying vec3 vN;
varying vec3 vV;
${NOISE}
float landMask(vec3 p){
  float n = fbm(p * 2.3) * 0.22 + snoise(p * 7.0) * 0.05;
  float m = 0.0;
  for (int i = 0; i < 7; i++) {
    float d = distance(p, uPlates[i]);
    m = max(m, smoothstep(uPlateR[i] + 0.07, uPlateR[i] - 0.1, d + n));
  }
  return m;
}
void main(){
  vec3 p = normalize(vObj);
  vec3 N = normalize(vN);
  vec3 V = normalize(vV);
  float m = landMask(p);
  float land = smoothstep(0.47, 0.53, m);
  float shelf = smoothstep(0.18, 0.5, m);
  float detail = fbm(p * 9.0);
  vec3 ocean = mix(uOceanA, uOceanB, shelf * 0.85);
  float region = fbm(p * 2.6 + 3.1);
  vec3 ground = mix(uLandA, uLandB, smoothstep(-0.45, 0.55, region * 0.8 + detail * 0.35));
  ground *= 0.9 + 0.18 * smoothstep(-0.2, 0.6, fbm3(p * 22.0));
  ground = mix(ground, ground * vec3(1.15, 1.08, 0.95), smoothstep(0.35, 0.8, ridge(p)));
  vec3 col = mix(ocean, ground, land);

  float diff = dot(N, uSun);
  float lit = smoothstep(-0.2, 0.65, diff);
  vec3 H = normalize(uSun + V);
  float spec = pow(max(dot(N, H), 0.0), 70.0) * (1.0 - land);
  col = col * (0.04 + 0.9 * lit) + spec * vec3(0.7, 0.85, 1.0) * lit * 0.7;

  // Survey overlay: graticule and coastline contours, strongest on the night side.
  float lat = asin(clamp(p.y, -1.0, 1.0)) / 0.2618;
  float lon = atan(p.x, p.z) / 0.2618;
  float gl = abs(fract(lat + 0.5) - 0.5) / fwidth(lat);
  float go = abs(fract(lon + 0.5) - 0.5) / max(fwidth(lon), 1e-4);
  float grid = 1.0 - min(min(gl, go), 1.0);
  float coast = 1.0 - smoothstep(0.0, 0.035, abs(m - 0.5));
  float night = 1.0 - lit;
  col += uGrid * (grid * 0.22 + coast * 0.7) * (0.2 + 0.8 * night) * uHolo;

  float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col += uGrid * fr * 0.55 * uHolo;

  // Impact: a fire front races outward from the strike and leaves char behind it.
  if (uBurn > 0.0005 || uAsh > 0.0005) {
    float d = acos(clamp(dot(p, uImpact), -1.0, 1.0)) / 3.14159;
    float front = uBurn * 1.18;
    float burned = smoothstep(front, front - 0.05, d);
    float edge = burned * (1.0 - smoothstep(0.0, 0.09, front - d));
    float fl = fbm(p * 12.0 + vec3(0.0, uTime * 0.35, 0.0)) * 0.5 + 0.5;
    vec3 fire = mix(vec3(1.0, 0.22, 0.02), vec3(1.0, 0.75, 0.3), fl);
    vec3 charred = mix(vec3(0.04, 0.02, 0.015), vec3(0.6, 0.09, 0.01), smoothstep(0.58, 0.82, fl));
    col = mix(col, charred, burned * 0.92);
    col += fire * edge * 2.4;
    col += vec3(1.0, 0.85, 0.6) * smoothstep(0.04, 0.0, d) * step(0.001, uBurn) * 3.0;

    float ashN = fbm3(p * 3.0 + vec3(uTime * 0.02)) * 0.5 + 0.5;
    vec3 ashCol = mix(vec3(0.05, 0.045, 0.045), vec3(0.2, 0.16, 0.14), ashN);
    col = mix(col, ashCol * (0.25 + 0.75 * lit) + charred * 0.35 * burned, uAsh * 0.88);
  }

  gl_FragColor = vec4(col, uOpacity);
}`;

export const atmoVert = /* glsl */ `
varying vec3 vNView;
varying vec3 vNW;
void main(){
  vNView = normalize(normalMatrix * normal);
  vNW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const atmoFrag = /* glsl */ `
uniform vec3 uColor, uSun;
uniform float uOpacity, uEdge;
varying vec3 vNView;
varying vec3 vNW;
void main(){
  float k = clamp(-vNView.z / uEdge, 0.0, 1.0);
  float a = pow(k, 2.2);
  float day = 0.3 + 0.7 * smoothstep(-0.5, 0.5, dot(vNW, uSun));
  gl_FragColor = vec4(uColor * a * day, a * uOpacity);
}`;

export const cloudFrag = /* glsl */ `
uniform float uTime, uOpacity, uAsh;
uniform vec3 uSun;
varying vec3 vObj;
varying vec3 vN;
varying vec3 vV;
${NOISE}
void main(){
  vec3 p = normalize(vObj);
  float n = fbm3(p * 3.2 + vec3(uTime * 0.012, 0.0, uTime * 0.008)) + 0.12 * snoise(p * 13.0);
  float band = 0.75 + 0.25 * cos(p.y * 7.0);
  float c = smoothstep(0.18, 0.7, n * band);
  float lit = smoothstep(-0.15, 0.6, dot(normalize(vN), uSun));
  vec3 col = mix(vec3(0.95, 0.98, 1.0), vec3(0.12, 0.1, 0.09), uAsh);
  float a = c * mix(0.42, 0.92, uAsh) * uOpacity;
  a = max(a, uAsh * 0.55 * smoothstep(-0.3, 0.4, n) * uOpacity);
  gl_FragColor = vec4(col * (0.06 + 0.85 * lit), a * (0.25 + 0.75 * lit));
}`;

export const ringFrag = /* glsl */ `
uniform float uTime, uOpacity, uDash, uSpeed;
uniform vec3 uColor;
varying vec2 vUv;
void main(){
  float a = atan(vUv.y - 0.5, vUv.x - 0.5) / 6.28318 + 0.5;
  float dash = step(0.45, fract(a * uDash + uTime * uSpeed));
  float head = smoothstep(0.08, 0.0, abs(fract(a - uTime * uSpeed * 0.2) - 0.5) - 0.42);
  gl_FragColor = vec4(uColor, (0.25 * dash + 0.9 * head) * uOpacity);
}`;

export const uvVert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

/* ---------------- Sky ---------------- */

export const starVert = /* glsl */ `
attribute float aSize;
attribute float aPhase;
attribute vec3 aColor;
uniform float uTime, uPR, uDim;
varying float vA;
varying vec3 vC;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.55 + 0.45 * sin(uTime * (0.4 + aPhase * 1.6) + aPhase * 40.0);
  gl_PointSize = aSize * uPR * (0.7 + 0.5 * tw);
  vA = tw * uDim;
  vC = aColor;
}`;

export const starFrag = /* glsl */ `
varying float vA;
varying vec3 vC;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vC, a * a * vA);
}`;

export const nebulaFrag = /* glsl */ `
uniform float uTime, uDim;
uniform vec3 uTintA, uTintB;
varying vec3 vObj;
varying vec3 vN;
varying vec3 vV;
${NOISE}
void main(){
  vec3 p = normalize(vObj);
  float n = fbm3(p * 2.2 + vec3(uTime * 0.004));
  float n2 = fbm3(p * 5.0 - vec3(uTime * 0.003));
  float band = exp(-pow(p.y * 2.2 + 0.3 * n, 2.0));
  vec3 col = uTintA * smoothstep(-0.1, 0.8, n) * 0.22 + uTintB * smoothstep(0.1, 0.9, n2) * 0.14;
  col *= 0.35 + band;
  gl_FragColor = vec4(col * uDim, 1.0);
}`;

/* ---------------- Hologram specimen ---------------- */

export const holoVert = /* glsl */ `
attribute vec3 aFrom;
attribute vec4 aRnd;
uniform float uMorph, uTime, uSize, uPR, uDisperse, uAlpha, uTailX, uFlap, uScanX, uGlitch;
varying float vA;
varying float vScan;
varying float vH;
varying float vSpark;
void main(){
  float delay = aRnd.x * 0.35;
  float t = clamp((uMorph - delay) / 0.65, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);
  vec3 p = mix(aFrom, position, t);
  float mid = sin(t * 3.14159);
  vec3 swirl = (aRnd.yzw - 0.5);
  p += swirl * mid * vec3(1.6, 1.1, 1.6);
  p.y += mid * mid * 0.5 * aRnd.x;

  float tail = max(0.0, p.x - uTailX);
  p.z += sin(uTime * 1.1 - p.x * 0.9) * tail * 0.04 * (1.0 - mid);
  p.y += sin(uTime * 1.5) * 0.012 * (1.0 - mid);
  float wingSpan = max(0.0, abs(p.z) - 0.35);
  p.y += sin(uTime * 3.2) * wingSpan * 0.34 * uFlap;
  p.x += (1.0 - cos(uTime * 3.2)) * wingSpan * wingSpan * 0.04 * uFlap;

  // Glitch: horizontal slices jump sideways.
  float slice = floor(p.y * 9.0 + floor(uTime * 14.0) * 3.1);
  float gl = step(0.93, fract(sin(slice * 91.7) * 4375.5)) * uGlitch;
  p.x += gl * (fract(sin(slice * 13.1) * 921.3) - 0.5) * 0.9;

  float dd = uDisperse * (0.55 + aRnd.x * 0.9);
  vec3 dir = normalize(swirl + vec3(0.0, 0.35, 0.0));
  p += dir * dd * 5.0 + vec3(-2.0, 1.4, -1.0) * dd * dd * 2.5;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float scan = smoothstep(0.16, 0.0, abs(p.x - uScanX));
  vScan = scan;
  vH = p.y;
  vSpark = step(0.993, aRnd.w);
  float size = uSize * (0.6 + aRnd.w * 0.7) * (1.0 + scan * 0.35 + vSpark * 0.7);
  gl_PointSize = size * uPR * (9.0 / -mv.z);
  vA = uAlpha * (1.0 - smoothstep(0.35, 1.0, uDisperse) * (0.4 + aRnd.x * 0.6));
}`;

export const holoFrag = /* glsl */ `
uniform vec3 uColorA, uColorB;
uniform float uHeight;
varying float vA;
varying float vScan;
varying float vH;
varying float vSpark;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  a = pow(a, 1.5);
  vec3 col = mix(uColorA, uColorB, clamp(vH / max(uHeight, 0.01), 0.0, 1.0));
  col += vScan * vec3(0.9, 1.0, 1.0) * 0.3 + vSpark * 0.35;
  gl_FragColor = vec4(col, a * vA * (0.75 + vScan * 0.25));
}`;

export const padFrag = /* glsl */ `
uniform float uTime, uOpacity;
uniform vec3 uColor;
varying vec2 vUv;
void main(){
  vec2 c = vUv - 0.5;
  float r = length(c) * 2.0;
  float ang = atan(c.y, c.x);
  float aw = fwidth(r);
  float line = 1.0 - smoothstep(0.0, aw * 1.5, abs(fract(r * 6.0 + 0.5) - 0.5) / 6.0);
  float ticks = (1.0 - smoothstep(0.0, 0.08, abs(fract(ang / 6.28318 * 72.0) - 0.5) - 0.42)) * step(0.86, r) * step(r, 0.9);
  float sweep = fract((ang / 6.28318) + uTime * 0.1);
  float radar = pow(sweep, 14.0) * smoothstep(1.0, 0.2, r) * 0.6;
  float rim = 1.0 - smoothstep(0.0, aw * 2.0, abs(r - 0.96));
  float glow = smoothstep(0.75, 0.0, r) * 0.06;
  float fade = step(r, 1.0);
  float a = (line * 0.28 + ticks * 0.55 + radar * 0.3 + rim * 0.8 + glow) * fade;
  gl_FragColor = vec4(uColor, a * uOpacity);
}`;

export const beamFrag = /* glsl */ `
uniform float uTime, uOpacity;
uniform vec3 uColor;
varying vec2 vUv;
void main(){
  float fall = pow(1.0 - vUv.y, 2.2);
  float streak = 0.6 + 0.4 * sin(vUv.x * 160.0 + uTime * 0.6) * sin(vUv.x * 37.0 - uTime * 0.3);
  float band = smoothstep(0.04, 0.0, abs(fract(vUv.y * 3.0 - uTime * 0.25) - 0.5) - 0.46) * 0.4;
  gl_FragColor = vec4(uColor, (fall * streak * 0.045 + band * fall * 0.07) * uOpacity);
}`;

/* ---------------- Impact FX ---------------- */

export const rockVert = /* glsl */ `
varying vec3 vNW;
varying vec3 vObj;
void main(){
  vObj = position;
  vNW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const rockFrag = /* glsl */ `
uniform vec3 uSun, uHeatDir;
uniform float uHeat;
varying vec3 vNW;
varying vec3 vObj;
${NOISE}
void main(){
  vec3 N = normalize(vNW);
  float n = fbm(vObj * 3.0) * 0.5 + 0.5;
  vec3 base = mix(vec3(0.08, 0.07, 0.065), vec3(0.28, 0.24, 0.2), n);
  float l = max(dot(N, uSun), 0.0);
  vec3 col = base * (0.08 + 1.2 * l);
  float heat = pow(max(dot(N, uHeatDir), 0.0), 1.5) * uHeat;
  col += mix(vec3(1.0, 0.3, 0.05), vec3(1.0, 0.85, 0.5), heat) * heat * 2.4 * (0.6 + 0.4 * n);
  gl_FragColor = vec4(col, 1.0);
}`;

export const trailVert = /* glsl */ `
attribute float aAge;
attribute float aSeed;
uniform float uPR;
varying float vAge;
void main(){
  vAge = aAge;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float s = mix(1.0, 3.2, aAge) * (0.6 + aSeed * 0.8);
  gl_PointSize = s * uPR * (60.0 / -mv.z) * step(aAge, 0.999);
}`;

export const trailFrag = /* glsl */ `
varying float vAge;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * (1.0 - vAge);
  vec3 hot = vec3(1.0, 0.95, 0.8);
  vec3 mid = vec3(1.0, 0.45, 0.1);
  vec3 cool = vec3(0.35, 0.08, 0.04);
  vec3 col = vAge < 0.25 ? mix(hot, mid, vAge / 0.25) : mix(mid, cool, (vAge - 0.25) / 0.75);
  gl_FragColor = vec4(col, a * 0.8);
}`;

export const debrisVert = /* glsl */ `
attribute vec3 aVel;
attribute float aSeed;
uniform float uT, uPR;
uniform vec3 uOrigin, uCenter;
varying float vA;
varying float vSeed;
void main(){
  float t = uT * (0.5 + aSeed);
  vec3 p = uOrigin + aVel * t;
  vec3 toC = normalize(uCenter - p);
  p += toC * t * t * 0.9;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vA = smoothstep(0.0, 0.05, uT) * (1.0 - smoothstep(0.55, 1.0, uT));
  vSeed = aSeed;
  gl_PointSize = (1.2 + aSeed * 2.4) * uPR * (22.0 / -mv.z);
}`;

export const debrisFrag = /* glsl */ `
varying float vA;
varying float vSeed;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  vec3 col = mix(vec3(1.0, 0.35, 0.05), vec3(1.0, 0.85, 0.5), vSeed);
  gl_FragColor = vec4(col, a * vA);
}`;

export const shockFrag = /* glsl */ `
uniform float uT, uOpacity;
varying vec2 vUv;
void main(){
  float r = length(vUv - 0.5) * 2.0;
  float ringR = uT;
  float w = 0.04 + uT * 0.12;
  float ring = smoothstep(w, 0.0, abs(r - ringR));
  float inner = smoothstep(ringR, 0.0, r) * 0.25 * (1.0 - uT);
  vec3 col = mix(vec3(1.0, 0.9, 0.7), vec3(1.0, 0.35, 0.1), uT);
  gl_FragColor = vec4(col, (ring + inner) * (1.0 - smoothstep(0.6, 1.0, uT)) * uOpacity);
}`;

export const glowFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;
void main(){
  float r = length(vUv - 0.5) * 2.0;
  float a = pow(max(0.0, 1.0 - r), 2.4);
  gl_FragColor = vec4(uColor, a * uOpacity);
}`;

/* ---------------- Post ---------------- */

export const finalShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uAberr: { value: 0.012 },
    uVig: { value: 1 },
    uGrain: { value: 0.045 },
    uFlash: { value: 0 },
    uTint: { value: null },
    uTintAmt: { value: 0 },
    uRes: { value: null },
  },
  vertexShader: uvVert,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uAberr, uVig, uGrain, uFlash, uTintAmt;
    uniform vec3 uTint;
    uniform vec2 uRes;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float r2 = dot(c, c);
      vec2 off = c * r2 * uAberr * 4.0;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + off).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - off).b;
      col *= 0.975 + 0.025 * sin(uv.y * uRes.y * 1.4 + uTime * 6.0);
      col += (hash(uv * uRes + fract(uTime) * 91.0) - 0.5) * uGrain;
      float v = smoothstep(0.95, 0.25, length(c * vec2(1.0, 0.85)) * 1.25);
      col *= mix(1.0, v, uVig);
      col = mix(col, col * uTint * 1.4 + uTint * 0.02, uTintAmt);
      col = mix(col, vec3(1.0, 0.96, 0.9), uFlash);
      gl_FragColor = vec4(col, 1.0);
    }`,
};
