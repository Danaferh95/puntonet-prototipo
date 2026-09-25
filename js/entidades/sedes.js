/* =========================================================================
   4. GESTIÓN DE SEDES (crear, seleccionar, drag&drop)
   ========================================================================= */

function gridToWorld(gx,gz){ return { x: gx*GRID_SPACING, z: gz*GRID_SPACING }; }

/* --- Ocupación de la grilla POR HUELLA REAL (v47) ---------------------------------------------
   Hasta v46 la grilla razonaba por celda suelta: una entidad ocupaba su celda y nada más. Eso
   funcionaba mientras toda entidad entrara holgada en los 4 de GRID_SPACING. Con los tamaños de
   v47 ya no entran: el Datacenter mide 8 (dos celdas exactas), la Matriz 5.60 y la Sede Grande
   4.56. Con la regla vieja, dos Sedes Grandes vecinas se solapan medio metro y el Datacenter
   invade las dos celdas de al lado, cada una "libre" según la grilla.

   Así que `occupied` pasa a comparar RECTÁNGULOS: la huella que tendría lo que se quiere colocar
   contra la huella real de todo lo ya colocado, con un aire mínimo entre plataformas. Esto es lo
   que permite subir los tamaños sin tocar GRID_SPACING: las entidades siguen encajando en la
   grilla, solo que las grandes reservan de hecho la celda vecina.

   Consecuencia buscada: la grilla se llena más rápido. Una Matriz y una Sede Grande consumen dos
   celdas de ancho cada una, así que colocar muchas entidades obliga a repartirse más en Z. */
const HOLGURA_ENTIDADES = 0.35; // aire mínimo entre dos plataformas vecinas

function huellaEnCelda(gx, gz, w, d){
  const c = gridToWorld(gx, gz);
  return { x0: c.x - w/2, x1: c.x + w/2, z0: c.z - d/2, z1: c.z + d/2 };
}
function huellaDeColocada(entity){
  const d = dimsEntidad(entity);
  return huellaEnCelda(entity.gx, entity.gz, d.w, d.d);
}
function seSolapan(a, b){
  return a.x0 < b.x1 + HOLGURA_ENTIDADES && b.x0 < a.x1 + HOLGURA_ENTIDADES &&
         a.z0 < b.z1 + HOLGURA_ENTIDADES && b.z0 < a.z1 + HOLGURA_ENTIDADES;
}

/* Cuánto va a medir una entidad ANTES de construirla. Si el .glb de esa clave no está cargado,
   cae a la medida de su primitiva, que es lo que se va a dibujar en ese caso. */
const HUELLA_PRIMITIVA = {
  sede_pequeno:{ w:1.2, d:1.2 }, sede_mediano:{ w:1.7, d:1.7 }, sede_grande:{ w:2.4, d:2.4 },
  matriz:{ w:2.0, d:2.0 }, nube:{ w:2.3, d:2.3 }, datacenter:{ w:3.0, d:2.2 },
};
function huellaDeClave(clave){
  const d = ModelLibrary.dims(clave);
  return d ? { w:d.w, d:d.d } : (HUELLA_PRIMITIVA[clave] || HUELLA_PRIMITIVA.sede_mediano);
}
function huellaDeSedePorEmpleados(empleados){
  return huellaDeClave('sede_' + tamanoPorEmpleados(Math.max(1, Math.round(empleados || EMPLEADOS_DEFAULT))).id);
}

/* `huella` es el tamaño de lo que se quiere colocar (huellaDeClave / dimsEntidad). Sin ella se
   asume una sede mediana, que es el tamaño con el que se arrastra por defecto. */
function occupied(gx, gz, excludeId, huella){
  const h = huella || huellaDeClave('sede_mediano');
  const caja = huellaEnCelda(gx, gz, h.w, h.d);
  if(state.datacenter.activo){
    const dcDims = datacenterGroup.userData.dims || { w:3, d:2.2 };
    if(seSolapan(caja, huellaEnCelda(0, DATACENTER_GZ, dcDims.w, dcDims.d))) return true;
  }
  return todasLasEntidades().some(e=>
    e && e.id !== excludeId && e.id !== 'datacenter' && e.group && seSolapan(caja, huellaDeColocada(e)));
}

