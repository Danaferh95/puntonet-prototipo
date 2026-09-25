/* =========================================================================
   9-bis. REPORTE PDF (T08, plantilla de Dei del 24/09)
   -------------------------------------------------------------------------
   Hasta T08 el PDF se dibujaba primitiva por primitiva con jsPDF (Helvetica sobre blanco). La
   plantilla nueva es oscura, con Inter, degradados y tarjetas del design system, así que el PDF
   pasa a armarse como páginas HTML de tamaño A4 (794 × 1123 px) que html2canvas convierte en
   imagen, una por página, y jsPDF junta en el archivo. Toda la apariencia vive en
   css/reporte/pdf.css (§12, clases .pdf-*); acá solo se arma el contenido y se pagina.

   Páginas:
     1. Portada: título, cliente y fecha, el esquema del canvas, cifras y salud global.
     2. Resumen: salud por categoría y la tabla de conexiones (sigue en otra página si no entra).
     3+. Detalle: una tarjeta por entidad (Matriz, Datacenter, Sedes, Nubes) y una por servicio.
   Decisiones de Dei (24/09):
     - La salud sigue midiendo cobertura de ubicaciones (T05); solo cambia el texto.
     - La salud lleva números (cierra el Pendiente 71).
     - De inicio → final (T06) queda solo la salud: estado inicial y cambio en puntos.
     - El esquema es la foto del canvas, pero encuadrada para que se vea TODO y todas las
       conexiones (ver captureHeroSnapshot).
     - Sin "EJEMPLO ILUSTRATIVO" ni marca de agua.
   Las imágenes (logo, renders, símbolos de categoría) vienen embebidas en js/reporte-assets.js
   (tools/empaquetar-reporte.js): con file:// una imagen local contamina el canvas de html2canvas
   y el PDF no se podría generar.
   ========================================================================= */

/* Encuadre y aspecto del esquema de la portada. */
const ESQUEMA_PDF = {
  // Elevación de la cámara. 25/09 (cliente): la foto del reporte se veía "muy desde arriba"
  // (44°). Ahora usa la misma elevación que la vista por defecto del configurador (~35°), la de
  // la captura que mandó el cliente. El encuadre (encuadrarEsquema) sigue metiendo toda la infra.
  elevacion: DEFAULT_CAM_ANGLE_X,
  margen: 0.88,        // fracción del cuadro que ocupa el contenido (el resto es aire)
  grosorCables: 2.2,   // los cables se ven más gruesos solo en la foto: a esa escala el grosor de pantalla desaparece
  zoomMax: 2.2,        // tope para escenas chicas: con una sola entidad no se acerca hasta llenar la portada
};
const PDF_ESCALA = 2;  // resolución de html2canvas: 2 px de imagen por px de página

/* Caja de lo que tiene que entrar en el esquema: cada entidad, los cables (sin las partículas,
   que se mueven) y el punto de anclaje de cada etiqueta de nombre. Se devuelven puntos sueltos
   para proyectarlos con la cámara ya orientada. */
function puntosDelEsquema(){
  const puntos = [];
  const caja = new THREE.Box3();
  const agregarCaja = ()=>{
    if(caja.isEmpty()) return;
    [caja.min.x, caja.max.x].forEach(x=> [caja.min.y, caja.max.y].forEach(y=> [caja.min.z, caja.max.z].forEach(z=>
      puntos.push(new THREE.Vector3(x, y, z)))));
  };
  todasLasEntidades().forEach(e=>{
    if(e.id==='datacenter' && !state.datacenter.activo) return;
    const grupo = e.id==='datacenter' ? datacenterGroup : e.group;
    if(!grupo) return;
    caja.setFromObject(grupo); agregarCaja();
  });
  connectionsGroup.traverse(o=>{
    if(!o.isMesh || !o.userData.isConexion) return;
    caja.setFromObject(o); agregarCaja();
  });
  nameLabels.forEach(entry=>{
    const v = new THREE.Vector3(0, Math.max(entry.localY, entry.group.userData.alturaMinEtiqueta || 0), 0);
    entry.group.localToWorld(v);
    puntos.push(v);
  });
  return puntos;
}

/* Orienta la cámara, la centra sobre el contenido y calcula el zoom para que entre completo en
   un cuadro de proporción `aspect`. A diferencia del snapshot anterior (que encuadraba contra el
   canvas y después recortaba al aspecto del banner, y por eso cortaba lo que quedaba a los
   costados), acá el frustum ya tiene el aspecto final: no se recorta nada. */
function encuadrarEsquema(aspect){
  camera.left = -FRUSTUM*aspect; camera.right = FRUSTUM*aspect;
  camera.top = FRUSTUM; camera.bottom = -FRUSTUM;
  camTarget.set(0, 0, 0);
  updateCameraFromAngles();
  camera.updateMatrixWorld(true);
  const puntos = puntosDelEsquema();
  if(!puntos.length){ camera.zoom = ZOOM_INICIAL; camera.updateProjectionMatrix(); return; }
  const inv = camera.matrixWorldInverse;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  puntos.forEach(p=>{
    const v = p.clone().applyMatrix4(inv);
    minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
    minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
  });
  // Cámara ortográfica: correr cámara y objetivo juntos sobre sus ejes "derecha" y "arriba"
  // desplaza la vista sin cambiar el ángulo, así el contenido queda centrado en el cuadro.
  const derecha = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const arriba = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  camTarget.addScaledVector(derecha, (minX+maxX)/2).addScaledVector(arriba, (minY+maxY)/2);
  updateCameraFromAngles();
  const semiAncho = Math.max((maxX-minX)/2, 0.001), semiAlto = Math.max((maxY-minY)/2, 0.001);
  camera.zoom = Math.min(FRUSTUM*aspect*ESQUEMA_PDF.margen/semiAncho, FRUSTUM*ESQUEMA_PDF.margen/semiAlto, ESQUEMA_PDF.zoomMax);
  camera.updateProjectionMatrix();
}

