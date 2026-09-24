import * as THREE from 'three';
import { planetVert, planetFrag, atmoVert, atmoFrag, cloudFrag, ringFrag, uvVert } from './shaders.js';

// Continental blobs: [lat, lon] during Pangaea -> [lat, lon] by the end of the Cretaceous, chord radius.
const PLATES = [
  [34, -22, 44, -96, 0.5],   // North America
  [-14, -18, -16, -58, 0.42], // South America
  [-4, 10, 2, 20, 0.5],       // Africa
  [44, 34, 50, 80, 0.62],     // Eurasia
  [-34, 38, -10, 76, 0.22],   // India
  [-62, 22, -78, 40, 0.38],   // Antarctica
  [-50, 58, -28, 130, 0.3],   // Australia
];

const ll = (lat, lon) => {
  const a = THREE.MathUtils.degToRad(lat), o = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(Math.cos(a) * Math.sin(o), Math.sin(a), Math.cos(a) * Math.cos(o));
};

export const PLANET_PALETTES = {
  permian:    { landA: '#9a5a3a', landB: '#5a3322', oceanA: '#0a1420', oceanB: '#3a2a2a' },
  triassic:   { landA: '#b98249', landB: '#6d4a2a', oceanA: '#031a2c', oceanB: '#0d5068' },
  jurassic:   { landA: '#3f7039', landB: '#7a8a44', oceanA: '#021a2e', oceanB: '#0c5a70' },
  cretaceous: { landA: '#467a3c', landB: '#8a8a50', oceanA: '#021830', oceanB: '#0e5c78' },
  impact:     { landA: '#467a3c', landB: '#8a8a50', oceanA: '#021830', oceanB: '#0e5c78' },
  cenozoic:   { landA: '#4d7d3e', landB: '#9a9460', oceanA: '#02182e', oceanB: '#0f6480' },
};

const IMPACT_LATLON = [19, -84];

export class Planet {
  constructor() {
    this.group = new THREE.Group();
    this.tilt = new THREE.Group();
    this.tilt.rotation.z = 0.36;
    this.tilt.rotation.x = 0.12;
    this.group.add(this.tilt);
    this.spinner = new THREE.Group();
    this.tilt.add(this.spinner);

    this.sun = new THREE.Vector3(-0.78, 0.32, 0.55).normalize();
    this.impactDir = ll(...IMPACT_LATLON);

    const pal = PLANET_PALETTES.triassic;
    this.u = {
      uTime: { value: 0 },
      uBurn: { value: 0 },
      uAsh: { value: 0 },
      uOpacity: { value: 1 },
      uHolo: { value: 1 },
      uPlates: { value: PLATES.map(() => new THREE.Vector3()) },
      uPlateR: { value: PLATES.map((p) => p[4]) },
      uSun: { value: this.sun },
      uLandA: { value: new THREE.Color(pal.landA) },
      uLandB: { value: new THREE.Color(pal.landB) },
      uOceanA: { value: new THREE.Color(pal.oceanA) },
      uOceanB: { value: new THREE.Color(pal.oceanB) },
      uGrid: { value: new THREE.Color('#7df9ff') },
      uImpact: { value: this.impactDir },
    };
    this.surface = new THREE.Mesh(
      new THREE.SphereGeometry(2, 144, 96),
      new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: planetVert, fragmentShader: planetFrag, transparent: true, extensions: { derivatives: true } })
    );
    this.spinner.add(this.surface);

    this.cu = { uTime: this.u.uTime, uOpacity: { value: 1 }, uAsh: this.u.uAsh, uSun: this.u.uSun };
    this.clouds = new THREE.Mesh(
      new THREE.SphereGeometry(2.04, 96, 64),
      new THREE.ShaderMaterial({ uniforms: this.cu, vertexShader: planetVert, fragmentShader: cloudFrag, transparent: true, depthWrite: false })
    );
    this.spinner.add(this.clouds);

    this.au = { uColor: { value: new THREE.Color('#5fd8ff') }, uSun: this.u.uSun, uOpacity: { value: 1 }, uEdge: { value: Math.sqrt(1 - (2 / 2.5) ** 2) } };
    this.atmo = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 96, 64),
      new THREE.ShaderMaterial({ uniforms: this.au, vertexShader: atmoVert, fragmentShader: atmoFrag, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    this.group.add(this.atmo);

    this.rings = [];
    const mkRing = (r0, r1, dash, speed, rx, ry) => {
      const u = { uTime: this.u.uTime, uOpacity: { value: 0.55 }, uDash: { value: dash }, uSpeed: { value: speed }, uColor: { value: this.u.uGrid.value } };
      const m = new THREE.Mesh(
        new THREE.RingGeometry(r0, r1, 256, 1),
        new THREE.ShaderMaterial({ uniforms: u, vertexShader: uvVert, fragmentShader: ringFrag, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
      );
      m.rotation.set(rx, ry, 0);
      this.group.add(m);
      this.rings.push(m);
      return m;
    };
    mkRing(2.78, 2.8, 90, 0.02, Math.PI / 2 - 0.25, 0.3);
    mkRing(3.18, 3.19, 36, -0.012, Math.PI / 2 + 0.5, -0.4);

    this.spin = 0;
    this.lock = 0; // 0 = free rotation, 1 = impact site facing camera
    this.lockAngle = THREE.MathUtils.degToRad(-IMPACT_LATLON[1] - 12);
    this.opacity = 1;
    this.setDrift(0);
  }

  setDrift(d) {
    this.drift = d;
    PLATES.forEach((p, i) => {
      const a = ll(p[0], p[1]), b = ll(p[2], p[3]);
      this.u.uPlates.value[i].copy(a.lerp(b, d).normalize());
    });
  }

  setOpacity(o) {
    this.opacity = o;
    this.u.uOpacity.value = o;
    this.cu.uOpacity.value = o;
    this.au.uOpacity.value = o;
    this.rings.forEach((r) => (r.material.uniforms.uOpacity.value = 0.55 * o));
    this.group.visible = o > 0.002;
  }

  impactWorld(target) {
    return this.surface.localToWorld(target.copy(this.impactDir).multiplyScalar(2));
  }

  update(dt, t) {
    this.u.uTime.value = t;
    this.spin += dt * 0.045;
    const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    this.spinner.rotation.y = this.lockAngle + wrap(this.spin - this.lockAngle) * (1 - this.lock);
    this.clouds.rotation.y = t * 0.006;
  }
}