/* Busca la celda libre más cercana recorriendo anillos alrededor de la pedida. Hasta v46 el
   barrido era solo en X (gx += ±1), que alcanzaba cuando cada entidad ocupaba una celda; ahora que
   las grandes reservan dos, una fila se agota rápido y hay que poder bajar a la siguiente. */
function nearestFreeCell(worldX, worldZ, excludeId, huella){
  const gx0 = Math.round(worldX/GRID_SPACING);
  const gz0 = Math.round(worldZ/GRID_SPACING);
  if(!occupied(gx0, gz0, excludeId, huella)) return { gx:gx0, gz:gz0 };
  for(let r=1; r<=8; r++){
    const candidatos = [];
    for(let dx=-r; dx<=r; dx++){
      for(let dz=-r; dz<=r; dz++){
        if(Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        candidatos.push({ gx:gx0+dx, gz:gz0+dz, dist: dx*dx + dz*dz });
      }
    }
    candidatos.sort((a,b)=>a.dist-b.dist);
    const libre = candidatos.find(c=>!occupied(c.gx, c.gz, excludeId, huella));
    if(libre) return { gx:libre.gx, gz:libre.gz };
  }
  return { gx:gx0, gz:gz0 };
}

/* Las sedes ya NO se conectan automáticamente a nada al crearse: toda conexión (a la Matriz o
   al Datacenter) se establece arrastrando manualmente desde su puerto (§5). */
function createSede(empleados, gx, gz){
  empleados = Math.max(1, Math.round(empleados || EMPLEADOS_DEFAULT));
  const tamano = tamanoPorEmpleados(empleados);
  const id = uid('sede','nextSedeSeq');
  const nombre = 'Sede ' + id.split('_')[1];
  const group = buildSedeMesh(tamano.id);
  const pos = gridToWorld(gx,gz);
  group.position.set(pos.x, 0, pos.z);
  scene.add(group);
  const sede = {
    id, nombre, tipo:'sede', tamano: tamano.id, empleados,
    gx, gz, group, instancias:[], herenciaIds:[],
  };
  Object.assign(group.userData, { sedeId:id, isSedeRoot:true }); // Object.assign: conserva userData.dims del builder (v16)
  group.traverse(o=>{
    if(o.name==='sedeHitbox'){ o.userData.sedeId=id; o.userData.isSedeRoot=true; }
    if(o.name==='connPort'){ o.userData.sedeId=id; o.userData.isPort=true; o.userData.entityId=id; }
  });
  state.sedes.push(sede);
  refreshSedeAssets(sede);
  updateSedeNameSprite(sede);
  rebuildConnections();
  renderSaludPanel(); // T05: una ubicación nueva, aunque esté vacía, cambia la cobertura
  return sede;
}

/* Reconstruye la geometría 3D de la sede cuando el tamaño (tier) cambia al editar empleados,
   conservando posición, instancias y conexiones (las conexiones se redibujan desde sus puertos,
   que se recalculan solos ya que son hijos del nuevo group). */
function rebuildSedeMeshIfNeeded(sede, newTamanoId, forzar){
  if(sede.tamano === newTamanoId && !forzar){ updateSedeNameSprite(sede); return; }
  sede.tamano = newTamanoId;
  const pos = sede.group.position.clone();
  const wasSelected = state.selectedSedeIds.includes(sede.id);
  scene.remove(sede.group);
  const group = buildSedeMesh(newTamanoId);
  group.position.copy(pos);
  Object.assign(group.userData, { sedeId: sede.id, isSedeRoot:true });
  group.traverse(o=>{
    if(o.name==='sedeHitbox'){ o.userData.sedeId=sede.id; o.userData.isSedeRoot=true; }
    if(o.name==='connPort'){ o.userData.sedeId=sede.id; o.userData.isPort=true; o.userData.entityId=sede.id; }
  });
  scene.add(group);
  sede.group = group;
  refreshSedeAssets(sede);
  updateSedeNameSprite(sede);
  if(wasSelected) updateSelectionVisuals();
}

function setSedeEmpleados(sede, empleados){
  empleados = Math.max(1, Math.round(empleados));
  sede.empleados = empleados;
  const tamano = tamanoPorEmpleados(empleados);
  rebuildSedeMeshIfNeeded(sede, tamano.id);
  rebuildConnections();
}

function removeSedeVisual(sede){ scene.remove(sede.group); removeNameLabel(sede.id); }

/* Elimina una sede por completo: su geometría 3D, todos sus productos propios, cualquier
   conexión que la involucre (con la Matriz o el Datacenter), y la limpia de la selección. */
function deleteSede(sede){
  conexionesDe(sede.id).forEach(c=>{
    state.conexiones = state.conexiones.filter(x=>x.id!==c.id);
    limpiarSdwanQueApuntanA(c.id);
  });
  if(state.selectedConexionId){
    const stillExists = state.conexiones.some(c=>c.id===state.selectedConexionId);
    if(!stillExists) state.selectedConexionId = null;
  }
  removeSedeVisual(sede);
  state.sedes = state.sedes.filter(s=>s.id!==sede.id);
  state.selectedSedeIds = state.selectedSedeIds.filter(id=>id!==sede.id);
  rebuildConnections();
  updateSelectionVisuals();
  renderRightPanel();
}

/* Elimina UNA Matriz por completo: su geometría 3D, sus productos propios, cualquier conexión
   que la involucre (con la limpieza de herencia correspondiente en cada sede conectada, vía
   eliminarConexion), y la quita de la lista. Igual que deleteSede, pero para Matrices. */
function deleteMatriz(matriz){
  conexionesDe(matriz.id).forEach(c=> eliminarConexion(c.id));
  scene.remove(matriz.group);
  removeNameLabel(matriz.id);
  state.matrices = state.matrices.filter(m=>m.id!==matriz.id);
  state.selectedSedeIds = state.selectedSedeIds.filter(id=>id!==matriz.id);
  rebuildConnections();
  updateSelectionVisuals();
  renderRightPanel();
}

function getEntityHaloObject(entityId){
  if(entityId==='datacenter') return datacenterGroup.getObjectByName('matrizHalo');
  const matriz = getMatrizById(entityId);
  if(matriz) return matriz.group.getObjectByName('matrizHalo');
  const nube = getNubeById(entityId);
  if(nube) return nube.group.getObjectByName('matrizHalo');
  const sede = state.sedes.find(s=>s.id===entityId);
  return sede ? sede.group.getObjectByName('halo') : null;
}

function updateSelectionVisuals(){
  state.sedes.forEach(sede=>{
    const halo = sede.group.getObjectByName('halo');
    const selected = state.selectedSedeIds.includes(sede.id);
    if(halo) halo.material.opacity = selected ? 0.9 : 0;
  });
  state.matrices.forEach(matriz=>{
    const halo = matriz.group.getObjectByName('matrizHalo');
    const selected = state.selectedSedeIds.includes(matriz.id);
    if(halo) halo.material.opacity = selected ? 0.9 : 0;
  });
  const dcHalo = getEntityHaloObject('datacenter');
  if(dcHalo) dcHalo.material.opacity = state.selectedSedeIds.includes('datacenter') ? 0.9 : 0;
}

/* --- Drag & drop desde el panel izquierdo: crear sede, o asignar un producto arrastrado ---
   En desktop funciona con arrastre nativo (HTML5 DnD). En touch (celular/tablet) el DnD nativo
   no dispara con el dedo, así que se ofrece una alternativa: tocar la tarjeta/producto lo "arma"
   (aparece un aviso arriba del canvas) y el siguiente toque sobre el canvas lo coloca. */
let draggingFromPanel = null; // null | 'sede' | 'matriz' | 'nube' — respaldo para navegadores que no preservan dataTransfer en 'drop'
let draggingSubproductoId = null;

const placingHintEl = byId('placingHint');
const placingHintText = byId('placingHintText');
function armPlacing(placing, hintText){
  state.placing = placing;
  placingHintText.textContent = hintText;
  placingHintEl.style.display = 'flex';
}
function disarmPlacing(){
  state.placing = null;
  placingHintEl.style.display = 'none';
}
byId('placingHintCancel').addEventListener('click', disarmPlacing);

