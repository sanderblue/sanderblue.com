/* Rime Cabin engine, part 6: structural calculations. Gravity loads run from the roof down to the footings,
   and the results size the footings, headers, jacks and posts the other parts draw. Wind bracing is E.lateral.
   These are planning calculations (ASD, NDS-style member checks, simple tributary wind). A licensed engineer
   checks and stamps the real design. Units: feet, pounds. Plan X west to east, Z north to south. */
(function (E) {
  var COS = E.COS;

  /* ---------- beam solver: continuous beam on pinned supports, uniform and point loads ----------
     sup: support x list. x0..x1 beam extent. w: [{a, b, w}] plf down. P: [{x, P}] lb down. EI in lb-in2.
     Returns reactions (lb, up), max/min moment (ft-lb, + sags), max shear (lb), max deflection (in). */
  function beam(x0, x1, sup, w, P, EI) {
    var pts = [x0, x1].concat(sup);
    w.forEach(function (q) { pts.push(Math.max(x0, q.a), Math.min(x1, q.b)); });
    (P || []).forEach(function (p) { pts.push(p.x); });
    pts = pts.filter(function (x) { return x >= x0 - 1e-9 && x <= x1 + 1e-9; }).sort(function (a, b) { return a - b; });
    var nodes = [];
    for (var i = 0; i < pts.length; i++) {
      if (i && pts[i] - pts[i - 1] < 1e-6) continue;
      if (nodes.length) {
        var a = nodes[nodes.length - 1], n = Math.max(1, Math.ceil((pts[i] - a) / 0.25));
        for (var k = 1; k < n; k++) nodes.push(a + (pts[i] - a) * k / n);
      }
      nodes.push(pts[i]);
    }
    var N = nodes.length, D = 2 * N, K = [], F = new Array(D).fill(0);
    for (var r = 0; r < D; r++) K.push(new Array(D).fill(0));
    var EIf = EI / 144; // lb-ft2
    function wAt(x) { var s = 0; w.forEach(function (q) { if (x >= q.a - 1e-9 && x <= q.b + 1e-9) s += q.w; }); return s; }
    for (var e = 0; e < N - 1; e++) {
      var L = nodes[e + 1] - nodes[e], c = EIf / (L * L * L), m = [[12, 6 * L, -12, 6 * L], [6 * L, 4 * L * L, -6 * L, 2 * L * L], [-12, -6 * L, 12, -6 * L], [6 * L, 2 * L * L, -6 * L, 4 * L * L]];
      var dof = [2 * e, 2 * e + 1, 2 * e + 2, 2 * e + 3];
      for (var p = 0; p < 4; p++) for (var q2 = 0; q2 < 4; q2++) K[dof[p]][dof[q2]] += c * m[p][q2];
      var we = wAt((nodes[e] + nodes[e + 1]) / 2);
      F[dof[0]] += we * L / 2; F[dof[1]] += we * L * L / 12; F[dof[2]] += we * L / 2; F[dof[3]] -= we * L * L / 12;
    }
    function nodeOf(x) { var b = 0; nodes.forEach(function (v, j) { if (Math.abs(v - x) < Math.abs(nodes[b] - x)) b = j; }); return b; }
    (P || []).forEach(function (p) { F[2 * nodeOf(p.x)] += p.P; });
    var fixed = {}; sup.forEach(function (s) { fixed[2 * nodeOf(s)] = true; });
    var free = []; for (var d = 0; d < D; d++) if (!fixed[d]) free.push(d);
    var n2 = free.length, A = [], bv = [];
    for (var ii = 0; ii < n2; ii++) { A.push(free.map(function (j) { return K[free[ii]][j]; })); bv.push(F[free[ii]]); }
    for (var col = 0; col < n2; col++) {
      var piv = col; for (var rr = col + 1; rr < n2; rr++) if (Math.abs(A[rr][col]) > Math.abs(A[piv][col])) piv = rr;
      var tmp = A[col]; A[col] = A[piv]; A[piv] = tmp; var tb = bv[col]; bv[col] = bv[piv]; bv[piv] = tb;
      for (var r2 = col + 1; r2 < n2; r2++) {
        var f = A[r2][col] / A[col][col]; if (!f) continue;
        for (var c2 = col; c2 < n2; c2++) A[r2][c2] -= f * A[col][c2];
        bv[r2] -= f * bv[col];
      }
    }
    var xsol = new Array(n2);
    for (var r3 = n2 - 1; r3 >= 0; r3--) { var s = bv[r3]; for (var c3 = r3 + 1; c3 < n2; c3++) s -= A[r3][c3] * xsol[c3]; xsol[r3] = s / A[r3][r3]; }
    var u = new Array(D).fill(0); free.forEach(function (dd, j) { u[dd] = xsol[j]; });
    var R = sup.map(function (sx) {
      var dd = 2 * nodeOf(sx), ku = 0; for (var j = 0; j < D; j++) ku += K[dd][j] * u[j];
      return { x: sx, R: F[dd] - ku };
    });
    // moment and shear by statics, sampled along the beam
    var Mmax = 0, Mmin = 0, Vmax = 0, dmax = 0;
    for (var t = 0; t <= 400; t++) {
      var x = x0 + (x1 - x0) * t / 400, M = 0, V = 0;
      R.forEach(function (rc) { if (rc.x < x - 1e-9) { M += rc.R * (x - rc.x); V += rc.R; } });
      w.forEach(function (q) { var a = Math.max(q.a, x0), b = Math.min(q.b, x); if (b > a) { M -= q.w * (b - a) * (x - (a + b) / 2); V -= q.w * (b - a); } });
      (P || []).forEach(function (p) { if (p.x < x - 1e-9) { M -= p.P * (x - p.x); V -= p.P; } });
      Mmax = Math.max(Mmax, M); Mmin = Math.min(Mmin, M); Vmax = Math.max(Vmax, Math.abs(V));
    }
    for (var nn = 0; nn < N; nn++) dmax = Math.max(dmax, Math.abs(u[2 * nn]) * 12);
    return { R: R, Mmax: Mmax, Mmin: Mmin, M: Math.max(Mmax, -Mmin), V: Vmax, d: dmax };
  }
  E.beamSolve = beam;

  /* ---------- sections (allowable values, normal load duration; snow uses Cd 1.15) ---------- */
  var SEC = {
    'IJ16': { n: '16 in heavy-flange I-joist', M: 12925, V: 2710, EI: 1252e6, R: 3400 },
    'LVL16x1': { n: '1 3/4 x 16 LVL', M: 15563, V: 5320, EI: 1.195e9, R: 7400 },
    'LVL12x2': { n: '2-ply 1 3/4 x 11 7/8 LVL', M: 2 * 8925, V: 2 * 3948, EI: 2 * 4.88e8 },
    'LVL12x3': { n: '3-ply 1 3/4 x 11 7/8 LVL', M: 3 * 8925, V: 3 * 3948, EI: 3 * 4.88e8 },
    'LVL16x3': { n: '3-ply 1 3/4 x 16 LVL', M: 3 * 15563, V: 3 * 5320, EI: 3 * 1.195e9 },
    '2x10x2': { n: '2-ply 2x10 SPF No. 2', M: 2 * 1716, V: 2 * 1249, EI: 2 * 1.385e8 },
    '2x8': { n: '2x8 treated SYP No. 2', M: 1120, V: 1090, EI: 1.4e6 * 47.6 },
    '2x10x2t': { n: '2-ply 2x10 treated SYP No. 2', M: 2 * 1630, V: 2 * 1390, EI: 2 * 1.4e6 * 98.9 }
  };
  E.SEC = SEC;
  // sawn or LVL column capacity (NDS 3.7.1). d: least face in inches, A in2, le in ft, Fc and Emin in psi
  function column(d, A, le, Fc, Emin, Cd) {
    var ld = le * 12 / d, FcE = 0.822 * Emin / (ld * ld), Fs = Fc * (Cd || 1), al = FcE / Fs, c = 0.8;
    var Cp = (1 + al) / (2 * c) - Math.sqrt(Math.pow((1 + al) / (2 * c), 2) - al / c);
    return { P: Cp * Fs * A, ld: ld, Cp: Cp };
  }
  E.column = column;
  var Q_SOIL = 2000, CONC = 150, SOIL = 100, PLATE = 425, PLATE_PT = 565;
  var FTG = [24, 30, 36, 42, 48];
  // footing for a load P (lb, without the pier's own weight): round bell form up to 48 in, else a square pad.
  function footing(P, depth, tubeD) {
    for (var i = 0; i < FTG.length; i++) {
      var dia = FTG[i], A = Math.PI * Math.pow(dia / 24, 2), W = (A * 0.83 + Math.PI * Math.pow(tubeD / 24, 2) * (depth - 0.83)) * CONC;
      if ((P + W) / A <= Q_SOIL) return { dia: dia, area: A, round: true, W: W, q: (P + W) / A };
    }
    for (var s = 4.5; s < 12; s += 0.5) {
      var A2 = s * s, W2 = (A2 * 1.0 + Math.PI * Math.pow(tubeD / 24, 2) * (depth - 1)) * CONC;
      if ((P + W2) / A2 <= Q_SOIL) return { dia: s * 12, side: s, area: A2, round: false, W: W2, q: (P + W2) / A2 };
    }
    return { dia: 144, side: 12, area: 144, round: false, W: 0, q: 0 };
  }
  E.footing = footing;
  // uplift a footing can hold back: 0.6 x (concrete + soil over the bell)
  function upliftCap(f, depth, tubeD) {
    var soil = Math.max(0, f.area - Math.PI * Math.pow(tubeD / 24, 2)) * (depth - (f.round ? 0.83 : 1)) * SOIL;
    return 0.6 * (f.W + soil);
  }

  /* ---------- gravity design ---------- */
  E.struct = function (M, o, G) {
    var g = M.geo, St = M.structure, S = +o.snow, Dr = St.dead, Do = St.deadOpen || 17, Df = St.floorDead || 12, Lf = 40;
    var s = G.rs, t6 = g.t6, out = { S: S, Dr: Dr, Do: Do, Df: Df, Lf: Lf, checks: [], walls: {}, headers: {}, posts: {}, beams: {}, rafters: {} };
    var rsec = SEC[G.st.rafter === 'ROF-LVL16' ? 'LVL16x1' : 'IJ16'];
    function chk(name, dem, cap, unit, note, ref) {
      var r = cap > 0 ? dem / cap : 9;
      out.checks.push({ name: name, dem: dem, cap: cap, unit: unit || 'lb', ratio: r, status: r <= 1.0 ? 'pass' : 'fail', note: note || '', ref: ref || '' });
      return r;
    }
    // one rafter line with cantilevers. Loads per rafter: D and S over z0..z1 (plan), supports a, b.
    // Snow patterns: full; back span only; cantilevers only (for the most uplift and the most down).
    function rafter(key, name, z0, z1, a, b, D, sec) {
      sec = sec || rsec;
      var EI = sec.EI, wD = D * s, wS = S * s;
      var full = beam(z0, z1, [a, b], [{ a: z0, b: z1, w: wD + wS }], [], EI);
      var back = beam(z0, z1, [a, b], [{ a: z0, b: z1, w: wD }, { a: a, b: b, w: wS }], [], EI);
      var cant = beam(z0, z1, [a, b], [{ a: z0, b: z1, w: wD }, { a: z0, b: a, w: wS }, { a: b, b: z1, w: wS }], [], EI);
      var dead = beam(z0, z1, [a, b], [{ a: z0, b: z1, w: wD }], [], EI);
      var Ra = Math.max(full.R[0].R, back.R[0].R, cant.R[0].R), Rb = Math.max(full.R[1].R, back.R[1].R, cant.R[1].R);
      var Rmin = Math.min(full.R[0].R, back.R[0].R, cant.R[0].R, full.R[1].R, back.R[1].R, cant.R[1].R);
      var Mx = Math.max(full.M, back.M, cant.M), Vx = Math.max(full.V, back.V, cant.V), span = b - a;
      var r = { key: key, name: name, z0: z0, z1: z1, a: a, b: b, span: span,
        Ra: Ra / s, Rb: Rb / s, RaD: dead.R[0].R / s, RbD: dead.R[1].R / s, Rmin: Rmin, M: Mx, V: Vx, d: full.d * (sec === SEC.IJ16 ? 1.15 : 1), Rmax: Math.max(Ra, Rb) };
      chk(name + ': bending', Mx, sec.M * 1.15, 'ft-lb', sec.n + ' at ' + Math.round(s * 12) + ' in o.c., span ' + E.ftIn(span) + (z1 - b > 0.1 ? ', ' + E.ftIn(z1 - b) + ' overhang' : ''), 'NDS, maker');
      chk(name + ': shear', Vx, sec.V * 1.15, 'lb', '', 'NDS, maker');
      var dF = sec === SEC.IJ16 || /I-joist/.test(sec.n) ? 1.15 : 1.0; // I-joist shear deformation
      chk(name + ': deflection', full.d * dF, span * 12 / 240, 'in', 'Total load, L/240' + (dF > 1 ? ', with 15% for I-joist shear deformation' : ''), 'IRC R301.7');
      chk(name + ': bearing', Math.max(Ra, Rb), sec.R * 1.15, 'lb', 'Reaction per rafter. Web stiffeners at bearings', 'Maker');
      out.rafters[key] = r;
      return r;
    }
    var CV = G.cover, GB = E.garageBox ? E.garageBox(M, o) : null;
    var zN = t6 / 2, zS = 24 - t6 / 2, Z1 = 24 + g.eaveS;
    // house rafters: broken over the north wall when the covered area is on (two simple spans, shorter lengths to handle)
    var main = rafter('main', 'House rafters', CV ? zN : -g.eaveN, Z1, zN, zS, Dr);
    var cov = CV ? rafter('cover', 'Covered-area rafters', G.Z0, zN, CV.z, zN, Do) : null;
    if (!o.loft) chk('Wall over the bedroom wing: gap under the rafter', main.d, 1.0, 'in', 'The rafter over the wall deflects up to ' + main.d.toFixed(2) + ' in; the wall stops 1 in short, slotted deflection clips at the top, gap sealed with a compressible gasket', 'Detail');
    // garage rafters: garage north wall to garage south wall; with the covered entry a second span to the entry beam
    var gN = null, gS = null;
    if (GB) {
      var gzN = GB.Z0 + t6 / 2, gzS = GB.Z1 - t6 / 2;
      gN = rafter('garN', 'Garage rafters', GB.RZ0, o.entryCover ? gzS : GB.RZ1, gzN, gzS, Do);
      if (o.entryCover) gS = rafter('garS', 'Covered-entry rafters', gzS, GB.RZ1, gzS, M.entry.beam.z, Do);
    }
    // wall line loads, plf along the wall: D and S parts kept apart for load combinations
    function split(r, which) { var tot = which === 'a' ? r.Ra : r.Rb, d = which === 'a' ? r.RaD : r.RbD; return { D: d, S: Math.max(0, tot - d) }; }
    function add(a, b) { return { D: a.D + (b ? b.D : 0), S: a.S + (b ? b.S : 0) }; }
    var wN = add(split(main, 'a'), cov ? split(cov, 'b') : null), wS = split(main, 'b');
    wN.D += 9.04 * 11; wS.D += 17.0 * 11;
    out.walls.N = wN; out.walls.S = wS;
    // end walls: the end rafter takes half a bay plus the rake overhang (outriggers bear over it); west wall loses its rake under the garage roof
    var endTrib = (s / 2 + g.rake * (1 + g.rake / (2 * 3))), wE = { D: endTrib * Dr + 13 * 11, S: endTrib * S }, wW = GB ? { D: s * Dr + 13 * 11, S: s * S } : wE;
    out.walls.E = wE; out.walls.W = wW;

    /* headers over the house's openings: bearing walls carry the roof, end walls carry a rafter bay and the rake */
    out.headerFor = function (op, wall) {
      var span = op.u1 - op.u0 + 0.25, w = wall === 'N' ? wN : wall === 'S' ? wS : wall === 'E' ? wE : wW;
      var tot = w.D + w.S, Mx = tot * span * span / 8, Vx = tot * span / 2;
      var opts = (wall === 'N' || wall === 'S') ? ['LVL12x2', 'LVL12x3'] : ['2x10x2', 'LVL12x2', 'LVL12x3'];
      var pick = opts[opts.length - 1];
      for (var i = 0; i < opts.length; i++) {
        var sc = SEC[opts[i]], d = 5 * (tot / 12) * Math.pow(span * 12, 4) / (384 * sc.EI);
        if (Mx <= sc.M * 1.15 && Vx <= sc.V * 1.15 && d <= span * 12 / 360) { pick = opts[i]; break; }
      }
      var sc2 = SEC[pick], jn = Math.max(1, Math.ceil(Vx / (1.5 * 5.5 * PLATE)));
      var h = { id: op.id, wall: wall, span: span, w: tot, M: Mx, V: Vx, sec: pick, n: sc2.n, ply: /x3/.test(pick) ? 3 : 2, lvl: /^LVL/.test(pick), jacks: Math.min(3, jn), R: Vx };
      chk('Header ' + op.id + ' (' + wall + ' wall)', Mx, sc2.M * 1.15, 'ft-lb', sc2.n + ', ' + E.ftIn(span) + ' span, ' + Math.round(tot) + ' plf. ' + h.jacks + ' jack stud' + (h.jacks > 1 ? 's' : '') + ' each end (end reaction ' + Math.round(Vx).toLocaleString('en-US') + ' lb)', 'NDS');
      out.headers[op.id] = h;
      return h;
    };

    /* floor: flush LVL beams on piers, LVL end beams under the end walls */
    var bz = St.beamZ, px = St.pierX, depth = g.frost, tube = 12;
    var trib = [(bz[1] - bz[0]) / 2, (bz[1] - bz[0]) / 2 + (bz[2] - bz[1]) / 2, (bz[2] - bz[1]) / 2];
    var lineWall = [wN, { D: 0, S: 0 }, wS];
    var ebSec = SEC.LVL12x3;
    // end beams span between the floor beams; reactions land at the floor beam ends as point loads
    function endBeam(wall, za, zb) {
      var wl = { D: wall.D + 0.67 * Df, L: 0.67 * Lf, S: wall.S }, span = zb - za, tot = wl.D + wl.L + wl.S;
      var Mx = tot * span * span / 8, d = 5 * (tot / 12) * Math.pow(span * 12, 4) / (384 * ebSec.EI);
      return { span: span, w: wl, M: Mx, d: d, R: { D: wl.D * span / 2, L: wl.L * span / 2, S: wl.S * span / 2 } };
    }
    var eb = [];
    [[wW, 'west'], [wE, 'east']].forEach(function (ww) {
      [[bz[0], bz[1]], [bz[1], bz[2]]].forEach(function (zz) {
        var e = endBeam(ww[0], zz[0] + g.beamW / 2, zz[1] - g.beamW / 2); e.side = ww[1]; e.za = zz[0]; e.zb = zz[1]; eb.push(e);
      });
    });
    var ebMax = eb.reduce(function (m, e) { return e.M > m.M ? e : m; }, eb[0]), crawl = o.found === 'crawl';
    if (!crawl) {
      chk('End beams under the east and west walls: bending', ebMax.M, ebSec.M, 'ft-lb', ebSec.n + ', ' + E.ftIn(ebMax.span) + ' span (was a rim board)', 'NDS');
      chk('End beams: deflection', ebMax.d, ebMax.span * 12 / 360, 'in', 'L/360 under a wall', 'IRC R301.7');
    } else {
      // crawlspace: the walls sit on the stem walls; the worst is the north wall with half the floor bay
      var cw2 = [20, 24, 30, 36].map(function (wi) { var b = wi / 12; return { w: wi, q: (wN.D + wN.S + 7.54 * (Df + Lf) + 0.667 * 4.5 * 150 + b * 0.83 * 150) / b }; });
      var cf2 = cw2.filter(function (c) { return c.q <= Q_SOIL; })[0] || cw2[cw2.length - 1];
      out.crawlFtg = cf2.w / 12;
      chk('Crawlspace footing under the north wall', cf2.q, Q_SOIL, 'psf', cf2.w + ' in continuous footing, 8 in stem wall', 'IRC R403.1');
    }
    out.endBeams = eb;
    // the bedroom wing partition on B2 (X 22 to 32) carries the loft-ready ceiling joists either side of it
    var yW = G.FF + g.ceil + g.dw, ZhW = (yW + g.cj + 0.02 - G.rb(0)) / g.rise, wTrib = (bz[1] - 10.0) / 2 + (24 - t6 - 0.146 - bz[1]) / 2;
    var wingD = 10 * wTrib + 8 * g.ceil, wingL = 30 * wTrib;
    var lines = [];
    var flSec = SEC.LVL12x3;
    (crawl ? [1] : [0, 1, 2]).forEach(function (li) {
      var wl = { D: lineWall[li].D + trib[li] * Df + 8, L: trib[li] * Lf, S: lineWall[li].S };
      // point loads at each end from the end beams framing in from the north and south
      function pts(kind) {
        var P = [];
        eb.forEach(function (e) {
          var at = (Math.abs(e.za - bz[li]) < 0.01 || Math.abs(e.zb - bz[li]) < 0.01);
          if (at) P.push({ x: e.side === 'west' ? 0.15 : 31.85, P: e.R[kind] });
        });
        return P;
      }
      var res = {};
      ['D', 'L', 'S'].forEach(function (k) { var ws = [{ a: 0, b: 32, w: wl[k] }]; if (li === 1 && k !== 'S') ws.push({ a: 22, b: 32, w: k === 'D' ? wingD : wingL }); res[k] = beam(0, 32, px, ws, pts(k), flSec.EI); });
      var piers = px.map(function (x, i) {
        var rD = res.D.R[i].R, rL = res.L.R[i].R, rS = res.S.R[i].R;
        return { x: x, z: bz[li], D: rD, L: rL, S: rS, P: Math.max(rD + rL, rD + rS, rD + 0.75 * rL + 0.75 * rS) };
      });
      var Mmax = Math.max(res.D.M + res.L.M, res.D.M + res.S.M, res.D.M + 0.75 * (res.L.M + res.S.M));
      var Pmax = piers.reduce(function (m, p) { return Math.max(m, p.P); }, 0);
      var f = footing(Pmax, depth, tube);
      lines.push({ i: li, z: bz[li], w: wl, piers: piers, M: Mmax, Pmax: Pmax, ftg: f });
      chk('Floor beam B' + (li + 1) + ': bending', Mmax, flSec.M, 'ft-lb', flSec.n + ', continuous over piers at ' + E.ftIn(px[1] - px[0]), 'NDS');
      chk('Beam B' + (li + 1) + ' bearing on the pier caps', Pmax / (5.25 * 9), 750, 'psi', 'Cap seat 5 1/4 x 9 in under the beam, LVL perpendicular-to-grain 750 psi', 'Maker');
      chk('Piers on beam B' + (li + 1) + ': footing', (Pmax + f.W) / f.area, Q_SOIL, 'psf', 'Heaviest pier ' + Math.round(Pmax).toLocaleString('en-US') + ' lb on a ' + (f.round ? f.dia + ' in round' : E.ftIn(f.side) + ' square') + ' footing', 'IRC R403.1');
    });
    out.lines = lines;

    /* bedroom wing ceiling (loft-ready): 2x10 joists at 16 in on the wing partitions, a 2-ply 2x10 flush header
       where the rafters come down near the north wall, short stubs north of it. Storage loft 30 psf (IRC R301.5). */
    var Dc = 10, Lc = 30, cjS = 16 / 12, yc0 = G.FF + g.ceil + g.dw, Zh = (yc0 + g.cj + 0.02 - G.rb(0)) / g.rise, zWall = 10.0, zB2 = bz[1];
    var cjSpans = [zWall - (Zh + 0.25), zB2 - zWall, 24 - t6 - 0.146 - zB2], cjL = Math.max.apply(null, cjSpans);
    var cjM = (Dc + Lc) * cjS * cjL * cjL / 8, cjD = 5 * (Lc * cjS / 12) * Math.pow(cjL * 12, 4) / (384 * 1.385e8);
    chk('Ceiling joists over the bedroom wing (loft floor)', cjM, 1716 * 1.15, 'ft-lb', '2x10 SPF No. 2 at 16 in o.c., longest span ' + E.ftIn(cjL) + ', 30 psf storage + 10 psf dead; live deflection ' + cjD.toFixed(2) + ' in (L/' + Math.round(cjL * 12 / cjD) + ')', 'NDS, IRC R301.5');
    var chW = (Dc + Lc) * ((zWall - Zh) / 2 + Zh / 2), chL = 31.54 - 22.15, chM = chW * chL * chL / 8, chD = 5 * (Lc / (Dc + Lc) * chW / 12) * Math.pow(chL * 12, 4) / (384 * SEC['2x10x2'].EI);
    chk('Ceiling header near the north wall', chM, SEC['2x10x2'].M, 'ft-lb', '2-ply 2x10 SPF No. 2 in hangers, ' + E.ftIn(chL) + ' span, ' + Math.round(chW) + ' plf; live deflection ' + chD.toFixed(2) + ' in (L/' + Math.round(chL * 12 / chD) + ')', 'NDS');
    out.ceiling = { Zh: Zh, spans: cjSpans, header: { w: chW, span: chL } };

    /* floor joists between the flush beams. The partition at Z 10 crosses the long north bay and brings the
       wing ceiling down as a line load. The lightest I-joist series that passes is used. */
    var IJF = [{ id: 'TJI 210', M: 3795, V: 1655, EI: 330e6 }, { id: 'TJI 230', M: 4215, V: 1655, EI: 375e6 }, { id: 'TJI 360', M: 6180, V: 1705, EI: 501e6 }];
    var fbw = g.beamW, jz0 = crawl ? g.rim : fbw, jz1 = bz[1] - fbw / 2, js = g.oc, wallP = { D: (Dc * ((zWall - Zh) / 2 + (zB2 - zWall) / 2) + 8 * g.ceil) * js, L: Lc * ((zWall - Zh) / 2 + (zB2 - zWall) / 2) * js };
    var fj = null;
    IJF.some(function (sec) {
      var Lsp = jz1 - jz0, xw = zWall - jz0;
      var rD = beam(0, Lsp, [0, Lsp], [{ a: 0, b: Lsp, w: Df * js }], [{ x: xw, P: wallP.D }], sec.EI);
      var rL = beam(0, Lsp, [0, Lsp], [{ a: 0, b: Lsp, w: Lf * js }], [{ x: xw, P: wallP.L }], sec.EI);
      var Mx = rD.M + rL.M, Vx = rD.V + rL.V, dL = rL.d * 1.15, dT = (rD.d + rL.d) * 1.15; // +15% for I-joist shear deformation
      fj = { sec: sec, span: Lsp, M: Mx, V: Vx, dL: dL, dT: dT };
      return Mx <= sec.M && Vx <= sec.V && dL <= Lsp * 12 / 480 && dT <= Lsp * 12 / 240;
    });
    out.floorJoist = { id: fj.sec.id, n: '11 7/8 in I-joist, ' + fj.sec.id + ' or equal, at 16 in o.c.', span: fj.span };
    chk('Floor joists: bending', fj.M, fj.sec.M, 'ft-lb', out.floorJoist.n + ', clear span ' + E.ftIn(fj.span) + ', 40 psf live, ' + Df + ' psf dead, plus the bedroom partition and loft at ' + E.ftIn(zWall), 'Maker, IRC R301.5');
    chk('Floor joists: shear', fj.V, fj.sec.V, 'lb', '', 'Maker');
    chk('Floor joists: live-load deflection', fj.dL, fj.span * 12 / 480, 'in', 'L/480 used (IRC asks L/360); stiffer floor for tile and plank', 'IRC R301.7');

    /* covered area: beam on posts under the cover rafters */
    if (CV && cov) {
      var cw = { D: cov.RaD, S: cov.Ra - cov.RaD }, xb0 = GB ? GB.X1 + g.zip + g.siding + 0.04 : CV.x[0], xb1 = CV.x[1];
      var cps = CV.posts, cb = {};
      ['D', 'S'].forEach(function (k) { cb[k] = beam(xb0, xb1, cps, [{ a: xb0, b: xb1, w: cw[k] }], [], SEC.LVL12x3.EI); });
      var cbM = cb.D.M + cb.S.M, posts = cps.map(function (x, i) { return { x: x, D: cb.D.R[i].R, S: cb.S.R[i].R, P: cb.D.R[i].R + cb.S.R[i].R }; });
      var cPmax = posts.reduce(function (m, p) { return Math.max(m, p.P); }, 0), cle = G.rb(CV.z) - CV.beam[1] - 0.35;
      var col6 = column(5.5, 30.25, cle, 1000, 580000, 1.15), cf = footing(cPmax, depth, tube);
      out.cover = { x0: xb0, x1: xb1, w: cw, M: cbM, posts: posts, Pmax: cPmax, ftg: cf, postH: cle };
      chk('Covered-area beam: bending', cbM, SEC.LVL12x3.M * 1.15, 'ft-lb', SEC.LVL12x3.n + ' on posts at ' + cps.map(function (x) { return E.ftIn(x); }).join(', '), 'NDS');
      chk('Covered-area posts', cPmax, col6.P, 'lb', '6x6 Douglas fir-larch No. 1, ' + E.ftIn(cle) + ' tall', 'NDS 3.7');
      chk('Covered-area post footings', (cPmax + cf.W) / cf.area, Q_SOIL, 'psf', cf.dia + ' in round bell under a 12 in pier', 'IRC R403.1');
    }
    /* covered entry: beam on three posts; the east post stands just west of the house corner on its own footing */
    if (o.entryCover && gS) {
      var EN = M.entry, ew = { D: gS.RbD, S: gS.Rb - gS.RbD }, ex0 = EN.beam.x[0], ex1 = -(g.zip + g.siding + 0.04), eps = EN.posts8, ebR = {};
      ['D', 'S'].forEach(function (k) { ebR[k] = beam(ex0, ex1, eps, [{ a: ex0, b: ex1, w: ew[k] }], [], SEC.LVL16x3.EI); });
      var ebM = ebR.D.M + ebR.S.M, eposts = eps.map(function (x, i) { return { x: x, D: ebR.D.R[i].R, S: ebR.S.R[i].R, P: ebR.D.R[i].R + ebR.S.R[i].R }; });
      var ePmax = eposts.reduce(function (m, p) { return Math.max(m, p.P); }, 0), ele = G.rb(EN.beam.z - EN.beam.w / 2) - 0.09 - EN.beam.d - 0.35;
      var col8 = column(7.5, 56.25, ele, 1000, 580000, 1.15);
      eposts.forEach(function (p) { p.ftg = footing(p.P, depth, 18); });
      var qOf = function (p) { return (p.P + p.ftg.W) / p.ftg.area; }, efMax = eposts.reduce(function (m, p) { return qOf(p) > qOf(m) ? p : m; }, eposts[0]);
      out.entry = { x0: ex0, x1: ex1, w: ew, M: ebM, d: ebR.D.d + ebR.S.d, posts: eposts, Pmax: ePmax, postH: ele };
      chk('Covered-entry beam: bending', ebM, SEC.LVL16x3.M * 1.15, 'ft-lb', SEC.LVL16x3.n + ' on 8x8 posts at ' + eps.map(function (x) { return E.ftIn(x); }).join(', ') + '; it stops short of the house', 'NDS');
      chk('Covered-entry posts', ePmax, col8.P, 'lb', '8x8 Douglas fir-larch No. 1, ' + E.ftIn(ele) + ' tall', 'NDS 3.7');
      chk('Covered-entry post footings', (efMax.P + efMax.ftg.W) / efMax.ftg.area, Q_SOIL, 'psf', 'Worst: the post at ' + E.ftIn(efMax.x) + ', ' + (efMax.ftg.round ? efMax.ftg.dia + ' in round' : E.ftIn(efMax.ftg.side) + ' square') + ' footing under an 18 in pier', 'IRC R403.1');
    }
    /* garage: south wall headers between jack posts, garage footing */
    if (GB) {
      var gw = { D: gN.RbD, S: gN.Rb - gN.RbD };
      if (gS) { gw.D += gS.RaD; gw.S += gS.Ra - gS.RaD; }
      gw.D += 4 * 8; // wall above the clerestory
      out.walls.GS = gw;
      out.walls.GN = { D: gN.RaD + 9 * 8, S: gN.Ra - gN.RaD };
      out.garageHeader = function (op) {
        var span = op.u1 - op.u0 + 0.25, tot = gw.D + gw.S, Mx = tot * span * span / 8, Vx = tot * span / 2, sc = SEC.LVL12x3;
        var d = 5 * (tot / 12) * Math.pow(span * 12, 4) / (384 * sc.EI);
        chk('Garage header ' + op.id, Mx, sc.M * 1.15, 'ft-lb', sc.n + ', ' + E.ftIn(span) + ' span, ' + Math.round(tot) + ' plf, deflection ' + d.toFixed(2) + ' in', 'NDS');
        out.headers[op.id] = { id: op.id, wall: 'GS', span: span, w: tot, M: Mx, V: Vx, sec: 'LVL12x3', n: sc.n, ply: 3, lvl: true, R: Vx };
        return out.headers[op.id];
      };
      // garage footing: 20 in wide continuous; worst line is the south wall
      var gq = (gw.D + gw.S + 0.667 * 4 * CONC + 1.667 * 0.83 * CONC) / 1.667;
      chk('Garage south wall footing', gq, Q_SOIL, 'psf', '20 in continuous footing, 8 in stem wall; pads 2 ft 6 in square under the jack posts', 'IRC R403.1');
    }
    // post and jack bearing on a plate
    out.jackPost = function (P, treated) {
      var q = treated ? PLATE_PT : PLATE, need = P / q, ply = Math.max(3, Math.ceil(need / 5.5 / 1.75));
      return { ply: ply, w: ply * 1.75 / 12, area: ply * 1.75 * 5.5, q: P / (ply * 1.75 * 5.5) };
    };
    out.footing = footing; out.upliftCap = upliftCap; out.chk = chk;
    // smallest footing that holds an uplift T down with its weight, the soil over it and 0.6 x the dead load D on it
    out.upliftFooting = function (T, Dl, tubeD) {
      var f = null;
      FTG.some(function (dia) { var A = Math.PI * Math.pow(dia / 24, 2); f = { dia: dia, area: A, round: true, W: (A * 0.83 + Math.PI * Math.pow(tubeD / 24, 2) * (depth - 0.83)) * CONC }; return upliftCap(f, depth, tubeD) + 0.6 * Dl >= T; });
      if (upliftCap(f, depth, tubeD) + 0.6 * Dl >= T) return f;
      for (var sd = 3.5; sd < 12; sd += 0.5) { var A2 = sd * sd; f = { dia: sd * 12, side: sd, area: A2, round: false, W: (A2 * 1.0 + Math.PI * Math.pow(tubeD / 24, 2) * (depth - 1)) * CONC }; if (upliftCap(f, depth, tubeD) + 0.6 * Dl >= T) return f; }
      return f;
    };
    return out;
  };

  /* ---------- tall south wall: posts between the glass bays and the LSL studs ----------
     Out-of-plane wind (components and cladding) plus the roof load. The posts are braced only at the plates
     out of plane, so they buckle about the wall's depth over the full height. A 4-ply LSL post fits the wall
     but fails here, so the posts are steel tubes that fit inside the 2x6 wall with wood bucks for the windows.
     Studs: NDS 3.9.2 combined bending and compression. Posts: AISC 360 E3 and H1-1. */
  var HSS = { n: 'HSS 5 x 3 x 1/4 steel tube (A500 Gr C)', A: 3.37, Ix: 10.7, Zx: 5.28, rx: 1.78, ry: 1.21, Fy: 50, E: 29000 };
  E.members = function (C, G, OP) {
    var M = C.M, g = M.geo, SS = G.S, wS = SS.walls.S, H = G.rb(24) - G.FF, h = (G.roofTop(G.Z0) + G.roofTop(24 + g.eaveS)) / 2;
    var Kz = 2.01 * Math.pow(Math.max(15, h) / 900, 2 / 9.5), qh = 0.00256 * Kz * 0.85 * 115 * 115;
    var pU = qh * (0.9 + 0.18), pA = 0.6 * pU, pD = 0.42 * pU; // wall zone 4, GCp about 0.9 at 100 sq ft, plus internal 0.18
    var LSL = { Fb: 2325, Fc: 2050, E: 1.55e6, Emin: 787000 }, le = H * 12, out = { pU: pU, pA: pA, pD: pD, H: H };
    function lsl(b, d, P, wT) {
      var A = b * d, S = b * d * d / 6, I = b * d * d * d / 12, ld = le / d, FcE = 0.822 * LSL.Emin / (ld * ld);
      function Fcp(Cd) { var Fs = LSL.Fc * Cd, al = FcE / Fs, c = 0.9; return Fs * ((1 + al) / (2 * c) - Math.sqrt(Math.pow((1 + al) / (2 * c), 2) - al / c)); }
      var r1 = (P.D + P.S) / A / Fcp(1.15), fc = (P.D + 0.75 * P.S) / A, fb = 0.75 * pA * wT * H * H / 8 * 12 / S;
      var r2 = Math.pow(fc / Fcp(1.6), 2) + fb / (LSL.Fb * 1.6 * (1 - fc / FcE)), r3 = (pA * wT * H * H / 8 * 12 / S) / (LSL.Fb * 1.6);
      return { r: Math.max(r1, r2, r3), d: 5 * (pD * wT / 12) * Math.pow(le, 4) / (384 * LSL.E * I) };
    }
    // in the plane of the wall the posts are braced by the transoms between the stacked windows (bolted to tabs on the posts)
    var tiers = M.southBays.tiers, brace = [0].concat(tiers.slice(1).map(function (tr, j) { return (tiers[j][1] + tr[0]) / 2; })).concat([H]), kly = 0;
    for (var bi = 1; bi < brace.length; bi++) kly = Math.max(kly, brace[bi] - brace[bi - 1]);
    function fcr(kr) { var Fe = Math.PI * Math.PI * HSS.E / (kr * kr); return HSS.Fy / Fe <= 2.25 ? Math.pow(0.658, HSS.Fy / Fe) * HSS.Fy : 0.877 * Fe; }
    function hss(P, wT) {
      var Fcr = Math.min(fcr(le / HSS.rx), fcr(kly * 12 / HSS.ry));
      var Pc = Fcr * HSS.A / 1.67 * 1000, Mc = HSS.Fy * HSS.Zx / 1.67 * 1000 / 12; // lb, ft-lb
      function inter(Pr, Mr) { return Pr / Pc >= 0.2 ? Pr / Pc + 8 / 9 * Mr / Mc : Pr / (2 * Pc) + Mr / Mc; }
      var Mw = pA * wT * H * H / 8;
      var r = Math.max((P.D + P.S) / Pc, inter(P.D + 0.75 * P.S, 0.75 * Mw), inter(P.D, Mw));
      return { r: r, d: 5 * (pD * wT / 12) * Math.pow(le, 4) / (384 * HSS.E * 1000 * HSS.Ix), Pc: Pc };
    }
    var bays = OP.bays || [], posts = OP.posts || [], tot = wS.D + wS.S, fD = wS.D / tot, worst = null;
    posts.forEach(function (pp) {
      var u = (pp[0] + pp[1]) / 2, L = bays.filter(function (b) { return b[1] <= u + 0.5 && b[1] >= u - 1; })[0], Rb = bays.filter(function (b) { return b[0] >= u - 0.5 && b[0] <= u + 1; })[0];
      if (!L || !Rb) return;
      var sp = (L[1] - L[0] + 0.25) / 2 + (Rb[1] - Rb[0] + 0.25) / 2, P = tot * sp, trib = (L[1] - L[0]) / 2 + (Rb[1] - Rb[0]) / 2 + (pp[1] - pp[0]);
      if (!worst || P > worst.P) worst = { P: P, trib: trib };
    });
    if (worst) {
      var Pp = { D: worst.P * fD, S: worst.P * (1 - fD) }, hs = hss(Pp, worst.trib), wood = lsl(7, 5.5, Pp, worst.trib);
      out.post = { n: HSS.n, P: worst.P, trib: worst.trib, lslRatio: wood.r };
      SS.chk('Posts between the glass bays: snow plus wind', hs.r, 1, 'ratio', HSS.n + ', ' + E.ftIn(H) + ' tall, ' + Math.round(worst.P).toLocaleString('en-US') + ' lb roof load, wind ' + Math.round(pA) + ' psf on ' + E.ftIn(worst.trib) + ' of wall; transoms brace it in plane every ' + E.ftIn(kly) + ' or less. (A 4-ply LSL post would be at ' + Math.round(wood.r * 100) + '%)', 'AISC 360 E3, H1-1; ASCE 7 C&C');
      SS.chk('Posts between the glass bays: wind deflection', hs.d, le / 175, 'in', 'L/175 for the glass framing at 0.42 x the C&C wind', 'IRC Table R301.7');
    }
    // LSL studs in the south wall: 16 in o.c., closer if the snow load needs it
    var oc = g.oc, st;
    [g.oc, 1.0].some(function (s2) { oc = s2; st = lsl(1.75, 5.5, { D: wS.D * s2, S: wS.S * s2 }, s2); return st.r <= 1 && st.d <= le / 180; });
    out.studOC = oc;
    SS.chk('Tall wall studs (LSL): snow plus wind', st.r, 1, 'ratio', '1 3/4 x 5 1/2 LSL (1.55E) at ' + Math.round(oc * 12) + ' in o.c. in the south wall, ' + E.ftIn(H) + ' tall, ' + Math.round((wS.D + wS.S) * oc).toLocaleString('en-US') + ' lb roof load each, wind ' + Math.round(pA) + ' psf', 'NDS 3.9.2, ASCE 7 C&C');
    SS.chk('Tall wall studs (LSL): wind deflection', st.d, le / 180, 'in', 'L/180 at 0.42 x the C&C wind', 'IRC Table R301.7');
    // rafter-to-plate ties: wind uplift at the south (eave) bearing of the house rafters, roof zone 3 near the
    // edges with the overhang, effective area about one rafter (GCp about -1.6), less 0.6 x the roof dead load
    var rm = SS.rafters.main, trib = ((rm.b - rm.a) / 2 + (rm.z1 - rm.b)) / E.COS, sp = G.rs;
    var upl = (0.6 * qh * (1.6 + 0.18) - 0.6 * SS.Dr) * sp * trib;
    out.tieUplift = upl;
    // open roofs (covered area, covered entry): suction on top and wind under it lift the posts. Net = 0.6 x qh x 2.1
    // (canopy, GCp about -1.6 on top plus 0.5 under) less 0.6 x the open-roof dead load, on each post's share of roof
    var pOpen = 0.6 * qh * 2.1 - 0.6 * SS.Do, depth = g.frost;
    out.pOpen = pOpen;
    if (SS.cover) {
      var cw = null;
      SS.cover.posts.forEach(function (p) { p.U = pOpen * p.D / SS.Do; if (!cw || p.U > cw.U) cw = p; });
      if (SS.upliftCap(SS.cover.ftg, depth, 12) < cw.U) { var cf2 = SS.upliftFooting(cw.U, 0, 12); if (cf2.area > SS.cover.ftg.area) SS.cover.ftg = Object.assign(cf2, { q: (cw.P + cf2.W) / cf2.area }); }
      SS.cover.U = cw.U;
      SS.chk('Covered-area post footings: wind uplift', cw.U, SS.upliftCap(SS.cover.ftg, depth, 12), 'lb', 'About ' + Math.round(pOpen) + ' psf net on the open roof; ' + Math.round(cw.U).toLocaleString('en-US') + ' lb at the worst post, held by its footing and the soil over it. Post base and beam cap rated at least this much', 'ASCE 7 (0.6D + 0.6W)');
    }
    if (SS.entry) {
      var ew = null;
      SS.entry.posts.forEach(function (p) {
        p.U = pOpen * p.D / SS.Do;
        if (SS.upliftCap(p.ftg, depth, 18) < p.U) { var ef2 = SS.upliftFooting(p.U, 0, 18); if (ef2.area > p.ftg.area) p.ftg = ef2; }
        if (!ew || p.U / SS.upliftCap(p.ftg, depth, 18) > ew.U / SS.upliftCap(ew.ftg, depth, 18)) ew = p;
      });
      SS.entry.U = ew.U;
      SS.chk('Covered-entry post footings: wind uplift', ew.U, SS.upliftCap(ew.ftg, depth, 18), 'lb', 'About ' + Math.round(pOpen) + ' psf net on the open roof; ' + Math.round(ew.U).toLocaleString('en-US') + ' lb at the post at ' + E.ftIn(ew.x) + ', held by its footing and the soil over it', 'ASCE 7 (0.6D + 0.6W)');
    }
    SS.chk('Rafter ties: wind uplift', Math.max(0, upl), 455, 'lb', 'Net uplift at the eave bearing about ' + Math.round(Math.max(0, upl)) + ' lb per rafter (' + Math.round(0.6 * qh * 1.78) + ' psf suction less 0.6 x dead load); tie rated about 455 lb (H2.5A-type, SPF)', 'ASCE 7 C&C, IRC R802.11');
    return out;
  };

  /* ---------- wind bracing ----------
     Wind: ASCE 7-16 directional method, enclosed, 115 mph, Exposure C, Kd 0.85, Kzt 1, gust 0.85,
     windward 0.8 plus leeward 0.5, times 0.6 for ASD, on the area the building shows to the wind. A flexible roof
     diaphragm hands each strip of that load to the wall lines on either side. Each line's shear walls are its
     full-height solid panels (and, where needed, panels that run past a window with straps: force transfer
     around openings). Sheathing and nailing step up until the line carries its load. */
  // Shear wall types in steps of strength. ASD wind values (nominal / 2) times 0.92 for SPF framing (SDPWS 4.3A).
  // ZIP System R-6 per its code report (ESR-3373): 0.131 x 3 in nails so they reach 1 1/2 in into the stud
  // through the foam, panels no taller than twice their length, and no force transfer around openings.
  // Unlike faces combine as the larger of twice the weaker face or the stronger face (SDPWS 4.3.3.2).
  var SPF = 0.92, ZR4 = 322 * SPF, ZR3 = 357 * SPF, W15 = { 4: 1065 / 2 * SPF, 3: 1370 / 2 * SPF }, W716 = { 6: 645 / 2 * SPF, 4: 940 / 2 * SPF, 3: 1205 / 2 * SPF, 2: 1580 / 2 * SPF };
  var LEVELS = [
    { house: { id: 'SW-A', v: ZR4, zip: true, t: 'ZIP System R-6, 0.131 x 3 in nails at 4 in on the panel edges, 12 in in the field, blocked' },
      garage: { id: 'GW-A', v: W716[6], t: '7/16 ZIP sheathing outside, 8d nails at 6 in on the edges, 12 in in the field, blocked' } },
    { house: { id: 'SW-B', v: ZR3, zip: true, t: 'ZIP System R-6, 0.131 x 3 in nails at 3 in on the panel edges, 12 in in the field, blocked' },
      garage: { id: 'GW-B', v: 2 * W716[4], t: '7/16 ZIP outside and the 7/16 OSB lining inside, both 8d at 4 in on the edges, blocked' } },
    { house: { id: 'SW-C', v: Math.max(2 * ZR4, W15[4]), inside: true, t: 'SW-A outside plus 15/32 rated sheathing on the inside face, 8d at 4 in on the edges, blocked (drywall over it)' },
      garage: { id: 'GW-C', v: 2 * W716[3], t: '7/16 ZIP outside and the OSB lining inside, both 8d at 3 in on the edges, blocked' } },
    { house: { id: 'SW-D', v: Math.max(2 * ZR3, W15[3]), inside: true, t: 'SW-B outside plus 15/32 rated sheathing on the inside face, 8d at 3 in on the edges, blocked' },
      garage: { id: 'GW-D', v: 2 * W716[2], t: 'Both faces 8d at 2 in on the edges, blocked, 3x studs at panel edges' } }
  ];
  // hold-downs: Simpson HDU allowable tension on SPF (3 in end post), anchor rod diameter, end post plies at least
  var HDS = [['HDU2', 2215, '5/8', 2], ['HDU4', 3285, '5/8', 2], ['HDU5', 4340, '5/8', 2], ['HDU8', 5820, '7/8', 2], ['HDU11', 6865, '1', 3], ['HDU14', 10350, '1', 4]];
  var STRAPS = [['CS16', 1705], ['CMST14', 6490], ['CMST12', 9215]];
  E.SHEAR = LEVELS; E.HDS = HDS;
  E.lateral = function (C, G, OP, GR) {
    var M = C.M, o = C.o, g = M.geo, FF = G.FF, SS = G.S, t6 = g.t6, out = { lines: [], checks: [] };
    var Z0 = G.Z0, Z1 = 24 + g.eaveS, band = G.stackT;
    var h = (G.roofTop(Z0) + G.roofTop(Z1)) / 2, z = Math.max(15, h), Kz = 2.01 * Math.pow(z / 900, 2 / 9.5);
    var qz = 0.00256 * Kz * 1.0 * 0.85 * 115 * 115, p = 0.6 * qz * 0.85 * 1.3;
    out.h = h; out.Kz = Kz; out.qz = qz; out.p = p;
    var ys = GR ? GR.ys : 0, GB = GR, X0g = GR ? GR.X0 : 0;
    // strip heights the wind sees
    function hNS(x) {
      if (x >= -g.rake && x <= 32 + g.rake) return G.roofTop(Z1);
      if (GR && x >= GR.X0 - g.rake && x < -g.rake) return GR.entry ? G.roofTop(GR.Z1) + band : G.roofTop(GR.RZ1);
      return 0;
    }
    function encl(zz) { return (zz >= 0 && zz <= 24) || (GR && zz >= GR.Z0 && zz <= GR.Z1); }
    function hEW(zz) { return encl(zz) ? G.roofTop(zz) : (zz >= Z0 && zz <= Z1 ? band : 0); }
    function integ(f, a, b, n) { n = n || 200; var s2 = 0, d = (b - a) / n; for (var i = 0; i < n; i++) { var x = a + (i + 0.5) * d; s2 += f(x) * d; } return s2; }
    // N-S wind: lines along X at the garage west wall, the house west wall and the house east wall
    var xs0 = GR ? GR.X0 - g.rake : -g.rake, NS = {};
    if (GR) {
      NS.GW = integ(function (x) { return p * hNS(x) * Math.min(1, (0 - x) / 24); }, xs0, 0);
      NS.HW = integ(function (x) { return p * hNS(x) * Math.max(0, (x - GR.X0) / 24); }, xs0, 0) + integ(function (x) { return p * hNS(x) * Math.max(0, (32 - x) / 32); }, 0, 32 + g.rake);
    } else NS.HW = integ(function (x) { return p * hNS(x) * Math.max(0, Math.min(1, (32 - x) / 32)); }, -g.rake, 32 + g.rake);
    NS.HE = integ(function (x) { return p * hNS(x) * Math.max(0, Math.min(1, x / 32)); }, -g.rake, 32 + g.rake) - (GR ? 0 : 0);
    // E-W wind: where the garage and house overlap (Z 0 to 8.5) the garage takes the windward share
    var EW = {}, sh = function (zz) { return (GR && zz >= 0 && zz <= GR.Z1) ? 0.6 : 1; };
    if (GR) {
      var gz0 = GR.Z0, gz1 = GR.Z1, gspan = gz1 - gz0;
      var wg = function (zz) { return p * hEW(zz) * (zz < 0 ? 1 : zz <= gz1 ? 0.6 : 0) + (zz > gz1 && GR.entry ? p * band : 0); };
      EW.GN = integ(function (zz) { return wg(zz) * Math.max(0, Math.min(1, (gz1 - zz) / gspan)); }, GR.RZ0, GR.RZ1);
      EW.GS = integ(function (zz) { return wg(zz) * Math.max(0, (zz - gz0) / gspan); }, GR.RZ0, GR.RZ1);
    }
    var wh = function (zz) { return GR ? (zz < 0 ? (GR.Z0 <= zz ? 0 : p * band) : p * hEW(zz) * (zz <= GR.Z1 ? 0.4 : 1)) : p * hEW(zz); };
    EW.HN = integ(function (zz) { return wh(zz) * Math.max(0, Math.min(1, (24 - zz) / 24)); }, Z0, Z1);
    EW.HS = integ(function (zz) { return wh(zz) * Math.max(0, Math.min(1, zz / 24)); }, Z0, Z1);
    out.NS = NS; out.EW = EW;
    out.totalNS = Object.keys(NS).reduce(function (a, k) { return a + NS[k]; }, 0);
    out.totalEW = Object.keys(EW).reduce(function (a, k) { return a + EW[k]; }, 0);

    // wall lines: extent along the line, base height, wall top height, openings, dead load per foot
    function wl(id, name, axis, c, walls, kind, wD, dir) { return { id: id, name: name, axis: axis, c: c, walls: walls, kind: kind, wD: wD, dir: dir }; }
    var ops = OP.ops, sides = SS.walls, anchors = [];
    var lines = [];
    lines.push(wl('HN', 'House north wall', 'x', 0, [{ a: 0, b: 32, base: FF, top: function () { return G.rb(0); }, ops: ops.N }], 'house', sides.N.D, 'EW'));
    lines.push(wl('HS', 'House south wall', 'x', 24, [{ a: 0, b: 32, base: FF, top: function () { return G.rb(24); }, ops: ops.S }], 'house', sides.S.D, 'EW'));
    lines.push(wl('HE', 'House east wall', 'z', 32, [{ a: 0, b: 24, base: FF, top: G.rb, ops: ops.E }], 'house', sides.E.D, 'NS'));
    var hw = [{ a: 0, b: 24, base: FF, top: G.rb, ops: ops.W }];
    if (GR) hw.push({ a: GR.Z0, b: -(g.zip + g.siding), base: ys, top: G.rb, ops: [], garage: true });
    lines.push(wl('HW', GR ? 'House west wall and the garage east wall' : 'House west wall', 'z', 0, hw, 'house', sides.W.D, 'NS'));
    if (GR) {
      lines.push(wl('GW', 'Garage west wall', 'z', GR.X0, [{ a: GR.Z0, b: GR.Z1, base: ys, top: G.rb, ops: GR.ops.W }], 'garage', 120, 'NS'));
      lines.push(wl('GN', 'Garage north wall', 'x', GR.Z0, [{ a: GR.X0, b: GR.X1, base: ys, top: function () { return G.rb(GR.Z0); }, ops: GR.ops.N }], 'garage', SS.walls.GN.D, 'EW'));
      lines.push(wl('GS', 'Garage south wall', 'x', GR.Z1, [{ a: GR.X0, b: GR.X1 - 0.2, base: ys, top: function () { return G.rb(GR.Z1); }, ops: GR.ops.S }], 'garage', SS.walls.GS.D, 'EW'));
    }
    // solid runs between openings; windows with wall above and below may be bridged (force transfer around openings)
    function runs(w, ftao) {
      var hh = function (u) { return w.top(u) - w.base; }, list = (w.ops || []).map(function (q) {
        var ht = hh((q.u0 + q.u1) / 2), bridge = !q.door && !q.bay && q.v0 > 1.5 && (q.base === undefined) && (w.base + q.v1) < w.top((q.u0 + q.u1) / 2) - 1.0 && q.u1 - q.u0 <= 8.5;
        return { u0: q.u0 - 0.31, u1: q.u1 + 0.31, bridge: bridge && ftao, id: q.id, ht: ht };
      }).sort(function (a, b) { return a.u0 - b.u0; });
      // a window framed over a door is part of the door's opening
      var merged = [];
      list.forEach(function (q) { var l = merged[merged.length - 1]; if (l && q.u0 < l.u1) { l.u1 = Math.max(l.u1, q.u1); l.bridge = l.bridge && q.bridge; } else merged.push(Object.assign({}, q)); });
      // a run starts after a door or tall glass and carries on past bridgeable windows
      var segs = [], a = w.a, wins = [];
      merged.forEach(function (q) {
        if (q.bridge) { wins.push(q.id); return; }
        if (q.u0 - a > 0.05) segs.push({ a: a, b: q.u0, wins: wins });
        a = q.u1; wins = [];
      });
      if (w.b - a > 0.05) segs.push({ a: a, b: w.b, wins: wins });
      return segs.filter(function (sg) { return sg.b - sg.a > 1.0; }).map(function (sg) {
        var L = sg.b - sg.a, H = (hh(sg.a) + hh(sg.b)) / 2, r = H / L, f = r <= 2 ? 1 : r <= 3.5 ? 2 * L / H : 0;
        return { a: sg.a, b: sg.b, L: L, h: H, ratio: r, f: f, ftao: sg.wins.length > 0, wins: sg.wins, base: w.base, garage: !!w.garage, top: w.top };
      });
    }
    function aspect(sg, ty) { return sg.ratio <= 2 ? 1 : ty.zip ? 0 : sg.ratio <= 3.5 ? 2 * sg.L / sg.h : 0; }
    var gAnch = [];
    lines.forEach(function (ln) {
      var V = ln.dir === 'NS' ? (NS[ln.id] || 0) : (EW[ln.id] || 0), pick = null;
      function tyOf(lv, sg) { return ln.kind === 'garage' || sg.garage ? lv.garage : lv.house; }
      // plain panels first at each step, then panels that bridge windows (only where an inside panel carries the straps)
      [false, true].forEach(function (ftao) {
        for (var li = 0; li < LEVELS.length && !pick; li++) {
          var lv = LEVELS[li], segs = [];
          ln.walls.forEach(function (w) { segs = segs.concat(runs(w, ftao && !!lv.house.inside)); });
          segs.forEach(function (sg) { sg.ty = tyOf(lv, sg); sg.f = aspect(sg, sg.ty); });
          var cap = segs.reduce(function (a, sg) { return a + sg.ty.v * sg.f * sg.L; }, 0), Le = segs.reduce(function (a, sg) { return a + sg.L * sg.f; }, 0);
          if (cap >= V || (li === LEVELS.length - 1 && ftao)) pick = { lv: lv, type: ln.kind === 'garage' ? lv.garage : lv.house, segs: segs, Le: Le, cap: cap, ftao: ftao && segs.some(function (sg) { return sg.ftao; }) };
        }
      });
      var Ltot = ln.walls.reduce(function (a, w) { return a + (w.b - w.a); }, 0), wS = ({ HN: sides.N, HS: sides.S, HE: sides.E, HW: sides.W, GN: SS.walls.GN, GS: SS.walls.GS }[ln.id] || { S: 0 }).S;
      pick.segs.forEach(function (sg) {
        // shear shares out by strength; uplift and end-post compression at each end of the panel
        var vs = pick.cap > 0 ? V * sg.ty.v * sg.f / pick.cap : 0, Tw = vs * sg.h, T = Tw - 0.3 * ln.wD * sg.L, hd = null;
        if (T > 0) for (var k = 0; k < HDS.length; k++) if (HDS[k][1] >= T) { hd = HDS[k]; break; }
        if (T > 0 && !hd) hd = HDS[HDS.length - 1];
        var Cc = Math.max(Tw + 1.333 * ln.wD, 0.75 * Tw + 1.333 * (ln.wD + 0.75 * wS)), tall = sg.h > 12, Fcp = 425 * 1.5 * 5.5, plies = hd ? hd[3] : 2;
        function colCap(n) { var A = n * 1.5 * 5.5, ld = Math.min(sg.h, 20) * 12 / 5.5, Em = tall ? 787000 : 510000, Fc = (tall ? 2050 : 1265) * 1.6, al = 0.822 * Em / (ld * ld) / Fc, c = tall ? 0.9 : 0.8; return A * Fc * ((1 + al) / (2 * c) - Math.sqrt(Math.pow((1 + al) / (2 * c), 2) - al / c)); }
        while (plies < 4 && (Cc > plies * Fcp || Cc > colCap(plies))) plies++;
        sg.v = vs; sg.T = Math.max(0, T); sg.Tw = Tw; sg.C = Cc; sg.post = plies + '-ply ' + (tall ? 'LSL' : '2x6') + ' end post';
        sg.hd = T > 0 ? hd[0] : 'none needed'; sg.rod = T > 0 ? hd[2] : ''; sg.hdCap = T > 0 ? hd[1] : 0;
        if (T > 0) SS.chk('Hold-down ' + ln.id + ' at ' + E.ftIn(sg.a) + ' to ' + E.ftIn(sg.b), T, hd[1], 'lb', hd[0] + ' on a ' + sg.post + ' (SPF value), ' + hd[2] + ' in rod', 'Simpson, SDPWS 4.3.6.4');
        SS.chk('End post ' + ln.id + ' at ' + E.ftIn(sg.a) + ' to ' + E.ftIn(sg.b), Cc, Math.min(plies * Fcp, colCap(plies)), 'lb', sg.post + ': chord compression bearing on the plate (SPF 425 psi) and buckling over ' + E.ftIn(sg.h), 'NDS 3.7, 3.10');
        // the interior panel goes on the house's inside face; the garage wall is lined with OSB already
        if (ln.kind === 'house' && sg.ty.inside && !sg.garage) {
          // inside face, between the inside faces of the cross walls, up to the top plates (sloped on the end walls)
          var lim = ln.axis === 'x' ? [t6, 32 - t6] : [t6, 24 - t6], ua = Math.max(sg.a, lim[0]), ub = Math.min(sg.b, lim[1]);
          E.skin(C, 'WAL-SHEAR', ln.axis, ln.c === 24 ? 24 : ln.c === 32 ? 32 : 0, ln.c > 16 ? -1 : 1, t6, t6 + 0.04,
            [[ua, sg.base + 0.13], [ub, sg.base + 0.13], [ub, sg.top(ub) - 0.3], [ua, sg.top(ua) - 0.3]], [], { side: ln.id.slice(1), n: 'Interior shear panel, ' + sg.ty.id + ' (' + ln.name + ')' });
        }
        // house panels: the anchor rod runs down through the floor framing into a pier (resolved below)
        if (T > 0 && ln.kind === 'house' && !sg.garage && o.found === 'piers') [sg.a + 0.2, sg.b - 0.2].forEach(function (u) { anchors.push({ id: ln.id, dir: ln.dir, u: u, T: T, hd: sg.hd }); });
        if (T > 0 && (sg.base < FF - 0.5 || o.found !== 'piers')) [sg.a + 0.15, sg.b - 0.15].forEach(function (u) { gAnch.push({ id: ln.id, dir: ln.dir, x: ln.axis === 'x' ? u : (sg.garage ? GR.X1 - t6 / 2 : ln.c), z: ln.axis === 'x' ? ln.c : u, T: T, garage: sg.base < FF - 0.5 }); });
        // on the inside face of the wall, at the end stud of the panel
        if (T > 0) [sg.a + 0.2, sg.b - 0.2].forEach(function (u) {
          var y0 = sg.base + 0.13, inward = { HN: 1, HS: -1, HE: -1, HW: sg.garage ? -1 : 1, GW: 1, GN: 1, GS: -1 }[ln.id];
          var face = ln.id === 'GS' ? ln.c - t6 : ln.id === 'GN' ? ln.c + t6 : (sg.garage ? -t6 : ln.c + inward * t6);
          if (ln.id === 'GW') face = ln.c + t6;
          var w0 = inward > 0 ? face - 0.19 : face + 0.03; // inside the stud cavity, against the end post
          var px = ln.axis === 'x' ? u - 0.08 : w0, pz = ln.axis === 'x' ? w0 : u - 0.08;
          C.box('FND-HD', px, y0, pz, 0.16, 1.0, 0.16, { n: 'Hold-down ' + sg.hd + ', ' + ln.name });
        });
      });
      var drag = V * Math.max(0, 1 - pick.segs.reduce(function (a, sg) { return a + sg.L; }, 0) / Ltot), strap = null;
      for (var k2 = 0; k2 < STRAPS.length; k2++) if (STRAPS[k2][1] >= drag) { strap = STRAPS[k2]; break; }
      // base shear transfer under each panel: screws through the plate into the floor framing, or anchor bolts into concrete
      var bases = {}, vmax = 0;
      pick.segs.forEach(function (sg) {
        if (!(sg.f > 0)) return;
        vmax = Math.max(vmax, sg.v);
        var onConc = ln.kind === 'garage' || sg.garage || o.found !== 'piers', Zb = onConc ? 896 : 330;
        var sp = Math.max(4, Math.min(onConc ? 48 : 16, Math.floor(Zb / Math.max(sg.v, 1) * 12 / 2) * 2));
        sg.base = onConc ? '5/8 in anchor bolts at ' + sp + ' in, 3 x 3 x 0.229 in plate washers' : '1/4 x 6 in structural screws at ' + sp + ' in into the beam or rim';
        sg.baseSp = sp; sg.baseZ = Zb;
        var key = onConc ? 'c' : 'w'; if (!bases[key] || sp < bases[key].sp) bases[key] = { sp: sp, t: sg.base, Z: Zb, v: sg.v };
      });
      var base = Object.keys(bases).map(function (k2) { return bases[k2].t; }).join('; ');
      Object.keys(bases).forEach(function (k2) { var b = bases[k2]; SS.chk('Wall base shear, ' + ln.name + (Object.keys(bases).length > 1 ? (k2 === 'c' ? ' (on concrete)' : ' (on the floor)') : ''), b.v * b.sp / 12, b.Z, 'lb', b.t + (k2 === 'c' ? ' (5/8 in bolt in a 2x SPF sill, wind)' : ' (1/4 in screw in SPF, wind; confirm with the screw maker)'), 'NDS 12'); });
      var gpart = pick.segs.filter(function (sg) { return sg.garage; }).reduce(function (a, sg) { return a + sg.v * sg.L; }, 0);
      var res = { id: ln.id, name: ln.name, dir: ln.dir, V: V, Vfloor: V - gpart, type: pick.type, lv: pick.lv, segs: pick.segs, Le: pick.Le, cap: pick.cap, v: vmax, ftao: pick.ftao, drag: drag, strap: strap ? strap[0] : 'engineer', L: Ltot, base: base };
      out.lines.push(res);
      SS.chk('Wind bracing, ' + ln.name, V, pick.cap, 'lb', pick.type.id + (pick.ftao ? ' with force transfer around the windows' : '') + ': ' + (function (n) { return n + (n === 1 ? ' panel, ' : ' panels, '); })(pick.segs.filter(function (sg) { return sg.f > 0; }).length) + E.ftIn(pick.Le) + ' effective, up to ' + Math.round(vmax) + ' plf', 'SDPWS 4.3, ASCE 7');
    });
    out.gAnch = gAnch; G.gAnch = gAnch;
    // hold-downs into a continuous footing: the stem wall works as a beam and lifts up to 8 ft of itself each way
    // (2 #4 top and bottom); 0.6 x (footing, stem wall and the soil on the footing ledges) plus a thickened pad
    var worstG = null;
    gAnch.forEach(function (a) {
      var R0 = a.garage ? [GR.X0, GR.X1, GR.Z0, GR.Z1] : [0, 32, 0, 24], top = a.garage ? GR.ys : G.beamBot, fw = a.garage ? 1.667 : (SS.crawlFtg || 1.667);
      var wpf = (fw * 0.83 + 0.667 * (top + g.frost - 0.83)) * CONC + (fw - 0.667) * (g.frost - 0.83) * SOIL;
      var onX = Math.abs(a.z - R0[2]) < 1 || Math.abs(a.z - R0[3]) < 1, onZ = Math.abs(a.x - R0[0]) < 1 || Math.abs(a.x - R0[1]) < 1, L = 0;
      if (onX) L += Math.min(8, a.x - R0[0]) + Math.min(8, R0[1] - a.x);
      if (onZ) L += Math.min(8, a.z - R0[2]) + Math.min(8, R0[3] - a.z);
      // a thickened pad under the hold-down when the footing alone falls short (or the uplift is over 4,000 lb)
      var cap = 0.6 * wpf * L, pads = [[3, 0.5], [4, 1.0], [5, 1.0], [6, 1.0]], pd = null;
      for (var k = 0; k < pads.length && (cap + (pd ? 0.6 * pd[0] * pd[0] * pd[1] * CONC : 0) < a.T || (!pd && a.T > 4000)); k++) pd = pads[k];
      if (pd) { cap += 0.6 * pd[0] * pd[0] * pd[1] * CONC; C.box(a.garage ? 'GAR-CONC' : 'FND-CRAWL', a.x - pd[0] / 2, -g.frost - pd[1], a.z - pd[0] / 2, pd[0], pd[1], pd[0], { n: 'Thickened footing under a hold-down, ' + E.ftIn(pd[0]) + ' square, ' + Math.round(pd[1] * 12) + ' in deeper', nq: true }); }
      var r = a.T / cap;
      a.L = L; a.cap = cap; a.pad = pd;
      if (!worstG || r > worstG.r) worstG = { r: r, a: a };
    });
    if (worstG) SS.chk('Hold-downs into the ' + (worstG.a.garage ? 'garage' : 'crawlspace') + ' footing', worstG.a.T, worstG.a.cap, 'lb', 'Worst at ' + E.ftIn(worstG.a.x) + ', ' + E.ftIn(worstG.a.z) + ': ' + E.ftIn(worstG.a.L) + ' of footing and stem wall engaged (2 #4 top and bottom), 0.6 x its weight and the soil on it', 'ASCE 7 (0.6D + 0.6W), ACI 318');
    /* hold-down anchorage on the pier foundation. North and south walls sit on beams B1 and B3: the rod goes
       through the beam and the uplift shares out to the piers either side (uplift-rated caps). East and west
       walls sit on end beams hung between the floor beams, which cannot take it: there the rod goes into the
       nearest pier, or into a hold-down pier of its own whose footing, soil and dead load hold it down (0.6 D). */
    var bzs = M.structure.beamZ, pxs = M.structure.pierX, hdP = [], onPier = {};
    function addUp(li, j, dir, T) { var k = li + ':' + j; onPier[k] = onPier[k] || { li: li, j: j, NS: 0, EW: 0 }; onPier[k][dir] += T; }
    if (o.found === 'piers') anchors.forEach(function (a) {
      if (a.id === 'HN' || a.id === 'HS') {
        var li = a.id === 'HN' ? 0 : 2, x = a.u, j = 0;
        while (j < pxs.length - 2 && pxs[j + 1] < x) j++;
        if (x <= pxs[0]) addUp(li, 0, a.dir, a.T);
        else if (x >= pxs[pxs.length - 1]) addUp(li, pxs.length - 1, a.dir, a.T);
        else { var t = (x - pxs[j]) / (pxs[j + 1] - pxs[j]); addUp(li, j, a.dir, a.T * (1 - t)); addUp(li, j + 1, a.dir, a.T * t); }
      } else {
        var near = -1; bzs.forEach(function (z, i) { if (Math.abs(z - a.u) <= 1.0) near = i; });
        var jx = a.id === 'HW' ? 0 : pxs.length - 1;
        if (near >= 0) addUp(near, jx, a.dir, a.T);
        else hdP.push({ id: a.id, x: a.id === 'HW' ? 0.55 : 31.45, z: a.u, T: a.T, hd: a.hd }); // tube clear of the garage stem wall, rod inside it
      }
    });
    // existing piers: capacity = 0.6 x (dead load + footing + soil over it); a pier short of it gets a bigger footing
    Object.keys(onPier).forEach(function (k) {
      var e = onPier[k], L = SS.lines.filter(function (l) { return l.i === e.li; })[0]; if (!L) return;
      // the wall dead load is already in the hold-down force, so only the footing and the soil over it count here;
      // wind on both axes at 75 % at once (ASCE 7 Fig. 27.3-8, Case 3) where two walls' hold-downs share a pier
      var pr = L.piers[e.j], U = Math.max(e.NS, e.EW, 0.75 * (e.NS + e.EW)), f = L.ftg, cap = SS.upliftCap(f, g.frost, 12);
      if (cap < U) { var f2 = SS.upliftFooting(U, 0, 12); if (f2.area > f.area) { pr.upFtg = f2; cap = SS.upliftCap(f2, g.frost, 12); } }
      pr.U = U; pr.Uns = e.NS; pr.Uew = e.EW; pr.Ucap = cap;
    });
    hdP.forEach(function (h) { h.f = SS.upliftFooting(h.T, 0, 12); });
    G.hdPiers = hdP; out.hdPiers = hdP; out.onPier = onPier;
    var wU = null;
    Object.keys(onPier).forEach(function (k) { var e = onPier[k], pr = SS.lines.filter(function (l) { return l.i === e.li; })[0].piers[e.j]; if (!wU || pr.U / pr.Ucap > wU.U / wU.Ucap) wU = { U: pr.U, Ucap: pr.Ucap, x: pr.x, z: pr.z }; });
    if (wU) SS.chk('Hold-down uplift on the floor-beam piers', wU.U, wU.Ucap, 'lb', 'Worst pier at ' + E.ftIn(wU.x) + ', ' + E.ftIn(wU.z) + ': uplift-rated beam seat, footing and the soil over it (wall dead load is already in the hold-down force); wind Case 3 where two walls share a pier', 'ASCE 7 27.3.5, IRC R403.1');

    // roof diaphragm: the lower deck. Unit shear = line load over the depth of the roof that delivers it
    var dmax = 0;
    out.lines.forEach(function (ln) {
      var depth = ln.id === 'GW' || ln.id === 'GN' || ln.id === 'GS' ? (ln.dir === 'NS' ? (GR.Z1 - GR.Z0) : 24) : (ln.dir === 'NS' ? 24 : 32);
      dmax = Math.max(dmax, ln.V / depth);
    });
    var dia = dmax <= 187 ? ['unblocked', '8d at 6 in on supported edges, 12 in in the field', 187] : dmax <= 377 ? ['blocked', '8d at 6 in on all panel edges (blocking between rafters at the edges), 12 in in the field', 377] : ['blocked', '8d at 4 in on boundaries, 6 in on other edges, 12 in in the field', 505];
    out.diaphragm = { v: dmax, kind: dia[0], nail: dia[1], cap: dia[2] };
    SS.chk('Roof diaphragm (lower deck)', dmax, dia[2], 'plf', '5/8 in OSB, ' + dia[0] + ', ' + dia[1], 'SDPWS 4.2');
    // floor diaphragm (piers): the walls hand their base shear to the floor, which shares it out to every pier
    var nP = o.found === 'piers' ? M.structure.pierX.length * 3 + hdP.length : M.structure.pierX.length;
    if (o.found === 'piers') {
      var fv = 0;
      out.lines.forEach(function (ln) { if (/^H/.test(ln.id)) fv = Math.max(fv, ln.Vfloor / (ln.dir === 'NS' ? 24 : 32)); });
      // 23/32 in OSB subfloor, 10d nails, SDPWS Table 4.2A (19/32 values used), ASD wind x 0.92 for SPF framing
      var FD = [['unblocked, 10d at 6 in on supported edges, 12 in in the field', 475], ['blocked, 10d at 6 in on all edges', 595], ['blocked, 10d at 4 in on the boundaries, 6 in on other edges', 790], ['blocked, 10d at 2 1/2 in on the boundaries, 4 in on other edges', 1065]]
        .map(function (q) { return [q[0], q[1] / 2 * SPF]; });
      var fd = FD.filter(function (q) { return q[1] >= fv; })[0] || FD[FD.length - 1];
      out.floorDia = { v: fv, nail: fd[0], cap: fd[1] };
      SS.chk('Floor diaphragm (subfloor)', fv, fd[1], 'plf', '3/4 in OSB subfloor, glued, ' + fd[0] + ' (blocking between I-joists at panel edges where blocked)', 'SDPWS 4.2');
    }
    // piers: the house's share of the base shear, shared by every pier, bends them and pushes on the soil
    var Vh = Math.max(NS.HE + NS.HW * 0.5, EW.HN + EW.HS), Pp = Vh / nP, hP = G.beamBot;
    var mP = Pp * (hP + 2.0);
    // embedment, IBC 1807.3.2.1 (unrestrained at grade): lateral soil 150 psf per ft (Class 4), doubled for an isolated
    // pier, plus the footing's own resisting moment from 0.6 x (dead load + its weight) on its width
    function dReqOf(P) { var d = 3; for (var it = 0; it < 30; it++) { var S1 = 2 * 150 * d / 3, A = 2.34 * P / (S1 * 1.0); d = 0.5 * A * (1 + Math.sqrt(1 + 4.36 * hP / A)); } return d; }
    function pPass(d) { var lo = 0, hi = 5000; for (var it = 0; it < 40; it++) { var mid = (lo + hi) / 2; if (dReqOf(mid) > d) hi = mid; else lo = mid; } return lo; }
    var pCap = 1e9, pWhere = '';
    if (o.found === 'piers') SS.lines.forEach(function (L) {
      var Dmin = L.piers.reduce(function (m, q) { return Math.min(m, q.D); }, 1e9), f = L.ftg, B = f.round ? 0.8 * f.dia / 12 : f.side, N = 0.6 * (Dmin + f.W);
      var Mf = Math.max(0, N * (B / 2 - N / (2 * Q_SOIL * B))), c = pPass(g.frost) + Mf / (hP + g.frost);
      if (c < pCap) { pCap = c; pWhere = 'beam B' + (L.i + 1) + ' piers (' + (f.round ? f.dia + ' in round' : E.ftIn(f.side) + ' square') + ' footing)'; }
    });
    var dReq = dReqOf(Pp);
    out.piers = { V: Vh, n: nP, P: Pp, M: mP, cap: 9000, dReq: dReq, d: g.frost };
    if (o.found === 'piers') SS.chk('Piers in bending under wind', mP, 9000, 'ft-lb', '12 in round pier with 4 #4 bars, about 9,000 ft-lb allowable; ' + Math.round(Pp) + ' lb per pier at ' + E.ftIn(hP + 2) + ' to the point of fixity', 'ACI 318, estimate');
    if (o.found === 'piers') SS.chk('Piers: lateral load on the soil', Pp, pCap, 'lb', Math.round(Pp) + ' lb per pier (' + nP + ' piers) at ' + E.ftIn(hP) + ' above grade. Weakest: ' + pWhere + '. Soil 2 x 150 psf/ft on the 12 in pier (pier alone would need ' + E.ftIn(dReq) + ' deep), plus the footing\'s resisting moment', 'IBC 1807.3.2.1, 1806.3.4');
    return out;
  };
})(ENG);
