/* =========================================================================
   5. RAYCASTING / CLICK EN EL CANVAS
   ========================================================================= */

const raycaster = new THREE.Raycaster();
const GROUND_NORMAL = new THREE.Vector3(0,1,0);

/* --- De coordenadas de pantalla a la escena ---
   Estas 3 lineas (rect -> NDC -> raycaster) estaban repetidas en 7 puntos del archivo, y el
   raycast contra el piso otras 4 veces, cada una con su propio `new THREE.Raycaster()`.
   pointerNDC() y pickGroundPoint() son el unico lugar donde vive esa conversion.
   Nota: `ray.intersectPlane` devuelve null si el rayo es paralelo al plano; las copias anteriores
   comprobaban `if(!point)` sobre el Vector3 que ellas mismas habian creado — que nunca es null —
   asi que ese caso limite quedaba sin cubrir. Aca se comprueba el valor de retorno real. */
function pointerNDC(e){
  const rect = wrap.getBoundingClientRect();
  return new THREE.Vector2(
    ((e.clientX-rect.left)/rect.width)*2-1,
    -((e.clientY-rect.top)/rect.height)*2+1
  );
}
/* Punto del mundo donde el puntero corta un plano horizontal a la altura `height` (0 = piso de
   la grilla). Devuelve null si no hay corte. */
function pickGroundPoint(e, height){
  raycaster.setFromCamera(pointerNDC(e), camera);
  const plane = new THREE.Plane(GROUND_NORMAL, -(height || 0));
  const point = new THREE.Vector3();
  return raycaster.ray.intersectPlane(plane, point) ? point : null;
}

/* --- Utilidad de raycast: qué hay bajo el cursor ---
   'asset' solo se llena con un producto propio editable (para abrir su popup al hacer click).
   'sedeId' se resuelve también si se cae sobre un asset propio o heredado, para que el
   drag&drop de productos funcione aunque el drop caiga justo sobre un ícono existente.
   'port' se llena al tocar el puerto de conexión de una entidad (inicia el arrastre de cable).
   'conexion' se llena al tocar un cable ya existente (abre su popup de edición). */
function hitTestAtEvent(e){
  raycaster.setFromCamera(pointerNDC(e), camera);
  const intersects = raycaster.intersectObjects(scene.children, true);
  let asset = null, sedeId = null, port = null, conexion = null;
  for(const it of intersects){
    const ud = it.object.userData;
    if(!ud) continue;
    if(!port && ud.isPort) port = { entityId: ud.entityId };
    if(!conexion && ud.isConexion) conexion = ud.conexionId;
    if(!asset && ud.isAsset) asset = ud;
    if(!sedeId && (ud.isSedeRoot || ud.isAsset || ud.isHeredadoAsset)) sedeId = ud.sedeId;
    if(port && conexion && asset && sedeId) break;
  }
  return { asset, sedeId, port, conexion };
}

/* Selecciona una conexión clickeada directamente en el canvas 3D. En vez de vaciar la selección
   de sede/Matriz/Datacenter (lo que forzaba al usuario a "otra pantalla"), mantiene el foco en
   la entidad ya seleccionada si es uno de los 2 extremos del cable, y expande esa conexión
   inline en el panel derecho — mismo panel, mismo lugar, solo se abre su acordeón. */
function selectConexionInline(conexionId){
  const c = state.conexiones.find(x=>x.id===conexionId);
  if(!c) return;
  const focoActual = state.selectedSedeIds.length===1 ? state.selectedSedeIds[0] : null;
  let foco;
  if(focoActual && (c.aId===focoActual || c.bId===focoActual)){
    foco = focoActual;
  } else {
    foco = [c.aId, c.bId].find(id=>tipoEntidad(id)==='sede') || c.aId;
  }
  state.selectedSedeIds = [foco];
  state.selectedConexionId = conexionId;
  updateSelectionVisuals();
  rebuildConnections(); // para resaltar visualmente el cable seleccionado
  renderRightPanel();
}

