# Mockup Fase 1 — Configurador de Infraestructura (Actualización v29)

> **v29: actualiza `mockup-fase1-actualizacion-v28.md`.** Son tres cambios que pidió Dei el
> 25/09/2026:
>
> 1. **Perimetral:** los tres productos usan las paredes y se anidan.
> 2. **Puntonet Space (Starlink):** tiene ícono 3D propio. Viene del paquete
>    `Puntonet_GLB_Endpoint_Starlink.zip`.
> 3. **Marca de agua del visor:** pasa del 34% al 60% del ancho.
>
> - **Cambian:** `css/styles.css`, `js/functions.js`, `js/iconos-glb.js` (generado) y
>   `js/smoke-test-iconos.js`.
> - **Nuevo:** `assets/glb-iconos/pn_ico_puntonet_space.glb`.
> - **Prototipo:** pasa de **v51 a v52**.

**Dónde está:** en la carpeta del prototipo, sobre `main` (encima de `e484597`), todavía **sin
commit**.

- **Diff real:** 4 archivos, +136 / −36, más el `.glb` nuevo.
- **Saltos de línea:** se mantuvieron en CRLF. Para ver el diff real, usar `--ignore-cr-at-eol`,
  igual que en v27 y v28.

**Qué no se tocó:**

- `index.html`.
- **No se agregaron estilos inline:** el tamaño de la marca de agua vive en `styles.css`.
- El estado, la salud, la herencia, el reporte (pantalla y PDF) y el JSON exportado, que sigue en
  versión 16.
- El catálogo del panel izquierdo. Sus íconos 2D (`ICONO_UI_SUBPRODUCTO`) no dependen del
  `assetKey`, y la insignia DC sigue igual.

---

## 1. Decisiones de Dei (25/09)

| Tema | Decisión |
| --- | --- |
| Ícono de Perimetral | **Los 3 usan las paredes:** Firewall On Premise, Firewall IaaS e Internet Seguro. Cada uno lleva el color de su subproducto. |
| Varios de Perimetral en una sede | Cada uno nuevo envuelve al anterior y forma una pila de anillos concéntricos. |
| Cajita de Firewall On Premise | Se retira. La reemplazan las paredes. |
| Ícono de Puntonet Space | La antena satelital plana del paquete nuevo. |
| End Point del mismo paquete | No entra en esta fase (ver Pendiente 97). |
| Marca de agua | Más grande: primero se pidió ~70% del visor (en vez de ~30%) y después se ajustó a 60%. |

## 2. Perimetral: paredes anidadas

**Antes (v28):**

| Producto | Ícono | Dónde |
| --- | --- | --- |
| Firewall IaaS | Paredes (`escudo`, `pn_ico_escudo.glb`) | `abrazar` |
| Firewall On Premise | Caja de hardware (`firewall_onpremise`) | Plataforma |
| Internet Seguro | Cono provisional (`firewall_virtual`), el "triángulo" | Plataforma |

**Ahora:**

- **Catálogo:** On Premise e Internet Seguro pierden su `assetKey` propio. Los tres heredan
  `escudo` del producto Perimetral.
- **Colocación:** `COLOCACION_ICONOS.escudo` suma `apila:true`, `pilaAnidada:true` y
  `pilaOrdenAlta:true`.
- **Nueva función `colocarAnidado(asset, factor, g, capa)`:**
  - **Capa 0:** es el `abrazar` de siempre, con las paredes alrededor de la plataforma.
  - **Cada capa siguiente:** envuelve a la anterior y se agranda **solo en planta** (X/Z). Mantiene
    la misma altura, así se lee como anillos y no como escalones.
  - **Aire entre capas:** `ANIDADO_PASO = 0.075` de la huella del cuerpo, por lado. Al ser
    proporcional, el anidado se ve igual en una Sede pequeña que en una Matriz.
  - **Orden:** el de alta. El primero que se agregó queda adentro.
- **En `refreshSedeAssets`:** una rama nueva arma la pila anidada antes que la pila de fachada.
- **Herencia:** las instancias heredadas de una Matriz entran en la misma pila, en estilo
  fantasma, como el resto.
- **Se conservan sin uso:**
  - Las entradas `firewall_onpremise` y `firewall_virtual` de `AssetRegistry` y `COLOCACION_ICONOS`.
  - El `.glb` de On Premise en `ICONOS_GLB`.
  - Así, volver atrás es solo devolver el `assetKey` al catálogo.

## 3. Puntonet Space: antena satelital

- **Archivo:** `pn_ico_puntonet_space.glb`, del paquete "GLB End Point + Space".
  - GLB 2.0, 6 mallas y 2.332 triángulos.
  - Origen en la base del soporte.
  - Frente hacia +Z.
- **Catálogo:** `puntonet_space` pasa a `assetKey:'puntonet_space'`. Deja de apilarse con los
  globos de Internet (Corporativo, Startup, Teleworking).
- **`ICONOS_GLB.puntonet_space`** tiene dos claves nuevas:
  - **`materialesPropios:true`:** es el primer ícono que **conserva los materiales PBR del .glb**
    (panel blanco, metal cepillado y borde azul emisivo), como pide el LEEME del proveedor.
    - No pasa por `materialesDeColor()`, así que no se tiñe con el color del catálogo.
    - Solo se le suma el mismo envMap de los íconos.
  - **`pivoteEsperado:true`:** el panel se inclina hacia atrás y la caja no queda centrada. Se
    corrige por código sin avisar en la consola.
- **Colocación:**
  - `cubierta`, factor 0.70, `apila`.
  - Va en un hueco del techo, alrededor del "+".
  - Varias instancias forman una fila.