/* Las etiquetas de nombre del esquema se dibujan sobre la foto con canvas 2D (son divs HTML en
   pantalla, fuera del WebGL). Su aspecto no se define acá: se lee de una etiqueta de muestra con
   las clases .pdf-esquema__etiqueta / __punto de css/reporte/pdf.css. */
function estiloEtiquetaEsquema(contenedor){
  const muestra = pdfEl('span', 'pdf-esquema__etiqueta');
  const punto = pdfEl('span', 'pdf-esquema__punto');
  muestra.append(punto, document.createTextNode('M'));
  contenedor.appendChild(muestra);
  const cs = getComputedStyle(muestra), cp = getComputedStyle(punto);
  const px = v=> parseFloat(v) || 0;
  const estilo = {
    fuente: [cs.fontWeight, cs.fontSize, cs.fontFamily],
    color: cs.color, fondo: cs.backgroundColor, borde: cs.borderTopColor, grosorBorde: px(cs.borderTopWidth),
    padIzq: px(cs.paddingLeft), padDer: px(cs.paddingRight), alto: muestra.offsetHeight || px(cs.height),
    separacion: px(cs.marginBottom),
    punto: { tam: px(cp.width), color: cp.backgroundColor, separacion: px(cp.marginRight) },
    fundido: parseFloat(getComputedStyle(contenedor).getPropertyValue('--pdf-esquema-fundido')) || 0,
  };
  muestra.remove();
  return estilo;
}

/* Las etiquetas son más anchas que el punto que las ancla: si una Sede queda en el borde, su
   etiqueta se saldría del cuadro. Achica el zoom lo justo para que todas entren (cámara
   ortográfica: el zoom escala las posiciones en pantalla respecto del centro). */
function ajustarZoomPorEtiquetas(ctx, w, h, e, k){
  const [peso, tam, familia] = e.fuente;
  ctx.font = `${peso} ${parseFloat(tam)*k}px ${familia}`;
  const aire = 8*k, alto = e.alto*k;
  let factor = 1;
  nameLabels.forEach(entry=>{
    getLabelScreenNDC(entry, tmpLabelVec);
    const dx = Math.abs(tmpLabelVec.x) * w/2;               // distancia del ancla al centro, en px
    const dy = tmpLabelVec.y * h/2 + (e.separacion*k + alto); // hasta el borde superior de la etiqueta
    const medioAncho = ((e.padIzq + e.punto.tam + e.punto.separacion + e.padDer)*k + ctx.measureText(entry.el.textContent).width)/2;
    if(dx > 0) factor = Math.min(factor, (w/2 - aire - medioAncho) / dx);
    if(tmpLabelVec.y > 0 && dy > h/2 - aire) factor = Math.min(factor, (h/2 - aire - (e.separacion*k + alto)) / (tmpLabelVec.y * h/2));
  });
  if(factor < 1){ camera.zoom *= Math.max(factor, 0.3); camera.updateProjectionMatrix(); }
}

function dibujarEtiquetasEsquema(ctx, w, h, e, k){
  const [peso, tam, familia] = e.fuente;
  ctx.font = `${peso} ${parseFloat(tam)*k}px ${familia}`;
  ctx.textBaseline = 'middle';
  const alto = e.alto*k, radio = alto/2;
  nameLabels.forEach(entry=>{
    getLabelScreenNDC(entry, tmpLabelVec);
    if(tmpLabelVec.z < -1 || tmpLabelVec.z > 1) return;
    const texto = entry.el.textContent;
    const ancho = (e.padIzq + e.punto.tam + e.punto.separacion + e.padDer)*k + ctx.measureText(texto).width;
    const cx = (tmpLabelVec.x*0.5+0.5) * w;
    const base = (-tmpLabelVec.y*0.5+0.5) * h - e.separacion*k;
    const x = Math.round(cx - ancho/2), y = Math.round(base - alto);
    ctx.beginPath();
    ctx.moveTo(x+radio, y); ctx.lineTo(x+ancho-radio, y);
    ctx.arc(x+ancho-radio, y+radio, radio, -Math.PI/2, Math.PI/2);
    ctx.lineTo(x+radio, y+alto);
    ctx.arc(x+radio, y+radio, radio, Math.PI/2, Math.PI*1.5);
    ctx.closePath();
    ctx.fillStyle = e.fondo; ctx.fill();
    if(e.grosorBorde>0){ ctx.lineWidth = e.grosorBorde*k; ctx.strokeStyle = e.borde; ctx.stroke(); }
    const px = x + e.padIzq*k + e.punto.tam*k/2;
    ctx.beginPath(); ctx.arc(px, y+alto/2, e.punto.tam*k/2, 0, Math.PI*2);
    ctx.fillStyle = e.punto.color; ctx.fill();
    ctx.fillStyle = e.color;
    ctx.fillText(texto, x + (e.padIzq + e.punto.tam + e.punto.separacion)*k, y+alto/2 + k*0.5);
  });
}

/* Desvanece los bordes de la foto hacia transparente, para que el esquema se funda con el fondo
   de la página en vez de verse como un rectángulo pegado. `f` es la fracción de cada lado. */
