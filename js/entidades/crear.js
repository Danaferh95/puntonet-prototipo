/* --- Creación de la Matriz (§4B) ---
   La Matriz ya no aparece por defecto ni está anclada al centro: se crea arrastrando su tarjeta
   desde el panel izquierdo, exactamente igual que una sede (mismo gesto de dragstart/drop, mismo
   flujo de "tocar para armar, tocar para colocar" en táctil, misma lógica de celda libre más
   cercana). A diferencia de la versión anterior, puede haber varias Matrices, y cada una se
   coloca donde el usuario la suelte — el centro de la grilla ya no tiene ningún significado
   especial para ellas, solo lleva el punto decorativo (centerMarkerGroup, más arriba). */
function createMatriz(gx, gz){
  const id = uid('matriz','nextMatrizSeq');
  const nombre = 'Matriz ' + id.split('_')[1];
  const group = buildMatrizMesh();
  const pos = gridToWorld(gx,gz);
  group.position.set(pos.x, 0, pos.z);
  scene.add(group);
  // `usuarios` (pedido cliente 31/07/2026): a diferencia de los Empleados de Sede, una Matriz
  // puede legítimamente no tener usuarios propios asignados todavía, así que arranca en 0 (no en
  // EMPLEADOS_DEFAULT) — se edita con el mismo patrón de slider+número en renderMatrizEditBox.
  const matriz = { id, nombre, tipo:'matriz', gx, gz, group, instancias:[], usuarios:0 };
  tagEntityGroup(group, id);
  state.matrices.push(matriz);
  refreshSedeAssets(matriz);
  updateSedeNameSprite(matriz);
  rebuildConnections();
  renderSaludPanel(); // T05: idem createSede
  return matriz;
}

/* Crea una Nube (v9 §4/§5): mismo patrón que createMatriz, pero con su propia geometría
   (buildNubeMesh) y sin catálogo de productos propios todavía (llega en una fase siguiente).
   `nombreProveedor` es el texto libre pedido al vuelo desde el dropdown "Conectar a" de Cloud
   Interconnect (ej. "AWS", "Azure"); si se deja vacío, usa un nombre genérico numerado. */
function createNube(nombreProveedor, gx, gz){
  const id = uid('nube','nextNubeSeq');
  const nombre = (nombreProveedor && nombreProveedor.trim()) ? nombreProveedor.trim() : ('Nube ' + id.split('_')[1]);
  const group = buildNubeMesh();
  const pos = gridToWorld(gx,gz);
  group.position.set(pos.x, 0, pos.z);
  scene.add(group);
  const nube = { id, nombre, tipo:'nube', gx, gz, group, instancias:[] };
  tagEntityGroup(group, id);
  state.nubes.push(nube);
  refreshSedeAssets(nube);
  updateSedeNameSprite(nube);
  rebuildConnections();
  return nube;
}

/* Elimina una Nube por completo: su geometría 3D y cualquier conexión (Cloud Interconnect) que
   la involucre. Igual que deleteMatriz — reutiliza eliminarConexion para no dejar Cloud
   Interconnects "colgados" sin destino. */
function deleteNube(nube){
  conexionesDe(nube.id).forEach(c=> eliminarConexion(c.id));
  scene.remove(nube.group);
  liberarObjeto3D(nube.group);
  removeNameLabel(nube.id);
  state.nubes = state.nubes.filter(n=>n.id!==nube.id);
  state.selectedSedeIds = state.selectedSedeIds.filter(id=>id!==nube.id);
  rebuildConnections();
  updateSelectionVisuals();
  renderRightPanel();
}

