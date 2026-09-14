# Mockup Fase 1 — actualización v46 (prototipo v46)

**Pedido del cliente (14/09/2026), dos puntos:**

1. Sedes, Matriz y Datacenter se ven chicos. Agrandarlos.
2. Los productos que se agregan tienen que verse **como parte del edificio**, no flotando al lado
   — con las láminas del proveedor como referencia. Sobre Ciberseguridad, textual: *"como puedes
   ver rodean/abrazan al edificio. Acceso está justamente como una puerta que protege en la ruta
   de conexión"*.

Ambos cambios están hechos y verificados. Lo único que queda abierto es una colisión de grilla que
el punto 1 destapa y que **no** se puede resolver sin tocar `GRID_SPACING` — ver Pendiente 52.

---

## 1. Escala de las entidades: 1.5 → 1.9

`MODELOS_ESCALA` pasa de **1.5 a 1.9** (+27% lineal). El cliente eligió explícitamente subir la
escala **sin tocar la grilla**, así que `GRID_SPACING` sigue en 4 y la cámara sigue con
`FRUSTUM = 22`: las entidades ganan presencia en pantalla en vez de que la escena entera se aleje.

Medidas resultantes (envolvente del `.glb` × escala):

| Entidad | v45 (×1.5) | v46 (×1.9) |
| --- | --- | --- |
| Sede Pequeña | 1.20 × 0.57 × 0.83 | 1.52 × 0.73 × 1.05 |
| Sede Mediana | 1.50 × 0.81 × 0.98 | 1.90 × 1.03 × 1.25 |
| Sede Grande | 1.80 × 0.90 × 1.07 | 2.28 × 1.14 × 1.35 |
| Matriz | 3.00 × 1.62 × 1.75 | 3.80 × 2.05 × 2.22 |
| Nube | 1.35 × 0.92 × 0.77 | 1.71 × 1.16 × 0.98 |
| Datacenter | 4.35 × 1.36 × 1.85 | **5.51 × 1.72 × 2.34** |

No hubo que tocar ningún otro número: halos, hitboxes, puertos y etiquetas ya se calculaban contra
`userData.dims`, que sale del modelo ya escalado. Los radios fijos que quedan (hitbox de Matriz
r=2.3, halo r=2.5, hitbox de Nube r=1.4) siguen conteniendo su modelo con margen a 1.9.

---

## 2. Los íconos dejan de flotar: colocación por relación con el edificio (§3E, nuevo)

### El diagnóstico

Hasta v45 **todos** los íconos usaban el mismo layout: un anillo horizontal de radio
`TAMANOS_LOCAL[].assetRadius`, a la altura `dims.h + 0.35` — es decir, **por encima del techo y
por fuera de la planta**. Da igual qué producto sea: escudo, candado o rack quedaban todos
colgados en el mismo aro. Por eso se leen como objetos sueltos puestos al lado de la sede.

Al medir los íconos contra la lámina *"Revisión de protecciones"* apareció lo importante: **los
cinco paneles de la lámina son exactamente nuestros cinco `.glb` de Ciberseguridad**, en el mismo
orden del mapa `ICONOS_GLB`. Lo que cambia entre la lámina y la app no son los assets: es **dónde
está puesto cada uno respecto del edificio**. Y esa posición es parte del significado del producto:

| Panel | assetKey | Relación con el edificio |
| --- | --- | --- |
| 1. Perimetral · Interceptar | `escudo` | Los brackets **abrazan** el edificio a ras de piso |
| 2. End Point · Supervisar | `candado` | Los aros **envuelven** el cuerpo a su misma altura |
| 3. Acceso · Autorizar | `llave` | El arco se planta **sobre la ruta del cable**, a cruzar |
| 4. Aplicación · Filtrar | `muro` | El panel se monta **contra la fachada** |
| 5. Firewall Físico · Equipar | `firewall_onpremise` | El equipo se **apoya en la plataforma** |

Y la lámina de Conferencia confirma el mismo criterio para Colaboración: el ícono va **semihundido
en la pared**, no delante de ella.

### La solución

Por eso el reemplazo del anillo es una **tabla por `assetKey`** (`COLOCACION_ICONOS`) y no un
layout nuevo: no existe una posición "correcta" común a los 14. Seis modos:

| Modo | Qué hace | Lo usan |
| --- | --- | --- |
| `envolver` | Centrado en planta y **a la altura del cuerpo** (no apoyado: apoyarlo lo deja flotando arriba) | `candado` |
| `abrazar` | A ras de piso, escalado a la huella del cuerpo | `escudo` |
| `portico` | Sobre la ruta del cable, del lado del puerto, girado para que el cable lo atraviese | `llave` |
| `fachada` | Contra una pared, **hundido el 45% de su fondo**, centrado en altura | `muro`, `pantalla`, `documento` |
| `plataforma` | Apoyado en el plinto, pegado a la pared, repartido por las 4 caras | `firewall_onpremise`, `rack`, `puerta`, `enlace`, `nodo`, `firewall_virtual` |
| `cubierta` | Sobre el techo — lo que "está en la nube" o irradia, no sobre el piso | `nube`, `globo`, `antena` |

