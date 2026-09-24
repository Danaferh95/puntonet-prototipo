# Mockup Fase 1 — Configurador de Infraestructura (Actualización v27)

> **v27: actualiza `mockup-fase1-actualizacion-v26.md`.** Es la tarea **T07** de
> `claude/tareas-reunion-cliente-2026-09-22.md` (jerarquía de íconos). Se trabajó paso a paso con
> Dei el 24/09/2026, y en el mismo chat se sumaron varios ajustes que pidió sobre la marcha.
>
> - **Cambian:** `index.html`, `css/styles.css`, `js/functions.js` y `js/smoke-test-brillo.js`.
> - **Nuevo:** `assets/ui/marca/marca-agua.svg`.
> - **Prototipo:** pasa de **v49 a v50**.

**Dónde está:** en la rama **`t07-iconos`**, que sale de `main` (`aa1b150`). Todavía **sin
commit**: hay que hacer el commit y el merge a `main`.

- **Diff real:** 4 archivos, +506 / −80. En git aparecen todas las líneas cambiadas, porque OneDrive dejó los archivos con saltos de línea CRLF; con `--ignore-cr-at-eol` se ve el diff real.
- **Detalle paso a paso:** `claude/tarea-T07-jerarquia-iconos.md` y `claude/tarea-T07-cambios-ui-2026-09-24.md`.

**Qué no se tocó:**

- El catálogo, el estado, el concentrador, la herencia, la salud, el reporte, el JSON exportado (sigue en versión 16) y los modelos de las entidades.
- **No se agregaron estilos inline:** `functions.js` sigue en 51 líneas con `.style.`. La marca de agua y el tooltip nuevo van solo con clases de `css/styles.css`.

---

## 1. Regla general: nunca un ícono detrás del mesh

La cámara por defecto mira desde +X/+Z, así que las paredes de atrás (-Z y -X) quedan tapadas por
el propio edificio.

- **`CARAS_VISIBLES`** (frontal y derecha) reemplaza a las 4 caras en `huecoPerimetral()`.
- `fachada` pasa de 4 huecos a 2. `plataforma` reparte entre esas dos paredes y corre los íconos lateralmente en lugar de mandarlos atrás.
- Los íconos de techo (`cubierta`) pueden usar el cuadrante de atrás: están arriba del mesh, no detrás.

## 2. Dónde va cada producto

| Producto | Antes (v26) | Ahora |
| --- | --- | --- |
| Datos (Canal de Conexión, Cloud Interconnect) | plataforma | **Nace del "+"**, justo encima, 1.3 de huella |
| SD-WAN (Sdwan, Túnel IPsec) | plataforma | **Techo** |
| Internet | techo, al centro | Techo, alrededor del "+" |
| Housing, Firewall On Premise, Perimetral, Conferencia, Ofimática | — | Sin cambios (solo paredes visibles) |
| Hosting | techo, al centro | Techo, alrededor del "+" |
| End Point | envuelve el edificio | Igual. Los candados, en fila (ver §3) |
| Acceso (MFA) | arco al costado, donde estaba el puerto | **Enmarca el "+"** en el centro del techo |
| Aplicación (WAF, DNS/DDoS) | fachada | Fachada, apilados |
| Portal Cautivo | plataforma | **Techo** |
| Zona Wireless | techo, al centro | Techo, alrededor del "+" |

- **Techo (`huecoCubierta`):** los íconos van en los cuadrantes alrededor del "+", nunca encima.
  - Los dos primeros quedan a la izquierda y a la derecha del "+" con la cámara isométrica.
  - Desde el quinto se suman los puntos medios de cada borde, con huecos más chicos.
- **MFA (`portico`):**
  - Arco alineado con el edificio, mirando al frente.
  - Alto fijo `PORTICO_ALTO = 0.9`. Empezó en 1.05 y Dei pidió achicarlo; se probó girado 45° y se descartó.
- **Datos (modo nuevo `puerto`):** si hay arco de MFA, se apoya sobre él.
- **Etiqueta de nombre:** sube sola por encima de lo que esté parado sobre el "+" (`alturaMinEtiqueta`).
- **Se eliminó `ladoPuerto`:** ya no se usa.

## 3. Stacks

Cuando una entidad tiene varios servicios del mismo producto, se ven como **una sola pieza
apilada**, en lugar de íconos sueltos o superpuestos. La pila ocupa un solo lugar, no tiene tope
de piezas, y cada pieza conserva el tono de su servicio y su propio clic y tooltip.

