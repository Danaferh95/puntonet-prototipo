/* Smoke test v17 / prototipo v45 — bloom selectivo de los emisivos (js/escena/brillo.js).
   Uso (desde la raíz del proyecto):  npm install   y luego   npm test   o   node tests/smoke-brillo.js
   Carga index.html + three r128 + GLTFLoader + postproceso-r128 + modelos-glb + el código de js/ en
   jsdom. El WebGLRenderer es un doble que REGISTRA cada render (destino, capas de cámara, estado
   de los materiales), así se verifica la secuencia del post-proceso sin GPU. Cómo se VE el brillo
   se validó aparte en Chromium con WebGL. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const util = require('util');

const { RAIZ: R, APP, FUNCS } = require('./app-scripts');
const leer = p => fs.readFileSync(path.join(R, p), 'utf8');
const THREE_SRC = fs.readFileSync(require.resolve('three/build/three.min.js'), 'utf8');
const HTML = leer('index.html');
const LOADER = leer('js/vendor/GLTFLoader.js');
const POST = leer('js/vendor/postproceso-r128.js');
const DATOS = leer('js/modelos-glb.js');

let ok = 0, fail = 0;
function check(nombre, cond, detalle){
  if(cond){ ok++; console.log('  ✔ ' + nombre); }
  else { fail++; console.log('  ✘ ' + nombre + (detalle !== undefined ? '  → ' + util.inspect(detalle, { depth:3 }) : '')); }
}

function ventana(op = {}){
  const html = HTML.replace(/<script[\s\S]*?<\/script>/g, '');
  const dom = new JSDOM(html, { runScripts:'dangerously', pretendToBeVisual:true, url:'http://localhost/' });
  const w = dom.window;
  w.TextDecoder = util.TextDecoder;
  w.__warns = [];
  w.console = { log(){}, warn(){ w.__warns.push([...arguments].join(' ')); }, error(){ w.__warns.push('ERROR ' + [...arguments].join(' ')); } };
  w.HTMLCanvasElement.prototype.getContext = function(){
    return new Proxy({}, { get:(t,k)=> k==='measureText' ? (()=>({ width:0 })) : (k in t ? t[k] : ()=>{}), set:(t,k,v)=>{ t[k]=v; return true; } });
  };
  w.HTMLCanvasElement.prototype.toDataURL = ()=> 'data:image/jpeg;base64,';
  w.fetch = ()=> Promise.reject(new Error('sin red en el test'));
  const errores = [];
  w.addEventListener('error', e=> errores.push(e.message));
  const run = code => { const s = w.document.createElement('script'); s.textContent = code; w.document.body.appendChild(s); };
  run(THREE_SRC);
  // Capacidades de GPU simuladas: el doble las expone tal cual las pida la app. Por defecto
  // WebGL1 pelado (que es lo que asumían las pruebas de v44); op.webgl2/op.extensiones las suben
  // para ejercitar el camino de media precisión de §3C sin GPU.
  run(`window.__webgl2 = ${!!op.webgl2}; window.__extensiones = ${JSON.stringify(op.extensiones || [])};`);
  // Doble del renderer: registra cada render en window.__renders.
  run(`window.__renders = []; window.__tam = { w:800, h:600 };
    THREE.WebGLRenderer = function(){
      const self = this; let destino = null, clearC = new THREE.Color(0,0,0), clearA = 0;
      this.domElement = document.createElement('canvas'); this.autoClear = true;
      this.capabilities = { isWebGL2: !!window.__webgl2 };
      this.extensions = { has: n => (window.__extensiones || []).indexOf(n) !== -1 };
      this.setPixelRatio = ()=>{}; this.setSize = ()=>{}; this.getPixelRatio = ()=>1;
      this.getSize = v=>v.set(window.__tam.w, window.__tam.h);
      this.getClearColor = c=>c.copy(clearC); this.setClearColor = (c,a)=>{ clearC = new THREE.Color(c); if(a!==undefined) clearA = a; }; this.getClearAlpha = ()=>clearA;
      this.setRenderTarget = t=>{ if(window.__fallarSetRT){ window.__fallarSetRT = false; throw new Error('fallo simulado'); } destino = t; };
      this.clear = ()=>{};
      this.render = (escena, cam)=>{
        let basesSinColor = null;
        try{ const M = eval('ModelLibrary').materiales(); const b = Object.values(M).map(m=>m.base); if(b.length) basesSinColor = b.every(m=>m.colorWrite===false); }catch(e){}
        window.__renders.push({ destino: destino ? (destino.texture && destino.texture.name) || 'rt' : 'pantalla',
          esEscena: escena && escena.isScene, capas: cam.layers.mask, autoClear: self.autoClear, basesSinColor });
      };
    };`);
  run(LOADER);
  if(op.post !== false) run(POST);
  run(DATOS);
  APP.forEach(s => run(s.codigo));
  w.__erroresScript = errores;
  return w;
}
const E = (w, expr) => w.eval(expr);
const enCapa = (o, c) => (o.layers.mask & (1 << c)) !== 0; // r128 no tiene Layers.isEnabled
// Dibuja un frame "a mano" y devuelve lo que registró el doble del renderer
function frame(w, conBrillo = true){ w.__renders = []; E(w, `renderizarFrame(${conBrillo})`); return w.__renders.slice(); }

(async()=>{
  console.log('\nA. Carga');
  const w = ventana();
  check('post-proceso r128 cargado (UnrealBloomPass + FullScreenQuad)', typeof w.THREE.UnrealBloomPass === 'function' && typeof w.THREE.FullScreenQuad === 'function');
  check('Brillo arranca "activo"', E(w,'Brillo.estado()') === 'activo', E(w,'Brillo.estado()'));
  check('antes de que carguen los modelos: render directo, sin post-proceso', (()=>{ const r = frame(w); return r.length === 1 && r[0].destino === 'pantalla'; })());
  await E(w,'modelosListos');
  check('sin excepciones ni avisos en la carga', w.__erroresScript.length === 0 && w.__warns.filter(x=>x.includes('brillo')).length === 0, [w.__erroresScript, w.__warns]);

  console.log('\nB. Qué brilla');
  const CAPA = E(w,'CAPA_BRILLO');
  const s = E(w,'createSede(30, 1, 1)'), m = E(w,'createMatriz(0, 0)'), n = E(w,"createNube('AWS', -1, -1)");
  w.eval(`(function(){ const s=state.sedes[0]; s.instancias.push({ instanciaId:'i1', subproductoId:'edr', verticalId:'ciberseguridad', valores:{} });
    state.conexiones.push({ id:'c1', aId:s.id, bId:state.matrices[0].id, subproductoId:'canal_conexion', instanciaId:'i1', ownerId:s.id }); refreshSedeAssets(s); rebuildConnections(); })()`);
  const entidades = [s.group, m.group, n.group, E(w,'datacenterGroup')];
  let mallasModelo = 0, enCapaN = 0;
  entidades.forEach(g=> g.getObjectByName('modeloGLB').traverse(o=>{ if(o.isMesh){ mallasModelo++; if(enCapa(o, CAPA) && enCapa(o, 0)) enCapaN++; } }));
  check('todas las mallas de los modelos están en la capa del brillo (y en la normal)', mallasModelo > 0 && enCapaN === mallasModelo, [enCapaN, mallasModelo]);
  const fuera = [];
  E(w,'scene').traverse(o=>{
    if(!enCapa(o, CAPA)) return;
    let p = o, esModelo = false; while(p){ if(p.name === 'modeloGLB'){ esModelo = true; break; } p = p.parent; }
    // T07: el núcleo de la partícula que viaja por el cable brilla a propósito (pedido de Dei).
    if(!esModelo && o.name !== 'particulaNucleo') fuera.push(o.name || o.type);
  });
  check('nada más brilla: cables, halos, íconos, puertos, hitbox y grilla fuera de la capa', fuera.length === 0, fuera.slice(0, 8));
  const nucleos = []; E(w,'scene').traverse(o=>{ if(o.name === 'particulaNucleo') nucleos.push(enCapa(o, CAPA)); });
  check('T07: la partícula del cable sí brilla (su núcleo está en la capa del brillo)', nucleos.length > 0 && nucleos.every(Boolean), nucleos);

  console.log('\nC. Secuencia de un frame');
  const r = frame(w);
  const CAPA_P = E(w,'CAPA_PUERTOS');
  const fuenteR = r.filter(x=>x.esEscena && x.destino === 'brillo.fuente');
  const pantallaR = r.filter(x=>x.esEscena && x.destino === 'pantalla' && x.capas === 1);
  const haloR = r.filter(x=>!x.esEscena && x.destino === 'pantalla');
  const puertosR = r.filter(x=>x.esEscena && x.destino === 'pantalla' && x.capas === (1 << CAPA_P));
  check('1º: escena en el render target del brillo, solo con la capa del brillo', fuenteR.length === 1 && fuenteR[0].capas === (1 << CAPA), fuenteR);
  check('…con el metal sin escribir color (tapa sin brillar)', fuenteR.length === 1 && fuenteR[0].basesSinColor === true);
  check('2º: escena normal en pantalla, con las capas de siempre y el metal con color', pantallaR.length === 1 && pantallaR[0].basesSinColor === false, pantallaR);
  check('3º: el halo va a pantalla sin borrar lo dibujado (autoClear apagado)', haloR.length >= 1 && haloR[haloR.length-1].autoClear === false, haloR);
  check('4º (último): los puertos (+) se redibujan encima del halo, sin borrar', puertosR.length === 1 && puertosR[0].autoClear === false && r[r.length-1] === puertosR[0], r.slice(-2));
  check('el orden es fuente → pantalla → halo → puertos',
    r.indexOf(fuenteR[0]) < r.indexOf(pantallaR[0]) && r.indexOf(pantallaR[0]) < r.lastIndexOf(haloR[haloR.length-1]) && r.lastIndexOf(haloR[haloR.length-1]) < r.indexOf(puertosR[0]));
  const puertos = []; E(w,'scene').traverse(o=>{ if(o.userData && o.userData.isPort) puertos.push(o); });
  check('los puertos siguen en la capa 0 (raycast) y además en la de redibujo', puertos.length >= 4 && puertos.every(o=>enCapa(o,0) && enCapa(o,CAPA_P)), puertos.length);
  const bases = Object.values(E(w,'ModelLibrary').materiales()).map(x=>x.base);
  check('después del frame todo queda como estaba (colorWrite, capas, autoClear)', bases.every(b=>b.colorWrite) && E(w,'camera').layers.mask === 1 && E(w,'renderer').autoClear === true);
  check('el halo suma luz y no toca el alfa del canvas (fondo CSS intacto)', /blendSrcAlpha: THREE\.ZeroFactor, blendDstAlpha: THREE\.OneFactor/.test(FUNCS) && /gl_FragColor = vec4\(aSRGB\(texture2D\(tBrillo, vUv\)\.rgb\) \* nucleo, 0\.0\)/.test(FUNCS));
  check('el loop de animación dibuja con brillo', /renderizarFrame\(true\)/.test(FUNCS.slice(FUNCS.indexOf('function animate()'), FUNCS.indexOf('function animate()') + 3000)));
  const FSH = E(w,'Brillo.material().fragmentShader');
  check('el composite aplica dithering al final (el canvas sigue siendo de 8 bits)',
    E(w,'Brillo.material().dithering') === true && /^#include <dithering_pars_fragment>$/m.test(FSH) && /^#include <dithering_fragment>$/m.test(FSH), FSH);
  check('…con los #include al principio de línea del shader ARMADO (si no, resolveIncludes no los ve)',
    /^#include <common>$/m.test(FSH), FSH);
  check('…los chunks existen con ese nombre en r128 y definen dithering()',
    /vec3 dithering\(/.test(E(w,'THREE.ShaderChunk.dithering_pars_fragment')) && /dithering\( gl_FragColor\.rgb \)/.test(E(w,'THREE.ShaderChunk.dithering_fragment')));
  check('…y el dithering va DESPUÉS del sRGB y del núcleo, no antes',
    FSH.indexOf('#include <dithering_fragment>') > FSH.indexOf('aSRGB(texture2D(tBrillo, vUv).rgb) * nucleo'));

  console.log('\nD. Tamaño');
  const antes = E(w,'Brillo.tamano()');
  w.__tam = { w:1024, h:512 };
  frame(w);
  const despues = E(w,'Brillo.tamano()');
  check('si el canvas cambia de tamaño, el render target lo sigue en el frame siguiente',
    antes.w === 800 && antes.h === 600 && despues.w === 1024 && despues.h === 512 && E(w,'Brillo.estado()') === 'activo', [antes, despues]);

  console.log('\nD-bis. Precisión del halo (v45)');
  check('sin soporte de media precisión la cadena queda en 8 bits y el brillo sigue activo',
    E(w,'Brillo.precision()') === E(w,'THREE.UnsignedByteType') && E(w,'Brillo.estado()') === 'activo', E(w,'Brillo.precision()'));
  const wHF = ventana({ webgl2:true, extensiones:['EXT_color_buffer_half_float', 'EXT_color_buffer_float'] });
  await E(wHF,'modelosListos');
  check('con soporte, los 12 render targets del halo van a media precisión (fuente + los 11 del pase)',
    E(wHF,'Brillo.precision()') === E(wHF,'THREE.HalfFloatType'), E(wHF,'Brillo.precision()'));
  check('…media precisión y multisample conviven: la fuente sigue siendo multisample',
    E(wHF,'Brillo.estado()') === 'activo' && wHF.__erroresScript.length === 0 && wHF.__warns.filter(x=>x.includes('brillo')).length === 0,
    [wHF.__erroresScript, wHF.__warns]);
  check('…y el frame se sigue dibujando en el orden de siempre',
    (()=>{ const rr = frame(wHF); return rr.some(x=>x.destino === 'brillo.fuente') && rr[rr.length-1].capas === (1 << E(wHF,'CAPA_PUERTOS')); })());
  const wSolo2 = ventana({ webgl2:true });
  await E(wSolo2,'modelosListos');
  check('WebGL2 sin las extensiones de color buffer → 8 bits, no se fuerza RGBA16F',
    E(wSolo2,'Brillo.precision()') === E(wSolo2,'THREE.UnsignedByteType'), E(wSolo2,'Brillo.precision()'));
  check('BRILLO.precisionAlta = false devuelve el pipeline de v44 (primera guarda de tipoRenderTarget)',
    /if\(!BRILLO\.precisionAlta\) return THREE\.UnsignedByteType;/.test(FUNCS) && E(w,'BRILLO.precisionAlta') === true);
  check('el vendor sigue intacto: la precisión se aplica desde js/escena/brillo.js, no editando postproceso-r128.js',
    !/HalfFloatType/.test(POST) && /rt\.texture\.type = tipoRT/.test(FUNCS));

  console.log('\nE. Interruptor y PDF');
  E(w,'Brillo.activar(false)');
  let rr = frame(w);
  check('Brillo.activar(false) → render directo (como v40)', E(w,'Brillo.estado()') === 'apagado' && rr.length === 1 && rr[0].destino === 'pantalla');
  E(w,'Brillo.activar(true)');
  rr = frame(w);
  check('Brillo.activar(true) → vuelve el post-proceso', E(w,'Brillo.estado()') === 'activo' && rr.some(x=>x.destino === 'brillo.fuente'));
  check('BRILLO_EN_PDF = false (decisión v2 §7.4)', E(w,'BRILLO_EN_PDF') === false);
  w.__renders = [];
  const dataUrl = E(w,'captureHeroSnapshot(16/9)');
  check('el snapshot del PDF se toma sin post-proceso', typeof dataUrl === 'string' && !w.__renders.some(x=>x.destino === 'brillo.fuente') && w.__renders.length >= 1, w.__renders);
  check('el snapshot pasa por renderizarFrame(BRILLO_EN_PDF): activarlo es cambiar el booleano', /renderizarFrame\(BRILLO_EN_PDF\)/.test(FUNCS.slice(FUNCS.indexOf('function captureHeroSnapshot'), FUNCS.indexOf('function downloadPDF'))));

  console.log('\nF. Fallos');
  w.__fallarSetRT = true;
  rr = frame(w);
  check('si el post-proceso falla en un frame, se apaga con aviso y ese frame igual se dibuja', E(w,'Brillo.estado()') === 'error' && rr.some(x=>x.esEscena && x.destino === 'pantalla') && w.__warns.some(x=>x.includes('[brillo]')));
  check('…y no deja el metal sin color ni la cámara en la capa del brillo', bases.every(b=>b.colorWrite) && E(w,'camera').layers.mask === 1);
  rr = frame(w);
  check('los frames siguientes son directos, sin reintentar', rr.length === 1 && rr[0].destino === 'pantalla');
  const w2 = ventana({ post:false });
  await E(w2,'modelosListos');
  rr = frame(w2);
  check('sin js/vendor/postproceso-r128.js → "sin_soporte", render directo, sin excepciones',
    E(w2,'Brillo.estado()') === 'sin_soporte' && rr.length === 1 && w2.__erroresScript.length === 0, [E(w2,'Brillo.estado()'), w2.__erroresScript]);
  check('ningún error de script en todo el recorrido', w.__erroresScript.length === 0, w.__erroresScript);

  console.log('\nG. Reglas del proyecto');
  const inline = FUNCS.split('\n').filter(l=>l.includes('.style.')).length;
  check('el código de la app (js/) no suma líneas con .style. (rediseño design system: bajó de 59 a 51 — ningún estilo inline nuevo)', inline <= 51, inline);
  const i = f=>HTML.indexOf(f);
  check('index.html: three → GLTFLoader → postproceso → modelos-glb → app (js/core/catalogo.js … js/main.js)',
    i('three.min.js') > 0 && i('three.min.js') < i('js/vendor/GLTFLoader.js') && i('js/vendor/GLTFLoader.js') < i('js/vendor/postproceso-r128.js') &&
    i('js/vendor/postproceso-r128.js') < i('js/modelos-glb.js') && i('js/modelos-glb.js') < i('js/core/catalogo.js'));
  check('index.html muestra Prototipo v47 en el título (la etiqueta de versión salió del header en el rediseño)', (HTML.match(/Prototipo v47/g)||[]).length === 1);

  console.log(`\n${ok}/${ok+fail} verificaciones OK` + (fail ? `  (${fail} fallan)` : ''));
  process.exit(fail ? 1 : 0);
})().catch(e=>{ console.error(e); process.exit(2); });
