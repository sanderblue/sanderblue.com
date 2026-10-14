/* Rime Cabin page: state, 3D wiring, rooms, info card, checks and notes. Cost, build and drawings live in their own files. */
var APP = (function () {
  var $ = function (id) { return document.getElementById(id); };
  var M = MODEL, A = { M: M, o: Object.assign({}, M.inputs.defaults), R: null, viewer: null, dl: null, cache: {} };
  A.$ = $;
  A.money = function (n) { return (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US'); };
  A.k = function (n) { return '$' + (Math.round(n / 100) / 10).toFixed(1) + 'k'; };
  A.esc = function (s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  A.gen = function (o) {
    var key = JSON.stringify(o);
    if (!A.cache[key]) A.cache[key] = ENG.generate(M, o);
    return A.cache[key];
  };
  A.total = function (o) { return A.gen(o).bom.sum.total; };

  var LAYER_SW = { found: '#a9adb0', floor: '#c99a5b', wallf: '#d4ad74', roof: '#cfa66b', sheath: '#3f7d4f', insul: '#9a9890', roofing: '#2a3036', ext: '#3c4955',
    open: '#7fb2d6', int: '#e7e1d6', fix: '#c08a55', furn: '#56677a', plumb: '#2b7bb9', elec: '#6c5ce7', mech: '#b9c0c6', site: '#bdb6aa' };
  var SETS = {
    finished: { on: ['roofing', 'ext', 'open', 'int', 'fix', 'furn', 'mech', 'site'], see: false },
    framing: { on: ['found', 'floor', 'wallf', 'roof', 'site'], see: false },
    systems: { on: ['floor', 'open', 'int', 'ext', 'fix', 'plumb', 'elec', 'mech', 'site'], see: true, roof: false },
    all: { on: null, see: false }
  };
  var isoPrev = null;

  function renderLayers() {
    var R = A.R, counts = {};
    R.parts.forEach(function (p) { if (p.k !== 'marker') counts[p.L] = (counts[p.L] || 0) + 1; });
    var st = A.viewer ? A.viewer.state.layers : {};
    $('layers').innerHTML = M.catalog.layers.map(function (l) {
      var on = !!st[l[0]], iso = isoPrev && isoPrev.id === l[0];
      return '<li><label><input type="checkbox" data-layer="' + l[0] + '"' + (on ? ' checked' : '') + '><span class="sw" style="background:' + LAYER_SW[l[0]] + '"></span><span>' + l[1] + '</span> <span class="n">' + (counts[l[0]] || 0) + '</span></label>' +
        '<button type="button" class="iso" data-iso="' + l[0] + '" aria-pressed="' + !!iso + '" title="Show only this layer">Only</button></li>';
    }).join('');
  }
  function applySet(name) {
    var s = SETS[name], map = {};
    showPart(null); A.viewer.select(null);
    M.catalog.layers.forEach(function (l) { map[l[0]] = !s.on || s.on.indexOf(l[0]) >= 0; });
    isoPrev = null;
    A.viewer.setLayers(map); A.viewer.set('see', s.see);
    if (s.roof !== undefined) A.viewer.set('roof', s.roof); else if (name !== 'systems') A.viewer.set('roof', true);
    document.querySelectorAll('[data-set]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.set === name)); });
    syncToggles(); renderLayers();
  }
  A.applySet = applySet;

  function syncToggles() {
    if (!A.viewer) return;
    var st = A.viewer.state;
    document.querySelectorAll('[data-toggle]').forEach(function (b) { b.setAttribute('aria-pressed', String(!!st[b.getAttribute('data-toggle')])); });
  }

  function setSeason(v) {
    var st = A.viewer.state; st.season = v;
    document.querySelectorAll('[data-season]').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.season === v)); });
    if (v === 'summer' && st.snow) A.viewer.set('snow', false); // no roof snow in June
    sunText(); syncToggles();
  }

  function sunText() {
    var st = A.viewer.state; A.viewer.setSun(st.season, st.hour);
    var h = Math.floor(st.hour), m = st.hour % 1 ? '30' : '00';
    $('sunread').textContent = (st.season === 'winter' ? 'Dec 21' : 'Jun 21') + ', ' + (h > 12 ? h - 12 : h) + ':' + m + (h >= 12 ? ' pm' : ' am') + (st.altDeg > 0 ? ', sun ' + st.altDeg + '° high' : ', sun is down');
  }

  // info card for a clicked part
  A.lineFor = function (id) { return A.R.bom.lines.filter(function (l) { return l.id === id; })[0]; };
  function showPart(p) {
    var box = $('info');
    if (!p) { box.hidden = true; return; }
    var it = A.R.cat[p.it] || {}, l = A.lineFor(p.it), lay = M.catalog.layers.filter(function (x) { return x[0] === p.L; })[0];
    var h = '<button type="button" class="x" aria-label="Close" data-close-info>×</button><h4>' + A.esc(p.n) + '</h4>';
    h += '<div class="small">' + A.esc(p.it) + ' · ' + A.esc(lay ? lay[1] : '') + (p.circuit ? ' · circuit ' + p.circuit : '') + '</div><dl>';
    if (it.isSite) {
      h += '<dt>Part of</dt><dd>' + A.esc(it.n) + '</dd><dt>Cost</dt><dd>' + (it.lo ? A.money(it.lo) + ' to ' + A.money(it.hi) : 'Get a quote') + ', not in the total</dd>';
      h += '</dl><p class="note">' + A.esc(it.note) + '</p>';
    } else {
      h += '<dt>Item</dt><dd>' + A.esc(it.n) + (it.s ? '<br><span class="small">' + A.esc(it.s) + '</span>' : '') + '</dd>';
      if (l) {
        var len = p.k === 'seg' || (p.k === 'box' && /lf/.test(it.u)) ? ' (this piece ' + ENG.ftIn(p.len) + ')' : '';
        h += '<dt>Quantity</dt><dd>' + l.q.toLocaleString('en-US') + ' ' + l.u + len + '</dd><dt>Each</dt><dd>' + (l.p < 10 ? '$' + l.p.toFixed(2) : A.money(l.p)) + (l.chk ? ' <i class="chk" title="Compared with a 2026 source">●</i>' : ' (estimate)') + '</dd>';
        h += '<dt>Line total</dt><dd><b>' + A.money(l.ext) + '</b></dd><dt>Who</dt><dd>' + A.esc(l.by) + '</dd><dt>Supplier</dt><dd>' + A.esc(l.sup) + '</dd><dt>Lead time</dt><dd>' + A.esc(l.lead) + '</dd>';
      } else h += '<dt>Cost</dt><dd>Not priced separately</dd>';
      if (it.sheet && it.sheet !== '-') h += '<dt>Drawing</dt><dd><button type="button" class="linkbtn" data-sheet="' + it.sheet + '">Sheet ' + it.sheet + '</button></dd>';
      h += '</dl>';
      var note = [it.note, l && l.allow ? 'Allowance: ' + l.allow : ''].filter(Boolean).join(' ');
      if (note) h += '<p class="note">' + A.esc(note) + '</p>';
      if (l) h += '<button type="button" class="linkbtn" data-findline="' + l.id + '">Find it in the parts list</button>';
    }
    box.innerHTML = h; box.hidden = false;
  }
  A.showPart = showPart;

  function pickRoom(id) {
    var r = M.rooms.filter(function (x) { return x.id === id; })[0];
    if (A.viewer.state.roof && !A.viewer.state.see) A.viewer.set('roof', false);
    A.viewer.selectRoom(id); syncToggles(); showPart(null);
    document.querySelectorAll('[data-room]').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.room === id)); });
    var w = r.b[1] - r.b[0], d = r.b[3] - r.b[2];
    $('roominfo').innerHTML = '<b>' + r.name + '</b> ' + ENG.ftIn(w) + ' × ' + ENG.ftIn(d) + ', ' + Math.round(w * d) + ' sq ft. ' + r.note;
  }

  function renderRooms() {
    $('roomlist').innerHTML = M.rooms.map(function (r) {
      return '<button type="button" class="room" data-room="' + r.id + '" aria-pressed="false"><span>' + r.name + '</span><em>' + Math.round((r.b[1] - r.b[0]) * (r.b[3] - r.b[2])) + ' sq ft</em></button>';
    }).join('');
  }

  function renderChecks() {
    var R = A.R, lab = { pass: 'Pass', warn: 'Check', fail: 'Fail', eng: 'Engineer' };
    $('checktable').innerHTML = '<thead><tr><th scope="col">Result</th><th scope="col">Check</th><th scope="col">What the model shows</th><th scope="col">Rule</th></tr></thead><tbody>' +
      R.checks.map(function (c) { return '<tr><td><span class="st ' + c.status + '">' + lab[c.status] + '</span></td><td><b>' + A.esc(c.name) + '</b><br><span class="small">' + A.esc(c.cat) + '</span></td><td>' + A.esc(c.detail) + '</td><td class="small">' + A.esc(c.ref) + '</td></tr>'; }).join('') + '</tbody>';
  }

  function renderNotes() {
    var L = M.logistics;
    $('assume').innerHTML = L.assumptions.map(function (s) { return '<li>' + A.esc(s) + '</li>'; }).join('');
    $('unver').innerHTML = L.unverified.map(function (s) { return '<li>' + A.esc(s) + '</li>'; }).join('');
    $('disclaimer').textContent = M.meta.disclaimer;
    $('rev').textContent = M.meta.rev;
    var src = [
      ['https://www.blossmangas.com/appliances/heaters/rinnai-21500-btu-direct-vent-wall-heater/', 'Rinnai 21,500 BTU wall furnace'],
      ['https://www.blossmangas.com/appliances/gas-water-heaters/rinnai-re140i-ep-tankless-water-heater/', 'Rinnai RE140 tankless water heater'],
      ['https://www.firepitsurplus.com/blogs/shopping-guides/drolet-vs-jotful', 'Drolet and Jøtul stove price ranges'],
      ['https://www.raymurray.com/wp-content/uploads/application/pdf/2025-DuraVent-Retail-Price-List-Effective-5-12-25-PDF.pdf', 'DuraVent 2025 chimney price list'],
      ['https://www.thepricer.org/how-much-does-a-500-gal-propane-tank-cost/', 'Propane tank install costs'],
      ['https://elliottelectric.com/StaticPages/ElectricalReferences/Guides/generator-propane-tank-sizing-guide.aspx', 'Propane tank output at 0°F'],
      ['https://www.regoproducts.com/content/dam/pes/pdfs/L-545_Servicemans_Manual.pdf', 'RegO LP-Gas Serviceman’s Manual: tank output by size and temperature'],
      ['https://resident.com/home-and-living/2026/04/28/standing-seam-metal-roof-cost-in-2026-what-it-really-costs-and-what-to-expect', 'Standing seam roof costs, 2026'],
      ['https://modernize.com/windows/brands', 'Window price ranges by brand'],
      ['https://latestcost.com/zip-r-sheathing-price-per-panel-installed-cost/', 'ZIP-R sheathing panel prices, 2026'],
      ['https://latestcost.com/tji-floor-joist-cost-installation-prices/', 'I-joist prices per foot, 2026'],
      ['https://latestcost.com/spiral-staircase-cost/', 'Spiral stair kit prices'],
      ['https://jouleio.com/blog/off-grid-solar-system/', 'Off-grid solar system costs, 2026'],
      ['https://www.gordian.com/resources/lumber-cost-trends', 'Framing lumber price index'],
      ['https://basc.pnnl.gov/information/2009-2021-iecc-and-irc-minimum-insulation-requirements-new-homes', 'IECC insulation minimums by climate zone'],
      ['https://jacksoncounty.colorado.gov/snow-loads', 'Colorado county snow loads'],
      ['https://latestcost.com/cost-well-septic-system-colorado/', 'Colorado well and septic costs']
    ];
    $('sources').innerHTML = src.map(function (s) { return '<li><a href="' + s[0] + '" target="_blank" rel="noopener">' + s[1] + '</a></li>'; }).join('');
  }

  function renderTricks() {
    var R = A.R, rooms = M.rooms, area = function (r) { return (r.b[1] - r.b[0]) * (r.b[3] - r.b[2]); };
    var total = rooms.reduce(function (a, r) { return a + area(r); }, 0), L = rooms[0];
    var t = [
      ['The living room is most of the house.', 'It is ' + ENG.ftIn(L.b[1] - L.b[0]) + ' by ' + ENG.ftIn(L.b[3] - L.b[2]) + ', about ' + Math.round(area(L)) + ' sq ft, or ' + Math.round(area(L) / total * 100) + '% of the room area. Bedrooms are ' + Math.round(area(rooms[1])) + ' and ' + Math.round(area(rooms[3])) + ' sq ft, with 9 ft ceilings.'],
      ['No hallway.', 'All three doors slide, and they open straight into the living room. That saves about 60 sq ft and every door swing.'],
      ['Tall glass on the south wall.', 'The wall is 17 ft high. Low winter sun reaches the stove and sofa. A 3 ft overhang blocks the high summer sun. Try the sun controls.'],
      ['A gear bay by the door.', 'Bench, hooks, boot shelf and board rack sit right inside. The wall furnace is next to it, so boots dry. Firewood lives ' + (A.R.porch && A.R.porch.big ? 'under the roof by the entry deck.' : 'on the covered porch.')],
      ['One wet corner.', 'Toilet, vanity and shower valve share one thick inside wall. The water heater, manifold and washer stack in the bath corner, so every pipe stays inside the insulation.'],
      [A.o.loft ? 'A gear loft over the bedrooms.' : 'Loft-ready ceilings.', A.o.loft ? 'A spiral stair climbs to a storage loft over the bedrooms. It is for gear, not sleeping: the roof is too low for a bedroom, and the stair arrives under a low part of the roof (see Checks).' : 'The bedroom ceilings are framed with 2x10s, so a storage loft and spiral stair can be added later.'],
      ['Built for snow.', 'The roof slopes north, away from the door. There are no gutters. The plumbing vent pokes through near the high edge and the chimney gets a snow splitter. The propane tank sits about 12 ft off the east end.']
    ];
    if (A.R.garage) t.push(['One roof over the car.', 'The garage roof is the house roof carried on west in the same plane, so there is no step for snow to drift against. You walk in from the car past the gear bench. Press Garage on the 3D model.']);
    A.$('tricks').innerHTML = t.map(function (x) { return '<li><b>' + x[0] + '</b> ' + x[1] + '</li>'; }).join('');
  }

  A.renderAll = function () {
    A.R = A.gen(A.o);
    if (A.viewer) { A.viewer.setModel(A.R); renderLayers(); showPart(null); }
    if (window.PLAN) PLAN.draw($('plan'), A.R);
    renderTricks();
    if (window.COST) COST.render();
    if (window.BUILD) BUILD.render();
    if (window.DWGUI) DWGUI.render();
    renderChecks();
    var s = A.R.bom.sum;
    $('stat-total').textContent = '$' + Math.round(s.total / 1000) + 'k';
    $('stat-sf').textContent = '$' + s.perSf + ' per sq ft, house';
  };

  document.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var d = b.dataset;
    if (d.view && A.viewer) { A.viewer.setView(d.view); document.querySelectorAll('[data-view]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); syncToggles(); }
    else if (d.toggle && A.viewer) {
      if (d.toggle === 'snow' && !A.viewer.state.snow && A.viewer.state.season === 'summer') setSeason('winter'); // snow means winter
      A.viewer.set(d.toggle, !A.viewer.state[d.toggle]); syncToggles();
    }
    else if (d.season && A.viewer) setSeason(d.season);
    else if (d.room && A.viewer) pickRoom(d.room);
    else if (d.set && A.viewer) applySet(d.set);
    else if (d.iso && A.viewer) {
      if (isoPrev && isoPrev.id === d.iso) { A.viewer.setLayers(isoPrev.map); isoPrev = null; }
      else {
        var prevMap = Object.assign({}, A.viewer.state.layers), map = {};
        M.catalog.layers.forEach(function (l) { map[l[0]] = l[0] === d.iso; });
        isoPrev = { id: d.iso, map: isoPrev ? isoPrev.map : prevMap };
        A.viewer.setLayers(map); if (/^(found|floor|wallf|plumb|elec|mech|insul|fix|furn)$/.test(d.iso)) A.viewer.set('roof', false); else A.viewer.set('roof', true);
        syncToggles();
      }
      renderLayers();
    }
    else if (d.cut !== undefined && A.viewer) {
      var ax = d.cut || null, rng = { x: [0, 32, 16], z: [0, 24, 12], y: [0, 22, 6.5] }[ax], pos = $('cutpos');
      document.querySelectorAll('[data-cut]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      if (rng) { pos.disabled = false; pos.min = rng[0]; pos.max = rng[1]; pos.value = rng[2]; A.viewer.setCut(ax, rng[2]); }
      else { pos.disabled = true; A.viewer.setCut(null, 0); }
    }
    else if (d.closeInfo !== undefined) { showPart(null); A.viewer && A.viewer.select(null); }
    else if (d.sheet && window.DWGUI) { DWGUI.open(d.sheet); $('drawings').scrollIntoView(); }
    else if (d.findline && window.COST) COST.find(d.findline);
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.layer && A.viewer) { var m = {}; m[t.dataset.layer] = t.checked; isoPrev = null; A.viewer.setLayers(m); renderLayers(); document.querySelectorAll('[data-set]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); }); }
  });

  A.start = function () {
    renderRooms(); renderNotes();
    A.R = A.gen(A.o);
    var host = $('viewer');
    try {
      A.viewer = startViewer(host, $('cv'), $('dimlayer'), A.R, {
        onPart: function (p) { showPart(p); document.querySelectorAll('[data-room]').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); },
        onRoom: function (id) { pickRoom(id); },
        onState: syncToggles
      });
      syncToggles(); sunText(); renderLayers();
      $('hour').addEventListener('input', function () { A.viewer.state.hour = parseFloat(this.value); sunText(); });
      $('explode').addEventListener('input', function () { A.viewer.setExplode(this.value / 100); $('explode-out').textContent = this.value + '%'; });
      $('cutpos').addEventListener('input', function () { A.viewer.setCut(A.viewer.state.cut, parseFloat(this.value)); });
    } catch (err) {
      console.error('viewer failed', err && err.stack || err); $('glnote').hidden = false;
    }
    A.renderAll();
    function useDl(dl) {
      A.dl = dl; if (!dl) return;
      ['dl-csv', 'dl-csv2', 'dl-json', 'dl-svg'].forEach(function (id) { $(id).hidden = false; });
      if (window.DWGUI) DWGUI.checkPdf();
    }
    if (window.claude && window.claude.use) window.claude.use('downloads').then(useDl).catch(function () {});
    // on an ordinary web host (S3, a file on disk) the browser saves the file itself
    else useDl({ save: function (o) {
      var blob = o.data instanceof Blob ? o.data : new Blob([o.data], { type: /\.csv$/.test(o.filename) ? 'text/csv' : /\.json$/.test(o.filename) ? 'application/json' : /\.svg$/.test(o.filename) ? 'image/svg+xml' : 'application/octet-stream' });
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = o.filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
      return Promise.resolve();
    } });
  };
  A.save = function (filename, data, btn) {
    if (!A.dl) return;
    var keep = btn ? btn.textContent : '';
    A.dl.save({ filename: filename, data: data }).then(function () { if (btn) { btn.textContent = 'Saved'; setTimeout(function () { btn.textContent = keep; }, 1600); } })
      .catch(function (err) { if (btn && err && err.code !== 'declined') { btn.textContent = 'Not available here'; setTimeout(function () { btn.textContent = keep; }, 2200); } });
  };
  return A;
})();
