/* Pure calculation engine: formatting, construction rules, part aggregation,
   3-stage guillotine nesting with board-mix optimisation, finish, budget,
   capacity metrics and Cortecloud export. No DOM access. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./catalog.js'));
  else root.RoperoEngine = factory(root.RoperoCatalog);
})(typeof self !== 'undefined' ? self : this, function (Catalog) {
  'use strict';

  const KERF = 4;
  const FJ_TRIM_END = 10;   // per board end (along the length)
  const FJ_TRIM_EDGE = 5;   // per long edge
  const PLY_TRIM = 5;       // plywood, all edges
  const BONA_M2_PER_L = 8;  // Bona TDS 8–10 m²/L per coat; conservative value
  const FINISH_EDGE_EXTRA = 0.05;
  const TACO = { L: 80, A: 45, T: 20 };
  const TACO_STRIP_MAX = 1200;
  const MIN_CUT_WIDTH_FLAG = 50;
  const DENSITY = 550;      // kg/m³, assumed for weight estimates

  const MAT_LABEL = {
    fj: 'Finger Joint 20 mm',
    euc3: 'Compensado Eucaliptus Clear 3 mm',
    ced4: 'Compensado Cedro Real 4 mm'
  };
  const MAT_ORDER = { fj: 0, euc3: 1, ced4: 2 };

  // ---------- formatting (es-UY) ----------
  function groupThousands(intStr) {
    return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  function fmtNum(n, dec) {
    const d = dec == null ? 0 : dec;
    const neg = n < 0;
    const s = Math.abs(n).toFixed(d);
    const parts = s.split('.');
    const out = groupThousands(parts[0]) + (d > 0 ? ',' + parts[1] : '');
    return (neg ? '-' : '') + out;
  }
  function fmtUSD(cents) {
    const neg = cents < 0;
    const abs = Math.abs(Math.round(cents));
    const intPart = Math.floor(abs / 100);
    const dec = String(abs % 100).padStart(2, '0');
    return (neg ? '-' : '') + 'USD ' + groupThousands(String(intPart)) + ',' + dec;
  }
  // Millimetres in cut lists: no thousands separator, decimal comma.
  function fmtMm(n) {
    return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
  }

  // ---------- construction rules ----------
  function hingeCount(doorHeight) {
    if (doorHeight <= 900) return 2;
    if (doorHeight <= 1600) return 3;
    if (doorHeight <= 2000) return 4;
    return 5;
  }
  // Distances from the door bottom: 100 mm from each end, rest evenly spaced.
  function hingePositions(doorHeight) {
    const n = hingeCount(doorHeight);
    const first = 100;
    const last = doorHeight - 100;
    const out = [];
    for (let i = 0; i < n; i++) out.push(Math.round((first + (last - first) * i / (n - 1)) * 10) / 10);
    return out;
  }
  // Split `total` into n integer spaces as evenly as possible (extra mm go to outer spaces).
  function evenSpaces(total, n) {
    const base = Math.floor(total / n);
    let rest = total - base * n;
    const arr = new Array(n).fill(base);
    const order = [];
    for (let i = 0; i < n; i++) order.push(i % 2 === 0 ? n - 1 - Math.floor(i / 2) : Math.floor(i / 2));
    for (let k = 0; rest > 0; k++, rest--) arr[order[k % n]] += 1;
    return arr;
  }
  function drawerCornerScrews(boxHeight) {
    return Math.max(2, Math.ceil(boxHeight / 70));
  }
  // Simply supported beam, UDL: δ = 5 w L⁴ / (384 E I)
  function rodDeflection(spanMm, loadKg, bMm, hMm, eMpa) {
    const w = loadKg * 9.81 / spanMm;
    const I = bMm * Math.pow(hMm, 3) / 12;
    return 5 * w * Math.pow(spanMm, 4) / (384 * eMpa * I);
  }
  function panelWeightKg(w, h, t) {
    return w / 1000 * h / 1000 * t / 1000 * DENSITY;
  }

  // ---------- parts ----------
  function dims(e) { return { x: e.x1 - e.x0, y: e.y1 - e.y0, z: e.z1 - e.z0 }; }
  function r1(v) { return Math.round(v * 10) / 10; }

  function toPart(e) {
    const d = dims(e);
    const other = ['x', 'y', 'z'].filter(function (a) { return a !== e.grain && a !== e.thick; })[0];
    let L = r1(d[e.grain]);
    let A = r1(d[other]);
    const T = r1(d[e.thick]);
    if (e.mat !== 'fj' && A > L) { const t = L; L = A; A = t; }
    return { name: e.name, role: e.role, mat: e.mat, L: L, A: A, T: T, elId: e.id, note: e.partNote || '' };
  }

  function groupParts(parts) {
    const map = new Map();
    parts.forEach(function (p, idx) {
      const key = [p.mat, p.L, p.A, p.T, p.name].join('|');
      if (!map.has(key)) map.set(key, { name: p.name, role: p.role, mat: p.mat, L: p.L, A: p.A, T: p.T, qty: 0, first: idx, notes: new Set() });
      const g = map.get(key);
      g.qty += 1;
      if (p.note) g.notes.add(p.note);
    });
    const rows = Array.from(map.values());
    rows.sort(function (a, b) { return (MAT_ORDER[a.mat] - MAT_ORDER[b.mat]) || (a.first - b.first); });
    rows.forEach(function (r, i) {
      r.no = i + 1;
      if (r.mat === 'fj' && r.A < MIN_CUT_WIDTH_FLAG) r.notes.add('Consultar ancho mínimo de corte');
      r.notes = Array.from(r.notes);
    });
    return rows;
  }

  // Taco strips: n tacos × (80 + kerf) per strip, strip length ≤ 1200.
  function tacoStrips(nTacos) {
    if (!nTacos) return [];
    const perStrip = Math.floor(TACO_STRIP_MAX / (TACO.L + KERF));
    const nStrips = Math.ceil(nTacos / perStrip);
    const out = [];
    let left = nTacos;
    for (let i = 0; i < nStrips; i++) {
      const k = Math.ceil(left / (nStrips - i));
      out.push({ tacos: k, L: k * (TACO.L + KERF), A: TACO.A, T: TACO.T });
      left -= k;
    }
    return out;
  }

  // ---------- nesting ----------
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function boardSpec(typeId) {
    const it = Catalog.byId[typeId];
    const isFJ = it.kind === 'board';
    const te = isFJ ? FJ_TRIM_END : PLY_TRIM;
    const tg = isFJ ? FJ_TRIM_EDGE : PLY_TRIM;
    return { typeId: typeId, L: it.dims.L, W: it.dims.W, trimEnd: te, trimEdge: tg, uL: it.dims.L - 2 * te, uW: it.dims.W - 2 * tg, priceCents: it.priceCents };
  }

  function newBoard(spec) {
    return { typeId: spec.typeId, spec: spec, strips: [], usedW: 0, placements: [] };
  }

  // rotate: false | true (as-is first) | 'first' (rotated orientation wins ties)
  function orientations(item, rotate) {
    const o = [{ l: item.L, w: item.A, rot: false }];
    if (rotate && item.L !== item.A) {
      const r = { l: item.A, w: item.L, rot: true };
      if (rotate === 'first') o.unshift(r); else o.push(r);
    }
    return o;
  }

  // Best placement of `item` on `board` → { score, prio, apply } or null.
  function bestOnBoard(board, item, rotate) {
    const sp = board.spec;
    let best = null;
    function consider(score, prio, apply) {
      if (!best || score < best.score || (score === best.score && prio < best.prio)) best = { score: score, prio: prio, apply: apply };
    }
    orientations(item, rotate).forEach(function (o) {
      board.strips.forEach(function (s) {
        // stage 3: sub-strip beside a narrower part in an existing segment
        s.segs.forEach(function (g) {
          const off = g.usedW + KERF;
          if (o.l <= g.len && off + o.w <= s.w) {
            consider((g.len - o.l) * o.w, 0, function () {
              g.usedW = off + o.w;
              board.placements.push({ item: item, x: sp.trimEnd + g.x, y: sp.trimEdge + s.y + off, l: o.l, w: o.w, rot: o.rot });
            });
          }
        });
        // stage 2: new crosscut segment in an existing strip
        const x = s.usedL > 0 ? s.usedL + KERF : 0;
        if (o.w <= s.w && x + o.l <= sp.uL) {
          consider((s.w - o.w) * o.l, 1, function () {
            s.segs.push({ x: x, len: o.l, usedW: o.w });
            s.usedL = x + o.l;
            board.placements.push({ item: item, x: sp.trimEnd + x, y: sp.trimEdge + s.y, l: o.l, w: o.w, rot: o.rot });
          });
        }
      });
      // stage 1: new rip strip
      const y = board.usedW > 0 ? board.usedW + KERF : 0;
      if (y + o.w <= sp.uW && o.l <= sp.uL) {
        consider(0, 2, function () {
          const s = { y: y, w: o.w, usedL: o.l, segs: [{ x: 0, len: o.l, usedW: o.w }] };
          board.strips.push(s);
          board.usedW = y + o.w;
          board.placements.push({ item: item, x: sp.trimEnd, y: sp.trimEdge + y, l: o.l, w: o.w, rot: o.rot });
        });
      }
    });
    return best;
  }

  // First-fit-best-score across open boards; new boards follow `seq` (last type repeats).
  function pack(items, seq, rotate) {
    const boards = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let best = null;
      boards.forEach(function (b, bi) {
        const c = bestOnBoard(b, item, rotate);
        if (c && (!best || c.score < best.c.score || (c.score === best.c.score && c.prio < best.c.prio))) best = { c: c, bi: bi };
      });
      if (!best) {
        let typeId = seq[Math.min(boards.length, seq.length - 1)];
        let b = newBoard(boardSpec(typeId));
        let c = bestOnBoard(b, item, rotate);
        if (!c) {
          // part does not fit this type: try the other types
          for (const t of new Set(seq)) {
            b = newBoard(boardSpec(t));
            c = bestOnBoard(b, item, rotate);
            if (c) break;
          }
          if (!c) return null;
        }
        boards.push(b);
        c.apply();
      } else {
        best.c.apply();
      }
    }
    return boards;
  }

  function finalizeBoards(boards, downgradeTo) {
    // A 3450 board whose layout fits inside a 2400 usable length is bought as 2400.
    if (downgradeTo) {
      const small = boardSpec(downgradeTo);
      boards.forEach(function (b) {
        if (b.typeId === downgradeTo) return;
        const maxX = Math.max.apply(null, b.placements.map(function (p) { return p.x + p.l; }));
        const maxY = Math.max.apply(null, b.placements.map(function (p) { return p.y + p.w; }));
        if (maxX <= small.trimEnd + small.uL && maxY <= small.trimEdge + small.uW && b.spec.trimEnd === small.trimEnd) {
          b.typeId = downgradeTo; b.spec = small;
        }
      });
    }
    let cost = 0, area = 0, partsArea = 0;
    boards.forEach(function (b) {
      const bArea = b.spec.L * b.spec.W / 1e6;
      const pArea = b.placements.reduce(function (s, p) { return s + p.l * p.w; }, 0) / 1e6;
      b.area = bArea; b.partsArea = pArea; b.util = pArea / bArea;
      cost += b.spec.priceCents; area += bArea; partsArea += pArea;
    });
    return { boards: boards, costCents: cost, area: area, partsArea: partsArea, waste: area - partsArea, util: area ? partsArea / area : 0 };
  }

  // Strip-knapsack board filling (no rotation): for each candidate strip width,
  // choose the lead parts along the board length with a 0/1 knapsack on area,
  // fill the width left beside each lead with sub-strips, then commit the strip
  // with the best area efficiency. Repeat across the board width.
  function bestStrip(w, uL, pool) {
    const cands = pool.filter(function (it) { return it.A <= w && it.L <= uL; });
    const cap = uL + KERF;
    const n = cands.length;
    const dp = new Float64Array(cap + 1);
    const take = new Uint8Array(n * (cap + 1));
    for (let i = 0; i < n; i++) {
      const wt = cands[i].L + KERF, v = cands[i].L * cands[i].A, row = i * (cap + 1);
      for (let c = cap; c >= wt; c--) {
        const nv = dp[c - wt] + v;
        if (nv > dp[c] + 1e-9) { dp[c] = nv; take[row + c] = 1; }
      }
    }
    let c = 0;
    for (let k = 1; k <= cap; k++) if (dp[k] > dp[c]) c = k;
    const leads = [];
    for (let i = n - 1; i >= 0; i--) {
      if (take[i * (cap + 1) + c]) { leads.push(cands[i]); c -= cands[i].L + KERF; }
    }
    leads.sort(function (a, b) { return b.L - a.L; });
    const used = new Set(leads);
    const segs = leads.map(function (ld) { return { lead: ld, subs: [] }; });
    let value = leads.reduce(function (s, it) { return s + it.L * it.A; }, 0);
    const rest = pool.filter(function (it) { return !used.has(it); }).sort(function (a, b) { return b.L * b.A - a.L * a.A; });
    segs.forEach(function (sg) {
      let off = sg.lead.A;
      rest.forEach(function (it) {
        if (used.has(it)) return;
        if (it.L <= sg.lead.L && off + KERF + it.A <= w) {
          sg.subs.push({ item: it, off: off + KERF });
          off += KERF + it.A;
          used.add(it);
          value += it.L * it.A;
        }
      });
    });
    return { w: w, segs: segs, used: used, value: value };
  }

  function fillBoardKS(spec, pool) {
    const board = newBoard(spec);
    for (;;) {
      const y = board.usedW > 0 ? board.usedW + KERF : 0;
      const room = spec.uW - y;
      const widths = Array.from(new Set(pool.filter(function (it) { return it.A <= room && it.L <= spec.uL; }).map(function (it) { return it.A; })));
      if (!widths.length) break;
      let best = null;
      widths.forEach(function (w) {
        const s = bestStrip(w, spec.uL, pool);
        s.eff = s.value / ((w + KERF) * spec.uL);
        if (s.segs.length && (!best || s.eff > best.eff + 1e-12 || (Math.abs(s.eff - best.eff) < 1e-12 && s.value > best.value))) best = s;
      });
      if (!best) break;
      const strip = { y: y, w: best.w, usedL: 0, segs: [] };
      let x = 0;
      best.segs.forEach(function (sg) {
        board.placements.push({ item: sg.lead, x: spec.trimEnd + x, y: spec.trimEdge + y, l: sg.lead.L, w: sg.lead.A, rot: false });
        let usedW = sg.lead.A;
        sg.subs.forEach(function (sb) {
          board.placements.push({ item: sb.item, x: spec.trimEnd + x, y: spec.trimEdge + y + sb.off, l: sb.item.L, w: sb.item.A, rot: false });
          usedW = sb.off + sb.item.A;
        });
        strip.segs.push({ x: x, len: sg.lead.L, usedW: usedW });
        strip.usedL = x + sg.lead.L;
        x += sg.lead.L + KERF;
      });
      board.strips.push(strip);
      board.usedW = y + best.w;
      for (let i = pool.length - 1; i >= 0; i--) if (best.used.has(pool[i])) pool.splice(i, 1);
    }
    return board;
  }

  // seq: board types in order (last repeats) or 'adaptive' (per board, lowest price per m² of parts).
  function packKS(items, seq) {
    const pool = items.slice();
    const boards = [];
    while (pool.length) {
      let board;
      if (seq === 'adaptive') {
        let best = null;
        ['fj3450', 'fj2400'].forEach(function (t) {
          const trial = pool.slice();
          const b = fillBoardKS(boardSpec(t), trial);
          if (!b.placements.length) return;
          const area = b.placements.reduce(function (s, p) { return s + p.l * p.w; }, 0);
          const score = b.spec.priceCents / area;
          if (!best || score < best.score) best = { score: score, type: t };
        });
        if (!best) return null;
        board = fillBoardKS(boardSpec(best.type), pool);
      } else {
        board = fillBoardKS(boardSpec(seq[Math.min(boards.length, seq.length - 1)]), pool);
        if (!board.placements.length) {
          const other = seq.filter(function (t) { return t !== board.typeId; })[0];
          if (!other) return null;
          board = fillBoardKS(boardSpec(other), pool);
          if (!board.placements.length) return null;
        }
      }
      boards.push(board);
    }
    return boards;
  }

  function sortVariants(items, rng, nRandom) {
    const variants = [];
    const by = function (f) { return items.slice().sort(f); };
    variants.push(by(function (a, b) { return b.A - a.A || b.L - a.L; }));
    variants.push(by(function (a, b) { return b.L - a.L || b.A - a.A; }));
    variants.push(by(function (a, b) { return b.L * b.A - a.L * a.A; }));
    variants.push(by(function (a, b) { return Math.max(b.L, b.A) - Math.max(a.L, a.A) || b.A - a.A; }));
    for (let k = 0; k < nRandom; k++) {
      // noisy width-then-length ordering keeps strips coherent while exploring
      const keyed = items.map(function (it) { return { it: it, k: it.A * (0.85 + 0.3 * rng()) + it.L * 0.02 * rng() }; });
      keyed.sort(function (a, b) { return b.k - a.k; });
      variants.push(keyed.map(function (x) { return x.it; }));
    }
    return variants;
  }

  function countTypes(boards) {
    const c = {};
    boards.forEach(function (b) { c[b.typeId] = (c[b.typeId] || 0) + 1; });
    return c;
  }

  // Finger joint: try n × fj3450 + rest fj2400, several orders; min cost, then min waste.
  function optimizeFJ(items) {
    if (!items.length) return null;
    const rng = mulberry32(20260927);
    const variants = sortVariants(items, rng, 120);
    const all3450 = pack(variants[0], ['fj3450'], false);
    const N = all3450 ? all3450.length + 1 : items.length;
    let best = null;
    const combos = new Map();
    function consider(boards, strategy) {
      if (!boards) return;
      const res = finalizeBoards(boards, 'fj2400');
      res.types = countTypes(res.boards);
      res.strategy = strategy;
      const key = (res.types.fj3450 || 0) + 'x3450+' + (res.types.fj2400 || 0) + 'x2400';
      const prev = combos.get(key);
      if (!prev || res.waste < prev.waste - 1e-9) combos.set(key, { n3450: res.types.fj3450 || 0, n2400: res.types.fj2400 || 0, costCents: res.costCents, waste: res.waste, util: res.util });
      if (!best || res.costCents < best.costCents || (res.costCents === best.costCents && res.waste < best.waste - 1e-9)) best = res;
    }
    for (let n = 0; n <= N; n++) {
      const seq = [];
      for (let i = 0; i < n; i++) seq.push('fj3450');
      seq.push('fj2400');
      variants.forEach(function (order) { consider(pack(order, seq, false), 'greedy'); });
      consider(packKS(items, seq), 'knapsack');
    }
    consider(packKS(items, 'adaptive'), 'knapsack');
    best.boards.sort(function (a, b) { return b.spec.L - a.spec.L; });
    best.alternatives = Array.from(combos.values()).sort(function (a, b) { return a.costCents - b.costCents || a.waste - b.waste; });
    return best;
  }

  function nestSheets(items, typeId) {
    if (!items.length) return null;
    const rng = mulberry32(4242);
    const variants = sortVariants(items, rng, 40);
    let best = null;
    variants.forEach(function (order) {
      [true, 'first'].forEach(function (rot) {
        const boards = pack(order, [typeId], rot);
        if (!boards) return;
        const res = finalizeBoards(boards, null);
        if (!best || res.boards.length < best.boards.length || (res.boards.length === best.boards.length && res.waste < best.waste)) best = res;
      });
    });
    best.types = countTypes(best.boards);
    return best;
  }

  // ---------- finish ----------
  function finishCalc(elements, coats) {
    const groups = {
      front: { label: 'Puertas y frentes de cajón', faces: 2, coats: coats.front, area: 0 },
      carcass: { label: 'Paneles de carcasa (laterales, techo, piso, divisores, estantes, zócalo frontal)', faces: 2, coats: coats.carcass, area: 0 },
      inner: { label: 'Cajones, barras, tacos y listones', faces: 2, coats: coats.inner, area: 0 }
    };
    elements.forEach(function (e) {
      if (!e.finish || !groups[e.finish]) return;
      const p = toPart(e);
      groups[e.finish].area += p.L * p.A / 1e6;
    });
    let paintArea = 0;
    Object.keys(groups).forEach(function (k) {
      const g = groups[k];
      g.paintArea = g.area * g.faces * g.coats;
      paintArea += g.paintArea;
    });
    const withEdges = paintArea * (1 + FINISH_EDGE_EXTRA);
    const litres = withEdges / BONA_M2_PER_L;
    return { groups: groups, paintArea: paintArea, withEdges: withEdges, litres: litres, cans: cheapestCans(litres) };
  }

  function cheapestCans(litres) {
    const c1 = Catalog.byId.bonaSat1, c5 = Catalog.byId.bonaSat5;
    let best = null;
    const max5 = Math.ceil(litres / 5);
    for (let n5 = 0; n5 <= max5; n5++) {
      const n1 = Math.max(0, Math.ceil(litres - 5 * n5 - 1e-9));
      const cost = n5 * c5.priceCents + n1 * c1.priceCents;
      const vol = n5 * 5 + n1;
      if (!best || cost < best.costCents || (cost === best.costCents && vol < best.vol)) best = { n5: n5, n1: n1, costCents: cost, vol: vol };
    }
    return best;
  }

  // ---------- budget ----------
  function line(category, component, itemId, needQty, needText, buyQty, buyText, notes) {
    const it = Catalog.byId[itemId];
    return {
      category: category, component: component, itemId: itemId,
      product: it.name, url: it.url, saleUnit: it.saleUnit,
      needQty: needQty, needText: needText, buyQty: buyQty, buyText: buyText,
      unitCents: it.priceCents, subtotalCents: buyQty * it.priceCents, notes: notes || []
    };
  }
  function notFoundLine(category, component, needText, note) {
    return { category: category, component: component, itemId: null, product: 'No encontrado en Luissi', url: null, saleUnit: '—', needText: needText, buyQty: 0, buyText: '—', unitCents: null, subtotalCents: 0, notFound: true, notes: note ? [note] : [] };
  }
  function plural(n, s, p) { return fmtNum(n, 0) + ' ' + (n === 1 ? s : p); }

  const SCREW_USE = {
    t4x50: 'Tornillos 4 × 50 (uniones pasantes de carcasa y cajones)',
    t4x35: 'Tornillos 4 × 35 (tacos, barras, frentes de cajón, módulos, listones)',
    t35x15: 'Tornillos 3.5 × 15 (bisagras, guías, fondos, patas, corredizo)'
  };

  function aggregate(list) {
    const map = new Map();
    list.forEach(function (h) {
      const key = h.id + '|' + (h.component || '');
      if (!map.has(key)) map.set(key, { id: h.id, component: h.component, qty: 0, reasons: [] });
      const g = map.get(key);
      g.qty += h.qty;
      g.reasons.push(h.reason + ': ' + h.qty);
    });
    return Array.from(map.values());
  }

  function buildBudget(model, nest, finish) {
    const lines = [];
    // Madera
    const fjArea = nest.fj ? nest.fj.partsArea : 0;
    if (nest.fj) {
      ['fj3450', 'fj2400'].forEach(function (t) {
        const n = nest.fj.types[t] || 0;
        if (!n) return;
        const share = nest.fj.boards.filter(function (b) { return b.typeId === t; }).reduce(function (s, b) { return s + b.partsArea; }, 0);
        lines.push(line('Madera', 'Tableros de finger joint (carcasa, puertas, frentes, cajones, barras)', t, share,
          fmtNum(share, 2) + ' m² de piezas', n, plural(n, 'tablero', 'tableros')));
      });
    }
    ['euc3', 'ced4'].forEach(function (t) {
      const r = nest[t];
      if (!r) return;
      const n = r.boards.length;
      const names = Array.from(new Set(r.boards.reduce(function (acc, b) { return acc.concat(b.placements.map(function (p) { return p.item.name; })); }, [])));
      const uses = names.map(function (s) { return s === 'Fondo' ? 'Fondo del mueble' : (s === 'Fondo de cajón' ? 'fondos de cajón' : s); }).join(' + ');
      lines.push(line('Madera', uses, t, r.partsArea, fmtNum(r.partsArea, 2) + ' m² de piezas', n, plural(n, 'tablero', 'tableros')));
    });

    // Herrajes
    const HW_ORDER = { hinge: 0, slide: 1, sliding: 2, rail: 3, pull: 4, leg: 5 };
    aggregate(model.hardware).filter(function (h) { return Catalog.byId[h.id].category === 'Herrajes'; }).sort(function (a, b) {
      return HW_ORDER[Catalog.byId[a.id].kind] - HW_ORDER[Catalog.byId[b.id].kind];
    }).forEach(function (h) {
      const it = Catalog.byId[h.id];
      const notes = [];
      if (it.kind === 'slide') {
        const pairCents = Math.round(h.qty / 2) * it.priceCents;
        notes.push('Luissi no aclara si el precio es por riel o por par; se presupuestan 2 unidades por cajón. Si es por par, restar ' + fmtUSD(pairCents) + '.');
      }
      if (it.outOfStock && it.altId) {
        const alt = Catalog.byId[it.altId];
        const delta = h.qty * (alt.priceCents - it.priceCents);
        notes.push('Sin stock en Luissi al ' + Catalog.SURVEY_DATE + '. Alternativa en stock: ' + alt.name + ' (' + fmtUSD(alt.priceCents) + ' c/u); con esa bisagra el total sube ' + fmtUSD(delta) + '.');
      }
      if (h.id === 'rielU20_2') notes.push('Si la ficha de instalación indica un riel por hoja, agregar otro riel (' + fmtUSD(it.priceCents) + ').');
      if (it.kind === 'pull' && h.id !== 'cubeta') notes.push('La web no aclara si la medida es entre agujeros ni si incluye tornillos.');
      if (it.kind === 'hinge') notes.push('La web no indica si incluye base (placa) y tornillos.');
      const unitWord = it.kind === 'slide' ? ['unidad', 'unidades'] : ['unidad', 'unidades'];
      lines.push(line('Herrajes', h.component || it.name, h.id, h.qty, plural(h.qty, unitWord[0], unitWord[1]), h.qty, plural(h.qty, unitWord[0], unitWord[1]), notes));
    });

    // Accesorios: screws (packs of 100) + glue
    const screws = aggregate(model.screws.map(function (s) { return { id: s.id, qty: s.qty, reason: s.reason, component: '' }; }));
    ['t4x50', 't4x35', 't35x15'].forEach(function (id) {
      const s = screws.filter(function (x) { return x.id === id; })[0];
      if (!s || !s.qty) return;
      const it = Catalog.byId[id];
      const packs = Math.ceil(s.qty / it.pack);
      lines.push(line('Accesorios', SCREW_USE[id], id, s.qty, plural(s.qty, 'tornillo', 'tornillos'), packs, plural(packs, 'caja de 100', 'cajas de 100')));
    });
    aggregate(model.hardware).forEach(function (h) {
      if (h.id !== 'titebond') return;
      lines.push(line('Accesorios', 'Cola para todas las uniones de carcasa', 'titebond', h.qty, plural(h.qty, 'unidad', 'unidades'), h.qty, plural(h.qty, 'unidad', 'unidades')));
    });

    // Acabado
    const cans = finish.cans;
    const need = fmtNum(finish.litres, 2) + ' L (' + fmtNum(finish.withEdges, 1) + ' m² a pintar, 8 m²/L)';
    if (cans.n5) lines.push(line('Acabado', 'Barniz (todas las manos)', 'bonaSat5', finish.litres, need, cans.n5, plural(cans.n5, 'lata de 5 L', 'latas de 5 L'), ['Combinación de latas más barata que cubre los litros (Cálculo propio).']));
    if (cans.n1) lines.push(line('Acabado', 'Barniz (todas las manos)' + (cans.n5 ? ', complemento' : ''), 'bonaSat1', finish.litres, cans.n5 ? 'complemento hasta ' + fmtNum(finish.litres, 2) + ' L' : need, cans.n1, plural(cans.n1, 'lata de 1 L', 'latas de 1 L')));
    aggregate(model.hardware).forEach(function (h) {
      if (h.id !== 'pinceleta') return;
      lines.push(line('Acabado', 'Pinceletas', 'pinceleta', h.qty, plural(h.qty, 'unidad', 'unidades'), h.qty, plural(h.qty, 'unidad', 'unidades')));
    });
    lines.push(notFoundLine('Acabado', 'Lija granos 120 / 180 / 240', 'según superficie', 'Comprar en otro comercio. Sin precio, excluida del total.'));

    const categories = ['Madera', 'Herrajes', 'Accesorios', 'Acabado'].map(function (c) {
      const ls = lines.filter(function (l) { return l.category === c; });
      return { name: c, lines: ls, subtotalCents: ls.reduce(function (s, l) { return s + l.subtotalCents; }, 0) };
    });
    const totalCents = categories.reduce(function (s, c) { return s + c.subtotalCents; }, 0);
    return {
      categories: categories, totalCents: totalCents, fjArea: fjArea,
      totalLine: 'Costo total de materiales: ' + fmtUSD(totalCents) + ' (falta sumar el costo de los cortes).'
    };
  }

  // ---------- capacity ----------
  function boxOverlapVol(a, b) {
    const dx = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
    const dy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
    const dz = Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0);
    return dx > 0 && dy > 0 && dz > 0 ? dx * dy * dz : 0;
  }

  function capacity(model, a) {
    const rodLong = model.rods.filter(function (r) { return r.hanging === 'long'; }).reduce(function (s, r) { return s + (r.x1 - r.x0); }, 0) / 1000;
    const rodShort = model.rods.filter(function (r) { return r.hanging === 'short'; }).reduce(function (s, r) { return s + (r.x1 - r.x0); }, 0) / 1000;
    const shelfRoles = { shelf: 1, maletero: 1, separator: 1 };
    const shelfArea = model.elements.filter(function (e) { return shelfRoles[e.role]; })
      .reduce(function (s, e) { return s + (e.x1 - e.x0) * (e.z1 - e.z0); }, 0) / 1e6;
    const drawerVol = model.drawers.reduce(function (s, d) { return s + (d.box.w - 40) * (d.box.L - 40) * d.box.h; }, 0) / 1e6;
    const solid = { divider: 1, shelf: 1, maletero: 1, separator: 1, cleat: 1 };
    let vol = 0;
    model.interiors.forEach(function (iv) {
      let v = (iv.x1 - iv.x0) * (iv.y1 - iv.y0) * (iv.z1 - iv.z0);
      model.elements.forEach(function (e) { if (solid[e.role]) v -= boxOverlapVol(iv, e); });
      vol += v;
    });
    const cutPieces = a.cortecloud.reduce(function (s, r) { return s + r.qty; }, 0);
    const hwKinds = { hinge: 1, slide: 1, sliding: 1, rail: 1, pull: 1, leg: 1 };
    const hardwareUnits = model.hardware.filter(function (h) { return hwKinds[Catalog.byId[h.id].kind]; }).reduce(function (s, h) { return s + h.qty; }, 0);
    const boards = {};
    ['fj', 'euc3', 'ced4'].forEach(function (k) { if (a.nest[k]) Object.assign(boards, a.nest[k].types); });
    return {
      rodLong: rodLong, rodShort: rodShort, shelfArea: shelfArea, drawerVolL: drawerVol,
      interiorM3: vol / 1e9, cutPieces: cutPieces, homePieces: a.homeCuts.tacos,
      hardwareUnits: hardwareUnits, boards: boards,
      fjUtil: a.nest.fj ? a.nest.fj.util : 0, fjWaste: a.nest.fj ? a.nest.fj.waste : 0,
      plyWaste: ['euc3', 'ced4'].reduce(function (s, k) { return s + (a.nest[k] ? a.nest[k].waste : 0); }, 0)
    };
  }

  // ---------- machining derived from screws ----------
  function screwMachining(model) {
    const tot = {};
    model.screws.forEach(function (s) { tot[s.id] = (tot[s.id] || 0) + s.qty; });
    const out = [];
    if (tot.t4x50) out.push({ op: 'Uniones pasantes 4 × 50: agujero pasante Ø4 mm en la pieza exterior + avellanado, y guía Ø3 mm en el canto que recibe', qty: tot.t4x50, unit: 'agujeros' });
    if (tot.t4x35) out.push({ op: 'Tornillos 4 × 35: agujero guía Ø3 mm (y avellanado donde la cabeza queda vista)', qty: tot.t4x35, unit: 'agujeros' });
    if (tot.t35x15) out.push({ op: 'Tornillos 3.5 × 15 (bisagras, guías, fondos, patas, corredizo): marcar con punzón; guía corta Ø3 mm opcional', qty: tot.t35x15, unit: 'tornillos' });
    return out;
  }

  // ---------- Cortecloud ----------
  const CC_COLUMNS = ['Nº', 'Cant.', 'L', 'A', 'Tablero (Espesor y color)', 'Función de la pieza', 'Girar', 'Tapacanto (Espesor y color)', 'L1', 'L2', 'A1', 'A2'];
  const CC_ROWS_PER_SHEET = 22;

  function cortecloudRows(groupedLuissi) {
    return groupedLuissi.map(function (r) {
      return {
        no: r.no, qty: r.qty, L: r.L, A: r.A, board: MAT_LABEL[r.mat], func: r.name,
        rotate: r.mat === 'fj' ? 'No' : 'Sí', edge: '', L1: '', L2: '', A1: '', A2: '', notes: r.notes
      };
    });
  }
  function csvCell(v) {
    const s = String(v == null ? '' : v);
    return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function cortecloudCSV(rows) {
    const out = [CC_COLUMNS.map(csvCell).join(';')];
    rows.forEach(function (r) {
      out.push([r.no, r.qty, fmtMm(r.L), fmtMm(r.A), r.board, r.func, r.rotate, r.edge, r.L1, r.L2, r.A1, r.A2].map(csvCell).join(';'));
    });
    return '﻿' + out.join('\r\n') + '\r\n';
  }
  function paginate(rows, per) {
    const pages = [];
    for (let i = 0; i < rows.length; i += per) pages.push(rows.slice(i, i + per));
    return pages.length ? pages : [[]];
  }

  // ---------- full analysis ----------
  function analyze(model) {
    const cutEls = model.elements.filter(function (e) { return e.cut; });
    const homeEls = cutEls.filter(function (e) { return e.homeCut; });
    const luissiParts = cutEls.filter(function (e) { return !e.homeCut; }).map(toPart);

    const strips = tacoStrips(homeEls.length);
    strips.forEach(function (s) {
      luissiParts.push({ name: 'Tira para tacos (cortar en casa)', role: 'taco-strip', mat: 'fj', L: s.L, A: s.A, T: s.T, note: 'Rinde ' + s.tacos + ' tacos de 80 × 45 × 20' });
    });

    const grouped = groupParts(luissiParts);
    const rowByKey = new Map();
    grouped.forEach(function (r) { rowByKey.set([r.mat, r.L, r.A, r.T, r.name].join('|'), r); });
    luissiParts.forEach(function (p) { p.row = rowByKey.get([p.mat, p.L, p.A, p.T, p.name].join('|')).no; });

    const byMat = { fj: [], euc3: [], ced4: [] };
    luissiParts.forEach(function (p) { byMat[p.mat].push(p); });
    const nest = {
      fj: optimizeFJ(byMat.fj),
      euc3: nestSheets(byMat.euc3, 'euc3'),
      ced4: nestSheets(byMat.ced4, 'ced4')
    };

    const homeCuts = { tacos: homeEls.length, size: TACO, strips: strips };
    const despiece = grouped.map(function (r) {
      return { no: r.no, name: r.name, qty: r.qty, L: r.L, A: r.A, T: r.T, mat: MAT_LABEL[r.mat], veta: r.mat === 'fj' ? 'A lo largo (no girar)' : 'Indistinta (puede girar)', notes: r.notes.join('; ') };
    });
    if (homeEls.length) despiece.push({ no: '—', name: 'Taco soporte de barra (cortar en casa)', qty: homeEls.length, L: TACO.L, A: TACO.A, T: TACO.T, mat: MAT_LABEL.fj, veta: 'A lo largo (no girar)', notes: 'Se cortan en casa de la "Tira para tacos"; no van en la lista de Luissi' });

    const finish = finishCalc(model.elements, model.coats);
    const budget = buildBudget(model, nest, finish);
    const a = {
      model: model, parts: luissiParts, grouped: grouped, despiece: despiece,
      cortecloud: cortecloudRows(grouped), homeCuts: homeCuts, nest: nest, finish: finish, budget: budget,
      machining: model.machining.concat(screwMachining(model))
    };
    a.capacity = capacity(model, a);
    return a;
  }

  return {
    KERF: KERF, FJ_TRIM_END: FJ_TRIM_END, FJ_TRIM_EDGE: FJ_TRIM_EDGE, PLY_TRIM: PLY_TRIM,
    BONA_M2_PER_L: BONA_M2_PER_L, FINISH_EDGE_EXTRA: FINISH_EDGE_EXTRA, TACO: TACO, DENSITY: DENSITY,
    MAT_LABEL: MAT_LABEL, CC_COLUMNS: CC_COLUMNS, CC_ROWS_PER_SHEET: CC_ROWS_PER_SHEET,
    fmtNum: fmtNum, fmtUSD: fmtUSD, fmtMm: fmtMm,
    hingeCount: hingeCount, hingePositions: hingePositions, evenSpaces: evenSpaces,
    drawerCornerScrews: drawerCornerScrews, rodDeflection: rodDeflection, panelWeightKg: panelWeightKg,
    toPart: toPart, groupParts: groupParts, tacoStrips: tacoStrips,
    pack: pack, optimizeFJ: optimizeFJ, nestSheets: nestSheets, boardSpec: boardSpec,
    finishCalc: finishCalc, cheapestCans: cheapestCans,
    cortecloudCSV: cortecloudCSV, paginate: paginate, boxOverlapVol: boxOverlapVol,
    analyze: analyze
  };
});
