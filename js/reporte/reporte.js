/* =========================================================================
   9. REPORTE + EXPORTACIÓN JSON
   ========================================================================= */

const clienteInput = byId('clienteInput');
clienteInput.addEventListener('input', ()=>{ state.clienteNombre = clienteInput.value; });

/* --- Logo del cliente: opcional, se sube junto al nombre y va en el header del PDF (§9). Se
   guarda como dataURL (base64) directamente en el estado — no hay backend, así que no hace
   falta subir el archivo a ningún lado; jsPDF puede insertar un dataURL tal cual. --- */
const logoUploadBtn = byId('logoUploadBtn');
const logoFileInput = byId('logoFileInput');
function renderLogoButton(){
  if(state.clienteLogo){
    logoUploadBtn.classList.add('has-logo');
    logoUploadBtn.innerHTML = `<img src="${state.clienteLogo}" alt="Logo del cliente">`;
    logoUploadBtn.title = 'Logo del cliente cargado — clic para cambiarlo';
  } else {
    logoUploadBtn.classList.remove('has-logo');
    logoUploadBtn.innerHTML = '+ logo';
    logoUploadBtn.title = 'Subir logo del cliente (aparece en el PDF)';
  }
}
logoUploadBtn.addEventListener('click', ()=>logoFileInput.click());
logoFileInput.addEventListener('change', ()=>{
  const file = logoFileInput.files && logoFileInput.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    state.clienteLogo = reader.result;
    renderLogoButton();
  };
  reader.readAsDataURL(file);
  logoFileInput.value = '';
});
function buildConfiguracionCliente(){
  return {
    version: 16, // v16 (integración T01–T06): `estructuras.inicial` / `estructuras.actual` (T06).
                 // v15: salud.porVertical mide cobertura de ubicaciones (T05, ver §3.5).
                 // v14: cada Matriz exporta su `concentrador` calculado (total + desglose por
                 // canal). Es dato derivado, no editable — se incluye para que quien consuma el
                 // JSON no tenga que reimplementar la regla de "los backups no suman".
                 // v13: Sdwan se aplica sobre un canal EXISTENTE elegido por el vendedor
                 // (inst.targetConexionId), en vez de ser un estado genérico de la sede — su
                 // ícono se dibuja sobre esa conexión específica (ver rebuildSdwanBadges).
                 // v12: Backup/doble enlace por instancia (esBackup en conexiones, backup en
                 // instancias) + nueva entidad Nube (destino de Cloud Interconnect)
    nombreCliente: state.clienteNombre || 'Sin nombre',
    clienteLogo: state.clienteLogo || null,
    // T06: foto de cómo llegó el cliente y de cómo terminó la sesión (null si no se guardó).
    estructuras: { inicial: state.estructuras.inicial, actual: state.estructuras.actual },
    generadoEn: new Date().toISOString(),
    salud: {
      // Cliente 25/09: ya no se carga a mano; es la salud del inicio de la sesión (primer
      // "Guardar estado actual"), o null si no se guardó.
      inicial: saludDelInicio(),
      actual: saludGlobal(),
      // v15 (T05): cobertura de ubicaciones — `cubiertas` de `elegibles` (Sedes + Matrices) — en
      // lugar de `asignados`/`total` productos del catálogo.
      porVertical: saludPorVertical().map(v=>({ vertical: v.vertical.nombre, cubiertas: v.cubiertas, elegibles: v.elegibles, pct: v.pct })),
    },
    matrices: state.matrices.map(m=>({
      id: m.id, nombre: m.nombre, gx: m.gx, gz: m.gz, usuarios: m.usuarios||0,
      concentrador: concentradorDe(m.id),
      instancias: m.instancias.map(i=>({
        instanciaId: i.instanciaId, subproductoId: i.subproductoId, verticalId: i.verticalId,
        nombreSubproducto: i.nombreSubproducto, propiedades: i.propiedades, notas: i.notas,
        marca: i.marca, backup: !!i.backup, targetConexionId: i.targetConexionId || null, creadoEn: i.creadoEn,
      })),
    })),
    nubes: state.nubes.map(n=>({
      id: n.id, nombre: n.nombre, gx: n.gx, gz: n.gz, esAutoInternet: !!n.esAutoInternet,
      instancias: n.instancias.map(i=>({
        instanciaId: i.instanciaId, subproductoId: i.subproductoId, verticalId: i.verticalId,
        nombreSubproducto: i.nombreSubproducto, propiedades: i.propiedades, notas: i.notas,
        marca: i.marca, backup: !!i.backup, targetConexionId: i.targetConexionId || null, creadoEn: i.creadoEn,
      })),
    })),
    datacenter: {
      nombre: state.datacenter.nombre,
      instancias: state.datacenter.instancias.map(i=>({
        instanciaId: i.instanciaId, subproductoId: i.subproductoId, verticalId: i.verticalId,
        nombreSubproducto: i.nombreSubproducto, propiedades: i.propiedades, notas: i.notas,
        marca: i.marca, backup: !!i.backup, targetConexionId: i.targetConexionId || null, creadoEn: i.creadoEn,
      })),
    },
    conexiones: state.conexiones.map(c=>({
      id: c.id, aId: c.aId, bId: c.bId,
      subproductoId: c.subproductoId || null,
      tipoNombre: c.subproductoId ? getSubproducto(c.subproductoId).nombre : null,
      instanciaId: c.instanciaId || null, ownerId: c.ownerId || null, esBackup: !!c.esBackup,
    })),
    sedes: state.sedes.map(s=>({
      id: s.id, nombre: s.nombre, tipo: s.tipo, tamano: s.tamano, empleados: s.empleados,
      herenciaIds: s.herenciaIds || [],
      gx: s.gx, gz: s.gz,
      instancias: s.instancias.map(i=>({
        instanciaId: i.instanciaId, subproductoId: i.subproductoId, verticalId: i.verticalId,
        nombreSubproducto: i.nombreSubproducto, propiedades: i.propiedades, notas: i.notas,
        marca: i.marca, backup: !!i.backup, targetConexionId: i.targetConexionId || null, creadoEn: i.creadoEn,
      })),
    })),
  };
}

