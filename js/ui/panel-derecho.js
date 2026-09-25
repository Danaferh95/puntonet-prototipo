/* =========================================================================
   6. PANEL DERECHO — navegación de niveles + instancias existentes
   ========================================================================= */

/* Icono 2D simplificado por assetKey, para mostrar junto al nombre del Producto (N2) en el
   catálogo del panel izquierdo (el mismo assetKey que usa el ícono 3D de la escena). */
const ICONS_SVG = {
  // v23: tanda Conectividad. Reemplazan a los tres genéricos que venían del prototipo original —
  // son los primeros que el proveedor dibuja como pareja exacta del .glb (el SVG del nodo repite
  // los tres terminales del modelo; el de Datos, los tres paquetes en diagonal). Acá el atributo
  // de presentación que hay que retirar no es `color=` como en v18/v20 sino `stroke="#00FFBA"` en
  // el <svg> raíz y `fill="#00FFBA"` en los tres puntos del nodo: ambos son del propio elemento y
  // le ganan al color heredado del contenedor, así que el ícono habría quedado menta fijo,
  // ignorando el catálogo. Van como currentColor.
  enlace:    '<svg viewBox="0 0 128 128" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" role="img"><title>Datos</title><path d="M37 83.7 L54 71.3"/><path d="M74 56.7 L91 44.3"/><rect x="17" y="81" width="20" height="20" rx="1"/><rect x="54" y="54" width="20" height="20" rx="1"/><rect x="91" y="27" width="20" height="20" rx="1"/></svg>',
  nodo:      '<svg viewBox="0 0 128 128" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" role="img"><title>SD-WAN</title><path d="M64 68 L64 40.7"/><rect x="53.92" y="19.28" width="20.16" height="20.16" stroke-width="5.88"/><circle cx="64" cy="55.19" r="4.41" fill="currentColor" stroke="none"/><path d="M64 68 L40.36 81.65"/><rect x="20.46" y="77.24" width="20.16" height="20.16" stroke-width="5.88" transform="rotate(30 30.54 87.32)"/><circle cx="52.91" cy="74.41" r="4.41" fill="currentColor" stroke="none"/><path d="M64 68 L87.64 81.65"/><rect x="87.38" y="77.24" width="20.16" height="20.16" stroke-width="5.88" transform="rotate(-30 97.46 87.32)"/><circle cx="75.09" cy="74.41" r="4.41" fill="currentColor" stroke="none"/></svg>',
  globo:     '<svg viewBox="0 0 128 128" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" role="img"><title>Internet</title><circle cx="64" cy="64" r="48"/><ellipse cx="64" cy="64" rx="24" ry="48"/><path d="M24.68 36.47 L103.32 36.47"/><path d="M16 64 L112 64"/><path d="M24.68 91.53 L103.32 91.53"/></svg>',
  // v18: lineup aprobado de Ciberseguridad (paquete del proveedor, ver LEEME.md) — mismo SVG que
  // acompaña a cada .glb de IconLibrary (§3D), color editable vía currentColor. Se retira el
  // atributo `color="#EC7069"` del archivo de origen: es solo el valor de vista previa del
  // proveedor y, dejado en el SVG, pisaría el color heredado del `style` del contenedor (§6, el
  // `<span class="catalog-producto-icon" style="color:...">` que envuelve a cada ícono).
  escudo:    '<svg viewBox="0 0 128 128" role="img"><title>Perimetral</title><g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 45V29Q18 18 29 18H45V26H29Q26 26 26 29V45Z M83 18H99Q110 18 110 29V45H102V29Q102 26 99 26H83Z M110 83V99Q110 110 99 110H83V102H99Q102 102 102 99V83Z M45 110H29Q18 110 18 99V83H26V99Q26 102 29 102H45Z"/></g></svg>',
  candado:   '<svg viewBox="0 0 128 128" role="img"><title>End Point</title><g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><rect x="12" y="12" width="104" height="104" rx="25"/><rect x="23" y="23" width="82" height="82" rx="21"/><rect x="34" y="34" width="60" height="60" rx="17"/><path d="M54 61V54a10 10 0 0 1 20 0V61"/><rect x="49" y="61" width="30" height="25" rx="4"/><path d="M64 71V77"/></g></svg>',
  llave:     '<svg viewBox="0 0 128 128" role="img"><title>Acceso</title><g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M25 112V29Q25 16 38 16H90Q103 16 103 29V112H87V37Q87 32 82 32H46Q41 32 41 37V112Z"/></g></svg>',
  muro:      '<svg viewBox="0 0 128 128" role="img"><title>Aplicación</title><g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><rect x="12" y="19" width="104" height="90" rx="10"/><path d="M12 40H116"/><circle cx="24" cy="29" r="2" fill="currentColor"/><circle cx="35" cy="29" r="2" fill="currentColor"/><circle cx="60" cy="69" r="17"/><path d="M72 81L89 98"/></g></svg>',
  firewall_onpremise: '<svg viewBox="0 0 128 128" role="img"><title>Firewall físico</title><g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="38" width="112" height="52" rx="9"/><rect x="22" y="51" width="22" height="26" rx="2"/><rect x="56" y="51" width="22" height="26" rx="2"/><path d="M93 64H108"/></g></svg>',
  // v20: tanda Cloud, mismo criterio que el bloque de arriba. Acá el atributo retirado es
  // `color="#1BAFDE"`. Ojo con por qué hay que sacarlo y no alcanza con el CSS: es un atributo de
  // presentación sobre el propio <svg>, y un color heredado del contenedor pierde contra el
  // atributo del elemento — el ícono habría quedado siempre celeste, ignorando el catálogo.
  // `nube` es el único del lineup que se dibuja con relleno (fill) en vez de trazo (stroke): el
  // contorno es el propio relleno con fill-rule="evenodd", así que currentColor va en el <path>.
  rack:      '<svg viewBox="0 0 128 128" fill="none" role="img"><title>Housing</title><g stroke="currentColor" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"><path d="M29 16H20V112H29M99 16H108V112H99"/><rect x="35" y="24" width="58" height="23" rx="7"/><path d="M55 35.5H73"/><rect x="35" y="51" width="58" height="23" rx="7"/><path d="M55 62.5H73"/><rect x="35" y="78" width="58" height="23" rx="7"/><path d="M55 89.5H73"/></g></svg>',
  nube:      '<svg viewBox="0 0 128 128" fill="none" role="img"><title>Hosting</title><g transform="translate(64 74) scale(102 -102)"><path fill="currentColor" fill-rule="evenodd" d="M-.3 -.29C-.57 -.29 -.61 .14 -.31 .16C-.28 .47 .24 .51 .28 .16C.59 .18 .60 -.29 .31 -.29C.15 -.29 -.15 -.29 -.3 -.29Z M-.29 -.17C-.47 -.17 -.49 .075 -.235 .065C-.23 .36 .17 .37 .195 .065C.46 .10 .49 -.17 .29 -.17C.15 -.17 -.15 -.17 -.29 -.17Z M-.075 -.242H.075A.012 .012 0 0 1 .075 -.218H-.075A.012 .012 0 0 1 -.075 -.242Z"/></g></svg>',
  // v21: tanda Colaboración, mismo criterio que los dos bloques de arriba. Acá el atributo retirado
  // es `color="#DCE361"`. Dos particularidades de esta entrega:
  // · `pantalla` llegó como export de Adobe Illustrator: 43 KB, de los cuales 42 eran metadata
  //   (`<i:aipgf>` en base64) y, sobre todo, el color NO era `currentColor` sino un `<style>` con
  //   `.st0,.st1{fill:#dce361}`. Una clase dentro del propio SVG gana contra el `color` heredado
  //   del contenedor, así que el ícono habría quedado lima fijo. Se reescribió a `fill="currentColor"`
  //   conservando los mismos paths; el `fill-rule="evenodd"` del cuerpo de la cámara es lo que abre
  //   el hueco del lente y no se puede perder.
  // · `puerta` y `antena` comparten los aros y el equipo: `puerta` es `antena` + la credencial.
  //   Se distinguen a 128 px, pero a 32 px la credencial es un borrón — ver Pendiente de esta fase.
  pantalla:  '<svg viewBox="0 0 128 128" role="img"><title>Conferencia</title><g fill="currentColor"><circle cx="64" cy="24.47" r="6.5"/><path d="M51,47.47v-5c0-13,26-13,26,0v5h-26Z"/><circle cx="33" cy="72.86" r="6.5"/><path d="M20,95.86v-5c0-13,26-13,26,0v5h-26Z"/><circle cx="95" cy="72.86" r="6.5"/><path d="M82,95.86v-5c0-13,26-13,26,0v5h-26Z"/><path fill-rule="evenodd" d="M49,53h30c3.33,0,5,1.67,5,5v14c0,3.33-1.67,5-5,5h-30c-3.33,0-5-1.67-5-5v-14c0-3.33,1.67-5,5-5ZM72,65c0-4.42-3.58-8-8-8s-8,3.58-8,8,3.58,8,8,8,8-3.58,8-8Z"/><circle cx="64" cy="65" r="3"/></g></svg>',
  documento: '<svg viewBox="0 0 128 128" role="img"><title>Ofimática</title><g fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M80 28V19H31Q24 19 24 26V88Q24 95 31 95H34 M89 44V28H41Q34 28 34 35V97Q34 104 41 104H44 M51 37H82L104 59V106Q104 113 97 113H51Q44 113 44 106V44Q44 37 51 37Z M82 37V59H104 M56 74H91 M56 86H91 M56 98H91"/></g></svg>',
  puerta:    '<svg viewBox="0 0 128 128" role="img"><title>Portal Cautivo</title><g fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 76C4 68 5 49 23 39C43 27 85 27 105 39C123 49 124 68 104 76 M32 66C19 60 23 49 35 44C51 37 77 37 93 44C105 49 109 60 96 66"/><rect x="29" y="80" width="70" height="23" rx="7"/><path d="M55 92H73"/><path d="M50 76V52Q50 48 54 48H74Q78 48 78 52V76"/><circle cx="64" cy="57" r="4" fill="currentColor" stroke="none"/><path d="M56 71V68C56 61 72 61 72 68V71Z" fill="currentColor" stroke="none"/></g></svg>',
  antena:    '<svg viewBox="0 0 128 128" role="img"><title>Zona Wireless</title><g fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 76C4 68 5 49 23 39C43 27 85 27 105 39C123 49 124 68 104 76 M32 66C19 60 23 49 35 44C51 37 77 37 93 44C105 49 109 60 96 66"/><rect x="29" y="80" width="70" height="23" rx="7"/><path d="M55 92H73"/></g></svg>',
};

