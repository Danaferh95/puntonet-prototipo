# Assets 3D — Listado y especificaciones técnicas (v2)

> **v2 — reemplaza a `assets-3d-listado-y-especificaciones-v1.md`.** Motivo: el cliente confirmó
> la dirección visual a partir de una imagen de referencia (escena isométrica oscura, materiales
> metálicos, neón azul, piso reflectante, bloom). Eso **cambia cómo se construyen los modelos**,
> no cuáles se necesitan.
>
> Cambios respecto de v1: bisel obligatorio (v1 lo prohibía), dos slots de material en vez de uno,
> presupuestos de polígonos y peso más altos, un asset nuevo (la plataforma), entrega solo en
> `.glb` sin archivo fuente, entrega por etapas con dos pilotos, y una sección de código
> reescrita entera.
>
> **La v1 queda obsoleta. No usarla como referencia para modelar.**
>
> ---
>
> **Revisión del 13/09/2026 (prototipo v43).** Se actualizó **solo la §7** (trabajo del lado del
> código) para que refleje qué está implementado y qué sigue abierto: varias de sus líneas se daban
> por pendientes cuando ya estaban hechas. **El pedido al modelador no cambia** — §1 a §6 y §9 están
> igual que en la versión original, y el nombre del archivo y la numeración de secciones se
> conservan a propósito, porque los docs de tanda v18 a v22 los citan (`v2 §6.5`, `v2 §7.2 punto 10`,
> etc.). Detalle de lo implementado en `mockup-fase1-actualizacion-v22.md`.

---

## 0. El cambio de dirección visual, en una línea

El prototipo v38 se ve **plano**: materiales sin iluminación (`MeshBasicMaterial`) con un wireframe
dibujado encima de cada malla. La referencia aprobada se ve **volumétrica**: metal con reflejos,
emisión separada de la superficie, resplandor y piso espejado.

Esto no es una capa que se enciende sobre lo actual. Es reemplazar el sistema de materiales,
agregar post-proceso y **recalibrar la paleta completa del catálogo** — los colores de N2/N3 están
elegidos para render plano y sobre metal con bloom encima varios se lavan.

Dos cosas que **no** cambian, y conviene repetirlas porque son las que sostienen todo el sistema:

1. **Los modelos siguen llegando en blanco.** El color lo pone el código en tiempo de ejecución,
   desde el catálogo. Un mismo `escudo.glb` se dibuja en todos los tonos de la familia Perimetral.
2. **El wireframe desaparece.** Era la firma visual de v38 y es incompatible con el bisel: sobre
   una arista biselada, `EdgesGeometry` dibuja tres líneas donde antes había una.

---

## 1. Cómo se usan los assets

Hoy **no hay archivos 3D**: cada pieza se arma por código con primitivas dentro de `AssetRegistry`.
El objetivo es reemplazar esas primitivas por modelos reales sin cambiar la arquitectura.

Tres hechos del código que condicionan las especificaciones:

1. **Cada asset se tiñe en runtime.** `AssetRegistry` recibe un `color` que sale del catálogo (N2
   define la familia, N3 varía el tono) y lo aplica al material. De ahí la exigencia de blanco puro.
2. **Cada asset se instancia muchas veces.** Uno por instancia contratada, más una copia
   translúcida al 50% en cada sede que hereda un producto de la Matriz. Un proyecto mediano llega
   a **100-150 íconos simultáneos**.
3. **La cámara es ortográfica y fija** (`FRUSTUM = 22`). Entra toda la escena en pantalla, así que
   no hay culling útil: todo lo que existe se dibuja en cada frame. No hacen falta LODs, pero sí
   hace falta cuidar el conteo total.

---

## 2. Listado A — Entidades y elementos de escena (7 assets, obligatorios)

Medidas en unidades de escena (**1 unidad = 1 metro**). Son envolventes máximas.

