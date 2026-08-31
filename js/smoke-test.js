/* Smoke test de los cambios pedidos por el cliente el 28/08/2026.
   Carga index.html + three r128 + functions.js en jsdom, con el WebGLRenderer sustituido por un
   doble (no hay GPU acá), y verifica el comportamiento nuevo de extremo a extremo.
   Correr:  npm i jsdom three@0.128.0 && node smoke-test-cambios.js   (con los 3 archivos al lado) */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8')
  .replace(/<script src="https:\/\/[^"]*"><\/script>/g, '')
  .replace(/<script src="js\/functions.js"><\/script>/, '');

const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const win = dom.window;

// --- Stubs mínimos del entorno gráfico ---
win.matchMedia = win.matchMedia || (() => ({ matches: false, addListener(){}, removeListener(){} }));
win.requestAnimationFrame = () => 0;
win.cancelAnimationFrame = () => {};
win.HTMLCanvasElement.prototype.getContext = function(){
  return {
    fillRect(){}, clearRect(){}, beginPath(){}, moveTo(){}, lineTo(){}, stroke(){}, fill(){},
    arc(){}, closePath(){}, save(){}, restore(){}, translate(){}, scale(){}, rotate(){},
    fillText(){}, measureText(){ return { width: 10 }; }, createLinearGradient(){ return { addColorStop(){} }; },
    drawImage(){}, putImageData(){}, getImageData(){ return { data: [] }; }, createImageData(){ return { data: [] }; },
    setTransform(){}, roundRect(){}, quadraticCurveTo(){}, bezierCurveTo(){}, ellipse(){},
    arcTo(){}, clip(){}, rect(){}, strokeText(){}, createRadialGradient(){ return { addColorStop(){} }; },
    canvas: { width: 96, height: 96 },
  };
};
win.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';
Object.defineProperty(win.HTMLElement.prototype, 'clientWidth', { get(){ return 900; } });
Object.defineProperty(win.HTMLElement.prototype, 'clientHeight', { get(){ return 600; } });
win.Element.prototype.getBoundingClientRect = function(){ return { left:0, top:0, right:900, bottom:600, width:900, height:600, x:0, y:0 }; };
win.alert = () => {};
win.confirm = () => true;
win.prompt = () => 'Azure';

const THREE = require('three');
class FakeRenderer {
  constructor(){ this.domElement = win.document.createElement('canvas'); this.shadowMap = { enabled:false }; }
  setSize(){} setPixelRatio(){} render(){} setClearColor(){} dispose(){}
}
const THREEshim = Object.assign(Object.create(null), THREE, { WebGLRenderer: FakeRenderer });
win.THREE = THREEshim;
win.jspdf = { jsPDF: function(){ return { text(){}, addImage(){}, setFontSize(){}, setTextColor(){}, setDrawColor(){}, setFillColor(){}, rect(){}, line(){}, addPage(){}, save(){}, splitTextToSize:()=>[''], internal:{ pageSize:{ getWidth:()=>595, getHeight:()=>842 } } }; } };

const code = fs.readFileSync(path.join(__dirname, 'functions.js'), 'utf8');
win.eval(code + '\n;window.__api = { state, getSubproducto, destinosPermitidos, destinoValido, candidatosConexionEntreSedes, destinosConexionPermitidos, tipoConexionPorDestino, ensureConexionAutomatica, createSede, createMatriz, createNube, getOrCreateNubeInternetAuto, renderPopupConexionOptions, deleteDatacenter, restoreDatacenter, nombreDestinos, EMPLEADOS_DEFAULT, SUBPRODUCTOS };');

const A = win.__api;
const S = A.state;

let pass = 0, fail = 0;
function check(nombre, cond, detalle){
  if(cond){ pass++; console.log('  ok   ' + nombre); }
  else { fail++; console.log('  FALLA ' + nombre + (detalle ? '  → ' + detalle : '')); }
}

// Escenario base: 2 sedes, 1 Matriz, 1 Nube de proveedor, y la Nube automática de Internet.
const sede = A.createSede(A.EMPLEADOS_DEFAULT, 2, 2);
const sede2 = A.createSede(A.EMPLEADOS_DEFAULT, 3, 2);
const matriz = A.createMatriz(-2, 2);
const azure = A.createNube('Azure', 4, 4);
const internet = A.getOrCreateNubeInternetAuto();

console.log('\n1) Cloud Interconnect solo hacia nube de proveedor, no a Internet');
const ci = A.getSubproducto('cloud_interconnect');
const candCI = A.candidatosConexionEntreSedes(sede.id, ci).map(e => e.id);
check('lista la Nube Azure', candCI.includes(azure.id));
check('NO lista la Nube automática de Internet', !candCI.includes(internet.id), candCI.join(','));
check('NO lista sedes ni Matrices', !candCI.includes(sede2.id) && !candCI.includes(matriz.id));
A.renderPopupConexionOptions(sede.id, ci);
const optsCI = win.document.getElementById('popupConexionSelect').innerHTML;
check('el <select> ofrece "+ Agregar nueva Nube"', optsCI.includes('Agregar nueva Nube'));
check('el <select> no ofrece Sede/Matriz nueva', !optsCI.includes('Agregar nueva Sede'));
check('la opción de Azure se etiqueta "(Nube)"', optsCI.includes('Azure (Nube)'));

