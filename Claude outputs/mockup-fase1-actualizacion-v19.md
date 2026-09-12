# Mockup Fase 1 — Configurador de Infraestructura (Actualización v19)

> **v19 — actualiza a `mockup-fase1-actualizacion-v18.md` (v18: primera tanda de íconos de
> producto en `.glb`).** Esta fase cierra dos pendientes viejos de `assets-3d-listado-y-especificaciones-v2.md`
> —el environment map que faltaba en los íconos (§7.2 punto 7) y el piso con reflejo (§7.3 punto
> 13)— y aplica dos pedidos de encuadre del cliente: la cámara arranca 50% más cerca y el
> Datacenter Epicentro pasa de 5 a 2 celdas detrás del centro. Todo el cambio vive en
> `functions.js`; `css/styles.css` e `index.html` **no cambian**.
> Prototipo: **sigue etiquetado v42** — ver Pendiente 38.

## El origen

Dos pedidos que llegaron por separado y terminaron tocando la misma zona del código.

**El primero fue del cliente, sobre el aspecto:** pidió "más efectos tipo HDRI o algo de reflejos
en los modelos 3D". Al revisar el estado real, el diagnóstico fue que el pedido ya estaba a medio
camino y mal repartido:

- Las **entidades** (las 6 de `ModelLibrary`) sí tenían environment map desde v16:
  `crearEntornoMetal()` arma por código una "sala" —cúpula con degradado azul marino + paneles que
  hacen de softbox— y la hornea con `PMREMGenerator`. Eso es lo que les da los filos de luz sobre
  los biseles.
- Los **íconos de producto** (`IconLibrary`, §3D, nueva en v18) **no tenían environment map**. Sus
  materiales se crearon con `metalness`/`roughness` pero sin `envMap`, así que por más metálico
  que fuera el material no reflejaba nada: sin entorno, un `MeshStandardMaterial` metálico solo
  puede devolver la luz directa. Son los ~150 objetos que más mira el vendedor, y eran justo los
  que se veían planos.
- El **piso reflectante** (v2 §7.3 punto 13) seguía sin existir. Estaba listado como "fuera de
  alcance" en v16, v17 y v18. La escena no tenía piso: solo un `THREE.GridHelper` sobre el fondo
  transparente del canvas.

**El segundo fue de encuadre**, también del cliente, en dos tiempos: "que todos puedan crecer un
50%" y "el Epicentro, en vez de estar 5 cuadrados atrás, probemos con 3" — y, viendo esa prueba,
"son dos cuadrados de distancia".

## Qué cambió

### Environment map compartido entre entidades e íconos (§3B y §3D)

`crearEntornoMetal()` no cambió de idea, sí de alcance y de dueño. Antes lo llamaba
`ModelLibrary.materialesDe()` y el resultado quedaba en una variable privada de ese IIFE, fuera del
alcance de `IconLibrary`. Ahora hay un cache a nivel de módulo:

```js
let entornoMetalCache = null;
function obtenerEntornoMetal(){
  if(entornoMetalCache === null) entornoMetalCache = crearEntornoMetal() || false;
  return entornoMetalCache || null;
}
```

El `false` (en vez de `null`) es deliberado: marca "ya se intentó y no se pudo", así un renderer
sin soporte —el doble de los smoke tests, por ejemplo— no reintenta generar el entorno con cada
material nuevo que se crea. La textura se genera **una sola vez** para toda la app: los íconos no
pagan un segundo `PMREMGenerator`.

Al entorno se le sumó un cuarto panel, angosto y casi blanco (`panel(0.6, 5, 0xf3f8ff, 6, 4, -6)`),
que es el que se lee como línea de luz nítida sobre un borde biselado; el blur de horneado bajó de
`0.035` a `0.03`. Los materiales quedaron así:

| Material | Antes | Ahora |
| --- | --- | --- |
| `MODELO_METAL` (entidades) | `roughness 0.3`, `envMapIntensity 1.0` | `roughness 0.28`, `envMapIntensity 1.4` |
| Ícono `base` | `metalness 0.55`, `roughness 0.4`, sin envMap | `metalness 0.6`, `roughness 0.32`, `envMapIntensity 1.1` |
| Ícono `glow` | `metalness 0.1`, `roughness 0.35`, sin envMap | `metalness 0.15`, `roughness 0.3`, `envMapIntensity 0.8` |
| Ícono `translucido` | `roughness 0.5`, sin envMap | `roughness 0.25`, `envMapIntensity 1.2` |
| Ícono `receso` | `metalness 0.2`, `roughness 0.75` | **sin cambios, y a propósito sin envMap** |

