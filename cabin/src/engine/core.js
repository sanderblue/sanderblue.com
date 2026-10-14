/* Rime Cabin engine, part 1: helpers, foundation, floor, walls, roof, envelope, interior.
   Everything is generated from MODEL (model.json) and the chosen options, so the 3D model,
   drawings and estimate all read the same part list. Units: feet. Plan X 0..32 west to east,
   plan Z 0..24 north to south, Y is height above grade. */
var ENG = (typeof ENG !== 'undefined' && ENG) || {};
(function (E) {
  var TH = Math.atan(1 / 3), COS = Math.cos(TH), SIN = Math.sin(TH);
  E.TH = TH; E.COS = COS; E.SIN = SIN;

  E.when = function (w, o) {
    if (!w) return true;
    for (var k in w) if (w[k].indexOf(o[k]) < 0) return false;
    return true;
  };

  // Context collects parts. Item defaults (layer, explode level, material) come from the catalog.
  function Ctx(M, o) {
    this.M = M; this.o = o; this.parts = []; this.cat = {};
    var self = this;
    M.catalog.items.forEach(function (it) { self.cat[it.id] = it; });
    M.catalog.site.forEach(function (it) { self.cat[it.id] = it; it.isSite = true; });
  }
  Ctx.prototype.add = function (p, x) {
    x = x || {};
    for (var k in x) p[k] = x[k];
    var it = this.cat[p.it];
    if (it) {
      if (p.L === undefined) p.L = it.L || 'fix';
      if (p.ex === undefined) p.ex = it.ex !== undefined ? it.ex : 1.6;
      if (p.m === undefined) p.m = it.m;
      if (p.roofy === undefined) p.roofy = !!it.roofy;
      if (p.out === undefined) p.out = it.out || 0;
    } else { p.L = p.L || 'fix'; p.ex = p.ex || 0; }
    p.n = p.n || (it ? it.n : p.it);
    this.parts.push(p);
    return p;
  };
  // box from min corner (x0, y0, z0) with size (w along X, h along Y, d along Z)
  Ctx.prototype.box = function (it, x0, y0, z0, w, h, d, x) {
    return this.add({ it: it, k: 'box', c: [x0 + w / 2, y0 + h / 2, z0 + d / 2], s: [w, h, d] }, x);
  };
  Ctx.prototype.boxC = function (it, cx, cy, cz, w, h, d, x) {
    return this.add({ it: it, k: 'box', c: [cx, cy, cz], s: [w, h, d] }, x);
  };
  Ctx.prototype.cyl = function (it, cx, y0, cz, r, h, x) {
    return this.add({ it: it, k: 'cyl', c: [cx, y0 + h / 2, cz], r: r, h: h }, x);
  };
  Ctx.prototype.seg = function (it, a, b, r, x) {
    return this.add({ it: it, k: 'seg', a: a.slice(), b: b.slice(), r: r }, x);
  };
  Ctx.prototype.poly = function (it, pts, r, x) {
    var out = [];
    for (var i = 1; i < pts.length; i++) {
      var y = {}; for (var k in x) y[k] = x[k];
      if (i > 1 && x && x.countFirst) y.nq = true;
      out.push(this.seg(it, pts[i - 1], pts[i], r, y));
    }
    return out;
  };

  E.Ctx = Ctx;

  // Geometry of the roof plane. rb(Z) is the underside of the rafters.
  E.setup = function (M, o) {
    var g = M.geo, st = M.structure[o.snow];
    var G = {
      FF: g.ff, W: g.W, D: g.D, R0: g.ff + g.ceil + g.dw, st: st,
      rd: 16 / 12, rw: st.rafter === 'ROF-LVL16' ? 0.146 : 0.2917, rs: st.oc / 12
    };
    G.rb = function (Z) { return G.R0 + Z / 3; };
    // north eave line: the covered area carries the roof past the north wall to a beam on posts
    G.cover = o.cover && M.cover ? M.cover : null;
    G.Z0 = G.cover ? G.cover.z - g.eaveN : -g.eaveN;
    G.stackT = G.rd + g.deck1 + g.sleeper + g.deck2 + g.metal;
    G.roofTop = function (Z) { return G.rb(Z) + G.stackT / COS; };
    G.vault = function (Z) { return G.rb(Z) - g.pine; };
    G.wingCeil = g.ff + g.ceil;
    G.loftFloor = g.ff + g.ceil + g.dw + g.cj + g.loftDeck;
    // floor framing bottom and where the siding stops: 3 in below the floor framing over the skirt on piers
    G.beamBot = g.ff - g.sub - g.joist;
    G.sidingBot = o.found === 'piers' ? G.beamBot : 0.8;
    return G;
  };

  // sloped part along Z (plan) from Za to Zb, offset perpendicular to the roof plane by off (centre of part)
  function slopeBox(C, it, x0, x1, Za, Zb, off, thick, G, x) {
    var Zm = (Za + Zb) / 2, yb = G.rb(Zm), L = (Zb - Za) / COS;
    return C.add({ it: it, k: 'box', c: [(x0 + x1) / 2, yb + off * COS, Zm - off * SIN], s: [x1 - x0, thick, L], rx: -TH }, x);
  }
  E.slopeBox = slopeBox;

  /* ---------- foundation and floor ---------- */
  // A pier: footing (round bell, or a square pad when the load needs more), tube, four hooked bars, cap.
  // f: footing from E.footing; tubeIn: tube diameter in inches; top: height of the pier top.
  E.pierAt = function (C, x, z, f, tubeIn, top, x2) {
    var g = C.M.geo, fr = g.frost, tr = tubeIn / 24, nm = x2 && x2.label ? ', ' + x2.label : '', pad = x2 && x2.pad;
    var fh = f.round && !pad && !(x2 && x2.onPad) ? g.ftgH : 1.0, fb = -fr, ftop = fb + fh;
    if (x2 && x2.onPad) { /* footing drawn with the pier it shares a pad with */ }
    else if (pad) C.box('FND-FTG', pad[0], fb, pad[2], pad[1] - pad[0], fh, pad[3] - pad[2], { n: 'Combined footing pad' + nm, area: (pad[1] - pad[0]) * (pad[3] - pad[2]) });
    else if (f.round) C.cyl('FND-FTG', x, fb, z, f.dia / 24, fh, { n: 'Footing, ' + f.dia + ' in round' + nm });
    else C.box('FND-FTG', x - f.side / 2, fb, z - f.side / 2, f.side, fh, f.side, { n: 'Footing, ' + E.ftIn(f.side) + ' square pad' + nm, area: f.side * f.side });
    C.cyl('FND-TUBE', x, ftop, z, tr, top - ftop, { n: 'Pier, ' + tubeIn + ' in tube' + nm });
    var rb = tr * 0.6, reach = pad ? Math.min(pad[1] - pad[0], pad[3] - pad[2]) / 2 : (f.round ? f.dia / 24 : f.side / 2);
    [[rb, rb], [-rb, rb], [rb, -rb], [-rb, -rb]].forEach(function (d) {
      C.seg('FND-REBAR', [x + d[0], fb + 0.25, z + d[1]], [x + d[0], top - 0.2, z + d[1]], 0.021);
    });
    C.seg('FND-REBAR', [x - reach + 0.15, fb + 0.25, z], [x + reach - 0.15, fb + 0.25, z], 0.021);
    C.seg('FND-REBAR', [x, fb + 0.3, z - reach + 0.15], [x, fb + 0.3, z + reach - 0.15], 0.021);
  };

  E.foundation = function (C, G) {
    var M = C.M, o = C.o, g = M.geo, S = M.structure, FF = G.FF, SS = G.S;
    var beamBot = FF - g.sub - g.joist, fr = g.frost;
    var GB = E.garageBox ? E.garageBox(M, o) : null;
    // the garage's east footing runs along the house's west wall; a house pier footing that would overlap it
    // becomes one combined pad that carries both (G.combined tells the garage to stop its footing there)
    var gfx0 = GB ? GB.X1 - (1.667 + 0.667) / 2 : 0, gfx1 = GB ? gfx0 + 1.667 : 0;
    G.combined = [];
    var lines = o.found === 'piers' ? S.beamZ : [S.beamZ[1]];
    // hold-down piers (E.lateral) under the end walls. A footing that would run into a house pier's footing or
    // the garage footing shares one pad with it, grown until its weight, the soil over it and 0.6 x the dead
    // load on it hold the uplift down.
    var hdM = o.found === 'piers' ? (G.hdPiers || []) : [], CONC = 150, SOILW = 100, ftH = 1.0;
    function padCap(pd, Dl, tubes, stem) {
      var A = (pd[1] - pd[0]) * (pd[3] - pd[2]), at = tubes * Math.PI * 0.25;
      return 0.6 * ((A * ftH + at * (fr - ftH)) * CONC + (A - at) * (fr - ftH) * SOILW + Dl + (stem || 0) * (pd[3] - pd[2]));
    }
    function grow(pd, need, Dl, tubes, stem, zOnly) {
      for (var k = 0; k < 40 && padCap(pd, Dl, tubes, stem) < need; k++) { pd[2] -= 0.125; pd[3] += 0.125; if (!zOnly) pd[1] += 0.125; }
      return pd;
    }
    // footprints under the hold-down piers, merged with whatever footing they run into (a house pier, the garage
    // footing or each other) into one pad, then grown until it holds the uplift down
    function ovl(p1, p2, c) { return p1[0] < p2[1] + c && p2[0] < p1[1] + c && p1[2] < p2[3] + c && p2[2] < p1[3] + c; }
    var recs = [], piersAll = [];
    lines.forEach(function (z, li) {
      var L = SS.lines.filter(function (l) { return l.i === (o.found === 'piers' ? li : 1); })[0];
      S.pierX.forEach(function (x, j) {
        var pr = L.piers[j] || {}, f = pr.upFtg || L.ftg, r = f.round ? f.dia / 24 : f.side / 2;
        piersAll.push({ x: x, z: z, li: li, pr: pr, f: f, r: r });
        if (GB && x - r < gfx1 && z + r > GB.Z0 && z - r < GB.Z1) {
          var side = Math.max(2 * r, Math.sqrt(f.area));
          var rc0 = { b: [gfx0, x + side / 2, z - side / 2, z + side / 2], T: pr.U || 0, Tns: pr.Uns || 0, Tew: pr.Uew || 0, D: pr.D || 0, pier: pr, hds: [], garage: true, own: false, tubes: 1 };
          recs.push(rc0); pr.padRec = rc0;
        }
      });
    });
    hdM.forEach(function (h) {
      var hr = h.f.round ? h.f.dia / 24 : h.f.side / 2;
      recs.push({ b: [h.x - hr, h.x + hr, h.z - hr, h.z + hr], T: h.T, Tns: h.T, Tew: 0, D: 0, pier: null, hds: [h], own: true, tubes: 1 });
    });
    var stemW = GB ? 0.667 * (GB.ys + fr - g.ftgH) * CONC : 0;
    for (var pass = 0; pass < 8; pass++) {
      var changed = false;
      recs.forEach(function (rc) {
        if (!rc.hds.length) return;
        piersAll.forEach(function (pa) {
          if (pa.pr.padRec || rc.pier || !ovl(rc.b, [pa.x - pa.r, pa.x + pa.r, pa.z - pa.r, pa.z + pa.r], 0.25)) return;
          rc.b = [Math.min(rc.b[0], pa.x - pa.r), Math.max(rc.b[1], pa.x + pa.r), Math.min(rc.b[2], pa.z - pa.r), Math.max(rc.b[3], pa.z + pa.r)];
          rc.pier = pa.pr; rc.D += pa.pr.D || 0; rc.T += pa.pr.U || 0; rc.Tns += pa.pr.Uns || 0; rc.Tew += pa.pr.Uew || 0; rc.tubes++; rc.own = false; pa.pr.padRec = rc; changed = true;
        });
        if (!rc.garage && GB && rc.hds.some(function (h) { return h.id === 'HW'; }) && rc.b[0] < gfx1 && rc.b[3] > GB.Z0 && rc.b[2] < GB.Z1) {
          rc.b[0] = Math.min(rc.b[0], gfx0); rc.b[1] = Math.max(rc.b[1], gfx1); rc.garage = true; rc.own = false; changed = true;
        }
      });
      for (var i = 0; i < recs.length && !changed; i++) for (var j = i + 1; j < recs.length && !changed; j++) {
        var A2 = recs[i], B2 = recs[j];
        if (!ovl(A2.b, B2.b, 0.25) || (A2.pier && B2.pier)) continue;
        A2.b = [Math.min(A2.b[0], B2.b[0]), Math.max(A2.b[1], B2.b[1]), Math.min(A2.b[2], B2.b[2]), Math.max(A2.b[3], B2.b[3])];
        A2.T += B2.T; A2.Tns += B2.Tns; A2.Tew += B2.Tew; A2.D += B2.D; A2.pier = A2.pier || B2.pier; if (B2.pier) B2.pier.padRec = A2; A2.hds = A2.hds.concat(B2.hds); A2.garage = A2.garage || B2.garage; A2.own = false; A2.tubes += B2.tubes;
        recs.splice(j, 1); changed = true;
      }
      // garage hold-downs that land on a shared pad add their uplift to it
      // need: each wind axis alone, or both at 75 % (ASCE 7 Case 3)
      var need = function (rc) {
        var ns = rc.Tns, ew = rc.Tew;
        (G.gAnch || []).forEach(function (a) { if (a.garage && a.x > rc.b[0] - 1 && a.x < rc.b[1] + 1 && a.z > rc.b[2] - 1 && a.z < rc.b[3] + 1) { if (a.dir === 'NS') ns += a.T; else ew += a.T; } });
        return Math.max(ns, ew, 0.75 * (ns + ew));
      };
      recs.forEach(function (rc) { if (!rc.own && rc.hds.length) { rc.need = need(rc); grow(rc.b, rc.need, rc.D, rc.tubes, rc.garage ? stemW : 0, rc.garage); } });
      if (!changed) break;
    }
    recs.forEach(function (rc) {
      if (rc.garage) G.combined.push({ x0: rc.b[0], x1: rc.b[1], z0: rc.b[2], z1: rc.b[3] });
      if (rc.pier) rc.pier.pad = rc.b;
      rc.hds.forEach(function (h, k) {
        if (rc.own) return;
        h.shared = true; h.garage = rc.garage;
        if (rc.pier || k > 0) h.with = true; else h.pad = rc.b;
      });
    });
    lines.forEach(function (z, li) {
      var L = SS.lines.filter(function (l) { return l.i === (o.found === 'piers' ? li : 1); })[0];
      S.pierX.forEach(function (x, j) {
        var pr = L.piers[j] || {}, f = pr.upFtg || L.ftg;
        E.pierAt(C, x, z, f, 12, beamBot, { label: 'beam B' + (o.found === 'piers' ? li + 1 : 2), pad: pr.pad || null });
        C.box('FND-CAP', x - 0.375, beamBot - 0.05, z - 0.25, 0.75, 0.05, 0.5);
      });
    });
    G.pads = recs.filter(function (rc) { return !rc.own; }).map(function (rc) { return { x0: rc.b[0], x1: rc.b[1], z0: rc.b[2], z1: rc.b[3] }; });
    G.padRecs = recs.filter(function (rc) { return !rc.own; }).map(function (rc) { return { b: rc.b, T: rc.need || rc.T, cap: padCap(rc.b, rc.D, rc.tubes, rc.garage ? stemW : 0) }; });
    hdM.forEach(function (h) {
      E.pierAt(C, h.x, h.z, h.f, 12, beamBot, { label: 'hold-down pier', pad: h.with ? null : h.pad, onPad: !!h.with });
      C.seg('FND-HD', [h.id === 'HW' ? 0.35 : 31.65, beamBot - 1.2, h.z], [h.id === 'HW' ? 0.35 : 31.65, FF + 0.15, h.z], 0.031, { n: 'Hold-down anchor rod, 5/8 in, cast into the pier', nq: true });
    });
    // beams
    lines.forEach(function (z) { C.box('FLR-BEAM', 0, beamBot, z - g.beamW / 2, 32, g.joist, g.beamW); });

    if (o.found === 'crawl') {
      var top = beamBot - 0.125, bot = -fr + g.ftgH, t = 0.667, h = top - bot;
      var walls = [[0, 0, 32, t], [0, 24 - t, 32, t], [0, t, t, 24 - 2 * t], [32 - t, t, t, 24 - 2 * t]];
      walls.forEach(function (w) { C.box('FND-CRAWL', w[0], bot, w[1], w[2], h, w[3], { n: 'Stem wall, 8 in' }); });
      var fw = SS.crawlFtg || 1.667, fo = (fw - t) / 2; // footing width from the loads, centred on the 8 in stem wall
      [[-fo, -fo, 32 + 2 * fo, fw], [-fo, 24 - t - fo, 32 + 2 * fo, fw], [-fo, fw - fo, fw, 24 - 2 * fw + 2 * fo], [32 - t - fo, fw - fo, fw, 24 - 2 * fw + 2 * fo]].forEach(function (f) {
        C.box('FND-CRAWL', f[0], -fr, f[1], f[2], g.ftgH, f[3], { n: 'Continuous footing, ' + Math.round(fw * 12) + ' x 10 in', nq: true });
      });
      // sill plates and anchors
      [[0, 0, 32, 0.604], [0, 24 - 0.604, 32, 0.604], [0, 0.604, 0.604, 24 - 1.208], [32 - 0.604, 0.604, 0.604, 24 - 1.208]].forEach(function (s) {
        C.box('FND-SILL', s[0], top, s[1], s[2], 0.125, s[3]);
      });
      function anchors(ax, a0, a1, c) {
        var n = Math.ceil((a1 - a0 - 2) / 6), step = (a1 - a0 - 2) / n;
        for (var i = 0; i <= n; i++) {
          var u = a0 + 1 + i * step;
          if (ax === 'x') C.cyl('FND-ANCHOR', u, top - 0.6, c, 0.042, 0.85); else C.cyl('FND-ANCHOR', c, top - 0.6, u, 0.042, 0.85);
        }
      }
      anchors('x', 0, 32, 0.3); anchors('x', 0, 32, 23.7); anchors('z', 0.6, 23.4, 0.3); anchors('z', 0.6, 23.4, 31.7);
      [[0.9, 0.9], [31.1, 0.9], [0.9, 23.1], [31.1, 23.1]].forEach(function (p) {
        C.box('FND-HD', p[0] - 0.1, top - 0.1, p[1] - 0.25, 0.2, 1.1, 0.12);
        C.box('FND-HD', p[0] - 0.25, top - 0.1, p[1] - 0.1, 0.12, 1.1, 0.2);
      });
      // R-15 foam inside the stem walls, sealed vapor barrier on the crawl floor
      var fi = 0.25, ins = [[t, t, 32 - 2 * t, fi], [t, 24 - t - fi, 32 - 2 * t, fi], [t, t + fi, fi, 24 - 2 * t - 2 * fi], [32 - t - fi, t + fi, fi, 24 - 2 * t - 2 * fi]];
      ins.forEach(function (w) { C.box('FND-XPS', w[0], -1.0, w[1], w[2], top - (-1.0), w[3]); });
      C.box('FND-VB', t + fi, -1.0, t + fi, 32 - 2 * (t + fi), 0.02, 24 - 2 * (t + fi), { n: 'Vapor barrier, 12 mil' });
      C.box('FND-CRAWLFAN', 16, 0.1, 24 - t - 0.6, 0.8, 0.5, 0.4);
    } else {
      // skirt, set outside the pier tubes, from grade up under the siding's drip cap; belly board under the joists.
      // Inside the garage the house's under-floor is closed by a framed wall that backs the garage-side gypsum.
      var sk = 0.5, st = 0.15, top = G.sidingBot, xw0 = GB ? GB.X1 + g.zip + g.siding + 0.02 : -sk;
      var sides = [[xw0, -sk, 32 + sk - xw0, st, 'N'], [-sk, 24 + sk - st, 32 + 2 * sk, st, 'S'], [32 + sk - st, -sk + st, st, 24 + 2 * sk - 2 * st, 'E']];
      if (!GB) sides.push([-sk, -sk + st, st, 24 + 2 * sk - 2 * st, 'W']);
      else if (GB.Z1 < 24) sides.push([-sk, GB.Z1 + 0.05, st, 24 + sk - st - GB.Z1 - 0.05, 'W']);
      sides.forEach(function (s) { C.box('FND-SKIRT', s[0], 0, s[1], s[2], top, s[3], { side: s[4], out: 0.6 }); });
      if (GB) C.box('FND-SKIRT', -g.zip, GB.ys, 0, g.zip, beamBot - GB.ys, Math.min(24, GB.Z1), { n: 'Framed closure under the house floor, garage side (backs the gypsum)', side: 'W' });
      C.box('FLR-BELLY', 0, beamBot - 0.042, 0, 32, 0.042, 24);
    }
  };

  E.floor = function (C, G) {
    var M = C.M, o = C.o, g = M.geo, FF = G.FF, S = M.structure, jb = FF - g.sub - g.joist, jw = 0.208;
    var piers = o.found === 'piers', bw = g.beamW;
    var bays = piers ? [[bw, S.beamZ[1] - bw / 2], [S.beamZ[1] + bw / 2, 24 - bw]] : [[g.rim, S.beamZ[1] - bw / 2], [S.beamZ[1] + bw / 2, 24 - g.rim]];
    // on piers the east and west walls sit on flush 3-ply LVL end beams hung between the floor beams (a rim board
    // cannot span 15 ft under a wall); on the crawlspace the rims sit on the stem walls
    if (piers) {
      [[0, 'west'], [32 - bw, 'east']].forEach(function (e) {
        [[S.beamZ[0] + bw / 2, S.beamZ[1] - bw / 2], [S.beamZ[1] + bw / 2, S.beamZ[2] - bw / 2]].forEach(function (zz) {
          C.box('FLR-BEAM', e[0], jb, zz[0], bw, g.joist, zz[1] - zz[0], { n: 'End beam under the ' + e[1] + ' wall' });
          [zz[0], zz[1] - 0.12].forEach(function (z) { C.box('FLR-BHANGER', e[0] + bw / 2 - 0.2, jb + 0.05, z, 0.4, g.joist * 0.85, 0.12, { n: 'Concealed-flange beam hanger' }); });
        });
      });
    } else {
      C.box('FLR-RIM', 0, jb, 0, g.rim, g.joist, 24);
      C.box('FLR-RIM', 32 - g.rim, jb, 0, g.rim, g.joist, 24);
      C.box('FLR-RIM', g.rim, jb, 0, 32 - 2 * g.rim, g.joist, g.rim); C.box('FLR-RIM', g.rim, jb, 24 - g.rim, 32 - 2 * g.rim, g.joist, g.rim);
    }
    var xs = []; for (var k = 1; k * g.oc < 31.9; k++) xs.push(k * g.oc);
    xs.push(22.0);
    xs.forEach(function (x) {
      bays.forEach(function (b, bi) {
        C.box('FLR-JOIST', x - jw / 2, jb, b[0], jw, g.joist, b[1] - b[0]);
        var ends = piers ? [b[0], b[1]] : [bi === 0 ? b[1] : b[0]];
        ends.forEach(function (z) { C.box('FLR-HANGER', x - 0.15, jb + 0.05, z - (z === b[0] ? 0 : 0.12), 0.3, g.joist * 0.85, 0.12); });
      });
    });
    C.box('FLR-SUB', 0, FF - g.sub, 0, 32, g.sub, 24);
    if (piers) bays.forEach(function (b) { C.box('FLR-INS', bw, jb, b[0], 32 - 2 * bw, g.joist, b[1] - b[0], { vol: (32 - 2 * bw) * g.joist * (b[1] - b[0]) * 0.86 }); });
    // finished floor per room (shower pan excluded)
    M.rooms.forEach(function (r) {
      var b = r.b;
      if (r.id === 'bath') {
        C.box('INT-FLOOR', b[0], FF, b[2], 28.2 - b[0], 0.02, b[3] - b[2], { n: 'Flooring, bath' });
        C.box('INT-FLOOR', 28.2, FF, 13.1, b[1] - 28.2, 0.02, b[3] - 13.1, { n: 'Flooring, bath' });
      } else C.box('INT-FLOOR', b[0], FF, b[2], b[1] - b[0], 0.02, b[3] - b[2], { n: 'Flooring, ' + r.name.toLowerCase() });
    });
  };

  /* ---------- wall framing ---------- */
  // w: {axis, u0, u1, c (centre line), t, top(u), ops:[{u0,u1,v0,v1,hd,hit,door}], stud, tall, plate, oc, side, roofy, posts:[[u0,u1]]}
  E.frameWall = function (C, G, w) {
    // w.ff: the floor that opening heights are measured from (the garage uses its slab)
    var FF = w.ff !== undefined ? w.ff : G.FF, pl = 0.125, t = w.t, sw = 0.125, oc = w.oc || 1.3333;
    function bx(it, u0, u1, y0, y1, x) {
      if (u1 - u0 < 0.01 || y1 - y0 < 0.05) return null;
      x = x || {}; if (w.roofy) x.roofy = true;
      if (w.axis === 'x') return C.box(it, u0, y0, w.c - t / 2, u1 - u0, y1 - y0, t, x);
      return C.box(it, w.c - t / 2, y0, u0, t, y1 - y0, u1 - u0, x);
    }
    function studAt(u, y0, y1, nm) {
      var tall = y1 - y0 > 12 && w.tall;
      return bx(tall ? w.tall : w.stud, u - sw / 2, u + sw / 2, y0, y1, { n: nm || (tall ? 'Stud, LSL' : 'Stud') });
    }
    var bot = w.bot !== undefined ? w.bot : FF, flat = !w.sloped;
    function topAt(u) { return w.top(u); }
    // bottom plate, broken at doors
    var cuts = w.ops.filter(function (op) { return op.door; }).map(function (op) { return [op.u0, op.u1]; }).sort(function (a, b) { return a[0] - b[0]; });
    var a = w.u0;
    cuts.forEach(function (cu) { bx(w.plate, a, cu[0] - 0.19, bot, bot + pl, { n: 'Bottom plate' }); a = cu[1] + 0.19; });
    bx(w.plate, a, w.u1, bot, bot + pl, { n: 'Bottom plate' });
    // top plates
    if (flat) {
      var tp = topAt(w.u0);
      bx(w.plate, w.u0, w.u1, tp - 2 * pl, tp - pl, { n: 'Top plate' });
      bx(w.plate, w.u0, w.u1, tp - pl, tp, { n: 'Cap plate' });
    } else {
      var um = (w.u0 + w.u1) / 2, L = (w.u1 - w.u0) / COS, yc = topAt(um) - pl / COS;
      var p = { it: w.plate, k: 'box', c: w.axis === 'z' ? [w.c, yc, um] : [um, yc, w.c], s: w.axis === 'z' ? [t, 2 * pl, L] : [L, 2 * pl, t], rx: w.axis === 'z' ? -TH : 0, n: 'Sloped top plates', len: 2 * L };
      if (w.roofy) p.roofy = true;
      C.add(p);
    }
    // each side of an opening, outward from the rough opening: jack studs (op.jn, default 1) or a jack post
    // (op.jp[i] = {it, w, n}), then king studs (op.kn, default 1). op.hang[i]: the header hangs off a post
    // (no jack). op.ext[i]: the header runs on over a shared post drawn elsewhere (no jack, no king).
    function sideW(op, i) {
      if (op.ext && op.ext[i]) return op.ext[i];
      if (op.hang && op.hang[i]) return 0;
      var jw = op.jp && op.jp[i] ? op.jp[i].w : sw * (op.jn || 1);
      return jw + (op.noKing && op.noKing[i] ? 0 : sw * (op.kn || 1));
    }
    function inOpening(u) {
      for (var i = 0; i < w.ops.length; i++) { var op = w.ops[i]; if (u > op.u0 - sideW(op, 0) - 0.07 && u < op.u1 + sideW(op, 1) + 0.07) return op; }
      if (w.posts) for (var j = 0; j < w.posts.length; j++) if (u > w.posts[j][0] - 0.1 && u < w.posts[j][1] + 0.1) return w.posts[j];
      return null;
    }
    var layout = [w.u0 + sw / 2];
    for (var k = 1; w.u0 + k * oc < w.u1 - 0.25; k++) layout.push(w.u0 + k * oc);
    layout.push(w.u1 - sw / 2);
    (w.extra || []).forEach(function (u) { layout.push(u); });
    layout.forEach(function (u) {
      if (inOpening(u)) return;
      studAt(u, bot + pl, (flat ? topAt(u) : topAt(u) - (2 * pl) / COS) - (flat ? 2 * pl : 0));
    });
    // openings: jacks, kings, header, sill, cripples
    w.ops.forEach(function (op) {
      var hb = FF + op.v1, hd = op.hd, ht = hb + hd;
      var capTop = (flat ? topAt(op.u1) - 2 * pl : topAt(op.u0) - 2 * pl / COS - 0.05);
      if (ht > capTop) ht = capTop;
      var base = op.base !== undefined ? FF + op.base : bot + pl, hEnd = [op.u0, op.u1];
      [0, 1].forEach(function (i) {
        var dir = i ? 1 : -1, u = i ? op.u1 : op.u0;
        if (op.ext && op.ext[i]) { hEnd[i] = u + dir * op.ext[i]; return; }
        if (op.hang && op.hang[i]) {
          hEnd[i] = u + dir * 0.02;
          bx('WAL-HANGER', i ? hEnd[i] - 0.06 : hEnd[i], i ? hEnd[i] : hEnd[i] + 0.06, hb - 0.05, hb + Math.min(hd, 0.9), { n: 'Header seat on the steel post' });
          return;
        }
        if (op.jp && op.jp[i]) { var jp = op.jp[i]; bx(jp.it, i ? u : u - jp.w, i ? u + jp.w : u, base, hb, { n: jp.n || 'Jack post' }); u += dir * jp.w; }
        else for (var j = 0; j < (op.jn || 1); j++) { studAt(u + dir * sw / 2, base, hb, 'Jack stud'); u += dir * sw; }
        hEnd[i] = u;
        if (op.noKing && op.noKing[i]) return;
        for (var kk = 0; kk < (op.kn || 1); kk++) { var ku = u + dir * sw / 2; studAt(ku, bot + pl, (flat ? topAt(ku) - 2 * pl : topAt(ku) - 2 * pl / COS), 'King stud'); u += dir * sw; }
      });
      bx(op.hit, hEnd[0], hEnd[1], hb, ht, { n: 'Header' + (op.hdrN ? ', ' + op.hdrN : '') });
      if (!op.door && op.v0 > 0.3) bx(w.plate, op.u0, op.u1, FF + op.v0 - pl, FF + op.v0, { n: 'Rough sill' });
      layout.forEach(function (u) {
        if (u <= op.u0 + 0.05 || u >= op.u1 - 0.05) return;
        if (!op.door && op.v0 > 0.5) bx(w.stud, u - sw / 2, u + sw / 2, base, FF + op.v0 - pl, { n: 'Cripple stud' });
        var cTop = flat ? topAt(u) - 2 * pl : topAt(u) - 2 * pl / COS;
        // a window framed on top of this opening's header (a clerestory over a door) brings its own cripples
        var above = w.ops.some(function (o2) { return o2.over === op.id && u > o2.u0 - 0.05 && u < o2.u1 + 0.05; });
        if (!above && cTop - ht > 0.25) bx(w.stud, u - sw / 2, u + sw / 2, ht, cTop, { n: 'Cripple stud' });
      });
      // transoms between stacked units in one rough opening: LVL laid flat, carries wind across the bay
      (op.tiers || []).forEach(function (tr, j) {
        if (j === 0) return;
        var y0 = FF + op.tiers[j - 1][1], y1 = FF + tr[0];
        if (y1 - y0 > 0.1) bx('WAL-TRANSOM', op.u0, op.u1, y0 + (y1 - y0 - 0.146) / 2, y0 + (y1 - y0 + 0.146) / 2, { n: 'Transom between stacked units' });
      });
    });
    (w.posts || []).forEach(function (pp) {
      var ptop = pp[3] !== undefined ? pp[3] : (flat ? topAt(pp[0]) - 2 * pl : topAt(pp[0]));
      if (pp[2]) { bx(pp[2], pp[0], pp[1], bot + pl, ptop, { n: pp[4] }); return; }
      // glass bay post: a 5 x 3 steel tube centred in the wall, a 2x wood buck each side for the windows
      var um = (pp[0] + pp[1]) / 2, hd = 5 / 24, hw = 3 / 24;
      if (w.axis === 'x') C.box('WAL-POST', um - hw, bot + pl, w.c - hd, 2 * hw, ptop - bot - pl, 2 * hd, { n: 'Post between glass bays, steel tube', m: 'steel' });
      else C.box('WAL-POST', w.c - hd, bot + pl, um - hw, 2 * hd, ptop - bot - pl, 2 * hw, { n: 'Post between glass bays, steel tube', m: 'steel' });
      bx(w.stud, pp[0], pp[0] + sw, bot + pl, ptop, { n: 'Wood buck on the steel post' });
      bx(w.stud, pp[1] - sw, pp[1], bot + pl, ptop, { n: 'Wood buck on the steel post' });
    });
  };

  // exterior openings as framed rough openings plus the window units that fill them
  E.openings = function (C, G) {
    var M = C.M, o = C.o, units = [], ops = { N: [], S: [], E: [], W: [] }, posts = [];
    var byId = {};
    M.openings.forEach(function (op) {
      if (!E.when(op.when, o)) return;
      var it = C.cat[op.it];
      // header and jack studs from the load on that wall (E.struct)
      var hs = G.S.headerFor({ id: op.id, u0: op.u[0], u1: op.u[1] }, op.wall), hit = hs.lvl ? 'WAL-HDRL' : 'WAL-HDR2';
      // tiers: one framed opening filled with stacked units (like the south bays)
      var v = op.tiers ? [op.tiers[0][0], op.tiers[op.tiers.length - 1][1]] : op.v;
      var rec = { id: op.id, u0: op.u[0], u1: op.u[1], v0: v[0], v1: v[1], hd: op.hd || (hit === 'WAL-HDRL' ? 0.99 : 0.77), hit: hit, hdrN: hs.n, jn: hs.jacks, door: !!op.door };
      if (op.tiers) { rec.tiers = op.tiers; rec.kn = 2; }
      // over: sits above another opening (a clerestory over a door). Its framing starts on that opening's header.
      var low = op.over && byId[op.over];
      if (low) { rec.over = op.over; rec.base = low.v1 + low.hd; rec.noKing = [true, true]; }
      byId[op.id] = rec;
      ops[op.wall].push(rec);
      if (op.tiers) op.tiers.forEach(function (tr, j) {
        units.push({ id: op.id + ['a', 'b', 'c', 'd'][j], it: tr[2], wall: op.wall, u0: op.u[0], u1: op.u[1], v0: tr[0], v1: tr[1], tier: j, note: op.note, n: C.cat[tr[2]].n });
      });
      else units.push({ id: op.id, it: op.it, wall: op.wall, u0: op.u[0], u1: op.u[1], v0: v[0], v1: v[1], door: !!op.door, solid: !!op.solid, over: !!low, egress: !!op.egress, room: op.room, note: op.note, n: it ? it.n : op.it });
    });
    var sb = M.southBays, bays = sb[o.glass];
    bays.forEach(function (b, i) {
      var end = i === 0 || i === bays.length - 1;
      // where two bays share a full-height post, the header hangs off the post; the outer jambs get jacks and two kings
      var hang = [i > 0 && b[0] - bays[i - 1][1] < 1, i < bays.length - 1 && bays[i + 1][0] - b[1] < 1];
      var hs = G.S.headerFor({ id: 'SB' + (i + 1), u0: b[0], u1: b[1] }, 'S');
      ops.S.push({ id: 'SB' + (i + 1), u0: b[0], u1: b[1], v0: sb.tiers[0][0], v1: sb.header[0], hd: sb.header[1] - sb.header[0], hit: 'WAL-HDRL', hdrN: hs.n, bay: true,
        noKing: hang, hang: hang, jn: hs.jacks, kn: 2, tiers: sb.tiers });
      if (i < bays.length - 1 && bays[i + 1][0] - b[1] < 1) posts.push([b[1] + 0.02, bays[i + 1][0] - 0.02]);
      sb.tiers.forEach(function (tr, j) {
        var it = tr[2] === 'top' ? (end ? 'OPN-TOPAWN' : 'OPN-TOPFIX') : tr[2];
        units.push({ id: 'S' + (i + 1) + ['a', 'b', 'c'][j], it: it, wall: 'S', u0: b[0], u1: b[1], v0: tr[0], v1: tr[1], bay: i + 1, n: C.cat[it].n });
      });
    });
    return { units: units, ops: ops, posts: posts, bays: bays };
  };

  E.walls = function (C, G, OP) {
    var M = C.M, o = C.o, g = M.geo, FF = G.FF, t6 = g.t6, t4 = g.t4;
    var Ntop = G.rb(0), Stop = G.rb(24 - t6);
    var sideTop = function (Z) { return G.rb(Z); };
    E.frameWall(C, G, { axis: 'x', u0: 0, u1: 32, c: t6 / 2, t: t6, top: function () { return Ntop; }, ops: OP.ops.N, stud: 'WAL-STUD6', tall: 'WAL-LSL', plate: 'WAL-PLATE6', extra: [t6 + 0.0625, 32 - t6 - 0.0625] });
    E.frameWall(C, G, { axis: 'x', u0: 0, u1: 32, c: 24 - t6 / 2, t: t6, top: function () { return Stop; }, ops: OP.ops.S, posts: OP.posts, oc: G.S.wall ? G.S.wall.studOC : undefined, stud: 'WAL-STUD6', tall: 'WAL-LSL', plate: 'WAL-PLATE6', extra: [t6 + 0.0625, 32 - t6 - 0.0625] });
    E.frameWall(C, G, { axis: 'z', u0: t6, u1: 24 - t6, c: t6 / 2, t: t6, top: sideTop, sloped: true, ops: OP.ops.W, stud: 'WAL-STUD6', tall: 'WAL-LSL', plate: 'WAL-PLATE6' });
    E.frameWall(C, G, { axis: 'z', u0: t6, u1: 24 - t6, c: 32 - t6 / 2, t: t6, top: sideTop, sloped: true, ops: OP.ops.E, stud: 'WAL-STUD6', tall: 'WAL-LSL', plate: 'WAL-PLATE6' });
    // beveled bearing plates under the rafters
    [[0, Ntop, G.rb(t6)], [24 - t6, Stop, G.rb(24)]].forEach(function (b) {
      C.add({ it: 'WAL-BEVEL', k: 'box', c: [16, (b[1] + b[2]) / 2 + 0.03, b[0] + t6 / 2], s: [32, 0.09, t6 / COS], rx: -TH, len: 32 });
    });
    // partitions
    var ptop = FF + g.ceil + g.dw;
    M.partitions.forEach(function (p) {
      var ops = (p.doors || []).map(function (d) { return { id: d.id, u0: d.u[0], u1: d.u[1], v0: 0, v1: 6.9, hd: 0.77, hit: 'WAL-HDR2', door: true }; });
      var six = p.t > 0.4;
      E.frameWall(C, G, { axis: p.axis, u0: p.u[0], u1: p.u[1], c: p.c, t: p.t, top: function () { return ptop; }, ops: ops,
        stud: six ? 'WAL-STUD6' : 'WAL-STUD4', plate: six ? 'WAL-PLATE6' : 'WAL-PLATE4' });
    });
    // wall above the bedroom wing (no loft): closes the void over the bedrooms
    if (!o.loft) {
      var b0 = ptop + g.cj;
      // 1 in gap under the rafter with slotted deflection clips, so the loaded rafter never bears on this wall
      E.frameWall(C, G, { axis: 'z', u0: 3.9, u1: 24 - t6, c: 22.0, t: t4, bot: b0, top: function (Z) { return G.rb(Z) - 1 / 12; }, sloped: true, ops: [], oc: 2,
        stud: 'WAL-STUD4', plate: 'WAL-PLATE4', roofy: true });
    }
    // ledger for ceiling joists at the south wall, straps
    C.box('WAL-LEDGER', 22.146, ptop, 24 - t6 - 0.146, 31.5417 - 22.146, 0.99, 0.146);
    [[0.2, 0.05], [31.6, 0.05], [0.2, 23.75], [31.6, 23.75], [0.6, 23.75], [7.7, 23.75], [14.7, 23.75], [21.6, 23.75]].forEach(function (s) {
      C.box('WAL-STRAP', s[0], FF - 0.9, s[1] - 0.02, 0.12, 2.2, 0.04);
    });
  };

  /* ---------- roof ---------- */
  // A sloped part whose ends can be "fitted": a fitted end stops exactly at the plan line (Za or Zb) so it meets
  // a vertical fascia; an unfitted end is cut square to the slope at the line, like slopeBox (butt joints at bearings).
  function slopeFit(C, it, x0, x1, Za, Zb, off, thick, G, x, fa, fb) {
    var h = thick / 2 * SIN, ca = fa ? Za + h : Za - off * SIN, cb = fb ? Zb - h : Zb - off * SIN;
    var Zc = (ca + cb) / 2, L = (cb - ca) / COS, Zm = Zc + off * SIN;
    return C.add({ it: it, k: 'box', c: [(x0 + x1) / 2, G.rb(Zm) + off * COS, Zc], s: [x1 - x0, thick, L], rx: -TH }, x);
  }
  E.slopeFit = slopeFit;

  // The layers above the rafters: lower deck (air barrier), sleepers over the rafters (the vent channel),
  // upper deck, underlayment (ice and water at both eaves), metal. P: {lo:[x0,x1], up:[x0,x1], za, zb, fa, fb, sl:[x], it:{}, eaves:[Z0,Z1]}
  E.roofLayers = function (C, G, P) {
    var g = C.M.geo, rd = G.rd, it = P.it, R = P.R || {}, za = P.za, zb = P.zb, fa = P.fa, fb = P.fb;
    function ex(x) { var y = {}; for (var k in R) y[k] = R[k]; for (var k2 in x) y[k2] = x[k2]; return y; }
    var L = (zb - za) / COS, o2 = rd + g.deck1 + g.sleeper;
    slopeFit(C, it.d1, P.lo[0], P.lo[1], za, zb, rd + g.deck1 / 2, g.deck1, G, ex({ area: (P.lo[1] - P.lo[0]) * L }), fa, fb);
    P.sl.forEach(function (x) { slopeFit(C, it.sl, x - 0.0625, x + 0.0625, za, zb, rd + g.deck1 + g.sleeper / 2, g.sleeper, G, ex({ len: L }), fa, fb); });
    slopeFit(C, it.d2, P.up[0], P.up[1], za, zb, o2 + g.deck2 / 2, g.deck2, G, ex({ area: (P.up[1] - P.up[0]) * L }), fa, fb);
    var iw = 6 * COS, e0 = P.eaves[0], e1 = P.eaves[1], ou = o2 + g.deck2 + 0.008, W = P.up[1] - P.up[0];
    [[e0, e0 + iw, it.iw], [e0 + iw, e1 - iw, it.syn], [e1 - iw, e1, it.iw]].forEach(function (b) {
      var a = Math.max(b[0], za), c = Math.min(b[1], zb);
      if (c - a > 0.05) slopeFit(C, b[2], P.up[0], P.up[1], a, c, ou, 0.012, G, ex({ area: W * (c - a) / COS }), fa && a <= za + 1e-6, fb && c >= zb - 1e-6);
    });
    slopeFit(C, it.metal, P.up[0], P.up[1], za - (fa ? 0.12 : 0), zb + (fb ? 0.12 : 0), o2 + g.deck2 + 0.015 + g.metal / 2, g.metal, G,
      ex({ area: W * (zb - za + (fa ? 0.12 : 0) + (fb ? 0.12 : 0)) / COS, solo: true, tex: 'seam', rep: [W / 1.333, 1] }), fa, fb);
  };

  // Rake overhang framing: 2x4 outriggers on edge at 24 in in the vent layer (3 ft back span over the rafters),
  // a 2x6 sub-fascia at the edge. The rake soffit hangs at the rafter-underside plane like the eave soffits.
  // side -1 west, +1 east. xw: outside face of the end rafter (the wall's framing line). Returns the outrigger zone.
  E.rake = function (C, G, side, xw, za, zb, fa, fb, it, R) {
    var g = C.M.geo, rd = G.rd, edge = xw + side * g.rake, vo = rd + g.deck1 + g.sleeper / 2, back = 3.0;
    var xa = side < 0 ? edge + 0.125 : xw - back, xb = side < 0 ? xw + back : edge - 0.125;
    for (var z = za + 1; z < zb - 0.5; z += 2) slopeBox(C, it, xa, xb, z - 0.0625, z + 0.0625, vo, g.sleeper, G, Object.assign({ n: 'Rake outrigger, 2x4 on edge', len: xb - xa }, R || {}));
    slopeFit(C, it, side < 0 ? edge : edge - 0.125, side < 0 ? edge + 0.125 : edge, za, zb, rd + g.deck1 + g.sleeper - 0.229, 0.458, G, Object.assign({ n: 'Rake sub-fascia, 2x6', len: (zb - za) / COS }, R || {}), fa, fb);
    return side < 0 ? [edge, xw + back + 0.1] : [xw - back - 0.1, edge];
  };

  E.roof = function (C, G, pen) {
    var M = C.M, o = C.o, g = M.geo, FF = G.FF, rw = G.rw, rd = G.rd, it = G.st.rafter;
    var Z0 = G.Z0, Z1 = 24 + g.eaveS, xs = [rw / 2], CV = G.cover, GB = E.garageBox ? E.garageBox(M, o) : null;
    for (var k = 1; rw / 2 + k * G.rs < 32 - rw / 2 - 0.3; k++) xs.push(rw / 2 + k * G.rs);
    xs.push(32 - rw / 2);
    G.rafterX = xs;
    // west edge of the house roof, north to south: joined to the garage roof where it runs alongside, else a rake
    var xJ = xs[0], segW = [];
    if (!GB) segW.push([Z0, Z1, 'rake']);
    else {
      var jz1 = Math.min(Z1, GB.RZ1);
      segW.push([Z0, jz1, 'join']);
      if (jz1 < Z1 - 0.01) segW.push([jz1, Z1, 'rake']);
    }
    var xJN = GB && CV ? GB.X1 - g.t6 / 2 : xJ; // joint line north of the house
    G.roofJoin = GB ? { x: xJ, xN: xJN, z0: Z0, z1: segW[0][1] } : null;
    // openings through the roof framing (chimney). pen: [{x, z, r, c}] with pipe radius r and air space c.
    // The rafters lean, so the uphill (south) header's inner face is set further south by depth x sin(slope):
    // that keeps the air space at the top of the rafters as well as at the bottom.
    var holes = (pen || []).filter(function (p) { return p.frame; }).map(function (p) {
      return Object.assign({}, p, { zN: p.z - p.r - p.c, zS: p.z + p.r + p.c + rd * SIN, hx: p.r + p.c });
    });
    G.roofHoles = holes;
    // rafters: simple spans. With the covered area, the house rafters run from the north wall to the south eave and
    // separate rafters span from the north wall to the covered-area beam; they butt over the north wall's plate.
    var zN = g.t6 / 2, zA = CV ? zN : Z0;
    xs.forEach(function (x) {
      var cut = null;
      holes.forEach(function (h) { if (Math.abs(x - h.x) < h.hx + rw / 2) cut = h; });
      if (CV) {
        // the west end rafter over the covered area bears on the garage's short east wall, not on the beam
        var xc = x === xJ && GB ? xJN : x, zc1 = x === xJ && GB ? -(g.zip + g.siding) : zN;
        slopeFit(C, it, xc - rw / 2, xc + rw / 2, Z0, zc1, rd / 2, rd, G, { n: xc !== x ? 'Rafter, covered area (on the garage wall)' : 'Rafter, covered area' }, true, false);
      }
      if (cut) {
        slopeFit(C, it, x - rw / 2, x + rw / 2, zA, cut.zN - 0.25, rd / 2, rd, G, { n: 'Rafter (cut at chimney)' }, !CV, false);
        slopeFit(C, it, x - rw / 2, x + rw / 2, cut.zS + 0.25, Z1, rd / 2, rd, G, { n: 'Rafter (cut at chimney)' }, false, true);
      } else slopeFit(C, it, x - rw / 2, x + rw / 2, zA, Z1, rd / 2, rd, G, { n: 'Rafter' }, !CV, true);
      // ties at both bearings
      [0.2, 23.8].forEach(function (z) {
        var yb = G.rb(z);
        C.box('ROF-TIE', x + rw / 2, yb - 0.25, z - 0.1, 0.02, 0.6, 0.2);
      });
    });
    holes.forEach(function (h) {
      var l = -1, r = 99;
      xs.forEach(function (x) { if (x < h.x - h.hx - rw / 2 && x > l) l = x; if (x > h.x + h.hx + rw / 2 && x < r) r = x; });
      h.xl = l + rw / 2; h.xr = r - rw / 2;
      slopeBox(C, 'ROF-BLOCK', h.xl, h.xr, h.zN - 0.25, h.zN, rd / 2, rd, G, { n: 'Doubled header at chimney, north' });
      slopeBox(C, 'ROF-BLOCK', h.xl, h.xr, h.zS, h.zS + 0.25, rd / 2, rd, G, { n: 'Doubled header at chimney, south' });
    });
    // blocking panels at both bearings. Over the bedroom wing the north panels sit above the short
    // ceiling stubs that bear on the wall plate between the rafters (see E.wing).
    var cjTop = FF + g.ceil + g.dw + g.cj;
    for (var i = 1; i < xs.length; i++) {
      var bx0 = xs[i - 1] + rw / 2, bx1 = xs[i] - rw / 2, bc = (bx0 + bx1) / 2;
      [0.0, 24 - g.t6].forEach(function (z) {
        if (z === 0 && bc > 22.25 && bc < 31.45) C.box('ROF-BLOCK', bx0, cjTop + 0.01, 0, bx1 - bx0, G.rb(0) + rd / COS - 0.05 - cjTop, g.t6, { n: 'Blocking above ceiling stub' });
        else slopeBox(C, 'ROF-BLOCK', bx0, bx1, z, z + g.t6, rd / 2, rd, G, { n: 'Blocking at bearing' });
      });
    }
    // covered area: LVL beam on a beveled plate under the rafters, four posts on piers; the beam stops short of the garage
    if (CV) {
      var SC = G.S.cover, bz = CV.z, bw = CV.beam[0], bd = CV.beam[1], byt = G.rb(bz - bw / 2) - 0.09, xb0 = SC.x0, xb1 = SC.x1;
      C.box('ROF-CBEAM', xb0, byt - bd, bz - bw / 2, xb1 - xb0, bd, bw, { n: 'Beam over the covered area', len: xb1 - xb0 });
      C.add({ it: 'WAL-BEVEL', k: 'box', c: [(xb0 + xb1) / 2, G.rb(bz) - 0.05, bz], s: [xb1 - xb0, 0.09, bw / COS], rx: -TH, len: xb1 - xb0, n: 'Beveled plate on the covered-area beam' });
      CV.posts.forEach(function (px) {
        var ps = CV.post, ptop = 0.5;
        C.box('EXT-CPOST', px - ps / 2, ptop, bz - ps / 2, ps, byt - bd - ptop, ps, { n: 'Post, covered area' });
        E.pierAt(C, px, bz, SC.ftg, 12, ptop, { label: 'covered-area post' });
      });
      for (var ib = 1; ib < xs.length; ib++) if (xs[ib - 1] + rw / 2 >= xb0 - 0.01) slopeBox(C, 'ROF-BLOCK', xs[ib - 1] + rw / 2, xs[ib] - rw / 2, bz - g.t6 / 2, bz + g.t6 / 2, rd / 2, rd, G, { n: 'Blocking at the beam' });
      xs.forEach(function (x) { if (x - rw / 2 >= xb0 - 0.01) C.box('ROF-TIE', x + rw / 2, G.rb(bz) - 0.25, bz - 0.1, 0.02, 0.6, 0.2); });
    }
    // rakes: east always; west only where no garage roof runs alongside
    var zones = [];
    zones.push(E.rake(C, G, 1, 32, Z0, Z1, true, true, 'ROF-FLY'));
    segW.forEach(function (s) { if (s[2] === 'rake') zones.push(E.rake(C, G, -1, 0, s[0], s[1], s[0] <= Z0 + 1e-6, s[1] >= Z1 - 1e-6, 'ROF-FLY')); });
    // decks, sleepers over the rafters, underlayment, metal, piece by piece along the west edge
    var everyOther = G.rs < 1.1, metal = o.roof === 'seam' ? 'RFG-SEAM' : 'RFG-RIB', IT = { d1: 'ROF-DECK1', sl: 'ROF-SLEEPER', d2: 'ROF-DECK2', iw: 'RFG-IW', syn: 'RFG-SYN', metal: metal };
    var segL = [];
    segW.forEach(function (s) { if (s[2] === 'join' && xJN !== xJ && s[0] < 0) { segL.push([s[0], 0, 'join', xJN]); segL.push([0, s[1], 'join', xJ]); } else segL.push([s[0], s[1], s[2], xJ]); });
    segL.forEach(function (s) {
      var join = s[2] === 'join', xj = s[3], sl = xs.filter(function (x, i) {
        if (everyOther && i % 2 && i !== xs.length - 1) return false;
        if (x > 32 - 3.1) return false;               // east outriggers carry the upper deck there
        if (!join && x < 3.1) return false;           // west outriggers
        return true;
      });
      if (join && xj !== xJ) sl = sl.map(function (x) { return x === xJ ? xj : x; });
      E.roofLayers(C, G, { lo: [join ? xj : 0, 32], up: [join ? xj : -g.rake, 32 + g.rake], za: s[0], zb: s[1], fa: s[0] <= Z0 + 1e-6, fb: s[1] >= Z1 - 1e-6, sl: sl, it: IT, eaves: [Z0, Z1] });
    });
    // snow rails: two rows above the north eave so sliding snow stays off the covered area and the garage wall
    var snx0 = GB ? GB.X0 - g.rake : -g.rake, sTop = G.stackT + 0.08;
    [Z0 + 2.0, Z0 + 5.5].forEach(function (z) { slopeBox(C, 'RFG-SNOW', snx0 + 0.5, 32 + g.rake - 0.5, z - 0.06, z + 0.06, sTop, 0.16, G, { n: 'Snow rail', len: 32 + g.rake - 0.5 - snx0 - 0.5 }); });
    // fascia (eaves and rakes) and trim. The garage roof meets the house roof over the house's west end rafter (xJ).
    var X0 = -g.rake, X1 = 32 + g.rake;
    var xN0 = GB ? (CV ? xJN : GB.X1 + g.rake) : X0, xS0 = GB && GB.RZ1 >= Z1 - 0.01 ? xJ : X0;
    var fh = G.stackT - g.metal - 0.02, ytopN = G.roofTop(Z0) - (g.metal + 0.02) / COS, ytopS = G.roofTop(Z1) - (g.metal + 0.02) / COS;
    // eave fascias wrap the ends of the rake fascias at the corners
    var wN0 = xN0 === X0 ? X0 - 0.125 : xN0, wS0 = xS0 === X0 ? X0 - 0.125 : xS0, X1w = X1 + 0.125;
    C.box('RFG-FASCIA', wN0, ytopN - fh / COS, Z0 - 0.125, X1w - wN0, fh / COS, 0.125, { n: 'Fascia, north eave' });
    C.box('RFG-FASCIA', wS0, ytopS - fh / COS, Z1, X1w - wS0, fh / COS, 0.125, { n: 'Fascia, south eave' });
    var rakesF = [[X1, Z0, Z1]];
    segW.forEach(function (s) { if (s[2] === 'rake') rakesF.push([X0 - 0.125, s[0], s[1]]); });
    rakesF.forEach(function (r) {
      var fa = r[1] <= Z0 + 1e-6, fb = r[2] >= Z1 - 1e-6, d = fh * SIN;
      slopeFit(C, 'RFG-FASCIA', r[0], r[0] + 0.125, r[1], r[2], fh / 2, fh, G, { n: 'Fascia, rake', len: (r[2] - r[1]) / COS }, fa, fb);
      // the rake board is cut square to the slope; a plumb filler closes the corner against the eave fascia
      if (fb) C.box('RFG-FASCIA', r[0], G.rb(Z1 - d), Z1 - d, 0.125, ytopS - G.rb(Z1 - d), d, { n: 'Fascia corner', nq: true });
      if (fa) C.box('RFG-FASCIA', r[0], G.rb(Z0), Z0, 0.125, ytopN - G.rb(Z0) + d / 3, d, { n: 'Fascia corner', nq: true });
    });
    C.box('RFG-TRIM', wN0 - 0.06, ytopN - 0.25, Z0 - 0.18, X1w + 0.12 - wN0, 0.28, 0.06, { n: 'Eave trim, north' });
    C.box('RFG-TRIM', wS0 - 0.06, ytopS - 0.25, Z1 + 0.12, X1w + 0.12 - wS0, 0.28, 0.06, { n: 'Eave trim, south' });
    rakesF.forEach(function (r) { var xt = r[0] > 16 ? X1 + 0.12 : X0 - 0.18; slopeFit(C, 'RFG-TRIM', xt, xt + 0.06, r[1] - (r[1] <= Z0 + 1e-6 ? 0.12 : 0), r[2] + (r[2] >= Z1 - 1e-6 ? 0.12 : 0), fh - 0.1, 0.28, G, { n: 'Rake trim', len: (r[2] - r[1]) / COS }, r[1] <= Z0 + 1e-6, r[2] >= Z1 - 1e-6); });
    // soffits, all at the rafter-underside plane so eaves, rakes and the covered ceilings line up
    var sw = g.zip + g.siding, gx = GB ? GB.X1 + sw : X0;
    if (!CV) slopeBox(C, 'RFG-SOFFIT', GB ? GB.X1 + g.rake : X0, X1, Z0, -sw, -0.03, 0.05, G, { n: 'Soffit, north eave (vented)', area: (X1 - (GB ? GB.X1 + g.rake : X0)) * (-sw - Z0) / COS });
    else {
      var cb0 = CV.z - CV.beam[0] / 2, cb1 = CV.z + CV.beam[0] / 2;
      slopeBox(C, 'RFG-SOFFIT', gx, X1, Z0, cb0, -0.03, 0.05, G, { n: 'Soffit, north eave (vented)', area: (X1 - gx) * (cb0 - Z0) / COS });
      slopeBox(C, 'RFG-SOFFIT', gx, X1, cb1, -sw, -0.03, 0.05, G, { n: 'Ceiling, covered area', area: (X1 - gx) * (-sw - cb1) / COS });
    }
    var sx0 = GB && o.entryCover ? -sw : X0;
    slopeBox(C, 'RFG-SOFFIT', sx0, X1, 24 + sw, Z1, -0.03, 0.05, G, { n: 'Soffit, south eave (vented)', area: (X1 - sx0) * (Z1 - 24 - sw) / COS });
    slopeBox(C, 'RFG-SOFFIT', 32 + sw, X1 - 0.125, CV ? -sw : -sw, 24 + sw, -0.03, 0.05, G, { n: 'Soffit, rake', area: (g.rake - sw) * (24 + 2 * sw) / COS });
    segW.forEach(function (s) {
      if (s[2] !== 'rake') return;
      var a = Math.max(-sw, s[0]), b = Math.min(24 + sw, s[1]);
      if (b - a > 0.05) slopeBox(C, 'RFG-SOFFIT', X0 + 0.125, -sw, a, b, -0.03, 0.05, G, { n: 'Soffit, rake', area: (g.rake - sw) * (b - a) / COS });
    });

    // insulation, membrane and pine ceiling
    var ci = 0.4583, cZ0 = ci, cZ1 = 24 - ci, frac = 1 - rw / G.rs;
    function ins(x0, x1, za, zb) {
      if (x1 - x0 < 0.05 || zb - za < 0.05) return;
      slopeBox(C, 'ENV-ROOF', x0, x1, za, zb, rd / 2, rd * 0.98, G, { vol: (x1 - x0) * rd * (zb - za) / COS * frac, m: 'cell' });
    }
    var hl = holes[0];
    if (!hl) ins(ci, 32 - ci, cZ0, cZ1);
    else {
      // dense-pack stops at the chimney opening; a sheet-metal support box keeps it 2 in off the pipe
      ins(ci, 32 - ci, cZ0, hl.zN); ins(ci, 32 - ci, hl.zS, cZ1); ins(ci, hl.xl, hl.zN, hl.zS); ins(hl.xr, 32 - ci, hl.zN, hl.zS);
      var bh = hl.r + hl.c, yb0 = G.vault(hl.z + bh) - 0.02, yb1 = G.rb(hl.z + bh) + rd / COS;
      C.box('MEC-CHIMKIT', hl.x - bh, yb0, hl.z - bh, 2 * bh, yb1 - yb0, 2 * bh, { n: 'Ceiling support box (keeps insulation 2 in off the chimney)', nq: true, m: 'steel' });
    }
    slopeBox(C, 'ENV-MEMB', ci, 32 - ci, cZ0, cZ1, -0.01, 0.01, G, { area: (32 - 2 * ci) * (cZ1 - cZ0) / COS });
    var px1 = o.loft ? 31.5 : 21.8125;
    slopeBox(C, 'INT-PINE', 0.5, px1, 0.5, 23.5, -g.pine / 2 - 0.02, g.pine, G, { solo: true, tex: 'pine', rep: [(px1 - 0.5) / 0.46, 1], area: (px1 - 0.5) * 23 / COS });
  };

  /* ---------- bedroom wing ceiling and loft ---------- */
  E.wing = function (C, G) {
    var M = C.M, o = C.o, g = M.geo, FF = G.FF, y0 = FF + g.ceil + g.dw, cj = g.cj, t6 = g.t6;
    var xs = [22.0]; for (var x = 22.0 + 1.3333; x < 31.45; x += 1.3333) xs.push(x); xs.push(31.47);
    // Near the north wall the rafters come down into the joist depth. The joists stop at a 2-ply flush
    // header where the rafters clear them (Zh); north of it short stubs bear on the plate between rafters.
    var Zh = G.wingHeaderZ = (y0 + cj + 0.02 - G.rb(0)) / g.rise;
    var spans = [[Zh + 0.25, 10.0], [10.0, 15.3], [15.3, 24 - t6 - 0.146]];
    xs.forEach(function (x) {
      spans.forEach(function (s) { C.box('ROF-CJ', x - 0.0625, y0, s[0], 0.125, cj, s[1] - s[0]); });
      C.box('ROF-HANGER', x - 0.12, y0 + 0.05, 24 - t6 - 0.146 - 0.1, 0.24, cj * 0.8, 0.1);
      C.box('ROF-HANGER', x - 0.12, y0 + 0.05, Zh + 0.25, 0.24, cj * 0.8, 0.1);
    });
    [0, 0.125].forEach(function (d) { C.box('ROF-CJ', 22.15, y0, Zh + d, 31.54 - 22.15, cj, 0.125, { n: 'Flush header, 2-ply 2x10' }); });
    [22.15, 31.54 - 0.24].forEach(function (x) { C.box('ROF-HANGER', x, y0 + 0.05, Zh, 0.24, cj * 0.8, 0.25, { n: 'Header hanger' }); });
    var rx = G.rafterX;
    for (var i = 1; i < rx.length; i++) {
      var bc = (rx[i - 1] + rx[i]) / 2;
      if (bc > 22.25 && bc < 31.45) C.box('ROF-CJ', bc - 0.0625, y0, 0.05, 0.125, cj, Zh - 0.05, { n: 'Ceiling stub between rafters' });
    }
    // drywall ceilings
    M.rooms.forEach(function (r) {
      if (r.id === 'living') return;
      C.box('INT-DW', r.b[0], FF + g.ceil, r.b[2], r.b[1] - r.b[0], g.dw, r.b[3] - r.b[2], { n: 'Drywall ceiling, ' + r.name.toLowerCase(), roofy: true, ex: 2.9, out: 0, area: (r.b[1] - r.b[0]) * (r.b[3] - r.b[2]) });
    });
    if (!o.loft) return;
    var ly = y0 + cj;
    C.box('LFT-DECK', 22.0, ly, 2.4, 31.5417 - 22.0, g.loftDeck, 24 - t6 - 2.4);
    var top = ly + g.loftDeck + 3, gap = [M.stair.c[1] - 1.0, M.stair.c[1] + 1.0];
    [[2.4, gap[0]], [gap[1], 23.5]].forEach(function (s) {
      C.box('LFT-RAIL', 21.95, top - 0.15, s[0], 0.25, 0.15, s[1] - s[0], { n: 'Loft rail' });
      for (var z = s[0] + 0.2; z < s[1]; z += 0.35) C.box('LFT-RAIL', 22.02, ly + g.loftDeck, z, 0.08, 2.85, 0.08, { n: 'Baluster', nq: true });
    });
    // spiral stair
    var st = M.stair, cx = st.c[0], cz = st.c[1], r = st.r, n = st.risers, rise = (G.loftFloor - FF) / n;
    C.cyl('LFT-STAIR', cx, FF, cz, 0.14, G.loftFloor - FF + 3.0, { n: 'Spiral stair center pole', nq: true, roofy: false });
    var step = 27.7 * Math.PI / 180;
    for (var i = 1; i < n; i++) {
      var ang = -(n - 1 - i) * step, mid = (r + 0.15) / 2;
      C.add({ it: 'LFT-STAIR', k: 'box', c: [cx + Math.cos(ang) * mid, FF + i * rise, cz + Math.sin(ang) * mid], s: [r - 0.1, 0.1, 0.9], ry: -ang, n: 'Spiral stair tread', nq: true, roofy: false });
      var ox = cx + Math.cos(ang) * (r - 0.05), oz = cz + Math.sin(ang) * (r - 0.05);
      C.seg('LFT-STAIR', [ox, FF + i * rise, oz], [ox, FF + i * rise + 3.0, oz], 0.03, { n: 'Stair baluster', nq: true, roofy: false });
      if (i > 1) {
        var pa = -(n - i) * step, px = cx + Math.cos(pa) * (r - 0.05), pz = cz + Math.sin(pa) * (r - 0.05);
        C.seg('LFT-STAIR', [px, FF + (i - 1) * rise + 3.0, pz], [ox, FF + i * rise + 3.0, oz], 0.05, { n: 'Stair handrail', nq: true, roofy: false });
      }
    }
    C.add({ it: 'LFT-STAIR', k: 'marker', c: [cx, FF, cz], n: 'Spiral stair kit' });
  };
})(ENG);
if (typeof module !== 'undefined') module.exports = ENG;
