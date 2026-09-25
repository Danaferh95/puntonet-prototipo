/* =========================================================================
   3D. ÍCONOS DE PRODUCTO (.glb) — v23 (tandas: Ciberseguridad v18 + Cloud v20 + Colaboración v21
        + Conectividad v23)
   -------------------------------------------------------------------------
   Reemplaza, assetKey por assetKey, las primitivas de AssetRegistry (§5) por modelos reales, a
   medida que llegan tandas del proveedor. Mismo patrón que ModelLibrary (arriba), con una
   diferencia importante: una ENTIDAD tiene ~4 "looks" fijos (sede/matriz/nube/datacenter), pero
   un ÍCONO se tiñe con el color del Subproducto — hasta ~40 colores de catálogo distintos (v2
   §7.2 punto 8) — así que el material no se cachea por tipo de ícono sino por color resuelto, y
   se comparte entre TODOS los assetKeys que usen ese mismo color.

   Slots de material (v2 §6.5, ampliados en la entrega de Ciberseguridad — ver LEEME.md del
   paquete): `mat_base` (cuerpo), `mat_glow` (rasgo distintivo — ranuras, pantallas: NO participa
   del bloom de §3C, ver mockup v17 "no brillan… íconos de producto"; acá "glow" es una variante
   más clara del MISMO tinte, no una capa que pasa por UnrealBloomPass), `mat_translucido`
   (vidrio/pantalla) y `mat_receso` (hueco/sombra — variante más oscura del mismo tinte). Un
   ícono no necesariamente trae los 4 slots (p. ej. el escudo no trae `mat_base`, ver checks.json
   del paquete). La tanda Cloud (v20) trae solo `mat_base` + `mat_glow`, que es lo que pide la
   especificación base; los otros dos slots siguen disponibles para tandas que los usen. La tanda
   Colaboración (v21) es la primera que usa los 4 en un mismo archivo: `pn_ico_puerta` combina
   cuerpo, aros emisivos, carcasa oscura y credencial translúcida.

   Sobre el color del archivo: el .glb de Cloud llega teñido en el celeste de la categoría y con
   emisión, no en el blanco puro que pide v2 §6.5. No hace falta corregirlo en el archivo porque
   `materialesDeColor()` DESCARTA el material del .glb y crea el suyo desde el color del catálogo;
   de la entrega solo se lee el NOMBRE del slot para saber qué malla es cuerpo y cuál es glow. El
   acabado celeste del render del proveedor, entonces, no llega a la app a propósito — decisión
   tomada en v20 para que los 7 íconos se tiñan por el mismo camino (ver doc v20).

   Fuente de los bytes: window.PN_ICONOS_GLB (js/iconos-glb.js, generado por
   tools/empaquetar-iconos.js desde assets/glb-iconos/) y, si falta, fetch('assets/glb-iconos/…').
   Deliberadamente en un archivo y una carpeta separados de los de las 6 entidades
   (PN_MODELOS_GLB / assets/glb/): smoke-test-modelos.js valida que PN_MODELOS_GLB traiga
   EXACTAMENTE los archivos de MODELOS, así que mezclar los íconos ahí rompería ese test.

   Si un assetKey no está en ICONOS_GLB, o su .glb no cargó, AssetRegistry sigue usando su
   primitiva de siempre — mismo criterio de entrega por tandas que las entidades (v2 §6.7).
   ========================================================================= */
const ICONOS_ESCALA = 1;
// T07: brillo propio de los íconos (sin bloom). base = emisivo del cuerpo; glow = del rasgo de glow.
const ICONOS_BRILLO = { base: 0.18, glow: 1.8 };

