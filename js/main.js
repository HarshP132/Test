import { SPECIES, ERAS, BIRD, MODELS } from './data.js';
import { buildSpecimen, SPECIMEN_IDS } from './dinosaurs.js';
import { World } from './world.js';
import { Sound } from './audio.js';
import { Hud } from './hud.js';
import { renderSpecies } from './content.js';
import { ModelLibrary } from './models.js';
import { SpeciesIndex } from './menu.js';

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const lowPower = coarse || (navigator.hardwareConcurrency || 8) <= 4;
const N = lowPower ? 9000 : 16000;
const root = document.documentElement;
const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const loader = {
  el: document.querySelector('.loader'),
  num: document.querySelector('[data-load-num]'),
  bar: document.querySelector('.loader__bar i'),
  msg: document.querySelector('[data-load-msg]'),
  v: { p: 0 },
  set(p, msg) {
    gsap.to(this.v, {
      p, duration: 0.4, overwrite: true,
      onUpdate: () => {
        this.num.textContent = String(Math.round(this.v.p * 100)).padStart(3, '0');
        this.bar.style.transform = `scaleX(${this.v.p})`;
      },
    });
    if (msg) this.msg.textContent = msg;
  },
};

async function boot() {
  renderSpecies();
  const hud = new Hud();
  const sound = new Sound();

  loader.set(0.06, 'Sequencing fossil records');
  const shapes = {};
  for (let i = 0; i < SPECIMEN_IDS.length; i++) {
    const id = SPECIMEN_IDS[i];
    shapes[id] = buildSpecimen(id, N);
    loader.set(0.08 + (i / SPECIMEN_IDS.length) * 0.72, `Reconstructing ${SPECIES_BY_ID[id]?.name || 'living descendants'}`);
    if (i % 3 === 2) await frame();
  }

  let world = null;
  try {
    world = new World(document.getElementById('scene'), shapes, { N, lowPower, maxPR: lowPower ? 1.25 : 1.75 });
  } catch (err) {
    console.warn('WebGL unavailable, continuing without the 3D layer.', err);
    root.classList.add('no-webgl');
  }
  const procShapes = { ...shapes };
  const models = world ? new ModelLibrary(MODELS, N) : null;
  const added = new Set();
  const ensureModel = (id) => {
    if (!models || !models.has(id)) return Promise.resolve(null);
    return models.load(id, procShapes[id]).then((m) => {
      if (!added.has(id)) { added.add(id); world.specimen.addModel(m); }
      return m;
    }).catch(() => null);
  };
  const specimenOrder = [...document.querySelectorAll('main [data-specimen]')].map((s) => s.dataset.specimen)
    .filter((id, i, a) => a.indexOf(id) === i);

  if (/[?&]debug\b/.test(location.search)) window.DT = { world, models, gsap };

  loader.set(0.9, 'Calibrating temporal drive');
  await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 2500))]);
  if (world) { world.render(0.016, 0); await frame(); }
  loader.set(1, 'Signal locked');

  /* ---------------- Smooth scroll ---------------- */
  const lenis = new Lenis({ lerp: reduced ? 1 : 0.085, smoothWheel: !reduced, wheelMultiplier: 0.95 });
  lenis.stop();
  lenis.on('scroll', (e) => {
    ScrollTrigger.update();
    hud.setProgress(e.progress || 0);
    if (world) world.scrollVel = e.velocity || 0;
  });
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  const index = new SpeciesIndex({
    shapes: procShapes,
    onGo: (target) => {
      const t = document.querySelector(target);
      if (t) lenis.scrollTo(t, { immediate: true, force: true });
    },
    onOpen: () => lenis.stop(),
    onClose: () => lenis.start(),
  });

  document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    const t = document.querySelector(b.dataset.go);
    if (t) lenis.scrollTo(t, { duration: reduced ? 0 : 2.4, offset: 0 });
  }));

  /* ---------------- Render loop ---------------- */
  let slow = 0, sampleT = 0, frames = 0;
  if (world) {
    gsap.ticker.add((time, deltaMs) => {
      const dt = Math.min(0.05, deltaMs / 1000);
      world.render(dt, time);
      hud.updateAnnos(world);
      const cur = world.mode === 'specimen' ? world.specimen.current : null;
      hud.setMesh(cur && models?.has(cur) ? models.progress[cur] ?? 0 : null);
      // Adaptive quality: drop resolution if the machine is struggling.
      sampleT += dt; frames++;
      if (sampleT > 3) {
        if (frames / sampleT < 34 && world.pr > 1) { slow++; if (slow >= 1) { world.pr = 1; world.renderer.setPixelRatio(1); world.resize(); } }
        sampleT = 0; frames = 0;
      }
    });
    window.addEventListener('resize', () => { world.resize(); ScrollTrigger.refresh(); });
  }

  /* ---------------- Pointer: parallax, cursor, drag-to-rotate ---------------- */
  const cursor = document.querySelector('.cursor');
  const cx = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3' });
  const cy = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3' });
  let drag = null;
  window.addEventListener('pointermove', (e) => {
    const nx = e.clientX / innerWidth, ny = e.clientY / innerHeight;
    if (world) world.mouse.set(nx * 2 - 1, -(ny * 2 - 1));
    hud.setPointer(nx * 2 - 1, -(ny * 2 - 1));
    cx(e.clientX); cy(e.clientY);
    const overUI = e.target.closest('a, button, .card, .tl, .index');
    cursor.classList.toggle('is-link', !!e.target.closest('a, button'));
    cursor.classList.toggle('is-drag', !!world && world.mode === 'specimen' && !overUI && (world.tall || nx > 0.45));
    if (drag && world) { world.specimen.nudge(e.clientX - drag.x); drag.x = e.clientX; }
  });
  window.addEventListener('pointerdown', (e) => {
    if (!world || world.mode !== 'specimen' || e.target.closest('a, button, .card, .tl, .index')) return;
    drag = { x: e.clientX };
    root.classList.add('is-dragging');
  });
  window.addEventListener('pointerup', () => { drag = null; root.classList.remove('is-dragging'); });
  document.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));
  document.addEventListener('mouseenter', () => cursor.classList.remove('is-hidden'));

  /* ---------------- Sound ---------------- */
  const sndBtn = document.querySelector('[data-sound]');
  sndBtn.addEventListener('click', () => {
    const on = sound.toggle();
    sndBtn.setAttribute('aria-pressed', String(on));
    sndBtn.querySelector('[data-sound-label]').textContent = on ? 'SOUND ON' : 'SOUND OFF';
  });

  /* ---------------- Section choreography ---------------- */
  let active = null;
  let eraKey = null;
  const applyEra = (key) => {
    if (key === eraKey) return;
    eraKey = key;
    const E = ERAS[key];
    gsap.to(root, { '--accent': E.accent, '--accent2': E.accent2, duration: 1.4 });
    root.dataset.era = key;
    if (world) world.setEra(key, E.accent, E.accent2);
    hud.setEra(E.name);
  };

  const activate = (sec) => {
    if (active === sec) return;
    active = sec;
    const d = sec.dataset;
    applyEra(d.era);
    if (world) {
      world.setMode(d.mode);
      if (d.drift) world.setDrift(parseFloat(d.drift));
      const after = d.after === '1';
      gsap.to(world.after, { recover: after ? 1 : 0, reform: after ? 1 : 0, duration: after ? 3.2 : 1.2, ease: 'power2.inOut', overwrite: true });
      if (d.specimen) {
        if (world.specimen.show(d.specimen)) sound.whoosh();
        ensureModel(d.specimen);
        const k = specimenOrder.indexOf(d.specimen);
        specimenOrder.slice(k + 1, k + (lowPower ? 2 : 3)).forEach((id) => ensureModel(id));
        const info = d.specimen === 'bird' ? BIRD : SPECIES_BY_ID[d.specimen];
        hud.setAnnos(info?.annotations);
      } else {
        hud.hideAnnos();
      }
    }
    hud.setMya(parseFloat(d.mya));
    hud.setSection(d.label || '');
    sound.blip(d.mode === 'specimen' ? 990 : 740);
  };

  const sections = [...document.querySelectorAll('main [data-mode]')];
  for (const sec of sections) {
    if (sec.id === 'impact') buildImpact(sec, world, sound, () => activate(sec));
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: (self) => self.isActive && activate(sec),
    });
  }

  /* ---------------- Content motion ---------------- */
  animateContent();

  /* ---------------- Intro ---------------- */
  ScrollTrigger.refresh();
  await new Promise((r) => setTimeout(r, reduced ? 0 : 450));
  const intro = gsap.timeline({
    onComplete: () => {
      lenis.start();
      // Warm up the first model; the rest stream in just ahead of the reader.
      ensureModel(specimenOrder[0]);
    },
  });
  intro
    .to('.loader__inner', { autoAlpha: 0, y: -20, duration: 0.5, ease: 'power2.in' })
    .to(loader.el, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '>-0.1')
    .set(loader.el, { display: 'none' });
  if (world) {
    world.pose.py = -8;
    world.setMode('hero');
  }
  const heroSplit = SplitText.create('.hero__title', { type: 'chars', mask: 'chars', charsClass: 'char' });
  intro
    .from(heroSplit.chars, { yPercent: 110, duration: 1.3, stagger: 0.05, ease: 'expo.out' }, '-=0.6')
    .from('.hero__eyebrow, .hero__lede, .hero__cue', { autoAlpha: 0, y: 24, duration: 1, stagger: 0.12, ease: 'power3.out' }, '<0.3')
    .from('.hud__top, .hud__readout, .hud__meta, .tl', { autoAlpha: 0, duration: 1.2, stagger: 0.1 }, '<')
    .from('.hud__corner', { scale: 0.4, autoAlpha: 0, duration: 1, stagger: 0.05, ease: 'power3.out' }, '<');
  activate(document.querySelector('#hero'));
}

