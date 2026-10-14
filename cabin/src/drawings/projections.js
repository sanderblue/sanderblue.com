/* Rime Cabin drawing set, part 2: projections and cuts taken straight from the model's part list,
   plus the architectural floor plan. Elevations hide lines with a painter's sort; sections slice every part. */
(function (D) {
  var VIEWS = {
    plan: function (p) { return [p[0], p[2], -p[1]]; },
    S: function (p) { return [p[0], -p[1], -p[2]]; },
    N: function (p) { return [32 - p[0], -p[1], p[2]]; },
    E: function (p) { return [24 - p[2], -p[1], -p[0]]; },
    W: function (p) { return [p[2], -p[1], p[0]]; },
    secX: function (p) { return [p[2], -p[1], p[0]]; },
    secZ: function (p) { return [p[0], -p[1], -p[2]]; }
  };
  D.VIEWS = VIEWS;

  // corners and edges of a part as a convex solid
  function solid(p) {
    var pts = [], edges = [];
    if (p.k === 'box') {
      var h = [p.s[0] / 2, p.s[1] / 2, p.s[2] / 2];
      for (var i = 0; i < 8; i++) pts.push([i & 1 ? h[0] : -h[0], i & 2 ? h[1] : -h[1], i & 4 ? h[2] : -h[2]]);
      for (var a = 0; a < 8; a++) for (var b = a + 1; b < 8; b++) { var d = a ^ b; if (d === 1 || d === 2 || d === 4) edges.push([a, b]); }
    } else if (p.k === 'cyl') {
      var n = 12;
      for (var j = 0; j < n; j++) { var t = j / n * Math.PI * 2; pts.push([Math.cos(t) * p.r, -p.h / 2, Math.sin(t) * p.r]); }
      for (var j2 = 0; j2 < n; j2++) { var t2 = j2 / n * Math.PI * 2; pts.push([Math.cos(t2) * p.r, p.h / 2, Math.sin(t2) * p.r]); }
      for (var k = 0; k < n; k++) { edges.push([k, (k + 1) % n]); edges.push([n + k, n + (k + 1) % n]); edges.push([k, n + k]); }
    } else return null;
    var rx = p.rx || 0, ry = p.ry || 0, rz = p.rz || 0;
    pts = pts.map(function (q) {
      var x = q[0], y = q[1], z = q[2], c, s, t;
      if (rz) { c = Math.cos(rz); s = Math.sin(rz); t = c * x - s * y; y = s * x + c * y; x = t; }
      if (ry) { c = Math.cos(ry); s = Math.sin(ry); t = c * x + s * z; z = -s * x + c * z; x = t; }
      if (rx) { c = Math.cos(rx); s = Math.sin(rx); t = c * y - s * z; z = s * y + c * z; y = t; }
      return [p.c[0] + x, p.c[1] + y, p.c[2] + z];
    });
    return { pts: pts, edges: edges };
  }
  D.solid = solid;

  function hull(P) {
    if (P.length < 3) return P;
    P = P.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    function cr(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    var lo = [], up = [];
    P.forEach(function (p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); });
    for (var i = P.length - 1; i >= 0; i--) { var p = P[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    up.pop(); lo.pop(); return lo.concat(up);
  }
  D.hull = hull;

  // skin outline point to 3D
  function skinPt(p, u, v, w) {
    return p.axis === 'x' ? [u, v, p.face + p.dir * w] : [p.face + p.dir * w, v, u];
  }
  function winPts(p) {
    var a = [], us = [p.u0, p.u1], vs = [p.v0, p.v1], ws = [p.d0, p.d1];
    us.forEach(function (u) { vs.forEach(function (v) { ws.forEach(function (w) { a.push(skinPt(p, u, v, w)); }); }); });
    return a;
  }
  D.winPts = winPts;

  // map from view coordinates (feet) to the sheet
  function Map(ox, oy, k, u0, v0) { this.ox = ox; this.oy = oy; this.k = k; this.u0 = u0; this.v0 = v0; }
  Map.prototype.x = function (u) { return this.ox + (u - this.u0) * this.k; };
  Map.prototype.y = function (v) { return this.oy + (v - this.v0) * this.k; };
  Map.prototype.pt = function (uv) { return [this.x(uv[0]), this.y(uv[1])]; };
  D.Map = Map;

  // projected outline of one part in a view: [{pts, holes, depth}]
  function project(p, view) {
    var V = VIEWS[view], facing;
    if (p.k === 'skin') {
      facing = (p.axis === 'x' && /^(S|N|secZ)$/.test(view)) || (p.axis === 'z' && /^(E|W|secX)$/.test(view));
      var w = facing ? (p.d0 + p.d1) / 2 : p.d0;
      if (facing) {
        var ol = p.outline.map(function (q) { return V(skinPt(p, q[0], q[1], p.d0)); });
        var hs = p.holes.map(function (h) { return [[h[0], h[1]], [h[2], h[1]], [h[2], h[3]], [h[0], h[3]]].map(function (q) { return V(skinPt(p, q[0], q[1], p.d0)); }); });
        return { pts: ol, holes: hs, depth: Math.min.apply(null, ol.map(function (q) { return q[2]; })) };
      }
      var all = [];
      p.outline.forEach(function (q) { all.push(V(skinPt(p, q[0], q[1], p.d0))); all.push(V(skinPt(p, q[0], q[1], p.d1))); });
      return { pts: hull(all), holes: [], depth: avg(all) };
    }
    if (p.k === 'win') { var wp = winPts(p).map(V); return { pts: hull(wp), holes: [], depth: Math.min.apply(null, wp.map(function (q) { return q[2]; })), win: true }; }
    if (p.k === 'seg') { var a = V(p.a), b = V(p.b); return { seg: [a, b], r: p.r, depth: (a[2] + b[2]) / 2 }; }
    var s = solid(p); if (!s) return null;
    var pp = s.pts.map(V);
    return { pts: hull(pp), holes: [], depth: avg(pp) };
  }
  function avg(a) { return a.reduce(function (s, q) { return s + q[2]; }, 0) / a.length; }
  D.project = project;

  function pathOf(map, pts, holes) {
    var d = 'M' + pts.map(function (q) { return D.r1(map.x(q[0])) + ' ' + D.r1(map.y(q[1])); }).join(' L') + ' Z';
    (holes || []).forEach(function (h) { d += ' M' + h.map(function (q) { return D.r1(map.x(q[0])) + ' ' + D.r1(map.y(q[1])); }).join(' L') + ' Z'; });
    return d;
  }
  D.pathOf = pathOf;

  // draw projected parts with a painter's sort; style(p, pr) returns a class string or null to skip
  D.drawProjected = function (sh, R, view, map, filter, style, opts) {
    opts = opts || {};
    var list = [];
    R.parts.forEach(function (p) {
      if (p.k === 'marker' || !filter(p)) return;
      var pr = project(p, view); if (!pr) return;
      list.push([p, pr]);
    });
    list.sort(function (a, b) { return b[1].depth - a[1].depth; });
    list.forEach(function (e) {
      var p = e[0], pr = e[1], cls = style(p, pr); if (!cls) return;
      if (pr.seg) {
        var a = map.pt(pr.seg[0]), b = map.pt(pr.seg[1]), w = Math.max(1.2, pr.r * 2 * map.k);
        if (opts.quads && w > 4) {
          var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / L * w / 2, ny = dx / L * w / 2;
          sh.poly([[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]], cls);
        } else if (opts.maxW === 0) sh.line(a[0], a[1], b[0], b[1], cls); // class line weight (pipe legends)
        else sh.line(a[0], a[1], b[0], b[1], cls, ' style="stroke-width:' + D.r1(Math.min(w, opts.maxW || 99)) + 'px;stroke-linecap:round"');
        return;
      }
      if (!pr.pts || pr.pts.length < 3) return;
      sh.path(pathOf(map, pr.pts, pr.holes), cls, pr.holes && pr.holes.length ? ' fill-rule="evenodd"' : '');
      if (opts.after) opts.after(p, pr);
    });
  };

  /* ---------- section cuts ---------- */
  // garage items cut like their house counterparts
  var GCUT = { 'GAR-CONC': 'FND-CRAWL', 'GAR-STUD': 'WAL-STUD6', 'GAR-LSL': 'WAL-STUD6', 'GAR-PLATE': 'WAL-PLATE6', 'GAR-HDR': 'WAL-HDR2', 'GAR-HDRL': 'WAL-HDRL', 'GAR-IJ16': 'ROF-IJ16', 'GAR-LVL16': 'ROF-LVL16',
    'GAR-BLOCK': 'ROF-BLOCK', 'GAR-TIE': 'ROF-TIE', 'GAR-DECK': 'ROF-DECK1', 'GAR-UNDER': 'RFG-SYN', 'GAR-SEAM': 'RFG-SEAM', 'GAR-RIB': 'RFG-RIB', 'GAR-TRIM': 'RFG-TRIM', 'GAR-SOFFIT': 'RFG-SOFFIT', 'GAR-SHEATH': 'WAL-ZIPR', 'GAR-BB': 'EXT-BB', 'GAR-OSB': 'INT-DW' };
  function cutClass(p) {
    var it = GCUT[p.it] || p.it;
    if (/^FND-(FTG|TUBE|CRAWL)$/.test(it)) return 'f-conc d-cut';
    if (/^(ENV-ROOF|FLR-INS)$/.test(it)) return 'f-cell d-md';
    if (/^ENV-WALL$/.test(it)) return 'f-insul d-md';
    if (/^FND-XPS$/.test(it)) return 'f-foam d-md';
    if (/^(WAL-ZIPR|FLR-SUB|ROF-DECK1|ROF-DECK2|FLR-BELLY|LFT-DECK|RFG-IW|RFG-SYN|FND-VB)$/.test(it)) return 'f-dark d-lt';
    if (/^(RFG-SEAM|RFG-RIB|RFG-TRIM)$/.test(it)) return 'f-dark d-md';
    if (/^(INT-DW|INT-PINE|EXT-BB|INT-FLOOR|RFG-SOFFIT|RFG-FASCIA|ENV-MEMB)$/.test(it)) return 'f-white d-md';
    if (/^(WAL-|FLR-(JOIST|BEAM|RIM)|ROF-|FND-SILL|LFT-RAIL)/.test(it)) return 'f-white d-cut wood';
    if (it === 'MEC-CHIMKIT' && /support box/.test(p.n || '')) return 'd-md'; // sheet-metal box, outline only
    if (/^(PLB|MEC|ELE|SITE|FND-RADON)/.test(it)) return null;
    return 'f-fix d-lt';
  }
  D.cutClass = cutClass;
  function sliceSkin(p, axis, c) {
    // returns list of rectangles [[u0,u1],[ya,yb]] in (across, height) for a skin perpendicular to the cut
    if (!((p.axis === 'x' && axis === 'x') || (p.axis === 'z' && axis === 'z'))) return [];
    var xs = [], ol = p.outline;
    for (var i = 0; i < ol.length; i++) {
      var a = ol[i], b = ol[(i + 1) % ol.length];
      if ((a[0] - c) * (b[0] - c) < 0 || (a[0] === c && b[0] !== c)) { var t = (c - a[0]) / (b[0] - a[0]); xs.push(a[1] + t * (b[1] - a[1])); }
    }
    xs.sort(function (a, b) { return a - b; });
    var ivs = [];
    for (var j = 0; j + 1 < xs.length; j += 2) ivs.push([xs[j], xs[j + 1]]);
    p.holes.forEach(function (h) {
      if (c <= h[0] || c >= h[2]) return;
      var out = [];
      ivs.forEach(function (iv) {
        if (h[3] <= iv[0] || h[1] >= iv[1]) { out.push(iv); return; }
        if (h[1] > iv[0]) out.push([iv[0], h[1]]);
        if (h[3] < iv[1]) out.push([h[3], iv[1]]);
      });
      ivs = out;
    });
    return ivs;
  }
  // draw everything the plane cuts; axis 'x' (plane X = c, view secX) or 'z' (plane Z = c, view secZ)
  D.drawCut = function (sh, R, axis, c, map, opts) {
    opts = opts || {};
    c += 0.0007;
    var view = axis === 'x' ? 'secX' : 'secZ', V = VIEWS[view], ai = axis === 'x' ? 0 : 2, segs = [];
    R.parts.forEach(function (p) {
      if (p.k === 'marker') return;
      if (opts.filter && !opts.filter(p)) return;
      if (p.k === 'seg') {
        if (p.it === 'ELE-WIRE' || /^(SITE|PWR)/.test(p.it)) return;
        var da = p.a[ai] - c, db = p.b[ai] - c;
        if (da * db < 0) { var t = da / (da - db), q = [p.a[0] + t * (p.b[0] - p.a[0]), p.a[1] + t * (p.b[1] - p.a[1]), p.a[2] + t * (p.b[2] - p.a[2])]; segs.push(['dot', V(q), p]); }
        else if (Math.abs(da) < Math.max(p.r, 0.25) && Math.abs(db) < Math.max(p.r, 0.25)) segs.push(['line', V(p.a), V(p.b), p]);
        return;
      }
      var cls = cutClass(p); if (!cls) return;
      if (p.k === 'skin') {
        sliceSkin(p, axis, c).forEach(function (iv) {
          var a = skinPt(p, c, iv[0], p.d0), b = skinPt(p, c, iv[1], p.d1), pa = V(a), pb = V(b);
          sh.rect(map.x(Math.min(pa[0], pb[0])), map.y(Math.min(pa[1], pb[1])), Math.abs(pb[0] - pa[0]) * map.k, Math.abs(pb[1] - pa[1]) * map.k, cls.replace(' wood', ''));
        });
        return;
      }
      if (p.k === 'win') {
        var u = p.axis === axis ? c : null; if (u === null || c <= p.u0 || c >= p.u1) return;
        var f = 0.14, A = function (v, w) { return map.pt(V(skinPt(p, c, v, w))); };
        [[p.v0, p.v0 + f], [p.v1 - f, p.v1]].forEach(function (b) { var a1 = A(b[0], p.d0), a2 = A(b[1], p.d1); sh.rect(Math.min(a1[0], a2[0]), Math.min(a1[1], a2[1]), Math.abs(a2[0] - a1[0]), Math.abs(a2[1] - a1[1]), 'f-white d-md'); });
        var g1 = A(p.v0 + f, (p.d0 + p.d1) / 2), g2 = A(p.v1 - f, (p.d0 + p.d1) / 2);
        sh.line(g1[0] - 1.5, g1[1], g2[0] - 1.5, g2[1], 'd-md'); sh.line(g1[0] + 1.5, g1[1], g2[0] + 1.5, g2[1], 'd-md');
        return;
      }
      var s = solid(p); if (!s) return;
      var hits = [];
      s.edges.forEach(function (e) {
        var a = s.pts[e[0]], b = s.pts[e[1]], da = a[ai] - c, db = b[ai] - c;
        if (da * db < 0) { var t = da / (da - db); hits.push(V([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])])); }
      });
      if (hits.length < 3) return;
      var h = hull(hits), pts = h.map(function (q) { return map.pt(q); });
      sh.poly(pts, cls.replace(' wood', ''));
      if (/wood/.test(cls) && pts.length === 4 && opts.xWood !== false) {
        var w = Math.abs(pts[2][0] - pts[0][0]), hh = Math.abs(pts[2][1] - pts[0][1]);
        if (w * hh > 25) { sh.line(pts[0][0], pts[0][1], pts[2][0], pts[2][1], 'd-xl'); sh.line(pts[1][0], pts[1][1], pts[3][0], pts[3][1], 'd-xl'); }
      }
    });
    if (opts.mep !== false) segs.forEach(function (s) {
      var p = s[s.length - 1], cls = p.sys === 'cold' ? 'cold' : p.sys === 'hot' ? 'hot' : p.sys === 'dwv' || p.sys === 'vent' ? 'dwv' : p.sys === 'gas' ? 'gas' : p.it === 'ELE-WIRE' ? 'd-lt' : 'duct';
      if (s[0] === 'dot') sh.circle(map.x(s[1][0]), map.y(s[1][1]), Math.max(2.5, p.r * map.k), 'f-white ' + cls.split(' ')[0], ' stroke-dasharray="none"');
      else {
        var a = map.pt(s[1]), b = map.pt(s[2]), w = p.r * 2 * map.k;
        if (w > 5) { var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / L * w / 2, ny = dx / L * w / 2; sh.poly([[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]], 'f-white d-md'); }
        else sh.line(a[0], a[1], b[0], b[1], cls);
      }
    });
  };
  // things seen beyond the cut, light lines with white fill so nearer pieces hide farther ones
  D.drawBeyond = function (sh, R, axis, c, map, depth, filter) {
    var view = axis === 'x' ? 'secX' : 'secZ', ai = axis === 'x' ? 0 : 2, dir = axis === 'x' ? 1 : -1;
    D.drawProjected(sh, R, view, map, function (p) {
      if (!filter(p)) return false;
      var pr = project(p, view); if (!pr) return false;
      var pts = p.k === 'seg' ? [p.a, p.b] : p.k === 'win' ? winPts(p) : p.k === 'skin' ? [skinPt(p, p.outline[0][0], p.outline[0][1], p.d0)] : (solid(p) || { pts: [] }).pts;
      var ok = pts.some(function (q) { var d = (q[ai] - c) * dir; return d > 0.01 && d < depth; });
      return ok;
    }, function (p, pr) { return pr.win ? 'f-glass d-lt' : 'f-white d-lt'; });
  };
  D.skinPt = skinPt;

  /* ---------- architectural floor plan ---------- */
  D.planArch = function (sh, R, map, o) {
    o = o || {};
    var M = R.M, X = function (x) { return map.x(x); }, Y = function (z) { return map.y(z); }, k = map.k, g = M.geo, light = !!o.light;
    var wc = light ? 'f-poche d-md' : 'f-poche d-cut', thin = light ? 'd-xl' : 'd-lt';
    function band(x0, z0, x1, z1, cls) { sh.rect(X(x0), Y(z0), (x1 - x0) * k, (z1 - z0) * k, cls || wc); }
    var oo = -(g.zip + g.siding), ii = 0.5;
    // exterior walls broken at openings
    var ext = { N: { a: 'x', lo: oo, hi: ii, u0: oo, u1: 32 - oo }, S: { a: 'x', lo: 24 - ii, hi: 24 - oo, u0: oo, u1: 32 - oo }, W: { a: 'z', lo: oo, hi: ii, u0: ii, u1: 24 - ii }, E: { a: 'z', lo: 32 - ii, hi: 32 - oo, u0: ii, u1: 24 - ii } };
    Object.keys(ext).forEach(function (w) {
      // a clerestory over a door is above the plan cut, so the wall reads solid there
      var e = ext[w], ops = R.ops[w].filter(function (op) { return !op.over; }).map(function (op) { return [op.u0, op.u1, op]; }).sort(function (a, b) { return a[0] - b[0]; }), a = e.u0;
      function seg(u0, u1) { if (u1 - u0 < 0.01) return; if (e.a === 'x') band(u0, e.lo, u1, e.hi); else band(e.lo, u0, e.hi, u1); }
      ops.forEach(function (op) { seg(a, op[0]); a = op[1]; });
      seg(a, e.u1);
      // openings
      ops.forEach(function (op) {
        var u0 = op[0], u1 = op[1], mid = (e.lo + e.hi) / 2, d = op[2];
        if (d.door) {
          var hingeAt = e.a === 'z' ? u1 : u1;
          if (e.a === 'z') { var xin = e.hi, len = u1 - u0; sh.line(X(xin), Y(u1), X(xin + len), Y(u1), 'd-md'); sh.path('M' + D.r1(X(xin + len)) + ' ' + D.r1(Y(u1)) + ' A' + D.r1(len * k) + ' ' + D.r1(len * k) + ' 0 0 0 ' + D.r1(X(xin)) + ' ' + D.r1(Y(u0)), thin); }
          return;
        }
        if (e.a === 'x') { [e.lo, e.hi].forEach(function (z) { sh.line(X(u0), Y(z), X(u1), Y(z), thin); }); sh.line(X(u0), Y(mid - 0.04), X(u1), Y(mid - 0.04), 'd-md'); sh.line(X(u0), Y(mid + 0.04), X(u1), Y(mid + 0.04), 'd-md'); }
        else { [e.lo, e.hi].forEach(function (x) { sh.line(X(x), Y(u0), X(x), Y(u1), thin); }); sh.line(X(mid - 0.04), Y(u0), X(mid - 0.04), Y(u1), 'd-md'); sh.line(X(mid + 0.04), Y(u0), X(mid + 0.04), Y(u1), 'd-md'); }
      });
    });
    // partitions
    M.partitions.forEach(function (p) {
      var t2 = p.t / 2 + g.dw;
      if (p.axis === 'z') {
        var cuts = (p.doors || []).map(function (d) { return d.u; }).sort(function (a, b) { return a[0] - b[0]; }), a = 0.5;
        cuts.forEach(function (c) { band(p.c - t2, a, p.c + t2, c[0]); a = c[1]; }); band(p.c - t2, a, p.c + t2, 23.5);
        (p.doors || []).forEach(function (d) {
          sh.rect(X(21.66), Y(d.u[0] - 0.12), 0.1 * k, (d.u[1] - d.u[0] + 0.24) * k, 'f-white d-md');
          var len = d.u[1] - d.u[0]; sh.line(X(21.45), Y(d.u[1] + 0.2), X(21.45), Y(d.u[1] + len * 0.8), thin, ' marker-end="none"');
          sh.poly([[X(21.45), Y(d.u[1] + len * 0.85)], [X(21.38), Y(d.u[1] + len * 0.72)], [X(21.52), Y(d.u[1] + len * 0.72)]], 'f-dark');
        });
      } else band(22.1875, p.c - t2, 31.5, p.c + t2);
    });
    // fixtures and furniture
    if (!o.noFix) M.fixtures.forEach(function (f) {
      if (!ENG.when(f.when, R.o)) return;
      if (f.n === 'Duct soffit') return; // overhead, above the plan cut
      if (o.xmax !== undefined && f.b && f.b[0] > o.xmax) return; // a partial plan: skip what is off the drawing (its labels would escape the clip)
      var furn = f.it === 'INT-FURN';
      if (furn && o.noFurn) return;
      if (/Pillow|Jacket|Monitor|Shower glass|Mirror|Fire window|Bunk bedding|Loft|Gear bin/.test(f.n)) return;
      var cls = furn ? 'd-xl' : thin;
      if (f.cyl) { sh.circle(X(f.cyl[0]), Y(f.cyl[2]), f.cyl[3] * k, cls); return; }
      var b = f.b;
      if (f.n === 'Toilet bowl') { sh.add('<ellipse class="' + thin + '" cx="' + D.r1(X(b[0] + b[3] / 2)) + '" cy="' + D.r1(Y(b[2] + b[5] / 2)) + '" rx="' + D.r1(b[3] / 2 * k) + '" ry="' + D.r1(b[5] / 2 * k) + '"/>'); return; }
      sh.rect(X(b[0]), Y(b[2]), b[3] * k, b[5] * k, (furn ? 'd-xl' : 'f-white ' + thin));
      if (f.n === 'Shower pan') { sh.line(X(b[0]), Y(b[2]), X(b[0] + b[3]), Y(b[2] + b[5]), 'd-xl'); sh.line(X(b[0] + b[3]), Y(b[2]), X(b[0]), Y(b[2] + b[5]), 'd-xl'); sh.circle(X(b[0] + b[3] / 2), Y(b[2] + b[5] / 2), 0.2 * k, thin); }
      var lab = { 'Refrigerator': 'REF', 'Washer-dryer combo': 'W/D', 'Tankless water heater': 'WH-1', 'Propane wall furnace': 'F-1', 'Base cabinets': '' }[f.n];
      // the water heater sits over the manifold on the east wall: label it to the left so the two don't collide
      if (lab === 'WH-1') sh.text(X(b[0]) - 8, Y(b[2] + b[5] / 2) + 4, lab, 'ts halo', 'end');
      else if (lab) sh.text(X(b[0] + b[3] / 2), Y(b[2] + b[5] / 2) + 4, lab, 'ts', 'middle');
      if (f.n === 'Sink and faucet') sh.rect(X(b[0] + 0.15), Y(b[2] + 0.15), (b[3] - 0.3) * k, (b[5] - 0.3) * k, thin, ' rx="6"');
      if (f.n === '2-burner cooktop') { sh.circle(X(14.3), Y(1.5), 0.4 * k, thin); sh.circle(X(15.3), Y(1.5), 0.4 * k, thin); }
    });
    var ws = M.fixtures.filter(function (f) { return f.it === 'MEC-STOVE'; })[0];
    if (R.o.heat !== 'propane' && ws && !o.noFix && !(o.xmax !== undefined && ws.b[0] > o.xmax)) {
      var sx = ws.b[0] + ws.b[3] / 2, sz = ws.b[2] + ws.b[5] / 2;
      sh.circle(X(sx), Y(sz), 0.9 * k, 'f-white d-md'); sh.circle(X(sx), Y(sz), 0.33 * k, 'd-md'); sh.text(X(sx), Y(sz + 1.8), 'WS-1', 'ts', 'middle');
    }
    if (R.o.loft && !o.noFix && o.xmax === undefined) {
      var st = M.stair; sh.circle(X(st.c[0]), Y(st.c[1]), st.r * k, 'f-white ' + thin); sh.circle(X(st.c[0]), Y(st.c[1]), 0.15 * k, thin);
      for (var i = 0; i < 12; i++) { var a = -i * 27.7 * Math.PI / 180; sh.line(X(st.c[0]), Y(st.c[1]), X(st.c[0] + Math.cos(a) * st.r), Y(st.c[1] + Math.sin(a) * st.r), 'd-xl'); }
      sh.text(X(st.c[0]), Y(st.c[1] + st.r + 0.6), 'SPIRAL STAIR UP, 13 R', 'ts', 'middle');
      if (!light) { sh.rect(X(22.0), Y(2.4), 9.54 * k, 21.14 * k, 'd-hid'); sh.text(X(26.8), Y(22.9), 'LOFT ABOVE (STORAGE)', 'ts', 'middle'); }
    }
    // porch and steps
    var PO = R.porch || M.porch, pd = PO.deck, ps = PO.steps, pn = ps.risers - 1, pcx = pd[0] + pd[3] / 2, pcz = pd[2] + pd[4] / 2;
    sh.rect(X(pd[0]), Y(pd[2]), pd[3] * k, pd[4] * k, thin);
    sh.rect(X(ps.x - pn * ps.tread), Y(ps.z[0]), pn * ps.tread * k, (ps.z[1] - ps.z[0]) * k, thin);
    for (var si = 1; si < pn; si++) sh.line(X(ps.x - si * ps.tread), Y(ps.z[0]), X(ps.x - si * ps.tread), Y(ps.z[1]), 'd-xl');
    if (PO.big) { var rk = PO.rack, rx0 = o.xmin !== undefined ? Math.max(rk[0], o.xmin) : rk[0]; if (rk[0] + rk[2] > rx0) sh.rect(X(rx0), Y(rk[1]), (rk[0] + rk[2] - rx0) * k, rk[4] * k, 'd-xl'); }
    if (!light) {
      if (PO.roofY) sh.rect(X(pd[0] - 0.6), Y(pd[2] - 0.6), (pd[3] + 0.6) * k, (pd[4] + 1.2) * k, 'd-hid');
      sh.text(X(pcx - (PO.big ? 1.4 : 0)), Y(pcz + 1.2), PO.big ? 'ENTRY DECK' : 'PORCH', 'ts', 'middle'); sh.text(X(pcx - (PO.big ? 1.4 : 0)), Y(pcz + 1.7) + 6, PO.big ? 'MAIN ROOF ABOVE' : 'ROOF ABOVE', 'ts', 'middle');
    }
  };

  D.roomTags = function (sh, R, map) {
    R.M.rooms.forEach(function (r) {
      var cx = (r.b[0] + r.b[1]) / 2, cz = (r.b[2] + r.b[3]) / 2, a = Math.round((r.b[1] - r.b[0]) * (r.b[3] - r.b[2]));
      var pos = { living: [11, 10.4], br1: [27.2, 7.9], bath: [25.6, 14.4], br2: [25.3, 18.0] }[r.id] || [cx, cz];
      sh.text(map.x(pos[0]), map.y(pos[1]), r.name.toUpperCase(), 'tc tm', 'middle');
      sh.text(map.x(pos[0]), map.y(pos[1]) + 16, a + ' SF · CLG ' + (r.ceil === 'vault' ? '9′-2″ TO 16′-10″' : '9′-0″'), 'ts', 'middle');
    });
  };
})(DWG);