/* 25/09 (Dei/cliente): glows de los íconos, "ícono por ícono", en el orden del menú. El cliente
   siente los colores lavados: el rasgo de glow se aclaraba ×1.5 hacia el blanco y su emisivo (1.8)
   saturaba, así que se leía blanquecino y sin color. Cada assetKey puede tener su look propio:
     glow     — emisivo del rasgo de glow (mat_glow).
     base     — emisivo del cuerpo (mat_base).
     aclarar  — cuánto se aclara el color del rasgo de glow (1 = el color puro del catálogo).
     bloom    — el rasgo de glow entra al post-proceso (§3C): gana un halo de SU color, puntual,
                como los edificios. El resto del ícono tapa el halo que queda detrás (no suma luz).
     bloomBase — también el cuerpo entra al halo (para íconos sin rasgo de glow, como el globo).
     fuerza   — cuánta luz del color puro aporta al halo (1 = el color tal cual).
   Los que no están en la tabla quedan exactamente como antes (ICONOS_LOOK_DEFECTO). */
const ICONOS_LOOK_DEFECTO = { base: ICONOS_BRILLO.base, glow: ICONOS_BRILLO.glow, aclarar: 1.5, bloom: false, bloomBase: false, fuerza: 1 };
const ICONOS_LOOK = {
  // Conectividad (primer bloque del menú)
  enlace: { glow: 1.1, aclarar: 1.0, base: 0.25, bloom: true, fuerza: 0.4 },  // Datos: la cara luminosa de cada paquete
  nodo:   { glow: 1.25, aclarar: 1.0, base: 0.25, bloom: true, fuerza: 0.7 }, // SD-WAN: los conectores entre cubos
  globo:  { base: 0.25, bloom: true, bloomBase: true, fuerza: 0.35 },          // Internet: solo trae cuerpo (el alambre)
};
function lookIcono(assetKey){ return Object.assign({}, ICONOS_LOOK_DEFECTO, ICONOS_LOOK[assetKey] || {}); }

// assetKey (mismo que en PRODUCTOS/SUBPRODUCTOS, §1) -> archivo (sin .glb). Va creciendo tanda a
// tanda; los assetKeys que faltan acá siguen con su primitiva de AssetRegistry (§5).
// Claves opcionales de cada entrada:
//   escala   — multiplica la escala del ícono (se aplica DESPUÉS de ICONOS_DIM_OBJETIVO).
//   repetir  — { copias, paso:[x,y,z] }: el .glb no es el ícono entero sino una pieza que se
//              repite. Ver prepararPlantilla(). Hoy solo lo usa `enlace` (v23).
const ICONOS_GLB = {
  escudo:              { archivo:'pn_ico_escudo' },             // Perimetral
  candado:             { archivo:'pn_ico_candado' },            // End Point
  llave:               { archivo:'pn_ico_llave' },              // Acceso
  muro:                { archivo:'pn_ico_muro' },                // Aplicación
  firewall_onpremise:  { archivo:'pn_ico_firewall_onpremise' },  // Firewall On Premise (subproducto propio)
  // v20 — tanda Cloud
  rack:                { archivo:'pn_ico_rack' },                // Housing (Collocation/Energía, Crossconexión)
  nube:                { archivo:'pn_ico_nube' },                // Hosting (IaaS, BaaS, DRaaS)
  // v21 — tanda Colaboración
  pantalla:            { archivo:'pn_ico_pantalla' },            // Conferencia (además: fallback de cualquier producto sin ícono, v2 §3 B12)
  documento:           { archivo:'pn_ico_documento' },           // Ofimática
  puerta:              { archivo:'pn_ico_puerta' },              // Portal Cautivo
  antena:              { archivo:'pn_ico_antena' },              // Zona Wireless
  // v23 — tanda Conectividad. Con esta tanda el catálogo queda sin primitivas visibles salvo
  // firewall_virtual, que el proveedor excluyó del lineup a propósito (v2 §3, nota B8).
  enlace:              { archivo:'pn_ico_enlace',                // Datos (Canal de Conexión, Cloud Interconnect)
                         repetir:{ copias:3, paso:[0.26, 0.175, 0] } },
  nodo:                { archivo:'pn_ico_nodo' },                // SD-WAN (Sdwan, Túnel IPsec)
  globo:               { archivo:'pn_ico_globo' },               // Internet (Corporativo, Startup, Teleworking)
  // 25/09 — Puntonet Space (paquete "GLB End Point + Space"). Primer ícono con `materialesPropios`:
  // el LEEME pide conservar sus materiales PBR (panel blanco, metal cepillado, borde azul emisivo)
  // en vez de teñirlo con el color del catálogo. Su origen está en la base del soporte pero el
  // panel se inclina hacia atrás, así que la caja no queda centrada: `pivoteEsperado` evita el aviso.
  puntonet_space:      { archivo:'pn_ico_puntonet_space', materialesPropios:true, pivoteEsperado:true },
};
const ICONOS_RUTA = 'assets/glb-iconos/';
const NOMBRES_SLOT_ICONO_TRANSLUCIDO = ['mat_translucido'];
const NOMBRES_SLOT_ICONO_RECESO = ['mat_receso'];