function handleCanvasClick(hit, shiftKey){
  if(hit.conexion){
    selectConexionInline(hit.conexion);
    return;
  }
  // Ya no se abre el popup del producto al hacer clic en su ícono en el canvas: eso llevaba a
  // que "seleccionar la sede" y "editar un producto" fueran el mismo gesto sin querer. Ahora un
  // clic (sobre la sede, la Matriz, o cualquiera de sus íconos de producto) solo selecciona la
  // entidad; el usuario elige qué producto editar desde la lista en el panel derecho.
  const hadConexion = !!state.selectedConexionId;
  if(hit.sedeId){
    state.selectedConexionId = null;
    if(shiftKey){
      const idx = state.selectedSedeIds.indexOf(hit.sedeId);
      if(idx>=0) state.selectedSedeIds.splice(idx,1);
      else state.selectedSedeIds.push(hit.sedeId);
    } else {
      state.selectedSedeIds = [hit.sedeId];
    }
  } else if(!shiftKey){
    state.selectedSedeIds = [];
    state.selectedConexionId = null;
  }
  updateSelectionVisuals();
  // si había una conexión resaltada, hay que reconstruir los cables para que se le quite el
  // resalte visual en la escena 3D — antes solo se limpiaba el estado, no el cable en pantalla.
  if(hadConexion) rebuildConnections();
  renderRightPanel();
}

/* --- Gesto unificado de botón izquierdo sobre el canvas ---
   mousedown sobre un PUERTO + arrastre                      → estirar un cable hacia otra entidad
   mousedown sobre una sede (sin tocar un asset) + arrastre  → mover la sede en la grilla
   mousedown en cualquier otro punto + arrastre               → orbitar la cámara
   mousedown + mouseup sin arrastre real                      → clic de selección / edición */
const DRAG_THRESHOLD = 6;
const PORT_DRAG_THRESHOLD = 3; // el puerto es un blanco pequeño: reacciona con un roce mínimo
let pointerDownInfo = null; // { x, y, hit }
let pointerMode = null;     // null | 'orbit' | 'moveSede' | 'connecting'
let movingSede = null;
let connectingFromId = null;
let connectingHoverId = null;

/* Línea temporal que sigue al cursor mientras se arrastra un cable nuevo. Vive en su propio
   grupo (no en connectionsGroup) para que rebuildConnections() no la borre a mitad del gesto. */
const tempCableGroup = new THREE.Group();
scene.add(tempCableGroup);
let tempCableLine = null;
function startTempCable(){
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const mat = new THREE.LineBasicMaterial({ color:0x22d3ee, transparent:true, opacity:.85 });
  tempCableLine = new THREE.Line(geo, mat);
  tempCableGroup.add(tempCableLine);
}
function updateTempCable(from, to, valid){
  if(!tempCableLine) return;
  tempCableLine.geometry.dispose();
  // T01: sobre un destino válido se previsualiza el mismo arco que va a quedar dibujado; mientras
  // sigue al cursor es una recta, porque el cursor no es un techo.
  const pts = valid ? curvaDeCable(from, to, 0).getPoints(32) : [from, to];
  tempCableLine.geometry = new THREE.BufferGeometry().setFromPoints(pts);
  setColorUI(tempCableLine.material, valid ? 0x4ade80 : 0x22d3ee); // §3A-ter: .set() crudo pisaría la conversión a lineal
  tempCableLine.material.opacity = valid ? 1 : 0.7;
}
function endTempCable(){
  if(tempCableLine){ tempCableGroup.remove(tempCableLine); tempCableLine.geometry.dispose(); tempCableLine=null; }
}

/* Red de seguridad: si un gesto de arrastre/conexión se interrumpe de una forma que NO pasa por
   el mouseup/touchend normal (cambiar de app, perder el foco de la ventana, la pantalla se
   bloquea, un segundo dedo toca la pantalla, etc.), el cable temporal podía quedar "pegado" en
   la escena para siempre — ya que vive en su propio grupo y rebuildConnections() no lo toca.
   Esta función cancela cualquier gesto en curso y limpia todo, y se llama tanto en esos casos
   límite como preventivamente al iniciar cualquier nuevo gesto. */
function cancelActiveGesture(){
  endTempCable();
  pointerDownInfo = null;
  pointerMode = null;
  isOrbiting = false;
  movingSede = null;
  connectingFromId = null;
  connectingHoverId = null;
  setDragHoverHighlight(null);
  activeTouchDragCancels.forEach(fn=>fn());
}
window.addEventListener('blur', cancelActiveGesture);
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) cancelActiveGesture(); });