| # | Archivo | Entidad | Envolvente (X×Y×Z) | Notas |
| --- | --- | --- | --- | --- |
| A1 | `pn_ent_sede_pequena.glb` | Sede Pequeña (1-19 empleados) | 1.2 × 1.0 × 1.2 | Edificio bajo. |
| A2 | `pn_ent_sede_mediana.glb` | Sede Mediana (20-49) | 1.7 × 1.5 × 1.7 | **Piloto 1** (ver §6.7). |
| A3 | `pn_ent_sede_grande.glb` | Sede Grande (50+) | 2.4 × 2.3 × 2.4 | Las 3 sedes son la misma familia en 3 tamaños, no 3 edificios distintos. |
| A4 | `pn_ent_matriz.glb` | Matriz (casa matriz del cliente) | 2.0 × 2.0 × 2.0 + envolvente animada hasta r≈1.7 | Torre de 3 cuerpos. 4 objetos: `nucleo`, `shell_a`, `shell_b`, `beam`. **Piloto 2**. |
| A5 | `pn_ent_nube.glb` | Nube de proveedor (AWS/Azure/GCP) | 2.0 × 1.9 × 1.4 + base r 1.15 | 2 objetos: `puffs`, `base`. |
| A6 | `pn_ent_datacenter.glb` | Datacenter Epicentro (Puntonet) | 3.0 × 2.25 × 2.2 | El más ancho de la escena. Tiene fachada (mira a +Z). 7 luces nombradas `luz_01`…`luz_07`. |
| **A7** | `pn_ent_plataforma.glb` | **Plataforma base (nueva en v2)** | 2.6 × 0.12 × 2.6 | Disco/rectángulo redondeado con canal perimetral para el neón. Es la base iluminada sobre la que se apoya **cada** nodo de la referencia. **Una sola, compartida**: el código la escala según el tamaño de la entidad. El canal perimetral va en `mat_glow`. |

**A7 es el asset nuevo de la v2.** En la referencia es lo que más aporta al look y es lo que ata
todos los nodos a la grilla del piso. Al ser una sola pieza compartida y escalada por código, no
hace falta una por entidad.

> **Estado al 13/09/2026:** entregados y en escena A1–A6. **A7 sigue sin entregar** y sin
> referencia en el código. Es el pedido pendiente más rentable del listado.

---

## 3. Listado B — Íconos de producto (15 assets, obligatorios)

Uno por `assetKey` del catálogo. Cada uno cubre a todos los subproductos (N3) de su producto (N2),
salvo los que tienen key propia. **Envolvente máxima: 0.6 × 0.6 × 0.6.**

| # | Archivo (`assetKey`) | Producto N2 | Cubre a | Lectura visual |
| --- | --- | --- | --- | --- |
| B1 | `pn_ico_enlace.glb` | Datos | Canal de Conexión, Cloud Interconnect | Tramo de enlace punto a punto, inclinado. |
| B2 | `pn_ico_nodo.glb` | SD-WAN | Sdwan, Túnel IPsec | Nodo de red (poliedro). |
| B3 | `pn_ico_globo.glb` | Internet | Corporativo, Startup, Teleworking, Puntonet Space | Globo con anillos orbitales. |
| B4 | `pn_ico_rack.glb` | Housing | Collocation/Energía, Crossconexión | Rack de servidores apilados. |
| B5 | `pn_ico_nube.glb` | Hosting | IaaS, BaaS, DRaaS | Nube pequeña. Debe distinguirse de A5. |
| B6 | `pn_ico_escudo.glb` | Perimetral | Firewall IaaS y futuros hermanos sin key propia | Escudo. |
| B7 | `pn_ico_firewall_onpremise.glb` | Perimetral (key propia) | Firewall On Premise | Caja de rack con puertos al frente: se lee como equipo físico. |
| B8 | `pn_ico_firewall_virtual.glb` | Perimetral (key propia) | Internet Seguro | Escudo con anillo orbitando: el anillo es el lenguaje de "virtual", igual que en B3. |
| B9 | `pn_ico_candado.glb` | End Point | EDR, XDR, Seguridad Móvil, Correo Electrónico | Candado. |
| B10 | `pn_ico_llave.glb` | Acceso | MFA | Llave: aro, eje, diente. |
| B11 | `pn_ico_muro.glb` | Aplicación | WAF, DNS/DDoS | Muro/barrera con marca en X. |
| B12 | `pn_ico_pantalla.glb` | Conferencia | Conferencia | Pantalla. **Además es el fallback** de cualquier producto sin ícono: tiene que funcionar fuera de contexto. |
| B13 | `pn_ico_documento.glb` | Ofimática | Ofimática | Documento con renglones. |
| B14 | `pn_ico_puerta.glb` | Portal Cautivo | Portal Cautivo | Portal/arco: 2 postes y dintel. |
| B15 | `pn_ico_antena.glb` | Zona Wireless | Zona Wireless | Access point plano con 2 antenas. |