Todo se calcula contra `dimsEntidad()`, así que sigue funcionando si cambia `MODELOS_ESCALA` o si
el proveedor entrega un modelo con otra proporción. Las dos proporciones que el `.glb` **no**
declara y hay que estimar quedaron como constantes con nombre: `PLATAFORMA_ALTO_REL = 0.16`
(cuánto de la altura es el plinto) y `PLATAFORMA_CUERPO_REL = 0.72` (cuánto de la huella ocupa el
cuerpo). Son las dos perillas a tocar si una tanda futura cambia la proporción de las plataformas.

### Reparto cuando hay varios productos

`envolver`, `abrazar` y `portico` son de **ocupación única**; `fachada` tiene 4 huecos (las 4
paredes). El que no entra cae a `plataforma`, que no se agota: reparte entre las 4 caras —una por
cara antes de poner una segunda— y corre lateralmente a los que comparten pared. El orden de las
caras arranca por la frontal y la derecha, que son las dos visibles sin orbitar.

### Tres detalles que costaron y conviene no volver a romper

1. **Rotar primero, medir después.** Los modos que apoyan contra una cara giran el ícono y recién
   entonces miden su envolvente. Midiendo antes, la "profundidad" que se usa para hundirlo en la
   pared es la del `.glb` tal como vino, y los íconos de las caras laterales quedan hundidos de más
   o despegados. `medidaAsset()` fuerza `updateMatrixWorld(true)` porque el ícono todavía no cuelga
   de la escena y `Box3` solo actualiza la matriz del objeto, no la de sus hijos.
2. **El plinto sobra poquísimo.** En los modelos del proveedor la plataforma sobresale del cuerpo
   apenas ~0.19 por lado en Z. Un ícono escalado solo por altura se sale del plinto y queda en el
   aire; acotado al plinto, se mete **dentro** del edificio. El compromiso: se acota la huella al
   45% del lado corto y, si aun así no entra, se le permite volar sobre el borde antes que
   atravesar la pared (solapa como mucho el 15% de su fondo).
3. **El `portico` choca con el puerto (+).** El sprite del puerto vive en `w/2 + 0.28`. Si el arco
   se planta a esa misma distancia, se superponen y no se lee ninguno de los dos; va por fuera.

### `firewall_virtual`

Es el único de los 15 sin modelo (excluido del lineup por el proveedor, v2 §3 B8) y sigue con su
primitiva escudo+anillo. Quedó **explícito** en la tabla como `plataforma`, no como `abrazar`: la
primitiva es un cono alto, no los brackets anchos del escudo real, y `abrazar` la deformaría.

---

## Archivos

```
index.html                     ← v45 → v46 (título y etiqueta)
css/styles.css                 ← sin cambios
js/functions.js                ← §3D: MODELOS_ESCALA 1.5 → 1.9
                                  §3E (nueva): COLOCACION_ICONOS, geometriaEntidad, medidaAsset,
                                       escalarPorAltura/Huella, CARAS_ENTIDAD, huecoPerimetral,
                                       medidasCara, colocarAsset
                                  §3E: refreshSedeAssets reescrita (2 pasadas: repartir huecos,
                                       después construir y colocar)
js/smoke-test-modelos.js       ← aserción del anillo flotante reemplazada por la de v46 (47 → 48)
js/smoke-test-brillo.js        ← etiqueta de versión (v45 → v46)
js/smoke-test-iconos.js        ← sin cambios
assets/, js/modelos-glb.js, js/iconos-glb.js ← sin cambios
```

Sin cambios: catálogo, estado, conexiones, Concentrador, herencia, Salud, reporte, JSON exportado,
materiales, bloom, piso y reflejos, fallbacks a primitivas. **Ni un estilo inline nuevo** — la
colocación es geometría WebGL, no estilo del DOM, igual que la paleta de las entidades (§3D).

`TAMANOS_LOCAL[].assetRadius` quedó **sin uso**: era el radio del anillo viejo. Se dejó en su lugar
para no tocar el resto del bloque en esta versión; es candidato a limpieza.

## Verificación

- **Los tres smoke tests en verde: 73/73 íconos, 48/48 modelos, 41/41 brillo (162/162).** El de
  modelos pasa de 47 a 48: la aserción `anillo de productos a altura del modelo + 0.35` —que
  codificaba justamente el comportamiento que el cliente pidió cambiar— se reemplazó por dos: que
  End Point quede centrado en planta y por debajo del techo, y que **ningún** ícono de la sede
  supere la altura del modelo. Es la aserción que impide volver al anillo sin darse cuenta.
