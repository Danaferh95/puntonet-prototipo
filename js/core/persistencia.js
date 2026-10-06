/* =========================================================================
   PERSISTENCIA DE LA SESIÓN (etapa Android offline, Fase 3)
   La app se usa en tablets: si Android la cierra en segundo plano o el vendedor la cierra sin
   querer, la configuración no se pierde. Se guarda en el almacén local de la plataforma
   (Plataforma.almacen, ver js/plataforma/plataforma.js), nunca en la red.

   Qué se guarda: los datos de `state` (cliente, logo, estructuras inicio/actual, sedes, Matrices,
   Nubes, Datacenter, instancias, conexiones y contadores de ids). No se guardan los objetos 3D
   (`group`): al restaurar se vuelven a construir con las mismas funciones de siempre
   (createSede, createMatriz, createNube), en las mismas celdas y con los mismos ids.
   No se guarda la selección ni el modo de colocación: se arranca sin nada seleccionado.

   Cuándo se guarda: con debounce después de cualquier interacción (tocar, escribir, soltar),
   y enseguida al pasar a segundo plano (visibilitychange/pagehide). Solo escribe si cambió algo.

   Límite: el almacén tiene ~5 MB. Si no entra (logo muy pesado), se guarda sin el logo y se avisa.
   "Nueva sesión" borra lo guardado y recarga la app vacía.
   Este archivo solo declara: lo arranca main.js (restaurarSesion + iniciarAutoguardado).
   ========================================================================= */
const CLAVE_SESION = 'puntonet.configurador.sesion';
const VERSION_SESION = 1;
const ESPERA_AUTOGUARDADO_MS = 800;
const CONTADORES_SESION = ['nextSedeSeq', 'nextMatrizSeq', 'nextNubeSeq', 'nextInstanceSeq', 'nextConexionSeq'];

let autoguardadoActivo = false;
let ultimoGuardado = null;      // texto JSON de lo último que se escribió (para no reescribir igual)
let temporizadorGuardado = null;
let avisoSinLogo = false, avisoSinEspacio = false;

/* Copia de datos de una entidad, sin su objeto 3D. */
function datosDeEntidad(e){
  const copia = {};
  Object.keys(e).forEach(k=>{ if(k !== 'group') copia[k] = e[k]; });
  return JSON.parse(JSON.stringify(copia));
}
function serializarSesion(incluirLogo){
  const contadores = {};
  CONTADORES_SESION.forEach(k=> contadores[k] = state[k]);
  return JSON.stringify({
    version: VERSION_SESION,
    clienteNombre: state.clienteNombre,
    clienteLogo: incluirLogo ? state.clienteLogo : null,
    estructuras: state.estructuras,
    contadores,
    sedes: state.sedes.map(datosDeEntidad),
    matrices: state.matrices.map(datosDeEntidad),
    nubes: state.nubes.map(datosDeEntidad),
    datacenter: { activo: !!state.datacenter.activo, instancias: state.datacenter.instancias },
    conexiones: state.conexiones,
  });
}
/* ¿Hay algo que valga la pena guardar? (arrancar la app y no tocar nada no crea una sesión) */
function sesionTieneContenido(){
  return !!(state.clienteNombre || state.clienteLogo || state.sedes.length || state.matrices.length ||
    state.nubes.length || state.conexiones.length || state.datacenter.instancias.length ||
    !state.datacenter.activo || state.estructuras.inicial || state.estructuras.actual);
}

function guardarSesionAhora(){
  clearTimeout(temporizadorGuardado);
  temporizadorGuardado = null;
  if(!autoguardadoActivo) return;
  if(!sesionTieneContenido()){
    if(ultimoGuardado !== null){ Plataforma.almacen.borrar(CLAVE_SESION); ultimoGuardado = null; }
    return;
  }
  let texto = serializarSesion(true);
  if(texto === ultimoGuardado) return;
  if(Plataforma.almacen.escribir(CLAVE_SESION, texto)){ ultimoGuardado = texto; return; }
  // No entró: se reintenta sin el logo (lo más pesado), y se avisa una sola vez.
  if(state.clienteLogo){
    texto = serializarSesion(false);
    if(Plataforma.almacen.escribir(CLAVE_SESION, texto)){
      ultimoGuardado = texto;
      if(!avisoSinLogo){ avisoSinLogo = true; showToast('El logo del cliente es muy pesado para guardarse en este equipo: la sesión se guarda sin él.', 5000); }
      return;
    }
  }
  if(!avisoSinEspacio){ avisoSinEspacio = true; showToast('No se pudo guardar la sesión en este equipo (sin espacio). No cierres la app hasta exportar el reporte.', 6000); }
}
function programarGuardado(){
  if(!autoguardadoActivo) return;
  clearTimeout(temporizadorGuardado);
  temporizadorGuardado = setTimeout(guardarSesionAhora, ESPERA_AUTOGUARDADO_MS);
}

