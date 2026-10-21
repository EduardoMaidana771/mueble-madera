/* Luissi catalogue (source: docs/investigacion-luissi.md, surveyed 27/09/2026).
   Every field here is copied from luissi.com.uy ("Dato Luissi") except the
   `note` fields that explicitly say otherwise. Prices are in cents to keep
   money math exact. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RoperoCatalog = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BASE = 'https://luissi.com.uy';
  const SURVEY_DATE = '27/09/2026';

  // category: Madera | Herrajes | Accesorios | Acabado (budget grouping)
  const items = [
    {
      id: 'fj2400', category: 'Madera', kind: 'board',
      name: 'Tablero Finger Joint 20 mm x 2.40m x 1,22m', brand: 'No indicada',
      priceCents: 16154, currency: 'USD', unit: 'tablero', pack: 1,
      saleUnit: 'Tablero 2400 × 1220 × 20 mm', sku: 'GFJ24020',
      dims: { L: 2400, W: 1220, T: 20 },
      path: '/p/tablero-finger-joint-20-mm-x-2-40m-x-1-22m/2196/2196',
      stock: 'La web muestra stock "1" (27/09/2026): confirmar.'
    },
    {
      id: 'fj3450', category: 'Madera', kind: 'board',
      name: 'Tablero Finger Joint 20 mm x 3.45m', brand: 'No indicada',
      priceCents: 23119, currency: 'USD', unit: 'tablero', pack: 1,
      saleUnit: 'Tablero 3450 × 1220 × 20 mm', sku: 'GFJ35020',
      dims: { L: 3450, W: 1220, T: 20 },
      path: '/p/tablero-finger-joint-20-mm-x-3-45m/717/717',
      stock: 'La web muestra stock "1" (27/09/2026): confirmar.'
    },
    {
      id: 'euc3', category: 'Madera', kind: 'sheet',
      name: 'Tablero Compensado Eucaliptus Clear 3 mm', brand: 'No indicada',
      priceCents: 1114, currency: 'USD', unit: 'tablero', pack: 1,
      saleUnit: 'Tablero 2200 × 1600 × 3 mm', sku: 'COMPB3',
      dims: { L: 2200, W: 1600, T: 3 },
      path: '/p/tablero-compensado-eucaliptus-clear-3-mm/885/885',
      stock: 'Confirmar stock.'
    },
    {
      id: 'ced4', category: 'Madera', kind: 'sheet',
      name: 'Tablero Compensado Cedro Real 4 mm', brand: 'No indicada',
      priceCents: 6177, currency: 'USD', unit: 'tablero', pack: 1,
      saleUnit: 'Tablero 2600 × 1830 × 4 mm', sku: 'COMCED4',
      dims: { L: 2600, W: 1830, T: 4 },
      path: '/p/tablero-compensado-cedro-real-4-mm/869/869',
      stock: 'Confirmar stock.'
    },
    {
      id: 'hRecta', category: 'Herrajes', kind: 'hinge',
      name: 'Bisagra Auto-reten 35 mm Recta Hafele', brand: 'Hafele',
      priceCents: 132, currency: 'USD', unit: 'unidad', pack: 1, saleUnit: 'Unidad',
      path: '/p/bisagra-auto-reten-35-mm-recta-hafele/304/304',
      stock: 'SIN STOCK al 27/09/2026.', outOfStock: true, altId: 'hRectaF'
    },
    {
      id: 'hCurva', category: 'Herrajes', kind: 'hinge',
      name: 'Bisagra Auto-reten 35 mm Curva Hafele', brand: 'Hafele',
      priceCents: 132, currency: 'USD', unit: 'unidad', pack: 1, saleUnit: 'Unidad',
      path: '/p/bisagra-auto-reten-35-mm-curva-hafele/302/302',
      stock: 'Confirmar stock.'
    },
    {
      id: 'hRectaF', category: 'Herrajes', kind: 'hinge',
      name: 'Bisagra Auto-reten con Freno Recta 35 mm Hafele', brand: 'Hafele',
      priceCents: 326, currency: 'USD', unit: 'unidad', pack: 1, saleUnit: 'Unidad',
      path: '/p/bisagra-auto-reten-con-freno-recta-35-mm-hafele/310/310',
      stock: 'Confirmar stock.'
    },
    {
      id: 'hCurvaF', category: 'Herrajes', kind: 'hinge',
      name: 'Bisagra Auto-reten con Freno Curva 35 mm Hafele', brand: 'Hafele',
      priceCents: 329, currency: 'USD', unit: 'unidad', pack: 1, saleUnit: 'Unidad',
      path: '/p/bisagra-auto-reten-con-freno-curva-35-mm-hafele/309/309',
      stock: 'Confirmar stock.'
    },
    {
      id: 'g45', category: 'Herrajes', kind: 'slide',
      name: 'Guía Telescópica 45 cm Galvanizada 30kts Hafele', brand: 'Hafele',
      priceCents: 1155, currency: 'USD', unit: 'unidad', pack: 1,
      saleUnit: 'Unidad (la web no aclara si es un riel o un par)', slideLength: 450,
      path: '/p/guia-telescopica-45-cm-galvanizada-30kts-hafele/373/373',
      stock: 'Confirmar stock.'
    },
    {
      id: 'dtc500', category: 'Herrajes', kind: 'slide',
      name: 'Guía Telescópica con Amortiguación 500 mm 30 kg DTC', brand: 'DTC',
      priceCents: 1280, currency: 'USD', unit: 'unidad', pack: 1,
      saleUnit: 'Unidad (la web no aclara si es un riel o un par)', slideLength: 500,
      path: '/p/guia-telescopica-con-amortiguacion-500-mm-30-kg-dtc/2217/2217',
      stock: 'Confirmar stock.'
    },
    {
      id: 'duclosetD', category: 'Herrajes', kind: 'sliding',
      name: 'Sistema Corredizo Colgante Ducasse Ducloset Doble', brand: 'Ducasse',
      priceCents: 1252, currency: 'USD', unit: 'unidad', pack: 1, saleUnit: 'Unidad (kit)',
      path: '/p/sistema-corredizo-colgante-ducasse-ducloset-doble/2513/2513',
      stock: 'Confirmar stock.',
      note: 'Ficha del fabricante (ducasseindustrial.com, no es dato Luissi): 2 hojas, 30–45 kg por hoja, hojas de 15–30 mm, ancho mínimo 600 mm, riel U-20.'
    },
    {
      id: 'rielU20_2', category: 'Herrajes', kind: 'rail',
      name: 'Riel Acero U20 2 m Ducasse para Ducloset', brand: 'Ducasse',
      priceCents: 1297, currency: 'USD', unit: 'unidad', pack: 1, saleUnit: 'Unidad (riel de 2 m)',
      path: '/p/riel-acero-u20-2-m-ducasse-para-ducloset/2515/2515',
      stock: 'Confirmar stock.'
    },
    {
      id: 'arc128', category: 'Herrajes', kind: 'pull', pullLength: 128,
      name: 'Tirador Acero Inox. Arcadia 128 mm', brand: 'No indicada',
      priceCents: 256, currency: 'USD', unit: 'unidad', pack: 1, saleUnit: 'Unidad',
      path: '/p/tirador-acero-inox-arcadia-128-mm/2543/2543', stock: 'Confirmar stock.'
    },
    {
      id: 'arc160', category: 'Herrajes', kind: 'pull', pullLength: 160,
      name: 'Tirador Acero Inox. Arcadia 160 mm', brand: 'No indicada',
      priceCents: 289, currency: 'USD', unit: 'unidad', pack: 1, saleUnit: 'Unidad',
      path: '/p/tirador-acero-inox-arcadia-160-mm/2544/2544', stock: 'Confirmar stock.'
    },
    {
      id: 'arc190', category: 'Herrajes', kind: 'pull', pullLength: 190,
      name: 'Tirador Acero Inox. Arcadia 190 mm', brand: 'No indicada',
      priceCents: 298, currency: 'USD', unit: 'unidad', pack: 1, saleUnit: 'Unidad',
      path: '/p/tirador-acero-inox-arcadia-190-mm/2545/2545', stock: 'Confirmar stock.'
    },
    {
      id: 'arc320', category: 'Herrajes', kind: 'pull', pullLength: 320,
      name: 'Tirador Acero Inox. Arcadia 320 mm', brand: 'No indicada',
      priceCents: 458, currency: 'USD', unit: 'unidad', pack: 1, saleUnit: 'Unidad',
      path: '/p/tirador-acero-inox-arcadia-320-mm/2547/2547', stock: 'Confirmar stock.'
    },
    {
      id: 'cubeta', category: 'Herrajes', kind: 'pull', pullLength: 143,
      name: 'Cubeta Aluminio 143 mm x 34 mm Aluminio Hafele', brand: 'Hafele',
      priceCents: 725, currency: 'USD', unit: 'unidad', pack: 1, saleUnit: 'Unidad',
      path: '/p/cubeta-aluminio-143-mm-x-34-mm-aluminio-hafele/360/360', stock: 'Confirmar stock.'
    },
    {
      id: 'pataSandy', category: 'Herrajes', kind: 'leg',
      name: 'Pata para Mueble Regulable 65 a 100 mm Negra Sandy Hafele', brand: 'Hafele',
      priceCents: 475, currency: 'USD', unit: 'unidad', pack: 1, saleUnit: 'Unidad',
      path: '/p/pata-para-mueble-regulable-65-a-100-mm-negra-sandy-hafele/389/389', stock: 'Confirmar stock.'
    },
    {
      id: 't4x50', category: 'Accesorios', kind: 'screw',
      name: 'Tornillo Phillip 4 x 50 Hafele', brand: 'Hafele',
      priceCents: 386, currency: 'USD', unit: 'caja', pack: 100, saleUnit: 'Precio por 100 unidades',
      path: '/p/tornillo-phillip-4-x-50-hafele/2578/2578', stock: 'Confirmar stock.'
    },
    {
      id: 't4x35', category: 'Accesorios', kind: 'screw',
      name: 'Tornillo Phillips 4 mm x 35 mm x Ciento Hafele', brand: 'Hafele',
      priceCents: 350, currency: 'USD', unit: 'caja', pack: 100, saleUnit: 'Precio por 100 unidades',
      path: '/p/tornillo-phillips-4-mm-x-35-mm-x-ciento-hafele/2573/2573', stock: 'Confirmar stock.'
    },
    {
      id: 't35x15', category: 'Accesorios', kind: 'screw',
      name: 'Tornillo Phillips 3.5 x 15 Hafele', brand: 'Hafele',
      priceCents: 163, currency: 'USD', unit: 'caja', pack: 100, saleUnit: 'Precio por 100 unidades',
      path: '/p/tornillo-phillips-3-5-x-15-hafele/2560/2560', stock: 'Confirmar stock.'
    },
    {
      id: 'titebond', category: 'Accesorios', kind: 'glue',
      name: 'Cola Titebond Original Roja', brand: 'Titebond',
      priceCents: 1715, currency: 'USD', unit: 'unidad', pack: 1,
      saleUnit: 'Unidad ("160Z"; probablemente 16 oz, no confirmado)',
      path: '/p/cola-titebond-original-roja/3002/3002', stock: 'Confirmar stock.'
    },
    {
      id: 'bonaSat1', category: 'Acabado', kind: 'finish', litres: 1,
      name: 'Bona Mega Satinado 1 L', brand: 'Bona',
      priceCents: 4740, currency: 'USD', unit: 'lata', pack: 1, saleUnit: 'Lata de 1 L',
      path: '/p/bona-mega-satinado-1-l/1917/1917', stock: 'Confirmar stock.'
    },
    {
      id: 'bonaSat5', category: 'Acabado', kind: 'finish', litres: 5,
      name: 'Bona Mega Satinado 5 L', brand: 'Bona',
      priceCents: 15357, currency: 'USD', unit: 'lata', pack: 1, saleUnit: 'Lata de 5 L',
      path: '/p/bona-mega-satinado-5-l/1918/1918', stock: 'Confirmar stock.'
    },
    {
      id: 'pinceleta', category: 'Acabado', kind: 'brush',
      name: 'Pinceleta Rectangular 12 cm x 5 cm Roma', brand: 'Roma',
      priceCents: 84, currency: 'USD', unit: 'unidad', pack: 1, saleUnit: 'Unidad',
      path: '/p/pinceleta-rectangular-12-cm-x-5-cm-roma/1074/1074', stock: 'Confirmar stock.'
    }
  ];

  items.forEach(function (it) { it.url = BASE + it.path; });

  const byId = {};
  items.forEach(function (it) { byId[it.id] = it; });

  // Searched on luissi.com.uy and not found (terms in parentheses).
  const notFound = [
    { name: 'Barras / caños para colgar ropa y sus soportes', terms: 'barral, caño, tubo, oval, soporte barral, percha, placard', solution: 'Barra de madera 20 × 45 mm cortada del mismo tablero, sostenida con tacos de madera.' },
    { name: 'Soportes de estante / pernos portaestante', terms: 'portaestante, estante, soporte, escuadra', solution: 'Estantes fijos (atornillados o sobre listones).' },
    { name: 'Minifix, excéntricas, confirmat, tarugos de madera', terms: 'minifix, excentrica, confirmat, tarugo, espiga', solution: 'Tornillos para madera Hafele + cola.' },
    { name: 'Clavos sin cabeza / brads', terms: 'clavo, grampa', solution: 'Tornillos 3.5 × 15.' },
    { name: 'Niveladores', terms: 'nivelador', solution: 'Cuñas de retazo (M1–M4); patas regulables (M5).' },
    { name: 'Escuadras metálicas', terms: 'escuadra, angulo', solution: 'No se usan.' },
    { name: 'Topes de puerta', terms: 'tope', solution: 'No se usan.' },
    { name: 'Papel de lija (granos 120 / 180 / 240)', terms: 'lija', solution: 'Comprar en otro comercio. No incluido en los totales.' },
    { name: 'Masilla para madera', terms: 'masilla', solution: 'No se usa.' },
    { name: 'Aceite para muebles de interior', terms: 'aceite', solution: 'Se usa Bona Mega Satinado.' },
    { name: 'Rodillos', terms: 'rodillo', solution: 'Se usan pinceletas.' }
  ];

  const board = {
    fj: { label: 'Finger Joint 20 mm', thickness: 20, rotate: false, types: ['fj3450', 'fj2400'] },
    euc3: { label: 'Compensado Eucaliptus Clear 3 mm', thickness: 3, rotate: true, types: ['euc3'] },
    ced4: { label: 'Compensado Cedro Real 4 mm', thickness: 4, rotate: true, types: ['ced4'] }
  };

  return { BASE: BASE, SURVEY_DATE: SURVEY_DATE, items: items, byId: byId, notFound: notFound, board: board };
});
