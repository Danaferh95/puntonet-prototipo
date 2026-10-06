# Dependencias de terceros (control 7)

Inventario al 28/09/2026. Todas se instalan del registro oficial de npm con **versión exacta**
(`package.json` sin `^` ni `~`, más `package-lock.json`).

## Las que van dentro de la app

| Paquete | Versión | Licencia | Origen | Uso |
|---|---|---|---|---|
| three | 0.128.0 (r128) | MIT | github.com/mrdoob/three.js | Escena 3D. `js/vendor/three.min.js`, `GLTFLoader.js` y `postproceso-r128.js` (copias sin modificar de `examples/js`) |
| jspdf | 4.2.1 | MIT | github.com/parallax/jsPDF | Arma el PDF. `js/vendor/jspdf.umd.min.js` |
| html2canvas | 1.4.1 | MIT | github.com/niklasvh/html2canvas | Convierte cada página del reporte en imagen. `js/vendor/html2canvas.min.js` |
| @fontsource/inter | 5.3.0 | SIL OFL 1.1 | github.com/fontsource/font-files (Inter de Rasmus Andersson) | Tipografía, pesos 300/400/500/700. `assets/fonts/` |
| @capacitor/core, @capacitor/android | 8.5.2 | MIT | github.com/ionic-team/capacitor | Contenedor Android |
| @capacitor/filesystem | 8.1.3 | MIT | github.com/ionic-team/capacitor-filesystem | Escribir el PDF en la caché de la app |
| @capacitor/share | 8.0.2 | MIT | github.com/ionic-team/capacitor-plugins | Menú de compartir de Android |

Las copias de `js/vendor/` y `assets/fonts/` salen de `node_modules` con `npm run vendor`
(`tools/copiar-vendor.js`). `tests/offline.js` verifica que sean idénticas byte a byte.

## Solo para construir y probar (no van en la app)

| Paquete | Versión | Licencia | Uso |
|---|---|---|---|
| @capacitor/cli | 8.5.2 | MIT | Genera y sincroniza el proyecto Android |
| jsdom | 30.1.1 | MIT | Tests automáticos |

## Vulnerabilidades conocidas

- **Lo que va en la app:** `npm audit --omit=dev` → **0 vulnerabilidades**
  (`docs/evidencia/npm-audit-2026-09-28-fase4-produccion.txt`).
- **jsPDF:** se pasó de 2.5.1 a **4.2.1**; la 2.5.1 tenía CVE-2025-29907 y CVE-2025-68428. La app
  usa solo `new jsPDF`, `addPage`, `addImage` e `internal.pageSize`, que no cambiaron entre 2.x y
  4.x; el PDF completo se generó y revisó con la 4.2.1.
- **Herramienta de construcción:** `npm audit` completo reporta 3 de severidad **moderada** en la
  cadena `@capacitor/cli → xcode → uuid@7.0.3` (GHSA-w5hq-g745-h8pq). `xcode` solo se usa para
  proyectos **iOS**; corre en la PC del desarrollador al sincronizar y **no entra en el APK**.
  La "solución" que propone npm es bajar el CLI a 8.4.3, que desalinea el CLI del resto de
  Capacitor. Se acepta el riesgo y se revisa en cada actualización trimestral (el arreglo real es
  que Capacitor actualice `xcode`).

## html2canvas 1.4.1 sin mantenimiento

La última versión es de 2022. Se mantiene por ahora porque:
- procesa solo contenido que arma la propia app (las páginas del reporte), nunca HTML externo;
- no tiene vulnerabilidades publicadas en npm audit;
- reemplazarla cambia cómo se genera todo el PDF (T08), y el resultado actual está aprobado.

Alternativas evaluadas para una próxima etapa: `html2canvas-pro` (fork mantenido, misma API; es
el cambio más barato) o dibujar el PDF directamente con jsPDF (sin convertir HTML a imagen, más
trabajo). Se revisa en la revisión trimestral.

## Otros recursos de `assets/`

Los modelos `.glb`, los íconos SVG y los renders son del proveedor (arte propio del proyecto
MATTE). **Pendiente:** dejar por escrito su origen y licencia (control 7, Fase 6).

## Procedimiento de actualización (trimestral)

1. `npm outdated` y `npm audit` para ver versiones nuevas y vulnerabilidades.
2. Actualizar con versión exacta: `npm install --save-exact <paquete>@<versión>` (`--save-dev` si corresponde).
3. `npm run vendor` para copiar las librerías nuevas a `js/vendor/` y `assets/fonts/`.
4. Para Capacitor: `npm run android:sync`.
5. `npm test` y la prueba manual offline (canvas, modelos, PDF) en la tablet.
6. Guardar `npm audit` en `docs/evidencia/` y actualizar esta tabla.
