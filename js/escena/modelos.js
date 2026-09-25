/* =========================================================================
   3B. MODELOS 3D (.glb) — v16 (reemplazo de las primitivas de las entidades)
   -------------------------------------------------------------------------
   Primera tanda del proveedor: las 6 ENTIDADES (3 Sedes, Matriz, Nube, Datacenter). Los íconos
   de producto (AssetRegistry) siguen siendo primitivas hasta que llegue su tanda.

   Qué resuelve este bloque:
   - Carga cada .glb UNA sola vez (ModelLibrary.precargar) y entrega clones que COMPARTEN la
     geometría (ModelLibrary.instanciar). 20 sedes medianas = 1 buffer en la GPU, no 20.
   - Reemplaza los materiales del proveedor por materiales propios, COMPARTIDOS por tipo de
     entidad (MODELO_LOOKS). El color lo decide el código, no el archivo: el proveedor entregó
     un metal azul marino y un emisivo azul (no el blanco de la especificación v2 §6.5), pero como
     cada modelo trae exactamente 2 slots bien separados, se mapean por NOMBRE de material y el
     efecto es el mismo que con el blanco. Se aceptan los 2 juegos de nombres: 'metal'/'emissive'
     (esta entrega) y 'mat_base'/'mat_glow' (la especificación), así una entrega corregida no
     obliga a tocar código.
   - Si un .glb no carga (archivo faltante, GLTFLoader ausente, error de parseo), esa entidad
     sigue dibujándose con su primitiva de siempre: el fallback es el código que ya existía.

   De dónde salen los bytes (resuelve el caso "abrir index.html con doble clic"):
   1. window.PN_MODELOS_GLB — js/modelos-glb.js, los mismos .glb embebidos en base64. Funciona
      con file://, con servidor y dentro del empaquetado de la app. Se regenera con
      `node tools/empaquetar-modelos.js` cada vez que cambia un .glb de assets/glb/.
   2. Si ese archivo no está, fetch('assets/glb/<archivo>.glb') — requiere servidor (http://).

   Escala (v47): el proveedor modeló todas las entidades más chicas que la envolvente de §2 (ver
   doc v16). Hasta v46 una sola escala global las agrandaba a TODAS por igual, conservando la
   proporción entre ellas que diseñó el proveedor. Ya no alcanza: el cliente pidió tamaños
   concretos por entidad (Datacenter de dos celdas de ancho, Matriz por encima de la Sede Grande,
   sedes al doble), y esas proporciones no son las del proveedor. Así que MODELOS_ESCALA queda
   como la escala de SEDES Y NUBE, y Matriz y Datacenter llevan su propia `escala`.

   Que los overrides sean NÚMEROS MÁS CHICOS que la global no es un error: cada uno multiplica su
   propio modelo, y los modelos parten de tamaños muy distintos (el Datacenter mide 2.9 de ancho
   sin escalar; la Sede Grande, 1.2). Lo que importa es el ancho resultante:

     Sede Pequeña 3.04 · Sede Mediana 3.80 · Nube 3.42 · Sede Grande 4.56 · Matriz 5.60 ·
     Datacenter 8.00 (= 2 celdas exactas de GRID_SPACING)

   Con estos tamaños varias entidades son MÁS ANCHAS que su celda, así que la grilla ya no puede
   razonar por celda suelta: `occupied()` compara huellas reales (ver §4). Es lo que permite subir
   los tamaños sin tocar GRID_SPACING, que sigue en 4.

   El layout (halo, hitbox, puerto, colocación de íconos, etiqueta) se calcula a partir de las
   medidas reales del modelo ya escalado (userData.dims), no de números fijos.
   ========================================================================= */
const MODELOS_ESCALA = 3.8;

// clave interna -> archivo (sin .glb) + familia de materiales (+ `escala` opcional, pisa a
// MODELOS_ESCALA). Las claves de sede usan los mismos ids que TAMANOS_LOCAL ('pequeno' |
// 'mediano' | 'grande').
const MODELOS = {
  sede_pequeno: { archivo:'pn_ent_sede_pequena', look:'sede' },
  sede_mediano: { archivo:'pn_ent_sede_mediana', look:'sede' },
  sede_grande:  { archivo:'pn_ent_sede_grande',  look:'sede' },
  matriz:       { archivo:'pn_ent_matriz',       look:'matriz',     escala:2.80 }, // 2.0 × 2.80 = 5.60
  nube:         { archivo:'pn_ent_nube',         look:'nube' },
  datacenter:   { archivo:'pn_ent_datacenter',   look:'datacenter', escala:2.76 }, // 2.9 × 2.76 = 8.00
};
const MODELOS_RUTA = 'assets/glb/';

