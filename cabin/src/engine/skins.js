/* Rime Cabin engine, part 2: wall skins (siding, sheathing, insulation, drywall), windows and doors,
   fixtures, porch, propane tank and site pieces. */
(function (E) {
  function polyArea(pts) {
    var a = 0;
    for (var i = 0; i < pts.length; i++) { var p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; }
    return Math.abs(a) / 2;
  }
  E.polyArea = polyArea;

  // A skin is a flat layer with an outline and rectangular holes. u runs along the wall, v is height (absolute).
  // axis 'x': X = u, Z = face + dir * w. axis 'z': Z = u, X = face + dir * w. w runs d0..d1.
  function skin(C, it, axis, face, dir, d0, d1, outline, holes, x) {
    var ha = 0;
    holes.forEach(function (h) { ha += (h[2] - h[0]) * (h[3] - h[1]); });
    var area = polyArea(outline) - ha;
    return C.add({ it: it, k: 'skin', axis: axis, face: face, dir: dir, d0: d0, d1: d1, outline: outline, holes: holes, area: area, vol: area * Math.abs(d1 - d0) }, x);
  }
  E.skin = skin;

  E.skins = function (C, G, OP) {
    var M = C.M, o = C.o, g = M.geo, FF = G.FF, t6 = g.t6, zip = g.zip, sd = g.siding, dw = g.dw;
    // siding stops 3 in below the floor framing (over the skirt) and, on the end walls, at the rake soffit, which is
    // in the rafter-underside plane; the sheathing (air barrier) carries on up over the end rafter to the roof deck
    var vbS = G.sidingBot, vbZ = FF - g.sub - g.joist, deckUp = G.rd / E.COS;
    function holesFor(w) {
      return OP.ops[w].map(function (op) {
        var v1 = op.bay ? M.southBays.tiers[2][1] : op.v1;
        return [op.u0, FF + (op.door ? 0.02 : op.v0), op.u1, FF + v1];
      });
    }
    var walls = {
      N: { axis: 'x', face: 0, dir: 1, top: function () { return G.rb(0); }, rake: false },
      S: { axis: 'x', face: 24, dir: -1, top: function () { return G.rb(24); }, rake: false },
      W: { axis: 'z', face: 0, dir: 1, top: function (u) { return G.rb(u); }, rake: true },
      E: { axis: 'z', face: 32, dir: -1, top: function (u) { return G.rb(u); }, rake: true }
    };
    // an attached garage covers the north part of the west wall: no siding there (gypsum goes on instead, see E.garage)
    var GB = E.garageBox ? E.garageBox(M, o) : null;
    Object.keys(walls).forEach(function (id) {
      var w = walls[id], hs = holesFor(id), L = w.axis === 'x' ? 32 : 24;
      function outline(u0, u1, vb, up) { up = up || 0; return [[u0, vb], [u1, vb], [u1, w.top(Math.max(0, Math.min(24, u1))) + up], [u0, w.top(Math.max(0, Math.min(24, u0))) + up]]; }
      var ext = w.axis === 'x' ? zip + sd : zip, sa = id === 'W' && GB ? GB.Z1 + zip + sd : -ext;
      skin(C, 'EXT-BB', w.axis, w.face, w.dir, -(zip + sd), -zip, outline(sa, L + ext, vbS), hs.filter(function (h) { return h[0] >= sa; }), { side: id, solo: true, tex: 'siding', n: 'Board and batten, ' + id.replace('N', 'north').replace('S', 'south').replace('E', 'east').replace('W', 'west') + ' wall' });
      var ez = w.axis === 'x' ? zip : 0;
      skin(C, 'WAL-ZIPR', w.axis, w.face, w.dir, -zip, 0, outline(-ez, L + ez, vbZ, w.rake ? deckUp : 0), hs, { side: id, n: 'ZIP-R sheathing, ' + id + ' wall' });
      var ui = w.axis === 'x' ? 0 : t6, uo = w.axis === 'x' ? 32 : 24 - t6;
      var insTop = function (u) { return w.rake ? G.rb(u) - 0.25 : w.top(u) - 0.25; };
      skin(C, 'ENV-WALL', w.axis, w.face, w.dir, 0.02, t6 - 0.02, [[ui, FF + 0.125], [uo, FF + 0.125], [uo, insTop(uo)], [ui, insTop(ui)]], hs, { side: id, n: 'Wall insulation, ' + id + ' wall' });
    });
    // interior drywall on exterior walls
    var v9 = FF + g.ceil, vS = G.vault(23.5), vN = G.vault(0.5);
    skin(C, 'INT-DW', 'x', 0, 1, t6, t6 + dw, [[0.5, FF], [31.5, FF], [31.5, v9], [0.5, v9]], holesFor('N'), { side: 'N', n: 'Drywall, north wall' });
    skin(C, 'INT-DW', 'x', 24, -1, t6, t6 + dw, [[0.5, FF], [31.5, FF], [31.5, v9], [21.8125, v9], [21.8125, vS], [0.5, vS]], holesFor('S'), { side: 'S', n: 'Drywall, south wall' });
    skin(C, 'INT-DW', 'z', 0, 1, t6, t6 + dw, [[0.5, FF], [23.5, FF], [23.5, vS], [0.5, vN]], holesFor('W'), { side: 'W', n: 'Drywall, west wall' });
    skin(C, 'INT-DW', 'z', 32, -1, t6, t6 + dw, [[0.5, FF], [23.5, FF], [23.5, v9], [0.5, v9]], holesFor('E').filter(function (h) { return h[3] < v9; }), { side: 'E', n: 'Drywall, east wall' });
    // partitions, both faces
    var p1 = M.partitions[0], dh = (p1.doors || []).map(function (d) { return [d.u[0], FF + 0.02, d.u[1], FF + 6.9]; });
    var lf = G.loftFloor, liv = o.loft ? [[0.5, FF], [23.5, FF], [23.5, lf], [0.5, lf]] : [[0.5, FF], [23.5, FF], [23.5, G.vault(23.5)], [4.0, G.vault(4.0)], [0.5, FF + g.ceil + dw]];
    skin(C, 'INT-DW', 'z', 22.0 - g.t4 / 2, -1, 0, dw, liv, dh, { n: 'Drywall, living room side of the bedroom wall' });
    skin(C, 'INT-DW', 'z', 22.0 + g.t4 / 2, 1, 0, dw, [[0.5, FF], [23.5, FF], [23.5, v9], [0.5, v9]], dh, { n: 'Drywall, bedroom side' });
    M.partitions.slice(1).forEach(function (p) {
      var o2 = [[22.1875, FF], [31.5, FF], [31.5, v9], [22.1875, v9]];
      skin(C, 'INT-DW', 'x', p.c - p.t / 2, -1, 0, dw, o2, [], { n: 'Drywall, ' + p.id });
      skin(C, 'INT-DW', 'x', p.c + p.t / 2, 1, 0, dw, o2, [], { n: 'Drywall, ' + p.id });
    });
  };

  // window and door units fill the rough openings
  E.units = function (C, G, OP) {
    var g = C.M.geo, FF = G.FF, wl = { N: ['x', 0, 1], S: ['x', 24, -1], W: ['z', 0, 1], E: ['z', 32, -1] };
    OP.units.forEach(function (u) {
      var w = wl[u.wall];
      if (u.door) {
        C.add({ it: u.it, k: 'win', axis: w[0], face: w[1], dir: w[2], u0: u.u0, u1: u.u1, v0: FF + 0.02, v1: FF + u.v1, d0: -g.zip, d1: g.t6, door: true, solid: !!u.solid, side: u.wall, unit: u.id, n: u.n + ' (' + u.id + ')' });
      } else {
        C.add({ it: u.it, k: 'win', axis: w[0], face: w[1], dir: w[2], u0: u.u0, u1: u.u1, v0: FF + u.v0, v1: FF + u.v1, d0: -g.zip, d1: g.t6 - 0.15, side: u.wall, unit: u.id, n: u.n + ' (' + u.id + ')' });
      }
    });
    // barn doors on the living room side of the bedroom wall, shown closed
    (C.M.partitions[0].doors || []).forEach(function (d) {
      C.box('OPN-BARN', 21.66, FF, d.u[0] - 0.12, 0.1, 7.0, d.u[1] - d.u[0] + 0.24, { n: 'Barn door (' + d.id + ')', unit: d.id });
      C.box('OPN-BARN', 21.7, FF + 7.1, d.u[0] - 0.4, 0.05, 0.12, (d.u[1] - d.u[0]) * 2 + 0.6, { n: 'Barn door track', nq: true, m: 'black' });
    });
  };

  E.fixtures = function (C, G) {
    var M = C.M, o = C.o, FF = G.FF;
    M.fixtures.forEach(function (f) {
      if (!E.when(f.when, o)) return;
      var x = { n: f.n, m: f.m, nq: C.cat[f.it].q !== 'count' };
      if (/^INT-FURN$/.test(f.it) && f.b && f.b[1] > 9) x.roofy = true;
      if (f.cyl) C.cyl(f.it, f.cyl[0], FF + f.cyl[1], f.cyl[2], f.cyl[3], f.cyl[4], x);
      else C.box(f.it, f.b[0], (f.abs ? 0 : FF) + f.b[1], f.b[2], f.b[3], f.b[4], f.b[5], x);
    });
    var ws = M.fixtures.filter(function (f) { return f.it === 'MEC-STOVE'; })[0];
    if (o.heat !== 'propane' && ws) {
      // glowing door glass on the stove's south face
      C.box('MEC-STOVE', ws.b[0] + ws.b[3] / 2 - 0.45, FF + 0.8, ws.b[2] + ws.b[5] - 0.03, 0.9, 0.6, 0.06, { n: 'Fire window', m: 'fire', nq: true, glow: true });
    }
  };

  // the entry: a small porch with its own roof, or (with the covered entry) a bigger deck under the main roof
  E.porch = function (C, G) {
    var M = C.M, big = C.o.entryCover, P = big ? M.entry : M.porch, FF = G.FF, d = P.deck, top = FF + (P.top || 0);
    C.box(big ? 'EXT-EDECK' : 'EXT-PORCH', d[0], top - 0.1, d[2], d[3], 0.1, d[4], { n: big ? 'Entry deck boards' : 'Porch deck' });
    if (big) {
      // freestanding: 2x8 joists at 16 in on two doubled 2x10 beams, 6x6 posts on 12 in piers (not bolted to the house)
      var jt = top - 0.1, jb = jt - 0.6, bt = jb, bb = bt - 0.77, bxs = [d[0] + 0.6, d[0] + d[3] - 1.3], pz = [d[2] + 0.8, (d[2] + d[2] + d[4] - 2.6) / 2, d[2] + d[4] - 2.6];
      for (var zj = d[2] + 0.06; zj < d[2] + d[4] - 0.05; zj += 1.3333) C.box('EXT-DFRAME', d[0], jb, Math.min(zj, d[2] + d[4] - 0.125), d[3], 0.6, 0.125, { n: 'Deck joist, 2x8' });
      C.box('EXT-DFRAME', d[0], jb, d[2] + d[4] - 0.125, d[3], 0.6, 0.125, { n: 'Deck rim joist' });
      bxs.forEach(function (bx) {
        C.box('EXT-DFRAME', bx - 0.125, bb, d[2], 0.25, 0.77, d[4], { n: 'Deck beam, doubled 2x10', len: 2 * d[4] });
        pz.forEach(function (z) {
          C.box('EXT-DFRAME', bx - 0.23, 0.5, z - 0.23, 0.46, bb - 0.5, 0.46, { n: 'Deck post, 6x6' });
          // a post whose footing would run into one of the house's shared pads (a hold-down pad) stands on that pad;
          // the pad grows to reach at least 9 in past the post's tube
          var q = (G.pads || []).filter(function (q2) { return bx + 1 > q2.x0 && bx - 1 < q2.x1 && z + 1 > q2.z0 && z - 1 < q2.z1; })[0], onPad = !!q;
          // a round house footing in the way (big footings at high snow loads): the two share one pad
          var rf = q ? null : C.parts.filter(function (p) { return p.it === 'FND-FTG' && p.k === 'cyl' && Math.hypot(p.c[0] - bx, p.c[2] - z) < p.r + 1.1; })[0];
          if (rf) {
            var pd = [Math.min(rf.c[0] - rf.r, bx - 1.25), Math.max(rf.c[0] + rf.r, bx + 1.25), Math.min(rf.c[2] - rf.r, z - 1.25), Math.max(rf.c[2] + rf.r, z + 1.25)];
            rf.k = 'box'; rf.c = [(pd[0] + pd[1]) / 2, -M.geo.frost + 0.5, (pd[2] + pd[3]) / 2]; rf.s = [pd[1] - pd[0], 1.0, pd[3] - pd[2]]; rf.area = rf.s[0] * rf.s[2];
            rf.n = 'Combined footing pad, ' + rf.n.replace(/^Footing, [^,]*, /, '') + ' and a deck post'; delete rf.r; delete rf.h;
            q = { x0: pd[0], x1: pd[1], z0: pd[2], z1: pd[3] }; (G.pads = G.pads || []).push(q); onPad = true;
          }
          if (q) {
            var n0 = [Math.min(q.x0, bx - 1.25), Math.max(q.x1, bx + 1.25), Math.min(q.z0, z - 1.25), Math.max(q.z1, z + 1.25)];
            C.parts.forEach(function (p) {
              if (p.it !== 'FND-FTG' || p.k !== 'box' || Math.abs(p.c[0] - (q.x0 + q.x1) / 2) > 0.01 || Math.abs(p.c[2] - (q.z0 + q.z1) / 2) > 0.01) return;
              p.c[0] = (n0[0] + n0[1]) / 2; p.c[2] = (n0[2] + n0[3]) / 2; p.s[0] = n0[1] - n0[0]; p.s[2] = n0[3] - n0[2]; p.area = p.s[0] * p.s[2];
            });
            q.x0 = n0[0]; q.x1 = n0[1]; q.z0 = n0[2]; q.z1 = n0[3];
          }
          E.pierAt(C, bx, z, E.footing(1400, M.geo.frost, 12), 12, 0.5, { label: 'deck post' + (onPad ? ' (on the hold-down pad)' : ''), onPad: onPad });
        });
      });
    }
    (P.posts || []).forEach(function (p) { C.box('EXT-PORCH', p[0], FF, p[1], 0.4, P.roofY, 0.4, { n: 'Porch post', nq: true }); });
    if (P.roofY) C.box('EXT-PORCH', d[0] - 0.6, FF + P.roofY, d[2] - 0.6, d[3] + 0.6, 0.12, d[4] + 1.2, { n: 'Porch roof, metal', m: 'roofTop', nq: true });
    // steps down to grade on the west side: risers of 7 1/2 in or less, one fewer treads
    var st = P.steps, n = Math.max(st.risers || 1, Math.ceil(top / 0.625 - 1e-6)), r = top / n, tr = st.tread, sw = st.z[1] - st.z[0];
    for (var i = 0; i < n - 1; i++) C.box('EXT-STEPS', st.x - (n - 1 - i) * tr, i * r, st.z[0], (n - 1 - i) * tr, r, sw, { n: 'Step', nq: i > 0 });
    var rk = P.rack, ry = rk[5] !== undefined ? rk[5] : FF, nj = Math.floor(rk[2] / 0.56);
    C.box('EXT-STEPS', rk[0], ry, rk[1], rk[2], 0.15, rk[4], { n: 'Firewood rack', nq: true, m: 'wood' });
    for (var ii = 0; ii < 3; ii++) for (var j = 0; j < nj; j++) {
      C.add({ it: 'INT-FURN', k: 'cyl', c: [rk[0] + 0.2 + j * 0.56, ry + 0.4 + ii * 0.5, rk[1] + rk[4] / 2], r: 0.24, h: rk[4], rx: Math.PI / 2, n: 'Firewood', m: ii % 2 ? 'cedar' : 'wood', nq: true, L: 'furn' });
    }
    return { big: !!big, deck: d, top: top, steps: Object.assign({}, st, { risers: n }), rise: r, rack: rk, roofY: P.roofY || 0, posts: P.posts || [] };
  };

  E.site = function (C, G) {
    var S = C.M.site, o = C.o, t = S.tank;
    // 500 gal ASME tank, about 37.5 in across and 10 ft long, long axis north-south
    var tr = G.tankR = 1.5625;
    C.add({ it: 'MEC-TANK', k: 'cyl', c: [t[0], 0.8 + tr, t[1]], r: tr, h: 10, rx: Math.PI / 2, n: 'Propane tank, 500 gal' });
    [-3.8, 3.8].forEach(function (dz) { C.box('MEC-TANK', t[0] - 0.7, 0, t[1] + dz - 0.2, 1.4, 0.95, 0.4, { n: 'Tank saddle', nq: true, m: 'conc' }); });
    C.cyl('MEC-TANK', t[0], 0.8 + 2 * tr - 0.05, t[1], 0.35, 0.5, { n: 'Tank valve dome', nq: true, m: 'steel' });
    // driveway and parking
    var d = S.drive;
    for (var i = 1; i < d.length; i++) {
      var a = d[i - 1], b = d[i], x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), zc = (a[1] + b[1]) / 2;
      C.box('SITE-DRIVE', x0, 0.01, zc - 5, x1 - x0, 0.04, 10, { n: 'Gravel driveway', nq: i > 1 });
    }
    var pk = S.parking;
    C.box('SITE-DRIVE', pk[0], 0.012, pk[1], pk[2], 0.04, pk[3], { n: 'Parking pad', nq: true });
    if (S.walk) C.box('SITE-DRIVE', S.walk[0], 0.011, S.walk[1], S.walk[2], 0.04, S.walk[3], { n: 'Gravel walk to the entry', nq: true });
    C.cyl('SITE-WELL', S.well[0], 0, S.well[1], 0.4, 1.6, { n: 'Well cap' });
    C.cyl('SITE-SEPTIC', S.septicTank[0], 0, S.septicTank[1], 0.9, 0.25, { n: 'Septic tank lid' });
    C.cyl('SITE-SEPTIC', S.septicTank[0], 0, S.septicTank[1] - 4, 0.9, 0.25, { n: 'Septic tank lid', nq: true });
    var lf = S.leach;
    C.box('SITE-SEPTIC', lf[0], 0, lf[1], lf[2], 0.35, lf[3], { n: 'Leach field (location placeholder)', nq: true, m: 'mound' });
  };
})(ENG);