const navEmpty = byId('navEmpty');
const navContent = byId('navContent');
const navSedeLabel = byId('navSedeLabel');
const navSedeSub = byId('navSedeSub');   // tipo de entidad bajo el nombre (design system)
const navAsset = byId('navAsset');       // render de la entidad seleccionada (design system)
const navActions = byId('navActions');   // botón "Eliminar …" al pie del panel (design system)
const matrizHintEl = byId('matrizHint');
const matrizEditBoxEl = byId('matrizEditBox');
const instanceSection = byId('instanceSection');
const instanceSectionTitle = byId('instanceSectionTitle');
const instanceListEl = byId('instanceList');

/* Campo "Concentrador" del panel derecho (sep/2026): solo lectura, sin input ni botón — es un
   valor calculado (ver concentradorDe), no algo que el vendedor edite. Muestra el total y el
   desglose canal por canal, para que el número no aparezca "de la nada": el cliente tiene que
   poder señalar de dónde salen los 300 Mbps. Devuelve HTML porque los bloques del panel derecho
   se pintan con showBox(el, html) de una sola vez. */
function concentradorFieldHtml(entityId){
  const conc = concentradorDe(entityId);
  const cuerpo = conc.enlaces.length===0
    ? `<div class="concentradorEmpty">Todavía no llega ningún Canal de Conexión a esta Matriz.</div>`
    : `<div class="concentradorTotal">${escapeHtml(conc.texto)}</div>
       <div class="concentradorList">${conc.enlaces.map(e=>`
         <div class="concentradorRow">
           <span class="concentradorOrigen">${escapeHtml(e.origen)}</span>
           ${e.tieneBackup ? '<span class="concentradorBackupTag" title="Este canal tiene un enlace de Backup: hereda el mismo ancho de banda, pero no suma al concentrador">+ backup</span>' : ''}
           <span class="concentradorMbps">${escapeHtml(formatAnchoBandaMbps(e.mbps) || 'sin dato')}</span>
         </div>`).join('')}</div>`;
  const nota = conc.conBackup>0
    ? `Suma de los Canales de Conexión que llegan a esta Matriz. ${conc.conBackup} de ${conc.enlaces.length} tiene(n) Backup: el respaldo hereda el ancho de banda de su canal principal, pero no suma al concentrador.`
    : 'Suma de los Canales de Conexión que llegan a esta Matriz. Los enlaces de Backup no suman: heredan el ancho de banda de su canal principal.';
  return `
    <div class="field concentradorField">
      <label>Concentrador <span class="muted-inline">(calculado)</span></label>
      ${cuerpo}
      <div class="concentradorHint">${nota}</div>
    </div>`;
}

