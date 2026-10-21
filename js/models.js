/* Five wardrobe builders. Coordinates in mm: x = width from the left outer
   face, y = height from the floor, z = depth from the carcass back (0) to the
   carcass front edge (Dc). Each builder returns elements (3D boxes with part
   metadata), doors, drawers, rods, hardware/screw ledgers and machining. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'), require('./catalog.js'));
  else root.RoperoModels = factory(root.RoperoEngine, root.RoperoCatalog);
})(typeof self !== 'undefined' ? self : this, function (E, Catalog) {
  'use strict';

  const T = 20;
  const REVEAL = 1.5;
  const GAP = 3;

  const FINISH_BY_ROLE = {
    door: 'front', 'drawer-front': 'front',
    side: 'carcass', top: 'carcass', bottom: 'carcass', divider: 'carcass', shelf: 'carcass',
    maletero: 'carcass', separator: 'carcass', 'kick-front': 'carcass',
    'box-side': 'inner', 'box-end': 'inner', rod: 'inner', taco: 'inner', cleat: 'inner'
  };

  const HINGE_COMPONENT = {
    hRecta: 'Bisagras rectas (puertas con bisagra en el lateral exterior)',
    hCurva: 'Bisagras curvas (puertas con bisagra sobre un divisor)',
    hRectaF: 'Bisagras rectas con freno (lateral exterior)',
    hCurvaF: 'Bisagras curvas con freno (sobre divisor)'
  };

  function newModel(meta) {
    return Object.assign({
      elements: [], doors: [], drawers: [], rods: [], interiors: [], bays: [], modules: [],
      hardware: [], screws: [], machining: [], notes: [], changes: [], movables: []
    }, meta);
  }

  function add(m, o) {
    if (o.mat === 'fj' || o.mat === 'euc3' || o.mat === 'ced4') {
      if (o.cut === undefined) o.cut = true;
      if (o.finish === undefined) o.finish = FINISH_BY_ROLE[o.role] || null;
    }
    m.elements.push(o);
    return o;
  }
  function wood(m, id, name, role, b, grain, thick, extra) {
    return add(m, Object.assign({ id: m.id + '-' + id, name: name, role: role, mat: 'fj', grain: grain, thick: thick }, b, extra || {}));
  }
  function box(x0, x1, y0, y1, z0, z1) { return { x0: x0, x1: x1, y0: y0, y1: y1, z0: z0, z1: z1 }; }
  function hw(m, id, qty, reason, component) { m.hardware.push({ id: id, qty: qty, reason: reason, component: component }); }
  function sc(m, id, qty, reason) { m.screws.push({ id: id, qty: qty, reason: reason }); }

  // Fronts between two overlay lines with 3 mm gaps.
  function splitFronts(a, b, n) {
    const w = (b - a - GAP * (n - 1)) / n;
    const out = [];
    for (let i = 0; i < n; i++) out.push([a + i * (w + GAP), a + i * (w + GAP) + w]);
    return out;
  }
  function stackFronts(y0, heights) {
    const out = [];
    let y = y0;
    heights.forEach(function (h) { out.push([y, y + h]); y += h + GAP; });
    return out;
  }

  // ---------- assemblies ----------
  function plinthCarcass(m, o) {
    const x0 = o.x0, x1 = o.x0 + o.W, H = m.H, Dc = m.Dc, K = m.K, p = o.tag || '';
    wood(m, p + 'side-L', 'Lateral', 'side', box(x0, x0 + T, 0, H, 0, Dc), 'y', 'x');
    wood(m, p + 'side-R', 'Lateral', 'side', box(x1 - T, x1, 0, H, 0, Dc), 'y', 'x');
    wood(m, p + 'bottom', 'Piso', 'bottom', box(x0 + T, x1 - T, K, K + T, 0, Dc), 'x', 'y');
    wood(m, p + 'top', 'Techo', 'top', box(x0 + T, x1 - T, H - T, H, 0, Dc), 'x', 'y');
    wood(m, p + 'kick-f', 'Zócalo frontal', 'kick-front', box(x0 + T, x1 - T, 0, K, Dc - T, Dc), 'x', 'z');
    wood(m, p + 'kick-r', 'Zócalo trasero', 'kick-rear', box(x0 + T, x1 - T, 0, K, 0, T), 'x', 'z');
    const lbl = o.label ? ' (' + o.label + ')' : '';
    sc(m, 't4x50', 4 * 5, 'Uniones lateral–techo y lateral–piso, 5 por unión' + lbl);
    sc(m, 't4x50', 2 * 2 * 2, 'Zócalos frontal y trasero, 2 por extremo' + lbl);
    sc(m, 't4x50', 2 * 4, 'Piso → zócalos, 4 por zócalo' + lbl);
    m.interiors.push(box(x0 + T, x1 - T, K + T, H - T, 0, o.usableDepth || Dc));
    m.modules.push({ label: o.label || '', x0: x0, x1: x1 });
  }

  function divider(m, id, x0, y0, y1, depth, name, screws) {
    wood(m, id, name || 'Divisor', 'divider', box(x0, x0 + T, y0, y1, 0, depth), 'y', 'x');
    if (screws !== false) sc(m, 't4x50', 8, (name || 'Divisor') + ': 4 + 4 pasantes (piso/techo o estante)');
  }

  function shelf(m, id, name, role, x0, x1, y0, depth, screws) {
    wood(m, id, name, role, box(x0, x1, y0, y0 + T, 0, depth), 'x', 'y');
    if (screws === 'through') sc(m, 't4x50', 8, name + ': 4 por extremo');
  }

  // Rod 20 × 45 on edge + 2 tacos per end (one in front, one behind the rod).
  function rod(m, id, x0, x1, yTop, depth, hanging, bay) {
    const zc = depth / 2;
    wood(m, id, 'Barra de colgar 20 × 45', 'rod', box(x0, x1, yTop - 45, yTop, zc - 10, zc + 10), 'x', 'z');
    [[x0, x0 + T], [x1 - T, x1]].forEach(function (xs, i) {
      wood(m, id + '-t' + i + 'f', 'Taco soporte de barra', 'taco', box(xs[0], xs[1], yTop - 45, yTop, zc + 10, zc + 90), 'z', 'x', { homeCut: true });
      wood(m, id + '-t' + i + 'r', 'Taco soporte de barra', 'taco', box(xs[0], xs[1], yTop - 45, yTop, zc - 90, zc - 10), 'z', 'x', { homeCut: true });
    });
    sc(m, 't4x35', 8, 'Tacos de barra → vertical, 2 por taco (' + bay + ')');
    sc(m, 't4x35', 4, 'Barra → tacos, 1 por taco (' + bay + ')');
    m.rods.push({ id: m.id + '-' + id, x0: x0, x1: x1, y0: yTop - 45, yTop: yTop, z0: zc - 10, z1: zc + 10, hanging: hanging, bay: bay });
  }

  function pullElements(m, gid, pullId, orient, cx, cy, zFace) {
    const len = Catalog.byId[pullId].pullLength;
    const half = len / 2;
    if (pullId === 'cubeta') {
      add(m, { id: gid + '-pull', name: 'Cubeta', role: 'pull', mat: 'metal', group: gid, noCollide: true, x0: cx - 17, x1: cx + 17, y0: cy - half, y1: cy + half, z0: zFace - 0.6, z1: zFace + 0.4 });
      return;
    }
    const bar = orient === 'v' ? { x0: cx - 6, x1: cx + 6, y0: cy - half - 12, y1: cy + half + 12 } : { x0: cx - half - 12, x1: cx + half + 12, y0: cy - 6, y1: cy + 6 };
    add(m, Object.assign({ id: gid + '-pull', name: 'Tirador', role: 'pull', mat: 'metal', group: gid, noCollide: true, z0: zFace + 20, z1: zFace + 30 }, bar));
    [-half, half].forEach(function (d, i) {
      const post = orient === 'v' ? { x0: cx - 4, x1: cx + 4, y0: cy + d - 4, y1: cy + d + 4 } : { x0: cx + d - 4, x1: cx + d + 4, y0: cy - 4, y1: cy + 4 };
      add(m, Object.assign({ id: gid + '-post' + i, name: 'Tirador', role: 'pull', mat: 'metal', group: gid, noCollide: true, z0: zFace, z1: zFace + 20 }, post));
    });
  }

  // o: { id, label, x0, x1, y0, y1, hinge: 'left'|'right', kind: 'recta'|'curva', soft, pull: { id, cy } }
  function hingedDoor(m, o) {
    const Dc = m.Dc, w = o.x1 - o.x0, h = o.y1 - o.y0;
    const gid = m.id + '-' + o.id;
    wood(m, o.id, o.partName || 'Puerta', 'door', box(o.x0, o.x1, o.y0, o.y1, Dc + 2, Dc + 22), 'y', 'z', { group: gid, label: o.label });
    const n = E.hingeCount(h);
    const hingeId = o.soft ? (o.kind === 'recta' ? 'hRectaF' : 'hCurvaF') : (o.kind === 'recta' ? 'hRecta' : 'hCurva');
    hw(m, hingeId, n, o.label, HINGE_COMPONENT[hingeId]);
    sc(m, 't35x15', 4 * n, 'Bisagras, 4 por bisagra (' + o.label + ')');
    const pullX = o.hinge === 'left' ? w - 40 : 40;
    const pullCy = o.pull.cy - o.y0;
    pullElements(m, gid, o.pull.id, 'v', o.x0 + pullX, o.pull.cy, Dc + 22);
    hw(m, o.pull.id, 1, o.label, 'Tiradores de puerta');
    m.doors.push({
      id: gid, label: o.label, type: 'hinged', x0: o.x0, x1: o.x1, y0: o.y0, y1: o.y1, w: w, h: h,
      hinge: o.hinge, hingeId: hingeId, kind: o.kind, soft: !!o.soft, hinges: n, hingePos: E.hingePositions(h),
      pull: { id: o.pull.id, orient: 'v', cx: pullX, cy: pullCy, len: Catalog.byId[o.pull.id].pullLength },
      weightKg: E.panelWeightKg(w, h, T)
    });
    m.movables.push({ id: gid, type: 'hinged', hinge: o.hinge, pivotX: o.hinge === 'left' ? o.x0 : o.x1, pivotZ: Dc + 2 });
  }

  // o: { id, label, bayX0, bayX1, fx0, fx1, fy0, fy1, slide, pull }
  function drawer(m, o) {
    const Dc = m.Dc;
    const slide = Catalog.byId[o.slide];
    const fh = o.fy1 - o.fy0;
    const boxW = o.bayX1 - o.bayX0 - 26;
    const boxL = slide.slideLength;
    const boxH = fh - 50;
    const bx0 = o.bayX0 + 13, bx1 = bx0 + boxW;
    const by0 = o.fy0 + 25;           // underside of the 3 mm bottom
    const sy0 = by0 + 3, sy1 = sy0 + boxH;
    const bz1 = Dc + 2, bz0 = bz1 - boxL;
    const gid = m.id + '-' + o.id;
    const g = { group: gid };
    wood(m, o.id + '-front', 'Frente de cajón', 'drawer-front', box(o.fx0, o.fx1, o.fy0, o.fy1, Dc + 2, Dc + 22), 'x', 'z', Object.assign({ label: o.label }, g));
    wood(m, o.id + '-sl', 'Lateral de caja de cajón', 'box-side', box(bx0, bx0 + T, sy0, sy1, bz0, bz1), 'z', 'x', g);
    wood(m, o.id + '-sr', 'Lateral de caja de cajón', 'box-side', box(bx1 - T, bx1, sy0, sy1, bz0, bz1), 'z', 'x', g);
    wood(m, o.id + '-bf', 'Frente y trasera de caja de cajón', 'box-end', box(bx0 + T, bx1 - T, sy0, sy1, bz1 - T, bz1), 'x', 'z', g);
    wood(m, o.id + '-bb', 'Frente y trasera de caja de cajón', 'box-end', box(bx0 + T, bx1 - T, sy0, sy1, bz0, bz0 + T), 'x', 'z', g);
    add(m, Object.assign({ id: m.id + '-' + o.id + '-bottom', name: 'Fondo de cajón', role: 'box-bottom', mat: 'euc3', grain: 'z', thick: 'y' }, box(bx0, bx1, by0, by0 + 3, bz0, bz1), g));
    const sm = sy0 + boxH / 2;
    add(m, Object.assign({ id: gid + '-slideL', name: 'Guía', role: 'slide', mat: 'metal' }, box(o.bayX0, o.bayX0 + 12.7, sm - 17.5, sm + 17.5, bz0, Dc), g));
    add(m, Object.assign({ id: gid + '-slideR', name: 'Guía', role: 'slide', mat: 'metal' }, box(o.bayX1 - 12.7, o.bayX1, sm - 17.5, sm + 17.5, bz0, Dc), g));
    pullElements(m, gid, o.pull, 'h', (o.fx0 + o.fx1) / 2, (o.fy0 + o.fy1) / 2, Dc + 22);

    hw(m, o.slide, 2, o.label, 'Guías de cajón (2 unidades por cajón)');
    hw(m, o.pull, 1, o.label, 'Tiradores de cajón');
    const corners = E.drawerCornerScrews(boxH);
    sc(m, 't4x50', 4 * corners, 'Esquinas de caja, ' + corners + ' por esquina (' + o.label + ')');
    sc(m, 't4x35', 4, 'Frente fijado desde adentro (' + o.label + ')');
    sc(m, 't35x15', 12, 'Guías, 6 por riel × 2 (' + o.label + ')');
    sc(m, 't35x15', Math.ceil(2 * (boxW + boxL) / 120), 'Fondo de cajón cada ~120 mm (' + o.label + ')');
    m.drawers.push({
      id: gid, label: o.label, slide: o.slide,
      front: { x0: o.fx0, x1: o.fx1, y0: o.fy0, y1: o.fy1, w: o.fx1 - o.fx0, h: fh },
      bay: { x0: o.bayX0, x1: o.bayX1, w: o.bayX1 - o.bayX0 },
      box: { w: boxW, h: boxH, L: boxL, x0: bx0, x1: bx1, y0: by0, y1: sy1, z0: bz0, z1: bz1 },
      pull: { id: o.pull, len: Catalog.byId[o.pull].pullLength }
    });
    m.movables.push({ id: gid, type: 'drawer', dz: Math.round(boxL * 0.7) });
  }

  function pieceFits(w, h, sheetId) {
    const s = E.boardSpec(sheetId);
    return (h <= s.uL && w <= s.uW) || (w <= s.uL && h <= s.uW);
  }

  // Back panel split at the fewest candidate positions (divider centres / module edges).
  function back(m, x0, x1, y0, y1, cuts) {
    const mat = m.backMat, tb = m.tb, h = y1 - y0;
    const pieces = [];
    let start = x0;
    while (!pieceFits(x1 - start, h, mat)) {
      const ok = cuts.filter(function (c) { return c > start && pieceFits(c - start, h, mat); });
      if (!ok.length) throw new Error(m.id + ': back cannot be split');
      const c = Math.max.apply(null, ok);
      pieces.push([start, c]);
      start = c;
    }
    pieces.push([start, x1]);
    const members = m.elements.filter(function (e) { return e.z0 === 0 && (e.role === 'divider' || e.role === 'shelf' || e.role === 'maletero' || e.role === 'separator'); });
    pieces.forEach(function (pc, i) {
      add(m, Object.assign({ id: m.id + '-back-' + x0 + '-' + i, name: 'Fondo', role: 'back', mat: mat, grain: 'y', thick: 'z' }, box(pc[0], pc[1], y0, y1, -tb, 0)));
      const w = pc[1] - pc[0];
      let n = 2 * Math.ceil(w / 150) + 2 * Math.ceil(h / 150);
      members.forEach(function (e) {
        if (e.role === 'divider') {
          if (e.x0 > pc[0] && e.x1 < pc[1]) n += Math.ceil((e.y1 - e.y0) / 150) - 1;
        } else {
          const len = Math.min(e.x1, pc[1]) - Math.max(e.x0, pc[0]);
          if (len > 0) n += Math.max(1, Math.ceil(len / 150) - 1);
        }
      });
      sc(m, 't35x15', n, 'Fondo ' + w + ' × ' + h + ': perímetro y montantes cada 150 mm');
    });
    return pieces;
  }

  // Machining entries derived from doors, drawers and hardware.
  function finalize(m) {
    const cups = m.doors.filter(function (d) { return d.type === 'hinged'; });
    const nCups = cups.reduce(function (s, d) { return s + d.hinges; }, 0);
    if (nCups) {
      m.machining.unshift({
        op: 'Cazoletas Ø35 mm para bisagras (mecha Forstner 35 mm): centro a 22 mm del canto de la bisagra; a 100 mm de cada extremo y el resto repartido',
        qty: nCups, unit: 'cazoletas',
        detail: cups.map(function (d) { return d.label + ' ' + d.w + ' × ' + d.h + ': ' + d.hinges + ' (' + d.hingePos.map(E.fmtMm).join(' / ') + ' mm desde abajo)'; })
      });
      m.machining.push({ op: 'Bases de bisagra en lateral o divisor: marcar a la altura de cada cazoleta (tornillos 3.5 × 15 incluidos en la cuenta)', qty: nCups, unit: 'bases' });
    }
    const arcPulls = m.hardware.filter(function (h) { return /^arc/.test(h.id); }).reduce(function (s, h) { return s + h.qty; }, 0);
    if (arcPulls) m.machining.push({ op: 'Agujeros pasantes para tiradores Arcadia (2 por tirador, a la distancia entre centros del tirador; confirmar medida)', qty: arcPulls * 2, unit: 'agujeros' });
    if (m.drawers.length) m.machining.push({ op: 'Agujeros para tornillos de guías (6 por riel, 2 rieles por cajón)', qty: m.drawers.length * 12, unit: 'agujeros' });
    m.expect = m.expect || {};
  }

  // ---------- M1 Clásico ----------
  function buildM1() {
    const m = newModel({
      id: 'M1', name: 'Clásico', fullName: 'Modelo 1 — Clásico', W: 1000, H: 2080, Dc: 580, K: 80,
      backMat: 'euc3', tb: 3, base: 'Zócalo 80 mm', coats: { front: 3, carcass: 2, inner: 1 },
      material: 'Finger Joint 20 mm; fondo Compensado Eucaliptus Clear 3 mm',
      summary: '2 puertas con bisagra, barra de colgar larga a la izquierda, 4 estantes a la derecha y maletero.',
      expect: { doors: 2, drawers: 0, rods: 1, shelves: 4, maleteros: 1 }
    });
    const W = m.W, H = m.H, Dc = m.Dc;
    plinthCarcass(m, { x0: 0, W: W });
    shelf(m, 'maletero', 'Maletero', 'maletero', T, W - T, 1720, Dc, 'through');
    divider(m, 'div', 490, 100, 1720, Dc, 'Divisor central (parcial)');
    const sp = E.evenSpaces(1720 - 100 - 4 * T, 5);
    let y = 100;
    for (let i = 0; i < 4; i++) { y += sp[i]; shelf(m, 'shelf' + i, 'Estante', 'shelf', 510, W - T, y, Dc, 'through'); y += T; }
    rod(m, 'rod', T, 490, 1650, Dc, 'long', 'Cuerpo izquierdo');
    const f = splitFronts(REVEAL, W - REVEAL, 2);
    hingedDoor(m, { id: 'doorL', label: 'Puerta izquierda', x0: f[0][0], x1: f[0][1], y0: 81.5, y1: 2078.5, hinge: 'left', kind: 'recta', pull: { id: 'arc160', cy: 1050 } });
    hingedDoor(m, { id: 'doorR', label: 'Puerta derecha', x0: f[1][0], x1: f[1][1], y0: 81.5, y1: 2078.5, hinge: 'right', kind: 'recta', pull: { id: 'arc160', cy: 1050 } });
    back(m, 0, W, m.K, H, [500]);
    hw(m, 'titebond', 1, 'Cola para uniones de carcasa');
    hw(m, 'pinceleta', 2, 'Aplicación del barniz');
    m.bays = [
      { label: 'Colgar largo', x0: T, x1: 490 },
      { label: '4 estantes', x0: 510, x1: W - T }
    ];
    m.notes.push('Divisor central parcial (y 100–1720): a la izquierda barra de colgar larga, a la derecha 4 estantes de 308 mm de luz; maletero arriba.');
    finalize(m);
    return m;
  }

  // ---------- M2 Familiar modular ----------
  function buildM2() {
    const m = newModel({
      id: 'M2', name: 'Familiar modular', fullName: 'Modelo 2 — Familiar modular', W: 2000, H: 2080, Dc: 580, K: 80,
      backMat: 'euc3', tb: 3, base: 'Zócalo 80 mm', coats: { front: 3, carcass: 2, inner: 1 },
      material: 'Finger Joint 20 mm; fondos Compensado Eucaliptus Clear 3 mm',
      summary: 'Dos módulos de 1000 mm unidos: A con barra larga y maletero; B con 4 cajones, 2 estantes y maletero.',
      expect: { doors: 4, drawers: 4, rods: 1, shelves: 2, maleteros: 2, separators: 1 }
    });
    const H = m.H, Dc = m.Dc;
    // Module A
    plinthCarcass(m, { x0: 0, W: 1000, tag: 'A-', label: 'módulo A' });
    shelf(m, 'A-maletero', 'Maletero', 'maletero', T, 1000 - T, 1720, Dc, 'through');
    rod(m, 'A-rod', T, 1000 - T, 1650, Dc, 'long', 'Módulo A');
    const fa = splitFronts(REVEAL, 1000 - REVEAL, 2);
    hingedDoor(m, { id: 'A-doorL', label: 'Puerta A izquierda', partName: 'Puerta módulo A', x0: fa[0][0], x1: fa[0][1], y0: 81.5, y1: 2078.5, hinge: 'left', kind: 'recta', pull: { id: 'arc160', cy: 1050 } });
    hingedDoor(m, { id: 'A-doorR', label: 'Puerta A derecha', partName: 'Puerta módulo A', x0: fa[1][0], x1: fa[1][1], y0: 81.5, y1: 2078.5, hinge: 'right', kind: 'recta', pull: { id: 'arc160', cy: 1050 } });
    // Module B
    plinthCarcass(m, { x0: 1000, W: 1000, tag: 'B-', label: 'módulo B' });
    const bx0 = 1000 + T, bx1 = 2000 - T;
    const fy = stackFronts(81.5, [197, 197, 197, 197]);
    fy.forEach(function (r, i) {
      drawer(m, { id: 'B-drawer' + (i + 1), label: 'Cajón ' + (i + 1), bayX0: bx0, bayX1: bx1, fx0: 1000 + REVEAL, fx1: 2000 - REVEAL, fy0: r[0], fy1: r[1], slide: 'g45', pull: 'arc128' });
    });
    const doorBottom = fy[3][1] + GAP;               // 881.5
    const sepTop = doorBottom - REVEAL;              // 880
    shelf(m, 'B-sep', 'Separador sobre cajones', 'separator', bx0, bx1, sepTop - T, Dc, 'through');
    shelf(m, 'B-maletero', 'Maletero', 'maletero', bx0, bx1, 1720, Dc, 'through');
    const sp = E.evenSpaces(1720 - sepTop - 2 * T, 3);
    let y = sepTop;
    for (let i = 0; i < 2; i++) { y += sp[i]; shelf(m, 'B-shelf' + i, 'Estante', 'shelf', bx0, bx1, y, Dc, 'through'); y += T; }
    const fb = splitFronts(1000 + REVEAL, 2000 - REVEAL, 2);
    hingedDoor(m, { id: 'B-doorL', label: 'Puerta B izquierda', partName: 'Puerta superior módulo B', x0: fb[0][0], x1: fb[0][1], y0: doorBottom, y1: 2078.5, hinge: 'left', kind: 'recta', pull: { id: 'arc160', cy: doorBottom + 150 } });
    hingedDoor(m, { id: 'B-doorR', label: 'Puerta B derecha', partName: 'Puerta superior módulo B', x0: fb[1][0], x1: fb[1][1], y0: doorBottom, y1: 2078.5, hinge: 'right', kind: 'recta', pull: { id: 'arc160', cy: doorBottom + 150 } });
    sc(m, 't4x35', 6, 'Unión entre módulos A y B');
    back(m, 0, 1000, m.K, H, []);
    back(m, 1000, 2000, m.K, H, []);
    hw(m, 'titebond', 1, 'Cola para uniones de carcasa');
    hw(m, 'pinceleta', 2, 'Aplicación del barniz');
    m.bays = [
      { label: 'A · colgar largo', x0: T, x1: 1000 - T },
      { label: 'B · cajones + estantes', x0: bx0, x1: bx1 }
    ];
    m.notes.push('Dos carcasas independientes de 1000 mm (se transportan por separado) unidas con 6 tornillos 4 × 35.');
    m.notes.push('Módulo B: estantes con luces ' + sp.join(' / ') + ' mm entre separador (880) y maletero (1720).');
    finalize(m);
    return m;
  }

  // ---------- M3 Moderno corredizo ----------
  function buildM3() {
    const m = newModel({
      id: 'M3', name: 'Moderno corredizo', fullName: 'Modelo 3 — Moderno corredizo', W: 1800, H: 2100, Dc: 600, K: 80,
      backMat: 'euc3', tb: 3, base: 'Zócalo 80 mm', coats: { front: 3, carcass: 2, inner: 1 },
      material: 'Finger Joint 20 mm; fondo Compensado Eucaliptus Clear 3 mm',
      summary: '2 puertas corredizas colgantes (Ducloset Doble), 3 cuerpos: colgar largo + maletero, 5 estantes, doble barra.',
      expect: { doors: 2, drawers: 0, rods: 3, shelves: 5, maleteros: 1 }
    });
    const W = m.W, H = m.H, Dc = m.Dc, D = 540;
    plinthCarcass(m, { x0: 0, W: W, usableDepth: D });
    divider(m, 'div1', 593, 100, H - T, D, 'Divisor');
    divider(m, 'div2', 1187, 100, H - T, D, 'Divisor');
    // L: long hanging + maletero
    shelf(m, 'maletero', 'Maletero', 'maletero', T, 593, 1720, D, 'through');
    rod(m, 'rodL', T, 593, 1650, D, 'long', 'Cuerpo izquierdo');
    // C: 5 shelves
    const sp = E.evenSpaces(H - T - 100 - 5 * T, 6);
    let y = 100;
    for (let i = 0; i < 5; i++) { y += sp[i]; shelf(m, 'shelf' + i, 'Estante', 'shelf', 613, 1187, y, D, 'through'); y += T; }
    // R: double rod
    rod(m, 'rodRu', 1207, W - T, 2005, D, 'short', 'Cuerpo derecho, barra superior');
    rod(m, 'rodRl', 1207, W - T, 1030, D, 'short', 'Cuerpo derecho, barra inferior');
    // Sliding doors: rear track (left) and front track (right), overlap 40
    const dy0 = 100 + 5, dy1 = H - T - 35;
    const doors = [
      { id: 'doorL', label: 'Hoja izquierda (riel trasero)', x0: T, x1: T + 900, z0: 548, z1: 568, cubetaX: 30 + 17, track: 'trasero', dx: 0 },
      { id: 'doorR', label: 'Hoja derecha (riel delantero)', x0: W - T - 900, x1: W - T, z0: 572, z1: 592, cubetaX: 900 - 30 - 17, track: 'delantero', dx: -(900 - 40) }
    ];
    doors.forEach(function (d) {
      const gid = m.id + '-' + d.id;
      wood(m, d.id, 'Puerta corrediza', 'door', box(d.x0, d.x1, dy0, dy1, d.z0, d.z1), 'y', 'z', { group: gid, label: d.label });
      pullElements(m, gid, 'cubeta', 'v', d.x0 + d.cubetaX, 1050, d.z1);
      hw(m, 'cubeta', 1, d.label, 'Tiradores embutidos (obligatorios en corredizas que se cruzan)');
      m.doors.push({
        id: gid, label: d.label, type: 'sliding', track: d.track, x0: d.x0, x1: d.x1, y0: dy0, y1: dy1, w: d.x1 - d.x0, h: dy1 - dy0,
        pull: { id: 'cubeta', orient: 'v', cx: d.cubetaX, cy: 1050 - dy0, len: 143 }, weightKg: E.panelWeightKg(900, dy1 - dy0, T)
      });
      if (d.dx) m.movables.push({ id: gid, type: 'sliding', dx: d.dx });
    });
    add(m, { id: 'M3-rail', name: 'Riel U20', role: 'rail', mat: 'metal', x0: T, x1: W - T, y0: H - T - 20, y1: H - T, z0: 548, z1: 592 });
    hw(m, 'duclosetD', 1, 'Sistema corredizo', 'Sistema corredizo colgante (kit 2 hojas)');
    hw(m, 'rielU20_2', 1, 'Riel superior', 'Riel superior (cortar a 1760 mm)');
    sc(m, 't35x15', 8, 'Riel y sistema corredizo');
    back(m, 0, W, m.K, H, [603, 1197]);
    hw(m, 'titebond', 1, 'Cola para uniones de carcasa');
    hw(m, 'pinceleta', 2, 'Aplicación del barniz');
    m.machining.push({ op: 'Rebaje 143 × 34 mm para cubeta en cada hoja (fresadora o formón); profundidad según la cubeta', qty: 2, unit: 'rebajes' });
    m.machining.push({ op: 'Cortar el riel U20 de 2 m a 1760 mm (sierra para metales)', qty: 1, unit: 'corte' });
    m.bays = [
      { label: 'Colgar largo', x0: T, x1: 593 },
      { label: '5 estantes', x0: 613, x1: 1187 },
      { label: 'Doble barra', x0: 1207, x1: W - T }
    ];
    m.notes.push('Profundidad útil interior 540 mm; los 60 mm delanteros alojan las dos hojas corredizas y el riel.');
    m.notes.push('Altura de hoja = abertura 1980 − 35 (riel + carro) − 5 (guía inferior) = 1940 mm. Verificar con la ficha de instalación Ducasse antes de cortar; conviene cortar las hojas al final.');
    m.notes.push('Cuerpo central: luces entre estantes ' + sp.join(' / ') + ' mm.');
    finalize(m);
    return m;
  }

  // ---------- M4 Cajonera ----------
  function buildM4() {
    const m = newModel({
      id: 'M4', name: 'Cajonera', fullName: 'Modelo 4 — Cajonera', W: 1600, H: 2080, Dc: 580, K: 80,
      backMat: 'euc3', tb: 3, base: 'Zócalo 80 mm', coats: { front: 3, carcass: 2, inner: 1 },
      material: 'Finger Joint 20 mm; fondos Compensado Eucaliptus Clear 3 mm',
      summary: 'Cuerpo izquierdo de colgar largo con 2 puertas altas; cuerpo derecho con 8 cajones y alacena superior de 2 puertas.',
      expect: { doors: 4, drawers: 8, rods: 1, shelves: 1, maleteros: 1, separators: 1 }
    });
    const W = m.W, H = m.H, Dc = m.Dc;
    plinthCarcass(m, { x0: 0, W: W });
    divider(m, 'div', 790, 100, H - T, Dc, 'Divisor');
    shelf(m, 'maletero', 'Maletero', 'maletero', T, 790, 1720, Dc, 'through');
    rod(m, 'rod', T, 790, 1650, Dc, 'long', 'Cuerpo izquierdo');
    const fy = stackFronts(81.5, [190, 190, 190, 190, 140, 140, 140, 140]);
    fy.forEach(function (r, i) {
      drawer(m, { id: 'drawer' + (i + 1), label: 'Cajón ' + (i + 1), bayX0: 810, bayX1: W - T, fx0: 800 + REVEAL, fx1: W - REVEAL, fy0: r[0], fy1: r[1], slide: 'g45', pull: 'arc128' });
    });
    const upperBottom = fy[7][1] + GAP;              // 1425.5
    const sepTop = upperBottom - REVEAL;             // 1424
    shelf(m, 'sep', 'Separador sobre cajones', 'separator', 810, W - T, sepTop - T, Dc, 'through');
    const sp = E.evenSpaces(H - T - sepTop - T, 2);
    shelf(m, 'shelf0', 'Estante', 'shelf', 810, W - T, sepTop + sp[0], Dc, 'through');
    const fl = splitFronts(REVEAL, 800 - REVEAL, 2);
    const fr = splitFronts(800 + REVEAL, W - REVEAL, 2);
    hingedDoor(m, { id: 'doorL1', label: 'Puerta alta izquierda', partName: 'Puerta alta', x0: fl[0][0], x1: fl[0][1], y0: 81.5, y1: 2078.5, hinge: 'left', kind: 'recta', pull: { id: 'arc160', cy: 1050 } });
    hingedDoor(m, { id: 'doorL2', label: 'Puerta alta derecha', partName: 'Puerta alta', x0: fl[1][0], x1: fl[1][1], y0: 81.5, y1: 2078.5, hinge: 'right', kind: 'curva', pull: { id: 'arc160', cy: 1050 } });
    hingedDoor(m, { id: 'doorU1', label: 'Puerta superior izquierda', partName: 'Puerta superior', x0: fr[0][0], x1: fr[0][1], y0: upperBottom, y1: 2078.5, hinge: 'left', kind: 'curva', pull: { id: 'arc160', cy: upperBottom + 150 } });
    hingedDoor(m, { id: 'doorU2', label: 'Puerta superior derecha', partName: 'Puerta superior', x0: fr[1][0], x1: fr[1][1], y0: upperBottom, y1: 2078.5, hinge: 'right', kind: 'recta', pull: { id: 'arc160', cy: upperBottom + 150 } });
    back(m, 0, W, m.K, H, [800]);
    hw(m, 'titebond', 1, 'Cola para uniones de carcasa');
    hw(m, 'pinceleta', 2, 'Aplicación del barniz');
    m.bays = [
      { label: 'Colgar largo', x0: T, x1: 790 },
      { label: '8 cajones + alacena', x0: 810, x1: W - T }
    ];
    m.notes.push('Las puertas que abren sobre el divisor llevan bisagra curva (semi-superpuesta); las del lateral exterior, recta.');
    finalize(m);
    return m;
  }

  // ---------- M5 Premium ----------
  function buildM5() {
    const m = newModel({
      id: 'M5', name: 'Premium', fullName: 'Modelo 5 — Premium', W: 1800, H: 2150, Dc: 580, K: 100,
      backMat: 'ced4', tb: 4, base: '8 patas regulables Sandy (100 mm)', coats: { front: 3, carcass: 3, inner: 2 },
      material: 'Finger Joint 20 mm; fondo Compensado Cedro Real 4 mm; fondos de cajón Eucaliptus 3 mm',
      summary: 'Uniones ocultas con listones, 3 puertas con cierre suave, 4 cajones con amortiguación, patas regulables y fondo de cedro.',
      expect: { doors: 3, drawers: 4, rods: 3, shelves: 2, maleteros: 1, separators: 1 }
    });
    const W = m.W, H = m.H, Dc = m.Dc, K = m.K;
    const yB = K + T;            // 120: top face of the bottom panel
    const yT = H - T;            // 2130: underside of the top panel
    wood(m, 'bottom', 'Piso', 'bottom', box(0, W, K, yB, 0, Dc), 'x', 'y');
    wood(m, 'top', 'Techo', 'top', box(0, W, yT, H, 0, Dc), 'x', 'y');
    wood(m, 'side-L', 'Lateral', 'side', box(0, T, yB, yT, 0, Dc), 'y', 'x');
    wood(m, 'side-R', 'Lateral', 'side', box(W - T, W, yB, yT, 0, Dc), 'y', 'x');
    divider(m, 'div1', 593, yB, yT, Dc, 'Divisor', false);
    divider(m, 'div2', 1187, yB, yT, Dc, 'Divisor', false);
    m.interiors.push(box(T, W - T, yB, yT, 0, Dc));
    m.modules.push({ label: '', x0: 0, x1: W });

    // Cleats 40 × 20 × (Dc − 40), laid flat; z from 20 to Dc − 20.
    let nCleats = 0;
    function cleat(id, x0, y0) {
      wood(m, 'cleat-' + id, 'Listón de unión 40 × 20', 'cleat', box(x0, x0 + 40, y0, y0 + T, 20, Dc - 20), 'z', 'y');
      nCleats++;
    }
    function frameCleat(id, x0, atTop) {
      cleat(id, x0, atTop ? yT - T : yB);
      sc(m, 't4x35', 4, 'Listón → vertical');
      sc(m, 't4x35', 4, 'Listón → ' + (atTop ? 'techo' : 'piso'));
    }
    function shelfCleats(id, xa, xb, yShelf) {
      cleat(id + 'a', xa, yShelf - T);
      cleat(id + 'b', xb - 40, yShelf - T);
      sc(m, 't4x35', 2 * 4, 'Listones de estante → vertical');
      sc(m, 't4x35', 2 * 3, 'Estante → listones, desde abajo');
    }
    [true, false].forEach(function (top) {
      frameCleat('sL' + top, T, top);
      frameCleat('sR' + top, W - T - 40, top);
      frameCleat('d1L' + top, 593 - 40, top);
      frameCleat('d2R' + top, 1207, top);
    });
    // Drawer bay faces: only top cleats (bottom ones would collide with the drawer runners).
    frameCleat('d1Rtop', 613, true);
    frameCleat('d2Ltop', 1187 - 40, true);
    sc(m, 't4x50', 8, 'Divisores → piso desde abajo, 4 por divisor (reemplaza el listón del lado de los cajones)');

    // L: long hanging + maletero
    shelf(m, 'maletero', 'Maletero', 'maletero', T, 593, 1790, Dc);
    shelfCleats('mal', T, 593, 1790);
    rod(m, 'rodL', T, 593, 1720, Dc, 'long', 'Cuerpo izquierdo');

    // C: 4 drawers, separator, 2 shelves
    const fy = stackFronts(K + REVEAL, [220, 220, 180, 180]);
    fy.forEach(function (r, i) {
      drawer(m, { id: 'drawer' + (i + 1), label: 'Cajón ' + (i + 1), bayX0: 613, bayX1: 1187, fx0: 603 + REVEAL, fx1: 1197 - REVEAL, fy0: r[0], fy1: r[1], slide: 'dtc500', pull: 'arc190' });
    });
    const cDoorBottom = fy[3][1] + GAP;               // 913.5
    const sepTop = cDoorBottom - REVEAL;              // 912
    shelf(m, 'sep', 'Separador sobre cajones', 'separator', 613, 1187, sepTop - T, Dc);
    sc(m, 't4x50', 8, 'Separador sobre cajones: 4 pasantes por extremo desde los cuerpos laterales (reemplaza listones)');
    const sp = E.evenSpaces(yT - sepTop - 2 * T, 3);
    let y = sepTop;
    for (let i = 0; i < 2; i++) {
      y += sp[i];
      shelf(m, 'shelf' + i, 'Estante', 'shelf', 613, 1187, y, Dc);
      shelfCleats('sh' + i, 613, 1187, y);
      y += T;
    }

    // R: double rod (70 mm under the top; lower rod 930 mm above the bay floor, as in M3)
    rod(m, 'rodRu', 1207, W - T, yT - 70, Dc, 'short', 'Cuerpo derecho, barra superior');
    rod(m, 'rodRl', 1207, W - T, yB + 930, Dc, 'short', 'Cuerpo derecho, barra inferior');

    // Doors (soft-close)
    const fy1 = H - REVEAL;
    hingedDoor(m, { id: 'doorL', label: 'Puerta izquierda', partName: 'Puerta lateral', x0: REVEAL, x1: 603 - REVEAL, y0: K + REVEAL, y1: fy1, hinge: 'left', kind: 'recta', soft: true, pull: { id: 'arc320', cy: 1100 } });
    hingedDoor(m, { id: 'doorR', label: 'Puerta derecha', partName: 'Puerta lateral', x0: 1197 + REVEAL, x1: W - REVEAL, y0: K + REVEAL, y1: fy1, hinge: 'right', kind: 'recta', soft: true, pull: { id: 'arc320', cy: 1100 } });
    hingedDoor(m, { id: 'doorC', label: 'Puerta central superior', partName: 'Puerta central', x0: 603 + REVEAL, x1: 1197 - REVEAL, y0: cDoorBottom, y1: fy1, hinge: 'left', kind: 'curva', soft: true, pull: { id: 'arc320', cy: cDoorBottom + 200 } });

    // Legs: one per vertical, front and back, inset 40 mm
    [40, 603, 1197, W - 40].forEach(function (cx, i) {
      [40, Dc - 40].forEach(function (cz, j) {
        add(m, { id: 'M5-leg' + i + j, name: 'Pata', role: 'leg', mat: 'black', x0: cx - 25, x1: cx + 25, y0: 0, y1: K, z0: cz - 25, z1: cz + 25 });
      });
    });
    hw(m, 'pataSandy', 8, 'Una por vertical, adelante y atrás', 'Patas regulables');
    sc(m, 't35x15', 8 * 4, 'Patas, 4 por pata');

    back(m, 0, W, K, H, [603, 1197]);
    hw(m, 'titebond', 2, 'Cola para listones y uniones');
    hw(m, 'pinceleta', 2, 'Aplicación del barniz');
    const cleatScrewsThrough40 = nCleats * 4;
    m.machining.push({ op: 'Cajeado Ø8 mm × 20 mm para los tornillos 4 × 35 que atraviesan el listón por su lado de 40 mm (listón → vertical)', qty: cleatScrewsThrough40, unit: 'cajeados' });
    m.bays = [
      { label: 'Colgar largo', x0: T, x1: 593 },
      { label: '4 cajones + 2 estantes', x0: 613, x1: 1187 },
      { label: 'Doble barra', x0: 1207, x1: W - T }
    ];
    m.notes.push('Techo y piso de ancho completo; laterales y divisores entre ellos. Uniones con listones 40 × 20 encolados y atornillados: sin cabezas de tornillo a la vista desde afuera.');
    m.notes.push('Patas Sandy regulables de 65 a 100 mm: el diseño usa 100 mm (máximo), así que sólo se puede nivelar bajando.');
    m.notes.push('Cuerpo central: luces entre estantes ' + sp.join(' / ') + ' mm.');
    m.changes.push('M5, cuerpo central: los listones inferiores de los divisores del lado de los cajones y los listones del separador chocaban con las guías y con la caja del cajón superior. Se reemplazaron por 4 tornillos 4 × 50 desde abajo del piso en cada divisor (las cabezas quedan en la cara inferior del piso, que no se ve) y 4 tornillos 4 × 50 pasantes por extremo del separador desde los cuerpos laterales (cabezas sólo visibles dentro del mueble). Los listones superiores del cuerpo central (bajo el techo) y los de sus dos estantes no chocan con nada y se mantienen.');
    finalize(m);
    return m;
  }

  const builders = { M1: buildM1, M2: buildM2, M3: buildM3, M4: buildM4, M5: buildM5 };
  const ids = ['M1', 'M2', 'M3', 'M4', 'M5'];

  function build(id) { return builders[id](); }
  function buildAll() { return ids.map(build); }

  return { ids: ids, build: build, buildAll: buildAll, T: T, REVEAL: REVEAL, GAP: GAP };
});
