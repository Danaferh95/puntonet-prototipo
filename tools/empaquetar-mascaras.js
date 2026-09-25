/* Genera css/base/mascaras.css con los íconos que se usan como máscara CSS (mask-image).
   Uso (desde la raíz del proyecto):  node tools/empaquetar-mascaras.js

   Por qué existe: con index.html abierto con doble clic (file://), Chrome exige CORS para
   mask-image y bloquea los .svg locales ("Cross origin requests are only supported for protocol
   schemes: http, https…"): los símbolos de categoría del panel de Salud no aparecían. Embebidos
   como data: URI funcionan igual con file:// y con un servidor. Mismo criterio que
   tools/empaquetar-reporte.js. Los archivos de assets/ui/icons/ siguen siendo la fuente de
   verdad: este CSS se regenera, no se edita.

   Para agregar una máscara: sumarla a MASCARAS y volver a correr el script. Se usa desde el CSS
   como var(--pn-mask-<nombre>). A los SVG se les quita el bloque <metadata> (firma C2PA, ~20 KB
   por archivo), que no dibuja nada. */
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const salida = path.join(raiz, 'css', 'base', 'mascaras.css');

const MASCARAS = {
  'categoria-conectividad': 'icons/categoria_conectividad.svg',
  'categoria-cloud':        'icons/categoria_cloud.svg',
  'categoria-seguridad':    'icons/categoria_seguridad.svg',
  'cliente-personas':       'icons/cliente_personas.svg',
};

function svg(p){
  const txt = fs.readFileSync(path.join(raiz, 'assets', 'ui', p), 'utf8').replace(/<metadata>[\s\S]*?<\/metadata>/g, '');
  return 'data:image/svg+xml;base64,' + Buffer.from(txt, 'utf8').toString('base64');
}

const lineas = Object.entries(MASCARAS).map(([nombre, archivo])=>
  `  /* assets/ui/${archivo} */\n  --pn-mask-${nombre}:url("${svg(archivo)}");`);
const css = `/* ARCHIVO GENERADO por tools/empaquetar-mascaras.js — NO EDITAR A MANO.
   Íconos usados como mask-image, embebidos como data: URI para que se vean también al abrir
   index.html con doble clic (file://). */
:root{
${lineas.join('\n')}
}
`;
fs.writeFileSync(salida, css);
console.log('css/base/mascaras.css: ' + Object.keys(MASCARAS).length + ' máscaras, ' + (css.length/1024).toFixed(1) + ' KB');
