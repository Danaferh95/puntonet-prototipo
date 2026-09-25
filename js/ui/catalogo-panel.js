/* Catálogo del panel izquierdo (design system, fase 3b): acordeón por Vertical (solo una abierta
   a la vez). Cada Vertical es una cápsula con su medallón metálico; al abrirse muestra un
   desplegable con los Productos (N2) como encabezados de familia y cada Subproducto (N3) como
   una cápsula arrastrable con su pictograma, nombre y agarre. Las badges DC / NUBE siguen
   indicando sobre qué entidades se puede soltar. Al soltarse sobre una sede o una Matriz en el
   canvas, abre el popup de asignación (ver §5, drop handler). */
let catalogOpenVerticalId = VERTICALES[0].id;

/* Pictograma del design system (assets/ui/icons) para cada Subproducto. Asignación provisional
   hasta tener el catalog.json del paquete de entrega; si falta una clave se usa el símbolo de la
   categoría. */
const ICONO_UI_SUBPRODUCTO = {
  canal_conexion:'cliente_datos', cloud_interconnect:'cloud_interconnect', sdwan:'sdwan',
  tunel_ipsec:'red_cloud', internet_corporativo:'internet', internet_startup:'router',
  internet_teleworking:'portatil', puntonet_space:'wifi_equipo',
  collocation:'housing', crossconexion:'ethernet', iaas:'hosting', baas:'guardar', draas:'cloud_descarga',
  firewall_on_premise:'firewall', firewall_iaas:'cloud_seguro', internet_seguro:'navegador',
  edr:'endpoint', xdr:'inspeccion', seguridad_movil:'movil_cloud', correo_electronico:'correo_cloud',
  mfa:'credencial', waf:'app_segura', dns_ddos:'internet_cloud',
  conferencia:'conferencia', ofimatica:'ofimatica', portal_cautivo:'ventana', zona_wireless:'antena',
};
const ICONO_UI_VERTICAL = {
  conectividad:'categoria_conectividad', cloud:'categoria_cloud',
  ciberseguridad:'categoria_seguridad', colaboracion:'cliente_personas',
};
function iconoUiSubproducto(s){
  const p = PRODUCTOS.find(x=>x.id===s.productoNivel2Id);
  const key = ICONO_UI_SUBPRODUCTO[s.id] || (p && ICONO_UI_VERTICAL[p.verticalId]) || 'categoria_networking';
  return `assets/ui/icons/${key}.svg`;
}

