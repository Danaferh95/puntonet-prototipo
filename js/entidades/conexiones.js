/* =========================================================================
   7b. CONEXIONES — cada conexión (cable) que representa un producto de Conectividad está ligada
   a la instancia que la originó (conexion.instanciaId + conexion.ownerId): son un solo registro,
   no dos formularios separados. Ver renderConnectionsBox más arriba, que al hacer clic abre el
   mismo popup que "Servicios asignados" en vez de un editor propio.
   ========================================================================= */

/* Elimina una conexión. Si tenía una instancia ligada (el caso normal desde esta fase en
   adelante), esa instancia ES el producto contratado — se elimina también, como si se hubiera
   borrado desde "Servicios asignados" (misma cosa, dos puntos de entrada). Si conectaba una sede
   con una Matriz, también limpia de esa sede SOLO los productos heredados que venían de esa
   Matriz en particular (si la sede seguía conectada a alguna otra Matriz, esa otra herencia no
   se toca). */
function eliminarConexion(conexionId){
  const c = state.conexiones.find(x=>x.id===conexionId);
  if(!c) return;
  // Backup (v9 §2): es un enlace derivado, no un producto propio — quitarlo desde "Conexiones"
  // solo suelta el segundo cable y desmarca el checkbox de la instancia; el servicio principal
  // (y su propia conexión) no se tocan.
  if(c.esBackup){
    state.conexiones = state.conexiones.filter(x=>x.id!==conexionId);
    const owner = c.ownerId ? getSedeById(c.ownerId) : null;
    const inst = owner ? owner.instancias.find(i=>i.instanciaId===c.instanciaId) : null;
    if(inst) inst.backup = false;
    limpiarSdwanQueApuntanA(conexionId);
    if(state.selectedConexionId === conexionId) state.selectedConexionId = null;
    rebuildConnections();
    renderRightPanel();
    return;
  }
  state.conexiones = state.conexiones.filter(x=>x.id!==conexionId);
  limpiarSdwanQueApuntanA(conexionId);
  // Si esta conexión tenía un backup propio (mismo instanciaId), se elimina junto con ella — no
  // tiene sentido dejar un enlace de respaldo sin el enlace principal que respalda.
  const backupHermano = state.conexiones.find(x=>x.instanciaId===c.instanciaId && x.esBackup);
  if(backupHermano){
    state.conexiones = state.conexiones.filter(x=>x.id!==backupHermano.id);
    limpiarSdwanQueApuntanA(backupHermano.id);
    if(state.selectedConexionId===backupHermano.id) state.selectedConexionId = null;
  }
  if(c.instanciaId && c.ownerId){
    const owner = getSedeById(c.ownerId);
    if(owner){
      owner.instancias = owner.instancias.filter(i=>i.instanciaId!==c.instanciaId);
      refreshSedeAssets(owner);
    }
  }
  [c.aId, c.bId].forEach(id=>{
    const matriz = getMatrizById(id);
    if(!matriz) return;
    const otroId = id===c.aId ? c.bId : c.aId;
    const sede = getSedeById(otroId);
    if(sede && sede.tipo!=='matriz' && sede.herenciaIds && sede.herenciaIds.length){
      const idsDeEstaMatriz = new Set(matriz.instancias.map(i=>i.instanciaId));
      const before = sede.herenciaIds.length;
      sede.herenciaIds = sede.herenciaIds.filter(hid=>!idsDeEstaMatriz.has(hid));
      if(sede.herenciaIds.length!==before) refreshSedeAssets(sede);
    }
  });
  if(state.selectedConexionId === conexionId) state.selectedConexionId = null;
  rebuildConnections();
  renderRightPanel();
}

