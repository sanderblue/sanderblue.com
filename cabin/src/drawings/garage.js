/* Rime Cabin drawing set: A-601, the attached garage (plan, two sections, west elevation, schedule, cost, notes). */
(function (D) {
  var fi = D.fi;
  D.reg('A-601', 'Attached garage', '1/4" = 1\'-0"', function (sh, R) {
    var GR = R.garage, M = R.M, g = M.geo, G = R.G, FF = G.FF;
    if (!GR) { sh.text(300, 300, 'No garage with the current choices. Turn on "Attached garage" on the cost page to draw it.', 'tl'); return; }
    var X0 = GR.X0, X1 = GR.X1, Z0 = GR.Z0, Z1 = GR.Z1, ys = GR.ys, t6 = g.t6, ext = g.zip + g.siding, hx = -g.zip, zh = -ext, k = 25;

    /* ---------- 1. plan, 1/4" = 1'-0", with the west end of the house ---------- */
    var map = new D.Map(560, 220, k, X0 - 4.5, Z0 - 4), X = function (x) { return map.x(x); }, Y = function (z) { return map.y(z); };
    // the house: its own plan drawing, clipped to the part next to the garage
    var EN = GR.entry, zE = EN ? 28 : 14, xc0 = EN ? X0 - 1 : -9;
    var cid = sh.clip(X(xc0), Y(-1.6), (9 - xc0) * k, (zE + 1.6) * k);
    sh.group('clip-path="url(#' + cid + ')"'); D.planArch(sh, R, map, { light: true, xmax: 9 }); sh.end();
    sh.line(X(9), Y(-1.6), X(9), Y(zE), 'd-ctr');
    // roof outline: the garage roof and the house roof are one plane
    var CV = G.cover;
    sh.pline([[X(EN ? 9 : XH(GR)), Y(GR.RZ1)], [X(X0 - g.rake), Y(GR.RZ1)], [X(X0 - g.rake), Y(Z0 - g.eaveN)]].concat(CV ? [[X(9), Y(Z0 - g.eaveN)]] : [[X(X1 + g.rake), Y(Z0 - g.eaveN)], [X(X1 + g.rake), Y(-g.eaveN)], [X(9), Y(-g.eaveN)]]), 'd-hid');
    if (CV) { sh.line(X(X1), Y(CV.z), X(9), Y(CV.z), 'd-hid'); sh.text(X(4.5), Y(CV.z) - 8, 'BEAM, COVERED AREA (A-101)', 'ts halo', 'middle'); }
    if (!EN) sh.pline([[X(XH(GR)), Y(GR.RZ1)], [X(XH(GR)), Y(14)]], 'd-hid');
    // covered entry: beam (dashed, overhead) and its tall posts
    var EB = GR.ebeam;
    if (EB) {
      sh.line(X(EB.x0), Y(EB.z), X(EB.x1), Y(EB.z), 'd-hid');
      D.drawProjected(sh, R, 'plan', map, function (p) { return p.it === 'GAR-EPOST' && !p.nq; }, function () { return 'f-poche d-cut'; });
      sh.text(X(-15.5), Y(17.2), 'COVERED ENTRY', 'tc tm', 'middle');
      sh.text(X(-15.5), Y(17.2) + 16, 'OPEN TO THE WEST AND SOUTH', 'ts', 'middle');
      var pd = R.porch.deck; sh.text(X(pd[0] + pd[3] / 2 - 0.6), Y(pd[2] + pd[4] / 2 + 2.2), 'ENTRY DECK', 'ts halo', 'middle');
    }
    // garage walls, cut; the clerestory windows are above the cut
    function band(x0, z0, x1, z1) { sh.rect(X(x0), Y(z0), (x1 - x0) * k, (z1 - z0) * k, 'f-poche d-cut'); }
    var W = { N: { a: 'x', lo: Z0 - ext, hi: Z0 + t6, u0: X0 - ext, u1: X1 + ext }, S: { a: 'x', lo: Z1 - t6, hi: Z1 + ext, u0: X0 - ext, u1: hx },
      W: { a: 'z', lo: X0 - ext, hi: X0 + t6, u0: Z0 + t6, u1: Z1 - t6 }, E: { a: 'z', lo: X1 - t6, hi: X1 + ext, u0: Z0 + t6, u1: zh } };
    Object.keys(W).forEach(function (w) {
      var e = W[w], ops = GR.ops[w].filter(function (op) { return op.v0 < 4; }).sort(function (a, b) { return a.u0 - b.u0; }), a = e.u0;
      function seg(u0, u1) { if (u1 - u0 < 0.01) return; if (e.a === 'x') band(u0, e.lo, u1, e.hi); else band(e.lo, u0, e.hi, u1); }
      ops.forEach(function (op) { seg(a, op.u0); a = op.u1; });
      seg(a, e.u1);
      ops.forEach(function (op) {
        var mid = (e.lo + e.hi) / 2;
        // overhead door: the panel line closed, and dashed where it rolls up under the roof
        sh.line(X(mid), Y(op.u0), X(mid), Y(op.u1), 'd-hv');
      });
    });
    // gypsum on the house wall (the fire separation), steps, door swing is drawn with the house
    sh.rect(X(hx - 0.042), Y(0), 0.042 * k, (Z1 - t6) * k, 'f-dark');
    var st = GR.steps; sh.rect(X(st.x0), Y(st.z0), (st.x1 - st.x0) * k, (st.z1 - st.z0) * k, 'f-white d-md'); sh.line(X((st.x0 + st.x1) / 2), Y(st.z0), X((st.x0 + st.x1) / 2), Y(st.z1), 'd-lt');
    sh.text(X(st.x0) - 6, Y((st.z0 + st.z1) / 2) + 4, 'UP ' + (st.risers + 1) + 'R', 'ts halo', 'end');
    // car and gear dashed, heater, panel, meter, gas solid
    D.drawProjected(sh, R, 'plan', map, function (p) { return p.gar && p.it === 'INT-FURN' && !/Snowboard|Gear bin|Pegboard|leg|shelf$/.test(p.n); }, function (p) { return /SUV|Wheel|Roof box/.test(p.n) ? 'd-hid' : 'd-xl'; });
    D.drawProjected(sh, R, 'plan', map, function (p) { return (p.it === 'GAR-HEAT' || p.it === 'ELE-PANEL' || p.it === 'ELE-METER') && p.k === 'box'; }, function () { return 'f-white d-md'; });
    D.drawProjected(sh, R, 'plan', map, function (p) { return p.it === 'GAR-GAS' && p.k === 'seg'; }, function () { return 'gas'; });
    // tags and labels
    var gd = GR.ops.W.filter(function (op) { return op.door; })[0], cl = GR.ops.S;
    sh.tag(X(X0 - 2.0), Y(gd.u0 + 1.2), 'L', 'hex');
    cl.forEach(function (op) { sh.tag(X((op.u0 + op.u1) / 2), Y(Z1 + 1.8), 'M', 'hex'); });
    var hd = R.units.filter(function (u) { return u.it === 'GAR-HDOOR'; })[0];
    if (hd) sh.tag(X(1.6), Y((hd.u0 + hd.u1) / 2), '3');
    var cx = (X0 + X1) / 2 - 3, cz = -3.7;
    sh.text(X(cx), Y(cz), 'GARAGE', 'tc tm', 'middle');
    sh.text(X(cx), Y(cz) + 16, fi(X1 - X0 - t6 - 0.17) + ' x ' + fi(Z1 - Z0 - 2 * t6) + ' INSIDE · ' + Math.round((X1 - X0) * (Z1 - Z0)) + ' SF', 'ts', 'middle');
    sh.text(X(cx), Y(cz) + 30, 'WALLS ' + fi(GR.rb(Z0) - ys) + ' (N) TO ' + fi(GR.rb(Z1) - ys) + ' (S) ABOVE THE SLAB', 'ts', 'middle');
    sh.text(X(4.5), Y(6.4), 'HOUSE', 'tc tm', 'middle');
    if (!EN) sh.text(X(-3.6), Y(13.0), 'PORCH', 'ts', 'middle');
    sh.callouts([
      [X(gd.u0 > 0 ? X0 : X0 + 0.2), Y(gd.u0 + 1.5), '10 x 8 ft overhead door, opener on the ceiling'],
      [X(GR.shelves.x0 + 2), Y(GR.shelves.z1 - 0.3), 'Snowboard rack, then shelves and gear bins on the north wall'],
      [X(GR.bench.x0 + 1), Y((GR.bench.z0 + GR.bench.z1) / 2), 'Workbench, 6 ft, pegboard and two receptacles above'],
      [X(-0.14), Y(1.0), '1/2 in gypsum on the house wall, slab to roof deck (fire separation)'],
      [X((st.x0 + st.x1) / 2), Y(st.z1 - 0.3), 'Landing ' + Math.round((st.sill - st.landing) * 12) + ' in below the house door, then ' + st.risers + ' steps of ' + D.fi(st.riser).replace(/^0′-/, '') + ' to the slab. Door 3: solid-core steel, self-closing, self-latching'],
      [X(GR.panel.x0 + 0.5), Y(GR.panel.z0), 'Panel, 100 A, 36 in clear in front. Meter outside, back to back'],
      [X(GR.heater.x), Y(GR.heater.z), 'Propane wall heater, burner 18 in above the slab, vent and snorkel out the south wall'],
      [X(0.4), Y(GR.gasTee[2]), 'Gas teed off the furnace line in the floor (shown dashed)'],
      [X((GR.car.x0 + GR.car.x1) / 2), Y(GR.car.z1 - 0.4), 'SUV, about 16 x 6 1/2 ft (dashed)']
    ].concat(EB ? [
      [X(R.porch.rack[0] + 1), Y(R.porch.rack[1] + 0.6), 'Firewood rack on the garage wall, dry under the roof'],
      [X(R.porch.steps.x - 1), Y(R.porch.steps.z[1] - 0.5), 'Entry deck 3 in below the door, three 7 in steps down to the walk'],
      [X(EB.posts[1]), Y(EB.z), EB.posts.length + ' 8x8 posts and an LVL beam carry the roof over the entry. The beam stops 1/2 in short of the house; the house does not carry it'],
      [X(EB.posts[0] + 0.3), Y(EB.z + 3), 'South eave in line with the house: the roof edge runs straight across']
    ] : []), 520, true, 10.5, 10, 330);
    var dz = [Z0, gd.u0, gd.u1, Z1].concat(EB ? [EB.z] : []);
    sh.dimV(dz.map(Y), X(X0 - 4.2), dz.slice(1).map(function (v, i) { return fi(v - dz[i]); }), X(X0 - 0.6));
    var dx = [X0, X1];
    sh.dimH(dx.map(X), Y(Z0 - 3.2), ['24′-0″ TO THE HOUSE WALL'], Y(Z0 - 0.4));
    var ex = [Z0, 0, Z1];
    sh.dimV(ex.map(Y), X(X1 + 9.7), ['7′-6″ PAST THE HOUSE', fi(Z1)], X(X1 + 1.0));
    // section marks
    var sa = -8.5, sb = (st.z0 + st.z1) / 2;
    var zs = EN ? zE - 0.4 : Z1 + 2.6;
    sh.line(X(sa), Y(Z0 - 2.4), X(sa), Y(zs), 'd-ctr'); sh.secMark(X(sa), Y(Z0 - 3.1), 'A', 'A-601', 0); sh.secMark(X(sa), Y(zs + 0.7), 'A', 'A-601', 0);
    sh.line(X(X0 - 2.0), Y(sb), X(8.4), Y(sb), 'd-ctr'); sh.secMark(X(X0 - 2.7), Y(sb), 'B', 'A-601', -90);
    sh.north(X(X0 - 2.4), Y(Z0 - 2.2), 22);
    sh.vtitle(560, Y(zE) + 60, '1', EN ? 'Garage and covered entry plan' : 'Garage plan', '1/4" = 1\'-0"   On the north half of the west wall, door to the west');

    /* ---------- 2. section A, looking east ---------- */
    var kA = EN ? 18.75 : k, zA = EN ? GR.RZ1 + 1 : 13, sA = EN ? '3/16" = 1\'-0"' : '1/4" = 1\'-0"';
    var topA = G.roofTop(Math.min(zA, GR.RZ1)) + 1.4, mA = new D.Map(1600, 220, kA, Z0 - g.eaveN - 1.2, -topA);
    var clipA = [1580, 210, (zA - (Z0 - g.eaveN - 1.2)) * kA + 20, (topA + 5.0) * kA];
    D.section(sh, R, 'x', sa, mA, clipA, 13);
    sh.rect(clipA[0], clipA[1], clipA[2], clipA[3], 'd-lt');
    sh.level(mA.x(Z0 - g.eaveN - 1.0), mA.y(0) - 4, 'GRADE');
    sh.level(mA.x(Z0 - g.eaveN - 1.0), mA.y(-ys) - 16, 'T.O. SLAB +' + fi(ys) + ' ABOVE GRADE');
    sh.vtitle(1580, clipA[1] + clipA[3] + 40, 'A', 'Section A', sA + '   Looking east. Same rafters, slope and metal as the house roof');

    /* ---------- 3. section B, looking north through the door to the house ---------- */
    var rowY = EN ? Y(zE) + 170 : 1240;
    var topB = G.roofTop(sb) + 1.4, mB = new D.Map(580, rowY, k, X0 - 2.5, -topB);
    var clipB = [560, rowY - 10, (9 - (X0 - 2.5)) * k + 20, (topB + 5.0) * k];
    D.section(sh, R, 'z', sb, mB, clipB, 12);
    sh.rect(clipB[0], clipB[1], clipB[2], clipB[3], 'd-lt');
    sh.level(clipB[0] - 12, mB.y(-FF), 'HOUSE FLOOR +' + fi(FF), true);
    sh.level(clipB[0] - 12, mB.y(-ys), 'GARAGE SLAB +' + fi(ys), true);
    sh.level(clipB[0] - 12, mB.y(0), 'GRADE', true);
    sh.text(mB.x(-12), mB.y(-(ys + 9.5)), 'GARAGE', 'tc tm', 'middle'); sh.text(mB.x(4.5), mB.y(-(FF + 7.5)), 'LIVING', 'tc tm', 'middle');
    sh.vtitle(560, clipB[1] + clipB[3] + 40, 'B', 'Section B', '1/4" = 1\'-0"   Looking north. One roof plane over the garage and the house');

    /* ---------- 4. west elevation of the garage ---------- */
    var kW = EN ? 18.75 : k, zW = EN ? GR.RZ1 + 1 : 13.5, hW = EN ? 24 : 20;
    var mW = new D.Map(1600, rowY, kW, Z0 - 3, -hW), clipW = [1580, rowY - 10, (zW - (Z0 - 3)) * kW + 20, hW * kW + 30];
    D.elevation(sh, R, 'W', mW, clipW);
    sh.vtitle(1580, clipW[1] + clipW[3] + 40, '4', 'West elevation', (EN ? '3/16" = 1\'-0"   The garage door and the covered entry' : '1/4" = 1\'-0"   The garage door, the porch and the house beyond'));

    /* ---------- schedule, cost, notes ---------- */
    var x0 = 2330, y = 140, rows = {};
    var TY = { 'GAR-ODOOR': 'L', 'GAR-CLR': 'M', 'GAR-HDOOR': '3' };
    GR.units.concat(R.units.filter(function (u) { return u.it === 'GAR-HDOOR'; })).forEach(function (u) {
      var t = TY[u.it]; if (!rows[t]) rows[t] = { t: t, it: u.it, n: 0, ids: [], w: u.u1 - u.u0, h: u.v1 - u.v0, sill: u.v0, door: u.door };
      rows[t].n++; rows[t].ids.push(u.id);
    });
    var sr = Object.keys(rows).sort().map(function (key) {
      var r = rows[key], it = R.cat[r.it];
      return [r.t, it.n, fi(r.w) + ' x ' + fi(r.h), r.n, r.door ? '-' : fi(r.sill), r.ids.join(', ')];
    });
    y += sh.table(x0, y, [{ h: 'Type', w: 60 }, { h: 'Unit', w: 290, wrap: true }, { h: 'Size', w: 190 }, { h: 'Qty', w: 50, a: 'r' }, { h: 'Sill', w: 90 }, { h: 'Marks', w: 190, wrap: true }], sr, { title: 'Garage doors and windows', size: 11 }) + 44;
    var lines = R.bom.lines.filter(function (l) { return l.g === 'GAR'; }), sub = lines.reduce(function (a, l) { return a + l.ext; }, 0);
    var buckets = [['Footing, stem wall, slab, steps', /CONC|STEP/], ['Wall framing and connectors', /STUD|LSL|PLATE|HDR|HDW/], ['Rafters, deck, underlayment', /IJ16|LVL16|BLOCK|TIE|DECK|UNDER/],
      ['Metal roof, trim, soffits', /SEAM|RIB|TRIM|SOFFIT/], ['Sheathing, siding, OSB, gypsum', /SHEATH|-BB|OSB|GYP/], ['Doors and windows', /ODOOR|HDOOR|CLR/],
      ['Heater and gas pipe', /-HEAT|-GAS/], ['Lights and wiring', /LIGHT|DEV|WIRE/], ['Covered entry beam and posts', /EBEAM|EPOST/], ['Permit', /PERMIT/]].filter(function (b) { return lines.some(function (l) { return b[1].test(l.id); }); });
    var cr = buckets.map(function (b) { var v = lines.filter(function (l) { return b[1].test(l.id); }).reduce(function (a, l) { return a + l.ext; }, 0); return [b[0], '$' + v.toLocaleString('en-US')]; });
    cr.push(['Garage subtotal, before tax and the 10% contingency', '$' + sub.toLocaleString('en-US')]);
    y += sh.table(x0, y, [{ h: 'Garage cost (from the parts list, my estimates)', w: 640, wrap: true }, { h: 'Cost', w: 230, a: 'r' }], cr, { title: 'Garage cost', size: 11 }) + 44;
    sh.notes(x0, y, 870, 'Garage notes', [
      'Attached 1-car garage, 16 x 24 ft, for one SUV, a workbench and snowboard and winter gear. Same metal roof, siding and trim as the house.',
      'Place: the north half of the west wall, which has no windows. It runs 7 ft-6 in past the house to the north for width. The 10 ft door faces west to the parking, under a rake, so no roof snow lands in front of it.',
      'Roof: the house roof carried on west in the same plane. No step, so no drift load at the house wall and no wall flashing. The garage drops its snow north like the house' + (CV ? ', from the same eave line as the covered area east of it.' : '.'),
      'Fire separation: 1/2 in gypsum on the garage side of the house wall from the slab to the roof deck; seal every pipe and wire through it. Door 3 into the house: 1 3/4 in solid-core steel, self-closing, self-latching. No garage opening into a bedroom (IRC R302.5, R302.6).',
      'Slab ' + Math.round(GR.ys * 12) + ' in above grade, sloped 1/8 in per ft to the door, ' + Math.round((FF - GR.ys) * 12) + ' in below the house floor: a concrete landing ' + Math.round((st.sill - st.landing) * 12) + ' in below the door, then ' + st.risers + ' risers of ' + D.fi(st.riser).replace(/^0′-/, '') + '. Frost footing and stem wall to 48 in.',
      'Not insulated. ZIP sheathing (no foam) on the garage walls, OSB lining inside floor to roof. The house wall keeps its insulation and air barrier.',
      'Heat: propane direct-vent wall heater, about 30,000 BTU/h, gas teed off the furnace line in the floor. Takes the chill off; it does not hold the garage warm.',
      'Moved for the garage: the house panel to the garage south wall with the meter outside it; the range hood duct now runs in a soffit along the west wall and exits south of the garage. No water in the garage.',
      'Power: garage circuit 13 (GFCI) for lights, opener, receptacles and the heater. Light: four clerestory windows high on the south wall.',
      'Structure (S-101, S-201, S-401): frost footing and stem wall with thickened pads under the jack posts and hold-downs. LVL headers over the door and the clerestories, LVL jack posts between the windows. Garage rafters span north wall to south wall; walls braced per S-401 (OSB lining nailed as a shear wall).'].concat(EN ? ['Covered entry: separate rafters run from the garage south wall over the entry to the house\'s south eave line, onto an LVL beam on ' + EB.posts.length + ' 8x8 posts in line with the south wall, each on its own pier. The beam stops 1/2 in short of the house. Open to the west and south, cedar ceiling. The entry deck, firewood, meter and vents sit under it.'] : []), 11);
  });
  function XH(GR) { return GR.XH; }
})(DWG);