### Criterio de silueta

Los 15 aparecen del mismo tamaño, al mismo tiempo y en el mismo color de familia. Se distinguen
por silueta, no por detalle: en pantalla miden unos 30 px de alto.

**Prueba de aceptación:** renderizar los 15 en fila, monocromáticos, a 32 px. Si dos se confunden,
se rediseña uno.

**Nota de la v2:** con emisión, la silueta importa todavía más. El `mat_glow` de cada ícono debería
reforzar su rasgo distintivo — el ojo de la llave, la ranura del rack, la pantalla del monitor — y
no ser un contorno genérico igual en los 15.

> **Estado al 13/09/2026:** 11 de 15 entregados y en escena. Siguen con primitiva `enlace`, `nodo`,
> `globo` y `firewall_virtual` — este último excluido del lineup por decisión del proveedor.

---

## 4. Listado C — Íconos de Nivel 3 (opcional, fase 2)

Hoy los subproductos heredan el ícono del padre. Funciona, pero deja 4 servicios idénticos
alrededor de una sede en el caso de End Point. Candidatos a ícono propio, por orden de
rentabilidad visual. **No cotizar en la primera tanda.**

| Prioridad | Subproducto | Comparte hoy con | Por qué separarlo |
| --- | --- | --- | --- |
| Alta | Cloud Interconnect | Canal de Conexión | Son los 2 únicos de Datos y van a destinos distintos. |
| Alta | Puntonet Space | Globo (Internet) | Es satelital; ya tiene animación propia de ondas. |
| Alta | EDR / XDR | Candado (End Point) | Los 2 más cotizados de una familia de 4 idénticos. |
| Media | Crossconexión | Rack (Housing) | Es una interconexión, no un rack. |
| Media | BaaS / DRaaS | Nube (Hosting) | Respaldo y recuperación se leen distinto de IaaS. |
| Media | WAF vs DNS/DDoS | Muro (Aplicación) | Son los 2 únicos de Aplicación. |
| Baja | Correo Electrónico, Seguridad Móvil | Candado | — |
| Baja | Internet Startup / Teleworking | Globo | Se diferencian por el nombre en el panel. |

---

## 5. Listado D — Lo que **no** se modela

Queda procedural. Se lista para que nadie lo cotice de más:

- **Cables entre entidades** — `TubeGeometry` sobre curvas calculadas en runtime; la forma depende
  de las posiciones.
- **Partículas viajeras, anillos de onda satelital, badge de Sdwan sobre el cable.**
- **Halos de selección, grilla del piso, marcador de centro.**
- **Puerto de conexión (●)** — sprite generado en canvas 2D, siempre encarado a cámara.
- **Nuevo en v2, y es la parte más importante de esta lista: todo el efecto visual.** El bloom, los
  reflejos del piso, la niebla, el env map, la intensidad del neón y el color son **código**. El
  modelador no entrega nada de eso y no debería intentar simularlo en el modelo.

---

## 6. Especificaciones técnicas

### 6.1 Formato de entrega

| Concepto | Especificación |
| --- | --- |
| **Formato** | **glTF 2.0 binario — `.glb`**, un archivo autocontenido por asset. |
| No aceptar | `.fbx`, `.obj`, `.dae`, `.blend` como entregable. Tampoco `.gltf` + carpeta suelta. |
| Archivo fuente | **No se pide** (cambio respecto de v1). Las correcciones las hace el proveedor. |
| Orientación | **Y-up**, mano derecha (default de glTF y three.js). |
| Unidades | Metros. **1 unidad del modelo = 1 unidad de escena.** |
| Compresión | Draco/meshopt opcional; **recomendación: sin comprimir.** Con la app instalada en tablet el ahorro de descarga no aporta nada y el decoder suma complejidad. |

> **Consecuencia de no pedir el fuente:** cualquier ajuste posterior (bajar polígonos, corregir un
> bisel, cambiar una silueta) hay que pedírselo al proveedor. Con 21 assets y un proveedor único no
> es problema; si en algún momento se cambia de proveedor, los originales quedan del otro lado.

