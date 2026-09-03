/* Smoke test de la fase "Concentrador de la Matriz + Backup hereda el ancho de banda".
   Carga index.html + three r128 + functions.js en jsdom con el WebGLRenderer sustituido por un
   doble (no hay GPU acá) y verifica los 2 pedidos del cliente del 03/09/2026 más un bloque de
   control ("nada más se movió de lugar").

   Correr con:  npm i jsdom three@0.128.0  &&  node smoke-test-concentrador.js
   (con index.html, functions.js y styles.css al lado) */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const threeSrc = fs.readFileSync(path.join(__dirname, 'node_modules/three/build/three.min.js'), 'utf8');
const appSrc = fs.readFileSync(path.join(__dirname, 'functions.js'), 'utf8');

const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const win = dom.window;

win.eval(threeSrc);

/* --- Dobles de lo que jsdom no tiene --- */
win.eval(`
  THREE.WebGLRenderer = function(){
    this.domElement = document.createElement('canvas');
    this.domElement.width = 800; this.domElement.height = 600;
    this.setSize = function(){}; this.setPixelRatio = function(){};
    this.render = function(){}; this.setClearColor = function(){};
    this.getClearColor = function(t){ return t || new THREE.Color(); };
    this.getClearAlpha = function(){ return 0; };
    this.shadowMap = {};
  };
  // jsdom no trae canvas 2D real; alcanza con un doble no-op (los sprites/etiquetas se dibujan
  // pero nadie mira el resultado en un test de lógica).
  HTMLCanvasElement.prototype.getContext = function(){
    var noop = function(){ return noop; };
    return new Proxy({}, {
      get: function(t, k){
        if(k === 'canvas') return { width:1, height:1 };
        if(k === 'measureText') return function(){ return { width: 10 }; };
        if(k === 'createLinearGradient' || k === 'createRadialGradient'){
          return function(){ return { addColorStop: noop }; };
        }
        if(k === 'getImageData') return function(){ return { data: new Uint8ClampedArray(4) }; };
        if(typeof k === 'string' && k in t) return t[k];
        return noop;
      },
      set: function(t, k, v){ t[k] = v; return true; },
    });
  };
  HTMLCanvasElement.prototype.toDataURL = function(){ return 'data:image/png;base64,'; };
  window.jspdf = { jsPDF: function(){} };
`);
/* Las funciones declaradas con `function` quedan en window, pero `const state` / `const
   SUBPRODUCTOS` son bindings lexicales del script: no son propiedades de window, y cada eval es
   un script aparte. Por eso el puente se evalúa PEGADO al final de functions.js, dentro del mismo
   scope, en vez de accederse después como `win.<algo>` (que devolvería undefined en silencio). */
const EXPUESTOS = ['state','SUBPRODUCTOS','createSede','createMatriz','uid','getSubproducto',
  'getInstanciaLigada','parseAnchoBandaMbps','formatAnchoBandaMbps','anchoBandaMbpsDeInstancia',
  'concentradorDe','syncBackupConexion','tipoConexionPorDestino','renderRightPanel','openReport',
  'buildConfiguracionCliente'];
// `typeof` en vez de nombrar el binding directo: así el test también se puede correr contra una
// versión anterior de functions.js (donde concentradorDe todavía no existe) y falla en las
// aserciones, que es lo informativo, en vez de reventar acá con un ReferenceError.
const w = win.eval(appSrc + '\n;({' +
  EXPUESTOS.map(n=>`${n}: (typeof ${n}!=='undefined' ? ${n} : undefined)`).join(',') + '})');
EXPUESTOS.forEach(n=>{ if(w[n]===undefined) w[n] = ()=>{ throw new Error(n+' no existe en esta versión'); }; });
w.document = win.document;

/* --- Mini framework de aserciones ---
   Tanto la condición como el detalle se pasan como thunks y se evalúan acá adentro, envueltos en
   try/catch: así una versión de functions.js a la que le falte una función entera falla la
   aserción que la cubre (que es la información útil) en vez de cortar la corrida entera. */
let ok = 0, fail = 0;
function evaluar(fn){
  if(typeof fn !== 'function') return fn;
  try { return fn(); } catch(err){ return { __error: err.message }; }
}
function check(nombre, cond, detalle){
  const v = evaluar(cond);
  if(v === true){ ok++; console.log('  ✓ ' + nombre); return; }
  fail++;
  const d = (v && v.__error) ? v.__error : evaluar(detalle);
  console.log('  ✗ ' + nombre + (d ? '  →  ' + (d.__error || d) : ''));
}
/* Para los pasos de armado del escenario (crear sedes, prender backups): si tiran, la corrida
   sigue y lo que se rompió se ve en las aserciones que dependían de ese paso. */
function paso(fn){ try { return fn(); } catch(err){ return null; } }
function grupo(t){ console.log('\n' + t); }

