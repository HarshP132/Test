// Photoreal specimen models: load a GLB, normalise it into the hologram's frame,
// give it a scan-in dissolve, and sample its surface so the particles form its exact shape.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { FIT } from './dinosaurs.js';

const REVEAL_CHUNK = /* glsl */ `
varying vec3 vRevealPos;
uniform float uReveal, uMinX, uMaxX, uRim;
uniform vec3 uEdgeColor;
float rvHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float rvNoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(rvHash(i), rvHash(i + vec3(1,0,0)), f.x), mix(rvHash(i + vec3(0,1,0)), rvHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(rvHash(i + vec3(0,0,1)), rvHash(i + vec3(1,0,1)), f.x), mix(rvHash(i + vec3(0,1,1)), rvHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
`;

// Patch a glTF PBR material with a head-to-tail dissolve and an accent rim light.
function patchMaterial(src, u) {
  const m = src.clone();
  m.side = THREE.FrontSide;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRevealPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRevealPos = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + REVEAL_CHUNK)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        float rvEdge = mix(uMinX - 0.5, uMaxX + 0.5, uReveal);
        float rvD = rvEdge - vRevealPos.x + (rvNoise(vRevealPos * 5.0) - 0.5) * 0.55;
        if (rvD < 0.0) discard;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float rvBand = (1.0 - smoothstep(0.0, 0.22, rvD)) * (1.0 - step(0.999, uReveal));
        float rvGrid = step(0.92, fract(vRevealPos.y * 14.0)) * (1.0 - smoothstep(0.0, 0.9, rvD)) * (1.0 - step(0.999, uReveal));
        float rvRim = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0);
        totalEmissiveRadiance += uEdgeColor * (rvBand * 5.0 + rvGrid * 0.8 + rvRim * uRim);`);
  };
  m.customProgramCacheKey = () => 'dt-reveal';
  return m;
}

function principalAngleXZ(geos) {
  let n = 0, mx = 0, mz = 0;
  for (const g of geos) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i += 3) { mx += p.getX(i); mz += p.getZ(i); n++; }
  }
  mx /= n; mz /= n;
  let cxx = 0, czz = 0, cxz = 0;
  for (const g of geos) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i += 3) {
      const dx = p.getX(i) - mx, dz = p.getZ(i) - mz;
      cxx += dx * dx; czz += dz * dz; cxz += dx * dz;
    }
  }
  return 0.5 * Math.atan2(2 * cxz, cxx - czz);
}

function bounds(geos) {
  const box = new THREE.Box3();
  for (const g of geos) { g.computeBoundingBox(); box.union(g.boundingBox); }
  return box;
}

// Mean height of the vertices in the outer 12% at each end of the body.
function endHeights(geos, box) {
  const L = box.max.x - box.min.x;
  let a = 0, na = 0, b = 0, nb = 0;
  for (const g of geos) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i += 2) {
      const x = p.getX(i);
      if (x < box.min.x + L * 0.12) { a += p.getY(i); na++; }
      else if (x > box.max.x - L * 0.12) { b += p.getY(i); nb++; }
    }
  }
  return [na ? a / na : 0, nb ? b / nb : 0];
}

function normalise(scene, cfg) {
  scene.updateMatrixWorld(true);
  const parts = [];
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    parts.push({ g, mat: o.material });
  });
  const geos = parts.map((p) => p.g);

  const m = new THREE.Matrix4().makeRotationY(principalAngleXZ(geos) + (cfg.yaw || 0));
  geos.forEach((g) => g.applyMatrix4(m));
  let box = bounds(geos);

  // Head should point to -x. Default guess: the head end sits higher than the tail tip.
  const [hMin, hMax] = endHeights(geos, box);
  let headAtMin = hMin > hMax;
  if (cfg.headLow) headAtMin = !headAtMin;
  if (cfg.flip) headAtMin = !headAtMin;
  if (!headAtMin) geos.forEach((g) => g.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI)));

  box = bounds(geos);
  const size = box.getSize(new THREE.Vector3());
  const s = Math.min(FIT.x / size.x, FIT.y / size.y, FIT.z / size.z);
  const c = box.getCenter(new THREE.Vector3());
  const t = new THREE.Matrix4().makeScale(s, s, s).multiply(new THREE.Matrix4().makeTranslation(-c.x, -box.min.y, -c.z));
  geos.forEach((g) => {
    g.applyMatrix4(t);
    if (!g.attributes.normal) g.computeVertexNormals();
    g.computeBoundingBox();
    g.computeBoundingSphere();
  });
  return { parts, box: bounds(geos) };
}

function sampleSurface(meshes, N, rand) {
  const samplers = meshes.map((mesh) => new MeshSurfaceSampler(mesh).setRandomGenerator(rand).build());
  const areas = samplers.map((s) => s.distribution[s.distribution.length - 1]);
  const total = areas.reduce((a, b) => a + b, 0);
  const out = new Float32Array(N * 3);
  const v = new THREE.Vector3();
  let o = 0;
  samplers.forEach((s, i) => {
    const n = i === samplers.length - 1 ? N - o / 3 : Math.round((N * areas[i]) / total);
    for (let k = 0; k < n; k++) { s.sample(v); out[o++] = v.x; out[o++] = v.y; out[o++] = v.z; }
  });
  // Sort by x so morphs map head-to-head and tail-to-tail, like the procedural shapes.
  const idx = Array.from({ length: N }, (_, i) => i).sort((a, b) => out[a * 3] - out[b * 3]);
  const sorted = new Float32Array(N * 3);
  idx.forEach((j, i) => { sorted[i * 3] = out[j * 3]; sorted[i * 3 + 1] = out[j * 3 + 1]; sorted[i * 3 + 2] = out[j * 3 + 2]; });
  return sorted;
}

function snapAnchors(anchors, positions) {
  const out = {};
  const N = positions.length / 3;
  for (const [k, a] of Object.entries(anchors)) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < N; i += 2) {
      const dx = positions[i * 3] - a[0], dy = positions[i * 3 + 1] - a[1], dz = (positions[i * 3 + 2] - a[2]) * 0.5;
      const d = dx * dx + dy * dy + dz * dz;
      if (d < bd) { bd = d; best = i; }
    }
    out[k] = [positions[best * 3], positions[best * 3 + 1], positions[best * 3 + 2]];
  }
  return out;
}

export class ModelLibrary {
  constructor(manifest, N) {
    this.manifest = manifest;
    this.N = N;
    this.cache = new Map();
    this.loader = new GLTFLoader();
    this.loader.setMeshoptDecoder(MeshoptDecoder);
    this.queue = Promise.resolve();
  }

  has(id) { return !!this.manifest[id]; }

  // Resolves to { group, uniforms, shape } or rejects if the file is missing.
  load(id, procedural) {
    if (!this.manifest[id]) return Promise.reject(new Error('no model'));
    if (this.cache.has(id)) return this.cache.get(id);
    const cfg = this.manifest[id];
    const tryLoad = (i) => this.loader.loadAsync(cfg.sources[i]).catch((e) => {
      if (i + 1 < cfg.sources.length) return tryLoad(i + 1);
      throw e;
    });
    const p = tryLoad(0).then((gltf) => {
      const { parts, box } = normalise(gltf.scene, cfg);
      const u = {
        uReveal: { value: 0 },
        uMinX: { value: box.min.x },
        uMaxX: { value: box.max.x },
        uRim: { value: 0.45 },
        uEdgeColor: { value: new THREE.Color('#7df9ff') },
      };
      const group = new THREE.Group();
      const meshes = parts.map(({ g, mat }) => {
        const mats = Array.isArray(mat) ? mat.map((mm) => patchMaterial(mm, u)) : patchMaterial(mat, u);
        const mesh = new THREE.Mesh(g, mats);
        mesh.frustumCulled = false;
        group.add(mesh);
        return mesh;
      });
      group.visible = false;
      let seed = 1234;
      const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const positions = sampleSurface(meshes, this.N, rand);
      const shape = {
        id,
        positions,
        anchors: procedural ? snapAnchors(procedural.anchors, positions) : {},
        height: box.max.y - box.min.y,
        tailX: 99,
        flap: 0,
        lift: procedural?.lift || 0,
        fromModel: true,
      };
      return { id, group, uniforms: u, shape };
    });
    this.cache.set(id, p);
    p.catch(() => {});
    return p;
  }

  // Background preload, one file at a time.
  preload(ids, getProcedural) {
    for (const id of ids) {
      this.queue = this.queue.then(() => this.load(id, getProcedural(id)).catch(() => null));
    }
    return this.queue;
  }
}