| Tipo | Productos | Cómo se ve |
| --- | --- | --- |
| **Frente/fondo, tipo lego** | SD-WAN, WAF/DNS, Hosting, Housing, MFA, Datos | Piezas en fila recta, alineadas y pegadas cara con cara. Dei lo aprobó como "perfecto". |
| **Lado a lado** | End Point | Fila centrada en la fachada. Cada candado nuevo se suma al lado y la fila se recentra, en orden de alta. Si no entra en el 85% del ancho, se achican todos por igual. |
| **Vertical** | Internet | De abajo hacia arriba, en orden de alta. Todos los globos miden lo mismo: 1 → 100%, 2 → 80%, 3 o más → 50%. |

**Cómo está hecho (§3E de `functions.js`):**

- **Configuración:** `apila:true` en `COLOCACION_ICONOS`, con `pilaVertical`, `pilaLateral` y `pilaOrdenAlta` como variantes.
- **Funciones:** `construirPila()` (techo), `construirPilaFachada()` (paredes, arco y puerto) y `construirPilaVertical()` (Internet).
- **Candado de End Point:**
  - El `.glb` trae en una sola malla los aros y el dibujo del candado, así que `partirPorComponentes()` los separa.
  - Los aros quedan una sola vez y cada placa lleva su logo.
  - La pila queda fija: **no sigue a la cámara**. Se probó que girara con la cámara y Dei prefirió que no.
- **Convivencia en el frente:** con 1 candado, lo demás del frente se corre a la izquierda de la placa. Con 2 o más, la fila ocupa el frente y lo demás pasa a la pared derecha.

## 4. Íconos más grandes y con más brillo

- **Tamaño:** `ICONOS_TAMANO = 1.15` para todos los modos, salvo el arco de MFA.
- **Brillo:** `ICONOS_BRILLO = { base: 0.18, glow: 1.8 }`. El cuerpo suma un emisivo leve y el rasgo de glow pasa de 1.35 a 1.8. Siguen fuera del bloom.

## 5. Partículas de los cables

- **Tamaño:** el radio pasa de 0.075 a 0.13 (`PARTICULA_RADIO`).
- **Brillo:** núcleo casi blanco que entra en el bloom (`particulaNucleo`) y aura aditiva del color del cable.
- **Animación:** respira un ±12%.

Era un punto de T10.

## 6. Tooltip agrupado

- **Qué cambia:** con varios servicios del mismo producto, el hover sobre cualquiera muestra un solo popup. Por ejemplo, "End Point · Ciberseguridad · 4 servicios", con la lista en viñetas.
- **Color de las viñetas:** el de la categoría (mint, cyan, coral o lime), solo con CSS.
- **Pendiente de autorización:** para usar el tono de cada servicio hace falta un estilo inline.

## 7. Confirmación al quitar

Los "−" del panel derecho piden confirmación con el diálogo propio:

- **"Quitar producto":** en la lista de productos de la sede o Matriz.
- **"Eliminar conexión":** en la lista de conexiones. Avisa que también se quita el servicio que representa, salvo que sea un backup.

## 8. Marca de agua

- **Qué es:** el toggle de la marca, centrado en el visor y **detrás del grid y de todo el 3D**. Queda fijo en pantalla y no recibe clics.
- **Cómo está hecho:**
  - Un `<div class="marca-agua">` en `#canvasWrap`, con el SVG en `assets/ui/marca/`.
  - El canvas pasa a `z-index:1` y es transparente, así que la marca se ve a través.
- **Perillas:** `--marca-agua-ancho: 34%` y `--marca-agua-opacidad: .5`. Se compararon 22%, 50% y 80%.
- **No sale en el PDF:** eso se decide en T08.

---

## Archivos

```
index.html              ← <div class="marca-agua"> en #canvasWrap
css/styles.css          ← .marca-agua; canvas con z-index:1;
                          tooltip agrupado (.t-lista, .t-item--<vertical>, .t-bullet)
assets/ui/marca/        ← marca-agua.svg (nuevo)
js/functions.js         ← §3E  COLOCACION_ICONOS (apila, pilaVertical, pilaLateral, pilaOrdenAlta,
                                pilaSoloPrimera; modos puerto/portico nuevos), CARAS_VISIBLES,
                                huecoCubierta, construirPila, construirPilaFachada,
                                construirPilaVertical, partirPorComponentes,
                                etiquetarAssetDeSede, ICONOS_TAMANO, PORTICO_ALTO,
                                PUERTO_ICONO_HUELLA, FILA_ANCHO_MAX, refreshSedeAssets
                          §3D  ICONOS_BRILLO en materialesDeColor
                          cables  partícula con núcleo en bloom (PARTICULA_RADIO, TITILEO)
                          etiquetas  alturaMinEtiqueta en getLabelScreenNDC
                          panel   confirmDialog en .inst-delete y .connDelete
                          hover   grupoDelTooltip + popup agrupado
js/smoke-test-brillo.js ← la partícula del cable puede brillar; aserción nueva (41 → 42)
Claude outputs/         ← t07-*.png
```

