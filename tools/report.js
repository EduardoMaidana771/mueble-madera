#!/usr/bin/env node
/* Full Markdown report for the five models.
   Usage: node tools/report.js > docs/presupuestos.md
          node tools/report.js --out docs/presupuestos.md   (writes UTF-8 directly) */
'use strict';

const fs = require('fs');
const path = require('path');
const C = require(path.join(__dirname, '..', 'js', 'catalog.js'));
const E = require(path.join(__dirname, '..', 'js', 'engine.js'));
const M = require(path.join(__dirname, '..', 'js', 'models.js'));
const T = require(path.join(__dirname, '..', 'js', 'content.js'));

const usd = E.fmtUSD, mm = E.fmtMm, num = E.fmtNum;
const BOARD_SHORT = {
  fj3450: 'Finger Joint 20 mm × 3,45 m', fj2400: 'Finger Joint 20 mm × 2,40 m',
  euc3: 'Compensado Eucaliptus Clear 3 mm', ced4: 'Compensado Cedro Real 4 mm'
};

const out = [];
const w = function (s) { out.push(s == null ? '' : s); };
function cell(v) { return String(v == null ? '' : v).replace(/\|/g, '\\|').replace(/\n/g, '<br>'); }
function mdTable(head, rows, right) {
  const r = right || [];
  w('| ' + head.map(cell).join(' | ') + ' |');
  w('|' + head.map(function (_, i) { return r.indexOf(i) >= 0 ? '---:' : '---'; }).join('|') + '|');
  rows.forEach(function (row) { w('| ' + row.map(cell).join(' | ') + ' |'); });
  w();
}
function boardsText(a) {
  const o = [];
  ['fj3450', 'fj2400'].forEach(function (t) { const n = a.nest.fj && a.nest.fj.types[t]; if (n) o.push(n + ' × ' + BOARD_SHORT[t]); });
  ['euc3', 'ced4'].forEach(function (t) { if (a.nest[t]) o.push(a.nest[t].boards.length + ' × ' + BOARD_SHORT[t]); });
  return o.join(' + ');
}
function cat(a, name) { return a.budget.categories.filter(function (c) { return c.name === name; })[0]; }
function depthTotal(m) { return m.tb + m.Dc + (m.doors.some(function (d) { return d.type === 'hinged'; }) ? 22 : 0); }
function dims(m) { return m.W + ' × ' + m.H + ' × ' + m.Dc + ' mm'; }

const analyses = M.ids.map(function (id) { return E.analyze(M.build(id)); });

w('# Presupuestos de materiales — 5 roperos de madera real (Barraca Luissi)');
w();
w('Generado con `node tools/report.js` a partir de `js/catalog.js`, `js/engine.js` y `js/models.js`. Precios, nombres y URLs relevados en luissi.com.uy el ' + C.SURVEY_DATE + '. Todas las cifras en USD tal como figuran en la web; sin conversión de moneda. La web no indica si los precios incluyen IVA. Stock a confirmar.');
w();
w('**El costo de los cortes no está incluido en ningún total.** Se obtiene cargando el "Formulario estándar — Lista de las piezas" de cada modelo en Cortecloud (Servicio completo) de Barraca Luissi.');
w();
w('Procedencia de los datos: **Dato Luissi** = copiado de luissi.com.uy · **Cálculo propio** = cantidades, optimización, áreas, pesos y capacidades calculados acá · **No encontrado en Luissi** = sin precio y fuera de los totales.');
w();
w('## Índice');
w();
analyses.forEach(function (a) { w('- [' + a.model.fullName + '](#' + a.model.fullName.toLowerCase().replace(/[^\p{L}\p{N} _-]/gu, '').replace(/ /g, '-') + ')'); });
w('- [Herramientas necesarias](#herramientas-necesarias)');
w('- [Comparativa](#comparativa)');
w('- [Resumen](#resumen)');
w('- [Preguntas para Luissi](#preguntas-para-luissi)');
w('- [Supuestos y notas](#supuestos-y-notas)');
w();

