/* =========================================================================
   7. POPUP DE PERSONALIZACIÓN (crear / editar instancia)
   ========================================================================= */

const popupOverlay = byId('popupOverlay');
const popupPath = byId('popupPath');
const popupTitle = byId('popupTitle');
const popupEslogan = byId('popupEslogan');
const popupDesc = byId('popupDesc');
const popupMultiTags = byId('popupMultiTags');
const popupMarca = byId('popupMarca');
const popupMarcaField = byId('popupMarcaField');
const popupProps = byId('popupProps');
const popupNotas = byId('popupNotas');
const btnDeleteInstance = byId('btnDeleteInstance');
const popupConexionField = byId('popupConexionField');
const popupConexionSelect = byId('popupConexionSelect');
const popupConexionHint = byId('popupConexionHint');
const popupBackupField = byId('popupBackupField');
const popupBackupCheckbox = byId('popupBackupCheckbox');
const popupSdwanField = byId('popupSdwanField');
const popupSdwanSelect = byId('popupSdwanSelect');
const popupSdwanHint = byId('popupSdwanHint');

/* Marca (Nivel 4) deja de ser relevante para Conectividad (v9 §1): ahí la marca del enlace no es
   un dato que el vendedor cotice (a diferencia de Ciberseguridad/Colaboración, donde sí importa
   Fortinet/Cisco/Microsoft/etc.). Se oculta el campo entero, no solo se deja vacío. */
function updatePopupMarcaVisibility(verticalId){
  popupMarcaField.style.display = verticalId==='conectividad' ? 'none' : 'block';
}

/* Checkbox "Backup" (v9 §2): solo visible para subproductos marcados `permiteBackup` en el
   catálogo. El valor mostrado sale de `inst.backup` (edición) o arranca desvinculado (alta). */
function renderPopupBackupField(sub, inst){
  if(!sub.permiteBackup){
    popupBackupField.style.display = 'none';
    popupBackupCheckbox.checked = false;
    return;
  }
  popupBackupField.style.display = 'block';
  popupBackupCheckbox.checked = !!(inst && inst.backup);
}

/* --- Sdwan como balanceador sobre un canal existente (ajuste post-v9 §3) ---
   Sdwan ya no genera su propio cable ni se aplica "a la sede en general": se aplica sobre UNA
   conexión ya existente de esa sede (Canal de Conexión, Cloud Interconnect, Internet, Túnel
   IPsec), elegida en este dropdown — el ícono se dibuja sobre esa conexión (ver
   rebuildSdwanBadges), no flotando sobre la sede. No se listan los enlaces de Backup por
   separado (son la misma contratación que su enlace principal). */
function conexionesAplicablesParaSdwan(entityId){
  return conexionesDe(entityId).filter(c=>!c.esBackup);
}
/* ¿Esta conexión ya tiene un Sdwan aplicado (de OTRA instancia, no la que se está editando)? Se
   usa para deshabilitar esa opción en el dropdown — cada conexión admite un solo Sdwan. */
