# Mockup Fase 1 — Configurador de Infraestructura (Actualización v21)

> **v21 — actualiza a `mockup-fase1-actualizacion-v20.md` (v20: tanda Cloud, Housing y Hosting).**
> Esta fase integra la **tercera tanda de íconos de producto** del proveedor —**Colaboración:
> Conferencia, Ofimática, Portal Cautivo y Zona Wireless**— en 3D y en el panel izquierdo, y
> **cierra el Pendiente 39** (normalización de tamaño entre tandas). `IconLibrary` pasa de 7 a 11
> assetKeys con modelo real. `css/styles.css` e `index.html` **no cambian**.
> Prototipo: **sigue etiquetado v42** — ver Pendiente 38 (heredado).

## El origen

Llegó el paquete `3D ASSETS / COLABORACION` del proveedor: `pn_ico_pantalla.glb` (Conferencia),
`pn_ico_documento.glb` (Ofimática), `pn_ico_puerta.glb` (Portal Cautivo) y `pn_ico_antena.glb`
(Zona Wireless), con sus SVG planos, `manifest.json`, `checks.json`, `LEEME.md`, `validation.log`
y los renders de revisión. Entra por el mismo camino que abrieron v18 (Ciberseguridad) y v20 (Cloud).

Con esto, los assetKeys con modelo real pasan de 7 a **11 de 15**. Siguen con primitiva: `enlace`,
`nodo`, `globo` y `firewall_virtual` — este último por decisión explícita del proveedor, no por
falta de entrega.

Una precisión de catálogo que conviene tener a la vista al leer esta tanda: **Zona Wireless dejó de
colgar de Conectividad → Internet y pasó a Colaboración** (31/07/2026, ya reflejado en `PRODUCTOS`).
Por eso el paquete trae cuatro archivos y no tres: los cuatro productos de la vertical.

## Validación del paquete contra la especificación

Se corrió el checklist de `assets-3d-listado-y-especificaciones-v2.md` §6.8 sobre los cuatro `.glb`,
leyendo los chunks glTF directamente (no confiando en `checks.json`):

| Criterio (v2) | `pantalla` | `documento` | `puerta` | `antena` |
| --- | --- | --- | --- | --- |
| Envolvente ≤ 0.6³ (§3) | 0.48 × 0.372 × 0.100 ✔ | 0.40 × 0.483 × 0.192 ✔ | 0.58 × 0.290 × 0.58 ✔ | 0.58 × 0.089 × 0.58 ✔ |
| Pivote en la base, centrado en X/Z (§6.4) | `Y min = 0` ✔ | ✔ | ✔ | ✔ |
| Triángulos ≤ 1.200 / máx 2.500 (§6.3) | 1.180 ✔ | 552 ✔ | 1.120 ✔ | 708 ✔ |
| Peso ≤ 45 KB / máx 100 KB (§6.2) | 39 KB ✔ | 20 KB ✔ | 37 KB ✔ | 24 KB ✔ |
| Slots nombrados (§6.5) | base·glow·receso ✔ | base·glow ✔ | base·glow·receso·translúcido ✔ | base·glow·receso ✔ |
| `mat_glow` como geometría separada (§6.5) | ✔ (56 vértices propios) | ✔ (168) | ✔ (440) | ✔ (440) |
| Sin cámaras, luces, animaciones, texturas (§6.8) | ✔ | ✔ | ✔ | ✔ |
| Y-up, una malla, transformaciones aplicadas (§6.1, §6.3) | ✔ | ✔ | ✔ | ✔ |

`checks.json` y `validation.log` del proveedor coinciden con la medición propia archivo por archivo.
`manifest.json` reporta las dimensiones con Y y Z permutados respecto de `checks.json` — es solo el
orden de ejes de Blender contra el de glTF, y la medición sobre los chunks confirma que **los `.glb`
están bien**; no hay nada que corregir, pero conviene no usar `manifest.json` como fuente de medidas.

**Tres desvíos, ninguno bloqueante.** El primero ya es conocido; los otros dos son nuevos de esta tanda:

