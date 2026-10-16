// Prints the drawing set (every sheet, default choices) to a 36 x 24 in PDF with headless Chrome.
// Usage: npm run cabin:pdf                         write public/mountain-house/rime-cabin-drawings.pdf
//        npm run cabin:pdf -- --out /tmp/test.pdf  write somewhere else
// Uses the installed Google Chrome (override with CHROME_PATH) over the DevTools protocol,
// so it can wait for the fonts and the 3D cover image before printing. No npm dependencies.
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assemble, devtools, includes, PDF_OUT, read, REPO, waitFor } from './lib.mjs';

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const outArg = process.argv.indexOf('--out');
if (outArg > 0 && !process.argv[outArg + 1]) {
  console.error('--out needs a file path.');
  process.exit(2);
}
const OUT = outArg > 0 ? resolve(process.argv[outArg + 1]) : PDF_OUT;
const MODEL = JSON.parse(read('model.json'));

// The page's scripts minus the page UI and the page floor plan; the drawing set needs the
// engine, plus the 3D scene and viewer for the cover image.
const scripts = includes().filter((p) => p.endsWith('.js') && !p.startsWith('page/') && p !== 'plan.js');

// Runs in the browser. Sets window.__cabin.ready once every sheet is drawn and the fonts are in.
const PRINT = `
(function () {
  var st = window.__cabin = { ready: false, error: null, sheets: 0, cover: false, fonts: [] };
  try {
    var R = ENG.generate(MODEL, {});
    try {
      var v = startViewer(document.getElementById('stage'), document.getElementById('cv'), document.getElementById('labels'), R,
        { onPart: function () {}, onRoom: function () {}, onState: function () {} });
      DWG.coverImage = v.shotAt('cover', 1500, 980);
      st.cover = DWG.coverImage.length > 10000;
    } catch (e) { DWG.coverImage = null; st.coverError = String(e && e.message || e); }
    var box = document.getElementById('sheets');
    DWG.sheets().forEach(function (s) {
      var d = document.createElement('div'); d.className = 'sheet'; d.innerHTML = DWG.render(R, s.num); box.appendChild(d);
      st.sheets++;
    });
    document.getElementById('stage').remove();
    document.body.offsetHeight;
    document.fonts.ready.then(function () {
      document.fonts.forEach(function (f) { if (f.status === 'loaded') st.fonts.push(f.family + ' ' + f.weight); });
      st.ready = true;
    });
  } catch (e) { st.error = String(e && e.stack || e); }
})();`;

const harness = assemble(`<!doctype html><html><head><meta charset="utf-8"><title>${MODEL.meta.name} drawing set</title>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=block" rel="stylesheet">
<style>
@page { size: 36in 24in; margin: 0; }
html, body { margin: 0; background: #fff; }
.sheet { width: 36in; height: 24in; overflow: hidden; break-after: page; }
.sheet:last-child { break-after: auto; }
.sheet svg { display: block; width: 36in; height: 24in; }
#stage { position: fixed; left: -4000px; top: 0; width: 1500px; height: 980px; }
</style></head><body>
<div id="stage"><canvas id="cv"></canvas><div id="labels"></div></div>
<div id="sheets"></div>
<script>var MODEL = <!--@include model.json-->;</script>
${scripts.map((p) => `<script>\n<!--@include ${p}-->\n</script>`).join('\n')}
<script>${PRINT}</script>
</body></html>
`);

const dir = mkdtempSync(join(tmpdir(), 'cabin-pdf-'));
const page = join(dir, 'drawings.html');
writeFileSync(page, harness);
const chrome = spawn(CHROME, [
  '--headless', '--remote-debugging-port=0', `--user-data-dir=${join(dir, 'profile')}`,
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', pathToFileURL(page).href,
], { stdio: 'ignore' });
const cleanup = () => rmSync(dir, { recursive: true, force: true });
chrome.on('error', (e) => {
  console.error(`Could not start Chrome at ${CHROME}: ${e.message}. Set CHROME_PATH.`);
  cleanup();
  process.exit(1);
});
// a renderer that stops answering would otherwise leave a DevTools call waiting forever
setTimeout(() => {
  console.error('Gave up after 3 minutes.');
  chrome.kill();
  cleanup();
  process.exit(1);
}, 180000).unref();

let dt;
try {
  const port = await waitFor('Chrome to start', () => readFileSync(join(dir, 'profile', 'DevToolsActivePort'), 'utf8').split('\n')[0]);
  const target = await waitFor('the page', async () => {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    return list.find((t) => t.type === 'page' && t.url.startsWith('file:'));
  });
  dt = await devtools(target.webSocketDebuggerUrl);
  const st = await waitFor('the sheets and fonts', async () => {
    const r = await dt.send('Runtime.evaluate', { expression: 'window.__cabin', returnByValue: true });
    const v = r.result.value;
    return v && (v.ready || v.error) ? v : null;
  });
  if (st.error) throw new Error(`The drawing set failed to render:\n${st.error}`);
  // refuse to replace a good PDF with one that is missing its cover image or its fonts
  if (!st.cover) throw new Error(`The 3D cover image could not be drawn (${st.coverError || 'no WebGL'}). Nothing written.`);
  if (!st.fonts.length) throw new Error('The Google Fonts did not load (offline?). Nothing written.');
  // The PDF is too big for one DevTools message, so read it back as a stream in chunks.
  const { stream } = await dt.send('Page.printToPDF', {
    paperWidth: 36, paperHeight: 24, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0,
    printBackground: true, preferCSSPageSize: true, transferMode: 'ReturnAsStream',
  });
  const chunks = [];
  for (let eof = false; !eof;) {
    const r = await dt.send('IO.read', { handle: stream, size: 1 << 20 });
    chunks.push(Buffer.from(r.data, r.base64Encoded ? 'base64' : 'binary'));
    eof = r.eof;
  }
  await dt.send('IO.close', { handle: stream });
  const pdf = Buffer.concat(chunks);
  writeFileSync(OUT, pdf);
  const where = relative(REPO, OUT).startsWith('..') ? OUT : relative(REPO, OUT);
  console.log(`Wrote ${where} (${pdf.length.toLocaleString('en-US')} bytes): ${st.sheets} sheets with the 3D cover image.`);
  console.log(`Fonts: ${[...new Set(st.fonts)].join(', ')}`);
} finally {
  dt?.close();
  chrome.kill();
  await new Promise((r) => (chrome.exitCode !== null ? r() : chrome.once('exit', r)));
  cleanup();
}