/* Paleta de las entidades en la escena 3D. No vive en css/ porque no es estilo del DOM:
   son parámetros de materiales WebGL, igual que los colores del catálogo (§1). Se conserva el
   acento de cada entidad en v39 (cian en Sede/Matriz/Datacenter, violeta en la Nube: "otra clase
   de nodo"). `glowIntensidad` > 1 queda preparado para el bloom de la fase de post-proceso. */
/* El cuerpo va oscuro a propósito: en la referencia aprobada las cajas son casi negras y TODO el
   azul que se les ve es reflejo del entorno, no color propio. El 0x7d95c0 de v42 era un azul
   grisáceo medio que competía con el reflejo y aplanaba la pieza — con el env map ya armado
   (crearEntornoMetal) el motor para el acabado estaba, y el color base lo estaba contradiciendo.
   Con `metalness` alto el albedo casi no aporta difuso: tiñe el reflejo, que es justo lo buscado. */
/* v48: el cliente pidió edificios en ALUMINIO SATINADO CLARO (referencias: plata fría con leve
   tinte azul, caras superiores casi blancas, laterales gris azulado que nunca llegan a negro, y el
   azul del fondo reflejado en las caras bajas). Reemplaza el cuerpo oscuro de v43-v47. El color
   base ahora es plata clara y el entorno que refleja es otro, propio de las entidades
   (ENTORNO_ENTIDADES, más abajo): uno neutro y luminoso arriba y azul abajo. `roughness` sube a
   satinado para que el reflejo sea suave y no un espejo. Los íconos de producto NO cambian. */
const MODELO_METAL = { color:0xd3dae6, metalness:0.85, roughness:0.34, envMapIntensity:0.45 };
/* glowIntensidad por encima de 1 es lo que el comentario de v39 dejaba anunciado y el pipeline de
   color (§3A-ter) recién ahora hace posible: bajo ACES un emisivo de 1.0 sale a ~0.8 y se lee como
   color plano. Hace falta entrar bien arriba de 1 para que el centro de la línea sature a blanco y
   la caída quede del color — que es exactamente cómo se lee el neón de la referencia. */
const MODELO_LOOKS = {
  sede:       { glow:0x22d3ee, glowIntensidad:1.6 },
  matriz:     { glow:0x22d3ee, glowIntensidad:1.6 },
  nube:       { glow:0xa78bfa, glowIntensidad:1.5 },
  datacenter: { glow:0x22d3ee, glowIntensidad:1.6 },
};
const NOMBRES_SLOT_BASE = ['metal', 'mat_base'];
const NOMBRES_SLOT_GLOW = ['emissive', 'mat_glow'];

/* Environment map propio para el metal, COMPARTIDO por entidades (ModelLibrary, acá abajo) e
   íconos de producto (IconLibrary, §3D) — ver obtenerEntornoMetal(). Sin él, un
   MeshStandardMaterial con metalness alto se ve negro (v2 §7.2 punto 7). Es una "sala" chica
   armada por código — cúpula con degradado azul marino, dos paneles claros que hacen de softbox,
   una tira de contraluz y un filo angosto y casi blanco que da el highlight nítido sobre los
   biseles — procesada una sola vez con PMREMGenerator. Si el renderer no puede generarlo (p. ej.
   en el smoke test), el metal queda sin reflejos pero la escena no se rompe. */
