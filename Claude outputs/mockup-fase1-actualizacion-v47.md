# Mockup Fase 1 — actualización v47 (prototipo v47)

**Pedido del cliente (14/09/2026), sobre v46:** las sedes se siguen sintiendo chicas. Escalar más,
con tamaños concretos por entidad:

- **Datacenter:** que ocupe **dos cuadrados de ancho**.
- **Matriz:** un poco más grande.
- **Sedes:** el doble del tamaño base actual.
- Manteniendo la jerarquía: **Datacenter > Matriz > Sedes**.

Decisión del cliente sobre cómo evitar que se pisen: **que cada entidad reserve las celdas que
ocupa**, sin tocar `GRID_SPACING`.

---

## 1. La escala global deja de alcanzar

Hasta v46 había **una sola** `MODELOS_ESCALA` que agrandaba todas las entidades por igual, y eso
conservaba la proporción entre ellas que diseñó el proveedor. El pedido de v47 es justamente otro:
son tamaños **por entidad**, y las proporciones pedidas no son las del proveedor (el Datacenter
tiene que ser 1.75× la Matriz; en los modelos es 1.45×).

Así que `MODELOS_ESCALA` pasa a ser la escala de **Sedes y Nube** (1.9 → **3.8**, el doble pedido),
y Matriz y Datacenter usan la `escala` propia que cada entrada de `MODELOS` ya aceptaba desde v16.

**Que los overrides sean números más chicos que la global no es un error**, y conviene dejarlo
anotado porque es lo primero que confunde al leer el código: cada escala multiplica **su propio
modelo**, y los modelos parten de tamaños muy distintos — el Datacenter mide 2.9 de ancho sin
escalar y la Sede Grande 1.2. Lo que importa es el ancho resultante:

| Entidad | escala | v46 | **v47** | en celdas |
| --- | --- | --- | --- | --- |
| Sede Pequeña | 3.80 (global) | 1.52 | **3.04** | 0.76 |
| Nube | 3.80 (global) | 1.71 | **3.42** | 0.86 |
| Sede Mediana | 3.80 (global) | 1.90 | **3.80** | 0.95 |
| Sede Grande | 3.80 (global) | 2.28 | **4.56** | 1.14 |
| Matriz | 2.80 propia | 3.80 | **5.60** | 1.40 |
| Datacenter | 2.76 propia | 5.51 | **8.00** | **2.00** |

El Datacenter queda en 8.00 = **2 × GRID_SPACING exactos**, que es literal lo que se pidió. La
jerarquía pedida se cumple y está cubierta por una aserción del smoke test, para que no se rompa
sin aviso si mañana se toca una sola escala.

`FRUSTUM` sigue en 22 a propósito: como la grilla no cambia y la cámara tampoco, todo el aumento se
ve como **más presencia en pantalla**, que es lo que el cliente estaba pidiendo.

### Halos e hitbox de Matriz y Nube

Eran radios fijos (2.3 / 2.5 la Matriz, 1.4 / 1.55 la Nube) calculados para modelos de 3.0 y 2.3 de
ancho. Con 5.60, el halo de selección de la Matriz quedaba **dentro** del edificio y la hitbox no lo
cubría entero: se podía hacer clic en la Matriz y no seleccionarla. Ahora salen de la planta del
modelo (`hypot(w/2, d/2)`), el mismo criterio que ya usaba el Datacenter desde v16. Sede y
Datacenter no necesitaron cambios: ya derivaban sus radios de `dims`.

---

## 2. La grilla pasa a razonar por huella real (§4)

Este es el cambio de fondo, y es invisible hasta que se rompe.

Hasta v46 `occupied(gx, gz)` comparaba **coordenadas de celda**: una entidad ocupaba su celda y
nada más. Eso funcionaba mientras toda entidad entrara holgada en los 4 de `GRID_SPACING`. Con los
tamaños de v47 ya no entran: **tres de las seis entidades son más anchas que su celda**. Con la
regla vieja, dos Sedes Grandes vecinas se solapan medio metro y el Datacenter invade las dos celdas
de al lado — cada una "libre" según la grilla. Es exactamente el Pendiente 52 de v46, pero peor.