function conexionTieneSdwan(entityId, conexionId, excludeInstanciaId){
  const entity = getSedeById(entityId);
  return entity.instancias.some(inst=>
    inst.subproductoId==='sdwan' && inst.targetConexionId===conexionId && inst.instanciaId!==excludeInstanciaId);
}
function renderPopupSdwanField(sub, ids, inst){
  if(!sub.requiereConexionExistente || ids.length!==1){
    popupSdwanField.style.display = 'none';
    popupSdwanSelect.innerHTML = '';
    popupSdwanSelect.style.display = '';
    popupSdwanHint.style.display = 'none';
    return;
  }
  const entityId = ids[0];
  const excludeInstanciaId = inst ? inst.instanciaId : null;
  const candidatos = conexionesAplicablesParaSdwan(entityId);
  popupSdwanField.style.display = 'block';
  if(candidatos.length===0){
    popupSdwanSelect.style.display = 'none';
    popupSdwanSelect.innerHTML = '';
    popupSdwanHint.style.display = 'block';
    popupSdwanHint.textContent = 'Esta sede todavía no tiene canales (Canal de Conexión, Cloud Interconnect, Internet, Túnel IPsec) — agrega uno primero y luego vuelve a aplicar Sdwan.';
    return;
  }
  popupSdwanSelect.style.display = '';
  popupSdwanHint.style.display = 'none';
  const actual = inst ? inst.targetConexionId : null;
  const opciones = ['<option value="">Sin aplicar por ahora</option>']
    .concat(candidatos.map(c=>{
      const otro = otroExtremo(c, entityId);
      const tipoSub = c.subproductoId ? getSubproducto(c.subproductoId) : null;
      const ocupada = conexionTieneSdwan(entityId, c.id, excludeInstanciaId);
      const label = `${tipoSub ? tipoSub.nombre : 'Conexión'} → ${escapeHtml(nombreEntidad(otro))}${ocupada ? ' (ya tiene Sdwan)' : ''}`;
      const selected = c.id===actual ? ' selected' : '';
      const disabled = ocupada ? ' disabled' : '';
      return `<option value="${c.id}"${selected}${disabled}>${label}</option>`;
    }));
  popupSdwanSelect.innerHTML = opciones.join('');
  if(!actual) popupSdwanSelect.value = '';
}

/* Elimina cualquier instancia de Sdwan (en cualquier Sede/Matriz) que apunte a una conexión que
   está a punto de desaparecer — un Sdwan sin canal que balancear no tiene sentido. Se llama desde
   todos los puntos donde una `conexion` se borra directamente (eliminarConexion y los borrados en
   cascada de deleteSede/deleteInstanceDirect que no pasan por eliminarConexion). */
function limpiarSdwanQueApuntanA(conexionId){
  entidadesPortadoras().forEach(entity=>{
    const antes = entity.instancias.length;
    entity.instancias = entity.instancias.filter(inst=>
      !(inst.subproductoId==='sdwan' && inst.targetConexionId===conexionId));
    if(entity.instancias.length!==antes) refreshSedeAssets(entity);
  });
}

let popupContext = null; // { mode:'new', subproductoId, sedeIds } | { mode:'edit', sedeId, instanciaId }

function openPopupForNew(subproductoId, targetIds){
  const sub = getSubproducto(subproductoId);
  const producto = getProducto(sub.productoNivel2Id);
  const vertical = getVertical(producto.verticalId);
  const ids = targetIds || [...state.selectedSedeIds];
  popupContext = { mode:'new', subproductoId, sedeIds: ids };

  const primer = getSedeById(ids[0]);
  popupPath.textContent = ids.length===1
    ? `${vertical.nombre} › ${producto.nombre} · ${primer.nombre}`
    : `${vertical.nombre} › ${producto.nombre}`;
  popupTitle.textContent = sub.nombre;
  popupEslogan.textContent = sub.eslogan || '';
  popupDesc.textContent = sub.descripcion;
  popupMarca.value='';
  popupNotas.value='';
  btnDeleteInstance.style.display='none';
  updatePopupMarcaVisibility(vertical.id);
  renderPopupBackupField(sub, null);
  renderPopupSdwanField(sub, ids, null);

  popupMultiTags.innerHTML='';
  if(popupContext.sedeIds.length>1){
    const label = document.createElement('div');
    label.style.marginTop='8px';
    label.innerHTML = 'Se asignará una instancia independiente a: ';
    popupContext.sedeIds.forEach(id=>{
      const sede = getSedeById(id);
      const tag = document.createElement('span');
      tag.className='multi-tag'; tag.textContent = sede.nombre;
      label.appendChild(tag);
    });
    popupMultiTags.appendChild(label);
  }

  renderPopupProps(sub.parametros, {}, sub.parametrosTipos || {});
  renderPopupConexionField(sub, ids);
  popupOverlay.classList.add('show');
  focusFirstPopupField();
}

