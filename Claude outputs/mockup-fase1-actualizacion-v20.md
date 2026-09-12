# Mockup Fase 1 — Configurador de Infraestructura (Actualización v20)

> **v20 — actualiza a `mockup-fase1-actualizacion-v19.md` (v19: environment map compartido, piso
> con reflejo falso, encuadre).** Esta fase integra la **segunda tanda de íconos de producto**
> del proveedor —**Cloud: Housing y Hosting**— en 3D y en el panel izquierdo. `IconLibrary` pasa
> de 5 a 7 assetKeys con modelo real. `css/styles.css` e `index.html` **no cambian**.
> Prototipo: **sigue etiquetado v42** — ver Pendiente 38 (heredado).

## El origen

Llegó el paquete `3D ASSETS / CLOUD` del proveedor: `pn_ico_rack.glb` (Housing) y
`pn_ico_nube.glb` (Hosting), con sus SVG planos, `manifest.json`, `checks.json`, `LEEME.md` y el
render de revisión. Es la tanda hermana de la de Ciberseguridad de v18, y entra por el mismo
camino que aquella dejó abierto.

Con esto, los assetKeys con modelo real pasan de 5 a 7 de 15. Siguen con primitiva: `enlace`,
`nodo`, `globo`, `pantalla`, `documento`, `puerta`, `antena`, `firewall_virtual`.

## Validación del paquete contra la especificación

Se corrió el checklist de `assets-3d-listado-y-especificaciones-v2.md` §6.8 sobre los dos `.glb`,
leyendo los chunks glTF directamente (no confiando en `checks.json`):

| Criterio (v2) | `pn_ico_rack` | `pn_ico_nube` |
| --- | --- | --- |
| Envolvente ≤ 0.6³ (§3) | 0.48 × 0.562 × 0.183 ✔ | 0.58 × 0.389 × 0.132 ✔ |
| Pivote en la base, centrado en X/Z (§6.4) | `Y min = 0`, centrado ✔ | `Y min = 0`, centrado ✔ |
| Triángulos ≤ 1.200 / máx 2.500 (§6.3) | 800 ✔ | 956 ✔ |
| Peso ≤ 45 KB / máx 100 KB (§6.2) | 28 KB ✔ | 31 KB ✔ |
| Exactamente `mat_base` + `mat_glow` (§6.5) | ✔ | ✔ |
| `mat_glow` como geometría separada (§6.5) | ✔ (168 vértices propios) | ✔ (56 vértices propios) |
| Sin cámaras, luces, animaciones, texturas (§6.8) | ✔ | ✔ |
| Y-up, transformaciones aplicadas (§6.1, §6.3) | ✔ | ✔ |

**Tres desvíos, ninguno bloqueante**, y conviene dejar escrito *por qué* no lo son — porque la
razón es la misma en los tres y no es obvia:

1. **Los materiales no vienen en blanco puro.** §6.5 lo exige; el paquete los entrega en el
   celeste de la categoría (`#1C6DBA` aprox.) y con emisión (`KHR_materials_emissive_strength`).
   El `LEEME.md` lo declara a propósito: *"se conserva el acabado aprobado por encima del material
   blanco genérico de la guía"*.
   **No hace falta corregir el archivo** porque `IconLibrary.materialesDeColor()` **descarta el
   material del `.glb` por completo** y crea el suyo a partir del color del catálogo. De la
   entrega solo se lee el **nombre** del slot, para saber qué malla es cuerpo y cuál es glow.
   Consecuencia que sí importa: **el acabado celeste del render del proveedor no llega a la app**,
   y eso es deliberado — los 7 íconos se tiñen por el mismo camino. Se decidió así en esta fase.
2. **`doubleSided: true` y `KHR_materials_emissive_strength`** se ignoran por lo mismo: el primero
   porque el `side` lo define el material del código, el segundo porque r128 no lee esa extensión
   y, aunque la leyera, el material no sobrevive. Está en `extensionsUsed`, no en
   `extensionsRequired`, así que `GLTFLoader` no protesta.
