const connectionsBoxEl = byId('connectionsBox');

/* Devuelve la instancia (el "servicio asignado") que originó una conexión, si la tiene ligada.
   Desde esta fase, TODA conexión nueva (auto al Datacenter, por dropdown "Conectar a", o
   arrastrando el cable a mano desde el puerto) queda ligada a una instancia — son un solo
   registro. */
function getInstanciaLigada(c){
  if(!c.instanciaId || !c.ownerId) return null;
  const owner = getSedeById(c.ownerId);
  if(!owner) return null;
  return owner.instancias.find(i=>i.instanciaId===c.instanciaId) || null;
}

/* Selecciona una conexión (resalta el cable en la escena 3D) y, si tiene una instancia ligada,
   abre directamente su popup de edición — el MISMO formulario que "Servicios asignados" usa
   para el mismo producto. Ya no hay un editor de Ancho de banda/Compartición aparte: la
   conexión y el servicio asignado son una sola cosa, se editan en un solo lugar. */
function abrirConexion(c){
  state.selectedConexionId = c.id;
  rebuildConnections();
  const inst = getInstanciaLigada(c);
  if(inst){
    openPopupForEdit(c.ownerId, c.instanciaId);
  } else {
    renderRightPanel();
  }
}

/* Lista de conexiones activas de la entidad seleccionada (Sede, Matriz o Datacenter). Cada fila
   resume el producto que representa (mismo color/nombre que su chip del catálogo) y, al hacer
   clic, abre su popup de edición. Las conexiones se crean arrastrando un producto de
   Conectividad sobre una Sede/Matriz (con o sin dropdown de destino, según el producto) o
   arrastrando el cable a mano desde el puerto (●) de la entidad. */
/* Busca, en cualquier Sede/Matriz, la instancia de Sdwan que balancea esta conexión (si hay
   alguna) — a diferencia de conexionTieneSdwan (que solo mira una entidad puntual), esta recorre
   todas, porque el Sdwan puede vivir en cualquiera de los 2 extremos de la conexión. Usada para
   mostrar el indicador "⚡ Sdwan" en la lista de Conexiones. */
function buscarSdwanQueApuntaA(conexionId){
  for(const entity of entidadesPortadoras()){
    const inst = entity.instancias.find(i=>i.subproductoId==='sdwan' && i.targetConexionId===conexionId);
    if(inst) return inst;
  }
  return null;
}

function renderConnectionsBox(entityId){
  if(!entityId){
    hideBox(connectionsBoxEl);
    return;
  }
  const conexiones = conexionesDe(entityId);
  if(conexiones.length===0){
    // Una Nube no se conecta arrastrando un cable a mano (v9 §4) — solo la elige como destino el
    // dropdown "Conectar a" de Cloud Interconnect, desde el lado de la Sede/Matriz de origen.
    const hint = tipoEntidad(entityId)==='nube'
      ? 'Sin conexiones activas. Una Nube se conecta desde el popup de Cloud Interconnect (dropdown "Conectar a"), no arrastrando un cable a mano.'
      : 'Sin conexiones activas. Arrastra desde el puerto (●) hacia otra sede, la Matriz o el Datacenter para conectar.';
    showBox(connectionsBoxEl, `<label>Conexiones</label>
      <div class="connEmpty">${hint}</div>`);
    return;
  }
  showBox(connectionsBoxEl, `<label>Conexiones</label><div class="connList" id="connListWrap"></div>`);
  const listEl = connectionsBoxEl.querySelector('#connListWrap');

  conexiones.forEach(c=>{
    const otro = otroExtremo(c, entityId);
    const tipoSub = c.subproductoId ? getSubproducto(c.subproductoId) : null;
    const iconSrc = tipoSub ? iconoUiSubproducto(tipoSub) : 'assets/ui/icons/categoria_networking.svg';
    const tipoLabel = tipoSub ? tipoSub.nombre + (c.esBackup ? ' (Backup)' : '') : (c.esBackup ? 'Backup' : '');
    const sdwanAplicado = buscarSdwanQueApuntaA(c.id);
    const sdwanTag = sdwanAplicado ? `<span class="connSdwan" title="Sdwan balanceando este canal">⚡ Sdwan</span>` : '';
    const inst = getInstanciaLigada(c);
    // El detalle mostrado sale de las propiedades reales de la instancia (Ancho de banda,
    // Ubicaciones, Nube, etc. — lo que sea que tenga ese subproducto), no de un campo aparte.
    const detalle = inst
      ? Object.values(inst.propiedades||{}).filter(Boolean).map(escapeHtml).join(' · ')
      : [c.anchoBanda, c.comparticion].filter(Boolean).map(escapeHtml).join(' · '); // compatibilidad con conexiones legado sin instancia ligada
    const isSelected = state.selectedConexionId === c.id;

    const item = document.createElement('div');
    item.className = 'connItem' + (isSelected ? ' open' : '');

    const row = document.createElement('div');
    row.className = 'connRow';
    row.innerHTML = `
      <img class="connIcon" src="${iconSrc}" alt="">
      <span class="connBody">
        <span class="connName">${escapeHtml(nombreEntidad(otro))}</span>
        ${tipoLabel ? `<span class="connTipo">${tipoLabel}</span>` : ''}
        ${detalle ? `<span class="connValor">${detalle}</span>` : ''}
        ${sdwanTag}
      </span>
      <span class="connActions">
        <button type="button" class="connArrow" title="Editar" aria-label="Editar conexión"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4"/></svg></button>
        <button type="button" class="connDelete" title="${c.esBackup ? 'Quitar este enlace de backup' : 'Eliminar conexión (y el servicio asignado que representa)'}">−</button>
      </span>`;
    row.addEventListener('click', (e)=>{
      if(e.target.classList.contains('connDelete')) return;
      abrirConexion(c);
    });
    row.querySelector('.connDelete').addEventListener('click', (e)=>{
      e.stopPropagation();
      // T07 (24/09, Dei): paso extra de seguridad. Quitar una conexión también quita el servicio
      // que la representa (salvo que sea un backup), así que el texto lo avisa.
      const subC = getSubproducto(c.subproductoId);
      const nombreC = subC ? subC.nombre : 'esta conexión';
      confirmDialog({ title: c.esBackup ? 'Quitar backup' : 'Eliminar conexión',
        body: c.esBackup
          ? `¿Seguro que quieres quitar el enlace de backup de "${nombreC}"?`
          : `¿Seguro que quieres eliminar "${nombreC}"? También se quita el servicio asignado que representa. Esta acción no se puede deshacer.`,
        confirmText: c.esBackup ? 'Quitar' : 'Eliminar' })
        .then(ok=>{ if(ok) eliminarConexion(c.id); });
    });
    item.appendChild(row);
    listEl.appendChild(item);
  });
}

