/* =========================================================================
   3C. BRILLO (post-proceso) — v17
   -------------------------------------------------------------------------
   El resplandor de neón de los renders aprobados: el emisivo no es solo una línea de color, se
   "abre" en un halo alrededor. Eso es bloom (especificación v2 §7.3, puntos 12 y 15).

   Es un bloom SELECTIVO: solo brillan los emisivos de los modelos .glb (ranuras, luces, canal de
   la plataforma, contorno de la Nube). Los cables, halos de selección, íconos y puertos NO
   brillan, así que la escena no se lava ni la selección se convierte en una mancha.

   Cómo, en cada frame:
   1. Fuente del brillo: se dibujan solo las mallas de los modelos (capa CAPA_BRILLO) en un render
      target aparte. El metal se dibuja con colorWrite:false — escribe profundidad pero no color —,
      así tapa los emisivos que quedan detrás del edificio sin aportar brillo. Son 4 materiales
      compartidos (uno por tipo de entidad): el cambio es de 4 flags, no un recorrido de la escena.
   2. UnrealBloomPass (three r128) difumina esa fuente en 5 niveles.
   3. Se dibuja la escena normal en pantalla y encima, en modo aditivo, la fuente + su halo, sin
      tocar el alfa: el canvas sigue transparente y el halo se suma como luz sobre el degradado de
      fondo que define css/componentes/visor.css (#canvasWrap).
   4. Los puertos de conexión (+) se vuelven a dibujar encima del halo (capa CAPA_PUERTOS): son
      un control, no parte del edificio, y el brillo no debe lavarlos.

   Si el post-proceso no está (falta js/vendor/postproceso-r128.js) o falla en un frame, se apaga
   solo y la escena sigue exactamente como en v40, sin brillo.

   PDF (v2 §7.4, decisión tomada: "el reporte sale sin efectos, por ahora"): BRILLO_EN_PDF = false.
   Si el cliente lo pide con efectos, es cambiar ese booleano — captureHeroSnapshot ya pasa por
   renderizarFrame().
   ========================================================================= */
const CAPA_BRILLO = 1;
// Partícula que viaja por cada cable (rebuildConnections). Era 0.075; T07 la agranda.
const PARTICULA_RADIO = 0.13;
const PARTICULA_TITILEO = 5;
const CAPA_PUERTOS = 2; // los puertos (+) siguen en la capa 0 para el raycast; esta capa es solo para redibujarlos
const BRILLO = {
  activo: true,
  // Re-afinados para el pipeline de color de §3A-ter: los valores de v42 (3.0 / 0.5 / 1.5) estaban
  // calibrados contra salida lineal sin tone mapping, donde el emisivo llegaba crudo al halo. Ahora
  // la fuente entra comprimida por ACES y codificada a sRGB, así que la misma fuerza numérica rinde
  // bastante más y hay que bajarla o la escena se lava.
  intensidad: 0.9,  // fuerza del halo (UnrealBloomPass.strength)
  radio: 0.30,       // cuánto se abre (UnrealBloomPass.radius, 0..1). Más de ~0.6 ya es neblina, no neón
  nucleo: 0.60,      // cuánto se suma la línea emisiva sobre sí misma: da el centro casi blanco del neón
  resolucion: 1,     // tamaño del render target respecto del canvas en px CSS (bajar a 0.5 si la tablet no da)
  // v45: media precisión (RGBA16F) en TODOS los render targets del halo. Ver "PRECISIÓN" abajo.
  // Ponerlo en false devuelve el pipeline exacto de v44 (8 bits), por si hay que recuperar VRAM.
  precisionAlta: true,
};

