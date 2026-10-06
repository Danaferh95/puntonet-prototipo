/* Genera la lista de archivos y la versión del service worker (sw.js, en la raíz).
   Hay que correrlo después de cambiar CUALQUIER archivo de la app (index.html, css/, js/,
   assets/): la versión es un hash del contenido, y si no cambia, los navegadores que ya
   abrieron la web seguirían usando la copia vieja guardada. npm test avisa si quedó desactualizado.
   Uso: npm run sw   (node tools/generar-sw.js) */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { RAIZ, archivosDeLaApp } = require('./archivos-app');

/* Hash del contenido con los finales de línea normalizados: en Windows git deja los archivos con
   CRLF y en Linux con LF; la versión tiene que dar igual en los dos. */
function calcularVersion(archivos){
  const h = crypto.createHash('sha256');
  for(const rel of archivos){
    let datos = fs.readFileSync(path.join(RAIZ, rel));
    if(/\.(html|css|js|json|txt|svg|md)$/i.test(rel)) datos = Buffer.from(datos.toString('utf8').replace(/\r\n/g, '\n'));
    h.update(rel + '\0'); h.update(datos); h.update('\0');
  }
  return h.digest('hex').slice(0, 12);
}

const INICIO = '/* <generado por tools/generar-sw.js> */';
const FIN = '/* </generado> */';
function bloqueGenerado(){
  const archivos = archivosDeLaApp();
  return `${INICIO}\nconst VERSION = '${calcularVersion(archivos)}';\nconst ARCHIVOS = ${JSON.stringify(['./', ...archivos], null, 2)};\n${FIN}`;
}

module.exports = { bloqueGenerado, INICIO, FIN };

if(require.main === module){
  const ruta = path.join(RAIZ, 'sw.js');
  const sw = fs.readFileSync(ruta, 'utf8');
  const a = sw.indexOf(INICIO), b = sw.indexOf(FIN);
  if(a < 0 || b < 0) throw new Error('sw.js no tiene el bloque generado');
  const eol = sw.includes('\r\n') ? '\r\n' : '\n';
  const nuevo = sw.slice(0, a) + bloqueGenerado().replace(/\n/g, eol) + sw.slice(b + FIN.length);
  fs.writeFileSync(ruta, nuevo);
  const n = (nuevo.match(/^\s+"/gm) || []).length;
  console.log(`sw.js actualizado: ${n} archivos`);
}