/* --- Dropdown "Conectar a" del popup: aplica a subproductos `conexion:'entreSedes'`
   (Canal de Conexión, Sdwan), tanto al crear la instancia como al editarla después — antes solo
   se podía conectar arrastrando el cable a mano desde el puerto; ahora también se puede resolver
   la conexión pendiente reabriendo el popup del producto y eligiendo el destino ahí. Solo
   aplica cuando se asigna/edita UNA sola sede/Matriz a la vez (el multi-asignado a varias sedes
   a la vez no intenta adivinar destinos individuales; el vendedor puede crear esos cables a mano
   después, arrastrando desde el puerto — ver §5), y solo si esa instancia todavía NO tiene una
   conexión ligada (si ya está conectada, no se ofrece cambiar el destino desde acá).
   Los candidatos son TODAS las demás Sedes/Matrices, estén o no ya conectadas a esta: cada
   producto `entreSedes` es un servicio independiente con su propia instancia y su propio cable
   (p.ej. Canal de Conexión Y Sdwan pueden existir entre las mismas 2 sedes a la vez), así que no
   se excluyen pares ya conectados — eso llevaba a que, al agregar un segundo producto de este
   tipo a una sede que ya tenía uno, la única Matriz/Sede disponible desapareciera del dropdown. */
/* Tipos de entidad que puede listar el dropdown "Conectar a" de un subproducto `entreSedes`.
   Igual que destinosPermitidos() pero para el otro extremo del cable: sin campo en el catálogo,
   Sedes y Matrices (comportamiento histórico de Canal de Conexión / Túnel IPsec). */
function destinosConexionPermitidos(sub){
  return (sub && sub.destinosConexion) || ['sede','matriz'];
}
function candidatosConexionEntreSedes(entityId, sub){
  const tipos = destinosConexionPermitidos(sub);
  const candidatos = [];
  candidatos.push(...entidadesPortadoras().filter(e=>tipos.includes(tipoEntidad(e.id))));
  // Nubes: se excluye la Nube automática de Internet (pedido cliente 28/08/2026 — "Cloud
  // Interconnect solo se puede conectar a Azure, no al internet"). Es una salida a Internet
  // compartida que administra la propia app (getOrCreateNubeInternetAuto), no una nube de
  // proveedor contra la que se pueda tender un enlace privado.
  if(tipos.includes('nube')) candidatos.push(...state.nubes.filter(n=>!n.esAutoInternet));
  // El Datacenter solo es candidato mientras siga en el proyecto (ver deleteDatacenter).
  if(tipos.includes('datacenter') && state.datacenter.activo) candidatos.push(state.datacenter);
  return candidatos.filter(e=>e.id!==entityId && parValidoConexion(entityId, e.id));
}
function instanciaTieneConexionLigada(instanciaId){
  return state.conexiones.some(c=>c.instanciaId===instanciaId);
}

const CONEXION_NUEVA_SEDE = '__nueva_sede__';
const CONEXION_NUEVA_MATRIZ = '__nueva_matriz__';
const CONEXION_NUEVA_NUBE = '__nueva_nube__';
let popupConexionEntityId = null; // entidad "origen" vigente en el popup, para el listener de abajo
let popupConexionSub = null;      // subproducto vigente en el popup, para saber qué tipo de candidatos listar

/* Dibuja las opciones del <select>: candidatos existentes + accesos rápidos para crear una
   entidad nueva al vuelo si todavía no hay ninguna disponible (o si igual se quiere agregar
   otra) — se ubica sola en una celda libre de la grilla, sin que el vendedor tenga que ir a
   arrastrarla y colocarla aparte. Qué se lista depende de `destinosConexion` del subproducto
   (§1): Canal de Conexión lista Sedes, Matrices y el Datacenter Epicentro (ago/2026); Cloud
   Interconnect lista solo Nubes de proveedor, sin la Nube automática de Internet (v9 §4 +
   pedido cliente 28/08/2026); Túnel IPsec, Sedes y Matrices.
   v10 (31/07/2026): ya NO se ofrece "Sin conectar por ahora" — Canal de Conexión, Cloud
   Interconnect y Túnel IPsec (los 3 únicos que usan este dropdown) ahora requieren
   obligatoriamente un destino antes de poder guardar (ver validación en btnSavePopup más abajo),
   así que ofrecer la opción de dejarlo sin resolver iba contra esa regla. */
