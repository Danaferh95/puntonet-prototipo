/* Arma www/, la carpeta que Capacitor empaqueta dentro del APK (webDir en capacitor.config.json).
   Copia SOLO lo que la app necesita para correr: la lista de tools/archivos-app.js (la misma que
   usa el service worker de la web).
   www/ es un resultado: está en .gitignore y se rehace entera cada vez.
   Uso: node tools/preparar-www.js   (lo corren npm run android:sync y android:build) */
const fs = require('fs');
const path = require('path');
const { RAIZ, archivosDeLaApp } = require('./archivos-app');

const destino = path.join(RAIZ, 'www');
fs.rmSync(destino, { recursive: true, force: true });
let archivos = 0, bytes = 0;
for(const rel of archivosDeLaApp()){
  const dest = path.join(destino, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(RAIZ, rel), dest);
  archivos++; bytes += fs.statSync(dest).size;
}
console.log(`www/ lista: ${archivos} archivos, ${(bytes/1024/1024).toFixed(1)} MB`);
