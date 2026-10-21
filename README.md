# Roperos de madera real — materiales de Barraca Luissi

Cinco diseños de ropero para armar uno mismo, presupuestados **solo con productos que existen en [luissi.com.uy](https://luissi.com.uy)** (relevados el 27/09/2026). Cada modelo incluye despiece, formulario de corte para Cortecloud, optimización de tableros, planos técnicos imprimibles, vista 3D y presupuesto de materiales.

| Modelo | Idea |
|---|---|
| M1 Clásico | 1000 mm, 2 puertas, barra larga + 4 estantes + maletero |
| M2 Familiar modular | 2 módulos de 1000 mm: colgar largo / 4 cajones + estantes |
| M3 Moderno corredizo | 1800 mm, 2 hojas corredizas colgantes, 3 cuerpos |
| M4 Cajonera | 1600 mm, colgar largo + 8 cajones + alacena |
| M5 Premium | 1800 mm, uniones ocultas, cierre suave, patas regulables, fondo de cedro |

## Cómo abrirlo

1. Doble clic en `index.html`. Se abre en el navegador directamente desde el disco (`file://`).
2. No hace falta internet ni instalar nada: Three.js está incluido en `vendor/`.
3. Arriba se elige el modelo (M1–M5) o una página general. El botón **Imprimir vista** imprime lo que se está viendo (planos y formularios en A4 apaisado).

Vistas de cada modelo: **Vista 3D** (girar, abrir puertas, mostrar medidas) · **Vista frontal** · **Plano técnico** (3 láminas) · **Despiece** (con cortes en casa, mecanizados y herramientas) · **Formulario Cortecloud** (hojas de 22 filas + CSV) · **Optimización de cortes** · **Presupuesto**.

Páginas generales: **Investigación** · **Comparativa** · **Resumen** · **Preguntas para Luissi** · **Supuestos y notas**.

## Cómo pedir el corte

Luissi corta con máquina automática a través de Cortecloud (barracaluissi.corte.cloud, "Servicio completo"). En la pestaña **Formulario Cortecloud** de cada modelo está la lista de piezas con las columnas del formulario estándar (`Nº | Cant. | L | A | Tablero | Función de la pieza | Girar | Tapacanto | L1 | L2 | A1 | A2`) y un botón para descargar el CSV. Luissi **no perfora**: las cazoletas de bisagra, los agujeros de tiradores y los rebajes los hace uno mismo (ver "Mecanizados que hacés vos").

## Carpetas

```
index.html            la aplicación (abrir con doble clic)
css/styles.css        estilos, modo claro/oscuro, impresión
js/catalog.js         productos de Luissi: nombre exacto, precio, unidad de venta, URL
js/engine.js          reglas de armado, optimización de cortes, barniz, presupuesto
js/models.js          los 5 modelos (geometría, herrajes, tornillos)
js/plans.js           planos SVG y diagramas de corte
js/viewer3d.js        vista 3D
js/content.js         preguntas para Luissi, herramientas y supuestos
js/app.js             interfaz
vendor/               Three.js r147 y OrbitControls (licencia MIT en three-LICENSE.txt)
tools/check.js        verificaciones automáticas
tools/report.js       genera el informe completo en Markdown
docs/investigacion-luissi.md   relevamiento de productos y precios
docs/presupuestos.md           informe generado
```

## Regenerar el informe

Con Node instalado, desde esta carpeta:

```
node tools/check.js
node tools/report.js > docs/presupuestos.md
```

En PowerShell 5.1 conviene `node tools/report.js --out docs/presupuestos.md` (escribe UTF-8 directamente). Con pnpm: `pnpm check` y `pnpm report`.

Para actualizar un precio, editar `priceCents` del producto en `js/catalog.js` (en centavos de dólar) y regenerar. La aplicación toma los cambios al recargar la página.

## Avisos

- **Precios al 27/09/2026**, en USD tal como figuran en luissi.com.uy. No hay conversión de moneda.
- **IVA:** la web no indica si los precios lo incluyen.
- **Stock:** a confirmar antes de comprar (varios productos muestran stock "1"; la bisagra Recta Hafele figuraba sin stock).
- **El costo de los cortes no está incluido** en ningún total. Se obtiene cargando la lista de piezas en Cortecloud.
- Cantidades, optimización de tableros, áreas, pesos y capacidades son **Cálculo propio**. Los rendimientos del barniz y los datos del sistema corredizo vienen de las fichas de Bona y Ducasse, no de Luissi.
- Lo que Luissi no vende (lija, barras metálicas, soportes, etc.) figura como **No encontrado en Luissi** y queda fuera de los totales.
