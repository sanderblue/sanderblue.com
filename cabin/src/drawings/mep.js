/* Rime Cabin drawing set: plumbing (P-101, P-201), electrical (E-101, E-201) and mechanical (M-101). */
(function (D) {
  var fi = D.fi;
  function sysClass(p) { return p.sys === 'cold' ? 'cold' : p.sys === 'hot' ? 'hot' : p.sys === 'vent' ? 'vent' : p.sys === 'dwv' ? 'dwv' : p.sys === 'gas' ? 'gas' : 'duct'; }
  function legend(sh, x, y, rows) {
    rows.forEach(function (r, i) { sh.line(x, y + i * 26, x + 70, y + i * 26, r[0]); sh.text(x + 84, y + i * 26 + 4, r[1], 'ts'); });
    return rows.length * 26;
  }
  var base = function (sh, R, map) { D.planArch(sh, R, map, { light: true, noFurn: true, xmin: map.u0 }); };

  /* ---------- P-101 plumbing plan ---------- */
  D.reg('P-101', 'Plumbing plan', '1/2" = 1\'-0"', function (sh, R) {
    var map = new D.Map(420, 300, 50, -3, -3), X = function (x) { return map.x(x); }, Y = function (z) { return map.y(z); };
    base(sh, R, map);
    D.drawProjected(sh, R, 'plan', map, function (p) { return p.k === 'seg' && /^PLB-(PEX|DWV)$/.test(p.it); }, sysClass, { maxW: 0 });
    D.drawProjected(sh, R, 'plan', map, function (p) { return /^PLB-(MANIFOLD|ENTRY|DRAINBOX|PTANK|CO|AAV)$/.test(p.it); }, function () { return 'f-white d-md'; });
    var tags = [[12.6, 1.6, 'Water entry, main shutoff, drain-down valve, filter, pressure tank (in sink base)', -120, 160], [31.35, 14.0, 'PEX manifold above the washer, hot and cold, labeled ports', 90, 120],
      [31.25, 14.15, 'WH-1 tankless water heater above', 90, 190], [24.4, 10.0, '3 in stack in the 2x6 wet wall, cleanout with access panel in bedroom 1', -60, -150], [23.7, 0.9, 'Drain leaves the floor here in an insulated, heat-traced drop. Two-way cleanout', -200, -120],
      [12.25, 1.2, 'Kitchen sink: drain and supplies up through the floor, AAV in the cabinet', 100, -150], [31.2, 13.3, 'Washer standpipe with AAV', 90, 60]];
    sh.callouts(tags.map(function (t) { return [X(t[0]), Y(t[1]), t[2]]; }), X(33.4), false, 10.5, 14, 290);
    sh.vtitle(400, Y(27), '1', 'Plumbing plan', '1/2" = 1\'-0"   Supply and drain lines run in the insulated floor');
    var y = 160;
    y += legend(sh, 2590, y, [['cold', 'Cold water, PEX'], ['hot', 'Hot water, PEX'], ['dwv', 'Drain, ABS or PVC'], ['vent', 'Vent']]) + 40;
    sh.notes(2590, y, 610, 'Plumbing and freeze-protection notes', [
      'No water lines in exterior walls or the attic. Supplies run in the insulated floor bays north of the middle beam, then up inside interior walls or cabinets.',
      'Home-run PEX from one manifold, so each fixture has its own shutoff.',
      'Drain-down: slope supplies back to the low-point drain valve at the water entry. Before a cold absence: shut the main, open the drain-down, blow out the lines, drain the water heater, put RV antifreeze in every trap and the toilet.',
      R.o.found === 'piers' ? 'Water entry and drain drop: insulated boxes with self-regulating heat cable on a GFPE breaker (circuit 11). Water service below frost under the north snow pile.' : 'Water service enters through the stem wall below frost into the insulated crawlspace.',
      'Vent: 3 in stack rises in the wet wall, runs south in a ceiling joist bay and exits near the high edge of the roof, away from sliding snow. Air admittance valves at the kitchen sink and washer.',
      'Test: drain lines under water or air test, supplies at 100 psi for 15 minutes, before insulation.',
      'Water heater: tankless propane, direct vent through the east wall. Thermal expansion and pressure relief per the maker.'
    ], 12.5);
  });

  /* ---------- P-201 riser diagram and fixtures ---------- */
  D.reg('P-201', 'Plumbing riser diagram and fixtures', 'Not to scale', function (sh, R) {
    var c = Math.cos(Math.PI / 6), s = Math.sin(Math.PI / 6), box = [200, 140, 1560, 1260];
    function raw(p) { return [(p[0] - p[2]) * c, -p[1] + (p[0] + p[2]) * s]; }
    var pts = [[0, 2, 0], [32, 2, 0], [32, 2, 24], [0, 2, 24], [R.pl.stack.roofX, R.pl.stack.top, R.pl.stack.z], [12.6, -1, 1.6], [23.7, 0, 0.9]].map(raw);
    var u0 = Math.min.apply(null, pts.map(function (q) { return q[0]; })), u1 = Math.max.apply(null, pts.map(function (q) { return q[0]; }));
    var v0 = Math.min.apply(null, pts.map(function (q) { return q[1]; })), v1 = Math.max.apply(null, pts.map(function (q) { return q[1]; }));
    var k = Math.min(box[2] / (u1 - u0), box[3] / (v1 - v0)), ox = box[0] + (box[2] - (u1 - u0) * k) / 2, oy = box[1] + (box[3] - (v1 - v0) * k) / 2;
    function iso(p) { var r = raw(p); return [ox + (r[0] - u0) * k, oy + (r[1] - v0) * k]; }
    // floor outline for reference
    [[0, 2, 0], [32, 2, 0], [32, 2, 24], [0, 2, 24]].reduce(function (a, b) { var A = iso(a), B = iso(b); sh.line(A[0], A[1], B[0], B[1], 'd-xl'); return b; }, [0, 2, 24]);
    var parts = R.parts.filter(function (p) { return p.k === 'seg' && /^PLB-(PEX|DWV)$/.test(p.it); });
    parts.sort(function (a, b) { return (a.sys === 'dwv' ? 0 : 1) - (b.sys === 'dwv' ? 0 : 1); });
    parts.forEach(function (p) { var A = iso(p.a), B = iso(p.b); sh.line(A[0], A[1], B[0], B[1], sysClass(p)); });
    // label offsets [dx, dy] keep the crowded laundry corner readable
    var fx = [[[12.6, 2.9, 1.8], 'Kitchen sink', 30, -30], [[23.4, 2.6, 10.05], 'Toilet', -90, -50], [[25.8, 2.6, 10.4], 'Vanity', -60, -80], [[29.85, 8.7, 10.0], 'Shower head', 60, -40], [[29.85, 5.8, 10.0], 'Shower valve', 70, -10],
      [[31.35, 5.4, 14.0], 'PEX manifold', 150, 10], [[31.25, 6.3, 14.4], 'WH-1 water heater', 150, -30], [[31.2, 4.9, 13.3], 'Washer box', 150, 50], [[R.pl.stack.roofX, R.pl.stack.top, R.pl.stack.z], 'Vent through roof', 20, -20], [[23.7, 0.0, 0.9], 'To septic', 60, 20], [[12.6, -1.0, 1.6], 'From well', 40, 30]];
    fx.forEach(function (f) {
      var P = iso(f[0]), tx = P[0] + f[2], ty = P[1] + f[3];
      sh.circle(P[0], P[1], 4, 'f-dark'); sh.line(P[0], P[1], tx, ty, 'd-lt');
      sh.text(tx + (f[2] < 0 ? -6 : 6), ty + 4, f[1], 'ts tb', f[2] < 0 ? 'end' : null);
    });
    sh.vtitle(220, 1470, '1', 'Supply and drain riser diagram', 'Not to scale. Isometric view from the southwest, drawn from the model pipe runs');
    legend(sh, 240, 1570, [['cold', 'Cold water'], ['hot', 'Hot water'], ['dwv', 'Drain'], ['vent', 'Vent']]);
    var fixt = [['Kitchen sink', '1/2 in H and C', '1 1/2 in', 'P-trap', 'AAV under sink', '1'], ['Toilet, 1.28 gpf', '1/2 in C', '3 in', 'Integral', 'Stack', '1'], ['Vanity lavatory', '1/2 in H and C', '1 1/2 in', 'P-trap', 'Stack', '1'], ['Shower, 34 x 40', '1/2 in H and C', '2 in', 'P-trap', 'Stack (trap arm under 8 ft)', '1']];
    if (R.o.wd) fixt.push(['Washer-dryer combo', '1/2 in H and C (hoses)', '2 in standpipe', 'P-trap', 'AAV in box', '1']);
    fixt.push(['Tankless water heater', '3/4 in C in, 3/4 in H out', '-', '-', 'Concentric vent', '1']);
    var y = sh.table(1880, 160, [{ h: 'Fixture', w: 300 }, { h: 'Supply', w: 230 }, { h: 'Drain', w: 160 }, { h: 'Trap', w: 120 }, { h: 'Vent', w: 250, wrap: true }, { h: 'Qty', w: 60, a: 'r' }], fixt, { title: 'Fixture schedule', size: 11.5 });
    var pl = R.bom.lines.filter(function (l) { return /^PLB-/.test(l.id); });
    y += sh.table(1880, 160 + y + 60, [{ h: 'Item', w: 520, wrap: true }, { h: 'Qty', w: 160, a: 'r' }, { h: 'Notes', w: 440, wrap: true }], pl.map(function (l) { return [l.n, l.q + ' ' + l.u, l.s]; }), { title: 'Plumbing materials (from the parts list)', size: 11 }) + 60;
    sh.notes(1880, 160 + y + 60, 1260, 'Riser notes', [
      'Pipe lengths in the parts list come from these same runs, plus waste for fittings.',
      'Building drain 3 in at 1/4 in per ft minimum. Branches 1 1/2 and 2 in at 1/4 in per ft.',
      'Cleanouts at the stack base, the kitchen branch and where the drain leaves the house.',
      'Shut-off at the main, at the manifold for every fixture, and at the water heater.'
    ], 12);
  });

  /* ---------- E-101 electrical plan ---------- */
  function devSym(sh, d, x, y) {
    var t = d.type;
    if (/rec|floor|ext|gfci|htc/.test(t)) {
      sh.circle(x, y, 9, 'f-white d-md'); sh.line(x - 9, y - 3, x + 9, y - 3, 'd-md'); sh.line(x - 9, y + 3, x + 9, y + 3, 'd-md');
      if (t === 'floor') sh.rect(x - 13, y - 13, 26, 26, 'd-md');
      if (t === 'gfci' || t === 'ext') sh.text(x + 12, y + 14, t === 'ext' ? 'WP GFCI' : 'GFCI', 'ts');
      if (t === 'htc') sh.text(x + 12, y + 14, 'HT', 'ts');
    } else if (t === 'sw') { sh.text(x, y + 5, 'S', 'tm tb', 'middle'); }
    else if (t === 'jbox' || t === 'hood') { sh.circle(x, y, 9, 'f-white d-md'); sh.text(x, y + 4, 'J', 'ts tb', 'middle'); }
    else if (/smoke/.test(t)) { sh.circle(x, y, 13, 'f-white d-md'); sh.text(x, y + 4, t === 'smokeco' ? 'S/CO' : 'SD', 'ts tb', 'middle'); }
    else if (t === 'fan') { sh.rect(x - 14, y - 14, 28, 28, 'f-white d-md'); sh.text(x, y + 4, 'EF', 'ts tb', 'middle'); }
    else if (t === 'track') { sh.rect(x - 50, y - 5, 100, 10, 'f-white d-md'); }
    else if (t === 'strip') { sh.rect(x - 25, y - 4, 50, 8, 'f-white d-md'); }
    else { sh.circle(x, y, 11, 'f-white d-md'); sh.line(x - 8, y - 8, x + 8, y + 8, 'd-md'); sh.line(x - 8, y + 8, x + 8, y - 8, 'd-md'); }
  }
  function inset(d) { var o = 0.45, m = d.mount; return [d.p[0] + (m === 'W' ? o : m === 'E' ? -o : m === 'X' ? -0.3 : 0), d.p[2] + (m === 'N' ? o : m === 'S' ? -o : 0)]; }
  D.reg('E-101', 'Electrical plan', '1/2" = 1\'-0"', function (sh, R) {
    var map = new D.Map(420, 300, 50, -3, -3), X = function (x) { return map.x(x); }, Y = function (z) { return map.y(z); };
    base(sh, R, map);
    var circ = {}; R.el.circuits.forEach(function (c) { circ[c.id] = c; });
    var pn = R.M.electrical.panel, port = [pn[0] + 0.5, pn[2] + 0.6];
    R.el.circuits.forEach(function (c) {
      var ds = R.el.devices.filter(function (d) { return d.c === c.id; });
      ds.forEach(function (d, i) {
        var a = i ? inset(ds[i - 1]) : null, b = inset(d);
        if (!a) {
          var hx = X(b[0]) - 30, hy = Y(b[1]) + 22;
          sh.line(X(b[0]), Y(b[1]), hx, hy, 'd-md', ' style="stroke:' + c.color + '"');
          sh.poly([[hx, hy], [hx + 10, hy - 2], [hx + 4, hy - 9]], 'f-dark'); sh.text(hx - 4, hy + 14, c.id, 'ts tb', 'end');
          return;
        }
        var mx = (X(a[0]) + X(b[0])) / 2, my = (Y(a[1]) + Y(b[1])) / 2, dx = X(b[0]) - X(a[0]), dy = Y(b[1]) - Y(a[1]);
        sh.path('M' + D.r1(X(a[0])) + ' ' + D.r1(Y(a[1])) + ' Q' + D.r1(mx - dy * 0.18) + ' ' + D.r1(my + dx * 0.18) + ' ' + D.r1(X(b[0])) + ' ' + D.r1(Y(b[1])), 'd-md', ' style="stroke:' + c.color + '"');
      });
    });
    R.el.devices.forEach(function (d) { var p = inset(d); devSym(sh, d, X(p[0]), Y(p[1])); });
    if (!R.garage) {
      sh.rect(X(pn[0]), Y(pn[2]), 0.5 * 50, pn[5] * 50, 'f-dark'); sh.leader(X(pn[0]) + 12, Y(pn[2]) + 20, X(pn[0]) + 120, Y(pn[2]) - 80, 'Panel, 100 A, 20 spaces. See E-201');
      if (R.o.power === 'grid') sh.leader(X(-0.4), Y(3.8), X(-2.4), Y(1.0), 'Meter base, outside west wall');
    } else {
      // with the attached garage the panel and meter are on the garage south wall; the home runs come in here
      var gp = R.M.garage.panel; sh.rect(X(0.05), Y(gp[2] - 0.3), 0.35 * 50, 0.6 * 50, 'f-dark');
      sh.leader(X(0.1), Y(gp[2]), X(-2.4), Y(gp[2] + 1.6), 'Home runs from the panel in the garage');
      sh.leader(X(-0.4), Y(gp[2] + 1.0), X(-2.4), Y(gp[2] + 2.6), 'Panel and meter: A-601, E-201');
    }
    sh.vtitle(400, Y(27), '1', 'Electrical plan', '1/2" = 1\'-0"   Arcs connect devices on the same circuit; arrow and number = home run to the panel');
    var y = 160, items = [['rec', 'Duplex receptacle, 16 in AFF'], ['gfci', 'GFCI receptacle'], ['floor', 'Floor receptacle'], ['sw', 'Switch, 48 in AFF'], ['ceil', 'Light fixture'], ['smoke', 'Smoke alarm'], ['smokeco', 'Smoke and CO alarm'], ['fan', 'Bath fan / light'], ['jbox', 'Equipment connection']];
    sh.text(2300, y, 'SYMBOLS', 'tc tl'); y += 30;
    items.forEach(function (it, i) { devSym(sh, { type: it[0] }, 2320, y + i * 34); sh.text(2360, y + i * 34 + 4, it[1], 'ts'); });
    y += items.length * 34 + 30;
    sh.notes(2300, y, 880, 'Electrical notes', [
      'Receptacles every 12 ft of wall (no point more than 6 ft from one), counters within 2 ft of each end and every 4 ft. Floor boxes where the south wall is glass.',
      'GFCI: kitchen counters, bath, laundry, outdoors. AFCI: living, bedrooms and lighting. Heat cable on a GFPE breaker.',
      'Smoke alarms in each bedroom' + (R.o.loft ? ' and the loft' : '') + '; combined smoke/CO alarms in the living room near each bedroom door. Hardwired, interconnected, battery backup.',
      'Outside walls: airtight boxes, gaskets at every penetration.',
      'Tamper-resistant receptacles throughout. Exterior receptacle in a weatherproof in-use cover.',
      'Cable lengths in the parts list come from the routed circuits in the model plus 20 percent.'
    ], 12.5);
  });

  /* ---------- E-201 one-line, panel schedule, load calculation ---------- */
  D.reg('E-201', 'One-line diagram, panel schedule and load', 'Not to scale', function (sh, R) {
    var o = R.o, x = 260, y = 260;
    function box(bx, by, w, h, t1, t2) { sh.rect(bx, by, w, h, 'f-white d-md'); sh.text(bx + w / 2, by + h / 2 - 2, t1, 'ts tb', 'middle'); if (t2) sh.text(bx + w / 2, by + h / 2 + 14, t2, 'ts', 'middle'); }
    if (o.power === 'grid') {
      box(x, y, 220, 70, 'UTILITY', 'Underground service'); sh.line(x + 220, y + 35, x + 300, y + 35, 'd-hv');
      box(x + 300, y, 220, 70, 'METER BASE', 'West wall'); sh.line(x + 520, y + 35, x + 600, y + 35, 'd-hv');
      box(x + 600, y, 240, 70, 'PANEL, 100 A MAIN', '120/240 V, 1 phase'); sh.line(x + 840, y + 35, x + 920, y + 35, 'd-hv');
      box(x + 920, y, 260, 70, 'BRANCH CIRCUITS', R.el.circuits.length + ' circuits, see schedule');
      sh.text(x, y + 120, 'Grounding electrode: two ground rods 6 ft apart, or a concrete-encased electrode in a footing. Bond the CSST gas pipe and the water pipe.', 'ts');
    } else {
      box(x, y - 60, 220, 70, 'SOLAR ARRAY', '4.4 kW'); box(x, y + 60, 220, 70, 'PROPANE GENERATOR', '7.5 kW, auto-start');
      [[y - 25], [y + 95]].forEach(function (yy) { sh.line(x + 220, yy[0], x + 300, y + 35, 'd-hv'); });
      box(x + 300, y, 240, 70, 'INVERTER / CHARGER', '6 kW split phase'); sh.line(x + 420, y + 70, x + 420, y + 140, 'd-hv'); box(x + 300, y + 140, 240, 70, 'LFP BATTERY', '15 kWh, self-heating');
      sh.line(x + 540, y + 35, x + 620, y + 35, 'd-hv'); box(x + 620, y, 240, 70, 'PANEL, 100 A MAIN', 'Fed by the inverter'); sh.line(x + 860, y + 35, x + 940, y + 35, 'd-hv');
      box(x + 940, y, 260, 70, 'BRANCH CIRCUITS', R.el.circuits.length + ' circuits');
    }
    sh.vtitle(240, 560, '1', 'One-line diagram', o.power === 'grid' ? 'Utility power' : 'Off-grid solar with generator backup');
    var rows = R.el.circuits.map(function (c) { return [c.id, c.name, c.amps + ' A', c.poles === 2 ? '2' : '1', c.prot || '-', c.amps === 20 ? '12 AWG' : '14 AWG', c.va.toLocaleString('en-US')]; });
    var h = sh.table(240, 700, [{ h: 'Ckt', w: 60, a: 'r' }, { h: 'Serves', w: 420 }, { h: 'Breaker', w: 110 }, { h: 'Poles', w: 80 }, { h: 'Protection', w: 130 }, { h: 'Wire', w: 120 }, { h: 'Load VA', w: 120, a: 'r' }], rows, { title: 'Panel schedule', size: 11.5 });
    // load calculation (NEC 220.82 optional method)
    var A = 768, gen = 3 * A, sa = 2 * 1500, lau = 1500, appl = R.el.circuits.filter(function (c) { return [8, 9, 11, 12].indexOf(c.id) >= 0; }).reduce(function (a, c) { return a + c.va; }, 0) + 150 + 300;
    var garVA = R.garage ? 1500 : 0, tot = gen + sa + lau + appl + garVA, first = Math.min(10000, tot), rest = Math.max(0, tot - 10000) * 0.4, dem = first + rest, amps = dem / 240;
    sh.table(1700, 700, [{ h: 'Load', w: 520 }, { h: 'VA', w: 300, a: 'r' }], [
      ['General lighting and receptacles, 3 VA x 768 sq ft', gen.toLocaleString('en-US')], ['Small-appliance circuits, 2 x 1,500', sa.toLocaleString('en-US')], ['Laundry circuit', lau.toLocaleString('en-US')],
      ['Fixed appliances: furnace, water heater, heat cable, well pump, fridge, hood', appl.toLocaleString('en-US')]].concat(garVA ? [['Garage, circuit 13: lights, opener, heater blower', garVA.toLocaleString('en-US')]] : []).concat([['Total connected', tot.toLocaleString('en-US')],
      ['First 10,000 VA at 100%', first.toLocaleString('en-US')], ['Remainder at 40%', Math.round(rest).toLocaleString('en-US')], ['Demand load', Math.round(dem).toLocaleString('en-US')],
      ['Demand current at 240 V', Math.round(amps) + ' A, so a 100 A service is plenty']
    ]), { title: 'Load calculation (NEC 220.82, my calc)', size: 11.5 });
    sh.notes(1700, 1160, 1450, 'Notes', [
      'Heating, hot water and cooking are propane, so the electrical load is small.',
      'GFCI/AFCI on the schedule means one dual-function breaker. The 2020 NEC wants arc-fault protection in kitchens and laundry areas as well as ground-fault protection.',
      o.power === 'off' ? 'Off-grid: winter use about 4 to 6 kWh a day (my estimate). The 15 kWh battery covers 2 to 3 cloudy days; the propane generator starts automatically below 30 percent.' : 'Utility service: confirm the service point and meter location with the utility before trenching.',
      'Colorado allows homeowner electrical permits for a home you own and occupy in many counties. Check with the county; the electrician line in the parts list covers service hookup and sign-off.',
      'Circuit 12 feeds the well pump; size it to the pump the driller installs.'
    ], 12.5);
  });

  /* ---------- M-101 mechanical, ventilation and propane ---------- */
  D.reg('M-101', 'Mechanical, ventilation and propane', '1/2" = 1\'-0"', function (sh, R) {
    var map = new D.Map(420, 300, 50, -3, -3), X = function (x) { return map.x(x); }, Y = function (z) { return map.y(z); }, M = R.M, o = R.o;
    base(sh, R, map);
    D.drawProjected(sh, R, 'plan', map, function (p) { return p.k === 'seg' && /^(MEC-(CSST|OAK|FURNVENT|WHVENT|FANDUCT|HOODDUCT|PIPE|CHIM)|FND-RADON)$/.test(p.it); }, function (p) { return /CSST/.test(p.it) ? 'gas' : 'duct'; }, { maxW: 6 });
    D.drawProjected(sh, R, 'plan', map, function (p) { return /^(MEC-(REG|FURN|WH)|FIX-FAN)$/.test(p.it) || (p.it === 'MEC-STOVE' && !p.glow); }, function () { return 'f-white d-md'; });
    var eq = M.mech.equipment.filter(function (e) { return ENG.when(e.when, o); });
    var pos = { 'F-1': [1.2, 10.1, 120, -60], 'WS-1': [10.6, 13.5, 120, 90], 'WH-1': [31.25, 14.15, 100, 120], 'EF-1': [27, 12.7, 90, -110], 'RH-1': [15.1, 1.2, 120, -120], 'T-1': [32.6, 8.0, 80, -80], 'RN-1': [25.6, 9.85, -120, -100] };
    // tags on the plan; the equipment schedule explains them
    eq.forEach(function (e) { var p = pos[e.tag]; if (!p) return; sh.tag(X(p[0]), Y(p[1]), e.tag, 'rect'); });
    sh.callouts([[X(32.6) + 16, Y(8.0), 'Gas from tank T-1 (about 12 ft clear to the east). Second-stage regulator on the east wall']], X(33.4), false, 10.5, 14, 130);
    if (R.garage) sh.leader(X(0.8), Y(R.garage.gasTee[2]), X(-2.4), Y(R.garage.gasTee[2] - 2.2), 'Gas to the garage heater, A-601');
    sh.vtitle(400, Y(27), '1', 'Mechanical plan', '1/2" = 1\'-0"   Gas piping dash-dot, vents and ducts solid');
    var rows = eq.map(function (e) { return [e.tag, e.name, e.spec, e.loc]; });
    var y = 160 + sh.table(2400, 160, [{ h: 'Tag', w: 70 }, { h: 'Equipment', w: 180 }, { h: 'Spec', w: 370, wrap: true }, { h: 'Location', w: 190, wrap: true }], rows, { title: 'Equipment schedule', size: 11 }) + 60;
    var v = M.mech.ventilation;
    y += sh.table(2400, y, [{ h: 'Ventilation', w: 690, wrap: true }, { h: 'cfm', w: 120, a: 'r' }], [['Whole-house need. ' + v.rule, v.need], ['Bath fan EF-1, continuous', v.provided], ['Bath fan boost (needs 50 intermittent or 20 continuous)', 80], ['Range hood (under 400 cfm, so no makeup air required)', 300]], { title: 'Ventilation', size: 11 }) + 60;
    var gas = [['Wall furnace F-1', o.heat !== 'wood' ? 21500 : 0], ['Tankless water heater WH-1', 140000], ['2-burner cooktop', 18000], ['Garage wall heater (A-601)', R.garage ? R.M.garage.heater.btu : 0]].filter(function (g) { return g[1]; });
    var tot = gas.reduce(function (a, g) { return a + g[1]; }, 0);
    y += sh.table(2400, y, [{ h: 'Gas load', w: 640 }, { h: 'BTU/h', w: 170, a: 'r' }], gas.map(function (g) { return [g[0], g[1].toLocaleString('en-US')]; }).concat([['Total connected', tot.toLocaleString('en-US')], ['500 gal tank T-1, 30% full, 0 F (RegO D x L x K method)', '315,000'], ['Same tank at -10 F', 'about 157,000'], ['A 250 gal tank at 0 F / -10 F, for comparison', '197,000 / 99,000']]), { title: 'Propane load', size: 11 }) + 50;
    sh.notes(2400, y, 810, 'Mechanical notes', [
      'Wood stove: EPA-certified, outside air kit, listed clearances, hearth pad. Class A chimney 3 ft above the roof and 2 ft above anything within 10 ft; braced; snow splitter.',
      'Furnace and water heater are sealed-combustion, direct vent. The furnace vent gets a snorkel kit so it ends about 7 1/2 ft above grade; the water heater vent is 9 ft up. Both are above the assumed snow line. Clear them after big storms.',
      R.garage ? 'Range hood duct runs in a soffit over the north cabinets and down the west wall past the garage, then out the west wall under the roof: away from the snow-shed zone, 3 ft or more from windows and doors, and 3 ft above the furnace and garage heater vents.' : 'Range hood duct runs in a soffit over the north cabinets and out the west wall, away from the north snow-shed zone and more than 3 ft from windows.',
      'Gas: CSST, bonded, pressure-tested. Tank is 500 gal because a 250 gal cannot boil off enough gas for the water heater on very cold mornings (see the table). In deep cold keep it above about 50 percent' + (R.garage ? ', and do not run the garage heater during a long shower.' : '.'),
      'Bath fan runs all the time as the house ventilation. Duct runs south in a ceiling bay to a wall cap above the bedroom 2 window.',
      o.found === 'crawl' ? 'Radon: passive 3 in stack from under the crawl membrane, fan-ready. Test after move-in; add the fan if needed.' : 'Radon: the open pier space is vented. Test after move-in.'
    ], 12.5);
  });
})(DWG);