`receso` es el único que queda afuera: representa un hueco o una sombra, y un reflejo ahí
contradice la lectura de "hundido" que es justamente para lo que el proveedor separó ese slot.

### Piso oscuro con reflejo falso (`functions.js` §3A-bis, nueva)

Resuelve la primera mitad de v2 §7.3 punto 13. Dos piezas:

**El piso.** Un `CircleGeometry(60, 48)` oscuro (`0x05070d`), semitransparente (`opacity 0.55`,
`depthWrite:false`), apenas por debajo de la grilla (`y = -0.02`, para no pelear z-fighting con sus
líneas). Es semitransparente y no opaco a propósito: el canvas se crea con `alpha:true` y el fondo
real lo pone el degradado de `css/styles.css`, así que un piso opaco habría tapado ese fondo en vez
de sumarse a él. **Tiene el raycast anulado** (`piso.raycast = function(){}`) porque
`onPointerDown` resuelve contra `scene.children` recursivo: sin eso, el piso habría empezado a
interceptar clics que hoy se resuelven contra un plano matemático, y "clic en el vacío para
deseleccionar" habría dejado de funcionar.

**El reflejo.** Copias espejadas (`scale.y = -1`) de cada entidad, translúcidas, en un grupo
propio (`reflejosPiso`). Es el camino barato que recomienda la propia especificación —"empezar por
reflejo falso, mucho más barato que `Reflector`; medir antes de subir"—: **no** hay segunda cámara
ni segundo render de la escena.

Cuatro decisiones que vale la pena dejar escritas, porque cada una tapa un problema concreto:

1. **Se refleja solo el cuerpo de la entidad, no sus productos.** El clon descarta el hijo
   `assetsContainer` completo antes de agregarse. Es lo que mantiene el efecto barato: reflejar
   también los íconos habría duplicado ~150 objetos en vez de ~20.
2. **Solo las mallas con material `pn_…`.** Dentro del clon, todo lo que no sea un material creado
   por `ModelLibrary.materialesDe()` (`pn_<look>_base` / `pn_<look>_glow`) se oculta: halos,
   hitboxes, puertos, sprites y las primitivas de fallback no se reflejan. Es una lista blanca, no
   una lista negra, así que una pieza nueva no se cuela sola en el reflejo.
3. **`o.layers.disable(CAPA_BRILLO)` en cada malla del reflejo.** `clone(true)` copia la máscara de
   capas, así que el reflejo habría entrado en el paso de brillo (§3C). El problema no es estético
   sino mecánico: `Brillo.renderizarFuente()` apaga el `colorWrite` de los materiales que devuelve
   `ModelLibrary.materiales()`, y los del reflejo son clones que no están en ese registro — habrían
   pasado a la fuente del bloom con color completo, haciendo brillar el cuerpo entero del edificio
   reflejado en vez de solo su línea de neón.
4. **`side: THREE.DoubleSide` en los materiales del reflejo.** El flip en Y invierte el sentido de
   las caras; sin esto el reflejo se ve hueco, con el frente culleado.

**La sincronización se hace por diferencia contra el estado, no por eventos.** `actualizarReflejosPiso()`
corre en `animate()` y compara `todasLasEntidades()` —la misma fuente de verdad que ya usa el resto
del código— contra un `Map(entityId -> { espejo, origen })`: crea los que faltan, actualiza
posición/rotación/escala de los que están, y borra (con `dispose()` de materiales) los que ya no
existen. La alternativa era engancharse a `createSede`, `deleteSede`, `createMatriz`, `deleteMatriz`,
`createNube`, `deleteNube`, `rebuildSedeMeshIfNeeded` y el import de proyecto guardado, uno por uno.
Con el diff, arrastrar una sede, cambiarle el tier, eliminarla o cargar un JSON quedan cubiertos sin
tocar ninguno de esos flujos.

Con una excepción, que sí necesitó un enganche explícito: **no todas las entidades reemplazan su
`.group` al pasar de primitiva a modelo real.** Las sedes, Matrices y Nubes sí (`reconstruirGrupoEntidad`
arma un grupo nuevo), pero `construirDatacenter()` reconstruye los hijos *sobre el mismo objeto*
`datacenterGroup`. El chequeo por identidad (`entry.origen !== entity.group`) no ve ese caso, así
que `aplicarModelosAEscena()` llama a `invalidarReflejosPiso()` al final: tira todos los reflejos y
el frame siguiente los rearma con las mallas ya cargadas. Pasa una vez por tanda de modelos, no por
frame.

