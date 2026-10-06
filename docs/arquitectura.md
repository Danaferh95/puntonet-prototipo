# Arquitectura · Configurador de infraestructura Puntonet

Documento para la evaluación de TI de Puntonet (controles 1 y 4). Borrador al 28/09/2026, rama
`android-offline`.

## En una frase

Una aplicación web **estática** (HTML, CSS y JavaScript) que corre entera dentro del equipo: en una
tablet Android empaquetada como app con Capacitor, o en una PC abriendo `index.html`. **No tiene
servidor, no tiene base de datos y no se conecta a la red.**

## Componentes

```
┌──────────────────────────── Equipo del vendedor (tablet o PC) ────────────────────────────┐
│                                                                                            │
│  App Android (Capacitor 8)         o          Navegador (Chrome/Edge, doble clic)          │
│  └─ WebView del sistema                        └─ index.html por file://                   │
│        │                                                │                                  │
│        └──────────────── misma aplicación web ──────────┘                                  │
│                                                                                            │
│   index.html  ── css/ (apariencia)                                                         │
│               ── js/core, escena, entidades, interaccion, ui, reporte (lógica)             │
│               ── js/vendor: three.js r128, GLTFLoader, post-proceso, jsPDF 4.2.1,          │
│                  html2canvas 1.4.1          assets/: modelos .glb, íconos, Inter           │
│               ── js/plataforma/plataforma.js  ← lo único que cambia por plataforma         │
│                        │                                   │                               │
│                 almacén local                      guardar/compartir archivo               │
│              (localStorage de la WebView)     (descarga en PC · menú compartir Android)    │
└────────────────────────────────────────────────────────────────────────────────────────────┘
                              Sin conexiones hacia afuera
```

| Pieza | Tecnología | Dónde |
|---|---|---|
| Interfaz y lógica | HTML, CSS, JavaScript (scripts clásicos, sin framework, sin bundler) | `index.html`, `css/`, `js/` (ver `js/README.md` y `css/README.md`) |
| Escena 3D | three.js r128 (WebGL) | `js/escena/`, `js/vendor/three.min.js` |
| Reporte PDF | html2canvas (páginas HTML → imagen) + jsPDF (arma el PDF) | `js/reporte/pdf.js` |
| Capa de plataforma | JavaScript | `js/plataforma/plataforma.js` |
| Persistencia | `localStorage` de la WebView, a través de la capa de plataforma | `js/core/persistencia.js` |
| Contenedor Android | Capacitor 8.5.2 + plugins oficiales Filesystem y Share | `android/`, `capacitor.config.json` |

## Flujo de datos

1. El vendedor arma la infraestructura del cliente en pantalla (sedes, Matrices, Nubes, productos,
   conexiones). Todo vive en memoria, en el objeto `state` (`js/core/estado.js`).
2. Cada cambio se guarda en el **almacén local del equipo** (con una espera corta, y enseguida si
   la app pasa a segundo plano). Al volver a abrir la app, la sesión se restaura.
3. Al generar el reporte, el PDF (o el JSON) se arma **en el equipo**. En la PC se descarga; en la
   tablet se escribe en la caché privada de la app y se abre el menú de compartir de Android. Lo que
   el vendedor comparte sale de la app por decisión suya y bajo las reglas del equipo (MDM).
4. **Guardar estado actual** guarda el *inicio* de la sesión (la infraestructura con la que llegó
   el cliente). Cada clic lo reemplaza, con confirmación si ya había uno. El *final* lo toma solo
   el reporte, con lo que hay en pantalla (ajuste del 06/10/2026).
5. **Nueva sesión** borra lo guardado (configuración, inicio y final) y arranca de cero. Está en la
   web y en Android.

No hay usuarios, contraseñas ni sesiones de servidor: la app no autentica porque no expone ni
consume ningún servicio. El acceso a la app es el acceso al equipo.

## Sin red

- Todas las librerías y la tipografía están copiadas en el proyecto (`js/vendor/`, `assets/fonts/`).
  No se usa ningún CDN ni Google Fonts.
- El código no hace peticiones a internet ni carga código remoto (sin `eval`, sin `new Function`,
  sin actualizaciones en vivo).
- La app Android no pide el permiso `INTERNET`.
- **Web publicada (Cloudflare u otro servidor):** `sw.js` (service worker) guarda todos los archivos
  de la app la primera vez que se abre; desde ahí abre y funciona sin internet, incluido el PDF.
  La lista de archivos es la misma que va al APK (`tools/archivos-app.js`). Solo se registra por
  http(s): en Android, con doble clic (`file://`) o en el instalador de Windows no hace falta.
  **Al publicar cambios hay que correr `npm run sw`** (actualiza la versión y la lista; `npm test`
  falla si quedó desactualizado). Los navegadores que ya la tenían bajan la versión nueva y la app
  avisa que hay que recargar.
- `tests/offline.js` lo verifica en cada `npm test`: sin URLs remotas en el código propio, librerías
  idénticas a las versiones fijadas, sin `eval`, y los permisos del manifiesto.

## Sin base de datos

Los datos de trabajo son la configuración que se está armando. Se guardan como un único texto JSON
en el almacén local del equipo, dentro de la app, y se borran al desinstalar. No hay base de datos
local ni remota.

## Independencia de plataforma

El código de la app no pregunta en qué plataforma corre: lo que depende de ella (guardar el
estado, exportar un archivo) pasa por `Plataforma`. Hoy hay dos implementaciones (navegador y
Capacitor). Si Puntonet confirma laptops Windows, se agrega una tercera (Tauri, con WebView2) sin
tocar el resto.

## Seguridad en el código

- Todo texto que ingresa el usuario pasa por `escapeHtml` (escapa `& < > " '`) antes de ir a
  `innerHTML`.
- Sin estilos ni scripts inline generados desde datos del usuario.
- Dependencias con versión exacta, instaladas del registro oficial de npm; `npm audit` guardado en
  `docs/evidencia/`. Detalle en `docs/dependencias.md`.

## Código fuente

Repositorio git (`github.com/Danaferh95/puntonet-prototipo`). La entrega del código a
Puntonet y el momento en que pasa la propiedad son parte del contrato (control 14, pendiente).

| Carpeta | Qué es |
|---|---|
| `index.html`, `css/`, `js/`, `assets/` | La aplicación (lo único que va dentro del APK) |
| `android/` | Proyecto Android nativo generado por Capacitor |
| `tools/` | Scripts de construcción (empaquetar modelos e íconos, copiar librerías, armar `www/`) |
| `tests/` | Pruebas automáticas (`npm test`) |
| `docs/` | Esta documentación y la evidencia |
