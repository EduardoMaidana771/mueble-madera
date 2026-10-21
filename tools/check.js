#!/usr/bin/env node
/* Sanity checks for catalogue, models, nesting and budgets.
   Usage: node tools/check.js   (exit code 1 on any failure) */
'use strict';

const path = require('path');
const Catalog = require(path.join(__dirname, '..', 'js', 'catalog.js'));
const E = require(path.join(__dirname, '..', 'js', 'engine.js'));
const Models = require(path.join(__dirname, '..', 'js', 'models.js'));

let failures = 0;
let passes = 0;
function ok(cond, msg) {
  if (cond) { passes++; return; }
  failures++;
  console.log('  FALLA: ' + msg);
}
const EPS = 0.01;

// Door / front sizes stated in the design plan.
const PLAN_FRONTS = {
  M1: { doors: ['497x1997', '497x1997'], fronts: [] },
  M2: { doors: ['497x1997', '497x1997', '497x1197', '497x1197'], fronts: ['997x197', '997x197', '997x197', '997x197'] },
  M3: { doors: ['900x1940', '900x1940'], fronts: [] },
  M4: { doors: ['397x1997', '397x1997', '397x653', '397x653'], fronts: ['797x190', '797x190', '797x190', '797x190', '797x140', '797x140', '797x140', '797x140'] },
  M5: { doors: ['600x2047', '600x2047', '591x1235'], fronts: ['591x220', '591x220', '591x180', '591x180'] }
};
const PLAN_DIMS = { M1: [1000, 2080, 580], M2: [2000, 2080, 580], M3: [1800, 2100, 600], M4: [1600, 2080, 580], M5: [1800, 2150, 580] };

function overlap(a, b) {
  return Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > EPS &&
    Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > EPS &&
    Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0) > EPS;
}
function sorted(arr) { return arr.slice().sort().join(','); }

console.log('Catálogo');
Catalog.items.forEach(function (it) {
  ok(/^https:\/\/luissi\.com\.uy\/p\/.+\/\d+\/\d+$/.test(it.url), it.id + ': URL de Luissi válida');
  ok(it.currency === 'USD', it.id + ': moneda USD');
  ok(Number.isInteger(it.priceCents) && it.priceCents > 0, it.id + ': precio positivo en centavos');
  ok(!!it.name && !!it.saleUnit, it.id + ': nombre y unidad de venta');
});

const analyses = Models.ids.map(function (id) {
  const m = Models.build(id);
  return E.analyze(m);
});