const ETIQUETA_TIPO_ENTIDAD = { sede:'Sede', matriz:'Matriz', nube:'Nube', datacenter:'Datacenter' };
function renderPopupConexionOptions(entityId, sub){
  const tipos = destinosConexionPermitidos(sub);
  const candidatos = candidatosConexionEntreSedes(entityId, sub);
  // Placeholder NO seleccionable (disabled): a diferencia de la vieja "Sin conectar por ahora",
  // esto no es una opción válida para guardar (la validación de btnSavePopup la rechaza igual que
  // a un valor vacío) — está solo para que el <select> nunca arranque con una sola opción real ya
  // pre-seleccionada por el navegador (si eso pasara, el usuario no podría "reelegirla" para
  // disparar el evento change y resolverla — típico caso: recién se crea la primera Sede del
  // proyecto y el único candidato es "+ Agregar nueva Matriz").
  // Accesos "+ Agregar ..." solo para los tipos que se pueden crear al vuelo. El Datacenter
  // Epicentro no está: es único y fijo, ya existe o fue eliminado del proyecto (en cuyo caso
  // tampoco es candidato — se restaura desde el panel izquierdo, no desde acá).
  const nuevos = [];
  if(tipos.includes('sede')) nuevos.push(`<option value="${CONEXION_NUEVA_SEDE}">+ Agregar nueva Sede</option>`);
  if(tipos.includes('matriz')) nuevos.push(`<option value="${CONEXION_NUEVA_MATRIZ}">+ Agregar nueva Matriz</option>`);
  if(tipos.includes('nube')) nuevos.push(`<option value="${CONEXION_NUEVA_NUBE}">+ Agregar nueva Nube</option>`);
  const opciones = ['<option value="" disabled selected>Elegí un destino…</option>']
    .concat(candidatos.map(e=>`<option value="${e.id}">${escapeHtml(e.nombre)} (${ETIQUETA_TIPO_ENTIDAD[tipoEntidad(e.id)]})</option>`))
    .concat(nuevos);
  popupConexionSelect.innerHTML = opciones.join('');
}
// Un solo listener persistente (no uno nuevo por cada render): si se elige una de las opciones
// "+ Agregar...", crea la entidad de una vez, refresca la lista de opciones y la deja
// seleccionada — lista para guardarse como destino al aceptar el popup.
popupConexionSelect.addEventListener('change', ()=>{
  const val = popupConexionSelect.value;
  if(val!==CONEXION_NUEVA_SEDE && val!==CONEXION_NUEVA_MATRIZ && val!==CONEXION_NUEVA_NUBE) return;
  let nueva;
  if(val===CONEXION_NUEVA_NUBE){
    // El proveedor se pide con el diálogo propio (asíncrono): la Nube se crea al responder.
    popupConexionSelect.value = '';
    pedirProveedorNube().then(nombre=>{
      const {gx,gz} = nearestFreeCell(0, 0, null, huellaDeClave('nube'));
      const nube = createNube(nombre, gx, gz);
      showToast(`"${nube.nombre}" agregada — ya puedes conectarte a ella.`);
      renderPopupConexionOptions(popupConexionEntityId, popupConexionSub);
      popupConexionSelect.value = nube.id;
    });
    return;
  } else {
    const huellaNueva = val===CONEXION_NUEVA_SEDE
      ? huellaDeSedePorEmpleados(EMPLEADOS_DEFAULT) : huellaDeClave('matriz');
    const {gx,gz} = nearestFreeCell(0, 0, null, huellaNueva);
    nueva = val===CONEXION_NUEVA_SEDE ? createSede(EMPLEADOS_DEFAULT, gx, gz) : createMatriz(gx, gz);
  }
  showToast(`"${nueva.nombre}" agregada — ya puedes conectarte a ella.`);
  renderPopupConexionOptions(popupConexionEntityId, popupConexionSub);
  popupConexionSelect.value = nueva.id;
});

