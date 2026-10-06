/* Lista ÚNICA de los archivos que la app necesita para correr. La usan:
   - tools/preparar-www.js (la carpeta www/ que Capacitor mete en el APK de Android), y
   - tools/generar-sw.js (lo que el service worker de la web guarda para funcionar sin conexión).
   Así Android y la web siempre llevan exactamente los mismos archivos.
   Entra: index.html, css/, js/ y assets/. No entra nada de tests/, tools/, docs/, capturas/,
   node_modules/ ni "Claude outputs/", y tampoco:
   - la documentación interna (README.md);
   - los renders grandes de entidades (assets/ui/renders/{sede,matriz,nube,epicentro}.png, ~7.5 MB):
     son el original del que salen los .webp chicos de assets/ui/renders-sm/, que es lo que usan el
     CSS y el PDF (tools/empaquetar-reporte.js). Nada de index.html, css/ ni js/ los referencia. */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const INCLUIR = ['index.html', 'css', 'js', 'assets'];
const EXCLUIR = /(^|[\\/])README\.md$|[\\/]ui[\\/]renders[\\/](sede|matriz|nube|epicentro)\.png$/i;

/* Rutas relativas a la raíz, con "/" (también en Windows), en orden alfabético estable. */
function archivosDeLaApp(){
  const out = [];
  const recorrer = rel=>{
    const abs = path.join(RAIZ, rel);
    if(EXCLUIR.test(abs)) return;
    if(fs.statSync(abs).isDirectory()){
      fs.readdirSync(abs).sort().forEach(n=> recorrer(path.posix.join(rel, n)));
    } else out.push(rel);
  };
  INCLUIR.forEach(recorrer);
  return out;
}

module.exports = { RAIZ, archivosDeLaApp };