### 6.2 Peso por archivo

Sin texturas, el peso es casi todo geometría. Valores **más altos que en v1** por el bisel.

| Tipo | Objetivo | **Máximo duro** |
| --- | --- | --- |
| Ícono de producto (B1-B15) | ≤ 45 KB | **100 KB** |
| Sede (A1-A3) y plataforma (A7) | ≤ 150 KB | **350 KB** |
| Matriz / Nube / Datacenter (A4-A6) | ≤ 220 KB | **400 KB** |
| **Pack completo (22 assets)** | ≤ 2.5 MB | **4 MB** |

**Sobre el presupuesto de red:** v1 fijaba 3 MB para el primer render. Con la app instalada en la
tablet ese criterio **ya no aplica** — los assets viajan con el instalador. Lo que sigue importando
es la **memoria de GPU**, y esa la gobierna el conteo de polígonos de §6.3, no el peso del archivo.

### 6.3 Polígonos y topología

Caso de carga a soportar: ~15 Sedes + 3 Matrices + 3 Nubes + Datacenter, con 6-8 productos cada
una → **~150 íconos y ~22 entidades simultáneas**, más cables y plataformas. Cámara ortográfica,
sin culling útil, y ahora con post-proceso encima.

| Tipo | Objetivo | **Máximo duro** |
| --- | --- | --- |
| Ícono de producto | 1.200 tris | **2.500 tris** |
| Sede / plataforma | 3.000 tris | **8.000 tris** |
| Matriz / Nube / Datacenter | 6.000 tris | **15.000 tris** |
| **Escena completa, peor caso** | ≤ 350.000 tris | **500.000 tris** |

El presupuesto de escena manda sobre el individual: si los 22 assets llegan todos en el máximo
duro, la escena se pasa. Los objetivos son lo que hay que apuntar; los máximos son la excepción
para las 2-3 piezas protagonistas.

**Reglas de topología (cambian respecto de v1):**

- **Bisel obligatorio.** 0.005-0.01 unidades (0.5-1 cm), **2 segmentos**, en todas las aristas
  exteriores. Es lo que atrapa el filo de luz de la referencia. Sin bisel el modelo se ve plástico.
- **Bisel sí, suavizado no.** Las caras siguen planas y facetadas: **nada de `shade smooth`
  generalizado ni de subdivisión.** Son dos cosas distintas que suenan parecido, y confundirlas es
  el error más caro de esta entrega. El bisel agrega un chaflán chico; el `shade smooth` derrite
  la silueta.
- **Sin n-gons.** Triángulos o quads.
- **Sin caras internas** ni geometría que no se vea desde afuera.
- **Modificadores aplicados** antes de exportar (incluido el bevel).
- **Transformaciones aplicadas**: escala `1,1,1`, rotación `0,0,0`.
- **Normales hacia afuera y consistentes.** Con PBR, una normal invertida se ve como un agujero
  negro; con el render plano de v1 pasaba desapercibida.

### 6.4 Pivote, escala y jerarquía

- **Pivote en el centro de la base**, apoyado en **Y = 0**, centrado en X y Z. Las piezas se
  posicionan por su base, tanto sobre la grilla como en el anillo que orbita cada entidad.
- **+Z hacia el frente.** Importa en el Datacenter (tiene fachada), el rack y el access point.
- **Jerarquía plana**: una sola malla por archivo, llamada `malla`. Excepciones, y solo porque el
  código las anima por separado:

| Asset | Objetos |
| --- | --- |
| A4 Matriz | `nucleo`, `shell_a`, `shell_b`, `beam` |
| A6 Datacenter | `edificio`, `luz_01` … `luz_07` |
| A5 Nube | `puffs`, `base` |
| A7 Plataforma | `base`, `canal` |
| Resto | `malla` |

- **Nada de** cámaras, luces, animaciones, huesos, morph targets, propiedades personalizadas ni
  objetos de referencia. El exportador de Blender los arrastra si están en la escena.

### 6.5 Materiales — **dos slots obligatorios** (cambia respecto de v1)

v1 pedía un material. La v2 pide **exactamente dos**, y esta es la parte donde más fácil se pierde
tiempo, así que va explícita:

