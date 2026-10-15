// Refreshes the appendix of cabin/prompts/price-check.md from cabin/src/model.json, so the
// prompt's numbers match the committed model. Everything above the "## Appendix" heading
// is left alone. Usage: node cabin/prompts/price-check.mjs
import vm from 'node:vm';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { includes, read } from '../lib.mjs';

const FILE = join(dirname(fileURLToPath(import.meta.url)), 'price-check.md');
const HEADING = '## Appendix';

const MODEL = JSON.parse(read('model.json'));
const ctx = vm.createContext({ MODEL, console });
for (const path of includes().filter((p) => p.startsWith('engine/'))) {
  vm.runInContext(read(path), ctx, { filename: `cabin/src/${path}` });
}
const gen = (o) => ctx.ENG.generate(MODEL, o);
const R = gen({});
const s = R.bom.sum;
const m = MODEL.meta;

const $ = (n) => '$' + Math.round(n).toLocaleString('en-US');
const delta = (n) => (n < 0 ? '−' : '+') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US');
const qty = (l) => l.q.toLocaleString('en-US') + ' ' + l.u;
const unit = (l) => '$' + (l.p < 10 ? String(l.p) : l.p.toLocaleString('en-US')) + '/' + l.u;
// First sentence of the spec, where a sentence ends at ". " followed by a capital letter.
const spec = (l) => (l.s ? ' (' + l.s.split(/\. (?=[A-Z])/)[0] + ')' : '');

const sorted = R.bom.lines.slice().sort((a, b) => b.ext - a.ext);
const top = sorted.slice(0, 30);
const topShare = Math.round(top.reduce((a, l) => a + l.ext, 0) / s.parts * 100);
const next = sorted.filter((l) => l.ext >= 800 && l.ext < top[29].ext);
const lean = gen(MODEL.inputs.lean).bom.sum;
const S = R.sched;

const out = [];
const line = (...xs) => out.push(...xs);

line(`${HEADING}: the numbers as of rev ${m.rev} (${m.revDate}), "As drawn" choices`, '');
line('Regenerate this appendix after any model change with `node cabin/prompts/price-check.mjs`. `npm run cabin:check` prints the same totals, and the parts list CSV comes from the page\'s Downloads section.', '');

line('### A. Totals and rates', '', '| | |', '|---|---|');
line(`| Parts and services (${R.bom.lines.length} lines) | ${$(s.parts)} |`);
line(`| of which materials (taxable) | ${$(s.mat)} |`);
line(`| of which hired trades, engineer, permit, insurance | ${$(s.pro)} |`);
line(`| of which rentals | ${$(s.rent)} |`);
line(`| of which delivery | ${$(s.deliv)} |`);
line(`| Sales tax on materials, ${MODEL.rates.tax * 100}% | ${$(s.tax)} |`);
line(`| Subtotal | ${$(s.sub)} |`);
line(`| Surprise fund, ${MODEL.rates.contingency * 100}% of subtotal | ${$(s.cont)} |`);
line(`| **Estimated total** | **${$(s.total)}** |`);
line(`| Garage share (its own tax and contingency) | ${$(s.garage)} |`);
line(`| House share | ${$(s.house)} |`);
line(`| Per sq ft, house only (${MODEL.geo.W} x ${MODEL.geo.D} = ${MODEL.geo.W * MODEL.geo.D} sf) | $${s.perSf} |`);
line(`| Lean build preset (propane only, 2 glass bays, ribbed roof, no washer-dryer, no paid help, no covered area or entry) | ${$(lean.total)}, $${lean.perSf}/sf |`, '');
line(`Tax note in the model: "${MODEL.rates.taxNote}"`, '');

line(`### B. The 30 biggest lines (${topShare}% of parts and services)`, '', '| # | ID | Item | Qty | Unit price | Line | Who | Basis |', '|---|---|---|---|---|---|---|---|');
top.forEach((l, i) => line(`| ${i + 1} | ${l.id} | ${l.n}${spec(l)} | ${qty(l)} | ${unit(l)} | ${$(l.ext)} | ${l.by} | ${l.chk ? 'checked' : 'estimate'} |`));

line('', `### B2. The next ${next.length} lines, $800 and up`, '');
next.forEach((l) => line(`- ${l.id}: ${l.n}, ${qty(l)} at ${unit(l)} = ${$(l.ext)} (${l.by}${l.chk ? ', checked' : ''})`));

// The page's source list lives in src/page/app.js. Pull it out of the source text so this
// stays in step with the page.
const app = read('page/app.js');
const srcBlock = /var src = \[([\s\S]*?)\];/.exec(app);
const sources = srcBlock ? [...srcBlock[1].matchAll(/\['([^']+)', '([^']+)'\]/g)].map((x) => [x[1], x[2]]) : [];
const probable = {
  'FLR-JOIST': 'latestcost.com I-joist prices', 'WAL-ZIPR': 'latestcost.com ZIP-R panel prices',
  'RFG-SEAM': 'resident.com standing seam 2026', 'RFG-RIB': 'resident.com standing seam 2026 (?)',
  'OPN-FIX77': 'modernize.com window brands', 'OPN-EGR': 'modernize.com window brands', 'OPN-CAS36': 'modernize.com window brands',
  'MEC-FURN': 'blossmangas.com Rinnai 21,500 BTU', 'MEC-STOVE': 'firepitsurplus.com Drolet vs Jøtul',
  'MEC-CHIM': 'raymurray.com DuraVent 2025 price list', 'MEC-WH': 'blossmangas.com Rinnai RE140',
  'LFT-STAIR': 'latestcost.com spiral staircase',
};
const checked = MODEL.catalog.items.filter((it) => it.chk);
line('', `### C. The ${checked.length} lines marked "compared with a 2026 source", and the page's source list`, '', '| ID | Item | Unit price | Supplier | Probable source |', '|---|---|---|---|---|');
checked.forEach((it) => line(`| ${it.id} | ${it.n}${spec(it)} | ${unit(it)} | ${it.sup} | ${probable[it.id] || '?'} |`));
const siteChecked = MODEL.catalog.site.filter((x) => x.chk).map((x) => x.id);
line('', `Site ranges marked as checked: ${siteChecked.join(' and ')}, from latestcost.com "well and septic Colorado".`, '');
line('The page\'s full "Prices checked" list (cabin/src/page/app.js):', '');
sources.forEach((x) => line(`- ${x[1]}: ${x[0]}`));