function renderPopupConexionField(sub, ids, yaConectada){
  popupConexionSelect.style.borderColor = ''; // limpia el resalte de error de un intento previo
  if(sub.conexion!=='entreSedes' || ids.length!==1 || yaConectada){
    popupConexionField.style.display = 'none';
    popupConexionSelect.innerHTML = '';
    popupConexionHint.style.display = 'none';
    popupConexionEntityId = null;
    popupConexionSub = null;
    return;
  }
  popupConexionEntityId = ids[0];
  popupConexionSub = sub;
  popupConexionField.style.display = 'block';
  popupConexionSelect.style.display = '';
  popupConexionHint.style.display = 'none';
  renderPopupConexionOptions(ids[0], sub);
}

/* Crea (si corresponde) el cable elegido en el dropdown "Conectar a", ligado a la instancia
   indicada — reutilizada tanto al crear la instancia como al editarla después. No se excluye el
   caso en que ya exista otra conexión entre el mismo par: cada producto `entreSedes` es un
   cable propio (ver candidatosConexionEntreSedes). */
function crearConexionDesdeDropdownSiAplica(sub, origenId, instanciaId){
  if(sub.conexion!=='entreSedes') return;
  const destinoId = popupConexionSelect.value;
  if(!destinoId || destinoId===CONEXION_NUEVA_SEDE || destinoId===CONEXION_NUEVA_MATRIZ || destinoId===CONEXION_NUEVA_NUBE) return;
  if(!parValidoConexion(origenId, destinoId)) return;
  state.conexiones.push({
    id: uid('conn','nextConexionSeq'), aId:origenId, bId:destinoId,
    subproductoId: sub.id, instanciaId, ownerId: origenId,
  });
}

/* --- Backup / doble enlace (v9 §2) ---
   Sincroniza el segundo enlace en paralelo según el checkbox "Backup" del popup: si `inst.backup`
   está activo y ya existe el enlace principal de esta instancia, crea (si falta) una segunda
   `conexion` con el MISMO destino/subproducto/instanciaId, marcada `esBackup:true` — no es un
   producto nuevo, es "la misma contratación con respaldo" (comparte instanciaId/ownerId con el
   enlace principal, así que se edita desde el mismo popup y cuenta como el mismo servicio). Si el
   checkbox se desmarca, quita el enlace de backup existente sin tocar el principal ni la
   instancia. Sin efecto para subproductos sin `permiteBackup` o sin enlace principal todavía
   (p.ej. Canal de Conexión/Cloud Interconnect guardado como "Sin conectar por ahora": el backup
   se resuelve solo cuando se complete el destino, reabriendo el popup). */
function syncBackupConexion(inst){
  const sub = getSubproducto(inst.subproductoId);
  if(!sub.permiteBackup) return;
  const primaria = state.conexiones.find(c=>c.instanciaId===inst.instanciaId && !c.esBackup);
  const backupExistente = state.conexiones.find(c=>c.instanciaId===inst.instanciaId && c.esBackup);
  if(inst.backup && primaria && !backupExistente){
    state.conexiones.push({
      id: uid('conn','nextConexionSeq'), aId:primaria.aId, bId:primaria.bId,
      subproductoId: primaria.subproductoId, instanciaId: inst.instanciaId, ownerId: primaria.ownerId,
      esBackup: true,
    });
  } else if(!inst.backup && backupExistente){
    state.conexiones = state.conexiones.filter(c=>c.id!==backupExistente.id);
    if(state.selectedConexionId===backupExistente.id) state.selectedConexionId = null;
  }
}

