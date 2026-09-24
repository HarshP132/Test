import { SPECIES, LENGTH_MAX } from './data.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Linear 0–36 m ruler with a 1.8 m human for scale.
function ruler(s) {
  const X0 = 12, PX = 10;
  const ticks = [];
  for (let m = 0; m <= 35; m += 5) {
    const x = X0 + m * PX;
    ticks.push(`<line x1="${x}" y1="34" x2="${x}" y2="${m % 10 ? 38 : 40}" class="r-tick"/><text x="${x}" y="50" class="r-num">${m}</text>`);
  }
  const w = Math.max(2, s.length * PX);
  const labelX = Math.min(X0 + w + 6, 300);
  return `
  <figure class="ruler">
    <figcaption class="ruler__cap"><span>Length vs. human</span><span>metres</span></figcaption>
    <svg viewBox="0 0 380 54" class="ruler__svg" role="img" aria-label="${esc(s.name)} length ${esc(s.lengthLabel)} compared with a 1.8 metre human">
      <rect x="${X0}" y="6" width="${1.8 * PX}" height="5" class="r-human"/>
      <text x="${X0 + 1.8 * PX + 6}" y="11" class="r-lbl r-lbl--dim">HUMAN 1.8 m</text>
      <rect x="${X0}" y="18" width="${w}" height="8" class="r-bar" data-bar/>
      <text x="${labelX}" y="26" class="r-lbl">${esc(s.lengthLabel.toUpperCase())}</text>
      <line x1="${X0}" y1="34" x2="${X0 + 36 * PX}" y2="34" class="r-axis"/>
      ${ticks.join('')}
    </svg>
  </figure>`;
}

function card(s, n, total) {
  const pre = s.code === 'PRE';
  const idx = pre ? 'PRECURSOR · NOT A DINOSAUR' : `SPECIMEN ${s.code} / ${String(total).padStart(2, '0')}`;
  return `
  <section class="panel specimen" id="sp-${s.id}" data-mode="specimen" data-specimen="${s.id}" data-era="${s.era}" data-mya="${s.mya}" data-label="${esc(pre ? 'PRECURSOR' : 'SPECIMEN ' + s.code)} // ${esc(s.name.toUpperCase())}">
    <article class="card" aria-labelledby="h-${s.id}">
      <header class="card__head">
        <span class="chip">${idx}</span>
        <span class="card__clade">${esc(s.clade)}</span>
      </header>
      <h3 class="card__name" id="h-${s.id}" data-name="${esc(s.name)}" style="--len:${s.name.length}">${esc(s.name)}</h3>
      <p class="card__bin"><em>${esc(s.binomial)}</em><span>${esc(s.meaning)}</span></p>
      <dl class="card__grid">
        <div><dt>Age</dt><dd>${esc(s.age)}</dd></div>
        <div><dt>Length</dt><dd>${esc(s.lengthLabel)}</dd></div>
        <div><dt>Mass</dt><dd>${esc(s.mass)}</dd></div>
        <div><dt>Diet</dt><dd>${esc(s.diet)}</dd></div>
        <div class="wide"><dt>Fossil site</dt><dd>${esc(s.locale)}</dd></div>
      </dl>
      ${ruler(s)}
      <h4 class="card__sub">Key adaptations</h4>
      <ul class="card__feat">${s.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
      <aside class="card__fact"><span class="card__fact-k">Field note</span><p>${esc(s.fact)}</p></aside>
    </article>
  </section>`;
}

export function renderSpecies() {
  const total = SPECIES.filter((s) => s.code !== 'PRE').length;
  document.querySelectorAll('[data-slot]').forEach((slot) => {
    const list = slot.dataset.slot === 'precursor'
      ? SPECIES.filter((s) => s.code === 'PRE')
      : SPECIES.filter((s) => s.era === slot.dataset.slot && s.code !== 'PRE');
    slot.outerHTML = list.map((s, i) => card(s, i, total)).join('');
  });
}
