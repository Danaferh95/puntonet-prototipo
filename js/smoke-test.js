/* Smoke test headless: carga index.html + three r128 + functions.js en jsdom, con el
   WebGLRenderer sustituido por un doble (jsdom no tiene WebGL), y ejecuta los flujos
   principales de la app. No valida pixeles — valida que nada explote y que el modelo de
   datos siga comportandose igual. */
const fs = require('fs');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;

// jsdom no calcula layout: getBoundingClientRect devuelve todo en 0 y romperia los raycast.
const RECT = { left: 220, top: 52, width: 900, height: 600, right: 1120, bottom: 652, x: 220, y: 52 };
window.Element.prototype.getBoundingClientRect = function(){ return RECT; };
Object.defineProperty(window.Element.prototype, 'clientWidth', { get(){ return RECT.width; } });
Object.defineProperty(window.Element.prototype, 'clientHeight', { get(){ return RECT.height; } });

const ctx = vm.createContext(window);
vm.runInContext(fs.readFileSync('node_modules/three/build/three.js', 'utf8'), ctx);

// Dobles de lo que jsdom no puede dar
vm.runInContext(`
  THREE.WebGLRenderer = function(){
    this.domElement = document.createElement('canvas');
    this.domElement.width = 1800; this.domElement.height = 1200;
    this.domElement.toDataURL = ()=> 'data:image/jpeg;base64,AAAA';
    this.setPixelRatio = function(){}; this.setSize = function(){};
    this.render = function(){}; this.setClearColor = function(){};
    this.getClearColor = function(c){ return c || new THREE.Color(); };
    this.getClearAlpha = function(){ return 0; };
  };
  HTMLCanvasElement.prototype.getContext = function(){
    return { fillRect(){}, clearRect(){}, beginPath(){}, moveTo(){}, lineTo(){}, arcTo(){},
      closePath(){}, fill(){}, stroke(){}, drawImage(){}, save(){}, restore(){}, translate(){},
      scale(){}, measureText(){ return { width: 10 }; }, fillText(){}, createLinearGradient(){
        return { addColorStop(){} }; }, getImageData(){ return { data: new Uint8ClampedArray(4) }; },
      putImageData(){}, setTransform(){}, rect(){}, clip(){}, arc(){} };
  };
  window.jspdf = { jsPDF: function(){
    const noop = ()=>{};
    return { internal:{ pageSize:{ getWidth:()=>595, getHeight:()=>842 } },
      setFont:noop, setFontSize:noop, setTextColor:noop, setFillColor:noop, setDrawColor:noop,
      text:noop, addPage:noop, rect:noop, roundedRect:noop, addImage:noop, line:noop, save:noop,
      splitTextToSize:(t)=>[t] };
  }};
  window.confirm = ()=> true;
  window.prompt = ()=> 'AWS';
  window.alert = ()=> {};
`, ctx);

vm.runInContext(fs.readFileSync('functions.js', 'utf8'), ctx);

const run = (expr) => vm.runInContext(expr, ctx);
const checks = [];
function check(nombre, fn){
  try { fn(); checks.push(['ok', nombre]); }
  catch(err){ checks.push(['FALLA', nombre + ' -> ' + err.message]); }
}
function assert(cond, msg){ if(!cond) throw new Error(msg || 'assert'); }

// ---------------------------------------------------------------- catalogo
check('el catalogo se pinta en el panel izquierdo', ()=>{
  assert(run(`document.querySelectorAll('.catalog-chip').length`) === run(`SUBPRODUCTOS.length`),
    'un chip por subproducto');
});

// ---------------------------------------------------------------- crear entidades
check('crear sedes, Matriz y Nube', ()=>{
  run(`createSede(12, 1, 1); createSede(80, 2, 1); createMatriz(0, 2); createNube('AWS', 3, 2);`);
  assert(run(`state.sedes.length`) === 2, 'dos sedes');
  assert(run(`state.matrices.length`) === 1, 'una matriz');
  assert(run(`state.nubes.length`) === 1, 'una nube');
  assert(run(`nameLabels.size`) === 5, 'etiqueta por entidad + datacenter');
});

