/* Rime Cabin drawing set, part 1: sheet frame, title block, text, tables, dimensions and symbols.
   Sheets are 36 x 24 in (ARCH D). One SVG unit is 0.01 in, so 1/4 in = 1 ft is 25 units per foot. */
var DWG = (function () {
  var D = { W: 3600, H: 2400 };
  function r1(n) { return Math.round(n * 10) / 10; }
  D.r1 = r1;
  function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  D.esc = esc;
  // feet to feet-inches with eighths
  D.fi = function (x) {
    var neg = x < 0; x = Math.abs(x);
    var t = Math.round(x * 96), ft = Math.floor(t / 96), r = t - ft * 96, inch = Math.floor(r / 8), e = r - inch * 8;
    var fr = e ? { 1: '1/8', 2: '1/4', 3: '3/8', 4: '1/2', 5: '5/8', 6: '3/4', 7: '7/8' }[e] : '';
    return (neg ? '-' : '') + ft + '′-' + inch + (fr ? ' ' + fr : '') + '″';
  };

  var STYLE = [
    'text{font-family:"IBM Plex Sans",Arial,sans-serif;fill:#111}',
    '.d-border{fill:none;stroke:#111;stroke-width:5}', '.d-tb{fill:none;stroke:#111;stroke-width:2}',
    '.d-cut{stroke:#111;stroke-width:3.2;stroke-linejoin:miter}', '.d-hv{fill:none;stroke:#111;stroke-width:2.6}', '.d-md{fill:none;stroke:#111;stroke-width:1.5}',
    '.d-lt{fill:none;stroke:#111;stroke-width:0.8}', '.d-xl{fill:none;stroke:#666;stroke-width:0.5}', '.d-hid{fill:none;stroke:#333;stroke-width:0.9;stroke-dasharray:10 7}',
    '.d-ctr{fill:none;stroke:#555;stroke-width:0.7;stroke-dasharray:22 6 4 6}', '.d-dim{fill:none;stroke:#222;stroke-width:0.7}', '.d-tick{stroke:#111;stroke-width:2}',
    '.d-grid{fill:none;stroke:#bbb;stroke-width:0.6}',
    '.f-white{fill:#fff}', '.f-poche{fill:#cfcfcf}', '.f-dark{fill:#555}', '.f-glass{fill:#e4eef6}', '.f-roof{fill:#e9e9e9}', '.f-fix{fill:#f3f3f3}',
    '.f-conc{fill:url(#dwg-conc)}', '.f-earth{fill:url(#dwg-earth)}', '.f-insul{fill:url(#dwg-insul)}', '.f-foam{fill:url(#dwg-foam)}', '.f-cell{fill:url(#dwg-cell)}', '.f-gravel{fill:url(#dwg-gravel)}',
    '.t{font-size:12.5px}', '.ts{font-size:10px}', '.tm{font-size:15px}', '.tl{font-size:19px}', '.tb{font-weight:600}', '.halo{paint-order:stroke;stroke:#fff;stroke-width:6px;stroke-linejoin:round}',
    '.th{font-family:"Barlow Condensed","Arial Narrow",sans-serif;font-weight:700;font-size:26px;letter-spacing:0.5px}',
    '.tc{font-family:"Barlow Condensed","Arial Narrow",sans-serif;font-weight:600}', '.tmono{font-family:"IBM Plex Mono",monospace}',
    '.cold{stroke:#1f6fb5;stroke-width:3;fill:none}', '.hot{stroke:#c0392b;stroke-width:3;fill:none;stroke-dasharray:18 5 4 5}',
    '.dwv{stroke:#444;stroke-width:4.5;fill:none;stroke-dasharray:16 6}', '.vent{stroke:#444;stroke-width:2.5;fill:none;stroke-dasharray:6 5}',
    '.gas{stroke:#a87a00;stroke-width:3;fill:none;stroke-dasharray:22 6 3 6}', '.duct{stroke:#5b6b78;stroke-width:3;fill:none}',
    '.stamp{fill:none;stroke:#b3261e;stroke-width:3}', '.stamptxt{fill:#b3261e;font-weight:700}'
  ].join('');
  var DEFS = '<defs>' +
    '<pattern id="dwg-conc" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="#fff"/><circle cx="4" cy="5" r="1.1" fill="#555"/><circle cx="15" cy="12" r="0.9" fill="#555"/><path d="M8 18 l4 -6 l3 6 z" fill="none" stroke="#555" stroke-width="0.7"/><circle cx="20" cy="3" r="0.7" fill="#555"/></pattern>' +
    '<pattern id="dwg-earth" width="30" height="30" patternUnits="userSpaceOnUse"><rect width="30" height="30" fill="#fff"/><path d="M0 30 L30 0" stroke="#888" stroke-width="0.8"/><path d="M-5 10 L10 -5 M20 35 L35 20" stroke="#888" stroke-width="0.8"/><circle cx="22" cy="22" r="1" fill="#888"/></pattern>' +
    '<pattern id="dwg-insul" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#fff"/><path d="M0 8 Q4 0 8 8 T16 8" fill="none" stroke="#777" stroke-width="0.8"/></pattern>' +
    '<pattern id="dwg-foam" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#fff"/><path d="M0 10 L10 0 M0 0 L10 10" stroke="#888" stroke-width="0.6"/></pattern>' +
    '<pattern id="dwg-cell" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#fafafa"/><circle cx="3" cy="3" r="0.8" fill="#888"/><circle cx="9" cy="8" r="0.8" fill="#888"/><circle cx="6" cy="11" r="0.6" fill="#888"/></pattern>' +
    '<pattern id="dwg-gravel" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#fff"/><circle cx="4" cy="4" r="2" fill="none" stroke="#999" stroke-width="0.6"/><circle cx="11" cy="10" r="1.5" fill="none" stroke="#999" stroke-width="0.6"/></pattern>' +
    '</defs>';

  function Sheet(R, num, title, opts) {
    this.R = R; this.num = num; this.title = title; this.opts = opts || {}; this.out = []; this.clipN = 0;
  }
  var S = Sheet.prototype;
  S.add = function (s) { this.out.push(s); return this; };
  S.line = function (x1, y1, x2, y2, cls, extra) { return this.add('<line class="' + cls + '" x1="' + r1(x1) + '" y1="' + r1(y1) + '" x2="' + r1(x2) + '" y2="' + r1(y2) + '"' + (extra || '') + '/>'); };
  S.rect = function (x, y, w, h, cls, extra) { if (w < 0) { x += w; w = -w; } if (h < 0) { y += h; h = -h; } return this.add('<rect class="' + cls + '" x="' + r1(x) + '" y="' + r1(y) + '" width="' + r1(w) + '" height="' + r1(h) + '"' + (extra || '') + '/>'); };
  S.poly = function (pts, cls, extra) { return this.add('<polygon class="' + cls + '" points="' + pts.map(function (p) { return r1(p[0]) + ',' + r1(p[1]); }).join(' ') + '"' + (extra || '') + '/>'); };
  S.pline = function (pts, cls, extra) { return this.add('<polyline class="' + cls + '" points="' + pts.map(function (p) { return r1(p[0]) + ',' + r1(p[1]); }).join(' ') + '"' + (extra || '') + '/>'); };
  S.path = function (d, cls, extra) { return this.add('<path class="' + cls + '" d="' + d + '"' + (extra || '') + '/>'); };
  S.circle = function (x, y, r, cls, extra) { return this.add('<circle class="' + cls + '" cx="' + r1(x) + '" cy="' + r1(y) + '" r="' + r1(r) + '"' + (extra || '') + '/>'); };
  S.text = function (x, y, s, cls, anchor, rot) {
    return this.add('<text class="' + (cls || 't') + '" x="' + r1(x) + '" y="' + r1(y) + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + (rot ? ' transform="rotate(' + rot + ' ' + r1(x) + ' ' + r1(y) + ')"' : '') + '>' + esc(s) + '</text>');
  };
  // wrap text to a width in units; returns lines
  D.wrap = function (s, w, size) {
    var cw = size * 0.53, max = Math.max(8, Math.floor(w / cw)), words = String(s).split(' '), lines = [], cur = '';
    words.forEach(function (wd) { if ((cur + ' ' + wd).trim().length > max) { if (cur) lines.push(cur); cur = wd; } else cur = (cur + ' ' + wd).trim(); });
    if (cur) lines.push(cur);
    return lines;
  };
  S.para = function (x, y, w, s, size, cls, lh) {
    var self = this, lines = D.wrap(s, w, size), h = (lh || size * 1.35);
    lines.forEach(function (l, i) { self.text(x, y + i * h, l, cls || (size <= 10 ? 'ts' : 't')); });
    return lines.length * h;
  };
  // numbered or bulleted notes block; returns height used
  S.notes = function (x, y, w, title, list, size, numbered) {
    size = size || 12.5; var self = this, yy = y;
    if (title) { this.text(x, yy, title.toUpperCase(), 'tc tl'); yy += size * 1.9; }
    list.forEach(function (n, i) {
      var lab = numbered === false ? '•' : (i + 1) + '.';
      self.text(x, yy, lab, size <= 10 ? 'ts' : 't');
      yy += self.para(x + size * 1.9, yy, w - size * 1.9, n, size) + size * 0.45;
    });
    return yy - y;
  };
  // table: cols [{h, w, a}], rows [[...]]; returns height
  S.table = function (x, y, cols, rows, opts) {
    opts = opts || {}; var self = this, size = opts.size || 11, rh = opts.rh || size * 1.85, W = cols.reduce(function (a, c) { return a + c.w; }, 0), yy = y;
    if (opts.title) { this.text(x, yy - 10, opts.title.toUpperCase(), 'tc tl'); }
    this.rect(x, yy, W, rh, 'f-poche d-md');
    var cx = x;
    cols.forEach(function (c) { self.text(c.a === 'r' ? cx + c.w - 6 : cx + 6, yy + rh * 0.68, c.h, 'ts tb', c.a === 'r' ? 'end' : null); cx += c.w; });
    yy += rh;
    rows.forEach(function (r) {
      var lines = r.map(function (v, i) { return cols[i].wrap ? D.wrap(v, cols[i].w - 12, size) : [String(v === undefined || v === null ? '' : v)]; });
      var n = Math.max.apply(null, lines.map(function (l) { return l.length; })), h = Math.max(rh, n * size * 1.3 + size * 0.7);
      self.rect(x, yy, W, h, 'd-lt');
      var cx2 = x;
      lines.forEach(function (ls, i) {
        var c = cols[i];
        ls.forEach(function (t, k) { self.text(c.a === 'r' ? cx2 + c.w - 6 : cx2 + 6, yy + size * 1.25 + k * size * 1.3, t, size <= 10 ? 'ts' : 't', c.a === 'r' ? 'end' : null); });
        if (i) self.line(cx2, yy, cx2, yy + h, 'd-xl');
        cx2 += c.w;
      });
      yy += h;
    });
    this.rect(x, y, W, yy - y, 'd-md');
    return yy - y;
  };
  // horizontal dimension string between sheet x positions at y; ticks at each point
  S.dimH = function (xs, y, labels, extY) {
    var self = this;
    this.line(xs[0] - 12, y, xs[xs.length - 1] + 12, y, 'd-dim');
    xs.forEach(function (x) { self.line(x - 6, y + 6, x + 6, y - 6, 'd-tick'); if (extY !== undefined) self.line(x, extY, x, y + (extY > y ? -8 : 8), 'd-dim'); });
    for (var i = 1; i < xs.length; i++) { var l = labels[i - 1]; if (l) self.text((xs[i - 1] + xs[i]) / 2, y - 6, l, 'ts', 'middle'); }
  };
  S.dimV = function (ys, x, labels, extX) {
    var self = this;
    this.line(x, ys[0] - 12, x, ys[ys.length - 1] + 12, 'd-dim');
    ys.forEach(function (y) { self.line(x - 6, y + 6, x + 6, y - 6, 'd-tick'); if (extX !== undefined) self.line(extX, y, x + (extX > x ? -8 : 8), y, 'd-dim'); });
    for (var i = 1; i < ys.length; i++) { var l = labels[i - 1]; if (l) self.text(x - 7, (ys[i - 1] + ys[i]) / 2, l, 'ts', 'middle', -90); }
  };
  S.leader = function (x1, y1, x2, y2, s, size) {
    this.line(x1, y1, x2, y2, 'd-dim'); this.circle(x1, y1, 2.2, 'f-dark');
    var right = x2 >= x1;
    this.line(x2, y2, x2 + (right ? 14 : -14), y2, 'd-dim');
    var self = this, lines = D.wrap(s, 420, size || 10);
    lines.forEach(function (l, i) { self.text(x2 + (right ? 18 : -18), y2 + 3.5 + i * (size || 10) * 1.25, l, ((size || 10) <= 10 ? 'ts' : 't') + ' halo', right ? null : 'end'); });
  };
  // labels stacked in a column beside a drawing, each with a leader to its point: list of [px, py, text]
  S.callouts = function (list, colX, right, size, gap, width) {
    size = size || 10; gap = gap || 8; var self = this, items = list.slice().sort(function (a, b) { return a[1] - b[1]; }), y = -1e9, w = width || 380;
    items.forEach(function (it) {
      var lines = D.wrap(it[2], w, size), h = lines.length * size * 1.25;
      var ty = Math.max(it[1], y + gap);
      self.circle(it[0], it[1], 2.4, 'f-dark');
      self.pline([[it[0], it[1]], [colX + (right ? -14 : 14), ty], [colX, ty]], 'd-dim');
      lines.forEach(function (l, i) { self.text(colX + (right ? -4 : 4), ty + 3.5 + i * size * 1.25, l, (size <= 10 ? 'ts' : 't') + ' halo', right ? 'end' : null); });
      y = ty + h;
    });
  };
  S.level = function (x, y, label, right) {
    this.circle(x, y, 7, 'd-md'); this.path('M' + (x - 7) + ' ' + y + ' A7 7 0 0 1 ' + x + ' ' + (y - 7) + ' L' + x + ' ' + y + ' Z', 'f-dark');
    this.line(x + (right ? -7 : 7), y, x + (right ? -60 : 60), y, 'd-dim');
    this.text(x + (right ? -64 : 64), y + 4, label, 'ts halo', right ? 'end' : null);
  };
  S.north = function (x, y, s) {
    s = s || 40; this.circle(x, y, s, 'd-md');
    this.poly([[x, y - s * 0.9], [x + s * 0.35, y + s * 0.5], [x, y + s * 0.2], [x - s * 0.35, y + s * 0.5]], 'f-dark');
    this.text(x, y - s - 8, 'N', 'tc tl', 'middle');
  };
  // drawing title bubble under a view
  S.vtitle = function (x, y, n, title, scale) {
    this.circle(x + 22, y, 22, 'd-hv'); this.text(x + 22, y + 7, n, 'tc tl', 'middle');
    this.line(x + 48, y + 4, x + 48 + Math.max(260, title.length * 12), y + 4, 'd-hv');
    this.text(x + 54, y - 4, title.toUpperCase(), 'tc tl');
    if (scale) this.text(x + 54, y + 22, scale, 'ts');
  };
  S.secMark = function (x, y, n, sheet, rot) {
    this.circle(x, y, 18, 'd-md'); this.line(x - 18, y, x + 18, y, 'd-lt');
    this.text(x, y - 3, n, 'ts tb', 'middle'); this.text(x, y + 12, sheet, 'ts', 'middle');
    var a = (rot || 0) * Math.PI / 180, tx = x + Math.cos(a) * 30, ty = y + Math.sin(a) * 30;
    this.poly([[tx, ty], [x + Math.cos(a + 0.5) * 18, y + Math.sin(a + 0.5) * 18], [x + Math.cos(a - 0.5) * 18, y + Math.sin(a - 0.5) * 18]], 'f-dark');
  };
  S.tag = function (x, y, txt, shape) {
    if (shape === 'hex') { var r = 15, pts = []; for (var i = 0; i < 6; i++) pts.push([x + r * Math.cos(i * Math.PI / 3), y + r * Math.sin(i * Math.PI / 3)]); this.poly(pts, 'f-white d-md'); }
    else if (shape === 'rect') this.rect(x - 20, y - 11, 40, 22, 'f-white d-md');
    else this.circle(x, y, 14, 'f-white d-md');
    this.text(x, y + 4.5, txt, 'ts tb', 'middle');
  };
  S.clip = function (x, y, w, h) { var id = 'dwgc' + this.num.replace(/\W/g, '') + (this.clipN++); this.add('<clipPath id="' + id + '"><rect x="' + r1(x) + '" y="' + r1(y) + '" width="' + r1(w) + '" height="' + r1(h) + '"/></clipPath>'); return id; };
  S.group = function (attr) { this.add('<g ' + attr + '>'); return this; };
  S.end = function () { this.add('</g>'); return this; };

  // border and title block on the right
  S.frame = function () {
    var R = this.R, M = R.M, m = M.meta, x0 = 3225, x1 = 3550, y0 = 50, y1 = 2350, self = this, o = R.o;
    this.rect(150, 50, 3400, 2300, 'd-border'); this.line(x0, y0, x0, y1, 'd-hv');
    var y = y0 + 40;
    this.text(x0 + 16, y, 'RIME CABIN', 'th'); y += 26;
    this.text(x0 + 16, y, m.project, 't'); y += 18;
    y += this.para(x0 + 16, y, x1 - x0 - 30, m.site, 10) + 10;
    this.line(x0, y, x1, y, 'd-md'); y += 22;
    [['Owner', m.owner], ['Drawn by', m.drawnBy], ['Date', m.revDate], ['Scale', this.opts.scale || 'As noted']].forEach(function (r) {
      self.text(x0 + 16, y, r[0].toUpperCase(), 'ts tmono'); self.text(x0 + 110, y, r[1], 't'); y += 20;
    });
    this.line(x0, y, x1, y, 'd-md'); y += 22;
    this.text(x0 + 16, y, 'OPTIONS SHOWN', 'ts tmono'); y += 16;
    var opt = [o.found === 'piers' ? 'Concrete piers' : 'Insulated crawlspace', o.snow + ' psf roof snow', { both: 'Propane + wood', propane: 'Propane only', wood: 'Wood stove only' }[o.heat], o.power === 'grid' ? 'Utility power' : 'Off-grid solar', o.glass === 'full' ? '3 glass bays' : '2 glass bays', o.roof === 'seam' ? 'Standing seam' : 'Ribbed metal', o.loft ? 'Gear loft' : 'No loft', o.wd ? 'Washer-dryer' : 'No washer-dryer', o.garage ? 'Attached garage' : 'No garage'];
    y += this.para(x0 + 16, y, x1 - x0 - 30, opt.join(' · '), 10) + 8;
    this.line(x0, y, x1, y, 'd-md'); y += 20;
    this.text(x0 + 16, y, 'REVISIONS', 'ts tmono'); y += 6;
    var rows = m.revHistory.map(function (r) { return [r[0], r[1], r[2]]; });
    y += this.table(x0 + 10, y, [{ h: 'Rev', w: 34 }, { h: 'Date', w: 78 }, { h: 'Description', w: 193, wrap: true }], rows, { size: 9, rh: 16 }) + 14;
    // status stamp
    this.rect(x0 + 14, y, x1 - x0 - 28, 92, 'stamp');
    this.text((x0 + x1) / 2, y + 26, 'NOT FOR CONSTRUCTION', 'stamptxt tm', 'middle');
    this.para(x0 + 26, y + 46, x1 - x0 - 52, 'For planning and permit prep. Structural and code items need a licensed engineer and the building department.', 9.5, 'ts');
    y += 108;
    this.rect(x0 + 14, y, x1 - x0 - 28, 150, 'd-lt'); this.text((x0 + x1) / 2, y + 80, "Engineer's stamp", 'ts', 'middle'); y += 166;
    // sheet title and number at the bottom
    this.line(x0, y1 - 230, x1, y1 - 230, 'd-hv');
    this.text(x0 + 16, y1 - 204, 'SHEET TITLE', 'ts tmono');
    D.wrap(this.title.toUpperCase(), (x1 - x0 - 30) * 0.8, 19).forEach(function (l, i) { self.text(x0 + 16, y1 - 178 + i * 24, l, 'tc tl'); });
    this.line(x0, y1 - 110, x1, y1 - 110, 'd-md');
    this.text(x0 + 16, y1 - 86, 'SHEET', 'ts tmono');
    this.add('<text class="th" style="font-size:58px" x="' + r1((x0 + x1) / 2) + '" y="' + (y1 - 26) + '" text-anchor="middle">' + esc(this.num) + '</text>');
  };

  // haloed labels go last so their white outline masks any linework drawn after them
  S.layered = function () {
    var top = [], rest = [];
    this.out.forEach(function (e) { (/^<text class="[^"]*\bhalo\b/.test(e) ? top : rest).push(e); });
    return rest.concat(top);
  };
  S.svg = function () {
    this.frame();
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + D.W + ' ' + D.H + '" width="36in" height="24in" role="img" aria-label="Sheet ' + this.num + ': ' + esc(this.title) + '"><style>' + STYLE + '</style>' + DEFS +
      '<rect width="' + D.W + '" height="' + D.H + '" fill="#fff"/>' + this.layered().join('') + '</svg>';
  };
  D.Sheet = Sheet;
  return D;
})();