- **Giro:** `SPACE_ROT_Y = 0.35` rad.
  - De frente a la cámara (45°) se leía como un rectángulo blanco plano.
  - Así se ve en 3/4, con el canto azul y el soporte, como en el render del proveedor.
- **Primitiva de respaldo:** si el `.glb` no carga, se dibuja un panel inclinado sobre un poste.
- **Ondas satelitales:**
  - La nueva `panelSatelital()` las ancla a la cara del panel (`space_radiating_face`).
  - Siguen el mismo ritmo de tandas de siempre.
  - Con la antena en escena ya no se dibuja el octaedro marcador.
  - Sin antena, vuelven al puerto con el marcador, como antes.
- **Brillo:** el borde azul conserva su emisión, pero **no entra al bloom**. Los íconos siguen
  fuera de él (decisión de v17), así que el halo exterior del render del proveedor no aparece.
  Ver el Pendiente 95.

## 4. Marca de agua del visor

- **Antes (T07):** `--marca-agua-ancho: 34%` del visor.
- **Ahora:** `--marca-agua-ancho: 60%`.
- **Tope de alto nuevo:** `max-height: 85%`. Así no se sale por arriba ni por abajo en pantallas
  bajas o anchas. El SVG va en `contain`, así que conserva su proporción.
- **Sin cambios:** la posición (centrada, detrás del canvas y fija, sin seguir a la cámara) y la
  opacidad (`--marca-agua-opacidad: .5`).
- **Medido en Chromium:**

  | Ventana | Visor | Marca de agua |
  | --- | --- | --- |
  | 1420 × 850 | 978 px | 587 × 336 px |
  | 1920 × 1080 | 1323 px | 794 × 454 px |

---

## Archivos

```
assets/glb-iconos/pn_ico_puntonet_space.glb  ← nuevo (del zip del proveedor)
css/styles.css             ← .marca-agua: --marca-agua-ancho 34% → 60%, max-height 85%
js/iconos-glb.js           ← regenerado con node tools/empaquetar-iconos.js (15 íconos, 442 KB)
js/functions.js            ← catálogo: puntonet_space (assetKey), firewall_on_premise e
                             internet_seguro (sin assetKey)
                             §3D: ICONOS_GLB.puntonet_space; prepararPlantilla e instanciar
                             respetan materialesPropios / pivoteEsperado
                             §5: SPACE_ROT_Y, AssetRegistry.puntonet_space
                             §3E: COLOCACION_ICONOS.escudo (pilaAnidada) y .puntonet_space,
                             ANIDADO_PASO, colocarAnidado, rama anidada en refreshSedeAssets
                             Satélite: panelSatelital; rebuildSatelliteLinks ancla las ondas
js/smoke-test-iconos.js    ← sección D reescrita (Perimetral anidado + Space), 14 → 15 íconos
Claude outputs/            ← v29-perimetral.png, v29-space.png, v29-marca-agua.png
```

## Verificación

- **Los tres smoke tests pasan: 94/94 modelos, 78/78 íconos y 42/42 brillo (214/214).**
- **Checks nuevos en `smoke-test-iconos` §D:**
  - Los 3 de Perimetral resuelven a `escudo`.
  - 3 instancias dan 3 capas, cada una más ancha que la anterior, en orden de alta y con la misma
    altura.
  - Space usa su `.glb` y conserva `pn_space_emission` y `pn_space_panel`.
- **Chromium real, con el prototipo abierto por `file://`:**
  - Sede mediana con los 3 de Perimetral.
  - Sede pequeña con los 3 más Space.
  - Space solo y con Internet Corporativo.
  - Dos instancias de Space más Firewall IaaS.
  - Las ondas nacen del panel.
  - Marca de agua a 1420 y 1920 px de ancho, centrada y sin salirse del visor.
  - Sin errores nuevos en la consola.

## Pendiente de validación con el cliente final

**Heredado:** los puntos 1 a 93 de las notas anteriores (ver v28).

**Sigue abierto el 62:** el `<title>` todavía dice "Prototipo v47". Hay que pasarlo a v52.

**Nuevo de esta fase:**

94. **Colores de Perimetral.** Los tres son tonos de rosa del mismo hue (330°) y en la pila se
    distinguen poco. Si el cliente necesita reconocer cuál es cuál a simple vista, habría que
    separar más el tono o el brillo de cada subproducto.
95. **Halo del borde de Space.** El LEEME pide el bloom de la escena para el halo exterior. Meter un
    ícono en `CAPA_BRILLO` hoy haría brillar el panel entero, porque el bloom trabaja por material.
    Habría que separar el borde en su propia capa.
96. **Vecinos con muchas capas.** Con 3 capas, la de afuera sobresale apenas de la plataforma. Dos
    sedes grandes vecinas, las dos con 3 de Perimetral, podrían rozarse. Revisar en la tablet con
    un caso real.
97. **End Point nuevo del mismo paquete.** Son 3 anillos más 4 insignias (EDR, XDR, Seguridad
    Móvil, Correo), con el orden y las posiciones que da el LEEME. Reemplazaría los candados de
    T07. No se integró: falta la confirmación de Dei.
98. **Marca de agua al 60%.** Con escenas cargadas queda detrás de varias sedes. Está a opacidad .5:
    confirmar en la tablet que no compite con los edificios. Si compite, bajar
    `--marca-agua-opacidad`.

## Fuera de alcance

- **End Point modular:** ver el Pendiente 97.
- **T09 (cámara isométrica y encuadre)** y **T10 (pulido visual):** sin cambios respecto de v28.