check('el tamano de la sede se deriva de los empleados', ()=>{
  assert(run(`state.sedes[0].tamano`) !== run(`state.sedes[1].tamano`), '12 vs 80 empleados');
  run(`setSedeEmpleados(state.sedes[0], 80)`);
  assert(run(`state.sedes[0].tamano`) === run(`state.sedes[1].tamano`), 'mismo tier tras editar');
  run(`setSedeEmpleados(state.sedes[0], 12)`);
});

// ---------------------------------------------------------------- asignacion + conexiones
check('Zona Wireless se auto-conecta al Datacenter', ()=>{
  run(`(function(){
    const sede = state.sedes[0];
    const inst = { instanciaId: uid('inst','nextInstanceSeq'), subproductoId:'zona_wireless',
      verticalId:'colaboracion', nombreSubproducto:'Zona Wireless', propiedades:{}, notas:'', marca:'' };
    sede.instancias.push(inst);
    ensureConexionAutomatica(sede.id, 'zona_wireless', inst.instanciaId);
    rebuildConnections();
  })()`);
  assert(run(`state.conexiones.length`) === 1, 'una conexion');
  assert(run(`state.conexiones[0].bId`) === 'datacenter', 'destino Datacenter');
});

check('Internet crea (y reutiliza) una unica Nube automatica', ()=>{
  run(`(function(){
    [state.sedes[0], state.sedes[1]].forEach(sede=>{
      const inst = { instanciaId: uid('inst','nextInstanceSeq'), subproductoId:'internet_corporativo',
        verticalId:'conectividad', nombreSubproducto:'Internet Corporativo', propiedades:{}, notas:'', marca:'' };
      sede.instancias.push(inst);
      ensureConexionAutomatica(sede.id, 'internet_corporativo', inst.instanciaId);
    });
    rebuildConnections();
  })()`);
  assert(run(`state.nubes.filter(n=>n.esAutoInternet).length`) === 1, 'una sola nube de internet');
  assert(run(`state.conexiones.length`) === 3, 'tres conexiones');
});

check('los cables se dibujan (un grupo por conexion)', ()=>{
  assert(run(`connectionsGroup.children.length`) > 0, 'hay tubos en la escena');
  assert(run(`connectionAnims.length`) === run(`state.conexiones.length`), 'una particula por cable');
});

// ---------------------------------------------------------------- panel derecho
check('el panel derecho pinta el detalle de una sede', ()=>{
  run(`state.selectedSedeIds = [state.sedes[0].id]; renderRightPanel();`);
  assert(run(`byId('sedeEditBox').style.display`) === 'flex', 'bloque de sede visible');
  assert(run(`!!byId('sedeEmpleadosRange')`), 'slider de empleados presente');
  assert(run(`byId('connectionsBox').style.display`) === 'flex', 'bloque de conexiones visible');
  assert(run(`document.querySelectorAll('#connectionsBox .connItem').length`) === 2, 'dos conexiones listadas');
});

check('el par slider+numero mantiene el modelo sincronizado', ()=>{
  run(`(function(){
    const num = byId('sedeEmpleadosNumber');
    num.value = '250';
    num.dispatchEvent(new window.Event('input'));
  })()`);
  assert(run(`state.sedes[0].empleados`) === 250, 'el numero manda por encima del maximo del slider');
  assert(run(`parseInt(byId('sedeEmpleadosRange').value,10)`) <= run(`EMPLEADOS_SLIDER_MAX`),
    'el slider nunca supera su maximo');
  assert(/^[\d.]+%$/.test(run(`byId('sedeEmpleadosRange').style.getPropertyValue('--fill')`)),
    'el relleno del track se repinta (fix v12)');
});

