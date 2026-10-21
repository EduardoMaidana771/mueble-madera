/* SVG technical sheets (A4 landscape, units = mm on paper) and cut diagrams.
   Sheet 1: front elevation (doors closed) + front interior (no doors).
   Sheet 2: side sections + top view. Sheet 3: doors with hinge cup positions. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'), require('./catalog.js'));
  else root.RoperoPlans = factory(root.RoperoEngine, root.RoperoCatalog);
})(typeof self !== 'undefined' ? self : this, function (E, Catalog) {
  'use strict';

  const PW = 297, PH = 210, FR = 6;
  const AREA = { x0: 12, x1: 285, y0: 14, y1: 180 };
  const SCALES = [10, 15, 20, 25, 30, 40, 50];
  const DATE = '27/09/2026';
  const mm = E.fmtMm;

  const STYLE = [
    '.fr{fill:none;stroke:#111;stroke-width:.5}',
    '.o{fill:none;stroke:#111;stroke-width:.3}',
    '.t{fill:none;stroke:#111;stroke-width:.15}',
    '.hid{fill:none;stroke:#444;stroke-width:.15;stroke-dasharray:1.2 .8}',
    '.ctr{fill:none;stroke:#666;stroke-width:.12;stroke-dasharray:3 .8 .6 .8}',
    '.wood{fill:#f3e6cf;stroke:#111;stroke-width:.2}',
    '.front{fill:#ecd5ad;stroke:#111;stroke-width:.25}',
    '.cut{fill:#c99b69;stroke:#111;stroke-width:.25}',
    '.ply{fill:#f7efe2;stroke:#111;stroke-width:.15}',
    '.ced{fill:#e3b9a0;stroke:#111;stroke-width:.15}',
    '.box{fill:#faf3e6;stroke:#111;stroke-width:.18}',
    '.rod{fill:#b98a5a;stroke:#111;stroke-width:.2}',
    '.metal{fill:#a7adb3;stroke:#222;stroke-width:.15}',
    '.leg{fill:#222;stroke:#000;stroke-width:.15}',
    '.cup{fill:#fff;stroke:#b3261e;stroke-width:.25;stroke-dasharray:.8 .5}',
    '.cupc{stroke:#b3261e;stroke-width:.15}',
    '.dim{fill:none;stroke:#0b57d0;stroke-width:.14}',
    '.dt{font-family:Arial,Helvetica,sans-serif;font-size:2.1px;fill:#0b57d0}',
    '.lb{font-family:Arial,Helvetica,sans-serif;font-size:2.2px;fill:#111}',
    '.lbs{font-family:Arial,Helvetica,sans-serif;font-size:1.8px;fill:#333}',
    '.vt{font-family:Arial,Helvetica,sans-serif;font-size:3px;font-weight:700;fill:#111;letter-spacing:.2px}',
    '.tb{font-family:Arial,Helvetica,sans-serif;font-size:2.4px;fill:#111}',
    '.tbb{font-family:Arial,Helvetica,sans-serif;font-size:3.4px;font-weight:700;fill:#111}',
    '.tbl{font-family:Arial,Helvetica,sans-serif;font-size:1.7px;fill:#555}',
    '.arw{fill:#0b57d0}',
    '.sec{font-family:Arial,Helvetica,sans-serif;font-size:3px;font-weight:700;fill:#b3261e}',
    '.secl{fill:none;stroke:#b3261e;stroke-width:.3;stroke-dasharray:4 1 1 1}'
  ].join('');

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function n2(v) { return Math.round(v * 100) / 100; }

  function Sheet() { this.p = []; }
  Sheet.prototype.add = function (s) { this.p.push(s); return this; };
  Sheet.prototype.rect = function (x, y, w, h, cls) {
    if (w < 0) { x += w; w = -w; }
    if (h < 0) { y += h; h = -h; }
    return this.add('<rect x="' + n2(x) + '" y="' + n2(y) + '" width="' + n2(Math.max(w, 0.05)) + '" height="' + n2(Math.max(h, 0.05)) + '" class="' + cls + '"/>');
  };
  Sheet.prototype.line = function (x1, y1, x2, y2, cls) {
    return this.add('<line x1="' + n2(x1) + '" y1="' + n2(y1) + '" x2="' + n2(x2) + '" y2="' + n2(y2) + '" class="' + cls + '"/>');
  };
  Sheet.prototype.text = function (x, y, s, cls, anchor, rot) {
    const tr = rot ? ' transform="rotate(' + rot + ' ' + n2(x) + ' ' + n2(y) + ')"' : '';
    return this.add('<text x="' + n2(x) + '" y="' + n2(y) + '" class="' + cls + '" text-anchor="' + (anchor || 'start') + '"' + tr + '>' + esc(s) + '</text>');
  };
  Sheet.prototype.circle = function (cx, cy, r, cls) {
    return this.add('<circle cx="' + n2(cx) + '" cy="' + n2(cy) + '" r="' + n2(r) + '" class="' + cls + '"/>');
  };
  Sheet.prototype.path = function (d, cls) { return this.add('<path d="' + d + '" class="' + cls + '"/>'); };

  function textW(s, size) { return String(s).length * size * 0.55; }

  // Horizontal dimension between X1 and X2; object at Yo, dimension line at Yd.
  Sheet.prototype.dimH = function (X1, X2, Yo, Yd, label) {
    if (Math.abs(X2 - X1) < 0.05) return this;
    const s = Yd < Yo ? -1 : 1;
    if (Yo !== null && Math.abs(Yd - Yo) > 0.5) {
      this.line(X1, Yo + s * 0.6, X1, Yd + s * 1, 'dim');
      this.line(X2, Yo + s * 0.6, X2, Yd + s * 1, 'dim');
    }
    this.line(X1, Yd, X2, Yd, 'dim');
    [X1, X2].forEach(function (X) { this.line(X - 0.7, Yd + 0.7, X + 0.7, Yd - 0.7, 'dim'); }, this);
    if (!label) return this;
    const tw = textW(label, 2.1);
    const mid = (X1 + X2) / 2;
    const tx = tw + 1 < Math.abs(X2 - X1) ? mid : Math.max(X1, X2) + tw / 2 + 1;
    return this.text(tx, Yd - 0.7, label, 'dt', 'middle');
  };
  // Vertical dimension between Y1 and Y2; object at Xo, dimension line at Xd.
  Sheet.prototype.dimV = function (Y1, Y2, Xo, Xd, label) {
    if (Math.abs(Y2 - Y1) < 0.05) return this;
    const s = Xd < Xo ? -1 : 1;
    if (Xo !== null && Math.abs(Xd - Xo) > 0.5) {
      this.line(Xo + s * 0.6, Y1, Xd + s * 1, Y1, 'dim');
      this.line(Xo + s * 0.6, Y2, Xd + s * 1, Y2, 'dim');
    }
    this.line(Xd, Y1, Xd, Y2, 'dim');
    [Y1, Y2].forEach(function (Y) { this.line(Xd - 0.7, Y + 0.7, Xd + 0.7, Y - 0.7, 'dim'); }, this);
    if (!label) return this;
    const tw = textW(label, 2.1);
    const mid = (Y1 + Y2) / 2;
    const ty = tw + 1 < Math.abs(Y2 - Y1) ? mid : Math.min(Y1, Y2) - tw / 2 - 1;
    return this.text(Xd - 0.7, ty, label, 'dt', 'middle', -90);
  };
  Sheet.prototype.arrow = function (x, y, dir) {
    const d = dir > 0 ? 1 : -1;
    return this.path('M' + n2(x) + ' ' + n2(y) + 'l' + n2(-2 * d) + ' -1v2z', 'arw');
  };

  function view(ox, oy, s, mode) {
    const k = 1 / s;
    if (mode === 'top') return { k: k, s: s, X: function (x) { return ox + x * k; }, Y: function (z) { return oy + z * k; } };
    return { k: k, s: s, X: function (u) { return ox + u * k; }, Y: function (v) { return oy - v * k; } };
  }

  function titleBlock(sh, m, title, scale, n, N) {
    const w = 124, h = 25, x = PW - FR - w, y = PH - FR - h;
    sh.rect(x, y, w, h, 'o');
    sh.line(x, y + 8, x + w, y + 8, 't');
    sh.line(x, y + 16.5, x + w, y + 16.5, 't');
    sh.line(x + 62, y + 8, x + 62, y + h, 't');
    sh.line(x + 93, y + 16.5, x + 93, y + h, 't');
    sh.text(x + 2, y + 5.6, m.fullName, 'tbb');
    sh.text(x + w - 2, y + 5.6, 'Lámina ' + n + ' / ' + N, 'tb', 'end');
    sh.text(x + 2, y + 10.4, 'LÁMINA', 'tbl'); sh.text(x + 2, y + 14.6, title, 'tb');
    sh.text(x + 64, y + 10.4, 'MATERIALES', 'tbl'); sh.text(x + 64, y + 14.6, 'Materiales: Barraca Luissi', 'tb');
    sh.text(x + 2, y + 19, 'ESCALA', 'tbl'); sh.text(x + 2, y + 23.2, '1:' + scale + '   ·   Cotas en mm', 'tb');
    sh.text(x + 64, y + 19, 'FECHA', 'tbl'); sh.text(x + 64, y + 23.2, DATE, 'tb');
    sh.text(x + 95, y + 19, 'DIMENSIONES', 'tbl'); sh.text(x + 95, y + 23.2, m.W + '×' + m.H + '×' + m.Dc, 'tb');
  }

  function openSheet() {
    const sh = new Sheet();
    sh.add('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + PW + ' ' + PH + '" class="plan-sheet" font-family="Arial, Helvetica, sans-serif">');
    sh.add('<style>' + STYLE + '</style>');
    sh.add('<rect x="0" y="0" width="' + PW + '" height="' + PH + '" fill="#fff"/>');
    sh.rect(FR, FR, PW - 2 * FR, PH - 2 * FR, 'fr');
    return sh;
  }
  function closeSheet(sh) { sh.add('</svg>'); return sh.p.join(''); }

  // Largest drawing (smallest scale divisor) such that all slots fit.
  function pickScale(slots, availW, availH) {
    for (let i = 0; i < SCALES.length; i++) {
      const s = SCALES[i];
      const w = slots.reduce(function (acc, sl) { return acc + sl.w / s + sl.mx; }, 0);
      const h = Math.max.apply(null, slots.map(function (sl) { return sl.h / s + sl.my; }));
      if (w <= availW && h <= availH) return s;
    }
    return SCALES[SCALES.length - 1];
  }

  const FILL = {
    side: 'wood', top: 'wood', bottom: 'wood', divider: 'wood', shelf: 'wood', maletero: 'wood', separator: 'wood',
    'kick-front': 'wood', 'kick-rear': 'wood', rod: 'rod', taco: 'rod', cleat: 'rod', door: 'front', 'drawer-front': 'front',
    'box-side': 'box', 'box-end': 'box', 'box-bottom': 'ply', slide: 'metal', rail: 'metal', pull: 'metal', leg: 'leg'
  };
  function backClass(m) { return m.backMat === 'ced4' ? 'ced' : 'ply'; }

  function hingeMarks(sh, v, d) {
    // Opening triangle: from the opening-side corners to the middle of the hinge side.
    const hx = d.hinge === 'left' ? d.x0 : d.x1;
    const ox = d.hinge === 'left' ? d.x1 : d.x0;
    const ym = (d.y0 + d.y1) / 2;
    sh.line(v.X(ox), v.Y(d.y0), v.X(hx), v.Y(ym), 'hid');
    sh.line(v.X(ox), v.Y(d.y1), v.X(hx), v.Y(ym), 'hid');
    d.hingePos.forEach(function (p) {
      const Y = v.Y(d.y0 + p);
      const X = v.X(hx);
      sh.line(X - 0.9, Y, X + 0.9, Y, 'o');
    });
  }

  // ---------- Sheet 1: front views ----------
  function frontClosed(sh, m, v) {
    const W = m.W, H = m.H;
    sh.rect(v.X(0), v.Y(H), W * v.k, (H - m.K) * v.k, 'wood');
    m.elements.filter(function (e) { return e.role === 'kick-front' || e.role === 'leg' || e.role === 'rail'; }).forEach(function (e) {
      sh.rect(v.X(e.x0), v.Y(e.y1), (e.x1 - e.x0) * v.k, (e.y1 - e.y0) * v.k, FILL[e.role]);
    });
    if (m.id === 'M3') {
      // open frame: sides, top and bottom visible around the inset sliding doors
      sh.rect(v.X(20), v.Y(H - 20), (W - 40) * v.k, (H - 120) * v.k, 'box');
    }
    const doors = m.doors.slice().sort(function (a, b) { return (a.track === 'delantero') - (b.track === 'delantero'); });
    doors.forEach(function (d) {
      sh.rect(v.X(d.x0), v.Y(d.y1), d.w * v.k, d.h * v.k, 'front');
      if (d.type === 'hinged') hingeMarks(sh, v, d);
      const rot = d.h > d.w ? -90 : 0;
      sh.text(v.X((d.x0 + d.x1) / 2) + (rot ? 0.8 : 0), v.Y((d.y0 + d.y1) / 2) + (rot ? 0 : 0.8), mm(d.w) + ' × ' + mm(d.h), 'lb', 'middle', rot);
      const p = d.pull;
      const px = d.x0 + p.cx, py = d.y0 + p.cy;
      const pw = p.id === 'cubeta' ? 34 : 12;
      sh.rect(v.X(px - pw / 2), v.Y(py + p.len / 2), pw * v.k, p.len * v.k, 'metal');
    });
    if (m.id === 'M3') {
      const y = v.Y(1500);
      m.doors.forEach(function (d) {
        const cx = v.X((d.x0 + d.x1) / 2);
        sh.line(cx - 6, y, cx + 6, y, 'dim');
        sh.arrow(cx + 6, y, 1); sh.arrow(cx - 6, y, -1);
        sh.text(cx, y - 1.2, 'Riel ' + d.track, 'lbs', 'middle');
      });
    }
    m.drawers.forEach(function (d) {
      const f = d.front;
      sh.rect(v.X(f.x0), v.Y(f.y1), f.w * v.k, f.h * v.k, 'front');
      const len = d.pull.len;
      const cx = (f.x0 + f.x1) / 2, cy = (f.y0 + f.y1) / 2;
      sh.rect(v.X(cx - len / 2), v.Y(cy + 6), len * v.k, 12 * v.k, 'metal');
      sh.text(v.X(cx), v.Y(cy) + 2.6, mm(f.w) + ' × ' + mm(f.h), 'lbs', 'middle');
    });
    // dimensions
    const yb = v.Y(0);
    sh.dimH(v.X(0), v.X(W), yb, yb + 7, mm(W));
    sh.dimV(v.Y(0), v.Y(H), v.X(0), v.X(0) - 7, mm(H));
    sh.dimV(v.Y(0), v.Y(m.K), v.X(W), v.X(W) + 4, mm(m.K));
    sh.dimV(v.Y(m.K), v.Y(H), v.X(W), v.X(W) + 4, mm(H - m.K));
    // module / bay widths along the top
    const yt = v.Y(H);
    if (m.modules.length > 1) m.modules.forEach(function (md) { sh.dimH(v.X(md.x0), v.X(md.x1), yt, yt - 9, mm(md.x1 - md.x0) + ' (' + md.label + ')'); });
    const xs = [0];
    m.bays.forEach(function (b) { xs.push(b.x0, b.x1); });
    xs.push(W);
    for (let i = 0; i < xs.length - 1; i++) {
      const wd = xs[i + 1] - xs[i];
      sh.dimH(v.X(xs[i]), v.X(xs[i + 1]), yt, yt - 4, wd >= 30 ? mm(wd) : '');
    }
  }

  function frontInterior(sh, m, v, sections) {
    const W = m.W, H = m.H;
    m.elements.filter(function (e) { return e.role === 'back'; }).forEach(function (e) {
      sh.rect(v.X(e.x0), v.Y(e.y1), (e.x1 - e.x0) * v.k, (e.y1 - e.y0) * v.k, backClass(m));
    });
    const skip = { back: 1, door: 1, 'drawer-front': 1, pull: 1, 'kick-rear': 1, 'box-side': 1, 'box-end': 1, 'box-bottom': 1 };
    const els = m.elements.filter(function (e) { return !skip[e.role]; }).sort(function (a, b) { return a.z1 - b.z1; });
    els.forEach(function (e) {
      sh.rect(v.X(e.x0), v.Y(e.y1), (e.x1 - e.x0) * v.k, (e.y1 - e.y0) * v.k, FILL[e.role] || 'wood');
    });
    m.drawers.forEach(function (d) {
      const b = d.box;
      sh.rect(v.X(b.x0), v.Y(b.y1), b.w * v.k, (b.y1 - b.y0) * v.k, 'box');
      sh.text(v.X((b.x0 + b.x1) / 2), v.Y((b.y0 + b.y1) / 2) + 0.7, 'Caja ' + b.w + ' × ' + b.h + ' × ' + b.L, 'lbs', 'middle');
    });
    m.rods.forEach(function (r) {
      sh.text(v.X(r.x0) + 1, v.Y(r.yTop) - 0.8, 'Barra · sup. ' + mm(r.yTop), 'lbs');
    });
    // clear heights per bay (floor → members → top)
    m.bays.forEach(function (b) {
      const hs = m.elements.filter(function (e) {
        return (e.role === 'bottom' || e.role === 'top' || e.role === 'shelf' || e.role === 'maletero' || e.role === 'separator') && e.x0 <= b.x0 + 0.1 && e.x1 >= b.x1 - 0.1;
      }).map(function (e) { return { y0: e.y0, y1: e.y1 }; });
      m.rods.filter(function (r) { return r.x0 >= b.x0 - 0.1 && r.x1 <= b.x1 + 0.1; }).forEach(function (r) { hs.push({ y0: r.y0, y1: r.yTop }); });
      hs.sort(function (p, q) { return p.y0 - q.y0; });
      const X = v.X(b.x1) - 2.2;
      for (let i = 0; i < hs.length - 1; i++) {
        const a = hs[i].y1, c = hs[i + 1].y0;
        if (c - a > 5) sh.dimV(v.Y(a), v.Y(c), null, X, mm(c - a));
      }
      sh.text(v.X((b.x0 + b.x1) / 2), v.Y(H) - 1.5, b.label, 'lbs', 'middle');
    });
    // section markers
    (sections || []).forEach(function (s) {
      const X = v.X(s.x);
      sh.line(X, v.Y(H) - 10, X, v.Y(H) - 4.5, 'secl');
      sh.line(X, v.Y(0) + 10, X, v.Y(0) + 15, 'secl');
      sh.text(X + 1, v.Y(H) - 8, s.id, 'sec');
      sh.text(X + 1, v.Y(0) + 15, s.id, 'sec');
    });
    sh.dimH(v.X(0), v.X(W), v.Y(0), v.Y(0) + 7, mm(W));
    sh.dimV(v.Y(0), v.Y(H), v.X(0), v.X(0) - 7, mm(H));
  }

  function sections(m) {
    const out = [];
    const rod = m.rods.filter(function (r) { return r.hanging === 'long'; })[0] || m.rods[0];
    const bayA = m.bays.filter(function (b) { return rod.x0 >= b.x0 - 0.1 && rod.x1 <= b.x1 + 0.1; })[0];
    out.push({ id: 'A', x: (bayA.x0 + bayA.x1) / 2, bay: bayA, title: 'Corte A-A · ' + bayA.label });
    const withDrawers = m.bays.filter(function (b) { return b !== bayA && m.drawers.some(function (d) { return d.bay.x0 === b.x0; }); })[0];
    const withShelves = m.bays.filter(function (b) { return b !== bayA && m.elements.some(function (e) { return e.role === 'shelf' && e.x0 <= b.x0 + 0.1 && e.x1 >= b.x1 - 0.1; }); })[0];
    const bayB = withDrawers || withShelves;
    if (bayB) out.push({ id: 'B', x: (bayB.x0 + bayB.x1) / 2, bay: bayB, title: 'Corte B-B · ' + bayB.label });
    return out;
  }

  function sheetFront(m) {
    const sh = openSheet();
    const slotW = (AREA.x1 - AREA.x0 - 10) / 2;
    const s = pickScale([{ w: m.W, h: m.H, mx: 30, my: 34 }], slotW, AREA.y1 - AREA.y0);
    const secs = sections(m);
    [0, 1].forEach(function (i) {
      const sx0 = AREA.x0 + i * (slotW + 10);
      const dw = m.W / s, dh = m.H / s;
      const ox = sx0 + (slotW - dw) / 2 + 3;
      const oy = AREA.y0 + 16 + dh;
      const v = view(ox, oy, s);
      sh.text(sx0 + slotW / 2, AREA.y0 + 2, i === 0 ? 'VISTA FRONTAL — PUERTAS CERRADAS' : 'VISTA FRONTAL INTERIOR — SIN PUERTAS', 'vt', 'middle');
      if (i === 0) frontClosed(sh, m, v); else frontInterior(sh, m, v, secs);
    });
    sh.text(AREA.x0, PH - FR - 20, 'Líneas de trazos en las puertas: el vértice indica el lado de las bisagras; las marcas en el canto, la posición de cada bisagra.', 'lbs');
    sh.text(AREA.x0, PH - FR - 17, 'Frentes con luz de 1,5 mm en los bordes exteriores y 3 mm entre frentes vecinos. Alturas libres interiores en azul.', 'lbs');
    titleBlock(sh, m, 'Vistas frontales', s, 1, 3);
    return closeSheet(sh);
  }

  // ---------- Sheet 2: side sections + top view ----------
  function sideSection(sh, m, v, sec) {
    const H = m.H, Dc = m.Dc;
    const frontZ = m.doors.some(function (d) { return d.type === 'hinged'; }) ? Dc + 22 : Dc;
    sh.rect(v.X(0), v.Y(H), Dc * v.k, H * v.k, 't');
    const cut = m.elements.filter(function (e) { return e.role !== 'pull' && e.role !== 'slide' && e.x0 < sec.x && e.x1 > sec.x; })
      .sort(function (a, b) { return (a.role === 'back') - (b.role === 'back'); });
    cut.forEach(function (e) {
      let cls = 'cut';
      if (e.role === 'back') cls = backClass(m);
      else if (e.role === 'box-bottom') cls = 'ply';
      else if (e.role === 'door' || e.role === 'drawer-front') cls = 'front';
      else if (e.role === 'rail') cls = 'metal';
      else if (e.role === 'leg') cls = 'leg';
      sh.rect(v.X(e.z0), v.Y(e.y1), (e.z1 - e.z0) * v.k, (e.y1 - e.y0) * v.k, cls);
    });
    // tacos of this bay (beyond the cut), dashed
    m.elements.filter(function (e) { return e.role === 'taco' && e.x0 >= sec.bay.x0 - 0.1 && e.x1 <= sec.bay.x1 + 0.1; }).forEach(function (e) {
      sh.rect(v.X(e.z0), v.Y(e.y1), (e.z1 - e.z0) * v.k, (e.y1 - e.y0) * v.k, 'hid');
    });
    // dimensions
    const yb = v.Y(0);
    sh.dimH(v.X(0), v.X(Dc), yb, yb + 5, mm(Dc));
    sh.dimH(v.X(-m.tb), v.X(frontZ), yb, yb + 10, mm(frontZ + m.tb) + ' total');
    sh.dimV(v.Y(0), v.Y(H), v.X(0), v.X(-m.tb) - 5, mm(H));
    // heights of horizontal members (top faces) on the far left
    const tops = cut.filter(function (e) { return (e.role === 'shelf' || e.role === 'maletero' || e.role === 'separator' || e.role === 'bottom') && e.z0 === 0; })
      .map(function (e) { return e.y1; });
    const rods = cut.filter(function (e) { return e.role === 'rod'; });
    rods.forEach(function (r) { tops.push(r.y1); });
    // ordinate heights from the floor (top faces of horizontal members and rods)
    tops.sort(function (a, b) { return a - b; });
    const Xc = v.X(-m.tb) - 10;
    sh.line(Xc, v.Y(0), Xc, v.Y(H), 'dim');
    sh.text(Xc - 0.8, v.Y(0) + 0.8, '0', 'dt', 'end');
    let lastY = v.Y(0);
    tops.forEach(function (t) {
      const Y = v.Y(t);
      sh.line(Xc - 0.8, Y, Xc + 1.2, Y, 'dim');
      const ty = Math.min(Y + 0.8, lastY - 2.3);
      sh.text(Xc - 0.8, ty, mm(t), 'dt', 'end');
      lastY = ty;
    });
    // callouts
    const topEl = cut.filter(function (e) { return e.role === 'top'; })[0];
    if (topEl) sh.dimV(v.Y(topEl.y0), v.Y(topEl.y1), null, v.X(Dc * 0.3), '20');
    rods.forEach(function (r) {
      const zc = (r.z0 + r.z1) / 2;
      sh.dimH(v.X(0), v.X(zc), null, v.Y(r.y0) + 3, mm(zc));
      sh.text(v.X(r.z1) + 1, v.Y(r.y1) - 0.8, 'Barra 20 × 45', 'lbs');
    });
    const lx = v.X(frontZ) + 4;
    sh.text(v.X(-m.tb) + 0.6, v.Y(H) + 5, 'Fondo ' + m.tb + ' mm', 'lbs');
    const door = cut.filter(function (e) { return e.role === 'door'; })[0];
    if (door) {
      sh.dimH(v.X(door.z0), v.X(door.z1), null, v.Y((door.y0 + door.y1) / 2) + 6, '20');
      sh.text(lx, v.Y((door.y0 + door.y1) / 2), 'Puerta 20', 'lbs', 'start', -90);
    }
  }

  function topView(sh, m, v) {
    const W = m.W, Dc = m.Dc;
    m.elements.filter(function (e) { return e.role === 'back'; }).forEach(function (e) {
      sh.rect(v.X(e.x0), v.Y(e.z0), (e.x1 - e.x0) * v.k, (e.z1 - e.z0) * v.k, backClass(m));
    });
    sh.rect(v.X(0), v.Y(0), W * v.k, Dc * v.k, 'wood');
    m.elements.filter(function (e) { return e.role === 'divider' || e.role === 'side'; }).forEach(function (e) {
      sh.rect(v.X(e.x0), v.Y(e.z0), (e.x1 - e.x0) * v.k, (e.z1 - e.z0) * v.k, 'hid');
    });
    m.doors.forEach(function (d) {
      const door = m.elements.filter(function (e) { return e.role === 'door' && e.group === d.id; })[0];
      sh.rect(v.X(d.x0), v.Y(door.z0), d.w * v.k, (door.z1 - door.z0) * v.k, 'front');
      if (d.type === 'hinged') {
        const px = d.hinge === 'left' ? d.x0 : d.x1;
        const pz = door.z1;
        const dir = d.hinge === 'left' ? 1 : -1;
        const R = d.w;
        sh.line(v.X(px), v.Y(pz), v.X(px), v.Y(pz + R), 'hid');
        const sweep = d.hinge === 'left' ? 1 : 0;
        sh.path('M' + n2(v.X(px + dir * R)) + ' ' + n2(v.Y(pz)) + ' A ' + n2(R * v.k) + ' ' + n2(R * v.k) + ' 0 0 ' + sweep + ' ' + n2(v.X(px)) + ' ' + n2(v.Y(pz + R)), 'hid');
        sh.text(v.X(px + dir * R * 0.55), v.Y(pz + R * 0.62), 'R ' + mm(R), 'lbs', 'middle');
      } else {
        const y = v.Y((door.z0 + door.z1) / 2);
        const cx = v.X((d.x0 + d.x1) / 2);
        sh.arrow(cx + 5, y, 1); sh.arrow(cx - 5, y, -1);
      }
    });
    m.elements.filter(function (e) { return e.role === 'rail'; }).forEach(function (e) {
      sh.rect(v.X(e.x0), v.Y(e.z0), (e.x1 - e.x0) * v.k, (e.z1 - e.z0) * v.k, 'hid');
    });
    const frontZ = m.doors.some(function (d) { return d.type === 'hinged'; }) ? Dc + 22 : Dc;
    sh.dimH(v.X(0), v.X(W), v.Y(-m.tb), v.Y(-m.tb) - 5, mm(W));
    sh.dimV(v.Y(0), v.Y(Dc), v.X(W), v.X(W) + 5, mm(Dc));
    sh.dimV(v.Y(-m.tb), v.Y(frontZ), v.X(W), v.X(W) + 10, mm(frontZ + m.tb));
    if (m.id === 'M3') sh.text(v.X(W / 2), v.Y(Dc) + 6, 'Hojas corredizas en la franja delantera de 60 mm (riel U20 bajo el techo)', 'lbs', 'middle');
  }

  function sheetSectionTop(m) {
    const sh = openSheet();
    const secs = sections(m);
    const frontZ = m.doors.some(function (d) { return d.type === 'hinged'; }) ? m.Dc + 22 : m.Dc;
    const depth = frontZ + m.tb;
    const swing = Math.max.apply(null, m.doors.map(function (d) { return d.type === 'hinged' ? d.w : 0; }));
    const slots = secs.map(function () { return { w: depth, h: m.H, mx: 36, my: 34 }; });
    slots.push({ w: m.W, h: depth + swing, mx: 30, my: 34 });
    const s = pickScale(slots, AREA.x1 - AREA.x0, AREA.y1 - AREA.y0);
    const totalW = slots.reduce(function (a, sl) { return a + sl.w / s + sl.mx; }, 0);
    let x = AREA.x0 + (AREA.x1 - AREA.x0 - totalW) / 2;
    secs.forEach(function (sec) {
      const ox = x + 24 + m.tb / s;
      const v = view(ox, AREA.y0 + 16 + m.H / s, s);
      sh.text(x + (depth / s + 36) / 2, AREA.y0 + 2, sec.title.toUpperCase(), 'vt', 'middle');
      sideSection(sh, m, v, sec);
      x += depth / s + 36;
    });
    const vt = view(x + 10, AREA.y0 + 16 + m.tb / s, s, 'top');
    sh.text(x + (m.W / s + 30) / 2, AREA.y0 + 2, 'VISTA SUPERIOR', 'vt', 'middle');
    topView(sh, m, vt);
    sh.text(AREA.x0, PH - FR - 23, 'Cortes vistos desde la izquierda: fondo a la izquierda, frente a la derecha. Piezas cortadas en color; tacos más allá del corte en trazos.', 'lbs');
    sh.text(AREA.x0, PH - FR - 20, 'Escala de alturas junto a cada corte: altura desde el piso de la cara superior de piso, estantes, separadores y barras.', 'lbs');
    sh.text(AREA.x0, PH - FR - 17, 'Vista superior: arcos = giro de puertas (radio = ancho de la hoja); divisores y laterales bajo el techo en trazos.', 'lbs');
    titleBlock(sh, m, 'Cortes laterales y vista superior', s, 2, 3);
    return closeSheet(sh);
  }

  // ---------- Sheet 3: doors ----------
  function doorDrawing(sh, d, v) {
    const w = d.w, h = d.h;
    sh.rect(v.X(0), v.Y(h), w * v.k, h * v.k, 'front');
    const p = d.pull;
    if (p.id === 'cubeta') {
      sh.rect(v.X(p.cx - 17), v.Y(p.cy + 71.5), 34 * v.k, 143 * v.k, 'metal');
      const edgeLeft = p.cx < w / 2;
      const X0 = edgeLeft ? 0 : w, X1 = edgeLeft ? p.cx - 17 : p.cx + 17;
      sh.dimH(v.X(X0), v.X(X1), null, v.Y(p.cy + 71.5) - 3, mm(Math.abs(X1 - X0)));
      sh.dimV(v.Y(0), v.Y(p.cy - 71.5), null, v.X(p.cx) + (edgeLeft ? 3.5 : -3.5), mm(p.cy - 71.5));
      sh.text(v.X(p.cx + (edgeLeft ? 20 : -20)), v.Y(p.cy), 'Rebaje 143 × 34', 'lbs', edgeLeft ? 'start' : 'end');
    } else {
      sh.rect(v.X(p.cx - 6), v.Y(p.cy + p.len / 2), 12 * v.k, p.len * v.k, 'metal');
      const openLeft = d.hinge === 'right';
      const Xe = openLeft ? 0 : w;
      sh.dimH(v.X(Xe), v.X(p.cx), null, v.Y(p.cy + p.len / 2) - 3, mm(Math.abs(p.cx - Xe)));
      sh.dimV(v.Y(0), v.Y(p.cy), null, v.X(p.cx) + (openLeft ? 3 : -3), mm(p.cy));
    }
    if (d.type === 'hinged') {
      const hx = d.hinge === 'left' ? 22 : w - 22;
      d.hingePos.forEach(function (pos) {
        sh.circle(v.X(hx), v.Y(pos), 17.5 * v.k, 'cup');
        sh.line(v.X(hx) - 1.3, v.Y(pos), v.X(hx) + 1.3, v.Y(pos), 'cupc');
        sh.line(v.X(hx), v.Y(pos) - 1.3, v.X(hx), v.Y(pos) + 1.3, 'cupc');
      });
      const edgeX = d.hinge === 'left' ? 0 : w;
      const chainX = d.hinge === 'left' ? v.X(0) - 4 : v.X(w) + 4;
      const pts = [0].concat(d.hingePos).concat([h]);
      for (let i = 0; i < pts.length - 1; i++) sh.dimV(v.Y(pts[i]), v.Y(pts[i + 1]), v.X(edgeX), chainX, mm(n2(pts[i + 1] - pts[i])));
      const top = d.hingePos[d.hingePos.length - 1];
      sh.dimH(v.X(edgeX), v.X(hx), null, v.Y(top) - 3.2, '22');
      sh.dimV(v.Y(0), v.Y(h), v.X(w - edgeX), d.hinge === 'left' ? v.X(w) + 9 : v.X(0) - 9, mm(h));
    } else {
      sh.dimV(v.Y(0), v.Y(h), v.X(0), v.X(0) - 5, mm(h));
    }
    sh.dimH(v.X(0), v.X(w), v.Y(0), v.Y(0) + 4.5, mm(w));
    const lines = [d.label, mm(w) + ' × ' + mm(h) + ' × 20 mm'];
    if (d.type === 'hinged') {
      const it = Catalog.byId[d.hingeId];
      lines.push(d.hinges + ' × ' + (/Recta/.test(it.name) ? 'recta' : 'curva') + (d.soft ? ' con freno' : '') + ', lado ' + (d.hinge === 'left' ? 'izquierdo' : 'derecho'));
    } else {
      lines.push('Corrediza, riel ' + d.track);
    }
    lines.push('Peso estimado ' + E.fmtNum(d.weightKg, 1) + ' kg (Cálculo propio)');
    lines.forEach(function (t, i) { sh.text(v.X(w / 2), v.Y(0) + 9 + i * 2.6, t, i === 0 ? 'lb' : 'lbs', 'middle'); });
  }

  function sheetDoors(m) {
    const sh = openSheet();
    const slots = m.doors.map(function (d) { return { w: d.w, h: d.h, mx: 30, my: 36 }; });
    const s = pickScale(slots, AREA.x1 - AREA.x0, AREA.y1 - AREA.y0);
    const totalW = slots.reduce(function (a, sl) { return a + sl.w / s + sl.mx; }, 0);
    let x = AREA.x0 + (AREA.x1 - AREA.x0 - totalW) / 2;
    const maxH = Math.max.apply(null, m.doors.map(function (d) { return d.h; }));
    sh.text((AREA.x0 + AREA.x1) / 2, AREA.y0 + 2, m.doors[0].type === 'hinged' ? 'PUERTAS — VISTA EXTERIOR, CAZOLETAS EN LA CARA INTERIOR (TRAZOS)' : 'HOJAS CORREDIZAS — VISTA EXTERIOR', 'vt', 'middle');
    m.doors.forEach(function (d) {
      const v = view(x + 15, AREA.y0 + 10 + maxH / s, s);
      doorDrawing(sh, d, v);
      x += d.w / s + 30;
    });
    const note = m.doors[0].type === 'hinged'
      ? 'Cazoleta Ø35 mm (mecha Forstner), centro a 22 mm del canto de la bisagra; 100 mm desde cada extremo y el resto repartido. Luissi no perfora: las hace el usuario.'
      : 'Rebaje para cubeta 143 × 34 mm con fresadora o formón. Luissi no perfora ni rebaja: lo hace el usuario.';
    sh.text(AREA.x0, PH - FR - 20, note, 'lbs');
    sh.text(AREA.x0, PH - FR - 17, 'Tiradores: medida entre agujeros a confirmar con la pieza (la web no lo aclara).', 'lbs');
    titleBlock(sh, m, m.doors[0].type === 'hinged' ? 'Puertas y bisagras' : 'Hojas corredizas', s, 3, 3);
    return closeSheet(sh);
  }

  // ---------- cut diagram for one board ----------
  function boardSVG(board, idx, matLabel) {
    const sp = board.spec;
    const L = sp.L, W = sp.W;
    const pad = 40;
    const out = [];
    out.push('<svg xmlns="http://www.w3.org/2000/svg" class="board-svg" viewBox="' + (-pad) + ' ' + (-pad) + ' ' + (L + 2 * pad) + ' ' + (W + 2 * pad) + '">');
    out.push('<defs><pattern id="hx' + idx + '" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="40" height="40" fill="#eee"/><line x1="0" y1="0" x2="0" y2="40" stroke="#c9c9c9" stroke-width="10"/></pattern></defs>');
    out.push('<rect x="0" y="0" width="' + L + '" height="' + W + '" fill="url(#hx' + idx + ')" stroke="#333" stroke-width="3"/>');
    out.push('<rect x="' + sp.trimEnd + '" y="' + sp.trimEdge + '" width="' + sp.uL + '" height="' + sp.uW + '" fill="none" stroke="#999" stroke-width="2" stroke-dasharray="14 8"/>');
    board.placements.forEach(function (p) {
      const fill = p.item.mat === 'fj' ? '#ecd5ad' : (p.item.mat === 'ced4' ? '#e3b9a0' : '#f7efe2');
      out.push('<rect x="' + p.x + '" y="' + p.y + '" width="' + p.l + '" height="' + p.w + '" fill="' + fill + '" stroke="#333" stroke-width="2"/>');
      const fs = Math.max(18, Math.min(60, p.w * 0.3, p.l / 7));
      const cx = p.x + p.l / 2, cy = p.y + p.w / 2;
      const label = 'Nº ' + p.item.row + ' · ' + mm(p.item.L) + '×' + mm(p.item.A);
      if (p.w >= fs * 2.4 && p.l > textW(p.item.name, fs * 0.8)) {
        out.push('<text x="' + cx + '" y="' + (cy - fs * 0.15) + '" font-size="' + fs + '" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" fill="#111">' + esc(label) + '</text>');
        out.push('<text x="' + cx + '" y="' + (cy + fs * 0.95) + '" font-size="' + (fs * 0.8) + '" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" fill="#444">' + esc(p.item.name) + '</text>');
      } else if (p.w >= fs * 1.1) {
        out.push('<text x="' + cx + '" y="' + (cy + fs * 0.35) + '" font-size="' + fs + '" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" fill="#111">' + esc(label) + '</text>');
      } else {
        const f2 = Math.max(12, p.w * 0.8);
        out.push('<text x="' + cx + '" y="' + (cy + f2 * 0.35) + '" font-size="' + f2 + '" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" fill="#111">' + esc(label) + '</text>');
      }
    });
    out.push('<text x="0" y="-12" font-size="26" font-family="Arial,Helvetica,sans-serif" fill="#333">' + esc(L + ' mm (largo, dirección de la veta)') + '</text>');
    out.push('<text x="' + (L + 12) + '" y="0" font-size="26" font-family="Arial,Helvetica,sans-serif" fill="#333" transform="rotate(90 ' + (L + 12) + ' 0)">' + esc(W + ' mm') + '</text>');
    out.push('</svg>');
    return out.join('');
  }

  function allSheets(m) { return [sheetFront(m), sheetSectionTop(m), sheetDoors(m)]; }

  return { sheetFront: sheetFront, sheetSectionTop: sheetSectionTop, sheetDoors: sheetDoors, boardSVG: boardSVG, allSheets: allSheets, sections: sections };
});