/* Bloque de edición de la Matriz seleccionada: nombre editable (igual que una sede), Usuarios
   (pedido cliente 31/07/2026 — mismo patrón slider+número que Empleados de Sede, salvo que acá
   el mínimo es 0: una Matriz puede no tener usuarios propios asignados), el Concentrador
   calculado (sep/2026, solo lectura) y botón de eliminar. La posición no se edita con un campo
   numérico — se mueve arrastrándola en el canvas, igual que una sede. */
function renderMatrizEditBox(matriz){
  if(!matriz){
    hideBox(matrizEditBoxEl);
    return;
  }
  const usuarios = matriz.usuarios||0;
  const usuariosSliderVal = Math.min(usuarios, EMPLEADOS_SLIDER_MAX);
  showBox(matrizEditBoxEl, `
    <div class="field">
      <label>Nombre de la Matriz</label>
      <input type="text" id="matrizNombreInput" value="${escapeHtml(matriz.nombre)}" placeholder="Nombre de la Matriz...">
    </div>
    <div class="field">
      <label>Usuarios</label>
      <div class="empRow">
        <input type="range" id="matrizUsuariosRange" min="0" max="${EMPLEADOS_SLIDER_MAX}" value="${usuariosSliderVal}">
        <input type="number" id="matrizUsuariosNumber" min="0" step="1" value="${usuarios}">
      </div>
    </div>
    ${concentradorFieldHtml(matriz.id)}
    <button class="btn danger-outline block" id="btnDeleteMatriz">Eliminar Matriz</button>
  `);
  byId('matrizNombreInput').addEventListener('input', (e)=>{
    matriz.nombre = e.target.value;
    updateSedeNameSprite(matriz);
    navSedeLabel.textContent = matriz.nombre || '(sin nombre)';
  });

  bindSliderNumber(
    byId('matrizUsuariosRange'),
    byId('matrizUsuariosNumber'),
    0, EMPLEADOS_SLIDER_MAX,
    (v)=>{ matriz.usuarios = v; }
  );

  byId('btnDeleteMatriz').addEventListener('click', ()=>{
    confirmDialog({ title:'Eliminar Matriz',
      body:`¿Eliminar "${matriz.nombre}" y todo lo que tiene asignado (productos propios y conexiones)? Esta acción no se puede deshacer.` })
      .then(ok=>{ if(ok) deleteMatriz(matriz); });
  });
}

