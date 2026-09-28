/* Copia las librerías de terceros desde node_modules/ a js/vendor/ y assets/fonts/.
   Es la única vía por la que entran: versiones fijadas en package.json (sin ^ ni ~), instaladas
   desde el registro oficial de npm. Para actualizar una librería (revisión trimestral, control 7):
     1. npm install --save-dev --save-exact <paquete>@<versión>
     2. node tools/copiar-vendor.js   (o: npm run vendor)
     3. npm audit && npm test, y probar la app offline (canvas, GLB, PDF).
   GLTFLoader.js y postproceso-r128.js no se copian acá: salen de three/examples/js y el test
   tests/vendor.js verifica que sigan siendo idénticos a los de three@0.128.0. */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const COPIAS = [
  ['node_modules/three/build/three.min.js', 'js/vendor/three.min.js'],
  ['node_modules/jspdf/dist/jspdf.umd.min.js', 'js/vendor/jspdf.umd.min.js'],
  ['node_modules/html2canvas/dist/html2canvas.min.js', 'js/vendor/html2canvas.min.js'],
  ['node_modules/@fontsource/inter/LICENSE', 'assets/fonts/LICENSE-Inter.txt'],
  ...[300, 400, 500, 700].map(p=> [
    `node_modules/@fontsource/inter/files/inter-latin-${p}-normal.woff2`,
    `assets/fonts/inter-latin-${p}-normal.woff2`,
  ]),
];

fs.mkdirSync(path.join(raiz, 'assets/fonts'), { recursive: true });
for(const [origen, destino] of COPIAS){
  fs.copyFileSync(path.join(raiz, origen), path.join(raiz, destino));
  console.log(`${origen} -> ${destino}`);
}