/* -------------------------------------------------------------------------
   PRECISIÓN DEL HALO (v45) — por qué media precisión y no solo "más resolución"
   -------------------------------------------------------------------------
   El halo salía con anillos concéntricos y bordes escalonados. No eran dos defectos: eran uno.

   La cola del halo se guardaba en 8 bits y en LINEAL, y recién al componer se codificaba a sRGB
   (ver el fragment shader de `quad`). Esa codificación ESTIRA la zona oscura: el código lineal
   1/255 aterriza cerca de 0.08 en sRGB, el 2/255 cerca de 0.11. O sea que dos pasos consecutivos
   de 8 bits, justo donde el halo se apaga, quedaban a una distancia perceptual enorme → anillos.
   Y esos anillos, al dibujar cada curva de nivel, hacían VISIBLE la malla del upsample bilineal de
   los mips (UnrealBloomPass arranca en resolución/2), que es lo que se leía como "pixelado".
   Por eso se ataca la precisión y no la resolución: sin curvas de nivel no hay malla que mostrar,
   y subir la resolución del pase costaba llenado en cada frame (el dial `resolucion` sigue ahí).

   Se toca la cadena ENTERA, no solo los mips: UnrealBloomPass compone los 5 niveles y después
   suma el resultado de vuelta sobre `fuente` (su readBuffer). Si `fuente` quedaba en 8 bits, el
   halo se recuantizaba en el último paso, justo antes del sRGB, y media precisión en los mips no
   se notaba. Los 11 targets internos suman ~3 MB; `fuente` es el caro, porque es multisample
   (~+24 MB en un canvas de 1400×850). De ahí el interruptor `precisionAlta`.

   Si la GPU no puede renderizar a media precisión, `tipoRenderTarget()` devuelve 8 bits y todo
   sigue exactamente como en v44 — el dithering del composite (abajo) tapa buena parte del banding
   igual, y no cuesta nada.
   ------------------------------------------------------------------------- */
const BRILLO_EN_PDF = false;