## Verificación

- **Los tres smoke tests pasan: 94/94 modelos, 73/73 íconos y 42/42 brillo (209/209).**
- **Navegador real** (Chromium con WebGL), con capturas de cada paso en `Claude outputs/t07-*.png`:
  - **Techo:** sedes pequeña, mediana y grande.
  - **SD-WAN y Hosting:** pilas.
  - **End Point:** 2, 3 y 4 candados en fila.
  - **WAF/DNS:** en la pared derecha, y la misma sede vista desde atrás, con las paredes traseras vacías.
  - **Housing:** en sedes y en el Datacenter.
  - **MFA y Datos:** sobre el "+", con cable al Datacenter.
  - **Internet:** 1 a 4 servicios.
  - **Partículas y marca de agua.**
  - **Hover real:** el popup agrupado de End Point.
  - **Clic real en "−":** "Cancelar" no borra y "Quitar" sí.
  - **Cero errores de consola.**
- **Clic y tooltip de cada pieza:** en todas las pilas, cada pieza conserva su `instanciaId`.

## Pendiente de validación con el cliente final

**Heredado:** los puntos 1 a 76 de las notas anteriores (ver v26).

- **Resueltos en v27:**
  - **64:** los íconos del techo ya no comparten lugar con el "+".
  - **65:** el arco de Acceso ya está sobre la ruta del cable.
- **Sigue abierto el 62:** el `<title>` todavía dice "Prototipo v47". Hay que pasarlo a v50 y hacer push de `main`.

**Nuevo de esta fase:**

77. **El cable atraviesa lo que está sobre el "+".** Sale hacia arriba y cruza el arco de MFA y el
    ícono de Datos. Se lee como "la conexión entra por la puerta", pero falta confirmarlo con Dei.
78. **Tonos parecidos dentro de un stack.** Los candados son todos rosa, las nubes violeta y los
    globos azules, y se distinguen poco. Los candados de color de Dana lo resuelven para End
    Point; los otros quedan para **T10**.
79. **Viñetas del tooltip con el color de cada servicio:** esperan la autorización de Dei para un
    estilo inline.
80. **Pesos.** El orden dentro de las pilas y de los huecos es el del catálogo (el de alta en End
    Point e Internet). En la sede mediana con 5 íconos arriba, el "+" tapa en parte la pila del
    hueco delantero.
81. **Sede muy cargada.** Con 8 productos de pared y plataforma en dos paredes, o con 4 candados
    más WAF/DNS y Conferencia, la pared derecha queda apretada. Nada se tapa.
82. **Racks apilados en sedes.** El plinto es angosto, y con 3 o más los de adelante quedan al
    filo de la plataforma.
83. **Pila de Hosting sobre una entidad Nube:** queda un poco en el aire, sobre el hombro de la
    nube, igual que el ícono suelto antes.
84. **Las variantes de Internet ahora miden lo mismo.** Como también comparten el tono, solo se
    distinguen por el tooltip.
85. **La colocación asume la cámara desde +X/+Z.** Si **T09** cambia la vista por defecto, hay que
    revisar `CARAS_VISIBLES` y `HUECOS_CUBIERTA`.
86. **Git en la carpeta de OneDrive.** Un `git status` desde Cowork dejó un `.git/index.lock` que
    se borró a mano. Desde ese shell hay que usar `GIT_OPTIONAL_LOCKS=0`.

## Fuera de alcance

- **Resto de T07, que queda abierto:**
  - Etiquetas de texto livianas en los íconos, para tablet.
  - Diferenciación visual de Cloud Interconnect, IPsec y cross connection.
  - Assets de Dana: candados de color, tres líneas y antena de Punto Space.
- **T08 (PDF con la plantilla nueva):** esperando la plantilla. Decide si la marca de agua va en el reporte.
- **T09 (cámara isométrica y encuadre):** lista para empezar. Ver el Pendiente 85.
- **T10 (pulido visual):** al final. Ya no incluye las partículas del cable; sí los cubitos de SD-WAN.
