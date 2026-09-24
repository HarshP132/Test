import * as THREE from 'three';

const TOP = 252, KPG = 66;

// Vertical deep-time track: Mesozoic occupies 90% of the height, the Cenozoic the last 10%.
export function timelinePos(mya) {
  if (mya >= KPG) return ((TOP - Math.min(TOP, mya)) / (TOP - KPG)) * 0.9;
  return 0.9 + ((KPG - Math.max(0, mya)) / KPG) * 0.1;
}

export class Hud {
  constructor() {
    this.root = document.querySelector('.hud');
    this.myaEl = document.querySelector('[data-hud-mya]');
    this.eraEl = document.querySelector('[data-hud-era]');
    this.secEl = document.querySelector('[data-hud-section]');
    this.pctEl = document.querySelector('[data-hud-pct]');
    this.meshEl = document.querySelector('[data-hud-mesh]');
    this.meshVal = this.meshEl.querySelector('b');
    this.xyEl = document.querySelector('[data-hud-xy]');
    this.marker = document.querySelector('.tl__marker');
    this.markerVal = document.querySelector('.tl__val');
    this.state = { mya: 252 };
    this.annoLayer = document.querySelector('.annos');
    this.annos = [0, 1, 2].map((i) => {
      const el = document.createElement('div');
      el.className = `anno anno--${['ul', 'ur', 'dr'][i]}`;
      el.innerHTML = '<i class="anno__dot"></i><i class="anno__line"></i><span class="anno__txt"></span>';
      this.annoLayer.appendChild(el);
      return { el, txt: el.querySelector('.anno__txt'), key: null };
    });
    this.annoOn = false;
    this.v = new THREE.Vector3();
    this.renderMya();
  }

  renderMya() {
    const m = this.state.mya;
    this.myaEl.textContent = m >= 1 ? m.toFixed(1) : '0.0';
    const p = timelinePos(m);
    this.marker.style.top = `${(p * 100).toFixed(3)}%`;
    this.markerVal.textContent = m >= 1 ? `${m.toFixed(1)}` : 'NOW';
  }

  setMya(v) {
    gsap.to(this.state, { mya: v, duration: 1.6, ease: 'power3.inOut', overwrite: true, onUpdate: () => this.renderMya() });
  }

  setEra(name) {
    if (this.eraEl.dataset.v === name) return;
    this.eraEl.dataset.v = name;
    gsap.to(this.eraEl, { duration: 0.9, scrambleText: { text: name.toUpperCase(), chars: '01<>/#_', speed: 0.6 } });
  }

  setSection(text) {
    if (!text || this.secEl.dataset.v === text) return;
    this.secEl.dataset.v = text;
    gsap.to(this.secEl, { duration: 0.8, scrambleText: { text, chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', speed: 0.8 } });
  }

  setProgress(p) {
    this.pctEl.textContent = String(Math.round(p * 100)).padStart(3, '0');
  }

  // Streaming state of the photoreal model for the current specimen (null hides it).
  setMesh(p) {
    if (p == null || p < 0) { this.meshEl.hidden = true; return; }
    this.meshEl.hidden = false;
    const done = p >= 1;
    this.meshEl.classList.toggle('is-done', done);
    const txt = done ? 'LOCKED' : `${String(Math.round(p * 100)).padStart(3, '0')}%`;
    if (this.meshVal.textContent !== txt) this.meshVal.textContent = txt;
  }

  setPointer(x, y) {
    this.xyEl.textContent = `X ${x.toFixed(3)}  Y ${y.toFixed(3)}`;
  }

  setAnnos(list) {
    this.hideAnnos(true);
    this.annos.forEach((a, i) => {
      const item = list?.[i];
      a.key = item ? item.anchor : null;
      a.txt.textContent = '';
      a.txt.dataset.t = item ? item.text : '';
    });
    clearTimeout(this._annoT);
    this._annoT = setTimeout(() => {
      this.annoOn = true;
      const on = this.annos.filter((a) => a.key);
      gsap.fromTo(on.map((a) => a.el), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, stagger: 0.15, overwrite: true });
      gsap.fromTo(on.map((a) => a.el.querySelector('.anno__line')), { scaleX: 0 }, { scaleX: 1, duration: 0.5, stagger: 0.15, ease: 'power3.out' });
      on.forEach((a, i) => gsap.to(a.txt, { delay: 0.15 * i + 0.2, duration: 0.7, scrambleText: { text: a.txt.dataset.t, chars: '01#<>/', speed: 0.7 } }));
    }, 2200);
  }

  hideAnnos(instant = false) {
    clearTimeout(this._annoT);
    this.annoOn = false;
    gsap.to(this.annos.map((a) => a.el), { autoAlpha: 0, duration: instant ? 0.2 : 0.4, overwrite: true });
  }

  updateAnnos(world) {
    if (!this.annoOn) return;
    const cam = world.camera;
    const w = window.innerWidth, h = window.innerHeight;
    for (const a of this.annos) {
      if (!a.key) continue;
      const p = world.specimen.anchorWorld(a.key, this.v);
      if (!p) { a.el.style.visibility = 'hidden'; continue; }
      p.project(cam);
      const x = (p.x * 0.5 + 0.5) * w, y = (-p.y * 0.5 + 0.5) * h;
      a.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      const flip = x > w - 260;
      if (flip !== a.flip) { a.flip = flip; a.el.classList.toggle('is-flip', flip); }
    }
  }
}
