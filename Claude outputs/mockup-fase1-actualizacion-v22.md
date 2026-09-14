# Mockup Fase 1 — Configurador de Infraestructura (Actualización v22)

> **v22 — actualiza a `mockup-fase1-actualizacion-v21.md` (v21: tanda Colaboración).**
> Esta fase **no toca assets ni catálogo**: cierra el pipeline de color del renderer, que era la
> última pieza pendiente de la dirección visual confirmada en `assets-3d-listado-y-especificaciones-v2.md`.
> Cambia `js/functions.js`, `index.html` y los tres smoke tests. `css/styles.css` **no cambia**.
> Prototipo: pasa de **v42 a v43** — **cierra el Pendiente 38**.

## El origen

La pregunta fue por qué el render de la app no llega al acabado de la imagen de referencia aprobada,
aun con los `.glb` biselados ya integrados. Al revisar `functions.js` contra esa referencia apareció
que **casi todo estaba hecho** —environment map procedural con PMREM, `MeshStandardMaterial` en
entidades e íconos, bloom selectivo por capa, piso con reflejo falso, bisel desde el archivo— y que
faltaba una sola pieza, pero transversal:

```
grep -c "toneMapping\|outputEncoding" js/functions.js  →  0
```

El renderer quedaba en los defaults de r128: `outputEncoding = LinearEncoding` y
`toneMapping = NoToneMapping`. Con `MeshBasicMaterial` (hasta v38) eso era irrelevante. Desde que las
entidades y los íconos son PBR, anulaba medio trabajo del env map: los medios tonos salían aplastados
—la escena se leía "plana" por más correcto que fuera el metal— y el emisivo saturaba a blanco de
golpe en vez de hacer roll-off, así que el neón nunca se leía como núcleo caliente sino como línea de
color plano.

**Son dos líneas, pero cambian todos los colores de la escena a la vez.** El grueso de esta fase es la
compensación, no el switch.

## Los cambios

### §3A-ter — Pipeline de color (nueva sección)

```js
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.75;
```

Y alrededor, cuatro compensaciones que conviene leer como una sola pieza, porque cada una tapa un
agujero distinto que abre el switch:

**a) Colores de superficie a lineal.** r128 no tiene `ColorManagement` (llegó en r152), así que los
hex se usan tal cual. El albedo y el emisivo de entidades (§3B) e íconos (§3D) se eligieron a ojo en
sRGB y en un pipeline PBR van en lineal: sin convertirlos, el cian se va a un celeste lavado en
cuanto sube la intensidad. Esto es, además, **buena parte de la recalibración de paleta pendiente de
v2 §7.2 punto 10** — la mitad mecánica, no toda (ver Pendiente 45).

**b) Materiales de interfaz fuera de la curva.** Cables, halos, partículas, badges, grilla, piso y
sprites de puerto **no son superficie física**: se afinaron a ojo contra el degradado CSS de
`#canvasWrap` y tienen que seguir viéndose igual. Van con `toneMapped:false` y con el color
pre-convertido, de modo que la conversión de salida los devuelva intactos (`sRGB→lineal→sRGB` es
identidad exacta, verificado). Lo hace `normalizarMaterialesUI()`, colgado del `traverse` que
`animate()` ya hacía por los puertos, con guard en `material.userData.pnUI`.

> Se hace por **barrido** y no material por material a propósito: son ~20 puntos de creación
> repartidos por el archivo, y uno nuevo que se olvidara de la llamada saldría oscurecido sin ningún
> aviso — el mismo tipo de fallo silencioso que v20 documentó para los builders de `AssetRegistry`.
> El guard importa porque `convertSRGBToLinear()` es destructivo: aplicarlo dos veces apaga el color.
> `Material.copy()` de r128 clona `userData`, así que los clones del reflejo del piso tampoco se
> convierten dos veces.

**c) Dos casos que el barrido no alcanza.**

- La `CanvasTexture` del sprite de puerto se declara `sRGBEncoding`. El canvas 2D ya está pintado en
  sRGB; sin declararlo, r128 lo toma como lineal y le aplica gamma una segunda vez (salía lavado).
- `GridHelper` ya viene con `toneMapped:false` de fábrica en r128, pero sus dos tonos van horneados
  en el atributo `color` de la geometría (`vertexColors:true`), no en `material.color`, así que la
  conversión no los alcanza: se convierten a mano, una sola vez, al crearla.

**d) Luces recalibradas.** `AmbientLight` baja de **0.8 a 0.14** y la direccional sube de **0.6 a
0.85**. Con IBL real un ambiente fuerte es contraproducente: le mete luz plana a todas las caras por
igual y borra justo el contraste que genera el env map. Venían de la época de `MeshBasicMaterial`,
cuando efectivamente no hacían nada —de ahí la nota de v2 §7.2 punto 6— y nadie las volvió a mirar
tras migrar a Standard, donde sí pesan.

### §3B — Environment map en HDR

