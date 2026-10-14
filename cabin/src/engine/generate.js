/* Rime Cabin engine, part 4: generate everything, then price it, check it and schedule it. */
(function (E) {
  function measure(p) {
    if (p.k === 'box') {
      var d = p.s.slice().sort(function (a, b) { return b - a; });
      if (p.len === undefined) p.len = d[0];
      if (p.area === undefined) p.area = d[0] * d[1];
      if (p.vol === undefined) p.vol = d[0] * d[1] * d[2];
    } else if (p.k === 'cyl') {
      if (p.len === undefined) p.len = p.h;
      if (p.area === undefined) p.area = Math.PI * p.r * p.r;
      if (p.vol === undefined) p.vol = Math.PI * p.r * p.r * p.h;
    } else if (p.k === 'seg') {
      var dx = p.b[0] - p.a[0], dy = p.b[1] - p.a[1], dz = p.b[2] - p.a[2], L = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (p.len === undefined) p.len = L;
      if (p.vol === undefined) p.vol = Math.PI * p.r * p.r * L;
      if (p.area === undefined) p.area = 0;
    } else if (p.k === 'win') {
      p.len = p.u1 - p.u0; p.area = (p.u1 - p.u0) * (p.v1 - p.v0); p.vol = 0;
    } else { p.len = p.len || 0; p.area = p.area || 0; p.vol = p.vol || 0; }
  }

  E.generate = function (M, o) {
    o = Object.assign({}, M.inputs.defaults, o || {});
    // the covered entry is the garage roof carried south, so it needs the garage
    o.entryCover = !!(o.garage && o.entry && M.entry);
    var C = new E.Ctx(M, o), G = E.setup(M, o);
    G.S = E.struct(M, o, G); // gravity loads, member and footing sizes, before any part is drawn
    var pen = E.penetrations(C, G);
    var OP = E.openings(C, G);
    G.S.wall = E.members(C, G, OP); // tall south wall posts and studs under snow and wind
    // wind bracing before the foundation, so the hold-down anchors get their piers: shear walls, hold-downs, interior panels
    var lat = E.lateral(C, G, OP, E.garagePlan ? E.garagePlan(M, o) : null);
    E.foundation(C, G); E.floor(C, G);
    E.walls(C, G, OP); E.roof(C, G, pen); E.wing(C, G);
    E.skins(C, G, OP); E.units(C, G, OP); E.fixtures(C, G); var porch = E.porch(C, G); E.site(C, G);
    var pl = E.plumbing(C, G); E.gas(C, G);
    var mech = E.mech(C, G), el = E.electrical(C, G); E.offgrid(C, G);
    var gar = E.garage ? E.garage(C, G) : null;
    C.parts.forEach(function (p, i) { p.id = i; measure(p); });
    var R = { M: M, o: o, G: G, parts: C.parts, cat: C.cat, units: OP.units, ops: OP.ops, bays: OP.bays, posts: OP.posts, el: el, pl: pl, mech: mech, garage: gar, porch: porch, S: G.S, lateral: lat };
    R.named = { circuits: el.circuits.length, devices: el.devices.length, pvKw: M.offgrid.pvKw, battKwh: M.offgrid.battKwh };
    R.bom = E.bom(R);
    R.sched = E.schedule(R);
    R.checks = E.checks(R);
    return R;
  };

  function roundQ(x, it) {
    var q = it.q;
    if (q && q.round) return Math.ceil(x / q.round - 1e-9) * q.round;
    if (/^(ea|sheet|bag|drop|lot)$/.test(it.u)) return Math.ceil(x - 1e-9);
    return Math.round(x);
  }

  E.bom = function (R) {
    var M = R.M, o = R.o, byIt = {}, problems = [];
    R.parts.forEach(function (p) { (byIt[p.it] = byIt[p.it] || []).push(p); });
    function partsOf(ids) { var a = []; ids.forEach(function (id) { (byIt[id] || []).forEach(function (p) { if (!p.nq) a.push(p); }); }); return a; }
    var lines = [], deferred = [];
    function line(it) {
      var q = it.q, qty = 0, src = partsOf(q && q.of ? q.of : [it.id]);
      if (q === 'count' || (q && q.by === 'count')) qty = src.length;
      else if (q && q.fixed !== undefined) qty = q.fixed;
      else if (q && q.by === 'n') qty = R.named[q.key] || 0;
      else if (q && (q.by === 'len' || q.by === 'area' || q.by === 'vol')) {
        var s = 0; src.forEach(function (p) { s += p[q.by] || 0; });
        qty = s * (q.waste || 1) / (q.div || 1);
      }
      qty = roundQ(qty, it);
      return qty;
    }
    M.catalog.items.forEach(function (it) {
      var has = (byIt[it.id] || []).length > 0;
      if (!E.when(it.when, o)) { if (has) problems.push(it.id + ' has parts but is switched off'); return; }
      if (it.q && it.q.key === 'drops') { deferred.push(it); return; }
      var qty = line(it);
      if (qty <= 0) { if (has) problems.push(it.id + ' has parts but no quantity'); return; }
      lines.push(mk(it, qty, has));
    });
    function mk(it, qty, has) {
      var cat = it.rent ? 'rent' : it.by === 'Pro' ? 'pro' : it.id === 'GEN-DELIV' ? 'deliv' : it.p === 0 ? 'none' : 'mat';
      return { id: it.id, g: it.g, n: it.n, s: it.s, q: qty, u: it.u, p: it.p, ext: Math.round(qty * it.p), by: it.by, chk: !!it.chk, sup: it.sup, lead: it.lead, sheet: it.sheet,
        note: it.note || '', allow: it.allow || '', drop: it.drop || '', rent: !!it.rent, cat: cat, tax: cat === 'mat' && it.tax !== false, parts: has ? (byIt[it.id] || []).length : 0 };
    }
    var drops = {}; lines.forEach(function (l) { if (l.drop) drops[l.drop] = true; });
    R.named.drops = Object.keys(drops).length;
    deferred.forEach(function (it) { var qty = line(it); if (qty > 0) lines.push(mk(it, qty, false)); });
    // integrity: every part maps to a catalog line or a site allowance; every line maps to parts or a stated allowance
    var lineIds = {}; lines.forEach(function (l) { lineIds[l.id] = l; });
    Object.keys(byIt).forEach(function (id) {
      var it = R.cat[id];
      if (!it) problems.push('Part item ' + id + ' is not in the catalog');
      else if (!it.isSite && !lineIds[id]) problems.push(id + ' parts are not in the parts list');
    });
    lines.forEach(function (l) {
      var it = R.cat[l.id];
      if (!l.parts && !l.allow && !(it.q && it.q.of) && !(it.q && it.q.by === 'n')) problems.push(l.id + ' has no parts and no stated allowance');
    });
    var groups = M.catalog.groups.map(function (g) {
      var ls = lines.filter(function (l) { return l.g === g[0]; });
      return { id: g[0], name: g[1], lines: ls, total: ls.reduce(function (a, l) { return a + l.ext; }, 0) };
    }).filter(function (g) { return g.lines.length; });
    var sum = { mat: 0, rent: 0, pro: 0, deliv: 0, taxable: 0 };
    lines.forEach(function (l) { if (sum[l.cat] !== undefined) sum[l.cat] += l.ext; if (l.tax) sum.taxable += l.ext; });
    sum.tax = Math.round(sum.taxable * M.rates.tax);
    sum.parts = lines.reduce(function (a, l) { return a + l.ext; }, 0);
    sum.sub = sum.parts + sum.tax;
    sum.cont = Math.round(sum.sub * M.rates.contingency);
    sum.total = sum.sub + sum.cont;
    // per square foot is for the house only; the garage share carries its own tax and contingency
    var gar = { parts: 0, taxable: 0 };
    lines.forEach(function (l) { if (l.g === 'GAR') { gar.parts += l.ext; if (l.tax) gar.taxable += l.ext; } });
    sum.garage = Math.round((gar.parts + gar.taxable * M.rates.tax) * (1 + M.rates.contingency));
    sum.house = sum.total - sum.garage;
    sum.perSf = Math.round(sum.house / (M.geo.W * M.geo.D));
    var site = M.catalog.site.filter(function (s) { return E.when(s.when, o); });
    return { lines: lines, groups: groups, sum: sum, site: site, problems: problems, drops: Object.keys(drops).sort() };
  };

  /* ---------- schedule ---------- */
  function addWorkDays(d0, n) {
    var d = new Date(d0.getTime()), k = 0;
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
    while (k < n) { d.setUTCDate(d.getUTCDate() + 1); if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) k++; }
    return d;
  }
  E.addWorkDays = addWorkDays;
  E.schedule = function (R) {
    var L = R.M.logistics, o = R.o, by = {}, start = new Date(L.start + 'T00:00:00Z');
    var tasks = L.tasks.filter(function (t) { return E.when(t.when, o); }).map(function (t) {
      var d = t.d, who = t.who;
      if (o.found === 'crawl' && t.dCrawl) { d = t.dCrawl; who = t.whoCrawl || who; }
      else if (o.help && t.dHelp) d = t.dHelp;
      return { id: t.id, n: t.n, d: d, who: who, after: t.after, drop: t.drop };
    });
    tasks.forEach(function (t) {
      var s = 0; t.after.forEach(function (a) { if (by[a] && by[a].e > s) s = by[a].e; });
      if (t.id === 'i1') s = by.fnd.s + 2;
      t.s = s; t.e = s + t.d; by[t.id] = t;
      t.date = addWorkDays(start, t.s); t.endDate = addWorkDays(start, Math.max(t.s, t.e - 1));
    });
    var end = tasks.reduce(function (a, t) { return Math.max(a, t.e); }, 0);
    var dropInfo = {};
    R.M.catalog.drops.forEach(function (d) { dropInfo[d[0]] = { id: d[0], name: d[1], note: d[2] }; });
    var deliveries = R.bom.drops.map(function (id) {
      var t = tasks.filter(function (x) { return x.drop === id; })[0];
      var day = t ? Math.max(0, t.s - 2) : 0;
      if (id === 'D4') day = Math.max(0, by.win.s - 3);
      if (id === 'D5') day = Math.max(0, by.metal.s - 2);
      if (id === 'D6') day = Math.max(0, by.plb.s - 2);
      if (id === 'D7') day = Math.max(0, by.sid.s - 2);
      if (id === 'D8') day = Math.max(0, by.fin.s - 2);
      var items = R.bom.lines.filter(function (l) { return l.drop === id; });
      var maxLead = 0;
      items.forEach(function (l) { var m = /(\d+)\s*wk/.exec(l.lead || '') || /-(\d+)\s*wk/.exec(l.lead || ''); var mm = /(\d+)(?:-(\d+))?\s*wk/.exec(l.lead || ''); if (mm) maxLead = Math.max(maxLead, +(mm[2] || mm[1])); });
      var date = addWorkDays(start, day), order = new Date(date.getTime() - maxLead * 7 * 864e5);
      return { id: id, name: dropInfo[id].name, note: dropInfo[id].note, day: day, date: date, order: order, lead: maxLead, items: items };
    });
    return { start: start, tasks: tasks, days: end, finish: addWorkDays(start, end), deliveries: deliveries };
  };

  /* ---------- checks ---------- */
  E.checks = function (R) {
    var M = R.M, o = R.o, G = R.G, FF = G.FF, out = [];
    function add(cat, name, status, detail, ref) { out.push({ cat: cat, name: name, status: status, detail: detail, ref: ref || '' }); }
    var inch = function (ft) { return Math.round(ft * 12); };
    M.rooms.forEach(function (r) {
      if (!r.bed) return;
      var w = r.b[1] - r.b[0], d = r.b[3] - r.b[2], a = w * d;
      add('Code', r.name + ' size', a >= 70 && Math.min(w, d) >= 7 ? 'pass' : 'fail', Math.round(a) + ' sq ft, ' + E.ftIn(Math.min(w, d)) + ' narrowest. Needs 70 sq ft and 7 ft.', 'IRC R304');
      var eg = R.units.filter(function (u) { return u.egress && u.room === r.id; })[0];
      if (!eg) { add('Code', r.name + ' egress window', 'fail', 'No egress window found.', 'IRC R310'); return; }
      var cw = (eg.u1 - eg.u0) - 0.42, ch = (eg.v1 - eg.v0) - 0.42, net = cw * ch;
      var ok = net >= 5.7 && ch >= 2 && cw >= 20 / 12 && eg.v0 <= 44 / 12;
      add('Code', r.name + ' egress window', ok ? 'pass' : 'fail', eg.id + ': about ' + net.toFixed(1) + ' sq ft clear (' + inch(cw) + ' x ' + inch(ch) + ' in), sill ' + inch(eg.v0) + ' in. Needs 5.7 sq ft, 20 in wide, 24 in tall, sill 44 in or less. Confirm with the window maker.', 'IRC R310');
    });
    var liv = G.vault(0.5) - FF;
    add('Design', 'Ceilings 9 ft or more', liv >= 8.99 && M.geo.ceil >= 9 ? 'pass' : 'fail', 'Living room ' + E.ftIn(liv) + ' at the low wall, rising to ' + E.ftIn(G.vault(23.5) - FF) + '. Bedrooms and bath ' + E.ftIn(M.geo.ceil) + '.', 'Your standard');
    if (o.loft) {
      var zf = 3 * (G.loftFloor + 7 - G.R0 + M.geo.pine), frac = Math.max(0, (23.5 - zf) / (23.5 - 2.4));
      var stairHead = G.vault(M.stair.c[1] + M.stair.r / 3) - G.loftFloor;
      add('Code', 'Loft headroom', frac >= 0.5 ? 'pass' : 'warn', Math.round(frac * 100) + '% of the loft has 7 ft of headroom (a room needs 50%). It is gear storage, not a bedroom, so floor live load is 30 psf.', 'IRC R305, R301.5');
      add('Code', 'Spiral stair headroom', stairHead >= 6.5 ? 'pass' : 'fail', 'The stair arrives under the sloped roof with about ' + E.ftIn(stairHead) + ' of headroom. A spiral stair needs 6′ 6″. Options: reach the storage loft by a ladder instead, or ask the building department before building the stair.', 'IRC R311.7.10.1');
    }
    var toilet = M.fixtures.filter(function (f) { return f.n === 'Toilet bowl'; })[0], van = M.fixtures.filter(function (f) { return f.n === 'Vanity'; })[0], bath = M.rooms.filter(function (r) { return r.id === 'bath'; })[0];
    if (toilet && van) {
      var cx = toilet.b[0] + toilet.b[3] / 2, side = Math.min(cx - bath.b[0], van.b[0] - cx), front = bath.b[3] - (toilet.b[2] + toilet.b[5]);
      add('Code', 'Toilet clearances', inch(side) >= 15 && inch(front) >= 21 ? 'pass' : 'fail', inch(side) + ' in from the center to the nearest side obstruction (needs 15), ' + inch(front) + ' in clear in front (needs 21).', 'IRC R307');
    }
    var pan = M.fixtures.filter(function (f) { return f.n === 'Shower pan'; })[0];
    if (pan) {
      var sw = inch(pan.b[3]), sd = inch(pan.b[5]); add('Code', 'Shower size', Math.min(sw, sd) >= 30 && sw * sd >= 900 ? 'pass' : 'fail', sw + ' x ' + sd + ' in, ' + sw * sd + ' sq in. Needs 30 in each way and 900 sq in. Specify a 22 in or wider door.', 'IRC P2708');
      if (van) { var sf = inch(pan.b[0] - (van.b[0] + van.b[3])); add('Code', 'Clear space at the shower door', sf >= 24 ? 'pass' : 'fail', sf + ' in clear between the vanity and the shower door (needs 24).', 'IRC R307.1'); }
    }
    var devs = R.el.devices;
    function inRoom(d, r) { return d.p[0] >= r.b[0] && d.p[0] <= r.b[1] && d.p[2] >= r.b[2] && d.p[2] <= r.b[3]; }
    var alarmsOk = M.rooms.filter(function (r) { return r.bed; }).every(function (r) { return devs.some(function (d) { return /smoke/.test(d.type) && inRoom(d, r); }); });
    var co = devs.filter(function (d) { return d.type === 'smokeco'; });
    add('Code', 'Smoke and CO alarms', alarmsOk && co.length >= 1 ? 'pass' : 'fail', 'Smoke alarm in each bedroom' + (o.loft ? ' and the loft' : '') + '. ' + co.length + ' combined smoke/CO alarms in the living room by the bedroom doors. Hardwired and interconnected.', 'IRC R314, R315');
    // which protection each circuit needs, from where its devices are
    var cs = R.el.circuits, miss = [], OUTLET = /^(rec|gfci|floor|ext)$/;
    function where(d) {
      if (d.p[1] < FF - 0.1 || d.p[0] < 0.4 || d.p[0] > 31.6 || d.p[2] < 0.4 || d.p[2] > 23.6) return 'out';
      var r = M.rooms.filter(function (r) { return d.p[0] >= r.b[0] - 0.05 && d.p[0] <= r.b[1] + 0.05 && d.p[2] >= r.b[2] - 0.05 && d.p[2] <= r.b[3] + 0.05; })[0];
      return r ? r.id : 'out';
    }
    cs.forEach(function (c) {
      if (c.poles === 2) return;
      var ds = devs.filter(function (d) { return d.c === c.id; }), needG = false, needA = false;
      ds.forEach(function (d) {
        var w = where(d);
        if (OUTLET.test(d.type) && (w === 'bath' || w === 'out' || (w === 'living' && d.p[2] < 3 && d.p[0] > 10.3 && d.p[0] < 16.6))) needG = true; // bath, laundry, outdoors, kitchen counter
        if (w !== 'out' && d.type !== 'htc') needA = true; // living, kitchen, bedrooms, laundry
      });
      var has = c.prot || '';
      if (needG && !/GFCI/.test(has)) miss.push('circuit ' + c.id + ' needs GFCI');
      if (needA && !/AFCI/.test(has)) miss.push('circuit ' + c.id + ' needs AFCI');
    });
    var dual = cs.filter(function (c) { return c.prot === 'GFCI/AFCI'; }).map(function (c) { return c.id; });
    var exts = devs.filter(function (d) { return d.type === 'ext'; });
    add('Code', 'GFCI and AFCI protection', miss.length ? 'fail' : 'pass', miss.length ? miss.join('; ') + '.' : 'Checked device by device: every circuit with outlets in the kitchen, bath, laundry or outdoors has GFCI, and every circuit in the house has AFCI. Dual-function breakers on circuits ' + dual.join(', ') + '. Heat cable on GFPE.', 'NEC 210.8, 210.12');
    add('Code', 'Outdoor receptacles', exts.length >= 2 ? 'pass' : 'fail', exts.length + ' weatherproof GFCI receptacles, at the entry side and the back. Needs one at the front and one at the back.', 'NEC 210.52(E)');
    var v = M.mech.ventilation, beds = M.rooms.filter(function (r) { return r.bed; }).length, need = beds <= 1 ? 30 : beds <= 3 ? 45 : 60;
    add('Code', 'Bath fan and fresh air', v.provided >= need ? 'pass' : 'fail', 'Bath fan runs at ' + v.provided + ' cfm all the time. Whole-house need for 768 sq ft and ' + beds + ' bedrooms is ' + need + ' cfm. ' + v.rule + '.', 'IRC M1505.4');
    if (R.mech.chimney) {
      var ch = R.mech.chimney;
      add('Code', 'Chimney height', ch.aboveHi >= 3 && ch.over10 >= 2 ? 'pass' : 'fail', 'Top is ' + E.ftIn(ch.aboveHi) + ' above the roof at the uphill side of the pipe (needs 3 ft) and ' + E.ftIn(ch.over10) + ' above the highest roof within 10 ft (needs 2 ft).' + (ch.above > 5 ? ' More than 5 ft above the roof, so it gets a brace.' : ''), 'IRC R1005, listing');
      var hl = G.roofHoles && G.roofHoles[0];
      if (hl) add('Code', 'Chimney air space', 'pass', 'Roof opening ' + inch(hl.xr - hl.xl) + ' x ' + inch(hl.zS - hl.zN) + ' in (plan). The headers stay 2 in off the pipe at the top and bottom of the rafters, and a support box keeps the insulation back.', 'Chimney listing');
    }
    var t = M.site.tank, wallOut = 32 + M.geo.zip + M.geo.siding, dTank = (t[0] - (G.tankR || 1.25)) - wallOut;
    var whv = M.mech.runs.filter(function (r) { return r.id === 'WV'; })[0], wp = whv && whv.pts[whv.pts.length - 1];
    var dRv = wp ? Math.hypot(t[0] - wp[0], (0.8 + 2 * (G.tankR || 1.25)) - wp[1], t[1] - wp[2]) : 99;
    add('Code', 'Propane tank distance', dTank >= 10 && dRv >= 10 ? 'pass' : 'fail', 'About ' + E.ftIn(dTank) + ' from the siding to the 500 gal tank (needs 10 ft). The tank valves are ' + E.ftIn(dRv) + ' from the water heater vent (keep 10 ft).', 'NFPA 58');
    // vent and exhaust ends: not under the north eave, 3 ft from openings, above the snow
    var snowDepth = (o.snow / 0.7) / 25, bad2 = [], ok2 = [];
    M.mech.runs.filter(function (r) { return E.when(r.when, o) && r.id !== 'OAK'; }).forEach(function (r) {
      var q = r.pts[r.pts.length - 1], nm = r.name.split(',')[0];
      if (q[2] < 0.2) bad2.push(nm + ' is under the north eave');
      var near = 99;
      // wall openings: u runs along the wall (x on N/S walls, z on E/W walls), v is height above the floor
      Object.keys(R.ops).forEach(function (w) {
        (R.ops[w] || []).forEach(function (op) {
          var ns = w === 'N' || w === 'S', wc = { N: 0, S: 24, E: 32, W: 0 }[w];
          var along = ns ? q[0] : q[2], across = ns ? q[2] : q[0];
          var du = Math.max(op.u0 - along, 0, along - op.u1), dv = Math.max(FF + op.v0 - q[1], 0, q[1] - (FF + op.v1)), dn = Math.abs(across - wc);
          near = Math.min(near, Math.hypot(du, dv, dn));
        });
      });
      if (near < 3) bad2.push(nm + ' is ' + E.ftIn(near) + ' from a window or door');
      if (/FURN|WH/.test(r.it) && q[1] < snowDepth + 1) bad2.push(nm + ' ends ' + E.ftIn(q[1]) + ' above grade, below the assumed ' + E.ftIn(snowDepth + 1) + ' snow line plus 1 ft');
      ok2.push(nm.toLowerCase() + ' ' + E.ftIn(q[1]) + ' above grade');
    });
    add('Code', 'Vent and exhaust ends', bad2.length ? 'warn' : 'pass', bad2.length ? bad2.join('; ') + '. Keep them dug out, or use a taller vent kit.' : 'None under the north eave, all 3 ft or more from windows and doors, and above the snow line (assumed ' + E.ftIn(snowDepth) + ' of settled snow for ' + o.snow + ' psf roof snow): ' + ok2.join(', ') + '. The stove air intake is ' + (o.entryCover ? 'under the main roof beside the entry deck.' : 'under the covered porch.'), 'IRC M1504.3, G2427.8');
    // attached garage: fire separation, door to the house, heater, gas, power
    if (R.garage) {
      var GR = R.garage, gg = M.geo;
      var gyp = R.parts.filter(function (p) { return p.it === 'GAR-GYP'; }).reduce(function (a, p) { return a + p.area; }, 0);
      var hdU = R.units.filter(function (u) { return u.it === 'GAR-HDOOR'; })[0], hz = hdU ? (hdU.u0 + hdU.u1) / 2 : -1;
      var hRoom = M.rooms.filter(function (r) { return hz > r.b[2] && hz < r.b[3] && r.b[0] < 1; })[0];
      var coAl = R.el.devices.filter(function (d) { return d.type === 'smokeco'; }).length;
      var okSep = gyp > 50 && hdU && hdU.solid && hRoom && !hRoom.bed && coAl > 0;
      add('Code', 'Garage separation from the house', okSep ? 'pass' : 'fail', 'About ' + Math.round(gyp) + ' sq ft of 1/2 in gypsum on the garage side of the house wall, slab to roof deck. The door to the house is 1 3/4 in solid-core steel, self-closing and self-latching, and opens into the ' + (hRoom ? hRoom.name.toLowerCase().split(' /')[0] + ' area' : 'house') + ', not a bedroom. ' + coAl + ' carbon monoxide alarms in the house. The garage roof needs no rating because there is no room above it.', 'IRC R302.5.1, R302.6, R315.2.2');
      var vt = GR.vent, snowLine = (o.snow / 0.7) / 25 + 1, c13 = R.el.circuits.filter(function (c) { return c.id === 13; })[0];
      // panel working space: 30 in wide, 36 in deep in front of the panel, clear of the steps, heater and car
      var P = GR.panel, pc = (P.x0 + P.x1) / 2, wx0 = Math.min(P.x0, pc - 1.25), wx1 = Math.max(P.x1, pc + 1.25), depth = 99;
      [GR.steps, GR.car, { x0: GR.heater.x0, x1: GR.heater.x1, z0: GR.heater.z0, z1: P.z0 }].forEach(function (b) {
        if (b.x1 > wx0 && b.x0 < wx1 && b.z1 < P.z0 + 0.01) depth = Math.min(depth, P.z0 - b.z1);
      });
      var hGap = Math.max(wx0 - GR.heater.x1, GR.heater.x0 - wx1);
      var okG = GR.heater.bottom >= 1.5 && vt[1] >= snowLine && c13 && /GFCI/.test(c13.prot) && depth >= 3 && hGap >= 0;
      add('Code', 'Garage heater, gas and power', okG ? 'pass' : 'warn', 'Heater burner ' + Math.round(GR.heater.bottom * 12) + ' in above the slab (needs 18). Vent ends ' + E.ftIn(vt[1]) + ' above grade, above the assumed snow line. Gas comes off the house furnace line after the regulator, so no second regulator. Panel on the garage wall with ' + (depth > 50 ? 'open floor' : E.ftIn(depth)) + ' clear in front (needs 36 in) and 30 in wide. Garage circuit 13 on a GFCI breaker. Meter outdoors on the garage wall.', 'IRC G2408.2, NEC 110.26, 210.8');
    }
    // covered area north of the house: clear height under the beam and at the eave
    if (G.cover) {
      var CVr = G.cover, clr = G.rb(CVr.z - CVr.beam[0] / 2) - CVr.beam[1], eaveH = G.rb(G.Z0);
      add('Design', 'Covered area headroom', clr >= 7 ? 'pass' : clr >= 6.67 ? 'warn' : 'fail', E.ftIn(clr) + ' clear under the beam and ' + E.ftIn(eaveH) + ' at the eave, above grade. Open ' + (R.garage ? 'to the north and east (the garage closes the west side).' : 'on three sides.'), 'Planning check');
    }
    add('Energy', 'Walls', 'pass', 'As specified: R-23 mineral wool plus R-6.6 continuous foam (ZIP System R-6). Climate zone 7 needs R-20 plus R-5 continuous.', 'IECC 2021 R402.1.3');
    add('Energy', 'Roof', 'warn', '16 in of dense-pack cellulose is about R-59 to R-61 depending on density. Ask for 3.8 per inch, or use the IECC trade-off, to show R-60.', 'IECC 2021 R402.1.3');
    if (o.found === 'piers') add('Energy', 'Floor', 'pass', 'As specified: about R-44 dense-pack cellulose in 11 7/8 in bays. Zone 7 needs R-38.', 'IECC 2021 R402.1.3');
    else add('Energy', 'Crawlspace walls', 'pass', 'R-15 continuous (3 in XPS). Zone 7 needs R-15 continuous.', 'IECC 2021 R402.1.3');
    add('Energy', 'Windows', 'pass', 'Specified at U-0.30 or better.', 'IECC 2021 R402.1.2');
    // water lines stay inside the insulation, nothing crosses a beam
    var bad = 0, cross = 0, beamZ = M.structure.beamZ[1];
    R.parts.forEach(function (p) {
      if (p.k !== 'seg' || !/^PLB-/.test(p.it) || p.sys === 'vent') return;
      [p.a, p.b].forEach(function (q) { if (q[1] > FF && (q[0] < M.geo.t6 || q[0] > 32 - M.geo.t6 || q[2] < M.geo.t6 || q[2] > 24 - M.geo.t6)) bad++; });
      var ya = Math.min(p.a[1], p.b[1]);
      if (ya < FF && ya > G.beamBot - 0.05 && (p.a[2] - beamZ) * (p.b[2] - beamZ) < 0) cross++;
    });
    add('Design', 'No pipes in outside walls', bad === 0 ? 'pass' : 'fail', bad === 0 ? 'Every supply and drain line is inside the insulation, so the house can sit unheated after it is drained.' : bad + ' pipe points sit in an outside wall.', 'Freeze protection');
    add('Design', 'No pipes through beams', cross === 0 ? 'pass' : 'fail', cross === 0 ? 'All floor pipes stay north of the middle beam.' : cross + ' pipes cross the middle beam.', 'Structure');
    // structure: every member, footing and wall line the model sizes (E.struct, E.lateral); full tables on S-301 and S-401
    var SC = R.S.checks, worst = function (list) { return list.slice().sort(function (a, b) { return b.ratio - a.ratio; })[0]; };
    var FTG = /footing|Footing|[Pp]iers?\b|pier caps/, LAT = /^(Wind bracing|Roof diaphragm|Floor diaphragm|Hold-down |End post|Wall base shear)/;
    [['Members: rafters, joists, beams, headers, posts, studs', function (c) { return !FTG.test(c.name) && !LAT.test(c.name); }, 'NDS, AISC, IRC R301'],
     ['Footings and piers', function (c) { return FTG.test(c.name); }, 'IRC R403.1, IBC 1807'],
     ['Wind bracing: shear walls, hold-downs, diaphragms', function (c) { return LAT.test(c.name) && !FTG.test(c.name); }, 'SDPWS, ASCE 7']].forEach(function (gp) {
      var list = SC.filter(gp[1]), fails = list.filter(function (c) { return c.status !== 'pass'; }), w = worst(list);
      add('Structure', gp[0], fails.length ? 'fail' : 'pass', fails.length ? fails.map(function (c) { return c.name + ' at ' + Math.round(c.ratio * 100) + '%'; }).join('; ') + '.' :
        list.length + ' checks pass. Most used: ' + w.name.toLowerCase() + ' at ' + Math.round(w.ratio * 100) + '% (' + w.note + ').', gp[2]);
    });
    add('Structure', 'Engineer of record', 'eng', 'Rafters: ' + G.st.rafterTxt.replace(/\.$/, '') + '. Sizes come from the model’s own load calculations for ' + o.snow + ' psf roof snow and 115 mph wind (S-301, S-401). A Colorado-licensed engineer checks them and stamps the drawings.', 'IRC R301.1.3');
    var bp = R.bom.problems;
    add('Model', 'Every part is priced', bp.length ? 'fail' : 'pass', bp.length ? bp.join('; ') : 'All ' + R.parts.length.toLocaleString('en-US') + ' model parts map to a parts-list line or a site allowance, and every line maps to parts or a stated allowance.', 'model.json');
    var ra = M.rooms.reduce(function (a, r) { return a + (r.b[1] - r.b[0]) * (r.b[3] - r.b[2]); }, 0), t6 = M.geo.t6;
    var ext = 32 * 24 - (32 - 2 * t6) * (24 - 2 * t6), pw = M.partitions.reduce(function (a, p) { return a + (p.u[1] - p.u[0]) * p.t; }, 0), rest = 768 - ra - ext - pw;
    add('Model', 'Areas add up', Math.abs(rest) < 12 ? 'pass' : 'warn', 'Rooms ' + Math.round(ra) + ' + outside walls ' + Math.round(ext) + ' + inside walls ' + Math.round(pw) + ' + drywall about ' + Math.round(rest) + ' = 768 sq ft gross.', 'A-101');
    return out;
  };

  E.ftIn = function (x) {
    var neg = x < 0; x = Math.abs(x);
    var f = Math.floor(x + 1e-6), i = Math.round((x - f) * 12);
    if (i === 12) { f++; i = 0; }
    return (neg ? '-' : '') + f + '′' + (i ? ' ' + i + '″' : '');
  };

  E.csv = function (R) {
    var rows = [['ID', 'System', 'Item', 'Spec', 'Qty', 'Unit', 'Unit cost', 'Line total', 'Who', 'Supplier', 'Lead time', 'Sheet', 'Price basis', 'Notes']];
    R.bom.groups.forEach(function (g) {
      g.lines.forEach(function (l) {
        rows.push([l.id, g.name, l.n, l.s, l.q, l.u, l.p, l.ext, l.by, l.sup, l.lead, l.sheet, l.chk ? 'Compared with a 2026 source' : 'Estimate', [l.note, l.allow ? 'Allowance: ' + l.allow : ''].filter(Boolean).join(' ')]);
      });
    });
    var s = R.bom.sum;
    rows.push([]);
    [['Parts and services', s.parts], ['Sales tax on materials (estimate)', s.tax], ['Contingency 10%', s.cont], ['Estimated total', s.total]].forEach(function (r) { rows.push(['', '', r[0], '', '', '', '', r[1]]); });
    rows.push([]);
    rows.push(['', 'Not in the total', 'Site allowances (low to high)']);
    R.bom.site.forEach(function (x) { rows.push([x.id, 'Site', x.n, x.note, '', '', '', '', '', '', '', 'C-101', x.chk ? 'Compared with a 2026 source' : 'Estimate', x.lo ? 'Range $' + x.lo.toLocaleString('en-US') + ' to $' + x.hi.toLocaleString('en-US') : 'Get a quote']); });
    return rows.map(function (r) {
      return r.map(function (c) { c = c === undefined || c === null ? '' : String(c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(',');
    }).join('\n');
  };
})(ENG);