check('el panel derecho pinta el detalle de la Matriz', ()=>{
  run(`state.selectedSedeIds = [state.matrices[0].id]; renderRightPanel();`);
  assert(run(`byId('matrizEditBox').style.display`) === 'flex', 'bloque de matriz visible');
  assert(run(`byId('sedeEditBox').style.display`) === 'none', 'bloque de sede oculto');
  run(`(function(){
    const num = byId('matrizUsuariosNumber');
    num.value = '40'; num.dispatchEvent(new window.Event('input'));
  })()`);
  assert(run(`state.matrices[0].usuarios`) === 40, 'usuarios de matriz');
});

check('la Nube automatica no permite renombrarse', ()=>{
  run(`state.selectedSedeIds = [state.nubes.find(n=>n.esAutoInternet).id]; renderRightPanel();`);
  assert(run(`byId('nubeEditBox').style.display`) === 'flex', 'bloque de nube visible');
  assert(run(`!byId('nubeNombreInput')`), 'sin input de nombre');
  assert(run(`document.querySelector('#nubeEditBox .locked').disabled`) === true, 'input bloqueado');
});

// ---------------------------------------------------------------- popup
check('el popup de un producto arma sus campos', ()=>{
  run(`state.selectedSedeIds = [state.sedes[0].id]; openPopupForNew('canal_conexion', [state.sedes[0].id]);`);
  assert(run(`byId('popupOverlay').classList.contains('show')`), 'popup abierto');
  assert(run(`byId('popupConexionField').style.display`) === 'block', 'dropdown "Conectar a" visible');
  assert(run(`document.querySelectorAll('#popupProps .empRow').length`) === 1, 'slider de ancho de banda');
  assert(run(`byId('popupBackupField').style.display`) === 'block', 'checkbox de backup');
});

check('guardar el popup crea instancia + cable + backup', ()=>{
  run(`(function(){
    const destino = state.sedes[1].id;
    byId('popupConexionSelect').value = destino;
    byId('popupBackupCheckbox').checked = true;
    const props = document.querySelectorAll('#popupProps input');
    props.forEach(i=>{ if(i.type==='number'){ i.value = '300'; } });
    byId('btnSavePopup').click();
  })()`);
  assert(run(`state.sedes[0].instancias.some(i=>i.subproductoId==='canal_conexion')`), 'instancia creada');
  assert(run(`state.conexiones.filter(c=>c.subproductoId==='canal_conexion').length`) === 2,
    'enlace principal + backup');
  assert(run(`!byId('popupOverlay').classList.contains('show')`), 'popup cerrado');
});

check('Sdwan se aplica sobre un canal existente, no crea cable', ()=>{
  const antes = run(`state.conexiones.length`);
  run(`openPopupForNew('sdwan', [state.sedes[0].id])`);
  assert(run(`byId('popupSdwanField').style.display`) === 'block', 'dropdown "Aplicar Sdwan a"');
  run(`(function(){
    const sel = byId('popupSdwanSelect');
    const opt = Array.from(sel.options).find(o=>o.value && !o.disabled);
    sel.value = opt.value;
    byId('btnSavePopup').click();
  })()`);
  assert(run(`state.conexiones.length`) === antes, 'no agrego conexiones');
  assert(run(`state.sedes[0].instancias.some(i=>i.subproductoId==='sdwan' && i.targetConexionId)`),
    'sdwan ligado a un canal');
  assert(run(`sdwanAnims.length`) > 0, 'badge dibujado sobre el cable');
});

// ---------------------------------------------------------------- salud / reporte / export
check('la salud de infraestructura se calcula y se pinta', ()=>{
  run(`renderSaludPanel()`);
  assert(run(`document.querySelectorAll('.salud-row').length`) === 4, 'una barra por vertical');
  assert(run(`saludGlobal()`) > 0, 'score global > 0');
  assert(run(`saludPorVertical().every(v=>v.pct>=0 && v.pct<=100)`), 'porcentajes en rango');
});

