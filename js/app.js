/* UI controller: routing (#/M1/presupuesto, #/comparativa), tab rendering,
   global pages, CSV export and print. */
(function () {
  'use strict';

  const C = window.RoperoCatalog;
  const E = window.RoperoEngine;
  const M = window.RoperoModels;
  const P = window.RoperoPlans;
  const T = window.RoperoContent;
  const usd = E.fmtUSD;
  const mm = E.fmtMm;
  const num = E.fmtNum;

  const TABS = [
    { id: '3d', label: 'Vista 3D' },
    { id: 'frontal', label: 'Vista frontal' },
    { id: 'plano', label: 'Plano técnico' },
    { id: 'despiece', label: 'Despiece' },
    { id: 'cortecloud', label: 'Formulario Cortecloud' },
    { id: 'cortes', label: 'Optimización de cortes' },
    { id: 'presupuesto', label: 'Presupuesto' }
  ];
  const PAGES = [
    { id: 'investigacion', label: 'Investigación' },
    { id: 'comparativa', label: 'Comparativa' },
    { id: 'resumen', label: 'Resumen' },
    { id: 'preguntas', label: 'Preguntas para Luissi' },
    { id: 'supuestos', label: 'Supuestos y notas' }
  ];
  const LANDSCAPE = { '3d': 1, frontal: 1, plano: 1, cortecloud: 1, cortes: 1, comparativa: 1 };
  const SHEET_TABS = { frontal: 1, plano: 1, cortecloud: 1 };
  const BOARD_SHORT = {
    fj3450: 'Finger Joint 20 mm × 3,45 m', fj2400: 'Finger Joint 20 mm × 2,40 m',
    euc3: 'Compensado Eucaliptus Clear 3 mm', ced4: 'Compensado Cedro Real 4 mm'
  };

  const cache = {};
  function analysis(id) { return cache[id] || (cache[id] = E.analyze(M.build(id))); }
  function allAnalyses() { return M.ids.map(analysis); }

  const $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function tag(kind) {
    const t = { luissi: 'Dato Luissi', calc: 'Cálculo propio', nf: 'No encontrado en Luissi' }[kind];
    return '<span class="tag ' + kind + '">' + t + '</span>';
  }
  function link(url, text) { return '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(text) + '</a>'; }
  function table(head, rows, opts) {
    const o = opts || {};
    const th = head.map(function (h, i) { return '<th' + (o.num && o.num.indexOf(i) >= 0 ? ' class="num"' : '') + '>' + h + '</th>'; }).join('');
    return '<div class="table-wrap"><table class="tbl' + (o.cls ? ' ' + o.cls : '') + '"><thead><tr>' + th + '</tr></thead><tbody>' + rows.join('') + '</tbody>' + (o.foot || '') + '</table></div>';
  }
  function tr(cells, numIdx, cls) {
    return '<tr' + (cls ? ' class="' + cls + '"' : '') + '>' + cells.map(function (c, i) { return '<td' + (numIdx && numIdx.indexOf(i) >= 0 ? ' class="num"' : '') + '>' + c + '</td>'; }).join('') + '</tr>';
  }
  function boardsText(a) {
    const out = [];
    ['fj3450', 'fj2400'].forEach(function (t) { const n = a.nest.fj && a.nest.fj.types[t]; if (n) out.push(n + ' × ' + BOARD_SHORT[t]); });
    ['euc3', 'ced4'].forEach(function (t) { if (a.nest[t]) out.push(a.nest[t].boards.length + ' × ' + BOARD_SHORT[t]); });
    return out.join(' + ');
  }
  function depthTotal(m) { return m.tb + m.Dc + (m.doors.some(function (d) { return d.type === 'hinged'; }) ? 22 : 0); }
  function dimsText(m) { return m.W + ' × ' + m.H + ' × ' + m.Dc + ' mm'; }
  function catOf(a, name) { return a.budget.categories.filter(function (c) { return c.name === name; })[0]; }

  // ---------- state & routing ----------
  const state = { model: 'M1', tab: '3d', page: null };
  function parseHash() {
    const h = (location.hash || '').replace(/^#\/?/, '').split('/');
    if (M.ids.indexOf(h[0]) >= 0) {
      state.model = h[0]; state.page = null;
      state.tab = TABS.some(function (t) { return t.id === h[1]; }) ? h[1] : state.tab;
    } else if (PAGES.some(function (p) { return p.id === h[0]; })) {
      state.page = h[0];
    }
  }
  function go(hash) { if (location.hash !== hash) location.hash = hash; else render(); }

  function renderNav() {
    $('model-nav').innerHTML = M.ids.map(function (id) {
      const m = analysis(id).model;
      return '<a class="nav-btn" href="#/' + id + '/' + state.tab + '" aria-current="' + (!state.page && state.model === id) + '">' + id + ' <small>' + esc(m.name) + '</small></a>';
    }).join('');
    $('page-nav').innerHTML = PAGES.map(function (p) {
      return '<a class="nav-btn" href="#/' + p.id + '" aria-current="' + (state.page === p.id) + '">' + p.label + '</a>';
    }).join('');
  }

  // ---------- model header & tabs ----------
  function renderModelHead(a) {
    const m = a.model;
    $('model-head').innerHTML =
      '<div><h1>' + esc(m.fullName) + '</h1>' +
      '<div class="facts">' + dimsText(m) + ' (ancho × alto × profundidad de carcasa; total con fondo' + (depthTotal(m) > m.Dc + m.tb ? ' y puertas' : '') + ': ' + depthTotal(m) + ' mm) · ' + esc(m.base) + '</div>' +
      '<div class="facts">' + esc(m.summary) + '</div></div>' +
      '<div class="total-pill">Costo total de materiales: <b>' + usd(a.budget.totalCents) + '</b><br><span class="muted small">Falta sumar el costo de los cortes.</span></div>';
    $('tabs').innerHTML = TABS.map(function (t) {
      return '<a class="tab" role="tab" href="#/' + m.id + '/' + t.id + '" aria-selected="' + (state.tab === t.id) + '">' + t.label + '</a>';
    }).join('');
  }

  // ---------- 3D ----------
  let viewer = null;
  function show3D(a) {
    if (!window.RoperoViewer || !window.RoperoViewer.supported()) {
      $('viewer').innerHTML = '<div class="fallback">No se pudo cargar Three.js (vendor/three.min.js). Las demás vistas funcionan igual.</div>';
      return;
    }
    if (!viewer) {
      try {
        viewer = window.RoperoViewer.create($('viewer'), $('viewer-overlay'));
      } catch (err) {
        $('viewer').innerHTML = '<div class="fallback">WebGL no disponible en este navegador: ' + esc(err.message) + '</div>';
        return;
      }
      const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
      viewer.setTheme(dark && dark.matches);
      if (dark && dark.addEventListener) dark.addEventListener('change', function (e) { viewer.setTheme(e.matches); });
      document.querySelectorAll('[data-preset]').forEach(function (b) {
        b.addEventListener('click', function () { viewer.preset(b.getAttribute('data-preset')); });
      });
      $('open-toggle').addEventListener('change', function (e) { viewer.setOpen(e.target.checked); });
      $('dims-toggle').addEventListener('change', function (e) { viewer.setDims(e.target.checked); });
    }
    if (viewer.model !== a.model) {
      viewer.setModel(a.model);
      viewer.setOpen($('open-toggle').checked);
      viewer.setDims($('dims-toggle').checked);
    }
    viewer.resize();
    $('viewer-hint').textContent = a.model.doors[0].type === 'sliding' ? 'Corredizas: al abrir, la hoja delantera se desplaza sobre la trasera.' : 'Al abrir, las puertas giran sobre su lado de bisagras y los cajones salen.';
  }

  // ---------- tabs ----------
  function tabFrontal(a) {
    const m = a.model;
    return '<div class="sheet">' + P.sheetFront(m) + '</div>' +
      '<div class="card small"><b>Cuerpos:</b> ' + m.bays.map(function (b) { return esc(b.label) + ' (' + (b.x1 - b.x0) + ' mm libres)'; }).join(' · ') +
      '<br>' + m.notes.map(esc).join('<br>') + '</div>';
  }

  function tabPlano(a) {
    return P.allSheets(a.model).map(function (s) { return '<div class="sheet">' + s + '</div>'; }).join('');
  }

  function machiningHTML(a) {
    return table(['Mecanizado', 'Cantidad', 'Detalle'], a.machining.map(function (x) {
      return tr([esc(x.op), num(x.qty, 0) + ' ' + esc(x.unit), x.detail ? x.detail.map(esc).join('<br>') : '']);
    }));
  }
  function toolsHTML() {
    return '<ul class="list">' + T.tools.map(function (t) { return '<li><b>' + esc(t.t) + '</b> — ' + esc(t.why) + '</li>'; }).join('') + '</ul>';
  }

  function tabDespiece(a) {
    const rows = a.despiece.map(function (r) {
      return tr([r.no, esc(r.name), r.qty, mm(r.L), mm(r.A), mm(r.T), esc(r.mat), esc(r.veta), esc(r.notes)], [2, 3, 4, 5]);
    });
    const h = a.homeCuts;
    const home = h.tacos ? table(['Pieza', 'Cant.', 'Medida (mm)', 'De dónde sale'], [
      tr(['Taco soporte de barra', h.tacos, '80 × 45 × 20', 'Tira para tacos (' + h.strips.map(function (s) { return s.L + ' × 45'; }).join(', ') + '), corte cada 80 mm; se descuentan 4 mm de sierra por taco'], [1])
    ]) : '<p>No hay cortes en casa.</p>';
    return '<div class="card"><h2 style="margin-top:0">Despiece ' + tag('calc') + '</h2>' +
      '<p class="small muted">Largo = sentido de la veta (finger joint) o lado mayor (compensados). Nº = número de fila en el Formulario Cortecloud y en los planos de corte.</p>' +
      table(['Nº', 'Pieza', 'Cant.', 'Largo', 'Ancho', 'Espesor', 'Material', 'Veta', 'Notas'], rows, { num: [2, 3, 4, 5] }) + '</div>' +
      '<div class="card"><h2 style="margin-top:0">Cortes en casa</h2><p class="small">Los tacos de 80 × 45 × 20 son demasiado chicos para la seccionadora automática: Luissi corta la tira y vos la trozás.</p>' + home + '</div>' +
      '<div class="card"><h2 style="margin-top:0">Mecanizados que hacés vos ' + tag('calc') + '</h2><p class="small">El perfil de Luissi en Cortecloud indica "Perforación: Canto / Cara / Fondo: No realiza".</p>' + machiningHTML(a) + '</div>' +
      '<div class="card"><h2 style="margin-top:0">Herramientas necesarias</h2><p class="small muted">Informativo, sin precio.</p>' + toolsHTML() + '</div>';
  }

  function ccSheets(a) {
    const rows = a.cortecloud;
    const pages = E.paginate(rows, E.CC_ROWS_PER_SHEET);
    return pages.map(function (pg, pi) {
      const body = [];
      for (let i = 0; i < E.CC_ROWS_PER_SHEET; i++) {
        const r = pg[i];
        body.push(r ? '<tr><td class="c">' + r.no + '</td><td class="c">' + r.qty + '</td><td class="r">' + mm(r.L) + '</td><td class="r">' + mm(r.A) + '</td><td>' + esc(r.board) + '</td><td>' + esc(r.func) + '</td><td class="c">' + r.rotate + '</td><td></td><td></td><td></td><td></td><td></td></tr>'
          : '<tr>' + '<td></td>'.repeat(12) + '</tr>');
      }
      const cols = '<colgroup><col style="width:4%"><col style="width:5%"><col style="width:6%"><col style="width:6%"><col style="width:21%"><col style="width:24%"><col style="width:6%"><col style="width:12%"><col style="width:4%"><col style="width:4%"><col style="width:4%"><col style="width:4%"></colgroup>';
      return '<div class="cc-sheet"><div class="cc-head"><div><strong>Formulario estándar — Lista de las piezas</strong><br>' + esc(a.model.fullName) + ' · Servicio completo · Barraca Luissi</div><div style="text-align:right">Hoja ' + (pi + 1) + ' de ' + pages.length + '<br>27/09/2026</div></div>' +
        '<table class="cc">' + cols + '<thead><tr>' + E.CC_COLUMNS.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' + body.join('') + '</tbody></table>' +
        '<div class="cc-foot">L = medida en el sentido de la veta (largo del tablero). Girar: "No" = respetar la veta (finger joint); "Sí" = puede girarse (compensado). Tapacanto vacío: el canto del finger joint es madera maciza. Los tacos se cortan en casa (no figuran).</div></div>';
    }).join('');
  }

  function tabCortecloud(a) {
    const flagged = a.cortecloud.filter(function (r) { return r.notes.some(function (n) { return /ancho mínimo/.test(n); }); });
    return '<div class="card no-print"><button class="btn primary" type="button" id="csv-btn">Descargar CSV</button> ' +
      '<span class="small muted">Mismas columnas que el formulario; separador punto y coma, UTF-8. ' + a.cortecloud.length + ' filas, ' + a.cortecloud.reduce(function (s, r) { return s + r.qty; }, 0) + ' piezas.</span>' +
      (flagged.length ? '<p class="small">Consultar ancho mínimo de corte: ' + flagged.map(function (r) { return 'Nº ' + r.no + ' ' + esc(r.func) + ' (' + mm(r.A) + ' mm)'; }).join(' · ') + '.</p>' : '') + '</div>' +
      ccSheets(a);
  }

  function downloadCSV(a) {
    const blob = new Blob([E.cortecloudCSV(a.cortecloud)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const el = document.createElement('a');
    el.href = url;
    el.download = 'cortecloud-' + a.model.id + '-' + a.model.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.csv';
    document.body.appendChild(el);
    el.click();
    setTimeout(function () { URL.revokeObjectURL(url); el.remove(); }, 500);
  }

  function nestSummary(r, label) {
    return '<div class="stat"><div class="k">' + label + '</div><div class="v">' + r.boards.length + ' ' + (r.boards.length === 1 ? 'tablero' : 'tableros') + '</div>' +
      '<div class="small muted">Aprovechamiento ' + num(r.util * 100, 1) + ' % · desperdicio ' + num(r.waste, 2) + ' m² · ' + usd(r.costCents) + '</div></div>';
  }

  function boardCards(r, matLabel, offset) {
    return r.boards.map(function (b, i) {
      const pieces = b.placements.map(function (p) { return '<li>Nº ' + p.item.row + ' ' + esc(p.item.name) + ' ' + mm(p.item.L) + ' × ' + mm(p.item.A) + (p.rot ? ' (girada)' : '') + '</li>'; }).join('');
      return '<div class="board-card"><h3>Tablero ' + (offset + i + 1) + ' · ' + esc(BOARD_SHORT[b.typeId] || matLabel) + ' (' + b.spec.L + ' × ' + b.spec.W + ') · ' + b.placements.length + ' piezas · aprovechamiento ' + num(b.util * 100, 1) + ' %</h3>' +
        P.boardSVG(b, b.typeId + offset + i, matLabel) + '<ul>' + pieces + '</ul></div>';
    }).join('');
  }

  function tabCortes(a) {
    const fj = a.nest.fj;
    let html = '<div class="card"><h2 style="margin-top:0">Optimización de cortes ' + tag('calc') + '</h2>' +
      '<p class="small">Guillotina de 3 etapas: 1) tiras a lo largo del tablero (veta), 2) cortes transversales, 3) sub-tiras al costado de piezas más angostas. Sierra ' + E.KERF + ' mm; saneo finger joint ' + E.FJ_TRIM_END + ' mm por extremo y ' + E.FJ_TRIM_EDGE + ' mm por canto largo; compensados ' + E.PLY_TRIM + ' mm por borde. El finger joint no se gira; los compensados sí. Área rayada = desperdicio.</p>' +
      '<div class="grid">' + nestSummary(fj, 'Finger Joint 20 mm') +
      (a.nest.euc3 ? nestSummary(a.nest.euc3, 'Compensado Eucaliptus 3 mm') : '') +
      (a.nest.ced4 ? nestSummary(a.nest.ced4, 'Compensado Cedro Real 4 mm') : '') + '</div>';
    html += '<h3>Mezclas de tableros finger joint evaluadas</h3>' + table(['Mezcla', 'Costo', 'Aprovechamiento', 'Desperdicio', ''],
      fj.alternatives.slice(0, 8).map(function (x) {
        const chosen = x.n3450 === (fj.types.fj3450 || 0) && x.n2400 === (fj.types.fj2400 || 0);
        return tr([x.n3450 + ' × 3,45 m + ' + x.n2400 + ' × 2,40 m', usd(x.costCents), num(x.util * 100, 1) + ' %', num(x.waste, 2) + ' m²', chosen ? '<b>Elegida</b>' : ''], [1, 2, 3]);
      }), { num: [1, 2, 3] }) + '<p class="small muted">Se elige el menor costo y, a igual costo, el menor desperdicio. Luissi no vende fracciones de tablero.</p></div>';
    html += '<h2>Finger Joint 20 mm</h2><div class="boards">' + boardCards(fj, 'Finger Joint 20 mm', 0) + '</div>';
    if (a.nest.euc3) html += '<h2>Compensado Eucaliptus Clear 3 mm</h2><div class="boards">' + boardCards(a.nest.euc3, 'Compensado Eucaliptus Clear 3 mm', 0) + '</div>';
    if (a.nest.ced4) html += '<h2>Compensado Cedro Real 4 mm</h2><div class="boards">' + boardCards(a.nest.ced4, 'Compensado Cedro Real 4 mm', 0) + '</div>';
    return html;
  }

  function budgetTable(c) {
    const rows = [];
    c.lines.forEach(function (l) {
      if (l.notFound) {
        rows.push(tr([esc(l.component), tag('nf'), esc(l.needText), '—', '—', '—', '—'], [5, 6], 'nf-row'));
      } else {
        rows.push(tr([esc(l.component), link(l.url, l.product) + ' ' + tag('luissi'), esc(l.needText) + ' ' + tag('calc'), esc(l.saleUnit), esc(l.buyText), usd(l.unitCents), usd(l.subtotalCents)], [5, 6]));
      }
      l.notes.forEach(function (n) { rows.push('<tr class="note-row"><td></td><td colspan="6">' + esc(n) + '</td></tr>'); });
    });
    const foot = '<tfoot><tr><td colspan="6">Subtotal ' + c.name + '</td><td class="num">' + usd(c.subtotalCents) + '</td></tr></tfoot>';
    return table(['Componente', 'Producto Luissi', 'Cantidad necesaria', 'Unidad de venta', 'Cantidad a comprar', 'Precio unitario', 'Subtotal'], rows, { num: [5, 6], foot: foot, cls: 'budget' });
  }

  function tabPresupuesto(a) {
    const b = a.budget, f = a.finish, m = a.model;
    let html = '<div class="grid">' + b.categories.map(function (c) {
      return '<div class="stat"><div class="k">' + c.name + '</div><div class="v">' + usd(c.subtotalCents) + '</div></div>';
    }).join('') + '<div class="stat"><div class="k">Total materiales</div><div class="v">' + usd(b.totalCents) + '</div><div class="small muted">Sin cortes</div></div></div>';
    b.categories.forEach(function (c) { html += '<h2>' + c.name + '</h2>' + budgetTable(c); });
    html += '<p class="total-line"><strong>' + esc(b.totalLine) + '</strong></p>';
    html += '<p class="small muted">Precios en USD tal como figuran en luissi.com.uy al 27/09/2026. La web no indica si incluyen IVA. Stock a confirmar.</p>';
    const g = f.groups;
    html += '<details><summary>Cálculo del barniz ' + tag('calc') + '</summary>' + table(['Grupo', 'Superficie de piezas (1 cara)', 'Caras', 'Manos', 'm² a pintar'],
      Object.keys(g).map(function (k) { return tr([esc(g[k].label), num(g[k].area, 2) + ' m²', g[k].faces, g[k].coats, num(g[k].paintArea, 2)], [1, 2, 3, 4]); }),
      { num: [1, 2, 3, 4], foot: '<tfoot><tr><td colspan="4">Total + 5 % cantos (' + num(f.paintArea, 2) + ' × 1,05) ÷ 8 m²/L</td><td class="num">' + num(f.withEdges, 2) + ' m² → ' + num(f.litres, 2) + ' L</td></tr></tfoot>' }) +
      '<p class="small">Latas: ' + (f.cans.n5 ? f.cans.n5 + ' × 5 L ' : '') + (f.cans.n1 ? f.cans.n1 + ' × 1 L' : '') + ' = ' + f.cans.vol + ' L (' + usd(f.cans.costCents) + ', la combinación más barata). Rendimiento según ficha técnica de Bona (8–10 m²/L; no es dato Luissi).</p></details>';
    const byId = {};
    m.screws.forEach(function (s) { (byId[s.id] = byId[s.id] || []).push(s.reason + ': ' + s.qty); });
    html += '<details><summary>Detalle de tornillos ' + tag('calc') + '</summary>' + Object.keys(byId).map(function (id) {
      return '<h3>' + esc(C.byId[id].name) + '</h3><ul class="small">' + byId[id].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
    }).join('') + '</details>';
    return html;
  }

  // ---------- global pages ----------
  function pageInvestigacion() {
    const all = allAnalyses();
    const usedIn = {};
    all.forEach(function (a) {
      a.budget.categories.forEach(function (c) { c.lines.forEach(function (l) { if (l.itemId) (usedIn[l.itemId] = usedIn[l.itemId] || new Set()).add(a.model.id); }); });
    });
    const rows = C.items.map(function (it) {
      const used = usedIn[it.id] ? Array.from(usedIn[it.id]).join(', ') : (it.outOfStock ? 'Referencia (sin stock)' : '—');
      return tr([esc(it.category), link(it.url, it.name), esc(it.brand), usd(it.priceCents), esc(it.saleUnit), esc(it.stock) + (it.note ? '<br><span class="muted small">' + esc(it.note) + '</span>' : ''), used], [3]);
    });
    const nf = C.notFound.map(function (n) { return tr([esc(n.name) + ' ' + tag('nf'), esc(n.terms), esc(n.solution)]); });
    return '<h1>Investigación de materiales</h1>' +
      '<p>Relevamiento de luissi.com.uy del ' + C.SURVEY_DATE + '. Todos los productos elegidos están en USD. Detalle completo, alternativas descartadas y contacto en ' +
      '<a href="docs/investigacion-luissi.md">docs/investigacion-luissi.md</a>.</p>' +
      '<div class="card"><h2 style="margin-top:0">Catálogo usado en los diseños ' + tag('luissi') + '</h2>' +
      table(['Categoría', 'Producto (exacto)', 'Marca', 'Precio', 'Unidad de venta', 'Stock / nota', 'Usado en'], rows, { num: [3] }) + '</div>' +
      '<div class="card"><h2 style="margin-top:0">No encontrado en Luissi</h2>' + table(['Producto', 'Términos buscados', 'Solución en el diseño'], nf) + '</div>' +
      '<div class="card"><h2 style="margin-top:0">Servicio de corte (Cortecloud)</h2><ul class="list">' +
      '<li>Perfil "Barraca Luissi - Maldonado" en barracaluissi.corte.cloud (visto por el usuario el 27/09/2026): plazo medio 2 días hábiles; corta con máquina automática; coloca tapacantos; <b>no realiza perforaciones</b> (canto, cara, fondo); piezas etiquetadas; entrega en taller o retiro en tienda; <b>no vende fracciones de tablero</b>.</li>' +
      '<li>"Servicio completo": se envía la lista de piezas y se obtiene el presupuesto (materiales + mano de obra). Es la vía para conocer el costo oficial del corte, que no está incluido acá.</li>' +
      '<li>La web pública no publica precios de corte.</li></ul></div>';
  }

  function pageComparativa() {
    const all = allAnalyses();
    const rows = all.map(function (a) {
      const m = a.model;
      return tr(['<a href="#/' + m.id + '/presupuesto">' + esc(m.fullName) + '</a>', dimsText(m), usd(catOf(a, 'Madera').subtotalCents), esc(boardsText(a)),
        usd(catOf(a, 'Herrajes').subtotalCents), usd(catOf(a, 'Accesorios').subtotalCents), usd(catOf(a, 'Acabado').subtotalCents), '<b>' + usd(a.budget.totalCents) + '</b>'], [2, 4, 5, 6, 7]);
    });
    const numCols = all.map(function (_, i) { return i + 1; });
    const metric = function (label, fn, text) { return tr(['<b>' + label + '</b>'].concat(all.map(fn)), text ? [] : numCols); };
    const shortBoards = function (a) {
      const t = a.nest.fj.types, o = [];
      if (t.fj3450) o.push(t.fj3450 + ' × FJ 3,45 m');
      if (t.fj2400) o.push(t.fj2400 + ' × FJ 2,40 m');
      if (a.nest.euc3) o.push(a.nest.euc3.boards.length + ' × Eucaliptus 3 mm');
      if (a.nest.ced4) o.push(a.nest.ced4.boards.length + ' × Cedro 4 mm');
      return o.join('<br>');
    };
    const cap = function (a) { return a.capacity; };
    const mrows = [
      metric('Barra colgar largo (m)', function (a) { return num(cap(a).rodLong, 2); }),
      metric('Barra colgar corto (m)', function (a) { return num(cap(a).rodShort, 2); }),
      metric('Estantes + maletero + separadores (m²)', function (a) { return num(cap(a).shelfArea, 2); }),
      metric('Volumen interior de cajones (L)', function (a) { return num(cap(a).drawerVolL, 0); }),
      metric('Volumen interior total (m³)', function (a) { return num(cap(a).interiorM3, 2); }),
      metric('Piezas cortadas por Luissi', function (a) { return cap(a).cutPieces; }),
      metric('Tacos a cortar en casa', function (a) { return cap(a).homePieces; }),
      metric('Unidades de herrajes (sin tornillos)', function (a) { return cap(a).hardwareUnits; }),
      metric('Tableros comprados', shortBoards, true),
      metric('Aprovechamiento finger joint', function (a) { return num(cap(a).fjUtil * 100, 1) + ' %'; }),
      metric('Desperdicio finger joint (m²)', function (a) { return num(cap(a).fjWaste, 2); }),
      metric('Desperdicio compensados (m²)', function (a) { return num(cap(a).plyWaste, 2); }),
      metric('Puertas', function (a) { const d = a.model.doors; return d.length + (d[0].type === 'sliding' ? ' corredizas' : ' batientes' + (d.some(function (x) { return x.soft; }) ? ' con freno' : '')); }, true),
      metric('Cajones', function (a) { return a.model.drawers.length ? a.model.drawers.length + ' (' + (a.model.drawers[0].slide === 'dtc500' ? 'guía 500 con amortiguación' : 'guía 450') + ')' : '0'; }, true),
      metric('Base', function (a) { return esc(a.model.base); }, true),
      metric('Fondo', function (a) { return a.model.backMat === 'ced4' ? 'Cedro Real 4 mm' : 'Eucaliptus 3 mm'; }, true),
      metric('Uniones', function (a) { return a.model.id === 'M5' ? 'Listones ocultos' : 'Tornillos pasantes vistos en laterales'; }, true),
      metric('Peso estimado de puertas (kg)', function (a) { return a.model.doors.map(function (d) { return num(d.weightKg, 1); }).join(' / '); }, true)
    ];
    return '<h1>Comparativa</h1><p>Diferencias objetivas entre los cinco modelos, sin ranking. Totales sin el costo de los cortes.</p>' +
      '<div class="card">' + table(['Modelo', 'Dimensiones', 'Madera', 'Tableros', 'Herrajes', 'Accesorios', 'Acabado', 'Total materiales'], rows, { num: [2, 4, 5, 6, 7] }) + '</div>' +
      '<div class="card"><h2 style="margin-top:0">Capacidad y fabricación ' + tag('calc') + '</h2>' +
      table(['Métrica'].concat(all.map(function (a) { return a.model.id + ' ' + esc(a.model.name); })), mrows) + '</div>';
  }

  function resumenBlock(a) {
    const m = a.model;
    return ['MODELO ' + m.id.slice(1) + ' — ' + m.name,
      'Dimensiones: ' + dimsText(m),
      'Material: ' + m.material,
      'Cantidad de tableros: ' + boardsText(a),
      'Madera: ' + usd(catOf(a, 'Madera').subtotalCents),
      'Herrajes: ' + usd(catOf(a, 'Herrajes').subtotalCents),
      'Accesorios: ' + usd(catOf(a, 'Accesorios').subtotalCents),
      'Acabado: ' + usd(catOf(a, 'Acabado').subtotalCents),
      'TOTAL MATERIALES: ' + usd(a.budget.totalCents),
      '(Falta sumar el costo de los cortes.)'].join('\n');
  }
  function pageResumen() {
    return '<h1>Resumen</h1><div class="resumen">' + allAnalyses().map(function (a) { return '<pre>' + esc(resumenBlock(a)) + '</pre>'; }).join('') + '</div>';
  }

  function pagePreguntas() {
    return '<h1>Preguntas para Luissi</h1>' +
      '<div class="card"><h2 style="margin-top:0">Ya respondidas por el perfil de Cortecloud (27/09/2026)</h2><ul class="list">' +
      T.answered.map(function (x) { return '<li><b>' + esc(x.q) + '</b> ' + esc(x.a) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="card"><h2 style="margin-top:0">Pendientes</h2><ol class="questions">' + T.pending.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ol>' +
      '<p class="small muted">Contacto: (+598) 4223 1143 · WhatsApp https://wa.me/59894112092 · ventas@luissi.com</p></div>';
  }

  function pageSupuestos() {
    const all = allAnalyses();
    const changes = [];
    all.forEach(function (a) { a.model.changes.forEach(function (c) { changes.push(c); }); });
    return '<h1>Supuestos y notas</h1>' +
      '<div class="card"><h2 style="margin-top:0">Supuestos generales</h2><ul class="list">' + T.assumptions().map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="card"><h2 style="margin-top:0">Ajustes al diseño por conflictos geométricos</h2><ul class="list">' + changes.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="card"><h2 style="margin-top:0">Decisiones que el plan dejaba abiertas</h2><ul class="list">' + T.designChoices.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="card"><h2 style="margin-top:0">Notas por modelo</h2>' + all.map(function (a) {
        return '<h3>' + esc(a.model.fullName) + '</h3><ul class="list">' + a.model.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>';
      }).join('') + '</div>';
  }

  // ---------- render ----------
  function render() {
    parseHash();
    renderNav();
    setupPrint();
    const pageView = $('page-view'), modelView = $('model-view');
    if (state.page) {
      modelView.hidden = true;
      pageView.hidden = false;
      const fn = { investigacion: pageInvestigacion, comparativa: pageComparativa, resumen: pageResumen, preguntas: pagePreguntas, supuestos: pageSupuestos }[state.page];
      pageView.innerHTML = fn();
      document.title = PAGES.filter(function (p) { return p.id === state.page; })[0].label + ' · Roperos de madera';
      return;
    }
    pageView.hidden = true;
    modelView.hidden = false;
    const a = analysis(state.model);
    renderModelHead(a);
    document.title = a.model.fullName + ' · Roperos de madera';
    const is3d = state.tab === '3d';
    $('panel-3d').hidden = !is3d;
    $('panel').hidden = is3d;
    if (is3d) { show3D(a); return; }
    const fn = { frontal: tabFrontal, plano: tabPlano, despiece: tabDespiece, cortecloud: tabCortecloud, cortes: tabCortes, presupuesto: tabPresupuesto }[state.tab];
    $('panel').innerHTML = fn(a);
    const csv = $('csv-btn');
    if (csv) csv.addEventListener('click', function () { downloadCSV(a); });
  }

  // Applied on every render so Ctrl+P prints the same as the button.
  function setupPrint() {
    const key = state.page || state.tab;
    const landscape = !!LANDSCAPE[key];
    $('page-size').textContent = '@page { size: A4 ' + (landscape ? 'landscape' : 'portrait') + '; margin: 6mm; }';
    document.body.classList.toggle('print-sheets', !state.page && !!SHEET_TABS[state.tab]);
  }
  function printView() { setupPrint(); window.print(); }

  window.addEventListener('hashchange', render);
  $('print-btn').addEventListener('click', printView);
  render();
})();