/* Normalización de tamaño entre tandas (v21 — resuelve el Pendiente 39 de v20).
   El proveedor entrega cada ícono dentro de la envolvente de 0.6³ de v2 §3, pero la
   especificación fija un TECHO, no una medida común, así que cada tanda se acomoda distinto
   adentro de esa caja. Medidos por su dimensión mayor los 11 van de 0.460 a 0.580 — apenas un
   26% de dispersión —, y este factor los lleva a todos al mismo número.

   Por qué la dimensión MAYOR y no la altura, que es como lo planteaba el Pendiente 39: `antena` y
   `puerta` son chatos (0.089 y 0.290 de alto) pero gastan los 0.580 completos en X y Z, porque su
   rasgo son los aros de cobertura, que son horizontales. Escalarlos hasta una altura común los
   llevaría a ~2.3 de ancho: cuatro veces la envolvente, invadiendo las sedes vecinas del anillo.
   La dimensión mayor es la que el ojo lee como "tamaño del ícono" con cámara ortográfica fija.

   Consecuencia que conviene tener presente: esto NO iguala alturas y no pretende hacerlo. Un
   access point sigue siendo chato y un rack sigue siendo alto, que es como se leen en la realidad;
   lo que se empareja es cuánto espacio ocupa cada ícono en el anillo.

   Para desactivarlo y volver a la escala tal cual la entrega el proveedor: ICONOS_DIM_OBJETIVO = 0. */
const ICONOS_DIM_OBJETIVO = 0.58;

