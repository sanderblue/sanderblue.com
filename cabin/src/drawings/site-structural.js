/* Rime Cabin drawing set: C-101 site plan and the structural sheets S-101, S-102, S-201, S-301, S-401. */
(function (D) {
  var fi = D.fi;
  function plan(sh, R, map, re, cls, opts) {
    D.drawProjected(sh, R, 'plan', map, function (p) { return re.test(p.it) && !(opts && opts.skip && opts.skip(p)); }, function (p) { return typeof cls === 'function' ? cls(p) : cls; }, opts);
  }
  D.planParts = plan;

  /* ---------- C-101 site plan ---------- */
  D.reg('C-101', 'Site plan', '1/16" = 1\'-0"', function (sh, R) {
    var S = R.M.site, k = 6.25, map = new D.Map(330, 200, k, S.lot[0] - 5, S.lot[1] - 5), X = function (x) { return map.x(x); }, Y = function (z) { return map.y(z); }, o = R.o;
    var L = S.lot;
    // drainage and snow storage
    var GR = R.garage, CV = R.G.cover, ez = R.G.Z0, sz0 = GR ? (CV ? GR.X0 - 3 : GR.X1 + 3) : -3;
    sh.rect(X(sz0), Y(ez - 12.5), (35 - sz0) * k, 11 * k, 'f-foam d-xl'); sh.text(X(16), Y(ez - 14), 'SNOW SHED ZONE', 'ts', 'middle');
    sh.rect(X(L[0]), Y(L[1]), L[2] * k, L[3] * k, 'd-hv', ' style="stroke-dasharray:28 8 4 8"');
    var sb = S.setback;
    sh.rect(X(L[0] + sb), Y(L[1] + sb), (L[2] - 2 * sb) * k, (L[3] - 2 * sb) * k, 'd-hid');
    sh.text(X(L[0] + sb + 4), Y(L[1] + sb + 6), 'SETBACK LINE, ' + sb + ' FT ASSUMED. CONFIRM WITH COUNTY ZONING.', 'ts');
    sh.text(X(L[0] + 4), Y(L[1] - 2), 'PROPERTY LINE (PLACEHOLDER UNTIL SURVEY)', 'ts');
    // road
    sh.rect(X(L[0] - 4) - 30, Y(L[1]), 26, L[3] * k, 'f-poche d-md'); sh.text(X(L[0] - 4) - 16, Y(L[1] + L[3] / 2), 'COUNTY ROAD (WEST, ASSUMED)', 'ts tb', 'middle', -90);
    // drive and parking
    plan(sh, R, map, /^SITE-DRIVE$/, 'f-gravel d-md');
    var pk = S.parking;
    sh.text(X(-80), Y(S.drive[0][1] - 7), 'GRAVEL DRIVEWAY, 10 FT', 'ts', 'middle'); sh.text(X(pk[0] + pk[2] / 2), Y(pk[1] + pk[3] + 2.5), 'PARKING', 'ts', 'middle');
    // house, porch, roof outline (one roof plane over the house and the attached garage)
    if (!GR) sh.rect(X(-1.5), Y(ez), 35 * k, (27 - ez) * k, 'd-hid');
    else sh.pline((CV ? [[-1.5, 27], [33.5, 27], [33.5, ez], [GR.X0 - 1.5, ez]] : [[-1.5, 27], [33.5, 27], [33.5, -1.5], [GR.X1 + 1.5, -1.5], [GR.X1 + 1.5, GR.Z0 - 1.5], [GR.X0 - 1.5, GR.Z0 - 1.5]]).concat([[GR.X0 - 1.5, GR.RZ1], [-1.5, GR.RZ1], [-1.5, 27]]).map(function (q) { return [X(q[0]), Y(q[1])]; }), 'd-hid');
    if (CV) sh.text(X(20), Y(CV.z / 2) + 4, 'COVERED', 'ts', 'middle');
    sh.rect(X(0), Y(0), 32 * k, 24 * k, 'f-poche d-hv'); sh.text(X(16), Y(11), 'RIME CABIN', 'tc tm', 'middle'); sh.text(X(16), Y(11) + 18, '24 x 32 FT, FLOOR +' + fi(R.G.FF), 'ts', 'middle');
    // attached garage and the snow its roof sheds to the north
    if (GR) {
      if (!CV) { sh.rect(X(GR.X0 - 3), Y(GR.Z0 - 14), (GR.X1 - GR.X0 + 6) * k, 11 * k, 'f-foam d-xl'); sh.text(X((GR.X0 + GR.X1) / 2), Y(GR.Z0 - 15.5), 'GARAGE SNOW SHED ZONE', 'ts', 'middle'); }
      sh.rect(X(GR.X0), Y(GR.Z0), (GR.X1 - GR.X0) * k, (GR.Z1 - GR.Z0) * k, 'f-poche d-hv');
      sh.text(X((GR.X0 + GR.X1) / 2), Y((GR.Z0 + GR.Z1) / 2) - 4, 'GARAGE', 'tc tm', 'middle'); sh.text(X((GR.X0 + GR.X1) / 2), Y((GR.Z0 + GR.Z1) / 2) + 14, '16 x 24 FT, DOOR WEST', 'ts', 'middle');
      var gd = GR.ops.W.filter(function (op) { return op.door; })[0];
      if (gd) sh.line(X(GR.X0 - 0.8), Y(gd.u0), X(GR.X0 - 0.8), Y(gd.u1), 'd-md');
    }
    var pd = R.porch.deck; sh.rect(X(pd[0]), Y(pd[2]), pd[3] * k, pd[4] * k, 'f-white d-md');
    if (GR && GR.entry) sh.text(X(-12), Y(20) + 4, 'COVERED ENTRY', 'ts', 'middle');
    // utilities and site items
    plan(sh, R, map, /^(SITE-SEPTIC|SITE-WELL|MEC-TANK)$/, 'f-white d-md');
    var t = S.tank; sh.circle(X(t[0]), Y(t[1]), 10 * k + 6, 'd-hid'); sh.leader(X(t[0]) + 20, Y(t[1]) + 10, X(t[0]) + 70, Y(t[1]) + 120, 'Propane tank, 500 gal. Keep 10 ft clear to the house and to any opening (NFPA 58). Truck access within hose reach.');
    sh.leader(X(S.well[0]) - 8, Y(S.well[1]), X(S.well[0]) - 70, Y(S.well[1]) - 50, 'Well (location placeholder). Keep at least 100 ft from the leach field; check county rules.');
    var lf = S.leach; sh.text(X(lf[0] + lf[2] / 2), Y(lf[1] + lf[3] / 2), 'LEACH FIELD (PLACEHOLDER, NEEDS SOIL TEST)', 'ts', 'middle');
    sh.leader(X(S.septicTank[0]) + 8, Y(S.septicTank[1]), X(S.septicTank[0]) + 80, Y(S.septicTank[1]) + 50, 'Septic tank, 1,000 gal (placeholder)');
    D.drawProjected(sh, R, 'plan', map, function (p) { return p.k === 'seg' && /^(SITE-SEWER|SITE-WATER|SITE-POWER|MEC-GASLINE|PWR-BOS|SITE-WELL|GAR-GAS|GAR-FEED)$/.test(p.it) && !(p.it === 'GAR-GAS' && p.a[1] > 1.5); }, function (p) {
      return p.it === 'SITE-SEWER' ? 'dwv' : p.it === 'SITE-WATER' ? 'cold' : /^(MEC-GASLINE|GAR-GAS)$/.test(p.it) ? 'gas' : 'd-hid';
    });
    sh.text(X(40), Y(-20), 'SEWER TO SEPTIC, 4 IN, BELOW FROST', 'ts');
    sh.text(X(-62), Y(-31), 'WATER FROM WELL, BELOW FROST, UNDER THE SNOW PILES', 'ts', 'end');
    if (o.power === 'grid') sh.text(X(-110), Y(GR ? 12.5 : 2), 'UNDERGROUND POWER FROM THE ROAD (UTILITY)', 'ts');
    else { plan(sh, R, map, /^(PWR-PV|PWR-GEN)$/, 'f-white d-md'); sh.leader(X(S.pv[0] + 26), Y(S.pv[1] + 4), X(S.pv[0] + 60), Y(S.pv[1] + 20), 'Solar array, 4.4 kW, ground mount, steep tilt. Keep the south side clear of trees.'); }
    // drainage arrows
    [[40, 34], [-8, -50], [70, 10]].forEach(function (a) { var x = X(a[0]), y = Y(a[1]); sh.line(x, y, x + 40, y - 40, 'd-md'); sh.poly([[x + 44, y - 44], [x + 30, y - 40], [x + 40, y - 30]], 'f-dark'); });
    sh.text(X(78), Y(36), 'GROUND FALLS NORTHEAST (ASSUMED)', 'ts');
    sh.north(X(L[0] + L[2] - 14), Y(L[1] + 18), 32);
    sh.vtitle(320, Y(L[1] + L[3]) + 50, '1', 'Site plan', '1/16" = 1\'-0"   All locations are placeholders until a lot is chosen and surveyed');
    sh.notes(2120, 140, 1050, 'Site notes', [
      'This plan is a placeholder layout. Pick the lot, then survey it and re-site the house before the permit.',
      'Face the glass within about 15 degrees of true south. Keep trees to the south low or thin them for winter sun.',
      'Road and driveway from the west. Keep the driveway, propane truck route and parking out of the north snow shed zones.',
      'Septic: soil test (perc test) first. The design comes from a licensed installer or engineer and the county health department.',
      'Well: drill before building if possible. If the well is poor, a hauled-water cistern is the fallback (see the parts list).',
      'Keep the well at least 100 ft from the leach field and 50 ft from the septic tank, or what the county requires.',
      o.power === 'grid' ? 'Power: ask the utility for a line extension quote early. Off-grid solar is the alternative in the cost section.' : 'Power: off-grid solar array, battery and propane generator. No utility line.',
      'Grade away from the house at least 6 in in the first 10 ft. Keep 8 in between grade and siding.',
      'Garage (if built): attached on the north half of the west (entry) wall, door west to the parking. Its roof continues the house roof and sheds snow north' + (GR && GR.entry ? ', and runs on south over the entry. ' : '. ') + 'See A-601.'
    ], 12.5);
  });

  /* ---------- shared helpers for the structural sheets ---------- */
  function lb(n) { return Math.round(n).toLocaleString('en-US') + ' lb'; }
  function pct(r) { return Math.round(r * 100) + '%'; }
  // a dashed or solid outline of the union of axis-aligned rectangles [x0, x1, z0, z1]
  function unionOutline(sh, map, rects, cls) {
    rects.forEach(function (r, i) {
      var edges = [[[r[0], r[2]], [r[1], r[2]]], [[r[1], r[2]], [r[1], r[3]]], [[r[1], r[3]], [r[0], r[3]]], [[r[0], r[3]], [r[0], r[2]]]];
      edges.forEach(function (e) {
        var n = 400, run = null, last = null;
        for (var k = 0; k <= n; k++) {
          var t = k / n, x = e[0][0] + (e[1][0] - e[0][0]) * t, z = e[0][1] + (e[1][1] - e[0][1]) * t;
          var inside = rects.some(function (q, j) { return j !== i && x > q[0] + 0.01 && x < q[1] - 0.01 && z > q[2] + 0.01 && z < q[3] - 0.01; });
          if (!inside) { if (!run) run = [x, z]; last = [x, z]; }
          if ((inside || k === n) && run) { if (Math.abs(run[0] - last[0]) + Math.abs(run[1] - last[1]) > 0.05) sh.line(map.x(run[0]), map.y(run[1]), map.x(last[0]), map.y(last[1]), cls); run = null; }
        }
      });
    });
  }
  D.unionOutline = unionOutline;

  // every pier with its footing, grouped into marks by kind and size (P1, P2, ...); shared pads get F marks
  D.foundationMarks = function (R) {
    var ftgs = R.parts.filter(function (p) { return p.it === 'FND-FTG'; }), KIND = [
      ['house', /beam B/, 'House pier under a floor beam', 'Uplift-rated beam seat'],
      ['hd', /hold-down pier$/, 'Hold-down pier under an end wall', '5/8 in threaded rod for the hold-down above (S-401)'],
      ['cover', /covered-area/, 'Covered-area post pier', 'Uplift-rated 6x6 post base'],
      ['entry', /covered-entry/, 'Covered-entry post pier', 'Uplift-rated 8x8 post base'],
      ['deck', /deck post/, 'Entry deck post pier', '6x6 post base']];
    var pads = ftgs.filter(function (f) { return f.k === 'box' && /Combined/.test(f.n); }).map(function (f, i) {
      return { mark: 'F' + (i + 1), f: f, x0: f.c[0] - f.s[0] / 2, x1: f.c[0] + f.s[0] / 2, z0: f.c[2] - f.s[2] / 2, z1: f.c[2] + f.s[2] / 2, piers: [] };
    });
    var groups = [], byKey = {};
    var piers = R.parts.filter(function (p) { return p.it === 'FND-TUBE'; }).map(function (t) {
      var k = KIND.filter(function (q) { return q[1].test(t.n); })[0] || ['other', null, 'Pier', ''], x = t.c[0], z = t.c[2];
      var pad = pads.filter(function (q) { return x > q.x0 && x < q.x1 && z > q.z0 && z < q.z1; })[0];
      var f = pad ? null : ftgs.filter(function (q) { return Math.abs(q.c[0] - x) < 0.05 && Math.abs(q.c[2] - z) < 0.05; })[0];
      var ft = pad ? 'pad' : !f ? '?' : f.k === 'cyl' ? Math.round(f.r * 24) + ' in round' : fi(f.s[0]) + ' square';
      var tube = Math.round(t.r * 24), key = k[0] + '|' + tube + '|' + ft, P = { kind: k[0], x: x, z: z, tube: tube, top: t.c[1] + t.h / 2, pad: pad, f: f };
      if (!byKey[key]) { byKey[key] = { kind: k[0], label: k[2], cast: k[3], tube: tube, ft: ft, f: f, top: P.top, list: [] }; groups.push(byKey[key]); }
      byKey[key].list.push(P); P.g = byKey[key]; if (pad) pad.piers.push(P);
      return P;
    });
    var order = ['house', 'hd', 'cover', 'entry', 'deck', 'other'];
    groups.sort(function (a, b) { return order.indexOf(a.kind) - order.indexOf(b.kind) || (b.f ? b.f.area : 0) - (a.f ? a.f.area : 0); });
    groups.forEach(function (gp, i) { gp.mark = 'P' + (i + 1); });
    return { piers: piers, groups: groups, pads: pads };
  };

  /* ---------- S-101 foundation plan ---------- */
  D.reg('S-101', 'Foundation plan', '3/8" = 1\'-0"', function (sh, R) {
    var M = R.M, St = M.structure, o = R.o, G = R.G, SS = R.S, GR = R.garage, CV = G.cover, EB = GR && GR.ebeam, k = 37.5, piers = o.found === 'piers';
    var xmin = GR ? GR.X0 : Math.min(-1, R.porch.deck[0]), zmin = Math.min(CV ? CV.z : 0, GR ? GR.Z0 : 0);
    var map = new D.Map(240, 200, k, xmin - 3.2, zmin - 3.4), X = function (x) { return map.x(x); }, Y = function (z) { return map.y(z); };
    var FM = D.foundationMarks(R);
    // what is above, dashed: the house walls and the garage
    sh.rect(X(0), Y(0), 32 * k, 24 * k, 'd-hid');
    // footings (below, dashed), stem walls and piers (cut)
    plan(sh, R, map, /^FND-FTG$/, 'd-hid');
    D.drawProjected(sh, R, 'plan', map, function (p) { return p.it === 'GAR-CONC' && /ooting/.test(p.n); }, function () { return 'd-hid'; });
    D.drawProjected(sh, R, 'plan', map, function (p) { return p.it === 'GAR-CONC' && /stem wall/.test(p.n); }, function () { return 'f-conc d-cut'; });
    plan(sh, R, map, /^FND-(CRAWL|XPS|SILL)$/, function (p) { return p.it === 'FND-CRAWL' ? (p.nq ? 'd-hid' : 'f-conc d-cut') : p.it === 'FND-XPS' ? 'f-foam d-lt' : 'f-white d-md'; });
    plan(sh, R, map, /^FND-SKIRT$/, 'd-lt');
    plan(sh, R, map, /^FND-TUBE$/, 'f-conc d-cut');
    plan(sh, R, map, /^FND-CAP$/, 'f-dark');
    D.drawProjected(sh, R, 'plan', map, function (p) { return p.it === 'FND-HD' && p.k === 'box'; }, function () { return 'f-dark'; });
    D.drawProjected(sh, R, 'plan', map, function (p) { return (p.it === 'EXT-CPOST' || p.it === 'GAR-EPOST' || (p.it === 'EXT-DFRAME' && /post/.test(p.n))) && !p.nq; }, function () { return 'f-white d-md'; });
    // beam lines and end beams (the floor framing they carry is on S-102)
    var lines = piers ? St.beamZ : [St.beamZ[1]];
    lines.forEach(function (z, i) { sh.line(X(-0.6), Y(z), X(32.6), Y(z), 'd-ctr'); sh.tag(X(33.4), Y(z), 'B' + (piers ? i + 1 : 2), 'rect'); });
    St.pierX.forEach(function (x) { sh.line(X(x), Y(-0.9), X(x), Y(24.9), 'd-ctr'); });
    if (CV) { sh.line(X(CV.x[0] - 0.5), Y(CV.z), X(CV.x[1] + 0.5), Y(CV.z), 'd-ctr'); }
    if (EB) sh.line(X(EB.x0 - 0.5), Y(EB.z), X(EB.x1 + 0.5), Y(EB.z), 'd-ctr');
    // mark beside every pier, outside its footing
    FM.piers.forEach(function (P) {
      var r = P.pad ? 0.9 : P.f ? (P.f.k === 'cyl' ? P.f.r : P.f.s[0] / 2) : 0.6, d = r * 0.72 + 0.45;
      var sx = P.x > 31 ? -1 : 1, sz = P.kind === 'entry' ? 1 : -1;
      sh.text(X(P.x + sx * d), Y(P.z + sz * d) + 4, P.g.mark, 'ts tb halo', 'middle');
    });
    FM.pads.forEach(function (q) { sh.tag(X(q.x1) - 18, Y(q.z1) - 14, q.mark, 'hex'); });
    // garage footing marks
    if (GR) {
      sh.tag(X(GR.X0 + 6), Y(GR.Z0), 'G1', 'hex'); sh.tag(X(GR.X0), Y((GR.Z0 + GR.Z1) / 2 + 3), 'G1', 'hex');
      R.parts.filter(function (p) { return p.it === 'GAR-CONC' && /jack post/.test(p.n); }).forEach(function (p) { sh.tag(X(p.c[0]), Y(p.c[2] + 1.9), 'G2', 'hex'); });
      R.parts.filter(function (p) { return p.it === 'GAR-CONC' && /hold-down/.test(p.n); }).forEach(function (p, i) { sh.tag(X(p.c[0] + (p.c[0] < GR.X0 + 1 ? 2.3 : -2.3)), Y(p.c[2] + (p.c[2] > GR.Z1 - 1 ? 2.2 : -2.2)), 'G3', 'hex'); });
      sh.text(X((GR.X0 + GR.X1) / 2), Y((GR.Z0 + GR.Z1) / 2) - 6, 'GARAGE: 4 IN SLAB ON 4 IN GRAVEL', 'tc tm', 'middle');
      sh.text(X((GR.X0 + GR.X1) / 2), Y((GR.Z0 + GR.Z1) / 2) + 12, 'TOP OF SLAB +' + fi(GR.ys) + ' ABOVE GRADE, SLOPED 1/8 IN PER FT TO THE DOOR', 'ts', 'middle');
    }
    if (CV) sh.text(X(16), Y(CV.z / 2) + 4, 'COVERED AREA: GRAVEL', 'ts tb halo', 'middle');
    if (EB) sh.text(X(-12), Y(20.5), 'COVERED ENTRY', 'ts tb halo', 'middle');
    if (EB) sh.text(X(R.porch.deck[0] + R.porch.deck[3] / 2), Y(R.porch.deck[2] + R.porch.deck[4] / 2) + 4, 'DECK', 'ts tb halo', 'middle');
    sh.text(X(16), Y(11.2), piers ? 'OPEN, VENTED SPACE UNDER THE FLOOR' : 'INSULATED CRAWLSPACE', 'tc tm halo', 'middle');
    sh.text(X(16), Y(11.2) + 16, 'BEAMS B1 TO B3 AND THE END BEAMS: S-102', 'ts halo', 'middle');
    // dimensions: piers and posts along the south, covered-area posts and the garage along the north, beam lines on the east
    var xsS = (EB ? [EB.x0].concat(EB.posts) : []).concat([0]).concat(St.pierX).concat([32]).sort(function (a, b) { return a - b; });
    var dS = Y(Math.max(24 + 2.6, EB ? EB.z + 2.6 : 0));
    sh.dimH(xsS.map(X), dS, xsS.slice(1).map(function (v, i) { return v - xsS[i] > 1.4 ? fi(v - xsS[i]) : ''; }), Y(24.6));
    var xsT = [GR ? GR.X0 : 0].concat(GR ? [GR.X1] : []).concat(CV ? CV.posts : []).concat([32]);
    xsT = xsT.filter(function (v, i) { return xsT.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
    var dN = Y(zmin - 2.2);
    sh.dimH(xsT.map(X), dN, xsT.slice(1).map(function (v, i) { return v - xsT[i] > 1.4 ? fi(v - xsT[i]) : ''; }), Y(zmin - 0.7));
    var zsE = (CV ? [CV.z] : []).concat([0]).concat(lines).concat([24]).sort(function (a, b) { return a - b; });
    zsE = zsE.filter(function (v, i) { return i === 0 || v - zsE[i - 1] > 0.05; });
    sh.dimV(zsE.map(Y), X(35.2), zsE.slice(1).map(function (v, i) { return v - zsE[i] > 1.4 ? fi(v - zsE[i]) : ''; }), X(34.2));
    if (GR) {
      var zsW = [GR.Z0, GR.Z1].concat(EB ? [EB.z] : []);
      sh.dimV(zsW.map(Y), X(GR.X0 - 2.2), zsW.slice(1).map(function (v, i) { return fi(v - zsW[i]); }), X(GR.X0 - 0.8));
    }
    sh.north(X(xmin - 1.6), Y(zmin - 2.6), 22);
    sh.vtitle(240, Y(27.9), '1', 'Foundation plan', '3/8" = 1\'-0"   Footings and pads dashed below. Pier marks P, shared pads F, garage footings G');
    // schedule
    var x0 = 240, y = Y(27.9) + 90, rows = [];
    var latP = R.lateral.piers ? R.lateral.piers.P : 0, HDS = (typeof ENG !== 'undefined' && ENG.HDS) || [];
    function upOf(P) {
      var L = SS.lines.filter(function (l) { return Math.abs(l.z - P.z) < 0.05; })[0], q = L && L.piers.filter(function (pp) { return Math.abs(pp.x - P.x) < 0.05; })[0];
      return (q && q.U) || 0;
    }
    function castOf(gp) {
      if (gp.kind === 'house') { var U = gp.list.reduce(function (m, P) { return Math.max(m, upOf(P)); }, 0); return 'Uplift-rated beam seat: ' + lb(Math.max(U, 500)) + ' up, ' + lb(Math.max(latP, 300)) + ' sideways'; }
      if (gp.kind === 'hd') {
        var hs = gp.list.map(function (P) { return (R.lateral.hdPiers || []).filter(function (h) { return Math.abs(h.x - P.x) < 0.05 && Math.abs(h.z - P.z) < 0.05; })[0]; }).filter(Boolean);
        var rods = hs.map(function (h) { var e = HDS.filter(function (q) { return q[0] === h.hd; })[0]; return (e ? e[2] : '5/8') + ' in rod for the ' + h.hd; });
        return rods.filter(function (v, i) { return rods.indexOf(v) === i; }).join('; ') + ' above (S-401)';
      }
      if (gp.kind === 'cover' && SS.cover) return 'Uplift-rated 6x6 post base: ' + lb(SS.cover.U || 0) + ' up';
      if (gp.kind === 'entry' && SS.entry) return 'Uplift-rated 8x8 post base: ' + lb(SS.entry.U || 0) + ' up';
      return gp.cast;
    }
    FM.groups.forEach(function (gp) {
      var f = gp.f, ftxt = gp.ft === 'pad' ? 'On a shared pad (F marks)' : f.k === 'cyl' ? gp.ft + ' x 10 in footing, bell form or formed' : gp.ft + ' x 12 in pad';
      var reo = gp.ft === 'pad' ? '4 #4 vertical, hooked into the pad' : '4 #4 vertical, hooked; #4 at 12 in each way in the footing' + (f && f.k === 'box' ? ', top and bottom' : '');
      rows.push([gp.mark, gp.list.length, gp.label, gp.tube + ' in tube, top ' + fi(gp.top) + ' above grade', ftxt, reo, castOf(gp)]);
    });
    FM.pads.forEach(function (q) {
      var carries = q.piers.map(function (P) { return P.g.mark; }).join(' + ') + (GR && q.x0 < GR.X1 && q.z1 > GR.Z0 && q.z0 < GR.Z1 ? ' + garage stem wall' : '');
      rows.push([q.mark, 1, 'Shared pad: ' + carries, '-', fi(q.f.s[0]) + ' x ' + fi(q.f.s[2]) + ' x 12 in', '#5 at 12 in each way, top and bottom', 'Pour with the piers it carries']);
    });
    if (GR) {
      rows.push(['G1', '-', 'Garage frost footing and stem wall', '8 in stem wall to the slab', '20 x 10 in continuous', '2 #4 continuous in the footing, 2 #4 at the top of the wall, #4 vertical at 48 in', '5/8 in anchor bolts under the shear panels as on S-401, 1/2 in at 6 ft elsewhere, 12 in from plate ends']);
      rows.push(['G2', R.parts.filter(function (p) { return p.it === 'GAR-CONC' && /jack post/.test(p.n); }).length, 'Footing widened under a jack post', '-', '2′-6″ square x 10 in', '#4 at 8 in each way', 'Garage south wall']);
      var g3 = R.parts.filter(function (p) { return p.it === 'GAR-CONC' && /hold-down/.test(p.n); }), g3s = {};
      g3.forEach(function (p) { var k = p.n.replace(/^.*hold-down, /, ''); g3s[k] = (g3s[k] || 0) + 1; });
      if (g3.length) rows.push(['G3', g3.length, 'Footing thickened under a hold-down', '-', Object.keys(g3s).map(function (k) { return g3s[k] + ' at ' + k; }).join('; '), '#5 at 12 in each way, bottom; stem wall 2 #4 top and bottom', 'Hold-down anchor cast in (S-401)']);
    }
    if (!piers) rows.push(['F', '110 lf', 'Crawlspace stem wall', '8 in stem wall', Math.round((SS.crawlFtg || 1.667) * 12) + ' x 10 in continuous', '2 #4 continuous top and bottom, #4 vertical at 48 in', '5/8 in anchor bolts under the shear panels as on S-401, 1/2 in at 6 ft elsewhere; hold-down anchors (S-401)']);
    y += sh.table(x0, y, [{ h: 'Mark', w: 55 }, { h: 'Qty', w: 45, a: 'r' }, { h: 'What', w: 380, wrap: true }, { h: 'Pier', w: 330, wrap: true }, { h: 'Footing', w: 380, wrap: true }, { h: 'Reinforcing', w: 560, wrap: true }, { h: 'Cast in', w: 470, wrap: true }], rows, { title: 'Foundation schedule', size: 10.5 }) + 40;
    // loads from the model
    var lr = [];
    SS.lines.forEach(function (L) {
      var u = L.piers.reduce(function (m, p) { return Math.max(m, p.U || 0); }, 0);
      lr.push(['Beam B' + (L.i + 1) + ' piers', lb(L.Pmax), L.ftg.round ? L.ftg.dia + ' in round' : fi(L.ftg.side) + ' square', Math.round(L.ftg.q).toLocaleString('en-US') + ' psf', u ? lb(u) : '-']);
    });
    if (SS.cover) lr.push(['Covered-area posts', lb(SS.cover.Pmax), SS.cover.ftg.dia + ' in round', Math.round(SS.cover.ftg.q).toLocaleString('en-US') + ' psf', '-']);
    if (SS.entry) SS.entry.posts.forEach(function (p) { lr.push(['Entry post at ' + fi(p.x), lb(p.P), p.ftg.dia + ' in round', Math.round((p.P + p.ftg.W) / p.ftg.area).toLocaleString('en-US') + ' psf', '-']); });
    (R.lateral.hdPiers || []).forEach(function (h) { lr.push(['Hold-down pier, ' + (h.id === 'HW' ? 'west' : 'east') + ' wall at ' + fi(h.z), '-', h.shared ? 'shared pad' : (h.f.round ? h.f.dia + ' in round' : fi(h.f.side) + ' square'), '-', lb(h.T)]); });
    var yN = 150 + 40 + sh.notes(2640, 150, 545, 'Foundation notes', [
      'Planning design from the model for ' + o.snow + ' psf roof snow, 115 mph wind and 2,000 psf soil (presumptive, IRC Table R401.4.1). A Colorado-licensed engineer checks it and stamps it; a soils report can change every footing.',
      'Concrete 4,000 psi, air-entrained. Rebar ASTM A615 Grade 60. 3 in cover cast against earth, 2 in in forms.',
      'Bottom of every footing and pad at least 48 in below finished grade, on undisturbed soil. Call for the footing inspection before placing concrete.',
      'Set the beam seats, post bases and hold-down rods to string lines before the concrete sets. Pier tops level within 1/4 in.',
      'Hold-down piers (S-401): a threaded rod sized to its hold-down (5/8 to 1 in, F1554 Grade 36) with a heavy nut and plate washer near the bottom of the pier, run up through the end beam to the hold-down. Shared pads F carry two piers, or a pier and the garage wall; pour each pad and its piers as one.',
      'Uplift and side load: every beam seat and post base is rated for at least the uplift and side load in the schedule. Do not substitute plain seats.',
      piers ? 'The space under the floor stays open and vented behind the skirt. Water entry and drain drop sit in insulated, heat-traced boxes.' : 'Crawlspace: R-15 foam inside the stem walls, sealed 12 mil vapor barrier, passive radon stack.',
      GR ? 'Garage: frost footing and stem wall, 4 in slab on 4 in compacted gravel with a vapor retarder, control joints at about 10 ft.' : 'No garage with these choices.',
      'Entry deck posts stand on their own 24 in footings, or on a shared pad where one runs under them. The deck is not bolted to the house.',
      'Details: A-401 detail 5 (pier) and A-601 (garage).'
    ], 11);
    var hL = sh.table(2640, yN + 20, [{ h: 'Where', w: 190, wrap: true }, { h: 'Down', w: 90, a: 'r' }, { h: 'Footing', w: 95, wrap: true }, { h: 'Soil', w: 85, a: 'r' }, { h: 'Uplift', w: 90, a: 'r' }], lr, { title: 'Pier loads from the model', size: 10 });
    sh.text(2640, yN + 20 + hL + 22, 'Down: heaviest of D + L, D + S and D + 0.75(L + S). Soil: pressure under the footing, 2,000 psf allowed. Uplift: wind, with both axes at 75 % where two walls share a pier.', 'ts');
  });

  /* ---------- S-102 floor framing plan ---------- */
  D.reg('S-102', 'Floor framing plan', '1/2" = 1\'-0"', function (sh, R) {
    var M = R.M, St = M.structure, o = R.o, G = R.G, SS = R.S, k = 50, map = new D.Map(300, 330, k, -3, -3), X = function (x) { return map.x(x); }, Y = function (z) { return map.y(z); };
    var inHouse = function (p) { return p.c[0] > -0.6 && p.c[0] < 32.6 && p.c[2] > -0.6 && p.c[2] < 24.6; };
    D.drawProjected(sh, R, 'plan', map, function (p) { return p.it === 'FND-TUBE' && inHouse(p); }, function () { return 'd-hid'; });
    plan(sh, R, map, /^FLR-(JOIST|RIM|BEAM|HANGER|BHANGER)$/, function (p) { return p.it === 'FLR-BEAM' ? 'f-poche d-hv' : /HANGER/.test(p.it) ? 'f-dark' : 'f-white d-lt'; });
    var piers = o.found === 'piers', bz = piers ? St.beamZ : [0, St.beamZ[1], 24], FJ = SS.floorJoist;
    [[bz[0], bz[1]], [bz[1], bz[2]]].forEach(function (s) {
      var zm = (s[0] + s[1]) / 2;
      sh.line(X(8), Y(s[0] + 0.6), X(8), Y(s[1] - 0.6), 'd-md'); [s[0] + 0.6, s[1] - 0.6].forEach(function (z, i) { sh.poly([[X(8), Y(z)], [X(7.7), Y(z + (i ? -0.6 : 0.6))], [X(8.3), Y(z + (i ? -0.6 : 0.6))]], 'f-dark'); });
      sh.rect(X(8.3), Y(zm) - 30, 560, 52, 'f-white');
      sh.text(X(8.5), Y(zm) - 8, ('11 7/8 in I-joists, ' + FJ.id + ' or equal, at 16 in o.c.').toUpperCase(), 'ts tb'); sh.text(X(8.5), Y(zm) + 10, 'SPAN ' + fi(s[1] - s[0]) + ' C/L TO C/L. FACE-MOUNT HANGERS AT THE BEAMS', 'ts');
    });
    lines(bz);
    function lines(b) { if (!piers) return; b.forEach(function (z, i) { sh.tag(X(-1.4), Y(z), 'B' + (i + 1), 'rect'); }); }
    if (piers) {
      sh.text(X(0.22) + 4, Y(7.7), 'END BEAM, 3-PLY 1 3/4 x 11 7/8 LVL', 'ts tb halo', null, -90);
      sh.text(X(31.78) + 4, Y(7.7), 'END BEAM, 3-PLY 1 3/4 x 11 7/8 LVL', 'ts tb halo', null, -90);
      sh.text(X(16), Y(St.beamZ[1]) + 26, 'B1 TO B3: 3-PLY 1 3/4 x 11 7/8 LVL, FLUSH, CONTINUOUS OVER THE PIERS', 'ts tb halo', 'middle');
    }
    // the bedroom partition that loads the joists mid-span, and the hold-down rods through the end beams
    sh.line(X(22), Y(10), X(32), Y(10), 'd-hv', ' style="stroke-dasharray:14 6"');
    sh.leader(X(24.5), Y(10), X(19.5), Y(12.6), 'Bedroom wall above at 10 ft: it carries the loft ceiling. Joists checked for it (S-301). Squash blocks under its posts');
    sh.text(X(22.4), Y(19), 'DOUBLE JOIST UNDER THE BEDROOM WING WALL', 'ts', null, -90);
    (R.lateral.hdPiers || []).forEach(function (h) { var x = h.id === 'HW' ? 0.35 : 31.65; sh.circle(X(x), Y(h.z), 7, 'f-dark'); sh.leader(X(x), Y(h.z), X(x + (h.id === 'HW' ? 2.4 : -2.4)), Y(h.z - 0.9), 'Hold-down rod up through the end beam (S-401)'); });
    // wire holes through beam B2
    var seen = {};
    (G.beamHoles || []).forEach(function (h) {
      var key = h[0].toFixed(2); if (seen[key]) return; seen[key] = 1;
      sh.circle(X(h[0]), Y(h[2]), 6, 'f-white d-md'); sh.text(X(h[0]), Y(h[2]) - 12, 'H', 'ts tb halo', 'middle');
    });
    var bzi = [0].concat(bz.filter(function (z) { return z > 0.3 && z < 23.7; })).concat([24]);
    sh.dimV(bzi.map(Y), X(34.2), bzi.slice(1).map(function (v, i) { return fi(v - bzi[i]); }), X(33.4));
    if (piers) sh.dimV([0, bz[0], bz[1], bz[2], 24].map(Y), X(35.4), ['', fi(bz[1] - bz[0]), fi(bz[2] - bz[1]), ''], X(34.6));
    sh.dimH([X(0), X(32)], Y(-2.2), ['32′-0″'], Y(-1.6));
    sh.vtitle(300, Y(26.4), '1', 'Floor framing plan', '1/2" = 1\'-0"   Piers dashed below');
    sh.notes(2235, 150, 960, 'Floor framing notes', [
      'Joists: ' + FJ.n + ' in face-mount hangers. The series is checked for 40 psf live, ' + SS.Df + ' psf dead and the bedroom wall and loft load, with L/480 live-load deflection (S-301).',
      piers ? 'Beams: B1 to B3 are 3-ply 1 3/4 x 11 7/8 LVL, flush, continuous over the piers. The east and west walls sit on 3-ply LVL end beams hung between the floor beams in concealed-flange hangers (a rim board cannot span 15 ft under a wall).' : 'Rims: 1 1/8 in LVL rim board on the sill. Middle beam: 3-ply 1 3/4 x 11 7/8 LVL.',
      'Subfloor: 3/4 in tongue-and-groove OSB, glued and screwed. Seal all seams; the subfloor is part of the air barrier.',
      piers ? 'Insulation: dense-pack cellulose fills the bays (about R-44). Belly: 1/2 in plywood with rodent mesh under the joists.' : 'Insulation is in the crawlspace walls; the floor is not insulated.',
      'H: wire holes through beam B2 only where marked, 1 in max, at mid-depth, at least 2 ft from a pier, per the LVL maker. All other wires and pipes go through I-joist webs in the maker\'s hole zones. Never notch or drill a flange.',
      'Hold-down rods (S-401, 5/8 to 1 in) pass straight down through the end beams in holes 1/16 in over the rod size, centered in the beam width, as the LVL maker allows; a pier sits under each one (S-101).',
      R.lateral.floorDia ? 'Floor diaphragm: the subfloor carries the walls\' wind load to the piers: ' + R.lateral.floorDia.nail + ' (S-401). Wall plates screwed down to the beams and rims per S-401.' : 'Walls anchored to the stem walls per S-401.',
      'Squash blocks under posts and point loads. Double joist under the bedroom wing wall, which runs along the joists.'
    ], 12.5);
    var lines2 = R.bom.lines.filter(function (l) { return /^FLR-/.test(l.id); });
    sh.table(2235, 1020, [{ h: 'Item', w: 380, wrap: true }, { h: 'Spec', w: 440, wrap: true }, { h: 'Qty', w: 140, a: 'r' }], lines2.map(function (l) { return [l.n, l.s, l.q + ' ' + l.u]; }), { title: 'Floor materials (from the parts list)', size: 11 });
  });

  /* ---------- S-201 roof framing plan (the whole roof: house, covered area, garage, covered entry) ---------- */
  D.reg('S-201', 'Roof framing plans', '1/4" = 1\'-0"', function (sh, R) {
    var M = R.M, g = M.geo, G = R.G, o = R.o, SS = R.S, CV = G.cover, GR = R.garage, EB = GR && GR.ebeam, k = 25;
    var xl = GR ? GR.X0 - g.rake : -g.rake, xr = 32 + g.rake, z0 = Math.min(G.Z0, GR ? GR.RZ0 : 0), z1 = Math.max(24 + g.eaveS, GR ? GR.RZ1 : 0);
    var map = new D.Map(260, 240, k, xl - 2.5, z0 - 2.4), X = function (x) { return map.x(x); }, Y = function (z) { return map.y(z); };
    var RAF = /^(ROF|GAR)-(IJ16|LVL16)$/;
    // walls below, dashed
    sh.rect(X(0), Y(0), 32 * k, 24 * k, 'd-hid');
    if (GR) sh.rect(X(GR.X0), Y(GR.Z0), (GR.X1 - GR.X0) * k, (GR.Z1 - GR.Z0) * k, 'd-hid');
    plan(sh, R, map, /^(WAL-BEVEL|GAR-HDRL)$/, 'f-poche d-lt');
    plan(sh, R, map, RAF, 'f-white d-lt');
    plan(sh, R, map, /^(ROF|GAR)-(BLOCK|FLY)$/, 'f-poche d-xl');
    D.drawProjected(sh, R, 'plan', map, function (p) { return /^(ROF-CBEAM|GAR-EBEAM)$/.test(p.it); }, function () { return 'd-hv'; });
    D.drawProjected(sh, R, 'plan', map, function (p) { return /^(ROF-CBEAM|GAR-EBEAM)$/.test(p.it); }, function () { return 'd-hid'; });
    D.drawProjected(sh, R, 'plan', map, function (p) { return (p.it === 'EXT-CPOST' || p.it === 'GAR-EPOST') && !p.nq; }, function () { return 'f-dark'; });
    D.drawProjected(sh, R, 'plan', map, function (p) { return p.it === 'RFG-SNOW'; }, function () { return 'd-ctr'; });
    // roof edge
    var rects = [[GR ? Math.min(G.roofJoin.x, G.roofJoin.xN) : -g.rake, xr, G.Z0, 24 + g.eaveS]];
    if (GR) rects.push([GR.X0 - g.rake, CV ? G.roofJoin.x : GR.X1 + g.rake, GR.RZ0, GR.RZ1]);
    unionOutline(sh, map, rects, 'd-hv');
    // zone labels
    function box(x, z, lines, w) { var h = lines.length * 15 + 12, x0 = X(x) - w / 2, y0 = Y(z) - h / 2; sh.rect(x0, y0, w, h, 'f-white d-lt'); lines.forEach(function (l, i) { sh.text(X(x), y0 + 18 + i * 15, l, i ? 'ts' : 'ts tb', 'middle'); }); }
    var rf = SS.rafters, rn = function (r) { return r ? (G.st.rafterTxt + '').toUpperCase() : ''; };
    box(10, 12, ['HOUSE RAFTERS', rn(rf.main), 'SPAN ' + fi(rf.main.span) + ', ' + fi(rf.main.z1 - rf.main.b) + ' OVERHANG SOUTH', CV ? 'BREAK OVER THE NORTH WALL' : 'NORTH EAVE ' + fi(g.eaveN)], 330);
    if (CV) box(20, CV.z / 2 + 0.5, ['COVERED-AREA RAFTERS', 'BEAM CB TO THE NORTH WALL, ' + fi(g.eaveN) + ' OVERHANG'], 330);
    if (GR) box((GR.X0 + GR.X1) / 2, (GR.Z0 + GR.Z1) / 2, ['GARAGE RAFTERS', 'GARAGE N WALL TO S WALL, SPAN ' + fi(rf.garN.span), 'SAME SIZE AND SPACING AS THE HOUSE'], 330);
    if (EB && rf.garS) box((GR.X0 + GR.X1) / 2 - 2, (GR.Z1 + EB.z) / 2 + 0.6, ['COVERED-ENTRY RAFTERS', 'GARAGE S WALL TO BEAM EB, ' + fi(rf.garS.z1 - rf.garS.b) + ' OVERHANG'], 330);
    if (CV) sh.tag(X(5.5), Y(CV.z), 'CB', 'rect');
    if (EB) sh.tag(X(-7.5), Y(EB.z), 'EB', 'rect');
    if (GR) sh.leader(X(G.roofJoin.x), Y(5), X(-2), Y(3.2), 'Roof joint over the house\'s west end rafter: garage rafters and outriggers stop on a 2x nailer beside it; deck seams staggered across it, blocked');
    sh.leader(X(32 + g.rake * 0.5), Y(5), X(29.2), Y(3.2), 'Rake: 2x4 outriggers on edge at 24 in in the vent layer, 3 ft back span, 2x6 sub-fascia');
    if (GR) sh.leader(X(GR.X0 - g.rake * 0.5), Y(-3), X(GR.X0 + 3.4), Y(-5.2), 'Garage rake: same outriggers and sub-fascia');
    sh.text(X(10), Y(G.Z0 + 3.75) + 4, 'SNOW RAILS, TWO ROWS, ON THE METAL ABOVE (DASHED)', 'ts halo', 'middle');
    if (R.mech.chimney) sh.leader(X(R.mech.chimney.x), Y(R.mech.chimney.z), X(R.mech.chimney.x) + 70, Y(R.mech.chimney.z) + 130, 'Chimney opening: doubled headers between full rafters');
    // dims
    var dx = [xl].concat(GR ? [GR.X0, GR.X1] : []).concat([0, 32, xr]); dx = dx.filter(function (v, i) { return dx.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
    sh.dimH(dx.map(X), Y(z0 - 1.4), dx.slice(1).map(function (v, i) { return v - dx[i] > 1.2 ? fi(v - dx[i]) : ''; }), Y(z0 - 0.3));
    var dz = [z0].concat(CV ? [CV.z] : []).concat([0, 24]).concat(EB ? [EB.z] : []).concat([z1]); dz = dz.filter(function (v, i) { return dz.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
    sh.dimV(dz.map(Y), X(xr + 2.2), dz.slice(1).map(function (v, i) { return fi(v - dz[i]); }), X(xr + 0.4));
    sh.north(X(xl - 1.2), Y(z0 - 1.3), 18);
    sh.vtitle(260, Y(z1 + 1.6) + 20, '1', 'Roof framing plan', '1/4" = 1\'-0"   One roof plane over the house, the garage and both covered areas. Decks and metal not shown');
    // bedroom wing ceiling framing
    var m2 = new D.Map(1930, 300, k, 21, -1.5);
    sh.rect(m2.x(22), m2.y(0), 10 * k, 24 * k, 'd-hid');
    plan(sh, R, m2, /^(ROF-CJ|ROF-HANGER|WAL-LEDGER)$/, function (p) { return p.it === 'ROF-HANGER' ? 'f-dark' : p.it === 'WAL-LEDGER' ? 'f-poche d-md' : 'f-white d-lt'; });
    [10, 15.3].forEach(function (z) { sh.line(m2.x(22), m2.y(z), m2.x(32), m2.y(z), 'd-hv'); });
    var Zh = SS.ceiling ? SS.ceiling.Zh : 2.4;
    sh.text(m2.x(27), m2.y(6.2), '2X10 AT 16 IN', 'ts tb halo', 'middle');
    sh.text(m2.x(27), m2.y(19.6), '2X10 AT 16 IN', 'ts tb halo', 'middle');
    sh.callouts([[m2.x(29), m2.y(Zh + 0.1), 'Flush header, 2-ply 2x10, ' + fi(Zh) + ' from the north wall, where the rafters clear the joists. Short 2x10 stubs between the rafters north of it'],
      [m2.x(25), m2.y(10), 'Joists bear on the bedroom walls (B-1 and bath)'], [m2.x(29), m2.y(23.5), 'Hangers on an LVL ledger at the south wall']], m2.x(32) + 30, false, 10, 10, 290);
    if (o.loft) sh.text(m2.x(27), m2.y(12.7), 'LOFT DECK 3/4 IN PLY ABOVE', 'ts', 'middle');
    sh.vtitle(1920, m2.y(25.5), '2', 'Bedroom wing ceiling', '1/4" = 1\'-0"');
    // rafter schedule from the model
    var rr = [['House', rf.main], ['Covered area', rf.cover], ['Garage', rf.garN], ['Covered entry', rf.garS]].filter(function (r) { return r[1]; }).map(function (r) {
      var q = r[1];
      return [r[0], G.st.rafterTxt, fi(q.span), q.z1 - q.b > 0.1 ? fi(q.z1 - q.b) : q.a - q.z0 > 0.1 ? fi(q.a - q.z0) + ' (north)' : '-', lb(q.Rmax), q.Rmin < 0 ? lb(-q.Rmin) + ' up' : 'none (snow)'];
    });
    var y = 1100;
    y += sh.table(1920, y, [{ h: 'Rafters', w: 160 }, { h: 'Member', w: 380, wrap: true }, { h: 'Span', w: 110 }, { h: 'Overhang', w: 120 }, { h: 'Reaction', w: 120, a: 'r' }, { h: 'Snow uplift', w: 120, a: 'r' }], rr, { title: 'Rafter schedule (spans bearing to bearing)', size: 10.5 }) + 40;
    var bm = [];
    if (SS.cover) bm.push(['CB', 'Covered-area beam', '3-ply 1 3/4 x 11 7/8 LVL', SS.cover.posts.length + ' posts, 6x6 DF No. 1, ' + fi(SS.cover.postH) + ' tall', 'On a beveled plate under the rafters. Stops short of the garage; the end rafter bears on the garage\'s short east wall']);
    if (SS.entry) bm.push(['EB', 'Covered-entry beam', '3-ply 1 3/4 x 16 LVL', SS.entry.posts.length + ' posts, 8x8 DF No. 1, ' + fi(SS.entry.postH) + ' tall', 'On a beveled plate. Stops 1/2 in short of the house siding (flashed); the house does not carry it']);
    Object.keys(SS.headers).filter(function (id) { return /^G/.test(id) && SS.headers[id].wall === 'GS'; }).forEach(function (id) { bm.push([id, 'Garage south wall header', SS.headers[id].n, 'LVL jack posts', 'Over the clerestory windows; the garage and entry rafters bear on it']); });
    if (bm.length) y += sh.table(1920, y, [{ h: 'Mark', w: 60 }, { h: 'Beam', w: 190, wrap: true }, { h: 'Member', w: 200, wrap: true }, { h: 'Supports', w: 220, wrap: true }, { h: 'Notes', w: 340, wrap: true }], bm, { title: 'Roof beams', size: 10.5 }) + 40;
    var D2 = R.lateral.diaphragm;
    sh.notes(260, Y(z1 + 1.6) + 110, 1580, 'Roof framing notes', [
      'Rafters: ' + G.st.rafterTxt + ' for ' + o.snow + ' psf roof snow (S-301). ' + (CV ? 'House rafters run from the north wall to the south eave; the covered-area rafters run from the beam to the north wall and lap the house rafters there with a 2x nailer. ' : 'One length from the north eave to the south eave. ') + (EB ? 'Garage rafters break over the garage south wall the same way.' : ''),
      'Bearing: beveled 2x plates on every wall and beam. No bird\'s mouth cuts in I-joists. Web stiffeners at every bearing. Blocking panels between rafters at each bearing. A rafter tie (H2.5A type or equal, about 455 lb uplift) at every bearing.',
      'Roof deck (the diaphragm): 5/8 in OSB lower deck, ' + D2.kind + ', ' + D2.nail + '. Then 2x4 sleepers on edge over the rafters (the cold-roof vent channel), then 23/32 in OSB upper deck screwed through the sleepers.',
      'Rakes: 2x4 outriggers on edge at 24 in in the vent layer with a 3 ft back span, screwed to the lower deck and the rafters; 2x6 sub-fascia. No ladder framing hung off the end rafter.',
      GR ? 'Garage: the same rafters and roof build-up in the same plane as the house roof. The two meet over the house\'s west end rafter (see the leader). No step, no cricket, no drift.' : 'No garage with these choices.',
      'Snow rails: two rows of clamp-on rail on the metal above the north eave so sliding snow does not land on the covered area.',
      'Openings: chimney opening framed with doubled headers between full rafters. Vent pipes pass between rafters.',
      'Ceiling joists over the bedroom wing are 2x10 at 16 in for a storage loft (30 psf). Do not notch top or bottom edges.'
    ], 11.5);
  });

  /* ---------- S-301 design criteria and member checks ---------- */
  D.reg('S-301', 'Design criteria and member checks', 'None', function (sh, R) {
    var M = R.M, St = M.structure, o = R.o, G = R.G, SS = R.S, L = R.lateral, x0 = 200, y = 150;
    y += sh.table(x0, y, [{ h: 'Item', w: 300 }, { h: 'Value used', w: 520, wrap: true }, { h: 'Source and status', w: 560, wrap: true }], [
      ['Code basis', '2021 IRC with engineered parts, ASCE 7-16, NDS 2018, AISC 360, ACI 318', 'As adopted by the county. Confirm the edition at the permit counter.'],
      ['Ground and roof snow', o.snow + ' psf roof snow (option on the cost page)', 'Summit County publishes the design snow load by elevation. Use the county number for the lot.'],
      ['Roof dead load', SS.Dr + ' psf (house), ' + SS.Do + ' psf (open areas)', 'Metal, two OSB decks and sleepers, I-joists, dense-pack, pine ceiling. Open areas have no insulation.'],
      ['Floor', SS.Lf + ' psf live, ' + SS.Df + ' psf dead', 'IRC Table R301.5'],
      ['Loft (storage)', '30 psf live, 10 psf dead', 'IRC Table R301.5'],
      ['Wind', '115 mph, Exposure C, Kd 0.85, Kzt 1.0. qz ' + L.qz.toFixed(1) + ' psf at ' + fi(L.h) + '; ASD wall pressure ' + L.p.toFixed(1) + ' psf (MWFRS), ' + (SS.wall ? SS.wall.pA.toFixed(1) : '-') + ' psf (C&C)', 'ASCE 7-16 Ch. 27 and 30. ' + St.wind],
      ['Seismic', 'Category B assumed; wind governs bracing', 'Confirm with the county'],
      ['Soil', '2,000 psf bearing', St.soil],
      ['Frost', '48 in', St.frost],
      ['Load combinations', 'D + L, D + S, D + 0.75L + 0.75S, D + 0.6W, D + 0.75(0.6W) + 0.75S, 0.6D + 0.6W', 'ASCE 7 ASD. Snow duration factor 1.15, wind 1.6'],
      ['Materials', 'SPF No. 2, DF-L No. 1 posts, LVL 2.0E, LSL 1.55E, I-joists per maker, steel A500 Gr C', 'Maker\'s published values; the engineer confirms']
    ], { title: 'Design criteria', size: 10.5 }) + 46;
    var LATRE = /^(Wind bracing|Roof diaphragm|Floor diaphragm|Piers in bending|Piers: lateral|Hold-down|End post|Wall base shear)/;
    D.LATRE = LATRE;
    var gr = SS.checks.filter(function (c) { return !LATRE.test(c.name); });
    function fmt(c) { return c.unit === 'ratio' ? c.dem.toFixed(2) + ' (ratio)' : c.unit === 'in' ? c.dem.toFixed(2) + ' in' : Math.round(c.dem).toLocaleString('en-US') + ' ' + c.unit; }
    function fmc(c) { return c.unit === 'ratio' ? '1.00' : c.unit === 'in' ? c.cap.toFixed(2) + ' in' : Math.round(c.cap).toLocaleString('en-US') + ' ' + c.unit; }
    var rows = gr.map(function (c) { return [c.name, c.note, fmt(c), fmc(c), pct(c.ratio), c.status === 'pass' ? 'OK' : 'FAIL', c.ref]; });
    var half = Math.ceil(rows.length / 2), cols = [{ h: 'Member or check', w: 330, wrap: true }, { h: 'Size and basis', w: 610, wrap: true }, { h: 'Demand', w: 120, a: 'r' }, { h: 'Capacity', w: 120, a: 'r' }, { h: 'Used', w: 55, a: 'r' }, { h: '', w: 45 }, { h: 'Ref', w: 160, wrap: true }];
    var yA = y;
    var hA = sh.table(x0, yA, cols, rows.slice(0, half), { title: 'Gravity and member checks from the model (' + gr.length + ' checks, ' + gr.filter(function (c) { return c.status === 'pass'; }).length + ' pass)', size: 10.5, rh: 19 });
    var hB = sh.table(x0 + 1520, yA, cols, rows.slice(half), { size: 10.5, rh: 19 }), yC = yA + Math.max(hA, hB) + 70;
    var con = R.bom.lines.filter(function (l) { return /^(ROF-TIE|GAR-TIE|ROF-HANGER|FLR-HANGER|FLR-BHANGER|WAL-HANGER|WAL-STRAP|FND-CAP|FND-ANCHOR|FND-HD|WAL-POST|WAL-SHEAR)$/.test(l.id); });
    sh.table(x0, yC, [{ h: 'Connector or part', w: 300 }, { h: 'Where and what', w: 800, wrap: true }, { h: 'Qty', w: 110, a: 'r' }], con.map(function (l) { return [l.n, l.s, l.q + ' ' + l.u]; }), { title: 'Connection schedule (counts from the model)', size: 10 });
    sh.notes(1720, yC - 10, 1300, 'Structural notes', [
      'Every size here comes from the model\'s own load path, roof to footing, for the options shown. They are planning checks (ASD, simple spans and continuous beams, NDS and maker values), not an engineered design. A Colorado-licensed engineer checks them and stamps the drawings.',
      'Load path: roof snow into the rafters, then the north and south walls' + (G.cover ? ', the covered-area beam and posts' : '') + (R.garage ? ', the garage walls' + (R.garage.entry ? ' and the covered-entry beam and posts' : '') : '') + ', then the floor beams and end beams, then the piers and footings.',
      'South glass wall: the posts between the bays are steel tubes; a 4-ply LSL post fails there once wind on the glass is added to the roof load. The LSL studs are checked the same way.',
      'Wind bracing, hold-downs, end posts, base fastening, the roof and floor diaphragms and the piers under wind: S-401.',
      'Snow: single shed roof with no higher roof beside it, so no drift. Sliding snow lands north of the eave; the snow rails keep it off the covered area.'
    ], 11);
  });

  /* ---------- S-401 wind bracing ---------- */
  D.reg('S-401', 'Wind bracing plan', '1/4" = 1\'-0"', function (sh, R) {
    var M = R.M, g = M.geo, G = R.G, SS = R.S, L = R.lateral, GR = R.garage, k = 25, t6 = g.t6;
    var xl = GR ? GR.X0 : 0, zt = GR ? Math.min(GR.Z0, 0) : 0;
    var map = new D.Map(300, 330, k, xl - 4, zt - 4.5), X = function (x) { return map.x(x); }, Y = function (z) { return map.y(z); };
    // walls in outline
    sh.rect(X(0), Y(0), 32 * k, 24 * k, 'd-md');
    sh.rect(X(t6), Y(t6), (32 - 2 * t6) * k, (24 - 2 * t6) * k, 'd-lt');
    if (GR) { sh.rect(X(GR.X0), Y(GR.Z0), (GR.X1 - GR.X0) * k, (GR.Z1 - GR.Z0) * k, 'd-md'); sh.rect(X(GR.X0 + t6), Y(GR.Z0 + t6), (GR.X1 - GR.X0 - 2 * t6) * k, (GR.Z1 - GR.Z0 - 2 * t6) * k, 'd-lt'); }
    var LN = { HN: ['x', 0, 1], HS: ['x', 24, -1], HE: ['z', 32, -1], HW: ['z', 0, 1], GW: ['z', GR ? GR.X0 : 0, 1], GN: ['x', GR ? GR.Z0 : 0, 1], GS: ['x', GR ? GR.Z1 : 0, -1] };
    var hdl = [], tagN = 0;
    L.lines.forEach(function (ln) {
      var d = LN[ln.id]; if (!d) return;
      ln.segs.forEach(function (sg) {
        var c = sg.garage ? (ln.id === 'HW' ? GR.X1 - t6 / 2 : d[1]) : d[1] + d[2] * t6 / 2, w = 9;
        var pts = d[0] === 'x' ? [[X(sg.a), Y(c)], [X(sg.b), Y(c)]] : [[X(c), Y(sg.a)], [X(c), Y(sg.b)]];
        var cls = sg.f > 0 ? 'f-dark' : 'f-poche';
        if (d[0] === 'x') sh.rect(pts[0][0], pts[0][1] - w / 2, pts[1][0] - pts[0][0], w, cls); else sh.rect(pts[0][0] - w / 2, pts[0][1], w, pts[1][1] - pts[0][1], cls);
        var mx = (pts[0][0] + pts[1][0]) / 2, my = (pts[0][1] + pts[1][1]) / 2, off = 26 * d[2];
        if (sg.L > 2) sh.text(d[0] === 'x' ? mx : mx + off, d[0] === 'x' ? my + off + 4 : my + 4, sg.ty.id + (sg.ftao ? ' FTAO' : '') + (sg.f < 1 ? (sg.f ? ' (part)' : ' (not counted)') : ''), 'ts tb halo', 'middle', d[0] === 'x' ? 0 : -90);
        if (sg.T > 0) [sg.a + 0.2, sg.b - 0.2].forEach(function (u) {
          var px = d[0] === 'x' ? X(u) : X(c), py = d[0] === 'x' ? Y(c) : Y(u);
          sh.rect(px - 5, py - 5, 10, 10, 'f-white d-hv');
          hdl.push([px, py, sg.hd]);
        });
      });
      // line tag and collector
      var lx = d[0] === 'x' ? X((ln.id[0] === 'G' ? (GR.X0 + GR.X1) / 2 : 16)) : X(d[1] - d[2] * 2.2), ly = d[0] === 'x' ? Y(d[1] - d[2] * 2.2) : Y(ln.id[0] === 'G' ? (GR.Z0 + GR.Z1) / 2 : 12);
      if (ln.id === 'HW' && GR) { lx = X(2.4); ly = Y(19); }
      if (ln.id === 'GS') ly = Y(GR.Z1 + 2.6);
      sh.tag(lx, ly, ln.id, 'rect');
    });
    hdl.forEach(function (h) { sh.text(h[0] + 8, h[1] - 8, h[2] === 'none needed' ? '' : h[2], 'ts halo'); });
    (L.hdPiers || []).forEach(function (h) { sh.circle(X(h.id === 'HW' ? 0.35 : 31.65), Y(h.z), 13, 'd-md'); });
    // wind arrows
    function arrow(x, y, dx, dy, t) { sh.line(x, y, x + dx, y + dy, 'd-hv'); var a = Math.atan2(dy, dx), e = [x + dx, y + dy]; sh.poly([e, [e[0] - 12 * Math.cos(a - 0.4), e[1] - 12 * Math.sin(a - 0.4)], [e[0] - 12 * Math.cos(a + 0.4), e[1] - 12 * Math.sin(a + 0.4)]], 'f-dark'); sh.text(x + dx / 2, y + dy / 2 - 8, t, 'ts tb', 'middle'); }
    arrow(X(16) - 60, Y(zt - 3.4), 120, 0, 'WIND E-W');
    arrow(X(37), Y(9), 0, 110, 'WIND N-S');
    sh.north(X(xl - 2.4), Y(zt - 2.8), 18);
    sh.vtitle(330, Y(Math.max(24, GR ? GR.Z1 : 0) + 3), '1', 'Wind bracing plan', '1/4" = 1\'-0"   Black bars: shear wall panels. Squares: hold-downs. Circles: hold-down piers (S-101)');
    // tables
    var x0 = 2030, y = 150;
    y += sh.table(x0, y, [{ h: 'Wind basis', w: 300 }, { h: 'Value', w: 380, wrap: true }], [
      ['Basic wind speed, exposure', '115 mph, Exposure C (ASCE 7-16)'], ['Mean roof height', fi(L.h)], ['Kz, qz', L.Kz.toFixed(2) + ', ' + L.qz.toFixed(1) + ' psf'],
      ['Design pressure (ASD, walls + roof)', L.p.toFixed(1) + ' psf on the projected area'], ['Total, N-S wind', lb(L.totalNS)], ['Total, E-W wind', lb(L.totalEW)]], { title: 'Wind loads', size: 10.5 }) + 40;
    function uniq(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }); }
    var piersF = R.o.found === 'piers';
    var lr = L.lines.map(function (ln) {
      var used = ln.segs.filter(function (s2) { return s2.f > 0; });
      return [ln.id, ln.name, ln.dir === 'NS' ? 'N-S' : 'E-W', lb(ln.V), uniq(used.map(function (s2) { return s2.ty.id; })).join(' + ') + (ln.ftao ? ' FTAO' : ''), used.length + ' (' + fi(ln.Le) + ')', Math.round(ln.v) + ' plf', pct(ln.V / ln.cap)];
    });
    y += sh.table(x0, y, [{ h: 'Line', w: 50 }, { h: 'Wall', w: 310, wrap: true }, { h: 'Wind', w: 60 }, { h: 'Load', w: 105, a: 'r' }, { h: 'Type', w: 130 }, { h: 'Panels (effective)', w: 160 }, { h: 'Max shear', w: 100, a: 'r' }, { h: 'Used', w: 90, a: 'r' }], lr, { title: 'Shear wall lines', size: 10.5 }) + 40;
    var hr = [];
    L.lines.forEach(function (ln) { ln.segs.forEach(function (sg) {
      if (!(sg.T > 0)) return;
      var anch = sg.garage || ln.id[0] === 'G' ? 'Garage footing' + (sg.T > 4000 ? ', pad G3' : '') : !piersF ? 'Stem wall footing' : (ln.id === 'HE' || ln.id === 'HW') ? 'Rod into a pier (S-101)' : 'Rod through beam ' + (ln.id === 'HN' ? 'B1' : 'B3') + ' to its piers';
      hr.push([ln.id, fi(sg.a) + ' to ' + fi(sg.b), fi(sg.h), lb(sg.T), sg.hd, sg.rod + ' in', sg.post.replace(' end post', ''), anch]);
    }); });
    y += sh.table(x0, y, [{ h: 'Line', w: 50 }, { h: 'Panel', w: 175 }, { h: 'Height', w: 75 }, { h: 'Uplift', w: 85, a: 'r' }, { h: 'Hold-down', w: 85 }, { h: 'Rod', w: 60 }, { h: 'End post', w: 125 }, { h: 'Anchored', w: 350, wrap: true }], hr, { title: 'Hold-downs, one at each end of each panel (SPF values)', size: 10.5 }) + 40;
    var br = L.lines.map(function (ln) { return [ln.id, ln.base || '-', ln.drag > 50 ? lb(ln.drag) + ', ' + ln.strap : '-']; });
    y += sh.table(x0, y, [{ h: 'Line', w: 50 }, { h: 'Base of the panels (shear into the floor or footing)', w: 700, wrap: true }, { h: 'Collector (top plate strap)', w: 255, wrap: true }], br, { title: 'Base fastening and collectors', size: 10.5 }) + 40;
    var types = [], seenT = {};
    L.lines.forEach(function (ln) { ln.segs.forEach(function (sg) { if (sg.f > 0 && !seenT[sg.ty.id]) { seenT[sg.ty.id] = 1; types.push([sg.ty.id, sg.ty.t + (sg.ty.zip ? ' (2:1 max, ESR-3373)' : ''), Math.round(sg.ty.v) + ' plf']); } }); });
    types.sort(function (a2, b2) { return a2[0] < b2[0] ? -1 : 1; });
    y += sh.table(x0, y, [{ h: 'Type', w: 80 }, { h: 'Sheathing and nailing', w: 745, wrap: true }, { h: 'Allowable', w: 180, a: 'r' }], types, { title: 'Shear wall types (wind, ASD, SPF framing)', size: 10.5 }) + 40;
    var wc = SS.checks.filter(function (c) { return /^(Wind bracing|Roof diaphragm|Floor diaphragm|Piers in bending|Piers: lateral|Hold-down|End post|Wall base shear)/.test(c.name); });
    var wfmt = function (c, v) { return c.unit === 'in' ? v.toFixed(2) + ' in' : c.unit === 'ft' ? v.toFixed(1) + ' ft' : Math.round(v).toLocaleString('en-US') + ' ' + c.unit; };
    sh.table(x0, y, [{ h: 'Check', w: 455, wrap: true }, { h: 'Demand', w: 170, a: 'r' }, { h: 'Capacity', w: 170, a: 'r' }, { h: 'Used', w: 80, a: 'r' }, { h: '', w: 130 }], wc.map(function (c) { return [c.name, wfmt(c, c.dem), wfmt(c, c.cap), pct(c.ratio), c.status === 'pass' ? 'OK' : 'FAIL']; }), { title: 'Wind checks from the model (' + wc.length + ', ' + wc.filter(function (c) { return c.status === 'pass'; }).length + ' pass)', size: 9.5, rh: 16 });
    var D2 = L.diaphragm, P2 = L.piers;
    var FD = L.floorDia;
    sh.notes(300, Math.max(Y(Math.max(24, GR ? GR.Z1 : 0) + 3) + 90, 1420), 1150, 'Wind bracing notes', [
      'Method: ASCE 7-16 directional procedure. The roof deck is a flexible diaphragm that hands each strip of wind to the wall lines on either side. Each line\'s shear walls are its full-height solid panels, sharing the load by strength. Wood-panel walls taller than 2:1 count at 2L/h up to 3.5:1; ZIP-R walls count only up to 2:1 (SDPWS 4.3, ESR-3373).',
      'Capacities are wind ASD values for SPF framing (x 0.92). ZIP System R-6 needs 0.131 x 3 in nails so they reach 1 1/2 in into the studs through the foam. Where an inside panel is added, the two faces combine as the larger of twice the weaker or the stronger (SDPWS 4.3.3.2).',
      'Hold-downs: HDU type or equal on the end post listed, SPF values. Rod sizes follow the hold-down. ' + (piersF ? 'House: threaded rod down through the floor framing into a pier (S-101). ' : 'House: anchor into the stem wall. ') + 'Garage: anchor into the footing; a stem wall with 2 #4 top and bottom lifts the footing on both sides.',
      'Uplift where two walls\' hold-downs share a pier or pad: wind on both axes at 75 % at once (ASCE 7 Case 3) is checked as well as each axis alone.',
      'Roof diaphragm: 5/8 in OSB lower deck, ' + D2.kind + ', ' + D2.nail + '. Unit shear ' + Math.round(D2.v) + ' plf of ' + D2.cap + ' plf allowed.' + (FD ? ' Floor diaphragm: 3/4 in OSB subfloor, glued, ' + FD.nail + '; ' + Math.round(FD.v) + ' plf of ' + Math.round(FD.cap) + ' allowed.' : ''),
      'Collectors: where a line\'s panels are shorter than the wall, the double top plate carries the rest to them; lap the plates 4 ft and add the strap listed over each top plate splice.',
      piersF ? 'Piers: about ' + lb(P2.P) + ' per pier sideways (' + P2.n + ' piers share the house\'s wind). Bending ' + Math.round(P2.M).toLocaleString('en-US') + ' ft-lb of about ' + P2.cap.toLocaleString('en-US') + ' allowed; soil and footing checked on S-301.' : 'Crawlspace: the stem walls take the wind straight to the footing.',
      'Interior shear panels (SW-C, SW-D): 15/32 in rated sheathing on the inside face, nailed as listed, blocked; drywall goes over it. FTAO straps, if any, are detailed by the engineer.'
    ], 11);
  });
})(DWG);