const ENTORNO_ICONOS = {
  arriba:0x3a5a8c, horizonte:0x101a2e, abajo:0x020409,
  cenital:[0x6f9bff, 3.2], lateral:[0x4a7dff, 1.8], contraluz:[0x5f8fff, 2.4], filo:[0xc3daff, 9.0],
};
const ENTORNO_ENTIDADES = {
  arriba:0xb3bdcc, horizonte:0x46536d, abajo:0x122a66,
  cenital:[0xf2f6ff, 1.8], lateral:[0xc4d3ee, 1.0], contraluz:[0x4d86ff, 2.0], filo:[0xffffff, 3.5],
};
function crearEntornoMetal(cfg){
  cfg = Object.assign({}, ENTORNO_ICONOS, cfg || {});
  try{
    const envScene = new THREE.Scene();
    const domoGeo = new THREE.SphereGeometry(10, 32, 16);
    const colores = [];
    const pos = domoGeo.attributes.position;
    const arriba = new THREE.Color(cfg.arriba), horizonte = new THREE.Color(cfg.horizonte), abajo = new THREE.Color(cfg.abajo);
    const c = new THREE.Color();
    for(let i=0;i<pos.count;i++){
      const y = pos.getY(i) / 10; // -1..1
      if(y >= 0) c.copy(horizonte).lerp(arriba, Math.pow(y, 0.7));
      else c.copy(horizonte).lerp(abajo, Math.min(1, -y*2.2));
      c.convertSRGBToLinear(); // la cúpula es el relleno ambiental del IBL: también va en lineal
      colores.push(c.r, c.g, c.b);
    }
    domoGeo.setAttribute('color', new THREE.Float32BufferAttribute(colores, 3));
    envScene.add(new THREE.Mesh(domoGeo, new THREE.MeshBasicMaterial({ vertexColors:true, side:THREE.BackSide })));
    // softboxes: uno cenital grande, uno lateral frío, una tira de contraluz y un filo angosto y
    // más brillante — el "hot spot" que engancha el reflejo como una línea de luz nítida.
    /* Los paneles van en HDR: `intensidad` multiplica el color por encima de 1, que es lo que un
       LDR no puede representar. Importa más de lo que parece — PMREMGenerator trabaja en half
       float, así que esos valores sobreviven, y son los que producen el reflejo especular
       QUEMADO sobre el bisel. Con paneles topados en 1.0 (como hasta v42) el metal nunca llega a
       la parte alta del rango: medido contra la referencia, las altas luces se quedaban ~45%
       cortas y la pieza se leía apagada por más oscura que fuera la base. El filo angosto es el
       más caliente de los cuatro: es el que se lee como línea de luz sobre la arista. */
    const panel = (w, h, color, intensidad, x, y, z)=>{
      const c = new THREE.Color(color).convertSRGBToLinear().multiplyScalar(intensidad);
      const mat = new THREE.MeshBasicMaterial({ side:THREE.DoubleSide });
      mat.color.copy(c);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      m.position.set(x, y, z); m.lookAt(0, 0, 0); envScene.add(m);
    };
    panel(9, 4, cfg.cenital[0], cfg.cenital[1], 0, 8.5, 2);       // cenital: el grueso de la luz
    panel(3, 6, cfg.lateral[0], cfg.lateral[1], 8, 3, 4);         // lateral frío
    panel(10, 0.8, cfg.contraluz[0], cfg.contraluz[1], -3, 2, -8);// contraluz: despega la silueta del fondo
    panel(0.6, 5, cfg.filo[0], cfg.filo[1], 6, 4, -6);            // filo caliente: el highlight nítido del bisel
    const pmrem = new THREE.PMREMGenerator(renderer);
    const rt = pmrem.fromScene(envScene, 0.03);
    pmrem.dispose();
    return rt.texture;
  } catch(err){
    console.warn('[modelos] sin environment map, el metal se verá plano:', err);
    return null;
  }
}

/* Cache del environment de crearEntornoMetal(): se genera una sola vez (la primera vez que algún
   material lo pide, entidad o ícono) y de ahí en más se reusa — mismo look en todo, sin pagar el
   costo de PMREMGenerator dos veces. `false` (en vez de null) marca "ya se intentó y no se pudo",
   así un renderer sin soporte no reintenta en cada material nuevo que se crea. */
let entornoMetalCache = null;
function obtenerEntornoMetal(){
  if(entornoMetalCache === null) entornoMetalCache = crearEntornoMetal() || false;
  return entornoMetalCache || null;
}

