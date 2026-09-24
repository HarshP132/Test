#!/usr/bin/env node
// Downloads the photoreal dinosaur models and index thumbnails into assets/
// and switches the site to load them locally (LOCAL_ASSETS in js/data.js).
//
//   node scripts/fetch-models.mjs              download originals (~5.5 MB each)
//   node scripts/fetch-models.mjs --optimize   also compress to ~1–2 MB each (needs npx)
//   node scripts/fetch-models.mjs --force      re-download files that already exist
//
// Requires Node 18+.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const FORCE = args.has('--force');
const OPTIMIZE = args.has('--optimize');

const { MODELS, THUMBS } = await import(pathToFileURL(path.join(ROOT, 'js/data.js')).href);
const remote = (list) => list.find((u) => /^https?:/.test(u));
const size = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

const modelDir = path.join(ROOT, 'assets/models');
const thumbDir = path.join(ROOT, 'assets/thumbs');
fs.mkdirSync(modelDir, { recursive: true });
fs.mkdirSync(thumbDir, { recursive: true });

async function download(url, dest) {
  if (!FORCE && fs.existsSync(dest) && fs.statSync(dest).size > 0) return 'cached';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return size(buf.length);
}

function optimize(file) {
  const tmp = file.replace(/\.glb$/, '.opt.glb');
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  execFileSync(npx, ['--yes', '@gltf-transform/cli@4', 'optimize', file, tmp,
    '--compress', 'meshopt', '--texture-compress', 'webp', '--texture-size', '1024'], { stdio: 'ignore' });
  fs.renameSync(tmp, file);
  return size(fs.statSync(file).size);
}

const ok = [];
const thumbs = [];
const failed = [];
for (const id of Object.keys(MODELS)) {
  const glb = path.join(modelDir, `${id}.glb`);
  const webp = path.join(thumbDir, `${id}.webp`);
  let note;
  try {
    const m = await download(remote(MODELS[id].sources), glb);
    note = `model ${m}`;
    if (OPTIMIZE && m !== 'cached') note += ` → ${optimize(glb)}`;
    ok.push(id);
  } catch (err) {
    console.log(`✗ ${id.padEnd(16)} model failed: ${err.message}`);
    failed.push(id);
    continue;
  }
  // Thumbnails are optional: the site falls back to the CDN image or a silhouette.
  const webpUrl = (THUMBS[id] || []).find((u) => /^https?:.*\.webp$/.test(u));
  try {
    if (webpUrl) { note += `, thumb ${await download(webpUrl, webp)}`; thumbs.push(id); }
  } catch {
    note += ', thumb unavailable (site will use the CDN image)';
  }
  console.log(`✓ ${id.padEnd(16)} ${note}`);
}

// Point the site at the local copies that now exist.
const dataFile = path.join(ROOT, 'js/data.js');
const quote = (ids) => ids.map((id) => `'${id}'`).join(', ');
const src = fs.readFileSync(dataFile, 'utf8')
  .replace(/export const LOCAL_ASSETS = \[[^\]]*\];/, `export const LOCAL_ASSETS = [${quote(ok)}];`)
  .replace(/export const LOCAL_THUMBS = \[[^\]]*\];/, `export const LOCAL_THUMBS = [${quote(thumbs)}];`);
fs.writeFileSync(dataFile, src);

console.log(`\n${ok.length} downloaded, ${failed.length} failed.`);
if (ok.length) console.log('js/data.js now loads these from assets/. Serve the folder (npx serve .) and reload.');
if (failed.length) process.exitCode = 1;
