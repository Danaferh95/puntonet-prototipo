/* =========================================================================
   2. ESTADO GLOBAL
   ========================================================================= */

/* Atajo unico para resolver nodos del DOM por id (se usa ~75 veces, entre las referencias fijas
   de arranque y las que cada render vuelve a buscar tras reescribir su innerHTML). */
function byId(id){ return document.getElementById(id); }

const state = {
  clienteNombre: '',
  clienteLogo: null,     // dataURL (base64) del logo del cliente, opcional — se incluye en el PDF
  estructuras: { inicial:null, actual:null }, // T06: inicio de la sesión (primer guardado) y estado actual (ver fotoEstructura)
  sedes: [],            // { id, nombre, tipo, gx, gz, group(THREE.Group), instancias:[], herenciaIds:[] }
  matrices: [],          // { id, nombre, tipo:'matriz', gx, gz, group(THREE.Group), instancias:[] } — igual que
                          // las sedes: se crean arrastrando, pueden ser varias, y van donde el usuario quiera.
  nubes: [],              // { id, nombre, tipo:'nube', gx, gz, group(THREE.Group), instancias:[] } — destino de
                          // Cloud Interconnect (v9 §4/§5); por ahora solo se crean al vuelo desde el dropdown
                          // "Conectar a" de Cloud Interconnect (no tienen catálogo de productos propios todavía).
  datacenter: { id:'datacenter', nombre:'Datacenter Epicentro', tipo:'datacenter', group:null, instancias:[], activo:true }, // edificio fijo de Puntonet — aparece por defecto, pero se puede eliminar (ago/2026, ver deleteDatacenter) si el proyecto no lo necesita
  conexiones: [],        // { id, aId, bId, subproductoId, instanciaId, ownerId, esBackup } — cable entre 2
                          // entidades; instanciaId+ownerId lo ligan al "servicio asignado" que
                          // representa (misma cosa, no dos registros — ver ensureConexionAutomatica).
                          // esBackup:true (v9 §2) marca el segundo enlace en paralelo generado por el
                          // checkbox "Backup" — comparte instanciaId/ownerId con el enlace principal.
  selectedSedeIds: [],   // ids de sede/Matriz/Nube, y opcionalmente 'datacenter'
  selectedConexionId: null, // id de la conexión seleccionada (mutuamente excluyente con selectedSedeIds)
  nextSedeSeq: 1,
  nextMatrizSeq: 1,
  nextNubeSeq: 1,
  nextInstanceSeq: 1,
  nextConexionSeq: 1,
  placing: null,         // { tipo:'sede' } | { tipo:'matriz' } | { tipo:'subproducto', id } — flujo táctil "armar y colocar"
};

/* Resuelve sedes reales, Matrices y el Datacenter a partir de un id (uniforme para selección,
   popups de servicio, puertos de conexión y assets 3D). Las Matrices son, en la práctica, "sedes
   especiales": mismo modelo de datos (id, nombre, gx, gz, group, instancias), solo que con otra
   geometría 3D y sin tamaño derivado de empleados. */
function getSedeById(id){
  if(id==='datacenter') return state.datacenter;
  const matriz = state.matrices.find(m=>m.id===id);
  if(matriz) return matriz;
  const nube = state.nubes.find(n=>n.id===id);
  if(nube) return nube;
  return state.sedes.find(s=>s.id===id);
}
/* Las 2 vistas del "conjunto de entidades" que usa el resto del archivo. Estaban escritas como
   spreads sueltos (`[...state.sedes, ...state.matrices]`) en 6 puntos distintos, de modo que
   sumar un tipo de nodo nuevo obligaba a acordarse de cada uno.
   - portadoras: las que pueden tener productos propios CON cable (sedes y Matrices).
   - todas: ademas Nubes y el Datacenter, para conteos globales (Salud, reporte). */
function entidadesPortadoras(){ return [...state.sedes, ...state.matrices]; }
function todasLasEntidades(){ return [...state.sedes, ...state.matrices, ...state.nubes, state.datacenter]; }