function projectToPlaneAtHeight(e, height){
  return pickGroundPoint(e, height) || new THREE.Vector3(0,height,0);
}

function onPointerDown(e){
  if(tempCableLine || pointerMode==='connecting'){
    // gesto anterior no se cerró bien (quedó un cable colgando de una interacción previa
    // interrumpida): se limpia antes de empezar el nuevo gesto.
    cancelActiveGesture();
  }
  if(e.button!==0){
    // botón central/derecho: siempre orbita, como antes
    isOrbiting = true; lastX = e.clientX; lastY = e.clientY;
    return;
  }
  pointerDownInfo = { x:e.clientX, y:e.clientY, hit: hitTestAtEvent(e), forcePan: !!(e.ctrlKey || e.metaKey || panModeActive) };
  pointerMode = null;
  lastX = e.clientX; lastY = e.clientY;
}

function onPointerMove(e){
  if(pointerDownInfo && pointerMode===null){
    const moved = Math.hypot(e.clientX-pointerDownInfo.x, e.clientY-pointerDownInfo.y);
    if(pointerDownInfo.forcePan && moved > DRAG_THRESHOLD){
      // Pan pedido explícitamente (Ctrl/Cmd, o modo mano ✋ activo): gana por encima de conectar
      // o mover una sede, sin importar dónde haya empezado el gesto.
      pointerMode = 'pan';
    } else if(pointerDownInfo.hit.port && !pointerDownInfo.forcePan && tipoEntidad(pointerDownInfo.hit.port.entityId)!=='nube' && moved > PORT_DRAG_THRESHOLD){
      // El cable manual desde el puerto es un Canal de Conexión (ver tipoConexionPorDestino),
      // salvo que termine en una Nube: ahí abre Cloud Interconnect (T04). Una Nube sigue sin
      // poder ser ORIGEN de este gesto: el Cloud Interconnect lo contrata la Sede o la Matriz.
      pointerMode = 'connecting';
      connectingFromId = pointerDownInfo.hit.port.entityId;
      connectingHoverId = null;
      startTempCable();
    } else if(!pointerDownInfo.hit.port && moved > DRAG_THRESHOLD){
      if(pointerDownInfo.hit.sedeId && pointerDownInfo.hit.sedeId!=='datacenter' && !pointerDownInfo.hit.asset){
        pointerMode = 'moveSede';
        movingSede = getSedeById(pointerDownInfo.hit.sedeId);
      } else {
        pointerMode = 'orbit';
        isOrbiting = true;
      }
    }
  }

  if(pointerMode==='pan'){
    panCamera(e.clientX-lastX, e.clientY-lastY);
  } else if(pointerMode==='connecting'){
    const originPos = getEntityPortWorldPos(connectingFromId);
    const hover = hitTestAtEvent(e);
    // T04: una Nube es destino válido solo como Cloud Interconnect (destinoValidoCableManual).
    if(hover.sedeId && destinoValidoCableManual(connectingFromId, hover.sedeId)){
      connectingHoverId = hover.sedeId;
      updateTempCable(originPos, getEntityPortWorldPos(hover.sedeId), true);
    } else {
      connectingHoverId = null;
      updateTempCable(originPos, projectToPlaneAtHeight(e, originPos.y), false);
    }
  } else if(pointerMode==='moveSede' && movingSede){
    const point = pickGroundPoint(e);
    if(point){
      movingSede.group.position.x = point.x;
      movingSede.group.position.z = point.z;
      rebuildConnections();
    }
  } else if(isOrbiting){
    const dx = e.clientX-lastX, dy = e.clientY-lastY;
    camAngleY -= dx*0.006;
    camAngleX = Math.max(0.03, Math.min(Math.PI-0.03, camAngleX + dy*0.006));
    updateCameraFromAngles();
  }
  lastX = e.clientX; lastY = e.clientY;
}

