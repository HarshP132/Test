import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { starVert, starFrag, planetVert, nebulaFrag, finalShader } from './shaders.js';
import { Planet, PLANET_PALETTES } from './planet.js';
import { Specimen } from './specimen.js';
import { ImpactFX } from './impact.js';

// Where things sit for each scene mode. Portrait layouts stack the 3D above the text.
const LAYOUTS = {
  wide: {
    hero:      { planet: [0, -3.45, 0, 1.5, 1], spec: [2.35, -1.45, 0, 1, 0] },
    planet:    { planet: [2.55, 0.05, 0, 1.0, 1], spec: [2.35, -1.45, 0, 1, 0] },
    lineage:   { planet: [6.0, -1.2, -9, 0.9, 0.55], spec: [2.35, -1.45, 0, 1, 0] },
    specimen:  { planet: [11.5, 5.6, -26, 0.62, 0.7], spec: [2.2, -1.55, 0, 1.02, 1] },
    impact:    { planet: [0.9, -0.05, 0, 1.22, 1], spec: [2.2, -1.55, 0, 1.02, 1] },
    aftermath: { planet: [2.55, 0.05, 0, 1.0, 1], spec: [2.2, -1.55, 0, 1.02, 1] },
  },
  tall: {
    hero:      { planet: [0, -3.2, 0, 1.15, 1], spec: [0, 0.3, 0, 0.5, 0] },
    planet:    { planet: [0, 1.55, 0, 0.62, 1], spec: [0, 0.3, 0, 0.5, 0] },
    lineage:   { planet: [0, 2.6, -9, 0.7, 0.4], spec: [0, 0.3, 0, 0.5, 0] },
    specimen:  { planet: [3.2, 7.4, -26, 0.5, 0.7], spec: [0, 0.55, 0, 0.5, 1] },
    impact:    { planet: [0, 0.9, 0, 0.72, 1], spec: [0, 0.55, 0, 0.5, 1] },
    aftermath: { planet: [0, 1.55, 0, 0.62, 1], spec: [0, 0.55, 0, 0.5, 1] },
  },
};