3. **Los nombres de malla son `Housing module` y `Hosting cloud`**, no `malla` como pide §6.4.
   `IconLibrary` no mira nombres de malla, solo de material. Sin efecto.

Un detalle del `manifest.json` que puede confundir en la próxima tanda: reporta
`dimensions_m` en orden **Z-up de Blender** (`[ancho, fondo, alto]`), no en el orden Y-up del
`.glb`. El rack figura ahí como `[0.48, 0.183, 0.562]` y en la escena mide 0.562 de **alto**. Los
archivos están bien; es el reporte el que usa otro eje.

## Qué cambió

### `IconLibrary`: dos assetKeys más (§3D)

Dos líneas en `ICONOS_GLB` y nada más en el módulo — que es exactamente lo que v18 buscaba al
separar el registro de la carga:

```js
rack: { archivo:'pn_ico_rack' },   // Housing (Collocation/Energía, Crossconexión)
nube: { archivo:'pn_ico_nube' },   // Hosting (IaaS, BaaS, DRaaS)
```

`js/iconos-glb.js` se **regeneró** con `node tools/empaquetar-iconos.js` (7 archivos, 173 KB de
`.glb` originales → 231 KB en base64). El archivo es generado: no se edita a mano.

La tanda Cloud usa **solo 2 de los 4 slots** (`mat_base` y `mat_glow`). Los otros dos
—`mat_translucido` y `mat_receso`, que la entrega de Ciberseguridad había agregado— siguen
disponibles y sin usar acá. No hizo falta tocar `materialesDeColor()`.

### `AssetRegistry`: el enganche que faltaba (§5)

Esta es la parte que no es "dos líneas y listo", y es útil anotarla para la próxima tanda:
**agregar un assetKey a `ICONOS_GLB` no alcanza**. Cada builder de `AssetRegistry` tiene que
pedirle su modelo a `IconLibrary` explícitamente:

```js
rack: (color)=>{
  const modelo = IconLibrary.instanciar('rack', color);
  if(modelo) return modelo;
  /* …primitiva de siempre… */
}
```

Sin ese par de líneas el `.glb` se carga igual —`IconLibrary.estado()` dice `listo`— pero la
escena sigue dibujando la primitiva, sin ningún aviso. Es un fallo silencioso: lo detectaron los
smoke tests nuevos, no la carga. Los builders de `rack` y `nube` quedaron con el mismo patrón que
`escudo`, `candado`, `llave`, `muro` y `firewall_onpremise`.

### Panel izquierdo: los dos SVG del proveedor (§6)

`ICONS_SVG.rack` y `ICONS_SVG.nube` pasan de los pictogramas genéricos de 24 px al lineup
aprobado de 128 px, igual que hizo v18 con los cinco de Ciberseguridad. Quedaron agrupados con
ellos, bajo un comentario propio.

Se retira el atributo **`color="#1BAFDE"`** del `<svg>` de origen, y vale la pena ser preciso con
el motivo porque no es una cuestión de prolijidad: es un **atributo de presentación sobre el
propio elemento**, y un `color` heredado del contenedor **pierde** contra el atributo del
elemento. Dejándolo, los dos íconos habrían quedado celestes para siempre, ignorando el color de
catálogo que `renderCatalogPanel()` pone en el `<span class="catalog-producto-icon">` — y habría
sido difícil de diagnosticar, porque el CSS "correcto" estaba ahí y no hacía nada.

Diferencia entre los dos archivos, que conviene saber al revisarlos: `rack` se dibuja con
**trazo** (`stroke="currentColor"`, como los cinco de v18) y `nube` con **relleno**
(`fill="currentColor"` con `fill-rule="evenodd"`; el contorno *es* el relleno). Los dos heredan
el tinte, pero por propiedades distintas.

### Archivos