Ahora `occupied()` compara **rectángulos**: la huella que tendría lo que se quiere colocar contra la
huella real de todo lo ya colocado, con `HOLGURA_ENTIDADES = 0.35` de aire mínimo entre plataformas.

Tres piezas nuevas lo sostienen:

- **`ModelLibrary.dims(clave)`** — medidas del modelo ya escalado **sin instanciarlo**. La grilla
  necesita saber cuánto va a medir una entidad *antes* de construirla, para elegir dónde cabe.
  Si ese `.glb` no está cargado, el que pregunta cae a `HUELLA_PRIMITIVA`, que es lo que
  efectivamente se va a dibujar en ese caso.
- **`huellaDeClave` / `huellaDeSedePorEmpleados`** — traducen "lo que estoy por soltar" a un
  rectángulo. Cada punto donde se pide una celda pasa ahora su huella: soltar una Sede, una Matriz
  o una Nube en el canvas, mover una ya colocada (que pasa la suya propia, `dimsEntidad`), el alta
  rápida desde el dropdown "Conectar a" y la Nube automática de Internet.
- **`nearestFreeCell` recorre anillos**, no solo el eje X. El barrido viejo era `gx += ±1`, que
  alcanzaba cuando cada entidad ocupaba una celda; ahora que las grandes reservan dos, una fila se
  agota rápido y hay que poder bajar a la siguiente. Recorre anillos de radio creciente y dentro de
  cada uno prueba primero las celdas más cercanas.

**Consecuencia buscada, y conviene decírsela al cliente antes de la demo:** la grilla se llena más
rápido. Una Matriz o una Sede Grande consumen de hecho dos celdas de ancho, así que un proyecto con
muchas entidades se reparte más en profundidad. Es el precio de tener las entidades a este tamaño
sin separar la grilla.

**Cierra el Pendiente 52 de v46.** Tres Matrices pedidas pegadas al Datacenter ya no se funden en
una sola losa: se acomodan solas en celdas que no se tocan
(`Claude outputs/v47-vecinos.png`).

---

## Archivos

```
index.html                     ← v46 → v47 (título y etiqueta)
css/styles.css                 ← sin cambios
js/functions.js                ← §3D: MODELOS_ESCALA 1.9 → 3.8 (sedes y nube);
                                       escala propia para matriz (2.80) y datacenter (2.76);
                                       ModelLibrary.dims() nuevo
                                  §3E: sin cambios — la colocación de íconos ya se calculaba
                                       contra dimsEntidad, así que acompañó sola
                                  §4:  occupied() por huella real; HOLGURA_ENTIDADES,
                                       huellaEnCelda, huellaDeColocada, seSolapan,
                                       HUELLA_PRIMITIVA, huellaDeClave,
                                       huellaDeSedePorEmpleados; nearestFreeCell por anillos;
                                       los 7 puntos que piden celda pasan su huella
                                  §3B: halo e hitbox de Matriz y Nube derivados de la planta
js/smoke-test-modelos.js       ← sección H-bis nueva (7 aserciones de ocupación); las de escala
                                  de Datacenter y Matriz leen su `escala` propia; jerarquía de
                                  anchos; ancho del Datacenter = 2 celdas (48 → 57)
js/smoke-test-brillo.js        ← etiqueta de versión (v46 → v47)
js/smoke-test-iconos.js        ← sin cambios
assets/, js/modelos-glb.js, js/iconos-glb.js ← sin cambios
```

Sin cambios: catálogo, estado, conexiones, Concentrador, herencia, Salud, reporte, JSON exportado,
materiales, bloom, piso y reflejos, fallbacks a primitivas, `GRID_SPACING`, `FRUSTUM` y la
colocación de íconos de v46. **Ni un estilo inline nuevo.**

## Verificación

