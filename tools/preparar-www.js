/* Arma www/, la carpeta que Capacitor empaqueta dentro del APK (webDir en capacitor.config.json).
   Copia SOLO lo que la app necesita para correr: index.html, css/, js/ y assets/. Nada de tests/,
   tools/, docs/, capturas/, node_modules/ ni "Claude outputs/".
   www/ es un resultado: está en .gitignore y se rehace entera cada vez.
   Uso: node tools/preparar-www.js   (lo corren npm run android:sync y android:build) */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const destino = path.join(raiz, 'www');
const INCLUIR = ['index.html', 'css', 'js', 'assets'];
// Documentación interna que no tiene por qué viajar en el APK.
const EXCLUIR = /(^|[\\/])README\.md$/i;

fs.rmSync(destino, { recursive: true, force: true });
fs.mkdirSync(destino);
let archivos = 0, bytes = 0;
for(const item of INCLUIR){
  fs.cpSync(path.join(raiz, item), path.join(destino, item), {
    recursive: true,
    filter: origen=> {
      if(EXCLUIR.test(origen)) return false;
      const st = fs.statSync(origen);
      if(st.isFile()){ archivos++; bytes += st.size; }
      return true;
    },
  });
}
console.log(`www/ lista: ${archivos} archivos, ${(bytes/1024/1024).toFixed(1)} MB`);
