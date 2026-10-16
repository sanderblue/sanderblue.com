/* Rime Cabin realistic view. Off by default: startViewer creates it the first time the Realistic switch is
   turned on, and the plain view never touches it. It adds sky light and reflections, photo-scanned textures,
   shaped terrain and peaks, conifers and aspens, summer grass and flowers, shaped winter snow, and a post pass
   for ambient occlusion and filmic tone. Textures load from assets/textures/ next to the page; until they
   arrive, and if they never do, the same surfaces show in plain colors. */
var REAL = (function () {
  var BASE = 'assets/textures/';

  /* ---------- small helpers ---------- */
  function rng(seed) { return function () { seed = (seed + 0x6D2B79F5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function sstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  // the value at lattice point x, y (integers); neighboring samples share lattice points, so a small cache of the
  // last values seen saves most of the sines, and returns exactly what the sine would
  var HC = 16384, hcX = new Int32Array(HC).fill(-2147483648), hcY = new Int32Array(HC), hcV = new Float64Array(HC);
  function hash(x, y) {
    var s = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) & (HC - 1);
    if (hcX[s] === x && hcY[s] === y) return hcV[s];
    var h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123; h -= Math.floor(h);
    hcX[s] = x; hcY[s] = y; hcV[s] = h; return h;
  }
  function noise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * xf * (xf * (xf * 6 - 15) + 10), v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    var a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
  }
  function fbm(x, y, oct) { var s = 0, a = 0.5, f = 1, n = 0; for (var i = 0; i < oct; i++) { s += a * noise(x * f + i * 13.7, y * f - i * 7.3); n += a; a *= 0.5; f *= 2.03; } return s / n; }
  function ridged(x, y, oct) {
    var s = 0, a = 0.5, f = 1, w = 1, n = 0;
    for (var i = 0; i < oct; i++) { var r = 1 - Math.abs(noise(x * f + i * 17.3, y * f - i * 9.1)); r *= r * w; s += r * a; w = clamp(r * 1.8, 0, 1); n += a; a *= 0.5; f *= 2.1; }
    return s / n;
  }

  // Merge indexed geometries that all have position, normal and uv (and the same extra attributes).
  function merge(T, list) {
    var names = Object.keys(list[0].attributes), arrays = {}, idx = [], off = 0;
    names.forEach(function (n) { arrays[n] = []; });
    list.forEach(function (g) {
      if (!g.index) withIndex(g);
      names.forEach(function (n) { var a = g.attributes[n].array; for (var i = 0; i < a.length; i++) arrays[n].push(a[i]); });
      var ix = g.index.array; for (var i = 0; i < ix.length; i++) idx.push(ix[i] + off);
      off += g.attributes.position.count;
    });
    var out = new T.BufferGeometry();
    names.forEach(function (n) { out.setAttribute(n, new T.Float32BufferAttribute(arrays[n], list[0].attributes[n].itemSize)); });
    out.setIndex(idx);
    return out;
  }
  function withIndex(g) { var n = g.attributes.position.count, ix = []; for (var i = 0; i < n; i++) ix.push(i); g.setIndex(ix); return g; }

  // Inject GLSL into a built-in material. edits: [[chunk, text]]. A text starting with $ is added after the
  // chunk (several on one chunk keep their order); any other text replaces the chunk.
  function edit(src, edits) {
    var add = {}, order = [];
    (edits || []).forEach(function (e) {
      if (e[1].charAt(0) === '$') { if (!add[e[0]]) { add[e[0]] = []; order.push(e[0]); } add[e[0]].push(e[1].slice(1)); }
      else src = src.replace(e[0], e[1]);
    });
    order.forEach(function (k) { src = src.replace(k, k + add[k].join('')); });
    return src;
  }
  function patch(m, key, uniforms, vtx, frag) {
    m.onBeforeCompile = function (sh) {
      Object.keys(uniforms || {}).forEach(function (k) { sh.uniforms[k] = uniforms[k]; });
      sh.vertexShader = edit(sh.vertexShader, vtx); sh.fragmentShader = edit(sh.fragmentShader, frag);
    };
    m.customProgramCacheKey = function () { return 'real-' + key; };
    m.needsUpdate = true;
    return m;
  }
  // world position and normal, counting instancing, for the shaders below
  var WORLD_V = ['#include <common>', '$\nvarying vec3 vRW;\nvarying vec3 vRN;'];
  var WORLD_V2 = ['#include <project_vertex>', '$\n{ vec4 rw = vec4( transformed, 1.0 ); vec3 rn = objectNormal;\n#ifdef USE_INSTANCING\nrw = instanceMatrix * rw; rn = mat3( instanceMatrix ) * rn;\n#endif\nvRW = ( modelMatrix * rw ).xyz; vRN = normalize( mat3( modelMatrix ) * rn ); }'];
  var WORLD_F = ['#include <common>', '$\nvarying vec3 vRW;\nvarying vec3 vRN;\nfloat rHash( vec3 p ) { return fract( sin( dot( p, vec3( 12.9898, 78.233, 37.719 ) ) ) * 43758.5453 ); }\nfloat rNoise( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f ); float a = rHash( vec3( i, 0.0 ) ), b = rHash( vec3( i + vec2( 1.0, 0.0 ), 0.0 ) ), c = rHash( vec3( i + vec2( 0.0, 1.0 ), 0.0 ) ), d = rHash( vec3( i + vec2( 1.0, 1.0 ), 0.0 ) ); return mix( mix( a, b, f.x ), mix( c, d, f.x ), f.y ); }'];
  // Alpha-tested foliage thins out with distance, because lower mip levels average alpha down. This grows alpha
  // with the mip level (from the texture size and the UV derivatives) so cards keep their coverage far away.
  function cover(size) {
    return '\n#if __VERSION__ >= 300\n{ vec2 cdx = dFdx( vUv * ' + size + ' ), cdy = dFdy( vUv * ' + size + ' ); float lod = 0.5 * log2( max( max( dot( cdx, cdx ), dot( cdy, cdy ) ), 1.0 ) ); diffuseColor.a *= 1.0 + lod * 0.28; }\n#endif';
  }
  // two-sided cards and blades keep one normal on both faces, so their back faces are not lit from inside
  var NO_FLIP = ['#include <normal_fragment_begin>', ''];
  function noFlip(T) { return [NO_FLIP[0], T.ShaderChunk.normal_fragment_begin.replace('normal = normal * faceDirection;', '')]; }

  /* ---------- the site: where the buildings, roofs and plowed gravel are ---------- */
  // roof snow rectangles in plan feet, the same pieces SCN.snow uses: [x0, x1, z0, z1]
  function roofRects(R) {
    var G = R.G, g = R.M.geo, GR = R.garage, J = G.roofJoin, out = [], C = ENG.COS;
    function slab(x0, x1, z0, z1) { var zm = (z0 + z1) / 2, hz = (z1 - z0) / 2 - 0.3 * C; out.push([x0, x1, zm - hz, zm + hz]); }
    var Z0 = G.Z0, Z1 = 24 + g.eaveS, hx0 = J ? J.x : -g.rake + 0.5;
    slab(hx0, 32 + g.rake - 0.5, Z0, Z1);
    if (J && J.z1 < Z1 - 0.01) slab(-g.rake + 0.5, J.x, J.z1, Z1);
    if (GR) {
      slab(GR.X0 - g.rake + 0.5, J ? J.x : GR.XH, GR.RZ0, GR.RZ1);
      if (!GR.cover) slab(J ? J.x : GR.XH, GR.X1 + g.rake - 0.5, GR.RZ0, -g.eaveN);
    }
    return out;
  }
  function siteInfo(R) {
    var P = SCN.P, g = R.M.geo;
    function sr(X0, X1, Z0, Z1) { var a = P(X0, Z0), b = P(X1, Z1); return { x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), z0: Math.min(a[1], b[1]), z1: Math.max(a[1], b[1]) }; }
    var S = { build: [sr(0, g.W, 0, g.D)], roof: [], plow: [], hard: [] };
    if (R.garage) S.build.push(sr(R.garage.X0, R.garage.X1, R.garage.Z0, R.garage.Z1));
    roofRects(R).forEach(function (r) { var q = sr(r[0], r[1], r[2], r[3]); q.x0 -= 0.5; q.x1 += 0.5; q.z0 -= 0.5; q.z1 += 0.5; S.roof.push(q); });
    R.parts.forEach(function (p) {
      if (p.k !== 'box' || !p.s) return;
      var bot = p.c[1] - p.s[1] / 2, top = p.c[1] + p.s[1] / 2, hx = p.s[0] / 2, hz = p.s[2] / 2;
      if (p.ry) { var c = Math.abs(Math.cos(p.ry)), s = Math.abs(Math.sin(p.ry)), nx = hx * c + hz * s, nz = hx * s + hz * c; hx = nx; hz = nz; }
      var r = sr(p.c[0] - hx, p.c[0] + hx, p.c[2] - hz, p.c[2] + hz);
      if (p.it === 'SITE-SEPTIC' && p.m === 'mound') S.mound = r;
      if (p.it === 'SITE-DRIVE') S.plow.push(r);
      else if (bot < 0.8 && top > 0.02 && p.it !== 'SITE-SEPTIC' && hx * hz > 0.08) S.hard.push(r);
    });
    // a coarse map (half-foot cells) of everything grass cannot grow through
    var X0 = -180, Z0 = -170, N = 720, cell = 0.5, occ = new Uint8Array(N * N);
    function mark(r, pad, v) {
      var i0 = Math.max(0, Math.floor((r.x0 - pad - X0) / cell)), i1 = Math.min(N - 1, Math.ceil((r.x1 + pad - X0) / cell));
      var j0 = Math.max(0, Math.floor((r.z0 - pad - Z0) / cell)), j1 = Math.min(N - 1, Math.ceil((r.z1 + pad - Z0) / cell));
      for (var j = j0; j <= j1; j++) for (var i = i0; i <= i1; i++) occ[j * N + i] |= v;
    }
    S.build.forEach(function (r) { mark(r, 0.4, 1); });
    S.hard.forEach(function (r) { mark(r, 0.25, 1); });
    S.plow.forEach(function (r) { mark(r, -0.3, 2); }); // grass creeps a little over the gravel's edge
    // The leach field as a low grassy rise: about 5 in on top, easing out over 11 ft past its edge. moundRise()
    // dips just under the ground at the very edge so the rise meets the terrain with no line; moundH() is the
    // part above ground, for the grass and snow that sit on it.
    S.moundRise = function (x, z) {
      var m = S.mound; if (!m) return 0;
      var dx = Math.max(m.x0 - x, x - m.x1), dz = Math.max(m.z0 - z, z - m.z1), out = Math.hypot(Math.max(dx, 0), Math.max(dz, 0));
      var sd = out > 0 ? -out : Math.min(-dx, -dz);
      return -0.06 + 0.46 * sstep(-6, 5, sd) + 0.08 * sstep(5, 12, sd) + 0.03 * fbm(x / 9, z / 9, 2) * sstep(-2, 4, sd);
    };
    S.moundH = function (x, z) { return Math.max(0, S.moundRise(x, z)); };
    S.blocked = function (x, z) { var i = Math.floor((x - X0) / cell), j = Math.floor((z - Z0) / cell); return i < 0 || j < 0 || i >= N || j >= N ? 0 : occ[j * N + i]; };
    return S;
  }
  function outside(r, x, z) { var dx = Math.max(r.x0 - x, 0, x - r.x1), dz = Math.max(r.z0 - z, 0, z - r.z1); return Math.sqrt(dx * dx + dz * dz); }
  function nearest(list, x, z) { var best = 1e9, bi = -1; for (var i = 0; i < list.length; i++) { var d = outside(list[i], x, z); if (d < best) { best = d; bi = i; } } return { d: best, r: list[bi] }; }

  // the lot is graded flat; beyond it the ground rolls, falls to the northeast and rises toward the peaks
  var LOT = { x0: -136, x1: 124, z0: -122, z1: 108 };
  function groundH(x, z) {
    var d = outside(LOT, x, z), m = sstep(15, 110, d);
    if (m === 0) return 0;
    var r = Math.sqrt(x * x + z * z), p = (x - z) * 0.7071;
    return m * (-p * 0.06 + fbm(x / 340, z / 340, 4) * 34 + sstep(450, 1450, r) * 120 * (0.65 + 0.35 * fbm(x / 520 + 7, z / 520, 3)));
  }

  /* ---------- textures drawn in the page ---------- */
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function canvasTex(T, c, srgb, aniso) {
    var t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = aniso || 4;
    t.encoding = srgb ? T.sRGBEncoding : T.LinearEncoding; return t;
  }
  // a normal map from a height function h(u, v) over one tile, u and v in 0..1
  function normalTex(T, w, h, height, strength, aniso) {
    var c = canvas(w, h), g = c.getContext('2d'), img = g.createImageData(w, h), H = new Float32Array(w * h);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) H[y * w + x] = height(x / w, y / h);
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var l = H[y * w + (x + w - 1) % w], r = H[y * w + (x + 1) % w], u = H[((y + h - 1) % h) * w + x], d = H[((y + 1) % h) * w + x];
      var nx = (l - r) * strength, ny = (d - u) * strength, nz = 1, k = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz), o = (y * w + x) * 4;
      img.data[o] = (nx * k * 0.5 + 0.5) * 255; img.data[o + 1] = (ny * k * 0.5 + 0.5) * 255; img.data[o + 2] = (nz * k * 0.5 + 0.5) * 255; img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return canvasTex(T, c, false, aniso);
  }
  function drawTextures(T, aniso) {
    var X = {}, R = rng(5);
    // board and batten: a 2 1/2 in batten every 16 in, fine grain on the boards
    X.sidingN = normalTex(T, 256, 256, function (u, v) {
      var b = sstep(0.0, 0.018, u) * (1 - sstep(0.128, 0.146, u));
      return b * 0.06 + noise(u * 90, v * 30) * 0.0015 + noise(u * 13, v * 5) * 0.002;
    }, 12, aniso);
    // standing seam: a tall seam at the panel edge, two pencil ribs, a little oil-canning
    X.seamN = normalTex(T, 256, 128, function (u, v) {
      var seam = sstep(0.0, 0.02, u) * (1 - sstep(0.035, 0.055, u));
      var rib = Math.exp(-Math.pow((u - 0.36) / 0.008, 2)) + Math.exp(-Math.pow((u - 0.68) / 0.008, 2));
      return seam * 0.08 + rib * 0.006 + noise(u * 3, v * 1.5) * 0.004 * Math.sin(Math.PI * u);
    }, 14, aniso);
    function cardTex(w, h, draw) { var c = canvas(w, h), g = c.getContext('2d'); g.lineCap = 'round'; draw(g, w, h); var t = canvasTex(T, c, true, aniso); t.wrapS = t.wrapT = T.ClampToEdgeWrapping; return t; }
    function pick(a) { return a[Math.floor(R() * a.length)]; }
    // Engelmann spruce: bottlebrush twigs, blue-green
    X.spruce = cardTex(512, 256, function (g, w, h) {
      var cols = ['#22352e', '#2b4038', '#34493f', '#3d5448', '#4a6455', '#5b7466'];
      function twig(x0, y0, ang, len, depth) {
        var x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
        g.strokeStyle = '#3a3026'; g.lineWidth = depth ? 2 : 3.5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
        for (var s = 0; s < len; s += 2.2) {
          var px = x0 + Math.cos(ang) * s, py = y0 + Math.sin(ang) * s, taper = 1 - 0.55 * s / len;
          for (var k = 0; k < 4; k++) {
            var side = k % 2 ? 1 : -1, a2 = ang + side * (0.6 + R() * 0.7), nl = (12 + R() * 9) * taper;
            g.strokeStyle = pick(cols); g.lineWidth = 2;
            g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a2) * nl, py + Math.sin(a2) * nl); g.stroke();
          }
        }
        if (depth < 1) for (var b = 0; b < 5; b++) { var s2 = len * (0.2 + 0.14 * b); twig(x0 + Math.cos(ang) * s2, y0 + Math.sin(ang) * s2, ang + (b % 2 ? 0.75 : -0.75) * (0.7 + R() * 0.4), len * (0.3 + R() * 0.15), depth + 1); }
      }
      twig(8, h / 2, -0.03, w - 40, 0);
    });
    // lodgepole pine: paired yellow-green needles in tufts at the twig ends
    X.pine = cardTex(512, 256, function (g, w, h) {
      var cols = ['#27331f', '#2f3c24', '#37462a', '#405030', '#4a5b37', '#55673f'];
      function twig(x0, y0, ang, len, depth) {
        var x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
        g.strokeStyle = '#4a3c2c'; g.lineWidth = depth ? 2.5 : 4; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
        for (var s = len * 0.35; s < len; s += 1.6) {
          var px = x0 + Math.cos(ang) * s, py = y0 + Math.sin(ang) * s;
          for (var k = 0; k < 3; k++) {
            var a2 = ang + (R() - 0.5) * 2.2, nl = 22 + R() * 22;
            g.strokeStyle = pick(cols); g.lineWidth = 1.8;
            g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + Math.cos(a2) * nl * 0.5, py + Math.sin(a2) * nl * 0.5 - 2, px + Math.cos(a2) * nl, py + Math.sin(a2) * nl); g.stroke();
          }
        }
        if (depth < 1) for (var b = 0; b < 3; b++) { var s2 = len * (0.25 + 0.2 * b); twig(x0 + Math.cos(ang) * s2, y0 + Math.sin(ang) * s2, ang + (b % 2 ? 0.6 : -0.6), len * 0.45, depth + 1); }
      }
      twig(10, h / 2, 0, w - 70, 0);
    });
    // aspen: a cluster of round leaves
    X.leaves = cardTex(256, 256, function (g, w, h) {
      var cols = ['#3d5a1d', '#4a6823', '#57762a', '#648332', '#73903b', '#839d45', '#486322'];
      g.strokeStyle = '#6a6052'; g.lineWidth = 2;
      for (var i = 0; i < 9; i++) { g.beginPath(); g.moveTo(w / 2, h - 8); g.lineTo(w / 2 + (R() - 0.5) * w * 0.8, h / 2 + (R() - 0.5) * h * 0.7); g.stroke(); }
      for (var j = 0; j < 150; j++) {
        var a = R() * Math.PI * 2, r = Math.sqrt(R()) * w * 0.4, x = w / 2 + Math.cos(a) * r, y = h / 2 + Math.sin(a) * r * 0.9;
        g.save(); g.translate(x, y); g.rotate(R() * Math.PI * 2); g.fillStyle = pick(cols);
        var s = 7 + R() * 6; g.beginPath(); g.moveTo(0, -s * 1.15); g.quadraticCurveTo(s, -s * 0.4, s * 0.8, s * 0.3); g.quadraticCurveTo(0, s * 1.1, -s * 0.8, s * 0.3); g.quadraticCurveTo(-s, -s * 0.4, 0, -s * 1.15); g.fill();
        g.restore();
      }
    });
    // aspen in winter: fine gray twigs
    X.twigs = cardTex(256, 256, function (g, w, h) {
      function br(x, y, ang, len, wd, d) {
        var x1 = x + Math.cos(ang) * len, y1 = y + Math.sin(ang) * len;
        g.strokeStyle = d < 2 ? '#7e786c' : '#948d80'; g.lineWidth = wd; g.beginPath(); g.moveTo(x, y); g.lineTo(x1, y1); g.stroke();
        if (d < 5) { br(x1, y1, ang - 0.35 - R() * 0.3, len * 0.72, wd * 0.7, d + 1); br(x1, y1, ang + 0.35 + R() * 0.3, len * 0.68, wd * 0.7, d + 1); }
      }
      br(w / 2, h, -Math.PI / 2, h * 0.28, 4, 0);
    });
    // aspen bark: chalky white with dark lenticels and branch scars
    var ab = canvas(128, 256), ag = ab.getContext('2d');
    ag.fillStyle = '#d6d3c7'; ag.fillRect(0, 0, 128, 256);
    for (var i = 0; i < 1400; i++) { ag.fillStyle = R() < 0.5 ? 'rgba(160,156,140,0.25)' : 'rgba(240,238,230,0.3)'; ag.fillRect(R() * 128, R() * 256, 1 + R() * 3, 1 + R() * 2); }
    for (i = 0; i < 60; i++) { ag.fillStyle = 'rgba(70,64,56,0.75)'; ag.fillRect(R() * 128, R() * 256, 4 + R() * 9, 1 + R() * 1.4); }
    for (i = 0; i < 5; i++) { var ex = R() * 128, ey = R() * 256; ag.fillStyle = '#2a2622'; ag.beginPath(); ag.ellipse(ex, ey, 6 + R() * 6, 3 + R() * 3, 0, 0, Math.PI * 2); ag.fill(); }
    X.aspenBark = canvasTex(T, ab, true, aniso);
    // meadow flowers: Indian paintbrush, lupine, arnica, columbine (stem drawn into each sprite)
    function flower(head) { return cardTex(64, 128, function (g, w, h) { g.strokeStyle = '#4d6026'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2 + 2, 30); g.stroke(); g.fillStyle = '#56692b'; g.beginPath(); g.ellipse(w / 2 - 7, 88, 9, 3, -0.5, 0, 7); g.fill(); g.beginPath(); g.ellipse(w / 2 + 8, 70, 9, 3, 0.5, 0, 7); g.fill(); head(g, w / 2 + 2, 28); }); }
    X.flowers = [
      flower(function (g, x, y) { for (var k = 0; k < 26; k++) { g.fillStyle = k % 3 ? '#d6452a' : '#ee6a34'; g.beginPath(); g.ellipse(x + (R() - 0.5) * 12, y - 8 + k * 0.9 - R() * 10, 3.5, 5, R(), 0, 7); g.fill(); } }),
      flower(function (g, x, y) { for (var k = 0; k < 30; k++) { var t = k / 30; g.fillStyle = k % 2 ? '#6d5bb5' : '#8a78cf'; g.beginPath(); g.arc(x + (R() - 0.5) * 14 * (1 - t * 0.7), y + 14 - t * 30, 3.2, 0, 7); g.fill(); } }),
      flower(function (g, x, y) { g.fillStyle = '#f2c31f'; for (var k = 0; k < 12; k++) { g.save(); g.translate(x, y); g.rotate(k * 0.524); g.beginPath(); g.ellipse(0, -8, 3, 8, 0, 0, 7); g.fill(); g.restore(); } g.fillStyle = '#b97a12'; g.beginPath(); g.arc(x, y, 4.5, 0, 7); g.fill(); }),
      flower(function (g, x, y) { for (var k = 0; k < 5; k++) { g.save(); g.translate(x, y); g.rotate(k * 1.257); g.fillStyle = '#8fa9dc'; g.beginPath(); g.ellipse(0, -9, 4.5, 9, 0, 0, 7); g.fill(); g.fillStyle = '#f4f2ea'; g.beginPath(); g.ellipse(0, -4, 2.5, 5, 0, 0, 7); g.fill(); g.restore(); } g.fillStyle = '#f2d24a'; g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); })
    ];
    return X;
  }

  /* ---------- sky and the light it gives ---------- */
  // A clear high-altitude sky: deep blue overhead, hazy at the horizon, a glow around the sun and its disc.
  // Colors are linear light; sunSky() sets them from the sun's height.
  var SKY_F = [
    'uniform vec3 uSun; uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uGlow; uniform vec3 uBelow; uniform float uDisc; uniform float uGain; uniform sampler2D uPk; varying vec3 vDir;',
    // fair-weather clouds on a flat layer: density from the peaks' noise texture, lit on the side toward the sun
    'float cloud( vec2 p ) { return texture2D( uPk, p * 0.21 + 0.2 ).r * 0.62 + texture2D( uPk, p * 0.57 + 0.37 ).r * 0.38; }',
    'void main() {',
    '  vec3 d = normalize( vDir ); float h = d.y, mu = max( dot( d, uSun ), 0.0 );',
    '  vec3 c = mix( uHorizon, uZenith, pow( clamp( h, 0.0, 1.0 ), 0.42 ) );',
    '  c += uHorizon * 0.22 * exp( -max( h, 0.0 ) * 16.0 );',
    '  c += uGlow * ( 0.1 * pow( mu, 5.0 ) + 0.45 * pow( mu, 60.0 ) );',
    '  if ( h > 0.0 ) {',
    '    vec2 cp = d.xz / ( h + 0.1 ); float n = cloud( cp ), day = clamp( dot( uGlow, vec3( 0.47 ) ), 0.0, 1.0 );',
    '    float cov = smoothstep( 0.55, 0.7, n ) * smoothstep( 0.0, 0.16, h ) * ( 0.25 + 0.75 * day );',
    '    float lit = clamp( 0.8 + ( n - cloud( cp + normalize( uSun.xz + 1e-4 ) * 0.08 ) ) * 7.0, 0.4, 1.15 );',
    '    vec3 sunW = mix( uGlow, vec3( dot( uGlow, vec3( 0.333 ) ) ), 0.6 );',
    '    vec3 cc = mix( uHorizon * 0.9, sunW * 0.85 + uZenith * 0.55, lit ) + uGlow * 0.5 * pow( mu, 12.0 ) * ( 1.0 - cov );',
    '    c = mix( c, cc, cov * 0.9 );',
    '  }',
    '  c += uGlow * uDisc * 60.0 * smoothstep( 0.99986, 0.99994, mu );',
    '  c = mix( c, uBelow, smoothstep( 0.0, -0.06, h ) );',
    '  gl_FragColor = vec4( c * uGain, 1.0 );',
    '  #include <tonemapping_fragment>',
    '  #include <encodings_fragment>',
    '}'].join('\n');
  var SKY_V = 'varying vec3 vDir; void main() { vec4 w = modelMatrix * vec4( position, 1.0 ); vDir = w.xyz - cameraPosition; gl_Position = projectionMatrix * viewMatrix * w; gl_Position.z = gl_Position.w; }';
  function skyMesh(T, u, disc, gain) {
    var uni = { uSun: u.uSun, uZenith: u.uZenith, uHorizon: u.uHorizon, uGlow: u.uGlow, uBelow: u.uBelow, uPk: u.uPk, uDisc: { value: disc ? 1 : 0 }, uGain: { value: gain } };
    var m = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.ShaderMaterial({ uniforms: uni, vertexShader: SKY_V, fragmentShader: SKY_F, side: T.BackSide, depthWrite: false }));
    m.frustumCulled = false; m.renderOrder = -1000;
    return m;
  }
  function lerp3(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
  // sky colors for a sun at altitude alt (radians); up runs 0 at dusk to 1 in full day
  function sunSky(u, alt, up) {
    var night = sstep(-0.12, 0.02, alt), warm = 1 - sstep(0.05, 0.45, alt);
    var zen = lerp3([0.045, 0.11, 0.33], [0.02, 0.035, 0.09], warm), hor = lerp3([0.30, 0.40, 0.52], [0.42, 0.30, 0.22], warm);
    // after sunset the sky keeps a deep blue twilight rather than going black
    u.uZenith.value.setRGB(zen[0], zen[1], zen[2]).multiplyScalar(0.22 + 0.78 * night);
    u.uHorizon.value.setRGB(hor[0], hor[1], hor[2]).multiplyScalar(0.16 + 0.84 * night);
    u.uGlow.value.setRGB(1.0, 0.86 - 0.3 * warm, 0.7 - 0.45 * warm).multiplyScalar(night);
  }

  /* ---------- terrain, peaks and the forest beyond the lot ---------- */
  var RING = 1450, FAR = 4300, SEG = 192;
  function radii(r0, r1, step0, grow) { var out = [r0], r = r0, s = step0; while (r < r1 - 1e-6) { r = Math.min(r1, r + s); out.push(r); s *= grow; } return out; }
  function polarGeo(T, rs, height, color, uvScale, seg) {
    seg = seg || SEG;
    var pos = [], uv = [], col = [], idx = [], n = seg + 1;
    rs.forEach(function (r) {
      for (var k = 0; k <= seg; k++) {
        var a = k / seg * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r, y = height(x, z, r, a);
        pos.push(x, y, z); uv.push(x * uvScale, z * uvScale);
        if (color) { var c = color(x, z, r, a, y); col.push(c[0], c[1], c[2]); }
      }
    });
    for (var i = 0; i < rs.length - 1; i++) for (var k = 0; k < seg; k++) {
      var a0 = i * n + k, b0 = a0 + 1, a1 = a0 + n, b1 = a1 + 1;
      idx.push(a0, b0, a1, b0, b1, a1);
    }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    if (color) g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  // how high the peaks stand around the compass: the Tenmile Range to the west, lower country to the north, and a
  // high massif to the north-northeast, which the opening view looks at over the forest
  function peakEnvelope(a) {
    var w = Math.max(0, Math.cos(a - Math.PI)), e = Math.max(0, Math.cos(a)), s = Math.max(0, Math.cos(a - Math.PI / 2)), n = Math.max(0, Math.cos(a + Math.PI / 2));
    var m = Math.atan2(Math.sin(a + 0.95), Math.cos(a + 0.95)) / 0.5;
    return 330 + 330 * w * w + 170 * e + 220 * s - 150 * n + 430 * Math.exp(-m * m);
  }
  function peakH(x, z, r, a) {
    var t = sstep(RING, RING + 900, r) * (1 - 0.25 * sstep(FAR - 700, FAR, r));
    return groundH(x, z) + t * peakEnvelope(a) * (0.35 + 0.75 * ridged(x / 760, z / 760, 5));
  }
  function forestMask(x, z) { return fbm(x / 260 + 3.1, z / 260 - 5.7, 3) + 0.12; }
  function terrainColor(x, z) {
    var f = forestMask(x, z), r = Math.sqrt(x * x + z * z), k = sstep(160, 420, r) * sstep(0.0, 0.3, f);
    var v = 1 - 0.32 * k + 0.08 * fbm(x / 60, z / 60, 2);
    return [v, v, v * (1 - 0.06 * k)];
  }
  // The peaks are colored per pixel from height, slope and noise: forest crowns below the treeline, tundra and
  // rock above it, snow wherever the slope holds it in winter. A noise bump creases the faces so ridges and gullies
  // catch the sun, and the air thins with height, so the foot of a peak sits deeper in the haze than its summit.
  // All of it reads one small tiling noise texture (see peakNoise), so mip mapping filters what is finer than a
  // pixel and a pixel costs a handful of lookups rather than a hundred hashes. uPkS turns its stored slopes into
  // slope per 70 ft at the 560 ft tile.
  var PEAK_F = [
    ['#include <common>', '$\nuniform float uWin;\nuniform float uRing;\nuniform sampler2D uPk;\nuniform float uPkS;'],
    ['#include <color_fragment>', [
      'vec3 pkN = normalize( vRN ); float pkH;',
      '{ vec2 q = ( vRW.xz + vRW.y * vec2( 0.55, -0.35 ) ) / 560.0; vec4 a = texture2D( uPk, q ), b = texture2D( uPk, mat2( 0.8, 0.6, -0.6, 0.8 ) * q * 0.43 + 0.37 );',
      '  pkH = a.r * 0.62 + b.r * 0.38; vec2 g = ( ( a.gb - 0.5 ) * 0.62 + mat2( 0.8, -0.6, 0.6, 0.8 ) * ( b.gb - 0.5 ) * 0.38 * 0.43 ) * uPkS;',
      '  pkN = normalize( pkN - vec3( g.x, 0.0, g.y ) * ( 0.12 + 0.5 * ( 1.0 - pkN.y ) ) ); }',
      '{ float big = texture2D( uPk, vRW.xz / 4200.0 + 0.5 ).r, y = vRW.y + ( pkH - 0.5 ) * 60.0, tree = 320.0 + 140.0 * ( big - 0.5 ), slope = pkN.y;',
      '  float above = smoothstep( tree - 20.0, tree + 20.0, y ), thin = smoothstep( tree - 110.0, tree, y );',
      '  float can = 0.5 * texture2D( uPk, vRW.xz / 256.0 ).a + 0.3 * texture2D( uPk, vRW.xz / 704.0 + 0.3 ).a + 0.2 * texture2D( uPk, vRW.xz / 600.0 + 0.7 ).r;',
      '  float crowns = smoothstep( 0.18 + 0.38 * thin, 0.36 + 0.38 * thin, can ) * ( 1.0 - above );',
      '  float fine = texture2D( uPk, vRW.xz / 192.0 + 0.11 ).a, strata = 0.5 + 0.5 * sin( ( vRW.y + ( pkH - 0.5 ) * 90.0 ) / ( 4.0 + 3.0 * texture2D( uPk, vRW.xz / 1600.0 ).r ) );',
      '  vec3 rock = mix( vec3( 0.06, 0.059, 0.058 ), vec3( 0.16, 0.152, 0.14 ), pkH ) * ( 0.92 + 0.14 * strata );',
      '  vec3 ground = mix( vec3( 0.02, 0.025, 0.016 ), mix( vec3( 0.06, 0.07, 0.035 ), vec3( 0.095, 0.092, 0.055 ), texture2D( uPk, vRW.xz / 1984.0 + 0.6 ).a ), above );',
      '  vec3 sumC = mix( ground, vec3( 0.017, 0.029, 0.021 ) * ( 0.75 + 0.5 * fine ), crowns );',
      '  sumC = mix( sumC, rock, max( 1.0 - smoothstep( 0.5, 0.74, slope + ( pkH - 0.5 ) * 0.3 ), above * smoothstep( 430.0, 580.0, y ) * 0.75 ) );',
      '  float field = smoothstep( 500.0, 590.0, y - 90.0 * pkN.z + 80.0 * ( pkH - 0.5 ) ) * smoothstep( 0.55, 0.75, slope ) * smoothstep( 0.4, 0.56, pkH );',
      '  vec3 snowC = vec3( 0.8, 0.84, 0.9 ) * ( 0.93 + 0.1 * pkH );',
      '  sumC = mix( sumC, snowC, field );',
      '  vec3 winC = mix( snowC, vec3( 0.026, 0.04, 0.034 ) * ( 0.8 + 0.4 * fine ), crowns * 0.9 );',
      '  winC = mix( winC, rock * 0.92, 1.0 - smoothstep( 0.4, 0.6, slope + ( pkH - 0.5 ) * 0.4 ) );',
      '  diffuseColor.rgb *= mix( sumC, winC, uWin ) * ( 0.82 + 0.36 * pkH ); }'].join('\n')],
    ['#include <normal_fragment_maps>', '$\nnormal = normalize( ( viewMatrix * vec4( pkN, 0.0 ) ).xyz );'],
    ['#include <fog_fragment>', '$\n#ifdef USE_FOG\n{ float d = length( vRW - cameraPosition ), thick = exp( -max( vRW.y, 0.0 ) / 1400.0 ); gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, ( 1.0 - exp( -d / 5200.0 * thick ) ) * 0.85 * smoothstep( uRing, uRing + 700.0, length( vRW.xz ) ) ); }\n#endif']
  ];
  // A 256 px tiling noise for the peaks: r is four octaves of value noise (8 to 64 cells a tile), g and b its slope
  // across x and y, a a single octave of 64 cells.
  function peakNoise(T, aniso) {
    var N = 256, data = new Uint8Array(N * N * 4), H = new Float32Array(N * N);
    function lattice(c, seed) { var g = new Float32Array(c * c), r = rng(seed); for (var i = 0; i < c * c; i++) g[i] = r(); return { c: c, g: g }; }
    function vn(L, u, v) {
      var c = L.c, x = u * c, y = v * c, xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
      var x0 = xi % c, x1 = (xi + 1) % c, y0 = yi % c, y1 = (yi + 1) % c, a = L.g[y0 * c + x0], b = L.g[y0 * c + x1], d = L.g[y1 * c + x0], e = L.g[y1 * c + x1];
      return a + (b - a) * sx + (d - a) * sy + (a - b - d + e) * sx * sy;
    }
    var oct = [8, 16, 32, 64].map(function (c, i) { return lattice(c, 101 + i); }), st = lattice(64, 211), x, y, m = 0;
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) { var s = 0, a = 0.5; for (var o = 0; o < 4; o++) { s += a * vn(oct[o], x / N, y / N); a *= 0.5; } H[y * N + x] = s / 0.9375; }
    function dx(x, y) { return (H[y * N + (x + 1) % N] - H[y * N + (x + N - 1) % N]) / 2; }
    function dy(x, y) { return (H[((y + 1) % N) * N + x] - H[((y + N - 1) % N) * N + x]) / 2; }
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) m = Math.max(m, Math.abs(dx(x, y)), Math.abs(dy(x, y)));
    var S = 0.48 / m;
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
      var i = (y * N + x) * 4;
      data[i] = Math.round(H[y * N + x] * 255); data[i + 1] = Math.round((0.5 + dx(x, y) * S) * 255); data[i + 2] = Math.round((0.5 + dy(x, y) * S) * 255); data[i + 3] = Math.round(vn(st, x / N, y / N) * 255);
    }
    var t = new T.DataTexture(data, N, N, T.RGBAFormat);
    t.wrapS = t.wrapT = T.RepeatWrapping; t.magFilter = T.LinearFilter; t.minFilter = T.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = aniso || 4; t.needsUpdate = true;
    return { tex: t, slope: N * 70 / 560 / S }; // stored slope per texel, back to slope per 70 ft
  }
  /* ---------- near trees: lodgepole pine, Engelmann spruce, aspen ---------- */
  var TREE_H = { pine: 60, spruce: 60, fir: 60, aspen: 40 };
  function card(out, c, u, w, len, wid, nrm, snow) {
    var o = out.pos.length / 3;
    [[-0.5, -0.5, 0, 0], [0.5, -0.5, 1, 0], [0.5, 0.5, 1, 1], [-0.5, 0.5, 0, 1]].forEach(function (q) {
      out.pos.push(c[0] + u[0] * q[0] * len + w[0] * q[1] * wid, c[1] + u[1] * q[0] * len + w[1] * q[1] * wid, c[2] + u[2] * q[0] * len + w[2] * q[1] * wid);
      out.uv.push(q[2], q[3]); out.nor.push(nrm[0], nrm[1], nrm[2]); out.snow.push(snow);
    });
    out.idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }
  function cardsGeo(T, out) {
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(out.pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(out.nor, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(out.uv, 2)); g.setAttribute('aSnow', new T.Float32BufferAttribute(out.snow, 1));
    g.setIndex(out.idx); return g;
  }
  function norm3(v) { var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function trunkGeo(T, H, r0, r1, vRep) {
    var g = new T.CylinderGeometry(r1, r0, H, 9, 6, true); g.translate(0, H / 2, 0);
    var uv = g.attributes.uv.array; for (var i = 1; i < uv.length; i += 2) uv[i] *= vRep;
    for (i = 0; i < uv.length; i += 2) uv[i] *= 2;
    return g;
  }
  // kind: 'spruce' (Engelmann: dense, broad, branches to the ground), 'fir' (subalpine: the same, a narrow
  // spire) or 'pine' (lodgepole: a tall clean trunk, a fuller crown in its upper part)
  function conifer(T, kind, seed, density, coarse) {
    var R = rng(seed), H = TREE_H[kind], spruce = kind !== 'pine', fir = kind === 'fir', out = { pos: [], nor: [], uv: [], snow: [], idx: [] }, cs = coarse ? 1.7 : 1;
    var base = spruce ? 0.04 + R() * 0.04 : 0.24 + R() * 0.1, Rmax = spruce ? (8.8 + R() * 1.6) * (fir ? 0.58 : 1) : 5.8 + R() * 1.4, mid = H * (base + (1 - base) * 0.45);
    function rad(t) { return spruce ? Rmax * Math.pow(1 - t, 0.92) : Rmax * (t < 0.18 ? 0.55 + 2.5 * t : Math.pow((1 - t) / 0.82, 0.75)); }
    var y = H * base;
    while (y < H * 0.975) {
      var t = (y - H * base) / (H * (1 - base)), rr = rad(t), nb = 5 + Math.floor(R() * 3), a0 = R() * Math.PI * 2;
      for (var b = 0; b < nb; b++) {
        if (R() > density) continue;
        var a = a0 + b * Math.PI * 2 / nb + (R() - 0.5) * 0.7, L = Math.max(0.8, rr * (spruce ? 0.75 + R() * 0.35 : 0.6 + R() * 0.65));
        var pitch = spruce ? -(0.22 + 0.3 * R()) + 0.25 * t : 0.08 + 0.3 * R();
        var dir = [Math.cos(a) * Math.cos(pitch), Math.sin(pitch), Math.sin(a) * Math.cos(pitch)];
        var side = norm3(cross3(dir, [0, 1, 0])), upw = cross3(side, dir);
        var nc = Math.max(1, Math.round(L / ((spruce ? 1.5 : 1.15) * cs)));
        for (var c = 0; c < nc; c++) {
          var s = L * (spruce ? 0.25 + 0.75 * (c + 0.5) / nc : 0.35 + 0.65 * (c + 0.5) / nc);
          var droop = spruce ? -0.12 * s * s / L : 0.05 * s;
          var ctr = [dir[0] * s, y + dir[1] * s + droop, dir[2] * s];
          var size = (0.8 + R() * 0.4) * (spruce ? 0.55 + 0.45 * (1 - t) : 0.75 + 0.25 * (1 - t));
          var len = (spruce ? 2.6 : 3.0) * size * Math.sqrt(cs), wid = (spruce ? 1.35 : 1.8) * size * Math.sqrt(cs);
          var lit = norm3([ctr[0], (ctr[1] - mid) * 0.25 + 0.55 * Math.max(rr, 1), ctr[2]]);
          for (var k = 0; k < 2; k++) {
            var roll = (R() - 0.5) * 1.1 + k * 1.45, cr = Math.cos(roll), sr = Math.sin(roll);
            var wv = [side[0] * cr + upw[0] * sr, side[1] * cr + upw[1] * sr, side[2] * cr + upw[2] * sr], pn = cross3(dir, wv);
            // little snow reaches in by the trunk, under the branches above
            card(out, ctr, dir, wv, len, wid, lit, (Math.abs(pn[1]) * (0.75 + 0.25 * t) + (lit[1] > 0.3 ? 0.15 : 0)) * (0.1 + 0.9 * sstep(1.4, 4.2, s)));
          }
        }
      }
      y += (spruce ? 1.0 : 0.85) * cs * (0.85 + 0.3 * R());
    }
    // the leader at the top
    for (var q = 0; q < 3; q++) { var aq = q * 2.1; card(out, [0, H * 0.985, 0], [0, 1, 0], [Math.cos(aq), 0, Math.sin(aq)], 2.4, 0.9, [0, 1, 0], 0.6); }
    return { foliage: cardsGeo(T, out), trunk: trunkGeo(T, H, spruce ? (fir ? 0.5 : 0.62) : 0.4, 0.06, H / 6.5), H: H, R: Rmax };
  }
  /* ---------- far trees: baked impostors ---------- */
  // Each kind of far tree is drawn once, from the side, into an atlas: its colors (square-root encoded, so dark
  // needles keep their detail in 8 bits) and its normals, with how much it holds snow in the alpha. A far tree is
  // then two crossed quads showing that picture, lit with the baked normals: it shades, takes snow and fades
  // into the haze like a near tree, for four triangles.
  var IMP = [['spruce', 41], ['spruce', 42], ['fir', 44], ['pine', 43]], IMP_HT = 1.03;
  // vAo stands in for the shadows and ambient occlusion a near tree gets: needles deep in the crown and low on
  // the tree are darker than the tips
  var BAKE_V = 'attribute float aSnow; uniform vec2 uHR; varying vec2 vUv; varying vec3 vN; varying float vS; varying float vAo; void main() { vUv = uv; vN = normal; vS = aSnow; float h = clamp( position.y / uHR.x, 0.0, 1.0 ), rc = max( 1.2, uHR.y * ( 1.0 - h ) * 1.15 ); vAo = mix( 0.42, 1.0, smoothstep( 0.15, 0.95, length( position.xz ) / rc ) ) * mix( 0.72, 1.0, h ); gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }';
  var BAKE_TRUNK_V = 'varying vec2 vUv; varying vec3 vN; varying float vS; void main() { vUv = uv; vN = normal; vS = 0.0; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }';
  function bakeImpostors(T, renderer, X, tileH) {
    var tileW = tileH / 2, n = IMP.length, opts = { generateMipmaps: true, minFilter: T.LinearMipmapLinearFilter, magFilter: T.LinearFilter };
    var col = new T.WebGLRenderTarget(tileW * n, tileH, opts), nrm = new T.WebGLRenderTarget(tileW * n, tileH, opts);
    var FOL_C = 'uniform sampler2D map; varying vec2 vUv; varying float vAo; void main() { vec4 t = texture2D( map, vUv ); if ( t.a < 0.4 ) discard; gl_FragColor = vec4( sqrt( t.rgb * vAo ), 1.0 ); }';
    var FOL_N = 'uniform sampler2D map; varying vec2 vUv; varying vec3 vN; varying float vS; void main() { if ( texture2D( map, vUv ).a < 0.4 ) discard; gl_FragColor = vec4( normalize( vN ) * 0.5 + 0.5, clamp( vS, 0.0, 1.0 ) ); }';
    var TRUNK_C = 'uniform vec3 uColor; void main() { gl_FragColor = vec4( sqrt( uColor ), 1.0 ); }';
    var TRUNK_N = 'varying vec3 vN; void main() { gl_FragColor = vec4( normalize( vN ) * 0.5 + 0.5, 0.0 ); }';
    // the needles' mean color (square-root encoded, as baked) from the card texture; the factor is how much the
    // crown darkening (vAo) takes off on average, deeper in the spruce than in the open pine crown
    function fill(tex, k) {
      var d = tex.image.getContext('2d').getImageData(0, 0, tex.image.width, tex.image.height).data, s = [0, 0, 0], n = 0;
      for (var i = 0; i < d.length; i += 4) if (d[i + 3] > 102) { for (var c = 0; c < 3; c++) { var x = d[i + c] / 255; s[c] += x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); } n++; }
      return s.map(function (v) { return Math.sqrt(v / Math.max(n, 1)) * k; });
    }
    var fills = { pine: fill(X.pine, 0.82), spruce: fill(X.spruce, 0.68) };
    // one material per pass and part, shared by the four trees (their uniforms change per tree)
    var U = { map: { value: null }, uHR: { value: new T.Vector2() }, uColor: { value: new T.Color(0.075, 0.064, 0.058) }, c: { value: new T.Vector4() } };
    function mat(vs, fs) { return new T.ShaderMaterial({ uniforms: U, vertexShader: vs, fragmentShader: fs, side: T.DoubleSide }); }
    var passes = [{ rt: col, fol: mat(BAKE_V, FOL_C), trunk: mat(BAKE_TRUNK_V, TRUNK_C) }, { rt: nrm, fol: mat(BAKE_V, FOL_N), trunk: mat(BAKE_TRUNK_V, TRUNK_N), bg: [0.5, 0.8, 0.9] }];
    // The empty space gets the needles' average color and a sideways-up normal at zero alpha, so smaller mip levels
    // fade the edges toward the tree, not toward black. (A clear can't do it: three.js premultiplies the clear color
    // by its alpha.)
    var bgM = new T.ShaderMaterial({ uniforms: U, vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }', fragmentShader: 'uniform vec4 c; void main() { gl_FragColor = c; }' });
    var keep = { tm: renderer.toneMapping, ac: renderer.autoClear, rt: renderer.getRenderTarget() };
    renderer.toneMapping = T.NoToneMapping; renderer.autoClear = false;
    try {
      IMP.forEach(function (k, i) {
        var g = conifer(T, k[0], k[1], 1), H = g.H * IMP_HT, cam = new T.OrthographicCamera(-H / 4, H / 4, H, 0, 0.1, 200), sc = new T.Scene();
        cam.position.set(0, 0, 100); cam.lookAt(0, 0, 0);
        var fol = new T.Mesh(g.foliage), trunk = new T.Mesh(g.trunk), bg = new T.Mesh(new T.PlaneGeometry(H, H * 2), bgM); sc.add(trunk); sc.add(fol);
        bg.position.set(0, H / 2, -90); sc.add(bg);
        U.map.value = k[0] === 'pine' ? X.pine : X.spruce; U.uHR.value.set(g.H, g.R);
        passes.forEach(function (ps) {
          var f = ps.bg || (k[0] === 'pine' ? fills.pine : fills.spruce); U.c.value.set(f[0], f[1], f[2], 0);
          fol.material = ps.fol; trunk.material = ps.trunk;
          ps.rt.viewport.set(i * tileW, 0, tileW, tileH); ps.rt.scissor.set(i * tileW, 0, tileW, tileH); ps.rt.scissorTest = true;
          renderer.setRenderTarget(ps.rt); renderer.clear();
          renderer.render(sc, cam);
        });
        g.foliage.dispose(); g.trunk.dispose(); bg.geometry.dispose();
      });
    } finally {
      renderer.setRenderTarget(keep.rt); renderer.toneMapping = keep.tm; renderer.autoClear = keep.ac;
      passes.forEach(function (ps) { ps.fol.dispose(); ps.trunk.dispose(); }); bgM.dispose();
    }
    return { color: col, normal: nrm, tiles: n };
  }
  // two crossed quads, base at the ground; aQ is each quad's own turn (cos, sin) about the trunk
  function impostorGeo(T) {
    var a = new T.PlaneGeometry(1, 1); a.translate(0, 0.5, 0);
    var b = a.clone(); b.rotateY(Math.PI / 2);
    var g = merge(T, [a, b]), q = [];
    for (var i = 0; i < g.attributes.position.count; i++) q.push(i < a.attributes.position.count ? 1 : 0, i < a.attributes.position.count ? 0 : 1);
    g.setAttribute('aQ', new T.Float32BufferAttribute(q, 2));
    return g;
  }

  function aspen(T, seed) {
    var R = rng(seed), H = TREE_H.aspen, wood = [trunkGeo(T, H * 0.96, 0.36, 0.07, H / 4)], leaves = { pos: [], nor: [], uv: [], snow: [], idx: [] }, twigs = { pos: [], nor: [], uv: [], snow: [], idx: [] };
    for (var b = 0; b < 11; b++) {
      var y0 = H * (0.42 + 0.42 * R()), a = R() * Math.PI * 2, up = 0.55 + 0.5 * R(), L = 5 + R() * 6;
      var br = new T.CylinderGeometry(0.035, 0.11, L, 5, 1, true); br.translate(0, L / 2, 0);
      var m = new T.Matrix4().makeRotationY(-a).multiply(new T.Matrix4().makeRotationZ(-(Math.PI / 2 - up)));
      br.applyMatrix4(m); br.translate(0, y0, 0); wood.push(br);
    }
    var cy = H * 0.7, rx = 6.5 + R() * 1.5, ry = 9 + R() * 2;
    function fill(out, n, size) {
      for (var i = 0; i < n; i++) {
        var u = R() * 2 - 1, th = R() * Math.PI * 2, rr = Math.cbrt(R()), s = Math.sqrt(1 - u * u);
        var c = [Math.cos(th) * s * rr * rx, cy + u * rr * ry, Math.sin(th) * s * rr * rx];
        var d = norm3([R() - 0.5, R() - 0.5, R() - 0.5]), w = norm3(cross3(d, [0, 1, 0.01]));
        card(out, c, d, w, size, size, norm3([c[0], (c[1] - cy) * 0.6 + 3, c[2]]), 0.3 + 0.5 * Math.max(0, (c[1] - cy) / ry));
      }
    }
    fill(leaves, 420, 2.7); fill(twigs, 110, 3.4);
    return { wood: merge(T, wood), leaves: cardsGeo(T, leaves), twigs: cardsGeo(T, twigs), H: H, R: rx };
  }

  /* ---------- summer grass and flowers ---------- */
  // one tuft: seven curved blades, each three segments; aT is how far up the blade a vertex sits
  function tuftGeo(T, seed) {
    var R = rng(seed), pos = [], nor = [], at = [], idx = [];
    for (var b = 0; b < 7; b++) {
      var bx = (R() - 0.5) * 0.28, bz = (R() - 0.5) * 0.28, h = 0.55 + R() * 0.5, lean = 0.12 + R() * 0.35, la = R() * Math.PI * 2, wa = R() * Math.PI;
      var wx = Math.cos(wa) * 0.5, wz = Math.sin(wa) * 0.5, w0 = 0.038 + R() * 0.02, o = pos.length / 3;
      for (var s = 0; s <= 3; s++) {
        var t = s / 3, cx = bx + Math.cos(la) * lean * t * t, cz = bz + Math.sin(la) * lean * t * t, cy = h * t * (1 - 0.18 * lean * t), w = w0 * Math.pow(1 - t, 0.8) + 0.002;
        pos.push(cx - wx * w, cy, cz - wz * w, cx + wx * w, cy, cz + wz * w);
        for (var q = 0; q < 2; q++) { nor.push(Math.cos(la) * 0.25, 1, Math.sin(la) * 0.25); at.push(t); }
      }
      for (s = 0; s < 3; s++) { var a = o + s * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    g.setAttribute('aT', new T.Float32BufferAttribute(at, 1)); g.setIndex(idx); g.computeBoundingSphere();
    return g;
  }
  function flowerGeo(T) {
    var a = new T.PlaneGeometry(0.42, 1.3); a.translate(0, 0.65, 0);
    var b = a.clone(); b.rotateY(Math.PI / 2);
    return merge(T, [a, b]);
  }
  // where grass grows: the meadow around the buildings, thinning out toward the edge of the lot
  var GRASS_C = [-10, -3], GRASS_R = 112;
  function grassField(T, S, trees, mats, count, time) {
    var area = Math.PI * GRASS_R * GRASS_R, sp = Math.sqrt(area / count), R = rng(99), list = [];
    for (var z = GRASS_C[1] - GRASS_R; z < GRASS_C[1] + GRASS_R; z += sp) for (var x = GRASS_C[0] - GRASS_R; x < GRASS_C[0] + GRASS_R; x += sp) {
      var px = x + (R() - 0.5) * sp * 1.1, pz = z + (R() - 0.5) * sp * 1.1, d = Math.hypot(px - GRASS_C[0], pz - GRASS_C[1]);
      var dens = (1 - sstep(GRASS_R * 0.62, GRASS_R, d)) * (0.62 + 0.38 * sstep(-0.35, 0.25, fbm(px / 23, pz / 23, 2)));
      if (R() > dens || S.blocked(px, pz)) continue;
      var tw = trees.some(function (t) { var dx = px - t.x, dz = pz - t.z; return dx * dx + dz * dz < 2.2; });
      if (!tw) list.push([px, pz, d]);
    }
    // shuffled, so that drawing only the first part of each mesh thins the meadow evenly
    for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(R() * (i + 1)), sw = list[i]; list[i] = list[j]; list[j] = sw; }
    var tufts = [tuftGeo(T, 1), tuftGeo(T, 2), tuftGeo(T, 3)], meshes = [], m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), sc = new T.Vector3(), col = new T.Color();
    tufts.forEach(function (geo, gi) {
      var mine = list.filter(function (p, i) { return i % 3 === gi; }), im = new T.InstancedMesh(geo, mats.grass, mine.length);
      mine.forEach(function (p, i) {
        var tall = 0.8 + 0.5 * sstep(-0.4, 0.5, fbm(p[0] / 17 + 4, p[1] / 17, 2)), dry = sstep(0.05, 0.55, fbm(p[0] / 41 - 9, p[1] / 41 + 3, 3));
        e.set(0, R() * Math.PI * 2, 0); q.setFromEuler(e); v.set(p[0], groundH(p[0], p[1]) + S.moundH(p[0], p[1]), p[1]);
        sc.set(0.9 + R() * 0.35, tall * (0.75 + R() * 0.5), 0.9 + R() * 0.35); m4.compose(v, q, sc); im.setMatrixAt(i, m4);
        var k = 0.85 + R() * 0.3; col.setRGB(k * (1 + 0.55 * dry), k * (1 + 0.18 * dry), k * (1 - 0.25 * dry)); im.setColorAt(i, col);
      });
      im.receiveShadow = true; im.castShadow = false; im.frustumCulled = false; im.userData.full = mine.length; meshes.push(im);
    });
    // flowers grow in patches
    var fl = [[], [], [], []], RF = rng(7);
    list.forEach(function (p) {
      var patch = fbm(p[0] / 19 + 11, p[1] / 19 - 2, 2);
      if (patch > 0.22 && RF() < 0.09 * sstep(0.22, 0.55, patch)) fl[Math.floor(RF() * 4)].push(p);
    });
    var fg = flowerGeo(T);
    fl.forEach(function (pts, k) {
      var im = new T.InstancedMesh(fg, mats.flowers[k], pts.length);
      pts.forEach(function (p, i) { e.set(0, RF() * Math.PI, 0); q.setFromEuler(e); v.set(p[0] + 0.1, groundH(p[0], p[1]) + S.moundH(p[0], p[1]), p[1]); var s = 0.75 + RF() * 0.5; sc.set(s, s * (0.8 + RF() * 0.4), s); m4.compose(v, q, sc); im.setMatrixAt(i, m4); });
      im.receiveShadow = true; im.frustumCulled = false; meshes.push(im);
    });
    return meshes;
  }

  /* ---------- winter snow ---------- */
  // The roof blanket: one surface over every roof piece, rounded where it meets the rakes and the high eave,
  // and curled over the low north eave where the snow creeps down against the snow rails.
  function roofSnowGeo(T, R) {
    var G = R.G, C = ENG.COS, S = ENG.SIN, rects = roofRects(R), TH = 1.25, RAD = 0.9, LP = 0.78;
    var off = G.stackT + 0.03, N = [0, C, -S], OUT = [0, -S, -C];
    function lines(vals, step) {
      vals = vals.filter(function (v, i) { return vals.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
      var out = [];
      for (var i = 0; i < vals.length - 1; i++) { var n = Math.max(1, Math.ceil((vals[i + 1] - vals[i]) / step)); for (var k = 0; k < n; k++) out.push(vals[i] + (vals[i + 1] - vals[i]) * k / n); }
      out.push(vals[vals.length - 1]); return out;
    }
    var xs = lines([].concat.apply([], rects.map(function (r) { return [r[0], r[1]]; })), 0.5), zs = lines([].concat.apply([], rects.map(function (r) { return [r[2], r[3]]; })), 0.5);
    var nx = xs.length, nz = zs.length;
    function inCell(i, j) {
      if (i < 0 || j < 0 || i >= nx - 1 || j >= nz - 1) return false;
      var cx = (xs[i] + xs[i + 1]) / 2, cz = (zs[j] + zs[j + 1]) / 2;
      return rects.some(function (r) { return cx > r[0] && cx < r[1] && cz > r[2] && cz < r[3]; });
    }
    var segs = [], north = [];
    for (var j = 0; j < nz - 1; j++) for (var i = 0; i < nx; i++) if (inCell(i - 1, j) !== inCell(i, j)) segs.push([xs[i], zs[j], xs[i], zs[j + 1]]);
    for (i = 0; i < nx - 1; i++) for (j = 0; j < nz; j++) {
      var s0 = inCell(i, j - 1), s1 = inCell(i, j);
      if (s0 === s1) continue;
      if (s1 && !s0) north.push([i, j]); else segs.push([xs[i], zs[j], xs[i + 1], zs[j]]);
    }
    function segDist(x, z, s) {
      var dx = s[2] - s[0], dz = s[3] - s[1], L2 = dx * dx + dz * dz, t = L2 ? clamp(((x - s[0]) * dx + (z - s[1]) * dz) / L2, 0, 1) : 0;
      return Math.hypot(x - s[0] - dx * t, z - s[1] - dz * t);
    }
    function base(X, Z) { return [X - 16, G.rb(Z) + off * C, Z - 12 - off * S]; }
    var pos = [], uv = [], idx = [], vid = new Int32Array(nx * nz).fill(-1), hv = new Float32Array(nx * nz);
    for (j = 0; j < nz; j++) for (i = 0; i < nx; i++) {
      if (!(inCell(i - 1, j - 1) || inCell(i, j - 1) || inCell(i - 1, j) || inCell(i, j))) continue;
      var X = xs[i], Z = zs[j], d = 1e9;
      for (var k = 0; k < segs.length; k++) { var dd = segDist(X, Z, segs[k]); if (dd < d) d = dd; }
      var tt = Math.min(1, d / RAD), prof = Math.sqrt(1 - (1 - tt) * (1 - tt)), h = TH * prof * (1 + 0.07 * fbm(X / 9, Z / 9, 2));
      var b = base(X, Z); hv[j * nx + i] = h; vid[j * nx + i] = pos.length / 3;
      pos.push(b[0] + N[0] * h, b[1] + N[1] * h, b[2] + N[2] * h); uv.push(X / 6.5, Z / 6.5);
    }
    for (j = 0; j < nz - 1; j++) for (i = 0; i < nx - 1; i++) {
      if (!inCell(i, j)) continue;
      var a = vid[j * nx + i], bb = vid[j * nx + i + 1], c = vid[(j + 1) * nx + i + 1], dv = vid[(j + 1) * nx + i];
      idx.push(a, dv, bb, bb, dv, c);
    }
    // the curl: a profile swept along each run of north edge, from the top of the blanket out, down and back
    var PRO = [[0.45, 0.98], [0.8, 0.86], [1.0, 0.58], [1.05, 0.22], [0.98, -0.12], [0.86, -0.32], [0.7, -0.26], [0.55, -0.05], [0.4, 0.0], [0.0, 0.0]];
    north.sort(function (p, q) { return p[1] - q[1] || p[0] - q[0]; });
    var runs = [];
    north.forEach(function (s) { var last = runs[runs.length - 1]; if (last && last.j === s[1] && last.i1 === s[0]) last.i1 = s[0] + 1; else runs.push({ j: s[1], i0: s[0], i1: s[0] + 1 }); });
    runs.forEach(function (rn) {
      var rings = [];
      for (var ii = rn.i0; ii <= rn.i1; ii++) {
        var top = vid[rn.j * nx + ii], h = hv[rn.j * nx + ii], b = base(xs[ii], zs[rn.j]), ring = [top], k2 = h / TH;
        PRO.forEach(function (pp) {
          var sOut = pp[0] * LP * k2, up = pp[1] * h;
          ring.push(pos.length / 3); pos.push(b[0] + OUT[0] * sOut + N[0] * up, b[1] + OUT[1] * sOut + N[1] * up, b[2] + OUT[2] * sOut + N[2] * up);
          uv.push(xs[ii] / 6.5, (zs[rn.j] - sOut - up * 0.5) / 6.5);
        });
        rings.push(ring);
      }
      for (var r = 0; r < rings.length - 1; r++) for (var p = 0; p < PRO.length; p++) {
        var A = rings[r][p], B = rings[r + 1][p], Cc = rings[r][p + 1], D = rings[r + 1][p + 1];
        idx.push(A, B, Cc, B, D, Cc);
      }
    });
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  function moundGeo(T, S) {
    var m = S.mound, pad = 7, x0 = Math.floor(m.x0 - pad), x1 = Math.ceil(m.x1 + pad), z0 = Math.floor(m.z0 - pad), z1 = Math.ceil(m.z1 + pad);
    var nx = x1 - x0 + 1, nz = z1 - z0 + 1, pos = [], uv = [], col = [], idx = [];
    for (var j = 0; j < nz; j++) for (var i = 0; i < nx; i++) {
      var x = x0 + i, z = z0 + j, c = terrainColor(x, z);
      pos.push(x, groundH(x, z) + S.moundRise(x, z), z); uv.push(x / 6.5, z / 6.5); col.push(c[0], c[1], c[2]);
    }
    for (j = 0; j < nz - 1; j++) for (i = 0; i < nx - 1; i++) { var a = j * nx + i, b = a + 1, cc = a + nx, d = cc + 1; idx.push(a, cc, b, b, cc, d); }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  // Ground snow: about 16 in settled, drifted against the lee (east) side of the buildings, scoured on the
  // windward side, thin under the roofs, wells around the trees, gravel plowed with windrows, and a plow pile.
  function groundSnowGeo(T, S, trees, step) {
    var x0 = -156, x1 = 140, z0 = -138, z1 = 122, nx = Math.round((x1 - x0) / step) + 1, nz = Math.round((z1 - z0) / step) + 1;
    var pile = [-55, -29], lee = [0.86, -0.5], pos = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2), dep = new Float32Array(nx * nz), idx = [];
    var near = trees.filter(function (t) { return t.x > x0 - 10 && t.x < x1 + 10 && t.z > z0 - 10 && t.z < z1 + 10; });
    for (var j = 0; j < nz; j++) for (var i = 0; i < nx; i++) {
      var x = x0 + i * step, z = z0 + j * step, k = j * nx + i, D;
      var inB = S.build.some(function (r) { return x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1; });
      if (inB) D = -1.2;
      else {
        D = 1.32 + 0.22 * fbm(x / 50, z / 50, 3) + 0.05 * fbm(x / 6, z / 6, 2);
        var nb = nearest(S.build, x, z), r = nb.r, qx = clamp(x, r.x0, r.x1), qz = clamp(z, r.z0, r.z1), dl = Math.hypot(x - qx, z - qz) || 1;
        var dot = ((x - qx) * lee[0] + (z - qz) * lee[1]) / dl;
        D += 1.15 * Math.max(0, dot) * Math.exp(-Math.pow((nb.d - 3.4) / 2.5, 2)) - 0.4 * Math.max(0, -dot) * Math.exp(-Math.pow(nb.d / 2.6, 2));
        var nr = nearest(S.roof, x, z).d; D = D * sstep(0, 2.6, nr) + 0.03;
        near.forEach(function (t) { var dd = Math.hypot(x - t.x, z - t.z); if (dd < t.rad + 2) D *= 0.45 + 0.55 * sstep(0.8, t.rad + 2, dd); });
        var np = nearest(S.plow, x, z).d;
        if (np === 0) D = -0.14;
        else D += 1.7 * Math.exp(-Math.pow((np - 1.9) / 1.25, 2)) * sstep(0.5, 2.5, nr);
        var pr = Math.hypot(x - pile[0], z - pile[1]); D += 4.6 * Math.exp(-Math.pow(pr / 6.2, 2)) * (1 + 0.15 * fbm(x / 3, z / 3, 2));
        // the outer 70 ft eases down to a hair above the terrain and ends level with it, so the two meet with no crease
        var rim = sstep(0, 70, Math.min(x - x0, x1 - x, z - z0, z1 - z)); D = 0.02 + (D - 0.02) * rim;
      }
      dep[k] = D; pos[k * 3] = x; pos[k * 3 + 1] = groundH(x, z) + S.moundH(x, z) + D; pos[k * 3 + 2] = z; uv[k * 2] = x / 6.5; uv[k * 2 + 1] = z / 6.5;
    }
    for (j = 0; j < nz - 1; j++) for (i = 0; i < nx - 1; i++) {
      var a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
      if (dep[a] < -0.5 && dep[b] < -0.5 && dep[c] < -0.5 && dep[d] < -0.5) continue;
      idx.push(a, c, b, b, c, d);
    }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }

  /* ---------- post pass: ambient occlusion, filmic tone, a light grade ---------- */
  var QUAD_V = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }';
  var AO_F = [
    'uniform sampler2D tDepth; uniform mat4 uProj; uniform mat4 uProjInv; uniform float uRadius; uniform float uStrength; uniform float uAspect; varying vec2 vUv;',
    'vec3 viewPos( vec2 uv ) { float d = texture2D( tDepth, uv ).x; vec4 p = uProjInv * vec4( uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0 ); return p.xyz / p.w; }',
    'void main() {',
    '  float d0 = texture2D( tDepth, vUv ).x; if ( d0 >= 0.99999 ) { gl_FragColor = vec4( 1.0 ); return; }',
    // past a few hundred feet the depth buffer is too coarse for this (it would draw contour lines on the peaks)
    '  vec3 p = viewPos( vUv ); float fade = 1.0 - smoothstep( 220.0, 480.0, -p.z ); if ( fade <= 0.0 ) { gl_FragColor = vec4( 1.0 ); return; }',
    '  vec3 n = normalize( cross( dFdx( p ), dFdy( p ) ) );',
    '  float rad = min( uRadius * uProj[ 1 ][ 1 ] / -p.z * 0.5, 0.06 );',
    '  float ang = fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) ) * 6.2831853, ao = 0.0;',
    '  for ( int i = 0; i < 12; i ++ ) {',
    '    float f = ( float( i ) + 0.5 ) / 12.0, a = ang + float( i ) * 2.399963;',
    '    vec2 off = vec2( cos( a ) / uAspect, sin( a ) ) * rad * sqrt( f );',
    '    vec3 v = viewPos( vUv + off ) - p; float dist = length( v );',
    '    ao += max( 0.0, dot( n, v ) / ( dist + 1e-4 ) - 0.24 ) * ( 1.0 - smoothstep( uRadius * 0.5, uRadius * 1.6, dist ) );',
    '  }',
    '  gl_FragColor = vec4( vec3( clamp( 1.0 - uStrength * 1.3 * fade * ao / 12.0, 0.0, 1.0 ) ), 1.0 );',
    '}'].join('\n');
  var BLUR_F = [
    '#include <packing>',
    'uniform sampler2D tAO; uniform sampler2D tDepth; uniform vec2 uTexel; uniform float uNear; uniform float uFar; varying vec2 vUv;',
    'float lin( vec2 uv ) { return -perspectiveDepthToViewZ( texture2D( tDepth, uv ).x, uNear, uFar ); }',
    'void main() {',
    '  float z0 = lin( vUv ), s = 0.0, w = 0.0;',
    '  for ( int x = -2; x <= 2; x ++ ) for ( int y = -2; y <= 2; y ++ ) {',
    '    vec2 o = vec2( float( x ), float( y ) ) * uTexel; float z = lin( vUv + o ), wt = exp( -abs( z - z0 ) / ( 0.03 * z0 + 0.1 ) );',
    '    s += texture2D( tAO, vUv + o ).r * wt; w += wt;',
    '  }',
    '  gl_FragColor = vec4( vec3( s / w ), 1.0 );',
    '}'].join('\n');
  var COMP_F = [
    'uniform sampler2D tColor; uniform sampler2D tAO; uniform float uExposure; uniform float uAO; varying vec2 vUv;',
    'vec3 rrt( vec3 v ) { vec3 a = v * ( v + 0.0245786 ) - 0.000090537; vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081; return a / b; }',
    'vec3 aces( vec3 c ) {',
    '  const mat3 I = mat3( vec3( 0.59719, 0.07600, 0.02840 ), vec3( 0.35458, 0.90834, 0.13383 ), vec3( 0.04823, 0.01566, 0.83777 ) );',
    '  const mat3 O = mat3( vec3( 1.60475, -0.10208, -0.00327 ), vec3( -0.53108, 1.10813, -0.07276 ), vec3( -0.07367, -0.00605, 1.07602 ) );',
    '  return clamp( O * rrt( I * c ), 0.0, 1.0 );',
    '}',
    'vec3 srgb( vec3 c ) { return mix( pow( c, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), c * 12.92, vec3( lessThanEqual( c, vec3( 0.0031308 ) ) ) ); }',
    'void main() {',
    '  vec3 c = texture2D( tColor, vUv ).rgb * mix( 1.0, texture2D( tAO, vUv ).r, uAO );',
    '  c = aces( c * uExposure / 0.6 );',
    '  float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ); c = clamp( mix( vec3( l ), c, 1.05 ), 0.0, 1.0 );',
    '  c = srgb( c ) * mix( 0.88, 1.0, smoothstep( 0.95, 0.35, length( vUv - 0.5 ) ) );',
    '  gl_FragColor = vec4( c, 1.0 );',
    '}'].join('\n');
  function post(T, renderer) {
    var cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new T.Mesh(new T.PlaneGeometry(2, 2)), qs = new T.Scene(); qs.add(quad); quad.frustumCulled = false;
    var main = null, ao1 = null, ao2 = null, w = 0, h = 0;
    function mat(fs, u) { return new T.ShaderMaterial({ uniforms: u, vertexShader: QUAD_V, fragmentShader: fs, depthTest: false, depthWrite: false }); }
    var aoM = mat(AO_F, { tDepth: { value: null }, uProj: { value: new T.Matrix4() }, uProjInv: { value: new T.Matrix4() }, uRadius: { value: 2.2 }, uStrength: { value: 1.25 }, uAspect: { value: 1 } });
    var blurM = mat(BLUR_F, { tAO: { value: null }, tDepth: { value: null }, uTexel: { value: new T.Vector2() }, uNear: { value: 0.5 }, uFar: { value: 9000 } });
    var compM = mat(COMP_F, { tColor: { value: null }, tAO: { value: null }, uExposure: { value: 1 }, uAO: { value: 0.85 } });
    function free() { [main, ao1, ao2].forEach(function (t) { if (t) { if (t.depthTexture) t.depthTexture.dispose(); t.dispose(); } }); main = ao1 = ao2 = null; }
    function size(W, H) {
      if (W === w && H === h) return; w = W; h = H;
      free();
      main = new T.WebGLRenderTarget(W, H, { type: T.HalfFloatType, samples: 4 });
      main.depthTexture = new T.DepthTexture(W, H); main.depthTexture.type = T.UnsignedIntType;
      ao1 = new T.WebGLRenderTarget(Math.ceil(W / 2), Math.ceil(H / 2)); ao2 = ao1.clone();
    }
    function pass(m, target) { quad.material = m; renderer.setRenderTarget(target); renderer.render(qs, cam); }
    return {
      dispose: function () { free(); w = h = 0; },
      render: function (scene, camera, W, H, exposure) {
        size(W, H);
        // r147 applies the renderer's tone mapping even inside a render target; the composite does it once, here
        var tm = renderer.toneMapping; renderer.toneMapping = T.NoToneMapping;
        renderer.setRenderTarget(main); renderer.render(scene, camera);
        renderer.toneMapping = tm;
        aoM.uniforms.tDepth.value = main.depthTexture; aoM.uniforms.uProj.value.copy(camera.projectionMatrix); aoM.uniforms.uProjInv.value.copy(camera.projectionMatrixInverse); aoM.uniforms.uAspect.value = camera.aspect;
        pass(aoM, ao1);
        blurM.uniforms.tAO.value = ao1.texture; blurM.uniforms.tDepth.value = main.depthTexture; blurM.uniforms.uTexel.value.set(2 / W, 2 / H); blurM.uniforms.uNear.value = camera.near; blurM.uniforms.uFar.value = camera.far;
        pass(blurM, ao2);
        compM.uniforms.tColor.value = main.texture; compM.uniforms.tAO.value = ao2.texture; compM.uniforms.uExposure.value = exposure;
        pass(compM, null);
      }
    };
  }

  /* ---------- the realistic view ---------- */
  // v: { renderer, scene, camera, sun, hemi, fog, MAT }. Everything it adds hangs off one group in the scene.
  function create(T, v) {
    var renderer = v.renderer, scene = v.scene, MAT = v.MAT, aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    var low = coarse || Math.min(screen.width, screen.height) < 600 || !renderer.capabilities.isWebGL2;
    var X = drawTextures(T, aniso), time = { value: 0 }, sunDir = { value: new T.Vector3(0, 1, 0) }, snowOn = { value: 1 };
    var root = new T.Group(), roofG = new T.Group(); root.visible = false; roofG.visible = false; scene.add(root); scene.add(roofG);
    var self = { root: root, low: low }, season = null, TX = null, loading = false, farG = new T.Group(); root.add(farG); // the forest beyond the lot

    /* materials */
    // cards whose aSnow attribute says how much snow they hold
    function snowShader(m, key) {
      return patch(m, key, { uSnow: snowOn },
        [WORLD_V, WORLD_V2, ['#include <common>', '$\nattribute float aSnow;\nvarying float vSnowF;'], ['#include <begin_vertex>', '$\nvSnowF = aSnow;']],
        [WORLD_F, ['#include <common>', '$\nuniform float uSnow;\nvarying float vSnowF;'], ['#include <map_fragment>', '$' + cover('vec2( ' + m.map.image.width + '.0, ' + m.map.image.height + '.0 )')], ['#include <color_fragment>', '$\n{ float sn = uSnow * smoothstep( 0.42, 0.78, vSnowF + ( rNoise( vRW.xz * 0.9 + vRW.y ) - 0.5 ) * 0.45 ); diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.84, 0.87, 0.92 ), sn ); }'], noFlip(T)]);
    }
    var M = {};
    M.terrain = new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 1 });
    var pk = peakNoise(T, aniso);
    M.peaks = patch(new T.MeshStandardMaterial({ roughness: 1 }), 'peaks', { uWin: snowOn, uRing: { value: RING }, uPk: { value: pk.tex }, uPkS: { value: pk.slope } }, [WORLD_V, WORLD_V2], [WORLD_F].concat(PEAK_F));
    M.pine = snowShader(new T.MeshStandardMaterial({ map: X.pine, alphaTest: 0.4, side: T.DoubleSide, roughness: 0.9 }), 'pine');
    M.spruce = snowShader(new T.MeshStandardMaterial({ map: X.spruce, alphaTest: 0.4, side: T.DoubleSide, roughness: 0.9 }), 'spruce');
    M.twigs = snowShader(new T.MeshStandardMaterial({ map: X.twigs, alphaTest: 0.4, side: T.DoubleSide, roughness: 1 }), 'twigs');
    M.leaves = patch(new T.MeshStandardMaterial({ map: X.leaves, alphaTest: 0.38, side: T.DoubleSide, roughness: 0.75 }), 'leaves', {}, [], [['#include <map_fragment>', '$' + cover('vec2( ' + X.leaves.image.width + '.0, ' + X.leaves.image.height + '.0 )')], noFlip(T)]);
    M.bark = new T.MeshStandardMaterial({ color: 0x2a221c, roughness: 1 });
    M.aspenBark = new T.MeshStandardMaterial({ map: X.aspenBark, roughness: 0.85 });
    M.grass = patch(new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, side: T.DoubleSide }), 'grass', { uTime: time },
      [['#include <common>', '$\nattribute float aT;\nvarying float vT;\nuniform float uTime;'],
       ['#include <begin_vertex>', '$\nvT = aT;\n{ vec3 ip = vec3( instanceMatrix[ 3 ][ 0 ], 0.0, instanceMatrix[ 3 ][ 2 ] ); float w = sin( uTime * 1.6 + ip.x * 0.31 + ip.z * 0.19 ) + 0.55 * sin( uTime * 2.9 + ip.x * 0.83 - ip.z * 0.61 ); transformed.xz += vec2( 0.075, 0.045 ) * w * aT * aT; }']],
      [['#include <common>', '$\nvarying float vT;'], ['#include <color_fragment>', '$\ndiffuseColor.rgb *= mix( vec3( 0.022, 0.034, 0.012 ), vec3( 0.105, 0.14, 0.045 ), vT );'], noFlip(T)]);
    M.flowers = X.flowers.map(function (t, k) { return patch(new T.MeshStandardMaterial({ map: t, alphaTest: 0.5, side: T.DoubleSide, roughness: 0.8 }), 'flower', {}, [], [noFlip(T)]); });
    // Ground snow and the terrain in winter must look identical where they meet: same color, roughness,
    // grain (both map world x and z) and sparkle. SNOW_RGB is that color; uSpark switches the terrain's sparkle.
    var SNOW_RGB = [0.9, 0.92, 0.95], spark = { value: 1 }, vcol = { value: 0 };
    // the glints ride on the sun's light after its shadow (the sun is the last light lights_fragment_begin visits)
    var SPARKLE = ['#include <lights_fragment_begin>', '$\n#if NUM_DIR_LIGHTS > 0\n{ vec3 cell = floor( vRW * 22.0 ); float r = rHash( cell ); vec3 rn = normalize( vec3( rHash( cell + 1.7 ), rHash( cell + 3.1 ) + 0.6, rHash( cell + 5.3 ) ) - vec3( 0.5, 0.5, 0.5 ) );\n vec3 vd = normalize( cameraPosition - vRW ); float g = pow( max( dot( reflect( -uSunDir, rn ), vd ), 0.0 ), 260.0 ) * step( 0.9, r );\n reflectedLight.directSpecular += directLight.color * ( g * 2.6 * uSpark * ( 1.0 - smoothstep( 25.0, 110.0, length( cameraPosition - vRW ) ) ) ); }\n#endif'];
    var SPARKLE_U = ['#include <common>', '$\nuniform vec3 uSunDir;\nuniform float uSpark;'];
    M.snow = new T.MeshStandardMaterial({ roughness: 0.8 }); M.snow.color.setRGB(SNOW_RGB[0], SNOW_RGB[1], SNOW_RGB[2]);
    patch(M.snow, 'snow', { uSunDir: sunDir, uSpark: { value: 1 } }, [WORLD_V, WORLD_V2], [WORLD_F, SPARKLE_U, SPARKLE]);
    var tile = { value: 1 }, hole = { value: new T.Vector4(1, 1, -1, -1) };
    patch(M.terrain, 'terrain', { uTile: tile, uHole: hole, uSunDir: sunDir, uSpark: spark, uVCol: vcol }, [WORLD_V, WORLD_V2], [WORLD_F, SPARKLE_U, SPARKLE,
      ['#include <color_fragment>', '#if defined( USE_COLOR )\ndiffuseColor.rgb *= mix( vec3( 1.0 ), vColor, uVCol );\n#endif'],
      ['#include <common>', '$\nuniform float uTile;\nuniform vec4 uHole;\nuniform float uVCol;'],
      ['#include <clipping_planes_fragment>', '$\nif ( vRW.x > uHole.x && vRW.x < uHole.z && vRW.z > uHole.y && vRW.z < uHole.w ) discard;'],
      ['#include <map_fragment>', '#ifdef USE_MAP\n{ float dist = length( vRW - cameraPosition ); vec2 u1 = vUv * uTile;\n vec4 a = texture2D( map, u1 ), b = texture2D( map, u1 * 0.23 + vec2( 0.31, 0.17 ) ), c = texture2D( map, u1 * 0.061 + vec2( 0.7, 0.4 ) );\n float k = rNoise( vRW.xz / 70.0 ); vec4 t = mix( a, b, smoothstep( 0.3, 0.7, k ) ); t = mix( t, c, smoothstep( 120.0, 700.0, dist ) * 0.7 );\n t.rgb *= 0.86 + 0.28 * rNoise( vRW.xz / 23.0 + 5.0 ); diffuseColor *= t; }\n#endif'],
      ['#include <roughnessmap_fragment>', T.ShaderChunk.roughnessmap_fragment.replace('texture2D( roughnessMap, vUv )', 'texture2D( roughnessMap, vUv * uTile )')],
      ['#include <normal_fragment_maps>', T.ShaderChunk.normal_fragment_maps.replace('texture2D( normalMap, vUv )', 'texture2D( normalMap, vUv * uTile )')]]);

    /* sky and the light it gives */
    var SU = { uSun: { value: new T.Vector3(0, 1, 0) }, uZenith: { value: new T.Color() }, uHorizon: { value: new T.Color() }, uGlow: { value: new T.Color() }, uBelow: { value: new T.Color() }, uPk: { value: pk.tex } };
    var skyBg = skyMesh(T, SU, true, 1), envScene = new T.Scene(), skyEnv = skyMesh(T, SU, false, 1.35), pmrem = new T.PMREMGenerator(renderer), envRT = null, envDirty = true, envAt = 0;
    // Far things are drawn after near ones, so what the near ones hide is never shaded: the forest, then the peaks,
    // then the sky (which sits on the far plane) last of the opaque objects.
    skyBg.scale.setScalar(8000); skyBg.renderOrder = 1000; root.add(skyBg);
    skyEnv.scale.setScalar(50); envScene.add(skyEnv);
    var envGround = new T.Mesh(new T.CircleGeometry(80, 32), new T.MeshBasicMaterial({ color: 0xffffff, side: T.DoubleSide }));
    envGround.rotation.x = -Math.PI / 2; envGround.position.y = -3; envScene.add(envGround);
    function makeEnv() {
      var old = envRT; envRT = pmrem.fromScene(envScene, 0, 0.1, 100); scene.environment = envRT.texture; if (old) old.dispose();
      envDirty = false; envAt = performance.now();
    }
    // Desktop only: the glass and metal reflect the real surroundings (forest, peaks, snow), from a cube captured at
    // the middle of the house with the house hidden. It is captured again once the sun or the season has settled,
    // not while the sun slider moves. Everything else keeps the sky's light.
    var floatTargets = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');
    var refl = low || !floatTargets ? null : { rt: new T.WebGLCubeRenderTarget(256, { type: T.HalfFloatType }), dirty: true, at: 0, ready: false, off: false }, reflMats = [];
    if (refl) refl.cam = new T.CubeCamera(1, 9000, refl.rt);
    function reflOn() { return !!refl && refl.ready && !refl.off; }
    function reflDirty() { if (refl) { refl.dirty = true; refl.at = performance.now(); } }
    function reflShow() { reflMats.forEach(function (m) { m.envMap = reflOn() ? refl.rt.texture : null; m.needsUpdate = true; }); glassLight(); }
    function captureRefl() {
      var hide = [roofG].concat(model.grass, built0 && built0.groups || []), was = hide.map(function (o) { return o.visible; }), au = renderer.shadowMap.autoUpdate;
      refl.dirty = false; // a capture that throws is not retried every frame
      try {
        hide.forEach(function (o) { o.visible = false; }); renderer.shadowMap.autoUpdate = false;
        refl.cam.position.set(0, 7, 0); refl.cam.update(renderer, scene); // CubeCamera renders without tone mapping
      } finally {
        renderer.shadowMap.autoUpdate = au; hide.forEach(function (o, i) { o.visible = was[i]; });
      }
      if (!refl.ready) { refl.ready = true; reflShow(); } // until now they reflected the sky, not an empty cube
    }

    /* terrain, peaks, far forest */
    var tRings = radii(0, 150, 6, 1.0).concat(radii(150, RING, 6, 1.045).slice(1));
    var terrain = new T.Mesh(polarGeo(T, tRings, function (x, z) { return groundH(x, z); }, terrainColor, 1 / 6.5), M.terrain);
    terrain.receiveShadow = true; root.add(terrain);
    var pSeg = low ? 384 : 640, pRings = radii(RING, FAR, RING * 2 * Math.PI / pSeg, 1 + 2 * Math.PI / pSeg), pGeo = polarGeo(T, pRings, peakH, null, 1 / 6.5, pSeg); // cells about square
    // The terrain's outer edge is a straight line between its SEG vertices, which the peaks' finer first ring would
    // not follow, leaving cracks. That ring is laid along the edge instead, 0.6 ft under it.
    (function () {
      var P = pGeo.attributes.position.array;
      for (var k = 0; k <= pSeg; k++) {
        var f = k / pSeg * SEG, j = Math.min(SEG - 1, Math.floor(f)), u = f - j, a0 = j / SEG * Math.PI * 2, a1 = (j + 1) / SEG * Math.PI * 2;
        var x0 = Math.cos(a0) * RING, z0 = Math.sin(a0) * RING, x1 = Math.cos(a1) * RING, z1 = Math.sin(a1) * RING;
        P[k * 3] = x0 + (x1 - x0) * u; P[k * 3 + 2] = z0 + (z1 - z0) * u;
        P[k * 3 + 1] = groundH(x0, z0) * (1 - u) + groundH(x1, z1) * u - 0.6;
      }
      pGeo.computeVertexNormals();
    })();
    // the height and the up component of the normal of the peaks' mesh at x, z, read off its polar grid
    function peakAt(x, z) {
      var r = Math.hypot(x, z), a = Math.atan2(z, x), lo = 0, hi = pRings.length - 1, n = pSeg + 1, P = pGeo.attributes.position.array, N = pGeo.attributes.normal.array;
      if (a < 0) a += Math.PI * 2;
      while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (pRings[mid] <= r) lo = mid; else hi = mid; }
      var fr = clamp((r - pRings[lo]) / (pRings[hi] - pRings[lo]), 0, 1), fk = a / (Math.PI * 2) * pSeg, k = Math.min(pSeg - 1, Math.floor(fk)); fk -= k;
      function lerp2(A) { var i0 = lo * n + k, i1 = hi * n + k; return (A[i0 * 3 + 1] * (1 - fk) + A[i0 * 3 + 4] * fk) * (1 - fr) + (A[i1 * 3 + 1] * (1 - fk) + A[i1 * 3 + 4] * fk) * fr; }
      return [lerp2(P), lerp2(N)];
    }
    var peaks = new T.Mesh(pGeo, M.peaks); peaks.renderOrder = 2; root.add(peaks);
    // the forest beyond the lot: one draw of baked impostors
    var imp = bakeImpostors(T, renderer, X, low ? 512 : 1024), impN = { value: imp.normal.texture };
    M.impostor = new T.MeshStandardMaterial({ map: imp.color.texture, alphaTest: 0.5, side: T.DoubleSide, roughness: 0.9 });
    patch(M.impostor, 'impostor', { uNrm: impN, uSnow: snowOn, uTiles: { value: imp.tiles } },
      [WORLD_V, WORLD_V2, ['#include <common>', '$\nattribute vec2 aQ;\nattribute float aTile;\nuniform float uTiles;\nvarying vec2 vRot;'],
       ['#include <uv_vertex>', '$\nvUv.x = ( vUv.x + aTile ) / uTiles;'],
       ['#include <begin_vertex>', '$\n{ vec2 ir = normalize( vec2( instanceMatrix[ 0 ][ 0 ], -instanceMatrix[ 0 ][ 2 ] ) ); vRot = vec2( ir.x * aQ.x - ir.y * aQ.y, ir.y * aQ.x + ir.x * aQ.y ); }']],
      [WORLD_F, ['#include <common>', '$\nuniform sampler2D uNrm;\nuniform float uSnow;\nvarying vec2 vRot;'],
       ['#include <map_fragment>', '{ vec4 tex = texture2D( map, vUv ); diffuseColor *= vec4( tex.rgb * tex.rgb, tex.a ); }' + cover('vec2( ' + imp.color.width + '.0, ' + imp.color.height + '.0 )')],
       ['#include <color_fragment>', '$\n{ float sn = uSnow * smoothstep( 0.32, 0.7, texture2D( uNrm, vUv ).a + ( rNoise( vRW.xz * 0.9 + vRW.y ) - 0.5 ) * 0.45 ); diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.84, 0.87, 0.92 ), sn ); }'],
       noFlip(T),
       ['#include <normal_fragment_maps>', '$\n{ vec3 tn = texture2D( uNrm, vUv ).xyz * 2.0 - 1.0; tn.z *= faceDirection; vec3 nw = vec3( vRot.x * tn.x + vRot.y * tn.z, tn.y, -vRot.y * tn.x + vRot.x * tn.z ); normal = normalize( ( viewMatrix * vec4( nw, 0.0 ) ).xyz ); }']]);
    (function () {
      var R = rng(31), sp = low ? 18 : 12, pts = [];
      for (var z = -RING; z < RING; z += sp) for (var x = -RING; x < RING; x += sp) {
        var px = x + (R() - 0.5) * sp, pz = z + (R() - 0.5) * sp, r = Math.hypot(px, pz);
        if (r < 210 || r > RING - 30 || outside(LOT, px, pz) < 26) continue;
        if (R() > 0.35 + 0.65 * sstep(210, 470, r)) continue; // thinner near the clearing
        if (px < LOT.x0 && Math.abs(pz + 9) < 22) continue; // the road in from the west
        if (forestMask(px, pz) + 0.25 * sstep(300, 900, r) < 0.12 + R() * 0.12) continue;
        pts.push([px, pz, groundH(px, pz) - 0.5, 1]);
      }
      // on up the lower slopes of the peaks, off the steepest ground, thinning and shrinking toward the treeline
      var sp2 = low ? 20 : 16, RF = 2900;
      for (z = -RF; z < RF; z += sp2) for (x = -RF; x < RF; x += sp2) {
        px = x + (R() - 0.5) * sp2 * 1.8; pz = z + (R() - 0.5) * sp2 * 1.8; r = Math.hypot(px, pz);
        if (r < RING - 30 || r > RF || R() < 0.2) continue;
        var pa = r < RING ? [groundH(px, pz), 1] : peakAt(px, pz), y = pa[0], steep = Math.sqrt(Math.max(0, 1 - pa[1] * pa[1])) / Math.max(pa[1], 0.05), tl = 320 + 80 * fbm(px / 520 + 3, pz / 520, 3);
        if (steep > 0.8 || y > tl + R() * 30) continue;
        if (forestMask(px, pz) + 0.3 - 0.6 * sstep(tl - 140, tl, y) < 0.1 + R() * 0.15) continue;
        pts.push([px, pz, y - 1.5 - 5 * steep, 1 - 0.55 * sstep(tl - 120, tl, y)]);
      }
      pts.sort(function (a, b) { return (a[0] * a[0] + a[1] * a[1]) - (b[0] * b[0] + b[1] * b[1]); }); // near to far, from the lot
      var geo = impostorGeo(T), tile = new Float32Array(pts.length), im, m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), s = new T.Vector3(), c = new T.Color();
      pts.forEach(function (pt, i) {
        // stands: lodgepole in patches, subalpine fir mixed into the spruce, more of both higher up
        var n = fbm(pt[0] / 160 - 3, pt[1] / 160 + 8, 2), k = n > 0.18 ? 3 : (R() < 0.3 ? 2 : (R() < 0.5 ? 0 : 1));
        tile[i] = k;
      });
      geo.setAttribute('aTile', new T.InstancedBufferAttribute(tile, 1));
      im = new T.InstancedMesh(geo, M.impostor, pts.length);
      pts.forEach(function (pt, i) {
        var h = ((tile[i] === 3 ? 44 : 48) + R() * 26) * pt[3], k = h / 60, w = 60 * IMP_HT / 2 * k, ht = 60 * IMP_HT * k;
        e.set(0, R() * 6.2832, 0); q.setFromEuler(e); p.set(pt[0], pt[2], pt[1]); s.set(w, ht, w);
        m4.compose(p, q, s); im.setMatrixAt(i, m4);
        var v = 0.62 + R() * 0.42; c.setRGB(v * (0.95 + R() * 0.1), v * (0.97 + R() * 0.06), v * (0.95 + R() * 0.1)); im.setColorAt(i, c);
      });
      im.frustumCulled = false; im.renderOrder = 1; farG.add(im);
    })();

    /* near trees, where the plain view's trees stand */
    var nearG = new T.Group(); root.add(nearG); var treeList = [], leafMeshes = [], twigMeshes = [];
    function buildTrees(land) {
      var spots = land.trees.children.map(function (g) { return [g.position.x, g.position.z]; }), R = rng(17);
      var kinds = { pine: [], spruce: [], aspen: [] };
      spots.forEach(function (s) {
        var n = fbm(s[0] / 70 + 2, s[1] / 70 - 1, 2), k = n > 0.3 ? 'aspen' : (s[1] < -30 || n < 0.02 ? 'spruce' : 'pine');
        var h = k === 'aspen' ? 30 + R() * 12 : k === 'spruce' ? 44 + R() * 22 : 40 + R() * 16;
        kinds[k].push({ x: s[0], z: s[1], h: h, rot: R() * 6.3 });
      });
      var dens = low ? 0.6 : 1, m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), sc = new T.Vector3();
      function place(list, geos, mats, H, rad) {
        geos.forEach(function (geo, gi) {
          var mine = list.filter(function (t, i) { return i % geos.length === gi; });
          if (!mine.length) return;
          mats.forEach(function (mt, mi) {
            if (!geo[mi]) return;
            var im = new T.InstancedMesh(geo[mi], mt, mine.length);
            mine.forEach(function (t, i) { var k = t.h / H; e.set(0, t.rot, 0); q.setFromEuler(e); p.set(t.x, groundH(t.x, t.z), t.z); sc.set(k, k, k); m4.compose(p, q, sc); im.setMatrixAt(i, m4); });
            im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; nearG.add(im);
            if (mt === M.leaves) leafMeshes.push(im); if (mt === M.twigs) twigMeshes.push(im);
          });
        });
        list.forEach(function (t) { treeList.push({ x: t.x, z: t.z, top: t.h, rad: rad * t.h / H }); });
      }
      var pines = [1, 2, 3].map(function (s) { var g = conifer(T, 'pine', s, dens); return [g.trunk, g.foliage]; });
      var spruces = [4, 5, 6].map(function (s) { var g = conifer(T, 'spruce', s, dens); return [g.trunk, g.foliage]; });
      var aspens = [7, 8].map(function (s) { var g = aspen(T, s); return [g.wood, g.leaves, g.twigs]; });
      place(kinds.pine, pines, [M.bark, M.pine], TREE_H.pine, 5.2);
      place(kinds.spruce, spruces, [M.bark, M.spruce], TREE_H.spruce, 9.5);
      place(kinds.aspen, aspens, [M.aspenBark, M.leaves, M.twigs], TREE_H.aspen, 7);
    }

    /* model-dependent pieces: roof snow, ground snow, grass */
    var model = { grass: [], groundSnow: null, roofSnow: null, mound: null };
    function clearModel() {
      model.grass.forEach(function (m) { root.remove(m); m.geometry.dispose(); m.dispose(); });
      if (model.groundSnow) { root.remove(model.groundSnow); model.groundSnow.geometry.dispose(); }
      if (model.roofSnow) { roofG.remove(model.roofSnow); model.roofSnow.geometry.dispose(); }
      if (model.mound) { root.remove(model.mound); model.mound.geometry.dispose(); }
      model = { grass: [], groundSnow: null, roofSnow: null, mound: null };
    }
    // the share of grass tufts drawn; the frame-time guard can lower it
    var grassShare = 1;
    function setGrass(f) { grassShare = f; model.grass.forEach(function (m) { if (m.userData.full !== undefined) m.count = Math.round(m.userData.full * f); }); }
    function buildModel(R) {
      clearModel();
      var S = siteInfo(R), dr = S.plow.filter(function (r) { return Math.abs(r.z1 - r.z0 - 10) < 0.6 && r.x1 - r.x0 > 10; });
      if (dr.length) driveU.value.set(Math.min.apply(null, dr.map(function (r) { return r.x0; })), (dr[0].z0 + dr[0].z1) / 2, Math.max.apply(null, dr.map(function (r) { return r.x1; })), 1); else driveU.value.set(0, 0, 0, 0);
      model.grass = grassField(T, S, treeList, M, low ? 11000 : 95000, time);
      model.grass.forEach(function (m) { root.add(m); });
      setGrass(grassShare);
      model.groundSnow = new T.Mesh(groundSnowGeo(T, S, treeList, low ? 2 : 1), M.snow); model.groundSnow.receiveShadow = true; root.add(model.groundSnow);
      model.roofSnow = new T.Mesh(roofSnowGeo(T, R), M.snow); model.roofSnow.castShadow = true; model.roofSnow.receiveShadow = true; roofG.add(model.roofSnow);
      if (S.mound) { model.mound = new T.Mesh(moundGeo(T, S), M.terrain); model.mound.receiveShadow = true; root.add(model.mound); }
      if (R.o.found === 'crawl') hole.value.set(-15.33, -11.33, 15.33, 11.33); else hole.value.set(1, 1, -1, -1);
    }

    /* the building's own materials, upgraded while the realistic view is on and put back after */
    var saved = [];
    // triplanar: on walls and posts the boards run up and down, on soffits and decks east-west
    var TRI_V = [WORLD_V, WORLD_V2], TRI_F = function (key) {
      return [WORLD_F, ['#include <common>', '$\nuniform float uTri;\nvec4 tri( sampler2D t ) { vec3 b = pow( abs( vRN ), vec3( 4.0 ) ); b /= b.x + b.y + b.z; return texture2D( t, vRW.yz * uTri ) * b.x + texture2D( t, vRW.xz * uTri ) * b.y + texture2D( t, vRW.yx * uTri ) * b.z; }'],
        ['#include <map_fragment>', '#ifdef USE_MAP\ndiffuseColor *= tri( map );\n#endif'],
        ['#include <roughnessmap_fragment>', 'float roughnessFactor = roughness;\n#ifdef USE_ROUGHNESSMAP\nroughnessFactor *= tri( roughnessMap ).g;\n#endif']];
    };
    // gravel: patches of darker, coarser stone and warmer dust, and two packed wheel ruts down the drive (uDrive is
    // its x0, center z and x1, and w = 1 when there is one), so it doesn't read as poured concrete
    var driveU = { value: new T.Vector4(0, 0, 0, 0) };
    var GRAVEL_F = TRI_F().map(function (e) {
      return e[0] !== '#include <map_fragment>' ? e : [e[0], '#ifdef USE_MAP\n{ vec4 g = tri( map ); float n1 = rNoise( vRW.xz / 7.0 ), n2 = rNoise( vRW.xz / 1.7 + 3.0 );\n g.rgb *= 0.6 + 0.6 * n1 + 0.2 * ( n2 - 0.5 ); g.rgb *= mix( vec3( 0.95, 0.97, 1.0 ), vec3( 1.14, 1.0, 0.8 ), smoothstep( 0.35, 0.8, n1 ) );\n if ( uDrive.w > 0.5 && vRW.x > uDrive.x && vRW.x < uDrive.z ) { float dz = abs( abs( vRW.z - uDrive.y ) - 2.6 ); g.rgb *= 1.0 - 0.36 * exp( -dz * dz / 0.55 ) * ( 0.7 + 0.3 * n2 ); }\n diffuseColor *= g; }\n#endif'];
    }).concat([['#include <common>', '$\nuniform vec4 uDrive;']]);
    var INSIDE = /^(int|fix|furn|floor|wallf|insul|plumb|elec)$/;
    var hidden = [], glass = [], daylight = 1;
    // outside glass reflects less as the light goes, so a lit room shows through at dusk
    function glassLight() { glass.forEach(function (m) { m.envMapIntensity = (reflOn() ? 2 : 1.3) * (0.25 + 0.75 * daylight); }); }
    function upgrade(built, on) {
      hidden.forEach(function (o) { o.visible = true; }); hidden = [];
      saved.forEach(function (s) {
        if (s.m.normalMap && s.m.normalMap !== s.p.normalMap) s.m.normalMap.dispose(); // the clone upgrade() made
        Object.assign(s.m, s.p); s.m.color.setHex(s.c); s.m.needsUpdate = true;
        // the baseline goes back to the plain opacity (apply() only records one for materials it hasn't seen)
        if (s.glass && s.m.userData.baseT !== undefined) s.m.userData.baseO = s.baseO !== undefined ? s.baseO : s.p.opacity;
      });
      saved = []; glass = []; reflMats = [];
      if (!on || !built) return;
      var seen = [];
      function keep(m) {
        var p = { map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap, roughness: m.roughness, metalness: m.metalness, envMap: m.envMap, envMapIntensity: m.envMapIntensity, onBeforeCompile: m.onBeforeCompile, customProgramCacheKey: m.customProgramCacheKey };
        var s = { m: m, c: m.color.getHex(), p: p };
        // glass is the one material whose opacity changes here; the viewer's apply() keeps its own opacity
        // baseline in userData.baseO (for see-through), so that is saved and put back too
        if (m.name === 'glass') { p.opacity = m.opacity; s.glass = true; s.baseO = m.userData.baseO; }
        saved.push(s);
      }
      function repeatOf(m) { return m.map ? m.map.repeat : new T.Vector2(1, 1); }
      built.groups.forEach(function (g) {
        var inside = INSIDE.test(g.userData.L);
        g.traverse(function (o) {
          if (o.isMesh && o.material && o.material.name === 'mound') { o.visible = false; hidden.push(o); } // the rise stands in for it
          var m = o.material; if (!m || !m.isMeshStandardMaterial || seen.indexOf(m) >= 0) return; seen.push(m);
          var n = m.name; keep(m);
          // the plain view treats its hex colors as linear light; here they are paint colors (sRGB)
          m.color.convertSRGBToLinear();
          if (inside) m.envMapIntensity = 0.3;
          if (n === 'siding') { m.normalMap = X.sidingN.clone(); m.normalMap.needsUpdate = true; m.normalMap.repeat.copy(repeatOf(m)); m.roughness = 0.8; }
          else if (n === 'seam') { m.normalMap = X.seamN.clone(); m.normalMap.needsUpdate = true; m.normalMap.repeat.copy(repeatOf(m)); m.metalness = 0.55; m.roughness = 0.36; }
          else if (n === 'dark') { m.roughness = 0.42; m.metalness = 0.35; }
          else if (n === 'black') { m.roughness = 0.4; m.metalness = 0.35; }
          else if (n === 'frame') { m.roughness = 0.5; }
          else if (n === 'glass') { m.color.setRGB(0.1, 0.13, 0.15); m.opacity = 0.6; if (m.userData.baseO !== undefined) m.userData.baseO = 0.6; m.roughness = 0.02; m.metalness = 0.5; if (!inside) glass.push(m); }
          if (refl && !inside && (n === 'glass' || n === 'seam' || n === 'dark' || n === 'black')) { reflMats.push(m); if (reflOn()) m.envMap = refl.rt.texture; }
          if ((n === 'cedar' || n === 'lvl' || n === 'wood' || n === 'pt') && TX) { m.map = TX.planks.color; m.roughnessMap = TX.planks.rough; if (n === 'cedar') m.color.setRGB(0.82, 0.55, 0.38); else if (n === 'pt') m.color.setRGB(0.62, 0.6, 0.45); else m.color.setRGB(0.9, 0.7, 0.5); m.roughness = 1; patch(m, 'tri-wood', { uTri: { value: 1 / 3.28 } }, TRI_V, TRI_F()); }
          else if (n === 'gravel' && TX) { m.map = TX.gravel.color; m.roughnessMap = TX.gravel.rough; m.color.setRGB(0.24, 0.22, 0.19); m.roughness = 1; patch(m, 'tri-gravel', { uTri: { value: 1 / 6.5 }, uDrive: driveU }, TRI_V, GRAVEL_F); }
          m.needsUpdate = true;
        });
      });
      glassLight();
    }

    /* photo textures, loaded once */
    function loadTextures(done) {
      var sets = { snow: 'snow', meadow: 'meadow', gravel: 'gravel', bark: 'bark', planks: 'planks' }, out = {}, left = 0, failed = false, loader = new T.TextureLoader();
      Object.keys(sets).forEach(function (k) {
        out[k] = {};
        ['color', 'normal', 'rough'].forEach(function (map) {
          left++;
          loader.load(BASE + sets[k] + '_' + map + '.webp', function (t) {
            t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = aniso; t.encoding = map === 'color' ? T.sRGBEncoding : T.LinearEncoding;
            out[k][map] = t; if (--left === 0 && !failed) done(out);
          }, undefined, function () { failed = true; });
        });
      });
    }
    function applyTextures() {
      if (!TX) return;
      TX.snow.normal.repeat.set(0.4, 0.4); TX.snow.rough.repeat.set(0.4, 0.4); M.snow.normalMap = TX.snow.normal; M.snow.normalScale.set(0.35, 0.35); M.snow.roughnessMap = TX.snow.rough; M.snow.needsUpdate = true;
      M.bark.map = TX.bark.color; M.bark.normalMap = TX.bark.normal; M.bark.roughnessMap = TX.bark.rough; M.bark.color.setRGB(0.32, 0.31, 0.31); M.bark.needsUpdate = true;
      setSeason(season, true);
    }

    function setSeason(s, force) {
      if (s === season && !force) return; season = s;
      var sum = s === 'summer';
      snowOn.value = sum ? 0 : 1;
      if (TX) {
        var set = sum ? TX.meadow : TX.snow;
        M.terrain.map = sum ? set.color : null; M.terrain.normalMap = set.normal; M.terrain.roughnessMap = set.rough; tile.value = sum ? 6.5 / 95 : 1;
        if (sum) M.terrain.color.setHex(0xc9c7a2); else M.terrain.color.setRGB(SNOW_RGB[0], SNOW_RGB[1], SNOW_RGB[2]); M.terrain.normalScale.set(sum ? 1 : 0.35, sum ? 1 : 0.35);
      } else { M.terrain.map = null; M.terrain.normalMap = null; M.terrain.roughnessMap = null; if (sum) M.terrain.color.setHex(0x56603a); else M.terrain.color.setRGB(SNOW_RGB[0], SNOW_RGB[1], SNOW_RGB[2]); }
      M.terrain.roughness = sum ? 1 : 0.8; spark.value = sum ? 0 : 1; vcol.value = sum ? 1 : 0;
      M.terrain.needsUpdate = true;
      leafMeshes.forEach(function (m) { m.visible = sum; }); twigMeshes.forEach(function (m) { m.visible = !sum; });
      showSeason(); // ground snow, roof snow and grass follow the season
      envDirty = true; reflDirty();
    }

    var P = low || !floatTargets ? null : post(T, renderer), shadow = { size: v.sun.shadow.mapSize.x, ext: v.sun.shadow.camera.right };
    function setShadow(size, ext) {
      var sh = v.sun.shadow, c = sh.camera;
      if (sh.mapSize.x !== size) { sh.mapSize.set(size, size); if (sh.map) { sh.map.dispose(); sh.map = null; } }
      c.left = c.bottom = -ext; c.right = c.top = ext; c.updateProjectionMatrix();
    }

    var enabled = false, built0 = null, treesBuilt = false, horizon = new T.Color(), usePost = !!P;
    // Phones draw at 1.5x their pixel ratio while this view is on. The guard below can lower it further.
    var ratioCap = low ? 1.5 : null;
    function ratio() { return ratioCap === null ? null : Math.min(window.devicePixelRatio || 1, ratioCap); }
    // Frame-rate guard. After the view turns on it watches the time between frames, 45 frames at a time.
    // While the median gap is over 22 ms (under about 45 fps) it takes the next step down, then watches again.
    // A browser that caps animation at 30 fps to save power (iPhone Low Power Mode, Chrome's Energy Saver)
    // also gets the lighter steps, which suits a device saving power. It starts watching 30 frames after the
    // textures are in, once their shaders are rebuilt (or 6 s on, if they never arrive): the page loading
    // around it, the texture uploads and the shader builds would otherwise look like a slow device.
    var guard = { on: false, ready: false, step: 0, last: 0, skip: 0, dts: [] };
    function watch(now) {
      if (!guard.on) return;
      if (!guard.ready) { guard.last = now; return; }
      var dt = now - guard.last; guard.last = now;
      if (dt > 250) { guard.dts = []; guard.skip = Math.max(guard.skip, 10); return; } // paused or off screen: start the count again
      if (guard.skip > 0) { guard.skip--; return; }
      guard.dts.push(dt);
      if (guard.dts.length < 45) return;
      var s = guard.dts.slice().sort(function (a, b) { return a - b; });
      guard.median = s[s.length >> 1]; guard.dts = []; guard.skip = 15;
      if (guard.median > 22 && guard.step < STEPS.length) STEPS[guard.step++](); else guard.on = false;
    }
    var STEPS = [
      function () { setGrass(grassShare * 0.5); },
      function () { ratioCap = low ? 1 : 1.5; v.setPixelRatio(ratio()); },
      function () { if (P && usePost) { usePost = false; if (refl) { refl.off = true; reflShow(); } } else { setGrass(grassShare * 0.5); nearG.children.forEach(function (m) { m.castShadow = false; }); } }
    ];
    self.enable = function (on, R, land, built) {
      enabled = on; root.visible = on; roofG.visible = on; built0 = built;
      v.setPixelRatio(on ? ratio() : null);
      if (on && guard.step < STEPS.length) { guard.on = true; guard.last = 0; guard.dts = []; guard.skip = 30; guard.ready = !!TX; }
      if (on) {
        if (!treesBuilt) { buildTrees(land); treesBuilt = true; }
        if (!model.roofSnow) buildModel(R);
        if (!TX && !loading) {
          loading = true;
          loadTextures(function (t) { TX = t; applyTextures(); if (enabled) { upgrade(built0, true); v.refresh(); } reflDirty(); guard.ready = true; guard.skip = Math.max(guard.skip, 30); });
          setTimeout(function () { guard.ready = true; }, 6000); // textures that never come (a file:// page) don't hold it back
        }
        setShadow(low ? 1024 : 4096, low ? 72 : 90); envDirty = true; reflDirty();
      } else {
        scene.environment = null; setShadow(shadow.size, shadow.ext);
        if (envRT) { envRT.dispose(); envRT = null; } if (P) P.dispose();
      }
      upgrade(built, on);
      v.camera.far = on ? 9000 : 2600; v.camera.updateProjectionMatrix();
    };
    self.release = function () { upgrade(null, false); };
    self.rebuild = function (R, built) { built0 = built; if (!enabled) { clearModel(); return; } buildModel(R); upgrade(built, true); reflDirty(); };
    self.season = function (s) { setSeason(s); };
    self.sun = function (s, up) {
      daylight = up; glassLight();
      SU.uSun.value.copy(s.v); sunSky(SU, s.alt, up);
      sunDir.value.copy(s.v);
      var sum = season === 'summer';
      envGround.material.color.setRGB(sum ? 0.05 : 0.32, sum ? 0.06 : 0.34, sum ? 0.035 : 0.37).multiplyScalar(0.25 + 0.75 * up);
      v.sun.intensity = s.alt > 0 ? 2.35 * Math.min(1, s.alt * 4) : 0;
      v.sun.color.setRGB(1, 0.86 + 0.12 * up, 0.72 + 0.22 * up);
      v.hemi.intensity = 0.04;
      // distant ground fades into the horizon haze; below the horizon the sky shows that same haze
      horizon.copy(SU.uHorizon.value).multiplyScalar(1.1); SU.uBelow.value.copy(horizon).multiplyScalar(0.8);
      v.scene.background = null; v.fog.color.copy(horizon);
      envDirty = true; reflDirty();
    };
    // visibility: s is the viewer state in effect, e the explode amount. The last call is kept so a season
    // change, which the viewer makes without calling apply(), can swap snow and grass straight away.
    var shown = null;
    function showSeason() { if (shown) self.apply(shown[0], shown[1], shown[2]); }
    self.apply = function (s, e, cutOn) {
      shown = [s, e, cutOn];
      var winter = season === 'winter', plain = e === 0 && !cutOn;
      if (model.groundSnow) model.groundSnow.visible = winter && plain;
      if (model.roofSnow) roofG.visible = enabled && winter && s.snow && s.roof && plain && s.layers.roofing;
      model.grass.forEach(function (m) { m.visible = !winter && plain; });
      nearG.visible = !s.elev; farG.visible = !s.elev;
    };
    self.frame = function (now, camera) {
      time.value = now / 1000;
      watch(now);
      v.fog.near = 700; v.fog.far = 11000;
      if (envDirty && now - envAt > 150) makeEnv();
      if (refl && !refl.off && refl.dirty && now - refl.at > 350) captureRefl();
    };
    self.render = function (scene, camera, W, H, exposure) {
      if (usePost) P.render(scene, camera, W, H, exposure); else renderer.render(scene, camera);
    };
    self.trees = function () { return treeList; };
    self.debug = function () { return { M: M, SU: SU, imp: imp, refl: refl, sky: skyBg, envGround: envGround, peaks: peaks, model: model, X: X, guard: guard, ratioCap: ratioCap, usePost: usePost, grassShare: grassShare }; };
    return self;
  }

  return { create: create };
})();
