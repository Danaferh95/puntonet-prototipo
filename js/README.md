# Código de la app (js/)

Hasta el 25/09/2026 toda la lógica vivía en un solo `js/functions.js` de ~7.500 líneas. Ahora está
repartida en archivos chicos, uno por responsabilidad. El contenido es el mismo: se cortó por las
secciones que ya tenía el archivo (§1 Catálogo, §2 Estado, §3 Escena…), sin reescribir lógica.

## Cómo se cargan

- **Scripts clásicos, no módulos ES.** La app se abre con doble clic en `index.html` (`file://`) y
  Chrome bloquea `import`/`type="module"` en `file://`. Por eso cada archivo es un `<script>` normal
  y todos comparten el ámbito global, igual que antes.
- **El orden de los `<script>` en `index.html` importa.** Un archivo puede usar en su nivel superior
  (al cargar) solo lo que declaró un archivo anterior. Dentro de funciones puede usar cualquier cosa,
  porque las funciones corren cuando ya cargó todo.
- **`main.js` va último y es el único que arranca la app** (dibuja el Datacenter, inicia el loop,
  carga los .glb, pinta los paneles). Los demás archivos solo declaran constantes, funciones y
  listeners. Si agregas algo que tiene que ejecutarse al inicio, va en `main.js`.

## Mapa

| Carpeta | Archivo | Qué tiene |
|---|---|---|
| `core/` | `catalogo.js` | §1 Verticales, Productos y Subproductos |
| | `utilidades.js` | Color por producto, tamaños de sede, sliders |
| | `estado.js` | §2 `state`, `byId`, búsquedas de entidades, reglas de conexión |
| `escena/` | `base.js` | Escena, cámara, renderer, fábricas de malla, puerto de techo |
| | `color-luces.js` | §3A-ter pipeline de color, luces, etiquetas de nombre, grilla |
| | `piso.js` | §3A-bis piso oscuro con glow bajo cada entidad |
| | `modelos.js` | §3B `ModelLibrary` (entidades .glb) y env map del metal |
| | `iconos.js` | §3D `IconLibrary` (íconos de producto .glb) |
| | `brillo.js` | §3C bloom (post-proceso) |
| | `entidades.js` | Geometría de Matriz, Nube, centro de grilla y Datacenter |
| | `cables.js` | Cables, enlaces satelitales y badges de SD-WAN |
| | `camara.js` | Órbita, zoom, pan, pantalla completa y resize |
| | `assets.js` | `AssetRegistry`, malla de sede, etiqueta y puerto |
| | `colocacion-iconos.js` | §3E dónde va cada ícono sobre la entidad |
| | `loop.js` | Loop de render (`animate`) y reconstrucción al llegar los .glb |
| `entidades/` | `sedes.js` | §4 crear, mover, redimensionar y borrar sedes |
| | `crear.js` | Crear/borrar Matriz, Nube y Datacenter; soltar productos |
| | `conexiones.js` | §7b conexiones ligadas a su instancia |
| `interaccion/` | `raycasting.js` | §5 clic, arrastre y hover sobre el canvas; tooltip |
| `ui/` | `avisos.js` | Toasts y diálogo de confirmación |
| | `arrastre.js` | Arrastre táctil y tarjetas del panel izquierdo |
| | `panel-derecho.js` | §6 panel derecho y restaurar Datacenter |
| | `salud.js` | §3.5 salud de infraestructura |
| | `catalogo-panel.js` | Catálogo del panel izquierdo y `renderRightPanel` |
| | `conexiones-panel.js` | Lista de conexiones de la entidad seleccionada |
| | `edicion.js` | `escapeHtml`, bloques de edición, herencia de Matrices |
| | `popup.js` | §7 popup de personalización |
| | `deseleccionar.js` | §8 deseleccionar |
| `reporte/` | `reporte.js` | §9 cliente, logo, reporte y exportar JSON |
| | `estructura.js` | T06 estructura inicial vs actual |
| | `pdf.js` | §9-bis PDF |
| | `main.js` | §10 arranque y estado inicial |

Sin tocar: `vendor/` (GLTFLoader, post-proceso) y los datos embebidos que generan los scripts de
`tools/` (`modelos-glb.js`, `iconos-glb.js`, `reporte-assets.js`).

## Dónde va cada cosa nueva

- **Apariencia:** siempre en `css/`, nunca inline en JS (regla del proyecto). Ver `css/README.md`.
- **Una función nueva:** en el archivo de su tema. Si no encaja en ninguno, un archivo nuevo en la
  carpeta que corresponda, agregado a `index.html` antes de `main.js`.
- **Algo que corre al cargar:** en `main.js`.

## Tests

```
npm install
npm test
```

Los smoke tests (`tests/`) leen la lista de `<script>` de `index.html`, así que un archivo nuevo
entra solo. Cada archivo corre como `<script>` propio, igual que en el navegador: si uno usa al
cargar algo que se declara después, el test lo detecta.