`PISO_REFLEJO = { activo:true, opacidad:0.18 }` deja los dos números en un solo lugar, y `activo:false`
apaga el efecto entero sin tocar nada más — es el embrión del interruptor de calidad de v2 §7.3
punto 16, todavía sin UI.

### El reflejo sí aparece en el PDF

Consecuencia que conviene tener presente: v2 §7.4 decidió que "el reporte sale sin efectos, por
ahora", pero eso se implementó como `BRILLO_EN_PDF = false`, que apaga **el post-proceso**. El piso
y los reflejos no son post-proceso: son objetos comunes de la escena, así que `captureHeroSnapshot()`
los fotografía como a cualquier otro. El hero del PDF ahora sale con piso y reflejo, y sin bloom.
No se cambió nada de esto —es consistente con lo que pidió el cliente— pero no estaba previsto en
la decisión de v2 §7.4 y merece confirmarse (Pendiente 36).

### Cámara de entrada 50% más cerca (`ZOOM_INICIAL`)

El pedido era "que todos puedan crecer un 50%". Agrandar los modelos no era viable: eso es
`MODELOS_ESCALA`, que ya está en su tope de `1.5` porque, como documenta v16, con `1.8` el
Datacenter pisa a una Matriz puesta en la celda de al lado. Así que crece la vista, no los objetos:

```js
const ZOOM_INICIAL = 1.5;
```

Lo usan los dos lugares que definen "la vista de entrada": el `applyZoom()` inicial y el botón
**Restablecer vista**. Que los dos lean la misma constante no es cosmética — con el valor duplicado,
el botón habría devuelto al vendedor a un encuadre distinto del que ve al abrir.

Dos cosas que **no** se tocaron, a propósito: `ZOOM_MIN`/`ZOOM_MAX` (`0.4`/`4.5`) siguen igual, así
que alejarse llega exactamente igual de lejos que antes; y el encuadre del snapshot del PDF tampoco
cambia, porque `fitZoomToBox()` calcula su propio zoom para que entre toda la infraestructura y
nunca leyó el zoom de entrada.

Se descartó mover `FRUSTUM` (de `22` a ~`14.7`), que a primera vista da el mismo resultado: `FRUSTUM`
alimenta también el `handleViewportResize()` y el cálculo de `fitZoomToBox()`, así que habría
arrastrado el encuadre del PDF y cambiado el significado de `ZOOM_MIN`/`ZOOM_MAX` de paso.
`camera.zoom` es la perilla que ya existía para esto.

### Datacenter Epicentro a 2 celdas (`DATACENTER_GZ`)

De `-5` a `-2`, en dos pasos: se probó `-3`, el cliente marcó sobre esa captura dónde lo quería, y
quedó en `-2` (world `z = -8`). `-1` se probó y no entra: el edificio y su plataforma se montan
sobre una Matriz puesta en el centro, y las etiquetas "Datacenter Epicentro" y "Matriz 1" se
encliman una sobre otra.

La constante ya estaba bien aislada, así que arrastró sola las otras dos cosas que dependen de
ella: la celda que `occupied()` excluye para sedes (ahora se libera `(0,-5)` y se bloquea `(0,-2)`)
y la Nube automática de Internet, que `getOrCreateNubeInternetAuto()` crea en esa misma fila,
6 celdas a la derecha.

**Ojo con cómo se lee el resultado en pantalla, porque los dos pedidos se pisan:** acercar la cámara
un 50% y a la vez acortar la distancia del Datacenter hace que el hueco en píxeles quede casi igual
que antes (5 celdas × zoom 1 ≈ 20 unidades de pantalla; 2 celdas × zoom 1.5 = 12). Lo que cambió
fuerte es la proporción: medido contra los edificios, que ahora son 50% más grandes, el Datacenter
quedó **2.5 veces más cerca**. La sensación de "no está perdido al fondo" se logra por proporción,
no porque el hueco se achique.

### Archivos

```
index.html                     ← sin cambios (sigue mostrando v42 — ver Pendiente 38)
css/styles.css                 ← sin cambios
js/functions.js                ← §3A-bis nueva (piso + reflejos falsos), obtenerEntornoMetal()
                                  (nueva, con cache), crearEntornoMetal() (4º panel, blur 0.03),
                                  materialesDe() y materialesDeColor() (envMap + intensidades),
                                  ZOOM_INICIAL (nueva, usada por el arranque y por Restablecer
                                  vista), DATACENTER_GZ, aplicarModelosAEscena()
                                  (+ invalidarReflejosPiso)
```

Sin cambios: catálogo, estado, conexiones, Concentrador, herencia, Salud, reporte, JSON exportado
(sigue en `version: 14`), `ModelLibrary`, `IconLibrary` (salvo los materiales), `AssetRegistry`,
`Brillo` y los 3 smoke tests.