line('', '### D. Hired trades and allowances', '', '| ID | Item | Line | Who | Note |', '|---|---|---|---|---|');
R.bom.lines.filter((l) => l.allow || l.by === 'Pro').forEach((l) => {
  const amount = (l.q > 1 ? qty(l) + ' at ' + unit(l) + ' = ' : '') + $(l.ext);
  const note = [l.allow ? 'Allowance: ' + l.allow : '', l.note].filter(Boolean).join(' ');
  line(`| ${l.id} | ${l.n}${spec(l)} | ${amount} | ${l.by}${l.rent ? ', rental' : ''} | ${note} |`);
});

line('', '### E. Site costs not in the total', '', '| ID | Item | Page range | Basis | Note |', '|---|---|---|---|---|');
R.bom.site.forEach((x) => line(`| ${x.id} | ${x.n} | ${x.lo ? $(x.lo) + ' to ' + $(x.hi) : 'Get a quote'} | ${x.chk ? 'checked' : 'estimate'} | ${x.note} |`));

line('', `### F. What each choice does to the total (from the default ${$(s.total)})`, '');
for (const c of MODEL.inputs.options) {
  for (const [v, label] of c.list) {
    if (MODEL.inputs.defaults[c.key] === v) continue;
    line(`- ${c.label}: ${label}: ${delta(gen({ ...MODEL.inputs.defaults, [c.key]: v }).bom.sum.total - s.total)}`);
  }
}
for (const [k, label] of MODEL.inputs.switches) {
  const on = MODEL.inputs.defaults[k];
  line(`- ${on ? 'Remove' : 'Add'} ${label}: ${delta(gen({ ...MODEL.inputs.defaults, [k]: !on }).bom.sum.total - s.total)}`);
}
const ve = MODEL.logistics.valueEng.filter((v) => v.save).map((v) => `${v.n} ${$(v.save)}`).join('; ');
line('', `"Ways to spend less" lines that are not in the model, with the page's own savings estimates (before tax and contingency): ${ve}.`);

line('', '### G. Build facts the quantities depend on', '');
line(`- House ${MODEL.geo.W} x ${MODEL.geo.D} ft, one story. Floor ${MODEL.geo.ff.toFixed(2)} ft above grade on piers. North-side ceiling ${MODEL.geo.ceil} ft; the south glass wall is about 17 ft. Shed roof at ${Math.round(MODEL.geo.rise * 12)}:12, overhangs ${MODEL.geo.eaveS} ft south, ${MODEL.geo.eaveN} ft north, ${MODEL.geo.rake} ft rakes. Double cold roof: 16 in I-joist rafters at 12 in o.c. for 100 psf, lower 5/8 in OSB deck, 2x4 vent sleepers, upper 23/32 in deck, metal.`);
line(`- Attached garage ${MODEL.garage.box[2]} x ${MODEL.garage.box[3]} ft (${MODEL.garage.box[2] * MODEL.garage.box[3]} sf slab) on a stem wall to ${MODEL.geo.frost * 12} in frost depth, same rafter and roof build-up as the house, covered entry on 8x8 posts about 18 ft tall, covered area on the north on four 6x6 posts.`);
line('- Walls 2x6 at 16 in o.c. with LSL studs above 12 ft, ZIP System R-6 sheathing, R-23 mineral wool, fiber-cement board and batten on a rainscreen. Floor R-44 dense-pack cellulose, roof R-60 dense-pack cellulose.');
line(`- Schedule: ${S.days} working days, ${S.start.toISOString().slice(0, 10)} to ${S.finish.toISOString().slice(0, 10)}, two people full time, ${R.named.drops} deliveries. Hired: site work, well and septic, garage concrete, 4 days of framing help, chimney and propane, electrician sign-off, overhead door, surveyor, engineer.`);
line(`- Model parts: ${R.parts.length.toLocaleString('en-US')} parts map to ${R.bom.lines.length} lines; quantities are computed from the 3D model (length, area, count, volume) with per-line waste factors in model.json \`catalog.items[].q\`.`);

const text = readFileSync(FILE, 'utf8');
const at = text.indexOf('\n' + HEADING);
if (at < 0) throw new Error(`No "${HEADING}" heading in ${FILE}`);
writeFileSync(FILE, text.slice(0, at + 1) + out.join('\n') + '\n');
console.log(`Appendix refreshed: rev ${m.rev}, total ${$(s.total)}, ${R.bom.lines.length} lines`);
