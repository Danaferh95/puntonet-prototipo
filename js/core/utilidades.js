/* --- Color: el Producto (N2) define hue/sat/light base; el Subproducto (N3) varía dentro de
   esa misma familia de color, pero corriendo matiz + saturación + luminosidad juntos (no solo
   luminosidad) — así cada subproducto se ve como un color realmente distinto, no como el mismo
   tono "más claro o más oscuro". --- */
function hslToHex(h, s, l){
  const c = new THREE.Color();
  c.setHSL(((h % 360) + 360) % 360 / 360, s/100, l/100);
  return c.getHex();
}
/* Oscurece un color ya resuelto (int hex), conservando matiz/saturación — usado para el outline
   de los enlaces de Backup (v9 §2): mismo color del producto, pero más oscuro, para distinguirlo
   de un segundo producto distinto que también conecte al mismo destino ("abanico" de líneas). */
function darkenColor(intColor, factor){
  const c = new THREE.Color(intColor);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.max(0, hsl.l * factor));
  return c.getHex();
}
/* Aclara un color ya resuelto (int hex), conservando matiz/saturación — usado por IconLibrary
   (§3D) para el slot `mat_glow` de los íconos de producto: ahí "glow" es un tono más claro de la
   MISMA familia de color (no un acento propio, a diferencia de MODELO_LOOKS con las entidades). */
function lightenColor(intColor, factor){
  const c = new THREE.Color(intColor);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, hsl.l * factor));
  return c.getHex();
}
function getProductoColor(producto){
  return hslToHex(producto.hue, producto.sat, producto.light);
}
function getSubproductoColor(sub){
  const producto = getProducto(sub.productoNivel2Id);
  const siblings = getSubproductosByProducto(producto.id);
  const n = siblings.length;
  const idx = siblings.findIndex(s=>s.id===sub.id);
  if(n<=1) return getProductoColor(producto);
  const HUE_SPREAD = 18;   // grados de matiz repartidos entre hermanos
  const SAT_SPREAD = 18;   // puntos de saturación repartidos entre hermanos
  const LIGHT_SPREAD = 30; // puntos de luminosidad repartidos entre hermanos
  const t = idx/(n-1); // 0..1 a través de los hermanos, en el mismo orden que aparecen en el catálogo
  const hue = producto.hue - HUE_SPREAD/2 + HUE_SPREAD*t;
  const sat = Math.max(45, Math.min(90, producto.sat - SAT_SPREAD/2 + SAT_SPREAD*t));
  const light = Math.max(30, Math.min(78, producto.light - LIGHT_SPREAD/2 + LIGHT_SPREAD*t));
  return hslToHex(hue, sat, light);
}

/* --- Tamaños de Cede — ahora derivados de la cantidad de empleados (1 solo tipo de arrastre,
   3 estados visuales según la cifra que ponga el cliente en el slider/campo numérico) --- */
const TAMANOS_LOCAL = [
  { id:'pequeno', nombre:'Sede Pequeña', rango:'1-19 empleados',  min:1,  max:19,       box:[1.2,1.0,1.2], assetRadius:1.15 },
  { id:'mediano', nombre:'Sede Mediana', rango:'20-49 empleados', min:20, max:49,       box:[1.7,1.5,1.7], assetRadius:1.45 },
  { id:'grande',  nombre:'Sede Grande',  rango:'50+ empleados',   min:50, max:Infinity, box:[2.4,2.3,2.4], assetRadius:1.85 },
];
function getTamanoLocal(id){ return TAMANOS_LOCAL.find(t=>t.id===id) || TAMANOS_LOCAL[0]; }
function tamanoPorEmpleados(n){
  return TAMANOS_LOCAL.find(t=>n>=t.min && n<=t.max) || TAMANOS_LOCAL[TAMANOS_LOCAL.length-1];
}
const EMPLEADOS_DEFAULT = 12;
const EMPLEADOS_SLIDER_MAX = 100; // el slider llega hasta 100; el campo numérico permite override mayor