function openPopupForEdit(sedeId, instanciaId){
  const sede = getSedeById(sedeId);
  const inst = sede.instancias.find(i=>i.instanciaId===instanciaId);
  const sub = getSubproducto(inst.subproductoId);
  const producto = getProducto(sub.productoNivel2Id);
  const vertical = getVertical(inst.verticalId);
  popupContext = { mode:'edit', sedeId, instanciaId };

  popupPath.textContent = `${vertical.nombre} › ${producto.nombre} · ${sede.nombre}`;
  popupTitle.textContent = sub.nombre;
  popupEslogan.textContent = sub.eslogan || '';
  popupDesc.textContent = sub.descripcion;
  popupMarca.value = inst.marca || '';
  popupNotas.value = inst.notas || '';
  popupMultiTags.innerHTML='';
  btnDeleteInstance.style.display='inline-block';
  updatePopupMarcaVisibility(vertical.id);
  renderPopupBackupField(sub, inst);
  renderPopupSdwanField(sub, [sedeId], inst);
  renderPopupConexionField(sub, [sedeId], instanciaTieneConexionLigada(instanciaId));

  renderPopupProps(sub.parametros, inst.propiedades || {}, sub.parametrosTipos || {});
  popupOverlay.classList.add('show');
  focusFirstPopupField();
}

/* Enfoca el primer campo del popup apenas se muestra (ahora el primer atributo, ya que es
   el primer campo del formulario) para que el usuario pueda empezar a escribir de inmediato. */
function focusFirstPopupField(){
  requestAnimationFrame(()=>{
    const target = popupProps.querySelector('input') || popupMarca;
    target.focus();
    if(target.select) target.select();
  });
}

/* Propiedades del popup (v10, 31/07/2026): antes todo era texto libre — ahora cada parámetro
   puede declarar un `tipo` en `parametrosTipos` del catálogo (§1) para renderizarse distinto:
     'checkbox'   → Sí/No (p.ej. Controladora, Con/sin firewall).
     'numero'     → input numérico simple (p.ej. Número de IPs públicas).
     'anchoBanda' → slider 0-1000 Mbps + campo numérico libre (mismo patrón que "Empleados" de
                    Sede — el valor tipeado manda, el slider solo ayuda a elegir rápido). Se
                    guarda ya formateado ("500 Mbps"/"1.5 Gbps") vía formatAnchoBandaMbps, así el
                    resto de la app (reporte, PDF) no necesita saber que es un tipo especial.
     (sin tipo)   → texto libre, igual que antes.
   Ya no se recorta a 3 parámetros (antes `sub.parametros.slice(0,3)` en los 2 call-sites) —
   Zona Wireless pasó a tener 4 tras este cambio. */
function renderPopupProps(parametros, valores, tipos){
  tipos = tipos || {};
  popupProps.innerHTML='';
  parametros.forEach((nombreProp, i)=>{
    const tipo = tipos[nombreProp] || 'texto';
    const field = document.createElement('div');
    field.className='field';

    if(tipo==='checkbox'){
      field.innerHTML = `<label class="toggleRow"><input type="checkbox" data-prop-name="${escapeHtml(nombreProp)}" ${valores[nombreProp]==='Sí' ? 'checked' : ''}> ${escapeHtml(nombreProp)}</label>`;
      popupProps.appendChild(field);
      return;
    }

    if(tipo==='anchoBanda'){
      const mbpsActual = parseAnchoBandaMbps(valores[nombreProp]);
      const sliderVal = Math.min(mbpsActual, ANCHO_BANDA_SLIDER_MAX);
      const label = document.createElement('label');
      label.textContent = `Propiedad ${i+1} (${nombreProp})`;
      field.appendChild(label);
      const row = document.createElement('div');
      row.className = 'empRow';
      row.innerHTML = `<input type="range" min="0" max="${ANCHO_BANDA_SLIDER_MAX}" value="${sliderVal}" class="popupAnchoBandaRange"><input type="number" min="0" step="1" value="${mbpsActual}" class="popupAnchoBandaNumber" data-prop-name="${escapeHtml(nombreProp)}" data-format="anchoBanda">`;
      field.appendChild(row);
      const info = document.createElement('div');
      info.className = 'tamanoInfo';
      info.textContent = formatAnchoBandaMbps(mbpsActual);
      field.appendChild(info);
      popupProps.appendChild(field);

      bindSliderNumber(
        row.querySelector('.popupAnchoBandaRange'),
        row.querySelector('.popupAnchoBandaNumber'),
        0, ANCHO_BANDA_SLIDER_MAX,
        (v)=>{ info.textContent = formatAnchoBandaMbps(v); }
      );
      return;
    }

    // 'texto' (default) y 'numero' comparten markup — solo cambia el type del input.
    const label = document.createElement('label');
    label.textContent = `Propiedad ${i+1} (${nombreProp})`;
    const input = document.createElement('input');
    input.type = tipo==='numero' ? 'number' : 'text';
    if(tipo==='numero') input.min = '0';
    input.dataset.propName = nombreProp;
    input.value = valores[nombreProp] || '';
    input.placeholder = `Ingresar ${nombreProp.toLowerCase()}...`;
    field.appendChild(label);
    field.appendChild(input);
    popupProps.appendChild(field);
  });
}

