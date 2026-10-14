/* Rime Cabin drawing set: G-001 cover and G-002 general notes. */
(function (D) {
  var fi = D.fi;
  D.reg('G-001', 'Cover, sheet index and project data', 'None', function (sh, R) {
    var M = R.M, o = R.o, s = R.bom.sum;
    sh.text(220, 230, 'RIME CABIN', 'th', null).add('');
    sh.out[sh.out.length - 2] = sh.out[sh.out.length - 2].replace('class="th"', 'class="th" style="font-size:150px;letter-spacing:4px"');
    sh.text(226, 300, 'Owner-built mountain cabin · 24 x 32 ft · 2 bedrooms, 1 bath · 768 sq ft', 'tl');
    sh.text(226, 334, M.meta.site, 't');
    if (D.coverImage) sh.add('<image href="' + D.coverImage + '" x="220" y="380" width="1500" height="980" preserveAspectRatio="xMidYMid slice"/>');
    else { sh.rect(220, 380, 1500, 980, 'f-roof d-lt'); sh.text(970, 870, '3D view appears here when printed from the page', 'ts', 'middle'); }
    sh.rect(220, 380, 1500, 980, 'd-md');
    var y = 1430;
    y += sh.table(220, y, [{ h: 'Project data', w: 420 }, { h: '', w: 1080, wrap: true }], [
      ['Use', 'Part-time single-family cabin, owner-occupied on visits. May be left unheated between trips.'],
      ['Size', '768 sq ft gross, one story with ' + (o.loft ? 'a storage loft' : 'loft-ready ceilings') + '. Rooms: living/kitchen/entry, 2 bedrooms, bath with laundry.'],
      ['Construction', 'Type V-B wood frame. ' + (o.found === 'piers' ? 'Concrete piers with flush LVL beams; hold-down piers under the braced end walls.' : 'Insulated crawlspace on concrete stem walls.') + ' 4:12 single-slope roof, metal.'],
      ['Codes (assumed)', '2021 IRC and 2021 IECC, climate zone 7, as adopted by the county. NFPA 58 for propane. NEC as adopted.'],
      ['Design loads', 'Roof snow ' + o.snow + ' psf (assumed), roof dead ' + M.structure.dead + ' psf, floor live 40 psf, wind ' + M.structure.wind + ', soil ' + M.structure.soil + '.'],
      ['Heat and fuel', { both: 'Propane wall furnace plus wood stove', propane: 'Propane wall furnace', wood: 'Wood stove' }[o.heat] + '. Propane tankless water heater and cooktop. 500 gal propane tank.'],
      ['Power', o.power === 'grid' ? 'Utility service, 100 A panel.' : 'Off-grid solar 4.4 kW, 15 kWh battery, propane generator, 100 A panel.'],
      ['Water and waste', 'Private well (or hauled-water cistern) and septic system, designed separately.'],
      ['Garage', R.garage ? 'Attached 1-car garage, 16 x 24 ft, on the west wall, door to the west, roof in the plane of the house roof. Not insulated; propane wall heater. See A-601.' : 'None with these choices.'],
      ['Covered areas', (R.G.cover ? 'North: house roof carried ' + fi(-R.G.cover.z) + ' past the north wall to an LVL beam on four 6x6 posts, flush with the garage eave, about ' + fi(R.G.rb(R.G.cover.z - R.G.cover.beam[0] / 2) - R.G.cover.beam[1]) + ' clear. ' : '') + (R.garage && R.garage.entry ? 'West: garage roof carried south over the entry to the house\'s south eave, on an LVL beam and ' + R.garage.ebeam.posts.length + ' 8x8 posts; 8 x 12 ft 6 in entry deck under it. ' : '') + (!R.G.cover && !(R.garage && R.garage.entry) ? 'None with these choices.' : 'Open sides, cedar ceilings.')],
      ['Estimate', 'About $' + Math.round(s.total / 1000) + 'k with tax and a 10% contingency' + (R.garage ? ', garage included' : '') + '; site work, well, septic and utilities extra. See the parts list.']
    ], { size: 12 }) + 40;
    sh.rect(220, y, 1500, 120, 'stamp');
    sh.para(240, y + 32, 1460, M.meta.disclaimer, 13, 't');
    // sheet index
    var list = D.sheets().map(function (x) { return [x.num, x.title]; });
    var h = sh.table(1900, 380, [{ h: 'Sheet', w: 160 }, { h: 'Title', w: 1100 }], list, { title: 'Sheet index', size: 12.5, rh: 26 });
    var y2 = 380 + h + 70;
    var ck = R.checks.filter(function (c) { return c.cat !== 'Model'; }).map(function (c) { return [c.status === 'eng' ? 'ENGINEER' : c.status.toUpperCase(), c.name, c.ref]; });
    sh.table(1900, y2, [{ h: 'Result', w: 160 }, { h: 'Code and design check', w: 700, wrap: true }, { h: 'Reference', w: 400, wrap: true }], ck, { title: 'Code summary (checked against the model, details on G-002)', size: 11 });
  });

  D.reg('G-002', 'General notes, checks and specifications', 'None', function (sh, R) {
    var N = R.M.logistics.notes, x = [220, 1240, 2260], y = [150, 150, 150], w = 920;
    function col(i, title, list, size) { y[i] += sh.notes(x[i], y[i], w, title, list, size || 12) + 40; }
    col(0, 'General', N.general); col(0, 'Foundation', N.foundation); col(0, 'Framing', N.framing);
    col(1, 'Envelope', N.envelope); col(1, 'Systems', N.systems);
    col(1, 'Assumptions', R.M.logistics.assumptions, 11.5);
    col(2, 'Not verified', R.M.logistics.unverified, 11.5);
    var ck = R.checks.map(function (c) { return [c.status === 'eng' ? 'ENG.' : c.status.toUpperCase(), c.name, c.detail]; });
    sh.table(x[2], y[2] + 10, [{ h: 'Result', w: 90 }, { h: 'Check', w: 220, wrap: true }, { h: 'What the model shows', w: 640, wrap: true }], ck, { title: 'Checks run on the model', size: 9.5, rh: 16 });
    var abbr = [['AFF', 'Above finished floor'], ['C/L', 'Center line'], ['AAV', 'Air admittance valve (lets air into a drain without a vent pipe)'], ['ACH50', 'Air changes per hour at a 50 pascal blower-door test'], ['ci', 'Continuous insulation (foam over the studs)'], ['CSST', 'Corrugated stainless steel tubing (gas)'], ['DWV', 'Drain, waste and vent'], ['GFCI / AFCI', 'Ground-fault / arc-fault protection. GFCI/AFCI = one dual-function breaker'], ['GFPE', 'Ground-fault protection of equipment (heat cable breaker)'], ['LVL / LSL', 'Laminated veneer / strand lumber'], ['O.C.', 'On center'], ['PT', 'Pressure-treated'], ['T.O.', 'Top of'], ['ZIP-R', 'Insulated structural sheathing']];
    sh.table(x[0], Math.max(y[0], 1500), [{ h: 'Abbreviation', w: 240 }, { h: 'Meaning', w: 680 }], abbr, { title: 'Abbreviations', size: 11 });
  });
})(DWG);