function renderCatalogPanel(){
  const container = byId('productLegend');
  container.innerHTML = '';
  VERTICALES.forEach(v=>{
    const isOpen = catalogOpenVerticalId === v.id;
    const vBlock = document.createElement('div');
    vBlock.className = 'catalog-vertical' + (isOpen ? ' open' : '');

    const vHeader = document.createElement('button');
    vHeader.type = 'button';
    vHeader.className = 'catalog-vertical-header';
    vHeader.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    vHeader.innerHTML = `<span class="catalog-medallion catalog-medallion--${v.id}" aria-hidden="true"></span>`
      + `<span class="catalog-vertical-name">${v.nombre}</span>`
      + `<span class="catalog-vertical-arrow" aria-hidden="true">${isOpen ? '⌄' : '›'}</span>`;
    vHeader.addEventListener('click', ()=>{
      catalogOpenVerticalId = isOpen ? null : v.id; // clic en la ya abierta la cierra; otra la reemplaza
      renderCatalogPanel();
    });
    vBlock.appendChild(vHeader);

    const vBody = document.createElement('div');
    vBody.className = 'catalog-vertical-body';
    getProductosByVertical(v.id).forEach(p=>{
      const pRow = document.createElement('div');
      pRow.className = 'catalog-producto';
      const pLabel = document.createElement('div');
      pLabel.className = 'catalog-producto-label';
      pLabel.textContent = p.nombre;
      pRow.appendChild(pLabel);
      const chipsWrap = document.createElement('div');
      chipsWrap.className = 'catalog-chips';
      getSubproductosByProducto(p.id).forEach(s=>{
        const chipItem = document.createElement('div');
        chipItem.className = 'catalog-chip-item';
        const chip = document.createElement('div');
        chip.className = 'catalog-chip';
        chip.draggable = true;
        chip.title = `${s.nombre} — arrastra a ${nombreDestinos(s)}`;
        chip.dataset.subproductoId = s.id;
        chip.innerHTML = `<img class="catalog-chip-icon" src="${iconoUiSubproducto(s)}" alt="" draggable="false">`
          + `<span class="catalog-chip-label"></span>`
          + `<span class="catalog-chip-grip" aria-hidden="true"></span>`;
        chip.querySelector('.catalog-chip-label').textContent = s.nombre;
        chip.addEventListener('dragstart', (e)=>{
          draggingSubproductoId = s.id;
          e.dataTransfer.setData('text/plain', 'subproducto:'+s.id);
          e.dataTransfer.effectAllowed = 'copy';
        });
        chip.addEventListener('dragend', ()=>{ draggingSubproductoId = null; });
        chip.addEventListener('click', ()=>{
          if(state.placing && state.placing.tipo==='subproducto' && state.placing.id===s.id){ disarmPlacing(); return; }
          armPlacing({ tipo:'subproducto', id:s.id }, `Toca ${nombreDestinos(s)} para asignar "${s.nombre}"`);
        });
        makeTouchDraggable(chip, (x,y)=>assignSubproductoAtClientPoint(s.id,x,y), s.nombre, colorHex(getSubproductoColor(s)),
          id=>destinoValidoParaEntidad(s, id));
        chipItem.appendChild(chip);
        // Mini badges: sobre qué entidades especiales se puede soltar este producto.
        const destinos = destinosPermitidos(s);
        const badges = document.createElement('div');
        badges.className = 'chip-badges';
        if(destinos.includes('datacenter')){
          const badge = document.createElement('span');
          badge.className = 'chip-dc-badge';
          badge.textContent = 'DC';
          badges.appendChild(badge);
        }
        if(destinos.includes('nube')){
          const badge = document.createElement('span');
          badge.className = 'chip-dc-badge badge-nube';
          badge.textContent = 'NUBE';
          badges.appendChild(badge);
        }
        if(badges.childElementCount) chipItem.appendChild(badges);
        chipsWrap.appendChild(chipItem);
      });
      pRow.appendChild(chipsWrap);
      vBody.appendChild(pRow);
    });
    vBlock.appendChild(vBody);
    container.appendChild(vBlock);
  });
}
function renderRightPanel(){
  renderSaludPanel();
  const ids = state.selectedSedeIds;
  navActions.innerHTML = '';

  if(ids.length===0){
    navEmpty.style.display='block';
    navContent.style.display='none';
    instanceSection.style.display='none';
    return;
  }
  navEmpty.style.display='none';
  navContent.style.display='block';

  const singleId = ids.length===1 ? ids[0] : null;
  const isMatriz = !!singleId && state.matrices.some(m=>m.id===singleId);
  const isNube = !!singleId && state.nubes.some(n=>n.id===singleId);
  const isDatacenter = singleId==='datacenter';
  const isSedeSingle = !!singleId && !isMatriz && !isNube && !isDatacenter;

  const nombres = ids.map(id=>getSedeById(id).nombre);
  // Design system (fase 4a): el nombre va solo, grande; el tipo de entidad pasa a la línea de
  // abajo y el render de la entidad se muestra arriba (clase detail-asset--<tipo>).
  const esNubeAuto = isNube && getNubeById(singleId) && getNubeById(singleId).esAutoInternet;
  navSedeLabel.textContent = isDatacenter ? 'Datacenter Epicentro'
    : ids.length===1 ? (nombres[0] || '(sin nombre)')
    : `${ids.length} entidades seleccionadas`;
  navSedeLabel.classList.toggle('is-multi', ids.length>1);
  navSedeSub.textContent = isMatriz ? 'Matriz'
    : isNube ? (esNubeAuto ? 'Nube · automática de Internet' : 'Nube')
    : isDatacenter ? 'Datacenter Puntonet'
    : ids.length===1 ? 'Sede'
    : nombres.join(' · ');
  const assetTipo = isMatriz ? 'matriz' : isNube ? 'nube' : isDatacenter ? 'epicentro' : isSedeSingle ? 'sede' : '';
  navAsset.className = 'detail-asset' + (assetTipo ? ' detail-asset--' + assetTipo : '');

  matrizHintEl.style.display = (isMatriz || isNube || isDatacenter) ? 'block' : 'none';
  matrizHintEl.textContent = isMatriz
    ? 'Arrastra un producto desde el panel izquierdo sobre esta Matriz para agregarlo como producto propio.'
    : isNube
      ? 'Arrastra un producto de Hosting (IaaS/BaaS/DRaaS) desde el panel izquierdo sobre esta Nube para agregarlo como producto propio.'
      : isDatacenter
      ? 'Arrastra sobre el Datacenter un producto de Cloud (Housing/Hosting), un Canal de Conexión, un Internet Corporativo o un producto de seguridad (Firewall On Premise/IaaS, WAF, DNS/DDoS) para agregarlo como producto propio. También puedes tender un cable a mano desde el puerto (●) de una sede o Matriz hasta aquí.'
      : '';

  renderSedeEditBox(isSedeSingle ? getSedeById(singleId) : null);
  renderMatrizEditBox(isMatriz ? getMatrizById(singleId) : null);
  renderNubeEditBox(isNube ? getNubeById(singleId) : null);
  renderDatacenterEditBox(isDatacenter ? state.datacenter : null);
  renderConnectionsBox(singleId);
  renderHerenciaBox(isSedeSingle ? getSedeById(singleId) : null);
  // Design system (fase 4b): el botón "Eliminar …" de cada bloque va al pie del panel, después
  // de conexiones y productos. Se mueve el mismo nodo, así que conserva su listener.
  navContent.querySelectorAll('.editBox > .btn.danger-outline').forEach(btn=>navActions.appendChild(btn));

  if(ids.length===1){
    const entity = getSedeById(ids[0]);
    instanceSectionTitle.textContent = isMatriz ? 'Productos de la Matriz'
      : isNube ? 'Productos de la Nube'
      : isDatacenter ? 'Productos del Datacenter'
      : 'Servicios asignados';
    // Los productos `ocultaEnServiciosAsignados` (Canal de Conexión, Cloud Interconnect) viven únicamente
    // en el panel "Conexiones": ahí sí se ve a qué sede/Matriz están conectados, mientras que acá
    // solo se vería el nombre del producto sin ese contexto — confuso. Sdwan y los productos de
    // Internet SÍ se siguen mostrando acá (sus nombres se entienden solos, con o sin destino).
    const visibles = entity.instancias.filter(inst=>!getSubproducto(inst.subproductoId).ocultaEnServiciosAsignados);
    if(visibles.length>0){
      instanceSection.style.display='block';
      instanceListEl.innerHTML='';
      visibles.forEach(inst=>{
        const vertical = getVertical(inst.verticalId);
        const sub = getSubproducto(inst.subproductoId);
        // Sdwan (v9 §3, ajustado): el nombre solo no dice a qué canal se está aplicando — se
        // agrega el destino inline, igual que Canal de Conexión/Cloud Interconnect en el reporte.
        let nombreMostrado = inst.nombreSubproducto;
        if(sub.id==='sdwan'){
          const target = inst.targetConexionId ? state.conexiones.find(c=>c.id===inst.targetConexionId) : null;
          nombreMostrado += target
            ? ` <span class="muted-inline">→ ${escapeHtml(nombreEntidad(otroExtremo(target, entity.id)))}</span>`
            : ` <span class="muted-inline">(sin canal aplicado)</span>`;
        }
        const row = document.createElement('div');
        row.className='inst-row';
        row.innerHTML = `<img class="inst-icon" src="${iconoUiSubproducto(sub)}" alt="">
          <span class="inst-body">
            <span class="inst-name">${nombreMostrado}</span>
            <span class="inst-vertical">${vertical.nombre}</span>
          </span>
          <button type="button" class="inst-delete" title="Quitar producto" aria-label="Quitar ${escapeHtml(sub.nombre)}">−</button>`;
        row.addEventListener('click', ()=>openPopupForEdit(entity.id, inst.instanciaId));
        row.querySelector('.inst-delete').addEventListener('click', (e)=>{
          e.stopPropagation();
          // T07 (24/09, Dei): paso extra de seguridad antes de quitar un producto.
          confirmDialog({ title:'Quitar producto',
            body:`¿Seguro que quieres quitar "${sub.nombre}" de "${entity.nombre}"? Esta acción no se puede deshacer.`,
            confirmText:'Quitar' })
            .then(ok=>{ if(ok) deleteInstanceDirect(entity, inst.instanciaId); });
        });
        instanceListEl.appendChild(row);
      });
    } else {
      instanceSection.style.display='none';
    }
  } else {
    instanceSection.style.display='none';
  }
}

