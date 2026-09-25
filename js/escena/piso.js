/* =========================================================================
   3A-bis. GLOW BAJO CADA ENTIDAD (23/09/2026, reemplaza el reflejo falso; sin disco oscuro desde el 25/09)
   -------------------------------------------------------------------------
   Hasta el 23/09 acá había un reflejo FALSO: una copia espejada de cada entidad bajo el piso. Dei
   lo sacó por dos motivos: se leía como el mesh duplicado, y se podía hacer clic en él y
   "agarrar" el edificio — el clon arrastraba las hitbox invisibles de la entidad (con su
   `sedeId`), y el raycaster de three r128 no descarta objetos invisibles.
   En su lugar, cada entidad lleva un halo de luz suave apoyado en el piso: un plano con un
   degradado radial, del color de acento de su tipo (MODELO_LOOKS), del tamaño de su huella.
   No es un clon ni cuelga del group de la entidad, y su raycast está anulado: no se puede
   clickear. Se sincroniza cada frame contra todasLasEntidades(), igual que hacía el reflejo. */
/* 25/09/2026 (cliente): se quitó el disco oscuro que hacía de "piso" (CircleGeometry r=60, negro
   al 55 %). Se leía como un círculo negro alrededor de la escena; queda solo la grilla. El glow
   bajo cada entidad es aditivo y no dependía de ese disco. */

const GLOW_PISO = {
  activo: true,
  opacidad: 0.45,  // intensidad del halo (se suma a la luz del piso, blending aditivo)
  escala: 1.8,     // cuánto se abre respecto de la huella de la entidad
};
const glowsPiso = new THREE.Group();
glowsPiso.name = 'glowsPiso';
scene.add(glowsPiso);
const glowPorEntidad = new Map(); // entityId -> { mesh, w, d }

let texturaGlowPiso = null;
function obtenerTexturaGlowPiso(){
  if(texturaGlowPiso) return texturaGlowPiso;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx && ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  if(g){ // sin canvas 2D real (p.ej. el smoke test en jsdom) queda una textura vacía, sin romper
    // El centro queda tapado por el edificio (la huella ocupa ~55 % del radio): el degradado
    // guarda fuerza hasta ese borde y recién ahí se apaga, que es la parte que se ve.
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.75, 'rgba(255,255,255,0.3)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  texturaGlowPiso = new THREE.CanvasTexture(c);
  return texturaGlowPiso;
}
function colorGlowPiso(entity){
  const look = MODELO_LOOKS[entity.tipo] || MODELO_LOOKS[tipoEntidad(entity.id)] || MODELO_LOOKS.sede;
  return look.glow;
}
function crearGlowPiso(entity, w, d){
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      color: colorGlowPiso(entity), map: obtenerTexturaGlowPiso(),
      transparent: true, opacity: GLOW_PISO.opacidad, depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  mesh.name = 'glowPiso';
  mesh.rotation.x = -Math.PI/2;
  mesh.scale.set(w * GLOW_PISO.escala, d * GLOW_PISO.escala, 1);
  mesh.renderOrder = 1;            // después del piso translúcido, que si no lo apaga; los edificios lo tapan por profundidad
  mesh.raycast = function(){};     // decorativo: nunca intercepta clicks ni arrastres
  return mesh;
}
function actualizarGlowPiso(){
  glowsPiso.visible = GLOW_PISO.activo;
  if(!GLOW_PISO.activo) return;
  const activos = new Set();
  todasLasEntidades().forEach(entity=>{
    if(!entity || !entity.group || entity.group.visible === false) return;
    if(entity === state.datacenter && !state.datacenter.activo) return;
    activos.add(entity.id);
    const { w, d } = dimsEntidad(entity);
    let entry = glowPorEntidad.get(entity.id);
    if(entry && (entry.w !== w || entry.d !== d)){ // cambió la huella (empleados, carga de modelos)
      glowsPiso.remove(entry.mesh); entry.mesh.geometry.dispose(); entry.mesh.material.dispose();
      entry = null;
    }
    if(!entry){
      entry = { mesh: crearGlowPiso(entity, w, d), w, d };
      glowPorEntidad.set(entity.id, entry);
      glowsPiso.add(entry.mesh);
    }
    const g = entity.group.position;
    entry.mesh.position.set(g.x, 0.005, g.z); // apenas sobre el piso y la grilla
  });
  glowPorEntidad.forEach((entry, id)=>{
    if(activos.has(id)) return;
    glowsPiso.remove(entry.mesh); entry.mesh.geometry.dispose(); entry.mesh.material.dispose();
    glowPorEntidad.delete(id);
  });
}