```
index.html                     ← sin cambios
css/styles.css                 ← sin cambios
assets/glb-iconos/             ← + pn_ico_rack.glb, + pn_ico_nube.glb
js/iconos-glb.js               ← regenerado (5 → 7 íconos)
js/functions.js                ← §3D: ICONOS_GLB (+rack, +nube) y nota sobre el color del archivo
                                  §5: builders rack y nube consultan IconLibrary
                                  §6: ICONS_SVG.rack e ICONS_SVG.nube (lineup 128, sin color=)
js/smoke-test-iconos.js        ← 39 → 47 verificaciones
```

Sin cambios: catálogo, estado, conexiones, Concentrador, herencia, Salud, reporte, JSON exportado
(sigue en `version: 14`), `ModelLibrary`, `Brillo`, piso y reflejos, `materialesDeColor()`.

## Rendimiento

Dos íconos más no mueven ninguna de las agujas que preocupan desde v2 §8:

- **Geometría:** 1.756 triángulos sumados entre los dos modelos, contra un presupuesto de escena
  de 350.000. La geometría se carga **una vez** y se comparte por `clone(true)` entre instancias.
- **Materiales:** ninguno nuevo. El caché es por **color de catálogo**, no por assetKey, así que
  Housing y Hosting reutilizan el set que ya existía para su tono de la vertical Cloud.
- **Peso:** `js/iconos-glb.js` pasa de 156 KB a 231 KB. Va con el instalador, no por red.
- **Reflejo del piso:** sin cambios — los íconos de producto siguen **excluidos** del reflejo
  (v19, decisión 1), así que dos íconos más no agregan copias espejadas.

## Verificación

- `node --check` limpio en `functions.js`.
- `smoke-test-iconos.js`: **47/47** (antes 39/39). Lo nuevo:
  - `rack` y `nube` devuelven malla real y envoltorio `iconoGLB`;
  - los dos slots (`base`, `glow`) llegan como **mallas separadas** — si el proveedor hubiera
    pintado el glow como máscara en vez de geometría propia, acá habría una sola malla;
  - **el celeste del archivo no llega a la escena**: el material toma el color del catálogo;
  - los 7 SVG del lineup usan `currentColor` y ninguno trae `color="#…"`.
  - La lista de "íconos sin `.glb` todavía" pasó de `nodo/globo/rack/nube/pantalla` a
    `enlace/nodo/globo/pantalla/documento`.
- `smoke-test-modelos.js`: **47/47**. `smoke-test-brillo.js`: **29/30** — el que falla sigue
  siendo `index.html muestra Prototipo v41`, heredado de v18 y ajeno a esta fase.
- **WebGL real (Chromium, con el mismo método de v19):** los 7 íconos cargan (`estado: "listo"`,
  cero errores), Housing y Hosting se instancian con `base` + `glow` teñidos desde el catálogo
  (`#3f32b3` y `#6e34ba`, con el glow como variante clara y emisión del mismo tono), y en el panel
  izquierdo el color computado de cada SVG coincide con el del producto —`rgb(119,86,219)` en el
  trazo del rack, `rgb(168,95,221)` en el relleno de la nube—. Cero errores y cero advertencias de
  consola en todo el recorrido.

## Pendiente de validación con el cliente final

Heredado sin cambios: puntos 1–16 de `…v12.md` a `…v15.md`, 19–21 de
`assets-3d-listado-y-especificaciones-v2.md`, 22, 24–27 de `…v16.md`, 23, 28, 29 de `…v17.md`,
30–32 de `…v18.md`, y 33–38 de `…v19.md`.

Nuevo de esta fase:

39. **La altura de los íconos no está armonizada entre tandas.** Medidos con el mismo tinte, los
    7 van de 0.2 a 0.562 de alto:

    | assetKey | ancho | alto | fondo |
    | --- | --- | --- | --- |
    | `firewall_onpremise` | 0.46 | **0.20** | 0.21 |
    | `escudo` | 0.58 | 0.287 | 0.58 |
    | `candado` | 0.58 | 0.357 | 0.52 |
    | `muro` | 0.52 | 0.371 | 0.05 |
    | `nube` (Cloud) | 0.58 | 0.389 | 0.13 |
    | `llave` | 0.36 | 0.507 | 0.10 |
    | `rack` (Cloud) | 0.48 | **0.562** | 0.18 |

    Los 7 cumplen la envolvente de §3 (≤ 0.6³), así que **no es un incumplimiento**: es que la
    especificación fija un techo y no una altura común. En el anillo que orbita una sede, el rack
    se lee **2,8 veces más alto** que el firewall on-premise, y eso el vendedor lo ve como
    jerarquía cuando no la hay. Hay dos caminos: pedirle al proveedor una altura de referencia
    para las tandas que faltan (y un retoque de las dos entregadas), o normalizar por código en
    `prepararPlantilla()` escalando cada plantilla a una altura objetivo. Lo segundo es barato y
    reversible, pero cambia proporciones que el proveedor eligió. **Conviene decidirlo antes de la
    tercera tanda**, no después.
40. **El acabado celeste del proveedor no se usa.** Decidido en esta fase a favor del tinte por
    catálogo, para que los 7 íconos se comporten igual. Si el cliente quería ver Housing y Hosting
    en el celeste del render aprobado, es una excepción en `materialesDeColor()` — pero rompe la
    consistencia y deja dos casos especiales. Vale confirmarlo contra el render que aprobó.
41. **Profundidad muy dispar entre tandas.** `escudo` y `candado` son casi cúbicos (0.58 y 0.52 de
    fondo); `muro`, `nube`, `llave` son casi planos (0.05 a 0.13). Con cámara isométrica fija eso
    cambia cuánto "cuerpo" muestra cada uno. Es la misma conversación que el punto 39 y conviene
    tenerla junta.

## Fuera de alcance

- **Los 8 assetKeys restantes** (`enlace`, `nodo`, `globo`, `pantalla`, `documento`, `puerta`,
  `antena`, `firewall_virtual`): siguen con primitiva, esperando su tanda.
- **Íconos de Nivel 3** (v2 §4): sin cambios, sigue siendo fase 2.
- **Recalibración de la paleta del catálogo** (v2 §7.2 punto 10): sin cambios — y ahora con dos
  familias más teñidas por el mismo camino, sigue siendo el pendiente de fondo.
- **Reflejo de los íconos de producto en el piso** y **bloom en los íconos**: los dos siguen
  excluidos a propósito (v19 y v17).
- **Corregir la ruta de los smoke tests para que corran desde `js/`**: sigue sin tocarse. Los
  tests leen con `__dirname` pero abren rutas relativas a la raíz, así que hay que copiarlos a la
  raíz para correrlos. Es una línea (`const R = path.resolve(__dirname, '..')`) y sigue fuera de
  pedido.
- **Subir la etiqueta del prototipo a v43**: misma decisión que v19 — el número lo elige el
  equipo, no el código.

## Criterio de éxito de esta fase

1. Housing (`rack`) y Hosting (`nube`) se dibujan con su `.glb` en la escena, no con la primitiva.
2. Los dos se tiñen con el color del subproducto del catálogo, igual que los 5 de Ciberseguridad;
   el celeste del archivo no llega a la escena.
3. `mat_base` y `mat_glow` llegan como mallas separadas y toman su material correspondiente.
4. Los dos íconos del panel izquierdo heredan el color del producto (no quedan celestes fijos).
5. Si falta un `.glb`, ese assetKey cae a su primitiva y el resto sigue con modelo.
6. Los íconos de producto siguen sin participar del bloom ni del reflejo del piso.
7. `smoke-test-iconos.js` 47/47, `smoke-test-modelos.js` 47/47, `smoke-test-brillo.js` 29/30 (el
   fallo de versión heredado de v18).
