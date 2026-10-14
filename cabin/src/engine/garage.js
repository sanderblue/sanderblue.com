/* Rime Cabin engine, part 5: the attached garage. Plan X/Z are the same as the house; Y is height above grade.
   It sits on the north half of the west wall and runs 7 1/2 ft past the north wall. Its roof is the house roof
   carried on west in the same plane: one shed, no step for snow to drift against. It reuses the house's wall framer. */
(function (E) {
  var TH = E.TH, COS = E.COS;

  // footprint and roof edges. The house roof reads this too: it trims its west rake and north eave edges to it.
  E.garageBox = function (M, o) {
    var GA = M.garage, g = M.geo;
    if (!o.garage || !GA) return null;
    var X0 = GA.box[0], Z0 = GA.box[1], X1 = X0 + GA.box[2], Z1 = Z0 + GA.box[3];
    // with the covered entry the garage roof runs on south to the house's south eave
    return { X0: X0, X1: X1, Z0: Z0, Z1: Z1, RZ0: Z0 - g.eaveN, RZ1: o.entryCover ? 24 + g.eaveS : Z1 + g.eaveS, ys: GA.slab };
  };

  // the garage box plus its openings, for the wind-bracing check that runs before anything is drawn
  E.garagePlan = function (M, o) {
    var B = E.garageBox(M, o); if (!B) return null;
    var ops = { N: [], S: [], E: [], W: [] };
    M.garage.openings.forEach(function (op) { ops[op.wall].push({ id: op.id, u0: op.u[0], u1: op.u[1], v0: op.v[0], v1: op.v[1], door: !!op.door }); });
    return Object.assign({}, B, { entry: !!o.entryCover, ops: ops });
  };

  E.garage = function (C, G) {
    var M = C.M, o = C.o, GA = M.garage, g = M.geo, B = E.garageBox(M, o);
    if (!B) return null;
    var X0 = B.X0, X1 = B.X1, Z0 = B.Z0, Z1 = B.Z1, ys = GA.slab, FF = G.FF;
    var t6 = g.t6, zip = g.zip, sd = g.siding, rd = G.rd, rw = G.rw, rs = G.rs, rk = g.rake;
    var RZ0 = B.RZ0, RZ1 = B.RZ1;
    // the garage roof meets the house roof over the house's west end rafter (XH); north of the house's eave line (ZH)
    // without the covered area, the garage roof carries on east to its own rake
    var ZH = -g.eaveN, XH = G.roofJoin ? G.roofJoin.x : -rk, XHN = G.roofJoin ? G.roofJoin.xN : XH;
    var hx = -zip, zh = -(zip + sd), gyp = 0.042; // house sheathing face (west), house siding face (north), 1/2 in gypsum
    // same layers as the house roof (lower deck, vent sleepers, upper deck), so rafters, soffits and fascia share one plane
    var GG = G, rb = G.rb, roofTop = G.roofTop;
    var out = { X0: X0, X1: X1, Z0: Z0, Z1: Z1, RZ0: RZ0, RZ1: RZ1, ys: ys, rb: rb, roofTop: roofTop, attached: true, XH: XH, ZH: ZH, entry: !!o.entryCover };

    /* ---------- foundation: frost footing, stem wall, slab ---------- */
    var fr = g.frost, fw = 1.667, fh = 0.83, sw = 0.667;
    [[X0, Z0, X1 - X0, sw], [X0, Z1 - sw, X1 - X0, sw], [X0, Z0, sw, Z1 - Z0], [X1 - sw, Z0, sw, Z1 - Z0]].forEach(function (b, i) {
      var horiz = i < 2, fx = b[0] - (horiz ? 0 : (fw - sw) / 2), fz = b[1] - (horiz ? (fw - sw) / 2 : 0), fdx = horiz ? b[2] : fw, fdz = horiz ? fw : b[3];
      // the east footing stops where a combined pad under the house's corner pier carries it (E.foundation)
      var cuts = i === 3 ? (G.combined || []).filter(function (c) { return c.x0 < fx + fdx && c.x1 > fx; }) : [];
      var runs = [[fz, fz + fdz]];
      cuts.forEach(function (c) { runs = runs.reduce(function (a, r) { if (c.z1 <= r[0] || c.z0 >= r[1]) a.push(r); else { if (c.z0 > r[0]) a.push([r[0], c.z0]); if (c.z1 < r[1]) a.push([c.z1, r[1]]); } return a; }, []); });
      runs.forEach(function (r) { if (r[1] - r[0] > 0.05) C.box('GAR-CONC', fx, -fr, r[0], fdx, fh, r[1] - r[0], { n: 'Garage footing', nq: true }); });
      C.box('GAR-CONC', b[0], -fr + fh, b[1], b[2], ys - (-fr + fh), b[3], { n: 'Garage stem wall', nq: true });
    });
    // pads under the clerestory jack posts on the south wall
    var cl = GA.openings.filter(function (op) { return op.wall === 'S' && !op.door; }).sort(function (a, b) { return a.u[0] - b.u[0]; }), padU = [];
    cl.forEach(function (op, k) {
      if (k === 0) padU.push(op.u[0] - 0.25);
      if (k < cl.length - 1 && cl[k + 1].u[0] - op.u[1] < 1) padU.push((op.u[1] + cl[k + 1].u[0]) / 2); else padU.push(op.u[1] + 0.25);
    });
    padU.forEach(function (u) { C.box('GAR-CONC', u - 1.25, -fr, Z1 - sw / 2 - 1.25, 2.5, fh, 2.5, { n: 'Footing widened to 2 ft 6 in square under a jack post', nq: true }); });
    C.box('GAR-CONC', X0 + sw, ys - 0.33, Z0 + sw, X1 - X0 - 2 * sw, 0.33, Z1 - Z0 - 2 * sw, { n: 'Garage slab, 4 in', area: (X1 - X0) * (Z1 - Z0) });

    /* ---------- openings: framed rough openings and the units that fill them ---------- */
    var ops = { N: [], S: [], E: [], W: [] }, units = [], SS = G.S, sPosts = [];
    var clr = GA.openings.filter(function (op) { return op.wall === 'S' && !op.door; }).sort(function (a, b) { return a.u[0] - b.u[0]; });
    GA.openings.forEach(function (op) {
      var rec = { id: op.id, u0: op.u[0], u1: op.u[1], v0: op.v[0], v1: op.v[1], hd: op.hd || 0.99, hit: op.hit || 'GAR-HDRL', door: !!op.door };
      if (op.wall === 'S' && !op.door && SS.garageHeader) {
        var h = SS.garageHeader(rec), k = clr.indexOf(op);
        rec.hdrN = h.n; rec.jp = [null, null]; rec.ext = [0, 0];
        [0, 1].forEach(function (side) {
          var nb = side ? clr[k + 1] : clr[k - 1], gap = nb ? (side ? nb.u[0] - op.u[1] : op.u[0] - nb.u[1]) : 99;
          if (gap < 1.0) { rec.ext[side] = gap / 2; if (side) sPosts.push([op.u[1], nb.u[0], 'GAR-JPOST', ys + 0.125, 'Jack post between the windows, ' + SS.jackPost(2 * h.R, true).ply + '-ply LVL', h.R * 2]); }
          else { var jp = SS.jackPost(h.R, true); rec.jp[side] = { it: 'GAR-JPOST', w: jp.w, n: 'Jack post, ' + jp.ply + '-ply LVL' }; }
        });
      }
      ops[op.wall].push(rec);
      var n = op.cols || 1, w = (op.u[1] - op.u[0]) / n;
      for (var i = 0; i < n; i++) {
        units.push({ id: op.id + (n > 1 ? String.fromCharCode(97 + i) : ''), it: op.it, wall: op.wall, u0: op.u[0] + i * w, u1: op.u[0] + (i + 1) * w, v0: op.v[0], v1: op.v[1],
          door: !!op.door, ohd: !!op.ohd, note: op.note, n: C.cat[op.it].n });
      }
    });
    out.ops = ops; out.units = units;

    /* ---------- walls: north, south and west, plus a short east wall north of the house ---------- */
    var common = { stud: 'GAR-STUD', tall: 'GAR-LSL', plate: 'GAR-PLATE', bot: ys, ff: ys };
    function wall(w) { E.frameWall(C, G, Object.assign(w, common)); }
    wall({ axis: 'x', u0: X0, u1: X1, c: Z0 + t6 / 2, t: t6, top: function () { return rb(Z0); }, ops: ops.N, extra: [X0 + t6 + 0.0625, X1 - t6 - 0.0625] });
    wall({ axis: 'x', u0: X0, u1: hx - gyp, c: Z1 - t6 / 2, t: t6, top: function () { return rb(Z1 - t6); }, ops: ops.S, extra: [X0 + t6 + 0.0625],
      posts: sPosts.map(function (p) { var op = ops.S.filter(function (r) { return Math.abs(r.u1 - p[0]) < 0.01; })[0]; return [p[0], p[1], p[2], ys + op.v1, p[4]]; }) });
    wall({ axis: 'z', u0: Z0 + t6, u1: Z1 - t6, c: X0 + t6 / 2, t: t6, top: rb, sloped: true, ops: ops.W });
    wall({ axis: 'z', u0: Z0 + t6, u1: zh, c: X1 - t6 / 2, t: t6, top: rb, sloped: true, ops: ops.E });
    [[Z0, rb(Z0), rb(Z0 + t6), X1], [Z1 - t6, rb(Z1 - t6), rb(Z1), hx - gyp]].forEach(function (b) {
      C.add({ it: 'GAR-PLATE', k: 'box', c: [(X0 + b[3]) / 2, (b[1] + b[2]) / 2 + 0.03, b[0] + t6 / 2], s: [b[3] - X0, 0.09, t6 / COS], rx: -TH, len: b[3] - X0, n: 'Beveled bearing plate' });
    });

    /* ---------- roof: the house plane carried west ---------- */
    // rafters laid out from the house's west end rafter so the spacing runs on unbroken across the joint
    var rit = 'GAR-' + G.st.rafter.slice(4), R = { roofy: true }, xs = [], north = [];
    for (var xr = XH - rs; xr > X0 + rw / 2 + 0.3; xr -= rs) xs.push(xr);
    xs.push(X0 + rw / 2); xs.reverse(); xs.forEach(function () { north.push(false); });
    // without the covered area, a short piece of roof runs north of the house's eave out to the garage's east rake
    var cov = !!G.cover, RX0 = X0 - rk, RX1 = cov ? XH : X1 + rk, ent = !!o.entryCover;
    if (!cov) { for (var xn = XH; xn < X1 - rw / 2 - 0.3; xn += rs) { xs.push(xn); north.push(true); } xs.push(X1 - rw / 2); north.push(true); }
    out.cover = cov;
    var zgN = Z0 + t6 / 2, zgS = Z1 - t6 / 2;
    // simple spans: garage north wall to garage south wall (to the eave without the entry), then on to the entry beam
    xs.forEach(function (x, i) {
      if (north[i]) {
        E.slopeFit(C, rit, x - rw / 2, x + rw / 2, RZ0, ZH - 0.02, rd / 2, rd, G, { n: 'Rafter, short (north of the house)', roofy: true }, true, false);
      } else {
        E.slopeFit(C, rit, x - rw / 2, x + rw / 2, RZ0, ent ? zgS : RZ1, rd / 2, rd, G, { n: 'Rafter', roofy: true }, true, !ent);
        if (ent) E.slopeFit(C, rit, x - rw / 2, x + rw / 2, zgS, RZ1, rd / 2, rd, G, { n: 'Rafter, covered entry', roofy: true }, false, true);
        C.box('GAR-TIE', x + rw / 2, rb(Z1 - 0.2) - 0.25, Z1 - 0.3, 0.02, 0.6, 0.2, R);
      }
      C.box('GAR-TIE', x + rw / 2, rb(Z0 + 0.2) - 0.25, Z0 + 0.1, 0.02, 0.6, 0.2, R);
    });
    // blocking panels at the garage walls; the bay against the house's end rafter gets them too
    var bx = xs.slice();
    for (var i = 1; i <= bx.length; i++) {
      var last = i === bx.length; if (last && !cov) break;
      var shortBay = !last && north[i] && bx[i] > XH + 0.01, xe0 = bx[i - 1] + rw / 2;
      E.slopeBox(C, 'GAR-BLOCK', xe0, (last ? XHN : bx[i]) - rw / 2, Z0, Z0 + t6, rd / 2, rd, GG, { n: 'Blocking at bearing', roofy: true });
      if (!shortBay) E.slopeBox(C, 'GAR-BLOCK', xe0, (last ? XH : bx[i]) - rw / 2, Z1 - t6, Z1, rd / 2, rd, GG, { n: 'Blocking at bearing', roofy: true });
    }
    // rakes: outriggers in the vent layer, like the house
    var zW = E.rake(C, G, -1, X0, RZ0, RZ1, true, true, 'GAR-FLY', R), zE = !cov ? E.rake(C, G, 1, X1, RZ0, ZH, true, false, 'GAR-FLY', R) : null;
    // decks, sleepers over the rafters, underlayment, metal: the main piece west of the joint, and the short north piece
    var every = G.rs < 1.1, metal = o.roof === 'seam' ? 'GAR-SEAM' : 'GAR-RIB', IT = { d1: 'GAR-DECK', sl: 'GAR-SLEEPER', d2: 'GAR-DECK2', iw: 'GAR-UNDER', syn: 'GAR-UNDER', metal: metal };
    var mainX = xs.filter(function (x, i) { return !north[i]; }), nX = xs.filter(function (x, i) { return north[i]; });
    // sleepers over every second rafter counting from the house's (the house lays the one on the joint)
    var slMain = mainX.filter(function (x, i) { var k = mainX.length - 1 - i; return (!every || k % 2 === 1) && x > zW[1]; });
    if (XHN !== XH) {
      // north of the house the joint is over the end rafter on the garage's short east wall
      E.roofLayers(C, G, { lo: [X0, XHN], up: [RX0, XHN], za: RZ0, zb: 0, fa: true, fb: false, sl: slMain, it: IT, eaves: [RZ0, RZ1], R: R });
      E.roofLayers(C, G, { lo: [X0, XH], up: [RX0, XH], za: 0, zb: RZ1, fa: false, fb: true, sl: slMain, it: IT, eaves: [RZ0, RZ1], R: R });
    } else E.roofLayers(C, G, { lo: [X0, XH], up: [RX0, XH], za: RZ0, zb: RZ1, fa: true, fb: true, sl: slMain, it: IT, eaves: [RZ0, RZ1], R: R });
    if (!cov) {
      var slN = nX.filter(function (x, i) { return (!every || i % 2 === 0) && x < zE[0]; });
      E.roofLayers(C, G, { lo: [XH, X1], up: [XH, RX1], za: RZ0, zb: ZH, fa: true, fb: false, sl: slN, it: IT, eaves: [RZ0, RZ1], R: R });
      [RZ0 + 2.0, RZ0 + 5.5].forEach(function (z) { E.slopeBox(C, 'RFG-SNOW', RX0 + 0.5, RX1 - 0.5, z - 0.06, z + 0.06, G.stackT + 0.08, 0.16, GG, { n: 'Snow rail', len: RX1 - RX0 - 1, roofy: true }); });
    }
    // fascia as deep as the house fascia so the edges line up
    var fd = (G.stackT - g.metal - 0.02) / COS, ytN = roofTop(RZ0) - (g.metal + 0.02) / COS, ytS = roofTop(RZ1) - (g.metal + 0.02) / COS;
    var nE = cov ? XHN : RX1 + 0.125;
    C.box('GAR-TRIM', RX0 - 0.125, ytN - fd, RZ0 - 0.125, nE - RX0 + 0.125, fd, 0.125, { n: 'Fascia, north eave', roofy: true });
    C.box('GAR-TRIM', RX0 - 0.125, ytS - fd, RZ1, (ent ? XH : -rk) - RX0 + 0.125, fd, 0.125, { n: 'Fascia, south eave', roofy: true });
    var fT = G.stackT - g.metal - 0.02;
    E.slopeFit(C, 'GAR-TRIM', RX0 - 0.125, RX0, RZ0, RZ1, fT / 2, fT, GG, { n: 'Fascia, rake', len: (RZ1 - RZ0) / COS, roofy: true }, true, true);
    var dF = fT * E.SIN;
    C.box('GAR-TRIM', RX0 - 0.125, rb(RZ1 - dF), RZ1 - dF, 0.125, ytS - rb(RZ1 - dF), dF, { n: 'Fascia corner', nq: true, roofy: true });
    C.box('GAR-TRIM', RX0 - 0.125, rb(RZ0), RZ0, 0.125, ytN - rb(RZ0) + dF / 3, dF, { n: 'Fascia corner', nq: true, roofy: true });
    if (!cov) E.slopeFit(C, 'GAR-TRIM', RX1, RX1 + 0.125, RZ0, ZH, fT / 2, fT, GG, { n: 'Fascia, rake', len: (ZH - RZ0) / COS, roofy: true }, true, false);
    // cedar soffits in the rafter-underside plane, like the house; the entry ceiling runs to the house siding
    var esw = zip + sd, eb0 = ent ? M.entry.beam.z - M.entry.beam.w / 2 : 0, eb1 = ent ? M.entry.beam.z + M.entry.beam.w / 2 : 0;
    E.slopeBox(C, 'GAR-SOFFIT', RX0, cov ? X1 + esw : RX1, RZ0, Z0 - esw, -0.03, 0.05, GG, { n: 'Soffit, north eave', area: ((cov ? X1 + esw : RX1) - RX0) * (g.eaveN - esw) / COS, roofy: true });
    var sx1 = ent ? -esw : -rk;
    if (ent) {
      E.slopeBox(C, 'GAR-SOFFIT', RX0, sx1, Z1 + esw, eb0, -0.03, 0.05, GG, { n: 'Ceiling, covered entry', area: (sx1 - RX0) * (eb0 - Z1 - esw) / COS, roofy: true });
      E.slopeBox(C, 'GAR-SOFFIT', RX0, sx1, eb1, RZ1, -0.03, 0.05, GG, { n: 'Soffit, covered entry eave', area: (sx1 - RX0) * (RZ1 - eb1) / COS, roofy: true });
    } else E.slopeBox(C, 'GAR-SOFFIT', RX0, sx1, Z1 + esw, RZ1, -0.03, 0.05, GG, { n: 'Soffit, south eave', area: (sx1 - RX0) * (RZ1 - Z1 - esw) / COS, roofy: true });
    E.slopeBox(C, 'GAR-SOFFIT', RX0 + 0.125, X0 - esw, Z0 - esw, Z1 + esw, -0.03, 0.05, GG, { n: 'Soffit, rake', area: (rk - esw) * (Z1 - Z0 + 2 * esw) / COS, roofy: true });
    if (!cov) E.slopeBox(C, 'GAR-SOFFIT', X1 + esw, RX1 - 0.125, Z0 - esw, ZH, -0.03, 0.05, GG, { n: 'Soffit, rake', area: (rk - esw) * (ZH - Z0 + esw) / COS, roofy: true });
    // covered entry: LVL beam on a beveled plate, three 8x8 posts on their own piers; it stops short of the house
    if (ent) {
      var EN = M.entry, eb = EN.beam, SE = G.S.entry, ebt = rb(eb.z - eb.w / 2) - 0.09, ex0 = SE.x0, ex1 = SE.x1;
      C.box('GAR-EBEAM', ex0, ebt - eb.d, eb.z - eb.w / 2, ex1 - ex0, eb.d, eb.w, { n: 'Beam, covered entry', len: ex1 - ex0 });
      C.add({ it: 'GAR-PLATE', k: 'box', c: [(ex0 + ex1) / 2, rb(eb.z) - 0.05, eb.z], s: [ex1 - ex0, 0.09, eb.w / COS], rx: -TH, len: ex1 - ex0, n: 'Beveled plate on the entry beam' });
      EN.posts8.forEach(function (px, k) {
        C.box('GAR-EPOST', px - EN.post / 2, 0.5, eb.z - EN.post / 2, EN.post, ebt - eb.d - 0.5, EN.post, { n: 'Post, covered entry' });
        E.pierAt(C, px, eb.z, SE.posts[k].ftg, 18, 0.5, { label: 'covered-entry post' });
      });
      mainX.forEach(function (x, i) { if (i) E.slopeBox(C, 'GAR-BLOCK', mainX[i - 1] + rw / 2, x - rw / 2, eb.z - t6 / 2, eb.z + t6 / 2, rd / 2, rd, GG, { n: 'Blocking at the beam', roofy: true }); });
      E.slopeBox(C, 'GAR-BLOCK', mainX[mainX.length - 1] + rw / 2, XH - rw / 2, eb.z - t6 / 2, eb.z + t6 / 2, rd / 2, rd, GG, { n: 'Blocking at the beam', roofy: true });
      mainX.forEach(function (x) { C.box('GAR-TIE', x + rw / 2, rb(eb.z) - 0.25, eb.z - 0.1, 0.02, 0.6, 0.2, R); });
      out.ebeam = { x0: ex0, x1: ex1, z: eb.z, bottom: ebt - eb.d, posts: EN.posts8.slice() };
    }

    /* ---------- skins: siding, sheathing, OSB lining; gypsum on the house wall ---------- */
    var rakeUp = 0, ext = zip + sd; // rake soffits are in the rafter-underside plane, so siding stops there
    function holes(w) { return ops[w].map(function (op) { return [op.u0, ys + (op.door ? 0.02 : op.v0), op.u1, ys + op.v1]; }); }
    // a: start, b: end along the wall; ea/eb: how far siding (and sheathing) wrap past each end
    var walls = {
      N: { axis: 'x', face: Z0, dir: 1, top: function () { return rb(Z0); }, a: X0, b: X1, ea: 1, eb: 1, ia: X0 + t6, ib: X1 - t6 },
      S: { axis: 'x', face: Z1, dir: -1, top: function () { return rb(Z1); }, a: X0, b: hx, ea: 1, eb: 0, ia: X0 + t6, ib: hx - gyp },
      W: { axis: 'z', face: X0, dir: 1, top: function (u) { return rb(Math.max(Z0, Math.min(Z1, u))) + rakeUp; }, a: Z0, b: Z1, ea: 1, eb: 1, ia: Z0 + t6, ib: Z1 - t6 },
      E: { axis: 'z', face: X1, dir: -1, top: function (u) { return rb(Math.max(Z0, Math.min(Z1, u))) + rakeUp; }, a: Z0, b: zh, ea: 1, eb: 0, ia: Z0 + t6, ib: zh }
    };
    var NAMES = { N: 'north', S: 'south', E: 'east', W: 'west' };
    Object.keys(walls).forEach(function (id) {
      var w = walls[id], hs = holes(id), xe = w.axis === 'x' ? ext : zip, ze = w.axis === 'x' ? zip : 0;
      var a = w.a - xe * w.ea, b = w.b + xe * w.eb;
      function outline(u0, u1, vb) { return [[u0, vb], [u1, vb], [u1, w.top(u1)], [u0, w.top(u0)]]; }
      // siding stops 6 in above grade, so door openings become notches in its bottom edge rather than holes
      var vb = ys + 0.2, notch = hs.filter(function (h) { return h[1] <= vb; }).sort(function (p, q) { return p[0] - q[0]; });
      var bo = [[a, vb]];
      notch.forEach(function (h) { bo.push([h[0], vb], [h[0], h[3]], [h[2], h[3]], [h[2], vb]); });
      bo.push([b, vb], [b, w.top(b)], [a, w.top(a)]);
      E.skin(C, 'GAR-BB', w.axis, w.face, w.dir, -(zip + sd), -zip, bo, hs.filter(function (h) { return h[1] > vb; }), { side: id, solo: true, tex: 'siding', n: 'Board and batten, garage ' + NAMES[id] + ' wall' });
      var sOut = outline(w.a - ze * w.ea, w.b + ze * w.eb, ys);
      if (w.axis === 'z') { sOut[2][1] += rd / COS; sOut[3][1] += rd / COS; }
      E.skin(C, 'GAR-SHEATH', w.axis, w.face, w.dir, -zip, 0, sOut, hs, { side: id, n: 'Sheathing, garage ' + NAMES[id] + ' wall' });
      // OSB lining floor to roof: hang racks anywhere, and the inside reads finished
      var itop = function (u) { return (w.axis === 'x' ? rb(id === 'N' ? Z0 + t6 : Z1 - t6) : rb(u)) + rd / COS - 0.02; };
      E.skin(C, 'GAR-OSB', w.axis, w.face, w.dir, t6, t6 + 0.036, [[w.ia, ys], [w.ib, ys], [w.ib, itop(w.ib)], [w.ia, itop(w.ia)]], hs, { side: id, n: 'OSB lining, garage ' + NAMES[id] + ' wall' });
    });
    // fire separation: 1/2 in gypsum on the garage side of the house wall, slab to roof deck, around the door to the house
    var hdoor = (C.M.openings.filter(function (op) { return op.it === 'GAR-HDOOR'; })[0] || {}).u;
    var gTop = function (u) { return G.rb(u) + rd / COS - 0.01; }, gz0 = zh, gz1 = Z1 - t6;
    E.skin(C, 'GAR-GYP', 'z', 0, 1, -(zip + gyp), -zip, [[gz0, ys], [gz1, ys], [gz1, gTop(gz1)], [gz0, gTop(gz0)]], hdoor ? [[hdoor[0], FF + 0.02, hdoor[1], FF + 6.9]] : [], { side: 'W', n: 'Gypsum board, garage side of the house wall' });
    // two steps up to the house floor
    // a landing 3 ft deep no more than 7 3/4 in below the door sill, then risers of 7 1/2 in or less down to the slab
    // the steps run north along the house wall, so the landing stays clear of the panel's working space and the car
    var st = GA.steps.u, xg = hx - gyp, land = FF - 0.6, nr = Math.ceil((land - ys) / 0.625 - 1e-6), rz = (land - ys) / nr, z0s = st[0] - (nr - 1) * 0.92;
    C.box('GAR-STEP', xg - 3.0, ys, st[0], 3.0, land - ys, st[1] - st[0], { n: 'Landing at the house door' });
    for (var si = 1; si < nr; si++) C.box('GAR-STEP', xg - 3.0, ys, st[0] - si * 0.92, 3.0, land - ys - si * rz, 0.92, { n: 'Step', nq: true });
    out.steps = { x0: xg - 3.0, x1: xg, z0: z0s, z1: st[1], riser: rz, landing: land, risers: nr, sill: FF };

    /* ---------- windows and doors ---------- */
    var wl = { N: ['x', Z0, 1], S: ['x', Z1, -1], W: ['z', X0, 1], E: ['z', X1, -1] };
    units.forEach(function (u) {
      var w = wl[u.wall];
      C.add({ it: u.it, k: 'win', axis: w[0], face: w[1], dir: w[2], u0: u.u0, u1: u.u1, v0: ys + (u.door ? 0.02 : u.v0), v1: ys + u.v1, d0: -zip, d1: u.door ? t6 : t6 - 0.15,
        door: u.door, ohd: u.ohd, side: u.wall, unit: u.id, n: u.n + ' (' + u.id + ')' });
    });

    /* ---------- heat and propane: wall heater on the south wall by the house, gas teed off the furnace line ---------- */
    var hxc = GA.heater.x, zi = Z1 - t6;
    C.box('GAR-HEAT', hxc - 1.0, ys + 1.6, zi - 0.75, 2.0, 2.4, 0.75, { n: 'Propane wall heater, about ' + GA.heater.btu.toLocaleString('en-US') + ' BTU/h' });
    C.poly('GAR-HEAT', [[hxc, ys + 3.4, zi - 0.3], [hxc, ys + 3.4, Z1 + 0.45], [hxc, 7.5, Z1 + 0.45], [hxc, 7.5, Z1 + 0.8]], 0.22, { n: 'Heater vent with snorkel kit', nq: true, m: 'steel' });
    out.vent = [hxc, 7.5, Z1 + 0.8];
    out.heater = { x: hxc, z: zi - 0.375, x0: hxc - 1.0, x1: hxc + 1.0, z0: zi - 0.75, bottom: 1.6 };
    // tee off the furnace line in the floor framing, drop below the joists, pass under the end beam through the
    // closure wall (sleeved and sealed: it is the fire separation), then up the garage wall to the heater
    var gp = FF - 0.45, gz = zi - 0.15, gu = G.beamBot - 0.12;
    C.poly('GAR-GAS', [[1.0, gp, 8.0], [1.0, gu, 8.0], [1.0, gu, gz], [hxc + 0.7, gu, gz], [hxc + 0.7, ys + 1.6, gz]], 0.04, { n: 'Gas pipe to the garage heater, off the furnace line', m: 'gas' });
    out.gasTee = [1.0, gp, 8.0];

    /* ---------- electrical: circuit 13 from the panel on the south wall ---------- */
    var pn = GA.panel, pX = pn[0] + pn[3] / 2, pyb = ys + pn[1], pyt = pyb + pn[4], wz = zi - 0.05, px = hx - gyp - 0.05;
    out.panel = { x0: pn[0], x1: pn[0] + pn[3], z0: pn[2], z1: pn[2] + pn[5] };
    var ex = X1 - t6 - 0.06, wx = X0 + t6 + 0.06, nz = Z0 + t6 + 0.06, wy = ys + 4.3;
    var hd = (GA.openings.filter(function (op) { return op.ohd; })[0] || { u: [0, 0], v: [0, 8] });
    var lz = 1.0, ly = rb(lz) - 0.45, oz = (hd.u[0] + hd.u[1]) / 2, ox = X0 + 11.5, sw = (GA.steps.u[1] + 0.5);
    var devs = [[px, wy, sw, 'Switch, lights (by the house door)'], [px, wy, sw + 0.3, 'Switch, outside lights'], [hxc, wy, wz, 'Heater connection'],
      [ex, ys + 3.6, -4.2, 'Receptacle, workbench'], [ex, ys + 3.6, -1.6, 'Receptacle, workbench'], [pX, ys + 1.5, nz, 'Receptacle'],
      [wx, ys + 1.5, -5.0, 'Receptacle'], [ox, rb(oz) - 0.6, oz, 'Ceiling receptacle, door opener']];
    devs.forEach(function (d) { C.box('GAR-DEV', d[0] - 0.12, d[1] - 0.18, d[2] - 0.12, 0.24, 0.36, 0.24, { n: d[3] }); });
    [X0 + 5, (X0 + X1) / 2, X1 - 5].forEach(function (x) { C.box('GAR-LIGHT', x - 2, ly, lz - 0.3, 4, 0.18, 0.6, { n: 'LED ceiling fixture, 4 ft' }); });
    [hd.u[0] - 0.75, hd.u[1] + 0.5].forEach(function (z) { C.box('GAR-LIGHT', X0 - zip - sd - 0.24, ys + 7.2, z - 0.25, 0.24, 0.8, 0.5, { n: 'Wall light, outside' }); });
    var wt = ys + hd.v[1] + 1.15, rbz = function (z) { return rb(z) - 0.15; };
    C.poly('GAR-WIRE', [[pX, pyb, wz], [pX, wy, wz], [px, wy, wz], [px, wy, sw]], 0.03, { n: 'Switch and heater circuit, garage', m: 'white' });
    C.poly('GAR-WIRE', [[pX, pyt, wz], [pX, rbz(wz), wz], [pX, ly + 0.1, lz], [X0 + 5, ly + 0.1, lz]], 0.03, { n: 'Light circuit, garage', m: 'white' });
    C.poly('GAR-WIRE', [[ox, ly + 0.1, lz], [ox, rb(oz) - 0.45, oz]], 0.03, { n: 'Opener circuit, garage', m: 'white' });
    C.poly('GAR-WIRE', [[pX, ly + 0.1, lz], [pX, rbz(nz), nz], [pX, wy, nz], [ex, wy, nz], [ex, wy, -1.6]], 0.03, { n: 'Workbench circuit, garage', m: 'white' });
    C.poly('GAR-WIRE', [[pX, wy, nz], [wx, wy, nz], [wx, wy, -5.0], [wx, wt, -5.0], [wx, wt, hd.u[1] + 0.5], [wx, ys + 7.6, hd.u[1] + 0.5]], 0.03, { n: 'Receptacle and outside light circuit, garage', m: 'white' });

    /* ---------- the car, the workbench and the gear wall, for scale ---------- */
    var F = { nq: true, L: 'furn', gar: true }, car = GA.car, cx0 = car.x, cz0 = car.z, cl = car.len, cw = car.w, nose = cx0 + cl;
    C.box('INT-FURN', cx0, ys + 1.0, cz0, cl, 2.1, cw, Object.assign({ n: 'SUV', m: 'fab' }, F));
    C.box('INT-FURN', nose - 3.2 - (cl - 5.0), ys + 3.1, cz0 + 0.25, cl - 5.0, 2.4, cw - 0.5, Object.assign({ n: 'SUV cabin', m: 'steelDark' }, F));
    C.box('INT-FURN', nose - 10.0, ys + 5.5, cz0 + 0.6, 6.0, 0.25, cw - 1.2, Object.assign({ n: 'Roof box', m: 'black' }, F));
    [[nose - 3.0, cz0 + 0.35], [nose - 3.0, cz0 + cw - 0.35], [cx0 + 3.0, cz0 + 0.35], [cx0 + 3.0, cz0 + cw - 0.35]].forEach(function (w) {
      C.add({ it: 'INT-FURN', k: 'cyl', c: [w[0], ys + 1.05, w[1]], r: 1.05, h: 0.8, rx: Math.PI / 2, n: 'Wheel', m: 'black', nq: true, L: 'furn', gar: true });
    });
    out.car = { x0: cx0, x1: nose, z0: cz0, z1: cz0 + cw };
    // workbench and pegboard in the northeast corner, on the short east wall
    var bz0 = Z0 + t6 + 0.4, bz1 = -0.9, bx1 = X1 - t6 - 0.04;
    C.box('INT-FURN', bx1 - 2.0, ys + 2.85, bz0, 2.0, 0.15, bz1 - bz0, Object.assign({ n: 'Workbench top', m: 'wood' }, F));
    [[bx1 - 1.9, bz0 + 0.1], [bx1 - 1.9, bz1 - 0.25], [bx1 - 0.25, bz0 + 0.1], [bx1 - 0.25, bz1 - 0.25]].forEach(function (l) { C.box('INT-FURN', l[0], ys, l[1], 0.15, 2.85, 0.15, Object.assign({ n: 'Workbench leg', m: 'steelDark' }, F)); });
    C.box('INT-FURN', bx1 - 2.0, ys + 0.6, bz0, 2.0, 0.08, bz1 - bz0, Object.assign({ n: 'Workbench shelf', m: 'wood' }, F));
    C.box('INT-FURN', bx1 - 0.04, ys + 3.3, bz0, 0.04, 3.0, bz1 - bz0, Object.assign({ n: 'Pegboard', m: 'cedar' }, F));
    out.bench = { x0: bx1 - 2.0, x1: bx1, z0: bz0, z1: bz1 };
    // gear wall on the north side: snowboards in a rack, then shelves and bins
    var rx0 = X0 + t6 + 0.6;
    C.box('INT-FURN', rx0, ys + 0.6, nz, 7.6, 0.15, 0.5, Object.assign({ n: 'Board rack', m: 'wood' }, F));
    for (var bI = 0; bI < 7; bI++) C.box('INT-FURN', rx0 + 0.25 + bI * 1.05, ys + 0.75, nz + 0.1, 0.95, 5.2, 0.12, Object.assign({ n: 'Snowboard', m: bI % 2 ? 'fab2' : 'fab' }, F));
    var sx0 = rx0 + 8.2, sl = 10.5;
    [0.5, 2.2, 3.9, 5.6].forEach(function (h) { C.box('INT-FURN', sx0, ys + h, nz, sl, 0.12, 1.6, Object.assign({ n: 'Shelf', m: 'wood' }, F)); });
    [sx0, sx0 + sl / 2, sx0 + sl - 0.12].forEach(function (x) { C.box('INT-FURN', x, ys, nz, 0.12, 6.4, 1.6, Object.assign({ n: 'Shelf post', m: 'steelDark' }, F)); });
    for (var bj = 0; bj < 5; bj++) C.box('INT-FURN', sx0 + 0.5 + bj * 1.95, ys + 2.32, nz + 0.1, 1.5, 1.0, 1.3, Object.assign({ n: 'Gear bin', m: bj % 2 ? 'black' : 'fab' }, F));
    out.shelves = { x0: rx0, x1: sx0 + sl, z0: nz, z1: nz + 1.6 };

    return out;
  };
})(ENG);
