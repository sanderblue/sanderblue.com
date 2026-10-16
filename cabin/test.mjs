// Runs the built cabin page in headless Chrome and checks the 3D viewer's Realistic view: that it leaves the
// plain view exactly as it was, swaps snow and grass with the season, loads its textures once, draws without
// shader or console errors, and that its frame-rate guard steps down in order on desktop and phones.
// Usage: npm run cabin:test   (run npm run cabin:build first; uses the installed Google Chrome, or CHROME_PATH)
// Exits 1 if any check fails. Checks compare renders made in the same browser, so they don't depend on the GPU.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { assemble, devtools, PAGE_OUT, REPO, sleep, waitFor } from './lib.mjs';

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// The checks run against public/mountain-house, so it has to match cabin/src.
if (readFileSync(PAGE_OUT, 'utf8') !== assemble()) {
  console.error('public/mountain-house/index.html is out of date with cabin/src. Run: npm run cabin:build');
  process.exit(1);
}

// A small static server for public/, so the page can fetch its textures (a file:// page cannot).
const PUBLIC = join(REPO, 'public');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.ico': 'image/x-icon' };
const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path.endsWith('/')) path += 'index.html';
  const file = normalize(join(PUBLIC, path));
  try {
    if (!file.startsWith(PUBLIC) || !statSync(file).isFile()) throw new Error();
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  } catch {
    res.writeHead(404); res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const URL_PAGE = `http://127.0.0.1:${server.address().port}/mountain-house/`;

// Page-side helpers, put in front of every check's code.
const HELPERS = `
var v = APP.viewer, st = v.state;
function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
async function frames(n) { for (var i = 0; i < n; i++) await new Promise(function (r) { requestAnimationFrame(r); }); }
function real() { return v.debug().real; }
// turn the Realistic view on with its frame-rate guard held off (headless Chrome animates at 30 fps)
function realOn() { v.set('real', true); real().debug().guard.on = false; }
async function textures() { for (var i = 0; i < 200; i++) { if (real() && real().debug().M.snow.normalMap) return true; await wait(100); } return false; }
function season(s, hour) { st.season = s; v.setSun(s, hour == null ? 12 : hour); }
function design(o) { APP.o = Object.assign({}, MODEL.inputs.defaults, o || {}); APP.renderAll(); }
async function shots() { var out = []; for (var name of ['se', 'nw', 'garage', 'inside', 'plan']) { v.setView(name, true); await frames(2); out.push(v.shotAt(name, 480, 300)); } return out; }
function visible() { var m = real().debug().model; return { snow: m.groundSnow.visible, roofSnow: !!m.roofSnow.parent && m.roofSnow.parent.visible, grass: m.grass.some(function (g) { return g.visible; }) }; }
function guardState() { var g = real().debug(); return { step: g.guard.step, on: g.guard.on, grass: g.grassShare, post: g.usePost, cap: g.ratioCap, ratio: v.debug().renderer.getPixelRatio() }; }
`;

const dir = mkdtempSync(join(tmpdir(), 'cabin-test-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${join(dir, 'profile')}`, '--no-first-run', '--no-default-browser-check',
  '--window-size=1400,1000', '--hide-scrollbars', '--enable-gpu', '--ignore-gpu-blocklist', ...(process.platform === 'darwin' ? ['--use-angle=metal'] : []), 'about:blank',
], { stdio: 'ignore' });
chrome.on('error', (e) => { console.error(`Could not start Chrome at ${CHROME}: ${e.message}. Set CHROME_PATH.`); process.exit(1); });

const results = [], errors = [];
let dt;
try {
  const port = await waitFor('Chrome to start', () => readFileSync(join(dir, 'profile', 'DevToolsActivePort'), 'utf8').split('\n')[0]);
  const target = await waitFor('a page', async () => (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page'));
  dt = await devtools(target.webSocketDebuggerUrl);
  await dt.send('Runtime.enable');
  // every console error and uncaught exception, from any page load, fails the run
  dt.on('Runtime.consoleAPICalled', (p) => { if (p.type === 'error') errors.push(p.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300)); });
  dt.on('Runtime.exceptionThrown', (p) => errors.push((p.exceptionDetails.exception?.description || p.exceptionDetails.text).slice(0, 300)));

  async function load() {
    await dt.send('Page.navigate', { url: URL_PAGE });
    await sleep(300);
    await waitFor('the 3D viewer', async () => (await dt.send('Runtime.evaluate', { expression: '!!(window.APP && APP.viewer)', returnByValue: true })).result.value, 60000);
    await run("document.getElementById('viewer').scrollIntoView(); await frames(3);");
  }
  async function run(code) {
    const r = await dt.send('Runtime.evaluate', { expression: `(async function(){ ${HELPERS}\n${code} })()`, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  }
  async function check(name, fn) {
    try {
      const problem = await fn();
      results.push({ name, ok: !problem, detail: problem });
    } catch (e) {
      results.push({ name, ok: false, detail: e.message.split('\n')[0] });
    }
  }
  const differ = (a, b, views = ['se', 'nw', 'garage', 'inside', 'plan']) => {
    const bad = views.filter((_, i) => a[i] !== b[i]);
    return bad.length ? `plain view differs in: ${bad.join(', ')}` : '';
  };
  // a round trip made in one page load must leave the plain view the same as a fresh page with the same end state
  async function roundTrip(name, fresh, trip) {
    await check(name, async () => {
      await load(); const a = await run(`${fresh}\nreturn await shots();`);
      await load(); const b = await run(`${trip}\nreturn await shots();`);
      return differ(a, b);
    });
  }

  await load();
  const gpu = await run("var g = document.createElement('canvas').getContext('webgl2'), x = g && g.getExtension('WEBGL_debug_renderer_info'); return x ? g.getParameter(x.UNMASKED_RENDERER_WEBGL) : (g ? 'WebGL2' : 'no WebGL2');");
  console.log(`Rime Cabin 3D checks in headless Chrome (${gpu})`);

  await check('Plain view unchanged after Realistic on and off', async () => {
    await load();
    const r = await run(`var a = await shots(); realOn(); await textures(); season('summer'); season('winter'); await frames(3);
      v.set('real', false); await frames(3); return { a: a, b: await shots() };`);
    return differ(r.a, r.b);
  });
  await roundTrip('Round trip: season changed while on',
    "season('summer'); await frames(3);",
    "realOn(); await textures(); season('summer'); await frames(3); v.set('real', false); await frames(3);");
  await roundTrip('Round trip: design changed while on (crawlspace, no garage)',
    "season('summer'); design({ found: 'crawl', garage: false, entry: false }); await frames(3);",
    "season('summer'); realOn(); await textures(); design({ found: 'crawl', garage: false, entry: false }); await frames(3); v.set('real', false); await frames(3);");
  await roundTrip('Round trip: lean preset and back while on',
    'await frames(3);',
    "realOn(); await textures(); APP.o = Object.assign({}, MODEL.inputs.lean); APP.renderAll(); await frames(3); design(); await frames(3); v.set('real', false); await frames(3);");
  await roundTrip('Round trip: see-through set before the textures arrive',
    "v.set('see', true); await frames(3);",
    "realOn(); v.set('see', true); await textures(); await frames(3); v.set('real', false); await frames(3);");
  await roundTrip('Round trip: part selected while on',
    "v.select('EXT-BB'); await frames(3);",
    "realOn(); await textures(); v.select('EXT-BB'); await frames(3); v.set('real', false); await frames(3);");

  await check('See-through walls stay see-through when the textures arrive', async () => {
    await load();
    const r = await run(`realOn(); v.set('see', true); await textures(); await frames(2); var bad = 0, n = 0;
      v.debug().built.groups.forEach(function (g) { if (!/^(EXT-BB|WAL-ZIPR|FND-SKIRT|GAR-BB|GAR-SHEATH)$/.test(g.userData.it) || !g.visible) return;
        g.traverse(function (o) { if (!o.material || !o.material.isMeshStandardMaterial) return; n++; if (o.material.opacity !== 0.12 || !o.material.transparent) bad++; }); });
      return { bad: bad, n: n };`);
    return r.n === 0 ? 'found no see-through walls' : r.bad ? `${r.bad} of ${r.n} wall materials lost their see-through settings` : '';
  });

  await check('Season buttons swap ground snow, roof snow and grass', async () => {
    await load();
    const r = await run(`function click(sel) { document.querySelector(sel).click(); }
      click('[data-toggle=real]'); real().debug().guard.on = false; click('[data-toggle=snow]'); await frames(2); var w = visible();
      click('[data-season=summer]'); await frames(2); var s = visible();
      click('[data-season=winter]'); await frames(2); var w2 = visible();
      return { winter: w, summer: s, winterAgain: w2 };`);
    const want = { winter: { snow: true, roofSnow: true, grass: false }, summer: { snow: false, roofSnow: false, grass: true }, winterAgain: { snow: true, roofSnow: false, grass: false } };
    const bad = Object.keys(want).filter((k) => JSON.stringify(r[k]) !== JSON.stringify(want[k]));
    return bad.map((k) => `${k}: ${JSON.stringify(r[k])}, expected ${JSON.stringify(want[k])}`).join('; ');
  });

  await check('Textures load once and are applied, however often Realistic is toggled', async () => {
    await load();
    // counted where three.js starts each image load, since the browser's memory cache hides repeat requests
    const r = await run(`var calls = [], load = THREE.ImageLoader.prototype.load;
      THREE.ImageLoader.prototype.load = function (url) { if (/assets\\/textures\\//.test(url)) calls.push(url); return load.apply(this, arguments); };
      // toggled while the first load is still under way, then again after it has finished
      realOn(); for (var i = 0; i < 4; i++) { v.set('real', false); realOn(); } var ok = await textures();
      for (i = 0; i < 2; i++) { v.set('real', false); realOn(); } await wait(500);
      THREE.ImageLoader.prototype.load = load;
      return { applied: ok, loads: calls.length, unique: calls.filter(function (f, i) { return calls.indexOf(f) === i; }).length };`);
    const want = readdirSync(join(REPO, 'public/mountain-house/assets/textures')).filter((f) => f.endsWith('.webp')).length;
    if (!r.applied) return 'the textures never arrived';
    return r.loads !== r.unique ? `${r.loads} texture loads for ${r.unique} files` : r.unique !== want ? `expected ${want} texture files, got ${r.unique}` : '';
  });

  await check('No shader or console errors through the viewer controls', async () => {
    await load();
    const before = errors.length;
    const r = await run(`realOn(); await textures();
      v.setExplode(0.6); await frames(2); v.setExplode(0); ['x', 'z', 'y'].forEach(function (a) { v.setCut(a, 10); }); await frames(2); v.setCut(null, 0);
      v.set('see', true); await frames(2); v.set('see', false); v.select('EXT-BB'); await frames(2); v.select(null);
      for (var h = 6; h <= 18; h += 3) { season('summer', h); await frames(1); } season('winter', 17.5); await frames(2); season('winter', 12);
      ['se', 'nw', 'inside', 'plan', 'garage', 'N', 'E'].forEach(function (name) { v.setView(name, true); }); await frames(2);
      design({ found: 'crawl', garage: false, entry: false, cover: false }); await frames(2); design(); await frames(2);
      v.flyby(); await wait(800); v.stopFlyby(); v.set('real', false); await frames(2); realOn(); await frames(2);
      return v.debug().renderer.info.programs.filter(function (p) { return p.diagnostics && !p.diagnostics.runnable; }).map(function (p) { return p.name; });`);
    const logged = errors.slice(before);
    return [r.length ? `shader programs that failed to compile: ${r.join(', ')}` : '', logged.length ? `console errors: ${logged[0]}` : ''].filter(Boolean).join('; ');
  });

  // the guard: page frames are paused, and frames of a chosen length are fed in by hand
  const guardRun = `v.set('real', true); var r = real(), feed = r.frame, t = 1e7; r.frame = function () {};
    function frames60(n, ms) { for (var i = 0; i < n; i++) { t += ms; feed(t, v.debug().camera); } }
    var out = {}; frames60(120, 1000 / 60); out.at60 = guardState();
    v.set('real', false); v.set('real', true); frames60(120, 20); out.at50 = guardState();
    v.set('real', false); v.set('real', true); frames60(90, 33.3); out.slow1 = guardState(); frames60(65, 33.3); out.slow2 = guardState();
    frames60(65, 33.3); out.slow3 = guardState(); frames60(65, 33.3); out.slow4 = guardState();
    v.set('real', false); out.off = guardState(); r.frame = feed; return out;`;
  function guardProblems(g, steps) {
    const p = [];
    if (g.at60.step !== 0 || g.at60.on) p.push(`at 60 fps it stepped down (${JSON.stringify(g.at60)})`);
    if (g.at50.step !== 0) p.push('at 50 fps it stepped down');
    steps.forEach((ok, i) => { const s = g['slow' + (i + 1)]; if (!ok(s)) p.push(`step ${i + 1} wrong: ${JSON.stringify(s)}`); });
    if (g.slow4.on || g.slow4.step !== 3) p.push('it did not stop after its last step');
    return p.join('; ');
  }
  await check('Frame-rate guard on desktop: half the grass, 1.5x pixels, then no post pass', async () => {
    await load();
    const g = await run(guardRun);
    return guardProblems(g, [(s) => s.step === 1 && s.grass === 0.5 && s.post, (s) => s.step === 2 && s.cap === 1.5 && s.post, (s) => s.step === 3 && !s.post]);
  });

  await check('Phone version: 1.5x pixels, plain pixels back when off, guard steps', async () => {
    await dt.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    await dt.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    try {
      await load();
      const r = await run(`var plain = v.debug().renderer.getPixelRatio(); realOn(); var on = v.debug().renderer.getPixelRatio(), low = real().low; v.set('real', false);
        return { plain: plain, on: on, off: v.debug().renderer.getPixelRatio(), low: low };`);
      const p = [];
      if (!r.low) p.push('the phone version was not chosen');
      if (r.on !== 1.5) p.push(`pixel ratio with Realistic on is ${r.on}, expected 1.5`);
      if (r.off !== r.plain) p.push(`pixel ratio after turning off is ${r.off}, expected ${r.plain}`);
      const g = await run(guardRun);
      const gp = guardProblems(g, [(s) => s.step === 1 && s.grass === 0.5, (s) => s.step === 2 && s.ratio === 1, (s) => s.step === 3 && s.grass === 0.25]);
      if (gp) p.push(gp);
      return p.join('; ');
    } finally {
      await dt.send('Emulation.clearDeviceMetricsOverride');
      await dt.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    }
  });

  await check('No console errors or exceptions during the whole run', async () => (errors.length ? `${errors.length}, first: ${errors[0]}` : ''));
} finally {
  dt?.close();
  chrome.kill();
  await new Promise((r) => (chrome.exitCode !== null ? r() : chrome.once('exit', r)));
  server.close();
  rmSync(dir, { recursive: true, force: true });
}

results.forEach((r) => console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : `: ${r.detail}`}`));
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed} passed, ${failed} failed`);
if (failed) process.exit(1);