| Slot | Qué lleva | Valores |
| --- | --- | --- |
| `mat_base` | El cuerpo del modelo | Blanco puro `#FFFFFF`, `metallic 0`, `roughness 1`, sin emisión, sin alpha |
| `mat_glow` | Ranuras, pantallas, luces, cantos iluminados, el canal de la plataforma | Idénticos valores. **Blanco también.** |

- **Ambos en blanco y sin texturas.** El modelador marca **qué partes** brillan; la intensidad, el
  color y el bloom los pone el código. Un `mat_glow` entregado en azul y con emisión se descarta
  igual: rompe el tinte por catálogo.
- **`mat_glow` debe ser geometría separada**, no una máscara pintada. Caras propias, asignadas al
  slot.
- **Proporción sugerida:** el `mat_glow` no debería pasar del **10-15% de la superficie visible**.
  En la referencia el neón es una línea fina; si ocupa media cara, con bloom encima se convierte en
  una mancha blanca sin forma.
- Si más adelante hacen falta texturas (por ejemplo logos de marca): máximo **512 × 512**, un atlas
  por asset, **en escala de grises** para poder teñirlo, en KTX2 o WebP, ≤ 150 KB. Se cotiza aparte.

> **Nota de implementación (13/09/2026).** Los valores `metallic 0` / `roughness 1` que se le piden
> al modelador son, en la práctica, **decorativos**: el código descarta el material del `.glb` por
> completo y construye el suyo desde el color del catálogo; de la entrega solo se lee el **nombre**
> del slot. Se mantienen en el pedido igual, porque un archivo entregado así es neutro y no induce
> a error al revisarlo en un visor. Lo que **sí** es innegociable son los dos puntos de arriba:
> nombres de slot correctos y `mat_glow` como geometría separada. El código acepta dos juegos de
> nombres — `mat_base`/`mat_glow` (esta especificación) y `metal`/`emissive` (como vinieron las
> primeras entregas) — más dos slots opcionales que aparecieron después, `mat_translucido` y
> `mat_receso`.

### 6.6 Nomenclatura

`pn_{tipo}_{nombre}.glb`, minúsculas, sin tildes, sin ñ, sin espacios:

- `pn_ent_` para entidades y elementos de escena → `pn_ent_sede_pequena.glb`
- `pn_ico_` para íconos de producto → `pn_ico_firewall_onpremise.glb`

El sufijo de `pn_ico_` coincide **carácter por carácter** con el `assetKey` del catálogo (columna 2
de §3). Eso es lo que permite que agregar un producto nuevo siga siendo una línea en `SUBPRODUCTOS`.

Sin `_final`, `_v2`, `_ok` en el nombre: el versionado va en el repositorio.

### 6.7 Entrega por etapas (nuevo en v2)

No se piden los 22 de una. Tres etapas, para que un error de convención se corrija una vez y no
veintidós:

| Etapa | Qué se entrega | Qué se valida |
| --- | --- | --- |
| **Piloto 1** | `pn_ent_sede_mediana.glb` | Carga sin advertencias · pivote en la base (si queda en el centro, el edificio aparece hundido) · escala contra §2 · el blanco acepta el tinte · `mat_glow` separado de verdad · **el bisel se ve como la referencia con nuestra iluminación** |
| **Piloto 2** | `pn_ent_matriz.glb` | Convención de objetos nombrados (`shell_a`, `shell_b`, `beam`) y que el código los anima por separado |
| **Tanda final** | Los 20 restantes | Checklist completo, asset por asset |

Cada piloto se aprueba antes de seguir. Entre el envío y la respuesta no pasan más de 48 h de
nuestro lado.

**Formato de entrega:** una carpeta con los `.glb`. Sin subcarpeta de fuentes. Un `contacto.md`
con el responsable de correcciones.

### 6.8 Checklist de aceptación

1. Abre en un visor glTF estándar sin advertencias.
2. Pivote en `(0,0,0)` con la malla apoyada; transformaciones aplicadas.
3. Envolvente dentro de §2/§3 (±10%).
4. Triángulos y peso bajo el máximo de §6.2 y §6.3.
5. **Exactamente 2 materiales**, `mat_base` y `mat_glow`, ambos blancos y sin texturas.
6. **Bisel presente**, 2 segmentos, sin `shade smooth` ni subdivisión.
7. Normales hacia afuera y consistentes.
8. Sin cámaras, luces, animaciones ni objetos sueltos.
9. Los 15 íconos, en fila y monocromáticos a 32 px, se distinguen entre sí.

