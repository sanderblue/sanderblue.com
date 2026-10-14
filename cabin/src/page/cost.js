/* Rime Cabin page: choices, totals, parts list, site costs and ways to spend less. */
var COST = (function () {
  var A = APP, M = A.M, $ = A.$, grouped = true, sortKey = null, sortDir = 1, open = {};
  function dtext(d) { return Math.abs(d) < 50 ? '' : (d > 0 ? '+' : '−') + '$' + (Math.round(Math.abs(d) / 100) / 10).toFixed(1) + 'k'; }
  function delta(ch) { var o = Object.assign({}, A.o, ch); return A.total(o) - A.R.bom.sum.total; }

  function controls() {
    var h = '<div class="presets"><button type="button" class="btn" data-preset="draw">As drawn</button><button type="button" class="btn" data-preset="lean">Lean build</button></div>';
    M.inputs.options.forEach(function (c) {
      h += '<div class="choice" role="group" aria-label="' + c.label + '"><span class="lbl">' + c.label + '</span><div class="seg">';
      c.list.forEach(function (it) {
        var on = A.o[c.key] === it[0], ch = {}; ch[c.key] = it[0];
        var d = on ? 0 : delta(ch);
        h += '<button type="button" class="segbtn" aria-pressed="' + on + '" data-key="' + c.key + '" data-val="' + it[0] + '">' + it[1] + (d ? '<em>' + dtext(d) + '</em>' : '') + '</button>';
      });
      h += '</div></div>';
    });
    h += '<div class="choice" role="group" aria-label="Extras"><span class="lbl">Extras</span><div class="seg">';
    M.inputs.switches.forEach(function (s) {
      var on = !!A.o[s[0]], ch = {}; ch[s[0]] = !on;
      h += '<button type="button" class="segbtn" aria-pressed="' + on + '" data-sw="' + s[0] + '">' + s[1] + '<em>' + dtext(delta(ch)) + '</em></button>';
    });
    $('ctl').innerHTML = h + '</div></div>';
  }

  function totals() {
    var s = A.R.bom.sum;
    $('totals').innerHTML = '<div><span>Parts and services</span><b>' + A.money(s.parts) + '</b></div><div><span>Sales tax, est.</span><b>' + A.money(s.tax) + '</b></div><div><span>Surprise fund, 10%</span><b>' + A.money(s.cont) + '</b></div><div class="big"><span>Estimated total</span><b>' + A.money(s.total) + '</b></div><div><span>Per square foot (house only)</span><b>$' + s.perSf + '</b></div>';
    var gs = A.R.bom.groups.slice().sort(function (a, b) { return b.total - a.total; }), mx = gs[0].total;
    $('bysys').innerHTML = gs.map(function (g) {
      return '<div class="brow" title="' + A.esc(g.name) + ': ' + A.money(g.total) + '"><span>' + A.esc(g.name) + '</span><span class="t"><span class="b" style="width:' + (g.total / mx * 100).toFixed(1) + '%"></span></span><span class="v">' + A.k(g.total) + '</span></div>';
    }).join('');
    var rows = [['Materials and parts', s.mat], ['Hired trades, engineer, permit, insurance', s.pro], ['Rentals', s.rent], ['Delivery', s.deliv], ['Sales tax on materials (estimate)', s.tax], ['Surprise fund, 10%', s.cont]];
    $('summary').innerHTML = rows.map(function (r) { return '<tr><td>' + r[0] + '</td><td class="num">' + A.money(r[1]) + '</td></tr>'; }).join('') + '<tr class="tot"><td>Estimated total</td><td class="num">' + A.money(s.total) + '</td></tr>';
  }

  var COLS = [['id', 'ID'], ['n', 'Item'], ['q', 'Qty', 1], ['p', 'Each', 1], ['ext', 'Cost', 1], ['by', 'Who'], ['sup', 'Supplier'], ['lead', 'Lead'], ['sheet', 'Sheet']];
  function row(l) {
    return '<tr id="line-' + l.id + '"><td class="idc">' + l.id + '</td><td class="item"><span class="nm">' + A.esc(l.n) + (l.chk ? '<i class="chk" title="Price compared with a 2026 source">●</i>' : '') + '</span>' + (l.s ? '<span class="sp">' + A.esc(l.s) + '</span>' : '') + (l.note ? '<span class="sp">' + A.esc(l.note) + '</span>' : '') + '</td>' +
      '<td class="num">' + l.q.toLocaleString('en-US') + ' ' + l.u + '</td><td class="num">' + (l.p < 10 ? '$' + l.p.toFixed(2).replace(/\.00$/, '') : A.money(l.p)) + '</td><td class="num">' + A.money(l.ext) + '</td>' +
      '<td class="who">' + A.esc(l.by) + '</td><td class="small">' + A.esc(l.sup) + '</td><td class="small">' + A.esc(l.lead) + '</td><td class="small">' + (l.sheet && l.sheet !== '-' ? '<button type="button" class="linkbtn" data-sheet="' + l.sheet + '">' + l.sheet + '</button>' : '') + '</td></tr>';
  }
  function bom() {
    var B = A.R.bom, h = '<thead><tr>' + COLS.map(function (c) {
      var dir = sortKey === c[0] ? (sortDir > 0 ? 'asc' : 'desc') : '';
      return '<th scope="col"' + (c[2] ? ' class="num"' : '') + '><button type="button" data-sort="' + c[0] + '"' + (dir ? ' data-dir="' + dir + '"' : '') + '>' + c[1] + '</button></th>';
    }).join('') + '</tr></thead>';
    if (grouped) {
      B.groups.forEach(function (g) {
        var on = !!open[g.id];
        h += '<tbody><tr class="grp"><th colspan="4" scope="colgroup"><button type="button" class="gbtn" data-grp="' + g.id + '" aria-expanded="' + on + '">' + A.esc(g.name) + ' <span class="small">' + g.lines.length + ' lines</span></button></th><td class="num">' + A.money(g.total) + '</td><td colspan="4"></td></tr>';
        if (on) h += g.lines.map(row).join('');
        h += '</tbody>';
      });
    } else {
      var ls = B.lines.slice();
      if (sortKey) ls.sort(function (a, b) { var x = a[sortKey], y = b[sortKey]; return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * sortDir; });
      h += '<tbody>' + ls.map(row).join('') + '</tbody>';
    }
    $('bom').innerHTML = h;
    $('bomcount').textContent = B.lines.length + ' lines, ' + A.R.parts.length.toLocaleString('en-US') + ' model parts';
    $('grouptoggle').setAttribute('aria-pressed', String(grouped));
    var allOpen = A.R.bom.groups.every(function (g) { return open[g.id]; });
    $('openall').textContent = grouped && allOpen ? 'Close all' : 'Open all';
  }

  function site() {
    $('site').innerHTML = A.R.bom.site.map(function (s) {
      return '<tr><td class="item"><span class="nm">' + A.esc(s.n) + (s.chk ? '<i class="chk" title="Range from a 2026 source">●</i>' : '') + '</span><span class="sp">' + A.esc(s.note) + '</span></td><td class="num rng">' + (s.lo ? A.money(s.lo) + ' to ' + A.money(s.hi) : 'Get a quote') + '</td></tr>';
    }).join('');
    var rate = (1 + M.rates.tax) * (1 + M.rates.contingency);
    $('ve').innerHTML = M.logistics.valueEng.map(function (v) {
      var txt;
      if (v.opt) {
        var same = Object.keys(v.opt).every(function (k) { return A.o[k] === v.opt[k]; });
        txt = same ? '<span class="small">Already chosen</span>' : '<span class="save">' + A.money(-delta(v.opt)) + '</span>';
      } else txt = '<span class="save">' + A.money(v.save * rate) + '</span><br><span class="small">my estimate</span>';
      return '<tr><td class="item"><span class="nm">' + A.esc(v.n) + '</span><span class="sp">' + A.esc(v.trade) + '</span></td><td class="num">' + txt + '</td></tr>';
    }).join('');
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var d = b.dataset, changed = false;
    if (d.preset) { A.o = Object.assign({}, d.preset === 'lean' ? M.inputs.lean : M.inputs.defaults); changed = true; }
    else if (d.key) { A.o[d.key] = d.val; changed = true; }
    else if (d.sw) { A.o[d.sw] = !A.o[d.sw]; changed = true; }
    else if (d.sort) { if (sortKey === d.sort) sortDir = -sortDir; else { sortKey = d.sort; sortDir = /^(q|p|ext)$/.test(d.sort) ? -1 : 1; } grouped = false; bom(); }
    else if (b.id === 'grouptoggle') { grouped = !grouped; if (grouped) sortKey = null; bom(); }
    else if (d.grp) { open[d.grp] = !open[d.grp]; bom(); }
    else if (b.id === 'openall') { var all = A.R.bom.groups.every(function (g) { return open[g.id]; }); A.R.bom.groups.forEach(function (g) { open[g.id] = !all; }); grouped = true; sortKey = null; bom(); }
    else if (b.id === 'dl-csv' || b.id === 'dl-csv2') A.save('rime-cabin-parts-list.csv', ENG.csv(A.R), b);
    else if (b.id === 'dl-json') A.save('rime-cabin-model.json', JSON.stringify(M, null, 1), b);
    if (changed) A.renderAll();
  });

  return {
    render: function () { controls(); totals(); bom(); site(); },
    find: function (id) {
      var ln = A.lineFor(id); if (ln) open[ln.g] = true;
      grouped = true; sortKey = null; bom();
      var r = document.getElementById('line-' + id); if (!r) return;
      r.scrollIntoView({ block: 'center' }); r.style.background = '#fbe3d6'; setTimeout(function () { r.style.background = ''; }, 2200);
    }
  };
})();