1. **Los materiales no vienen en blanco puro.** Igual que en v18 y v20: el paquete los entrega en el
   lima de la categoría (`#DCE361`) y con `KHR_materials_emissive_strength`. No hace falta corregir
   el archivo porque `IconLibrary.materialesDeColor()` **descarta el material del `.glb`** y crea el
   suyo desde el color del catálogo; de la entrega solo se lee el **nombre** del slot. El acabado
   lima del render del proveedor, entonces, no llega a la app a propósito — misma decisión que v20.
2. **`pn_ico_puerta` es el primer ícono que usa los cuatro slots a la vez.** `mat_base` (el equipo),
   `mat_glow` (los aros de cobertura), `mat_receso` (la carcasa oscura) y `mat_translucido`
   (la credencial, en `alphaMode: BLEND`). El código ya los soportaba desde v18, así que no hubo
   que tocar `materialesDeColor()`: esta tanda es la primera que ejercita el camino completo.
3. **El SVG de Conferencia llegó como export de Adobe Illustrator y no se podía teñir.** Es el
   desvío que sí hubo que arreglar — ver la sección del panel izquierdo.

## Los cambios

### Normalización de tamaño entre tandas (§3D) — cierra el Pendiente 39

El Pendiente 39 de v20 decía que la altura de los íconos no está armonizada entre tandas, y pedía
decidirlo **antes** de la tercera. Al medir los 11 juntos apareció algo que cambia el diagnóstico:

- **Por altura** la dispersión empeora mucho con esta tanda: de 2,8× pasa a **6,3×**, porque `antena`
  mide 0.089 de alto contra los 0.562 de `rack`.
- **Por dimensión mayor** los 11 están casi alineados: van de **0.460 a 0.580**, apenas un 26%, y
  cinco de los once caen exactamente en 0.580.

Es decir: el proveedor **sí** venía trabajando contra una referencia común — la envolvente de 0.58 —
solo que la ocupa en el eje que le toca a cada diseño. `antena` y `puerta` son chatos pero gastan los
0.58 completos en X y Z, porque su rasgo son los aros de cobertura, que son horizontales.

Eso descarta normalizar por altura: llevar `antena` a una altura común la escalaría ~4×, dejando sus
aros en ~2,3 de ancho — cuatro veces la envolvente de §3, invadiendo las sedes vecinas del anillo.

Se normaliza entonces por **dimensión mayor**, en `prepararPlantilla()`, contra
`ICONOS_DIM_OBJETIVO = 0.58`:

```js
let factor = escala;
if(ICONOS_DIM_OBJETIVO > 0){
  const tam = caja.getSize(new THREE.Vector3());
  const mayor = Math.max(tam.x, tam.y, tam.z);
  if(mayor > 0.001) factor = escala * (ICONOS_DIM_OBJETIVO / mayor);
}
```

Se mide **después** de corregir el pivote, y **multiplica** la escala del catálogo en vez de
reemplazarla, para que un ícono que algún día pida su propia `escala` la siga respetando sobre la
medida ya normalizada. Para volver a la escala tal cual la entrega el proveedor:
`ICONOS_DIM_OBJETIVO = 0`.

**Qué corrige y qué no.** Empareja cuánto espacio ocupa cada ícono en el anillo — que es lo que el
ojo lee como "tamaño" con cámara ortográfica fija — y el ajuste resultó chico: entre 1,00× y 1,26×,
con cinco íconos sin tocar. **No** iguala alturas, y no pretende hacerlo: un access point sigue
siendo chato y un rack sigue siendo alto, que es como se leen en la realidad. Si lo que molestaba al
vendedor era específicamente la altura, esto no lo resuelve y hay que hablarlo con el proveedor.

### Escena 3D (§3D y §5)

`ICONOS_GLB` suma `pantalla`, `documento`, `puerta` y `antena`. Igual que en v18 y v20, **agregar la
entrada al mapa no alcanza**: cada builder de `AssetRegistry` tiene que pedirle su modelo a
`IconLibrary` explícitamente, o el `.glb` se carga, `IconLibrary.estado()` dice `listo` y la escena
sigue dibujando la primitiva sin ningún aviso. Los cuatro builders quedaron con el mismo patrón que
los siete anteriores.

Tres de los cuatro diseños aprobados **ya no son lo que nombra su assetKey**, igual que pasó con
`llave` y `muro` en v18. Se anotó en cada builder, porque es lo primero que confunde al leer el código:

| assetKey | Lo que nombra | Lo que el proveedor entregó |
| --- | --- | --- |
| `pantalla` | Una pantalla | Tres participantes y una cámara central |
| `puerta` | Un arco de 2 postes y dintel | El mismo access point de `antena` + una credencial translúcida |
| `antena` | Access point con 2 antenas | Access point con **aros de cobertura**, sin antenas |

El nombre se conserva por compatibilidad con el catálogo: el sufijo de `pn_ico_` tiene que coincidir
carácter por carácter con el `assetKey` (v2 §6.6), y eso es lo que permite que agregar un producto
siga siendo una línea en `SUBPRODUCTOS`.

Un detalle del `LEEME.md` que vale registrar: los aros son **bandas planas de doble cara**, no tubos
—ahorran polígonos— y **se ven mal mirados exactamente a ras**. Con la cámara ortográfica elevada de
la app eso no pasa, pero lo hace un mal candidato para cualquier vista rasante futura.

### Panel izquierdo: los cuatro SVG del proveedor (§6)

`ICONS_SVG.pantalla`, `.documento`, `.puerta` y `.antena` pasan de los pictogramas genéricos de 24 px
al lineup aprobado de 128 px. Se retira de los cuatro el atributo **`color="#DCE361"`**, por el mismo
motivo que en v20: es un atributo de presentación sobre el propio elemento, y un `color` heredado del
contenedor **pierde** contra él.

**El SVG de Conferencia necesitó más que eso, y conviene ser preciso porque el síntoma habría sido
idéntico al de v20 pero la causa es otra.** Llegó como export de Adobe Illustrator: 43 KB, de los
cuales 42 eran metadata (`<i:aipgf>` en base64), y —lo que importa— el color no estaba en
`currentColor` sino en un `<style>` interno:

```css
.st0, .st1 { fill: #dce361; }
```

Una clase definida dentro del propio SVG le gana a la propiedad `color` heredada del contenedor, así
que el ícono habría quedado lima fijo en el panel, ignorando el color de catálogo que
`renderCatalogPanel()` pone en el `<span class="catalog-producto-icon">`. Se reescribió a
`fill="currentColor"` conservando los mismos paths; el `fill-rule="evenodd"` del cuerpo de la cámara
es lo que abre el hueco del lente y no se puede perder. Quedaron dos verificaciones nuevas en los
smoke tests para que una regeneración futura desde el archivo del proveedor no lo reintroduzca.

Diferencia entre los cuatro, que conviene saber al revisarlos: `pantalla` se dibuja con **relleno**
(`fill="currentColor"`, como `nube` en v20); `documento`, `puerta` y `antena` con **trazo**
(`stroke="currentColor"`, como los cinco de v18), aunque `puerta` mezcla los dos: los aros y el
equipo van con trazo y la credencial con relleno.

### Archivos

```
index.html                     ← sin cambios
css/styles.css                 ← sin cambios
assets/glb-iconos/             ← + pn_ico_pantalla.glb, + pn_ico_documento.glb,
                                 + pn_ico_puerta.glb, + pn_ico_antena.glb
js/iconos-glb.js               ← regenerado (7 → 11 íconos, 293 KB originales)
js/functions.js                ← §3D: ICONOS_GLB (+4), ICONOS_DIM_OBJETIVO y normalización en
                                       prepararPlantilla(), nota sobre los 4 slots de `puerta`
                                  §5: builders pantalla, documento, puerta y antena consultan IconLibrary
                                  §6: ICONS_SVG de los 4 (lineup 128, sin color=, pantalla reescrito)
js/smoke-test-iconos.js        ← 47 → 62 verificaciones
```

Sin cambios: catálogo, estado, conexiones, Concentrador, herencia, Salud, reporte, JSON exportado
(sigue en `version: 14`), `ModelLibrary`, `Brillo`, piso y reflejos, `materialesDeColor()`.

## Verificación

- **`js/smoke-test-iconos.js`: 62/62.** Nuevas de esta fase: los 4 assetKeys reemplazan su primitiva;
  los 4 slots de `puerta` llegan como mallas separadas; el lima del archivo no llega a la escena;
  los 11 quedan en la misma dimensión mayor y ninguno se pasa de 0.6 al normalizar; ningún SVG del
  lineup trae `<style>`, `fill` de color fijo ni metadata de Illustrator.