function onPointerUp(e){
  if(e.button===0 && pointerDownInfo){
    if(pointerMode==='connecting'){
      endTempCable();
      if(connectingHoverId && tipoEntidad(connectingHoverId)==='nube'){
        // T04: no se crea nada todavía — el formulario decide. Guardar crea instancia y cable;
        // cancelar no deja rastro.
        if(esDestinoCloudInterconnect(connectingFromId, connectingHoverId)) abrirCloudInterconnectDesdeCable(connectingFromId, connectingHoverId);
      } else if(connectingHoverId && parValidoConexion(connectingFromId, connectingHoverId) && !conexionExiste(connectingFromId, connectingHoverId)){
        const subproductoId = tipoConexionPorDestino();
        const sub = getSubproducto(subproductoId);
        const producto = getProducto(sub.productoNivel2Id);
        // Dueño de la instancia: el lado que no es el Datacenter (si aplica), o el origen del
        // arrastre si ninguno de los 2 extremos es el Datacenter (p.ej. Sede↔Matriz) — mismo
        // criterio que ensureConexionAutomatica, así da igual si el vendedor arrastra el chip
        // del catálogo o el cable a mano desde el puerto: ambos terminan siendo la misma
        // instancia de servicio (cuenta en "Servicios asignados" y en la Salud de
        // infraestructura, no solo como un cable sin producto detrás).
        const ownerId = connectingFromId==='datacenter' ? connectingHoverId
          : connectingHoverId==='datacenter' ? connectingFromId
          : connectingFromId;
        const owner = getSedeById(ownerId);
        const instancia = {
          instanciaId: uid('inst','nextInstanceSeq'),
          subproductoId: sub.id,
          verticalId: producto.verticalId,
          nombreSubproducto: sub.nombre,
          propiedades: {}, notas:'', marca:'',
          creadoEn: new Date().toISOString(),
        };
        owner.instancias.push(instancia);
        refreshSedeAssets(owner);
        const conexion = {
          id: uid('conn','nextConexionSeq'), aId:connectingFromId, bId:connectingHoverId,
          subproductoId: sub.id, instanciaId: instancia.instanciaId, ownerId,
        };
        state.conexiones.push(conexion);
        // recién conectada: se deja seleccionada la entidad de origen y se abre de una vez el
        // popup de la instancia recién creada para completar Ancho de banda y demás propiedades
        // — es el mismo formulario que "Servicios asignados", no uno aparte.
        state.selectedSedeIds = [connectingFromId];
        state.selectedConexionId = conexion.id;
        updateSelectionVisuals();
        rebuildConnections();
        renderRightPanel();
        openPopupForEdit(ownerId, instancia.instanciaId);
      }
      connectingFromId = null;
      connectingHoverId = null;
    } else if(pointerMode==='moveSede' && movingSede){
      const {gx,gz} = nearestFreeCell(movingSede.group.position.x, movingSede.group.position.z, movingSede.id, dimsEntidad(movingSede));
      movingSede.gx = gx; movingSede.gz = gz;
      const pos = gridToWorld(gx,gz);
      movingSede.group.position.set(pos.x, 0, pos.z);
      rebuildConnections();
      movingSede = null;
    } else if(pointerMode!=='orbit'){
      // no hubo arrastre real (o fue mínimo): o bien completa una colocación pendiente
      // (flujo táctil de "tocar para armar, tocar para colocar"), o es un clic de selección.
      if(state.placing){
        if(state.placing.tipo==='sede') placeSedeAtClientPoint(e.clientX, e.clientY);
        else if(state.placing.tipo==='matriz') placeMatrizAtClientPoint(e.clientX, e.clientY);
        else if(state.placing.tipo==='nube') placeNubeAtClientPoint(e.clientX, e.clientY);
        else if(state.placing.tipo==='subproducto') assignSubproductoAtClientPoint(state.placing.id, e.clientX, e.clientY);
        disarmPlacing();
      } else {
        handleCanvasClick(pointerDownInfo.hit, e.shiftKey);
      }
    }
  }
  pointerDownInfo = null;
  pointerMode = null;
  isOrbiting = false;
}

renderer.domElement.addEventListener('mousedown', onPointerDown);
window.addEventListener('mousemove', onPointerMove);
window.addEventListener('mouseup', onPointerUp);

/* --- Equivalente táctil: el drag-and-drop nativo (HTML5) no dispara con dedos en móviles, pero
   estos gestos (orbitar, tocar para seleccionar, arrastrar una sede, arrastrar un puerto para
   conectar) están hechos a mano con mouse events — así que basta con traducir el primer punto
   de contacto a la misma forma de evento y reusar exactamente la misma lógica de arriba. --- */