- **Los tres smoke tests en verde: 73/73 íconos, 57/57 modelos, 41/41 brillo (171/171).** El de
  modelos pasa de 48 a 57. Las nueve aserciones nuevas son las que importan:
  - **H-bis (7)** cubre la ocupación por huella: que efectivamente haya entidades más anchas que su
    celda (si no, la sección no probaría nada), que la celda pegada al Datacenter rechace una
    Matriz **y también una Sede Pequeña** —la huella manda, no el tipo—, que a dos celdas sí entre,
    que dos Sedes Grandes no quepan contiguas, que `nearestFreeCell` devuelva una celda cuya huella
    realmente no toque a la vecina, y que mover una entidad no la considere obstáculo de sí misma.
  - **Jerarquía y ancho** (2): Datacenter > Matriz > Sede Grande, y Datacenter = 2 celdas exactas.
    Son los dos números que el cliente pidió explícitamente; quedan clavados en el test.
- **Navegador real** (Chromium con WebGL): escena mixta con Matriz, Datacenter, Nube y sedes de 1 a
  4 productos, más los 5 de Ciberseguridad uno por sede colocados **por el camino real de la app**
  (`nearestFreeCell`), más el peor caso de tres Matrices pedidas pegadas al Datacenter.
  **Cero errores de consola.** Capturas en `Claude outputs/v47-*.png`.

## Pendiente de validación con el cliente final

Heredado sin cambios: puntos 1–16 de `…v12.md` a `…v15.md`, 19–21 de
`assets-3d-listado-specs-tecnicas.md`, 22, 24–27 de `…v16.md`, 23, 28, 29 de `…v17.md`, 30–32 de
`…v18.md`, 33–37 de `…v19.md`, 40–41 de `…v20.md`, 42–44 de `…v21.md`, 45–48 de `…v22.md`, 49–51 de
`…v23.md` y 53–55 de `…v46.md`.

**El Pendiente 52 (Datacenter contra Matriz) queda cerrado** por la ocupación por huella.

Nuevo de esta fase:

56. **Cambiar los empleados de una sede puede hacerla crecer encima de una vecina.** Es el único
    camino que cambia el tamaño de una entidad **ya colocada**: pasar de 19 a 50 empleados la lleva
    de 3.04 a 4.56 de ancho sin volver a pedir celda. Ya pasaba antes de v47, pero con sedes de 2.28
    el solapamiento era chico y ahora es visible. El arreglo es de una línea —revalidar la celda en
    `setSedeEmpleados` y reubicar si no entra—, pero **cambia una interacción existente** (la sede
    se movería sola al subir el número), así que se deja a decisión del cliente.
57. **La grilla se llena más rápido y eso se nota en un proyecto grande.** Con Matrices y Sedes
    Grandes consumiendo dos celdas de ancho, un proyecto de 8-10 entidades se reparte bastante en
    profundidad y hay que desplazar la cámara más seguido que en v46. Conviene mirar un proyecto
    realista completo antes de la demo: si molesta, la salida sigue siendo `GRID_SPACING = 5`
    (subiendo `FRUSTUM` en la misma proporción para que entre lo mismo en pantalla).
58. **Las etiquetas de nombre se superponen cuando dos entidades quedan cerca en pantalla.** Con
    las entidades a este tamaño, "Matriz 1" y "Datacenter Epicentro" se pisan en la vista por
    defecto aunque los edificios no se toquen — es un problema de la capa HTML de etiquetas, no de
    la escena 3D. Se ve en `Claude outputs/v47-antes-despues.png`.

## Fuera de alcance

- **`pn_ent_plataforma.glb` (A7)**: sin cambios. Sigue sumando motivos: con el plinto como pieza
  separada, `PLATAFORMA_ALTO_REL` y `PLATAFORMA_CUERPO_REL` de v46 dejarían de ser estimaciones.
- **`firewall_virtual`**: sigue con su primitiva, por decisión del proveedor (v2 §3 B8).
- **Íconos de Nivel 3** (v2 §4): sigue siendo fase 2.