function fundirBordesEsquema(ctx, w, h, f){
  if(!(f>0)) return;
  ctx.globalCompositeOperation = 'destination-in';
  [[w, 0], [0, h]].forEach(([dx, dy])=>{
    const g = ctx.createLinearGradient(0, 0, dx, dy);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(f, 'rgba(0,0,0,1)');
    g.addColorStop(1-f, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
  ctx.globalCompositeOperation = 'source-over';
}

/* Foto del canvas 3D para la portada, de exactamente `anchoPx` × `altoPx`.
   - Encuadra todo lo colocado (entidades, cables y etiquetas) con la vista isométrica de siempre,
     un poco más elevada, sin importar dónde dejó la cámara el vendedor.
   - Durante la foto: sin selección resaltada, sin los "+" de conexión, sin partículas, y con los
     cables más gruesos. Fondo transparente: el fondo es el de la página.
   - Al terminar restaura exactamente la vista, el tamaño del renderer y la selección.
   Es síncrono: nada llega a pintarse en pantalla entre el cambio y la restauración.
   `estilo` (opcional) es el de estiloEtiquetaEsquema; sin él no se dibujan etiquetas. */
function captureHeroSnapshot(anchoPx, altoPx, estilo, escala){
  const w = Math.max(1, Math.round(anchoPx)), h = Math.max(1, Math.round(altoPx));
  const k = escala || 1;
  const prev = {
    angX: camAngleX, angY: camAngleY, zoom: camera.zoom, target: camTarget.clone(),
    color: renderer.getClearColor(new THREE.Color()), alpha: renderer.getClearAlpha(),
    pixelRatio: renderer.getPixelRatio(),
    seleccion: state.selectedSedeIds.slice(), conexion: state.selectedConexionId,
  };
  const puertos = [];
  scene.traverse(o=>{ if(o.userData && o.userData.isPort && o.visible){ puertos.push(o); o.visible = false; } });
  try {
    state.selectedSedeIds = []; state.selectedConexionId = null;
    updateSelectionVisuals();
    grosorCables = ESQUEMA_PDF.grosorCables;
    rebuildConnections();
    connectionAnims.forEach(a=>{ a.particle.visible = false; });
    camAngleX = ESQUEMA_PDF.elevacion; camAngleY = DEFAULT_CAM_ANGLE_Y;
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false);
    encuadrarEsquema(w/h);
    const out = document.createElement('canvas');
    out.width = w; out.height = h;
    const ctx = out.getContext('2d');
    if(estilo) ajustarZoomPorEtiquetas(ctx, w, h, estilo, k);
    renderer.setClearColor(0x000000, 0);
    renderizarFrame(BRILLO_EN_PDF); // v17: sin efectos por decisión (v2 §7.4); cambiar el booleano los incluye

    ctx.drawImage(renderer.domElement, 0, 0, w, h);
    if(estilo){
      fundirBordesEsquema(ctx, w, h, estilo.fundido);
      dibujarEtiquetasEsquema(ctx, w, h, estilo, k);
    }
    return out.toDataURL('image/png');
  } finally {
    puertos.forEach(o=>{ o.visible = true; });
    renderer.setPixelRatio(prev.pixelRatio);
    handleViewportResize(); // devuelve tamaño del renderer y frustum a los del canvas en pantalla
    camAngleX = prev.angX; camAngleY = prev.angY;
    camTarget.copy(prev.target);
    updateCameraFromAngles();
    camera.zoom = prev.zoom;
    camera.updateProjectionMatrix();
    renderer.setClearColor(prev.color, prev.alpha);
    state.selectedSedeIds = prev.seleccion; state.selectedConexionId = prev.conexion;
    grosorCables = 1;
    rebuildConnections();
    updateSelectionVisuals();
    renderer.render(scene, camera);
  }
}

/* --- Datos del reporte: todo lo que las páginas muestran, ya resuelto a texto --- */
const TAMANO_PDF = { pequeno:'Pequeño', mediano:'Mediano', grande:'Grande' };
function pdfEl(tag, clase, texto){
  const n = document.createElement(tag);
  if(clase) n.className = clase;
  if(texto!==undefined && texto!==null) n.textContent = texto;
  return n;
}
function pluralPDF(n, uno, varios){ return `${n} ${n===1 ? uno : varios}`; }
function fechaLargaPDF(iso){
  return new Date(iso).toLocaleDateString('es-EC', { day:'numeric', month:'long', year:'numeric' });
}
function origenDeConexion(c){ return c.ownerId || c.aId; }

/* Filas de "Conexiones de la red": cada enlace principal seguido de su respaldo. */
function enlacesDelReporte(){
  const fila = c=>{
    const origen = origenDeConexion(c);
    const sub = c.subproductoId ? getSubproducto(c.subproductoId) : null;
    return {
      origen: nombreEntidad(origen), destino: nombreEntidad(otroExtremo(c, origen)),
      servicio: sub ? sub.nombre : 'Conexión',
      verticalId: (sub && verticalDeSubproducto(sub.id)) || 'conectividad',
      ancho: formatAnchoBandaMbps(anchoBandaMbpsDeInstancia(getInstanciaLigada(c))),
      respaldo: !!c.esBackup,
    };
  };
  const filas = [];
  const usados = new Set();
  state.conexiones.filter(c=>!c.esBackup).forEach(c=>{
    filas.push(fila(c)); usados.add(c.id);
    if(!c.instanciaId) return;
    state.conexiones.filter(b=>b.esBackup && b.instanciaId===c.instanciaId).forEach(b=>{ filas.push(fila(b)); usados.add(b.id); });
  });
  state.conexiones.filter(c=>!usados.has(c.id)).forEach(c=> filas.push(fila(c)));
  return filas;
}

function tarjetaServicioPDF(inst, heredadoDe){
  const sub = getSubproducto(inst.subproductoId);
  const producto = getProducto(sub.productoNivel2Id);
  const vertical = getVertical(inst.verticalId);
  const marca = inst.marca || 'No especificada';
  const lineas = [heredadoDe ? `Heredado de ${heredadoDe} · Marca: ${marca}` : `Marca: ${marca}`];
  if(!heredadoDe){
    const principal = state.conexiones.find(c=>c.instanciaId===inst.instanciaId && !c.esBackup);
    const respaldo = state.conexiones.find(c=>c.instanciaId===inst.instanciaId && c.esBackup);
    const tramo = c=>{ const o = origenDeConexion(c); return `${nombreEntidad(o)} → ${nombreEntidad(otroExtremo(c, o))}`; };
    if(principal) lineas.push(`Principal: ${tramo(principal)}`);
    if(respaldo){
      lineas.push(`Respaldo: ${tramo(respaldo)}`);
      lineas.push('Respaldo: comparte las propiedades del canal principal.');
    }
  }
  if(sub.id==='sdwan' && inst.targetConexionId){
    const t = state.conexiones.find(c=>c.id===inst.targetConexionId);
    if(t) lineas.push(`Aplicado sobre: ${nombreEntidad(t.aId)} ↔ ${nombreEntidad(t.bId)}`);
  }
  const props = Object.entries(inst.propiedades || {}).filter(([, v])=> v!==undefined && v!==null && String(v).trim()!=='');
  return {
    verticalId: inst.verticalId, categoria: `${vertical.nombre} / ${producto.nombre}`,
    nombre: inst.nombreSubproducto, heredado: !!heredadoDe, lineas, props, notas: inst.notas || '',
  };
}

/* Entidades en el orden de la plantilla: Matrices, Datacenter, Sedes, Nubes. La Nube automática
   de Internet solo aparece si tiene servicios propios. */
function entidadesDelReporte(){
  const lista = [];
  const propios = e=> (e.instancias || []).map(i=> tarjetaServicioPDF(i, null));
  state.matrices.forEach(m=>{
    const conc = concentradorDe(m.id);
    lista.push({ etiqueta:'Matriz', render:'matriz', nombre:m.nombre,
      meta: `${m.usuarios || 0} usuarios · ${pluralPDF(m.instancias.length, 'servicio propio', 'servicios propios')}`,
      concentrador: conc.enlaces.length ? conc : null, servicios: propios(m) });
  });
  if(state.datacenter.activo){
    const dc = state.datacenter;
    lista.push({ etiqueta:'Datacenter', render:'datacenter', nombre:dc.nombre,
      meta: pluralPDF(dc.instancias.length, 'servicio propio', 'servicios propios'), servicios: propios(dc) });
  }
  state.sedes.forEach(s=>{
    const heredadas = heredadasConNombreMatriz(s, state.matrices);
    lista.push({ etiqueta:'Sede', render:'sede', nombre:s.nombre,
      meta: [`${s.empleados} empleados`, `Tamaño: ${TAMANO_PDF[s.tamano] || getTamanoLocal(s.tamano).nombre}`,
        pluralPDF(s.instancias.length, 'servicio propio', 'servicios propios'),
        pluralPDF(heredadas.length, 'heredado', 'heredados')].join(' · '),
      servicios: propios(s).concat(heredadas.map(h=> tarjetaServicioPDF(h.inst, h.matrizNombre))) });
  });
  state.nubes.filter(n=> !n.esAutoInternet || n.instancias.length).forEach(n=>{
    lista.push({ etiqueta: n.esAutoInternet ? 'Nube de Internet' : 'Nube', render:'nube', nombre:n.nombre,
      meta: pluralPDF(n.instancias.length, 'servicio propio', 'servicios propios'), servicios: propios(n) });
  });
  return lista;
}

function datosReportePDF(config){
  const entidadesConServicios = [...state.matrices, ...state.sedes, ...state.nubes, ...(state.datacenter.activo ? [state.datacenter] : [])];
  // Estado inicial (cliente, 25/09): la foto del primer "Guardar estado actual" (T06), con su
  // captura del canvas y su salud. Ya no se pide un score a mano.
  const ini = config.estructuras.inicial, fin = config.estructuras.actual;
  const inicial = ini && ini.resumen ? ini.resumen.saludGlobal : null;
  return {
    cliente: config.nombreCliente, clienteLogo: config.clienteLogo, fecha: fechaLargaPDF(config.generadoEn),
    cifras: {
      sedes: state.sedes.length, matrices: state.matrices.length,
      nubes: state.nubes.filter(n=>!n.esAutoInternet).length,
      servicios: entidadesConServicios.reduce((n, e)=> n + (e.instancias || []).length, 0),
    },
    salud: { actual: config.salud.actual, inicial, porVertical: saludPorVertical() },
    inicio: ini ? { imagen: ini.imagen || null, hora: horaFoto(ini), resumen: ini.resumen } : null,
    // 25/09: la captura del final (el guardado automático al abrir el reporte) para comparar.
    final: fin ? { imagen: fin.imagen || null, hora: horaFoto(fin) } : null,
    enlaces: enlacesDelReporte(),
    entidades: entidadesDelReporte(),
  };
}

/* --- Armado de páginas --- */
function crearPaginaPDF(ctx, clase){
  const pagina = pdfEl('section', 'pdf-pagina' + (clase ? ' ' + clase : ''));
  const cabecera = pdfEl('header', 'pdf-pagina__cabecera');
  const logo = pdfEl('img', 'pdf-pagina__logo');
  logo.src = window.PN_REPORTE_ASSETS.logo; logo.alt = 'Puntonet';
  cabecera.append(logo, pdfEl('span', 'pdf-pagina__producto', 'Configurador de infraestructura'));
  const cuerpo = pdfEl('div', 'pdf-pagina__cuerpo');
  const pie = pdfEl('footer', 'pdf-pagina__pie');
  pie.append(pdfEl('span', 'pdf-pagina__cliente', `${ctx.datos.cliente} · ${ctx.datos.fecha}`), pdfEl('span', 'pdf-pagina__numero'));
  pagina.append(cabecera, cuerpo, pie);
  ctx.escenario.appendChild(pagina);
  ctx.paginas.push(pagina);
  return cuerpo;
}
function encabezadoSeccionPDF(overline, luz, fuerte, apilado){
  const box = pdfEl('div', 'pdf-seccion');
  box.appendChild(pdfEl('div', 'pdf-seccion__overline', overline));
  const h = pdfEl('h2', 'pdf-titulo' + (apilado ? ' pdf-titulo--apilado' : ''));
  h.append(pdfEl('span', 'pdf-titulo__luz', luz), document.createTextNode(' '), pdfEl('span', 'pdf-titulo__fuerte', fuerte));
  box.appendChild(h);
  return box;
}
function desbordaPDF(cuerpo){ return cuerpo.scrollHeight > cuerpo.clientHeight + 1; }

/* Reparte bloques en páginas. `nuevaPagina(continua)` crea la página (con su encabezado) y
   devuelve su cuerpo. Cada bloque es { nodo, prefijo? }: si el bloque abre una página que
   continúa una sección, `prefijo()` devuelve lo que va antes (p.ej. "Matriz Quito /
   Continuación" o la cabecera de la tabla), y `alColocar()` se llama cuando el bloque ya quedó
   en su página definitiva. Un bloque que no entra ni en una página vacía se deja igual (se
   corta), para no entrar en un bucle. */
function fluirBloquesPDF(bloques, nuevaPagina){
  let cuerpo = nuevaPagina(false), vacia = true;
  bloques.forEach(b=>{
    cuerpo.appendChild(b.nodo);
    if(!vacia && desbordaPDF(cuerpo)){
      b.nodo.remove();
      cuerpo = nuevaPagina(true);
      if(b.prefijo){ const p = b.prefijo(); if(p) cuerpo.appendChild(p); }
      cuerpo.appendChild(b.nodo);
    }
    vacia = false;
    if(b.alColocar) b.alColocar();
  });
}

function imagenCategoriaPDF(verticalId, color){
  // Los símbolos vienen en el cian del design system; se tiñen con el color de la categoría,
  // que se lee de css/reporte/pdf.css (.pdf-categoria--<vertical>).
  const base64 = window.PN_REPORTE_ASSETS.categorias[verticalId].split(',')[1];
  const svg = atob(base64).split('rgba(0,215,255,1)').join(color);
  const img = pdfEl('img', 'pdf-categoria__simbolo');
  img.src = 'data:image/svg+xml;base64,' + btoa(svg);
  img.alt = '';
  return img;
}

/* Relleno de una barra de salud. En pantalla (renderSaludPanel) el ancho va inline; acá no se
   suma ningún estilo inline: el relleno es un SVG del tamaño medido de la barra, con el ancho
   como atributo y el color de la categoría leído de css/reporte/pdf.css. La pista, el alto y el radio
   siguen siendo los de .pdf-categoria__barra. */
function rellenoBarraPDF(barra, pct, color){
  const w = Math.max(1, barra.clientWidth), h = Math.max(1, barra.clientHeight);
  const ancho = Math.round(w * Math.max(0, Math.min(100, pct)) / 100);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    (ancho>0 ? `<rect width="${Math.max(ancho, h)}" height="${h}" rx="${h/2}" fill="${color}"/>` : '') + '</svg>';
  const img = pdfEl('img', 'pdf-categoria__relleno');
  img.src = 'data:image/svg+xml;base64,' + btoa(svg);
  img.alt = '';
  return img;
}

function armarPortadaPDF(ctx){
  const d = ctx.datos;
  const cuerpo = crearPaginaPDF(ctx, 'pdf-pagina--portada');
  const intro = pdfEl('div', 'pdf-portada__intro');
  intro.appendChild(pdfEl('div', 'pdf-seccion__overline', 'Reporte de configuración'));
  const titulo = pdfEl('h1', 'pdf-portada__titulo');
  titulo.append(pdfEl('span', 'pdf-portada__titulo-luz', 'Tu infraestructura.'), pdfEl('span', 'pdf-portada__titulo-fuerte', 'Conectada.'));
  intro.appendChild(titulo);
  const cliente = pdfEl('div', 'pdf-portada__cliente');
  const clienteTexto = pdfEl('div', 'pdf-portada__cliente-texto');
  clienteTexto.appendChild(pdfEl('div', 'pdf-portada__cliente-nombre', d.cliente));
  const fecha = pdfEl('div', 'pdf-portada__fecha', `${d.fecha} · `);
  fecha.appendChild(pdfEl('span', 'pdf-portada__fecha-tipo', 'Configuración de infraestructura'));
  clienteTexto.appendChild(fecha);
  cliente.appendChild(clienteTexto);
  if(d.clienteLogo){
    const logo = pdfEl('img', 'pdf-portada__cliente-logo');
    logo.src = d.clienteLogo; logo.alt = '';
    cliente.appendChild(logo);
  }
  intro.appendChild(cliente);
  cuerpo.appendChild(intro);

  const figura = pdfEl('figure', 'pdf-esquema');
  const caja = pdfEl('div', 'pdf-esquema__caja');
  const img = pdfEl('img', 'pdf-esquema__img');
  img.alt = 'Esquema de la infraestructura configurada';
  caja.appendChild(img);
  figura.append(caja, pdfEl('figcaption', 'pdf-esquema__nota',
    'Vista de la infraestructura configurada y sus conexiones. Un respaldo se dibuja como una segunda línea junto al canal principal.'));
  cuerpo.appendChild(figura);

  const cifras = pdfEl('div', 'pdf-cifras');
  [[d.cifras.sedes, 'Sedes'], [d.cifras.matrices, 'Matrices'], [d.cifras.nubes, 'Nubes'], [d.cifras.servicios, 'Servicios propios']].forEach(([n, t])=>{
    const c = pdfEl('div', 'pdf-cifra');
    c.append(pdfEl('span', 'pdf-cifra__valor', String(n)), pdfEl('span', 'pdf-cifra__etiqueta', t));
    cifras.appendChild(c);
  });
  cuerpo.appendChild(cifras);

  const salud = pdfEl('div', 'pdf-portada__salud');
  salud.appendChild(pdfEl('span', 'pdf-portada__salud-valor', `${d.salud.actual}%`));
  const saludTexto = pdfEl('div', 'pdf-portada__salud-texto');
  saludTexto.append(pdfEl('div', 'pdf-portada__salud-overline', 'Salud de infraestructura'),
    pdfEl('p', 'pdf-portada__salud-desc', 'Cobertura de servicios en las ubicaciones del cliente. Consulta el desglose por categoría y el detalle de cada elemento en las siguientes páginas.'));
  salud.appendChild(saludTexto);
  cuerpo.appendChild(salud);

  // La foto se toma con el tamaño real que ocupa en la página (ya maquetada) × la escala.
  const estilo = estiloEtiquetaEsquema(figura);
  img.src = captureHeroSnapshot(caja.clientWidth*PDF_ESCALA, caja.clientHeight*PDF_ESCALA, estilo, PDF_ESCALA);
}

function armarResumenPDF(ctx){
  const d = ctx.datos;
  const bloques = [];

  const salud = pdfEl('div', 'pdf-salud');
  const valor = pdfEl('div', 'pdf-salud__valor', String(d.salud.actual));
  valor.appendChild(pdfEl('span', 'pdf-salud__pct', '%'));
  const texto = pdfEl('div', 'pdf-salud__texto');
  texto.append(pdfEl('div', 'pdf-salud__overline', 'Salud de infraestructura'),
    pdfEl('p', 'pdf-salud__desc', 'Promedio de cobertura de las cuatro categorías de servicios en las ubicaciones del cliente.'));
  if(d.salud.inicial!==null && d.salud.inicial!==undefined){
    const cambio = d.salud.actual - d.salud.inicial;
    const p = pdfEl('p', 'pdf-salud__inicial', 'Estado inicial: ');
    p.append(pdfEl('strong', null, `${d.salud.inicial}%`), document.createTextNode(' · Cambio: '),
      pdfEl('strong', null, `${cambio>0 ? '+' : ''}${cambio} ${Math.abs(cambio)===1 ? 'punto' : 'puntos'}`));
    texto.appendChild(p);
  }
  salud.append(valor, texto);
  bloques.push({ nodo: salud });
  if(d.inicio) bloques.push({ nodo: bloqueInicioPDF(d) });

  const categorias = pdfEl('div', 'pdf-categorias');
  const pintarCategorias = [];
  d.salud.porVertical.forEach(v=>{
    const c = pdfEl('div', `pdf-categoria pdf-categoria--${v.vertical.id}`);
    const icono = pdfEl('span', 'pdf-categoria__icono');
    const barra = pdfEl('span', 'pdf-categoria__barra');
    c.append(icono, pdfEl('span', 'pdf-categoria__nombre', v.vertical.nombre), pdfEl('span', 'pdf-categoria__pct', `${v.pct}%`),
      barra, pdfEl('span', 'pdf-categoria__detalle',
        v.elegibles ? `${v.cubiertas} de ${pluralPDF(v.elegibles, 'ubicación cubierta', 'ubicaciones cubiertas')}` : 'Sin ubicaciones todavía'));
    categorias.appendChild(c);
    // El símbolo y el relleno se pintan cuando el bloque ya está en su página: necesitan el color
    // de la categoría (css/reporte/pdf.css) y el ancho real de la barra.
    pintarCategorias.push(()=>{
      const color = getComputedStyle(c).color;
      icono.appendChild(imagenCategoriaPDF(v.vertical.id, color));
      barra.appendChild(rellenoBarraPDF(barra, v.pct, color));
    });
  });
  bloques.push({ nodo: categorias, alColocar: ()=> pintarCategorias.forEach(f=>f()) });

  bloques.push({ nodo: pdfEl('p', 'pdf-nota', 'Este indicador refleja qué categorías de servicio cubren a cada ubicación del cliente (Sedes y Matrices). No representa disponibilidad, un SLA ni una auditoría de seguridad. El estado inicial, cuando existe, es la salud calculada al guardar el inicio de la sesión.') });

  const cabeceraTabla = ()=>{
    const f = pdfEl('div', 'pdf-tabla__fila pdf-tabla__fila--cabeza');
    ['Origen', 'Destino', 'Servicio', 'Tipo'].forEach(t=> f.appendChild(pdfEl('span', null, t)));
    return f;
  };
  const filaTabla = e=>{
    const f = pdfEl('div', 'pdf-tabla__fila');
    const serv = pdfEl('span', `pdf-tabla__servicio pdf-tabla__servicio--${e.verticalId}`, e.servicio);
    if(e.ancho) serv.appendChild(pdfEl('span', 'pdf-tabla__ancho', e.ancho));
    const tipo = pdfEl('span');
    tipo.appendChild(pdfEl('span', 'pdf-insignia ' + (e.respaldo ? 'pdf-insignia--respaldo' : 'pdf-insignia--principal'), e.respaldo ? 'Respaldo' : 'Principal'));
    f.append(pdfEl('span', 'pdf-tabla__entidad', e.origen), pdfEl('span', 'pdf-tabla__entidad', e.destino), serv, tipo);
    return f;
  };
  const inicioTabla = pdfEl('div', 'pdf-tabla');
  const tituloTabla = pdfEl('div', 'pdf-tabla__titulo');
  tituloTabla.append(pdfEl('h3', 'pdf-tabla__nombre', 'Conexiones de la red'),
    pdfEl('span', 'pdf-tabla__cuenta', pluralPDF(d.enlaces.length, 'enlace', 'enlaces')));
  inicioTabla.append(tituloTabla, cabeceraTabla());
  if(!d.enlaces.length) inicioTabla.appendChild(pdfEl('div', 'pdf-vacio', 'Todavía no hay conexiones configuradas.'));
  else inicioTabla.appendChild(filaTabla(d.enlaces[0]));
  bloques.push({ nodo: inicioTabla });
  d.enlaces.slice(1).forEach(e=> bloques.push({ nodo: filaTabla(e), prefijo: cabeceraTabla }));
  if(d.enlaces.some(e=>e.respaldo)){
    bloques.push({ nodo: pdfEl('p', 'pdf-nota', 'Los enlaces de respaldo conservan el ancho de banda del canal principal. No se suman nuevamente a la capacidad del concentrador.') });
  }

  fluirBloquesPDF(bloques, continua=>{
    const cuerpo = crearPaginaPDF(ctx);
    cuerpo.appendChild(encabezadoSeccionPDF(continua ? '01 / Resumen · Continuación' : '01 / Resumen', 'La configuración,', 'en perspectiva.', true));
    return cuerpo;
  });
}

/* Estado inicial vs final (cliente, 25/09): las capturas del canvas del inicio de la sesión y del
   final (al generar el reporte), lado a lado, cada una con su salud, y debajo los conteos
   inicio → final. Si falta una captura queda el hueco con "Sin captura". */
function ladoComparacionPDF(titulo, hora, imagen, salud){
  const lado = pdfEl('figure', 'pdf-comparacion__lado');
  const caja = pdfEl('div', 'pdf-comparacion__caja');
  if(imagen){
    const img = pdfEl('img', 'pdf-comparacion__img');
    img.src = imagen; img.alt = `Estructura: ${titulo.toLowerCase()} de la sesión`;
    caja.appendChild(img);
  } else {
    caja.appendChild(pdfEl('span', 'pdf-comparacion__sin-img', 'Sin captura'));
  }
  const pie = pdfEl('figcaption', 'pdf-comparacion__pie');
  pie.appendChild(pdfEl('span', 'pdf-comparacion__titulo', hora ? `${titulo} · ${hora}` : titulo));
  const valor = pdfEl('span', 'pdf-comparacion__valor', String(salud));
  valor.appendChild(pdfEl('span', 'pdf-comparacion__pct', '%'));
  pie.appendChild(valor);
  lado.append(caja, pie);
  return lado;
}
function bloqueInicioPDF(d){
  const box = pdfEl('div', 'pdf-comparacion');
  box.appendChild(pdfEl('div', 'pdf-salud__overline', 'Estructura · inicio y final de la sesión'));
  const fila = pdfEl('div', 'pdf-comparacion__fila');
  fila.append(
    ladoComparacionPDF('Inicio', d.inicio.hora, d.inicio.imagen, d.salud.inicial),
    ladoComparacionPDF('Final', d.final && d.final.hora, d.final && d.final.imagen, d.salud.actual));
  box.appendChild(fila);
  const r = d.inicio.resumen;
  const conteos = [[r.sedes, d.cifras.sedes, 'Sedes'], [r.matrices, d.cifras.matrices, 'Matrices'],
    [r.nubes, d.cifras.nubes, 'Nubes'], [r.productos, d.cifras.servicios, 'Servicios']];
  const lista = pdfEl('dl', 'pdf-comparacion__conteos');
  conteos.forEach(([a, b, t])=>{
    const item = pdfEl('div', 'pdf-comparacion__conteo');
    item.append(pdfEl('dt', null, t), pdfEl('dd', null, `${a} → ${b}`));
    lista.appendChild(item);
  });
  box.appendChild(lista);
  return box;
}

function tarjetaServicioNodoPDF(s){
  const card = pdfEl('article', `pdf-servicio pdf-servicio--${s.verticalId}`);
  const cabeza = pdfEl('div', 'pdf-servicio__cabeza');
  const titulos = pdfEl('div');
  titulos.append(pdfEl('div', 'pdf-servicio__categoria', s.categoria), pdfEl('h4', 'pdf-servicio__nombre', s.nombre));
  cabeza.append(titulos, pdfEl('span', 'pdf-insignia pdf-servicio__insignia', s.heredado ? 'Heredado' : 'Propio'));
  card.appendChild(cabeza);
  s.lineas.forEach(l=> card.appendChild(pdfEl('p', 'pdf-servicio__linea', l)));
  if(s.props.length){
    const dl = pdfEl('dl', 'pdf-servicio__props');
    s.props.forEach(([k, v])=>{
      const item = pdfEl('div', 'pdf-servicio__prop');
      item.append(pdfEl('dt', null, k), pdfEl('dd', null, String(v)));
      dl.appendChild(item);
    });
    card.appendChild(dl);
  }
  if(s.notas){
    const notas = pdfEl('div', 'pdf-servicio__notas');
    notas.append(pdfEl('div', 'pdf-servicio__notas-titulo', 'Notas'), pdfEl('p', null, s.notas));
    card.appendChild(notas);
  }
  return card;
}

function armarDetallePDF(ctx){
  const bloques = [];
  ctx.datos.entidades.forEach(e=>{
    // El encabezado de la entidad viaja pegado a su primer servicio: nunca queda solo al pie.
    const grupo = pdfEl('div', 'pdf-grupo');
    const cabeza = pdfEl('article', 'pdf-entidad');
    const render = pdfEl('img', 'pdf-entidad__render');
    render.src = window.PN_REPORTE_ASSETS.renders[e.render]; render.alt = '';
    const info = pdfEl('div', 'pdf-entidad__info');
    info.append(pdfEl('div', 'pdf-entidad__tipo', e.etiqueta), pdfEl('h3', 'pdf-entidad__nombre', e.nombre), pdfEl('p', 'pdf-entidad__meta', e.meta));
    cabeza.append(render, info);
    grupo.appendChild(cabeza);
    if(e.concentrador){
      const c = e.concentrador;
      const conc = pdfEl('div', 'pdf-concentrador');
      const txt = pdfEl('div', 'pdf-concentrador__texto');
      const principales = pluralPDF(c.enlaces.length, 'canal principal', 'canales principales');
      const respaldo = c.conBackup ? ` ${c.conBackup} con respaldo; el respaldo no agrega capacidad.` : '';
      txt.append(pdfEl('div', 'pdf-concentrador__titulo', 'Concentrador calculado'), pdfEl('p', 'pdf-concentrador__desc', `Suma de ${principales}.${respaldo}`));
      conc.append(pdfEl('span', 'pdf-concentrador__valor', c.texto), txt);
      grupo.append(conc, pdfEl('p', 'pdf-desglose', c.enlaces.map(x=>
        `${x.origen}: ${formatAnchoBandaMbps(x.mbps) || 'sin ancho de banda'}${x.tieneBackup ? ' (con respaldo)' : ''}`).join(' · ')));
    }
    if(!e.servicios.length){
      grupo.appendChild(pdfEl('div', 'pdf-vacio', 'Sin servicios asignados.'));
      bloques.push({ nodo: grupo });
      return;
    }
    grupo.appendChild(tarjetaServicioNodoPDF(e.servicios[0]));
    bloques.push({ nodo: grupo });
    e.servicios.slice(1).forEach(s=> bloques.push({ nodo: tarjetaServicioNodoPDF(s),
      prefijo: ()=> pdfEl('p', 'pdf-continuacion', `${e.nombre} / Continuación`) }));
  });
  fluirBloquesPDF(bloques, continua=>{
    const cuerpo = crearPaginaPDF(ctx);
    cuerpo.appendChild(encabezadoSeccionPDF(continua ? '02 / Configuración · Continuación' : '02 / Configuración', 'Detalle', 'de infraestructura.', false));
    return cuerpo;
  });
}

function esperarImagenesPDF(raiz){
  return Promise.all([...raiz.querySelectorAll('img')].map(img=>
    (img.decode ? img.decode() : Promise.resolve()).catch(()=>{})));
}

/* Exportación a PDF: arma las páginas en un escenario fuera de pantalla, espera la tipografía y
   las imágenes, y pasa cada página por html2canvas. Es async: el botón queda deshabilitado
   mientras tanto y un aviso indica que se está generando. */
let pdfEnCurso = false;
/* Librerías del PDF (jsPDF + html2canvas, ~550 KB). Solo hacen falta al exportar, pero antes se
   cargaban con <script> al abrir la app y demoraban el arranque. Ahora main.js las pide cuando el
   navegador queda libre, así ya están listas antes del primer clic; si todavía no llegaron (o
   fallaron por falta de red), downloadPDF las espera o las vuelve a pedir. */
const LIBRERIAS_PDF = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
];
let libreriasPDF = null;
function cargarLibreriasPDF(){
  if(libreriasPDF) return libreriasPDF;
  const cargar = src=> new Promise(resolver=>{
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = ()=> resolver(true);
    s.onerror = ()=>{ s.remove(); resolver(false); };
    document.head.appendChild(s);
  });
  libreriasPDF = Promise.all(LIBRERIAS_PDF.map(cargar)).then(ok=>{
    const todas = ok.every(Boolean);
    if(!todas) libreriasPDF = null; // el próximo intento las vuelve a pedir
    return todas;
  });
  return libreriasPDF;
}

async function downloadPDF(){
  if(pdfEnCurso) return;
  if(!window.html2canvas || !window.jspdf){
    pdfEnCurso = true; // evita un segundo clic mientras llegan las librerías
    await cargarLibreriasPDF();
    pdfEnCurso = false;
  }
  if(!window.html2canvas || !window.jspdf || !window.PN_REPORTE_ASSETS){
    showToast('No se pudo generar el PDF: faltan librerías o imágenes del reporte.');
    return;
  }
  pdfEnCurso = true;
  const boton = byId('btnExportPDF');
  const textoBoton = boton.textContent;
  boton.disabled = true;
  boton.textContent = 'Generando PDF…'; // en una tablet puede tardar unos segundos por página
  showToast('Generando el PDF…');
  const escenario = pdfEl('div', 'pdf-escenario');
  escenario.setAttribute('aria-hidden', 'true');
  document.body.appendChild(escenario);
  try {
    guardarEstructura(false); // T06: el final del reporte es lo que hay en pantalla
    const config = buildConfiguracionCliente();
    const ctx = { escenario, paginas: [], datos: datosReportePDF(config) };
    if(document.fonts){
      await Promise.all(['300', '400', '500', '700'].map(p=> document.fonts.load(`${p} 16px Inter`).catch(()=>{})));
      await document.fonts.ready;
    }
    armarPortadaPDF(ctx);
    armarResumenPDF(ctx);
    armarDetallePDF(ctx);
    const total = ctx.paginas.length;
    ctx.paginas.forEach((p, i)=>{
      p.querySelector('.pdf-pagina__numero').textContent = `${String(i+1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    });
    await esperarImagenesPDF(escenario);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:'pt', format:'a4', compress:true });
    const pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight();
    for(let i=0; i<total; i++){
      const lienzo = await window.html2canvas(ctx.paginas[i], { scale: PDF_ESCALA, backgroundColor: null, logging: false,
        // html2canvas clona el documento entero por cada página; clonar la app (canvas WebGL,
        // paneles, modales) no aporta nada y es lo que más tarda. Solo se clona el escenario.
        ignoreElements: n=> !(n.contains(escenario) || escenario.contains(n) || n.closest('head')) });
      if(i>0) doc.addPage();
      doc.addImage(lienzo.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, pageW, pageH, undefined, 'FAST');
    }
    const fecha = new Date().toISOString().slice(0, 10);
    doc.save(`reporte-${safeFileName(config.nombreCliente)}-${fecha}.pdf`);
  } catch(err){
    console.error('[pdf] no se pudo generar el reporte:', err);
    showToast('No se pudo generar el PDF. Revisa la consola para más detalle.');
  } finally {
    escenario.remove();
    boton.textContent = textoBoton;
    boton.disabled = false;
    pdfEnCurso = false;
  }
}
byId('btnExportPDF').addEventListener('click', downloadPDF);

