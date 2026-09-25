/* =========================================================================
   3.5 SALUD DE INFRAESTRUCTURA — barra de progreso por vertical + score global
   T05 (reunión 22/09, fórmula A elegida por el cliente el 23/09): la barra mide COBERTURA sobre
   las ubicaciones del cliente, no cuánto del catálogo se vendió. Es un aviso de "me falta
   cobertura": sumar una Sede o una Matriz sin productos de una categoría BAJA esa barra.

     barra = ubicaciones cubiertas en la categoría ÷ ubicaciones del cliente (Sedes + Matrices)

   El Datacenter y las Nubes no son ubicaciones del cliente: no entran en el denominador de
   ninguna barra (decisión 23/09). Qué es "cubierta" depende de la categoría:
   - Conectividad, Ciberseguridad, Colaboración: la ubicación tiene al menos un producto de la
     categoría, propio o heredado de una Matriz (herenciaIds; decisión 23/09). En Conectividad
     también cuenta ser el OTRO extremo de un cable de Conectividad (Canal de Conexión, Cloud
     Interconnect, Túnel IPsec…): el enlace une a las dos, y si no, quedaría cubierta solo la
     entidad desde la que se arrastró el cable.
   - Cloud: las Sedes y Matrices no pueden llevar productos de Cloud (catálogo, `destinos`), así
     que la ubicación está cubierta si tiene un Canal de Conexión o un Cloud Interconnect hacia el
     Datacenter o una Nube que tengan al menos un producto de Cloud (decisión 23/09). Una Nube sin
     Hosting (solo con el Cloud Interconnect) no cubre a nadie.

   Sin ubicaciones en el proyecto, todas las barras quedan en 0. El score global sigue siendo el
   promedio simple de las 4 barras.
   ========================================================================= */
const SUBPRODUCTOS_CABLE_A_CLOUD = ['canal_conexion', 'cloud_interconnect'];
function verticalDeSubproducto(subproductoId){
  const sub = getSubproducto(subproductoId);
  const producto = sub && getProducto(sub.productoNivel2Id);
  return producto ? producto.verticalId : null;
}
/* Verticales que tiene una entidad por sus productos: propios y, en una Sede, los heredados. */
function verticalesDeEntidad(entity){
  const set = new Set();
  (entity.instancias||[]).forEach(inst=> set.add(verticalDeSubproducto(inst.subproductoId)));
  if(entity.tipo!=='matriz'){
    (entity.herenciaIds||[]).forEach(hid=>{
      const inst = findInstanciaEnMatrices(hid);
      if(inst) set.add(verticalDeSubproducto(inst.subproductoId));
    });
  }
  set.delete(null);
  return set;
}
/* ¿Este destino (Datacenter o Nube) ofrece Cloud? Tiene que existir y tener algún producto de Cloud. */
function destinoConCloud(entityId){
  const tipo = tipoEntidad(entityId);
  if(tipo==='datacenter' && !state.datacenter.activo) return false;
  if(tipo!=='datacenter' && tipo!=='nube') return false;
  const e = getSedeById(entityId);
  return !!e && (e.instancias||[]).some(inst=> verticalDeSubproducto(inst.subproductoId)==='cloud');
}
function ubicacionCubierta(entity, verticalId){
  if(verticalId==='cloud'){
    return conexionesDe(entity.id).some(c=> SUBPRODUCTOS_CABLE_A_CLOUD.includes(c.subproductoId) &&
      destinoConCloud(otroExtremo(c, entity.id)));
  }
  if(verticalesDeEntidad(entity).has(verticalId)) return true;
  if(verticalId==='conectividad'){
    return conexionesDe(entity.id).some(c=> verticalDeSubproducto(c.subproductoId)==='conectividad');
  }
  return false;
}
function saludPorVertical(){
  const ubicaciones = entidadesPortadoras(); // Sedes + Matrices
  return VERTICALES.map(v=>{
    const elegibles = ubicaciones.length;
    const cubiertas = ubicaciones.filter(e=> ubicacionCubierta(e, v.id)).length;
    const pct = elegibles>0 ? Math.round((cubiertas/elegibles)*100) : 0;
    return { vertical:v, cubiertas, elegibles, pct };
  });
}
function saludGlobal(){
  const porVertical = saludPorVertical();
  if(porVertical.length===0) return 0;
  return Math.round(porVertical.reduce((s,v)=>s+v.pct,0)/porVertical.length);
}
/* El color, el símbolo y el glow de cada categoría viven en css/componentes/salud.css (.salud-row--<vertical>),
   según el design system: Conectividad mint, Cloud cyan, Ciberseguridad coral, Colaboración lime.

   T03 (reunión 22/09): el panel en pantalla no muestra ningún número. Se quitaron el contador
   "2/8" de cada categoría, el tooltip "Conectividad: 2 de 8 productos (25%)" y el % global del
   título: quedan el símbolo, el nombre y la barra. Los números siguen calculándose
   (saludPorVertical / saludGlobal) porque los usan el reporte y el JSON exportado. Desde T05 la
   barra mide cobertura de ubicaciones (ver 3.5), no productos del catálogo. */

const saludBarsEl = byId('saludBars');
function renderSaludPanel(){
  const porVertical = saludPorVertical();
  saludBarsEl.innerHTML = '';
  porVertical.forEach(v=>{
    const row = document.createElement('div');
    row.className = 'salud-row salud-row--' + v.vertical.id;
    // El ancho de la barra es el único valor que se calcula en tiempo de ejecución (inline, como antes).
    row.innerHTML = `
      <span class="salud-icon" aria-hidden="true"></span>
      <span class="salud-main">
        <span class="salud-label">${v.vertical.nombre}</span>
        <span class="salud-bar-track"><span class="salud-bar-fill" style="width:${v.pct}%;"></span></span>
      </span>`;
    saludBarsEl.appendChild(row);
  });
}

