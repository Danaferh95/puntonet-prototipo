/* =========================================================================
   T06 (reunión 22/09): ESTRUCTURA INICIAL vs ACTUAL
   Dos fotos del proyecto, guardadas en el estado y en el JSON, para que el reporte muestre cómo
   empezó y cómo terminó la sesión. Todo en memoria, sin backend.
   Un solo botón, "Guardar estado actual" (Dei, 23/09: dos botones confundían):
   - El PRIMER guardado de la sesión queda además como `inicial` (el inicio de la sesión); los
     siguientes solo actualizan `actual`. No hay forma de reemplazar el inicio a mano.
   - Generar el reporte guarda `actual` sola, así el final del reporte siempre coincide con lo
     que hay en pantalla. Ese guardado automático NO fija el inicio: si nunca se tocó el botón,
     el reporte muestra solo el final y lo avisa.
   Una foto es una copia profunda de lo que exporta buildConfiguracionCliente (entidades,
   productos, conexiones, salud) sin los datos del cliente ni las propias fotos, más un resumen
   con los conteos que usa el reporte. Es un dato congelado: no se vuelve a calcular.
   Cliente (25/09): la foto del inicio guarda además la captura del canvas en ese momento
   (`imagen`, PNG en data URL), con el mismo encuadre que el esquema del PDF. El PDF la muestra
   junto al score de ese momento; ya no se pide el score a mano.
   Cliente (25/09, tarde): TODA foto lleva su captura, no solo la del inicio. Cada "Guardar
   estado actual" (y el guardado automático al generar el reporte) captura el canvas en
   `actual.imagen`, así el reporte compara la imagen del inicio con la del final.
   ========================================================================= */
/* Tamaño de cada captura (inicio y final), en px de página del PDF (se toma × PDF_ESCALA). Tiene
   que coincidir con el aspecto de .pdf-comparacion__caja en css/reporte/pdf.css (16:9). */
const CAPTURA_ESTRUCTURA = { ancho: 320, alto: 180 };
/* La captura se toma fuera del PDF, así que el estilo de las etiquetas se mide en una página
   temporal fuera de pantalla (las variables y la tipografía son las de .pdf-pagina). */
function capturaEstructura(){
  const escenario = pdfEl('div', 'pdf-escenario');
  escenario.setAttribute('aria-hidden', 'true');
  const pagina = pdfEl('section', 'pdf-pagina');
  const figura = pdfEl('figure', 'pdf-esquema');
  pagina.appendChild(figura);
  escenario.appendChild(pagina);
  document.body.appendChild(escenario);
  try {
    const estilo = estiloEtiquetaEsquema(figura);
    return captureHeroSnapshot(CAPTURA_ESTRUCTURA.ancho*PDF_ESCALA, CAPTURA_ESTRUCTURA.alto*PDF_ESCALA, estilo, PDF_ESCALA);
  } catch(err){
    console.warn('[estructura] no se pudo capturar el canvas:', err);
    return null;
  } finally {
    escenario.remove();
  }
}
function fotoEstructura(){
  const cfg = JSON.parse(JSON.stringify(buildConfiguracionCliente()));
  ['version', 'nombreCliente', 'clienteLogo', 'generadoEn', 'estructuras'].forEach(k=> delete cfg[k]);
  const productos = [...state.sedes, ...state.matrices, ...state.nubes, state.datacenter]
    .reduce((n, e)=> n + (e.instancias||[]).length, 0);
  return Object.assign({
    guardadoEn: new Date().toISOString(),
    resumen: {
      sedes: state.sedes.length, matrices: state.matrices.length,
      nubes: state.nubes.filter(n=>!n.esAutoInternet).length,
      datacenterActivo: !!state.datacenter.activo,
      productos, conexiones: state.conexiones.length,
      saludGlobal: saludGlobal(),
    },
  }, cfg);
}
function horaFoto(foto){
  return foto ? new Date(foto.guardadoEn).toLocaleTimeString('es-EC', { hour:'2-digit', minute:'2-digit' }) : '';
}
function renderBotonesEstructura(){
  const foto = state.estructuras.actual;
  byId('btnEstructuraActual').classList.toggle('is-saved', !!foto);
  byId('estructuraActualHora').textContent = horaFoto(foto);
}
/* `fijarInicio`: solo el botón lo pide. El primer guardado hecho con el botón fija el inicio. */
function guardarEstructura(fijarInicio){
  const foto = fotoEstructura();
  foto.imagen = capturaEstructura(); // la del final se reemplaza en cada guardado
  const esPrimero = fijarInicio && !state.estructuras.inicial;
  if(esPrimero) state.estructuras.inicial = JSON.parse(JSON.stringify(foto)); // misma captura
  state.estructuras.actual = foto;
  renderBotonesEstructura();
  return esPrimero;
}
byId('btnEstructuraActual').addEventListener('click', ()=>{
  const esPrimero = guardarEstructura(true);
  showToast(esPrimero ? `Estado guardado como inicio de la sesión (captura y salud ${state.estructuras.inicial.resumen.saludGlobal}%).` : `Estado actual guardado (captura y salud ${state.estructuras.actual.resumen.saludGlobal}%).`);
});