byId('btnCancelPopup').addEventListener('click', closePopup);
function closePopup(){
  popupOverlay.classList.remove('show');
  popupContext = null;
}

byId('btnSavePopup').addEventListener('click', ()=>{
  if(!popupContext) return;

  // Destino obligatorio (pedido cliente 31/07/2026): Canal de Conexión, Cloud Interconnect y
  // Túnel IPsec son los 3 únicos subproductos que muestran este campo (renderPopupConexionField,
  // sub.conexion==='entreSedes') — antes se podía guardar sin elegir destino y la instancia
  // quedaba creada sin ningún cable, "en el aire", sin ninguna señal de que le faltaba algo.
  if(popupConexionField.style.display!=='none'){
    const val = popupConexionSelect.value;
    const sinResolver = !val || val===CONEXION_NUEVA_SEDE || val===CONEXION_NUEVA_MATRIZ || val===CONEXION_NUEVA_NUBE;
    if(sinResolver){
      showToast('Elegí a quién conectar antes de guardar — este producto siempre necesita un destino.');
      popupConexionSelect.style.borderColor = 'var(--pn-color-coral)';
      popupConexionSelect.focus();
      return;
    }
  }

  const propiedades = {};
  // Solo los inputs "de verdad" llevan data-prop-name (p.ej. el slider de Ancho de banda NO lo
  // lleva, solo su campo numérico gemelo) — así no se pisan ni se guardan valores fantasma.
  popupProps.querySelectorAll('[data-prop-name]').forEach(inp=>{
    if(inp.type==='checkbox'){
      propiedades[inp.dataset.propName] = inp.checked ? 'Sí' : 'No';
    } else if(inp.dataset.format==='anchoBanda'){
      propiedades[inp.dataset.propName] = formatAnchoBandaMbps(Math.max(0, parseFloat(inp.value)||0));
    } else {
      propiedades[inp.dataset.propName] = inp.value;
    }
  });
  const marca = popupMarca.value.trim();
  const notas = popupNotas.value.trim();
  const backup = popupBackupField.style.display!=='none' && popupBackupCheckbox.checked;
  const targetConexionId = (popupSdwanField.style.display!=='none' && popupSdwanSelect.style.display!=='none')
    ? (popupSdwanSelect.value || null) : null;

  if(popupContext.mode==='new'){
    const sub = getSubproducto(popupContext.subproductoId);
    const producto = getProducto(sub.productoNivel2Id);
    const instanciaPorSedeId = {}; // para poder ligar la conexión (auto o por dropdown) a la instancia recién creada
    popupContext.sedeIds.forEach(sedeId=>{
      const sede = getSedeById(sedeId);
      const instancia = {
        instanciaId: uid('inst','nextInstanceSeq'),
        subproductoId: sub.id,
        verticalId: producto.verticalId,
        nombreSubproducto: sub.nombre,
        propiedades, notas, marca, backup, targetConexionId,
        creadoEn: new Date().toISOString(),
      };
      sede.instancias.push(instancia);
      instanciaPorSedeId[sedeId] = instancia;
      refreshSedeAssets(sede);
      // El Datacenter ya no se excluye acá (ago/2026): con Internet Corporativo asignado a él,
      // la auto-conexión hacia la Nube de Internet es justamente el "canal dedicado del
      // datacenter al internet" que pidió el cliente. ensureConexionAutomatica descarta sola el
      // caso Datacenter → Datacenter.
      if(generaConexionAutomatica(sub)){
        ensureConexionAutomatica(sedeId, sub.id, instancia.instanciaId);
      }
    });
    // Canal de Conexión / Cloud Interconnect: si se eligió un destino en el dropdown "Conectar
    // a", crea el cable manual entre la sede/Matriz (o Nube) asignada y ese destino, ligado a la
    // MISMA instancia que se acaba de crear arriba — no es un registro aparte, es su
    // representación como cable.
    if(popupContext.sedeIds.length===1){
      crearConexionDesdeDropdownSiAplica(sub, popupContext.sedeIds[0], instanciaPorSedeId[popupContext.sedeIds[0]].instanciaId);
    }
    // Backup: se resuelve DESPUÉS de crear el/los enlace(s) principal(es) de cada instancia
    // recién creada, para cada sede asignada (multi-asignado incluido).
    popupContext.sedeIds.forEach(sedeId=> syncBackupConexion(instanciaPorSedeId[sedeId]));
    rebuildConnections();
  } else if(popupContext.mode==='edit'){
    const sede = getSedeById(popupContext.sedeId);
    const inst = sede.instancias.find(i=>i.instanciaId===popupContext.instanciaId);
    inst.propiedades = propiedades;
    inst.notas = notas;
    inst.marca = marca;
    inst.backup = backup;
    inst.targetConexionId = targetConexionId;
    refreshSedeAssets(sede);
    // Si el producto es Canal de Conexión/Cloud Interconnect y todavía no tenía cable (por eso
    // se mostró el dropdown), y el vendedor eligió un destino ahora, se crea recién en este momento.
    const sub = getSubproducto(inst.subproductoId);
    crearConexionDesdeDropdownSiAplica(sub, popupContext.sedeId, popupContext.instanciaId);
    syncBackupConexion(inst);
    rebuildConnections();
  }
  closePopup();
  renderRightPanel();
});