export class World {
  constructor(canvas, shapes, { N, maxPR = 1.75, lowPower = false } = {}) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.pr = Math.min(window.devicePixelRatio || 1, maxPR);
    this.renderer.setPixelRatio(this.pr);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setClearColor(0x020408, 1);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 500);
    this.camera.position.set(0, 0.4, 10);
    this.camBase = new THREE.Vector3(0, 0.4, 10);
    this.look = new THREE.Vector3(0, 0, 0);

    this._sky();

    this.planet = new Planet();
    this.scene.add(this.planet.group);

    this.specimen = new Specimen(shapes, N, this.pr);
    this.scene.add(this.specimen.group);

    this.fxObj = new ImpactFX(this.planet, this.pr);
    this.scene.add(this.fxObj.group);

    // Scroll-scrubbed impact values plus the recovery shown in the epilogue.
    this.fx = { approach: 0, impact: 0, burn: 0, ash: 0, disperse: 0, debris: 0, shake: 0, flash: 0, alarm: 0 };
    this.after = { recover: 0, reform: 0 };

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.8, 0.5, 0.42);
    this.composer.addPass(this.bloom);
    this.final = new ShaderPass(finalShader);
    this.final.uniforms.uTint.value = new THREE.Color('#ff3b2f');
    this.final.uniforms.uRes.value = new THREE.Vector2(1, 1);
    this.composer.addPass(this.final);
    this.composer.addPass(new OutputPass());

    this.mouse = new THREE.Vector2();
    this.mouseS = new THREE.Vector2();
    this.scrollVel = 0;
    this.mode = 'hero';
    this.pose = { px: 0, py: 0, pz: 0, ps: 1, po: 1, sx: 0, sy: 0, sz: 0, ss: 1, so: 0, lock: 0 };
    this.resize();
    this.setMode('hero', true);
  }

  _sky() {
    const n = 3200;
    const pos = new Float32Array(n * 3), size = new Float32Array(n), phase = new Float32Array(n), col = new Float32Array(n * 3);
    const palette = [new THREE.Color('#bfe9ff'), new THREE.Color('#ffffff'), new THREE.Color('#ffd9a8'), new THREE.Color('#9fb6ff')];
    const v = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      v.randomDirection().multiplyScalar(90 + Math.random() * 80);
      pos.set([v.x, v.y, v.z], i * 3);
      size[i] = Math.random() < 0.04 ? 3 + Math.random() * 3 : 0.8 + Math.random() * 1.6;
      phase[i] = Math.random();
      const c = palette[(Math.random() * palette.length) | 0];
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    this.starU = { uTime: { value: 0 }, uPR: { value: this.pr }, uDim: { value: 1 } };
    this.stars = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: this.starU, vertexShader: starVert, fragmentShader: starFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.scene.add(this.stars);

    this.nebU = { uTime: this.starU.uTime, uDim: { value: 1 }, uTintA: { value: new THREE.Color('#0f6b7a') }, uTintB: { value: new THREE.Color('#4b2a78') } };
    this.nebula = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 32), new THREE.ShaderMaterial({ uniforms: this.nebU, vertexShader: planetVert, fragmentShader: nebulaFrag, side: THREE.BackSide, depthWrite: false }));
    this.scene.add(this.nebula);

    // Near-field dust for parallax depth.
    const d = 700;
    const dp = new Float32Array(d * 3), ds = new Float32Array(d), dph = new Float32Array(d), dc = new Float32Array(d * 3);
    for (let i = 0; i < d; i++) {
      dp.set([(Math.random() - 0.5) * 30, (Math.random() - 0.5) * 18, -12 + Math.random() * 20], i * 3);
      ds[i] = 0.6 + Math.random() * 1.2;
      dph[i] = Math.random();
      dc.set([0.5, 0.9, 1.0], i * 3);
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    dg.setAttribute('aSize', new THREE.BufferAttribute(ds, 1));
    dg.setAttribute('aPhase', new THREE.BufferAttribute(dph, 1));
    dg.setAttribute('aColor', new THREE.BufferAttribute(dc, 3));
    this.dustU = { uTime: this.starU.uTime, uPR: { value: this.pr }, uDim: { value: 0.35 } };
    this.dust = new THREE.Points(dg, new THREE.ShaderMaterial({ uniforms: this.dustU, vertexShader: starVert, fragmentShader: starFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.scene.add(this.dust);
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.tall = w / h < 0.9;
    this.camera.fov = this.tall ? 52 : 38;
    this.camera.updateProjectionMatrix();
    this.final.uniforms.uRes.value.set(w * this.pr, h * this.pr);
    this.bloom.resolution.set(w / 2, h / 2);
    if (this.mode) this.setMode(this.mode, true);
  }

  setMode(mode, instant = false) {
    this.mode = mode;
    const L = (this.tall ? LAYOUTS.tall : LAYOUTS.wide)[mode] || LAYOUTS.wide.planet;
    const [px, py, pz, ps, po] = L.planet;
    const [sx, sy, sz, ss, so] = L.spec;
    const target = { px, py, pz, ps, po, sx, sy, sz, ss, so, lock: mode === 'impact' || mode === 'aftermath' ? 1 : 0 };
    gsap.to(this.pose, { ...target, duration: instant ? 0 : 2.2, ease: 'power3.inOut', overwrite: true });
  }

  setEra(pal, accent, accent2, dur = 1.6) {
    const P = PLANET_PALETTES[pal] || PLANET_PALETTES.triassic;
    const u = this.planet.u;
    const tw = (c, hex) => { const t = new THREE.Color(hex); gsap.to(c, { r: t.r, g: t.g, b: t.b, duration: dur }); };
    tw(u.uLandA.value, P.landA); tw(u.uLandB.value, P.landB);
    tw(u.uOceanA.value, P.oceanA); tw(u.uOceanB.value, P.oceanB);
    tw(u.uGrid.value, accent);
    tw(this.planet.au.uColor.value, pal === 'impact' ? '#ff6a3d' : '#5fd8ff');
    this.specimen.setColors(accent, accent2, dur);
  }

  setDrift(d, dur = 2.4) {
    const o = { v: this.planet.drift };
    gsap.to(o, { v: d, duration: dur, ease: 'power2.inOut', onUpdate: () => this.planet.setDrift(o.v) });
  }

  render(dt, t) {
    const P = this.pose;
    const pl = this.planet;
    pl.group.position.set(P.px, P.py, P.pz);
    pl.group.scale.setScalar(P.ps);
    pl.lock = P.lock;
    pl.setOpacity(P.po);

    const fx = this.fx, af = this.after;
    pl.u.uBurn.value = fx.burn * (1 - af.recover);
    pl.u.uAsh.value = fx.ash * (1 - af.recover * 0.85);
    pl.update(dt, t);

    const sp = this.specimen;
    sp.group.position.set(P.sx, P.sy, P.sz);
    sp.group.scale.setScalar(P.ss);
    sp.visibility = P.so;
    sp.u.uDisperse.value = fx.disperse * (1 - af.reform);
    sp.u.uGlitch.value = Math.min(1, fx.alarm * 0.6 + Math.max(0, fx.disperse - 0.02) * 2) * (1 - af.reform) * (fx.disperse < 0.98 ? 1 : 0);
    sp.update(dt, t);

    this.starU.uTime.value = t;
    this.starU.uDim.value = 1 - fx.ash * 0.35 * (1 - af.recover);
    this.dust.position.x = -this.mouseS.x * 0.6;
    this.dust.position.y = -this.mouseS.y * 0.4;
    this.dust.rotation.y = t * 0.004;

    this.mouseS.lerp(this.mouse, 1 - Math.pow(0.02, dt));
    const shake = fx.shake;
    const cam = this.camera;
    cam.position.set(
      this.camBase.x + this.mouseS.x * 0.45 + (Math.random() - 0.5) * shake * 0.25,
      this.camBase.y + this.mouseS.y * 0.28 + (Math.random() - 0.5) * shake * 0.25,
      this.camBase.z
    );
    cam.lookAt(this.look);
    cam.rotation.z += this.scrollVel * 0.0006;

    this.fxObj.update(dt, t, fx, cam);

    const f = this.final.uniforms;
    f.uTime.value = t;
    f.uAberr.value = 0.005 + Math.min(0.08, Math.abs(this.scrollVel) * 0.0012) + shake * 0.05;
    f.uFlash.value = fx.flash;
    f.uTintAmt.value = fx.alarm * 0.12 * (1 - af.recover);
    this.bloom.strength = 0.8 + fx.flash * 1.6 + fx.impact * 0.5 * (1 - fx.impact);

    this.composer.render(dt);
  }
}
