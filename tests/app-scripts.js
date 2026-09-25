/* Código de la app, tal como lo carga index.html.
   Lee los <script src="js/..."> de index.html en orden y deja afuera vendor/ y los datos
   embebidos (modelos-glb, iconos-glb, reporte-assets), que cada smoke test carga por su cuenta.
   - APP:   [{ archivo, codigo }] en orden de carga. Cada uno se ejecuta como un <script> propio,
            igual que en el navegador (así un test detecta si un archivo usa algo que carga después).
   - FUNCS: todo el código concatenado, para las verificaciones que buscan texto en el fuente. */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const DATOS = /\/(vendor\/|modelos-glb\.js|iconos-glb\.js|reporte-assets\.js)/;

const APP = [...HTML.matchAll(/<script src="(js\/[^"]+)"/g)]
  .map(m => m[1])
  .filter(f => !DATOS.test('/' + f))
  .map(archivo => ({ archivo, codigo: fs.readFileSync(path.join(RAIZ, archivo), 'utf8') }));

const FUNCS = APP.map(s => s.codigo).join('\n');

module.exports = { RAIZ, APP, FUNCS };