function getMatrizById(id){ return state.matrices.find(m=>m.id===id); }
function getNubeById(id){ return state.nubes.find(n=>n.id===id); }
function tipoEntidad(id){
  if(id==='datacenter') return 'datacenter';
  if(state.matrices.some(m=>m.id===id)) return 'matriz';
  if(state.nubes.some(n=>n.id===id)) return 'nube';
  return 'sede';
}
function nombreEntidad(id){ const e = getSedeById(id); return e ? e.nombre : id; }
/* Busca una instancia de producto entre TODAS las Matrices (los instanciaId son únicos
   globalmente vía nextInstanceSeq, así que no hace falta saber de antemano de qué Matriz es). */
function findInstanciaEnMatrices(instanciaId){
  for(const m of state.matrices){
    const found = m.instancias.find(i=>i.instanciaId===instanciaId);
    if(found) return found;
  }
  return null;
}

/* --- Conexiones: cables entre 2 entidades cualquiera (Sede↔Sede, Sede↔Matriz, Matriz↔Matriz,
   Sede/Matriz↔Datacenter) — se crean arrastrando desde el "puerto" (§5) o, para Canal de
   Conexión/Sdwan, eligiendo el destino en el dropdown "Conectar a" del popup de asignación.
   Sede↔Sede estaba deshabilitado hasta esta fase (quedó como pregunta abierta pendiente de
   validar con el cliente final, ver documentación adjunta); ya está confirmado y habilitado —
   Canal de Conexión es justamente "enlace punto a punto entre al menos 2 ubicaciones", así que
   Sede↔Sede es un caso de negocio real. */
function parValidoConexion(aId, bId){
  return aId!==bId;
}
function conexionExiste(aId, bId){
  return state.conexiones.some(c=>(c.aId===aId&&c.bId===bId)||(c.aId===bId&&c.bId===aId));
}
function conexionesDe(entityId){
  return state.conexiones.filter(c=>c.aId===entityId||c.bId===entityId);
}
function otroExtremo(conexion, entityId){
  return conexion.aId===entityId ? conexion.bId : conexion.aId;
}

/* --- Concentrador (sep/2026, pedido cliente 03/09) -----------------------------------------
   "Si sumas 3 canales de 100 megas tienes 300 megas en el concentrador; eso debería estar dentro
   de la Matriz — no se ve en el mapa, se ve cuando le das clic a la Matriz, o en el reporte."

   No es un producto del catálogo ni algo que se arrastre: es un valor DERIVADO de los cables que
   ya existen. Por eso vive acá, junto a los helpers de conexiones, y no en SUBPRODUCTOS ni en el
   estado — no hay nada que guardar ni que sincronizar, se recalcula en cada render.

   Reglas (las 3 salen textuales de los mensajes del cliente del 28/08 y del 03/09):
     1. Suman los enlaces marcados `sumaConcentrador` en el catálogo (hoy: Canal de Conexión) que
        llegan a la entidad, venga el cable desde donde venga (da igual qué extremo sea el dueño
        de la instancia).
     2. Los enlaces de Backup NO suman: "no es que el concentrador sube a 600 megas, sigue siendo
        de 300". Se cuentan aparte, para poder decir cuántos canales están respaldados.
     3. El Backup hereda el ancho de banda de su canal principal — es la misma instancia, así que
        el dato ya es literalmente el mismo objeto; solo faltaba mostrarlo (ver reporte y PDF).

   Se calcula para cualquier entityId (Sede, Matriz, Nube o Datacenter); hoy solo se MUESTRA en la
   Matriz, que es lo que pidió el cliente — habilitarlo en otra entidad es agregar la llamada en
   su render, sin tocar este cálculo. */
function anchoBandaMbpsDeInstancia(inst){
  if(!inst || !inst.propiedades) return 0;
  const sub = getSubproducto(inst.subproductoId);
  if(!sub) return 0;
  // Se busca el parámetro por su TIPO declarado en el catálogo, no por el literal "Ancho de
  // banda": si algún subproducto lo llama distinto, esto lo sigue encontrando.
  const tipos = sub.parametrosTipos || {};
  const nombreProp = (sub.parametros||[]).find(p=>tipos[p]==='anchoBanda');
  if(!nombreProp) return 0;
  return parseAnchoBandaMbps(inst.propiedades[nombreProp], 0);
}