Los cuatro paneles de `crearEntornoMetal()` pasan a multiplicarse por encima de 1. `PMREMGenerator`
trabaja en half float, así que esos valores sobreviven, y son los que producen el **reflejo especular
quemado sobre el bisel**. Con paneles topados en 1.0 el metal nunca llegaba a la parte alta del rango:
medido contra la referencia, las altas luces se quedaban ~45% cortas y la pieza se leía apagada por
más oscura que fuera la base. El filo angosto es el más caliente de los cuatro (×9.0) porque es el
que se lee como línea de luz sobre la arista. Los cuatro se tiñeron además hacia el azul: en la
referencia **la luz misma es azul**, y un panel casi blanco sobre metal da un reflejo blanquecino que
desatura toda la pieza.

### §3B — Metal y emisivos

| | v42 | v43 |
| --- | --- | --- |
| `MODELO_METAL.color` | `0x7d95c0` | `0x536fa8` |
| `metalness` / `roughness` | 0.85 / 0.28 | 0.90 / 0.22 |
| `envMapIntensity` | 1.4 | 1.6 |
| `glowIntensidad` (sede/matriz/dc) | 1.0 | 1.6 |
| `glowIntensidad` (nube) | 1.0 | 1.5 |

**Sobre el albedo, y vale dejarlo escrito porque el diagnóstico inicial fue equivocado:** la primera
hipótesis fue que `0x7d95c0` era demasiado claro y que había que llevarlo a casi negro, como se ven
los cuerpos en la referencia. Se probó y **es falso**: con `metalness 0.90` el albedo *es* la
reflectancia del metal, así que un `0x18202e` (≈2% en lineal) convierte los edificios en espejos
negros. El barrido mostró que el color original ya estaba en el orden correcto y que lo que fallaba
era el pipeline. El `0x536fa8` final salió de medir saturación contra la referencia, no de elegirlo a
ojo. La lectura "cuerpo casi negro" de la referencia la produce el **entorno oscuro**, no el material.

### §3C — Bloom re-afinado y composite corregido

`intensidad` **3.0 → 0.9**, `radio` **0.5 → 0.30**, `nucleo` **1.5 → 0.60**. Los valores viejos se
calibraron contra salida lineal, donde el emisivo llegaba crudo al halo; ahora la fuente entra
comprimida por ACES, así que la misma fuerza numérica rinde bastante más. Con los valores de v42 la
escena se lavaba y el halo mostraba el borde cuadrado de los mips gruesos de `UnrealBloomPass`.

El fragment shader del composite ahora **codifica a sRGB antes de sumar**:

```glsl
vec3 aSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(max(c, vec3(0.0)), vec3(0.41666))-0.055,
                               step(vec3(0.0031308), c)); }
gl_FragColor = vec4(aSRGB(texture2D(tBrillo, vUv).rgb) * nucleo, 0.0);
```

El render target `fuente` queda en **lineal** —r128 solo aplica `outputEncoding` cuando dibuja al
canvas, no a un render target— mientras que el canvas ya está en sRGB. Sumar uno sobre otro mezclaba
dos espacios y el halo salía apagado y sucio. El alfa sigue en `0.0` y el blending no cambia, así que
el degradado CSS del fondo se mantiene intacto.

### Smoke tests

Cinco aserciones comparaban `material.color.getHex()` contra el hex de catálogo, y ese color ahora
vive en lineal. **No se relajaron: se les enseñó el espacio de color.** Cada una deshace la conversión
antes de comparar (`clone().convertLinearToSRGB().getHex()`, ida y vuelta exacta), así que verifican
exactamente lo mismo que antes — que el color de catálogo le gana al del archivo, y que la Nube
conserva su acento violeta. Una sexta fijaba el texto literal del shader del halo y se actualizó al
nuevo, conservando lo que asegura: que suma luz y no toca el alfa del canvas.

### Archivos

```
index.html                     ← v42 → v43 (título y etiqueta) — cierra el Pendiente 38
css/styles.css                 ← sin cambios
assets/                        ← sin cambios
js/modelos-glb.js              ← sin cambios
js/iconos-glb.js               ← sin cambios
js/functions.js                ← §3A-ter: sección nueva (pipeline de color, normalizarMaterialUI,
                                          setColorUI, normalizarMaterialesUI, luces)
                                  §3A: conversión del atributo de color de GridHelper
                                  §3B: env map en HDR y teñido a azul, MODELO_METAL, glowIntensidad,
                                       albedo/emisivo a lineal
                                  §3C: BRILLO re-afinado, composite codifica a sRGB
                                  §3D: colores de catálogo a lineal, emissiveIntensity 0.5 → 1.35
                                  §4: animate() llama a normalizarMaterialesUI en el traverse existente
                                  sprite de puerto: CanvasTexture con sRGBEncoding
js/smoke-test-modelos.js       ← 1 aserción de color ahora compara en sRGB
js/smoke-test-iconos.js        ← 3 aserciones de color ahora comparan en sRGB
js/smoke-test-brillo.js        ← shader del composite y etiqueta de versión (v41 → v43)
```

Sin cambios: catálogo, estado, conexiones, Concentrador, herencia, Salud, reporte, JSON exportado
(sigue en `version: 14`), geometría, `ICONOS_DIM_OBJETIVO`, piso y reflejos, fallbacks.