- **`js/smoke-test-modelos.js`: 47/47**, sin regresiones.
- **`js/smoke-test-brillo.js`: 29/30** — el que falla es el de la etiqueta de versión de
  `index.html` (espera v41, el archivo dice v42). **Preexistente**, es el Pendiente 38 heredado; no
  lo toca esta fase.
- **Navegador real** (Chromium, WebGL): sede con los 4 íconos nuevos más `rack` y `escudo` para
  comparar tamaños. **Cero errores y cero advertencias de consola.** Los 11 SVG del panel se tiñen
  con el color de su producto en los tres tintes de familia probados.

## Pendiente de validación con el cliente final

Heredado sin cambios: puntos 1–16 de `…v12.md` a `…v15.md`, 19–21 de
`assets-3d-listado-y-especificaciones-v2.md`, 22, 24–27 de `…v16.md`, 23, 28, 29 de `…v17.md`,
30–32 de `…v18.md`, 33–38 de `…v19.md`, y 40–41 de `…v20.md`.

**Cerrado en esta fase:** el punto **39** (armonización de tamaño entre tandas), por la normalización
por dimensión mayor descrita arriba — con la salvedad de que empareja el espacio ocupado, no la altura.

Nuevo de esta fase:

42. **`puerta` y `antena` no se distinguen a 32 px.** Es la prueba de aceptación de v2 §6.8 punto 9,
    y es el único punto del checklist que esta tanda no pasa. Los dos comparten el equipo y los aros;
    `puerta` es `antena` más una credencial de 20 px de alto sobre un lienzo de 128. A 128 px se
    distinguen sin esfuerzo; a 32 px —que es el tamaño real en el panel izquierdo— la credencial es
    un borrón y quedan dos íconos iguales, uno al lado del otro, en la misma vertical. El `LEEME.md`
    lo declara como decisión de diseño (*"mismo equipo y aros, construidos con idénticas medidas"*),
    así que no es un error de ejecución sino algo a confirmar con el cliente. Si molesta, lo más
    barato es pedirle al proveedor que agrande la credencial o le cambie la silueta al portal; no es
    algo que convenga parchear por código.
43. **La profundidad sigue dispar, y ahora en el otro extremo.** `antena` y `puerta` ocupan los 0.58
    completos en X y en Z (son los aros); `documento` y `pantalla` son casi planos (0.19 y 0.10).
    Con cámara isométrica fija eso cambia cuánto "cuerpo" muestra cada uno, igual que señalaba el
    punto 41 de v20 — pero ahora hay íconos que ocupan el piso entero de su celda y otros que casi
    no lo tocan. Es la misma conversación que 39 y 41 y conviene tenerla junta.
44. **El master `.blend` del proveedor quedó fuera del repositorio.** v2 §6.7 pide entrega sin
    subcarpeta de fuentes, así que es correcto, pero `colaboracion_master.blend` es el único lugar
    donde viven las mallas editables de esta tanda y está solo en el Drive del proveedor. Vale
    confirmar quién lo custodia antes de necesitar un retoque.

## Fuera de alcance

- **Los 4 assetKeys restantes** (`enlace`, `nodo`, `globo`, `firewall_virtual`): siguen con
  primitiva. Los tres primeros esperan su tanda; `firewall_virtual` está excluido del lineup por
  decisión del proveedor desde v18.
- **Íconos de Nivel 3** (v2 §4): sin cambios, sigue siendo fase 2.
- **Recalibración de la paleta del catálogo** (v2 §7.2 punto 10): sin cambios — y con una vertical
  más teñida por el mismo camino, sigue siendo el pendiente de fondo.
- **Reflejo de los íconos de producto en el piso** y **bloom en los íconos**: los dos siguen
  excluidos a propósito (v19 y v17). Vale anotarlo acá porque los aros de `antena` y `puerta` son
  `mat_glow` y son lo más parecido a neón que tiene el lineup: sin bloom se ven como líneas
  brillantes, no como el halo del render del proveedor. Es esperado.
- **Corregir la ruta de los smoke tests para que corran desde `js/`**: sigue sin tocarse. Los tres
  archivos hacen `R = __dirname` y asumen la raíz del proyecto, así que hay que copiarlos ahí para
  correrlos.