---

## 7. Trabajo del lado del código — **estado al 13/09/2026 (prototipo v43)**

> Esta sección se reescribió el 13/09/2026. La versión original listaba 18 puntos de trabajo por
> hacer; abajo van los mismos puntos, con la misma numeración, marcados según su estado real. No es
> parte del pedido al modelador, pero es la mitad más grande del esfuerzo y condiciona el cronograma.
>
> **Resumen: 15 de 18 hechos, 1 a medias, 2 abiertos.** Lo que queda no es infraestructura sino
> decisiones de diseño y calibración contra hardware.

### 7.1 Carga de modelos — **completa**

| # | Punto | Estado |
| --- | --- | --- |
| 1 | Agregar `GLTFLoader` (no viene en el build UMD de r128) | ✅ `js/vendor/GLTFLoader.js` |
| 2 | Precarga en paralelo antes de construir la escena | ✅ |
| 3 | Caché de geometría: cargar una vez, clonar por instancia | ✅ `clone(true)` compartiendo buffer |
| 4 | `AssetRegistry` mantiene su firma `(color) => Object3D` | ✅ sin cambios para el resto del sistema |
| 5 | Fallback a la primitiva si un `.glb` no carga | ✅ estados `listo` / `parcial` / `sin_modelos` |

**Aprendizaje que no estaba previsto y conviene tener a mano:** agregar un assetKey a `ICONOS_GLB`
**no alcanza** — cada builder de `AssetRegistry` tiene que pedirle su modelo a `IconLibrary`
explícitamente. Si falta ese par de líneas el `.glb` se carga, `IconLibrary.estado()` dice `listo`
y la escena sigue dibujando la primitiva **sin ningún aviso**. Es un fallo silencioso; lo detectan
los smoke tests, no la carga.

### 7.2 Sistema de materiales — **completa, salvo la paleta**

| # | Punto | Estado |
| --- | --- | --- |
| 6 | Migrar de `MeshBasicMaterial` a `MeshStandardMaterial` | ✅ entidades e íconos |
| 7 | Agregar un environment map | ✅ sala procedural + `PMREMGenerator`, compartida, y **en HDR** desde v43 |
| 8 | Compartir materiales por color de catálogo | ✅ caché por color, no por instancia |
| 9 | Conservar el clonado del material en heredados (opacidad 50%) | ✅ |
| 10 | **Recalibrar la paleta completa del catálogo** | ⚠️ **a medias** — ver abajo |
| 11 | Retirar el wireframe (`EdgesGeometry`) de entidades e íconos | ✅ |

**Sobre el punto 10, que es el único de esta sub-sección que sigue abierto.** Se resolvió la mitad
mecánica: desde v43 los colores de superficie se convierten de sRGB a lineal, que es donde van en un
pipeline PBR, y eso por sí solo evita que los tintes se laven al subir la intensidad. Lo que **no**
está hecho es el trabajo de diseño: los `hue`/`sat`/`light` de N2/N3 se eligieron contra render
plano, y contra entidades que ahora tienen volumen los íconos se leen planos y demasiado neón. Son
~40 colores fijos y conviene revisarlos de una sola vez, no vertical por vertical.

**Advertencia para quien toque esto:** el pipeline de color es global. Cambiar la curva de salida
mueve **todos** los colores a la vez, incluidos los de interfaz (cables, halos, badges, grilla,
sprites) que se afinaron a ojo contra el degradado CSS del fondo. La compensación ya está armada en
`functions.js` §3A-ter y hay smoke tests que la cubren; conviene leer esa sección antes de tocar
cualquier color.

### 7.3 Post-proceso y escena — **casi completa**

| # | Punto | Estado |
| --- | --- | --- |
| 12 | `EffectComposer` + `UnrealBloomPass` | ✅ bloom **selectivo** por capa, sin composer completo (más barato) |
| 13 | Piso oscuro con grilla y reflejo | ✅ reflejo **falso** (copias espejadas), solo entidades. `Reflector` real sigue fuera a propósito |
| 14 | Niebla / atenuación de fondo | ❌ **abierto** |
| 15 | Emisión de `mat_glow` atada al color, con intensidad configurable | ✅ |
| 16 | **Interruptor de calidad (alto / bajo)** | ❌ **abierto — y es lo próximo que conviene hacer** |