function concentradorDe(entityId){
  const enlaces = [];
  conexionesDe(entityId).forEach(c=>{
    if(c.esBackup) return; // regla 2: el respaldo no suma
    if(!c.subproductoId) return;
    const sub = getSubproducto(c.subproductoId);
    if(!sub || !sub.sumaConcentrador) return;
    enlaces.push({
      conexionId: c.id,
      nombreSubproducto: sub.nombre,
      origen: nombreEntidad(otroExtremo(c, entityId)),
      mbps: anchoBandaMbpsDeInstancia(getInstanciaLigada(c)),
      // El backup comparte instanciaId con su principal (ver syncBackupConexion).
      tieneBackup: state.conexiones.some(x=>x.instanciaId===c.instanciaId && x.esBackup),
    });
  });
  const totalMbps = enlaces.reduce((acc,e)=>acc+e.mbps, 0);
  return {
    enlaces,
    totalMbps,
    conBackup: enlaces.filter(e=>e.tieneBackup).length,
    // formatAnchoBandaMbps devuelve '' para 0 — acá conviene el "0 Mbps" explícito.
    texto: formatAnchoBandaMbps(totalMbps) || '0 Mbps',
  };
}

/* --- Tipo de conexión del cable tendido a mano desde el puerto (§5) ---
   Hasta ago/2026 la regla era provisional: un extremo en el Datacenter Epicentro guardaba la
   conexión como "Cloud Interconnect", cualquier otro par como "Canal de Conexión". El cliente
   (28/08/2026) cerró la pregunta en sentido contrario: Cloud Interconnect va ÚNICAMENTE hacia una
   nube de proveedor (Azure/AWS/GCP), nunca hacia el Datacenter ni hacia Internet — y en cambio el
   Canal de Conexión sí puede terminar en el Datacenter. Como una Nube nunca puede ser extremo de
   este gesto (ver onPointerMove: el cable a mano no sabe de Nubes), el único tipo posible acá
   pasa a ser Canal de Conexión. Las conexiones hacia una nube se crean por el dropdown
   "Conectar a" de Cloud Interconnect, que lleva su propio subproductoId. */
function tipoConexionPorDestino(){
  return 'canal_conexion';
}

/* --- T04 (reunión 22/09): el "+" hacia una Nube es un Cloud Interconnect ---
   Hasta ahora el cable a mano no aceptaba Nubes como destino, y la única forma de llegar a una
   era el dropdown "Conectar a" del producto. El cliente pidió que conectar con una nube desde el
   "+" SEA crear un Cloud Interconnect: al soltar sobre una Nube no se crea ningún canal, se abre
   el formulario de Cloud Interconnect con el origen y la Nube ya elegidos, y la conexión recién
   existe cuando se guarda (cancelar no deja nada a medias).

   Qué Nubes valen como destino lo decide el propio catálogo, igual que en el dropdown: el origen
   tiene que poder llevar un Cloud Interconnect (`destinos` del subproducto: Sede o Matriz, no el
   Datacenter) y la Nube tiene que estar entre sus candidatos (candidatosConexionEntreSedes, que
   ya excluye la Nube automática de Internet).

   Si ya existe un Cloud Interconnect entre ese origen y esa Nube (decisión de Dei, 23/09): se abre
   ese para editarlo, en lugar de crear otro. */
const SUB_CLOUD_INTERCONNECT = 'cloud_interconnect';
function esDestinoCloudInterconnect(origenId, destinoId){
  if(!origenId || !destinoId || tipoEntidad(destinoId)!=='nube') return false;
  const sub = getSubproducto(SUB_CLOUD_INTERCONNECT);
  if(!sub || !destinosPermitidos(sub).includes(tipoEntidad(origenId))) return false;
  return candidatosConexionEntreSedes(origenId, sub).some(e=>e.id===destinoId);
}
function cloudInterconnectExistente(origenId, nubeId){
  return state.conexiones.find(c=> c.subproductoId===SUB_CLOUD_INTERCONNECT && !c.esBackup &&
    ((c.aId===origenId && c.bId===nubeId) || (c.aId===nubeId && c.bId===origenId)));
}
/* ¿El cable a mano puede terminar en `destinoId`? Nube → solo como Cloud Interconnect; el resto,
   la regla de siempre (parValidoConexion). */
