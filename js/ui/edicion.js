/* Neutraliza HTML en cualquier texto que venga del usuario (nombres de sede/Matriz/Nube, valores
   de propiedades, nombre del cliente) antes de interpolarlo en un innerHTML. Sin esto, un nombre
   con `<` o `&` rompe el marcado del panel o del reporte. */
function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str === null || str === undefined ? '' : str;
  return div.innerHTML;
}

/* Los 6 bloques del panel derecho (sede, Matriz, Nube, Datacenter, conexiones, herencia) comparten
   el mismo ciclo: si no hay nada que mostrar se vacian y se ocultan; si lo hay, se pintan y se
   muestran como columna flex. */
function hideBox(el){
  el.style.display = 'none';
  el.innerHTML = '';
}
function showBox(el, html){
  el.innerHTML = html;
  el.style.display = 'flex';
}

const sedeEditBoxEl = byId('sedeEditBox');

/* Bloque de edición de la sede seleccionada: nombre, empleados (slider 1-100 + override
   numérico libre) y sus conexiones (Matriz / Puntonet). */
function renderSedeEditBox(sede){
  if(!sede){
    hideBox(sedeEditBoxEl);
    return;
  }
  const tamano = getTamanoLocal(sede.tamano);
  const sliderVal = Math.min(sede.empleados, EMPLEADOS_SLIDER_MAX);
  showBox(sedeEditBoxEl, `
    <div class="field">
      <label>Nombre de la sede</label>
      <input type="text" id="sedeNombreInput" value="${escapeHtml(sede.nombre)}" placeholder="Nombre de la sede...">
    </div>
    <div class="field">
      <label>Empleados</label>
      <div class="empRow">
        <input type="range" id="sedeEmpleadosRange" min="1" max="${EMPLEADOS_SLIDER_MAX}" value="${sliderVal}">
        <input type="number" id="sedeEmpleadosNumber" min="1" step="1" value="${sede.empleados}">
      </div>
      <div class="tamanoInfo" id="sedeTamanoInfo">${sede.empleados} empleados · ${tamano.nombre}</div>
    </div>
    <button class="btn danger-outline block" id="btnDeleteSede">Eliminar sede</button>
  `);

  byId('sedeNombreInput').addEventListener('input', (e)=>{
    sede.nombre = e.target.value;
    updateSedeNameSprite(sede);
    navSedeLabel.textContent = sede.nombre || '(sin nombre)';
  });

  const infoEl = byId('sedeTamanoInfo');
  bindSliderNumber(
    byId('sedeEmpleadosRange'),
    byId('sedeEmpleadosNumber'),
    1, EMPLEADOS_SLIDER_MAX,
    (v)=>{
      setSedeEmpleados(sede, v);
      infoEl.textContent = `${sede.empleados} empleados · ${getTamanoLocal(sede.tamano).nombre}`;
    }
  );

  byId('btnDeleteSede').addEventListener('click', ()=>{
    confirmDialog({ title:'Eliminar sede',
      body:`¿Eliminar "${sede.nombre}" y todo lo que tiene asignado (productos y conexiones)? Esta acción no se puede deshacer.` })
      .then(ok=>{ if(ok) deleteSede(sede); });
  });
}

const herenciaBoxEl = byId('herenciaBox');

/* Sección "Herencia de Matrices": para cada Matriz CONECTADA a esta sede, lista sus productos
   propios con un checkbox para marcar si esta sede los hereda, y una "×" para quitar la herencia
   rápido. Con varias Matrices conectadas, se agrupan en bloques con el nombre de cada una. */
function renderHerenciaBox(sede){
  if(!sede){
    hideBox(herenciaBoxEl);
    return;
  }
  sede.herenciaIds = sede.herenciaIds || [];

  const conectadas = state.matrices.filter(m=>conexionExiste(sede.id, m.id));
  if(conectadas.length===0){
    showBox(herenciaBoxEl, `<label>Herencia de Matrices</label>
      <div class="herenciaEmpty">Conecta esta sede con una Matriz (arrastra desde su puerto ●) para poder heredar sus productos.</div>`);
    return;
  }
  const conProductos = conectadas.filter(m=>m.instancias.length>0);
  if(conProductos.length===0){
    showBox(herenciaBoxEl, `<label>Herencia de Matrices</label>
      <div class="herenciaEmpty">Las Matrices conectadas aún no tienen productos propios que heredar.</div>`);
    return;
  }

  const blocks = conProductos.map(m=>{
    const rows = m.instancias.map(inst=>{
      const sub = getSubproducto(inst.subproductoId);
      const checked = sede.herenciaIds.includes(inst.instanciaId);
      return `<label class="herenciaRow">
        <input type="checkbox" class="herenciaCheck" data-inst="${inst.instanciaId}" ${checked?'checked':''}>
        <img class="herenciaIcon" src="${iconoUiSubproducto(sub)}" alt="">
        <span class="herenciaName">${inst.nombreSubproducto}</span>
        ${checked ? `<span class="herenciaRemove" data-inst="${inst.instanciaId}" title="Quitar herencia">×</span>` : ''}
      </label>`;
    }).join('');
    const heading = conProductos.length>1
      ? `<div class="herenciaGroup">${escapeHtml(m.nombre)}</div>` : '';
    return heading + `<div class="herenciaList">${rows}</div>`;
  }).join('');

  showBox(herenciaBoxEl, `<label>Herencia de Matrices</label>
    ${blocks}
    <div class="toggleHint">Marca los productos de las Matrices conectadas que esta sede debe heredar.</div>`);

  herenciaBoxEl.querySelectorAll('.herenciaCheck').forEach(cb=>{
    cb.addEventListener('change', (e)=>{
      toggleHerencia(sede, e.target.dataset.inst, e.target.checked);
      renderHerenciaBox(sede);
    });
  });
  herenciaBoxEl.querySelectorAll('.herenciaRemove').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      toggleHerencia(sede, e.target.dataset.inst, false);
      renderHerenciaBox(sede);
    });
  });
}

function toggleHerencia(sede, instId, on){
  sede.herenciaIds = sede.herenciaIds || [];
  const idx = sede.herenciaIds.indexOf(instId);
  if(on && idx===-1) sede.herenciaIds.push(instId);
  if(!on && idx>=0) sede.herenciaIds.splice(idx,1);
  refreshSedeAssets(sede);
  renderSaludPanel(); // T05: lo heredado cuenta como cobertura de la Sede
}

