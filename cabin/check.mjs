// Runs the cabin engine in Node on cabin/src/model.json and prints the totals and checks
// that the page shows, so a design change can be checked without a browser.
// Usage: npm run cabin:check                      default choices
//        npm run cabin:check -- --lean            the "Lean build" preset
//        npm run cabin:check -- --set heat=propane --set loft=true
// Exits 1 if any check fails or the parts list reports a problem.
import vm from 'node:vm';
import { includes, read } from './lib.mjs';

const MODEL = JSON.parse(read('model.json'));
const ctx = vm.createContext({ MODEL, console });
for (const path of includes().filter((p) => p.startsWith('engine/'))) {
  vm.runInContext(read(path), ctx, { filename: `cabin/src/${path}` });
}

const args = process.argv.slice(2);
const opts = Object.assign({}, args.includes('--lean') ? MODEL.inputs.lean : {});
// Each option takes one of its listed values, or true/false when it is an on/off choice.
const allowed = (key) => {
  const list = MODEL.inputs.options.find((c) => c.key === key);
  return list ? list.list.map((it) => it[0]) : ['true', 'false'];
};
args.forEach((a, i) => {
  if (a !== '--set') {
    if (a === '--lean' || args[i - 1] === '--set') return;
    console.error(`Unknown argument "${a}". Use --lean and --set key=value.`);
    process.exit(2);
  }
  const [key, raw] = String(args[i + 1]).split('=');
  if (!(key in MODEL.inputs.defaults)) {
    console.error(`Unknown option "${key}". Options: ${Object.keys(MODEL.inputs.defaults).join(', ')}`);
    process.exit(2);
  }
  if (!allowed(key).includes(raw)) {
    console.error(`"${key}" can be: ${allowed(key).join(', ')}`);
    process.exit(2);
  }
  opts[key] = raw === 'true' ? true : raw === 'false' ? false : raw;
});

const R = ctx.ENG.generate(MODEL, opts);
const s = R.bom.sum;
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const m = MODEL.meta;
const base = args.includes('--lean') ? 'lean build' : 'default choices';
console.log(`${m.name} rev ${m.rev} (${m.revDate}), ${base}${args.includes('--set') ? ' with changes' : ''}`);
console.log(`Choices: ${Object.entries(R.o).filter(([k]) => k in MODEL.inputs.defaults).map(([k, v]) => `${k}=${v}`).join(' ')}`);
console.log(`Estimated total ${money(s.total)}, ${money(s.perSf)} per sq ft (house), garage share ${money(s.garage)}`);
console.log(`Parts list: ${R.bom.lines.length} lines, ${R.parts.length.toLocaleString('en-US')} model parts`);

const label = { pass: 'PASS', warn: 'CHECK', fail: 'FAIL', eng: 'ENGINEER' };
const count = (st) => R.checks.filter((c) => c.status === st).length;
console.log(`Checks: ${count('pass')} pass, ${count('warn')} to check, ${count('fail')} fail, ${count('eng')} for the engineer`);
R.checks.filter((c) => c.status === 'fail' || c.status === 'warn').forEach((c) => {
  console.log(`  ${label[c.status].padEnd(6)} ${c.name}: ${c.detail}`);
});
const unknown = R.checks.filter((c) => !(c.status in label));
unknown.forEach((c) => console.log(`  ${String(c.status).toUpperCase()} ${c.name}: ${c.detail}`));

const problems = R.bom.problems || [];
problems.forEach((p) => console.log(`  PROBLEM ${p}`));
if (count('fail') || problems.length || unknown.length) process.exit(1);