/* --- Constructores de escenario, usando la misma API que usa la UI --- */
function nuevaSede(nombre, gx, gz, empleados){
  const s = w.createSede(empleados || 10, gx, gz);
  s.nombre = nombre;
  return s;
}
function nuevaMatriz(nombre, gx, gz){
  const m = w.createMatriz(gx, gz);
  m.nombre = nombre;
  return m;
}
/* Asigna un Canal de Conexión de `origen` hacia `destino` con `mbps`, igual que hace el popup:
   instancia con propiedades + conexión ligada por instanciaId. Devuelve la instancia. */
function canal(origen, destino, mbps, conBackup){
  const inst = {
    instanciaId: w.uid('inst','nextInstanceSeq'),
    subproductoId: 'canal_conexion',
    verticalId: 'conectividad',
    nombreSubproducto: 'Canal de Conexión',
    propiedades: { 'Ancho de banda': w.formatAnchoBandaMbps(mbps), 'Ubicación geográfica': 'Quito' },
    notas: '', marca: '', backup: !!conBackup, targetConexionId: null,
    creadoEn: new Date().toISOString(),
  };
  origen.instancias.push(inst);
  w.state.conexiones.push({
    id: w.uid('cx','nextConexionSeq'), aId: origen.id, bId: destino.id,
    subproductoId: 'canal_conexion', instanciaId: inst.instanciaId, ownerId: origen.id,
  });
  w.syncBackupConexion(inst);
  return inst;
}

/* =======================================================================================
   Escenario del cliente: Matriz 1 con 3 sedes a 100 Mbps cada una → concentrador 300 Mbps.
   ======================================================================================= */
const m1 = paso(()=>nuevaMatriz('Matriz 1', 0, -2));
const s1 = paso(()=>nuevaSede('Sede 1', -2, 1));
const s2 = paso(()=>nuevaSede('Sede 2', 0, 1));
const s3 = paso(()=>nuevaSede('Sede 3', 2, 1));
paso(()=>{ canal(s1, m1, 100); canal(s2, m1, 100); canal(s3, m1, 100); });

const conc = ()=>w.concentradorDe(m1.id);

grupo('PEDIDO 1 — El concentrador suma los canales que llegan a la Matriz');
check('3 canales de 100 Mbps → 300 Mbps', ()=>conc().totalMbps === 300, ()=>'total=' + conc().totalMbps);
check('se formatea como texto legible', ()=>conc().texto === '300 Mbps', ()=>'texto=' + conc().texto);
check('el desglose lista los 3 enlaces', ()=>conc().enlaces.length === 3, ()=>'n=' + conc().enlaces.length);
check('cada renglón nombra su sede de origen',
  ()=>conc().enlaces.map(e=>e.origen).sort().join(',') === 'Sede 1,Sede 2,Sede 3',
  ()=>conc().enlaces.map(e=>e.origen).join(','));
check('cuenta desde el lado de la Matriz aunque el dueño de la instancia sea la Sede',
  ()=>conc().enlaces.every(e=>e.mbps === 100));

grupo('PEDIDO 2 — El Backup NO sube el concentrador, pero SÍ hereda el ancho de banda');
const instS1 = paso(()=>{ s1.instancias[0].backup = true; w.syncBackupConexion(s1.instancias[0]); return s1.instancias[0]; });
check('con 1 backup encendido el concentrador sigue en 300 Mbps', ()=>conc().totalMbps === 300, ()=>'total=' + conc().totalMbps);
check('el canal respaldado queda marcado en el desglose', ()=>conc().enlaces.filter(e=>e.tieneBackup).length === 1);
check('conBackup cuenta canales respaldados, no enlaces', ()=>conc().conBackup === 1, ()=>'conBackup=' + conc().conBackup);
const cxBackup = ()=>w.state.conexiones.find(x=>x.instanciaId === instS1.instanciaId && x.esBackup);
check('el backup existe como enlace propio', ()=>!!cxBackup());
check('el backup comparte instancia con su principal (por eso hereda las propiedades)',
  ()=>w.getInstanciaLigada(cxBackup()) === instS1);
check('el ancho de banda leído del backup es el del canal principal',
  ()=>w.anchoBandaMbpsDeInstancia(w.getInstanciaLigada(cxBackup())) === 100);
paso(()=>{ [s2, s3].forEach(s=>{ s.instancias[0].backup = true; w.syncBackupConexion(s.instancias[0]); }); });
check('con los 3 backups encendidos sigue en 300 Mbps, no 600', ()=>conc().totalMbps === 300, ()=>'total=' + conc().totalMbps);
check('los 3 canales figuran respaldados', ()=>conc().conBackup === 3, ()=>'conBackup=' + conc().conBackup);
paso(()=>{ [s2, s3].forEach(s=>{ s.instancias[0].backup = false; w.syncBackupConexion(s.instancias[0]); }); });

grupo('PEDIDO 2b — El reporte imprime el ancho de banda heredado del backup');
paso(()=>w.openReport());
const filaBackup = ()=>[...w.document.querySelectorAll('#reportBody .report-inst')]
  .find(f=>/\(Backup\)/.test(f.textContent));
check('el reporte tiene un renglón propio de Backup', ()=>!!filaBackup());
check('ese renglón ahora muestra el ancho de banda heredado',
  ()=>/100 Mbps/.test(filaBackup().textContent), ()=>filaBackup() && filaBackup().textContent.replace(/\s+/g,' ').trim());
