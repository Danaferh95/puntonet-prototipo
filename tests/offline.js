/* Offline y dependencias (etapa Android offline, controles 6 y 7 del registro de Puntonet).
   Verifica que la app no pida nada a internet, que las librerías de js/vendor/ y assets/fonts/
   sean copias exactas de las versiones fijadas en package.json, y que el código propio no use
   eval ni new Function.  Uso: node tests/offline.js  (lo corre npm test). */
const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..');
const leer = p => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const bin = p => fs.readFileSync(path.join(RAIZ, p));

let ok = 0, fail = 0;
function check(nombre, cond, detalle){
  if(cond){ ok++; console.log('  ✔ ' + nombre); }
  else { fail++; console.log('  ✘ ' + nombre + (detalle !== undefined ? '  → ' + JSON.stringify(detalle) : '')); }
}
function archivos(dir, ext){
  const out = [];
  for(const e of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes:true })){
    const rel = path.posix.join(dir, e.name);
    if(e.isDirectory()) out.push(...archivos(rel, ext));
    else if(ext.some(x=> e.name.endsWith(x))) out.push(rel);
  }
  return out;
}

console.log('\nA. Sin URLs remotas (index.html, css/, js/ propio)');
const PROPIOS = ['index.html', 'sw.js', 'capacitor.config.json', ...archivos('css', ['.css']), ...archivos('js', ['.js']).filter(f=> !f.startsWith('js/vendor/'))];
const NAMESPACES = /^https?:\/\/www\.w3\.org\//;
const remotas = [];
for(const f of PROPIOS){
  leer(f).split('\n').forEach((linea, i)=>{
    for(const m of linea.matchAll(/https?:\/\/[^\s"'`)<>]+/g)) if(!NAMESPACES.test(m[0])) remotas.push(`${f}:${i+1} ${m[0]}`);
  });
}
check('ninguna URL http(s) salvo namespaces SVG/XHTML', remotas.length === 0, remotas);
const html = leer('index.html');
check('index.html no usa Google Fonts ni CDN', !/fonts\.googleapis|fonts\.gstatic|cdnjs|unpkg|jsdelivr/.test(html));

console.log('\nB. Librerías locales = versiones fijadas en package.json');
const pkg = JSON.parse(leer('package.json'));
const deps = pkg.devDependencies || {};
check('versiones exactas (sin ^ ni ~)', Object.values(deps).every(v=> /^\d+\.\d+\.\d+$/.test(v)), deps);
const nm = p => path.join(RAIZ, 'node_modules', p);
const COPIAS = [
  ['three/build/three.min.js', 'js/vendor/three.min.js'],
  ['jspdf/dist/jspdf.umd.min.js', 'js/vendor/jspdf.umd.min.js'],
  ['html2canvas/dist/html2canvas.min.js', 'js/vendor/html2canvas.min.js'],
  ['three/examples/js/loaders/GLTFLoader.js', 'js/vendor/GLTFLoader.js'],
  ...[300, 400, 500, 700].map(p=> [`@fontsource/inter/files/inter-latin-${p}-normal.woff2`, `assets/fonts/inter-latin-${p}-normal.woff2`]),
];
for(const [origen, destino] of COPIAS){
  check(`${destino} idéntico a node_modules/${origen}`, fs.existsSync(nm(origen)) && bin(destino).equals(fs.readFileSync(nm(origen))));
}
// postproceso-r128.js = 4 archivos de three/examples/js concatenados, con separadores de comentario
const pp = ['shaders/CopyShader.js', 'shaders/LuminosityHighPassShader.js', 'postprocessing/EffectComposer.js', 'postprocessing/UnrealBloomPass.js']
  .map(f=> fs.readFileSync(nm('three/examples/js/' + f), 'utf8'));
const sinComentarios = s => s.replace(/^\/\* ---- examples\/js\/.* ---- \*\/$/mg, '').replace(/\s+/g, '');
const cuerpoPP = leer('js/vendor/postproceso-r128.js').replace(/^\/\*[\s\S]*?\*\//, '');
check('js/vendor/postproceso-r128.js = three@0.128.0 examples/js (sin modificar)', sinComentarios(cuerpoPP) === sinComentarios(pp.join('')));
check('jsPDF es 4.x', /^4\./.test(deps.jspdf || ''), deps.jspdf);
check('three es 0.128.0 (r128)', deps.three === '0.128.0');

console.log('\nC. Fuente Inter local');
const tokens = leer('css/base/tokens.css');
for(const p of [300, 400, 500, 700]){
  check(`@font-face Inter ${p} → assets/fonts`, new RegExp(`font-weight:${p};[^}]*url\\("\\.\\./\\.\\./assets/fonts/inter-latin-${p}-normal\\.woff2"\\)`).test(tokens));
}

console.log('\nD. Código propio sin eval / new Function');
const peligrosos = [];
for(const f of PROPIOS.filter(f=> f.endsWith('.js'))){
  const src = leer(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/mg, '');
  if(/\beval\s*\(|new\s+Function\s*\(/.test(src)) peligrosos.push(f);
}
check('ni eval( ni new Function( en js/ (fuera de vendor/)', peligrosos.length === 0, peligrosos);

console.log('\nF. Web sin conexión (service worker, 06/10/2026)');
{
  const { bloqueGenerado, INICIO, FIN } = require('../tools/generar-sw');
  const { archivosDeLaApp } = require('../tools/archivos-app');
  const sw = leer('sw.js').replace(/\r\n/g, '\n');
  const actual = sw.slice(sw.indexOf(INICIO), sw.indexOf(FIN) + FIN.length);
  check('sw.js al día con los archivos de la app (si falla: npm run sw)', actual === bloqueGenerado());
  const lista = archivosDeLaApp();
  check('la lista incluye index.html, three.js, jsPDF, html2canvas y las fuentes',
    ['index.html', 'js/vendor/three.min.js', 'js/vendor/jspdf.umd.min.js', 'js/vendor/html2canvas.min.js', 'assets/fonts/inter-latin-400-normal.woff2'].every(f=> lista.includes(f)));
  const scripts = [...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g)].map(m=> m[1]);
  check('todo lo que index.html carga está en la lista', scripts.every(f=> lista.includes(f)), scripts.filter(f=> !lista.includes(f)));
  const plataforma = leer('js/plataforma/plataforma.js');
  check('solo se registra por http(s), nunca en Capacitor ni Tauri',
    /register\('sw\.js'\)/.test(plataforma) && /esCapacitor \|\| esTauri/.test(plataforma) && /\^https\?:\$/.test(plataforma));
}

console.log('\nE. Android (Capacitor): permisos mínimos y datos que no salen del equipo (controles 10 y 11)');
if(fs.existsSync(path.join(RAIZ, 'android/app/src/main/AndroidManifest.xml'))){
  const manifiesto = leer('android/app/src/main/AndroidManifest.xml');
  const permisos = [...manifiesto.matchAll(/<uses-permission[^>]*android:name="([^"]+)"([^>]*)>/g)];
  check('ningún permiso pedido (solo remociones tools:node="remove")', permisos.every(m=> /tools:node="remove"/.test(m[2])), permisos.map(m=>m[1]));
  check('INTERNET removido explícitamente', permisos.some(m=> m[1]==='android.permission.INTERNET' && /tools:node="remove"/.test(m[2])));
  check('allowBackup="false"', /android:allowBackup="false"/.test(manifiesto));
  check('dataExtractionRules excluye nube y traspaso', /android:dataExtractionRules="@xml\/data_extraction_rules"/.test(manifiesto) &&
    /<cloud-backup>[\s\S]*domain="sharedpref"[\s\S]*<\/cloud-backup>[\s\S]*<device-transfer>[\s\S]*domain="sharedpref"/.test(leer('android/app/src/main/res/xml/data_extraction_rules.xml')));
  check('usesCleartextTraffic="false"', /android:usesCleartextTraffic="false"/.test(manifiesto));
  check('orientación sensorLandscape', /android:screenOrientation="sensorLandscape"/.test(manifiesto));
  const rutas = leer('android/app/src/main/res/xml/file_paths.xml').replace(/<!--[\s\S]*?-->/g, '');
  check('FileProvider expone solo la caché de la app', /<cache-path/.test(rutas) && !/external-path|files-path|root-path/.test(rutas));
  const cfg = JSON.parse(leer('capacitor.config.json'));
  check('capacitor.config.json: webDir www, sin server.url (nada remoto)', cfg.webDir === 'www' && !(cfg.server && cfg.server.url));
  const ignorados = leer('.gitignore');
  check('.gitignore: www/, keystore y claves de firma', /^www\/$/m.test(ignorados) && /\*\.jks/.test(ignorados) && /keystore\.properties/.test(ignorados));
} else {
  console.log('  (sin carpeta android/: se omite)');
}

console.log(`\n${ok} ok · ${fail} con falla`);
process.exit(fail ? 1 : 0);