## Verificación

- **Los tres smoke tests en verde por primera vez: 47/47, 62/62 y 30/30 (139/139).** El fallo
  histórico de la etiqueta de versión queda cerrado al alinear `index.html` y el test en v43.
- **Navegador real** (Chromium con WebGL2, escena con Datacenter, dos sedes, una Nube y productos
  asignados de seis verticales): **cero errores y cero advertencias de consola**; `Brillo` en
  `activo`, `ModelLibrary` en `listo`.
- **Medición contra la imagen de referencia**, sobre la cara superior del cuerpo:

  | | tono | saturación |
  | --- | --- | --- |
  | Referencia | 224° | 0.81 |
  | v42 | 214° | 0.65 |
  | **v43** | **218°** | **0.85** |

  El color del metal queda prácticamente sobre el de la referencia. En luminancia la mediana y los
  negros también se acercan, pero **el rango de altas luces sigue corto** (p95 102 contra 172) — ver
  Pendiente 46, y la salvedad de que los recortes comparados no tienen la misma composición, así que
  las cifras de luminancia orientan pero no son una equivalencia estricta.

## Pendiente de validación con el cliente final

Heredado sin cambios: puntos 1–16 de `…v12.md` a `…v15.md`, 19–21 de
`assets-3d-listado-y-especificaciones-v2.md`, 22, 24–27 de `…v16.md`, 23, 28, 29 de `…v17.md`,
30–32 de `…v18.md`, 33–37 de `…v19.md`, 40–41 de `…v20.md`, y 42–44 de `…v21.md`.

**Cerrado en esta fase:** el punto **38** (etiqueta de versión desalineada entre `index.html` y
`smoke-test-brillo.js`), arrastrado desde v19.

Nuevo de esta fase:

45. **La paleta del catálogo sigue siendo el pendiente de fondo, ahora más visible.** La conversión a
    lineal resolvió la mitad mecánica de v2 §7.2 punto 10, pero los `hue/sat/light` de N2/N3 se
    eligieron para render plano, y contra entidades que ahora tienen volumen los íconos se leen
    planos y demasiado neón — el magenta de Housing es el caso más notorio. Es trabajo de diseño
    sobre ~40 colores fijos, no un ajuste de parámetros, y conviene hacerlo de una sola vez.
46. **Los negros de la escena los pone el CSS, no el renderer.** El piso de luminancia quedó en 12.6
    contra 8.4 de la referencia, y ese valor viene del degradado de `#canvasWrap` en
    `css/styles.css`, no de la escena 3D. Oscurecerlo es una línea, pero afecta el look general de
    la app más allá del canvas, así que es decisión de diseño. Relacionado: el rango de altas luces
    también queda corto, en parte porque el render target del bloom es de 8 bits y recorta todo lo
    que pase de 1.0 — subirlo a `HalfFloatType` daría headroom real, a costo de memoria en la tablet.
47. **La cámara ortográfica es una diferencia que no se cierra con materiales.** La referencia tiene
    perspectiva y algo de desenfoque; `FRUSTUM = 22` ortográfico no da convergencia de líneas ni DOF.
    Se nota en un lado a lado. La recomendación es dejarla ortográfica —no distorsiona la grilla, que
    es lo que importa en una herramienta de configuración— pero conviene que sea una decisión dicha y
    no un descuido, antes de que el cliente compare.
48. **El presupuesto de GPU sigue sin calibrar y ahora la escena pide más.** PBR con env map HDR,
    tone mapping y bloom es un salto real sobre `MeshBasicMaterial`, y los puntos 19–21 de v2 §8
    (modelo de tablet, empaquetado, duración de sesión) siguen sin respuesta. El interruptor de
    calidad de v2 §7.3 punto 16 —apagar bloom y reflejos— sigue sin construirse, y conviene que sea
    lo próximo: si el camino "alto" no da en la tablet, hoy no hay camino "bajo" que mostrar.

## Fuera de alcance

- **`pn_ent_plataforma.glb` (A7)**: el único asset del Listado A que nunca llegó, y sigue sin
  referencia en el código. En la referencia la base iluminada bajo cada nodo es lo que más aporta al
  look y lo que ata todo a la grilla del piso. Es el pedido de asset más rentable que queda.
- **Los 4 assetKeys restantes** (`enlace`, `nodo`, `globo`, `firewall_virtual`): sin cambios.
- **Íconos de Nivel 3** (v2 §4): sigue siendo fase 2.
- **`Reflector` real y niebla de fondo** (v2 §7.3 puntos 13 y 14): el piso sigue con reflejo falso, y
  la niebla sigue sin implementarse — contra un fondo transparente con el degradado en CSS no
  funciona igual, así que no es solo activarla.
- **Bloom en los íconos de producto y su reflejo en el piso**: siguen excluidos a propósito (v17 y
  v19), sin cambios en esta fase.
- **Corregir la ruta de los smoke tests para que corran desde `js/`**: sigue sin tocarse.