/* --- Eliminar/restaurar el Datacenter Epicentro (ago/2026, pedido cliente) ---
   A diferencia de Sede/Matriz/Nube, el Datacenter no vive en un array (state.sedes/matrices/
   nubes): es un único edificio fijo, siempre en la misma celda de grilla, creado una sola vez al
   iniciar la escena (ver §3, datacenterGroup). "Eliminarlo" no borra ese objeto — lo desactiva:
   limpia sus productos propios y las conexiones que apunten a él (con eliminarConexion, igual que
   deleteMatriz/deleteNube, así también se limpian productos de sedes/Matriz que apuntaban ahí —
   p.ej. Zona Wireless), y oculta su grupo 3D (visible=false excluye el raycaster de hitTestAtEvent
   §4, así deja de poder seleccionarse/soltarle productos encima). "Restaurarlo" solo vuelve a
   mostrar el mismo grupo — no hay que reconstruir su geometría. */
function deleteDatacenter(){
  conexionesDe('datacenter').forEach(c=> eliminarConexion(c.id));
  state.datacenter.instancias = [];
  refreshSedeAssets(state.datacenter);
  state.datacenter.activo = false;
  datacenterGroup.visible = false;
  removeNameLabel('datacenter');
  state.selectedSedeIds = state.selectedSedeIds.filter(id=>id!=='datacenter');
  if(state.selectedConexionId){
    const stillExists = state.conexiones.some(c=>c.id===state.selectedConexionId);
    if(!stillExists) state.selectedConexionId = null;
  }
  rebuildConnections();
  updateSelectionVisuals();
  syncDatacenterRestoreUI();
  renderRightPanel();
}

function restoreDatacenter(){
  if(state.datacenter.activo) return;
  state.datacenter.activo = true;
  datacenterGroup.visible = true;
  upsertNameLabel('datacenter', datacenterGroup, dcY + 0.8, 'Datacenter Epicentro');
  syncDatacenterRestoreUI();
  renderRightPanel();
}

function placeMatrizAtClientPoint(clientX, clientY){
  const point = pickGroundPoint({ clientX, clientY });
  if(!point) return;
  const {gx,gz} = nearestFreeCell(point.x, point.z, null, huellaDeClave('matriz'));
  createMatriz(gx, gz);
}

/* Crear una Nube directamente desde el catálogo (v9 §5), sin pasar por el dropdown de Cloud
   Interconnect — mismo patrón de arrastre que Sede/Matriz. Pide el proveedor con un prompt de
   texto libre, igual que "+ Agregar nueva Nube" en el dropdown (misma función createNube). */
function placeNubeAtClientPoint(clientX, clientY){
  const point = pickGroundPoint({ clientX, clientY });
  if(!point) return;
  pedirProveedorNube().then(nombre=>{
    const {gx,gz} = nearestFreeCell(point.x, point.z, null, huellaDeClave('nube'));
    createNube(nombre, gx, gz);
  });
}
/* Efecto "recubrimiento": al soltar un producto sobre una sede/Matriz/Datacenter, antes de abrir
   el popup se ve brevemente cómo el edificio se cubre con el color del producto (como si lo
   estuviera "vistiendo"), y solo entonces se abre el formulario para completar sus atributos. */
function playWrapEffect(entityId, subproductoId, onDone){
  const entity = getSedeById(entityId);
  const sub = getSubproducto(subproductoId);
  const color = getSubproductoColor(sub);
  let w=1.8, h=1.8, d=1.8;
  if(entity.group.userData.modelo){
    // v16: con modelo, el recubrimiento abraza el edificio real (su planta no es cuadrada)
    const dims = dimsEntidad(entity);
    w = dims.w + 0.35; h = dims.h + 0.2; d = dims.d + 0.35;
  }
  else if(entity.tipo==='matriz'){ w = d = 4.6; h = entity.group.userData.coreY + 0.5; }
  else if(entity.tipo==='nube'){ w = d = 2.8; h = entity.group.userData.coreY + 0.5; }
  else if(entity.id==='datacenter'){ w = 3.6; h = dcY + 0.3; d = 2.8; }
  else { const tamano = getTamanoLocal(entity.tamano); w = tamano.box[0]+0.35; h = tamano.box[1]+0.2; d = tamano.box[2]+0.35; }

  const geo = new THREE.BoxGeometry(w,h,d);
  const mat = new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0 });
  const wrapMesh = new THREE.Mesh(geo, mat);
  wrapMesh.position.y = h/2;
  wrapMesh.scale.set(0.3,0.3,0.3);
  const edgesMat = new THREE.LineBasicMaterial({ color, transparent:true, opacity:0 });
  const edgesMesh = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgesMat);
  wrapMesh.add(edgesMesh);
  entity.group.add(wrapMesh);

  const duration = 1400;
  const started = performance.now();
  function tick(now){
    const t = Math.min(1, (now-started)/duration);
    const ease = 1 - Math.pow(1-t, 3); // ease-out cúbico: rápido al inicio, suave al final
    wrapMesh.scale.setScalar(0.3 + ease*0.7);
    const pulse = Math.sin(ease*Math.PI); // sube y vuelve a bajar: "aparece y se asienta"
    mat.opacity = pulse * 0.4;
    edgesMat.opacity = pulse * 0.9;
    if(t<1){ requestAnimationFrame(tick); }
    else { entity.group.remove(wrapMesh); liberarObjeto3D(wrapMesh); onDone(); }
  }
  requestAnimationFrame(tick);
}

