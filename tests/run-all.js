/* Corre los 3 smoke tests en serie y resume.  Uso:  npm test   (o  node tests/run-all.js) */
const { spawnSync } = require('child_process');
const path = require('path');
let fallas = 0;
for (const t of ['smoke-modelos', 'smoke-iconos', 'smoke-brillo']) {
  console.log(`\n━━━ ${t} ━━━`);
  const r = spawnSync(process.execPath, [path.join(__dirname, t + '.js')], { stdio: 'inherit' });
  if (r.status !== 0) fallas++;
}
console.log(fallas ? `\n✘ ${fallas} smoke test(s) con fallas` : '\n✔ Los 3 smoke tests pasan');
process.exit(fallas ? 1 : 0);