const nubeEditBoxEl = byId('nubeEditBox');

/* Bloque de edición de la Nube seleccionada (v9 §4/§5): nombre/proveedor editable y botón de
   eliminar — mismo patrón que renderMatrizEditBox. Sus productos propios (IaaS/BaaS/DRaaS) se
   editan desde "Productos propios de la Nube" (ver renderRightPanel), igual que en una Matriz. */
function renderNubeEditBox(nube){
  if(!nube){
    hideBox(nubeEditBoxEl);
    return;
  }
  if(nube.esAutoInternet){
    // v9 §6: la Nube automática de Internet no tiene nombre editable por el vendedor — es única
    // por proyecto y su identidad ("es la salida de Internet") no debe poder confundirse
    // renombrándola. El branding definitivo (ícono/nombre visual) queda para otra fase.
    showBox(nubeEditBoxEl, `
      <div class="field">
        <label>Nube automática de Internet</label>
        <input type="text" value="${escapeHtml(nube.nombre)}" disabled class="locked">
        <div class="toggleHint">Es la salida de Internet compartida por todos los productos de Internet del proyecto — su nombre no es editable.</div>
      </div>
      <button class="btn danger-outline block" id="btnDeleteNube">Eliminar Nube</button>
    `);
  } else {
    showBox(nubeEditBoxEl, `
      <div class="field">
        <label>Nombre / proveedor de la Nube</label>
        <input type="text" id="nubeNombreInput" value="${escapeHtml(nube.nombre)}" placeholder="Ej. AWS, Azure, GCP...">
      </div>
      <button class="btn danger-outline block" id="btnDeleteNube">Eliminar Nube</button>
    `);
    byId('nubeNombreInput').addEventListener('input', (e)=>{
      nube.nombre = e.target.value;
      updateSedeNameSprite(nube);
      navSedeLabel.textContent = nube.nombre || '(sin nombre)';
    });
  }
  byId('btnDeleteNube').addEventListener('click', ()=>{
    const mensaje = nube.esAutoInternet
      ? (`"${nube.nombre}" es la Nube automática de Internet: TODOS los productos de Internet (Corporativo/Startup/Teleworking) de cualquier sede que apunten a ella se eliminarán también. Si luego se agrega otro producto de Internet, se creará una Nube nueva. ¿Eliminar de todos modos?`)
      : (`¿Eliminar "${nube.nombre}" y las conexiones (Cloud Interconnect) que apuntan a ella? Esta acción no se puede deshacer.`);
    confirmDialog({ title:'Eliminar Nube', body:mensaje })
      .then(ok=>{ if(ok) deleteNube(nube); });
  });
}