const IconLibrary = (()=>{
  const plantillas = {};          // archivo -> THREE.Group crudo (geometría cacheada, SIN material asignado)
  const materialesPorColor = {};  // color|look -> { base, glow, translucido, receso } — compartidos entre assetKeys con el mismo look
  const ocultosEnBrillo = new Set(); // materiales de íconos con bloom que tapan el halo sin sumarle luz (ver brillo.js)
  const mallasBrillo = new Set();    // mallas de íconos que SÍ suman al halo (se les cambia el material en la fuente)
  const materialesBrillo = {};       // color|fuerza -> MeshBasicMaterial del color puro
  /* Lo que un ícono aporta al halo es SOLO su color, plano: si la fuente usara el material que se
     ve en pantalla, entrarían también los reflejos blancos del metal y el halo saldría blanquecino
     (probado: el globo azul daba un halo celeste casi blanco). Igual que el emisivo negro+color de
     las entidades (§3B). */
  function materialBrilloDe(color, fuerza){
    const clave = color + '|' + fuerza;
    if(materialesBrillo[clave]) return materialesBrillo[clave];
    const m = new THREE.MeshBasicMaterial({ color });
    m.color.convertSRGBToLinear().multiplyScalar(fuerza);
    marcarCompartido(m);
    return (materialesBrillo[clave] = m);
  }
  let estado = 'pendiente';       // 'pendiente' | 'listo' | 'parcial' | 'sin_modelos'
  const errores = {};             // archivo -> mensaje

  function materialesDeColor(color, look){
    look = look || ICONOS_LOOK_DEFECTO;
    const clave = color + '|' + look.base + '|' + look.glow + '|' + look.aclarar;
    if(materialesPorColor[clave]) return materialesPorColor[clave];
    // Mismo environment que las entidades (ModelLibrary, §3B): antes los íconos no tenían envMap
    // y por eso no mostraban ningún reflejo aunque el material ya fuera metálico. `receso` queda
    // sin envMap a propósito: es un hueco/sombra, un reflejo ahí contradice la lectura de "hundido".
    const entorno = obtenerEntornoMetal();
    const set = {
      // T07 (24/09, Dei): "que brillen un poquito". El cuerpo suma un emisivo leve de su propio
      // color y el rasgo de glow sube de 1.35 a ICONOS_BRILLO.glow. Siguen fuera del bloom.
      base:        new THREE.MeshStandardMaterial({ color, emissive:color, emissiveIntensity:look.base, metalness:0.6, roughness:0.32, envMap: entorno, envMapIntensity:1.3 }),
      glow:        new THREE.MeshStandardMaterial({ color: look.aclarar === 1 ? color : lightenColor(color, look.aclarar), emissive:color, emissiveIntensity:look.glow, metalness:0.15, roughness:0.3, envMap: entorno, envMapIntensity:0.9 }),
      translucido: new THREE.MeshStandardMaterial({ color, transparent:true, opacity:0.45, depthWrite:false, metalness:0.1, roughness:0.25, side:THREE.DoubleSide, envMap: entorno, envMapIntensity:1.2 }),
      receso:      new THREE.MeshStandardMaterial({ color: darkenColor(color, 0.45), metalness:0.2, roughness:0.75 }),
    };
    /* Los colores del catálogo se eligieron a ojo en sRGB: hay que pasarlos a lineal para que el
       tinte por familia se conserve bajo el nuevo pipeline (§3A-ter b). Los íconos quedan fuera
       del bloom por decisión de v17/v19, así que su emisivo no necesita entrar tan arriba como el
       de las entidades: alcanza con pasar de 1 para que se despegue del cuerpo. */
    Object.values(set).forEach(m=>{
      m.color.convertSRGBToLinear();
      if(m.emissive) m.emissive.convertSRGBToLinear();
    });
    materialesPorColor[clave] = set;
    marcarCompartido(...Object.values(set)); // caché por color: lo usan todos los íconos de ese color
    return set;
  }

  function base64ABuffer(b64){
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }
  function obtenerBytes(archivo){
    const embebido = window.PN_ICONOS_GLB && window.PN_ICONOS_GLB[archivo];
    if(embebido) return Promise.resolve(base64ABuffer(embebido));
    if(typeof fetch !== 'function') return Promise.reject(new Error('sin datos embebidos y sin fetch'));
    return fetch(ICONOS_RUTA + archivo + '.glb').then(r=>{
      if(!r.ok) throw new Error('HTTP ' + r.status);
      return r.arrayBuffer();
    });
  }
  function parsear(buffer){
    return new Promise((resolve, reject)=> new THREE.GLTFLoader().parse(buffer, '', resolve, reject));
  }

  /* Deja la plantilla lista para clonar y teñir: pivote verificado, escala aplicada, SIN
     material propio todavía (eso se resuelve por color en instanciar/materialesDeColor). Guarda
     el slot de cada malla en userData para no tener que volver a mirar el nombre de material del
     proveedor en cada clonado. */
  function prepararPlantilla(archivo, def, gltf){
    const escala = def.escala || ICONOS_ESCALA;
    let raiz = gltf.scene;
    raiz.traverse(o=>{
      if(!o.isMesh) return;
      if(def.materialesPropios){
        // Se conserva el material del .glb; solo se le suma el mismo environment que al resto,
        // para que el metal refleje igual que en los demás íconos.
        const m = o.material;
        if(m && m.isMeshStandardMaterial && !m.envMap){ m.envMap = obtenerEntornoMetal(); m.envMapIntensity = 1.1; m.needsUpdate = true; }
        o.userData.slot = 'propio';
        return;
      }
      const nombre = (o.material && o.material.name) || '';
      if(NOMBRES_SLOT_GLOW.includes(nombre)) o.userData.slot = 'glow';
      else if(NOMBRES_SLOT_ICONO_TRANSLUCIDO.includes(nombre)) o.userData.slot = 'translucido';
      else if(NOMBRES_SLOT_ICONO_RECESO.includes(nombre)) o.userData.slot = 'receso';
      else {
        if(!NOMBRES_SLOT_BASE.includes(nombre)) console.warn('[iconos] ' + archivo + ': material "' + nombre + '" desconocido, se trata como base');
        o.userData.slot = 'base';
      }
    });
    /* Composición por repetición (v23, Datos). El proveedor no entrega el ícono entero sino UNA
       pieza — el cubito de 0.18 de `pn_ico_enlace` — con la indicación de repetirla para formar el
       flujo; el ícono aprobado son tres paquetes sobre una diagonal ascendente, igual que el SVG
       del menú. Se arma acá, ANTES de medir, para que la corrección de pivote y la normalización
       de ICONOS_DIM_OBJETIVO trabajen sobre el conjunto: al revés, el cubito solo se inflaría
       hasta 0.58 y Datos quedaría como un cubo suelto en vez de un flujo.
       El `paso` está en unidades del archivo (metros, v2 §6.1), no en unidades ya normalizadas. */
    if(def.repetir){
      const copias = def.repetir.copias, paso = def.repetir.paso;
      const conjunto = new THREE.Group();
      conjunto.name = 'iconoRepetido';
      const desde = -(copias - 1) / 2;
      for(let i=0; i<copias; i++){
        const copia = raiz.clone(true);   // clone(true) comparte geometría y arrastra userData.slot
        copia.position.set(paso[0]*(desde+i), paso[1]*(desde+i), paso[2]*(desde+i));
        conjunto.add(copia);
      }
      raiz = conjunto;
    }
    // Pivote: la especificación pide base en Y=0 y centrado en X/Z (v2 §6.4), igual que las
    // entidades — misma corrección defensiva si alguna entrega futura no cumple. Con `repetir`
    // se corrige el conjunto, no cada copia: la diagonal deja la pieza de abajo por debajo de Y=0.
    const caja = new THREE.Box3().setFromObject(raiz);
    const centro = caja.getCenter(new THREE.Vector3());
    if(Math.abs(caja.min.y) > 0.005 || Math.abs(centro.x) > 0.01 || Math.abs(centro.z) > 0.01){
      // Con `repetir` el desplazamiento lo introdujimos nosotros al armar la diagonal, así que no
      // es un defecto de la entrega y no se avisa: el archivo del proveedor sí tiene su pivote bien.
      if(!def.repetir && !def.pivoteEsperado) console.warn('[iconos] ' + archivo + ': pivote fuera de la base, se corrige por código', caja.min, centro);
      raiz.position.set(-centro.x, -caja.min.y, -centro.z);
    }
    // Normalización de tamaño entre tandas (ver ICONOS_DIM_OBJETIVO, arriba). Se mide DESPUÉS de
    // corregir el pivote y se multiplica por la escala del catálogo, no la reemplaza: un ícono que
    // algún día pida su propia `escala` sigue respetándola sobre la medida ya normalizada.
    let factor = escala;
    if(ICONOS_DIM_OBJETIVO > 0){
      const tam = caja.getSize(new THREE.Vector3());
      const mayor = Math.max(tam.x, tam.y, tam.z);
      if(mayor > 0.001) factor = escala * (ICONOS_DIM_OBJETIVO / mayor);
    }
    const envoltorio = new THREE.Group();
    envoltorio.name = 'iconoGLB';
    envoltorio.add(raiz);
    envoltorio.scale.setScalar(factor);
    plantillas[archivo] = envoltorio;
    marcarCompartido(envoltorio); // los clones de instanciar() comparten su geometría (recursos.js)
  }

  function precargar(){
    if(typeof THREE.GLTFLoader !== 'function'){
      estado = 'sin_modelos';
      return Promise.resolve(estado);
    }
    const archivos = {};
    Object.values(ICONOS_GLB).forEach(m=>{ archivos[m.archivo] = m; });
    const claves = Object.keys(archivos);
    if(!claves.length){ estado = 'sin_modelos'; return Promise.resolve(estado); }
    const tareas = claves.map(archivo=>
      obtenerBytes(archivo)
        .then(parsear)
        .then(gltf=> prepararPlantilla(archivo, archivos[archivo], gltf))
        .catch(err=>{ errores[archivo] = String(err && err.message || err); console.warn('[iconos] ' + archivo + ' no cargó, se usa la primitiva:', err); })
    );
    return Promise.all(tareas).then(()=>{
      const cargados = Object.keys(plantillas).length, total = claves.length;
      estado = cargados === total ? 'listo' : (cargados ? 'parcial' : 'sin_modelos');
      return estado;
    });
  }

  /* Devuelve un THREE.Group listo para agregar a la escena, teñido con `color`, o null si ese
     assetKey todavía no tiene .glb o no cargó — el llamador (AssetRegistry) cae a la primitiva.
     clone(true) comparte geometría entre instancias; los materiales salen del caché por color.
     A diferencia de ModelLibrary.instanciar(), NO se desactiva el raycast: los íconos se siguen
     seleccionando por su malla real, igual que las primitivas de siempre (no tienen hitbox propio). */
  function instanciar(assetKey, color){
    const def = ICONOS_GLB[assetKey];
    const plantilla = def && plantillas[def.archivo];
    if(!plantilla) return null;
    const objeto = plantilla.clone(true);
    if(def.materialesPropios) return objeto; // clone(true) comparte los materiales del .glb
    const look = lookIcono(assetKey);
    const mats = materialesDeColor(color, look);
    objeto.traverse(o=>{
      if(!o.isMesh) return;
      o.material = mats[o.userData.slot] || mats.base;
      if(!look.bloom) return;
      // Todo el ícono entra a la capa del brillo: lo que brilla suma su color al halo, y el resto
      // se dibuja ahí sin color (colorWrite:false desde brillo.js) solo para tapar lo de atrás.
      o.layers.enable(CAPA_BRILLO);
      const brilla = o.userData.slot === 'glow' || (look.bloomBase && o.userData.slot === 'base');
      if(!brilla){ ocultosEnBrillo.add(o.material); return; }
      o.userData.matBrillo = materialBrilloDe(color, look.fuerza);
      mallasBrillo.add(o);
    });
    return objeto;
  }

  return {
    precargar, instanciar,
    ocultosEnBrillo: ()=> ocultosEnBrillo,
    // Las que ya no cuelgan de la escena (sede borrada, íconos rehechos) se descartan acá.
    mallasBrillo: ()=>{
      mallasBrillo.forEach(o=>{ let r = o; while(r.parent) r = r.parent; if(r !== scene) mallasBrillo.delete(o); });
      return mallasBrillo;
    },
    estado: ()=> estado,
    errores: ()=> Object.assign({}, errores),
  };
})();

