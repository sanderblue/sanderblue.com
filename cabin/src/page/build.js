/* Rime Cabin page: build schedule chart, deliveries, rentals and trades, inspections, season notes. */
var BUILD = (function () {
  var A = APP, M = A.M, $ = A.$;
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function fmt(d, dow) { return (dow ? DOW[d.getUTCDay()] + ' ' : '') + MON[d.getUTCMonth()] + ' ' + d.getUTCDate(); }
  A.fmtDate = fmt;
  var tip = null;
  function showTip(e, text) {
    if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; document.body.appendChild(tip); }
    tip.textContent = text; tip.style.display = 'block';
    var x = Math.min(window.innerWidth - 270, e.clientX + 12); tip.style.left = x + 'px'; tip.style.top = (e.clientY + 14) + 'px';
  }

  function gantt() {
    var S = A.R.sched, rows = S.tasks, lw = 300, rh = 22, top = 34, W = 1000, cw = W - lw - 20, days = S.days + 2;
    var x = function (d) { return lw + d / days * cw; }, H = top + rows.length * rh + 10;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Build schedule, ' + S.days + ' working days">';
    // week grid and month labels
    for (var d = 0; d <= days; d += 5) {
      s += '<line class="g-grid" x1="' + x(d) + '" x2="' + x(d) + '" y1="' + (top - 6) + '" y2="' + (H - 6) + '"/>';
      var dt = ENG.addWorkDays(S.start, d);
      if (d % 10 === 0) s += '<text class="g-ax" x="' + x(d) + '" y="' + (top - 12) + '" text-anchor="middle">' + fmt(dt) + '</text>';
    }
    rows.forEach(function (t, i) {
      var y = top + i * rh, cy = y + rh / 2;
      s += '<text class="g-lab" x="' + (lw - 10) + '" y="' + (cy + 4) + '" text-anchor="end">' + A.esc(t.n) + '</text>';
      var label = t.n + ': ' + (t.d ? fmt(t.date, true) + ' to ' + fmt(t.endDate, true) + ', ' + t.d + ' working days' : fmt(t.date, true)) + (t.who === 'Pro' ? ', hired' : t.who === 'You' ? ', your crew' : '');
      if (t.d === 0) {
        var c = x(t.s), cls = t.who === 'Insp' ? 'g-insp' : 'g-mile';
        s += '<path class="g-bar ' + cls + '" d="M' + c + ' ' + (cy - 7) + ' L' + (c + 7) + ' ' + cy + ' L' + c + ' ' + (cy + 7) + ' L' + (c - 7) + ' ' + cy + ' Z" data-tip="' + A.esc(label) + '"/>';
      } else {
        var w = Math.max(3, x(t.e) - x(t.s) - 2);
        s += '<rect class="g-bar ' + (t.who === 'Pro' ? 'g-hired' : 'g-crew') + '" x="' + (x(t.s) + 1) + '" y="' + (cy - 7) + '" width="' + w + '" height="14" rx="3" data-tip="' + A.esc(label) + '"/>';
      }
    });
    s += '</svg>';
    $('gantt').innerHTML = '<div class="glegend"><span><i style="background:var(--crew)"></i>Your crew</span><span><i style="background:var(--hired)"></i>Hired</span><span><i style="background:var(--ink);transform:rotate(45deg) scale(.8)"></i>Inspection</span><span><i style="background:#fff;border:2px solid var(--ink);transform:rotate(45deg) scale(.8)"></i>Milestone</span></div>' + s;
    var dry = rows.filter(function (t) { return t.id === 'dry'; })[0];
    $('buildlede').textContent = S.days + ' working days for two people, ' + fmt(S.start) + ' to ' + fmt(S.finish) + ', ' + S.start.getUTCFullYear() + '. Dried in by ' + fmt(dry.date) + '. ' + M.logistics.startNote;
  }

  function lists() {
    var S = A.R.sched;
    $('drops').innerHTML = S.deliveries.map(function (d) {
      var names = d.items.map(function (l) { return l.n; });
      return '<li><b>' + d.id + ' ' + A.esc(d.name) + '</b>, ' + fmt(d.date, true) + (d.lead >= 2 ? ' (order by ' + fmt(d.order) + ')' : '') + '. ' + A.esc(names.slice(0, 6).join(', ')) + (names.length > 6 ? ' and ' + (names.length - 6) + ' more' : '') + '.</li>';
    }).join('');
    var rent = A.R.bom.lines.filter(function (l) { return l.rent; });
    $('trades').innerHTML = rent.map(function (l) { return '<li><b>Rent:</b> ' + A.esc(l.n) + ' (' + A.money(l.ext) + ')</li>'; }).join('') +
      M.logistics.trades.filter(function (t) { return t[0] !== 'Concrete sub' || A.o.found === 'crawl'; }).filter(function (t) { return t[0] !== 'Framing help' || A.o.help; })
        .map(function (t) { return '<li><b>' + A.esc(t[0]) + ':</b> ' + A.esc(t[1]) + '</li>'; }).join('');
    var by = {}; S.tasks.forEach(function (t) { by[t.id] = t; });
    var when = { 0: 'i1', 2: 'i2', 3: 'i2', 4: 'i2', 5: 'i2', 6: 'i2', 7: 'i3', 8: 'i4' };
    $('insp').innerHTML = M.logistics.inspections.filter(function (x, i) { return i !== 1 || A.o.found === 'crawl'; }).map(function (x) {
      var i = M.logistics.inspections.indexOf(x), t = by[when[i]];
      return '<li><b>' + A.esc(x[0]) + '</b>' + (t ? ', about ' + fmt(t.date) : '') + '. ' + A.esc(x[1]) + '</li>';
    }).join('');
    $('weather').innerHTML = M.logistics.weather.map(function (w) { return '<li><b>' + A.esc(w[0]) + ':</b> ' + A.esc(w[1]) + '</li>'; }).join('');
  }

  document.addEventListener('pointermove', function (e) {
    var t = e.target.closest && e.target.closest('[data-tip]');
    if (t) showTip(e, t.getAttribute('data-tip')); else if (tip) tip.style.display = 'none';
  });

  return { render: function () { gantt(); lists(); } };
})();
