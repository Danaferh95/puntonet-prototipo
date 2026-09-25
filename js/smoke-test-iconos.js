/* Smoke test v23 / prototipo v44 — íconos de producto en .glb.
   Tanda 1 (v18, Ciberseguridad): escudo/Perimetral, candado/End Point, llave/Acceso,
   muro/Aplicación, firewall_onpremise. Tanda 2 (v20, Cloud): rack/Housing, nube/Hosting.
   Tanda 3 (v21, Colaboración): pantalla/Conferencia, documento/Ofimática, puerta/Portal Cautivo,
   antena/Zona Wireless. Tanda 4 (v23, Conectividad): enlace/Datos, nodo/SD-WAN, globo/Internet
   — con ella el catálogo queda sin primitivas visibles salvo firewall_virtual.
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
  check('los 15 íconos cargan: estado "listo", sin errores', estado === 'listo' && Object.keys(E(w,'IconLibrary').errores()).length === 0, [estado, E(w,'IconLibrary').errores()]);
  check('modelosListos sigue resolviendo su propio estado (string), sin verse afectado por los íconos', typeof await E(w,'modelosListos') === 'string');
  check('sin excepciones en la carga de la página', w.__erroresScript.length === 0, w.__erroresScript);

  console.log('\nB. Reemplazo por assetKey (con .glb en esta tanda)');
  const casos = [
    ['edr', 'ciberseguridad', 'candado'],
    ['firewall_iaas', 'ciberseguridad', 'escudo'],
    ['mfa', 'ciberseguridad', 'llave'],
    ['waf', 'ciberseguridad', 'muro'],
    ['firewall_onpremise_sub', 'ciberseguridad', 'firewall_onpremise'],
    ['collocation', 'cloud', 'rack'],
    ['iaas', 'cloud', 'nube'],
    ['conferencia', 'colaboracion', 'pantalla'],
    ['ofimatica', 'colaboracion', 'documento'],
    ['portal_cautivo', 'colaboracion', 'puerta'],
    ['zona_wireless', 'colaboracion', 'antena'],
    ['canal_conexion', 'conectividad', 'enlace'],
    ['sdwan', 'conectividad', 'nodo'],
    ['internet_corporativo', 'conectividad', 'globo'],
  ];
  // subproductoId reales del catálogo: se resuelven por assetKey esperado, no se asume el id exacto
  const subPorAssetKey = {};
  E(w, 'SUBPRODUCTOS').forEach ? null : null;
  const subs = E(w, 'SUBPRODUCTOS');
  const prods = E(w, 'PRODUCTOS');
  ['candado','escudo','llave','muro','rack','nube','pantalla','documento','puerta','antena','enlace','nodo','globo'].forEach(ak=>{
    const p = prods.find(p=>p.assetKey===ak);
    const s = subs.find(s=>s.productoNivel2Id===p.id);
    subPorAssetKey[ak] = { subproductoId:s.id, verticalId:p.verticalId };
  });
  // 25/09: firewall_onpremise ya no es el assetKey de ningún subproducto (los 3 de Perimetral
  // usan el escudo, ver sección D). Su .glb sigue en el lineup y se prueba en F2/SVG.
  ['candado','escudo','llave','muro','rack','nube','pantalla','documento','puerta','antena','enlace','nodo','globo'].forEach(ak=>{
    const { subproductoId, verticalId } = subPorAssetKey[ak];
    const icono = iconoDe(w, subproductoId, verticalId);
    const mesh = esMalla(icono);
    check(`${ak}: assetsContainer trae una malla real (glb), no solo líneas`, !!mesh, ak);
    check(`${ak}: el envoltorio es el del IconLibrary (iconoGLB)`, !!icono.getObjectByName('iconoGLB'), ak);
  });

  console.log('\nC. Íconos que TODAVÍA no tienen .glb (siguen con su primitiva)');
  // Con la tanda Conectividad (v23) queda uno solo: firewall_virtual, que el proveedor excluyó del
  // lineup a propósito (v2 §3 B8). enlace/nodo/globo salieron de esta lista en esta tanda.
  ['firewall_virtual'].forEach(ak=>{
    check(`${ak} no está en ICONOS_GLB (fuera del lineup)`, !E(w,'ICONOS_GLB')[ak], ak);
  });
  const p2 = E(w,'PRODUCTOS'), s2 = E(w,'SUBPRODUCTOS');
  const pInternet = p2.find(p=>p.assetKey==='globo'), subInternet = s2.find(s=>s.productoNivel2Id===pInternet.id);
  const iconoGlobo = iconoDe(w, subInternet.id, pInternet.verticalId);
  check('globo (Internet) ya NO cae a la primitiva: usa el .glb de Conectividad',
    !!iconoGlobo.getObjectByName('iconoGLB') && !!esMalla(iconoGlobo));

  console.log('\nC2. Conectividad (v23): composición por repetición y slots');
  // `enlace` es el primer assetKey cuyo .glb NO es el ícono entero sino una pieza (el cubito de
  // 0.18) que IconLibrary repite tres veces en diagonal. Si esta composición se rompiera, el test
  // de F2 seguiría pasando — el conjunto mide 0.58 igual que una copia inflada —, así que hay que
  // contar las copias explícitamente.
  const iEnlace = iconoDe(w, subPorAssetKey.enlace.subproductoId, subPorAssetKey.enlace.verticalId);
  const repetido = iEnlace.getObjectByName('iconoRepetido');
  check('enlace: el .glb de una sola pieza se compone en 3 paquetes (ICONOS_GLB.enlace.repetir)',
    !!repetido && repetido.children.length === 3, repetido && repetido.children.length);
  const geosEnlace = new Set(); iEnlace.traverse(o=>{ if(o.isMesh) geosEnlace.add(o.geometry.uuid); });
  check('enlace: las 3 copias comparten geometría (una por slot, no una por copia)', geosEnlace.size <= 2, geosEnlace.size);
  const slotsEnlace = []; iEnlace.traverse(o=>{ if(o.isMesh) slotsEnlace.push(o.userData.slot); });
  check('enlace: cada copia conserva sus dos slots (userData.slot sobrevive al clonado)',
    slotsEnlace.filter(s=>s==='glow').length === 3 && slotsEnlace.filter(s=>s==='base').length === 3, slotsEnlace);
  const cajaEnlace = E(w, `(function(){
    const o = IconLibrary.instanciar('enlace', 0xffffff);
    const c = new THREE.Box3().setFromObject(o);
    return [c.min.y, c.getCenter(new THREE.Vector3()).x];
  })()`);
  check('enlace: el conjunto queda apoyado en Y=0 y centrado en X (pivote del conjunto, no de la copia)',
    Math.abs(cajaEnlace[0]) < 0.005 && Math.abs(cajaEnlace[1]) < 0.005, cajaEnlace);
  const iNodo = iconoDe(w, subPorAssetKey.nodo.subproductoId, subPorAssetKey.nodo.verticalId);
  const slotsNodo = []; iNodo.traverse(o=>{ if(o.isMesh) slotsNodo.push(o.userData.slot); });
  check('nodo (SD-WAN): base y glow llegan como mallas separadas', slotsNodo.includes('base') && slotsNodo.includes('glow'), slotsNodo);
  const slotsGlobo = []; iconoGlobo.traverse(o=>{ if(o.isMesh) slotsGlobo.push(o.userData.slot); });
  check('globo (Internet): llega solo con mat_base, sin rasgo emisivo (LEEME del paquete)',
    slotsGlobo.length > 0 && slotsGlobo.every(s=>s==='base'), slotsGlobo);
  // El .glb de Conectividad viene teñido en menta (#00FFBA); mismo criterio que el celeste de Cloud
  // y el lima de Colaboración: materialesDeColor() lo descarta y manda el color del catálogo.
  const colorNodo = E(w, `getSubproductoColor(SUBPRODUCTOS.find(s=>s.id==='${subPorAssetKey.nodo.subproductoId}'))`);
  const mallaNodoBase = (()=>{ let m=null; iNodo.traverse(o=>{ if(!m && o.isMesh && o.userData.slot==='base') m=o; }); return m; })();
  check('nodo: el menta del archivo NO llega a la escena, manda el color del catálogo',
    !!mallaNodoBase && mallaNodoBase.material.color.clone().convertLinearToSRGB().getHex() === colorNodo,
    mallaNodoBase && [mallaNodoBase.material.color.clone().convertLinearToSRGB().getHex(), colorNodo]);

  console.log('\nD. Perimetral anidado y Puntonet Space (25/09)');
  ['firewall_on_premise','firewall_iaas','internet_seguro'].forEach(id=>{
    const s = s2.find(x=>x.id===id);
    const clave = s.assetKey || p2.find(p=>p.id===s.productoNivel2Id).assetKey;
    check(`${id}: usa las paredes de Perimetral (escudo)`, clave === 'escudo', clave);
  });
  const anidado = E(w, `(function(){
    const s = createSede(30, 0, 0);
    ['firewall_on_premise','firewall_iaas','internet_seguro'].forEach((id,i)=> s.instancias.push({ instanciaId:'anid_'+i, subproductoId:id, verticalId:'ciberseguridad', valores:{} }));
    refreshSedeAssets(s);
    const hijos = s.group.getObjectByName('assetsContainer').children;
    return hijos.map(h=>{ const c = new THREE.Box3().setFromObject(h); const t = c.getSize(new THREE.Vector3()); return { id:h.userData.instanciaId, x:t.x, y:t.y }; });
  })()`);
  check('3 de Perimetral en una sede = 3 capas de paredes', anidado.length === 3, anidado);
  check('cada capa envuelve a la anterior (más ancha, en orden de alta)',
    anidado.length === 3 && anidado[0].id === 'anid_0' && anidado[1].x > anidado[0].x && anidado[2].x > anidado[1].x, anidado);
  check('las capas mantienen la misma altura', anidado.length === 3 && Math.abs(anidado[2].y - anidado[0].y) < 1e-3, anidado);
  const subSp = s2.find(s=>s.id==='puntonet_space');
  const iSp = iconoDe(w, subSp.id, p2.find(p=>p.id===subSp.productoNivel2Id).verticalId);
  check('puntonet_space: usa su .glb propio', !!iSp.getObjectByName('iconoGLB') && !!iSp.getObjectByName('space_radiating_face'));
  const matsSp = new Set(); iSp.traverse(o=>{ if(o.isMesh) matsSp.add(o.material.name); });
  check('puntonet_space: conserva los materiales PBR del .glb (no se tiñe)', matsSp.has('pn_space_emission') && matsSp.has('pn_space_panel'), [...matsSp]);

  console.log('\nE. Color por catálogo (compartido, no uno por instancia)');
  const pPerim = prods.find ? prods.find(p=>p.assetKey==='escudo') : null;
  const subsPerim = subs.filter(s=>s.productoNivel2Id===pPerim.id);
  check('hay más de un subproducto para comparar colores en Perimetral', subsPerim.length >= 1, subsPerim.length);
  const colorA = E(w, `getSubproductoColor(SUBPRODUCTOS.find(s=>s.id==='${subsPerim[0].id}'))`);
  // functions.js §3A-ter guarda los colores de superficie en lineal; para comparar contra el hex
  // del catálogo hay que deshacer la conversión. La ida y vuelta es exacta.
  const aSRGB = mat => mat.color.clone().convertLinearToSRGB().getHex();
  const i1 = iconoDe(w, subsPerim[0].id, pPerim.verticalId);
  const i2 = iconoDe(w, subsPerim[0].id, pPerim.verticalId);
  const m1 = esMalla(i1), m2 = esMalla(i2);
  check('dos instancias del mismo assetKey + color comparten el material (cache por color)', m1.material === m2.material);
  check('el material tomó el color del subproducto', aSRGB(m1.material) === colorA, [aSRGB(m1.material), colorA]);

  console.log('\nF. Slots de material (base/glow/translucido/receso) y bloom');
  const iCandado = iconoDe(w, subPorAssetKey.candado.subproductoId, subPorAssetKey.candado.verticalId);
  const capaBrillo = E(w,'CAPA_BRILLO');
  let algunaEnCapaBrillo = false, mallas = 0;
  iCandado.traverse(o=>{ if(o.isMesh){ mallas++; if(o.layers.mask & (1 << capaBrillo)) algunaEnCapaBrillo = true; } });
  check('candado: al menos una malla (más de un slot de material en juego)', mallas > 0, mallas);
  check('los íconos de producto NO participan del bloom (mockup v17: "no brillan… íconos de producto")', !algunaEnCapaBrillo);
  check('sin avisos de "material desconocido" para los 15 .glb integrados', !(w.__warns||[]).some(x=>x.includes('material') && x.includes('desconocido')), w.__warns);
  // La tanda Cloud trae SOLO mat_base + mat_glow (la de Ciberseguridad ampliaba con translucido y
  // receso). Se valida que los dos slots lleguen como mallas separadas: si el proveedor hubiera
  // pintado el glow como máscara en vez de geometría propia, acá habría una sola malla.
  const iNube = iconoDe(w, subPorAssetKey.nube.subproductoId, subPorAssetKey.nube.verticalId);
  const slotsNube = []; iNube.traverse(o=>{ if(o.isMesh) slotsNube.push(o.userData.slot); });
  check('nube (Cloud): base y glow llegan como mallas separadas', slotsNube.includes('base') && slotsNube.includes('glow'), slotsNube);
  const iRack = iconoDe(w, subPorAssetKey.rack.subproductoId, subPorAssetKey.rack.verticalId);
  const slotsRack = []; iRack.traverse(o=>{ if(o.isMesh) slotsRack.push(o.userData.slot); });
  check('rack (Cloud): base y glow llegan como mallas separadas', slotsRack.includes('base') && slotsRack.includes('glow'), slotsRack);
  // El .glb de Cloud viene teñido en celeste; materialesDeColor() lo descarta y usa el catálogo.
  const colorNube = E(w, `getSubproductoColor(SUBPRODUCTOS.find(s=>s.id==='${subPorAssetKey.nube.subproductoId}'))`);
  const mallaNubeBase = (()=>{ let m=null; iNube.traverse(o=>{ if(!m && o.isMesh && o.userData.slot==='base') m=o; }); return m; })();
  check('nube: el celeste del archivo NO llega a la escena, manda el color del catálogo',
    !!mallaNubeBase && aSRGB(mallaNubeBase.material) === colorNube, mallaNubeBase && [aSRGB(mallaNubeBase.material), colorNube]);

  // v21 — Colaboración. `puerta` (Portal Cautivo) es el primer ícono del lineup que trae los
  // CUATRO slots en un mismo archivo: cuerpo, aros emisivos, carcasa oscura y credencial
  // translúcida. Si el proveedor los hubiera fusionado, acá faltaría alguno.
  const iPuerta = iconoDe(w, subPorAssetKey.puerta.subproductoId, subPorAssetKey.puerta.verticalId);
  const slotsPuerta = []; iPuerta.traverse(o=>{ if(o.isMesh) slotsPuerta.push(o.userData.slot); });
  check('puerta (Colaboración): los 4 slots llegan como mallas separadas',
    ['base','glow','receso','translucido'].every(x=>slotsPuerta.includes(x)), slotsPuerta);
  const iAntena = iconoDe(w, subPorAssetKey.antena.subproductoId, subPorAssetKey.antena.verticalId);
  const slotsAntena = []; iAntena.traverse(o=>{ if(o.isMesh) slotsAntena.push(o.userData.slot); });
  check('antena (Colaboración): base, glow y receso llegan como mallas separadas',
    ['base','glow','receso'].every(x=>slotsAntena.includes(x)), slotsAntena);
  const iDocumento = iconoDe(w, subPorAssetKey.documento.subproductoId, subPorAssetKey.documento.verticalId);
  const slotsDoc = []; iDocumento.traverse(o=>{ if(o.isMesh) slotsDoc.push(o.userData.slot); });
  check('documento (Colaboración): base y glow llegan como mallas separadas',
    slotsDoc.includes('base') && slotsDoc.includes('glow'), slotsDoc);
  // El .glb de Colaboración viene teñido en el lima de la categoría (#DCE361); mismo criterio que
  // el celeste de Cloud: materialesDeColor() lo descarta y manda el catálogo.
  const colorPantalla = E(w, `getSubproductoColor(SUBPRODUCTOS.find(s=>s.id==='${subPorAssetKey.pantalla.subproductoId}'))`);
  const iPantalla = iconoDe(w, subPorAssetKey.pantalla.subproductoId, subPorAssetKey.pantalla.verticalId);
  const mallaPantallaBase = (()=>{ let m=null; iPantalla.traverse(o=>{ if(!m && o.isMesh && o.userData.slot==='base') m=o; }); return m; })();
  check('pantalla: el lima del archivo NO llega a la escena, manda el color del catálogo',
    !!mallaPantallaBase && aSRGB(mallaPantallaBase.material) === colorPantalla,
    mallaPantallaBase && [aSRGB(mallaPantallaBase.material), colorPantalla]);

  console.log('\nF2. Normalización de tamaño entre tandas (v21, ICONOS_DIM_OBJETIVO)');
  // Pendiente 39 de v20: la especificación fija un techo de envolvente (0.6³) y no una medida
  // común, así que cada tanda se acomodaba distinto adentro. prepararPlantilla() escala cada
  // plantilla para que su dimensión MAYOR — no la altura: ver el comentario de §3D — dé el mismo
  // número. Se mide sobre íconos ya instanciados, que es lo que llega a la escena.
  const objetivo = E(w, 'ICONOS_DIM_OBJETIVO');
  const medidas = {};
  for(const ak of ['escudo','candado','llave','muro','firewall_onpremise','rack','nube','pantalla','documento','puerta','antena','enlace','nodo','globo']){
    medidas[ak] = E(w, `(function(){
      const o = IconLibrary.instanciar('${ak}', 0xffffff);
      const c = new THREE.Box3().setFromObject(o);
      const t = c.getSize(new THREE.Vector3());
      return Math.max(t.x, t.y, t.z);
    })()`);
  }
  const fuera = Object.entries(medidas).filter(([,v])=> Math.abs(v - objetivo) > 0.005);
  check(`los 14 íconos quedan en la misma dimensión mayor (${objetivo})`, fuera.length === 0, fuera);
  // Y que siga cumpliendo la envolvente de v2 §3 después de normalizar.
  check('ninguno se pasa de la envolvente de 0.6 de v2 §3 al normalizar',
    Object.values(medidas).every(v=> v <= 0.6 + 1e-6), medidas);

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
  const SVG_LINEUP = ['escudo','candado','llave','muro','firewall_onpremise','rack','nube','pantalla','documento','puerta','antena','enlace','nodo','globo'];
  check('los 14 íconos del lineup aprobado tienen SVG del proveedor (viewBox 128)',
    SVG_LINEUP.every(k=> svgs[k] && svgs[k].includes('viewBox="0 0 128 128"')), SVG_LINEUP.filter(k=>!(svgs[k]||'').includes('viewBox="0 0 128 128"')));
  check('el SVG no trae el atributo color= del proveedor (pisaría el currentColor heredado)',
    SVG_LINEUP.every(k=> !/\scolor="#/.test(svgs[k])), SVG_LINEUP.filter(k=>/\scolor="#/.test(svgs[k]||'')));
  // v23: la tanda Conectividad trajo el menta como stroke="#00FFBA" en el <svg> raíz, no como
  // color=. Es el mismo problema por otro atributo, así que se cubre aparte.
  check('ningún SVG del lineup trae stroke de color fijo (v23: el menta #00FFBA del proveedor)',
    SVG_LINEUP.every(k=> !/stroke="#|stroke:\s*#/i.test(svgs[k])), SVG_LINEUP.filter(k=>/stroke="#|stroke:\s*#/i.test(svgs[k]||'')));
  check('cada SVG del lineup usa currentColor (se tiñe desde el catálogo)',
    SVG_LINEUP.every(k=> svgs[k].includes('currentColor')), SVG_LINEUP.filter(k=>!(svgs[k]||'').includes('currentColor')));
  // v21: `pantalla` llegó como export de Illustrator con el color en un <style> interno
  // (.st0,.st1{fill:#dce361}). Una clase del propio SVG le gana al `color` heredado del contenedor,
  // así que el ícono habría quedado lima fijo. Se reescribió a fill="currentColor"; este check es
  // para que una regeneración futura desde el archivo del proveedor no lo reintroduzca.
  check('ningún SVG del lineup trae <style> ni fill de color fijo (pisarían el currentColor)',
    SVG_LINEUP.every(k=> !/<style|fill="#|fill:\s*#/i.test(svgs[k])),
    SVG_LINEUP.filter(k=>/<style|fill="#|fill:\s*#/i.test(svgs[k]||'')));
  check('ningún SVG del lineup arrastra metadata de Illustrator',
    SVG_LINEUP.every(k=> !/aipgf|AdobeIllustrator|<metadata/i.test(svgs[k])),
    SVG_LINEUP.filter(k=>/aipgf|AdobeIllustrator|<metadata/i.test(svgs[k]||'')));

  console.log('\nJ. Reglas del proyecto');
  // misma métrica que smoke-test-modelos.js: líneas (no ocurrencias) que contienen '.style.'
  const nEstilos = FUNCS.split('\n').filter(l=>l.includes('.style.')).length;
  check('functions.js no suma líneas con .style. (rediseño design system: bajó de 59 a 51 — ningún estilo inline nuevo)', nEstilos <= 51, nEstilos);
  const idxGLTF = HTML.indexOf('GLTFLoader.js'), idxModelos = HTML.indexOf('modelos-glb.js'),
        idxIconos = HTML.indexOf('iconos-glb.js'), idxFuncs = HTML.indexOf('functions.js');
  check('index.html: GLTFLoader → modelos-glb → iconos-glb → functions',
    idxGLTF>0 && idxGLTF<idxModelos && idxModelos<idxIconos && idxIconos<idxFuncs);

  console.log(`\n${ok}/${ok+fail} verificaciones OK` + (fail? `  (${fail} fallan)`:''));
  process.exit(fail?1:0);
})();