/* Bloque del reporte: inicio vs final, con los conteos del resumen y la salud por categoría.
   El diseño definitivo de esta comparación (y su versión en el PDF) es de T08. */
function renderBloqueEstructuras(config){
  const box = document.createElement('div');
  box.className = 'report-sede';
  const h = document.createElement('h3');
  const ini = config.estructuras.inicial, fin = config.estructuras.actual;
  h.innerHTML = `<span>Estructura: inicio y final de la sesión</span><span class="muted-meta"> · ${
    ini ? `inicio ${horaFoto(ini)} → final ${horaFoto(fin)}` : `final ${horaFoto(fin)}`}</span>`;
  box.appendChild(h);
  const fila = (etiqueta, a, b)=>{
    const row = document.createElement('div');
    row.className = 'report-inst';
    const valor = ini ? `${a} → ${b}` : `${b}`;
    row.innerHTML = `<div class="rline1"><span>${etiqueta}</span><span class="muted-small">${valor}</span></div>`;
    box.appendChild(row);
  };
  // Capturas lado a lado: inicio (si se guardó) y final.
  const capturas = [ini && ['Inicio', ini], ['Final', fin]].filter(Boolean).filter(([, f])=> f.imagen);
  if(capturas.length){
    const fila = document.createElement('div');
    fila.className = 'report-inst report-estructura__capturas';
    capturas.forEach(([titulo, f])=>{
      const fig = document.createElement('figure');
      fig.className = 'report-estructura__captura';
      const img = document.createElement('img');
      img.className = 'report-estructura__img';
      img.src = f.imagen; img.alt = `Captura de la estructura: ${titulo.toLowerCase()} de la sesión`;
      const pie = document.createElement('figcaption');
      pie.className = 'muted-small';
      pie.textContent = `${titulo} · ${horaFoto(f)} · salud ${f.resumen.saludGlobal}%`;
      fig.append(img, pie);
      fila.appendChild(fig);
    });
    box.appendChild(fila);
  }
  if(!ini){
    const aviso = document.createElement('div');
    aviso.className = 'report-inst muted-small';
    aviso.textContent = 'No se guardó el estado durante la sesión: se muestra solo el final.';
    box.appendChild(aviso);
  }
  const r0 = ini ? ini.resumen : {}, r1 = fin.resumen;
  fila('Sedes', r0.sedes, r1.sedes);
  fila('Matrices', r0.matrices, r1.matrices);
  fila('Nubes de proveedor', r0.nubes, r1.nubes);
  fila('Productos', r0.productos, r1.productos);
  fila('Conexiones', r0.conexiones, r1.conexiones);
  fila('Salud de infraestructura', `${r0.saludGlobal}%`, `${r1.saludGlobal}%`);
  fin.salud.porVertical.forEach((v, i)=>{
    const antes = ini && ini.salud.porVertical[i] ? `${ini.salud.porVertical[i].pct}%` : '';
    fila(`· ${v.vertical}`, antes, `${v.pct}%`);
  });
  return box;
}