analyses.forEach(function (a) {
  const m = a.model;
  console.log(m.fullName);

  // dimensions
  const pd = PLAN_DIMS[m.id];
  ok(m.W === pd[0] && m.H === pd[1] && m.Dc === pd[2], m.id + ': dimensiones W×H×Dc según el plan');
  const ext = m.elements.filter(function (e) { return e.role !== 'pull' && e.role !== 'door' && e.role !== 'drawer-front'; });
  ok(Math.min.apply(null, ext.map(function (e) { return e.x0; })) >= -EPS && Math.max.apply(null, ext.map(function (e) { return e.x1; })) <= m.W + EPS, m.id + ': carcasa dentro del ancho total');
  ok(Math.max.apply(null, m.elements.map(function (e) { return e.y1; })) <= m.H + EPS, m.id + ': nada supera la altura total');

  // catalogue references
  m.hardware.concat(m.screws).forEach(function (h) { ok(!!Catalog.byId[h.id], m.id + ': id de catálogo existe (' + h.id + ')'); });
  a.budget.categories.forEach(function (c) {
    c.lines.forEach(function (l) {
      if (l.notFound) { ok(l.subtotalCents === 0 && l.unitCents === null, m.id + ': "No encontrado" sin precio'); return; }
      const it = Catalog.byId[l.itemId];
      ok(!!it && !!it.url && it.currency === 'USD', m.id + ': línea con producto, URL y USD (' + l.itemId + ')');
      ok(l.unitCents === it.priceCents, m.id + ': precio unitario igual al catálogo (' + l.itemId + ')');
      ok(l.subtotalCents === l.buyQty * l.unitCents, m.id + ': subtotal = cantidad × precio (' + l.itemId + ')');
    });
  });

  // element intersections (closed state)
  const solids = m.elements.filter(function (e) { return !e.noCollide; });
  let clashes = 0;
  for (let i = 0; i < solids.length; i++) {
    for (let j = i + 1; j < solids.length; j++) {
      if (overlap(solids[i], solids[j])) {
        clashes++;
        if (clashes <= 5) console.log('    choque: ' + solids[i].id + ' ↔ ' + solids[j].id);
      }
    }
  }
  ok(clashes === 0, m.id + ': sin intersecciones entre elementos (' + clashes + ' choques)');

  // doors, fronts, hinges
  ok(m.doors.length >= 1, m.id + ': al menos una puerta');
  const plan = PLAN_FRONTS[m.id];
  ok(sorted(m.doors.map(function (d) { return d.w + 'x' + d.h; })) === sorted(plan.doors), m.id + ': medidas de puertas según el plan (' + m.doors.map(function (d) { return d.w + 'x' + d.h; }).join(' ') + ')');
  ok(sorted(m.drawers.map(function (d) { return d.front.w + 'x' + d.front.h; })) === sorted(plan.fronts), m.id + ': medidas de frentes de cajón según el plan');
  m.doors.filter(function (d) { return d.type === 'hinged'; }).forEach(function (d) {
    ok(d.hinges === E.hingeCount(d.h), m.id + ': regla de bisagras por altura (' + d.label + ')');
    ok(d.hingePos.length === d.hinges && d.hingePos[0] === 100 && Math.abs(d.hingePos[d.hinges - 1] - (d.h - 100)) < EPS, m.id + ': bisagras a 100 mm de los extremos (' + d.label + ')');
    const hid = d.hingeId;
    ok((d.kind === 'recta') === /Recta/.test(Catalog.byId[hid].name), m.id + ': tipo de bisagra coherente (' + d.label + ')');
  });
  const hingedFronts = m.doors.filter(function (d) { return d.type === 'hinged'; }).concat(m.drawers.map(function (d) { return d.front; }));
  if (hingedFronts.length) {
    ok(Math.abs(Math.max.apply(null, hingedFronts.map(function (f) { return f.y1; })) - (m.H - 1.5)) < EPS, m.id + ': frentes terminan a H − 1,5');
    ok(Math.abs(Math.min.apply(null, hingedFronts.map(function (f) { return f.y0; })) - (m.K + 1.5)) < EPS, m.id + ': frentes empiezan a K + 1,5');
    ok(Math.abs(Math.min.apply(null, hingedFronts.map(function (f) { return f.x0; })) - 1.5) < EPS && Math.abs(Math.max.apply(null, hingedFronts.map(function (f) { return f.x1; })) - (m.W - 1.5)) < EPS, m.id + ': luz de 1,5 mm en los bordes exteriores');
  }

  // drawers
  m.drawers.forEach(function (d) {
    ok(d.box.w + 26 === d.bay.w, m.id + ': caja de cajón + 26 = interior del cuerpo (' + d.label + ')');
    ok(d.box.L === Catalog.byId[d.slide].slideLength, m.id + ': largo de caja = largo de guía (' + d.label + ')');
    ok(d.box.h === d.front.h - 50, m.id + ': alto de caja = frente − 50 (' + d.label + ')');
    ok(Math.abs(d.box.y0 - (d.front.y0 + 25)) < EPS, m.id + ': caja 25 mm sobre el borde inferior del frente (' + d.label + ')');
  });
  const seps = m.elements.filter(function (e) { return e.role === 'separator'; });
  seps.forEach(function (s) {
    const above = m.doors.filter(function (d) { return d.x0 < s.x1 && d.x1 > s.x0 && d.y0 > s.y1 - EPS; }).map(function (d) { return d.y0; });
    ok(above.length > 0 && Math.abs(s.y1 - (Math.min.apply(null, above) - 1.5)) < EPS, m.id + ': separador a (frente superior − 1,5)');
  });

  // interior counts
  const count = function (role) { return m.elements.filter(function (e) { return e.role === role; }).length; };
  const ex = m.expect;
  ok(m.doors.length === ex.doors, m.id + ': cantidad de puertas ' + ex.doors);
  ok(m.drawers.length === ex.drawers, m.id + ': cantidad de cajones ' + ex.drawers);
  ok(m.rods.length === ex.rods, m.id + ': cantidad de barras ' + ex.rods);
  ok(count('shelf') === ex.shelves, m.id + ': cantidad de estantes ' + ex.shelves);
  ok(count('maletero') === (ex.maleteros || 0), m.id + ': cantidad de maleteros');
  ok(count('separator') === (ex.separators || 0), m.id + ': cantidad de separadores');
  m.rods.forEach(function (r) {
    ok(count('taco') >= 4 * m.rods.length, m.id + ': 4 tacos por barra');
    const shelfAbove = m.elements.filter(function (e) { return (e.role === 'maletero' || e.role === 'shelf' || e.role === 'top') && e.x0 <= r.x0 + EPS && e.x1 >= r.x1 - EPS && e.y0 >= r.yTop - EPS; })
      .sort(function (p, q) { return p.y0 - q.y0; })[0];
    if (r.hanging === 'long') ok(shelfAbove && Math.abs(shelfAbove.y0 - 70 - r.yTop) < EPS, m.id + ': barra larga 70 mm bajo el estante superior (' + r.bay + ')');
  });

  // back covers the full width and every piece fits a sheet
  const backs = m.elements.filter(function (e) { return e.role === 'back'; }).sort(function (p, q) { return p.x0 - q.x0; });
  ok(Math.abs(backs[0].x0) < EPS && Math.abs(backs[backs.length - 1].x1 - m.W) < EPS, m.id + ': el fondo cubre todo el ancho');
  for (let i = 1; i < backs.length; i++) ok(Math.abs(backs[i].x0 - backs[i - 1].x1) < EPS, m.id + ': piezas de fondo contiguas');

  // parts and Cortecloud list
  const nParts = a.parts.length;
  ok(a.cortecloud.reduce(function (s, r) { return s + r.qty; }, 0) === nParts, m.id + ': Cortecloud suma todas las piezas de Luissi');
  ok(!a.cortecloud.some(function (r) { return /^Taco/.test(r.func); }), m.id + ': los tacos no van a Luissi');
  a.cortecloud.forEach(function (r) {
    ok(r.rotate === (r.board === E.MAT_LABEL.fj ? 'No' : 'Sí'), m.id + ': columna Girar (' + r.func + ')');
    ok(r.edge === '' && r.L1 === '' && r.L2 === '' && r.A1 === '' && r.A2 === '', m.id + ': tapacantos vacíos');
  });
  a.homeCuts.strips.forEach(function (s) { ok(s.L <= 1200 && s.A === 45, m.id + ': tira para tacos ≤ 1200 × 45'); });
  ok(a.homeCuts.strips.reduce(function (s, x) { return s + x.tacos; }, 0) === a.homeCuts.tacos, m.id + ': las tiras rinden todos los tacos');
  ok(a.homeCuts.tacos === 4 * m.rods.length, m.id + ': tacos = 4 por barra');

  // nesting
  ['fj', 'euc3', 'ced4'].forEach(function (mat) {
    const r = a.nest[mat];
    const want = a.parts.filter(function (p) { return p.mat === mat; }).length;
    if (!r) { ok(want === 0, m.id + ': ' + mat + ' sin piezas'); return; }
    const placed = r.boards.reduce(function (s, b) { return s + b.placements.length; }, 0);
    ok(placed === want, m.id + ': ' + mat + ' todas las piezas ubicadas (' + placed + '/' + want + ')');
    r.boards.forEach(function (b, bi) {
      const sp = b.spec;
      b.placements.forEach(function (p) {
        const inside = p.x >= sp.trimEnd - EPS && p.x + p.l <= sp.L - sp.trimEnd + EPS && p.y >= sp.trimEdge - EPS && p.y + p.w <= sp.W - sp.trimEdge + EPS;
        ok(inside, m.id + ': pieza dentro del área útil (' + mat + ' tablero ' + (bi + 1) + ', ' + p.item.name + ')');
        if (mat === 'fj') ok(!p.rot && p.l === p.item.L, m.id + ': finger joint sin girar (' + p.item.name + ')');
      });
      const h = E.KERF / 2 - EPS;
      for (let i = 0; i < b.placements.length; i++) {
        for (let j = i + 1; j < b.placements.length; j++) {
          const p = b.placements[i], q = b.placements[j];
          const clash = Math.min(p.x + p.l + h, q.x + q.l + h) - Math.max(p.x - h, q.x - h) > 0 && Math.min(p.y + p.w + h, q.y + q.w + h) - Math.max(p.y - h, q.y - h) > 0;
          ok(!clash, m.id + ': piezas sin superposición y con sierra de 4 mm (' + mat + ' tablero ' + (bi + 1) + ')');
        }
      }
    });
    const cost = r.boards.reduce(function (s, b) { return s + b.spec.priceCents; }, 0);
    ok(cost === r.costCents, m.id + ': costo de tableros coherente (' + mat + ')');
  });

  // budget totals
  const b = a.budget;
  b.categories.forEach(function (c) {
    ok(c.subtotalCents === c.lines.reduce(function (s, l) { return s + l.subtotalCents; }, 0), m.id + ': subtotal ' + c.name + ' = suma de líneas');
  });
  ok(b.totalCents === b.categories.reduce(function (s, c) { return s + c.subtotalCents; }, 0), m.id + ': total = suma de categorías');
  ok(b.totalLine === 'Costo total de materiales: ' + E.fmtUSD(b.totalCents) + ' (falta sumar el costo de los cortes).', m.id + ': línea final literal');
  ok(b.categories.map(function (c) { return c.name; }).join(',') === 'Madera,Herrajes,Accesorios,Acabado', m.id + ': categorías del presupuesto');

  // packs and cans cover the needs
  b.categories.forEach(function (c) {
    c.lines.forEach(function (l) {
      if (l.notFound) return;
      const it = Catalog.byId[l.itemId];
      if (it.kind === 'screw') ok(l.buyQty * it.pack >= l.needQty && (l.buyQty - 1) * it.pack < l.needQty, m.id + ': cajas de tornillos = ceil(unidades / 100) (' + l.itemId + ')');
    });
  });
  const cans = a.finish.cans;
  ok(cans.n5 * 5 + cans.n1 >= a.finish.litres, m.id + ': latas cubren ' + E.fmtNum(a.finish.litres, 2) + ' L');
  ok(a.budget.categories[3].lines.some(function (l) { return l.notFound && /Lija/.test(l.component); }), m.id + ': lija listada como No encontrado');

  console.log('  ' + E.fmtNum(nParts, 0) + ' piezas · FJ ' + JSON.stringify(a.nest.fj.types) + ' · aprovechamiento ' + E.fmtNum(a.nest.fj.util * 100, 1) + ' % · ' + b.totalLine);
});

// money formatting
ok(E.fmtUSD(123456) === 'USD 1.234,56', 'formato USD 1.234,56');
ok(E.fmtUSD(5) === 'USD 0,05', 'formato de centavos');
ok(E.hingeCount(900) === 2 && E.hingeCount(901) === 3 && E.hingeCount(1600) === 3 && E.hingeCount(2000) === 4 && E.hingeCount(2001) === 5, 'regla de bisagras en los límites');
const cans = E.cheapestCans(4.2);
ok(cans.n5 === 1 && cans.n1 === 0, 'combinación de latas más barata (4,2 L → 1 × 5 L)');

console.log('\n' + passes + ' verificaciones OK, ' + failures + ' fallas.');
process.exit(failures ? 1 : 0);