/* Elimina un producto propio (de una sede o de una Matriz) sin pasar por el popup. Si el
   producto pertenece a una Matriz, también limpia la herencia en las sedes que lo tenían marcado.
   Si esta instancia era la que originó un cable (conexion.instanciaId), el cable es la MISMA
   cosa que el producto — no un registro aparte — así que se elimina junto con ella. */
function deleteInstanceDirect(entity, instanciaId){
  entity.instancias = entity.instancias.filter(i=>i.instanciaId!==instanciaId);
  // Una instancia puede tener HASTA 2 conexiones ligadas (la principal + su backup, v9 §2):
  // se borran ambas, no solo la primera que se encuentre.
  const conexionesLigadas = state.conexiones.filter(c=>c.instanciaId===instanciaId);
  if(conexionesLigadas.length){
    const idsLigados = new Set(conexionesLigadas.map(c=>c.id));
    state.conexiones = state.conexiones.filter(c=>!idsLigados.has(c.id));
    conexionesLigadas.forEach(c=> limpiarSdwanQueApuntanA(c.id));
    if(state.selectedConexionId && idsLigados.has(state.selectedConexionId)) state.selectedConexionId = null;
  }
  if(entity.tipo==='matriz'){
    state.sedes.forEach(s=>{
      if(s.herenciaIds && s.herenciaIds.includes(instanciaId)){
        s.herenciaIds = s.herenciaIds.filter(id=>id!==instanciaId);
        refreshSedeAssets(s);
      }
    });
  }
  refreshSedeAssets(entity);
  rebuildConnections();
  renderRightPanel();
}

btnDeleteInstance.addEventListener('click', ()=>{
  if(!popupContext || popupContext.mode!=='edit') return;
  deleteInstanceDirect(getSedeById(popupContext.sedeId), popupContext.instanciaId);
  closePopup();
});