function openReport(){
  // T06: generar el reporte actualiza la estructura actual (el "final" = lo que hay en pantalla).
  guardarEstructura(false);
  const config = buildConfiguracionCliente();
  reportSubtitle.textContent = `${config.nombreCliente} · ${config.sedes.length} sede(s) · ${config.matrices.length} matriz(ces) · generado ${new Date(config.generadoEn).toLocaleString('es-EC')}`;
  reportBody.innerHTML='';

  // --- Bloque de Salud de infraestructura: estado actual (barras por vertical + score global)
  // y, si el vendedor lo completó, el estado inicial del cliente antes de Puntonet, para poder
  // mostrar el "antes vs después" en la conversación comercial. ---
  const saludBox = document.createElement('div');
  saludBox.className = 'report-sede';
  const saludHeader = document.createElement('h3');
  const inicial = saludDelInicio();
  const antesTxt = inicial===null ? '' : `<span class="muted-meta"> · Inicio de la sesión: ${inicial}%</span>`;
  saludHeader.innerHTML = `<span>Salud de infraestructura — ${config.salud.actual}%</span>${antesTxt}`;
  saludBox.appendChild(saludHeader);
  config.salud.porVertical.forEach(v=>{
    const row = document.createElement('div');
    row.className = 'report-inst';
    row.innerHTML = `<div class="rline1"><span>${v.vertical}</span><span class="muted-small">${v.cubiertas} de ${v.elegibles} ubicaciones · ${v.pct}%</span></div>`;
    saludBox.appendChild(row);
  });
  reportBody.appendChild(saludBox);
  reportBody.appendChild(renderBloqueEstructuras(config));

  function renderInstRow(inst, container, heredadoDe){
    const sub = getSubproducto(inst.subproductoId);
    const producto = getProducto(sub.productoNivel2Id);
    // Categoría con su color del design system (clase .rcat--<vertical>, antes color inline).
    const catHtml = `<span class="rcat rcat--${inst.verticalId}">${getVertical(inst.verticalId).nombre} · ${producto.nombre}</span>`;
    const iconHtml = `<img class="ricon" src="${iconoUiSubproducto(sub)}" alt="">`;
    const row = document.createElement('div');
    row.className='report-inst';
    const propsHtml = Object.entries(inst.propiedades||{})
      .filter(([,v])=>v)
      .map(([k,v])=>`<span class="rprop">${escapeHtml(k)}: ${escapeHtml(v)}</span>`).join('');
    // Canal de Conexión / Cloud Interconnect ya no aparecen en "Servicios asignados" en pantalla
    // (viven solo en "Conexiones", que muestra el destino) — pero acá en el reporte SÍ se siguen
    // listando, así que hace falta el destino inline: si no, dos "Canal de Conexión" se ven
    // idénticos y no se sabe a qué sede va cada uno.
    const conexionLigada = sub.ocultaEnServiciosAsignados
      ? state.conexiones.find(c=>c.instanciaId===inst.instanciaId && !c.esBackup) : null;
    const destinoTxt = conexionLigada
      ? ` <span class="muted-inline">→ ${escapeHtml(nombreEntidad(otroExtremo(conexionLigada, conexionLigada.ownerId)))}</span>`
      // Sdwan (v9 §3, ajustado): no tiene conexión propia, pero sí un canal balanceado
      // (inst.targetConexionId) — se muestra igual que un destino, mostrando los 2 extremos del
      // canal ya que Sdwan no es "dueño" de ninguno de los 2.
      : (sub.id==='sdwan' && inst.targetConexionId)
        ? (()=>{ const t = state.conexiones.find(c=>c.id===inst.targetConexionId);
            return t ? ` <span class="muted-inline">→ ${escapeHtml(nombreEntidad(t.aId))} ↔ ${escapeHtml(nombreEntidad(t.bId))}</span>` : ''; })()
        : '';
    row.innerHTML = `
      <div class="rline1"><span class="rname">${iconHtml}<span>${inst.nombreSubproducto}${destinoTxt}${heredadoDe?' <span class="muted-inline">(heredado de '+escapeHtml(heredadoDe)+')</span>':''}</span></span>${catHtml}</div>
      <div class="rmeta">${inst.marca ? 'Marca: '+escapeHtml(inst.marca) : 'Marca: —'}</div>
      ${propsHtml ? `<div class="rprops">${propsHtml}</div>` : ''}
      ${inst.notas ? `<div class="rnotes">"${escapeHtml(inst.notas)}"</div>` : ''}
    `;
    container.appendChild(row);

    // Backup (v9 §2): línea propia, con su destino — es el mismo servicio contratado, pero el
    // cliente lo ve como un renglón aparte (aparece en la Salud de infraestructura como un enlace
    // más, no como un atributo invisible del original).
    // sep/2026 (pedido cliente 03/09): "lo que falta en el reporte es que cuando prendas un backup,
    // el backup hereda la velocidad del canal principal — tengo una operación de 100 megas y tengo
    // un backup de 100 megas también". El backup ES la misma instancia (comparte instanciaId), así
    // que las propiedades ya eran las mismas: lo único que faltaba era imprimirlas acá, en vez de
    // dejar el renglón con una sola línea de texto y sin ancho de banda.
    const backupConexion = state.conexiones.find(c=>c.instanciaId===inst.instanciaId && c.esBackup);
    if(backupConexion){
      const backupRow = document.createElement('div');
      backupRow.className = 'report-inst';
      const notaConcentrador = sub.sumaConcentrador
        ? ' No suma al concentrador: es el respaldo del mismo canal, no capacidad adicional.' : '';
      backupRow.innerHTML = `
        <div class="rline1"><span class="rname">${iconHtml}<span>${inst.nombreSubproducto} (Backup) <span class="muted-inline">→ ${escapeHtml(nombreEntidad(otroExtremo(backupConexion, backupConexion.ownerId)))}</span></span></span>${catHtml}</div>
        <div class="rmeta">Enlace de respaldo en paralelo — hereda las propiedades del canal principal (misma contratación que ${inst.nombreSubproducto}).${notaConcentrador}</div>
        ${propsHtml ? `<div class="rprops">${propsHtml}</div>` : ''}
      `;
      container.appendChild(backupRow);
    }
  }

  // Sección de cada Matriz
  if(config.matrices.length===0){
    const empty = document.createElement('div');
    empty.className='report-empty';
    empty.textContent = 'Aún no se ha agregado ninguna Matriz al canvas.';
    reportBody.appendChild(empty);
  } else {
    config.matrices.forEach(matriz=>{
      const matrizBox = document.createElement('div');
      matrizBox.className='report-sede';
      const mh3 = document.createElement('h3');
      mh3.innerHTML = `<span>${escapeHtml(matriz.nombre)}</span><span class="muted-meta">(${matriz.usuarios||0} usuarios · ${matriz.instancias.length} producto(s) propio(s) · ${escapeHtml(conexionesTexto(matriz.id))})</span>`;
      matrizBox.appendChild(mh3);
      // Concentrador (sep/2026): renglón propio arriba de los productos, porque no ES un producto
      // — es la capacidad agregada que la Matriz tiene que soportar. Se omite cuando no llega
      // ningún canal, para no ensuciar el reporte con un "0 Mbps" sin sentido.
      const conc = concentradorDe(matriz.id);
      if(conc.enlaces.length>0){
        const concRow = document.createElement('div');
        concRow.className = 'report-inst report-concentrador';
        const desglose = conc.enlaces.map(e=>
          `<span class="rprop">${escapeHtml(e.origen)}: ${escapeHtml(formatAnchoBandaMbps(e.mbps) || 'sin ancho de banda')}${e.tieneBackup ? ' (+ backup)' : ''}</span>`
        ).join('');
        const notaBackup = conc.conBackup>0
          ? ` ${conc.conBackup} de ${conc.enlaces.length} canal(es) tiene(n) Backup: el respaldo hereda el mismo ancho de banda, pero no suma al concentrador.` : '';
        concRow.innerHTML = `
          <div class="rline1"><span>Concentrador <span class="muted-inline">(calculado — no es un producto contratable)</span></span><span class="muted-small">${escapeHtml(conc.texto)}</span></div>
          <div class="rmeta">Suma de los ${conc.enlaces.length} Canal(es) de Conexión que llegan a esta Matriz.${notaBackup}</div>
          <div class="rprops">${desglose}</div>`;
        matrizBox.appendChild(concRow);
      }
      if(matriz.instancias.length===0){
        const empty = document.createElement('div');
        empty.className='report-inst report-inst--empty';
        empty.textContent='Sin productos propios asignados.';
        matrizBox.appendChild(empty);
      } else {
        matriz.instancias.forEach(inst=>renderInstRow(inst, matrizBox, null));
      }
      reportBody.appendChild(matrizBox);
    });
  }

  // Sección de cada Nube (v9 §4/§5) — solo se muestra si el vendedor ya creó alguna (al vuelo,
  // desde el dropdown "Conectar a" de Cloud Interconnect, o arrastrando "Nube" — ver catálogo).
  // Lista sus productos propios (IaaS/BaaS/DRaaS) igual que una Matriz o el Datacenter.
  if(config.nubes.length>0){
    config.nubes.forEach(nube=>{
      const nubeBox = document.createElement('div');
      nubeBox.className='report-sede';
      const nh3 = document.createElement('h3');
      nh3.innerHTML = `<span>${escapeHtml(nube.nombre)} <span class="muted-meta">(${nube.esAutoInternet ? 'Nube automática de Internet' : 'Nube'})</span></span><span class="muted-meta">(${nube.instancias.length} producto(s) propio(s) · ${escapeHtml(conexionesTexto(nube.id))})</span>`;
      nubeBox.appendChild(nh3);
      if(nube.instancias.length===0){
        const empty = document.createElement('div');
        empty.className='report-inst report-inst--empty';
        empty.textContent='Sin productos propios asignados.';
        nubeBox.appendChild(empty);
      } else {
        nube.instancias.forEach(inst=>renderInstRow(inst, nubeBox, null));
      }
      reportBody.appendChild(nubeBox);
    });
  }

  // Sección del Datacenter Epicentro — infraestructura de Puntonet, pero ahora puede tener
  // productos propios (Collocation, Crossconexión, IaaS, BaaS, DRaaS — ver campo `destinos`).
  const dcBox = document.createElement('div');
  dcBox.className='report-sede';
  const dch3 = document.createElement('h3');
  dch3.innerHTML = `<span>${escapeHtml(config.datacenter.nombre)}</span><span class="muted-meta">(${config.datacenter.instancias.length} producto(s) propio(s) · ${escapeHtml(conexionesTexto('datacenter'))})</span>`;
  dcBox.appendChild(dch3);
  if(config.datacenter.instancias.length===0){
    const empty = document.createElement('div');
    empty.className='report-inst report-inst--empty';
    empty.textContent='Sin productos propios asignados.';
    dcBox.appendChild(empty);
  } else {
    config.datacenter.instancias.forEach(inst=>renderInstRow(inst, dcBox, null));
  }
  reportBody.appendChild(dcBox);

  if(config.sedes.length===0){
    const empty = document.createElement('div');
    empty.className='report-empty';
    empty.textContent = 'Aún no se han agregado sedes al canvas.';
    reportBody.appendChild(empty);
  } else {
    config.sedes.forEach(sede=>{
      const box = document.createElement('div');
      box.className='report-sede';
      const h3 = document.createElement('h3');
      const tamanoInfo = getTamanoLocal(sede.tamano);
      h3.innerHTML = `<span>${escapeHtml(sede.nombre)}</span><span class="muted-meta">(${sede.empleados} empleados · ${tamanoInfo.nombre} · ${escapeHtml(conexionesTexto(sede.id))})</span>`;
      box.appendChild(h3);
      const heredadas = heredadasConNombreMatriz(sede, config.matrices);
      if(sede.instancias.length===0 && heredadas.length===0){
        const empty = document.createElement('div');
        empty.className='report-inst report-inst--empty';
        empty.textContent='Sin servicios asignados.';
        box.appendChild(empty);
      } else {
        sede.instancias.forEach(inst=>renderInstRow(inst, box, null));
        heredadas.forEach(h=>renderInstRow(h.inst, box, h.matrizNombre));
      }
      reportBody.appendChild(box);
    });
  }
  reportOverlay.classList.add('show');
}

byId('btnReport').addEventListener('click', openReport);
byId('btnCloseReport').addEventListener('click', ()=>reportOverlay.classList.remove('show'));

function safeFileName(nombreCliente){
  return (nombreCliente||'cliente').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') || 'cliente';
}

function downloadJSON(){
  const config = buildConfiguracionCliente();
  const blob = new Blob([JSON.stringify(config, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fecha = new Date().toISOString().slice(0,10);
  a.href = url;
  a.download = `configuracion-${safeFileName(config.nombreCliente)}-${fecha}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
byId('btnExportFromReport').addEventListener('click', downloadJSON);

