/* Smoke test v16 / prototipo v40 — integración de los modelos .glb de entidades (sigue vigente en v41).
   Uso (desde la raíz del proyecto):  npm i jsdom three@0.128.0   y luego   node smoke-test-modelos.js
   Carga index.html + three r128 + js/vendor/GLTFLoader.js + js/modelos-glb.js + js/functions.js
   en jsdom, con el WebGLRenderer y el canvas 2D sustituidos por dobles (no hay GPU en node).
   Lo visual (materiales, iluminación, snapshot del PDF) se validó aparte en Chromium con WebGL. */
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
const DATOS = leer('js/modelos-glb.js');

let ok = 0, fail = 0;
function check(nombre, cond, detalle){
  if(cond){ ok++; console.log('  ✔ ' + nombre); }
  else { fail++; console.log('  ✘ ' + nombre + (detalle !== undefined ? '  → ' + util.inspect(detalle, { depth:3 }) : '')); }
}
const cerca = (a, b, tol=1e-3) => Math.abs(a - b) <= tol;

/* Crea una ventana nueva. opciones: { loader, datos, sinFetch, filtrarDatos(obj) } */
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
  // doble del renderer: misma API que usa functions.js, sin WebGL
  run(`THREE.WebGLRenderer = function(){ this.domElement = document.createElement('canvas');
    this.setPixelRatio = ()=>{}; this.setSize = ()=>{}; this.render = ()=>{};
    this.getClearColor = c=>c; this.setClearColor = ()=>{}; this.getClearAlpha = ()=>0;
    this.getSize = v=>v.set(800, 600); this.getPixelRatio = ()=>1; this.setRenderTarget = ()=>{}; this.clear = ()=>{};
    this.autoClear = true; this.capabilities = { isWebGL2:false }; };`);
  if(op.loader !== false) run(LOADER);
  if(op.datos !== false) run(DATOS);
  if(op.filtrarDatos) op.filtrarDatos(w.PN_MODELOS_GLB);
  if(op.antesDeFunciones) run(op.antesDeFunciones);
  run(FUNCS);
  w.__erroresScript = errores;
  return w;
}
const E = (w, expr) => w.eval(expr);

