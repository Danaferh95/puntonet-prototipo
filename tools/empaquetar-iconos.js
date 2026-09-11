/* Genera js/iconos-glb.js a partir de los .glb de assets/glb-iconos/.
   Uso (desde la raíz del proyecto):  node tools/empaquetar-iconos.js

   Hermano de tools/empaquetar-modelos.js (mismo motivo: fetch() de archivos locales no funciona
   con index.html abierto por doble clic en file://). Va en un archivo y una carpeta separados de
   los de las 6 entidades — window.PN_MODELOS_GLB / assets/glb/ — a propósito: smoke-test-modelos.js
   valida que PN_MODELOS_GLB traiga EXACTAMENTE los archivos de MODELOS (las 6 entidades), así que
   mezclar los íconos ahí rompería ese test. IconLibrary (functions.js §3D) lee PN_ICONOS_GLB.
   Los .glb de assets/glb-iconos/ siguen siendo la fuente de verdad: este archivo se regenera, no
   se edita. */
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const dirGlb = path.join(raiz, 'assets', 'glb-iconos');
const salida = path.join(raiz, 'js', 'iconos-glb.js');

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
  '/* ARCHIVO GENERADO por tools/empaquetar-iconos.js — NO EDITAR A MANO.\n' +
  '   Contiene los .glb de assets/glb-iconos/ en base64 (' + archivos.length + ' archivos, ' +
  (total / 1024).toFixed(0) + ' KB originales). Ver functions.js §3D (IconLibrary). */\n';

fs.writeFileSync(salida, cabecera + 'window.PN_ICONOS_GLB = {\n' + lineas.join(',\n') + '\n};\n');
console.log('OK: ' + path.relative(raiz, salida) + ' con ' + archivos.length + ' íconos (' + (total/1024).toFixed(0) + ' KB)');