function destinoValidoCableManual(origenId, destinoId){
  if(!destinoId || destinoId===origenId) return false;
  if(tipoEntidad(destinoId)==='nube') return esDestinoCloudInterconnect(origenId, destinoId);
  return parValidoConexion(origenId, destinoId);
}
function abrirCloudInterconnectDesdeCable(origenId, nubeId){
  state.selectedSedeIds = [origenId];
  const existente = cloudInterconnectExistente(origenId, nubeId);
  if(existente){
    state.selectedConexionId = existente.id;
    updateSelectionVisuals();
    rebuildConnections();
    renderRightPanel();
    openPopupForEdit(existente.ownerId, existente.instanciaId);
    return;
  }
  state.selectedConexionId = null;
  updateSelectionVisuals();
  renderRightPanel();
  openPopupForNew(SUB_CLOUD_INTERCONNECT, [origenId]);
  // renderPopupConexionField ya listó las Nubes candidatas; se deja elegida la del cable.
  popupConexionSelect.value = nubeId;
}

/* --- Auto-conexión: ¿este subproducto, al asignarse a una Sede/Matriz, debe generar también
   una línea de conexión hacia el Datacenter, sin preguntar nada? Solo los subproductos marcados
   `conexion:'datacenter'` en el catálogo (ver definición de SUBPRODUCTOS más arriba). Los
   marcados `conexion:'entreSedes'` (Canal de Conexión, Sdwan) NO se auto-conectan aquí: se
   resuelven con un dropdown de destino en el propio popup de asignación (ver openPopupForNew /
   btnSavePopup). Los marcados `conexion:'satelital'` (Puntonet Space) tampoco pasan por acá: se
   dibujan directamente en rebuildConnections() como un enlace hacia el cielo, sin conexión real
   a otra entidad. --- */
function generaConexionAutomatica(sub){
  return sub.conexion === 'datacenter' || sub.conexion === 'internetAuto';
}

/* --- Destino automático de Internet (v9 §6): una sola Nube "Internet" por proyecto ---
   Internet Corporativo/Startup/Teleworking (`conexion:'internetAuto'`) ya NO van al Datacenter
   Epicentro (conceptualmente incorrecto: el internet sale hacia afuera, no hacia el datacenter
   físico de Puntonet) — convergen todos a UNA sola Nube automática, creada sola la primera vez
   que se necesita (el vendedor no la crea ni la nombra) y reutilizada después. El Datacenter
   sigue SIN conectarse solo a esta nube por el hecho de existir (decisión del cliente, por
   seguridad: p.ej. storage privado sin salida a Internet); desde ago/2026 sí sale a Internet
   cuando el vendedor le asigna explícitamente un Internet Corporativo — ahí el cable
   Datacenter → Nube de Internet lo crea esta misma vía. Se marca `esAutoInternet:true`
   para distinguirla de una Nube de Hosting creada a mano (AWS/Azure/etc., v9 §5). */
function getOrCreateNubeInternetAuto(){
  const existente = state.nubes.find(n=>n.esAutoInternet);
  if(existente) return existente;
  const {gx,gz} = nearestFreeCell(GRID_SPACING*6, DATACENTER_GZ*GRID_SPACING, null, huellaDeClave('nube'));
  const nube = createNube('Internet', gx, gz);
  nube.esAutoInternet = true;
  return nube;
}