function touchPoint(e){
  const t = e.touches[0] || e.changedTouches[0];
  return { clientX:t.clientX, clientY:t.clientY, button:0, shiftKey:false };
}
renderer.domElement.addEventListener('touchstart', (e)=>{
  if(e.touches.length!==1) return; // dejamos pasar gestos de 2 dedos (por si el navegador hace algo con ellos)
  onPointerDown(touchPoint(e));
}, { passive:true });
window.addEventListener('touchmove', (e)=>{
  if(!pointerDownInfo || e.touches.length!==1) return;
  if(e.cancelable) e.preventDefault(); // evita que la página haga scroll mientras se interactúa con el canvas
  onPointerMove(touchPoint(e));
}, { passive:false });
window.addEventListener('touchend', (e)=>{
  if(!pointerDownInfo) return;
  onPointerUp(touchPoint(e));
});
window.addEventListener('touchcancel', cancelActiveGesture);

/* T07 — Instancias de la entidad (propias y heredadas de una Matriz) que son del mismo Producto
   (N2) que `inst`, en el orden en que se agregaron. Es el grupo que muestra el tooltip. */
function grupoDelTooltip(entity, inst){
  const productoId = getSubproducto(inst.subproductoId).productoNivel2Id;
  const heredadas = entity.tipo==='matriz' ? [] :
    (entity.herenciaIds||[]).map(hid=>findInstanciaEnMatrices(hid)).filter(Boolean);
  return [...entity.instancias.map(i=>({ inst:i, heredado:false })), ...heredadas.map(i=>({ inst:i, heredado:true }))]
    .filter(g=>{ const sub = getSubproducto(g.inst.subproductoId); return sub && sub.productoNivel2Id === productoId; });
}

/* --- Tooltip on hover sobre assets --- */
const tooltipEl = byId('tooltip');
renderer.domElement.addEventListener('mousemove', (e)=>{
  raycaster.setFromCamera(pointerNDC(e), camera);
  const intersects = raycaster.intersectObjects(scene.children, true);
  let found = null;
  for(const it of intersects){
    if(it.object.userData && (it.object.userData.isAsset || it.object.userData.isHeredadoAsset)){ found = it.object.userData; break; }
  }
  if(found){
    let inst;
    const sede = getSedeById(found.sedeId);
    if(found.isHeredadoAsset){
      inst = findInstanciaEnMatrices(found.matrizInstanciaId);
    } else {
      inst = sede && sede.instancias.find(i=>i.instanciaId===found.instanciaId);
    }
    if(inst){
      const vertical = getVertical(inst.verticalId);
      const rect = wrap.getBoundingClientRect(); // el tooltip se posiciona relativo al canvas
      tooltipEl.style.display='block';
      tooltipEl.style.left = (e.clientX-rect.left+14)+'px';
      tooltipEl.style.top = (e.clientY-rect.top+10)+'px';
      // T07 (24/09, Dei): si la entidad tiene varios servicios del mismo producto (los 4 candados
      // de End Point, las variantes de Internet…), un solo popup los lista todos con viñetas.
      const grupo = sede ? grupoDelTooltip(sede, inst) : [inst];
      if(grupo.length > 1){
        const producto = getProducto(getSubproducto(inst.subproductoId).productoNivel2Id);
        tooltipEl.innerHTML = `<div class="t-title">${escapeHtml(producto.nombre)}</div>
          <div class="t-sub">${vertical.nombre} · ${grupo.length} servicios</div>
          <ul class="t-lista">${grupo.map(g=>`<li class="t-item t-item--${g.inst.verticalId}"><span class="t-bullet" aria-hidden="true"></span>${escapeHtml(g.inst.nombreSubproducto)}${g.heredado?' <span class="t-heredado">(heredado)</span>':''}</li>`).join('')}</ul>`;
      } else {
        tooltipEl.innerHTML = `<div class="t-title">${inst.nombreSubproducto}${found.isHeredadoAsset?' <span class="t-heredado">(heredado)</span>':''}</div>
          <div class="t-sub">${vertical.nombre}${inst.marca?' · '+escapeHtml(inst.marca):''}</div>`;
      }
    }
  } else {
    tooltipEl.style.display='none';
  }
});
renderer.domElement.addEventListener('mouseleave', ()=>{ tooltipEl.style.display='none'; });

