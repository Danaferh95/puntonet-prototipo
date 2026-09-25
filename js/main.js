/* =========================================================================
   ARRANQUE — único archivo que EJECUTA la app al cargar.
   Todos los demás archivos de js/ solo declaran (constantes, funciones, listeners). Las
   llamadas que dibujan o pintan algo al inicio viven acá, en el mismo orden que tenían en el
   functions.js original, y corren cuando TODO el código ya está cargado: así ningún archivo
   depende de que otro que viene después ya exista.
   Orden de carga: ver js/README.md (y los <script> de index.html).
   ========================================================================= */

construirDatacenter();   // §3 escena/entidades.js
animate();               // escena/loop.js

/* Carga de los modelos .glb (entidades) e íconos de producto: ver escena/loop.js */
const modelosListos = ModelLibrary.precargar().then(estado=>{
  if(estado !== 'sin_modelos') aplicarModelosAEscena();
  return estado;
});
/* v18: misma estrategia que modelosListos, pero para los íconos de producto (§3D), en su propia
   promesa — deliberadamente SIN tocar el contrato de modelosListos (los smoke tests existentes
   lo esperan resuelto como un string de estado de las 6 entidades nada más). Si una sede/Matriz
   ya tiene productos asignados y sus íconos llegan después de dibujarse, aplicarModelosAEscena()
   los reconstruye igual que hace con las entidades. */
const iconosListos = IconLibrary.precargar().then(estado=>{
  if(estado !== 'sin_modelos') aplicarModelosAEscena();
  return estado;
});

syncDatacenterRestoreUI();   // ui/panel-derecho.js
renderCatalogPanel();        // ui/catalogo-panel.js
renderLogoButton();          // reporte/reporte.js

/* =========================================================================
   10. ESTADO INICIAL (arranca casi vacío: el usuario agrega todo lo demás)
   ========================================================================= */
(function seed(){
  // Único punto de partida: el Datacenter Epicentro, solo, en su posición fija, con el punto
  // decorativo del centro de la grilla. Ninguna Matriz existe por defecto — pueden ser varias,
  // y cada una se agrega arrastrándola desde el panel izquierdo, igual que una sede. Ni sedes, ni
  // productos, ni conexiones — todo lo construye el usuario desde cero.
  rebuildConnections();
  renderRightPanel();
})();

/* Librerías del PDF: se piden cuando el navegador queda libre, sin demorar el arranque
   (ver cargarLibreriasPDF en reporte/pdf.js). El tope de 3 s es para equipos lentos, donde el
   loop de render puede no dejar nunca un momento "libre". */
if(window.requestIdleCallback) requestIdleCallback(()=> cargarLibreriasPDF(), { timeout: 3000 });
else setTimeout(()=> cargarLibreriasPDF(), 1500);