function iniciarAutoguardado(){
  autoguardadoActivo = true;
  ['pointerup', 'keyup', 'change', 'input', 'drop', 'touchend'].forEach(tipo=>
    document.addEventListener(tipo, programarGuardado, { capture:true, passive:true }));
  document.addEventListener('visibilitychange', ()=>{ if(document.hidden) guardarSesionAhora(); });
  window.addEventListener('pagehide', guardarSesionAhora);
  // Red de seguridad para cambios que llegan sin interacción directa (p. ej. el logo, que se
  // lee de forma asíncrona). Serializar es barato y solo se escribe si algo cambió.
  setInterval(guardarSesionAhora, 5000);
}

/* Número de un id tipo "sede_7" → 7 (para recrear las entidades con el mismo id). */
function numeroDeId(id){ const n = parseInt(String(id).split('_')[1], 10); return isNaN(n) ? null : n; }
function porNumeroDeId(a, b){ return (numeroDeId(a.id)||0) - (numeroDeId(b.id)||0); }

/* Crea la entidad con la función de siempre, forzando el id guardado, y le copia los datos. */
function recrearEntidad(dato, contador, crear){
  const n = numeroDeId(dato.id);
  if(n === null) throw new Error('id inválido en la sesión guardada: ' + dato.id);
  state[contador] = n;
  const entidad = crear();
  if(entidad.id !== dato.id) throw new Error('no se pudo recrear ' + dato.id);
  const grupo = entidad.group;
  Object.assign(entidad, dato, { group: grupo });
  return entidad;
}

function aplicarSesion(s){
  state.clienteNombre = s.clienteNombre || '';
  byId('clienteInput').value = state.clienteNombre;
  state.clienteLogo = s.clienteLogo || null;
  state.estructuras = s.estructuras || { inicial:null, actual:null };

  (s.sedes || []).slice().sort(porNumeroDeId).forEach(d=>
    recrearEntidad(d, 'nextSedeSeq', ()=> createSede(d.empleados, d.gx, d.gz)));
  (s.matrices || []).slice().sort(porNumeroDeId).forEach(d=>
    recrearEntidad(d, 'nextMatrizSeq', ()=> createMatriz(d.gx, d.gz)));
  (s.nubes || []).slice().sort(porNumeroDeId).forEach(d=>
    recrearEntidad(d, 'nextNubeSeq', ()=> createNube(d.nombre, d.gx, d.gz)));

  const dc = s.datacenter || { activo:true, instancias:[] };
  if(dc.activo === false) deleteDatacenter();
  else state.datacenter.instancias = dc.instancias || [];

  state.conexiones = s.conexiones || [];
  CONTADORES_SESION.forEach(k=>{ if(typeof (s.contadores||{})[k] === 'number') state[k] = s.contadores[k]; });

  // Con todo cargado (la herencia de una sede apunta a instancias de Matrices), se redibuja.
  todasLasEntidades().forEach(e=>{
    if(e.id !== 'datacenter' || state.datacenter.activo) refreshSedeAssets(e);
    if(e.id !== 'datacenter') updateSedeNameSprite(e);
  });
  state.selectedSedeIds = [];
  state.selectedConexionId = null;
  rebuildConnections();
  updateSelectionVisuals();
  syncDatacenterRestoreUI();
  renderLogoButton();
  renderBotonesEstructura();
  renderSaludPanel();
  renderRightPanel();
}

/* Devuelve true si había una sesión y se restauró. Si lo guardado está dañado o es de otra
   versión, se descarta (no se puede adivinar qué parte sirve) y la app arranca vacía. */
function restaurarSesion(){
  const texto = Plataforma.almacen.leer(CLAVE_SESION);
  if(!texto) return false;
  let s;
  try { s = JSON.parse(texto); } catch(_){ s = null; }
  if(!s || s.version !== VERSION_SESION){
    Plataforma.almacen.borrar(CLAVE_SESION);
    return false;
  }
  try {
    aplicarSesion(s);
    ultimoGuardado = texto;
    showToast('Se recuperó la sesión anterior.');
    return true;
  } catch(err){
    // A mitad de camino la escena puede quedar incompleta: se descarta lo guardado y se recarga
    // vacía, avisando en la próxima carga.
    console.error('[sesión] no se pudo restaurar:', err);
    Plataforma.almacen.borrar(CLAVE_SESION);
    try { sessionStorage.setItem(CLAVE_SESION + '.error', '1'); } catch(_){}
    location.reload();
    return false;
  }
}
function avisarErrorDeRestauracion(){
  let hubo = false;
  try { hubo = sessionStorage.getItem(CLAVE_SESION + '.error') === '1'; sessionStorage.removeItem(CLAVE_SESION + '.error'); } catch(_){}
  if(hubo) showToast('No se pudo recuperar la sesión anterior: se empezó una nueva.', 5000);
}

/* --- Nueva sesión: borra lo guardado y recarga la app vacía --- */
byId('btnNuevaSesion').addEventListener('click', ()=>{
  showDialog({
    title: 'Nueva sesión',
    body: 'Se borra la configuración actual de este equipo (cliente, sedes, productos, conexiones y el estado inicial guardado). Si la necesitas, exporta antes el reporte. Esta acción no se puede deshacer.',
    confirmText: 'Empezar de cero', danger: true,
  }).then(r=>{
    if(!r.ok) return;
    autoguardadoActivo = false; // que pagehide no vuelva a guardar lo que se está borrando
    Plataforma.almacen.borrar(CLAVE_SESION);
    location.reload();
  });
});
