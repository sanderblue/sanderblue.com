/* Rime Cabin viewer: renderer, camera views, sun, layers, explode, section cut, picking and size labels. */
function startViewer(host, canvas, labelLayer, R0, cb) {
  var T = THREE, W = 800, H = 500, P = SCN.P;
  var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.localClippingEnabled = true;
  var scene = new T.Scene(), camera = new T.PerspectiveCamera(38, W / H, 0.5, 2600);
  var controls = new T.OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.minDistance = 2; controls.maxDistance = 520; controls.maxPolarAngle = Math.PI * 0.495;
  var tx = SCN.makeTextures(T), MAT = SCN.makeMats(T, tx);
  var hemi = new T.HemisphereLight(0xd4e6f4, 0xe9eff4, 0.8); scene.add(hemi);
  var sun = new T.DirectionalLight(0xfff1dc, 2.4);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  var sc = sun.shadow.camera; sc.left = -72; sc.right = 72; sc.top = 72; sc.bottom = -72; sc.near = 1; sc.far = 280;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.06;
  scene.add(sun); scene.add(sun.target);
  var glow = new T.PointLight(0xff8a3d, 0, 20, 2); glow.position.set(-6, 4.5, 2); scene.add(glow);
  var fog = new T.Fog(0xbcd8ec, 260, 1000); scene.fog = fog;

  var layerIds = R0.M.catalog.layers.map(function (l) { return l[0]; });
  var st = { roof: true, snow: false, see: false, dims: false, season: 'winter', hour: 12, explode: 0, cut: null, cutPos: 0, sel: null, room: null, hover: null, elev: false, layers: {} };
  ['found', 'floor', 'wallf', 'roof', 'sheath', 'insul', 'plumb', 'elec'].forEach(function (k) { st.layers[k] = false; });
  layerIds.forEach(function (k) { if (st.layers[k] === undefined) st.layers[k] = true; });
  // the starting layers are the finished cabin; a flyby shows that look whatever the viewer is set to
  var FLY_LOOK = { roof: true, see: false, dims: false, explode: 0, cut: null, sel: null, room: null, hover: null, elev: false, layers: Object.assign({}, st.layers) };
  var R = R0, built = null, land = null, snowObj = null, tintList = [], plane = new T.Plane(new T.Vector3(-1, 0, 0), 0), planes = [plane];

  function build() {
    if (built) scene.remove(built.root);
    if (land) { scene.remove(land.land); scene.remove(snowObj.ground); scene.remove(snowObj.roof); tintList.forEach(function (t) { scene.remove(t); }); }
    built = SCN.build(T, R, MAT);
    scene.add(built.root);
    land = SCN.landscape(T, MAT, R); scene.add(land.land);
    snowObj = SCN.snow(T, MAT, R); scene.add(snowObj.ground); scene.add(snowObj.roof);
    tintList = SCN.tints(T, R); tintList.forEach(function (t) { scene.add(t); });
    trees = land.trees.children.map(function (g) {
      var b = new T.Box3().setFromObject(g);
      return { x: g.position.x, z: g.position.z, top: b.max.y, rad: (b.max.x - b.min.x) / 2 };
    });
    seasonDone = null;
    built.mats = [];
    built.root.traverse(function (o) { if (o.material && built.mats.indexOf(o.material) < 0) built.mats.push(o.material); });
    tintList.forEach(function (t) { built.mats.push(t.material); });
    // the plan view takes in the garage when there is one
    views.plan = R.garage ? { p: [-12, 104, -2.9], t: [-12, 0, -3], fov: 34, roof: false, fit: true } : { p: [0, 96, 0.1], t: [0, 0, 0], fov: 34, roof: false, fit: true };
    // the long elevations take in the garage on the west end
    var gx = R.garage ? -12 : 0, gf = R.garage ? 12.5 : 9;
    views.N = { p: [gx, 10, -300], t: [gx, 10, 0], fov: gf, fit: true, elev: true };
    views.S = { p: [gx, 10, 300], t: [gx, 10, 0], fov: gf, fit: true, elev: true };
    var stove = R.parts.filter(function (p) { return p.it === 'MEC-STOVE' && p.glow; })[0];
    glow.visible = !!stove; if (stove) glow.position.set(stove.c[0] - 16, stove.c[1] + 0.4, stove.c[2] - 12 + 0.8);
    applySeason(); apply(true);
  }

  // ground, trees, peaks, sky and the light bounced off the ground follow the season
  var seasonDone = null;
  function applySeason() {
    if (seasonDone === st.season) return; seasonDone = st.season;
    var sum = st.season === 'summer';
    SCN.season(T, MAT, tx, land, built, st.season);
    hemi.groundColor.setHex(sum ? 0x5c6644 : 0xe9eff4);
    day.setHex(sum ? 0xa9cdea : 0xbcd8ec);
  }

  var SEE = /^(EXT-BB|WAL-ZIPR|FND-SKIRT|GAR-BB|GAR-SHEATH)$/, HIDE_SEE = /^(INT-DW|ENV-WALL|GAR-OSB|GAR-GYP)$/;
  function apply(clipChanged) {
    // during a flyby the cabin shows its finished outside; the viewer's own settings stay in st and come back after
    var s = fly ? Object.assign({}, st, FLY_LOOK) : st;
    var e = s.explode, cutOn = !!s.cut;
    built.groups.forEach(function (g) {
      var u = g.userData;
      g.visible = !!s.layers[u.L] && (!u.roofy || s.roof) && !(s.see && HIDE_SEE.test(u.it));
      g.position.set(u.ox * e * 3.5, u.ex * e * 4.2, u.oz * e * 3.5);
    });
    var snowOn = s.snow && s.season === 'winter';
    snowObj.roof.visible = snowOn && s.roof && e === 0 && !cutOn && s.layers.roofing;
    snowObj.ground.visible = snowOn && e === 0 && !cutOn;
    land.trees.visible = !s.elev;
    built.mats.forEach(function (m) {
      if (clipChanged || m.userData.cut !== cutOn) { m.clippingPlanes = cutOn ? planes : null; m.clipShadows = cutOn; m.needsUpdate = true; m.userData.cut = cutOn; }
    });
    built.groups.forEach(function (g) {
      var hi = s.sel && g.userData.it === s.sel, see = s.see && SEE.test(g.userData.it);
      g.traverse(function (o) {
        if (!o.material || o.material === MAT.glass || o.material === MAT.fire) return;
        var m = o.material, u = m.userData;
        if (u.baseT === undefined) { u.baseT = !!m.transparent; u.baseO = m.opacity; u.baseE = m.emissive ? m.emissive.getHex() : 0; u.baseEI = m.emissiveIntensity || 1; }
        if (o.userData.baseCS === undefined) o.userData.baseCS = o.castShadow;
        if (m.emissive) { m.emissive.setHex(hi ? 0xbd4f19 : u.baseE); m.emissiveIntensity = hi ? 0.55 : u.baseEI; }
        var wasT = m.transparent;
        if (see) { m.transparent = true; m.opacity = 0.12; m.depthWrite = false; }
        else { m.transparent = u.baseT; m.opacity = u.baseO; m.depthWrite = !u.baseT; }
        if (wasT !== m.transparent) m.needsUpdate = true;
        o.castShadow = !see && o.userData.baseCS;
      });
    });
    tintList.forEach(function (t) { t.material.opacity = t.userData.room === s.room ? 0.5 : (t.userData.room === s.hover ? 0.28 : 0); t.visible = !s.roof || s.see || e > 0 ? true : false; });
    labels.forEach(function (l) { l.el.style.display = s.dims ? '' : 'none'; });
  }

  function setCut(axis, pos) {
    st.cut = axis; st.cutPos = pos;
    if (axis === 'x') plane.set(new T.Vector3(-1, 0, 0), pos - 16);
    else if (axis === 'y') plane.set(new T.Vector3(0, -1, 0), pos);
    else if (axis === 'z') plane.set(new T.Vector3(0, 0, -1), pos - 12);
    apply();
  }

  // sun position for latitude 39.5 N at the solstices
  var LAT = 39.5 * Math.PI / 180;
  function sunVec() {
    var dec = (st.season === 'winter' ? -23.44 : 23.44) * Math.PI / 180, h = (st.hour - 12) * 15 * Math.PI / 180;
    var sa = Math.sin(LAT) * Math.sin(dec) + Math.cos(LAT) * Math.cos(dec) * Math.cos(h), alt = Math.asin(sa);
    var az = Math.atan2(Math.sin(h), Math.cos(h) * Math.sin(LAT) - Math.tan(dec) * Math.cos(LAT));
    return { alt: alt, v: new T.Vector3(-Math.sin(az) * Math.cos(alt), Math.sin(alt), Math.cos(az) * Math.cos(alt)) };
  }
  var day = new T.Color(0xbcd8ec), dusk = new T.Color(0x22313f), mid = new T.Color();
  function updateSun() {
    applySeason();
    var s = sunVec(), up = Math.max(0, Math.min(1, (s.alt * 180 / Math.PI + 3) / 14));
    sun.position.copy(s.v.clone().multiplyScalar(130)); sun.target.position.set(0, 4, 0);
    sun.intensity = s.alt > 0 ? 2.5 * Math.min(1, s.alt * 6) : 0;
    sun.color.setHex(up < 0.5 ? 0xffc48a : 0xfff1dc);
    hemi.intensity = 0.25 + 0.6 * up;
    mid.copy(dusk).lerp(day, up); scene.background = mid.clone(); fog.color.copy(mid);
    glow.intensity = 0.5 + 1.8 * (1 - up);
    renderer.toneMappingExposure = 0.8 + 0.2 * up;
    st.altDeg = Math.round(s.alt * 180 / Math.PI);
    return s;
  }

  // size labels projected from 3D points; side rules keep them on the faces you can see
  var labels = [];
  var sideS = function (c) { return c.z > 0; }, sideN = function (c) { return c.z < 0; }, sideE = function (c) { return c.x >= 0; }, sideW = function (c) { return c.x < 0; };
  function addLabel(X, Y, Z, text, side, minW) {
    var el = document.createElement('div'); el.className = 'dim'; el.textContent = text; labelLayer.appendChild(el);
    var p = P(X, Z); labels.push({ el: el, v: new T.Vector3(p[0], Y, p[1]), side: side, w: 0, minW: minW || 0 });
  }
  var FF = R0.G.FF;
  addLabel(16, 0.4, 26.5, '32 ft', sideS); addLabel(16, 0.4, -2.5, '32 ft', sideN);
  addLabel(34.5, 0.4, 12, '24 ft', sideE); addLabel(-2.6, 0.4, 5, '24 ft', function (c) { return !R.garage && sideW(c); });
  addLabel(33, FF + 17.6, 24, 'South wall 17 ft', sideS); addLabel(33, FF + 9.8, 0, 'North wall 9 ft', function (c) { return c.z < 0 || c.x > 25; });
  addLabel(16, 22.4, 12.5, 'Roof 4:12, snow slides north');
  addLabel(46, 5.2, 8, '500 gal propane tank', function (c) { return c.x > -25; }); addLabel(-4.4, FF + 8.6, 16.5, 'Covered entry', function (c) { return c.x < 0 && c.z > -40; });
  addLabel(16, FF + 17.5, 27.2, '3 ft overhang shades summer sun', sideS, 700);
  var gb = R0.M.garage && R0.M.garage.box;
  if (gb) addLabel(gb[0] + gb[2] / 2, 17, gb[1] + gb[3] / 2, 'Garage ' + gb[3] + ' x ' + gb[2] + ' ft', function (c) { return !!R.garage && c.x < 10; });

  function resize() {
    var r = host.getBoundingClientRect(); W = Math.max(280, Math.round(r.width)); H = Math.max(260, Math.round(r.height));
    renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
    labels.forEach(function (l) { l.w = 0; });
  }
  new ResizeObserver(resize).observe(host); resize();

  var views = {
    // Outside, where the page opens: from the southwest, the garage, covered entry and south glass in one view.
    // Composed at a 1.29 aspect; narrower screens pull back to keep the same sides in frame.
    se: { p: [-63.1, 18.9, 59], t: [-13, 10.1, -3.7], fov: 40, roof: true, fit: true, fitAspect: 1.29 },
    cover: { p: [35, 19, 46], t: [0, 8, 1], fov: 40, roof: true, fit: true }, // the drawing set's cover picture
    nw: { p: [46, 22, -56], t: [-4, 7, 0], fov: 38, roof: true, fit: true }, // from the northeast, clear of the garage
    plan: { p: [0, 96, 0.1], t: [0, 0, 0], fov: 34, roof: false, fit: true },
    inside: { p: [-13.6, FF + 5.6, 8.8], t: [-1, 5.4, -6], fov: 66, roof: true },
    exploded: { p: [52, 36, 70], t: [0, 13, 0], fov: 40, fit: true },
    N: { p: [0, 10, -300], t: [0, 10, 0], fov: 9, fit: true, elev: true },
    S: { p: [0, 10, 300], t: [0, 10, 0], fov: 9, fit: true, elev: true },
    E: { p: [300, 10, 0], t: [0, 10, 0], fov: 8, fit: true, elev: true },
    W: { p: [-300, 10, 0], t: [0, 10, 0], fov: 8, fit: true, elev: true },
    garage: { p: [-72, 16, 30], t: [-20, 6, -8], fov: 44, roof: true }
  };
  var tween = null;
  // a view's camera, pulled back on narrow screens so the "fit" views still take in the whole cabin
  function viewPose(name) {
    var v0 = views[name], k = v0.fit ? Math.max(1, (v0.fitAspect || (v0.elev ? 1.5 : 1.05)) / camera.aspect) : 1;
    return { p: v0.t.map(function (c, i) { return c + (v0.p[i] - c) * k; }), t: v0.t, fov: v0.fov };
  }
  function setView(name, instant) {
    var v0 = views[name]; if (!v0) return;
    endFly();
    var v = viewPose(name);
    tween = { t0: performance.now(), dur: instant ? 1 : 750, fp: camera.position.clone(), ft: controls.target.clone(), ffov: camera.fov, v: v };
    st.elev = !!v0.elev;
    if (v0.roof !== undefined) st.roof = v0.roof;
    if (v0.elev) st.roof = true;
    apply(); if (cb.onState) cb.onState();
  }

  // Drone flyby: one orbit around the house and garage that leaves from the Outside view, sweeps across the
  // front first, rises behind and comes back down to land on the Outside view again. The camera holds on the
  // middle of the buildings at a distance that keeps all of them in frame, and climbs wherever a tree would
  // block the view or stand in its way.
  var FLY = { secs: 24, inSecs: 2, landSecs: 2, fov: 40, margin: 0.1, n: 180, peakEl: 24, maxEl: 45 };
  var fly = null, trees = [], UP = new T.Vector3(0, 1, 0);
  function ease(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function rad(deg) { return deg * Math.PI / 180; }
  function dirAt(az, el) { return new T.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)); }

  // the finished outside of the house, garage and covered entry, counting instanced parts one by one
  function envelope() {
    var box = new T.Box3(), gb = new T.Box3(), m = new T.Matrix4();
    built.root.updateMatrixWorld(true);
    built.groups.forEach(function (g) {
      if (!/^(roofing|ext|open|sheath)$/.test(g.userData.L)) return;
      g.traverse(function (o) {
        if (!o.geometry) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        if (o.isInstancedMesh) for (var i = 0; i < o.count; i++) { o.getMatrixAt(i, m); box.union(gb.copy(o.geometry.boundingBox).applyMatrix4(m.premultiply(o.matrixWorld))); }
        else box.union(gb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld));
      });
    });
    box.min.y = Math.max(box.min.y, 0);
    return box;
  }
  // how far from c, looking back along dir, the camera must be for every corner of b to sit inside the frame
  function fitDist(b, c, dir) {
    var f = dir.clone().negate(), r = new T.Vector3().crossVectors(f, UP).normalize(), u = new T.Vector3().crossVectors(r, f), q = new T.Vector3();
    var tv = Math.tan(rad(FLY.fov) / 2) * (1 - FLY.margin), th = tv * camera.aspect, need = 0;
    for (var i = 0; i < 8; i++) {
      q.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).sub(c);
      var along = q.dot(dir);
      need = Math.max(need, along + Math.abs(q.dot(r)) / th, along + Math.abs(q.dot(u)) / tv);
    }
    return need;
  }
  // does a tree's canopy (a cone: its full radius 3 ft up, a point at the top) cut the line from a to b?
  function treeBlocks(t, a, b) {
    var dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz;
    var s = L2 ? Math.max(0, Math.min(1, ((t.x - a.x) * dx + (t.z - a.z) * dz) / L2)) : 0;
    var d = Math.hypot(a.x + dx * s - t.x, a.z + dz * s - t.z);
    return d < t.rad && a.y + (b.y - a.y) * s < t.top - (t.top - 3) * d / t.rad;
  }
  function clearAt(p, sights) {
    return trees.every(function (t) {
      if (Math.hypot(p.x - t.x, p.z - t.z) < t.rad + 4 && p.y < t.top + 4) return false; // would fly through it
      return sights.every(function (q) { return !treeBlocks(t, p, q); });
    });
  }
  function planFlight() {
    var b = envelope(), c = b.getCenter(new T.Vector3()), n = FLY.n;
    // start and end in line with the Outside view, at its height (kept between 4 and 15 degrees)
    var se = new T.Vector3().fromArray(viewPose('se').p).sub(c), az0 = Math.atan2(se.z, se.x);
    var el0 = Math.max(4, Math.min(15, Math.atan2(se.y, Math.hypot(se.x, se.z)) * 180 / Math.PI));
    // the buildings' mid-height outline and the top of the roof must stay in sight
    var sights = [c, new T.Vector3(c.x, b.max.y, c.z)];
    [[b.min.x, b.min.z], [b.max.x, b.min.z], [b.min.x, b.max.z], [b.max.x, b.max.z]].forEach(function (xz) { sights.push(new T.Vector3(xz[0], c.y, xz[1])); });
    var az = [], base = [], i;
    for (i = 0; i <= n; i++) {
      az.push(az0 - 2 * Math.PI * i / n); // from the southwest, east across the south glass first
      base.push(el0 + (FLY.peakEl - el0) * Math.sin(Math.PI * i / n)); // degrees, highest behind the house
    }
    // one distance for the whole orbit, the least that fits the buildings at every point of it
    function fitAll(els) {
      return els.reduce(function (m, el, k) { return Math.max(m, fitDist(b, c, dirAt(az[k], rad(el)))); }, 0);
    }
    // the heights that see past the trees at that distance: the extra climb each tree needs is widened
    // and smoothed, so the camera rises early and comes down late, and is added to the planned heights
    function climb(dist) {
      var extra = base.map(function (el0, k) {
        var el = el0;
        while (el < FLY.maxEl && !clearAt(c.clone().addScaledVector(dirAt(az[k], rad(el)), dist), sights)) el += 1;
        return el - el0;
      });
      var w = 6, span = function (k, fn) { for (var j = Math.max(0, k - w); j <= Math.min(n, k + w); j++) fn(j); };
      var wide = extra.map(function (_, k) { var m = 0; span(k, function (j) { m = Math.max(m, extra[j]); }); return m; });
      return wide.map(function (_, k) { var s = 0, cnt = 0; span(k, function (j) { s += wide[j]; cnt++; }); return base[k] + s / cnt; });
    }
    // distance and heights depend on each other; a few rounds settle them
    var els = base, dist = fitAll(els);
    for (var pass = 0; pass < 4; pass++) {
      var next = climb(dist), moved = next.some(function (el, k) { return Math.abs(el - els[k]) > 0.5; });
      els = next; dist = fitAll(els);
      if (!moved) break;
    }
    return { c: c, dist: dist, az: az, els: els };
  }
  function orbitPose(u) {
    var x = Math.max(0, Math.min(1, u)) * FLY.n, i = Math.min(FLY.n - 1, Math.floor(x)), f = x - i;
    var az = fly.az[i] + (fly.az[i + 1] - fly.az[i]) * f, el = fly.els[i] + (fly.els[i + 1] - fly.els[i]) * f;
    return { p: fly.c.clone().addScaledVector(dirAt(az, rad(el)), fly.dist), t: fly.c, fov: FLY.fov };
  }
  function vec(x) { return x.isVector3 ? x.clone() : new T.Vector3().fromArray(x); }
  function blend(a, b, k) {
    return { p: vec(a.p).lerp(vec(b.p), k), t: vec(a.t).lerp(vec(b.t), k), fov: a.fov + (b.fov - a.fov) * k };
  }
  function startFly() {
    if (fly) return;
    tween = null;
    if (st.sel || st.room) { st.sel = null; st.room = null; if (cb.onPart) cb.onPart(null); }
    fly = { t: 0, last: performance.now(), from: { p: camera.position.clone(), t: controls.target.clone(), fov: camera.fov } };
    apply(); // the flyby look puts taken-apart pieces back in place before the buildings are measured
    Object.assign(fly, planFlight());
    if (cb.onFlyby) cb.onFlyby('start');
  }
  // stopped: the camera stays where it is. landed: it has reached the Outside view.
  function endFly(landed) {
    if (!fly) return;
    fly = null;
    if (landed) { st.roof = true; st.elev = false; }
    apply();
    if (cb.onState) cb.onState();
    if (cb.onFlyby) cb.onFlyby(landed ? 'done' : 'stopped');
  }
  function stepFly(now) {
    // time only runs while the viewer is drawing, so a flight paused off screen or in a hidden tab picks up where it left off
    fly.t += Math.max(0, Math.min(0.25, (now - fly.last) / 1000)); fly.last = now;
    var t = fly.t, o = FLY.inSecs + FLY.secs, pose;
    if (t < FLY.inSecs) pose = blend(fly.from, orbitPose(0), ease(t / FLY.inSecs));
    else if (t < o) pose = orbitPose((1 - Math.cos(Math.PI * (t - FLY.inSecs) / FLY.secs)) / 2);
    else pose = blend(orbitPose(1), viewPose('se'), ease(Math.min(1, (t - o) / FLY.landSecs)));
    camera.position.copy(pose.p); controls.target.copy(pose.t); camera.fov = pose.fov; camera.updateProjectionMatrix();
    if (t >= o + FLY.landSecs) endFly(true);
  }
  controls.addEventListener('start', function () { endFly(); }); // a drag, pinch or scroll takes the controls back

  var ray = new T.Raycaster(), mouse = new T.Vector2();
  function visibleChain(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
  function pick(e) {
    var r = canvas.getBoundingClientRect(); mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    var targets = [];
    built.root.traverse(function (o) { if (o.isMesh && o.material !== MAT.glass && visibleChain(o)) targets.push(o); });
    if (!st.roof || st.see || st.explode > 0) tintList.forEach(function (t) { targets.push(t); });
    var hits = ray.intersectObjects(targets, false);
    for (var i = 0; i < hits.length; i++) {
      var h = hits[i];
      if (st.cut && plane.distanceToPoint(h.point) < 0) continue;
      if (h.object.userData.room) return { room: h.object.userData.room };
      var part = h.object.userData.part || (h.object.userData.parts && h.object.userData.parts[h.instanceId]);
      if (part) return { part: part };
    }
    return null;
  }
  canvas.addEventListener('pointermove', function (e) {
    if (e.buttons) return;
    var h = pick(e), room = h && h.room ? h.room : null;
    canvas.style.cursor = h ? 'pointer' : '';
    if (room !== st.hover) { st.hover = room; apply(); }
  });
  var down = null;
  canvas.addEventListener('pointerdown', function (e) { down = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', function (e) {
    if (!down || Math.abs(e.clientX - down[0]) + Math.abs(e.clientY - down[1]) > 5) return;
    var h = pick(e);
    if (h && h.room) { st.room = h.room; st.sel = null; apply(); if (cb.onRoom) cb.onRoom(h.room); }
    else if (h && h.part) { st.sel = h.part.it; st.room = null; apply(); if (cb.onPart) cb.onPart(h.part); }
    else { st.sel = null; apply(); if (cb.onPart) cb.onPart(null); }
  });

  var tmp = new T.Vector3(), running = true;
  new IntersectionObserver(function (en) { running = en[0].isIntersecting; }).observe(host);
  function frame(now) {
    requestAnimationFrame(frame);
    if (!running) return;
    if (fly) stepFly(now);
    else if (tween) {
      var k = Math.min(1, (now - tween.t0) / tween.dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, v = tween.v;
      camera.position.set(tween.fp.x + (v.p[0] - tween.fp.x) * e, tween.fp.y + (v.p[1] - tween.fp.y) * e, tween.fp.z + (v.p[2] - tween.fp.z) * e);
      controls.target.set(tween.ft.x + (v.t[0] - tween.ft.x) * e, tween.ft.y + (v.t[1] - tween.ft.y) * e, tween.ft.z + (v.t[2] - tween.ft.z) * e);
      camera.fov = tween.ffov + (v.fov - tween.ffov) * e; camera.updateProjectionMatrix();
      if (k >= 1) tween = null;
    }
    controls.update();
    var dist = camera.position.length(); fog.near = Math.max(260, dist + 40); fog.far = fog.near + 900;
    renderer.render(scene, camera);
    var cp = camera.position, inside = Math.abs(cp.x) < 16.5 && Math.abs(cp.z) < 12.5 && cp.y < 20;
    var hideAll = !!fly || !st.dims || inside || st.explode > 0 || !!st.cut;
    labels.forEach(function (l) {
      tmp.copy(l.v).project(camera);
      if (!l.w) l.w = l.el.offsetWidth || 80;
      var px = (tmp.x * 0.5 + 0.5) * W, py = (-tmp.y * 0.5 + 0.5) * H;
      var vis = !hideAll && tmp.z < 1 && (!l.side || l.side(cp)) && W >= l.minW && px - l.w / 2 > 6 && px + l.w / 2 < W - 6 && py > 14 && py < H - 14;
      l.el.style.opacity = vis ? 1 : 0;
      l.el.style.transform = 'translate(' + px + 'px,' + py + 'px) translate(-50%,-50%)';
    });
  }

  build(); updateSun(); setView('se', true); requestAnimationFrame(frame);
  return {
    state: st, views: views, setView: setView, refresh: function () { apply(); },
    // changing what is shown stops a flyby; snow, season and time of day can change during one
    set: function (k, v) { if (k !== 'snow') endFly(); st[k] = v; apply(); },
    debug: function () { return { built: built, scene: scene, camera: camera, fly: fly, trees: land.trees }; },
    setLayers: function (map) { endFly(); for (var k in map) st.layers[k] = map[k]; apply(); },
    setExplode: function (v) {
      endFly();
      var was = st.explode; st.explode = v; apply();
      if (was === 0 && v > 0 && camera.position.length() < 90) setView('exploded');
    },
    setCut: function (axis, pos) { endFly(); setCut(axis, pos); },
    setSun: function (season, hour) { st.season = season; st.hour = hour; return updateSun(); },
    setModel: function (r) { endFly(); R = r; build(); },
    select: function (it) { endFly(); st.sel = it; apply(); },
    selectRoom: function (id) { endFly(); st.room = id; st.sel = null; apply(); },
    flyby: startFly,
    stopFlyby: function () { endFly(); },
    flying: function () { return !!fly; },
    shot: function () { renderer.render(scene, camera); return canvas.toDataURL('image/png'); },
    shotAt: function (name, w, h) {
      var keep = { p: camera.position.clone(), t: controls.target.clone(), fov: camera.fov, a: camera.aspect, roof: st.roof, elev: st.elev };
      var v = views[name]; camera.position.set(v.p[0], v.p[1], v.p[2]); controls.target.set(v.t[0], v.t[1], v.t[2]); camera.fov = v.fov;
      camera.aspect = w / h; camera.updateProjectionMatrix(); camera.lookAt(controls.target);
      renderer.setSize(w, h, false); renderer.render(scene, camera);
      var url = canvas.toDataURL('image/jpeg', 0.86);
      camera.position.copy(keep.p); controls.target.copy(keep.t); camera.fov = keep.fov; resize();
      return url;
    }
  };
}
