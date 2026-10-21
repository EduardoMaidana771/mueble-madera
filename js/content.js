/* Shared Spanish text for the app and the Markdown report. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.RoperoContent = factory(root.RoperoEngine);
})(typeof self !== 'undefined' ? self : this, function (E) {
  'use strict';

  const answered = [
    { q: '¿Cortan con máquina automática?', a: 'Sí: "Corta con máquina automática".' },
    { q: '¿Entregan las piezas etiquetadas?', a: 'Sí: "La tienda entrega las piezas etiquetadas".' },
    { q: '¿Hacen perforaciones (canto, cara, fondo)?', a: 'No: "Canto: No realiza · Cara: No realiza · Fondo: No realiza". Las cazoletas, rebajes y agujeros los hace el usuario.' },
    { q: '¿Venden fracciones de tablero?', a: 'No: "0 de 263 tableros con opción de venta en fracciones". Se compran tableros enteros, como en este presupuesto.' },
    { q: '¿Plazo de producción?', a: '2 días hábiles (plazo medio).' },
    { q: '¿Colocan tapacantos?', a: 'Sí ("Coloca tapacantos"). En finger joint no hacen falta: el canto es madera maciza.' }
  ];

  const pending = [
    '¿El Tablero Finger Joint 20 mm está en el catálogo de Cortecloud para "Servicio completo"? ¿De qué especie es (¿eucalipto grandis?)? ¿Calidad y caras?',
    '¿Cuánto cobran por corte (por corte, por metro lineal o por tablero)?',
    '¿Qué espesor de sierra (kerf) y qué tolerancia tienen? ¿Hacen corte de saneo de bordes?',
    '¿Cuál es el ancho mínimo de pieza que corta la máquina (barras de 45 mm, listones de 40 mm)?',
    '¿Respetan la dirección de la veta ("Girar: No")?',
    '¿Las guías telescópicas Hafele / DTC se venden por riel o por par?',
    '¿Las bisagras Auto-reten incluyen base y tornillos? ¿Cuándo reponen la Recta Hafele?',
    '¿Los tiradores Arcadia traen tornillos para puerta de 20 mm? ¿La medida es entre agujeros?',
    '¿Los precios incluyen IVA? ¿Qué cotización usan si pago en pesos?',
    '¿Cuál es el stock real de los tableros finger joint (la web muestra 1)?',
    '¿Venden lijas en el local?',
    '¿"160Z" de Titebond son 16 oz?',
    '¿Pueden optimizar el despiece con su optimizador y entregarme el plano de corte?',
    '(M3) ¿Tienen la ficha de instalación del Ducloset Doble (holgura superior del riel U20; ¿un riel para las dos hojas o uno por hoja?)?',
    '¿Cuál es el costo de envío a mi dirección?'
  ];

  const tools = [
    { t: 'Taladro / atornillador', why: 'Todos los modelos' },
    { t: 'Mecha Forstner 35 mm', why: 'Cazoletas de bisagra (M1, M2, M4, M5)' },
    { t: 'Mechas de 3 y 4 mm', why: 'Agujeros guía y pasantes de tornillos, agujeros de tiradores' },
    { t: 'Avellanador', why: 'Cabezas de tornillos pasantes al ras' },
    { t: 'Sargentos', why: 'Encolado y armado' },
    { t: 'Escuadra', why: 'Armado de carcasas y cajones' },
    { t: 'Nivel', why: 'Nivelación (cuñas en M1–M4, patas en M5) y colocación de barras' },
    { t: 'Taco de lijar o lijadora', why: 'Lijado previo al barniz (lija: No encontrado en Luissi)' },
    { t: 'Fresadora o formón', why: 'Rebajes de las cubetas del M3' },
    { t: 'Serrucho o sierra caladora', why: 'Tacos de las barras (cortes en casa) y cuñas de nivelación' },
    { t: 'Sierra para metales', why: 'Cortar el riel U20 a 1760 mm (M3)' },
    { t: 'Mecha de 8 mm', why: 'Cajeados de los tornillos de listones (M5)' }
  ];

  function assumptions() {
    const defl = E.rodDeflection(960, 30, 20, 45, 12000);
    return [
      'Nombres, precios, unidades de venta y URLs: relevados en luissi.com.uy el 27/09/2026 (Dato Luissi). Los precios pueden cambiar.',
      'Moneda: todos los productos elegidos están en USD en la web de Luissi. No se hace ninguna conversión de moneda.',
      'IVA: la web no indica si los precios lo incluyen. Stock: a confirmar (varios productos muestran stock "1" o sin stock).',
      'El costo de los cortes NO está incluido en ningún total. Se obtiene cargando la "Lista de las piezas" en Cortecloud (Servicio completo) de Barraca Luissi.',
      'Parámetros de corte (Cálculo propio, a confirmar con Luissi): sierra de 4 mm; saneo de 10 mm por extremo y 5 mm por canto largo en finger joint (área útil (L − 20) × 1210 mm); 5 mm por borde en compensados.',
      'Veta: el finger joint se corta siempre con el largo de la pieza en el largo del tablero (no se gira). Los compensados pueden girarse.',
      'Optimización (Cálculo propio): guillotina de 3 etapas (tiras a lo largo del tablero, cortes transversales y sub-tiras al costado de piezas más angostas). Se prueban mezclas n × 3,45 m + resto 2,40 m (n = 0…N), 124 órdenes de piezas y una estrategia de mochila por tiras; se elige el menor costo y, a igual costo, el menor desperdicio.',
      'Tacos de 80 × 45 × 20 mm: demasiado chicos para la seccionadora automática. No se piden sueltos: se pide una "Tira para tacos" de 45 mm de ancho y se cortan en casa.',
      'Piezas angostas (barras de 45 mm, listones de 40 mm, tiras para tacos): marcadas "Consultar ancho mínimo de corte".',
      'Guías de cajón: Luissi no aclara si el precio es por riel o por par. Se presupuestan 2 unidades por cajón (caso conservador).',
      'Bisagras: 2 hasta 900 mm de alto, 3 hasta 1600, 4 hasta 2000 y 5 por encima (criterio Blum/Hafele); a 100 mm de cada extremo y el resto repartido; 4 tornillos 3.5 × 15 por bisagra. La Recta Hafele está sin stock al 27/09/2026: se indica la alternativa con freno y la diferencia.',
      'Barniz Bona Mega Satinado: 8 m²/L por mano (ficha técnica de Bona: 8–10 m²/L; no es dato Luissi) + 5 % por cantos. Manos: puertas y frentes 3; carcasa 2 (M5: 3); cajones, barras, tacos y listones 1 (M5: 2); siempre ambas caras. Fondos y fondos de cajón sin barniz. Se compra la combinación de latas de 1 L y 5 L más barata.',
      'Tornillos y cola por reglas de armado (ver cada presupuesto); cajas = redondeo hacia arriba de unidades / 100. Cola: 1 Titebond (M5: 2).',
      'Pesos estimados con densidad supuesta de ' + E.DENSITY + ' kg/m³ (Cálculo propio).',
      'Flecha de la barra de colgar (Cálculo propio): δ = 5·w·L⁴ / (384·E·I), con barra 20 × 45 de canto (I = 20·45³/12 = 151.875 mm⁴), E ≈ 12.000 MPa, 30 kg repartidos en 960 mm → δ ≈ ' + E.fmtNum(defl, 1) + ' mm (≈ L/' + Math.round(960 / defl) + '). Las barras de 470–770 mm flexan bastante menos.',
      'Barras y soportes de barra no se venden en Luissi: barra de madera 20 × 45 de canto, 70 mm bajo el estante superior, centrada en la profundidad útil, sobre 2 tacos por extremo (uno adelante y uno atrás), desmontable y sin tornillos a la vista.',
      'M1–M4: uniones con tornillos 4 × 50 pasantes desde las caras exteriores + cola. Las cabezas quedan a la vista en los laterales exteriores (compromiso asumido; se pueden tapar con masilla, que Luissi no vende). Nivelación con cuñas de retazos.',
      'Luissi no perfora: cazoletas, agujeros de tiradores, rebajes y agujeros guía los hace el usuario (ver "Mecanizados que hacés vos" en cada modelo).',
      'Profundidad total = fondo + carcasa + puertas batientes (2 mm de separación + 20 mm de puerta). En M3 las hojas corredizas van dentro de la carcasa. Los tiradores sobresalen además unos 30 mm.',
      'CSV de Cortecloud: separador punto y coma, UTF-8 con BOM (se abre bien en Excel en español).'
    ];
  }

  // Design choices the plan left open (not conflicts).
  const designChoices = [
    'Alturas de maletero no fijadas en el plan para M2, M3 y M4: se usa el mismo criterio que M1 (maletero entre 1720 y 1740 mm; barra larga con cara superior a 1650 mm).',
    'Luces entre estantes repartidas en partes iguales (el milímetro sobrante va a los espacios extremos): M2 B 267 / 266 / 267; M3 centro 314 / 313 / 313 / 313 / 313 / 314; M4 alacena 308 / 308; M5 centro 393 / 392 / 393.',
    'Tiradores de puerta verticales a 40 mm del canto de apertura; centro a 1050 mm del piso en puertas altas (M5: 1100) y a 150 mm del borde inferior en puertas superiores (M5 central: 200). Tiradores de cajón centrados.',
    'M3: hoja izquierda en el riel trasero y hoja derecha en el riel delantero; cubetas a 30 mm del canto exterior de cada hoja, centradas a 1050 mm del piso.',
    'M5: la puerta central superior abre con bisagras sobre el divisor izquierdo.',
    'M5, cuerpo derecho: el plan no fija las alturas de la doble barra. Barra superior 70 mm bajo el techo (cara superior a 2060 mm) e inferior a 930 mm sobre el piso interior (cara superior a 1050 mm), el mismo criterio que la barra inferior de M3.',
    'Listones del M5 colocados planos (40 mm hacia el interior, 20 mm de alto) para atornillar estantes, techo y piso a través de 20 mm; los tornillos listón → vertical atraviesan 40 mm y llevan cajeado.'
  ];

  return { answered: answered, pending: pending, tools: tools, assumptions: assumptions, designChoices: designChoices };
});