- **Navegador real** (Chromium con WebGL): los 5 productos de Ciberseguridad uno por sede, más
  Conferencia, más una escena mixta con sedes de 3 y 4 productos, Matriz, Nube y Datacenter.
  **Cero errores de consola.** Capturas en `Claude outputs/v46-colocacion-iconos.png` y
  `Claude outputs/v46-antes-despues.png`.
- **Contraste contra la lámina:** los cinco paneles de *"Revisión de protecciones"* se reproducen
  con los assets y las proporciones que hay hoy. El que menos se parece es Perimetral, por una
  razón de proporción del modelo, no de colocación — ver Pendiente 53.

## Pendiente de validación con el cliente final

Heredado sin cambios: puntos 1–16 de `…v12.md` a `…v15.md`, 19–21 de
`assets-3d-listado-specs-tecnicas.md`, 22, 24–27 de `…v16.md`, 23, 28, 29 de `…v17.md`, 30–32 de
`…v18.md`, 33–37 de `…v19.md`, 40–41 de `…v20.md`, 42–44 de `…v21.md`, 45–48 de `…v22.md` y 49–51
de `…v23.md`.

Nuevo de esta fase:

52. **Con escala 1.9 y la grilla en 4, una Matriz pegada al Datacenter se superpone.** Es el caso
    que anticipaba el comentario de v16 ("con 1.8 el Datacenter pisa a una Matriz puesta al lado"),
    y ahora es real: el Datacenter mide 5.51 de ancho (media = 2.75) y la Matriz 3.80 (media =
    1.90); juntas piden **4.65** y la celda da **4.00**. En la práctica las dos plataformas se
    funden en una sola losa — ver `Claude outputs/v46-datacenter-vs-matriz.png`.
    **No hay arreglo posible sin tocar la grilla**, porque para que no se pisaran el Datacenter
    tendría que bajar a escala ~1.45, o sea **más chico que en v45**, que es lo contrario de lo
    pedido. Las dos salidas, ambas de una línea: `GRID_SPACING = 5` (la escena ocupa más mundo y
    conviene subir `FRUSTUM` para que siga entrando toda), o marcar como ocupadas las dos celdas
    laterales del Datacenter en `occupied()`. **Decisión del cliente.** El resto de las vecindades
    entran: Datacenter + Sede Grande pide 3.89 y Matriz + Matriz 3.80.
53. **Perimetral es el que menos se parece a su panel de la lámina, y es un problema de
    proporción, no de posición.** Los brackets del `escudo` miden 0.287 de alto sobre 0.58 de
    huella (relación 0.50); nuestras sedes son más chatas que el edificio de la lámina (0.96 de
    cuerpo sobre 1.64 de huella, relación 0.59). Escalado uniformemente para abrazar el cuerpo,
    los brackets llegan casi hasta el techo, mientras que en la lámina cubren poco más de la mitad.
    Cerrar esa diferencia exige **escalado no uniforme** (achatar el ícono en Y), que deforma el
    asset del proveedor — por eso no se hizo. Alternativa limpia: pedir el `escudo` más bajo.
54. **La lámina translúcida del `escudo` ahora se ve, y antes no.** Al abrazar el edificio, el
    `mat_translucido` del `.glb` queda atravesándolo de lado a lado. Se lee razonablemente como
    "barrera que intercepta" —coherente con *Perimetral · Interceptar*—, pero es un efecto que
    nadie decidió: aparece como consecuencia de la nueva colocación. Si molesta, la perilla es la
    opacidad de ese slot en `IconLibrary.materialesDeColor()`.
55. **`plataforma` está resuelto para 4 productos por cara, no para 8.** El quinto ícono de ese
    modo empieza una segunda fila corrida lateralmente, y a partir de ahí el resultado depende
    mucho del ancho de cada uno. Con los catálogos reales que se probaron (hasta 4 por sede) no se
    ve; conviene mirar una sede cargada al máximo antes de la demo.

## Fuera de alcance

- **`pn_ent_plataforma.glb` (A7)**: sin cambios; sigue siendo el pedido de asset más rentable que
  queda. Con v46 gana un motivo más: hoy `PLATAFORMA_ALTO_REL` y `PLATAFORMA_CUERPO_REL` son
  estimaciones porque el plinto y el cuerpo vienen en **una sola malla**; con A7 como pieza
  separada, la colocación mediría el plinto real en vez de estimarlo.
- **`firewall_virtual`**: sigue con su primitiva, por decisión del proveedor (v2 §3 B8).
- **Íconos de Nivel 3** (v2 §4): sigue siendo fase 2.
