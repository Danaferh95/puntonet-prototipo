/* =========================================================================
   SERVICE WORKER — la web funciona sin conexión (06/10/2026)
   La primera vez que se abre la web (Cloudflare o cualquier servidor http/https), el navegador
   guarda en su caché TODOS los archivos de la app (la misma lista que va en el APK de Android:
   tools/archivos-app.js). Desde ahí la app abre y funciona aunque no haya internet.
   - Solo lo registra js/plataforma/plataforma.js (activarModoSinConexion), y solo por http(s):
     en Android (Capacitor), abriendo index.html con doble clic (file://) o en el futuro instalador
     de Windows no hace falta, porque los archivos ya están en el equipo.
   - Estrategia: primero la caché, si no está, la red. Nada se pide a otros dominios.
   - VERSION es un hash del contenido. Al publicar cambios hay que correr `npm run sw` (npm test
     falla si quedó desactualizado): el navegador ve que sw.js cambió, guarda la versión nueva,
     borra la vieja y la app avisa que hay que recargar.
   ========================================================================= */
/* <generado por tools/generar-sw.js> */
const VERSION = '3e54166f1bd1';
const ARCHIVOS = [
  "./",
  "index.html",
  "css/base/layout.css",
  "css/base/mascaras.css",
  "css/base/tokens.css",
  "css/componentes/boton.css",
  "css/componentes/campos.css",
  "css/componentes/catalogo.css",
  "css/componentes/header.css",
  "css/componentes/modales.css",
  "css/componentes/panel-detalle.css",
  "css/componentes/salud.css",
  "css/componentes/visor.css",
  "css/reporte/pdf.css",
  "css/reporte/reporte.css",
  "js/core/catalogo.js",
  "js/core/estado.js",
  "js/core/persistencia.js",
  "js/core/utilidades.js",
  "js/entidades/conexiones.js",
  "js/entidades/crear.js",
  "js/entidades/sedes.js",
  "js/escena/assets.js",
  "js/escena/base.js",
  "js/escena/brillo.js",
  "js/escena/cables.js",
  "js/escena/camara.js",
  "js/escena/colocacion-iconos.js",
  "js/escena/color-luces.js",
  "js/escena/entidades.js",
  "js/escena/iconos.js",
  "js/escena/loop.js",
  "js/escena/modelos.js",
  "js/escena/piso.js",
  "js/escena/recursos.js",
  "js/iconos-glb.js",
  "js/interaccion/raycasting.js",
  "js/main.js",
  "js/modelos-glb.js",
  "js/plataforma/plataforma.js",
  "js/reporte/estructura.js",
  "js/reporte/pdf.js",
  "js/reporte/reporte.js",
  "js/reporte-assets.js",
  "js/ui/arrastre.js",
  "js/ui/avisos.js",
  "js/ui/catalogo-panel.js",
  "js/ui/conexiones-panel.js",
  "js/ui/deseleccionar.js",
  "js/ui/edicion.js",
  "js/ui/panel-derecho.js",
  "js/ui/popup.js",
  "js/ui/salud.js",
  "js/vendor/GLTFLoader.js",
  "js/vendor/html2canvas.min.js",
  "js/vendor/jspdf.umd.min.js",
  "js/vendor/postproceso-r128.js",
  "js/vendor/three.min.js",
  "assets/fonts/LICENSE-Inter.txt",
  "assets/fonts/inter-latin-300-normal.woff2",
  "assets/fonts/inter-latin-400-normal.woff2",
  "assets/fonts/inter-latin-500-normal.woff2",
  "assets/fonts/inter-latin-700-normal.woff2",
  "assets/glb/pn_ent_datacenter.glb",
  "assets/glb/pn_ent_matriz.glb",
  "assets/glb/pn_ent_nube.glb",
  "assets/glb/pn_ent_sede_grande.glb",
  "assets/glb/pn_ent_sede_mediana.glb",
  "assets/glb/pn_ent_sede_pequena.glb",
  "assets/glb-iconos/pn_ico_antena.glb",
  "assets/glb-iconos/pn_ico_candado.glb",
  "assets/glb-iconos/pn_ico_documento.glb",
  "assets/glb-iconos/pn_ico_enlace.glb",
  "assets/glb-iconos/pn_ico_escudo.glb",
  "assets/glb-iconos/pn_ico_firewall_onpremise.glb",
  "assets/glb-iconos/pn_ico_globo.glb",
  "assets/glb-iconos/pn_ico_llave.glb",
  "assets/glb-iconos/pn_ico_muro.glb",
  "assets/glb-iconos/pn_ico_nodo.glb",
  "assets/glb-iconos/pn_ico_nube.glb",
  "assets/glb-iconos/pn_ico_pantalla.glb",
  "assets/glb-iconos/pn_ico_puerta.glb",
  "assets/glb-iconos/pn_ico_puntonet_space.glb",
  "assets/glb-iconos/pn_ico_rack.glb",
  "assets/ui/icons/antena.svg",
  "assets/ui/icons/aplicacion.svg",
  "assets/ui/icons/app_cloud.svg",
  "assets/ui/icons/app_segura.svg",
  "assets/ui/icons/archivos_cloud.svg",
  "assets/ui/icons/carpeta_cloud.svg",
  "assets/ui/icons/categoria_cloud.svg",
  "assets/ui/icons/categoria_colaboracion.svg",
  "assets/ui/icons/categoria_conectividad.svg",
  "assets/ui/icons/categoria_networking.svg",
  "assets/ui/icons/categoria_seguridad.svg",
  "assets/ui/icons/chat_cloud.svg",
  "assets/ui/icons/cliente_datos.svg",
  "assets/ui/icons/cliente_personas.svg",
  "assets/ui/icons/cloud_descarga.svg",
  "assets/ui/icons/cloud_gestionado.svg",
  "assets/ui/icons/cloud_interconnect.svg",
  "assets/ui/icons/cloud_nodo.svg",
  "assets/ui/icons/cloud_seguro.svg",
  "assets/ui/icons/compartir.svg",
  "assets/ui/icons/conexion_usb.svg",
  "assets/ui/icons/conferencia.svg",
  "assets/ui/icons/conversacion.svg",
  "assets/ui/icons/cookie.svg",
  "assets/ui/icons/correo_cloud.svg",
  "assets/ui/icons/credencial.svg",
  "assets/ui/icons/endpoint.svg",
  "assets/ui/icons/enlace_radio.svg",
  "assets/ui/icons/ethernet.svg",
  "assets/ui/icons/firewall.svg",
  "assets/ui/icons/guardar.svg",
  "assets/ui/icons/hosting.svg",
  "assets/ui/icons/housing.svg",
  "assets/ui/icons/impresion_cloud.svg",
  "assets/ui/icons/inspeccion.svg",
  "assets/ui/icons/internet.svg",
  "assets/ui/icons/internet_cloud.svg",
  "assets/ui/icons/movil_cloud.svg",
  "assets/ui/icons/movil_wifi.svg",
  "assets/ui/icons/navegador.svg",
  "assets/ui/icons/ofimatica.svg",
  "assets/ui/icons/portatil.svg",
  "assets/ui/icons/procesador.svg",
  "assets/ui/icons/red_cloud.svg",
  "assets/ui/icons/router.svg",
  "assets/ui/icons/router_simple.svg",
  "assets/ui/icons/salud.svg",
  "assets/ui/icons/sdwan.svg",
  "assets/ui/icons/servidor_cloud.svg",
  "assets/ui/icons/soporte_cloud.svg",
  "assets/ui/icons/ventana.svg",
  "assets/ui/icons/ventanas.svg",
  "assets/ui/icons/wifi_equipo.svg",
  "assets/ui/logos/puntonet-logo-blanco.svg",
  "assets/ui/logos/puntonet-logo.svg",
  "assets/ui/marca/marca-agua.svg",
  "assets/ui/medallions/medallion-ciberseguridad.svg",
  "assets/ui/medallions/medallion-cloud.svg",
  "assets/ui/medallions/medallion-colaboracion.svg",
  "assets/ui/medallions/medallion-conectividad.svg",
  "assets/ui/renders/background.png",
  "assets/ui/renders/halo_off.png",
  "assets/ui/renders/halo_on.png",
  "assets/ui/renders/panel.png",
  "assets/ui/renders/rail.png",
  "assets/ui/renders-sm/epicentro.webp",
  "assets/ui/renders-sm/matriz.webp",
  "assets/ui/renders-sm/nube.webp",
  "assets/ui/renders-sm/sede.webp"
];
/* </generado> */
const CACHE = 'puntonet-configurador-' + VERSION;

self.addEventListener('install', evento=>{
  evento.waitUntil(
    caches.open(CACHE)
      .then(cache=> cache.addAll(ARCHIVOS.map(a=> new Request(a, { cache: 'reload' }))))
      .then(()=> self.skipWaiting())
  );
});

self.addEventListener('activate', evento=>{
  evento.waitUntil(
    caches.keys()
      .then(claves=> Promise.all(claves
        .filter(c=> c.startsWith('puntonet-configurador-') && c !== CACHE)
        .map(c=> caches.delete(c))))
      .then(()=> self.clients.claim())
  );
});

self.addEventListener('fetch', evento=>{
  const req = evento.request;
  if(req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  evento.respondWith((async ()=>{
    const cache = await caches.open(CACHE);
    // La página (/, /index.html, con o sin ?parámetros) siempre sale de la copia guardada.
    const guardada = req.mode === 'navigate'
      ? await cache.match('./')
      : await cache.match(req, { ignoreSearch: true });
    if(guardada) return guardada;
    return fetch(req);
  })());
});