## Rendimiento

Ninguno de los cuatro cambios agrega un segundo render de escena ni escala con la cantidad de
íconos, que era la preocupación de fondo de v2 §8 (tablet sin definir):

- **Environment map:** se genera una vez y ahora lo comparten entidades e íconos. El costo en
  runtime de un `envMap` es una consulta de textura por píxel; no depende de cuántos objetos lo
  usen, así que sumarlo a los ~150 íconos no cambia el conteo de draw calls ni de materiales (que
  se siguen cacheando por color de catálogo, v18).
- **Reflejo del piso:** duplica geometría solo de las entidades — ~22 objetos en el peor caso de
  v2 §6.3, contra los ~150 íconos que quedan excluidos. La geometría se comparte con el original
  (`clone(true)` no copia buffers); lo único propio de cada reflejo son los materiales clonados,
  que se liberan con `dispose()` cuando la entidad se elimina.
- **Sincronización por frame:** un recorrido de `Map` sobre ~20 entidades y una copia de
  posición/cuaternión/escala. No hay `clone()` por frame: solo cuando una entidad aparece, se
  reconstruye o se elimina.
- **Zoom y posición del Datacenter:** costo cero, son dos constantes.

Sigue pendiente lo mismo que en v2 §8: medir todo esto en la tablet real, que es lo que decide si
hace falta el interruptor de calidad.

## Verificación

- `node --check` limpio en `functions.js`.
- `smoke-test-modelos.js`: **47/47**.
- `smoke-test-iconos.js`: **39/39** — incluye el chequeo de que ningún ícono entre en `CAPA_BRILLO`,
  que sigue pasando con los materiales nuevos.