/* Crea la conexión automática entityId → su destino correspondiente, usando como tipo el MISMO
   subproducto que se acaba de arrastrar, y ligada a la instancia que la originó (instanciaId +
   ownerId). El destino depende del `conexion` del subproducto: 'datacenter' → el Datacenter
   Epicentro (Zona Wireless, sin cambios); 'internetAuto' → la Nube de Internet (única, v9 §6).
   Antes se recalculaba el tipo con tipoConexionPorDestino() según los IDs de los extremos, lo que
   podía des-sincronizar el tipo de cable del producto real asignado. La conexión y la instancia
   son la MISMA cosa desde el punto de vista del panel derecho: no hay dos formularios separados
   con valores que puedan desincronizarse — ver renderConnectionsBox, que al hacer clic en la
   conexión abre el mismo popup que "Servicios asignados". Cada producto obtiene SU PROPIO cable
   (no se comparte uno solo entre varios productos): así, entre más productos de una sede conecten
   al mismo destino, más líneas delgadas en paralelo se ven — no una sola línea más gruesa (ver el
   "abanico" en rebuildConnections). */
function ensureConexionAutomatica(entityId, subproductoId, instanciaId){
  // Hasta ago/2026 esta función salía temprano si el origen era el Datacenter (no había ningún
  // producto `internetAuto` asignable a él, y un producto `conexion:'datacenter'` asignado ahí
  // habría intentado conectarlo consigo mismo). Ahora Internet Corporativo sí se asigna al
  // Datacenter (pedido cliente 28/08), así que el corte lo hace el chequeo genérico
  // parValidoConexion de abajo: Datacenter → Nube de Internet pasa; Datacenter → Datacenter no.
  const sub = getSubproducto(subproductoId);
  const destinoId = sub.conexion==='internetAuto' ? getOrCreateNubeInternetAuto().id : 'datacenter';
  if(!parValidoConexion(entityId, destinoId)) return;
  const conexion = {
    id: uid('conn','nextConexionSeq'), aId:entityId, bId:destinoId,
    subproductoId, instanciaId, ownerId: entityId,
  };
  state.conexiones.push(conexion);
}

/* --- Destinos permitidos por subproducto (ago/2026) ---
   Generaliza los antiguos flags `soloDatacenter`/`soloNube` en un solo campo `destinos`, para que
   habilitar/restringir un producto a un nuevo tipo de nodo (Sede, Matriz, Nube, Datacenter) sea
   un cambio de UNA línea en el catálogo (SUBPRODUCTOS) en vez de tocar la lógica de asignación.
   Sin `destinos` en el catálogo, el valor por defecto es ['sede','matriz'] (comportamiento
   histórico: la mayoría de productos solo se asignan a una sede o a una Matriz). */
function destinosPermitidos(sub){
  return sub.destinos || ['sede','matriz'];
}
/* ¿Este subproducto se puede soltar sobre una entidad del tipo `tipo` ('sede'|'matriz'|'nube'|
   'datacenter', ver tipoEntidad)? Además de la lista del catálogo, el Datacenter cuenta como
   destino inválido mientras esté eliminado (state.datacenter.activo===false, ver
   deleteDatacenter/restoreDatacenter) — así no hace falta repetir ese chequeo en cada punto de
   asignación. */
function destinoValido(sub, tipo){
  if(tipo==='datacenter' && !state.datacenter.activo) return false;
  return destinosPermitidos(sub).includes(tipo);
}
function destinoValidoParaEntidad(sub, entityId){
  return destinoValido(sub, tipoEntidad(entityId));
}
/* Texto legible de a dónde se puede asignar un subproducto, para tooltips/toasts/hints — se
   arma dinámicamente a partir de `destinos` en vez de tener un mensaje fijo por combinación. */
function nombreDestinos(sub){
  const destinos = destinosPermitidos(sub);
  const partes = [];
  if(destinos.includes('datacenter')) partes.push('el Datacenter Epicentro');
  if(destinos.includes('nube')) partes.push('una Nube');
  if(destinos.includes('sede') || destinos.includes('matriz')) partes.push('una sede o una Matriz');
  if(partes.length<=1) return partes.join('');
  return partes.slice(0,-1).join(', ') + ' o ' + partes[partes.length-1];
}

function uid(prefix, seqField){
  const n = state[seqField]++;
  return prefix + '_' + n;
}

