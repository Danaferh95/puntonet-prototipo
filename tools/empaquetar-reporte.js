/* Genera js/reporte-assets.js con las imágenes que usa el reporte PDF (T08).
   Uso (desde la raíz del proyecto):  node tools/empaquetar-reporte.js

   Por qué existe: el PDF se arma como páginas HTML que html2canvas pasa a imagen. Con index.html
   abierto con doble clic (file://), Chrome trata cada imagen local como de otro origen y el
   canvas queda "contaminado": toDataURL() falla y el PDF no se puede generar. Embebidas como
   data: URI, las imágenes funcionan igual con file://, con un servidor o dentro de la app.
   Mismo criterio que tools/empaquetar-modelos.js. Los archivos de assets/ui/ siguen siendo la
   fuente de verdad: este archivo se regenera, no se edita.

   Incluye: el logo de Puntonet, los renders chicos de cada tipo de entidad y los cuatro
   símbolos de categoría. A los SVG se les quita el bloque <metadata> (firma C2PA, ~20 KB por
   archivo), que no dibuja nada. */
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const ui = p => path.join(raiz, 'assets', 'ui', p);
const salida = path.join(raiz, 'js', 'reporte-assets.js');

function svg(p){
  const txt = fs.readFileSync(ui(p), 'utf8').replace(/<metadata>[\s\S]*?<\/metadata>/g, '');
  return 'data:image/svg+xml;base64,' + Buffer.from(txt, 'utf8').toString('base64');
}
function webp(p){
  return 'data:image/webp;base64,' + fs.readFileSync(ui(p)).toString('base64');
}

const assets = {
  logo: svg('logos/puntonet-logo.svg'),
  renders: {
    sede: webp('renders-sm/sede.webp'),
    matriz: webp('renders-sm/matriz.webp'),
    nube: webp('renders-sm/nube.webp'),
    datacenter: webp('renders-sm/epicentro.webp'),
  },
  // Mismos símbolos que el panel de Salud (styles.css, .salud-row--<vertical>).
  categorias: {
    conectividad: svg('icons/categoria_conectividad.svg'),
    cloud: svg('icons/categoria_cloud.svg'),
    ciberseguridad: svg('icons/categoria_seguridad.svg'),
    colaboracion: svg('icons/cliente_personas.svg'),
  },
};

const cuerpo = JSON.stringify(assets, null, 1);
const cabecera =
  '/* ARCHIVO GENERADO por tools/empaquetar-reporte.js — NO EDITAR A MANO.\n' +
  '   Imágenes del reporte PDF como data: URI (' + (cuerpo.length/1024).toFixed(0) + ' KB). Ver functions.js §9-bis. */\n';
fs.writeFileSync(salida, cabecera + 'window.PN_REPORTE_ASSETS = ' + cuerpo + ';\n');
console.log('OK: ' + path.relative(raiz, salida) + ' (' + (cuerpo.length/1024).toFixed(0) + ' KB)');