**Sobre el 14.** No es solo activar `scene.fog`. El renderer es `alpha:true` y el fondo lo pone el
degradado CSS de `#canvasWrap`, no la escena, así que la niebla contra un fondo transparente no se
comporta como contra un fondo opaco. Hay que decidir primero si el fondo pasa a la escena.

**Sobre el 16, que pasó a ser el punto más urgente de la lista.** Con PBR, env map HDR, tone mapping
y bloom, la escena pide bastante más GPU que en v38, y los datos de §8 siguen sin respuesta. Hoy
**no hay camino "bajo" que mostrar** si el alto no rinde en la tablet. `BRILLO.activo`,
`BRILLO.resolucion` y `PISO_REFLEJO.activo` ya existen como perillas sueltas; falta juntarlas en un
interruptor y medirlo.

**Agregado en v43, no estaba en la lista original:** el pipeline de color del renderer
(`outputEncoding` + `toneMapping`). Faltaba por completo y era lo que impedía que el env map y el
bisel se leyeran. Detalle en `mockup-fase1-actualizacion-v22.md`.

### 7.4 PDF — **completa, decisión vigente**

| # | Punto | Estado |
| --- | --- | --- |
| 17 | El reporte sale sin efectos, por ahora | ✅ `BRILLO_EN_PDF = false` |
| 18 | Dejar el bypass listo desde el primer día | ✅ `captureHeroSnapshot` pasa por `renderizarFrame()` |

Sigue siendo un booleano. Ojo con un detalle nuevo: desde v43 el snapshot del PDF **sí** lleva tone
mapping y corrección de gamma (son del renderer, no del composer), así que el hero del reporte
ahora coincide con lo que ve el vendedor en pantalla salvo por el halo del bloom.

---

## 8. Pendiente de definir con el cliente

Tres datos que hacen falta para calibrar el rendimiento y que todavía no tenemos. **Siguen sin
respuesta, y con v43 pesan más que antes.**

19. **Modelo exacto de la tablet.** Cambia todo el presupuesto de §6.3. La app instalada resuelve
    la **descarga**, no el **rendimiento**: el bloom y el PBR los calcula la GPU en cada frame, y la
    GPU es la misma esté la app instalada o en el navegador. La ventaja real de conocer el equipo es
    que dejamos de programar para "un móvil genérico" y calibramos contra hardware concreto.
20. **Cómo se empaqueta** (Capacitor, Electron, acceso directo a la web). En un WebView de Android
    el rendimiento no siempre iguala al del navegador y hay que medirlo.
21. **Duración típica de una sesión.** A los 30-40 minutos el equipo se calienta y la GPU baja su
    velocidad sola. Un demo de 2 minutos no muestra ese problema.

Heredado de v1, sin cambios: qué enlaces suman al concentrador, qué entidades lo muestran, y el
tratamiento de canales sin ancho de banda cargado (puntos 14-16 de `mockup-fase1-actualizacion-v15.md`).

---

## 9. Resumen para cotizar

| Tanda | Incluye | Cantidad |
| --- | --- | --- |
| **Obligatoria** | Entidades y plataforma (§2) + íconos de producto (§3) | **22 assets** |
| Opcional fase 2 | Íconos de Nivel 3 (§4), según apruebe el cliente | 6 a 12 assets |
| No aplica | Elementos procedurales y todo el efecto visual (§5) | — |

**Entrega en 3 etapas**: piloto Sede Mediana → piloto Matriz → los 20 restantes.

**Formato:** `.glb` (glTF 2.0 binario), Y-up, metros, sin texturas, **dos materiales blancos**
(`mat_base` y `mat_glow`), **bisel de 2 segmentos**, facetado sin `shade smooth`.

Peso total de la tanda obligatoria: ≤ 4 MB.

> **Estado de la entrega al 13/09/2026:** 17 de 22 recibidos (A1–A6 y 11 íconos). Faltan **A7
> plataforma**, `enlace`, `nodo`, `globo` y `firewall_virtual` — el último, excluido del lineup por
> decisión del proveedor.