check('y dice explícitamente que hereda del canal principal',
  ()=>/hereda las propiedades del canal principal/.test(filaBackup().textContent));
check('y aclara que no suma al concentrador',
  ()=>/No suma al concentrador/.test(filaBackup().textContent));

grupo('PEDIDO 1b — El concentrador se ve en el reporte y al hacer clic en la Matriz');
const filaConc = ()=>w.document.querySelector('#reportBody .report-concentrador');
check('el reporte tiene un renglón de Concentrador', ()=>!!filaConc());
check('con el total 300 Mbps', ()=>/300 Mbps/.test(filaConc().textContent));
check('aclarando que es calculado, no contratable',
  ()=>/no es un producto contratable/.test(filaConc().textContent));
check('e incluyendo el desglose por sede',
  ()=>['Sede 1','Sede 2','Sede 3'].every(n=>filaConc().textContent.includes(n)));
paso(()=>{ w.state.selectedSedeIds = [m1.id]; w.renderRightPanel(); });
const box = ()=>w.document.getElementById('matrizEditBox');
check('el panel derecho de la Matriz muestra el Concentrador', ()=>/Concentrador/.test(box().textContent));
check('con el total en su propio elemento',
  ()=>box().querySelector('.concentradorTotal').textContent === '300 Mbps',
  ()=>box().querySelector('.concentradorTotal') && box().querySelector('.concentradorTotal').textContent);
check('y una fila por canal', ()=>box().querySelectorAll('.concentradorRow').length === 3);
check('marcando el canal que tiene backup', ()=>box().querySelectorAll('.concentradorBackupTag').length === 1);
check('sin ningún input editable dentro del campo Concentrador',
  ()=>box().querySelectorAll('.concentradorField input').length === 0);
check('el Concentrador NO aparece en Servicios asignados (no es un producto)',
  ()=>!/Concentrador/.test(w.document.getElementById('instanceList').textContent));
check('ningún estilo inline nuevo: el campo se apoya solo en clases de styles.css',
  ()=>[...box().querySelectorAll('.concentradorField, .concentradorField *')]
      .every(el=>!el.getAttribute('style')));

grupo('CONTROL — nada más se movió de lugar');
const m2 = paso(()=>nuevaMatriz('Matriz 2', 4, -2));
check('una Matriz sin canales da 0 Mbps y lista vacía',
  ()=>w.concentradorDe(m2.id).totalMbps === 0 && w.concentradorDe(m2.id).enlaces.length === 0);
check('y su texto es "0 Mbps", no cadena vacía', ()=>w.concentradorDe(m2.id).texto === '0 Mbps');
paso(()=>{ w.state.selectedSedeIds = [m2.id]; w.renderRightPanel(); });
check('su panel avisa que todavía no llega ningún canal',
  ()=>!!w.document.querySelector('#matrizEditBox .concentradorEmpty'));
paso(()=>w.openReport());
check('y el reporte NO le imprime un renglón de Concentrador en 0',
  ()=>[...w.document.querySelectorAll('#reportBody .report-sede')]
      .filter(b=>b.textContent.includes('Matriz 2'))
      .every(b=>!b.querySelector('.report-concentrador')));
check('solo Canal de Conexión está marcado como sumador del concentrador',
  ()=>w.SUBPRODUCTOS.filter(s=>s.sumaConcentrador).map(s=>s.id).join(',') === 'canal_conexion',
  ()=>w.SUBPRODUCTOS.filter(s=>s.sumaConcentrador).map(s=>s.id).join(','));
check('Cloud Interconnect sigue apuntando solo a nubes (v14 intacto)',
  ()=>JSON.stringify(w.getSubproducto('cloud_interconnect').destinosConexion) === '["nube"]');
check('el cable a mano sigue registrándose como Canal de Conexión (v14 intacto)',
  ()=>w.tipoConexionPorDestino() === 'canal_conexion');
check('parseAnchoBandaMbps sin fallback sigue devolviendo el default del popup',
  ()=>w.parseAnchoBandaMbps('') === 100 && w.parseAnchoBandaMbps(undefined) === 100);
check('pero con fallback 0 no inventa ancho de banda (lo que usa el concentrador)',
  ()=>w.parseAnchoBandaMbps('', 0) === 0);
check('y sigue leyendo Gbps correctamente', ()=>w.parseAnchoBandaMbps('1.5 Gbps') === 1500);
check('el JSON exportado incluye el concentrador de cada Matriz',
  ()=>w.buildConfiguracionCliente().matrices.every(m=>m.concentrador && typeof m.concentrador.totalMbps === 'number'));
check('con el total correcto de Matriz 1',
  ()=>w.buildConfiguracionCliente().matrices.find(m=>m.nombre === 'Matriz 1').concentrador.totalMbps === 300);

console.log('\n' + '─'.repeat(56));
console.log(`  ${ok}/${ok + fail} verificaciones OK` + (fail ? `  ·  ${fail} FALLA(S)` : ''));
process.exit(fail ? 1 : 0);
