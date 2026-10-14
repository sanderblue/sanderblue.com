/* Rime Cabin 3D: turns the engine's part list into three.js meshes.
   Repeated parts share one instanced mesh per item and material, so 1,400 parts draw in about 200 calls. */
var SCN = (function () {
  function P(X, Z) { return [X - 16, Z - 12]; }

  function makeTextures(T) {
    var out = {};
    if (typeof document === 'undefined') return out;
    function tex(w, h, draw) {
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      draw(c.getContext('2d'), w, h);
      var t = new T.CanvasTexture(c);
      t.wrapS = t.wrapT = T.RepeatWrapping; t.encoding = T.sRGBEncoding; t.anisotropy = 4;
      return t;
    }
    out.siding = tex(64, 64, function (g, w, h) {
      g.fillStyle = '#3c4955'; g.fillRect(0, 0, w, h); g.fillStyle = '#2f3a44'; g.fillRect(0, 0, 5, h); g.fillStyle = '#4a5966'; g.fillRect(5, 0, 1, h);
    });
    out.siding.repeat.set(1 / 1.333, 1 / 4);
    out.seam = tex(64, 16, function (g, w, h) {
      g.fillStyle = '#2a3036'; g.fillRect(0, 0, w, h); g.fillStyle = '#171b1f'; g.fillRect(0, 0, 3, h); g.fillStyle = '#3b434b'; g.fillRect(3, 0, 1, h);
    });
    out.pine = tex(64, 16, function (g, w, h) {
      g.fillStyle = '#d9b98a'; g.fillRect(0, 0, w, h); g.fillStyle = '#b8935f'; g.fillRect(0, 0, 2, h); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(2, 0, 10, h);
    });
    out.floor = tex(128, 128, function (g, w, h) {
      g.fillStyle = '#c9a97c'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#c2a074' : '#cfb083'; g.fillRect(0, i * 16, w, 15); g.fillStyle = '#a98a60'; g.fillRect(0, i * 16 + 15, w, 1); }
    });
    out.grass = tex(256, 256, function (g, w, h) {
      // mountain meadow: olive grass with darker clumps and dry tan patches
      var r = rng(11), cols = ['#55623a', '#6a7546', '#5c6a3a', '#7a7a52', '#606d3e'];
      g.fillStyle = '#5f6b3d'; g.fillRect(0, 0, w, h);
      for (var j = 0; j < 40; j++) { g.fillStyle = cols[j % 5]; g.globalAlpha = 0.25; g.beginPath(); g.arc(r() * w, r() * h, 10 + r() * 24, 0, Math.PI * 2); g.fill(); }
      for (var i = 0; i < 3000; i++) { var s = 1 + r() * 2; g.fillStyle = cols[i % 5]; g.globalAlpha = 0.25 + r() * 0.3; g.fillRect(r() * w, r() * h, s, s * (1 + r() * 2)); }
      g.globalAlpha = 1;
    });
    out.grass.repeat.set(1 / 24, 1 / 24);
    return out;
  }

  var COLORS = {
    conc: 0xa9adb0, rebar: 0x9a5530, galv: [0xb8bec4, 0.4, 0.6], pt: 0x8f9a6b, xps: 0x8fc1e3, vb: [0x3a4148, 0.9], pvc: 0xe8e8e6,
    steel: [0xb9c0c6, 0.4, 0.6], steelDark: [0x2a2f34, 0.5, 0.5], sidingPlain: 0x3c4955, lvl: 0xc99a5b, ijoist: 0xcfa66b, osb: 0xbf9558,
    cell: 0x9a9890, ply: 0xcca674, spf: 0xd4ad74, lsl: 0xbb8d52, zip: 0x3f7d4f, wool: 0xd8c9a3, memb: 0x8db7d6, iw: 0x2b2e33, syn: 0x8e959c,
    dark: 0x1d2227, cedar: 0xb07a4a, drywall: 0xf1eee8, wood: 0xc08a55, white: 0xf6f4ef, fab: 0x56677a, fab2: 0xb4572f, black: 0x15181b,
    rug: 0x8a9aa8, tank: [0xdfe3e6, 0.5, 0.3], gravel: 0xbdb6aa, mound: 0xd9e1e7, pv: [0x1b2a44, 0.35, 0.3], frame: 0x20262b,
    pexBlue: 0x2b7bb9, pexRed: 0xd1495b, dwv: 0x5d646b, gas: 0xe8c22a, gasPE: 0xe8c22a, lamp: 0xfff1cc
  };

  function makeMats(T, tx) {
    function m(c, o) { o = o || {}; o.color = c; if (o.roughness === undefined) o.roughness = 0.85; o.metalness = o.metalness || 0; return new T.MeshStandardMaterial(o); }
    var M = {};
    Object.keys(COLORS).forEach(function (k) { var c = COLORS[k]; M[k] = Array.isArray(c) ? m(c[0], { roughness: c[1], metalness: c[2] || 0 }) : m(c); });
    M.siding = m(0xffffff, { map: tx.siding || null }); if (!tx.siding) M.siding.color.setHex(0x3c4955);
    M.seam = m(0xffffff, { map: tx.seam || null, roughness: 0.55, metalness: 0.35 }); if (!tx.seam) M.seam.color.setHex(0x2a3036);
    M.roofTop = M.seam;
    M.pine = m(0xffffff, { map: tx.pine || null }); if (!tx.pine) M.pine.color.setHex(0xd9b98a);
    M.floor = m(0xffffff, { map: tx.floor || null }); if (!tx.floor) M.floor.color.setHex(0xc9a97c);
    M.glass = new T.MeshStandardMaterial({ color: 0xa6cfe6, transparent: true, opacity: 0.32, roughness: 0.05, metalness: 0.1, depthWrite: false, side: T.DoubleSide });
    M.fire = new T.MeshBasicMaterial({ color: 0xff9a3c });
    M.lamp.emissive = new T.Color(0xffe2a0); M.lamp.emissiveIntensity = 0.6;
    M.memb.transparent = true; M.memb.opacity = 0.35; M.memb.depthWrite = false;
    M.cell.transparent = true; M.cell.opacity = 0.85;
    M.wool.transparent = true; M.wool.opacity = 0.9;
    M.snow = m(0xf4f8fb, { roughness: 1 }); M.ground = m(0xe6edf3, { roughness: 1 });
    return M;
  }

  var BOX = null, CYL = null;
  var SIDE = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] };

  // local wall coordinates (u along the wall, v height, w into the wall) to world
  function wallMatrix(T, axis, face, dir) {
    var m = new T.Matrix4();
    if (axis === 'x') m.set(1, 0, 0, -16, 0, 1, 0, 0, 0, 0, dir, face - 12, 0, 0, 0, 1);
    else m.set(0, 0, dir, face - 16, 0, 1, 0, 0, 1, 0, 0, -12, 0, 0, 0, 1);
    return m;
  }

  function matFor(T, MAT, p, R) {
    if (p.it === 'ELE-WIRE') return new T.MeshStandardMaterial({ color: new T.Color(p.color), roughness: 0.6 });
    var key = p.m || (R.cat[p.it] && R.cat[p.it].m) || 'white';
    return (MAT[key] || MAT.white).clone();
  }

  function build(T, R, MAT, opts) {
    BOX = BOX || new T.BoxGeometry(1, 1, 1); CYL = CYL || new T.CylinderGeometry(1, 1, 1, 14);
    var root = new T.Group(), meshes = [], batches = {};
    var q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(), pos = new T.Vector3(), mtx = new T.Matrix4(), up = new T.Vector3(0, 1, 0), dir = new T.Vector3();
    function tag(obj, p) {
      obj.userData.L = p.L; obj.userData.ex = p.ex || 0; obj.userData.roofy = !!p.roofy; obj.userData.it = p.it; obj.userData.gar = /^GAR-/.test(p.it) || !!p.gar;
      var sd = SIDE[p.side], o = p.out || 0; obj.userData.ox = sd ? sd[0] * o : 0; obj.userData.oz = sd ? sd[1] * o : 0;
      return obj;
    }
    function heavy(p) { return !/^(ELE-WIRE|PLB-|MEC-CSST|ROF-TIE|FLR-HANGER|FND-REBAR)/.test(p.it); }
    R.parts.forEach(function (p) {
      if (p.k === 'marker') return;
      if (p.k === 'skin') {
        var sh = new T.Shape();
        p.outline.forEach(function (pt, i) { if (i) sh.lineTo(pt[0], pt[1]); else sh.moveTo(pt[0], pt[1]); });
        p.holes.forEach(function (h) { var hp = new T.Path(); hp.moveTo(h[0], h[1]); hp.lineTo(h[2], h[1]); hp.lineTo(h[2], h[3]); hp.lineTo(h[0], h[3]); hp.lineTo(h[0], h[1]); sh.holes.push(hp); });
        var gg = new T.ExtrudeGeometry(sh, { depth: Math.abs(p.d1 - p.d0), bevelEnabled: false });
        gg.translate(0, 0, Math.min(p.d0, p.d1));
        var mm = new T.Mesh(gg, matFor(T, MAT, p, R));
        mm.matrixAutoUpdate = false; mm.matrix.copy(wallMatrix(T, p.axis, p.face, p.dir));
        mm.castShadow = mm.receiveShadow = true; mm.userData.part = p;
        var grp = tag(new T.Group(), p); grp.add(mm); root.add(grp); meshes.push(grp);
        return;
      }
      if (p.k === 'win') {
        var wg = new T.Group(), inner = new T.Group(), th = p.d1 - p.d0, f = 0.14, w = p.u1 - p.u0, h = p.v1 - p.v0, zc = p.d0 + th / 2;
        inner.matrixAutoUpdate = false; inner.matrix.copy(wallMatrix(T, p.axis, p.face, p.dir));
        var fm = MAT.frame.clone();
        function bar(x, y, bw, bh, mat) { var b = new T.Mesh(BOX, mat || fm); b.scale.set(bw, bh, th); b.position.set(x, y, zc); b.castShadow = true; b.userData.part = p; inner.add(b); }
        if (p.ohd) {
          // overhead garage door: dark flush steel sections
          var dm = MAT.black.clone(), gm = MAT.sidingPlain.clone(); bar(p.u0 + w / 2, p.v0 + h / 2, w - 0.1, h - 0.05, dm);
          for (var sI = 1; sI < 4; sI++) bar(p.u0 + w / 2, p.v0 + h * sI / 4, w - 0.1, 0.05, gm);
        } else if (p.door) {
          bar(p.u0 + w / 2, p.v0 + h / 2, w - 0.1, h - 0.05, p.solid ? MAT.black.clone() : MAT.cedar.clone());
          if (!p.solid) { var lite = new T.Mesh(BOX, MAT.glass); lite.scale.set(w * 0.35, h * 0.5, th + 0.02); lite.position.set(p.u0 + w / 2, p.v0 + h * 0.62, zc); lite.userData.part = p; inner.add(lite); }
        } else {
          bar(p.u0 + w / 2, p.v0 + f / 2, w, f); bar(p.u0 + w / 2, p.v1 - f / 2, w, f); bar(p.u0 + f / 2, p.v0 + h / 2, f, h); bar(p.u1 - f / 2, p.v0 + h / 2, f, h);
          if (p.mid) bar(p.u0 + w / 2, p.v0 + h / 2, f * 0.6, h - f);
          var pane = new T.Mesh(new T.PlaneGeometry(w - 2 * f, h - 2 * f), MAT.glass); pane.position.set(p.u0 + w / 2, p.v0 + h / 2, zc); pane.userData.part = p; inner.add(pane);
        }
        var wgp = tag(wg, p); wgp.add(inner); root.add(wgp); meshes.push(wgp);
        return;
      }
      var solo = p.solo || p.glow || (p.it === 'INT-FLOOR');
      if (solo) {
        var mat = p.glow ? MAT.fire : matFor(T, MAT, p, R);
        if (p.it === 'INT-FLOOR') { mat = MAT.floor.clone(); mat.map = MAT.floor.map ? MAT.floor.map.clone() : null; if (mat.map) { mat.map.needsUpdate = true; mat.map.repeat.set(p.s[0] / 5, p.s[2] / 5); } }
        if (p.tex && MAT[p.tex] && MAT[p.tex].map) { mat = MAT[p.tex].clone(); mat.map = MAT[p.tex].map.clone(); mat.map.needsUpdate = true; mat.map.repeat.set(p.rep[0], p.rep[1]); }
        var sm = new T.Mesh(p.k === 'cyl' ? CYL : BOX, mat);
        place(sm, p); sm.castShadow = sm.receiveShadow = true; sm.userData.part = p;
        var sg = tag(new T.Group(), p); sg.add(sm); root.add(sg); meshes.push(sg);
        return;
      }
      var key = [p.L, p.ex, p.side || '', p.roofy ? 1 : 0, p.it, p.m || '', p.k === 'seg' ? 'cyl' : p.k, p.color || '', p.out || 0].join('|');
      (batches[key] = batches[key] || []).push(p);
    });
    function place(obj, p) {
      if (p.k === 'box') {
        var c = P(p.c[0], p.c[2]); obj.position.set(c[0], p.c[1], c[1]); obj.scale.set(p.s[0], p.s[1], p.s[2]);
        obj.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
      } else if (p.k === 'cyl') {
        var cc = P(p.c[0], p.c[2]); obj.position.set(cc[0], p.c[1], cc[1]); obj.scale.set(p.r, p.h, p.r); obj.rotation.set(p.rx || 0, 0, p.rz || 0);
      }
    }
    Object.keys(batches).forEach(function (k) {
      var list = batches[k], p0 = list[0], geo = p0.k === 'box' ? BOX : CYL;
      var im = new T.InstancedMesh(geo, matFor(T, MAT, p0, R), list.length);
      list.forEach(function (p, i) {
        if (p.k === 'box') {
          var c = P(p.c[0], p.c[2]); pos.set(c[0], p.c[1], c[1]); e.set(p.rx || 0, p.ry || 0, p.rz || 0); q.setFromEuler(e); s.set(p.s[0], p.s[1], p.s[2]);
        } else if (p.k === 'cyl') {
          var cc = P(p.c[0], p.c[2]); pos.set(cc[0], p.c[1], cc[1]); e.set(p.rx || 0, 0, p.rz || 0); q.setFromEuler(e); s.set(p.r, p.h, p.r);
        } else {
          var a = P(p.a[0], p.a[2]), b = P(p.b[0], p.b[2]);
          dir.set(b[0] - a[0], p.b[1] - p.a[1], b[1] - a[1]); var L = dir.length() || 0.001; dir.multiplyScalar(1 / L);
          q.setFromUnitVectors(up, dir); pos.set((a[0] + b[0]) / 2, (p.a[1] + p.b[1]) / 2, (a[1] + b[1]) / 2); s.set(p.r, L + p.r * 0.6, p.r);
        }
        mtx.compose(pos, q, s); im.setMatrixAt(i, mtx);
      });
      im.instanceMatrix.needsUpdate = true;
      im.castShadow = heavy(p0); im.receiveShadow = true;
      im.userData.parts = list; im.frustumCulled = false;
      var g = tag(new T.Group(), p0); g.add(im); root.add(g); meshes.push(g);
    });
    return { root: root, groups: meshes };
  }

  /* ---------- landscape, snow, room tints ---------- */
  function rng(seed) { return function () { seed = (seed + 0x6D2B79F5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function landscape(T, MAT, R) {
    var L = new T.Group(), trees = new T.Group(), Rn = rng(7), caps = [], peaks = [];
    var sh = new T.Shape(); sh.absarc(0, 0, 520, 0, Math.PI * 2, false);
    if (R.o.found === 'crawl') { var hp = new T.Path(); hp.moveTo(-15.33, -11.33); hp.lineTo(-15.33, 11.33); hp.lineTo(15.33, 11.33); hp.lineTo(15.33, -11.33); sh.holes.push(hp); /* hole wound clockwise, no repeated point */ }
    var ground = new T.Mesh(new T.ShapeGeometry(sh, 48), MAT.ground); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; L.add(ground);
    if (R.o.found === 'crawl') {
      // crawl pit: an open box seen from inside (floor and four walls), so a section cut never shows a gap under the ground
      var pm = new T.MeshStandardMaterial({ color: 0x6b5a48, roughness: 1, side: T.BackSide }); // dug soil, any season
      var pit = new T.Mesh(new T.BoxGeometry(30.66, 1.02, 22.66), pm); pit.position.y = -0.51; pit.receiveShadow = true; L.add(pit);
    }
    var trunk = new T.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 1 }), needle = [0x1f3d34, 0x2a4a3d, 0x193329].map(function (c) { return new T.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true }); });
    for (var i = 0; i < 70; i++) {
      var a = Rn() * Math.PI * 2, d = 38 + Rn() * 130, x = Math.cos(a) * d, z = Math.sin(a) * d * 0.8;
      var h = 12 + Rn() * 14;
      if (Math.abs(x) < 36 && z > -24 && z < 40) continue;
      if (z > 12 && Math.hypot(x - 40, z - 56) < 75) continue;
      if (x > -68 && x < -10 && z > -36 && z < 12) continue; // garage, its parking apron and its snow pile
      if (x > 0 && x < 52 && z > -64 && z < -20) continue; // keep the view from the northeast open
      var sx = x + 46, sz = z + 58, tt = Math.max(0, Math.min(1, (sx * 40 + sz * 50) / (40 * 40 + 50 * 50)));
      if (Math.hypot(sx - 40 * tt, sz - 50 * tt) < 16) continue;
      if (Math.abs(z + 9) < 9 && x < -30) continue; // the driveway
      if (x > -100 && x < -40 && z > 20 && z < 70) z += 100; // keep the view to the southwest open: these trees stand 100 ft further south
      var g = new T.Group(), tr = new T.Mesh(new T.CylinderGeometry(0.4, 0.55, 3, 6), trunk); tr.position.y = 1.5; g.add(tr);
      for (var k = 0; k < 3; k++) {
        var cone = new T.Mesh(new T.ConeGeometry(4.2 - k * 1.1, h * (0.5 - k * 0.08), 7), needle[i % 3]);
        cone.position.y = 3 + k * h * 0.2 + h * 0.2; cone.castShadow = true; g.add(cone);
        var cap = new T.Mesh(new T.ConeGeometry(2.6 - k * 0.8, h * 0.2, 7), MAT.snow); cap.position.y = cone.position.y + h * 0.15; g.add(cap); caps.push(cap);
      }
      g.position.set(x, 0, z); trees.add(g);
    }
    L.add(trees);
    var rock = new T.MeshStandardMaterial({ color: 0x8b9db0, roughness: 1, flatShading: true });
    for (var j = 0; j < 14; j++) {
      var aa = -Math.PI * 0.95 + j * (Math.PI * 1.9 / 13), dd = 330 + Rn() * 120, hh = 90 + Rn() * 130;
      var mt = new T.Mesh(new T.ConeGeometry(70 + Rn() * 60, hh, 6), rock); mt.position.set(Math.cos(aa) * dd, hh / 2, Math.sin(aa) * dd - 60); L.add(mt);
      var mc = new T.Mesh(new T.ConeGeometry((70 + Rn() * 10) * 0.42, hh * 0.38, 6), MAT.snow); mc.position.set(mt.position.x, hh * 0.82, mt.position.z); L.add(mc);
      mc.userData.tip = hh * 1.01; mc.userData.h = hh * 0.38; peaks.push(mc);
    }
    return { land: L, trees: trees, caps: caps, peaks: peaks, rock: rock };
  }

  // winter: snow on the ground, the trees and the peaks. summer: meadow grass, bare trees, a little snow left up high.
  function season(T, MAT, tx, land, built, s) {
    var sum = s === 'summer', gm = MAT.ground, map = sum && tx.grass ? tx.grass : null;
    if (gm.map !== map) { gm.map = map; gm.needsUpdate = true; }
    gm.color.setHex(sum ? (map ? 0xffffff : 0x5f6b3d) : 0xe6edf3);
    land.rock.color.setHex(sum ? 0x2e403d : 0x8b9db0); // forested slopes in summer
    land.caps.forEach(function (c) { c.visible = !sum; });
    land.peaks.forEach(function (c) { var k = sum ? 0.4 : 1; c.scale.setScalar(k); c.position.y = c.userData.tip - c.userData.h * k / 2; });
    built.groups.forEach(function (g) {
      if (g.userData.it === 'SITE-SEPTIC') g.traverse(function (o) { if (o.material) o.material.color.setHex(sum ? 0x2f3d16 : 0xd9e1e7); });
    });
  }

  function snow(T, MAT, R) {
    // roof snow: one blanket per roof piece, all in the same plane. Snow rails above the north eave hold it on the
    // roof, so there are no slide piles on the ground.
    var G = R.G, g = R.M.geo, S = new T.Group(), roofSnow = new T.Group(), t = 1.2, off = G.stackT + 0.03 + t / 2, GR = R.garage, J = G.roofJoin;
    function slab(x0, x1, z0, z1, gar) {
      var zm = (z0 + z1) / 2, m = new T.Mesh(new T.BoxGeometry(x1 - x0, t, (z1 - z0) / ENG.COS - 0.6), MAT.snow);
      m.position.set((x0 + x1) / 2 - 16, G.rb(zm) + off * ENG.COS, zm - 12 - off * ENG.SIN); m.rotation.x = -ENG.TH; m.castShadow = true; m.receiveShadow = true;
      if (gar) m.userData.gar = true; roofSnow.add(m);
    }
    var Z0 = G.Z0, Z1 = 24 + g.eaveS, hx0 = J ? J.x : -g.rake + 0.5;
    slab(hx0, 32 + g.rake - 0.5, Z0, Z1);
    if (J && J.z1 < Z1 - 0.01) slab(-g.rake + 0.5, J.x, J.z1, Z1);
    if (GR) {
      slab(GR.X0 - g.rake + 0.5, J ? J.x : GR.XH, GR.RZ0, GR.RZ1, true);
      if (!GR.cover) slab(J ? J.x : GR.XH, GR.X1 + g.rake - 0.5, GR.RZ0, -g.eaveN, true);
    }
    return { ground: S, roof: roofSnow };
  }

  function tints(T, R) {
    var list = [], FF = R.G.FF;
    R.M.rooms.forEach(function (r) {
      var w = r.b[1] - r.b[0], d = r.b[3] - r.b[2];
      var m = new T.Mesh(new T.PlaneGeometry(w, d), new T.MeshBasicMaterial({ color: 0xe0883a, transparent: true, opacity: 0, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; var c = P((r.b[0] + r.b[1]) / 2, (r.b[2] + r.b[3]) / 2); m.position.set(c[0], FF + 0.06, c[1]);
      m.userData.room = r.id; list.push(m);
    });
    return list;
  }

  return { P: P, makeTextures: makeTextures, makeMats: makeMats, build: build, landscape: landscape, season: season, snow: snow, tints: tints };
})();
