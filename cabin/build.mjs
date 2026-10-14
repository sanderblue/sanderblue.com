// Builds public/mountain-house/index.html from cabin/src.
// Usage: npm run cabin:build        write the page
//        npm run cabin:build -- --check   exit 1 if the committed page is out of date
import { readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import { assemble, PAGE_OUT, REPO } from './lib.mjs';

const html = assemble();
const out = relative(REPO, PAGE_OUT);
let current = null;
try {
  current = readFileSync(PAGE_OUT, 'utf8');
} catch {}

if (process.argv.includes('--check')) {
  if (current === html) {
    console.log(`${out} is up to date with cabin/src.`);
  } else {
    console.error(`${out} is out of date with cabin/src. Run: npm run cabin:build`);
    process.exit(1);
  }
} else if (current === html) {
  console.log(`${out} is already up to date.`);
} else {
  writeFileSync(PAGE_OUT, html);
  console.log(`Wrote ${out} (${Buffer.byteLength(html).toLocaleString('en-US')} bytes).`);
}
