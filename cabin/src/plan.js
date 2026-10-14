/* Rime Cabin page floor plan. Drawn from the same model as the 3D view and the drawing set. North is up. */
var PLAN = (function () {
  var LABELS = { 'Queen bed platform': 'queen bed', 'Wardrobe': 'wardrobe', 'Lower bunk': 'bunks', 'Shower pan': 'shower', 'Toilet bowl': 'WC', 'Vanity': 'vanity',
    'Washer-dryer combo': 'W/D', 'Gear bench': 'bench + hooks', 'Refrigerator': 'fridge', 'Base cabinets': 'kitchenette', 'Dining table': 'table', 'Sofa seat': 'sofa',
    'Desk top': 'desk', 'Hearth pad': 'wood stove', 'Propane wall furnace': 'furnace', 'Armchair': 'chair' };
  var SKIP = /Duct soffit|Pillow|Jacket|Snowboard|Monitor|Bunk post|Bunk bedding|Upper bunk|Mirror|Vanity top|Counter|Upper cabinet|Range hood|Sink|cooktop|Toilet tank|Shower glass|Table leg|Sofa back|Armchair back|Desk support|Queen mattress|Fire window|Water manifold|Tankless|Loft|Gear bin/;
  function draw(svg, R) {
    var s = 18, m = 46, out = [], M = R.M, o = R.o;
    function X(x) { return m + x * s; }
    function rect(x, z, w, d, cls) { out.push('<rect class="' + cls + '" x="' + X(x) + '" y="' + X(z) + '" width="' + w * s + '" height="' + d * s + '"/>'); }
    function line(x1, z1, x2, z2, cls) { out.push('<line class="' + cls + '" x1="' + X(x1) + '" y1="' + X(z1) + '" x2="' + X(x2) + '" y2="' + X(z2) + '"/>'); }
    function circ(x, z, r, cls) { out.push('<circle class="' + cls + '" cx="' + X(x) + '" cy="' + X(z) + '" r="' + r * s + '"/>'); }
    function text(x, z, t, cls, anchor) { out.push('<text class="' + cls + '" x="' + X(x) + '" y="' + X(z) + '" text-anchor="' + (anchor || 'middle') + '">' + t + '</text>'); }
    M.rooms.forEach(function (r) { rect(r.b[0], r.b[2], r.b[1] - r.b[0], r.b[3] - r.b[2], r.id === 'living' ? 'p-living' : 'p-room-fill'); });
    rect(5, 16.5, 9, 6, 'p-rug');
    M.fixtures.forEach(function (f) {
      if (!ENG.when(f.when, o) || SKIP.test(f.n)) return;
      var cls = f.it === 'INT-FURN' ? 'p-furn' : /^(FIX|MEC)/.test(f.it) ? 'p-app' : 'p-fix';
      if (f.it === 'MEC-HEARTH') cls = 'p-pad';
      if (f.cyl) circ(f.cyl[0], f.cyl[2], f.cyl[3], 'p-furn');
      else rect(f.b[0], f.b[2], f.b[3], f.b[5], cls);
      var lb = LABELS[f.n];
      if (lb && f.b) text(f.b[0] + f.b[3] / 2, f.b[2] + f.b[5] / 2 + 0.25, lb, 'p-tiny');
    });
    var ws = M.fixtures.filter(function (f) { return f.it === 'MEC-STOVE'; })[0];
    if (o.heat !== 'propane' && ws) { var sx = ws.b[0] + ws.b[3] / 2, sz = ws.b[2] + ws.b[5] / 2; circ(sx, sz, 0.9, 'p-stove'); circ(sx, sz, 0.33, 'p-flue'); }
    if (o.loft) {
      var st = M.stair; circ(st.c[0], st.c[1], st.r, 'p-stair'); circ(st.c[0], st.c[1], 0.15, 'p-flue');
      for (var i = 0; i < 12; i++) { var a = -i * 27.7 * Math.PI / 180; line(st.c[0], st.c[1], st.c[0] + Math.cos(a) * st.r, st.c[1] + Math.sin(a) * st.r, 'p-dl'); }
      text(st.c[0] - 2.6, st.c[1] + 0.2, 'spiral stair up', 'p-tiny', 'end');
      out.push('<rect class="p-loft" x="' + X(22) + '" y="' + X(2.4) + '" width="' + 9.5 * s + '" height="' + 21.1 * s + '"/>'); text(26.9, 23.1, 'loft above', 'p-tiny');
    }
    // walls
    out.push('<rect class="p-wall" x="' + X(0.25) + '" y="' + X(0.25) + '" width="' + 31.5 * s + '" height="' + 23.5 * s + '"/>');
    M.partitions.forEach(function (p) {
      var cls = p.t > 0.4 ? 'p-part p-wet' : 'p-part';
      if (p.axis === 'z') {
        var cuts = (p.doors || []).map(function (d) { return d.u; }).sort(function (a, b) { return a[0] - b[0]; }), a0 = 0.5;
        cuts.forEach(function (c) { line(p.c, a0, p.c, c[0], cls); a0 = c[1]; }); line(p.c, a0, p.c, 23.5, cls);
        (p.doors || []).forEach(function (d) { line(p.c - 0.55, d.u[0] - 0.1, p.c - 0.55, d.u[1] + 0.1, 'p-barn'); var w = d.u[1] - d.u[0]; out.push('<path class="p-swing" d="M' + X(p.c - 0.85) + ' ' + X(d.u[0] + w / 2) + ' l0 ' + w * s * 0.9 + '"/>'); });
      } else line(22.1875, p.c, 31.5, p.c, cls);
    });
    // openings
    R.units.forEach(function (u) {
      var f = { N: 0, S: 24, W: 0, E: 32 }[u.wall];
      if (u.door) {
        line(f, u.u0, f, u.u1, 'p-door');
        out.push('<path class="p-swing" d="M ' + X(0.4) + ' ' + X(u.u0) + ' A ' + (u.u1 - u.u0) * s + ' ' + (u.u1 - u.u0) * s + ' 0 0 1 ' + X(0.4 + u.u1 - u.u0) + ' ' + X(u.u1) + '"/>');
      } else if (u.wall === 'N' || u.wall === 'S') { if (!/b|c$/.test(u.id) || !u.bay) line(u.u0, f, u.u1, f, 'p-glass'); }
      else if (!u.tier && !u.over) line(f, u.u0, f, u.u1, 'p-glass'); // stacked and clerestory units sit above the plan cut
    });
    // porch
    var PO = R.porch || M.porch, pd = PO.deck; rect(pd[0], pd[2], pd[3], pd[4], 'p-porch'); text(pd[0] + pd[3] / 2, pd[2] + pd[4] / 2 + 0.6, PO.big ? 'entry deck' : 'porch', 'p-tiny');
    var rk = PO.rack; if (rk[0] > -9) { rect(rk[0], rk[1], rk[2], rk[4], 'p-fix'); text(-3, 13.55, 'firewood', 'p-tiny'); }
    // labels
    var L = M.rooms[0];
    text(11, 10.3, 'LIVING / KITCHEN / ENTRY', 'p-room'); text(11, 11.2, ENG.ftIn(L.b[1] - L.b[0]) + ' × ' + ENG.ftIn(L.b[3] - L.b[2]) + ' · ' + Math.round((L.b[1] - L.b[0]) * (L.b[3] - L.b[2])) + ' sq ft', 'p-dim');
    [[1, 8.6, 'BEDROOM 1'], [2, 14.4, 'BATH'], [3, 21.4, 'BEDROOM 2']].forEach(function (t) {
      var r = M.rooms[t[0]], w = r.b[1] - r.b[0], d = r.b[3] - r.b[2];
      text(t[0] === 2 ? 25.4 : 26.85, t[1], t[2], 'p-room'); text(t[0] === 2 ? 25.4 : 26.85, t[1] + 0.75, ENG.ftIn(w) + ' × ' + ENG.ftIn(d), 'p-dim');
    });
    var yT = -1.35, xR = 33.6;
    line(0, yT, 32, yT, 'p-dl'); line(0, yT - 0.4, 0, yT + 0.4, 'p-dl'); line(32, yT - 0.4, 32, yT + 0.4, 'p-dl'); text(16, yT - 0.5, '32′ 0″', 'p-dim');
    line(xR, 0, xR, 24, 'p-dl'); line(xR - 0.4, 0, xR + 0.4, 0, 'p-dl'); line(xR - 0.4, 24, xR + 0.4, 24, 'p-dl');
    out.push('<text class="p-dim" transform="translate(' + X(xR + 1.2) + ' ' + X(12) + ') rotate(90)" text-anchor="middle">24′ 0″</text>');
    out.push('<g transform="translate(' + X(-3.3) + ' ' + X(-1.4) + ')"><path class="p-north" d="M0 -16 L7 6 L0 1 L-7 6 Z"/><text class="p-room" y="22" text-anchor="middle">N</text></g>');
    text(11, 25.7, 'South wall, 17 ft tall, ' + (o.glass === 'full' ? 'three' : 'two') + ' glass bays', 'p-tiny'); text(8, -0.6, 'roof slopes down to the north ↑', 'p-tiny');
    svg.setAttribute('viewBox', X(-7.2) + ' ' + X(-3.4) + ' ' + (45 * s) + ' ' + (31 * s));
    svg.innerHTML = out.join('');
  }
  return { draw: draw };
})();