/* Bloque de edición del Datacenter Epicentro seleccionado (ago/2026) — mismo patrón que
   renderMatrizEditBox/renderNubeEditBox, pero sin campos editables (nombre/ubicación fijos): solo
   informa que se puede eliminar y ofrece el botón para hacerlo. */
const datacenterEditBoxEl = byId('datacenterEditBox');
function renderDatacenterEditBox(datacenter){
  if(!datacenter){
    hideBox(datacenterEditBoxEl);
    return;
  }
  showBox(datacenterEditBoxEl, `
    <div class="hint">Edificio fijo de Puntonet: aparece por defecto en todo proyecto nuevo, pero se puede eliminar si esta solución no lo necesita.</div>
    <button class="btn danger-outline block" id="btnDeleteDatacenter">Eliminar Datacenter</button>
  `);
  byId('btnDeleteDatacenter').addEventListener('click', ()=>{
    confirmDialog({ title:'Eliminar Datacenter',
      body:`¿Eliminar el Datacenter Epicentro? Se eliminarán sus productos propios (Collocation, Crossconexión, Hosting, etc.) y cualquier conexión que apunte a él (Cloud Interconnect, Zona Wireless). Podrás restaurarlo luego desde el panel izquierdo.` })
      .then(ok=>{ if(ok) deleteDatacenter(); });
  });
}

/* Tarjeta del panel izquierdo para restaurar el Datacenter cuando fue eliminado — visible solo
   mientras state.datacenter.activo es false (ver deleteDatacenter/restoreDatacenter). A
   diferencia de Sede/Matriz/Nube no se arrastra: su posición es fija, así que un clic alcanza. */
const datacenterRestoreWrap = byId('datacenterRestoreWrap');
const datacenterRestoreCard = byId('datacenterRestoreCard');
if(datacenterRestoreCard) datacenterRestoreCard.addEventListener('click', restoreDatacenter);
function syncDatacenterRestoreUI(){
  if(datacenterRestoreWrap) datacenterRestoreWrap.style.display = state.datacenter.activo ? 'none' : 'block';
}

function initials(nombre){
  const words = nombre.replace(/[\/()]/g,' ').split(/\s+/).filter(Boolean);
  if(words.length===1) return words[0].slice(0,2).toUpperCase();
  return (words[0][0]+words[1][0]).toUpperCase();
}

