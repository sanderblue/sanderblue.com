// Builds public/mountain-house/index.html from cabin/src, and copies cabin/src/assets to
// public/mountain-house/assets (files the page loads at run time).
// Usage: npm run cabin:build        write the page and assets
//        npm run cabin:build -- --check   exit 1 if the committed page or assets are out of date
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { assemble, ASSETS_OUT, ASSETS_SRC, PAGE_OUT, REPO } from './lib.mjs';

const check = process.argv.includes('--check');
const html = assemble();
const out = relative(REPO, PAGE_OUT);
let current = null;
try {
  current = readFileSync(PAGE_OUT, 'utf8');
} catch {}
let stale = false;

if (check) {
  if (current === html) console.log(`${out} is up to date with cabin/src.`);
  else { console.error(`${out} is out of date with cabin/src. Run: npm run cabin:build`); stale = true; }
} else if (current === html) {
  console.log(`${out} is already up to date.`);
} else {
  writeFileSync(PAGE_OUT, html);
  console.log(`Wrote ${out} (${Buffer.byteLength(html).toLocaleString('en-US')} bytes).`);
}

// assets: every file under cabin/src/assets, byte for byte, and nothing else. Hidden files (.DS_Store and
// the like) are left out on both sides; symlinked folders are followed.
function files(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => !n.startsWith('.')).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)).map((f) => join(n, f)) : [n]));
}
// folders under dir left with nothing but hidden files after extras are removed
function pruneEmpty(dir) {
  if (!existsSync(dir)) return;
  for (const n of readdirSync(dir)) if (!n.startsWith('.') && statSync(join(dir, n)).isDirectory()) pruneEmpty(join(dir, n));
  if (dir !== ASSETS_OUT && readdirSync(dir).every((n) => n.startsWith('.'))) rmSync(dir, { recursive: true });
}
const want = files(ASSETS_SRC), have = files(ASSETS_OUT), outDir = relative(REPO, ASSETS_OUT);
const changed = want.filter((f) => !have.includes(f) || !readFileSync(join(ASSETS_SRC, f)).equals(readFileSync(join(ASSETS_OUT, f))));
const extra = have.filter((f) => !want.includes(f));
if (check) {
  if (changed.length || extra.length) {
    console.error(`${outDir} is out of date with cabin/src/assets (${changed.length} changed or missing, ${extra.length} extra). Run: npm run cabin:build`);
    stale = true;
  } else console.log(`${outDir} is up to date with cabin/src/assets (${want.length} files).`);
} else if (changed.length || extra.length) {
  changed.forEach((f) => { mkdirSync(dirname(join(ASSETS_OUT, f)), { recursive: true }); writeFileSync(join(ASSETS_OUT, f), readFileSync(join(ASSETS_SRC, f))); });
  extra.forEach((f) => rmSync(join(ASSETS_OUT, f)));
  pruneEmpty(ASSETS_OUT);
  console.log(`Synced ${outDir}: ${changed.length} written, ${extra.length} removed.`);
} else console.log(`${outDir} is already up to date (${want.length} files).`);

if (stale) process.exit(1);