analyses.forEach(function (a) {
  const m = a.model;
  w('## ' + m.fullName);
  w();
  w(m.summary);
  w();
  w('### Dimensiones');
  w();
  w('- Ancho × alto × profundidad de carcasa: **' + dims(m) + '** (profundidad total con fondo' + (depthTotal(m) > m.Dc + m.tb ? ' y puertas' : '') + ': ' + depthTotal(m) + ' mm).');
  w('- Base: ' + m.base + '. Material: ' + m.material + '.');
  w('- Cuerpos: ' + m.bays.map(function (b) { return b.label + ' (' + (b.x1 - b.x0) + ' mm libres)'; }).join(' · ') + '.');
  m.doors.forEach(function (d) {
    if (d.type === 'hinged') {
      w('- ' + d.label + ': ' + d.w + ' × ' + d.h + ' mm, ' + d.hinges + ' bisagras ' + (d.kind === 'recta' ? 'rectas' : 'curvas') + (d.soft ? ' con freno' : '') + ' del lado ' + (d.hinge === 'left' ? 'izquierdo' : 'derecho') + ' (cazoletas a ' + d.hingePos.map(mm).join(' / ') + ' mm desde abajo, centro a 22 mm del canto). Peso estimado ' + num(d.weightKg, 1) + ' kg (Cálculo propio).');
    } else {
      w('- ' + d.label + ': ' + d.w + ' × ' + d.h + ' mm, corrediza, cubeta embutida. Peso estimado ' + num(d.weightKg, 1) + ' kg (Cálculo propio).');
    }
  });
  if (m.drawers.length) w('- Cajones: ' + m.drawers.map(function (d) { return d.front.w + ' × ' + d.front.h; }).join(', ') + ' mm (frentes); cajas ' + Array.from(new Set(m.drawers.map(function (d) { return d.box.w + ' × ' + d.box.h + ' × ' + d.box.L; }))).join(', ') + ' mm; guía ' + C.byId[m.drawers[0].slide].name + '.');
  m.rods.forEach(function (r) { w('- Barra ' + r.bay + ': ' + (r.x1 - r.x0) + ' mm, cara superior a ' + r.yTop + ' mm del piso (' + (r.hanging === 'long' ? 'colgar largo' : 'colgar corto') + ').'); });
  m.notes.forEach(function (n) { w('- ' + n); });
  w();

  w('### Despiece (Cálculo propio)');
  w();
  mdTable(['Nº', 'Pieza', 'Cant.', 'Largo', 'Ancho', 'Espesor', 'Material', 'Veta', 'Notas'],
    a.despiece.map(function (r) { return [r.no, r.name, r.qty, mm(r.L), mm(r.A), mm(r.T), r.mat, r.veta, r.notes]; }), [2, 3, 4, 5]);

  w('### Formulario Cortecloud — Lista de las piezas');
  w();
  w('Formato del "Formulario estándar" de Cortecloud (22 filas por hoja en la app; CSV descargable). L = sentido de la veta.');
  w();
  mdTable(E.CC_COLUMNS, a.cortecloud.map(function (r) { return [r.no, r.qty, mm(r.L), mm(r.A), r.board, r.func, r.rotate, '', '', '', '', '']; }), [1, 2, 3]);

  w('### Cortes en casa');
  w();
  if (a.homeCuts.tacos) {
    mdTable(['Pieza', 'Cant.', 'Medida (mm)', 'De dónde sale'], [['Taco soporte de barra', a.homeCuts.tacos, '80 × 45 × 20',
      'Tira para tacos (' + a.homeCuts.strips.map(function (s) { return s.L + ' × 45'; }).join(', ') + ')']], [1]);
  } else { w('No hay cortes en casa.'); w(); }

  w('### Mecanizados que hacés vos');
  w();
  w('Luissi no perfora (perfil Cortecloud: "Perforación: Canto / Cara / Fondo: No realiza").');
  w();
  mdTable(['Mecanizado', 'Cantidad', 'Detalle'], a.machining.map(function (x) { return [x.op, num(x.qty, 0) + ' ' + x.unit, x.detail ? x.detail.join('<br>') : '']; }), [1]);

  w('### Tableros y optimización (Cálculo propio)');
  w();
  const fj = a.nest.fj;
  w('- Finger joint: ' + ['fj3450', 'fj2400'].filter(function (t) { return fj.types[t]; }).map(function (t) { return fj.types[t] + ' × ' + BOARD_SHORT[t]; }).join(' + ') +
    ' · aprovechamiento **' + num(fj.util * 100, 1) + ' %** · desperdicio ' + num(fj.waste, 2) + ' m² · ' + usd(fj.costCents) + '.');
  ['euc3', 'ced4'].forEach(function (t) {
    const r = a.nest[t];
    if (r) w('- ' + BOARD_SHORT[t] + ': ' + r.boards.length + ' tablero(s) · aprovechamiento ' + num(r.util * 100, 1) + ' % · desperdicio ' + num(r.waste, 2) + ' m² · ' + usd(r.costCents) + '.');
  });
  w('- Parámetros: sierra ' + E.KERF + ' mm; saneo finger joint ' + E.FJ_TRIM_END + ' mm por extremo y ' + E.FJ_TRIM_EDGE + ' mm por canto largo; compensados ' + E.PLY_TRIM + ' mm por borde; finger joint sin girar.');
  w();
  w('Mezclas evaluadas (las más baratas):');
  w();
  mdTable(['Mezcla', 'Costo', 'Aprovechamiento', 'Desperdicio'], fj.alternatives.slice(0, 5).map(function (x) {
    return [x.n3450 + ' × 3,45 m + ' + x.n2400 + ' × 2,40 m', usd(x.costCents), num(x.util * 100, 1) + ' %', num(x.waste, 2) + ' m²'];
  }), [1, 2, 3]);
  ['fj', 'euc3', 'ced4'].forEach(function (k) {
    const r = a.nest[k];
    if (!r) return;
    r.boards.forEach(function (b, i) {
      w('- Tablero ' + (i + 1) + ' (' + BOARD_SHORT[b.typeId] + ', ' + num(b.util * 100, 1) + ' %): ' + b.placements.map(function (p) { return 'Nº ' + p.item.row + ' ' + mm(p.item.L) + '×' + mm(p.item.A) + (p.rot ? ' (girada)' : ''); }).join(', ') + '.');
    });
  });
  w();

  a.budget.categories.forEach(function (c) {
    w('### ' + c.name);
    w();
    const rows = [];
    c.lines.forEach(function (l) {
      if (l.notFound) rows.push([l.component, 'No encontrado en Luissi', l.needText, '—', '—', '—', '—']);
      else rows.push([l.component, '[' + l.product + '](' + l.url + ')', l.needText, l.saleUnit, l.buyText, usd(l.unitCents), usd(l.subtotalCents)]);
      l.notes.forEach(function (n) { rows.push(['', '↳ ' + n, '', '', '', '', '']); });
    });
    rows.push(['**Subtotal ' + c.name + '**', '', '', '', '', '', '**' + usd(c.subtotalCents) + '**']);
    mdTable(['Componente', 'Producto Luissi', 'Cantidad necesaria', 'Unidad de venta', 'Cantidad a comprar', 'Precio unitario', 'Subtotal'], rows, [5, 6]);
    if (c.name === 'Acabado') {
      const f = a.finish;
      w('Barniz (Cálculo propio): ' + Object.keys(f.groups).map(function (k) { const g = f.groups[k]; return g.label + ' ' + num(g.area, 2) + ' m² × 2 caras × ' + g.coats + (g.coats === 1 ? ' mano' : ' manos'); }).join('; ') +
        ' → ' + num(f.paintArea, 2) + ' m² + 5 % = ' + num(f.withEdges, 2) + ' m² ÷ 8 m²/L = ' + num(f.litres, 2) + ' L.');
      w();
    }
  });
  w('**' + a.budget.totalLine + '**');
  w();
});