(async()=>{
  console.log('\nA. Carga');
  const w = ventana();
  check('GLTFLoader r128 disponible', typeof w.THREE.GLTFLoader === 'function');
  const claves = Object.keys(w.PN_MODELOS_GLB || {}).sort();
  const esperados = Object.values(E(w,'MODELOS')).map(m=>m.archivo).sort();
  check('modelos-glb.js trae los 6 archivos del catálogo MODELOS', JSON.stringify(claves) === JSON.stringify(esperados), claves);
  check('antes de cargar, el Datacenter usa la primitiva (arranque inmediato)', !E(w,'datacenterGroup').userData.modelo);
  const estado = await E(w,'modelosListos');
  check('los 6 modelos cargan: estado "listo", sin errores', estado === 'listo' && Object.keys(E(w,'ModelLibrary').errores()).length === 0, [estado, E(w,'ModelLibrary').errores()]);
  check('sin excepciones en la carga de la página', w.__erroresScript.length === 0, w.__erroresScript);

  console.log('\nB. Materiales');
  const mats = E(w,'ModelLibrary').materiales();
  check('una familia de materiales por tipo de entidad (4)', Object.keys(mats).sort().join() === 'datacenter,matriz,nube,sede', Object.keys(mats));
  check('metal = MeshStandardMaterial (PBR), glow emisivo', Object.values(mats).every(m=> m.base.isMeshStandardMaterial && m.glow.emissive.getHex() !== 0));
  // Desde el pipeline de color (functions.js §3A-ter) los colores de superficie se guardan en
  // LINEAL, así que getHex() ya no devuelve el hex de catálogo: hay que volver a sRGB para
  // comparar. Lo que se verifica sigue siendo lo mismo — que el acento violeta es el de v39.
  const aSRGB = color => color.clone().convertLinearToSRGB().getHex();
  check('la Nube conserva el acento violeta de v39', aSRGB(mats.nube.glow.emissive) === 0xa78bfa,
    '0x' + aSRGB(mats.nube.glow.emissive).toString(16));
  check('sin environment map en jsdom, pero la escena no se rompe', mats.sede.base.envMap === null);

  console.log('\nC. Datacenter');
  const dc = E(w,'datacenterGroup');
  const dcD = dc.userData.dims;
  check('Datacenter reemplazado por el modelo', dc.userData.modelo === true && !!dc.getObjectByName('modeloGLB'));
  // v47: Datacenter y Matriz ya no usan la escala global, llevan su propia `escala` en MODELOS
  // (ver §3D). La aserción tiene que leer la del modelo, no MODELOS_ESCALA.
  const escalaDe = clave => E(w, `MODELOS['${clave}'].escala || MODELOS_ESCALA`);
  check('dcY = altura real del modelo escalado', cerca(E(w,'dcY'), 0.9057195 * escalaDe('datacenter')), [E(w,'dcY'), dcD]);
  check('el Datacenter mide 2 celdas de ancho (pedido del cliente, v47)', cerca(dcD.w, 2 * E(w,'GRID_SPACING'), 0.05), dcD.w);
  const nombres = dc.children.map(o=>o.name);
  check('tras reconstruir: 1 halo, 1 hitbox, 1 puerto (sin duplicados)',
    nombres.filter(n=>n==='matrizHalo').length===1 && nombres.filter(n=>n==='matrizHitbox').length===1 && nombres.filter(n=>n==='connPort').length===1, nombres);
  const halo = dc.getObjectByName('matrizHalo');
  check('el halo no queda atravesado por las esquinas de la planta', halo.geometry.parameters.innerRadius > Math.hypot(dcD.w/2, dcD.d/2), [halo.geometry.parameters.innerRadius, dcD]);
  const dcHit = dc.getObjectByName('matrizHitbox');
  check('el hitbox cubre el ancho del modelo', dcHit.geometry.parameters.width >= dcD.w && dcHit.userData.sedeId === 'datacenter');
  check('7 luces de fachada y 1 beam de Matriz quedan animables', E(w,'ModelLibrary').animables.luces.length === 7 && E(w,'ModelLibrary').animables.beams.length === 1);
  check('etiqueta del Datacenter a dcY + 0.8', cerca(E(w,'nameLabels').get('datacenter').localY, E(w,'dcY') + 0.8));

  console.log('\nD. Sedes');
  const sP = E(w,'createSede(5, 1, 1)'), sM = E(w,'createSede(30, -1, 1)'), sG = E(w,'createSede(80, 2, 2)');
  const k = E(w,'MODELOS_ESCALA');
  check('los 3 tamaños usan su modelo', [sP,sM,sG].every(s=>s.group.userData.modelo === true));
  check('ancho de cada sede = ancho del .glb × MODELOS_ESCALA', cerca(sP.group.userData.dims.w, 0.8*k) && cerca(sM.group.userData.dims.w, 1.0*k) && cerca(sG.group.userData.dims.w, 1.2*k),
    [sP,sM,sG].map(s=>s.group.userData.dims.w));
  const hb = sM.group.getObjectByName('sedeHitbox');
  check('sedeHitbox es una caja invisible (Mesh) con sedeId', hb && hb.isMesh && !hb.material.visible && hb.userData.sedeId === sM.id);
  let lineas = 0; sM.group.traverse(o=>{ if(o.isLineSegments && o.parent && o.parent.name !== 'assetsContainer') lineas++; });
  check('el cuerpo de la sede ya no tiene wireframe', lineas === 0, lineas);
  const geoA = sM.group.getObjectByName('modeloGLB'), sM2 = E(w,'createSede(25, -2, -2)');
  const primeraMalla = g=>{ let m=null; g.traverse(o=>{ if(!m && o.isMesh && o.name!=='sedeHitbox' && o.name!=='halo') m=o; }); return m; };
  check('dos sedes medianas comparten geometría y material (1 buffer en GPU)',
    primeraMalla(geoA).geometry === primeraMalla(sM2.group.getObjectByName('modeloGLB')).geometry &&
    primeraMalla(geoA).material === primeraMalla(sM2.group.getObjectByName('modeloGLB')).material);
  check('etiqueta de la sede a altura del modelo + 0.85', cerca(E(w,'nameLabels').get(sM.id).localY, sM.group.userData.dims.h + 0.85));
  w.eval(`(function(){ const s=state.sedes.find(x=>x.id==='${sM.id}'); s.instancias.push({ instanciaId:'inst_t1', subproductoId:'edr', verticalId:'ciberseguridad', valores:{} }); refreshSedeAssets(s); })()`);
  const icono = sM.group.getObjectByName('assetsContainer').children[0];
  // v46: los íconos ya NO viven en un anillo flotante sobre el techo. `edr` usa el candado, que
  // se coloca en modo 'envolver': centrado en planta sobre el edificio y a la altura de su
  // cuerpo, no por encima. Esta aserción es la que impide volver al anillo sin darse cuenta.
  const gEnt = E(w, `geometriaEntidad(state.sedes.find(x=>x.id==='${sM.id}'))`);
  check('End Point se coloca envolviendo el edificio, no en un anillo flotante',
    icono.position.x === 0 && icono.position.z === 0 && icono.position.y < gEnt.h,
    [icono.position.x, icono.position.y, icono.position.z, gEnt.h]);
  check('ningún ícono queda por encima del techo del modelo',
    sM.group.getObjectByName('assetsContainer').children.every(a=>a.position.y <= gEnt.h + 0.001));
  E(w,`setSedeEmpleados(state.sedes.find(x=>x.id==='${sM.id}'), 80)`);
  const sMr = E(w,`state.sedes.find(x=>x.id==='${sM.id}')`);
  check('cambiar a 80 empleados reconstruye con el modelo Grande y conserva productos', sMr.tamano==='grande' && sMr.group.userData.modelo && cerca(sMr.group.userData.dims.w, 1.2*k) && sMr.instancias.length===1);
  check('el group reconstruido conserva sedeId (Object.assign sobre userData)', sMr.group.userData.sedeId === sM.id && !!sMr.group.userData.dims);

  console.log('\nE. Matriz y Nube');
  const m = E(w,'createMatriz(0, 0)');
  check('Matriz usa el modelo, con sus 4 objetos nombrados', m.group.userData.modelo && ['nucleo','beam','shell_a','shell_b'].every(n=>!!m.group.getObjectByName(n)));
  check('Matriz: sin cascarones giratorios de v39 (hubShell)', !m.group.getObjectByName('hubShell') && !m.group.getObjectByName('hubShell2'));
  check('Matriz: coreY = altura del modelo', cerca(m.group.userData.coreY, 1.0806451 * escalaDe('matriz')));
  // La jerarquía de tamaños que pidió el cliente: Datacenter > Matriz > Sede Grande.
  check('jerarquía de anchos: Datacenter > Matriz > Sede Grande',
    dcD.w > m.group.userData.dims.w && m.group.userData.dims.w > E(w,'huellaDeClave("sede_grande")').w,
    [dcD.w, m.group.userData.dims.w, E(w,'huellaDeClave("sede_grande")').w]);
  const n = E(w,"createNube('AWS', -1, -1)");
  check('Nube usa el modelo (puffs + base) y coreY = su altura', n.group.userData.modelo && !!n.group.getObjectByName('puffs') && !!n.group.getObjectByName('base') && cerca(n.group.userData.coreY, 0.6126316 * k));

  console.log('\nF. Selección (raycast)');
  let mallasModelo = 0, conRaycastNulo = 0;
  sG.group.getObjectByName('modeloGLB').traverse(o=>{ if(o.isMesh){ mallasModelo++; if(o.hasOwnProperty('raycast')) conRaycastNulo++; } });
  check('las mallas del modelo no participan del raycast', mallasModelo > 0 && mallasModelo === conRaycastNulo, [mallasModelo, conRaycastNulo]);
  const rc = new w.THREE.Raycaster(new w.THREE.Vector3(sG.group.position.x, 20, sG.group.position.z), new w.THREE.Vector3(0,-1,0));
  E(w,'scene').updateMatrixWorld(true); // en la app lo hace cada render; el doble del renderer no
  rc.camera = E(w,'camera'); // los sprites (puertos) necesitan cámara para el raycast
  const hits = rc.intersectObjects(E(w,'scene').children, true).filter(h=>h.object.userData.isSedeRoot);
  check('un rayo sobre la sede sigue resolviendo su sedeId (vía hitbox)', hits.length && hits[0].object.userData.sedeId === sG.id, hits.map(h=>h.object.name));

  console.log('\nG. Otros comportamientos');
  let efecto = null;
  const addOrig = m.group.add.bind(m.group);
  m.group.add = function(o){ if(o.isMesh && o.geometry.type==='BoxGeometry' && !efecto) efecto = o.geometry.parameters; return addOrig.apply(this, arguments); };
  E(w,`playWrapEffect('${m.id}', 'waf', ()=>{})`);
  const dM = m.group.userData.dims;
  check('el recubrimiento abraza el modelo (planta real, no 4.6×4.6)', efecto && cerca(efecto.width, dM.w+0.35) && cerca(efecto.depth, dM.d+0.35), efecto);
  E(w,'deleteDatacenter()');
  check('eliminar el Datacenter lo oculta y quita su etiqueta', !dc.visible && !E(w,'nameLabels').has('datacenter'));
  E(w,'restoreDatacenter()');
  check('restaurarlo lo vuelve a mostrar con la etiqueta a dcY + 0.8', dc.visible && cerca(E(w,'nameLabels').get('datacenter').localY, E(w,'dcY') + 0.8));
  const cfg = E(w,'buildConfiguracionCliente()');
  check('JSON exportado sin cambios de esquema (version 14)', cfg.version === 14);
  check('ningún error de script durante todo el recorrido', w.__erroresScript.length === 0, w.__erroresScript);

  console.log('\nH. Entidades creadas ANTES de que terminen de cargar los modelos');
  const w2 = ventana();
  const pre = E(w2,'createSede(30, 1, 1)'); const preM = E(w2,'createMatriz(0,0)');
  E(w2,`state.conexiones.push({ id:'c_t', aId:'${pre.id}', bId:'${preM.id}', subproductoId:'canal_conexion', instanciaId:'i_t', ownerId:'${pre.id}' }); rebuildConnections();`);
  const posPre = pre.group.position.clone(), grupoViejo = pre.group;
  check('nacen con primitiva', !pre.group.userData.modelo && !preM.group.userData.modelo);
  await E(w2,'modelosListos');
  const preR = E(w2,`state.sedes.find(s=>s.id==='${pre.id}')`), preMR = E(w2,`state.matrices.find(s=>s.id==='${preM.id}')`);
  check('al terminar la carga se actualizan al modelo', preR.group.userData.modelo === true && preMR.group.userData.modelo === true);
  check('conservan posición, id y la conexión entre ellas', preR.group.position.equals(posPre) && preMR.group.userData.sedeId === preM.id && E(w2,'state.conexiones').length === 1 && E(w2,'connectionAnims').length === 1);
  check('el group viejo ya no está en la escena', !E(w2,'scene').children.includes(grupoViejo) && E(w2,'scene').children.includes(preR.group));

  console.log('\nH-bis. Ocupación de la grilla por huella real (v47)');
  // Con los tamaños de v47 varias entidades son más anchas que su celda, así que la grilla ya no
  // puede razonar por celda suelta. Esta sección es la que impide volver a la regla vieja sin
  // darse cuenta: es un cambio invisible hasta que dos plataformas se funden en una sola losa.
  const wG = ventana({});
  await E(wG,'modelosListos');
  const SEP = E(wG,'GRID_SPACING');
  const gDC = E(wG,'datacenterGroup').userData.dims;
  const gMat = E(wG,'huellaDeClave("matriz")'), gGran = E(wG,'huellaDeClave("sede_grande")');
  const gPeq = E(wG,'huellaDeClave("sede_pequeno")');
  check('hay entidades más anchas que una celda (si no, esta sección no prueba nada)',
    gDC.w > SEP && gMat.w > SEP && gGran.w > SEP, [gDC.w, gMat.w, gGran.w, SEP]);
  check('la celda pegada al Datacenter NO admite una Matriz',
    E(wG, `occupied(1, DATACENTER_GZ, null, huellaDeClave('matriz'))`) === true);
  check('…pero a dos celdas sí entra',
    E(wG, `occupied(2, DATACENTER_GZ, null, huellaDeClave('matriz'))`) === false);
  check('una Sede Pequeña tampoco entra pegada al Datacenter (la huella manda, no el tipo)',
    E(wG, `occupied(1, DATACENTER_GZ, null, huellaDeClave('sede_pequeno'))`) === true, gPeq);
  const gA = E(wG,'createSede(80, 5, 5)');
  check('dos Sedes Grandes no caben en celdas contiguas',
    E(wG, `occupied(6, 5, null, huellaDeClave('sede_grande'))`) === true);
  // La separación no se mide en celdas: basta con que las dos huellas no se toquen, y el hueco
  // puede aparecer tanto corriéndose en X como bajando en Z (el barrido de v47 recorre anillos).
  const cLibre = E(wG, `nearestFreeCell(6*GRID_SPACING, 5*GRID_SPACING, null, huellaDeClave('sede_grande'))`);
  check('…y nearestFreeCell devuelve una celda cuya huella no toca a la vecina',
    E(wG, `seSolapan(huellaEnCelda(${cLibre.gx}, ${cLibre.gz}, ${gGran.w}, ${gGran.d}),
                     huellaDeColocada(state.sedes.find(s=>s.id==='${gA.id}')))`) === false,
    [cLibre, gA.gx, gA.gz]);
  check('mover una entidad no la considera obstáculo de sí misma',
    E(wG, `occupied(${gA.gx}, ${gA.gz}, '${gA.id}', dimsEntidad(state.sedes.find(s=>s.id==='${gA.id}')))`) === false);

  console.log('\nH-ter. Punto de conexión en el techo, al centro (T01)');
  // El puerto (+) de las cuatro entidades va centrado sobre el techo, y los cables salen y llegan
  // por arriba. La verificación de cruce NO reutiliza curvaDeCable ni cajasDeEntidades: las cajas
  // se arman acá, desde la posición del group y dimsEntidad, y la curva se muestrea más fino.
  const wP = ventana({});
  await E(wP,'modelosListos');
  const LIFT = E(wP,'PUERTO_SOBRE_TECHO');
  const puertoLocal = ent => ent.group.getObjectByName('connPort').position;
  const enTecho = ent => { const p = puertoLocal(ent), d = E(wP,'dimsEntidad')(ent);
    return cerca(p.x, 0) && cerca(p.z, 0) && cerca(p.y, d.h + LIFT); };
  const dcP = E(wP,'state.datacenter');
  // DC en (0,-2). Una entidad de cada tipo en los cuatro lados, lejos entre sí para que la
  // grilla no las corra (se colocan directo, sin nearestFreeCell).
  const mIzq = E(wP,'createMatriz(-3, -2)');       // a la izquierda del DC
  const sDer = E(wP,'createSede(90, 3, -2)');      // a la derecha, Sede Grande
  const nDel = E(wP,"createNube('AWS', 0, 1)");    // delante
  const sDet = E(wP,'createSede(10, 0, -5)');      // detrás, Sede Pequeña
  const todas = [dcP, mIzq, sDer, nDel, sDet];
  check('el puerto de Datacenter, Matriz, Sede y Nube está al centro, sobre el techo',
    todas.every(enTecho), todas.map(e=>[e.id, puertoLocal(e).toArray().map(v=>+v.toFixed(2))]));

  const conectar = (a, b) => E(wP, `(state.conexiones.push({ id:'t01_'+state.conexiones.length, aId:'${a.id}', bId:'${b.id}' }), rebuildConnections(), connectionAnims.length)`);
  [mIzq, sDer, nDel, sDet].forEach(e=> conectar(e, dcP));   // 4 orientaciones hacia el DC
  conectar(mIzq, sDer);                                     // pasa por encima del DC
  conectar(sDet, dcP);                                      // repetida: abanico
  const curvas = E(wP,'connectionAnims').map(a=>a.curve);
  check('hay un cable por conexión', curvas.length === 6, curvas.length);

  const cajaDe = ent => { const d = E(wP,'dimsEntidad')(ent), p = ent.group.position;
    return { x0:p.x-d.w/2, x1:p.x+d.w/2, z0:p.z-d.d/2, z1:p.z+d.d/2, y1:d.h }; };
  const cajas = todas.map(cajaDe);
  const dentro = (pt, c) => pt.x > c.x0 && pt.x < c.x1 && pt.z > c.z0 && pt.z < c.z1 && pt.y < c.y1;
  const cruces = curvas.map((cv, i)=> cv.getPoints(400).filter(pt=> cajas.some(c=> dentro(pt, c))).length);
  check('ningún cable atraviesa un edificio (izq., der., delante, detrás y por encima del DC)',
    cruces.every(n=> n === 0), cruces);

  const wpos = ent => ent.group.getObjectByName('connPort').getWorldPosition(new wP.THREE.Vector3());
  check('cada cable nace y termina exactamente en el puerto de techo de sus extremos',
    E(wP,'state.conexiones').every((c, i)=> curvas[i].getPoint(0).distanceTo(wpos(E(wP,'getSedeById')(c.aId))) < 1e-6 &&
                                            curvas[i].getPoint(1).distanceTo(wpos(E(wP,'getSedeById')(c.bId))) < 1e-6));
  check('los cables salen hacia arriba y llegan desde arriba',
    curvas.every(cv=> cv.getTangent(0).y > 0.9 && cv.getTangent(1).y < -0.9),
    curvas.map(cv=> [+cv.getTangent(0).y.toFixed(2), +cv.getTangent(1).y.toFixed(2)]));
  const salidasDC = curvas.filter((cv, i)=> E(wP,'state.conexiones')[i].bId === 'datacenter').map(cv=> cv.getPoint(1));
  check('todas las conexiones de una entidad comparten el mismo punto (5 al DC, incl. la repetida)',
    salidasDC.length === 5 && salidasDC.every(p=> p.distanceTo(salidasDC[0]) < 1e-6));
  check('…y la repetida se separa en el aire (abanico), no queda superpuesta',
    curvas[5].getPoint(0.5).distanceTo(curvas[3].getPoint(0.5)) > 0.3);

  const yAntes = puertoLocal(sDer).y;
  E(wP,'setSedeEmpleados')(E(wP,`state.sedes.find(s=>s.id==='${sDer.id}')`), 5);
  const sDer2 = E(wP,`state.sedes.find(s=>s.id==='${sDer.id}')`);
  check('cambiar los empleados de una sede recoloca el punto sobre el nuevo techo',
    enTecho(sDer2) && puertoLocal(sDer2).y < yAntes - 0.1, [yAntes, puertoLocal(sDer2).y]);
  const curva0 = E(wP,'connectionAnims')[1].curve;
  check('…y el cable se redibuja desde ahí', curva0.getPoint(0).distanceTo(wpos(sDer2)) < 1e-6);
  check('sin excepciones', wP.__erroresScript.length === 0, wP.__erroresScript);

  console.log('\nH-quater. Entidades sin transparencia (T02)');
  // Todo lo visible del edificio es opaco, con modelos .glb y con las primitivas de respaldo.
  // Quedan afuera a propósito: halos de selección, hitbox (invisibles), el puerto (+) y los
  // íconos de producto (assetsContainer), que pueden seguir siendo translúcidos.
  const EXCLUIDOS = ['halo', 'matrizHalo', 'assetsContainer'];
  const translucidosDe = ent => {
    const l = [];
    (function rec(o){
      if(EXCLUIDOS.includes(o.name) || o.isSprite) return;
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      if(o.visible && ms.length) ms.forEach(m=>{
        if(m.visible !== false && (m.transparent || m.opacity < 1 || m.depthWrite === false))
          l.push([o.name || o.type, m.name || m.type, m.transparent, m.opacity, m.depthWrite]);
      });
      o.children.forEach(rec);
    })(ent.group);
    return l;
  };
  const escenaOpaca = async (op, etiqueta) => {
    const wT = ventana(op);
    await E(wT,'modelosListos');
    const ents = [E(wT,'state.datacenter'), E(wT,'createSede(10, 3, 1)'), E(wT,'createSede(90, -3, 1)'),
                  E(wT,'createMatriz(4, -3)'), E(wT,"createNube('AWS', -4, -3)")];
    const malos = ents.map(e=> [e.id, translucidosDe(e)]).filter(([, l])=> l.length);
    check('ningún material de las 5 entidades es translúcido — ' + etiqueta, malos.length === 0, malos);
    return wT;
  };
  const wO = await escenaOpaca({}, 'modelos .glb');
  const m0 = E(wO,'ModelLibrary').materiales();
  check('…los materiales compartidos de las 4 familias son opacos (base y glow)',
    Object.values(m0).every(f=> [f.base, f.glow].every(m=> !m.transparent && m.opacity === 1 && m.depthWrite)));
  await escenaOpaca({ datos:false }, 'primitivas de respaldo');
  E(wO,'actualizarReflejosPiso()');
  const reflejos = [];
  E(wO,'reflejosPiso').traverse(o=>{ if(o.isMesh && o.visible) reflejos.push(o.material); });
  check('el reflejo en el piso también es opaco (y existe: si no, esto no prueba nada)',
    reflejos.length > 0 && reflejos.every(m=> !m.transparent && m.opacity === 1 && m.depthWrite), reflejos.length);
  check('…y tenue: el color del reflejo es la fracción PISO_REFLEJO.intensidad del original',
    reflejos.some(m=> m.name.endsWith('_base') && cerca(m.color.r, m0.sede.base.color.r * E(wO,'PISO_REFLEJO').intensidad)));

  console.log('\nI. Fallbacks');
  const w3 = ventana({ datos:false });
  const e3 = await E(w3,'modelosListos');
  const s3 = E(w3,'createSede(30, 1, 1)');
  check('sin modelos-glb.js y sin servidor → "sin_modelos", primitivas de v39', e3 === 'sin_modelos' && !s3.group.userData.modelo && s3.group.getObjectByName('sedeHitbox').isLineSegments, e3);
  check('…y el Datacenter queda con sus 3 tiers', !E(w3,'datacenterGroup').userData.modelo && cerca(E(w3,'dcY'), 2.25));
  const w4 = ventana({ loader:false });
  const e4 = await E(w4,'modelosListos');
  check('sin GLTFLoader → "sin_modelos" con aviso en consola, sin excepción', e4 === 'sin_modelos' && (w4.__warns||[]).some(x=>x.includes('GLTFLoader')) && w4.__erroresScript.length === 0);
  const w5 = ventana({ filtrarDatos: d=>{ delete d.pn_ent_nube; } });
  const e5 = await E(w5,'modelosListos');
  const n5 = E(w5,"createNube('X', 1, 1)"), m5 = E(w5,'createMatriz(0,0)');
  check('si falta un solo .glb → "parcial": esa entidad con primitiva, el resto con modelo', e5 === 'parcial' && !n5.group.userData.modelo && m5.group.userData.modelo, e5);

  console.log('\nJ. Reglas del proyecto');
  // misma métrica que la doc de v13–v15: líneas con `.style.` (son 64 ocurrencias en 59 líneas, igual que v39)
  const inline = FUNCS.split('\n').filter(l=>l.includes('.style.')).length;
  check('functions.js no suma líneas con .style. (rediseño design system: bajó de 59 a 51 — ningún estilo inline nuevo)', inline <= 51, inline);
  const iGL = HTML.indexOf('js/vendor/GLTFLoader.js'), iDat = HTML.indexOf('js/modelos-glb.js'), iFn = HTML.indexOf('js/functions.js'), iThree = HTML.indexOf('three.min.js');
  check('index.html: three → GLTFLoader → modelos-glb → functions', iThree>0 && iThree < iGL && iGL < iDat && iDat < iFn);
  const versiones = HTML.match(/Prototipo v\d+/g) || [];
  check('index.html muestra la versión en el título (' + versiones[0] + '; la etiqueta salió del header en el rediseño)', versiones.length === 1 && parseInt(versiones[0].slice(11)) >= 40, versiones);

  console.log(`\n${ok}/${ok+fail} verificaciones OK` + (fail ? `  (${fail} fallan)` : ''));
  process.exit(fail ? 1 : 0);
})().catch(e=>{ console.error(e); process.exit(2); });