- `smoke-test-brillo.js`: **29/30**. El que falla es `index.html muestra Prototipo v41`, y **no es
  de esta fase**: el archivo en el repo sigue validando `v41` mientras `index.html` dice `v42` desde
  v18. La documentación de v18 da ese cambio por hecho ("se actualizó el número de versión que
  valida, de v41 a v42 — único cambio a un archivo de test existente en esta fase") pero el archivo
  del repo no lo tiene. Se deja como está, igual que el resto de las correcciones a tests fuera de
  pedido.
- **WebGL real (Chromium, primera vez en el proyecto).** Se corrió la app en Chromium headless con
  WebGL por software. Nota de método: el sandbox no tiene salida a los CDN, así que `three.min.js`
  se sirvió desde el paquete npm `three@0.128.0` (el mismo r128 que carga `index.html`) interceptando
  la request, y jsPDF se stubeó; el `index.html` no se tocó. Resultados: el environment map se
  genera de verdad (`obtenerEntornoMetal()` devuelve textura, no `false` como en jsdom);
  `ModelLibrary` e `IconLibrary` en `listo`; con Matriz + 3 sedes + Datacenter hay 5 reflejos
  activos, 11 mallas visibles en ellos y 4 ocultas (halos/hitboxes, o sea la lista blanca del punto
  2 funciona); ninguna entidad queda fuera de pantalla con el zoom de entrada; y cero errores de
  consola en todo el recorrido.
- Falta lo mismo que faltaba en v18: revisar los 5 íconos en primer plano contra el render aprobado
  del proveedor, ahora que además reflejan.

## Nota operativa: el proyecto vive dentro de OneDrive

Durante esta fase, `js/functions.js` se revirtió solo **dos veces**: se guardó el archivo, y un rato
después había vuelto a una revisión anterior (la primera vez perdió los dos cambios de encuadre
completos; la segunda volvió a la versión con el Datacenter en `-3`). El proyecto está en
`C:\Users\danaf\OneDrive\Documents\trabajos\Matte\PuntNet\prototipo`, y el patrón es consistente con
la sincronización de OneDrive reescribiendo el archivo local con una revisión de la nube.

Se detectó porque se verificó el archivo en disco *después* de cada guardado, y se reaplicaron los
cambios sobre lo que realmente había (no sobre la copia local de trabajo, para no pisar nada). El
estado final quedó verificado y estable.

Conviene decidirlo antes de seguir iterando: sacar el prototipo de la carpeta sincronizada, o pausar
la sincronización mientras se trabaja. El riesgo no es de esta fase ni de esta herramienta — OneDrive
puede revertir trabajo hecho a mano igual que revirtió esto.

## Pendiente de validación con el cliente final

Heredado sin cambios: puntos 1–16 de `…v12.md` a `…v15.md`, 19–21 de
`assets-3d-listado-y-especificaciones-v2.md`, 22, 24–27 de `…v16.md`, 23, 28, 29 de `…v17.md`, y
30–32 de `…v18.md`.

Nuevo de esta fase:

33. **Intensidad del reflejo del piso.** `PISO_REFLEJO.opacidad = 0.18` y el piso en `opacity 0.55`
    son un punto de partida elegido a ojo sobre la referencia aprobada, no un valor validado. Son
    dos números en un solo objeto si el cliente lo quiere más o menos marcado.
34. **Cuánto reflejo en los materiales.** Las intensidades de la tabla de arriba subieron el reflejo
    sin tocar los colores del catálogo — y la recalibración de paleta (v2 §7.2 punto 10) **sigue
    pendiente**. Es justamente el escenario que advertía esa nota: con más reflejo encima, los tonos
    de N2/N3 elegidos para render plano tienen más chance de lavarse o volverse indistinguibles.
    Hay que mirarlos juntos antes de dar la paleta por buena.
35. **Zoom de entrada 1.5.** Valida bien con 5 entidades en un canvas de escritorio. Falta verlo en
    la tablet real y con un proyecto grande (15 sedes de v2 §6.3): puede que ahí el vendedor tenga
    que alejar la vista apenas entra, y convenga bajarlo a ~1.3.
36. **Piso y reflejo en el hero del PDF.** Ahora salen en el snapshot (ver arriba). La decisión de
    v2 §7.4 —"el reporte sale sin efectos"— se tomó pensando en el bloom; falta confirmar si el
    cliente quiere el reporte también con el piso o prefiere un snapshot limpio (sería apagar
    `reflejosPiso.visible` y `piso.visible` dentro de `captureHeroSnapshot`, unas pocas líneas).
37. **Datacenter a 2 celdas.** Queda confirmar contra lo que marcó el cliente. `-1` está descartado
    por superposición con una Matriz en el centro, así que 2 es lo más cerca que entra con el
    layout actual.
38. **Etiqueta de versión del prototipo.** Sigue en **v42** pese a que esta fase es un cambio visual
    claramente visible, lo que por convención (v16–v18) pediría bumpearla. Se dejó sin tocar a
    propósito: el número es cómo el cliente nombra los builds y conviene que lo decida el equipo,
    no el código. Bumpear es una línea en el `<title>` y una en el `<span class="tag">` de
    `index.html`.

## Fuera de alcance

- **`THREE.Reflector` (reflejo real).** Descartado explícitamente para esta tanda: renderiza la
  escena una segunda vez desde una cámara espejada, y con cámara ortográfica sin culling y ~150
  íconos es el efecto más caro de la lista. Queda para después de medir en la tablet, y detrás del
  interruptor de calidad.
- **Niebla / atenuación de fondo** (v2 §7.3 punto 14): sin cambios, sigue pendiente.
- **Recalibración de la paleta del catálogo** (v2 §7.2 punto 10): sin cambios — ver Pendiente 34.
- **Interruptor de calidad alto/bajo con UI** (v2 §7.3 punto 16): existe `PISO_REFLEJO.activo` y
  `Brillo.activar()`, pero no hay control en pantalla ni detección automática.
- **Reflejo de los íconos de producto en el piso**, y **bloom dentro del reflejo**: los dos quedan
  afuera a propósito (costo el primero, corrección del paso de brillo el segundo).
- Los 10 assetKeys restantes de íconos de producto: igual que en v18.
- Corregir la ruta de los smoke tests para que corran desde `js/`: sigue sin tocarse.

## Criterio de éxito de esta fase

1. Los íconos de producto reflejan el entorno igual que las entidades (antes no reflejaban nada), y
   el environment map se genera **una sola vez** para toda la app.
2. `receso` sigue sin reflejo, como hueco.
3. Cada entidad tiene su reflejo en el piso, y ese reflejo la sigue al arrastrarla, se rehace al
   cambiarle el tier y desaparece al eliminarla.
4. Los productos que orbitan una sede **no** se reflejan, ni tampoco halos, hitboxes ni puertos.
5. El reflejo no intercepta clics ni arrastres, y no participa del bloom.
6. La app abre con la escena 50% más grande, y **Restablecer vista** devuelve exactamente ese mismo
   encuadre.
7. El rango de zoom manual y el encuadre del snapshot del PDF se comportan igual que en v42.
8. El Datacenter Epicentro aparece a 2 celdas del centro, su celda queda excluida para sedes y la
   Nube automática de Internet acompaña el cambio de fila.
9. `smoke-test-modelos.js` 47/47, `smoke-test-iconos.js` 39/39, `smoke-test-brillo.js` 29/30 (el
   fallo de versión heredado de v18).