w('## Herramientas necesarias');
w();
w('Informativo, sin precio.');
w();
T.tools.forEach(function (t) { w('- **' + t.t + '** — ' + t.why); });
w();

w('## Comparativa');
w();
w('Diferencias objetivas, sin ranking. Totales sin el costo de los cortes.');
w();
mdTable(['Modelo', 'Dimensiones', 'Madera', 'Tableros', 'Herrajes', 'Accesorios', 'Acabado', 'Total materiales'], analyses.map(function (a) {
  return [a.model.fullName, dims(a.model), usd(cat(a, 'Madera').subtotalCents), boardsText(a), usd(cat(a, 'Herrajes').subtotalCents), usd(cat(a, 'Accesorios').subtotalCents), usd(cat(a, 'Acabado').subtotalCents), '**' + usd(a.budget.totalCents) + '**'];
}), [2, 4, 5, 6, 7]);
w('Capacidad y fabricación (Cálculo propio):');
w();
const cap = function (a) { return a.capacity; };
const metrics = [
  ['Barra colgar largo (m)', function (a) { return num(cap(a).rodLong, 2); }],
  ['Barra colgar corto (m)', function (a) { return num(cap(a).rodShort, 2); }],
  ['Estantes + maletero + separadores (m²)', function (a) { return num(cap(a).shelfArea, 2); }],
  ['Volumen interior de cajones (L)', function (a) { return num(cap(a).drawerVolL, 0); }],
  ['Volumen interior total (m³)', function (a) { return num(cap(a).interiorM3, 2); }],
  ['Piezas cortadas por Luissi', function (a) { return cap(a).cutPieces; }],
  ['Tacos a cortar en casa', function (a) { return cap(a).homePieces; }],
  ['Unidades de herrajes (sin tornillos)', function (a) { return cap(a).hardwareUnits; }],
  ['Tableros comprados', function (a) { return boardsText(a); }],
  ['Aprovechamiento finger joint', function (a) { return num(cap(a).fjUtil * 100, 1) + ' %'; }],
  ['Desperdicio finger joint (m²)', function (a) { return num(cap(a).fjWaste, 2); }],
  ['Desperdicio compensados (m²)', function (a) { return num(cap(a).plyWaste, 2); }]
];
mdTable(['Métrica'].concat(analyses.map(function (a) { return a.model.id + ' ' + a.model.name; })), metrics.map(function (mt) {
  return [mt[0]].concat(analyses.map(mt[1]));
}));