/* --- Ancho de banda de una conexión: mismo patrón que Empleados (slider + campo numérico que
   permite override por encima del máximo del slider). Se guarda internamente en Mbps; se
   formatea a Gbps automáticamente a partir de 1000 para que coincida con cómo lo escribía el
   vendedor a mano (ej. "1 Gbps"). --- */
const ANCHO_BANDA_SLIDER_MAX = 1000; // Mbps (=1 Gbps); el campo numérico permite ingresar más
const ANCHO_BANDA_DEFAULT = 100; // Mbps
/* `fallback` (sep/2026): qué devolver cuando el valor está vacío o no se puede leer. El popup
   necesita ANCHO_BANDA_DEFAULT (arranca el slider en 100 Mbps si el vendedor todavía no eligió
   nada), pero el Concentrador necesita 0: sumar 100 Mbps "fantasma" por cada canal sin ancho de
   banda cargado daría un total que el vendedor no puede explicar. */
function parseAnchoBandaMbps(str, fallback = ANCHO_BANDA_DEFAULT){
  if(!str) return fallback;
  const m = String(str).match(/([\d.]+)\s*(mbps|gbps|mb|gb)?/i);
  if(!m) return fallback;
  const n = parseFloat(m[1]);
  if(isNaN(n)) return fallback;
  const unidad = (m[2]||'mbps').toLowerCase();
  return unidad.startsWith('g') ? n*1000 : n;
}
function formatAnchoBandaMbps(mbps){
  if(!mbps) return '';
  if(mbps>=1000){
    const gbps = Math.round((mbps/1000)*100)/100;
    return gbps+' Gbps';
  }
  return mbps+' Mbps';
}

/* --- Slider (input type=range): fija el % de relleno cian como variable CSS (--fill) leída por
   css/componentes/campos.css. Es necesario calcularlo acá porque el accent-color nativo del navegador no basta:
   Chrome/Edge calculan dónde termina el relleno usando la métrica del thumb POR DEFECTO del
   sistema, no la del thumb de 15px definido en el CSS, así que siempre queda un margen sin cubrir
   al llegar al máximo (el "espacio" reportado). Con --fill, el track pasa a ser un gradiente propio
   (ver input[type="range"]::-webkit-slider-runnable-track) que sí llega exacto al valor real. Se
   llama al crear cada slider y en cada evento 'input' — tanto del propio slider como del campo
   numérico que lo acompaña, que puede mover el slider de forma programática sin disparar su propio
   evento 'input'. */
/* Enlaza un `input[type=range]` con el campo numerico que lo acompaña. Los 3 pares de la app
   (Empleados de sede, Usuarios de Matriz, Ancho de banda del popup) seguian exactamente el mismo
   contrato, escrito 3 veces:
     - mover el slider actualiza el numero y avisa del valor nuevo;
     - escribir en el numero manda siempre (permite superar el maximo del slider), y el slider lo
       refleja mientras el valor siga dentro de su rango;
     - cualquiera de los dos repinta el relleno cian del track (updateRangeFill, ver v12).
   `onChange(valor)` es lo unico que cambia entre los 3 usos. */
function bindSliderNumber(rangeEl, numEl, min, max, onChange){
  updateRangeFill(rangeEl);
  rangeEl.addEventListener('input', ()=>{
    numEl.value = rangeEl.value;
    updateRangeFill(rangeEl);
    onChange(parseInt(rangeEl.value,10) || min);
  });
  numEl.addEventListener('input', ()=>{
    const v = Math.max(min, parseInt(numEl.value,10) || min);
    if(v<=max) rangeEl.value = v;
    updateRangeFill(rangeEl);
    onChange(v);
  });
}

function updateRangeFill(rangeEl){
  const min = parseFloat(rangeEl.min) || 0;
  const max = parseFloat(rangeEl.max) || 100;
  const val = parseFloat(rangeEl.value) || 0;
  const pct = max>min ? ((val-min)/(max-min))*100 : 0;
  rangeEl.style.setProperty('--fill', pct+'%');
}

