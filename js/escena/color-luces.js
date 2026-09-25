/* =========================================================================
   3A-ter. PIPELINE DE COLOR (v2 §7.2, la pieza que faltaba)
   -------------------------------------------------------------------------
   Hasta v42 el renderer quedaba en los defaults de r128: `outputEncoding =
   LinearEncoding` y `toneMapping = NoToneMapping`. Con MeshBasicMaterial daba igual, pero desde
   que las entidades y los íconos son MeshStandardMaterial (§3B/§3D) eso anulaba medio trabajo del
   environment map: los medios tonos salían aplastados —la escena se veía "plana" por más que el
   metal fuera correcto— y el emisivo saturaba a blanco de golpe en vez de hacer roll-off, así que
   el neón se leía como línea de color plano y nunca como núcleo caliente.

   Son dos líneas, pero cambian TODOS los colores de la escena a la vez. Lo que sigue en esta
   sección es la compensación, y conviene entenderla como una sola pieza:

   a) `sRGBEncoding` aplica la curva de gamma a la salida. r128 no tiene ColorManagement (llegó en
      r152), así que los hex se usan tal cual, en lineal: sin compensar, CADA color de la escena
      sale bastante más claro que como fue elegido.
   b) Los colores de superficie (albedo de entidades e íconos, emisivos) SÍ deben convertirse de
      sRGB a lineal: fueron elegidos a ojo en sRGB y en un pipeline PBR el albedo va en lineal.
      Esa conversión es, además, buena parte de la "recalibración de paleta" pendiente de
      v2 §7.2 punto 10 — no toda, pero sí la mitad mecánica.
   c) Los materiales SIN iluminación (cables, halos, partículas, badges, grilla, piso, sprites de
      puerto) son INTERFAZ, no superficie física: fueron afinados a ojo contra el degradado CSS
      de #canvasWrap y tienen que seguir viéndose exactamente igual. Para eso van con
      `toneMapped:false` (no los toca la curva filmica) y con su color convertido a lineal, de
      modo que la conversión de salida los devuelva al valor original: sRGB→lineal→sRGB = identidad.
      Lo hace normalizarMaterialesUI(), abajo.
   ========================================================================= */
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.75;

/* Marca un material como "interfaz": fuera de la curva filmica y con el color pre-convertido para
   que sobreviva intacto a outputEncoding. Idempotente vía userData.pnUI — importa porque
   convertSRGBToLinear() es destructivo y aplicarlo dos veces apaga el color. */
function normalizarMaterialUI(material){
  if(!material || material.userData.pnUI) return;
  material.userData.pnUI = true;
  material.toneMapped = false;
  if(material.color) material.color.convertSRGBToLinear();
  material.needsUpdate = true; // toneMapped entra en la clave del programa: sin esto no recompila
}

/* Color de un material de interfaz que cambia en runtime: hay que reconvertir, porque .set()
   escribe el hex crudo y pisa la conversión que hizo normalizarMaterialUI(). */
function setColorUI(material, hex){
  material.color.set(hex).convertSRGBToLinear();
}

/* Barrido de seguridad: recorre la escena y normaliza todo material sin iluminación que todavía
   no haya pasado por acá. Va colgado del traverse que animate() ya hace cada frame (§4), así que
   no agrega un recorrido nuevo, y gracias al guard de userData cada material se toca UNA vez y
   después es un if que falla. Se hace por barrido y no en cada `new MeshBasicMaterial(...)` a
   propósito: son ~20 puntos de creación repartidos por el archivo y un material nuevo que se
   olvide de la llamada saldría oscurecido sin ningún aviso. */
function normalizarMaterialesUI(objeto){
  const m = objeto.material;
  if(!m) return;
  const lista = Array.isArray(m) ? m : [m];
  lista.forEach(mat=>{
    if(mat.isMeshBasicMaterial || mat.isLineBasicMaterial || mat.isSpriteMaterial || mat.isPointsMaterial){
      normalizarMaterialUI(mat);
    }
  });
}

/* Luces: con env map real (§3B) un ambiente fuerte es contraproducente — le mete luz plana a
   todas las caras por igual y borra justo el contraste que genera el IBL. Venían de la época de
   MeshBasicMaterial, cuando efectivamente no hacían nada (de ahí la nota de v2 §7.2 punto 6) y
   nadie las volvió a mirar después de migrar a Standard, donde sí pesan. El ambiente baja a un
   relleno mínimo que solo evita que las caras en sombra se cierren a negro puro, y la direccional
   sube un poco para marcar de dónde viene la luz. */
