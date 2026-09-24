// Species index: a full-screen archive of every specimen card, with era filters and chapter links.
import { SPECIES, ERAS, LENGTH_MAX } from './data.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Side-view silhouette of the hologram point cloud, used until a thumbnail image loads.
function drawSilhouette(canvas, shape, color) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || 280, h = canvas.clientHeight || 170;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const g = canvas.getContext('2d');
  g.scale(dpr, dpr);
  const p = shape.positions;
  let minX = Infinity, maxX = -Infinity, maxY = 0;
  for (let i = 0; i < p.length; i += 3) { minX = Math.min(minX, p[i]); maxX = Math.max(maxX, p[i]); maxY = Math.max(maxY, p[i + 1]); }
  const s = Math.min((w * 0.84) / (maxX - minX), (h * 0.74) / maxY);
  const ox = w / 2 - ((minX + maxX) / 2) * s, oy = h * 0.88;
  g.fillStyle = color;
  g.globalAlpha = 0.5;
  for (let i = 0; i < p.length; i += 6) g.fillRect(ox + p[i] * s, oy - p[i + 1] * s, 1.1, 1.1);
}

export class SpeciesIndex {
  constructor({ shapes, onGo, onOpen, onClose }) {
    this.el = document.getElementById('index');
    this.grid = this.el.querySelector('.index__grid');
    this.onGo = onGo;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.opener = null;
    this.render(shapes);
    this.bind();
  }

  render(shapes) {
    this.grid.innerHTML = SPECIES.map((s) => {
      const E = ERAS[s.era];
      const pct = Math.max(1.5, (s.length / LENGTH_MAX) * 100).toFixed(1);
      return `
      <li class="scard-wrap" data-era="${s.era}">
        <button type="button" class="scard" data-target="#sp-${s.id}" style="--era:${E.accent}">
          <span class="scard__media">
            <canvas class="scard__sil" data-sil="${s.id}" aria-hidden="true"></canvas>
            <img class="scard__img" src="assets/thumbs/${s.id}.webp" alt="" loading="lazy" decoding="async">
            <span class="scard__code">${s.code === 'PRE' ? 'PRE' : s.code}</span>
          </span>
          <span class="scard__body">
            <span class="scard__era">${esc(E.name)} · ${esc(s.age.split(' · ')[0])}</span>
            <span class="scard__name">${esc(s.name)}</span>
            <span class="scard__bin">${esc(s.binomial)}</span>
            <span class="scard__len" aria-label="Length ${esc(s.lengthLabel)}"><i style="width:${pct}%"></i></span>
            <span class="scard__stats"><span>${esc(s.lengthLabel)}</span><span>${esc(s.mass)}</span><span>${esc(s.diet)}</span></span>
          </span>
        </button>
      </li>`;
    }).join('');

    this.grid.querySelectorAll('.scard__img').forEach((img) => {
      const done = () => img.closest('.scard__media').classList.add('has-img');
      if (img.complete && img.naturalWidth) done();
      else img.addEventListener('load', done, { once: true });
      img.addEventListener('error', () => img.remove(), { once: true });
    });
    this.shapes = shapes;
    this.silDrawn = false;
  }

  bind() {
    document.querySelectorAll('[data-index-open]').forEach((b) => b.addEventListener('click', () => this.open(b)));
    this.el.querySelectorAll('[data-index-close]').forEach((b) => b.addEventListener('click', () => this.close()));
    this.el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
      if (e.key === 'Tab') this.trap(e);
    });
    this.grid.addEventListener('click', (e) => {
      const b = e.target.closest('[data-target]');
      if (b) this.go(b.dataset.target);
    });
    this.el.querySelectorAll('[data-chapter]').forEach((b) => b.addEventListener('click', () => this.go(b.dataset.chapter)));
    this.el.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => this.filter(b.dataset.filter)));
  }

  filter(era) {
    this.el.querySelectorAll('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === era)));
    const items = [...this.grid.children];
    items.forEach((li) => { li.hidden = era !== 'all' && li.dataset.era !== era; });
    gsap.fromTo(items.filter((li) => !li.hidden), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.03, ease: 'power3.out', overwrite: true });
  }

  trap(e) {
    const f = [...this.el.querySelectorAll('button:not([hidden]), [href]')].filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  open(opener) {
    if (!this.el.hidden) return;
    this.opener = opener || null;
    this.el.hidden = false;
    document.documentElement.classList.add('index-open');
    if (!this.silDrawn) {
      this.grid.querySelectorAll('[data-sil]').forEach((c) => {
        const s = SPECIES.find((x) => x.id === c.dataset.sil);
        drawSilhouette(c, this.shapes[c.dataset.sil], ERAS[s.era].accent);
      });
      this.silDrawn = true;
    }
    this.onOpen?.();
    gsap.timeline()
      .fromTo(this.el, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.8, ease: 'expo.inOut' })
      .fromTo(this.el.querySelectorAll('.index__head > *, .index__chapters, .index__filters'), { autoAlpha: 0, y: -12 }, { autoAlpha: 1, y: 0, stagger: 0.05, duration: 0.5 }, '-=0.35')
      .fromTo([...this.grid.children].filter((li) => !li.hidden), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, stagger: 0.035, duration: 0.6, ease: 'power3.out' }, '-=0.4');
    this.el.querySelector('.index__close').focus({ preventScroll: true });
  }

  close(after) {
    if (this.el.hidden) { after?.(); return; }
    gsap.to(this.el, {
      clipPath: 'inset(100% 0 0 0)', duration: 0.6, ease: 'expo.inOut',
      onComplete: () => {
        this.el.hidden = true;
        document.documentElement.classList.remove('index-open');
        this.onClose?.();
        if (after) after(); else this.opener?.focus({ preventScroll: true });
      },
    });
  }

  go(target) {
    this.close(() => this.onGo(target));
  }
}