check('el reporte en pantalla se arma completo', ()=>{
  run(`openReport()`);
  assert(run(`byId('reportOverlay').classList.contains('show')`), 'modal de reporte abierto');
  assert(run(`document.querySelectorAll('#reportBody .report-sede').length`) >= 4,
    'bloque por sede/matriz/nube/datacenter');
  assert(run(`document.querySelectorAll('#reportBody .report-inst').length`) > 0, 'productos listados');
});

check('el JSON de configuracion sale bien formado', ()=>{
  const cfg = run(`JSON.stringify(buildConfiguracionCliente())`);
  const parsed = JSON.parse(cfg);
  assert(Array.isArray(parsed.sedes) && parsed.sedes.length === 2, 'sedes en el json');
  assert(parsed.datacenter && parsed.matrices.length === 1, 'matriz y datacenter en el json');
  assert(parsed.salud && typeof parsed.salud.actual === 'number', 'salud incluida');
  assert(parsed.salud.porVertical.length === 4, 'salud por vertical');
});

check('el PDF se genera sin romper', ()=>{
  run(`downloadPDF()`);
});

// ---------------------------------------------------------------- borrados
check('eliminar la Matriz limpia sus cables y la herencia', ()=>{
  run(`deleteMatriz(state.matrices[0])`);
  assert(run(`state.matrices.length`) === 0, 'matriz eliminada');
  assert(run(`state.conexiones.every(c=>!c.aId.startsWith('matriz') && !c.bId.startsWith('matriz'))`),
    'sin cables colgando');
});

check('eliminar y restaurar el Datacenter', ()=>{
  run(`deleteDatacenter()`);
  assert(run(`state.datacenter.activo`) === false, 'inactivo');
  assert(run(`datacenterGroup.visible`) === false, 'oculto en la escena');
  assert(run(`state.conexiones.every(c=>c.aId!=='datacenter' && c.bId!=='datacenter')`), 'sin cables al DC');
  assert(run(`byId('datacenterRestoreWrap').style.display`) === 'block', 'tarjeta de restaurar visible');
  run(`restoreDatacenter()`);
  assert(run(`state.datacenter.activo`) === true, 'restaurado');
});

check('eliminar una sede limpia sus instancias y cables', ()=>{
  const id = run(`state.sedes[0].id`);
  run(`deleteSede(state.sedes[0])`);
  assert(run(`state.sedes.length`) === 1, 'una sede menos');
  assert(run(`state.conexiones.every(c=>c.aId!=='${id}' && c.bId!=='${id}')`), 'sin cables huerfanos');
  assert(run(`nameLabels.has('${id}')`) === false, 'etiqueta removida');
});

// ---------------------------------------------------------------- escapado
check('un nombre con HTML no rompe el panel de Conexiones', ()=>{
  run(`(function(){
    state.sedes[0].nombre = '<img src=x onerror=alert(1)> & Cia';
    // se selecciona el OTRO extremo: su lista de conexiones muestra el nombre de arriba
    const otro = state.conexiones.find(c=>c.aId===state.sedes[0].id || c.bId===state.sedes[0].id);
    state.selectedSedeIds = [otro.aId===state.sedes[0].id ? otro.bId : otro.aId];
    renderRightPanel();
  })()`);
  assert(run(`document.querySelectorAll('#connectionsBox img').length`) === 0,
    'ninguna etiqueta inyectada en la lista de conexiones');
  assert(run(`byId('connectionsBox').textContent.includes('& Cia')`), 'el nombre se lee tal cual');
});

check('un nombre con HTML no rompe el reporte', ()=>{
  run(`openReport()`);
  assert(run(`document.querySelectorAll('#reportBody img').length`) === 0,
    'ninguna etiqueta inyectada en el reporte');
});

// ---------------------------------------------------------------- salida
let fallas = 0;
for(const [estado, nombre] of checks){
  if(estado === 'FALLA') fallas++;
  console.log(`${estado === 'ok' ? '  ok  ' : ' FALLA'} ${nombre}`);
}
console.log(`\n${checks.length - fallas}/${checks.length} verificaciones pasaron`);
process.exit(fallas ? 1 : 0);
