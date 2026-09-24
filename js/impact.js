import * as THREE from 'three';
import { rockVert, rockFrag, trailVert, trailFrag, debrisVert, debrisFrag, shockFrag, glowFrag, uvVert } from './shaders.js';

const TRAIL = 1400;
const DEBRIS = 1800;

function makeAsteroidGeometry() {
  const g = new THREE.IcosahedronGeometry(1, 6);
  const pos = g.attributes.position;
  const craters = [];
  for (let i = 0; i < 34; i++) {
    craters.push({ d: new THREE.Vector3().randomDirection(), r: 0.15 + Math.random() * 0.35, depth: 0.04 + Math.random() * 0.08 });
  }
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    let r = 1 + 0.12 * Math.sin(v.x * 3.1 + 1.2) * Math.sin(v.y * 2.3) + 0.08 * Math.sin(v.z * 5.2 + v.x * 2.0);
    for (const c of craters) {
      const a = v.angleTo(c.d) / c.r;
      if (a < 1.2) r -= c.depth * (a < 1 ? 1 - a * a : 0) - (a >= 0.85 ? c.depth * 0.35 * Math.sin((a - 0.85) / 0.35 * Math.PI) : 0);
    }
    v.multiplyScalar(r);
    v.x *= 1.25; v.y *= 0.85;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

export class ImpactFX {
  constructor(planet, pixelRatio) {
    this.planet = planet;
    this.group = new THREE.Group();
    this.impactW = new THREE.Vector3();
    this.normalW = new THREE.Vector3();
    this.inDir = new THREE.Vector3(0.9, 0.52, -0.3).normalize();

    this.rockU = { uSun: { value: planet.sun }, uHeatDir: { value: new THREE.Vector3() }, uHeat: { value: 0 } };
    this.rock = new THREE.Mesh(makeAsteroidGeometry(), new THREE.ShaderMaterial({ uniforms: this.rockU, vertexShader: rockVert, fragmentShader: rockFrag }));
    this.rock.scale.setScalar(0.2);
    this.group.add(this.rock);

    const glowMat = (color) => new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0 } },
      vertexShader: uvVert, fragmentShader: glowFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMat('#ff7a2a'));
    this.group.add(this.halo);
    this.flash = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMat('#fff2dc'));
    this.group.add(this.flash);

    // Trail: a ring buffer of embers left behind by the asteroid.
    const tg = new THREE.BufferGeometry();
    this.trailPos = new Float32Array(TRAIL * 3);
    this.trailAge = new Float32Array(TRAIL).fill(1);
    this.trailVel = new Float32Array(TRAIL * 3);
    const seeds = new Float32Array(TRAIL).map(() => Math.random());
    tg.setAttribute('position', new THREE.BufferAttribute(this.trailPos, 3));
    tg.setAttribute('aAge', new THREE.BufferAttribute(this.trailAge, 1));
    tg.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    this.trail = new THREE.Points(tg, new THREE.ShaderMaterial({
      uniforms: { uPR: { value: pixelRatio } }, vertexShader: trailVert, fragmentShader: trailFrag,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.trail.frustumCulled = false;
    this.group.add(this.trail);
    this.trailHead = 0;

    this.shockU = { uT: { value: 0 }, uOpacity: { value: 1 } };
    this.shock = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      uniforms: this.shockU, vertexShader: uvVert, fragmentShader: shockFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }));
    this.group.add(this.shock);

    const dg = new THREE.BufferGeometry();
    const vel = new Float32Array(DEBRIS * 3);
    const dseed = new Float32Array(DEBRIS);
    for (let i = 0; i < DEBRIS; i++) {
      dseed[i] = Math.random();
      const v = new THREE.Vector3().randomDirection();
      vel.set([v.x, v.y, v.z], i * 3);
    }
    dg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DEBRIS * 3), 3));
    dg.setAttribute('aVel', new THREE.BufferAttribute(vel, 3));
    dg.setAttribute('aSeed', new THREE.BufferAttribute(dseed, 1));
    this.debrisVelBase = vel.slice();
    this.debrisU = { uT: { value: 0 }, uPR: { value: pixelRatio }, uOrigin: { value: new THREE.Vector3() }, uCenter: { value: new THREE.Vector3() } };
    this.debris = new THREE.Points(dg, new THREE.ShaderMaterial({
      uniforms: this.debrisU, vertexShader: debrisVert, fragmentShader: debrisFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.debris.frustumCulled = false;
    this.group.add(this.debris);
    this._lastNormal = new THREE.Vector3();
  }

  // Aim the debris cone along the local surface normal.
  _orientDebris() {
    if (this._lastNormal.distanceToSquared(this.normalW) < 1e-4) return;
    this._lastNormal.copy(this.normalW);
    const vel = this.debris.geometry.attributes.aVel;
    const n = this.normalW;
    const v = new THREE.Vector3();
    for (let i = 0; i < DEBRIS; i++) {
      v.fromArray(this.debrisVelBase, i * 3);
      v.addScaledVector(n, 1.6).normalize().multiplyScalar(1.2 + (i % 7) * 0.35);
      vel.setXYZ(i, v.x, v.y, v.z);
    }
    vel.needsUpdate = true;
  }

  update(dt, t, fx, camera) {
    const on = fx.approach > 0.001 || fx.impact > 0.001 || fx.debris > 0.001;
    this.group.visible = on;
    if (!on) return;

    this.planet.impactWorld(this.impactW);
    const center = this.planet.group.getWorldPosition(new THREE.Vector3());
    this.normalW.subVectors(this.impactW, center).normalize();
    const scale = this.planet.group.scale.x;

    const a = fx.approach;
    const flying = a > 0.001 && a < 0.999;
    const dist = 26 * (1 - a) + 0.02;
    const pos = this.impactW.clone().addScaledVector(this.inDir, dist * scale).addScaledVector(this.normalW, 0.04);
    this.rock.position.copy(pos);
    this.rock.visible = flying;
    this.rock.rotation.x += dt * 0.6;
    this.rock.rotation.y += dt * 0.35;
    this.rockU.uHeatDir.value.copy(this.inDir).negate().applyQuaternion(this.rock.quaternion.clone().invert());
    this.rockU.uHeat.value = 0.25 + a * 0.9;

    this.halo.visible = flying;
    this.halo.position.copy(pos);
    this.halo.quaternion.copy(camera.quaternion);
    this.halo.scale.setScalar(0.9 + a * 1.8);
    this.halo.material.uniforms.uOpacity.value = 0.35 + a * 0.65;

    // Emit trail embers behind the rock.
    if (flying) {
      const emit = Math.min(26, Math.ceil(dt * 900));
      for (let k = 0; k < emit; k++) {
        const i = this.trailHead;
        this.trailHead = (this.trailHead + 1) % TRAIL;
        const back = Math.random() * 0.25;
        this.trailPos[i * 3] = pos.x + this.inDir.x * back + (Math.random() - 0.5) * 0.12;
        this.trailPos[i * 3 + 1] = pos.y + this.inDir.y * back + (Math.random() - 0.5) * 0.12;
        this.trailPos[i * 3 + 2] = pos.z + this.inDir.z * back + (Math.random() - 0.5) * 0.12;
        this.trailVel[i * 3] = this.inDir.x * 0.4 + (Math.random() - 0.5) * 0.15;
        this.trailVel[i * 3 + 1] = this.inDir.y * 0.4 + (Math.random() - 0.5) * 0.15;
        this.trailVel[i * 3 + 2] = this.inDir.z * 0.4 + (Math.random() - 0.5) * 0.15;
        this.trailAge[i] = 0;
      }
    }
    for (let i = 0; i < TRAIL; i++) {
      if (this.trailAge[i] >= 1) continue;
      this.trailAge[i] = Math.min(1, this.trailAge[i] + dt / 1.6);
      this.trailPos[i * 3] += this.trailVel[i * 3] * dt;
      this.trailPos[i * 3 + 1] += this.trailVel[i * 3 + 1] * dt;
      this.trailPos[i * 3 + 2] += this.trailVel[i * 3 + 2] * dt;
    }
    this.trail.geometry.attributes.position.needsUpdate = true;
    this.trail.geometry.attributes.aAge.needsUpdate = true;

    const im = fx.impact;
    this.shock.visible = im > 0.001 && im < 0.999;
    this.shock.position.copy(this.impactW).addScaledVector(this.normalW, 0.03);
    this.shock.lookAt(this.impactW.clone().add(this.normalW));
    this.shock.scale.setScalar((0.3 + im * 7.5) * scale);
    this.shockU.uT.value = im;

    this.flash.visible = im > 0.001 && im < 0.999;
    this.flash.position.copy(this.impactW).addScaledVector(this.normalW, 0.2);
    this.flash.quaternion.copy(camera.quaternion);
    this.flash.scale.setScalar((1.5 + im * 9) * scale);
    this.flash.material.uniforms.uOpacity.value = Math.sin(Math.min(1, im * 1.4) * Math.PI) * 1.3;

    this._orientDebris();
    this.debris.visible = fx.debris > 0.001 && fx.debris < 0.999;
    this.debrisU.uT.value = fx.debris;
    this.debrisU.uOrigin.value.copy(this.impactW);
    this.debrisU.uCenter.value.copy(center);
  }
}