const Brillo = (()=>{
  let estado = 'pendiente'; // 'activo' | 'apagado' | 'sin_soporte' | 'error'
  let fuente = null, pase = null, quad = null;
  let tipoRT = THREE.UnsignedByteType; // tipo real con el que quedaron los render targets del halo
  const tam = new THREE.Vector2();
  const clearPrevio = new THREE.Color();

  function medidas(){
    renderer.getSize(tam);
    return { w: Math.max(2, Math.round(tam.x * BRILLO.resolucion)), h: Math.max(2, Math.round(tam.y * BRILLO.resolucion)) };
  }

  /* ¿Se puede renderizar a media precisión? Hacen falta tres cosas, y las tres se consultan antes
     de crear nada: poder DIBUJAR a RGBA16F, poder FILTRARLO en lineal (los mips se muestrean con
     LinearFilter) y, en WebGL1, tener el tipo de textura. Si falta alguna, 8 bits y a otra cosa:
     pedir media precisión sin soporte no tira excepción, deja el framebuffer incompleto y el halo
     se vería negro, que es peor que el banding. */
  function tipoRenderTarget(){
    if(!BRILLO.precisionAlta) return THREE.UnsignedByteType;
    const ext = renderer.extensions;
    if(!ext || typeof ext.has !== 'function') return THREE.UnsignedByteType;
    const esWebGL2 = !!(renderer.capabilities && renderer.capabilities.isWebGL2);
    const dibuja = ext.has('EXT_color_buffer_half_float') || (esWebGL2 && ext.has('EXT_color_buffer_float'));
    const filtra = esWebGL2 || ext.has('OES_texture_half_float_linear');
    const tipo   = esWebGL2 || ext.has('OES_texture_half_float');
    return (dibuja && filtra && tipo) ? THREE.HalfFloatType : THREE.UnsignedByteType;
  }

  /* Todos los render targets por los que pasa el halo: `fuente` + los 11 internos del pase
     (bright + 5 horizontales + 5 verticales). UnrealBloomPass los crea en su constructor con el
     tipo por defecto y no admite configurarlo; como todavía no se subió ninguna textura a la GPU,
     reasignar `texture.type` antes del primer frame alcanza — three los crea con ese tipo, y
     `setSize()` lo respeta al recrearlos en cada resize. Se hace desde acá, y NO editando
     js/vendor/postproceso-r128.js, para que el vendor siga siendo una copia limpia de upstream. */
  function objetivosPrecision(){
    if(!fuente || !pase) return [];
    return [fuente, pase.renderTargetBright]
      .concat(pase.renderTargetsHorizontal || [], pase.renderTargetsVertical || [])
      .filter(rt => rt && rt.texture);
  }

  function crear(){
    if(typeof THREE.UnrealBloomPass !== 'function' || typeof THREE.FullScreenQuad !== 'function'){
      estado = 'sin_soporte';
      console.warn('[brillo] falta js/vendor/postproceso-r128.js: la escena sigue sin bloom');
      return;
    }
    if(!BRILLO.activo){ estado = 'apagado'; return; }
    try{
      const { w, h } = medidas();
      tipoRT = tipoRenderTarget();
      // Multisample (WebGL2): las líneas emisivas miden ~1 px en pantalla; sin antialiasing el
      // contorno de la Nube salía punteado. En WebGL1 cae a un render target común.
      const opciones = { minFilter:THREE.LinearFilter, magFilter:THREE.LinearFilter, format:THREE.RGBAFormat, type:tipoRT };
      if(renderer.capabilities && renderer.capabilities.isWebGL2 && typeof THREE.WebGLMultisampleRenderTarget === 'function'){
        fuente = new THREE.WebGLMultisampleRenderTarget(w, h, opciones);
        fuente.samples = 4;
      } else {
        fuente = new THREE.WebGLRenderTarget(w, h, opciones);
      }
      fuente.texture.name = 'brillo.fuente';
      pase = new THREE.UnrealBloomPass(new THREE.Vector2(w, h), BRILLO.intensidad, BRILLO.radio, 0);
      objetivosPrecision().forEach(rt=>{ rt.texture.type = tipoRT; }); // ver "PRECISIÓN DEL HALO"
      quad = new THREE.FullScreenQuad(new THREE.ShaderMaterial({
        uniforms: { tBrillo:{ value:fuente.texture }, nucleo:{ value:BRILLO.nucleo } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        // Luz pura: suma color y NO toca el alfa del canvas. Sobre la escena (alfa 1) es un aditivo
        // normal; donde el canvas es transparente, el navegador compone color premultiplicado con
        // alfa 0 como "sumar sobre lo de abajo", así el halo ilumina el degradado CSS del fondo en
        // vez de oscurecerlo (con alfa > 0 el fondo quedaba teñido y más oscuro alrededor del halo).
        // El render target `fuente` queda en LINEAL: r128 solo aplica outputEncoding cuando
        // dibuja al canvas, no a un render target. El canvas, en cambio, ya está en sRGB desde
        // §3A-ter. Sumar lineal sobre sRGB mezcla dos espacios y el halo sale apagado y sucio, así
        // que acá se codifica a sRGB antes de sumar. `nucleo` multiplica después de codificar, para
        // que siga siendo una fuerza de pantalla directa de afinar.
        // El dithering va al FINAL, después del sRGB y del `nucleo`: el canvas sigue siendo de 8
        // bits por canal, así que aunque el halo llegue en media precisión, la cuantización final
        // ocurre igual acá. Media precisión arregla los pasos intermedios; el dithering, el último.
        // Son los chunks de three (`dithering: true` define DITHERING y habilita el par/fragment),
        // y `<common>` entra porque ahí vive el rand() que usan. Los #include tienen que arrancar
        // la línea — por eso el shader se arma como lista y no como concatenación suelta.
        fragmentShader: [
          '#include <common>',
          '#include <dithering_pars_fragment>',
          'uniform sampler2D tBrillo; uniform float nucleo; varying vec2 vUv;',
          'vec3 aSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(max(c, vec3(0.0)), vec3(0.41666))-0.055, step(vec3(0.0031308), c)); }',
          'void main(){',
          '  gl_FragColor = vec4(aSRGB(texture2D(tBrillo, vUv).rgb) * nucleo, 0.0);',
          '#include <dithering_fragment>',
          '}',
        ].join('\n'),
        dithering: true, // entra en la clave del programa: sin esto los chunks de arriba no hacen nada
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
        blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor, // el alfa del canvas no cambia
        depthTest: false, depthWrite: false, transparent: true,
      }));
      estado = 'activo';
    } catch(err){
      estado = 'error';
      console.warn('[brillo] no se pudo crear el post-proceso, la escena sigue sin bloom:', err);
    }
  }

  function asegurarTamano(){
    const { w, h } = medidas();
    if(fuente.width !== w || fuente.height !== h){ fuente.setSize(w, h); pase.setSize(w, h); }
  }

  // Paso 1 y 2: fuente (solo modelos, metal sin color) + halo. Todo lo que se toca se restaura
  // en el finally, falle lo que falle.
  function renderizarFuente(){
    const bases = Object.values(ModelLibrary.materiales()).map(m=>m.base);
    const capasPrevias = camera.layers.mask;
    renderer.getClearColor(clearPrevio);
    const alfaPrevio = renderer.getClearAlpha();
    try{
      bases.forEach(m=>{ m.colorWrite = false; });
      camera.layers.set(CAPA_BRILLO);
      renderer.setRenderTarget(fuente);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      renderer.render(scene, camera);
    } finally {
      bases.forEach(m=>{ m.colorWrite = true; });
      camera.layers.mask = capasPrevias;
      renderer.setClearColor(clearPrevio, alfaPrevio);
    }
    pase.strength = BRILLO.intensidad;
    pase.radius = BRILLO.radio;
    pase.render(renderer, null, fuente, 0, false); // deja fuente = emisivos + halo
    renderer.setRenderTarget(null);
  }

  function hayModelos(){ const e = ModelLibrary.estado(); return e === 'listo' || e === 'parcial'; }

  /* Dibuja un frame. conBrillo=false (o brillo no disponible) = render directo, igual que v40. */
  function renderizar(conBrillo){
    if(!conBrillo || estado !== 'activo' || !hayModelos()){ renderer.render(scene, camera); return; }
    try{
      asegurarTamano();
      renderizarFuente();
      renderer.render(scene, camera);
      quad.material.uniforms.nucleo.value = BRILLO.nucleo;
      const autoClearPrevio = renderer.autoClear, capasPrevias = camera.layers.mask;
      renderer.autoClear = false;
      try {
        quad.render(renderer);
        camera.layers.set(CAPA_PUERTOS); // paso 4: solo los puertos, sobre el halo
        renderer.render(scene, camera);
      } finally { renderer.autoClear = autoClearPrevio; camera.layers.mask = capasPrevias; }
    } catch(err){
      estado = 'error';
      console.warn('[brillo] falló el post-proceso, se apaga y la escena sigue sin bloom:', err);
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    }
  }

  function activar(si){
    if(si && !fuente){ BRILLO.activo = true; crear(); return estado; }
    if(estado === 'activo' || estado === 'apagado') estado = si ? 'activo' : 'apagado';
    return estado;
  }

  /* Tipo con el que quedó la cadena del halo, leído de los render targets REALES y no de la
     intención: devuelve null si alguno quedó distinto del resto, así el smoke test verifica los 12
     y no solo que `tipoRT` se haya calculado bien. */
  function precision(){
    const tipos = objetivosPrecision().map(rt => rt.texture.type);
    if(!tipos.length) return null;
    return tipos.every(t => t === tipos[0]) ? tipos[0] : null;
  }

  crear();
  return {
    renderizar, activar, precision,
    estado: ()=> estado,
    tamano: ()=> fuente ? { w:fuente.width, h:fuente.height } : null,
    // El material del composite, para que el smoke test verifique el shader ARMADO (los #include
    // tienen que quedar al principio de línea) y no el texto indentado del archivo fuente.
    material: ()=> quad ? quad.material : null,
  };
})();

function renderizarFrame(conBrillo){ Brillo.renderizar(conBrillo); }