w('## Resumen');
w();
analyses.forEach(function (a) {
  const m = a.model;
  w('```');
  w('MODELO ' + m.id.slice(1) + ' — ' + m.name);
  w('Dimensiones: ' + dims(m));
  w('Material: ' + m.material);
  w('Cantidad de tableros: ' + boardsText(a));
  w('Madera: ' + usd(cat(a, 'Madera').subtotalCents));
  w('Herrajes: ' + usd(cat(a, 'Herrajes').subtotalCents));
  w('Accesorios: ' + usd(cat(a, 'Accesorios').subtotalCents));
  w('Acabado: ' + usd(cat(a, 'Acabado').subtotalCents));
  w('TOTAL MATERIALES: ' + usd(a.budget.totalCents));
  w('(Falta sumar el costo de los cortes.)');
  w('```');
  w();
});

w('## Preguntas para Luissi');
w();
w('### Ya respondidas por el perfil de Cortecloud (27/09/2026)');
w();
T.answered.forEach(function (x) { w('- **' + x.q + '** ' + x.a); });
w();
w('### Pendientes');
w();
T.pending.forEach(function (q, i) { w((i + 1) + '. ' + q); });
w();

w('## Supuestos y notas');
w();
T.assumptions().forEach(function (s) { w('- ' + s); });
w();
w('### Ajustes al diseño por conflictos geométricos');
w();
analyses.forEach(function (a) { a.model.changes.forEach(function (c) { w('- ' + c); }); });
w();
w('### Decisiones que el plan dejaba abiertas');
w();
T.designChoices.forEach(function (s) { w('- ' + s); });
w();
w('### No encontrado en Luissi');
w();
C.notFound.forEach(function (n) { w('- ' + n.name + ' (buscado: ' + n.terms + '). ' + n.solution); });
w();

const text = out.join('\n');
const oi = process.argv.indexOf('--out');
if (oi > 0 && process.argv[oi + 1]) {
  fs.writeFileSync(path.resolve(process.argv[oi + 1]), text, 'utf8');
  console.error('Escrito ' + process.argv[oi + 1]);
} else {
  process.stdout.write(text);
}
