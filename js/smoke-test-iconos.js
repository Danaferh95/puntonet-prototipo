/* Smoke test v18 / prototipo v42 — íconos de producto en .glb, primera tanda: Ciberseguridad
   (escudo/Perimetral, candado/End Point, llave/Acceso, muro/Aplicación, firewall_onpremise).
   Ver functions.js §3D (IconLibrary) y AssetRegistry (§5).
   Uso (desde la raíz del proyecto):  npm i jsdom three@0.128.0   y luego   node smoke-test-iconos.js
   Mismo doble de jsdom que smoke-test-modelos.js / smoke-test-brillo.js: WebGLRenderer y canvas 2D
   sustituidos, sin GPU. Lo visual (materiales, color) se valida por estructura, no por render real. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const util = require('util');

const R = __dirname;
const leer = p => fs.readFileSync(path.join(R, p), 'utf8');
const THREE_SRC = fs.readFileSync(require.resolve('three/build/three.min.js'), 'utf8');
const HTML = leer('index.html');
const FUNCS = leer('js/functions.js');
const LOADER = leer('js/vendor/GLTFLoader.js');
const MODELOS_DATOS = leer('js/modelos-glb.js');
const ICONOS_DATOS = leer('js/iconos-glb.js');

let ok = 0, fail = 0;
function check(nombre, cond, detalle){
  if(cond){ ok++; console.log('  ✔ ' + nombre); }
  else { fail++; console.log('  ✘ ' + nombre + (detalle !== undefined ? '  → ' + util.inspect(detalle, { depth:3 }) : '')); }
}

/* opciones: { iconos, sinFetch, filtrarIconos(obj) } — iconos:false omite js/iconos-glb.js */
function ventana(op = {}){
  const html = HTML.replace(/<script[\s\S]*?<\/script>/g, '');
  const dom = new JSDOM(html, { runScripts:'dangerously', pretendToBeVisual:true, url:'http://localhost/' });
  const w = dom.window;
  w.TextDecoder = util.TextDecoder;
  w.console = { log(){}, warn(){ (w.__warns = w.__warns || []).push([...arguments].join(' ')); }, error(){ (w.__errs = w.__errs || []).push([...arguments].join(' ')); } };
  w.HTMLCanvasElement.prototype.getContext = function(){
    return new Proxy({}, { get:(t,k)=> k==='measureText' ? (()=>({ width:0 })) : (k in t ? t[k] : ()=>{}), set:(t,k,v)=>{ t[k]=v; return true; } });
  };
  w.HTMLCanvasElement.prototype.toDataURL = ()=> 'data:image/jpeg;base64,';
  w.fetch = op.sinFetch ? undefined : ()=> Promise.reject(new Error('sin red en el test'));
  const errores = [];
  w.addEventListener('error', e=> errores.push(e.message));
  const run = code => { const s = w.document.createElement('script'); s.textContent = code; w.document.body.appendChild(s); };
  run(THREE_SRC);
  run(`THREE.WebGLRenderer = function(){ this.domElement = document.createElement('canvas');
    this.setPixelRatio = ()=>{}; this.setSize = ()=>{}; this.render = ()=>{};
    this.getClearColor = c=>c; this.setClearColor = ()=>{}; this.getClearAlpha = ()=>0;
    this.getSize = v=>v.set(800, 600); this.getPixelRatio = ()=>1; this.setRenderTarget = ()=>{}; this.clear = ()=>{};
    this.autoClear = true; this.capabilities = { isWebGL2:false }; };`);
  run(LOADER);
  run(MODELOS_DATOS);
  if(op.iconos !== false) run(ICONOS_DATOS);
  if(op.filtrarIconos) op.filtrarIconos(w.PN_ICONOS_GLB);
  run(FUNCS);
  w.__erroresScript = errores;
  return w;
}
const E = (w, expr) => w.eval(expr);

/* Recorre el ícono de un subproducto recién asignado: crea la sede, le agrega el subproducto,
   refresca sus assets y devuelve el primer hijo de assetsContainer (mismo patrón que
   smoke-test-modelos.js §D). */