scene.add(new THREE.AmbientLight(0xffffff, .14));
const dirLight = new THREE.DirectionalLight(0xffffff, .85);
dirLight.position.set(10,20,10);
scene.add(dirLight);

/* --- Etiquetas de nombre (Sede/Matriz/Datacenter) como overlay HTML sobre el canvas ---
   Antes eran sprites dentro de la escena 3D (una textura de canvas pintada sobre un plano), así
   que su tamaño en pantalla dependía de la distancia/zoom de cámara como cualquier otro objeto
   del mundo — por más que se compensara la escala, seguían "viviendo" en el espacio 3D. Ahora son
   elementos <div> reales posicionados con CSS sobre el canvas: el font-size queda fijo en px
   (mismo tratamiento tipográfico que el resto de la interfaz), y en cada frame se recalcula solo
   la posición en pantalla (proyectando el punto 3D de anclaje con la cámara), nunca el tamaño de
   letra. Resultado: el texto se ve siempre igual de legible sin importar cuánto se acerque o
   aleje la vista.
   nameLabels: Map(id -> { group, localY, el }) — group es el Object3D cuyo movimiento sigue la
   etiqueta (la sede/Matriz se puede arrastrar; el label la sigue automáticamente vía
   group.localToWorld), localY es el offset vertical local (mismo criterio que antes: altura de
   la sede/Matriz + margen), el es el div renderizado. */
let zoomLevel = 1;
const labelLayer = byId('labelLayer');
const nameLabels = new Map();
const tmpLabelVec = new THREE.Vector3();
function upsertNameLabel(id, group, localY, text){
  let entry = nameLabels.get(id);
  if(!entry){
    const el = document.createElement('div');
    el.className = 'name-label';
    labelLayer.appendChild(el);
    entry = { group, localY, el };
    nameLabels.set(id, entry);
  }
  entry.group = group;
  entry.localY = localY;
  entry.el.textContent = text;
  return entry;
}
function removeNameLabel(id){
  const entry = nameLabels.get(id);
  if(!entry) return;
  entry.el.remove();
  nameLabels.delete(id);
}
/* Reutilizada tanto por el loop de animación (posiciones en vivo sobre el canvas) como por el
   snapshot del PDF (posiciones sobre el canvas de salida, en §6 más abajo). */
function getLabelScreenNDC(entry, outVec){
  // T07: si la entidad tiene algo parado sobre el techo que la etiqueta taparía (el arco de
  // Acceso), refreshSedeAssets deja en `alturaMinEtiqueta` la altura mínima para no taparlo.
  outVec.set(0, Math.max(entry.localY, entry.group.userData.alturaMinEtiqueta || 0), 0);
  entry.group.localToWorld(outVec);
  outVec.project(camera);
  return outVec;
}
function updateNameLabelPositions(){
  const w = wrap.clientWidth, h = wrap.clientHeight;
  nameLabels.forEach((entry, id)=>{
    // EntityLabel del design system: borde cian más marcado en la entidad seleccionada.
    entry.el.classList.toggle('is-selected', state.selectedSedeIds.includes(id));
    getLabelScreenNDC(entry, tmpLabelVec);
    if(tmpLabelVec.z < -1 || tmpLabelVec.z > 1){ entry.el.style.display = 'none'; return; }
    entry.el.style.display = '';
    entry.el.style.left = ((tmpLabelVec.x*0.5+0.5) * w) + 'px';
    entry.el.style.top = ((-tmpLabelVec.y*0.5+0.5) * h) + 'px';
  });
}

const grid = new THREE.GridHelper(80, 20, 0x1f2733, 0x161c26);
/* GridHelper no pasa por normalizarMaterialesUI(): r128 ya le pone toneMapped:false, pero sus dos
   tonos no viven en material.color sino horneados en el atributo `color` de la geometría
   (vertexColors:true), así que la conversión de §3A-ter no los alcanza y la grilla salía bastante
   más clara de lo elegido. Se convierten a mano, una sola vez. */
(()=>{
  const attr = grid.geometry.getAttribute('color');
  const c = new THREE.Color();
  for(let i=0;i<attr.count;i++){
    c.fromBufferAttribute(attr, i).convertSRGBToLinear();
    attr.setXYZ(i, c.r, c.g, c.b);
  }
  attr.needsUpdate = true;
})();
scene.add(grid);

