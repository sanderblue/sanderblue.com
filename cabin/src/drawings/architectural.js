/* Rime Cabin drawing set, architectural sheets: A-101 floor plan, A-102 roof plan, A-201 elevations,
   A-301 sections, A-401 wall section and details, A-501 schedules and envelope. */
(function (D) {
  D.list = D.list || [];
  D.reg = function (num, title, scale, fn) { D.list.push({ num: num, title: title, scale: scale, fn: fn }); };
  D.render = function (R, num) {
    var s = D.list.filter(function (x) { return x.num === num; })[0]; if (!s) return '';
    var sh = new D.Sheet(R, s.num, s.title, { scale: s.scale });
    s.fn(sh, R); return sh.svg();
  };
  D.sheets = function () { return D.list.slice().sort(function (a, b) { var o = 'GCSAPEM'; return o.indexOf(a.num[0]) - o.indexOf(b.num[0]) || (a.num < b.num ? -1 : 1); }); };
  var TYPE = { 'OPN-FIX77': 'A', 'OPN-TOPAWN': 'B', 'OPN-TOPFIX': 'C', 'OPN-EGR': 'D', 'OPN-CAS36': 'E', 'OPN-AWN30': 'F', 'OPN-FIX38': 'G', 'OPN-LOFTWIN': 'H', 'OPN-FIX38T': 'J', 'OPN-FIX36T': 'K' };
  D.TYPE = TYPE;
  var fi = D.fi;

  /* ---------- A-101 floor plan ---------- */
  D.reg('A-101', 'Floor plan', '1/2" = 1\'-0"', function (sh, R) {
    var M = R.M, CV = R.G.cover, map = new D.Map(300, CV ? 150 : 260, 50, -9, CV ? -10.4 : -3.6), X = function (x) { return map.x(x); }, Y = function (z) { return map.y(z); };
    D.planArch(sh, R, map, { xmin: -9 });
    D.roomTags(sh, R, map);
    if (R.garage) {
      // the attached garage, drawn light: it continues west off the sheet (A-601)
      var GR = R.garage, gx0 = -8.6, ge = R.M.geo.zip + R.M.geo.siding;
      if (CV) sh.pline([[X(gx0), Y(GR.Z0 - ge)], [X(GR.X1 + ge), Y(GR.Z0 - ge)], [X(GR.X1 + ge), Y(-ge)]], 'd-md');
      else sh.line(X(GR.X1 + ge), Y(-3.3), X(GR.X1 + ge), Y(-ge), 'd-md');
      sh.line(X(gx0), Y(GR.Z1 + ge), X(-ge), Y(GR.Z1 + ge), 'd-md');
      sh.rect(X(GR.steps.x0), Y(GR.steps.z0), (GR.steps.x1 - GR.steps.x0) * map.k, (GR.steps.z1 - GR.steps.z0) * map.k, 'd-lt');
      sh.text(X(-5.2), Y(0.6), 'GARAGE, SEE A-601', 'ts', 'middle');
    }
    // window and door tags
    R.units.forEach(function (u) {
      if ((u.bay && !/a$/.test(u.id)) || u.tier > 0) return;
      var c = (u.u0 + u.u1) / 2, pos = { N: [c, -1.3], S: [c, 25.3], W: [-1.3, c], E: [33.3, c] }[u.wall];
      if (u.wall === 'W' && u.door) pos = u.it === 'GAR-HDOOR' ? [-2.0, (u.u0 + u.u1) / 2] : [-7.0, 17.9];
      if (u.it === 'GAR-HDOOR') { sh.tag(X(pos[0]), Y(pos[1]), '3'); return; }
      if (u.over) pos = [-7.0, 16.5];
      if (u.door) sh.tag(X(pos[0]), Y(pos[1]), '1');
      else if (u.bay) sh.tag(X(pos[0]), Y(pos[1]), 'SB' + u.bay, 'rect');
      else sh.tag(X(pos[0]), Y(pos[1]), TYPE[u.it], 'hex');
    });
    (M.partitions[0].doors || []).forEach(function (d) { sh.tag(X(20.7), Y((d.u[0] + d.u[1]) / 2), '2'); });
    // dimensions: north wall openings, south bays, east partitions, west openings
    var n = R.ops.N.slice().sort(function (a, b) { return a.u0 - b.u0; }), nx = [0];
    n.forEach(function (op) { nx.push(op.u0, op.u1); }); nx.push(32);
    sh.dimH(nx.map(X), Y(-2.4), nx.slice(1).map(function (v, i) { return fi(v - nx[i]); }), Y(-0.3));
    sh.dimH([X(0), X(32)], Y(-3.2), ['32′-0″ OUTSIDE OF FRAMING']);
    var s = R.ops.S.slice().sort(function (a, b) { return a.u0 - b.u0; }), sx = [0];
    s.forEach(function (op) { sx.push(op.u0, op.u1); }); sx.push(32);
    sh.dimH(sx.map(X), Y(26.6), sx.slice(1).map(function (v, i) { return fi(v - sx[i]); }), Y(24.3));
    sh.dimH([X(0), X(22), X(32)], Y(27.5), ['22′-0″ TO C/L WALL', '10′-0″']);
    var ey = [0, 10, 15.3, 24];
    sh.dimV(ey.map(Y), X(34.6), ['10′-0″', fi(5.3), fi(8.7)], X(32.3));
    sh.dimV([Y(0), Y(24)], X(35.6), ['24′-0″']);
    var w = R.ops.W.filter(function (op) { return !op.over; }).sort(function (a, b) { return a.u0 - b.u0; }), wy = [0];
    w.forEach(function (op) { wy.push(op.u0, op.u1); }); wy.push(24);
    sh.dimV(wy.map(Y), X(-8.6), wy.slice(1).map(function (v, i) { return v - wy[i] > 1.4 ? fi(v - wy[i]) : ''; }), X(-6.4));
    // section and elevation marks
    sh.line(X(-6.5), Y(11.9), X(38.5), Y(11.9), 'd-ctr'); sh.secMark(X(-7.5), Y(11.9), '1', 'A-301', -90); sh.secMark(X(39.5), Y(11.9), '1', 'A-301', -90);
    var zn = CV ? CV.z - 2.4 : -3.4;
    sh.line(X(10), Y(zn), X(10), Y(28.2), 'd-ctr'); sh.secMark(X(10), Y(28.9), '2', 'A-301', 0); sh.secMark(X(10), Y(zn - 0.7), '2', 'A-301', 0);
    sh.line(X(25.6), Y(zn), X(25.6), Y(28.2), 'd-ctr'); sh.secMark(X(25.6), Y(28.9), '3', 'A-301', 0); sh.secMark(X(25.6), Y(zn - 0.7), '3', 'A-301', 0);
    sh.north(X(-6), Y(CV ? CV.z - 1.4 : -1.6), 34);
    if (CV) {
      // covered area: posts, the beam overhead and the eave line
      var ez = R.G.Z0;
      sh.line(X(R.garage ? 0 : -1.5), Y(ez), X(33.5), Y(ez), 'd-hid'); sh.line(X(33.5), Y(ez), X(33.5), Y(0), 'd-hid');
      sh.line(X(CV.x[0]), Y(CV.z), X(CV.x[1]), Y(CV.z), 'd-hid');
      R.parts.filter(function (p) { return p.it === 'EXT-CPOST' && !p.nq; }).forEach(function (p) { sh.rect(X(p.c[0] - p.s[0] / 2), Y(p.c[2] - p.s[2] / 2), p.s[0] * 50, p.s[2] * 50, 'f-poche d-md'); });
      sh.text(X(16), Y(CV.z + 1.6), (R.garage ? 'COVERED AREA, OPEN TO THE NORTH AND EAST' : 'COVERED AREA, OPEN ON THREE SIDES'), 'tc tm', 'middle');
      sh.text(X(16), Y(CV.z + 1.6) + 16, 'ROOF ABOVE ON AN LVL BEAM (DASHED) AND 6X6 POSTS. EAVE ' + fi(-ez) + ' FROM THE WALL', 'ts', 'middle');
    }
    sh.vtitle(X(-8.5), Y(29.6), '1', 'Floor plan', '1/2" = 1\'-0"   Dimensions to outside of framing and center of partitions');
    // notes column
    var x0 = 2560, y = 120;
    y += sh.notes(x0, y, 620, 'Plan notes', [
      'Exterior walls: 2x6 at 16 in o.c., R-23 batts, ZIP System R-6 sheathing taped, rainscreen, fiber-cement board and batten. Drywall inside.',
      'Bedroom wall (P1) 2x4. Wet wall between bedroom 1 and bath (P2) 2x6 for the 3 in stack. Bath / bedroom 2 wall (P3) 2x4.',
      'All three interior doors are sliding barn doors hung on the living room side. Slide direction shown.',
      'Ceilings: living room follows the roof, pine boards, 9 ft-2 in at the north wall to 16 ft-10 in at the south wall. Bedrooms and bath 9 ft-0 in drywall.',
      'No water lines in exterior walls. Kitchen supply and drain come up through the floor inside the cabinet.',
      'Bedroom egress windows (type D): 36 x 48 in casement, sill 36 in above the floor.',
      'Smoke alarms in each bedroom, smoke/CO alarms in the living room near each bedroom door. See E-101.',
      R.o.loft ? 'Loft over the bedroom wing is gear storage. It does not have the headroom to count as a bedroom. Spiral stair, 13 risers.' : 'Bedroom ceiling joists are 2x10 so a storage loft can be added later.'
    ], 12) + 30;
    var wins = {}; R.units.forEach(function (u) { if (!u.door) wins[TYPE[u.it]] = (wins[TYPE[u.it]] || 0) + 1; });
    y += sh.table(x0, y, [{ h: 'Tag', w: 150 }, { h: 'Meaning', w: 470, wrap: true }], [
      ['A-K', 'Window type, see the schedule on A-501. G with J above it: tall corner window. K: clerestory over the door'], ['SB1-3', 'South glass bay: two fixed units over a high transom or awning'], ['1', 'Entry door, 36 in insulated fiberglass'], ['2', 'Sliding barn door']].concat(R.garage ? [['3', 'Door to the garage, solid-core steel, self-closing. See A-601']] : []).concat([['1/A-301', 'Building section mark'], ['WH-1, F-1, WS-1', 'Water heater, wall furnace, wood stove. See M-101']]), { title: 'Symbols', size: 11 }) + 40;
    sh.table(x0, y, [{ h: 'Room', w: 250 }, { h: 'Size', w: 190 }, { h: 'Area', w: 90, a: 'r' }, { h: 'Ceiling', w: 90, a: 'r' }], M.rooms.map(function (r) {
      var ww = r.b[1] - r.b[0], dd = r.b[3] - r.b[2];
      return [r.name, fi(ww) + ' x ' + fi(dd), Math.round(ww * dd) + ' SF', r.ceil === 'vault' ? 'Sloped' : '9′-0″'];
    }).concat([['Gross, outside of framing', '32′-0″ x 24′-0″', '768 SF', '']]), { title: 'Rooms', size: 11 });
  });

  /* ---------- A-102 roof plan ---------- */
  D.reg('A-102', 'Roof plan', '3/8" = 1\'-0"', function (sh, R) {
    var M = R.M, g = M.geo, G = R.G, CV = G.cover, GR = R.garage, EB = GR && GR.ebeam, Z0 = G.Z0, Z1 = 24 + g.eaveS, k = 37.5;
    // one roof plane: the house roof, and the garage roof carried west in the same plane
    var rects = [[GR ? Math.min(G.roofJoin.x, G.roofJoin.xN) : -g.rake, 32 + g.rake, Z0, Z1]];
    if (GR) rects.push([GR.X0 - g.rake, CV ? G.roofJoin.x : GR.X1 + g.rake, GR.RZ0, GR.RZ1]);
    var xl = Math.min.apply(null, rects.map(function (r) { return r[0]; })), xr = 32 + g.rake, zt = Math.min.apply(null, rects.map(function (r) { return r[2]; })), zb = Math.max.apply(null, rects.map(function (r) { return r[3]; }));
    var map = new D.Map(230, 170, k, xl - 2.0, zt - 6.8), X = function (x) { return map.x(x); }, Y = function (z) { return map.y(z); };
    // snow shed zone below every low (north) eave
    var snowR = rects.map(function (r) { return [r[0], r[1], r[2] - 6.3, r[2] - 0.5]; });
    snowR.forEach(function (r) { sh.rect(X(r[0]), Y(r[2]), (r[1] - r[0]) * k, (r[3] - r[2]) * k, 'f-foam'); });
    D.unionOutline(sh, map, snowR, 'd-xl');
    sh.text(X((xl + xr) / 2), Y(zt - 3.3), 'SNOW SHED ZONE: SNOW SLIDES OFF THE LOW EAVE. KEEP CLEAR. NO DOORS, VENTS, TANKS OR PATHS HERE.', 'tm tb', 'middle');
    rects.forEach(function (r) { sh.rect(X(r[0]), Y(r[2]), (r[1] - r[0]) * k, (r[3] - r[2]) * k, 'f-roof'); });
    // panel seams on one 16 in grid across the whole roof
    rects.forEach(function (r) { for (var x = xl + 1.333; x < r[1] - 0.2; x += 1.333) if (x > r[0] + 0.2) sh.line(X(x), Y(r[2]), X(x), Y(r[3]), 'd-xl'); });
    D.unionOutline(sh, map, rects, 'd-hv');
    // walls, beams and posts below
    sh.rect(X(0), Y(0), 32 * k, 24 * k, 'd-hid');
    if (GR) sh.rect(X(GR.X0), Y(GR.Z0), (GR.X1 - GR.X0) * k, (GR.Z1 - GR.Z0) * k, 'd-hid');
    if (CV) sh.line(X(R.S.cover ? R.S.cover.x0 : CV.x[0]), Y(CV.z), X(CV.x[1]), Y(CV.z), 'd-hid');
    if (EB) sh.line(X(EB.x0), Y(EB.z), X(EB.x1), Y(EB.z), 'd-hid');
    R.parts.filter(function (p) { return (p.it === 'EXT-CPOST' || p.it === 'GAR-EPOST') && !p.nq; }).forEach(function (p) { sh.rect(X(p.c[0]) - 7, Y(p.c[2]) - 7, 14, 14, 'd-hid'); });
    // membrane strips along both eaves, snow rails
    rects.forEach(function (r) { sh.line(X(r[0]), Y(r[2] + 6), X(r[1]), Y(r[2] + 6), 'd-hid'); sh.line(X(r[0]), Y(r[3] - 6), X(r[1]), Y(r[3] - 6), 'd-hid'); });
    D.drawProjected(sh, R, 'plan', map, function (p) { return p.it === 'RFG-SNOW'; }, function () { return 'd-hv'; });
    sh.text(X(16), Y(Z0 + 3.75) + 4, 'SNOW RAILS, TWO ROWS (CLAMP-ON, NO HOLES)', 'ts tb halo', 'middle');
    sh.text(X(16), Y(Z1 - 3.0), 'HIGH-TEMP ICE AND WATER MEMBRANE, 6 FT', 'ts', 'middle');
    sh.text(X(16), Y(Z0 + 5.6) + 18, 'HIGH-TEMP ICE AND WATER MEMBRANE, 6 FT', 'ts halo', 'middle');
    if (CV) sh.text(X(16), Y(CV.z) - 6, 'COVERED AREA BELOW: BEAM ON POSTS ' + fi(-CV.z) + ' OUT FROM THE NORTH WALL', 'ts halo', 'middle');
    if (GR) { sh.text(X((GR.X0 + GR.X1) / 2), Y((GR.Z0 + GR.Z1) / 2) + 4, 'GARAGE BELOW', 'ts tb halo', 'middle'); if (EB) sh.text(X((GR.X0 + GR.X1) / 2), Y((GR.Z1 + 24) / 2) + 4, 'COVERED ENTRY BELOW', 'ts tb halo', 'middle'); }
    if (GR) sh.leader(X(G.roofJoin.x), Y(10), X(G.roofJoin.x + 2.2), Y(12.2), 'House and garage roofs meet here in one plane: the metal panels and decks run straight across. No step, no flashing');
    // slope arrows
    [[26, 19, 6]].concat(GR ? [[(GR.X0 + GR.X1) / 2 + 6, GR.RZ1 - 3, GR.Z0 + 2]] : []).forEach(function (a) {
      sh.line(X(a[0]), Y(a[1]), X(a[0]), Y(a[2]), 'd-hv'); sh.poly([[X(a[0]), Y(a[2] - 1)], [X(a[0] - 0.4), Y(a[2] + 0.5)], [X(a[0] + 0.4), Y(a[2] + 0.5)]], 'f-dark'); sh.text(X(a[0] + 0.8), Y((a[1] + a[2]) / 2), '4:12 DOWN TO NORTH', 'tm tb', null, -90);
    });
    // penetrations
    R.parts.forEach(function (p) {
      if (p.it === 'RFG-BOOT') { sh.circle(X(p.c[0]), Y(p.c[2]), 0.32 * k, 'f-white d-md'); sh.leader(X(p.c[0]) - 14, Y(p.c[2]) - 10, X(p.c[0]) - 90, Y(p.c[2]) - 70, /radon/i.test(p.n) ? 'Radon vent, 3 in, metal-roof boot' : 'Plumbing vent, 3 in, metal-roof boot, 12 in above roof'); }
    });
    if (R.mech.chimney) {
      var ch = R.mech.chimney; sh.circle(X(ch.x), Y(ch.z), 0.45 * k, 'f-white d-hv'); sh.poly([[X(ch.x - 0.6), Y(ch.z + 0.55)], [X(ch.x), Y(ch.z + 1.6)], [X(ch.x + 0.6), Y(ch.z + 0.55)]], 'd-md');
      sh.leader(X(ch.x) - 20, Y(ch.z), X(ch.x) - 120, Y(ch.z) + 110, 'Class A chimney, 6 in, top ' + fi(ch.above) + ' above roof, braced. Snow splitter on the uphill side');
    }
    // dims
    var dx = [xl].concat(GR ? [GR.X0, GR.X1] : []).concat([0, 32, xr]); dx = dx.filter(function (v, i) { return dx.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
    sh.dimH(dx.map(X), Y(zb + 1.8), dx.slice(1).map(function (v, i) { return v - dx[i] > 1.2 ? fi(v - dx[i]) : ''; }), Y(zb + 0.2));
    var dz = [Z0].concat(CV ? [CV.z] : []).concat([0, 24, Z1]); dz = dz.filter(function (v, i) { return dz.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
    sh.dimV(dz.map(Y), X(xr + 1.8), dz.slice(1).map(function (v, i) { return fi(v - dz[i]); }), X(xr + 0.2));
    sh.text(X(16), Y(Z0) - 14, 'LOW EAVE, VENTED SOFFIT, FASCIA BOTTOM ABOUT ' + fi(Math.round(G.rb(Z0) * 2) / 2) + ' ABOVE GRADE', 'ts', 'middle');
    sh.text(X(16), Y(Z1) + 22, 'HIGH EAVE, VENTED SOFFIT', 'ts', 'middle');
    sh.north(X(xl - 1.0), Y(zt - 1.6), 20);
    sh.vtitle(X(xl - 1.2), Y(zb + 4.2), '1', 'Roof plan', '3/8" = 1\'-0"   The house, ' + (GR ? 'the garage and ' : '') + 'the covered areas under one shed roof');
    sh.notes(2640, 140, 550, 'Roof notes', [
      'Roof: ' + (R.o.roof === 'seam' ? '24 ga standing seam steel, snap-lock, concealed clips' : '26 ga ribbed steel panels, exposed fasteners') + ', panels run north-south in one length (about ' + Math.round((Z1 - Z0) / ENG.COS) + ' ft), no end laps.',
      'Underlayment: high-temp ice and water membrane 6 ft up from both eaves, synthetic underlayment elsewhere.',
      'Cold roof: 2x4 sleepers on edge over the rafters make a 3 1/2 in air channel from the north soffit to the south soffit. Vent both soffits full length. Upper deck 23/32 in OSB.',
      'No gutters. Snow and rain leave the low north eave. Keep the snow shed zone clear.',
      'Snow rails: two rows of clamp-on rail above the north eave hold sliding snow back so it does not land on the covered area or the garage doors. Clamp to the seams; no holes in the metal.',
      'Keep penetrations near the high (south) edge where possible. The plumbing vent rises at the high side for this reason. The chimney gets a snow splitter.',
      'Rakes: 1 ft-6 in overhang on 2x4 outriggers in the vent layer, 2x6 sub-fascia. Metal rake trim.'].concat(GR ? ['Garage: the house roof carried west in the same plane, same build-up, one run of panels. ' + (EB ? 'It also runs south over the covered entry to the house\'s south eave line.' : '')] : []).concat(CV ? ['Covered area: the roof runs on past the north wall to an LVL beam on posts, flush with the garage eave. Cedar ceiling below; the vent channel runs through to the eave soffit.'] : []).concat([
      'Framing under this roof: S-201. Lightning, solar and antenna mounts are not shown. Do not penetrate the roof without flashing details.'
    ]), 12);
  });

  /* ---------- A-201 elevations ---------- */
  var EXT_RE = /^(EXT-|ROF-CBEAM|OPN-(?!BARN)|RFG-(SEAM|RIB|TRIM|FASCIA|SOFFIT|BOOT)|FND-SKIRT|FND-CRAWL|MEC-(CHIM|CHIMKIT|TANK|REG|WHVENT|FURNVENT|FANDUCT|HOODDUCT)|ELE-METER|PWR-(PV|GEN))/;
  // the attached garage is part of the building, so the elevations draw it with the house
  function elevation(sh, R, view, map, clip, opts) {
    opts = opts || {}; var GRE = /^GAR-(BB|ODOOR|CLR|SEAM|RIB|TRIM|SOFFIT|CONC|HEAT|LIGHT|EBEAM|EPOST)$/;
    var cid = sh.clip(clip[0], clip[1], clip[2], clip[3]);
    sh.group('clip-path="url(#' + cid + ')"');
    var gid = sh.clip(clip[0], clip[1], clip[2], map.y(0) - clip[1]);
    sh.group('clip-path="url(#' + gid + ')"');
    D.drawProjected(sh, R, view, map, function (p) {
      var gar = /^GAR-/.test(p.it) || !!p.gar;
      if (gar) return GRE.test(p.it);
      if (!EXT_RE.test(p.it) && !(p.it === 'PLB-DWV' && p.sys === 'vent')) return false;
      if (p.it === 'EXT-BB' || p.k === 'win') return true;
      if (p.it === 'PLB-DWV') return Math.max(p.a[1], p.b[1]) > R.G.roofTop(p.a[2]) - 0.2;
      return true;
    }, function (p, pr) {
      if (p.k === 'win') return 'f-white d-md';
      if (/^(RFG|GAR)-(SEAM|RIB)/.test(p.it)) return 'f-roof d-md';
      if (/^(RFG|GAR)-SOFFIT/.test(p.it)) return 'f-white d-lt';
      if (/^MEC-TANK/.test(p.it)) return 'f-white d-md';
      if (p.k === 'seg') return 'f-white d-md';
      return 'f-white d-md';
    }, { quads: true, after: function (p, pr) {
      if (p.k === 'win') {
        var b = pr.pts, xs = b.map(function (q) { return map.x(q[0]); }), ys = b.map(function (q) { return map.y(q[1]); });
        var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys), f = 0.14 * map.k;
        if (x1 - x0 > 2 * f + 2 && y1 - y0 > 2 * f + 2) {
          sh.rect(x0 + f, y0 + f, x1 - x0 - 2 * f, y1 - y0 - 2 * f, p.ohd ? 'f-dark d-lt' : p.door ? 'f-white d-lt' : 'f-glass d-lt');
          if (!p.door) { var w = x1 - x0, h = y1 - y0; sh.line(x0 + w * 0.2, y0 + h * 0.45, x0 + w * 0.42, y0 + h * 0.2, 'd-xl'); sh.line(x0 + w * 0.25, y0 + h * 0.6, x0 + w * 0.55, y0 + h * 0.25, 'd-xl'); }
          if (/AWN/.test(p.it)) sh.pline([[x0 + f, y1 - f], [(x0 + x1) / 2, y0 + f], [x1 - f, y1 - f]], 'd-hid');
          if (/CAS|EGR/.test(p.it)) sh.pline([[x0 + f, y0 + f], [x1 - f, (y0 + y1) / 2], [x0 + f, y1 - f]], 'd-hid');
          if (p.ohd) { for (var q = 1; q < 4; q++) sh.line(x0 + f, y0 + (y1 - y0) * q / 4, x1 - f, y0 + (y1 - y0) * q / 4, 'd-lt'); }
          else if (p.door) sh.rect(x0 + (x1 - x0) * 0.32, y0 + (y1 - y0) * 0.12, (x1 - x0) * 0.36, (y1 - y0) * 0.5, 'f-glass d-lt');
        }
      }
      if (/^(EXT|GAR)-BB$/.test(p.it) && pr.holes) {
        var facing = (p.axis === 'x' && /^(S|N)$/.test(view)) || (p.axis === 'z' && /^(E|W)$/.test(view));
        if (!facing) return;
        var id = sh.clip(0, 0, 1, 1); sh.out.pop();
        sh.add('<clipPath id="' + id + '"><path d="' + D.pathOf(map, pr.pts, pr.holes) + '" clip-rule="evenodd"/></clipPath>');
        sh.group('clip-path="url(#' + id + ')"');
        var us = pr.pts.map(function (q) { return q[0]; }), u0 = Math.min.apply(null, us), u1 = Math.max.apply(null, us), vs = pr.pts.map(function (q) { return q[1]; });
        for (var u = Math.ceil(u0 / 1.333) * 1.333; u < u1; u += 1.333) sh.line(map.x(u), map.y(Math.min.apply(null, vs)), map.x(u), map.y(Math.max.apply(null, vs)), 'd-xl');
        sh.end();
      }
    } });
    sh.end();
    sh.line(clip[0], map.y(0), clip[0] + clip[2], map.y(0), 'd-hv');
    sh.end();
  }
  D.elevation = elevation;
  D.reg('A-201', 'Exterior elevations', '3/16" = 1\'-0"', function (sh, R) {
    var G = R.G, FF = G.FF, k = 18.75, gw = R.garage ? 26 : 0;
    var cells = [
      ['S', 'South elevation', 190, 140, gw ? -38 : -9.5, gw ? 36 : 47.5], ['N', 'North elevation', 1770, 140, -14.5, 41 + gw],
      ['E', 'East elevation', 190, 1100, -9, 29 + (gw ? 8 : 0)], ['W', 'West elevation', 1770, 1100, gw ? -20 : -9, 29]
    ];
    cells.forEach(function (c, i) {
      var map = new D.Map(c[2] + 40, c[3] + 40, k, c[4], -24), clip = [c[2], c[3], (c[5] - c[4]) * k + 80, 24 * k + 60];
      elevation(sh, R, c[0], map, clip);
      var xl = map.x(c[5]) + 10;
      [[0, 'GRADE \u2212' + fi(FF)], [-(FF), 'SUBFLOOR 0\u2032-0\u2033']].forEach(function (l) { sh.level(map.x(c[4]) + 30, map.y(l[0]), l[1]); });
      if (c[0] === 'E' || c[0] === 'W') {
        sh.level(map.x(c[0] === 'E' ? 24 - 0 : 0), map.y(-G.rb(0)), 'BEARING, NORTH +' + fi(G.rb(0) - FF), c[0] === 'E');
        sh.level(map.x(c[0] === 'E' ? 0 : 24), map.y(-G.rb(24)), 'BEARING, SOUTH +' + fi(G.rb(24) - FF), c[0] !== 'E');
      }
      if (R.mech.chimney && (c[0] === 'S' || c[0] === 'E')) sh.level(map.x(c[0] === 'S' ? R.mech.chimney.x : 24 - R.mech.chimney.z) + 18, map.y(-R.mech.chimney.top), 'TOP OF CHIMNEY +' + fi(R.mech.chimney.top - FF));
      sh.vtitle(c[2] + 10, c[3] + 24 * k + 110, String(i + 1), c[1], '3/16" = 1\'-0"' + (R.garage && c[0] !== 'E' ? '   With the attached garage' : ''));
    });
    sh.notes(210, 2190, 2900, null, [
      'Siding: fiber-cement board and batten, battens at 16 in o.c., over a rainscreen mat on ZIP System R-6 sheathing. Paint. Trim and corners fiber-cement.',
      'Roof: ' + (R.o.roof === 'seam' ? 'standing seam' : 'ribbed') + ' steel, dark. Fascia and trim metal-wrapped. Soffits cedar, vented. Windows: dark frames, low-E, U-0.30 or better.',
      'Grade shown level for clarity. Actual grades from the site survey. Keep 8 in from grade to siding. Levels are measured from the top of the subfloor.'
    ], 11);
  });

  /* ---------- A-301 building sections ---------- */
  var BEYOND = /^(INT-DW|OPN-|FIX-|INT-CAB|INT-BUILTIN|MEC-(STOVE|HEARTH|FURN|WH)|LFT-STAIR|INT-FURN|ELE-PANEL|EXT-CPOST|GAR-(ODOOR|HDOOR|CLR|HEAT|OSB|GYP|LIGHT|STEP))$/;
  D.section = function (sh, R, axis, c, map, clip, depth) {
    var cid = sh.clip(clip[0], clip[1], clip[2], clip[3]);
    sh.group('clip-path="url(#' + cid + ')"');
    var gy = map.y(0);
    sh.rect(clip[0], gy, clip[2], clip[1] + clip[3] - gy, 'f-earth');
    D.drawBeyond(sh, R, axis, c, map, depth || 30, function (p) { return BEYOND.test(p.it) || (p.k === 'skin' && p.it === 'INT-DW'); });
    D.drawCut(sh, R, axis, c, map, {});
    sh.line(clip[0], gy, clip[0] + clip[2], gy, 'd-hv');
    sh.end();
  };
  D.reg('A-301', 'Building sections', '3/8" = 1\'-0"', function (sh, R) {
    var G = R.G, FF = G.FF, k = 37.5, M = R.M;
    // section 1: long, looking north at Z = 11.9
    var top = 90, h1 = 28.9 * k, h3 = 26.7 * k, y2 = top + h1 + 100;
    var m1 = new D.Map(230, top, k, -3.5, -23.4);
    D.section(sh, R, 'z', 11.9, m1, [200, top, 39 * k, h1], 30);
    sh.vtitle(220, top + h1 + 48, '1', 'Section through living room and bath', '3/8" = 1\'-0"  Looking north');
    // section 2: short at X = 10, looking east
    var CV = G.cover, u0 = CV ? CV.z - 2.1 : -4, uw = 29 - u0;
    var m2 = new D.Map(1790, top, k, u0, -23.4);
    D.section(sh, R, 'x', 10, m2, [1760, top, uw * k, h1], 14);
    sh.vtitle(1780, top + h1 + 48, '2', 'Section through living room', '3/8" = 1\'-0"  Looking east');
    // section 3: short through the wet wall at X = 25.6
    var m3 = new D.Map(230, y2, k, u0, -21.2);
    D.section(sh, R, 'x', 25.6, m3, [200, y2, uw * k, h3], 6);
    sh.vtitle(220, y2 + h3 + 40, '3', 'Section through bedrooms and bath wet wall', '3/8" = 1\'-0"  Looking east');
    // levels and labels
    [[m1, -3.5], [m2, u0], [m3, u0]].forEach(function (mm) {
      var m = mm[0], x = m.x(mm[1]) + 10;
      sh.level(x, m.y(0), 'GRADE \u2212' + fi(FF)); sh.level(x, m.y(-FF), 'T.O. SUBFLOOR 0\u2032-0\u2033');
    });
    sh.level(m2.x(u0) + 10, m2.y(-G.rb(0)), 'NORTH BEARING +' + fi(G.rb(0) - FF));
    if (CV) sh.text(m2.x(CV.z / 2), m2.y(-1.2), 'COVERED AREA', 'tc tm', 'middle'); sh.level(m2.x(28.6), m2.y(-G.rb(24) + 2.2), 'SOUTH BEARING +' + fi(G.rb(24) - FF), true);
    sh.level(m3.x(28), m3.y(-(FF + 9)), 'CEILING +9\u2032-0\u2033', true);
    [['LIVING', m2, 12, -(FF + 5)], ['BEDROOM 1', m3, 5, -(FF + 4.5)], ['BATH', m3, 12.7, -(FF + 4.5)], ['BEDROOM 2', m3, 19.5, -(FF + 4.5)], ['LIVING', m1, 11, -(FF + 6)], ['BATH', m1, 26.8, -(FF + 6)]].forEach(function (l) { sh.text(l[1].x(l[2]), l[1].y(l[3]), l[0], 'tc tm', 'middle'); });
    var rz = 8;
    sh.leader(m2.x(rz), m2.y(-(G.rb(rz) + 0.9)), m2.x(rz) - 60, m2.y(-(G.rb(rz) + 0.9)) - 140, 'Roof: metal, underlayment, 23/32 in OSB, 3 1/2 in vent space, 5/8 in OSB, 16 in rafters full of dense-pack cellulose (about R-60), smart vapor retarder, pine boards');
    sh.leader(m2.x(0.0), m2.y(-(FF + 5.5)), m2.x(-3.6), m2.y(-(FF + (CV ? 7.1 : 8.6))), 'Wall: board and batten, rainscreen, ZIP-R6, 2x6 with R-23, drywall');
    sh.leader(m2.x(6), m2.y(-(FF - 0.5)), m2.x(5) + 40, m2.y(-(FF - 0.5)) + 90, R.o.found === 'piers' ? 'Floor: 3/4 in subfloor, 11 7/8 in I-joists full of dense-pack (R-44), plywood belly, flush LVL beams on concrete piers' : 'Floor: 3/4 in subfloor, 11 7/8 in I-joists on sill and LVL beam, insulated crawlspace below');
    sh.notes(1780, y2 + 40, 1380, 'Section notes', [
      'Sections are cut straight from the 3D model, so every stud, rafter and pipe the plane passes through is shown where it falls.',
      'Ceilings: living room follows the roof (9 ft-2 in to 16 ft-10 in). Bedrooms and bath 9 ft-0 in on 2x10 joists, which can carry a storage loft.',
      'Roof snow load ' + R.o.snow + ' psf (assumed). Rafter size and spacing on S-201, sizing on S-301.',
      'Bottom of footings at least 48 in below grade or the local frost depth, whichever is deeper.',
      'Vent channel above the lower roof deck runs unbroken from the north soffit to the south soffit.'].concat(CV ? ['Covered area: its own rafters run from the north wall to the LVL beam on posts and a 1 ft-6 in overhang, in the plane of the house roof. Clear height about ' + fi(G.rb(CV.z - CV.beam[0] / 2) - CV.beam[1]) + ' under the beam.'] : []), 12.5);
  });

  /* ---------- A-401 wall section and details ---------- */
  function detail(sh, R, axis, c, map, clip, n, title, scale, labels, side) {
    D.section(sh, R, axis, c, map, clip, 0.01);
    sh.rect(clip[0], clip[1], clip[2], clip[3], 'd-lt');
    sh.vtitle(clip[0], clip[1] + clip[3] + 40, n, title, scale);
    var pts = (labels || []).map(function (l) { return [map.x(l[0]), map.y(l[1]), l[2]]; });
    if (pts.length) sh.callouts(pts, side === 'left' ? clip[0] - 30 : clip[0] + clip[2] + 30, side === 'left', 10.5, 10);
  }
  D.reg('A-401', 'Wall section and details', 'As noted', function (sh, R) {
    var G = R.G, FF = G.FF, g = R.M.geo, o = R.o, s50 = '1/2" = 1\'-0"', s100 = '1" = 1\'-0"', s150 = '1-1/2" = 1\'-0"', s75 = '3/4" = 1\'-0"';
    // 1. wall section at the north wall, footing to roof, cut on a pier line
    var m1 = new D.Map(220, 100, 50, -2.4, -(G.roofTop(-1.6) + 0.7));
    detail(sh, R, 'x', 6.82, m1, [200, 80, 7.8 * 50, 19.4 * 50], '1', 'Wall section at north wall', s50 + '  Cut on a pier line', [
      [-1.6, -G.roofTop(-1.6) + 0.05, 'Standing seam metal, underlayment, 23/32 in OSB nail base'],
      [-0.9, -(G.rb(-0.9) + G.rd + 0.2), '2x4 sleepers on edge: cold-roof air channel, open at the ' + (G.cover ? 'eave' : 'soffit')],
      [-0.4, -(G.rb(-0.4) + 0.7), '16 in rafter on beveled plate, hurricane tie each end'],
      [-1.2, -(G.rb(-1.2) - 0.03), G.cover ? 'Cedar soffit, runs on as the ceiling of the covered area' : 'Vented cedar soffit'],
      [2.0, -(G.rb(2.0) + 0.6), 'Dense-pack cellulose fills the rafter bay, about R-60 (needs 3.8 per inch)'],
      [1.2, -(G.rb(1.2) - 0.06), 'Smart vapor retarder, pine boards'],
      [-0.17, -(FF + 5), 'Board and batten on rainscreen mat, ZIP System R-6 taped'],
      [0.25, -(FF + 3.6), '2x6 at 16 in, R-23 mineral wool, 1/2 in drywall'],
      [0.25, -(FF - 0.5), o.found === 'piers' ? 'LVL flush beam with I-joists in hangers, dense-pack floor, plywood belly' : 'Rim board on PT sill, sill gasket, 1/2 in anchor bolts'],
      [0.2, -(-1.6), o.found === 'piers' ? '12 in concrete pier, 4 #4 bars' : '8 in concrete stem wall, R-15 foam inside'],
      [0.2, -(-g.frost + 0.45), 'Footing below frost (48 in assumed), size on S-101']
    ]);
    // 2. south glass bay head and high eave
    var m2 = new D.Map(1120, 100, 100, 21.8, -(G.roofTop(26.3) + 0.6));
    detail(sh, R, 'x', 4.2, m2, [1100, 80, 5.6 * 100, 7.4 * 100], '2', 'Glass bay head and high eave', s100, [
      [23.75, -(FF + 16.1), 'LVL header over each glass bay'],
      [23.75, -(FF + 14.6), 'Top unit: awning in end bays, fixed in the middle'],
      [25.4, -(G.rb(25.4) - 0.03), 'Vented soffit. 3 ft overhang shades the summer sun'],
      [26.3, -(G.roofTop(26.3) - 0.02), 'Metal, drip edge, fascia']
    ]);
    // 3. rake overhang at the east wall (the west side runs on over the garage and the entry)
    var m3 = new D.Map(2120, 100, 100, 29.6, -(G.rb(12) + 2.5));
    detail(sh, R, 'z', 12, m3, [2100, 80, 4.6 * 100, 3.4 * 100], '3', 'Rake overhang, east wall', s100, [
      [33.3, -(G.rb(12) + 1.2), '2x4 outriggers on edge at 24 in in the vent layer, 3 ft back span, 2x6 sub-fascia, metal rake trim'],
      [31.77, -(G.rb(12) - 0.3), 'Sloped double top plate, end rafter above'],
      [32.9, -(G.rb(12) + 0.02), 'Soffit on 2x4 nailers, vented']
    ]);
    // 4. egress window sill on the east wall
    var m4 = new D.Map(2120, 600, 150, 30.3, -(FF + 3.9));
    detail(sh, R, 'z', 5.0, m4, [2100, 580, 2.6 * 150, 1.6 * 150], '4', 'Egress window sill', s150, [
      [31.75, -(FF + 3.0), 'Sloped sill pan, flashing tape, low-expansion foam, backer rod']
    ]);
    // 5. pier or stem wall
    var m5 = new D.Map(220, 1260, 75, -1.8, -2.4);
    detail(sh, R, 'x', 6.82, m5, [200, 1240, 4.6 * 75, 7.4 * 75], '5', o.found === 'piers' ? 'Pier at the north beam' : 'Stem wall and footing', s75, [
      [0.9, -0.98, o.found === 'piers' ? 'Embedded beam connector, 3-ply LVL beam' : 'PT sill, gasket, anchor bolt'],
      [0.0, -(-2.0), o.found === 'piers' ? '12 in form tube, 4 #4 vertical bars' : '8 in stem wall'],
      [0.0, -(-g.frost + 0.4), (o.found === 'piers' ? (R.S.lines[0].ftg.round ? R.S.lines[0].ftg.dia + ' in round' : fi(R.S.lines[0].ftg.side) + ' square') + ' footing (sizes on S-101)' : '20 x 10 in footing') + ' on undisturbed soil below frost']
    ]);
    // 6. chimney through the roof
    if (R.mech.chimney) {
      var ch = R.mech.chimney, m6 = new D.Map(1120, 1260, 50, ch.z - 3.6, -(ch.top + 0.5));
      detail(sh, R, 'x', ch.x, m6, [1100, 1240, 7.4 * 50, 9.4 * 50], '6', 'Chimney through the roof', s50, [
        [ch.z, -(ch.roofAt - 1.4), 'Framed opening with doubled headers, 2 in clearance, ceiling support box'],
        [ch.z + 0.45, -(ch.roofAt + 0.15), 'Flashing and storm collar; snow splitter on the uphill side'],
        [ch.z, -(ch.top - 0.5), 'Class A chimney, ' + fi(ch.above) + ' above the roof, braced']
      ]);
    }
    sh.notes(2120, 1260, 1050, 'Assembly notes', [
      'Air barrier: taped ZIP-R sheathing, taped lower roof deck, sealed subfloor, gasketed rim. Tie them together at every corner and penetration. Target 3 ACH50 or better.',
      'Vapor: smart vapor retarder under the rafters. No poly in walls.',
      'Windows: sloped sill pan, flashing tape shingled over the pan, head flashing over the trim, low-expansion foam and backer rod inside.',
      'Penetrations: boots and collars on metal, flashing tape at the sheathing, airtight boxes inside.',
      'Rainscreen mat behind all siding, insect screen at the bottom and top of the gap.',
      'Details are cut from the 3D model at the marked lines and scaled. Members and connectors are planning sizes for the engineer to confirm.'
    ], 12.5);
  });

  /* ---------- A-501 schedules and envelope ---------- */
  D.reg('A-501', 'Schedules and envelope', 'As noted', function (sh, R) {
    var M = R.M, cat = R.cat, rows = {}, x0 = 200, y = 130;
    R.units.forEach(function (u) {
      var t = u.it === 'GAR-HDOOR' ? '3' : u.door ? '1' : TYPE[u.it], key = t;
      if (!rows[key]) rows[key] = { t: t, it: u.it, n: 0, ids: [], w: u.u1 - u.u0, h: u.v1 - u.v0, sill: u.v0 };
      rows[key].n++; rows[key].ids.push(u.id);
    });
    var wr = Object.keys(rows).sort().map(function (k) {
      var r = rows[k], it = cat[r.it];
      var op = /AWN/.test(r.it) ? 'Awning' : /CAS|EGR/.test(r.it) ? 'Casement' : /ENTRY/.test(r.it) ? 'Swing, in' : /HDOOR/.test(r.it) ? 'Swing, self-closing' : 'Fixed';
      // rough opening: unit plus 1/2 in each way for shims and foam
      return [r.t, it.n, D.fi(r.w) + ' x ' + D.fi(r.h), D.fi(r.w + 0.5 / 12) + ' x ' + D.fi(r.h + 0.5 / 12), r.n, op, /^[13]$/.test(r.t) ? '-' : D.fi(r.sill), r.ids.join(', '), it.s];
    });
    y += sh.table(x0, y, [{ h: 'Type', w: 60 }, { h: 'Unit', w: 300, wrap: true }, { h: 'Unit size', w: 190 }, { h: 'Rough opening', w: 200 }, { h: 'Qty', w: 50, a: 'r' }, { h: 'Operation', w: 120 }, { h: 'Sill AFF', w: 110 }, { h: 'Marks', w: 270, wrap: true }, { h: 'Notes', w: 460, wrap: true }], wr, { title: 'Window and exterior door schedule', size: 11 }) + 26;
    sh.para(x0, y, 1600, 'All windows low-E, argon, U-0.30 or better, dark frames. Tempered glass in the glass bays, the tall west corner window (G, J) and within 24 in of doors. Egress casements (D) give about 9 sq ft clear; confirm with the maker.', 11); y += 60;
    var doors = (M.partitions[0].doors || []).map(function (d) { return ['2', 'Sliding barn door, slab and track', D.fi(d.u[1] - d.u[0]) + ' opening, slab 2 in wider', R.M.rooms.filter(function (r) { return r.id === d.room; })[0].name, d.id]; });
    y += sh.table(x0, y, [{ h: 'Type', w: 60 }, { h: 'Door', w: 330 }, { h: 'Size', w: 330 }, { h: 'Room', w: 210 }, { h: 'Mark', w: 100 }], doors, { title: 'Interior door schedule', size: 11 }) + 46;
    var fin = [['Living / kitchen / entry', 'Rigid-core vinyl plank', 'Drywall, paint', 'Pine tongue-and-groove on the rafters', 'Gear bench and hooks, kitchenette, built-in desk'],
      ['Bedroom 1', 'Rigid-core vinyl plank', 'Drywall, paint', 'Drywall, 9 ft', 'Queen platform bed, wardrobe'],
      ['Bath + laundry', 'Rigid-core vinyl plank, shower pan', 'Moisture-resistant drywall, shower kit', 'Moisture-resistant drywall, 9 ft', 'Vanity, toilet, washer-dryer, water heater'],
      ['Bedroom 2', 'Rigid-core vinyl plank', 'Drywall, paint', 'Drywall, 9 ft', 'Twin bunks']];
    if (R.o.loft) fin.push(['Loft (storage)', '3/4 in plywood, sealed', 'Drywall where exposed', 'Pine boards on the rafters', 'Rail 36 in, spiral stair']);
    y += sh.table(x0, y, [{ h: 'Room', w: 280 }, { h: 'Floor', w: 300, wrap: true }, { h: 'Walls', w: 300, wrap: true }, { h: 'Ceiling', w: 330, wrap: true }, { h: 'Built-ins', w: 400, wrap: true }], fin, { title: 'Room finish schedule', size: 11 }) + 46;
    var ins = [['Roof', '16 in rafters full of dense-pack cellulose, cold-roof vent channel above', 'About R-59 to R-61', 'R-60', 'Check density'],
      ['Walls', '2x6, R-23 mineral wool, ZIP-R6 (R-6.6 continuous)', 'R-23 + R-6.6 ci', 'R-20 + R-5 ci', 'Meets'],
      R.o.found === 'piers' ? ['Floor', '11 7/8 in I-joists full of dense-pack cellulose, plywood belly', 'About R-44', 'R-38', 'Meets'] : ['Crawlspace walls', '3 in XPS inside the stem walls, sealed vapor barrier', 'R-15 ci', 'R-15 ci', 'Meets'],
      ['Windows', 'Low-E, argon', 'U-0.30 or better', 'U-0.30', 'Meets'],
      ['Air leakage', 'Taped sheathing and decks', '3 ACH50 target', '3 ACH50', 'Test']];
    sh.table(x0, y, [{ h: 'Assembly', w: 160 }, { h: 'Build-up', w: 640, wrap: true }, { h: 'This design', w: 250 }, { h: 'IECC 2021, zone 7', w: 230 }, { h: 'Result', w: 110 }], ins, { title: 'Insulation by assembly', size: 11 });
    // air sealing plan
    var map = new D.Map(2350, 300, 22, -2, -2);
    D.planArch(sh, R, map, { light: true, noFurn: true, xmin: map.u0 });
    sh.rect(map.x(-0.06), map.y(-0.06), 32.12 * 22, 24.12 * 22, 'd-md', ' style="stroke:#b3261e;stroke-width:4;stroke-dasharray:14 6;fill:none"');
    sh.vtitle(2340, 300 + 28 * 22 + 30, '1', 'Air barrier line', 'Not to scale. Red dashed line = the air barrier');
    sh.notes(2340, 300 + 28 * 22 + 110, 840, null, [
      'Red dashed line: the air barrier. It is the taped ZIP-R sheathing at walls, the taped lower roof deck above, and the sealed subfloor and rim below.',
      'Seal: sill gaskets, rim joints, top plates to the deck, every window and door rough opening, every pipe, wire, vent and flue penetration, the attic hatch if any.',
      'Use airtight electrical boxes on outside walls. Gasket the panel and the meter penetration.',
      'Blower-door test before drywall, fix leaks, then the final test.'
    ], 11.5);
  });
})(DWG);