console.log('\n2) Canal de Conexión puede conectarse al Datacenter');
const canal = A.getSubproducto('canal_conexion');
const candCanal = A.candidatosConexionEntreSedes(sede.id, canal).map(e => e.id);
check('lista el Datacenter', candCanal.includes('datacenter'), candCanal.join(','));
check('sigue listando la otra sede y la Matriz', candCanal.includes(sede2.id) && candCanal.includes(matriz.id));
check('no lista Nubes', !candCanal.includes(azure.id) && !candCanal.includes(internet.id));
A.renderPopupConexionOptions(sede.id, canal);
const optsCanal = win.document.getElementById('popupConexionSelect').innerHTML;
check('la opción se etiqueta "(Datacenter)"', optsCanal.includes('(Datacenter)'));
check('no ofrece "+ Agregar" un Datacenter', !optsCanal.includes('Agregar nuevo Datacenter'));
// Datacenter eliminado → deja de ser candidato
A.deleteDatacenter();
check('Datacenter eliminado: desaparece del dropdown',
  !A.candidatosConexionEntreSedes(sede.id, canal).map(e=>e.id).includes('datacenter'));
A.restoreDatacenter();
check('Datacenter restaurado: vuelve al dropdown',
  A.candidatosConexionEntreSedes(sede.id, canal).map(e=>e.id).includes('datacenter'));

console.log('\n3) El Datacenter recibe conectividad');
check('Canal de Conexión se puede soltar sobre el Datacenter', A.destinoValido(canal, 'datacenter'));
const inetCorp = A.getSubproducto('internet_corporativo');
check('Internet Corporativo se puede soltar sobre el Datacenter', A.destinoValido(inetCorp, 'datacenter'));
check('Internet Startup NO se habilitó sobre el Datacenter', !A.destinoValido(A.getSubproducto('internet_startup'), 'datacenter'));
const antes = S.conexiones.length;
A.ensureConexionAutomatica('datacenter', 'internet_corporativo', 'inst_test');
const nueva = S.conexiones[S.conexiones.length - 1];
check('Internet Corporativo en el DC crea el cable hacia la Nube de Internet',
  S.conexiones.length === antes + 1 && nueva.aId === 'datacenter' && nueva.bId === internet.id,
  nueva ? nueva.aId + '→' + nueva.bId : 'sin conexión');
const antes2 = S.conexiones.length;
A.ensureConexionAutomatica('datacenter', 'zona_wireless', 'inst_test2');
check('un producto con destino Datacenter no lo conecta consigo mismo', S.conexiones.length === antes2);
check('el cable a mano al Datacenter ya es Canal de Conexión, no Cloud Interconnect',
  A.tipoConexionPorDestino('sede_1', 'datacenter') === 'canal_conexion');

console.log('\n4) DNS/DDoS en el Datacenter');
const ddos = A.getSubproducto('dns_ddos');
check('se puede soltar sobre el Datacenter', A.destinoValido(ddos, 'datacenter'));
check('sigue disponible en sede y Matriz', A.destinoValido(ddos, 'sede') && A.destinoValido(ddos, 'matriz'));
check('el texto de destinos lo menciona', /Datacenter/.test(A.nombreDestinos(ddos)), A.nombreDestinos(ddos));

console.log('\n5) Firewall On Premise e IaaS en el Datacenter');
['firewall_on_premise','firewall_iaas'].forEach(id=>{
  const fw = A.getSubproducto(id);
  check(id + ' se puede soltar sobre el Datacenter', A.destinoValido(fw, 'datacenter'));
  check(id + ' sigue disponible en sede y Matriz', A.destinoValido(fw, 'sede') && A.destinoValido(fw, 'matriz'));
});

console.log('\n6) Nada más se movió de lugar');
check('Túnel IPsec sigue solo entre Sedes/Matrices',
  A.destinosConexionPermitidos(A.getSubproducto('tunel_ipsec')).join(',') === 'sede,matriz');
check('Collocation sigue siendo solo Datacenter',
  A.destinosPermitidos(A.getSubproducto('collocation')).join(',') === 'datacenter');
check('IaaS sigue en Nube + Datacenter',
  A.destinosPermitidos(A.getSubproducto('iaas')).join(',') === 'nube,datacenter');
check('WAF sigue con sus 4 destinos',
  A.destinosPermitidos(A.getSubproducto('waf')).join(',') === 'sede,matriz,datacenter,nube');
check('EDR sigue con el default sede/Matriz',
  A.destinosPermitidos(A.getSubproducto('edr')).join(',') === 'sede,matriz');
check('el catálogo mantiene su tamaño (27 subproductos)', A.SUBPRODUCTOS.length === 27, String(A.SUBPRODUCTOS.length));

console.log(`\n${pass}/${pass + fail} verificaciones OK`);
process.exit(fail ? 1 : 0);