function assignSubproductoAtClientPoint(subproductoId, clientX, clientY){
  const hit = hitTestAtEvent({ clientX, clientY }); // ¿sobre qué sede, Matriz, Nube o Datacenter se soltó?
  if(!hit.sedeId) return; // se soltó fuera de cualquier entidad válida (o sobre un Datacenter eliminado, que deja de ser "hit-testeable"): sin efecto.
  const sub = getSubproducto(subproductoId);
  // Zona Wireless (`conexion:'datacenter'`) no se suelta SOBRE el Datacenter: se suelta en una
  // sede/Matriz y genera un cable automático hacia él (ver ensureConexionAutomatica). Ese caso no
  // pasa por el chequeo de destino de abajo (el destino ahí es la sede, no el Datacenter), así
  // que se valida aparte si el Datacenter fue eliminado (v.ago/2026, ver deleteDatacenter).
  if(sub.conexion==='datacenter' && !state.datacenter.activo){
    showToast(`"${sub.nombre}" requiere el Datacenter Epicentro, que fue eliminado de este proyecto. Restáuralo desde el panel izquierdo para poder asignar este producto.`);
    return;
  }
  const tipoHit = tipoEntidad(hit.sedeId);
  if(!destinoValido(sub, tipoHit)){
    const sugerenciaNube = destinosPermitidos(sub).includes('nube')
      ? ' Si necesitas una Nube, créala arrastrando "Nube" desde el panel izquierdo, o desde el popup de Cloud Interconnect.'
      : '';
    showToast(`"${sub.nombre}" solo se puede asignar a ${nombreDestinos(sub)}.${sugerenciaNube}`);
    return;
  }
  playWrapEffect(hit.sedeId, subproductoId, ()=>{
    openPopupForNew(subproductoId, [hit.sedeId]);
  });
}

/* Payload de arrastre -> como colocar ese nodo (ver setupPanelDragCard, mas abajo) */
const PLACE_BY_TIPO = {
  sede: placeSedeAtClientPoint,
  matriz: placeMatrizAtClientPoint,
  nube: placeNubeAtClientPoint,
};

wrap.addEventListener('dragover', (e)=>{ e.preventDefault(); });
wrap.addEventListener('drop', (e)=>{
  e.preventDefault();
  let payload = e.dataTransfer.getData('text/plain');
  if(!payload && draggingFromPanel) payload = draggingFromPanel;
  if(!payload && draggingSubproductoId) payload = 'subproducto:'+draggingSubproductoId;
  draggingFromPanel = null;
  draggingSubproductoId = null;
  if(!payload) return;

  const place = PLACE_BY_TIPO[payload];
  if(place){
    place(e.clientX, e.clientY);
    return;
  }
  if(payload.startsWith('subproducto:')){
    assignSubproductoAtClientPoint(payload.slice('subproducto:'.length), e.clientX, e.clientY);
  }
});