/* ------------------------------------------------------------------ */

function animateContent() {
  const once = { start: 'top 80%', once: true };

  gsap.to('.hero__inner', {
    yPercent: -30, autoAlpha: 0, ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
  });

  document.querySelectorAll('[data-reveal]').forEach((el) => {
    gsap.from(el, { autoAlpha: 0, y: 40, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, ...once } });
  });

  document.querySelectorAll('[data-split]').forEach((el) => {
    const s = SplitText.create(el, { type: 'lines', mask: 'lines' });
    gsap.from(s.lines, { yPercent: 105, duration: 1.1, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: el, ...once } });
  });

  // Era titles: outlined type fills in as the section scrolls past.
  document.querySelectorAll('.era').forEach((sec) => {
    const fill = sec.querySelector('.era__fill');
    gsap.fromTo(fill, { clipPath: 'inset(0 100% 0 0)' }, {
      clipPath: 'inset(0 0% 0 0)', ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top 70%', end: 'center 35%', scrub: true },
    });
    gsap.from(sec.querySelectorAll('.stat'), { autoAlpha: 0, y: 30, stagger: 0.1, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: sec.querySelector('.stats'), ...once } });
  });

  document.querySelectorAll('.card').forEach((card) => {
    const name = card.querySelector('.card__name');
    const tl = gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 78%', once: true } });
    tl.from(card, { clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)', duration: 1.1, ease: 'expo.inOut' })
      .from(card.querySelector('.card__head'), { autoAlpha: 0, y: -10, duration: 0.5 }, '-=0.5')
      .to(name, { duration: 1.2, scrambleText: { text: name.dataset.name, chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', revealDelay: 0.25, speed: 0.7 } }, '<')
      .from(card.querySelectorAll('.card__bin, .card__grid > div'), { autoAlpha: 0, x: -14, stagger: 0.06, duration: 0.6, ease: 'power3.out' }, '<0.2')
      .from(card.querySelector('[data-bar]'), { scaleX: 0, transformOrigin: 'left center', duration: 1.2, ease: 'expo.out' }, '<0.2')
      .from(card.querySelectorAll('.card__sub, .card__feat li, .card__fact'), { autoAlpha: 0, y: 14, stagger: 0.07, duration: 0.6, ease: 'power3.out' }, '<0.1');
  });

  // Draw the family tree as the section scrolls.
  const tree = document.querySelector('.tree');
  if (tree) {
    const paths = tree.querySelectorAll('.tree__edge');
    paths.forEach((p) => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = `${len} ${len}`;
      p.style.strokeDashoffset = len;
    });
    const tl = gsap.timeline({ scrollTrigger: { trigger: '.tree-wrap', start: 'top 75%', end: 'bottom 45%', scrub: 0.6 } });
    tl.to(paths, { strokeDashoffset: 0, stagger: 0.04, duration: 0.5, ease: 'none' })
      .from(tree.querySelectorAll('.tree__node, .tree__leaf, .tree__clade'), { autoAlpha: 0, stagger: 0.02, duration: 0.2 }, 0.1);
  }

  gsap.from('.after-stats .tile', { autoAlpha: 0, y: 30, stagger: 0.1, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.after-stats', ...once } });
}

/* ------------------------------------------------------------------ */

function buildImpact(sec, world, sound, onActive) {
  const steps = sec.querySelectorAll('.impact__step');
  const rangeEl = sec.querySelector('[data-range]');
  const etaEl = sec.querySelector('[data-eta]');
  const fx = world ? world.fx : { approach: 0, impact: 0, burn: 0, ash: 0, disperse: 0, debris: 0, shake: 0, flash: 0, alarm: 0 };
  const IMPACT_T = 5;
  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  const inS = (el, at, from = { y: 40 }) => tl.fromTo(el, { autoAlpha: 0, ...from }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.4, ease: 'power2.out' }, at);
  const outS = (el, at) => tl.to(el, { autoAlpha: 0, y: -40, duration: 0.35, ease: 'power2.in' }, at);

  tl.to(fx, { disperse: 1, duration: 1.3, ease: 'power1.in' }, 0)
    .to(fx, { alarm: 1, duration: 0.3 }, 0.15);
  inS(steps[0], 0.1);
  outS(steps[0], 1.3);
  inS(steps[1], 1.5);
  tl.to(fx, { approach: 1, duration: IMPACT_T - 1.4, ease: 'power2.in' }, 1.4)
    .to(fx, { shake: 0.3, duration: 3.4, ease: 'power3.in' }, 1.6);
  tl.to(steps[1], { autoAlpha: 0, duration: 0.15 }, IMPACT_T - 0.12);
  tl.to(fx, { flash: 1, duration: 0.06 }, IMPACT_T)
    .to(fx, { flash: 0, duration: 0.8, ease: 'power2.out' }, IMPACT_T + 0.06)
    .to(fx, { impact: 1, duration: 1.8, ease: 'power2.out' }, IMPACT_T)
    .to(fx, { shake: 1, duration: 0.05 }, IMPACT_T)
    .to(fx, { shake: 0.08, duration: 2.2, ease: 'power2.out' }, IMPACT_T + 0.05)
    .to(fx, { alarm: 0.35, duration: 1 }, IMPACT_T + 0.5)
    .to(fx, { debris: 1, duration: 3.2, ease: 'power1.out' }, IMPACT_T + 0.02)
    .to(fx, { burn: 1, duration: 3.0, ease: 'power1.inOut' }, IMPACT_T + 0.15);
  inS(steps[2], IMPACT_T + 0.02, { scale: 1.35, y: 0 });
  outS(steps[2], IMPACT_T + 1.4);
  inS(steps[3], IMPACT_T + 1.7);
  outS(steps[3], IMPACT_T + 3.1);
  tl.to(fx, { ash: 1, duration: 2.0 }, IMPACT_T + 2.4)
    .to(fx, { shake: 0, alarm: 0, duration: 0.8 }, IMPACT_T + 3.0);
  inS(steps[4], IMPACT_T + 3.4);
  tl.to({}, { duration: 1 }, IMPACT_T + 3.8);

  let last = 0;
  ScrollTrigger.create({
    trigger: sec,
    start: 'top top',
    end: () => '+=' + window.innerHeight * 6,
    pin: true,
    scrub: 0.7,
    animation: tl,
    onUpdate: (self) => {
      const now = tl.time();
      if (last < IMPACT_T && now >= IMPACT_T) sound.boom();
      last = now;
      const a = fx.approach;
      const km = Math.round((1 - a) * 40000);
      rangeEl.textContent = km.toLocaleString('en-US');
      const s = Math.max(0, km / 20);
      const mm = Math.floor(s / 60), ss = s % 60;
      etaEl.textContent = `${String(mm).padStart(2, '0')}:${ss.toFixed(1).padStart(4, '0')}`;
      sound.alarm(self.isActive && now > 0.3 && now < IMPACT_T);
      sound.tension(a);
      root.classList.toggle('is-alarm', fx.alarm > 0.5);
    },
    onToggle: (self) => self.isActive && onActive(),
    onLeave: () => sound.alarm(false),
    onLeaveBack: () => { sound.alarm(false); root.classList.remove('is-alarm'); },
  });
}

boot();