/* Animación de las piezas nombradas. La Matriz de esta entrega NO trae cascarones que giren
   (el proveedor los reemplazó por alas fijas, ver doc v16): lo único que se anima es el pulso
   del acento vertical (`beam`) y el parpadeo escalonado de las 7 luces de la fachada del
   Datacenter. Todo por intensidad de emisión, sin mover geometría. */
function animarModelos(t){
  const A = ModelLibrary.animables;
  const pulso = 0.75 + 0.25 * Math.sin(t * 2.2);
  A.beams.forEach(m=>{ m.emissiveIntensity = MODELO_LOOKS.matriz.glowIntensidad * pulso; });
  A.luces.forEach(({ material, fase })=>{
    const s = Math.sin(t * 1.6 + fase * 1.3);
    material.emissiveIntensity = MODELO_LOOKS.datacenter.glowIntensidad * (s > 0.82 ? 0.35 : 1);
  });
}

/* Medidas visuales de una entidad (las que usa el layout: halo, anillo de productos, etiqueta,
   efecto de recubrimiento). Las pone el builder en group.userData.dims, tanto si la entidad usa
   el modelo como la primitiva. */
function dimsEntidad(entity){
  const ud = entity.group && entity.group.userData;
  if(ud && ud.dims) return ud.dims;
  if(entity.tipo === 'sede'){ const [w,h,d] = getTamanoLocal(entity.tamano).box; return { w, h, d }; }
  return { w:2, h:2, d:2 };
}

