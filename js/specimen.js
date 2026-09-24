import * as THREE from 'three';
import { holoVert, holoFrag, padFrag, uvVert } from './shaders.js';

export class Specimen {
  constructor(shapes, N, pixelRatio) {
    this.shapes = shapes;
    this.N = N;
    this.current = null;

    this.group = new THREE.Group();   // placed in the world
    this.yaw = new THREE.Group();     // spins with drag + idle sway
    this.group.add(this.yaw);

    const first = shapes.euparkeria;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(first.positions.slice(), 3));
    geo.setAttribute('aFrom', new THREE.BufferAttribute(first.positions.slice(), 3));
    const rnd = new Float32Array(N * 4);
    for (let i = 0; i < rnd.length; i++) rnd[i] = Math.random();
    geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 4));
    this.rnd = rnd;

    this.u = {
      uMorph: { value: 1 },
      uTime: { value: 0 },
      uSize: { value: 3.0 },
      uPR: { value: pixelRatio },
      uDisperse: { value: 0 },
      uAlpha: { value: 0 },
      uTailX: { value: first.tailX },
      uFlap: { value: 0 },
      uScanX: { value: 0 },
      uGlitch: { value: 0 },
      uHeight: { value: first.height },
      uColorA: { value: new THREE.Color('#ffb547') },
      uColorB: { value: new THREE.Color('#fff1c9') },
    };
    this.points = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: holoVert, fragmentShader: holoFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    this.points.frustumCulled = false;
    this.yaw.add(this.points);

    // Projector pad and light column.
    this.padU = { uTime: this.u.uTime, uOpacity: { value: 0 }, uColor: { value: this.u.uColorA.value } };
    const pad = new THREE.Mesh(
      new THREE.PlaneGeometry(5.8, 5.8),
      new THREE.ShaderMaterial({ uniforms: this.padU, vertexShader: uvVert, fragmentShader: padFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = -0.02;
    this.group.add(pad);

    this.baseYaw = 0.16;
    this.userYaw = 0;
    this.yawVel = 0;
    this.lift = 0;
    this.visibility = 0;
    this.models = {};
    this.active = null;
    this.reveal = 0;
    this.suppressMesh = false;
    this.show(first.id, true);
  }

  // A photoreal model arrived: particles adopt its surface, and it dissolves in once they settle.
  addModel(model) {
    this.models[model.id] = model;
    this.shapes[model.id] = model.shape;
    model.uniforms.uEdgeColor.value = this.u.uColorA.value;
    this.points.add(model.group);
    if (this.current === model.id) {
      this.current = null;
      this.show(model.id);
    }
  }

  get modelShown() {
    return this.reveal > 0.98;
  }

  // Freeze what is on screen now into aFrom so a new morph starts from it.
  _captureFrom() {
    const from = this.points.geometry.attributes.aFrom.array;
    const to = this.points.geometry.attributes.position.array;
    const m = this.u.uMorph.value;
    for (let i = 0; i < this.N; i++) {
      let t = Math.min(1, Math.max(0, (m - this.rnd[i * 4] * 0.35) / 0.65));
      t = t * t * (3 - 2 * t);
      for (let k = 0; k < 3; k++) {
        const j = i * 3 + k;
        from[j] += (to[j] - from[j]) * t;
      }
    }
  }

  show(id, instant = false) {
    if (id === this.current) return false;
    const s = this.shapes[id];
    if (!s) return false;
    const geo = this.points.geometry;
    if (instant) {
      geo.attributes.aFrom.array.set(s.positions);
      this.u.uMorph.value = 1;
    } else {
      this._captureFrom();
      this.u.uMorph.value = 0;
      gsap.to(this.u.uMorph, { value: 1, duration: 2.6, ease: 'power2.inOut', overwrite: true });
    }
    geo.attributes.position.array.set(s.positions);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aFrom.needsUpdate = true;
    const d = instant ? 0 : 1.6;
    gsap.to(this.u.uTailX, { value: s.tailX, duration: d });
    gsap.to(this.u.uFlap, { value: s.flap, duration: d });
    gsap.to(this.u.uHeight, { value: s.height, duration: d });
    gsap.to(this, { lift: s.lift, duration: instant ? 0 : 2.2, ease: 'power2.inOut' });
    this.current = id;
    return true;
  }

  setColors(a, b, dur = 1.4) {
    const ca = new THREE.Color(a), cb = new THREE.Color(b);
    gsap.to(this.u.uColorA.value, { r: ca.r, g: ca.g, b: ca.b, duration: dur });
    gsap.to(this.u.uColorB.value, { r: cb.r, g: cb.g, b: cb.b, duration: dur });
  }

  anchorWorld(key, target) {
    const a = this.shapes[this.current]?.anchors[key];
    if (!a) return null;
    target.set(a[0], a[1], a[2]);
    return this.points.localToWorld(target);
  }

  nudge(dx) {
    this.yawVel += dx * 0.0045;
  }

  update(dt, t) {
    this.u.uTime.value = t;
    this.u.uScanX.value = ((t * 0.28) % 1) * 8 - 4;
    this.yawVel *= Math.pow(0.04, dt);
    this.userYaw += this.yawVel;
    this.yaw.rotation.y = this.baseYaw + Math.sin(t * 0.22) * 0.16 + this.userYaw;
    this.points.position.y = this.lift + Math.sin(t * 0.9) * 0.05 * (0.3 + this.lift);
    const want = this.models[this.current] || null;
    if (this.active && this.active !== want) {
      this.reveal = Math.max(0, this.reveal - dt / 0.45);
      if (this.reveal === 0) { this.active.group.visible = false; this.active = null; }
    } else if (want) {
      this.active = want;
      const ready = this.u.uMorph.value > 0.97 && !this.suppressMesh && this.visibility > 0.6;
      this.reveal = ready ? Math.min(1, this.reveal + dt / 2.4) : Math.max(0, this.reveal - dt / 0.45);
    }
    if (this.active) {
      const r = this.reveal;
      this.active.group.visible = r > 0.001;
      this.active.uniforms.uReveal.value = r * r * (3 - 2 * r);
    }
    this.u.uAlpha.value = this.visibility * (1 - 0.86 * this.reveal);
    this.padU.uOpacity.value = 0.9 * this.visibility * (1 - this.u.uDisperse.value);
    this.group.visible = this.visibility > 0.002;
  }
}
