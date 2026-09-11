/* Genera js/modelos-glb.js a partir de los .glb de assets/glb/.
   Uso (desde la raíz del proyecto):  node tools/empaquetar-modelos.js

   Por qué existe: el navegador bloquea fetch() de archivos locales cuando index.html se abre con
   doble clic (file://). Embebiendo los .glb en un .js que se carga con <script>, los modelos
   aparecen igual con file://, con un servidor o dentro del empaquetado de la app.
   Los .glb de assets/glb/ siguen siendo la fuente de verdad: este archivo se regenera, no se edita. */
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const dirGlb = path.join(raiz, 'assets', 'glb');
const salida = path.join(raiz, 'js', 'modelos-glb.js');

const archivos = fs.readdirSync(dirGlb).filter(f => f.toLowerCase().endsWith('.glb')).sort();
if(!archivos.length){ console.error('No hay .glb en ' + dirGlb); process.exit(1); }

let total = 0;
const lineas = archivos.map(f => {
  const bytes = fs.readFileSync(path.join(dirGlb, f));
  if(bytes.readUInt32LE(0) !== 0x46546C67){ console.error(f + ' no es un glTF binario válido'); process.exit(1); }
  total += bytes.length;
  return '  ' + JSON.stringify(path.basename(f, '.glb')) + ': "' + bytes.toString('base64') + '"';
});

const cabecera =
  '/* ARCHIVO GENERADO por tools/empaquetar-modelos.js — NO EDITAR A MANO.\n' +
  '   Contiene los .glb de assets/glb/ en base64 (' + archivos.length + ' archivos, ' +
  (total / 1024).toFixed(0) + ' KB originales). Ver functions.js §3B (ModelLibrary). */\n';

fs.writeFileSync(salida, cabecera + 'window.PN_MODELOS_GLB = {\n' + lineas.join(',\n') + '\n};\n');
console.log('OK: ' + path.relative(raiz, salida) + ' con ' + archivos.length + ' modelos (' + (total/1024).toFixed(0) + ' KB)');