const reportOverlay = byId('reportOverlay');
const reportBody = byId('reportBody');
const reportSubtitle = byId('reportSubtitle');

/* Resuelve los productos heredados de una sede (config ya "congelada", tal como la genera
   buildConfiguracionCliente) buscando en qué Matriz vive cada instanciaId, para poder mostrar
   "heredado de <nombre de esa Matriz>" en vez de un genérico "la Matriz". Reutilizada por el
   reporte en pantalla y por la exportación a PDF. */
function heredadasConNombreMatriz(sede, matrices){
  return (sede.herenciaIds||[]).map(hid=>{
    for(const m of matrices){
      const found = m.instancias.find(mi=>mi.instanciaId===hid);
      if(found) return { inst: found, matrizNombre: m.nombre };
    }
    return null;
  }).filter(Boolean);
}

/* Reutilizada por el reporte en pantalla y por la exportación a PDF. */
/* Antes solo podía haber 1 conexión por par de entidades; ahora puede haber varias hacia el
   mismo destino (p.ej. 3 productos distintos hacia el Datacenter), así que se agrupan por
   destino en vez de repetir el nombre una vez por cada una. */
function conexionesTexto(entityId){
  const cs = conexionesDe(entityId);
  if(cs.length===0) return 'sin conexiones activas';
  const porDestino = new Map();
  cs.forEach(c=>{
    const otro = otroExtremo(c, entityId);
    const tipoSub = c.subproductoId ? getSubproducto(c.subproductoId) : null;
    if(!porDestino.has(otro)) porDestino.set(otro, []);
    if(tipoSub) porDestino.get(otro).push(tipoSub.nombre);
  });
  return [...porDestino.entries()].map(([otro, nombres])=>{
    return nombreEntidad(otro) + (nombres.length ? ` (${nombres.join(', ')})` : '');
  }).join(' + ');
}

/* Salud del inicio de la sesión (cliente, 25/09): antes el asesor la escribía a mano en el
   reporte; ahora sale sola de la foto que se tomó con el primer "Guardar estado actual". */
function saludDelInicio(){
  const ini = state.estructuras.inicial;
  return ini && ini.resumen ? ini.resumen.saludGlobal : null;
}

