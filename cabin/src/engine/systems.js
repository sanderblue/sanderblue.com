/* Rime Cabin engine, part 3: plumbing, gas, vents, chimney, wiring and off-grid power. */
(function (E) {
  var SYS = { cold: 'pexBlue', hot: 'pexRed', dwv: 'dwv', vent: 'dwv' };
  function rad(dia) { return Math.max(0.05, dia / 24); }

  E.stove = function (C) {
    var s = C.M.fixtures.filter(function (f) { return f.it === 'MEC-STOVE' && f.b; })[0];
    return s ? { x: s.b[0] + s.b[3] / 2, z: s.b[2] + s.b[5] / 2, top: s.b[1] + s.b[4] } : null;
  };
  E.penetrations = function (C, G) {
    var s = E.stove(C);
    // chimney: 8 in outside diameter Class A pipe (r 0.34 ft) and the listed 2 in air space to framing (c)
    return C.o.heat !== 'propane' && s ? [{ kind: 'chimney', x: s.x, z: s.z, r: 0.34, c: 2 / 12, frame: true }] : [];
  };
  // nearest x to want that sits in a clear rafter bay
  function bayX(G, want) {
    var xs = G.rafterX, best = want, bd = 1e9;
    for (var i = 1; i < xs.length; i++) {
      var c = (xs[i - 1] + xs[i]) / 2;
      if (Math.abs(c - want) < bd) { bd = Math.abs(c - want); best = c; }
    }
    return best;
  }

  E.plumbing = function (C, G) {
    var M = C.M, o = C.o, P = M.plumbing, FF = G.FF, out = { stack: null };
    P.runs.forEach(function (r) {
      C.poly(r.it, r.pts, rad(r.dia), { m: SYS[r.sys], sys: r.sys, n: r.name, run: r.id });
    });
    P.site.forEach(function (r) { C.poly(r.it, r.pts, rad(r.dia), { m: SYS[r.sys], sys: r.sys, n: r.name, run: r.id, nq: true }); });
    // stack: vanity branch, base, rise in the wet wall, south in a joist bay, up through the roof near the high eave
    var S = P.stack, sx = S.x, ty = S.turnY, rz = S.outZ, bx = bayX(G, sx), top = G.roofTop(rz) + 1.0;
    var dwv = { m: 'dwv', sys: 'dwv' };
    C.poly('PLB-DWV', [[25.8, FF + 1.6, 10.0], [25.8, FF - 0.3, 10.0], [sx, FF - 0.34, 10.0]], rad(1.5), Object.assign({ n: 'Vanity drain', run: 'DV' }, dwv));
    C.poly('PLB-DWV', [[sx, FF - 0.34, 10.0], [23.7, FF - 0.4, 10.0]], rad(3), Object.assign({ n: 'Stack base', run: 'SB' }, dwv));
    var vpts = [[sx, FF - 0.34, 10.0], [sx, ty, 10.0], [sx, ty + 0.1, rz]];
    if (Math.abs(bx - sx) > 0.01) vpts.push([bx, ty + 0.1, rz]);
    vpts.push([bx, top, rz]);
    C.poly('PLB-DWV', vpts, rad(3), Object.assign({ n: 'Vent stack, 3 in', run: 'VS' }, dwv, { sys: 'vent' }));
    C.cyl('RFG-BOOT', bx, G.roofTop(rz) - 0.05, rz, 0.32, 0.25, { n: 'Pipe boot, plumbing vent' });
    out.stack = { x: sx, roofX: bx, z: rz, top: top };
    P.points.forEach(function (p) { C.cyl(p.it, p.p[0], p.p[1] - 0.12, p.p[2], 0.12, 0.24, { n: p.name }); });
    P.boxes.forEach(function (b) {
      if (!E.when(b.when, o)) return;
      if (b.cyl) C.cyl(b.it, b.cyl[0], FF + b.cyl[1], b.cyl[2], b.cyl[3], b.cyl[4], { n: b.n, m: 'steel' });
      else C.box(b.it, b.b[0], (b.abs ? 0 : FF) + b.b[1], b.b[2], b.b[3], b.b[4], b.b[5], { n: b.n, m: b.m });
    });
    return out;
  };

  E.gas = function (C, G) {
    var g = C.M.gas, o = C.o;
    g.runs.forEach(function (r) {
      if (!E.when(r.when, o)) return;
      C.poly(r.it, r.pts, r.it === 'MEC-GASLINE' ? 0.06 : 0.04, { n: r.name, run: r.id, sys: 'gas' });
    });
    C.cyl('MEC-REG', g.reg[0], g.reg[1], g.reg[2], 0.18, 0.4, { n: 'Second-stage regulator' });
  };

  E.mech = function (C, G) {
    var M = C.M, o = C.o, FF = G.FF, out = {};
    M.mech.runs.forEach(function (r) {
      if (!E.when(r.when, o)) return;
      C.poly(r.it, r.pts, rad(r.dia), { n: r.name, run: r.id, countFirst: C.cat[r.it].q === 'count' });
    });
    // chimney: stove pipe to the ceiling support, insulated chimney through the roof.
    // Height rule: 3 ft above the roof where it passes through, and 2 ft higher than any roof within 10 ft.
    var s = E.stove(C);
    if (o.heat !== 'propane' && s) {
      // measured from the pipe's uphill (south) face, with 2 in of margin; the roof runs out to the south overhang
      var pr = 0.34, zEnd = 24 + M.geo.eaveS, y0 = FF + s.top, yc = G.vault(s.z), roofAt = G.roofTop(s.z);
      var hi = G.roofTop(s.z + pr), near = G.roofTop(Math.min(zEnd, s.z + pr + 10));
      var top = Math.ceil((Math.max(hi + 3, near + 2) + 2 / 12) * 12) / 12;
      C.seg('MEC-PIPE', [s.x, y0, s.z], [s.x, yc, s.z], 0.29, { n: 'Double-wall stove pipe' });
      C.seg('MEC-CHIM', [s.x, yc, s.z], [s.x, top, s.z], 0.34, { n: 'Class A chimney, 6 in' });
      C.cyl('MEC-CHIMKIT', s.x, roofAt - 0.1, s.z, 0.6, 0.35, { n: 'Roof flashing and storm collar' });
      C.box('MEC-CHIMKIT', s.x - 0.5, roofAt - 0.05, s.z + 0.5, 1.0, 0.5, 0.9, { n: 'Snow splitter', nq: true, rx: -E.TH });
      C.cyl('MEC-CHIMKIT', s.x, top, s.z, 0.45, 0.35, { n: 'Chimney cap', nq: true });
      C.seg('MEC-CHIMKIT', [s.x, top - 1.2, s.z], [s.x + 2.5, roofAt + 0.6, s.z + 1.8], 0.04, { n: 'Roof brace', nq: true });
      out.chimney = { x: s.x, z: s.z, roofAt: roofAt, top: top, above: top - roofAt, aboveHi: top - hi, over10: top - near, pipeLen: yc - y0, classA: top - yc };
    }
    if (o.found === 'crawl') {
      var R = M.mech.radon, bx = bayX(G, R.x), rz = 21.0, ty = FF + 9.35, rt = G.roofTop(rz) + 1.0;
      var pts = [[R.x, -0.95, R.z], [R.x, ty, R.z], [R.x, ty + 0.1, rz]];
      if (Math.abs(bx - R.x) > 0.01) pts.push([bx, ty + 0.1, rz]);
      pts.push([bx, rt, rz]);
      C.poly('FND-RADON', pts, rad(3), { n: 'Passive radon stack', countFirst: true, m: 'pvc' });
      C.cyl('RFG-BOOT', bx, G.roofTop(rz) - 0.05, rz, 0.32, 0.25, { n: 'Pipe boot, radon' });
      out.radon = { x: bx, z: rz };
    }
    return out;
  };

  /* ---------- electrical ---------- */
  var DEV_IT = { rec: 'ELE-DEV', sw: 'ELE-DEV', ext: 'ELE-GFCI', htc: 'ELE-DEV', jbox: 'ELE-DEV', hood: 'ELE-DEV', floor: 'ELE-DEV',
    gfci: 'ELE-GFCI', sconce: 'ELE-LIGHT', ceil: 'ELE-LIGHT', pendant: 'ELE-LIGHT', track: 'ELE-LIGHT', strip: 'ELE-LIGHT', porch: 'ELE-LIGHT',
    smoke: 'ELE-ALARM', smokeco: 'ELE-ALARM', fan: 'FIX-FAN' };
  E.DEV_IT = DEV_IT;
  var DEV_NAME = { rec: 'Receptacle', sw: 'Switch', ext: 'Exterior GFCI receptacle, weatherproof', htc: 'Heat cable controller', jbox: 'Equipment connection',
    hood: 'Range hood connection', floor: 'Floor receptacle', gfci: 'GFCI receptacle', sconce: 'Wall light', ceil: 'Ceiling light', pendant: 'Pendant light',
    track: 'Track light', strip: 'Under-cabinet light', porch: 'Porch light', smoke: 'Smoke alarm', smokeco: 'Smoke and CO alarm', fan: 'Bath fan and light' };
  E.DEV_NAME = DEV_NAME;

  E.electrical = function (C, G) {
    var M = C.M, o = C.o, EL = M.electrical, FF = G.FF;
    var circuits = EL.circuits.filter(function (c) { return E.when(c.when, o); });
    var live = {}; circuits.forEach(function (c) { live[c.id] = c; });
    var lines = { x: [[0.5, 0.229], [23.5, 23.771], [9.7292, 10.0], [10.2708, 10.0], [15.1125, 15.3], [15.4875, 15.3]], z: [[0.5, 0.229], [31.5, 31.771], [21.8125, 22.0], [22.1875, 22.0], [-0.3, 0.229], [32.3, 31.771]] };
    function snap(list, v) { for (var i = 0; i < list.length; i++) if (Math.abs(list[i][0] - v) < 0.06) return list[i][1]; return v; }
    function ceilLvl(x, z, loftDev) { return (x > 22.1875 && !loftDev) ? FF + 9.4 : G.rb(z) + 0.3; }
    var devs = [];
    EL.devices.forEach(function (d) {
      var w = d[7]; if (w && !E.when(w, o)) return;
      if (!live[d[2]]) return;
      var loftDev = !!(w && w.loft);
      var y = d[4] === null ? (d[3] > 22.1875 && !loftDev ? FF + 9.0 : G.vault(d[5])) : FF + d[4];
      var p = [d[3], y, d[5]], mount = d[6], cav;
      if (mount === 'N' || mount === 'S') cav = [p[0], y, snap(lines.x, p[2])];
      else if (mount === 'E' || mount === 'W' || mount === 'X') cav = [snap(lines.z, p[0]), y, p[2]];
      else if (mount === 'F') cav = [p[0], FF - 0.1, p[2]];
      else cav = [p[0], ceilLvl(p[0], p[2], loftDev), p[2]];
      devs.push({ id: d[0], type: d[1], c: d[2], p: p, cav: cav, mount: mount, loft: loftDev });
    });
    // device parts
    devs.forEach(function (d) {
      var it = DEV_IT[d.type], x = { n: DEV_NAME[d.type] + ' (' + d.id + ')', dev: d.id, circuit: d.c, roofy: d.loft };
      var p = d.p, m = d.mount, wd = { N: [0.22, 0.36, 0.05, 0, 0.03], S: [0.22, 0.36, 0.05, 0, -0.03], E: [0.05, 0.36, 0.22, -0.03, 0], W: [0.05, 0.36, 0.22, 0.03, 0], X: [0.05, 0.36, 0.22, -0.03, 0] };
      if (d.type === 'fan') C.boxC(it, p[0], p[1] - 0.08, p[2], 0.9, 0.15, 0.9, x);
      else if (d.type === 'track') C.boxC(it, p[0], p[1] - 0.1, p[2], 4.0, 0.12, 0.15, Object.assign(x, { rx: -E.TH }));
      else if (d.type === 'pendant') { C.cyl(it, p[0], p[1] - 4.0, p[2], 0.55, 0.45, x); C.seg(it, [p[0], p[1] - 3.6, p[2]], [p[0], p[1], p[2]], 0.015, { n: 'Pendant cord', nq: true, m: 'black' }); }
      else if (d.type === 'strip') C.boxC(it, p[0], p[1], p[2] + 0.4, 2.0, 0.05, 0.15, x);
      else if (m === 'C') C.cyl(it, p[0], p[1] - 0.08, p[2], /smoke/.test(d.type) ? 0.25 : 0.38, 0.08, x);
      else if (m === 'F') C.boxC(it, p[0], p[1] + 0.01, p[2], 0.33, 0.03, 0.33, x);
      else {
        var s = wd[m], big = /sconce|porch/.test(d.type) ? 1.8 : 1;
        C.boxC(it, p[0] + s[3] * big, p[1], p[2] + s[4] * big, s[0] * (m === 'N' || m === 'S' ? big : 1), s[1] * big, s[2] * (m === 'E' || m === 'W' || m === 'X' ? big : 1), x);
      }
    });
    // panel, meter
    // with the attached garage the panel and meter move: the panel to the garage side of the house wall,
    // the meter outdoors on the garage's south wall
    // a panel in the garage is set from the garage slab, not the house floor
    var GA = o.garage && M.garage, pn = (GA && GA.panel) || EL.panel, py = GA && GA.panel ? GA.slab + pn[1] : FF + pn[1];
    C.box('ELE-PANEL', pn[0], py, pn[2], pn[3], pn[4], pn[5], { n: 'Panel, 100 A' + (GA && GA.panel ? ', in the garage' : '') });
    var port = { p: [pn[0] + pn[3], py, pn[2] + pn[5] / 2], cav: [0.229, py, pn[2] + pn[5] / 2], mount: 'W' };
    // garage panel (on the garage's south wall): the house circuits leave its top along the wall into the house wall
    if (GA && GA.panel) port = { p: [pn[0] + pn[3] / 2, py + pn[4], pn[2] + 0.1], cav: [0.229, py + pn[4], pn[2] + 0.1], mount: 'W' };
    if (o.power === 'grid') {
      var mt = (GA && GA.meter) || EL.meter, ms = mt[6] || 'W';
      var mx = ms === 'W' ? -0.3 : mt[0] + mt[3] / 2, mz = ms === 'W' ? mt[2] + 0.3 : mt[2] + mt[5] + 0.15;
      C.box('ELE-METER', mt[0], mt[1], mt[2], mt[3], mt[4], mt[5], { side: ms, n: 'Meter base' });
      C.poly('SITE-POWER', [[mx, mt[1], mz], [mx, -2.5, mz], [-120, -2.5, mz]], 0.06, { n: 'Underground service from the road', nq: true });
      if (ms === 'S') {
        // service conductors through the garage wall to the panel
        var ny = py + 0.3;
        C.poly('ELE-METER', [[mx, ny, mt[2] + 0.1], [mx, ny, pn[2] + pn[5]]], 0.07, { n: 'Service conductors, meter to panel', nq: true, m: 'wire' });
      }
    }
    // wiring. Floor runs stay in the joist bays at mid-depth (through I-joist webs, never flanges). Drops leave a wall
    // through its bottom plate into the nearest clear bay, inboard of any beam under the wall. Runs cross the middle
    // floor beam only at marked holes: mid-depth, at least 2 ft from a pier, per the LVL maker's hole chart.
    var g = M.geo, St = M.structure, bw = g.beamW, UF = FF - g.sub - g.joist / 2, bzs = St.beamZ;
    var edges = [bw]; for (var kx = 1; kx * g.oc < 31.9; kx++) edges.push(kx * g.oc); edges.push(22.0); edges.push(32 - bw);
    edges.sort(function (a, b) { return a - b; });
    function bayC(x) { x = Math.max(bw + 0.05, Math.min(32 - bw - 0.05, x)); for (var i = 1; i < edges.length; i++) if (x <= edges[i]) return (edges[i - 1] + edges[i]) / 2; return x; }
    var fb = [[bzs[0] + bw / 2, bzs[1] - bw / 2], [bzs[1] + bw / 2, bzs[2] - bw / 2]];
    function bayOf(z) { return z < bzs[1] ? 0 : 1; }
    function zIn(z) { var b = fb[bayOf(z)]; return Math.min(b[1] - 0.25, Math.max(b[0] + 0.25, z)); }
    var px2 = St.pierX, zones = []; for (var ip = 1; ip < px2.length; ip++) zones.push([px2[ip - 1] + 2, px2[ip] - 2]);
    function crossX(x) {
      var best = null, bd = 1e9;
      zones.forEach(function (zn) { var c = Math.max(zn[0], Math.min(zn[1], x)), cc = bayC(c); if (cc < zn[0] || cc > zn[1]) cc = bayC((zn[0] + zn[1]) / 2); if (Math.abs(cc - x) < bd) { bd = Math.abs(cc - x); best = cc; } });
      return best;
    }
    G.beamHoles = [];
    // where a device's wire enters the floor, and the path down to it
    function down(d) {
      var c = d.cav, m = d.mount, pts = [];
      if (m === 'F') { var fe = [bayC(c[0]), UF, zIn(c[2])]; return { e: fe, pts: [[c[0], FF - 0.1, c[2]], [fe[0], FF - 0.15, fe[2]], fe] }; }
      var alongX = m === 'N' || m === 'S', inX = c[0] > 31 ? -0.4 : c[0] < 1 ? 0.4 : (c[0] > 22 ? 0.3 : -0.3);
      var xe = alongX ? bayC(c[0]) : bayC(c[0] + inX), ze = zIn(c[2]), lo = FF + 0.35;
      pts.push([c[0], lo, c[2]]);
      if (alongX) pts.push([xe, lo, c[2]]); else pts.push([c[0], lo, ze]);
      pts.push([xe, FF - 0.15, ze], [xe, UF, ze]);
      return { e: [xe, UF, ze], pts: pts };
    }
    function floorPath(A, B) {
      var pts = [];
      if (bayOf(A[2]) === bayOf(B[2])) pts.push([B[0], UF, A[2]]);
      else { var xc = crossX((A[0] + B[0]) / 2); pts.push([xc, UF, A[2]], [xc, UF, B[2]]); G.beamHoles.push([xc, UF, bzs[1]]); }
      pts.push([B[0], UF, B[2]]);
      return pts;
    }
    // ceiling runs: rafter bays in the vault, 2x10 joist bays over the bedroom wing
    var rx = G.rafterX || [];
    function bayCeil(x) {
      if (x > 22.1875) { var k = Math.max(0, Math.round((x - 22.667) / 1.3333)); return Math.min(31.1, 22.667 + k * 1.3333); }
      var best = x, bd = 1e9; for (var i = 1; i < rx.length; i++) { var cc = (rx[i - 1] + rx[i]) / 2; if (Math.abs(cc - x) < bd) { bd = Math.abs(cc - x); best = cc; } }
      return best;
    }
    function ceilPath(a, b, aLoft) {
      var pts = [], la = function (x, z) { return ceilLvl(x, z, aLoft); }, xa = bayCeil(a[0]), xb = bayCeil(b[0]);
      pts.push([a[0], la(a[0], a[2]) - 0.05, a[2]], [xa, la(xa, a[2]), a[2]]);
      var crosses = (xa - 22.0) * (xb - 22.0) < 0;
      if (crosses) { pts.push([22.0, la(xa < 22 ? 21.9 : 22.3, a[2]), a[2]]); pts.push([22.0, la(xb < 22 ? 21.9 : 22.3, a[2]), a[2]]); }
      pts.push([xb, la(xb, a[2]), a[2]]);
      pts.push([xb, la(xb, b[2]), b[2]]);
      pts.push([b[0], la(b[0], b[2]) - 0.05, b[2]]);
      return pts;
    }
    function route(a, b) {
      var pts = [a.p, a.cav];
      if (a.mount !== 'C' && b.mount !== 'C') {
        var A = down(a), B = down(b);
        pts = pts.concat(A.pts).concat(floorPath(A.e, B.e)).concat(B.pts.slice().reverse()).concat([b.cav, b.p]);
      } else if (b.mount === 'C' && a.mount !== 'C') {
        pts = pts.concat(ceilPath(a.cav, b.cav, b.loft)); pts.push(b.p);
      } else if (a.mount === 'C' && b.mount !== 'C') {
        var back = ceilPath(b.cav, a.cav, a.loft).reverse();
        pts = [a.p].concat(back); pts.push(b.cav, b.p);
      } else {
        pts = [a.p].concat(ceilPath(a.cav, b.cav, a.loft || b.loft)); pts.push(b.p);
      }
      var clean = [pts[0]];
      for (var i = 1; i < pts.length; i++) {
        var q = clean[clean.length - 1], r = pts[i];
        if (Math.abs(q[0] - r[0]) + Math.abs(q[1] - r[1]) + Math.abs(q[2] - r[2]) > 0.02) clean.push(r);
      }
      return clean;
    }
    var runs = [];
    circuits.forEach(function (c) {
      var list = devs.filter(function (d) { return d.c === c.id; }), prev = port;
      list.forEach(function (d, i) {
        var pts = route(prev, d);
        C.poly('ELE-WIRE', pts, 0.045, { n: 'Circuit ' + c.id + ': ' + c.name, circuit: c.id, color: c.color, m: 'wire' });
        runs.push({ c: c.id, pts: pts });
        prev = d;
      });
      if (c.id === 12) {
        var j = list[list.length - 1];
        var w = M.site.well; // down inside the insulated water-entry box, below frost, then in the water-line trench to the well
        if (j) C.poly('SITE-WELL', [j.p, [j.p[0], -5.2, j.p[2]], [12.6, -5.2, j.p[2] - 0.3], [12.6, -5.2, -29.6], [w[0] + 0.4, -5.2, -29.6], [w[0] + 0.4, -5.2, w[1]]], 0.04, { n: 'Pump feeder to the well, in the water-line trench', nq: true, m: 'pvc', L: 'elec' });
      }
    });
    return { circuits: circuits, devices: devs, runs: runs };
  };

  E.offgrid = function (C, G) {
    var M = C.M, o = C.o, FF = G.FF, og = M.offgrid, S = M.site;
    if (o.power !== 'off') return;
    var iv = og.inverter, bt = og.battery;
    C.box('PWR-INV', iv[0], FF + iv[1], iv[2], iv[3], iv[4], iv[5], { n: 'Inverter/charger, 6 kW' });
    C.box('PWR-BATT', bt[0], FF + bt[1], bt[2], bt[3], bt[4], bt[5], { n: 'LFP battery bank, 15 kWh' });
    var pv = S.pv, n = 10, mw = 3.4, mh = 5.6, tilt = 55 * Math.PI / 180, cx = pv[0] + pv[2] / 2, z0 = pv[1] + 3;
    for (var r = 0; r < 2; r++) for (var i = 0; i < n / 2; i++) {
      var x = cx - 2.5 * mw + (i + 0.5) * mw, h = (r + 0.5) * mh;
      C.add({ it: 'PWR-PV', k: 'box', c: [x, 1.5 + h * Math.sin(tilt), z0 - h * Math.cos(tilt) + 0.0], s: [mw - 0.08, 0.12, mh - 0.08], rx: -(Math.PI / 2 - tilt), n: 'Solar module, 440 W', nq: true });
    }
    [cx - 7, cx, cx + 7].forEach(function (x) {
      C.seg('PWR-PV', [x, 0, z0 + 0.3], [x, 1.6, z0 + 0.3], 0.12, { n: 'Array post', nq: true, m: 'steel' });
      C.seg('PWR-PV', [x, 0, z0 - 5.5], [x, 9.6, z0 - 5.5 - 0.0], 0.12, { n: 'Array post', nq: true, m: 'steel' });
    });
    C.add({ it: 'PWR-PV', k: 'marker', c: [cx, 0, z0], n: 'Solar array' });
    C.box('PWR-GEN', S.gen[0] - 1.2, 0, S.gen[1] - 0.9, 2.4, 1.9, 1.8, { n: 'Propane generator, 7.5 kW' });
    C.poly('PWR-BOS', [[cx, 0.5, z0 + 0.5], [cx, -2.0, z0 + 0.5], [-1.5, -2.0, z0 + 0.5], [-1.5, -2.0, 5.5], [-0.3, FF + 0.5, 5.5]], 0.07, { n: 'Buried conduit, array to house', nq: true });
    C.poly('PWR-BOS', [[S.gen[0], 0.6, S.gen[1]], [S.gen[0], -1.5, S.gen[1]], [-0.3, -1.5, 5.0], [-0.3, FF + 0.4, 5.0]], 0.05, { n: 'Generator feeder', nq: true });
  };
})(ENG);