/* v48: entorno propio de las entidades (edificios, Datacenter, Nube). Los íconos siguen con
   ENTORNO_ICONOS; estos dos objetos definen la "sala" que refleja cada familia:
   colores de la cúpula (arriba / horizonte / abajo) y [color, intensidad HDR] de cada panel.
   El de entidades es neutro y claro arriba (lo que da la plata casi blanca en las caras
   superiores) y azul abajo (el tinte azul de los laterales y la base, como en las referencias). */
let entornoEntidadesCache = null;
function obtenerEntornoEntidades(){
  if(entornoEntidadesCache === null) entornoEntidadesCache = crearEntornoMetal(ENTORNO_ENTIDADES) || false;
  return entornoEntidadesCache || null;
}

const ModelLibrary = (()=>{
  const plantillas = {};   // archivo -> { objeto:THREE.Group (escalado y con materiales propios), dims:{w,h,d} }
  const materiales = {};   // look -> { base, glow } — compartidos por todas las instancias de ese tipo
  const animables = { beams:[], luces:[] }; // materiales que el loop anima (ver animarModelos)
  let estado = 'pendiente'; // 'pendiente' | 'listo' | 'parcial' | 'sin_modelos'
  const errores = {};       // archivo -> mensaje

  function materialesDe(look){
    if(materiales[look]) return materiales[look];
    const L = MODELO_LOOKS[look];
    // T02: opacidad explícita. Son los valores por defecto de three, pero quedan escritos porque
    // el cliente pidió edificios sin transparencia y el smoke test los verifica: si mañana alguien
    // agrega `transparent` acá (o el .glb trae alfa), se nota. El material del .glb se reemplaza
    // entero en prepararPlantilla, así que el alfa que traiga el archivo nunca llega a la escena.
    const OPACO = { transparent:false, opacity:1, depthWrite:true, alphaTest:0 };
    const base = new THREE.MeshStandardMaterial(Object.assign({}, MODELO_METAL, OPACO, { envMap: obtenerEntornoEntidades() }));
    const glow = new THREE.MeshStandardMaterial(Object.assign({
      color:0x000000, emissive:L.glow, emissiveIntensity:L.glowIntensidad, metalness:0, roughness:1,
    }, OPACO));
    // Albedo y emisivo se eligieron a ojo en sRGB; en un pipeline PBR van en lineal (§3A-ter b).
    // Sin esto el cian se va hacia un celeste lavado en cuanto sube la intensidad.
    base.color.convertSRGBToLinear();
    glow.emissive.convertSRGBToLinear();
    base.name = 'pn_' + look + '_base';
    glow.name = 'pn_' + look + '_glow';
    materiales[look] = { base, glow };
    return materiales[look];
  }

  function base64ABuffer(b64){
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }
  function obtenerBytes(archivo){
    const embebido = window.PN_MODELOS_GLB && window.PN_MODELOS_GLB[archivo];
    if(embebido) return Promise.resolve(base64ABuffer(embebido));
    if(typeof fetch !== 'function') return Promise.reject(new Error('sin datos embebidos y sin fetch'));
    return fetch(MODELOS_RUTA + archivo + '.glb').then(r=>{
      if(!r.ok) throw new Error('HTTP ' + r.status);
      return r.arrayBuffer();
    });
  }
  function parsear(buffer){
    return new Promise((resolve, reject)=> new THREE.GLTFLoader().parse(buffer, '', resolve, reject));
  }

  /* Deja la plantilla lista para clonar: materiales propios, pivote verificado, escala aplicada.
     Todo lo que depende del archivo se resuelve acá UNA vez; instanciar() solo clona. */
  function prepararPlantilla(archivo, look, escala, gltf){
    const raiz = gltf.scene;
    const mats = materialesDe(look);
    raiz.traverse(o=>{
      if(!o.isMesh) return;
      o.layers.enable(CAPA_BRILLO); // v17: participa de la fuente del bloom (§3C); clone() copia las capas
      const nombre = (o.material && o.material.name) || '';
      if(NOMBRES_SLOT_GLOW.includes(nombre)) o.material = mats.glow;
      else {
        if(!NOMBRES_SLOT_BASE.includes(nombre)) console.warn('[modelos] ' + archivo + ': material "' + nombre + '" desconocido, se trata como base');
        o.material = mats.base;
      }
    });
    // Piezas que el código anima por nombre (v2 §6.4): cada una recibe su propio material para
    // poder variar la intensidad sin afectar al resto del modelo.
    const beam = raiz.getObjectByName('beam');
    if(beam){
      const m = mats.glow.clone();
      beam.traverse(o=>{ if(o.isMesh) o.material = m; });
      animables.beams.push(m);
    }
    for(let i=1;i<=7;i++){
      const luz = raiz.getObjectByName('luz_' + String(i).padStart(2,'0'));
      if(!luz) continue;
      const m = mats.glow.clone();
      luz.traverse(o=>{ if(o.isMesh) o.material = m; });
      animables.luces.push({ material:m, fase:i });
    }
    // Pivote: la especificación pide base en Y=0 y centrado en X/Z. Esta entrega cumple; si una
    // futura no, se corrige acá con un aviso en consola en vez de que el edificio aparezca hundido.
    const caja = new THREE.Box3().setFromObject(raiz);
    const centro = caja.getCenter(new THREE.Vector3());
    if(Math.abs(caja.min.y) > 0.005 || Math.abs(centro.x) > 0.01 || Math.abs(centro.z) > 0.01){
      console.warn('[modelos] ' + archivo + ': pivote fuera de la base, se corrige por código', caja.min, centro);
      raiz.position.set(-centro.x, -caja.min.y, -centro.z);
    }
    const envoltorio = new THREE.Group();
    envoltorio.name = 'modeloGLB';
    envoltorio.add(raiz);
    envoltorio.scale.setScalar(escala);
    const tam = caja.getSize(new THREE.Vector3()).multiplyScalar(escala);
    plantillas[archivo] = { objeto:envoltorio, dims:{ w:tam.x, h:tam.y, d:tam.z } };
  }

  function precargar(){
    if(typeof THREE.GLTFLoader !== 'function'){
      estado = 'sin_modelos';
      console.warn('[modelos] THREE.GLTFLoader no está cargado (js/vendor/GLTFLoader.js): se usan las primitivas');
      return Promise.resolve(estado);
    }
    const archivos = {};
    Object.values(MODELOS).forEach(m=>{ archivos[m.archivo] = m; });
    const tareas = Object.keys(archivos).map(archivo=>
      obtenerBytes(archivo)
        .then(parsear)
        .then(gltf=> prepararPlantilla(archivo, archivos[archivo].look, archivos[archivo].escala || MODELOS_ESCALA, gltf))
        .catch(err=>{ errores[archivo] = String(err && err.message || err); console.warn('[modelos] ' + archivo + ' no cargó, se usa la primitiva:', err); })
    );
    return Promise.all(tareas).then(()=>{
      const cargados = Object.keys(plantillas).length, total = Object.keys(archivos).length;
      estado = cargados === total ? 'listo' : (cargados ? 'parcial' : 'sin_modelos');
      return estado;
    });
  }

  /* Devuelve { objeto, dims } o null si ese modelo no está disponible (-> primitiva).
     clone(true) comparte geometría y material con la plantilla. Las mallas del modelo NO
     participan del raycast: la selección usa los hitbox invisibles de siempre, que son 1 caja o
     1 cilindro por entidad en vez de miles de triángulos. */
  function instanciar(clave){
    const def = MODELOS[clave];
    const plantilla = def && plantillas[def.archivo];
    if(!plantilla) return null;
    const objeto = plantilla.objeto.clone(true);
    objeto.traverse(o=>{ if(o.isMesh) o.raycast = ()=>{}; });
    return { objeto, dims: Object.assign({}, plantilla.dims) };
  }

  /* Medidas del modelo ya escalado, SIN instanciarlo: la grilla (§4) necesita saber cuánto va a
     medir una entidad antes de construirla, para elegir dónde cabe. Devuelve null si ese modelo
     no está disponible (-> el que pregunta cae a las medidas de la primitiva). */
  function dims(clave){
    const def = MODELOS[clave];
    const plantilla = def && plantillas[def.archivo];
    return plantilla ? Object.assign({}, plantilla.dims) : null;
  }

  return {
    precargar, instanciar, dims,
    estado: ()=> estado,
    errores: ()=> Object.assign({}, errores),
    animables,
    materiales: ()=> materiales,
  };
})();

