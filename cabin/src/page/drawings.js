/* Drawings viewer: sheet picker, zoom, SVG and PDF downloads. Sheets are drawn live from A.R. */
var DWGUI = (function () {
  var A = APP, $ = A.$, cur = 'A-101', zoom = 1, svg = '', built = false, PDF = 'rime-cabin-drawings.pdf', pdfOk = false;

  function chips() {
    $('sheetlist').innerHTML = DWG.sheets().map(function (s) {
      return '<button type="button" class="segbtn sm" data-dsheet="' + s.num + '" aria-pressed="' + (s.num === cur) + '" title="' + A.esc(s.title) + '">' + s.num + '</button>';
    }).join('');
    built = true;
  }
  function cover() {
    // the cover sheet shows the 3D model as it is set up right now
    try { DWG.coverImage = A.viewer ? A.viewer.shotAt('cover', 1500, 980) : null; } catch (e) { DWG.coverImage = null; }
  }
  function render() {
    if (!window.DWG || !A.R) return;
    if (!built) chips();
    var s = DWG.sheets().filter(function (x) { return x.num === cur; })[0] || DWG.sheets()[0];
    cur = s.num;
    if (cur === 'G-001') cover();
    try { svg = DWG.render(A.R, cur); } catch (e) { console.error('sheet failed', e); svg = ''; }
    $('sheetbox').innerHTML = svg || '<p style="padding:24px">This sheet could not be drawn.</p>';
    $('sheettitle').textContent = s.num + '  ' + s.title;
    applyZoom();
    document.querySelectorAll('[data-dsheet]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.dsheet === cur)); });
  }
  function applyZoom() {
    var el = $('sheetbox').querySelector('svg'); if (el) el.style.width = (zoom * 100) + '%';
    $('sheetbox').classList.toggle('fit', zoom === 1); // fit: box hugs the sheet; zoomed: fixed box you scroll in
    document.querySelectorAll('[data-zoom]').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.zoom === zoom)); });
  }
  function open(num) { cur = num; render(); }
  function checkPdf() {
    // the PDF set is published next to the page; it shows the default choices
    if (!A.dl || pdfOk) return;
    fetch(PDF, { method: 'HEAD' }).then(function (r) {
      if (!r.ok) return;
      pdfOk = true; ['dl-pdf', 'dl-pdf2'].forEach(function (id) { $(id).hidden = false; });
    }).catch(function () {});
  }
  function savePdf(btn) {
    var keep = btn.textContent; btn.textContent = 'Getting the file…';
    fetch(PDF).then(function (r) { if (!r.ok) throw new Error('missing'); return r.blob(); })
      .then(function (b) { btn.textContent = keep; A.save(PDF, b, btn); })
      .catch(function () { btn.textContent = 'Not available here'; setTimeout(function () { btn.textContent = keep; }, 2200); });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.dsheet) open(b.dataset.dsheet);
    else if (b.dataset.zoom) { zoom = +b.dataset.zoom; applyZoom(); }
    else if (b.id === 'dl-svg' && svg) A.save('rime-cabin-' + cur + '.svg', svg, b);
    else if (b.id === 'dl-pdf' || b.id === 'dl-pdf2') savePdf(b);
  });

  return { render: render, open: open, checkPdf: checkPdf };
})();