function iconoDe(w, subproductoId, verticalId){
  const s = E(w, 'createSede(30, 0, 0)');
  E(w, `(function(){ const s=state.sedes.find(x=>x.id==='${s.id}');
    s.instancias.push({ instanciaId:'inst_${subproductoId}', subproductoId:'${subproductoId}', verticalId:'${verticalId}', valores:{} });
    refreshSedeAssets(s); })()`);
  return E(w, `state.sedes.find(x=>x.id==='${s.id}').group.getObjectByName('assetsContainer').children[0]`);
}
function esMalla(o){ let mesh=null; o.traverse(x=>{ if(!mesh && x.isMesh) mesh=x; }); return mesh; }

(async()=>{
  console.log('\nA. Carga');
  const w = ventana();
  const claves = Object.keys(w.PN_ICONOS_GLB || {}).sort();
  const esperados = Object.values(E(w,'ICONOS_GLB')).map(m=>m.archivo).sort();
  check('iconos-glb.js trae exactamente los archivos de ICONOS_GLB', JSON.stringify(claves) === JSON.stringify(esperados), claves);
  check('PN_MODELOS_GLB e PN_ICONOS_GLB no se pisan (archivos separados)',
    Object.keys(w.PN_MODELOS_GLB).every(k=>!claves.includes(k)) && claves.every(k=>!Object.keys(w.PN_MODELOS_GLB).includes(k)));
  const estado = await E(w,'iconosListos');
  check('los 5 íconos cargan: estado "listo", sin errores', estado === 'listo' && Object.keys(E(w,'IconLibrary').errores()).length === 0, [estado, E(w,'IconLibrary').errores()]);
  check('modelosListos sigue resolviendo su propio estado (string), sin verse afectado por los íconos', typeof await E(w,'modelosListos') === 'string');
  check('sin excepciones en la carga de la página', w.__erroresScript.length === 0, w.__erroresScript);

  console.log('\nB. Reemplazo por assetKey (con .glb en esta tanda)');
  const casos = [
    ['edr', 'ciberseguridad', 'candado'],
    ['firewall_iaas', 'ciberseguridad', 'escudo'],
    ['mfa', 'ciberseguridad', 'llave'],
    ['waf', 'ciberseguridad', 'muro'],
    ['firewall_onpremise_sub', 'ciberseguridad', 'firewall_onpremise'],
  ];
  // subproductoId reales del catálogo: se resuelven por assetKey esperado, no se asume el id exacto
  const subPorAssetKey = {};
  E(w, 'SUBPRODUCTOS').forEach ? null : null;
  const subs = E(w, 'SUBPRODUCTOS');
  const prods = E(w, 'PRODUCTOS');
  ['candado','escudo','llave','muro'].forEach(ak=>{
    const p = prods.find(p=>p.assetKey===ak);
    const s = subs.find(s=>s.productoNivel2Id===p.id);
    subPorAssetKey[ak] = { subproductoId:s.id, verticalId:p.verticalId };
  });
  { // firewall_onpremise: assetKey propio de un subproducto (no del producto Perimetral)
    const s = subs.find(s=>s.assetKey==='firewall_onpremise');
    subPorAssetKey['firewall_onpremise'] = { subproductoId:s.id, verticalId: prods.find(p=>p.id===s.productoNivel2Id).verticalId };
  }
  ['candado','escudo','llave','muro','firewall_onpremise'].forEach(ak=>{
    const { subproductoId, verticalId } = subPorAssetKey[ak];
    const icono = iconoDe(w, subproductoId, verticalId);
    const mesh = esMalla(icono);
    check(`${ak}: assetsContainer trae una malla real (glb), no solo líneas`, !!mesh, ak);
    check(`${ak}: el envoltorio es el del IconLibrary (iconoGLB)`, !!icono.getObjectByName('iconoGLB'), ak);
  });

  console.log('\nC. Íconos que TODAVÍA no tienen .glb (siguen con su primitiva)');
  ['nodo','globo','rack','nube','pantalla'].forEach(ak=>{
    check(`${ak} no está en ICONOS_GLB (fuera de esta tanda)`, !E(w,'ICONOS_GLB')[ak], ak);
  });
  const p2 = E(w,'PRODUCTOS'), s2 = E(w,'SUBPRODUCTOS');
  const pInternet = p2.find(p=>p.assetKey==='globo'), subInternet = s2.find(s=>s.productoNivel2Id===pInternet.id);
  const iconoGlobo = iconoDe(w, subInternet.id, pInternet.verticalId);
  check('globo (Internet, sin .glb en esta tanda) sigue como wireframe', !iconoGlobo.getObjectByName('iconoGLB') && !esMalla(iconoGlobo));

  console.log('\nD. Firewall Virtual (assetKey propio, explícitamente fuera del lineup — LEEME.md)');
  const subFV = s2.find(s=>s.assetKey==='firewall_virtual');
  const pFV = p2.find(p=>p.id===subFV.productoNivel2Id);
  const iconoFV = iconoDe(w, subFV.id, pFV.verticalId);
  check('firewall_virtual sigue con su primitiva (escudo+anillo), no toma el .glb de escudo', !iconoFV.getObjectByName('iconoGLB'));

  console.log('\nE. Color por catálogo (compartido, no uno por instancia)');
  const pPerim = prods.find ? prods.find(p=>p.assetKey==='escudo') : null;
  const subsPerim = subs.filter(s=>s.productoNivel2Id===pPerim.id);
  check('hay más de un subproducto para comparar colores en Perimetral', subsPerim.length >= 1, subsPerim.length);
  const colorA = E(w, `getSubproductoColor(SUBPRODUCTOS.find(s=>s.id==='${subsPerim[0].id}'))`);
  const i1 = iconoDe(w, subsPerim[0].id, pPerim.verticalId);
  const i2 = iconoDe(w, subsPerim[0].id, pPerim.verticalId);
  const m1 = esMalla(i1), m2 = esMalla(i2);
  check('dos instancias del mismo assetKey + color comparten el material (cache por color)', m1.material === m2.material);
  check('el material tomó el color del subproducto', m1.material.color.getHex() === colorA, [m1.material.color.getHex(), colorA]);

  console.log('\nF. Slots de material (base/glow/translucido/receso) y bloom');
  const iCandado = iconoDe(w, subPorAssetKey.candado.subproductoId, subPorAssetKey.candado.verticalId);
  const capaBrillo = E(w,'CAPA_BRILLO');
  let algunaEnCapaBrillo = false, mallas = 0;
  iCandado.traverse(o=>{ if(o.isMesh){ mallas++; if(o.layers.mask & (1 << capaBrillo)) algunaEnCapaBrillo = true; } });
  check('candado: al menos una malla (más de un slot de material en juego)', mallas > 0, mallas);
  check('los íconos de producto NO participan del bloom (mockup v17: "no brillan… íconos de producto")', !algunaEnCapaBrillo);
  check('sin avisos de "material desconocido" para los 5 .glb de esta tanda', !(w.__warns||[]).some(x=>x.includes('material') && x.includes('desconocido')), w.__warns);

  console.log('\nG. Raycast y herencia (translúcido al 50%)');
  let conRaycastPropio = 0;
  iCandado.traverse(o=>{ if(o.isMesh && o.hasOwnProperty('raycast')) conRaycastPropio++; });
  check('a diferencia de las entidades, las mallas de los íconos SÍ participan del raycast (sin override)', conRaycastPropio === 0, conRaycastPropio);
  E(w, `(function(){
    const s = createSede(30, 2, 2);
    const mat = createMatriz(0, 3);
    matrices.push ? null : null;
  })()`.replace('matrices.push ? null : null;',''));
  const wHer = ventana();
  await E(wHer, 'iconosListos'); await E(wHer, 'modelosListos');
  E(wHer, `(function(){
    const sede = createSede(10, 0, 0);
    const matriz = createMatriz(0, 2);
    matriz.instancias.push({ instanciaId:'inst_h1', subproductoId:'${subPorAssetKey.candado.subproductoId}', verticalId:'${subPorAssetKey.candado.verticalId}', valores:{} });
    refreshSedeAssets(matriz);
    sede.herenciaIds = ['inst_h1'];
    refreshSedeAssets(sede);
  })()`);
  const iconoHeredado = E(wHer, `state.sedes[0].group.getObjectByName('assetsContainer').children[0]`);
  const mallaHeredada = esMalla(iconoHeredado);
  check('el ícono heredado (glb) también queda translúcido al 50%, igual que las primitivas',
    !!mallaHeredada && mallaHeredada.material.transparent === true && Math.abs(mallaHeredada.material.opacity - 0.5) < 1e-6,
    mallaHeredada && [mallaHeredada.material.transparent, mallaHeredada.material.opacity]);

  console.log('\nH. Fallbacks');
  const w3 = ventana({ iconos:false });
  const e3 = await E(w3,'iconosListos');
  check('sin iconos-glb.js y sin servidor → "sin_modelos"', e3 === 'sin_modelos', e3);
  const iconoSinDatos = iconoDe(w3, subPorAssetKey.candado.subproductoId, subPorAssetKey.candado.verticalId);
  check('…candado sigue con su primitiva (wireframe)', !iconoSinDatos.getObjectByName('iconoGLB') && !esMalla(iconoSinDatos));
  const w4 = ventana({ filtrarIconos: d=>{ delete d.pn_ico_llave; } });
  const e4 = await E(w4,'iconosListos');
  check('si falta un solo .glb de la tanda → "parcial"', e4 === 'parcial', e4);
  const iconoLlaveFaltante = iconoDe(w4, subPorAssetKey.llave.subproductoId, subPorAssetKey.llave.verticalId);
  check('…llave (falta su .glb) cae a la primitiva; el resto de la tanda sigue con modelo', !iconoLlaveFaltante.getObjectByName('iconoGLB'));
  const iconoEscudoOk = iconoDe(w4, subPorAssetKey.escudo.subproductoId, subPorAssetKey.escudo.verticalId);
  check('…mientras que escudo (si cargó) sigue usando su .glb', !!iconoEscudoOk.getObjectByName('iconoGLB'));

  console.log('\nI. Panel izquierdo (ICONS_SVG)');
  const svgs = E(w, 'ICONS_SVG');
  check('escudo/candado/llave/muro/firewall_onpremise tienen SVG del lineup aprobado (viewBox 128)',
    ['escudo','candado','llave','muro','firewall_onpremise'].every(k=> svgs[k] && svgs[k].includes('viewBox="0 0 128 128"')));
  check('el SVG no trae el atributo color= del proveedor (pisaría el currentColor heredado)',
    ['escudo','candado','llave','muro','firewall_onpremise'].every(k=> !/\scolor="#/.test(svgs[k])));

  console.log('\nJ. Reglas del proyecto');
  // misma métrica que smoke-test-modelos.js: líneas (no ocurrencias) que contienen '.style.'
  const nEstilos = FUNCS.split('\n').filter(l=>l.includes('.style.')).length;
  check('functions.js sigue con 59 líneas con .style. (ningún estilo inline nuevo)', nEstilos === 59, nEstilos);
  const idxGLTF = HTML.indexOf('GLTFLoader.js'), idxModelos = HTML.indexOf('modelos-glb.js'),
        idxIconos = HTML.indexOf('iconos-glb.js'), idxFuncs = HTML.indexOf('functions.js');
  check('index.html: GLTFLoader → modelos-glb → iconos-glb → functions',
    idxGLTF>0 && idxGLTF<idxModelos && idxModelos<idxIconos && idxIconos<idxFuncs);

  console.log(`\n${ok}/${ok+fail} verificaciones OK` + (fail? `  (${fail} fallan)`:''));
  process.exit(fail?1:0);
})();
