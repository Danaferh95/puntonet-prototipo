/* =========================================================================
   1. CATÁLOGO — Vertical (N1) → Producto (N2) → Subproducto (N3)
   Fuente: DOCUMENTACIÓN APLICACIÓN INTERACTIVA.docx / §2.2 del mockup

   Sistema de íconos y color (actualizado):
   - Nivel 1 (Vertical) YA NO tiene color propio — solo agrupa.
   - Nivel 2 (Producto) es dueño del ícono 3D (assetKey) y del color BASE (hue/sat/light).
   - Nivel 3 (Subproducto) hereda el mismo ícono de su Producto y solo varía el TONO
     (misma familia de color, distinta luminosidad) según su posición entre sus hermanos.
   ========================================================================= */

const VERTICALES = [
  { id:'conectividad', nombre:'Conectividad' },
  { id:'cloud',        nombre:'Cloud' },
  { id:'ciberseguridad', nombre:'Ciberseguridad' },
  { id:'colaboracion', nombre:'Colaboración' },
];

const PRODUCTOS = [
  // Conectividad — familia cian/azul: antes 172-206 (34° de separación) se veían casi como el
  // mismo azul; ahora 158-224 (66°) para que Sdwan (teal), Datos (cian) e Internet (azul) se
  // lean como 3 tonos claramente distintos, sin salirse de la familia "azul" de la vertical.
  { id:'datos', verticalId:'conectividad', nombre:'Datos', assetKey:'enlace', hue:191, sat:85, light:48 },
  { id:'sdwan_prod', verticalId:'conectividad', nombre:'SD-WAN / Optimización de Enlace', assetKey:'nodo', hue:158, sat:75, light:45 },
  { id:'internet', verticalId:'conectividad', nombre:'Internet', assetKey:'globo', hue:224, sat:85, light:53 },
  // Cloud — familia índigo/violeta
  { id:'housing', verticalId:'cloud', nombre:'Housing', assetKey:'rack', hue:255, sat:65, light:60 },
  { id:'hosting', verticalId:'cloud', nombre:'Hosting', assetKey:'nube', hue:275, sat:65, light:62 },
  // Ciberseguridad — familia rosa/rojo (tonos de alerta)
  { id:'perimetral', verticalId:'ciberseguridad', nombre:'Perimetral', assetKey:'escudo', hue:330, sat:75, light:60 },
  { id:'endpoint', verticalId:'ciberseguridad', nombre:'End Point', assetKey:'candado', hue:348, sat:75, light:60 },
  { id:'acceso_ciber', verticalId:'ciberseguridad', nombre:'Acceso', assetKey:'llave', hue:12, sat:78, light:58 },
  { id:'aplicacion', verticalId:'ciberseguridad', nombre:'Aplicación', assetKey:'muro', hue:28, sat:80, light:56 },
  // Colaboración — familia verde
  { id:'conferencia_prod', verticalId:'colaboracion', nombre:'Conferencia', assetKey:'pantalla', hue:145, sat:60, light:56 },
  { id:'ofimatica_prod', verticalId:'colaboracion', nombre:'Ofimática', assetKey:'documento', hue:98, sat:55, light:56 },
  { id:'portal_cautivo_prod', verticalId:'colaboracion', nombre:'Portal Cautivo', assetKey:'puerta', hue:168, sat:55, light:54 },
  // Zona Wireless (reubicado desde Conectividad → Internet a Colaboración, pedido del cliente
  // 31/07/2026): pasa de ser Subproducto (N3) de "Internet" a tener su propio Producto (N2)
  // dentro de Colaboración — no encajaba como subproducto de Portal Cautivo ni de ningún otro
  // producto existente. Hue 128 elegido dentro del mismo rango verde de la vertical (98-168),
  // entre Ofimática y Conferencia — ajustable si el manual de marca define otra cosa.
  { id:'zona_wireless_prod', verticalId:'colaboracion', nombre:'Zona Wireless', assetKey:'antena', hue:128, sat:58, light:55 },
];

const SUBPRODUCTOS = [
  // Conectividad — Datos (enlaces punto a punto / hacia nube)
  // Campo `conexion`: define qué cable/enlace visual genera este subproducto al asignarse a
  // una Sede o Matriz (ver generaConexionAutomatica/ensureConexionAutomatica más abajo):
  //   'datacenter' → cable automático hacia el Datacenter Epicentro, sin preguntar nada.
  //   'entreSedes' → no hay un destino obvio (puede ser cualquier otra Sede o Matriz), así que
  //                  al asignarlo se muestra un dropdown para elegir el destino del cable.
  //   'satelital'  → no conecta a otra entidad del cliente: es un enlace hacia el proveedor
  //                  satelital (p.ej. Starlink), se dibuja como un cable hacia "el cielo".
  //   (sin campo)  → no genera ningún cable (p.ej. Sdwan desde v9: overlay, no conexión física).
  // Campo `destino` (solo junto a conexion:'entreSedes'): a qué TIPO de entidad apunta el
  // dropdown "Conectar a". Por defecto (sin campo) son Sedes/Matrices; `destino:'nube'` (Cloud
  // Interconnect, v9 §4) lista Nubes en su lugar — ver candidatosConexionEntreSedes.
  // Campo `permiteBackup`: habilita el checkbox "Backup" en el popup (v9 §2) — genera un segundo
  // enlace en paralelo hacia el mismo destino, ligado a la misma instancia (ver syncBackupConexion).
  // Campo `requiereConexionExistente`: en vez del dropdown "Conectar a" (que crea un cable
  // nuevo), muestra "Aplicar Sdwan a" con las conexiones YA EXISTENTES de la sede — la instancia
  // guarda `targetConexionId` apuntando a esa conexión, y su ícono se dibuja sobre ella (ver
  // renderPopupSdwanField / rebuildSdwanBadges). Por ahora solo lo usa Sdwan.
  // Campo `ocultaEnServiciosAsignados`: el nombre del producto por sí solo no dice nada sin su
  // destino (a diferencia de "Sdwan" o "Internet Corporativo", que se entienden solos) — así que
  // en vez de listarse también en "Servicios asignados" (donde solo se ve el nombre, sin
  // contexto de a dónde conecta), vive únicamente en "Conexiones", que sí muestra el destino.
  { id:'canal_conexion', productoNivel2Id:'datos', nombre:'Canal de Conexión',
    eslogan:'¡Conecta tus sedes como si fueran una sola oficina!',
    descripcion:'Enlace de comunicación punto a punto entre al menos 2 ubicaciones.',
    // "Ubicación geográfica" en singular solo acá (pedido cliente 31/07/2026) — Internet
    // Corporativo/Startup/Teleworking mantienen el plural, porque ahí sí puede haber varias sedes.
    parametros:['Ancho de banda','Ubicación geográfica'], conexion:'entreSedes',
    parametrosTipos:{ 'Ancho de banda':'anchoBanda' },
    ocultaEnServiciosAsignados:true, permiteBackup:true },
  // Cloud Interconnect (v9 §4): el dropdown "Conectar a" ya no lista Sedes/Matrices — lista
  // Nubes (entidad `nube`, ver createNube/candidatosConexionEntreSedes). Sigue siendo
  // `conexion:'entreSedes'` (así reutiliza el mismo dropdown genérico y el mismo flujo de
  // "+ Agregar nueva ..."), pero con `destino:'nube'` para que renderPopupConexionOptions y
  // candidatosConexionEntreSedes sepan de qué lista de candidatos tomar.
  { id:'cloud_interconnect', productoNivel2Id:'datos', nombre:'Cloud Interconnect',
    eslogan:'¡El camino más directo y seguro hacia tu nube!',
    descripcion:'Enlace de comunicación entre la ubicación del cliente y una nube.',
    parametros:['Ancho de banda'], conexion:'entreSedes', destino:'nube',
    parametrosTipos:{ 'Ancho de banda':'anchoBanda' },
    ocultaEnServiciosAsignados:true, permiteBackup:true },
  // Conectividad — Sdwan (v9 §3): deja de ser una conexión física (`entreSedes`) — ahora es un
  // overlay/indicador sobre canales ya existentes. No tiene campo `conexion`, así que no genera
  // cable ni dropdown de destino (ver generaConexionAutomatica/renderPopupConexionField). Se
  // muestra como un cuadrado parpadeante sobre el origen (ver rebuildSdwanBadges).
  // Sdwan (v9 §3, ajustado tras feedback): overlay que se aplica sobre un canal YA EXISTENTE de
  // esa sede (Canal de Conexión, Cloud Interconnect, Internet, Túnel IPsec) — no crea su propio
  // cable. `requiereConexionExistente:true` hace que el popup muestre un dropdown "Aplicar
  // Sdwan a" con las conexiones ya activas de la sede en vez del dropdown "Conectar a" (que crea
  // un destino nuevo) — ver renderPopupSdwanField. El ícono se dibuja sobre esa conexión elegida
  // (rebuildSdwanBadges), no flotando sobre la sede.
  { id:'sdwan', productoNivel2Id:'sdwan_prod', nombre:'Sdwan',
    eslogan:'¡La red inteligente que prioriza lo que tu negocio necesita!',
    descripcion:'Red definida por software que optimiza el uso de ancho de banda.',
    parametros:['Ancho de banda','Tipo (SD-WAN / SD-WAN Segura)'], requiereConexionExistente:true,
    parametrosTipos:{ 'Ancho de banda':'anchoBanda' } },
  // Túnel IPsec (v9 §7): SD-WAN (o firewalls en los extremos) emulando un enlace de datos
  // dedicado a través de Internet — producto nuevo y paralelo a Sdwan (no un atributo de este).
  // Mismos parámetros/flujo que Canal de Conexión (dropdown "Conectar a" Sede/Matriz, Ancho de
  // banda), pero `lineStyle:'dashed'` lo dibuja punteado en el canvas 3D (ver buildTubeMeshes en
  // rebuildConnections) para leerse como canal virtualizado, no fibra física dedicada.
  { id:'tunel_ipsec', productoNivel2Id:'sdwan_prod', nombre:'Túnel IPsec',
    eslogan:'¡Un enlace dedicado, sin tender un solo metro de fibra!',
    descripcion:'Enlace de datos emulado sobre Internet mediante SD-WAN o firewalls en los extremos.',
    parametros:['Ancho de banda'], conexion:'entreSedes', lineStyle:'dashed',
    parametrosTipos:{ 'Ancho de banda':'anchoBanda' },
    ocultaEnServiciosAsignados:true },
  // Conectividad — Internet (incluye variantes satelital y wifi). v9 §6: el destino automático
  // deja de ser el Datacenter Epicentro (conceptualmente el internet no va ahí) — converge a una
  // única Nube "Internet" por proyecto, creada sola la primera vez (ver getOrCreateNubeInternetAuto).
  { id:'internet_corporativo', productoNivel2Id:'internet', nombre:'Internet Corporativo',
    eslogan:'¡Internet dedicado, toda la velocidad solo para ti!',
    descripcion:'Enlace de internet dedicado.',
    // + "Número de IPs públicas" (pedido cliente 31/07/2026).
    parametros:['Ancho de banda','Ubicaciones geográficas','Número de IPs públicas'],
    parametrosTipos:{ 'Ancho de banda':'anchoBanda', 'Número de IPs públicas':'numero' },
    conexion:'internetAuto', permiteBackup:true },
  { id:'internet_startup', productoNivel2Id:'internet', nombre:'Internet Startup',
    eslogan:'¡Arranca con internet confiable al mejor precio!',
    descripcion:'Enlace de internet compartido.',
    parametros:['Ancho de banda','Ubicaciones geográficas','Número de IPs públicas'],
    parametrosTipos:{ 'Ancho de banda':'anchoBanda', 'Número de IPs públicas':'numero' },
    conexion:'internetAuto', permiteBackup:true },
  { id:'internet_teleworking', productoNivel2Id:'internet', nombre:'Internet Teleworking',
    eslogan:'¡Lleva la oficina a la casa de cada colaborador!',
    descripcion:'Enlaces de internet compartido para colaboradores en sus hogares.',
    parametros:['Planes','Número de enlaces','Ubicaciones geográficas'], conexion:'internetAuto', permiteBackup:true },
  { id:'puntonet_space', productoNivel2Id:'internet', nombre:'Puntonet Space',
    eslogan:'¡Internet satelital donde la fibra no llega, sin excusas!',
    descripcion:'Enlace de internet satelital atado a una bolsa de Gigas mensuales.',
    parametros:['Tipo de antena','Plan','Con/sin firewall'], conexion:'satelital',
    // "Con/sin firewall" pasa de campo de texto a checkbox (pedido cliente 31/07/2026).
    parametrosTipos:{ 'Con/sin firewall':'checkbox' } },
  // Cloud — Housing (Collocation/Energía, Crossconexión): equipamiento que se renta/instala
  // físicamente en el Datacenter de Puntonet, así que solo se puede soltar sobre ese nodo.
  // Hosting (IaaS/BaaS/DRaaS) representa cómputo/backup en la nube — desde v9 §5 se monta sobre
  // una Nube; desde esta fase (pedido cliente ago/2026) también se puede montar directamente
  // sobre el Datacenter Epicentro, sin exclusividad entre ambos destinos (un mismo cliente puede
  // tener IaaS en su Nube pública Y en el Datacenter a la vez).
  // Campo `destinos` (reemplaza los antiguos `soloDatacenter`/`soloNube`, ago/2026): lista de
  // tipos de entidad sobre los que se puede soltar este subproducto — cualquier combinación de
  // 'sede', 'matriz', 'nube', 'datacenter'. Sin este campo, el valor por defecto es
  // ['sede','matriz'] (comportamiento histórico de la mayoría del catálogo). Ver
  // destinosPermitidos()/destinoValido() más abajo — es el único lugar que hay que tocar para
  // habilitar/restringir un producto a un nuevo tipo de nodo, sin tocar lógica de asignación.
  { id:'collocation', productoNivel2Id:'housing', nombre:'Collocation/Energía',
    eslogan:'¡Tu infraestructura, protegida en un Datacenter de clase mundial!',
    descripcion:'Renta de espacio y energía en el Datacenter de Puntonet.',
    parametros:['Unidades de rack','KVAs'], destinos:['datacenter'] },
  { id:'crossconexion', productoNivel2Id:'housing', nombre:'Crossconexión',
    eslogan:'¡La ruta más rápida hacia tu Datacenter!',
    descripcion:'Interconexión hacia el Datacenter.',
    parametros:['Ancho de banda'], destinos:['datacenter'],
    parametrosTipos:{ 'Ancho de banda':'anchoBanda' } },
  { id:'iaas', productoNivel2Id:'hosting', nombre:'IaaS',
    eslogan:'¡Servidores virtuales listos en minutos, sin comprar hardware!',
    descripcion:'Renta de máquinas virtuales.',
    parametros:['RAM','ROM','Procesador'], destinos:['nube','datacenter'] },
  { id:'baas', productoNivel2Id:'hosting', nombre:'BaaS',
    eslogan:'¡Duerme tranquilo: tu información siempre respaldada!',
    descripcion:'Respaldos de información en la nube.',
    parametros:['Número de VMs','Volumen (GB)','Frecuencia'], destinos:['nube','datacenter'] },
  { id:'draas', productoNivel2Id:'hosting', nombre:'DRaaS',
    eslogan:'¡Recupera tu negocio en minutos, pase lo que pase!',
    descripcion:'Copias de seguridad y recuperación ante desastres.',
    parametros:['Número de VMs','Volumen (GB)','Frecuencia'], destinos:['nube','datacenter'] },
  // Ciberseguridad
  // Firewall On Premise: ícono propio ('firewall_onpremise', ago/2026) para diferenciarlo del
  // Firewall Virtual — antes ambos usaban el escudo genérico de "Perimetral" y no se distinguían
  // en la escena 3D (pedido cliente ago/2026).
  { id:'firewall_on_premise', productoNivel2Id:'perimetral', nombre:'Firewall On Premise',
    eslogan:'¡Tu primera línea de defensa, instalada en casa!',
    descripcion:'Hardware físico para protección perimetral.',
    parametros:['Marca','Modelo de equipo'], assetKey:'firewall_onpremise' },
  { id:'firewall_iaas', productoNivel2Id:'perimetral', nombre:'Firewall IaaS',
    eslogan:'¡La misma protección, sin cables ni hardware!',
    descripcion:'Hardware virtual para protección perimetral.',
    parametros:['Marca','Modelo de equipo'] },
  // Internet Seguro (ago/2026): a partir de esta fase se comporta como el resto de la familia
  // Internet — `conexion:'internetAuto'` lo conecta solo a la Nube de Internet compartida del
  // proyecto (getOrCreateNubeInternetAuto), igual que Internet Corporativo/Startup/Teleworking —
  // en vez de quedar suelto en la sede sin cable, como antes. Se le da un ícono propio
  // ('firewall_virtual') para que se vea el Firewall Virtual en la sede de origen, distinto del
  // ícono de Firewall On Premise.
  { id:'internet_seguro', productoNivel2Id:'perimetral', nombre:'Internet Seguro',
    eslogan:'¡Navega rápido y blindado, todo en uno!',
    descripcion:'Internet más un firewall virtualizado.',
    parametros:['Ancho de banda','Plan (básico/avanzado)'],
    parametrosTipos:{ 'Ancho de banda':'anchoBanda' },
    conexion:'internetAuto', assetKey:'firewall_virtual' },
  { id:'edr', productoNivel2Id:'endpoint', nombre:'EDR',
    eslogan:'¡Detecta y detiene amenazas antes de que hagan daño!',
    descripcion:'Monitoreo, detección y respuesta a amenazas en dispositivos finales.',
    parametros:['Marca','Tipo','Número de dispositivos'] },
  { id:'xdr', productoNivel2Id:'endpoint', nombre:'XDR',
    eslogan:'¡Visibilidad total: todas tus defensas, un solo cerebro!',
    descripcion:'Solución de seguridad que integra y correlaciona información de múltiples fuentes.',
    parametros:['Marca','Tipo','Número de dispositivos'] },
  { id:'seguridad_movil', productoNivel2Id:'endpoint', nombre:'Seguridad Móvil',
    eslogan:'¡Protege cada celular como si fuera la puerta principal!',
    descripcion:'Protección de seguridad para equipos móviles.',
    parametros:['Número de equipos','Sistema operativo'] },
  { id:'correo_electronico', productoNivel2Id:'endpoint', nombre:'Correo Electrónico',
    eslogan:'¡Bandeja de entrada blindada contra phishing y spam!',
    descripcion:'Protección para bandejas de correo electrónico.',
    parametros:['Tipo de licencia','Número de licencias'] },
  { id:'mfa', productoNivel2Id:'acceso_ciber', nombre:'MFA',
    eslogan:'¡Una contraseña ya no basta: doble candado a tus accesos!',
    descripcion:'Autenticación de múltiple factor para ingreso a información crítica.',
    parametros:['Marca','Número de licencias'] },
  // WAF (ago/2026): se habilita también sobre el Datacenter Epicentro y sobre una Nube pública,
  // además de sede/Matriz (comportamiento previo) — igual alcance que DNS/DDoS.
  { id:'waf', productoNivel2Id:'aplicacion', nombre:'WAF',
    eslogan:'¡Tu sitio web, a prueba de ataques 24/7!',
    descripcion:'Protege aplicaciones web, sitios de comercio electrónico y portales al filtrar y bloquear ataques.',
    parametros:['Ancho de banda','Tipo de licencia'],
    parametrosTipos:{ 'Ancho de banda':'anchoBanda' },
    destinos:['sede','matriz','datacenter','nube'] },
  { id:'dns_ddos', productoNivel2Id:'aplicacion', nombre:'DNS/DDoS',
    eslogan:'¡Que ningún ataque tumbe tu operación en línea!',
    descripcion:'Solución en la nube que protege el acceso a internet y los servicios DNS, filtrando tráfico malicioso.',
    parametros:['Ancho de banda','Número de licencias'],
    parametrosTipos:{ 'Ancho de banda':'anchoBanda' } },
  // Colaboración
  { id:'conferencia', productoNivel2Id:'conferencia_prod', nombre:'Conferencia',
    eslogan:'¡Reuniones sin cortes, como si estuvieran en la misma sala!',
    descripcion:'Software de reuniones virtuales.',
    parametros:['Marca (Cisco/Fortinet)','Número de licencias'] },
  { id:'ofimatica', productoNivel2Id:'ofimatica_prod', nombre:'Ofimática',
    eslogan:'¡Todo tu equipo trabajando en la misma página, literal!',
    descripcion:'Conjunto de herramientas para crear, editar y gestionar documentos y tareas de oficina.',
    parametros:['Marca (Microsoft/Google)','Número de licencias'] },
  { id:'portal_cautivo', productoNivel2Id:'portal_cautivo_prod', nombre:'Portal Cautivo',
    eslogan:'¡Wifi para tus visitas, control total para ti!',
    descripcion:'Acceso Wi-Fi seguro y controlado, gestionando la autenticación de usuarios.',
    parametros:['Número de access points'] },
  // Zona Wireless (reubicado desde Conectividad, pedido cliente 31/07/2026): se quita "Ancho de
  // banda" de sus atributos y se agregan "Controladora" (checkbox Sí/No) y "Número de SSID"
  // (texto). Mantiene conexion:'datacenter' — el cambio es de taxonomía/atributos, no de cómo se
  // conecta en el canvas.
  { id:'zona_wireless', productoNivel2Id:'zona_wireless_prod', nombre:'Zona Wireless',
    eslogan:'¡Wifi potente y estable en cada rincón del negocio!',
    descripcion:'Equipamiento (APs) para distribución del servicio de conectividad a través de Wifi.',
    parametros:['Modelo de equipo','Número de usuarios','Controladora','Número de SSID'],
    parametrosTipos:{ 'Controladora':'checkbox' }, conexion:'datacenter' },
];

function getVertical(id){ return VERTICALES.find(v=>v.id===id); }
function getProductosByVertical(verticalId){ return PRODUCTOS.filter(p=>p.verticalId===verticalId); }
function getProducto(id){ return PRODUCTOS.find(p=>p.id===id); }
function getSubproductosByProducto(productoId){ return SUBPRODUCTOS.filter(s=>s.productoNivel2Id===productoId); }
function getSubproducto(id){ return SUBPRODUCTOS.find(s=>s.id===id); }
function colorHex(intColor){ return '#'+intColor.toString(16).padStart(6,'0'); }

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
function parseAnchoBandaMbps(str){
  if(!str) return ANCHO_BANDA_DEFAULT;
  const m = String(str).match(/([\d.]+)\s*(mbps|gbps|mb|gb)?/i);
  if(!m) return ANCHO_BANDA_DEFAULT;
  const n = parseFloat(m[1]);
  if(isNaN(n)) return ANCHO_BANDA_DEFAULT;
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
   css/styles.css. Es necesario calcularlo acá porque el accent-color nativo del navegador no basta:
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

/* =========================================================================
   2. ESTADO GLOBAL
   ========================================================================= */

/* Atajo unico para resolver nodos del DOM por id (se usa ~75 veces, entre las referencias fijas
   de arranque y las que cada render vuelve a buscar tras reescribir su innerHTML). */
function byId(id){ return document.getElementById(id); }

const state = {
  clienteNombre: '',
  clienteLogo: null,     // dataURL (base64) del logo del cliente, opcional — se incluye en el PDF
  saludInicial: null,    // score 0-100 ingresado a mano por el vendedor: "así estaba antes de Puntonet"
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

/* --- Regla provisional de tipo de conexión (pendiente de validar con el cliente final, ver
   documentación adjunta): si cualquiera de los 2 extremos es el Datacenter Epicentro, la
   conexión se guarda como "Cloud Interconnect"; si es Sede↔Matriz, como "Canal de Conexión".
   Se aplica igual sea que la conexión se haya creado arrastrando el cable a mano desde el
   puerto (§5) o soltando un chip del catálogo sobre una entidad (§4, auto-conexión). */
function tipoConexionPorDestino(aId, bId){
  return (aId==='datacenter' || bId==='datacenter') ? 'cloud_interconnect' : 'canal_conexion';
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
   que se necesita (el vendedor no la crea ni la nombra) y reutilizada después. El Datacenter NO
   se conecta automáticamente a esta nube (decisión explícita del cliente, por seguridad: p.ej.
   storage privado sin salida a Internet) — si se necesita, es una conexión manual aparte (cable
   a mano desde el puerto, fuera del alcance de esta función). Se marca `esAutoInternet:true`
   para distinguirla de una Nube de Hosting creada a mano (AWS/Azure/etc., v9 §5). */
function getOrCreateNubeInternetAuto(){
  const existente = state.nubes.find(n=>n.esAutoInternet);
  if(existente) return existente;
  const {gx,gz} = nearestFreeCell(GRID_SPACING*6, DATACENTER_GZ*GRID_SPACING);
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
  if(entityId==='datacenter') return;
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

/* =========================================================================
   3. ESCENA THREE.JS — cámara isométrica, grid, hub, sedes, assets
   ========================================================================= */

/* --- Fabricas de malla reutilizables ---
   Todo el 3D de la app se dibuja con el mismo par de recursos: aristas (wireframe) sobre una
   geometria y, a veces, un relleno translucido de la MISMA geometria. Ese patron estaba escrito
   a mano en cada asset (31 veces `new THREE.LineSegments(new THREE.EdgesGeometry(...),
   new THREE.LineBasicMaterial({...}))`), lo que hacia que agregar un icono nuevo fuera copiar y
   pegar 3 lineas de ruido por pieza. Concentrarlo aca deja cada asset como lo que realmente es:
   una lista de geometrias y posiciones.
     wire(geo, color, opts)  -> aristas de `geo`
     solid(geo, opts)        -> malla rellena de `geo` con MeshBasicMaterial
     fillMesh(geo, opacity)  -> el relleno oscuro estandar de los volumenes "edificio"
     hitboxMesh(geo)         -> volumen invisible que solo existe para el raycaster (§5)
     haloRing(rIn, rOut, color, name, y, seg) -> anillo de seleccion, tumbado sobre el piso */
function wire(geometry, color, matOpts){
  return new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial(Object.assign({ color }, matOpts))
  );
}
function solid(geometry, matOpts){
  return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial(matOpts));
}
const FILL_COLOR = 0x141b26; // mismo tono que --panel-2 en css/styles.css
function fillMesh(geometry, opacity){
  return solid(geometry, { color:FILL_COLOR, transparent:true, opacity: opacity===undefined ? .55 : opacity });
}
function hitboxMesh(geometry, name){
  const mesh = solid(geometry, { visible:false });
  if(name) mesh.name = name;
  return mesh;
}
function haloRing(innerR, outerR, color, name, y, segments){
  const halo = solid(new THREE.RingGeometry(innerR, outerR, segments || 40),
    { color, side:THREE.DoubleSide, transparent:true, opacity:0 });
  halo.rotation.x = -Math.PI/2;
  halo.position.y = y;
  halo.name = name;
  return halo;
}

const wrap = byId('canvasWrap');
const scene = new THREE.Scene();

const GRID_SPACING = 4;
const FRUSTUM = 22;
const PORT_BASE_SCALE = 0.46; // declarado temprano: los puertos de Matriz/Datacenter se crean antes que makePortSprite() en el archivo

let camera, renderer;
function setupCamera(){
  const aspect = wrap.clientWidth / wrap.clientHeight;
  camera = new THREE.OrthographicCamera(
    -FRUSTUM*aspect, FRUSTUM*aspect, FRUSTUM, -FRUSTUM, 0.1, 200
  );
  camera.position.set(20, 20, 20);
  camera.lookAt(0,0,0);
}
setupCamera();

renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, preserveDrawingBuffer:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(wrap.clientWidth, wrap.clientHeight);
wrap.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, .8));
const dirLight = new THREE.DirectionalLight(0xffffff, .6);
dirLight.position.set(10,20,10);
scene.add(dirLight);

/* --- Etiquetas de nombre (Sede/Matriz/Datacenter) como overlay HTML sobre el canvas ---
   Antes eran sprites dentro de la escena 3D (una textura de canvas pintada sobre un plano), así
   que su tamaño en pantalla dependía de la distancia/zoom de cámara como cualquier otro objeto
   del mundo — por más que se compensara la escala, seguían "viviendo" en el espacio 3D. Ahora son
   elementos <div> reales posicionados con CSS sobre el canvas: el font-size queda fijo en px
   (mismo tratamiento tipográfico que el resto de la interfaz), y en cada frame se recalcula solo
   la posición en pantalla (proyectando el punto 3D de anclaje con la cámara), nunca el tamaño de
   letra. Resultado: el texto se ve siempre igual de legible sin importar cuánto se acerque o
   aleje la vista.
   nameLabels: Map(id -> { group, localY, el }) — group es el Object3D cuyo movimiento sigue la
   etiqueta (la sede/Matriz se puede arrastrar; el label la sigue automáticamente vía
   group.localToWorld), localY es el offset vertical local (mismo criterio que antes: altura de
   la sede/Matriz + margen), el es el div renderizado. */
let zoomLevel = 1;
const labelLayer = byId('labelLayer');
const nameLabels = new Map();
const tmpLabelVec = new THREE.Vector3();
function upsertNameLabel(id, group, localY, text){
  let entry = nameLabels.get(id);
  if(!entry){
    const el = document.createElement('div');
    el.className = 'name-label';
    labelLayer.appendChild(el);
    entry = { group, localY, el };
    nameLabels.set(id, entry);
  }
  entry.group = group;
  entry.localY = localY;
  entry.el.textContent = text;
  return entry;
}
function removeNameLabel(id){
  const entry = nameLabels.get(id);
  if(!entry) return;
  entry.el.remove();
  nameLabels.delete(id);
}
/* Reutilizada tanto por el loop de animación (posiciones en vivo sobre el canvas) como por el
   snapshot del PDF (posiciones sobre el canvas de salida, en §6 más abajo). */
function getLabelScreenNDC(entry, outVec){
  outVec.set(0, entry.localY, 0);
  entry.group.localToWorld(outVec);
  outVec.project(camera);
  return outVec;
}
function updateNameLabelPositions(){
  const w = wrap.clientWidth, h = wrap.clientHeight;
  nameLabels.forEach(entry=>{
    getLabelScreenNDC(entry, tmpLabelVec);
    if(tmpLabelVec.z < -1 || tmpLabelVec.z > 1){ entry.el.style.display = 'none'; return; }
    entry.el.style.display = '';
    entry.el.style.left = ((tmpLabelVec.x*0.5+0.5) * w) + 'px';
    entry.el.style.top = ((-tmpLabelVec.y*0.5+0.5) * h) + 'px';
  });
}

const grid = new THREE.GridHelper(80, 20, 0x1f2733, 0x161c26);
scene.add(grid);

/* --- Matriz: geometría 3D reutilizable ---
   Antes era un único "hub" fijo en el centro. Ahora una Matriz se comporta como una sede
   especial: se puede crear más de una, y cada una se coloca donde el usuario la arrastre en la
   grilla. buildMatrizMesh() construye un ejemplar nuevo cada vez (mismo patrón que
   buildSedeMesh()), y createMatriz() (más abajo, §4B) lo instancia y lo agrega al estado. */
function buildMatrizMesh(){
  const group = new THREE.Group();

  // núcleo: torre escalonada de cajas wireframe
  const coreSizes = [ [2.0,0.35,2.0], [1.5,0.55,1.5], [1.0,1.1,1.0] ];
  let coreY = 0;
  coreSizes.forEach((dims)=>{
    const geo = new THREE.BoxGeometry(dims[0], dims[1], dims[2]);
    const edges = wire(geo, 0xe6edf3);
    const fill = fillMesh(geo);
    const y = coreY + dims[1]/2;
    edges.position.y = y; fill.position.y = y;
    group.add(edges); group.add(fill);
    coreY += dims[1];
  });

  // cascarón exterior giratorio: icosaedro wireframe, simboliza la red corporativa
  const hubShellGeo = new THREE.IcosahedronGeometry(1.7, 0);
  const hubShell = wire(hubShellGeo, 0x22d3ee, { transparent:true, opacity:.45 });
  hubShell.position.y = coreY * 0.62;
  hubShell.name = 'hubShell';
  group.add(hubShell);

  // segundo cascarón, más pequeño, gira en sentido contrario para dar profundidad
  const hubShell2Geo = new THREE.IcosahedronGeometry(1.25, 0);
  const hubShell2 = wire(hubShell2Geo, 0x67e3fa, { transparent:true, opacity:.3 });
  hubShell2.position.y = coreY * 0.62;
  hubShell2.name = 'hubShell2';
  group.add(hubShell2);

  // haz vertical sutil sobre el hub
  const beamGeo = new THREE.CylinderGeometry(0.04,0.04, 2.4, 8, 1, true);
  const beam = solid(beamGeo, { color:0x22d3ee, transparent:true, opacity:.18, side:THREE.DoubleSide });
  beam.position.y = coreY + 1.2;
  group.add(beam);

  const matrizHitbox = hitboxMesh(new THREE.CylinderGeometry(2.3, 2.3, coreY + 2.6, 16), 'matrizHitbox');
  matrizHitbox.position.y = (coreY + 2.6) / 2;
  group.add(matrizHitbox);

  group.add(haloRing(2.5, 2.68, 0x22d3ee, 'matrizHalo', 0.03));

  // Puerto de conexión: desde aquí se arrastra un cable hacia otra Matriz, una sede o el Datacenter.
  const matrizPort = makePortSprite();
  matrizPort.position.set(2.0, coreY*0.5, 0);
  group.add(matrizPort);

  // coreY se guarda en userData porque otras funciones (nombre flotante, anillo de productos,
  // efecto de "recubrimiento") necesitan conocer la altura del núcleo para posicionarse bien,
  // y cada Matriz ahora es una instancia independiente (ya no hay una variable global coreY).
  group.userData.coreY = coreY;
  return group;
}

/* --- Nube (v9 §4/§5): entidad destino de Cloud Interconnect. Representación mínima para esta
   fase — un cúmulo de esferas wireframe (silueta de nube) sobre una base, con el mismo patrón de
   hitbox/halo/puerto que una Matriz, para reutilizar selección, arrastre y cableado sin cambios.
   El catálogo de productos montables (IaaS/BaaS/DRaaS) queda para una fase siguiente: por ahora
   solo sirve como punto de conexión. --- */
function buildNubeMesh(){
  const group = new THREE.Group();
  const color = 0xa78bfa; // violeta, distinto de los tonos de Conectividad/Matriz — se lee como "otra clase de nodo"

  const puffs = [
    { r:0.62, pos:[-0.55, 1.05, 0.05] },
    { r:0.78, pos:[0.05, 1.25, 0] },
    { r:0.6,  pos:[0.68, 1.0, -0.1] },
    { r:0.5,  pos:[0.0, 0.78, 0.42] },
  ];
  puffs.forEach(p=>{
    const geo = new THREE.IcosahedronGeometry(p.r, 0);
    const edges = wire(geo, color, { transparent:true, opacity:.7 });
    const fill = fillMesh(geo, .5);
    edges.position.set(...p.pos); fill.position.set(...p.pos);
    group.add(edges); group.add(fill);
  });

  // base: plataforma delgada, para anclar visualmente la nube al piso de la grilla
  const baseGeo = new THREE.CylinderGeometry(1.15, 1.15, 0.12, 20);
  const baseEdges = wire(baseGeo, color, { transparent:true, opacity:.4 });
  const baseFill = fillMesh(baseGeo);
  baseEdges.position.y = 0.06; baseFill.position.y = 0.06;
  group.add(baseEdges, baseFill);

  const coreY = 1.9; // altura de referencia para nombre flotante y efecto "recubrimiento"

  // mismo name que Matriz/Datacenter: hitTest/selección son genéricos por userData
  const nubeHitbox = hitboxMesh(new THREE.CylinderGeometry(1.4, 1.4, coreY + 0.6, 16), 'matrizHitbox');
  nubeHitbox.position.y = (coreY + 0.6) / 2;
  group.add(nubeHitbox);

  // mismo name que la Matriz: updateSelectionVisuals los trata igual
  group.add(haloRing(1.55, 1.7, color, 'matrizHalo', 0.03));

  const nubePort = makePortSprite();
  nubePort.position.set(1.3, coreY*0.5, 0);
  group.add(nubePort);

  group.userData.coreY = coreY;
  return group;
}

/* --- Marcador del centro de la grilla ---
   Puramente decorativo y permanente: un punto que indica dónde está el centro (0,0) del canvas,
   sin significado funcional — no reserva esa celda ni está atado a ninguna entidad. Las Matrices
   y las sedes se pueden colocar ahí mismo si el usuario quiere, igual que en cualquier otra celda
   libre. No tiene userData especial, así que nunca se reconoce como clickeable/seleccionable
   (ver hitTestAtEvent). */
const centerMarkerGroup = new THREE.Group();
const centerDotGeo = new THREE.CircleGeometry(0.18, 24);
const centerDot = solid(centerDotGeo, { color:0x4b5563, transparent:true, opacity:.7, side:THREE.DoubleSide });
centerDot.rotation.x = -Math.PI/2;
centerDot.position.y = 0.015;
centerMarkerGroup.add(centerDot);
const centerRingGeo = new THREE.RingGeometry(0.34, 0.4, 32);
const centerRing = solid(centerRingGeo, { color:0x4b5563, transparent:true, opacity:.4, side:THREE.DoubleSide });
centerRing.rotation.x = -Math.PI/2;
centerRing.position.y = 0.015;
centerMarkerGroup.add(centerRing);
centerMarkerGroup.position.set(0, 0, 0);
scene.add(centerMarkerGroup);

/* --- Datacenter "Epicentro": edificio fijo de Puntonet, siempre presente, ubicado detrás de la
   Matriz. Representa la infraestructura física a la que se conectan sedes/Matriz cuando quieren
   servicio de Internet/ISP de Puntonet (reemplaza la antigua "torre" decorativa). --- */
const DATACENTER_GZ = -5; // celdas de grilla detrás del hub — bien separado de la Matriz, se excluye de las celdas libres para sedes
const datacenterGroup = new THREE.Group();
const dcPos = { x: 0*GRID_SPACING, z: DATACENTER_GZ*GRID_SPACING };
datacenterGroup.position.set(dcPos.x, 0, dcPos.z);
scene.add(datacenterGroup);
state.datacenter.group = datacenterGroup;

const DC_TIERS = [ [3.0,0.55,2.2], [2.0,1.0,1.5], [1.1,0.7,0.85] ];
let dcY = 0;
DC_TIERS.forEach(dims=>{
  const geo = new THREE.BoxGeometry(dims[0], dims[1], dims[2]);
  const edges = wire(geo, 0xe6edf3);
  const fill = fillMesh(geo);
  const y = dcY + dims[1]/2;
  edges.position.y = y; fill.position.y = y;
  datacenterGroup.add(edges, fill);
  dcY += dims[1];
});
// hilera de "luces de servidor" en la fachada, para dar sensación de datacenter activo
for(let i=0;i<7;i++){
  const light = solid(new THREE.SphereGeometry(0.05,8,8),
    { color: i%2===0 ? 0x22d3ee : 0x4ade80, transparent:true, opacity:.85 });
  light.position.set(-1.2 + i*0.4, 0.3, 1.11);
  datacenterGroup.add(light);
}
upsertNameLabel('datacenter', datacenterGroup, dcY + 0.8, 'Datacenter Epicentro');

// mismo name que el halo de la Matriz: updateSelectionVisuals los trata igual
datacenterGroup.add(haloRing(2.2, 2.38, 0x22d3ee, 'matrizHalo', 0.03));

// mismo name que la Matriz: sedeId + isSedeRoot
const dcHitbox = hitboxMesh(new THREE.BoxGeometry(3.4, dcY+0.6, 2.6), 'matrizHitbox');
dcHitbox.position.y = (dcY+0.6)/2;
dcHitbox.userData = { sedeId:'datacenter', isSedeRoot:true, isMatrizRoot:true };
datacenterGroup.add(dcHitbox);

const dcPort = makePortSprite();
dcPort.position.set(0, dcY*0.4, 1.4);
dcPort.userData = { isPort:true, entityId:'datacenter' };
datacenterGroup.add(dcPort);

/* --- Cables entre entidades (arcos suaves con partícula viajera) ---
   Cada conexión (state.conexiones) es un producto contratado independiente, se dibuja como un
   arco delgado, de grosor FIJO, entre los "puertos" de sus 2 extremos (Sede, Matriz o
   Datacenter), curvado hacia arriba. Ya NO escala su grosor/brillo según cuántos servicios tenga
   la sede: si una sede tiene varios productos que conectan al mismo destino (p.ej. 3 productos
   distintos hacia el Datacenter), se ven 3 líneas delgadas en paralelo — una por producto, cada
   una con el color de SU producto (ver el "abanico" de mid.addScaledVector más abajo) — en vez
   de una sola línea gruesa. Si solo hay 1 conexión, es 1 línea delgada nomás, sin ensanchar. Los
   tubos son clickeables: al hacer clic se selecciona la conexión (panel derecho); el popup solo
   aparece al crearla o al pedir editarla explícitamente. */
const connectionsGroup = new THREE.Group();
scene.add(connectionsGroup);
let connectionAnims = [];

function getEntityPortWorldPos(entityId){
  const entity = getSedeById(entityId);
  const portObj = entity.group.getObjectByName('connPort');
  const pos = new THREE.Vector3();
  portObj.getWorldPosition(pos);
  return pos;
}

/* --- Construye el/los tubo(s) 3D de un cable, sólido o punteado ---
   Túnel IPsec (v9 §7) se dibuja punteado para leerse como "canal virtualizado sobre Internet",
   no una fibra física dedicada (a diferencia de Canal de Conexión, línea sólida). THREE r128 no
   trae BufferGeometryUtils para fusionar geometrías, así que un tramo punteado es, literalmente,
   varios TubeGeometry cortos con huecos entre ellos.
   v10 (31/07/2026) — fix bug reportado: "a veces el Túnel IPsec dibuja solo la partícula viajera,
   sin ninguna línea punteada". Causa real: la versión anterior pre-calculaba un array fijo de 96
   puntos (`curve.getPoints(96)`) y convertía las fracciones de cada dash/gap (largos ABSOLUTOS,
   0.32/0.2 unidades de mundo) a ÍNDICES de ese array redondeando (`Math.round(t*96)`). Con un
   cable LARGO (más probable cuantas más sedes hay ya puestas y más lejos quedan entre sí), cada
   dash pasa a representar una fracción muy chica de la curva completa, y ese redondeo la colapsa
   a 0 o 1 muestras — la condición `i1 > i0+1` (mínimo 2 muestras para poder armar un tubo) falla
   para casi todos los tramos, así que no se agrega NINGÚN mesh, y solo queda visible la partícula
   viajera (que se crea aparte, sin depender de esto). Fix: cada segmento ahora samplea sus propios
   puntos directamente sobre la curva con `curve.getPointAt()` (parametrización por longitud de
   arco), sin pasar por ningún array de resolución compartida — así el detalle de cada dash ya no
   depende de qué tan larga sea la curva total. */
function buildTubeMeshes(curve, radius, material, dashed){
  if(!dashed){
    return [new THREE.Mesh(new THREE.TubeGeometry(curve, 48, radius, 8, false), material)];
  }
  const totalLen = curve.getLength();
  if(totalLen < 1e-6) return []; // origen y destino prácticamente en el mismo punto: nada que dibujar
  const DASH_LEN = 0.32, GAP_LEN = 0.2;
  const dashFrac = DASH_LEN/totalLen, gapFrac = GAP_LEN/totalLen;
  const SEG_SAMPLES = 6; // puntos por tramo punteado individual — fijo por segmento, no por curva completa
  const meshes = [];
  let t = 0;
  while(t < 1){
    const tEnd = Math.min(1, t + dashFrac);
    if(tEnd > t){
      const segPts = [];
      for(let i=0;i<=SEG_SAMPLES;i++){
        segPts.push(curve.getPointAt(t + (tEnd-t)*(i/SEG_SAMPLES)));
      }
      const subCurve = new THREE.CatmullRomCurve3(segPts);
      meshes.push(new THREE.Mesh(new THREE.TubeGeometry(subCurve, SEG_SAMPLES, radius, 8, false), material));
    }
    t = tEnd + gapFrac;
  }
  return meshes;
}

function rebuildConnections(){
  connectionsGroup.clear();
  connectionAnims = [];
  // Puede haber más de una conexión entre el mismo par de entidades (p.ej. Canal de Conexión Y
  // Sdwan entre las mismas 2 sedes, o varios productos `conexion:'datacenter'` hacia el mismo
  // Datacenter, cada uno con su propio producto/instancia). Sin esto, esos cables se dibujarían
  // exactamente superpuestos e indistinguibles; con esto, cada uno adicional entre el mismo par
  // se abre lateralmente un poco (efecto "abanico"), alternando de lado — así entre más
  // productos conectan el mismo par de puntos, más líneas paralelas se ven.
  const pairDrawnCount = {};
  function pairKey(aId,bId){ return [aId,bId].sort().join('|'); }
  // Curva de cada conexión, indexada por id — Sdwan (v9 §3, ajustado) ya no flota sobre la sede:
  // se dibuja SOBRE la conexión específica que balancea, así que rebuildSdwanBadges necesita la
  // misma curva (con el desfase del "abanico" ya aplicado) que se usó para dibujar ese cable.
  const curveByConexionId = {};

  state.conexiones.forEach((c, idx)=>{
    const start = getEntityPortWorldPos(c.aId);
    const end = getEntityPortWorldPos(c.bId);
    const dist = start.distanceTo(end);
    const mid = start.clone().add(end).multiplyScalar(0.5);
    mid.y = Math.max(start.y, end.y) + Math.min(3, 0.9 + dist*0.12);
    const key = pairKey(c.aId, c.bId);
    const idxInPair = pairDrawnCount[key] || 0;
    pairDrawnCount[key] = idxInPair + 1;
    if(idxInPair>0){
      const dir = end.clone().sub(start).normalize();
      const perp = new THREE.Vector3(-dir.z, 0, dir.x); // perpendicular horizontal a la curva
      const side = idxInPair%2===1 ? 1 : -1;
      const mag = Math.ceil(idxInPair/2) * 0.55;
      mid.addScaledVector(perp, side*mag);
    }
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    curveByConexionId[c.id] = curve;

    const selected = state.selectedConexionId === c.id;
    // Color según el producto real que representa (ver getSubproductoColor); si la conexión no
    // tiene tipo asignado (compatibilidad hacia atrás), usa el cian por defecto de siempre.
    const tipoSub = c.subproductoId ? getSubproducto(c.subproductoId) : null;
    const baseColor = tipoSub ? getSubproductoColor(tipoSub) : 0x22d3ee;

    // núcleo del enlace: grosor fijo y delgado — la cantidad de servicios se lee en la cantidad
    // de líneas, no en el grosor de una sola. Blending NORMAL (no aditivo): el aditivo sumaba luz
    // sobre el fondo oscuro y terminaba "lavando" cualquier color hacia el mismo blanco-cian
    // brillante, por más distinto que fuera el matiz real — así el color se ve tal cual es.
    const coreRadius = 0.032 * (selected ? 1.6 : 1);
    const dashed = tipoSub && tipoSub.lineStyle==='dashed';

    // Backup (v9 §2): un tubo levemente más grueso y OSCURO detrás del núcleo, a modo de outline
    // — mismo matiz que el producto, luminosidad más baja — para distinguir "misma contratación
    // con respaldo" de un segundo producto distinto que también conecte al mismo destino (esos
    // se leen como líneas paralelas de color propio, sin outline).
    if(c.esBackup){
      const outlineRadius = coreRadius * 1.75;
      const outlineMat = new THREE.MeshBasicMaterial({
        color: darkenColor(baseColor, 0.42), transparent:true, opacity: selected ? 1 : 0.95,
      });
      buildTubeMeshes(curve, outlineRadius, outlineMat, dashed).forEach(m=>{
        m.userData = { isConexion:true, conexionId:c.id };
        connectionsGroup.add(m);
      });
    }

    const coreMat = new THREE.MeshBasicMaterial({
      color: selected ? 0x67e3fa : baseColor, transparent:true, opacity: selected ? 1 : 0.95,
    });
    buildTubeMeshes(curve, coreRadius, coreMat, dashed).forEach(m=>{
      m.userData = { isConexion:true, conexionId:c.id };
      connectionsGroup.add(m);
    });

    // halo exterior, del mismo color que el cable — este sí queda aditivo (es un brillo suave,
    // no necesita leerse con precisión de matiz), grosor fijo, solo para que sea más fácil de
    // clickear, no como indicador de carga.
    const glowRadius = coreRadius * 2.6;
    const glowMat = new THREE.MeshBasicMaterial({
      color: baseColor, transparent:true, opacity: selected ? 0.24 : 0.11,
      blending: THREE.AdditiveBlending, depthWrite:false,
    });
    buildTubeMeshes(curve, glowRadius, glowMat, dashed).forEach(m=>{
      m.userData = { isConexion:true, conexionId:c.id };
      connectionsGroup.add(m);
    });

    // una sola partícula viajera por cable, ritmo fijo (ya no escala con "potencia")
    const particleGeo = new THREE.SphereGeometry(0.075, 8, 8);
    const particleMat = new THREE.MeshBasicMaterial({
      color: 0xbdf3ff, transparent:true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite:false,
    });
    const particle = new THREE.Mesh(particleGeo, particleMat);
    connectionsGroup.add(particle);
    connectionAnims.push({ curve, particle, speed: 0.3 + (idx%3)*0.05, phase: (idx*0.37)%1 });
  });

  rebuildSatelliteLinks();
  rebuildSdwanBadges(curveByConexionId);
}

/* --- Enlaces satelitales (Puntonet Space, `conexion:'satelital'` en el catálogo) ---
   No son una conexión real entre 2 entidades del cliente (no hay checkbox de destino ni cable
   manual), así que no viven en state.conexiones: se generan solos, uno por cada instancia de un
   subproducto satelital que tenga la Sede o Matriz. Visualmente NO es un cable/línea fija: son
   ondas concéntricas (como una señal Wifi) que nacen en el puerto y suben desapareciendo, en
   TANDAS — SATELLITE_RINGS_PER_LINK ondas seguidas (escalonadas) y luego una pausa sin ninguna
   onda visible (SATELLITE_REST_SECONDS) antes de la siguiente tanda, en vez de un goteo
   continuo. La animación se actualiza cada frame en animate() (§ más abajo), usando
   satelliteAnims (reconstruido en cada rebuildSatelliteLinks, igual que connectionAnims). */
let satelliteAnims = [];
const SATELLITE_RISE_HEIGHT = 3.2;    // cuánto sube cada onda antes de desvanecerse del todo
const SATELLITE_RISE_SECONDS = 2.6;   // duración de la subida de UNA onda (antes ~2.2s de loop; ahora más lento)
const SATELLITE_BURST_STAGGER = 0.45; // separación entre el inicio de cada onda dentro de una misma tanda
const SATELLITE_REST_SECONDS = 1.5;   // pausa sin ondas entre el final de una tanda y el inicio de la siguiente
const SATELLITE_RINGS_PER_LINK = 4;   // ondas por tanda
const SATELLITE_CYCLE_SECONDS =
  (SATELLITE_RINGS_PER_LINK-1)*SATELLITE_BURST_STAGGER + SATELLITE_RISE_SECONDS + SATELLITE_REST_SECONDS;

function rebuildSatelliteLinks(){
  satelliteAnims = [];
  entidadesPortadoras().forEach(entity=>{
    const satInstancias = entity.instancias.filter(inst=>{
      const sub = getSubproducto(inst.subproductoId);
      return sub && sub.conexion==='satelital';
    });
    if(satInstancias.length===0) return;
    const start = getEntityPortWorldPos(entity.id);
    satInstancias.forEach((inst, i)=>{
      const sub = getSubproducto(inst.subproductoId);
      const color = getSubproductoColor(sub);
      // ligera inclinación (no 100% vertical) para diferenciar varios enlaces satelitales en la
      // misma entidad, y para que se lea más "hacia el cielo, en esa dirección" que un poste recto
      const baseAngle = i * 2.4 + start.x*0.13 + start.z*0.17;
      const dir = new THREE.Vector3(Math.cos(baseAngle)*0.3, 1, Math.sin(baseAngle)*0.3).normalize();
      // desfase determinístico por posición, para que las tandas de distintas sedes no pulsen
      // todas al mismo tiempo (puramente estético, no afecta el ritmo tanda/descanso de cada una)
      const cycleOffset = Math.abs((start.x*13.7 + start.z*7.3) % SATELLITE_CYCLE_SECONDS);

      // pequeño marcador (antena) en el puerto: de ahí "nacen" las ondas
      const antennaGeo = new THREE.OctahedronGeometry(0.12, 0);
      const antennaMat = new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.85 });
      const antenna = new THREE.Mesh(antennaGeo, antennaMat);
      antenna.position.copy(start);
      connectionsGroup.add(antenna);

      // ondas concéntricas (anillos planos, estilo señal Wifi) que suben y se desvanecen, en
      // tanda: las 4 nacen escalonadas (SATELLITE_BURST_STAGGER entre cada una) y luego hay una
      // pausa de SATELLITE_REST_SECONDS sin ninguna onda antes de que nazca la siguiente tanda.
      for(let ri=0; ri<SATELLITE_RINGS_PER_LINK; ri++){
        const ringGeo = new THREE.RingGeometry(0.15, 0.21, 28);
        const ringMat = new THREE.MeshBasicMaterial({
          color, transparent:true, opacity:0, side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending, depthWrite:false,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI/2;
        connectionsGroup.add(ring);
        satelliteAnims.push({
          ring, start, dir, cycleOffset,
          localStart: ri * SATELLITE_BURST_STAGGER, // cuándo nace esta onda dentro de su tanda
        });
      }
    });
  });
}

/* Avanza cada onda satelital un frame, dentro de su ciclo tanda+descanso: si el reloj del ciclo
   cae fuera de la ventana [localStart, localStart+SATELLITE_RISE_SECONDS] de esta onda, queda
   invisible (eso es justamente la pausa entre tandas). Dentro de su ventana, sube en línea
   recta desde el puerto, crece levemente de tamaño y se desvanece hacia el final del recorrido. */
function updateSatelliteAnims(t){
  satelliteAnims.forEach(s=>{
    const cycleT = ((t + s.cycleOffset) % SATELLITE_CYCLE_SECONDS + SATELLITE_CYCLE_SECONDS) % SATELLITE_CYCLE_SECONDS;
    const elapsed = cycleT - s.localStart;
    if(elapsed < 0 || elapsed > SATELLITE_RISE_SECONDS){
      s.ring.material.opacity = 0;
      return;
    }
    const tt = elapsed / SATELLITE_RISE_SECONDS;
    s.ring.position.copy(s.start).addScaledVector(s.dir, tt * SATELLITE_RISE_HEIGHT);
    s.ring.scale.setScalar(1 + tt * 2.6);
    const fadeIn = Math.min(1, elapsed / 0.18);
    const fadeOut = 1 - Math.max(0, (tt - 0.55) / 0.45);
    s.ring.material.opacity = 0.7 * fadeIn * Math.max(0, fadeOut);
  });
}

/* --- Sdwan: overlay/indicador, no conexión física (v9 §3) ---
   Desde esta fase Sdwan ya no tiene campo `conexion` en el catálogo — no genera cable ni pide
   destino. Representa la capa que administra dinámicamente el tráfico entre canales ya
   existentes (underlay = Datos o Internet), así que se muestra como un cuadrado que PARPADEA
   sobre el origen (la Sede/Matriz que tiene Sdwan activo), anclado un poco por encima del puerto
   — no vive en state.conexiones (no hay un segundo extremo), igual que los enlaces satelitales;
   se reconstruye junto con ellos en cada rebuildConnections(). */
/* --- Sdwan: ícono de "balanceador" sobre un canal existente (ajuste post-v9 §3) ---
   Ya no flota sobre el origen: cada instancia de Sdwan referencia una conexión puntual
   (`inst.targetConexionId`, elegida en el popup — ver renderPopupSdwanField) y su ícono se
   dibuja en el punto medio de ESA curva específica, orientado a lo largo del cable — se lee como
   "esto está balanceando este canal", no como un estado genérico de la sede. No vive en
   state.conexiones (no es un cable propio), así que se reconstruye junto con el resto en cada
   rebuildConnections(), usando las curvas ya calculadas (curveByConexionId) para que el punto
   coincida exactamente con el cable dibujado (incluido el desfase del "abanico"). */
let sdwanAnims = [];
const SDWAN_BLINK_SPEED = 2.2; // ciclos de parpadeo por segundo (ajustado a ojo, sin ritmo "tanda")

function rebuildSdwanBadges(curveByConexionId){
  sdwanAnims = [];
  const sub = getSubproducto('sdwan');
  const color = getSubproductoColor(sub);
  entidadesPortadoras().forEach(entity=>{
    entity.instancias.forEach(inst=>{
      if(inst.subproductoId!=='sdwan' || !inst.targetConexionId) return;
      const curve = curveByConexionId[inst.targetConexionId];
      if(!curve) return; // conexión inexistente/borrada: no se dibuja (limpiarSdwanQueApuntanA debería evitar este caso)
      const pos = curve.getPointAt(0.5);
      const tangent = curve.getTangentAt(0.5); // para orientar el ícono a lo largo del cable, no siempre de frente

      const badgeGeo = new THREE.PlaneGeometry(0.34, 0.34);
      const badgeMat = new THREE.MeshBasicMaterial({
        color, transparent:true, opacity:0.5, side:THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite:false,
      });
      const badge = new THREE.Mesh(badgeGeo, badgeMat);
      badge.position.copy(pos).add(new THREE.Vector3(0, 0.22, 0)); // apenas por encima del cable, para no clipear con el tubo
      badge.lookAt(pos.clone().add(tangent));
      badge.rotation.z += Math.PI/4; // rombo en vez de cuadrado alineado a ejes: se lee más como "nodo sobre el cable"
      connectionsGroup.add(badge);

      // pequeño marco (edges), mismo patrón que antes: ancla la lectura del ícono, no parpadea.
      const frameGeo = new THREE.EdgesGeometry(badgeGeo);
      const frameMat = new THREE.LineBasicMaterial({ color, transparent:true, opacity:0.85 });
      const frame = new THREE.LineSegments(frameGeo, frameMat);
      frame.position.copy(badge.position);
      frame.rotation.copy(badge.rotation);
      connectionsGroup.add(frame);

      // desfase determinístico por posición, para que los badges de distintos canales no
      // parpadeen todos en fase (puramente estético).
      const phase = Math.abs((pos.x*9.1 + pos.z*5.3) % (Math.PI*2));
      sdwanAnims.push({ badge, phase });
    });
  });
}

/* Avanza el parpadeo de cada badge Sdwan un frame — usa Math.abs(sin(...)) para que oscile entre
   un mínimo visible y su brillo máximo (nunca desaparece del todo: sigue siendo un indicador de
   estado "activo", no una animación de carga). */
function updateSdwanAnims(t){
  sdwanAnims.forEach(s=>{
    const pulse = 0.35 + 0.5 * Math.abs(Math.sin(t * SDWAN_BLINK_SPEED + s.phase));
    s.badge.material.opacity = pulse;
  });
}

/* --- Orbit controls simplificado (sin dependencias externas) --- */
const DEFAULT_CAM_ANGLE_Y = Math.atan2(20,20);
const DEFAULT_CAM_ANGLE_X = Math.atan2(20, Math.hypot(20,20));
let isOrbiting = false, lastX=0, lastY=0, camAngleY=DEFAULT_CAM_ANGLE_Y, camAngleX=DEFAULT_CAM_ANGLE_X;
const camDistance = Math.sqrt(20*20+20*20+20*20); // distancia fija: solo orienta la órbita, NO controla el zoom
// Pan (v10, 31/07/2026): antes la cámara siempre orbitaba alrededor de un pivote fijo en el
// origen (0,0,0) — camTarget es ese pivote, ahora desplazable. Orbitar y hacer zoom siguen
// funcionando exactamente igual, solo que centrados en camTarget en vez del origen.
const camTarget = new THREE.Vector3(0,0,0);
function updateCameraFromAngles(){
  const r = camDistance;
  camera.position.x = camTarget.x + r * Math.cos(camAngleX) * Math.sin(camAngleY);
  camera.position.z = camTarget.z + r * Math.cos(camAngleX) * Math.cos(camAngleY);
  camera.position.y = camTarget.y + r * Math.sin(camAngleX);
  camera.lookAt(camTarget);
}
updateCameraFromAngles();

/* Desplaza camTarget (y por lo tanto la cámara entera, sin cambiar el ángulo de órbita) según un
   arrastre en pantalla — misma fórmula que usa OrbitControls de three.js para pan con cámara
   ortográfica: el movimiento en píxeles se convierte a unidades de mundo usando el ancho/alto del
   frustum y el zoom actual, y se aplica sobre los ejes "derecha" y "arriba" reales de la cámara
   (columnas 0 y 1 de su matriz), para que el contenido bajo el cursor lo siga 1:1 sin importar
   desde qué ángulo se esté mirando la escena. */
function panCamera(dxPixels, dyPixels){
  camera.updateMatrixWorld();
  const rightVec = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const upVec = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  const el = renderer.domElement;
  const targetDistanceX = (camera.right - camera.left) / camera.zoom;
  const targetDistanceY = (camera.top - camera.bottom) / camera.zoom;
  camTarget.addScaledVector(rightVec, -dxPixels * targetDistanceX / el.clientWidth);
  camTarget.addScaledVector(upVec, dyPixels * targetDistanceY / el.clientHeight);
  updateCameraFromAngles();
}

/* --- Zoom real para cámara ortográfica: se controla con camera.zoom, no con la distancia --- */
const ZOOM_MIN = 0.4, ZOOM_MAX = 4.5;
function applyZoom(newZoom){
  zoomLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));
  camera.zoom = zoomLevel;
  camera.updateProjectionMatrix();
}
applyZoom(1);

/* La órbita de cámara, el arrastre de sedes ya colocadas y el clic de selección comparten el
   mismo gesto de "botón izquierdo presionado sobre el canvas", así que se resuelven en un único
   manejador unificado más abajo (§5 RAYCASTING / CLICK EN EL CANVAS), que decide entre
   'orbitar', 'mover sede', 'pan' o 'clic de selección' según dónde empezó el gesto, si se pidió
   pan explícitamente (Ctrl/Cmd, o el botón ✋) y cuánto se movió. */
renderer.domElement.addEventListener('contextmenu', e=>e.preventDefault());
renderer.domElement.addEventListener('wheel', (e)=>{
  e.preventDefault();
  applyZoom(zoomLevel - e.deltaY*0.0016);
}, { passive:false });

/* --- Botones de zoom (además del scroll) --- */
const ZOOM_STEP_FACTOR = 1.25;
byId('zoomIn').addEventListener('click', ()=>{
  applyZoom(zoomLevel * ZOOM_STEP_FACTOR);
});
byId('zoomOut').addEventListener('click', ()=>{
  applyZoom(zoomLevel / ZOOM_STEP_FACTOR);
});
byId('zoomReset').addEventListener('click', ()=>{
  camAngleY = DEFAULT_CAM_ANGLE_Y;
  camAngleX = DEFAULT_CAM_ANGLE_X;
  camTarget.set(0,0,0);
  updateCameraFromAngles();
  applyZoom(1);
});

/* --- Modo mano (pan): botón que alterna el gesto por defecto del arrastre entre orbitar y
   desplazar — pensado sobre todo para táctil (no requiere Ctrl/Cmd, que en desktop también
   activa pan mientras se mantiene apretado). El estado se lee desde onPointerDown más abajo. */
let panModeActive = false;
const panToggleBtn = byId('panToggle');
function setPanModeActive(active){
  panModeActive = active;
  panToggleBtn.style.background = active ? 'var(--cian)' : '';
  panToggleBtn.style.color = active ? '#04121a' : '';
  panToggleBtn.style.borderColor = active ? 'var(--cian)' : '';
}
panToggleBtn.addEventListener('click', ()=> setPanModeActive(!panModeActive));

/* --- Redimensionar (incluye rotación de pantalla / bloqueo de orientación vía CSS) --- */
function handleViewportResize(){
  const aspect = wrap.clientWidth/wrap.clientHeight;
  camera.left=-FRUSTUM*aspect; camera.right=FRUSTUM*aspect;
  camera.top=FRUSTUM; camera.bottom=-FRUSTUM;
  camera.updateProjectionMatrix();
  renderer.setSize(wrap.clientWidth, wrap.clientHeight);
}
window.addEventListener('resize', handleViewportResize);
// el navegador reporta clientWidth/clientHeight con un pequeño retraso tras rotar el dispositivo
window.addEventListener('orientationchange', ()=>{ setTimeout(handleViewportResize, 300); });

/* --- Registro de assets por assetKey (§5) --- */
const AssetRegistry = {
  escudo: (color)=>{
    const g = new THREE.ConeGeometry(0.34, 0.55, 4);
    const mesh = wire(g, color);
    mesh.rotation.y = Math.PI/4;
    return mesh;
  },
  // Firewall On Premise (ago/2026): caja compacta de hardware de rack, con "puertos" en el
  // frente — se lee como equipo físico, a diferencia del escudo con anillo de firewall_virtual.
  firewall_onpremise: (color)=>{
    const group = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(0.42, 0.16, 0.22);
    const body = wire(bodyGeo, color);
    body.position.y = 0.16;
    group.add(body);
    for(let i=0;i<4;i++){
      const portGeo = new THREE.BoxGeometry(0.045, 0.045, 0.02);
      const port = wire(portGeo, color);
      port.position.set(-0.15 + i*0.1, 0.16, 0.115);
      group.add(port);
    }
    return group;
  },
  // Firewall Virtual (ago/2026, Internet Seguro): el mismo escudo de "Perimetral" con un anillo
  // orbitando alrededor — el mismo lenguaje visual que "software/virtualizado" usado en otros
  // assets (ver `globo`/Internet), para distinguirlo del hardware físico de firewall_onpremise.
  firewall_virtual: (color)=>{
    const group = new THREE.Group();
    const shieldGeo = new THREE.ConeGeometry(0.26, 0.42, 4);
    const shield = wire(shieldGeo, color);
    shield.rotation.y = Math.PI/4;
    shield.position.y = 0.28;
    group.add(shield);
    const ringGeo = new THREE.TorusGeometry(0.26, 0.014, 6, 20);
    const ring = wire(ringGeo, color);
    ring.rotation.x = Math.PI/2.3;
    ring.position.y = 0.28;
    group.add(ring);
    return group;
  },
  nube: (color)=>{
    const group = new THREE.Group();
    const sizes = [0.22,0.3,0.2];
    const offsets = [[-0.22,0],[0.05,0.08],[0.24,-0.02]];
    sizes.forEach((s,i)=>{
      const geo = new THREE.SphereGeometry(s, 8, 6);
      const mesh = wire(geo, color);
      mesh.position.set(offsets[i][0], 0.28+offsets[i][1], 0);
      group.add(mesh);
    });
    return group;
  },
  enlace: (color)=>{
    const g = new THREE.CylinderGeometry(0.05,0.05,0.6,8);
    const mesh = wire(g, color);
    mesh.rotation.z = Math.PI/2.4;
    mesh.position.y = 0.3;
    return mesh;
  },
  candado: (color)=>{
    const group = new THREE.Group();
    const body = new THREE.BoxGeometry(0.34,0.28,0.16);
    const bodyMesh = wire(body, color);
    bodyMesh.position.y = 0.18;
    group.add(bodyMesh);
    const shackle = new THREE.TorusGeometry(0.14,0.03,6,12,Math.PI);
    const shackleMesh = wire(shackle, color);
    shackleMesh.position.y = 0.36;
    shackleMesh.rotation.x = Math.PI;
    group.add(shackleMesh);
    return group;
  },
  pantalla: (color)=>{
    const g = new THREE.BoxGeometry(0.5,0.34,0.04);
    const mesh = wire(g, color);
    mesh.position.y = 0.3;
    return mesh;
  },
  nodo: (color)=>{
    // Sdwan: nodo de red inteligente (octaedro)
    const g = new THREE.OctahedronGeometry(0.26, 0);
    const mesh = wire(g, color);
    mesh.position.y = 0.3;
    return mesh;
  },
  globo: (color)=>{
    // Internet: globo con anillos, como una red/wifi global
    const group = new THREE.Group();
    const sphereGeo = new THREE.SphereGeometry(0.22, 10, 8);
    const sphere = wire(sphereGeo, color);
    sphere.position.y = 0.3;
    group.add(sphere);
    const ringGeo = new THREE.TorusGeometry(0.3, 0.015, 6, 20);
    const ring1 = wire(ringGeo, color);
    ring1.rotation.x = Math.PI/2.3;
    ring1.position.y = 0.3;
    group.add(ring1);
    const ring2 = ring1.clone();
    ring2.rotation.x = -Math.PI/2.3;
    ring2.rotation.z = Math.PI/3;
    group.add(ring2);
    return group;
  },
  rack: (color)=>{
    // Housing: rack de servidores apilados
    const group = new THREE.Group();
    for(let i=0;i<3;i++){
      const g = new THREE.BoxGeometry(0.38,0.12,0.24);
      const mesh = wire(g, color);
      mesh.position.y = 0.1 + i*0.16;
      group.add(mesh);
    }
    return group;
  },
  llave: (color)=>{
    // Acceso: llave (aro + eje + diente)
    const group = new THREE.Group();
    const ringGeo = new THREE.TorusGeometry(0.13, 0.035, 6, 14);
    const ring = wire(ringGeo, color);
    ring.position.set(-0.14, 0.3, 0);
    ring.rotation.y = Math.PI/2;
    group.add(ring);
    const shaftGeo = new THREE.CylinderGeometry(0.035,0.035,0.32,8);
    const shaft = wire(shaftGeo, color);
    shaft.rotation.z = Math.PI/2;
    shaft.position.set(0.08, 0.3, 0);
    group.add(shaft);
    const toothGeo = new THREE.BoxGeometry(0.06,0.09,0.06);
    const tooth = wire(toothGeo, color);
    tooth.position.set(0.22, 0.25, 0);
    group.add(tooth);
    return group;
  },
  muro: (color)=>{
    // Aplicación: muro/barrera con marca en X (WAF, DNS/DDoS)
    const group = new THREE.Group();
    const g = new THREE.BoxGeometry(0.42,0.42,0.05);
    const mesh = wire(g, color);
    mesh.position.y = 0.3;
    group.add(mesh);
    const crossGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.18, 0.48, 0.03), new THREE.Vector3(0.18, 0.12, 0.03),
      new THREE.Vector3(-0.18, 0.12, 0.03), new THREE.Vector3(0.18, 0.48, 0.03),
    ]);
    const cross = new THREE.LineSegments(crossGeo, new THREE.LineBasicMaterial({ color }));
    group.add(cross);
    return group;
  },
  documento: (color)=>{
    // Ofimática: documento/página con líneas de texto
    const group = new THREE.Group();
    const g = new THREE.BoxGeometry(0.3,0.4,0.03);
    const mesh = wire(g, color);
    mesh.position.y = 0.3;
    group.add(mesh);
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.11, 0.34, 0.02), new THREE.Vector3(0.11, 0.34, 0.02),
      new THREE.Vector3(-0.11, 0.28, 0.02), new THREE.Vector3(0.11, 0.28, 0.02),
      new THREE.Vector3(-0.11, 0.22, 0.02), new THREE.Vector3(0.06, 0.22, 0.02),
    ]);
    const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color }));
    group.add(lines);
    return group;
  },
  puerta: (color)=>{
    // Portal Cautivo: puerta/portal de acceso
    const group = new THREE.Group();
    const postGeo = new THREE.CylinderGeometry(0.035,0.035,0.5,8);
    const post1 = wire(postGeo, color);
    post1.position.set(-0.2, 0.25, 0);
    group.add(post1);
    const post2 = post1.clone();
    post2.position.x = 0.2;
    group.add(post2);
    const lintelGeo = new THREE.BoxGeometry(0.46,0.05,0.05);
    const lintel = wire(lintelGeo, color);
    lintel.position.set(0, 0.5, 0);
    group.add(lintel);
    return group;
  },
  antena: (color)=>{
    // Zona Wireless: access point (cuerpo plano) con dos antenas — nuevo Producto propio,
    // ver §1 catálogo (reubicado desde Conectividad → Internet a Colaboración, 31/07/2026).
    const group = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(0.38,0.08,0.2);
    const body = wire(bodyGeo, color);
    body.position.y = 0.28;
    group.add(body);
    const antGeo = new THREE.CylinderGeometry(0.018,0.018,0.22,6);
    const ant1 = wire(antGeo, color);
    ant1.position.set(-0.1, 0.42, 0);
    ant1.rotation.z = -0.35;
    group.add(ant1);
    const ant2 = ant1.clone();
    ant2.position.x = 0.1;
    ant2.rotation.z = 0.35;
    group.add(ant2);
    return group;
  },
};

/* --- Construcción visual de una sede (siempre tipo Local, en 3 tamaños) --- */
function buildSedeMesh(tamanoId){
  const tamano = getTamanoLocal(tamanoId);
  const group = new THREE.Group();
  const [w,h,d] = tamano.box;
  const geo = new THREE.BoxGeometry(w,h,d);
  const edges = wire(geo, 0xe6edf3);
  edges.position.y = h/2;
  edges.name = 'sedeHitbox';
  group.add(edges);
  const fill = solid(geo, { color:0x1a2230, transparent:true, opacity:.55 });
  fill.position.y = h/2;
  group.add(fill);

  // marcador de selección (halo), escalado según el tamaño de la sede
  const haloR = Math.max(w,d)/2 + 0.35;
  group.add(haloRing(haloR, haloR+0.15, 0x22d3ee, 'halo', 0.02, 32));

  // Puerto de conexión: desde aquí el usuario arrastra un cable hacia otra Sede, la Matriz o el Datacenter.
  const port = makePortSprite();
  port.position.set(w/2 + 0.28, h*0.7, 0);
  group.add(port);

  return group;
}

/* --- Etiqueta de nombre flotante sobre la sede/Matriz: ver §3, sistema de etiquetas HTML
   (nameLabels/upsertNameLabel) definido junto con la escena. Se mantiene el mismo nombre de
   función que antes (updateSedeNameSprite) para no tener que tocar cada punto donde se llama al
   renombrar, cambiar de tamaño o crear una sede/Matriz. */
function updateSedeNameSprite(sede){
  const y = (sede.tipo==='matriz' || sede.tipo==='nube') ? sede.group.userData.coreY + 1.7 : getTamanoLocal(sede.tamano).box[1] + 0.85;
  upsertNameLabel(sede.id, sede.group, y, sede.nombre);
}

/* --- Puerto de conexión: un "botón" cuadrado con un "+", siempre de frente a la cámara
   (sprite), para que se lea claro como punto de conexión desde cualquier ángulo de la órbita. --- */
function makePortSprite(){
  const canvas = document.createElement('canvas');
  canvas.width = 96; canvas.height = 96;
  const ctx = canvas.getContext('2d');
  function roundRect(x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
  }
  roundRect(10,10,76,76,14);
  ctx.fillStyle = 'rgba(10,14,20,0.92)';
  ctx.fill();
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(48,28); ctx.lineTo(48,68);
  ctx.moveTo(28,48); ctx.lineTo(68,48);
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({ map:texture, transparent:true, depthWrite:false, depthTest:false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(PORT_BASE_SCALE, PORT_BASE_SCALE, 1);
  sprite.name = 'connPort';
  sprite.renderOrder = 10; // siempre visible por encima de otros objetos, no se "esconde" detrás de una caja
  return sprite;
}

function refreshSedeAssets(sede){
  // limpiar assets previos
  const old = sede.group.getObjectByName('assetsContainer');
  if(old) sede.group.remove(old);
  const container = new THREE.Group();
  container.name = 'assetsContainer';

  let radius, assetY;
  if(sede.tipo==='matriz'){
    radius = 2.6; assetY = sede.group.userData.coreY + 0.55; // anillo propio alrededor del hub
  } else if(sede.tipo==='datacenter'){
    radius = 3.4; assetY = dcY + 0.55; // anillo amplio, por fuera de los 3 tiers del edificio
  } else if(sede.tipo==='nube'){
    radius = 2.1; assetY = sede.group.userData.coreY + 0.45; // anillo alrededor del cúmulo de nube (v9 §5)
  } else {
    const tamano = getTamanoLocal(sede.tamano);
    radius = tamano.assetRadius; assetY = tamano.box[1] + 0.35;
  }

  const propias = sede.instancias;
  // Productos heredados de Matrices conectadas (solo aplica a sedes reales, no a las Matrices
  // mismas). Se filtran referencias huérfanas por si el producto ya no existe en ninguna Matriz.
  const heredadas = sede.tipo==='matriz' ? [] :
    (sede.herenciaIds||[]).map(hid=>findInstanciaEnMatrices(hid)).filter(Boolean);
  const total = propias.length + heredadas.length;
  let idx = 0;

  function placeAsset(inst, isHeredado){
    const sub = getSubproducto(inst.subproductoId);
    const producto = getProducto(sub.productoNivel2Id);
    // Un subproducto puede tener su propio `assetKey` (ago/2026: Firewall Virtual/On Premise,
    // ver AssetRegistry) para distinguirse de sus hermanos, que por defecto comparten el ícono
    // del Producto (N2) — ver comentario del §1 del catálogo.
    const build = AssetRegistry[sub.assetKey || producto.assetKey] || AssetRegistry.pantalla;
    const color = getSubproductoColor(sub);
    const asset = build(color);
    const angle = (idx / Math.max(total,1)) * Math.PI*2;
    asset.position.set(Math.cos(angle)*radius, assetY, Math.sin(angle)*radius);
    if(isHeredado){
      // estilo "fantasma": mismo ícono/color, pero translúcido, y no editable desde la sede
      // (el producto pertenece a la Matriz; se edita/elimina desde allí).
      asset.traverse(o=>{
        if(o.material){ o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.5; }
      });
      const ud = { sedeId: sede.id, matrizInstanciaId: inst.instanciaId, isHeredadoAsset:true };
      asset.userData = ud;
      asset.traverse(o=>{ o.userData.sedeId=ud.sedeId; o.userData.matrizInstanciaId=ud.matrizInstanciaId; o.userData.isHeredadoAsset=true; });
    } else {
      const ud = { sedeId: sede.id, instanciaId: inst.instanciaId, isAsset:true };
      asset.userData = ud;
      asset.traverse(o=>{ o.userData.sedeId=ud.sedeId; o.userData.instanciaId=ud.instanciaId; o.userData.isAsset=true; });
    }
    container.add(asset);
    idx++;
  }
  propias.forEach(inst=>placeAsset(inst, false));
  heredadas.forEach(inst=>placeAsset(inst, true));

  sede.group.add(container);
}

/* =========================================================================
   4. GESTIÓN DE SEDES (crear, seleccionar, drag&drop)
   ========================================================================= */

function gridToWorld(gx,gz){ return { x: gx*GRID_SPACING, z: gz*GRID_SPACING }; }

function occupied(gx,gz,excludeId){
  if(state.datacenter.activo && gx===0 && gz===DATACENTER_GZ) return true; // celda del Datacenter Epicentro (libre si fue eliminado)
  if(state.sedes.some(s=>s.gx===gx && s.gz===gz && s.id!==excludeId)) return true;
  if(state.matrices.some(m=>m.gx===gx && m.gz===gz && m.id!==excludeId)) return true;
  if(state.nubes.some(n=>n.gx===gx && n.gz===gz && n.id!==excludeId)) return true;
  return false;
}

function nearestFreeCell(worldX, worldZ, excludeId){
  let gx = Math.round(worldX/GRID_SPACING);
  let gz = Math.round(worldZ/GRID_SPACING);
  let radius=0;
  while(occupied(gx,gz,excludeId) && radius<10){
    radius++;
    gx += (radius%2===0?1:-1);
  }
  return {gx,gz};
}

/* Las sedes ya NO se conectan automáticamente a nada al crearse: toda conexión (a la Matriz o
   al Datacenter) se establece arrastrando manualmente desde su puerto (§5). */
function createSede(empleados, gx, gz){
  empleados = Math.max(1, Math.round(empleados || EMPLEADOS_DEFAULT));
  const tamano = tamanoPorEmpleados(empleados);
  const id = uid('sede','nextSedeSeq');
  const nombre = 'Sede ' + id.split('_')[1];
  const group = buildSedeMesh(tamano.id);
  const pos = gridToWorld(gx,gz);
  group.position.set(pos.x, 0, pos.z);
  scene.add(group);
  const sede = {
    id, nombre, tipo:'sede', tamano: tamano.id, empleados,
    gx, gz, group, instancias:[], herenciaIds:[],
  };
  group.userData = { sedeId:id, isSedeRoot:true };
  group.traverse(o=>{
    if(o.name==='sedeHitbox'){ o.userData.sedeId=id; o.userData.isSedeRoot=true; }
    if(o.name==='connPort'){ o.userData.sedeId=id; o.userData.isPort=true; o.userData.entityId=id; }
  });
  state.sedes.push(sede);
  refreshSedeAssets(sede);
  updateSedeNameSprite(sede);
  rebuildConnections();
  return sede;
}

/* Reconstruye la geometría 3D de la sede cuando el tamaño (tier) cambia al editar empleados,
   conservando posición, instancias y conexiones (las conexiones se redibujan desde sus puertos,
   que se recalculan solos ya que son hijos del nuevo group). */
function rebuildSedeMeshIfNeeded(sede, newTamanoId){
  if(sede.tamano === newTamanoId){ updateSedeNameSprite(sede); return; }
  sede.tamano = newTamanoId;
  const pos = sede.group.position.clone();
  const wasSelected = state.selectedSedeIds.includes(sede.id);
  scene.remove(sede.group);
  const group = buildSedeMesh(newTamanoId);
  group.position.copy(pos);
  group.userData = { sedeId: sede.id, isSedeRoot:true };
  group.traverse(o=>{
    if(o.name==='sedeHitbox'){ o.userData.sedeId=sede.id; o.userData.isSedeRoot=true; }
    if(o.name==='connPort'){ o.userData.sedeId=sede.id; o.userData.isPort=true; o.userData.entityId=sede.id; }
  });
  scene.add(group);
  sede.group = group;
  refreshSedeAssets(sede);
  updateSedeNameSprite(sede);
  if(wasSelected) updateSelectionVisuals();
}

function setSedeEmpleados(sede, empleados){
  empleados = Math.max(1, Math.round(empleados));
  sede.empleados = empleados;
  const tamano = tamanoPorEmpleados(empleados);
  rebuildSedeMeshIfNeeded(sede, tamano.id);
  rebuildConnections();
}

function removeSedeVisual(sede){ scene.remove(sede.group); removeNameLabel(sede.id); }

/* Elimina una sede por completo: su geometría 3D, todos sus productos propios, cualquier
   conexión que la involucre (con la Matriz o el Datacenter), y la limpia de la selección. */
function deleteSede(sede){
  conexionesDe(sede.id).forEach(c=>{
    state.conexiones = state.conexiones.filter(x=>x.id!==c.id);
    limpiarSdwanQueApuntanA(c.id);
  });
  if(state.selectedConexionId){
    const stillExists = state.conexiones.some(c=>c.id===state.selectedConexionId);
    if(!stillExists) state.selectedConexionId = null;
  }
  removeSedeVisual(sede);
  state.sedes = state.sedes.filter(s=>s.id!==sede.id);
  state.selectedSedeIds = state.selectedSedeIds.filter(id=>id!==sede.id);
  rebuildConnections();
  updateSelectionVisuals();
  renderRightPanel();
}

/* Elimina UNA Matriz por completo: su geometría 3D, sus productos propios, cualquier conexión
   que la involucre (con la limpieza de herencia correspondiente en cada sede conectada, vía
   eliminarConexion), y la quita de la lista. Igual que deleteSede, pero para Matrices. */
function deleteMatriz(matriz){
  conexionesDe(matriz.id).forEach(c=> eliminarConexion(c.id));
  scene.remove(matriz.group);
  removeNameLabel(matriz.id);
  state.matrices = state.matrices.filter(m=>m.id!==matriz.id);
  state.selectedSedeIds = state.selectedSedeIds.filter(id=>id!==matriz.id);
  rebuildConnections();
  updateSelectionVisuals();
  renderRightPanel();
}

function getEntityHaloObject(entityId){
  if(entityId==='datacenter') return datacenterGroup.getObjectByName('matrizHalo');
  const matriz = getMatrizById(entityId);
  if(matriz) return matriz.group.getObjectByName('matrizHalo');
  const nube = getNubeById(entityId);
  if(nube) return nube.group.getObjectByName('matrizHalo');
  const sede = state.sedes.find(s=>s.id===entityId);
  return sede ? sede.group.getObjectByName('halo') : null;
}

function updateSelectionVisuals(){
  state.sedes.forEach(sede=>{
    const halo = sede.group.getObjectByName('halo');
    const selected = state.selectedSedeIds.includes(sede.id);
    if(halo) halo.material.opacity = selected ? 0.9 : 0;
  });
  state.matrices.forEach(matriz=>{
    const halo = matriz.group.getObjectByName('matrizHalo');
    const selected = state.selectedSedeIds.includes(matriz.id);
    if(halo) halo.material.opacity = selected ? 0.9 : 0;
  });
  const dcHalo = getEntityHaloObject('datacenter');
  if(dcHalo) dcHalo.material.opacity = state.selectedSedeIds.includes('datacenter') ? 0.9 : 0;
}

/* --- Drag & drop desde el panel izquierdo: crear sede, o asignar un producto arrastrado ---
   En desktop funciona con arrastre nativo (HTML5 DnD). En touch (celular/tablet) el DnD nativo
   no dispara con el dedo, así que se ofrece una alternativa: tocar la tarjeta/producto lo "arma"
   (aparece un aviso arriba del canvas) y el siguiente toque sobre el canvas lo coloca. */
let draggingFromPanel = null; // null | 'sede' | 'matriz' | 'nube' — respaldo para navegadores que no preservan dataTransfer en 'drop'
let draggingSubproductoId = null;

const placingHintEl = byId('placingHint');
const placingHintText = byId('placingHintText');
function armPlacing(placing, hintText){
  state.placing = placing;
  placingHintText.textContent = hintText;
  placingHintEl.style.display = 'flex';
}
function disarmPlacing(){
  state.placing = null;
  placingHintEl.style.display = 'none';
}
byId('placingHintCancel').addEventListener('click', disarmPlacing);

/* --- Toast: aviso corto y no bloqueante sobre el canvas (p.ej. "este producto solo va en el
   Datacenter"). Varios se apilan si se disparan seguidos; cada uno se retira solo. --- */
const toastStackEl = byId('toastStack');
function showToast(text, duration=2600){
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  toastStackEl.appendChild(el);
  requestAnimationFrame(()=>el.classList.add('show'));
  setTimeout(()=>{
    el.classList.remove('show');
    setTimeout(()=>el.remove(), 220);
  }, duration);
}

function placeSedeAtClientPoint(clientX, clientY){
  const point = pickGroundPoint({ clientX, clientY });
  if(!point) return;
  const {gx,gz} = nearestFreeCell(point.x, point.z);
  createSede(EMPLEADOS_DEFAULT, gx, gz);
}

/* Marca un grupo 3D recién construido como "esta entidad", para que el raycaster (§5) sepa qué
   se está clickeando y desde qué puerto sale un cable. Lo comparten Matriz y Nube, que usan la
   misma convención de names internos (`matrizHitbox` / `connPort`).
   Importante: se asignan propiedades sobre userData en vez de reemplazar el objeto, porque
   buildMatrizMesh()/buildNubeMesh() ya guardaron ahí `coreY` y hay que conservarlo. */
function tagEntityGroup(group, id){
  Object.assign(group.userData, { sedeId:id, isSedeRoot:true, isMatrizRoot:true });
  group.traverse(o=>{
    if(o.name==='matrizHitbox') Object.assign(o.userData, { sedeId:id, isSedeRoot:true, isMatrizRoot:true });
    if(o.name==='connPort') Object.assign(o.userData, { sedeId:id, isPort:true, entityId:id });
  });
}

/* --- Creación de la Matriz (§4B) ---
   La Matriz ya no aparece por defecto ni está anclada al centro: se crea arrastrando su tarjeta
   desde el panel izquierdo, exactamente igual que una sede (mismo gesto de dragstart/drop, mismo
   flujo de "tocar para armar, tocar para colocar" en táctil, misma lógica de celda libre más
   cercana). A diferencia de la versión anterior, puede haber varias Matrices, y cada una se
   coloca donde el usuario la suelte — el centro de la grilla ya no tiene ningún significado
   especial para ellas, solo lleva el punto decorativo (centerMarkerGroup, más arriba). */
function createMatriz(gx, gz){
  const id = uid('matriz','nextMatrizSeq');
  const nombre = 'Matriz ' + id.split('_')[1];
  const group = buildMatrizMesh();
  const pos = gridToWorld(gx,gz);
  group.position.set(pos.x, 0, pos.z);
  scene.add(group);
  // `usuarios` (pedido cliente 31/07/2026): a diferencia de los Empleados de Sede, una Matriz
  // puede legítimamente no tener usuarios propios asignados todavía, así que arranca en 0 (no en
  // EMPLEADOS_DEFAULT) — se edita con el mismo patrón de slider+número en renderMatrizEditBox.
  const matriz = { id, nombre, tipo:'matriz', gx, gz, group, instancias:[], usuarios:0 };
  tagEntityGroup(group, id);
  state.matrices.push(matriz);
  refreshSedeAssets(matriz);
  updateSedeNameSprite(matriz);
  rebuildConnections();
  return matriz;
}

/* Crea una Nube (v9 §4/§5): mismo patrón que createMatriz, pero con su propia geometría
   (buildNubeMesh) y sin catálogo de productos propios todavía (llega en una fase siguiente).
   `nombreProveedor` es el texto libre pedido al vuelo desde el dropdown "Conectar a" de Cloud
   Interconnect (ej. "AWS", "Azure"); si se deja vacío, usa un nombre genérico numerado. */
function createNube(nombreProveedor, gx, gz){
  const id = uid('nube','nextNubeSeq');
  const nombre = (nombreProveedor && nombreProveedor.trim()) ? nombreProveedor.trim() : ('Nube ' + id.split('_')[1]);
  const group = buildNubeMesh();
  const pos = gridToWorld(gx,gz);
  group.position.set(pos.x, 0, pos.z);
  scene.add(group);
  const nube = { id, nombre, tipo:'nube', gx, gz, group, instancias:[] };
  tagEntityGroup(group, id);
  state.nubes.push(nube);
  refreshSedeAssets(nube);
  updateSedeNameSprite(nube);
  rebuildConnections();
  return nube;
}

/* Elimina una Nube por completo: su geometría 3D y cualquier conexión (Cloud Interconnect) que
   la involucre. Igual que deleteMatriz — reutiliza eliminarConexion para no dejar Cloud
   Interconnects "colgados" sin destino. */
function deleteNube(nube){
  conexionesDe(nube.id).forEach(c=> eliminarConexion(c.id));
  scene.remove(nube.group);
  removeNameLabel(nube.id);
  state.nubes = state.nubes.filter(n=>n.id!==nube.id);
  state.selectedSedeIds = state.selectedSedeIds.filter(id=>id!==nube.id);
  rebuildConnections();
  updateSelectionVisuals();
  renderRightPanel();
}

/* --- Eliminar/restaurar el Datacenter Epicentro (ago/2026, pedido cliente) ---
   A diferencia de Sede/Matriz/Nube, el Datacenter no vive en un array (state.sedes/matrices/
   nubes): es un único edificio fijo, siempre en la misma celda de grilla, creado una sola vez al
   iniciar la escena (ver §3, datacenterGroup). "Eliminarlo" no borra ese objeto — lo desactiva:
   limpia sus productos propios y las conexiones que apunten a él (con eliminarConexion, igual que
   deleteMatriz/deleteNube, así también se limpian productos de sedes/Matriz que apuntaban ahí —
   p.ej. Zona Wireless), y oculta su grupo 3D (visible=false excluye el raycaster de hitTestAtEvent
   §4, así deja de poder seleccionarse/soltarle productos encima). "Restaurarlo" solo vuelve a
   mostrar el mismo grupo — no hay que reconstruir su geometría. */
function deleteDatacenter(){
  conexionesDe('datacenter').forEach(c=> eliminarConexion(c.id));
  state.datacenter.instancias = [];
  refreshSedeAssets(state.datacenter);
  state.datacenter.activo = false;
  datacenterGroup.visible = false;
  removeNameLabel('datacenter');
  state.selectedSedeIds = state.selectedSedeIds.filter(id=>id!=='datacenter');
  if(state.selectedConexionId){
    const stillExists = state.conexiones.some(c=>c.id===state.selectedConexionId);
    if(!stillExists) state.selectedConexionId = null;
  }
  rebuildConnections();
  updateSelectionVisuals();
  syncDatacenterRestoreUI();
  renderRightPanel();
}

function restoreDatacenter(){
  if(state.datacenter.activo) return;
  state.datacenter.activo = true;
  datacenterGroup.visible = true;
  upsertNameLabel('datacenter', datacenterGroup, dcY + 0.8, 'Datacenter Epicentro');
  syncDatacenterRestoreUI();
  renderRightPanel();
}

function placeMatrizAtClientPoint(clientX, clientY){
  const point = pickGroundPoint({ clientX, clientY });
  if(!point) return;
  const {gx,gz} = nearestFreeCell(point.x, point.z);
  createMatriz(gx, gz);
}

/* Crear una Nube directamente desde el catálogo (v9 §5), sin pasar por el dropdown de Cloud
   Interconnect — mismo patrón de arrastre que Sede/Matriz. Pide el proveedor con un prompt de
   texto libre, igual que "+ Agregar nueva Nube" en el dropdown (misma función createNube). */
function placeNubeAtClientPoint(clientX, clientY){
  const point = pickGroundPoint({ clientX, clientY });
  if(!point) return;
  const nombre = (prompt('¿Con qué proveedor es este Hosting/Nube? (ej. AWS, Azure, GCP)') || '').trim();
  const {gx,gz} = nearestFreeCell(point.x, point.z);
  createNube(nombre, gx, gz);
}
/* Efecto "recubrimiento": al soltar un producto sobre una sede/Matriz/Datacenter, antes de abrir
   el popup se ve brevemente cómo el edificio se cubre con el color del producto (como si lo
   estuviera "vistiendo"), y solo entonces se abre el formulario para completar sus atributos. */
function playWrapEffect(entityId, subproductoId, onDone){
  const entity = getSedeById(entityId);
  const sub = getSubproducto(subproductoId);
  const color = getSubproductoColor(sub);
  let w=1.8, h=1.8, d=1.8;
  if(entity.tipo==='matriz'){ w = d = 4.6; h = entity.group.userData.coreY + 0.5; }
  else if(entity.tipo==='nube'){ w = d = 2.8; h = entity.group.userData.coreY + 0.5; }
  else if(entity.id==='datacenter'){ w = 3.6; h = dcY + 0.3; d = 2.8; }
  else { const tamano = getTamanoLocal(entity.tamano); w = tamano.box[0]+0.35; h = tamano.box[1]+0.2; d = tamano.box[2]+0.35; }

  const geo = new THREE.BoxGeometry(w,h,d);
  const mat = new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0 });
  const wrapMesh = new THREE.Mesh(geo, mat);
  wrapMesh.position.y = h/2;
  wrapMesh.scale.set(0.3,0.3,0.3);
  const edgesMat = new THREE.LineBasicMaterial({ color, transparent:true, opacity:0 });
  const edgesMesh = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgesMat);
  wrapMesh.add(edgesMesh);
  entity.group.add(wrapMesh);

  const duration = 1400;
  const started = performance.now();
  function tick(now){
    const t = Math.min(1, (now-started)/duration);
    const ease = 1 - Math.pow(1-t, 3); // ease-out cúbico: rápido al inicio, suave al final
    wrapMesh.scale.setScalar(0.3 + ease*0.7);
    const pulse = Math.sin(ease*Math.PI); // sube y vuelve a bajar: "aparece y se asienta"
    mat.opacity = pulse * 0.4;
    edgesMat.opacity = pulse * 0.9;
    if(t<1){ requestAnimationFrame(tick); }
    else { entity.group.remove(wrapMesh); onDone(); }
  }
  requestAnimationFrame(tick);
}

function assignSubproductoAtClientPoint(subproductoId, clientX, clientY){
  const hit = hitTestAtEvent({ clientX, clientY }); // ¿sobre qué sede, Matriz, Nube o Datacenter se soltó?
  if(!hit.sedeId) return; // se soltó fuera de cualquier entidad válida (o sobre un Datacenter eliminado, que deja de ser "hit-testeable"): sin efecto.
  const sub = getSubproducto(subproductoId);
  // Zona Wireless (`conexion:'datacenter'`) no se suelta SOBRE el Datacenter: se suelta en una
  // sede/Matriz y genera un cable automático hacia él (ver ensureConexionAutomatica). Ese caso no
  // pasa por el chequeo de destino de abajo (el destino ahí es la sede, no el Datacenter), así
  // que se valida aparte si el Datacenter fue eliminado (v.ago/2026, ver deleteDatacenter).
  if(sub.conexion==='datacenter' && !state.datacenter.activo){
    showToast(`"${sub.nombre}" requiere el Datacenter Epicentro, que fue eliminado de este proyecto. Restáuralo desde el panel izquierdo para poder asignar este producto.`);
    return;
  }
  const tipoHit = tipoEntidad(hit.sedeId);
  if(!destinoValido(sub, tipoHit)){
    const sugerenciaNube = destinosPermitidos(sub).includes('nube')
      ? ' Si necesitas una Nube, créala arrastrando "Nube" desde el panel izquierdo, o desde el popup de Cloud Interconnect.'
      : '';
    showToast(`"${sub.nombre}" solo se puede asignar a ${nombreDestinos(sub)}.${sugerenciaNube}`);
    return;
  }
  playWrapEffect(hit.sedeId, subproductoId, ()=>{
    openPopupForNew(subproductoId, [hit.sedeId]);
  });
}

/* Payload de arrastre -> como colocar ese nodo (ver setupPanelDragCard, mas abajo) */
const PLACE_BY_TIPO = {
  sede: placeSedeAtClientPoint,
  matriz: placeMatrizAtClientPoint,
  nube: placeNubeAtClientPoint,
};

wrap.addEventListener('dragover', (e)=>{ e.preventDefault(); });
wrap.addEventListener('drop', (e)=>{
  e.preventDefault();
  let payload = e.dataTransfer.getData('text/plain');
  if(!payload && draggingFromPanel) payload = draggingFromPanel;
  if(!payload && draggingSubproductoId) payload = 'subproducto:'+draggingSubproductoId;
  draggingFromPanel = null;
  draggingSubproductoId = null;
  if(!payload) return;

  const place = PLACE_BY_TIPO[payload];
  if(place){
    place(e.clientX, e.clientY);
    return;
  }
  if(payload.startsWith('subproducto:')){
    assignSubproductoAtClientPoint(payload.slice('subproducto:'.length), e.clientX, e.clientY);
  }
});

/* --- Arrastre táctil real (tablets/celulares) ---
   El drag-and-drop nativo de HTML5 no dispara con el dedo en ningún navegador móvil, así que
   para que "arrastrar" funcione de verdad (no solo tocar-para-armar) se simula el gesto a mano:
   un "fantasma" sigue el dedo, la sede/Matriz bajo el dedo se resalta en vivo, y al soltar sobre
   el canvas se ejecuta la misma acción que un drop de escritorio. El tocar-para-armar sigue
   funcionando además de esto (para toques sin arrastre real). */
let dragHoverEntityId = null;
function setDragHoverHighlight(entityId){
  if(dragHoverEntityId === entityId) return;
  if(dragHoverEntityId && !state.selectedSedeIds.includes(dragHoverEntityId)){
    const prevHalo = getEntityHaloObject(dragHoverEntityId);
    if(prevHalo) prevHalo.material.opacity = 0;
  }
  dragHoverEntityId = entityId;
  if(entityId){
    const halo = getEntityHaloObject(entityId);
    if(halo) halo.material.opacity = 0.7;
  }
}

/* ¿El dedo/cursor esta sobre el canvas 3D? (mismo test para el hover en vivo y para el soltar) */
function isOverCanvas(point){
  const r = wrap.getBoundingClientRect();
  return point.clientX>=r.left && point.clientX<=r.right && point.clientY>=r.top && point.clientY<=r.bottom;
}

const activeTouchDragCancels = [];

function makeTouchDraggable(el, payloadFn, ghostLabel, ghostColor, isValidTarget){
  isValidTarget = isValidTarget || (id=>id!=='datacenter');
  let touchId = null, startX=0, startY=0, dragging=false, ghost=null;

  function forceCancel(){
    dragging = false; touchId = null;
    if(ghost){ document.body.removeChild(ghost); ghost = null; }
    setDragHoverHighlight(null);
  }
  activeTouchDragCancels.push(forceCancel);

  el.addEventListener('touchstart', (e)=>{
    if(e.touches.length!==1) return;
    const t = e.touches[0];
    touchId = t.identifier; startX = t.clientX; startY = t.clientY; dragging = false;
  }, { passive:true });

  el.addEventListener('touchmove', (e)=>{
    const t = Array.from(e.touches).find(tt=>tt.identifier===touchId);
    if(!t) return;
    const moved = Math.hypot(t.clientX-startX, t.clientY-startY);
    if(!dragging && moved > 10){
      dragging = true;
      ghost = document.createElement('div');
      ghost.className = 'touch-drag-ghost';
      ghost.style.background = ghostColor || 'var(--cian)';
      ghost.textContent = ghostLabel;
      document.body.appendChild(ghost);
    }
    if(dragging){
      e.preventDefault();
      ghost.style.left = t.clientX+'px';
      ghost.style.top = t.clientY+'px';
      if(isOverCanvas(t)){
        const hit = hitTestAtEvent({ clientX:t.clientX, clientY:t.clientY });
        setDragHoverHighlight(hit.sedeId && isValidTarget(hit.sedeId) ? hit.sedeId : null);
      } else {
        setDragHoverHighlight(null);
      }
    }
  }, { passive:false });

  function finish(e){
    touchId = null;
    if(!dragging) return;
    dragging = false;
    e.preventDefault(); // evita el 'click' fantasma que el navegador dispara después de un arrastre
    if(ghost){ document.body.removeChild(ghost); ghost = null; }
    setDragHoverHighlight(null);
    const t = e.changedTouches[0];
    if(isOverCanvas(t)) payloadFn(t.clientX, t.clientY);
  }
  el.addEventListener('touchend', finish);
  el.addEventListener('touchcancel', forceCancel);
}

/* --- Registro unico de las tarjetas del panel izquierdo (Sede / Matriz / Nube) ---
   Las 3 se comportaban igual y tenian 3 copias del mismo trio de handlers (dragstart nativo,
   clic = "armar y colocar" en tactil, arrastre tactil real). Agregar un tipo de nodo nuevo es
   ahora una linea en esta tabla; el `tipo` es tambien el payload que lee el handler de 'drop'
   del canvas, asi que no hay strings sueltos que mantener sincronizados. */
function setupPanelDragCard({ elementId, tipo, hint, place, ghostLabel, ghostColor }){
  const card = byId(elementId);
  if(!card) return;
  card.addEventListener('dragstart', (e)=>{
    draggingFromPanel = tipo;
    e.dataTransfer.setData('text/plain', tipo);
  });
  card.addEventListener('click', ()=>{
    if(state.placing && state.placing.tipo===tipo){ disarmPlacing(); return; }
    armPlacing({ tipo }, hint);
  });
  makeTouchDraggable(card, place, ghostLabel, ghostColor);
}

[
  { elementId:'sedeDragCard',   tipo:'sede',   hint:'Toca el canvas para colocar la sede',
    place:placeSedeAtClientPoint,   ghostLabel:'Sede',   ghostColor:'var(--cian)' },
  { elementId:'matrizDragCard', tipo:'matriz', hint:'Toca el canvas para colocar la Matriz',
    place:placeMatrizAtClientPoint, ghostLabel:'Matriz', ghostColor:'var(--indigo)' },
  { elementId:'nubeDragCard',   tipo:'nube',   hint:'Toca el canvas para colocar la Nube',
    place:placeNubeAtClientPoint,   ghostLabel:'Nube',   ghostColor:'var(--violeta)' },
].forEach(setupPanelDragCard);



/* =========================================================================
   5. RAYCASTING / CLICK EN EL CANVAS
   ========================================================================= */

const raycaster = new THREE.Raycaster();
const GROUND_NORMAL = new THREE.Vector3(0,1,0);

/* --- De coordenadas de pantalla a la escena ---
   Estas 3 lineas (rect -> NDC -> raycaster) estaban repetidas en 7 puntos del archivo, y el
   raycast contra el piso otras 4 veces, cada una con su propio `new THREE.Raycaster()`.
   pointerNDC() y pickGroundPoint() son el unico lugar donde vive esa conversion.
   Nota: `ray.intersectPlane` devuelve null si el rayo es paralelo al plano; las copias anteriores
   comprobaban `if(!point)` sobre el Vector3 que ellas mismas habian creado — que nunca es null —
   asi que ese caso limite quedaba sin cubrir. Aca se comprueba el valor de retorno real. */
function pointerNDC(e){
  const rect = wrap.getBoundingClientRect();
  return new THREE.Vector2(
    ((e.clientX-rect.left)/rect.width)*2-1,
    -((e.clientY-rect.top)/rect.height)*2+1
  );
}
/* Punto del mundo donde el puntero corta un plano horizontal a la altura `height` (0 = piso de
   la grilla). Devuelve null si no hay corte. */
function pickGroundPoint(e, height){
  raycaster.setFromCamera(pointerNDC(e), camera);
  const plane = new THREE.Plane(GROUND_NORMAL, -(height || 0));
  const point = new THREE.Vector3();
  return raycaster.ray.intersectPlane(plane, point) ? point : null;
}

/* --- Utilidad de raycast: qué hay bajo el cursor ---
   'asset' solo se llena con un producto propio editable (para abrir su popup al hacer click).
   'sedeId' se resuelve también si se cae sobre un asset propio o heredado, para que el
   drag&drop de productos funcione aunque el drop caiga justo sobre un ícono existente.
   'port' se llena al tocar el puerto de conexión de una entidad (inicia el arrastre de cable).
   'conexion' se llena al tocar un cable ya existente (abre su popup de edición). */
function hitTestAtEvent(e){
  raycaster.setFromCamera(pointerNDC(e), camera);
  const intersects = raycaster.intersectObjects(scene.children, true);
  let asset = null, sedeId = null, port = null, conexion = null;
  for(const it of intersects){
    const ud = it.object.userData;
    if(!ud) continue;
    if(!port && ud.isPort) port = { entityId: ud.entityId };
    if(!conexion && ud.isConexion) conexion = ud.conexionId;
    if(!asset && ud.isAsset) asset = ud;
    if(!sedeId && (ud.isSedeRoot || ud.isAsset || ud.isHeredadoAsset)) sedeId = ud.sedeId;
    if(port && conexion && asset && sedeId) break;
  }
  return { asset, sedeId, port, conexion };
}

/* Selecciona una conexión clickeada directamente en el canvas 3D. En vez de vaciar la selección
   de sede/Matriz/Datacenter (lo que forzaba al usuario a "otra pantalla"), mantiene el foco en
   la entidad ya seleccionada si es uno de los 2 extremos del cable, y expande esa conexión
   inline en el panel derecho — mismo panel, mismo lugar, solo se abre su acordeón. */
function selectConexionInline(conexionId){
  const c = state.conexiones.find(x=>x.id===conexionId);
  if(!c) return;
  const focoActual = state.selectedSedeIds.length===1 ? state.selectedSedeIds[0] : null;
  let foco;
  if(focoActual && (c.aId===focoActual || c.bId===focoActual)){
    foco = focoActual;
  } else {
    foco = [c.aId, c.bId].find(id=>tipoEntidad(id)==='sede') || c.aId;
  }
  state.selectedSedeIds = [foco];
  state.selectedConexionId = conexionId;
  updateSelectionVisuals();
  rebuildConnections(); // para resaltar visualmente el cable seleccionado
  renderRightPanel();
}

function handleCanvasClick(hit, shiftKey){
  if(hit.conexion){
    selectConexionInline(hit.conexion);
    return;
  }
  // Ya no se abre el popup del producto al hacer clic en su ícono en el canvas: eso llevaba a
  // que "seleccionar la sede" y "editar un producto" fueran el mismo gesto sin querer. Ahora un
  // clic (sobre la sede, la Matriz, o cualquiera de sus íconos de producto) solo selecciona la
  // entidad; el usuario elige qué producto editar desde la lista en el panel derecho.
  const hadConexion = !!state.selectedConexionId;
  if(hit.sedeId){
    state.selectedConexionId = null;
    if(shiftKey){
      const idx = state.selectedSedeIds.indexOf(hit.sedeId);
      if(idx>=0) state.selectedSedeIds.splice(idx,1);
      else state.selectedSedeIds.push(hit.sedeId);
    } else {
      state.selectedSedeIds = [hit.sedeId];
    }
  } else if(!shiftKey){
    state.selectedSedeIds = [];
    state.selectedConexionId = null;
  }
  updateSelectionVisuals();
  // si había una conexión resaltada, hay que reconstruir los cables para que se le quite el
  // resalte visual en la escena 3D — antes solo se limpiaba el estado, no el cable en pantalla.
  if(hadConexion) rebuildConnections();
  renderRightPanel();
}

/* --- Gesto unificado de botón izquierdo sobre el canvas ---
   mousedown sobre un PUERTO + arrastre                      → estirar un cable hacia otra entidad
   mousedown sobre una sede (sin tocar un asset) + arrastre  → mover la sede en la grilla
   mousedown en cualquier otro punto + arrastre               → orbitar la cámara
   mousedown + mouseup sin arrastre real                      → clic de selección / edición */
const DRAG_THRESHOLD = 6;
const PORT_DRAG_THRESHOLD = 3; // el puerto es un blanco pequeño: reacciona con un roce mínimo
let pointerDownInfo = null; // { x, y, hit }
let pointerMode = null;     // null | 'orbit' | 'moveSede' | 'connecting'
let movingSede = null;
let connectingFromId = null;
let connectingHoverId = null;

/* Línea temporal que sigue al cursor mientras se arrastra un cable nuevo. Vive en su propio
   grupo (no en connectionsGroup) para que rebuildConnections() no la borre a mitad del gesto. */
const tempCableGroup = new THREE.Group();
scene.add(tempCableGroup);
let tempCableLine = null;
function startTempCable(){
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const mat = new THREE.LineBasicMaterial({ color:0x22d3ee, transparent:true, opacity:.85 });
  tempCableLine = new THREE.Line(geo, mat);
  tempCableGroup.add(tempCableLine);
}
function updateTempCable(from, to, valid){
  if(!tempCableLine) return;
  tempCableLine.geometry.dispose();
  tempCableLine.geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
  tempCableLine.material.color.set(valid ? 0x4ade80 : 0x22d3ee);
  tempCableLine.material.opacity = valid ? 1 : 0.7;
}
function endTempCable(){
  if(tempCableLine){ tempCableGroup.remove(tempCableLine); tempCableLine.geometry.dispose(); tempCableLine=null; }
}

/* Red de seguridad: si un gesto de arrastre/conexión se interrumpe de una forma que NO pasa por
   el mouseup/touchend normal (cambiar de app, perder el foco de la ventana, la pantalla se
   bloquea, un segundo dedo toca la pantalla, etc.), el cable temporal podía quedar "pegado" en
   la escena para siempre — ya que vive en su propio grupo y rebuildConnections() no lo toca.
   Esta función cancela cualquier gesto en curso y limpia todo, y se llama tanto en esos casos
   límite como preventivamente al iniciar cualquier nuevo gesto. */
function cancelActiveGesture(){
  endTempCable();
  pointerDownInfo = null;
  pointerMode = null;
  isOrbiting = false;
  movingSede = null;
  connectingFromId = null;
  connectingHoverId = null;
  setDragHoverHighlight(null);
  activeTouchDragCancels.forEach(fn=>fn());
}
window.addEventListener('blur', cancelActiveGesture);
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) cancelActiveGesture(); });

function projectToPlaneAtHeight(e, height){
  return pickGroundPoint(e, height) || new THREE.Vector3(0,height,0);
}

function onPointerDown(e){
  if(tempCableLine || pointerMode==='connecting'){
    // gesto anterior no se cerró bien (quedó un cable colgando de una interacción previa
    // interrumpida): se limpia antes de empezar el nuevo gesto.
    cancelActiveGesture();
  }
  if(e.button!==0){
    // botón central/derecho: siempre orbita, como antes
    isOrbiting = true; lastX = e.clientX; lastY = e.clientY;
    return;
  }
  pointerDownInfo = { x:e.clientX, y:e.clientY, hit: hitTestAtEvent(e), forcePan: !!(e.ctrlKey || e.metaKey || panModeActive) };
  pointerMode = null;
  lastX = e.clientX; lastY = e.clientY;
}

function onPointerMove(e){
  if(pointerDownInfo && pointerMode===null){
    const moved = Math.hypot(e.clientX-pointerDownInfo.x, e.clientY-pointerDownInfo.y);
    if(pointerDownInfo.forcePan && moved > DRAG_THRESHOLD){
      // Pan pedido explícitamente (Ctrl/Cmd, o modo mano ✋ activo): gana por encima de conectar
      // o mover una sede, sin importar dónde haya empezado el gesto.
      pointerMode = 'pan';
    } else if(pointerDownInfo.hit.port && !pointerDownInfo.forcePan && tipoEntidad(pointerDownInfo.hit.port.entityId)!=='nube' && moved > PORT_DRAG_THRESHOLD){
      // El cable manual desde el puerto infiere su tipo con tipoConexionPorDestino (Datacenter →
      // Cloud Interconnect, si no → Canal de Conexión) — no sabe de Nubes (v9 §4), así que una
      // Nube no puede ser origen de este gesto. Conectar una Nube es solo vía el dropdown
      // "Conectar a" de Cloud Interconnect (candidatosConexionEntreSedes).
      pointerMode = 'connecting';
      connectingFromId = pointerDownInfo.hit.port.entityId;
      connectingHoverId = null;
      startTempCable();
    } else if(!pointerDownInfo.hit.port && moved > DRAG_THRESHOLD){
      if(pointerDownInfo.hit.sedeId && pointerDownInfo.hit.sedeId!=='datacenter' && !pointerDownInfo.hit.asset){
        pointerMode = 'moveSede';
        movingSede = getSedeById(pointerDownInfo.hit.sedeId);
      } else {
        pointerMode = 'orbit';
        isOrbiting = true;
      }
    }
  }

  if(pointerMode==='pan'){
    panCamera(e.clientX-lastX, e.clientY-lastY);
  } else if(pointerMode==='connecting'){
    const originPos = getEntityPortWorldPos(connectingFromId);
    const hover = hitTestAtEvent(e);
    // Mismo motivo que arriba: una Nube tampoco puede ser destino del cable manual.
    if(hover.sedeId && hover.sedeId!==connectingFromId && tipoEntidad(hover.sedeId)!=='nube' && parValidoConexion(connectingFromId, hover.sedeId)){
      connectingHoverId = hover.sedeId;
      updateTempCable(originPos, getEntityPortWorldPos(hover.sedeId), true);
    } else {
      connectingHoverId = null;
      updateTempCable(originPos, projectToPlaneAtHeight(e, originPos.y), false);
    }
  } else if(pointerMode==='moveSede' && movingSede){
    const point = pickGroundPoint(e);
    if(point){
      movingSede.group.position.x = point.x;
      movingSede.group.position.z = point.z;
      rebuildConnections();
    }
  } else if(isOrbiting){
    const dx = e.clientX-lastX, dy = e.clientY-lastY;
    camAngleY -= dx*0.006;
    camAngleX = Math.max(0.03, Math.min(Math.PI-0.03, camAngleX + dy*0.006));
    updateCameraFromAngles();
  }
  lastX = e.clientX; lastY = e.clientY;
}

function onPointerUp(e){
  if(e.button===0 && pointerDownInfo){
    if(pointerMode==='connecting'){
      endTempCable();
      if(connectingHoverId && parValidoConexion(connectingFromId, connectingHoverId) && !conexionExiste(connectingFromId, connectingHoverId)){
        const subproductoId = tipoConexionPorDestino(connectingFromId, connectingHoverId);
        const sub = getSubproducto(subproductoId);
        const producto = getProducto(sub.productoNivel2Id);
        // Dueño de la instancia: el lado que no es el Datacenter (si aplica), o el origen del
        // arrastre si ninguno de los 2 extremos es el Datacenter (p.ej. Sede↔Matriz) — mismo
        // criterio que ensureConexionAutomatica, así da igual si el vendedor arrastra el chip
        // del catálogo o el cable a mano desde el puerto: ambos terminan siendo la misma
        // instancia de servicio (cuenta en "Servicios asignados" y en la Salud de
        // infraestructura, no solo como un cable sin producto detrás).
        const ownerId = connectingFromId==='datacenter' ? connectingHoverId
          : connectingHoverId==='datacenter' ? connectingFromId
          : connectingFromId;
        const owner = getSedeById(ownerId);
        const instancia = {
          instanciaId: uid('inst','nextInstanceSeq'),
          subproductoId: sub.id,
          verticalId: producto.verticalId,
          nombreSubproducto: sub.nombre,
          propiedades: {}, notas:'', marca:'',
          creadoEn: new Date().toISOString(),
        };
        owner.instancias.push(instancia);
        refreshSedeAssets(owner);
        const conexion = {
          id: uid('conn','nextConexionSeq'), aId:connectingFromId, bId:connectingHoverId,
          subproductoId: sub.id, instanciaId: instancia.instanciaId, ownerId,
        };
        state.conexiones.push(conexion);
        // recién conectada: se deja seleccionada la entidad de origen y se abre de una vez el
        // popup de la instancia recién creada para completar Ancho de banda y demás propiedades
        // — es el mismo formulario que "Servicios asignados", no uno aparte.
        state.selectedSedeIds = [connectingFromId];
        state.selectedConexionId = conexion.id;
        updateSelectionVisuals();
        rebuildConnections();
        renderRightPanel();
        openPopupForEdit(ownerId, instancia.instanciaId);
      }
      connectingFromId = null;
      connectingHoverId = null;
    } else if(pointerMode==='moveSede' && movingSede){
      const {gx,gz} = nearestFreeCell(movingSede.group.position.x, movingSede.group.position.z, movingSede.id);
      movingSede.gx = gx; movingSede.gz = gz;
      const pos = gridToWorld(gx,gz);
      movingSede.group.position.set(pos.x, 0, pos.z);
      rebuildConnections();
      movingSede = null;
    } else if(pointerMode!=='orbit'){
      // no hubo arrastre real (o fue mínimo): o bien completa una colocación pendiente
      // (flujo táctil de "tocar para armar, tocar para colocar"), o es un clic de selección.
      if(state.placing){
        if(state.placing.tipo==='sede') placeSedeAtClientPoint(e.clientX, e.clientY);
        else if(state.placing.tipo==='matriz') placeMatrizAtClientPoint(e.clientX, e.clientY);
        else if(state.placing.tipo==='nube') placeNubeAtClientPoint(e.clientX, e.clientY);
        else if(state.placing.tipo==='subproducto') assignSubproductoAtClientPoint(state.placing.id, e.clientX, e.clientY);
        disarmPlacing();
      } else {
        handleCanvasClick(pointerDownInfo.hit, e.shiftKey);
      }
    }
  }
  pointerDownInfo = null;
  pointerMode = null;
  isOrbiting = false;
}

renderer.domElement.addEventListener('mousedown', onPointerDown);
window.addEventListener('mousemove', onPointerMove);
window.addEventListener('mouseup', onPointerUp);

/* --- Equivalente táctil: el drag-and-drop nativo (HTML5) no dispara con dedos en móviles, pero
   estos gestos (orbitar, tocar para seleccionar, arrastrar una sede, arrastrar un puerto para
   conectar) están hechos a mano con mouse events — así que basta con traducir el primer punto
   de contacto a la misma forma de evento y reusar exactamente la misma lógica de arriba. --- */
function touchPoint(e){
  const t = e.touches[0] || e.changedTouches[0];
  return { clientX:t.clientX, clientY:t.clientY, button:0, shiftKey:false };
}
renderer.domElement.addEventListener('touchstart', (e)=>{
  if(e.touches.length!==1) return; // dejamos pasar gestos de 2 dedos (por si el navegador hace algo con ellos)
  onPointerDown(touchPoint(e));
}, { passive:true });
window.addEventListener('touchmove', (e)=>{
  if(!pointerDownInfo || e.touches.length!==1) return;
  if(e.cancelable) e.preventDefault(); // evita que la página haga scroll mientras se interactúa con el canvas
  onPointerMove(touchPoint(e));
}, { passive:false });
window.addEventListener('touchend', (e)=>{
  if(!pointerDownInfo) return;
  onPointerUp(touchPoint(e));
});
window.addEventListener('touchcancel', cancelActiveGesture);

/* --- Tooltip on hover sobre assets --- */
const tooltipEl = byId('tooltip');
renderer.domElement.addEventListener('mousemove', (e)=>{
  raycaster.setFromCamera(pointerNDC(e), camera);
  const intersects = raycaster.intersectObjects(scene.children, true);
  let found = null;
  for(const it of intersects){
    if(it.object.userData && (it.object.userData.isAsset || it.object.userData.isHeredadoAsset)){ found = it.object.userData; break; }
  }
  if(found){
    let inst;
    if(found.isHeredadoAsset){
      inst = findInstanciaEnMatrices(found.matrizInstanciaId);
    } else {
      const sede = getSedeById(found.sedeId);
      inst = sede && sede.instancias.find(i=>i.instanciaId===found.instanciaId);
    }
    if(inst){
      const vertical = getVertical(inst.verticalId);
      const rect = wrap.getBoundingClientRect(); // el tooltip se posiciona relativo al canvas
      tooltipEl.style.display='block';
      tooltipEl.style.left = (e.clientX-rect.left+14)+'px';
      tooltipEl.style.top = (e.clientY-rect.top+10)+'px';
      tooltipEl.innerHTML = `<div class="t-title">${inst.nombreSubproducto}${found.isHeredadoAsset?' <span class="t-heredado">(heredado)</span>':''}</div>
        <div class="t-sub">${vertical.nombre}${inst.marca?' · '+escapeHtml(inst.marca):''}</div>`;
    }
  } else {
    tooltipEl.style.display='none';
  }
});
renderer.domElement.addEventListener('mouseleave', ()=>{ tooltipEl.style.display='none'; });

/* --- Loop de render --- */
const clock = new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  state.matrices.forEach(matriz=>{
    const shell = matriz.group.getObjectByName('hubShell');
    if(shell) shell.rotation.y = t * 0.25;
    const shell2 = matriz.group.getObjectByName('hubShell2');
    if(shell2) shell2.rotation.y = -t * 0.35;
  });

  connectionAnims.forEach(c=>{
    const tt = (t * c.speed * 0.3 + c.phase) % 1;
    const p = c.curve.getPointAt(tt);
    c.particle.position.copy(p);
  });
  updateSatelliteAnims(t);
  updateSdwanAnims(t);

  // pulso sutil en los puertos de conexión, para invitar a arrastrar desde ahí
  const portPulse = 1 + Math.sin(t*3) * 0.14;
  scene.traverse(o=>{ if(o.userData && o.userData.isPort) o.scale.setScalar(PORT_BASE_SCALE * portPulse); });

  renderer.render(scene, camera);
  updateNameLabelPositions();
}
animate();

/* =========================================================================
   6. PANEL DERECHO — navegación de niveles + instancias existentes
   ========================================================================= */

/* Icono 2D simplificado por assetKey, para mostrar junto al nombre del Producto (N2) en el
   catálogo del panel izquierdo (el mismo assetKey que usa el ícono 3D de la escena). */
const ICONS_SVG = {
  enlace:    '<svg viewBox="0 0 24 24"><path d="M8 12h8M6 8a3 3 0 000 8M18 8a3 3 0 010 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  nodo:      '<svg viewBox="0 0 24 24"><path d="M12 3l8 5v8l-8 5-8-5V8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  globo:     '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><ellipse cx="12" cy="12" rx="3.2" ry="8" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M4 12h16" stroke="currentColor" stroke-width="1.4"/></svg>',
  rack:      '<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="4" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><rect x="5" y="10" width="14" height="4" rx="1" fill="none" stroke="currentColor" stroke-width="2"/><rect x="5" y="16" width="14" height="4" rx="1" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  nube:      '<svg viewBox="0 0 24 24"><path d="M7 17a4 4 0 01-.6-7.96A5 5 0 0116.9 8 4.5 4.5 0 0117 17H7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  escudo:    '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  candado:   '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 11V8a4 4 0 018 0v3" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  llave:     '<svg viewBox="0 0 24 24"><circle cx="7" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 12h9M15 12v3M18 12v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  muro:      '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  pantalla:  '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 20h6M12 17v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  documento: '<svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 12h6M10 16h6M10 8h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  puerta:    '<svg viewBox="0 0 24 24"><path d="M6 21V6a2 2 0 012-2h8a2 2 0 012 2v15" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 21h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  antena:    '<svg viewBox="0 0 24 24"><path d="M4 9a13 13 0 0116 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 13a8 8 0 0110 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10 17a3 3 0 014 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="20" r="1.2" fill="currentColor"/></svg>',
};

const navEmpty = byId('navEmpty');
const navContent = byId('navContent');
const navSedeLabel = byId('navSedeLabel');
const matrizHintEl = byId('matrizHint');
const matrizEditBoxEl = byId('matrizEditBox');
const instanceSection = byId('instanceSection');
const instanceSectionTitle = byId('instanceSectionTitle');
const instanceListEl = byId('instanceList');

/* Bloque de edición de la Matriz seleccionada: nombre editable (igual que una sede), Usuarios
   (pedido cliente 31/07/2026 — mismo patrón slider+número que Empleados de Sede, salvo que acá
   el mínimo es 0: una Matriz puede no tener usuarios propios asignados) y botón de eliminar. La
   posición no se edita con un campo numérico — se mueve arrastrándola en el canvas, igual que
   una sede. */
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
    <button class="btn danger-outline block" id="btnDeleteMatriz">Eliminar Matriz</button>
  `);
  byId('matrizNombreInput').addEventListener('input', (e)=>{
    matriz.nombre = e.target.value;
    updateSedeNameSprite(matriz);
    navSedeLabel.textContent = `Matriz: ${matriz.nombre || '(sin nombre)'}`;
  });

  bindSliderNumber(
    byId('matrizUsuariosRange'),
    byId('matrizUsuariosNumber'),
    0, EMPLEADOS_SLIDER_MAX,
    (v)=>{ matriz.usuarios = v; }
  );

  byId('btnDeleteMatriz').addEventListener('click', ()=>{
    const ok = confirm(`¿Eliminar "${matriz.nombre}" y todo lo que tiene asignado (productos propios y conexiones)? Esta acción no se puede deshacer.`);
    if(ok) deleteMatriz(matriz);
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
      navSedeLabel.textContent = `Nube: ${nube.nombre || '(sin nombre)'}`;
    });
  }
  byId('btnDeleteNube').addEventListener('click', ()=>{
    const ok = nube.esAutoInternet
      ? confirm(`"${nube.nombre}" es la Nube automática de Internet: TODOS los productos de Internet (Corporativo/Startup/Teleworking) de cualquier sede que apunten a ella se eliminarán también. Si luego se agrega otro producto de Internet, se creará una Nube nueva. ¿Eliminar de todos modos?`)
      : confirm(`¿Eliminar "${nube.nombre}" y las conexiones (Cloud Interconnect) que apuntan a ella? Esta acción no se puede deshacer.`);
    if(ok) deleteNube(nube);
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
    const ok = confirm(`¿Eliminar el Datacenter Epicentro? Se eliminarán sus productos propios (Collocation, Crossconexión, Hosting, etc.) y cualquier conexión que apunte a él (Cloud Interconnect, Zona Wireless). Podrás restaurarlo luego desde el panel izquierdo.`);
    if(ok) deleteDatacenter();
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
syncDatacenterRestoreUI();

function initials(nombre){
  const words = nombre.replace(/[\/()]/g,' ').split(/\s+/).filter(Boolean);
  if(words.length===1) return words[0].slice(0,2).toUpperCase();
  return (words[0][0]+words[1][0]).toUpperCase();
}

/* =========================================================================
   3.5 SALUD DE INFRAESTRUCTURA — barra de progreso por vertical + score global
   Cuenta cuántos subproductos DISTINTOS del catálogo de cada vertical están contratados en
   algún punto de la configuración (Sede, Matriz o Datacenter), sobre el total de subproductos
   que existen en esa vertical. El score global es el promedio simple de las 4 verticales
   (cada vertical pesa igual, "regla de tres" por vertical y luego promedio entre las 4).
   ========================================================================= */
function totalSubproductosVertical(verticalId){
  return getProductosByVertical(verticalId)
    .reduce((sum,p)=>sum+getSubproductosByProducto(p.id).length, 0);
}
function subproductosAsignadosVertical(verticalId){
  const productoIds = new Set(getProductosByVertical(verticalId).map(p=>p.id));
  const ids = new Set();
  todasLasEntidades().forEach(entity=>{
    (entity.instancias||[]).forEach(inst=>{
      const sub = getSubproducto(inst.subproductoId);
      if(sub && productoIds.has(sub.productoNivel2Id)) ids.add(sub.id);
    });
  });
  return ids.size;
}
function saludPorVertical(){
  return VERTICALES.map(v=>{
    const total = totalSubproductosVertical(v.id);
    const asignados = subproductosAsignadosVertical(v.id);
    const pct = total>0 ? Math.round((asignados/total)*100) : 0;
    return { vertical:v, asignados, total, pct };
  });
}
function saludGlobal(){
  const porVertical = saludPorVertical();
  if(porVertical.length===0) return 0;
  return Math.round(porVertical.reduce((s,v)=>s+v.pct,0)/porVertical.length);
}
const VERTICAL_BAR_COLOR = { conectividad:'var(--cian)', cloud:'var(--indigo)', ciberseguridad:'var(--rosa)', colaboracion:'var(--verde)' };

const saludBarsEl = byId('saludBars');
const saludGlobalBadgeEl = byId('saludGlobalBadge');
function renderSaludPanel(){
  const porVertical = saludPorVertical();
  saludGlobalBadgeEl.textContent = saludGlobal() + '%';
  saludBarsEl.innerHTML = '';
  porVertical.forEach(v=>{
    const row = document.createElement('div');
    row.className = 'salud-row';
    row.innerHTML = `
      <span class="salud-label">${v.vertical.nombre}</span>
      <span class="salud-bar-track"><span class="salud-bar-fill" style="width:${v.pct}%;background:${VERTICAL_BAR_COLOR[v.vertical.id]||'var(--cian)'};"></span></span>
      <span class="salud-count">${v.asignados}/${v.total}</span>`;
    saludBarsEl.appendChild(row);
  });
}

/* Catálogo del panel izquierdo: acordeón por Vertical (solo una abierta a la vez, para ocupar
   menos espacio), con el ícono del Producto (N2) junto a su nombre, y cada Subproducto (N3) como
   un "cuadradito" arrastrable con su nombre visible debajo. Al soltarse sobre una sede o una
   Matriz en el canvas, abre el popup de asignación (ver §5, drop handler). */
let catalogOpenVerticalId = VERTICALES[0].id;

function renderCatalogPanel(){
  const container = byId('productLegend');
  container.innerHTML = '';
  VERTICALES.forEach(v=>{
    const isOpen = catalogOpenVerticalId === v.id;
    const vBlock = document.createElement('div');
    vBlock.className = 'catalog-vertical' + (isOpen ? ' open' : '');

    const vHeader = document.createElement('div');
    vHeader.className = 'catalog-vertical-header';
    vHeader.innerHTML = `<span>${v.nombre}</span><span class="catalog-vertical-arrow">›</span>`;
    vHeader.addEventListener('click', ()=>{
      catalogOpenVerticalId = isOpen ? null : v.id; // clic en la ya abierta la cierra; otra la reemplaza
      renderCatalogPanel();
    });
    vBlock.appendChild(vHeader);

    const vBody = document.createElement('div');
    vBody.className = 'catalog-vertical-body';
    getProductosByVertical(v.id).forEach(p=>{
      const pRow = document.createElement('div');
      pRow.className = 'catalog-producto';
      const pLabel = document.createElement('div');
      pLabel.className = 'catalog-producto-label';
      pLabel.innerHTML = `<span class="catalog-producto-icon" style="color:${colorHex(getProductoColor(p))}">${ICONS_SVG[p.assetKey]||''}</span><span>${p.nombre}</span>`;
      pRow.appendChild(pLabel);
      const chipsWrap = document.createElement('div');
      chipsWrap.className = 'catalog-chips';
      getSubproductosByProducto(p.id).forEach(s=>{
        const chipItem = document.createElement('div');
        chipItem.className = 'catalog-chip-item';
        const chip = document.createElement('div');
        chip.className = 'catalog-chip';
        chip.draggable = true;
        chip.title = `${s.nombre} — arrastra a ${nombreDestinos(s)}`;
        chip.dataset.subproductoId = s.id;
        chip.style.background = colorHex(getSubproductoColor(s));
        chip.textContent = initials(s.nombre);
        chip.addEventListener('dragstart', (e)=>{
          draggingSubproductoId = s.id;
          e.dataTransfer.setData('text/plain', 'subproducto:'+s.id);
          e.dataTransfer.effectAllowed = 'copy';
        });
        chip.addEventListener('dragend', ()=>{ draggingSubproductoId = null; });
        chip.addEventListener('click', ()=>{
          if(state.placing && state.placing.tipo==='subproducto' && state.placing.id===s.id){ disarmPlacing(); return; }
          armPlacing({ tipo:'subproducto', id:s.id }, `Toca ${nombreDestinos(s)} para asignar "${s.nombre}"`);
        });
        makeTouchDraggable(chip, (x,y)=>assignSubproductoAtClientPoint(s.id,x,y), s.nombre, colorHex(getSubproductoColor(s)),
          id=>destinoValidoParaEntidad(s, id));
        const chipLabel = document.createElement('div');
        chipLabel.className = 'catalog-chip-label';
        chipLabel.textContent = s.nombre;
        chipItem.appendChild(chip);
        const destinos = destinosPermitidos(s);
        if(destinos.includes('datacenter')){
          const badge = document.createElement('span');
          badge.className = 'chip-dc-badge';
          badge.textContent = 'DC';
          chipItem.appendChild(badge);
        }
        if(destinos.includes('nube')){
          const badge = document.createElement('span');
          badge.className = 'chip-dc-badge badge-nube';
          badge.textContent = 'NUBE';
          chipItem.appendChild(badge);
        }
        chipItem.appendChild(chipLabel);
        chipsWrap.appendChild(chipItem);
      });
      pRow.appendChild(chipsWrap);
      vBody.appendChild(pRow);
    });
    vBlock.appendChild(vBody);
    container.appendChild(vBlock);
  });
}
renderCatalogPanel();

function renderRightPanel(){
  renderSaludPanel();
  const ids = state.selectedSedeIds;

  if(ids.length===0){
    navEmpty.style.display='block';
    navContent.style.display='none';
    instanceSection.style.display='none';
    return;
  }
  navEmpty.style.display='none';
  navContent.style.display='block';

  const singleId = ids.length===1 ? ids[0] : null;
  const isMatriz = !!singleId && state.matrices.some(m=>m.id===singleId);
  const isNube = !!singleId && state.nubes.some(n=>n.id===singleId);
  const isDatacenter = singleId==='datacenter';
  const isSedeSingle = !!singleId && !isMatriz && !isNube && !isDatacenter;

  const nombres = ids.map(id=>getSedeById(id).nombre);
  navSedeLabel.textContent = isMatriz ? `Matriz: ${nombres[0]}`
    : isNube ? `Nube: ${nombres[0]}${getNubeById(singleId) && getNubeById(singleId).esAutoInternet ? ' (automática de Internet)' : ''}`
    : isDatacenter ? 'Datacenter Epicentro'
    : (ids.length===1 ? `Sede: ${nombres[0]}` : `${ids.length} entidades seleccionadas: ${nombres.join(', ')}`);

  matrizHintEl.style.display = (isMatriz || isNube || isDatacenter) ? 'block' : 'none';
  matrizHintEl.textContent = isMatriz
    ? 'Arrastra un producto desde el panel izquierdo sobre esta Matriz para agregarlo como producto propio.'
    : isNube
      ? 'Arrastra un producto de Hosting (IaaS/BaaS/DRaaS) desde el panel izquierdo sobre esta Nube para agregarlo como producto propio.'
      : isDatacenter
      ? 'Arrastra un producto de Cloud (Housing/Hosting) desde el panel izquierdo para agregarlo como producto propio, o arrastra desde el puerto (●) de una sede o Matriz hasta aquí para contratar Internet/ISP.'
      : '';

  renderSedeEditBox(isSedeSingle ? getSedeById(singleId) : null);
  renderMatrizEditBox(isMatriz ? getMatrizById(singleId) : null);
  renderNubeEditBox(isNube ? getNubeById(singleId) : null);
  renderDatacenterEditBox(isDatacenter ? state.datacenter : null);
  renderConnectionsBox(singleId);
  renderHerenciaBox(isSedeSingle ? getSedeById(singleId) : null);

  if(ids.length===1){
    const entity = getSedeById(ids[0]);
    instanceSectionTitle.textContent = isMatriz ? 'Productos propios de la Matriz'
      : isNube ? 'Productos propios de la Nube'
      : isDatacenter ? 'Productos propios del Datacenter'
      : 'Servicios asignados';
    // Los productos `ocultaEnServiciosAsignados` (Canal de Conexión, Cloud Interconnect) viven únicamente
    // en el panel "Conexiones": ahí sí se ve a qué sede/Matriz están conectados, mientras que acá
    // solo se vería el nombre del producto sin ese contexto — confuso. Sdwan y los productos de
    // Internet SÍ se siguen mostrando acá (sus nombres se entienden solos, con o sin destino).
    const visibles = entity.instancias.filter(inst=>!getSubproducto(inst.subproductoId).ocultaEnServiciosAsignados);
    if(visibles.length>0){
      instanceSection.style.display='block';
      instanceListEl.innerHTML='';
      visibles.forEach(inst=>{
        const vertical = getVertical(inst.verticalId);
        const sub = getSubproducto(inst.subproductoId);
        // Sdwan (v9 §3, ajustado): el nombre solo no dice a qué canal se está aplicando — se
        // agrega el destino inline, igual que Canal de Conexión/Cloud Interconnect en el reporte.
        let nombreMostrado = inst.nombreSubproducto;
        if(sub.id==='sdwan'){
          const target = inst.targetConexionId ? state.conexiones.find(c=>c.id===inst.targetConexionId) : null;
          nombreMostrado += target
            ? ` <span class="muted-inline">→ ${escapeHtml(nombreEntidad(otroExtremo(target, entity.id)))}</span>`
            : ` <span class="muted-inline">(sin canal aplicado)</span>`;
        }
        const row = document.createElement('div');
        row.className='inst-row';
        row.innerHTML = `<span class="inst-dot" style="background:${colorHex(getSubproductoColor(sub))};"></span>
          <span class="inst-name">${nombreMostrado}</span>
          <span class="inst-vertical">${vertical.nombre}</span>
          <span class="inst-delete" title="Eliminar">−</span>`;
        row.addEventListener('click', ()=>openPopupForEdit(entity.id, inst.instanciaId));
        row.querySelector('.inst-delete').addEventListener('click', (e)=>{
          e.stopPropagation();
          deleteInstanceDirect(entity, inst.instanciaId);
        });
        instanceListEl.appendChild(row);
      });
    } else {
      instanceSection.style.display='none';
    }
  } else {
    instanceSection.style.display='none';
  }
}

const connectionsBoxEl = byId('connectionsBox');

/* Devuelve la instancia (el "servicio asignado") que originó una conexión, si la tiene ligada.
   Desde esta fase, TODA conexión nueva (auto al Datacenter, por dropdown "Conectar a", o
   arrastrando el cable a mano desde el puerto) queda ligada a una instancia — son un solo
   registro. */
function getInstanciaLigada(c){
  if(!c.instanciaId || !c.ownerId) return null;
  const owner = getSedeById(c.ownerId);
  if(!owner) return null;
  return owner.instancias.find(i=>i.instanciaId===c.instanciaId) || null;
}

/* Selecciona una conexión (resalta el cable en la escena 3D) y, si tiene una instancia ligada,
   abre directamente su popup de edición — el MISMO formulario que "Servicios asignados" usa
   para el mismo producto. Ya no hay un editor de Ancho de banda/Compartición aparte: la
   conexión y el servicio asignado son una sola cosa, se editan en un solo lugar. */
function abrirConexion(c){
  state.selectedConexionId = c.id;
  rebuildConnections();
  const inst = getInstanciaLigada(c);
  if(inst){
    openPopupForEdit(c.ownerId, c.instanciaId);
  } else {
    renderRightPanel();
  }
}

/* Lista de conexiones activas de la entidad seleccionada (Sede, Matriz o Datacenter). Cada fila
   resume el producto que representa (mismo color/nombre que su chip del catálogo) y, al hacer
   clic, abre su popup de edición. Las conexiones se crean arrastrando un producto de
   Conectividad sobre una Sede/Matriz (con o sin dropdown de destino, según el producto) o
   arrastrando el cable a mano desde el puerto (●) de la entidad. */
/* Busca, en cualquier Sede/Matriz, la instancia de Sdwan que balancea esta conexión (si hay
   alguna) — a diferencia de conexionTieneSdwan (que solo mira una entidad puntual), esta recorre
   todas, porque el Sdwan puede vivir en cualquiera de los 2 extremos de la conexión. Usada para
   mostrar el indicador "⚡ Sdwan" en la lista de Conexiones. */
function buscarSdwanQueApuntaA(conexionId){
  for(const entity of entidadesPortadoras()){
    const inst = entity.instancias.find(i=>i.subproductoId==='sdwan' && i.targetConexionId===conexionId);
    if(inst) return inst;
  }
  return null;
}

function renderConnectionsBox(entityId){
  if(!entityId){
    hideBox(connectionsBoxEl);
    return;
  }
  const conexiones = conexionesDe(entityId);
  if(conexiones.length===0){
    // Una Nube no se conecta arrastrando un cable a mano (v9 §4) — solo la elige como destino el
    // dropdown "Conectar a" de Cloud Interconnect, desde el lado de la Sede/Matriz de origen.
    const hint = tipoEntidad(entityId)==='nube'
      ? 'Sin conexiones activas. Una Nube se conecta desde el popup de Cloud Interconnect (dropdown "Conectar a"), no arrastrando un cable a mano.'
      : 'Sin conexiones activas. Arrastra desde el puerto (●) hacia otra sede, la Matriz o el Datacenter para conectar.';
    showBox(connectionsBoxEl, `<label>Conexiones</label>
      <div class="connEmpty">${hint}</div>`);
    return;
  }
  showBox(connectionsBoxEl, `<label>Conexiones</label><div class="connList" id="connListWrap"></div>`);
  const listEl = connectionsBoxEl.querySelector('#connListWrap');

  conexiones.forEach(c=>{
    const otro = otroExtremo(c, entityId);
    const tipoSub = c.subproductoId ? getSubproducto(c.subproductoId) : null;
    const dotColor = tipoSub ? colorHex(getSubproductoColor(tipoSub)) : 'var(--cian)';
    const tipoLabel = tipoSub ? tipoSub.nombre + (c.esBackup ? ' (Backup)' : '') : (c.esBackup ? 'Backup' : '');
    const sdwanAplicado = buscarSdwanQueApuntaA(c.id);
    const sdwanTag = sdwanAplicado ? ` <span class="connDetalle" title="Sdwan balanceando este canal">⚡ Sdwan</span>` : '';
    const inst = getInstanciaLigada(c);
    // El detalle mostrado sale de las propiedades reales de la instancia (Ancho de banda,
    // Ubicaciones, Nube, etc. — lo que sea que tenga ese subproducto), no de un campo aparte.
    const detalle = inst
      ? Object.values(inst.propiedades||{}).filter(Boolean).map(escapeHtml).join(' · ')
      : [c.anchoBanda, c.comparticion].filter(Boolean).map(escapeHtml).join(' · '); // compatibilidad con conexiones legado sin instancia ligada
    const isSelected = state.selectedConexionId === c.id;

    const item = document.createElement('div');
    item.className = 'connItem' + (isSelected ? ' open' : '');

    const row = document.createElement('div');
    row.className = 'connRow';
    row.innerHTML = `
      <span class="connDot" style="background:${dotColor};"></span>
      <span class="connName">${escapeHtml(nombreEntidad(otro))}${tipoLabel ? ` <span class="connDetalle">· ${tipoLabel}</span>` : ''}${detalle ? ` <span class="connDetalle">(${detalle})</span>` : ''}${sdwanTag}</span>
      <span class="connArrow" title="Editar">✎</span>
      <span class="connDelete" title="${c.esBackup ? 'Quitar este enlace de backup' : 'Eliminar conexión (y el servicio asignado que representa)'}">−</span>`;
    row.addEventListener('click', (e)=>{
      if(e.target.classList.contains('connDelete')) return;
      abrirConexion(c);
    });
    row.querySelector('.connDelete').addEventListener('click', (e)=>{
      e.stopPropagation();
      eliminarConexion(c.id);
    });
    item.appendChild(row);
    listEl.appendChild(item);
  });
}

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
    navSedeLabel.textContent = `Sede: ${sede.nombre || '(sin nombre)'}`;
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
    const ok = confirm(`¿Eliminar "${sede.nombre}" y todo lo que tiene asignado (productos y conexiones)? Esta acción no se puede deshacer.`);
    if(ok) deleteSede(sede);
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
      const shade = colorHex(getSubproductoColor(sub));
      const checked = sede.herenciaIds.includes(inst.instanciaId);
      return `<label class="herenciaRow">
        <input type="checkbox" class="herenciaCheck" data-inst="${inst.instanciaId}" ${checked?'checked':''}>
        <span class="inst-dot" style="background:${shade};"></span>
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
}

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
function candidatosConexionEntreSedes(entityId, sub){
  if(sub && sub.destino==='nube'){
    return state.nubes.filter(e=>e.id!==entityId && parValidoConexion(entityId, e.id));
  }
  return entidadesPortadoras().filter(e=>e.id!==entityId && parValidoConexion(entityId, e.id));
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
   arrastrarla y colocarla aparte. Para Cloud Interconnect (`destino:'nube'`) los candidatos son
   Nubes, no Sedes/Matrices (v9 §4).
   v10 (31/07/2026): ya NO se ofrece "Sin conectar por ahora" — Canal de Conexión, Cloud
   Interconnect y Túnel IPsec (los 3 únicos que usan este dropdown) ahora requieren
   obligatoriamente un destino antes de poder guardar (ver validación en btnSavePopup más abajo),
   así que ofrecer la opción de dejarlo sin resolver iba contra esa regla. */
function renderPopupConexionOptions(entityId, sub){
  const esNube = sub && sub.destino==='nube';
  const candidatos = candidatosConexionEntreSedes(entityId, sub);
  // Placeholder NO seleccionable (disabled): a diferencia de la vieja "Sin conectar por ahora",
  // esto no es una opción válida para guardar (la validación de btnSavePopup la rechaza igual que
  // a un valor vacío) — está solo para que el <select> nunca arranque con una sola opción real ya
  // pre-seleccionada por el navegador (si eso pasara, el usuario no podría "reelegirla" para
  // disparar el evento change y resolverla — típico caso: recién se crea la primera Sede del
  // proyecto y el único candidato es "+ Agregar nueva Matriz").
  const opciones = ['<option value="" disabled selected>Elegí un destino…</option>']
    .concat(esNube
      ? candidatos.map(e=>`<option value="${e.id}">${escapeHtml(e.nombre)} (Nube)</option>`)
      : candidatos.map(e=>`<option value="${e.id}">${escapeHtml(e.nombre)} (${tipoEntidad(e.id)==='matriz'?'Matriz':'Sede'})</option>`))
    .concat(esNube
      ? [`<option value="${CONEXION_NUEVA_NUBE}">+ Agregar nueva Nube</option>`]
      : [
          `<option value="${CONEXION_NUEVA_SEDE}">+ Agregar nueva Sede</option>`,
          `<option value="${CONEXION_NUEVA_MATRIZ}">+ Agregar nueva Matriz</option>`,
        ]);
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
    const nombre = (prompt('¿Con qué proveedor es este Hosting/Nube? (ej. AWS, Azure, GCP)') || '').trim();
    const {gx,gz} = nearestFreeCell(0,0);
    nueva = createNube(nombre, gx, gz);
  } else {
    const {gx,gz} = nearestFreeCell(0,0);
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
      popupConexionSelect.style.borderColor = 'var(--danger)';
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
      if(generaConexionAutomatica(sub) && sedeId!=='datacenter'){
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

/* =========================================================================
   7b. CONEXIONES — cada conexión (cable) que representa un producto de Conectividad está ligada
   a la instancia que la originó (conexion.instanciaId + conexion.ownerId): son un solo registro,
   no dos formularios separados. Ver renderConnectionsBox más arriba, que al hacer clic abre el
   mismo popup que "Servicios asignados" en vez de un editor propio.
   ========================================================================= */

/* Elimina una conexión. Si tenía una instancia ligada (el caso normal desde esta fase en
   adelante), esa instancia ES el producto contratado — se elimina también, como si se hubiera
   borrado desde "Servicios asignados" (misma cosa, dos puntos de entrada). Si conectaba una sede
   con una Matriz, también limpia de esa sede SOLO los productos heredados que venían de esa
   Matriz en particular (si la sede seguía conectada a alguna otra Matriz, esa otra herencia no
   se toca). */
function eliminarConexion(conexionId){
  const c = state.conexiones.find(x=>x.id===conexionId);
  if(!c) return;
  // Backup (v9 §2): es un enlace derivado, no un producto propio — quitarlo desde "Conexiones"
  // solo suelta el segundo cable y desmarca el checkbox de la instancia; el servicio principal
  // (y su propia conexión) no se tocan.
  if(c.esBackup){
    state.conexiones = state.conexiones.filter(x=>x.id!==conexionId);
    const owner = c.ownerId ? getSedeById(c.ownerId) : null;
    const inst = owner ? owner.instancias.find(i=>i.instanciaId===c.instanciaId) : null;
    if(inst) inst.backup = false;
    limpiarSdwanQueApuntanA(conexionId);
    if(state.selectedConexionId === conexionId) state.selectedConexionId = null;
    rebuildConnections();
    renderRightPanel();
    return;
  }
  state.conexiones = state.conexiones.filter(x=>x.id!==conexionId);
  limpiarSdwanQueApuntanA(conexionId);
  // Si esta conexión tenía un backup propio (mismo instanciaId), se elimina junto con ella — no
  // tiene sentido dejar un enlace de respaldo sin el enlace principal que respalda.
  const backupHermano = state.conexiones.find(x=>x.instanciaId===c.instanciaId && x.esBackup);
  if(backupHermano){
    state.conexiones = state.conexiones.filter(x=>x.id!==backupHermano.id);
    limpiarSdwanQueApuntanA(backupHermano.id);
    if(state.selectedConexionId===backupHermano.id) state.selectedConexionId = null;
  }
  if(c.instanciaId && c.ownerId){
    const owner = getSedeById(c.ownerId);
    if(owner){
      owner.instancias = owner.instancias.filter(i=>i.instanciaId!==c.instanciaId);
      refreshSedeAssets(owner);
    }
  }
  [c.aId, c.bId].forEach(id=>{
    const matriz = getMatrizById(id);
    if(!matriz) return;
    const otroId = id===c.aId ? c.bId : c.aId;
    const sede = getSedeById(otroId);
    if(sede && sede.tipo!=='matriz' && sede.herenciaIds && sede.herenciaIds.length){
      const idsDeEstaMatriz = new Set(matriz.instancias.map(i=>i.instanciaId));
      const before = sede.herenciaIds.length;
      sede.herenciaIds = sede.herenciaIds.filter(hid=>!idsDeEstaMatriz.has(hid));
      if(sede.herenciaIds.length!==before) refreshSedeAssets(sede);
    }
  });
  if(state.selectedConexionId === conexionId) state.selectedConexionId = null;
  rebuildConnections();
  renderRightPanel();
}

/* =========================================================================
   8. DESELECCIONAR
   ========================================================================= */

byId('btnDeselect').addEventListener('click', ()=>{
  state.selectedSedeIds = [];
  const hadConexion = !!state.selectedConexionId;
  state.selectedConexionId = null;
  updateSelectionVisuals();
  if(hadConexion) rebuildConnections();
  renderRightPanel();
});

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
renderLogoButton();

function buildConfiguracionCliente(){
  return {
    version: 13, // v13: Sdwan se aplica sobre un canal EXISTENTE elegido por el vendedor
                 // (inst.targetConexionId), en vez de ser un estado genérico de la sede — su
                 // ícono se dibuja sobre esa conexión específica (ver rebuildSdwanBadges).
                 // v12: Backup/doble enlace por instancia (esBackup en conexiones, backup en
                 // instancias) + nueva entidad Nube (destino de Cloud Interconnect)
    nombreCliente: state.clienteNombre || 'Sin nombre',
    clienteLogo: state.clienteLogo || null,
    generadoEn: new Date().toISOString(),
    salud: {
      inicial: state.saludInicial, // ingresado a mano por el vendedor, o null si no se completó
      actual: saludGlobal(),
      porVertical: saludPorVertical().map(v=>({ vertical: v.vertical.nombre, asignados: v.asignados, total: v.total, pct: v.pct })),
    },
    matrices: state.matrices.map(m=>({
      id: m.id, nombre: m.nombre, gx: m.gx, gz: m.gz, usuarios: m.usuarios||0,
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

const saludInicialInput = byId('saludInicialInput');
saludInicialInput.addEventListener('input', ()=>{
  const v = saludInicialInput.value;
  state.saludInicial = v==='' ? null : Math.max(0, Math.min(100, parseInt(v,10)||0));
});

function openReport(){
  const config = buildConfiguracionCliente();
  reportSubtitle.textContent = `${config.nombreCliente} · ${config.sedes.length} sede(s) · ${config.matrices.length} matriz(ces) · generado ${new Date(config.generadoEn).toLocaleString('es-EC')}`;
  saludInicialInput.value = state.saludInicial===null || state.saludInicial===undefined ? '' : state.saludInicial;
  reportBody.innerHTML='';

  // --- Bloque de Salud de infraestructura: estado actual (barras por vertical + score global)
  // y, si el vendedor lo completó, el estado inicial del cliente antes de Puntonet, para poder
  // mostrar el "antes vs después" en la conversación comercial. ---
  const saludBox = document.createElement('div');
  saludBox.className = 'report-sede';
  const saludHeader = document.createElement('h3');
  const antesTxt = (state.saludInicial===null || state.saludInicial===undefined) ? '' :
    `<span class="muted-meta"> · Estado inicial: ${state.saludInicial}%</span>`;
  saludHeader.innerHTML = `<span>Salud de infraestructura — ${config.salud.actual}%</span>${antesTxt}`;
  saludBox.appendChild(saludHeader);
  config.salud.porVertical.forEach(v=>{
    const row = document.createElement('div');
    row.className = 'report-inst';
    row.innerHTML = `<div class="rline1"><span>${v.vertical}</span><span class="muted-small">${v.asignados}/${v.total} · ${v.pct}%</span></div>`;
    saludBox.appendChild(row);
  });
  reportBody.appendChild(saludBox);

  function renderInstRow(inst, container, heredadoDe){
    const sub = getSubproducto(inst.subproductoId);
    const producto = getProducto(sub.productoNivel2Id);
    const shade = colorHex(getSubproductoColor(sub));
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
      <div class="rline1"><span>${inst.nombreSubproducto}${destinoTxt}${heredadoDe?' <span class="muted-inline">(heredado de '+escapeHtml(heredadoDe)+')</span>':''}</span><span style="color:${shade};font-size:11px;">${getVertical(inst.verticalId).nombre} · ${producto.nombre}</span></div>
      <div class="rmeta">${inst.marca ? 'Marca: '+escapeHtml(inst.marca) : 'Marca: —'}</div>
      ${propsHtml ? `<div class="rprops">${propsHtml}</div>` : ''}
      ${inst.notas ? `<div class="rnotes">"${escapeHtml(inst.notas)}"</div>` : ''}
    `;
    container.appendChild(row);

    // Backup (v9 §2): línea propia, con su destino — es el mismo servicio contratado, pero el
    // cliente lo ve como un renglón aparte (aparece en la Salud de infraestructura como un enlace
    // más, no como un atributo invisible del original).
    const backupConexion = state.conexiones.find(c=>c.instanciaId===inst.instanciaId && c.esBackup);
    if(backupConexion){
      const backupRow = document.createElement('div');
      backupRow.className = 'report-inst';
      backupRow.innerHTML = `
        <div class="rline1"><span>${inst.nombreSubproducto} (Backup) <span class="muted-inline">→ ${escapeHtml(nombreEntidad(otroExtremo(backupConexion, backupConexion.ownerId)))}</span></span><span style="color:${shade};font-size:11px;">${getVertical(inst.verticalId).nombre} · ${producto.nombre}</span></div>
        <div class="rmeta">Enlace de respaldo en paralelo — misma contratación que ${inst.nombreSubproducto}.</div>
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
      if(matriz.instancias.length===0){
        const empty = document.createElement('div');
        empty.className='report-inst'; empty.style.color='var(--muted)'; empty.style.fontSize='11.5px';
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
        empty.className='report-inst'; empty.style.color='var(--muted)'; empty.style.fontSize='11.5px';
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
    empty.className='report-inst'; empty.style.color='var(--muted)'; empty.style.fontSize='11.5px';
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
        empty.className='report-inst'; empty.style.color='var(--muted)'; empty.style.fontSize='11.5px';
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

/* Calcula la caja envolvente (world space) de todo lo que hay en el canvas: cada Matriz, el
   Datacenter, y cada sede colocada. Se usa para que el snapshot del PDF siempre encuadre TODO,
   sin importar dónde haya dejado la cámara/zoom el vendedor. */
function computeSceneBoundingBox(){
  const box = new THREE.Box3();
  state.matrices.forEach(m=> box.expandByObject(m.group));
  state.nubes.forEach(n=> box.expandByObject(n.group));
  box.expandByObject(datacenterGroup);
  state.sedes.forEach(sede=> box.expandByObject(sede.group));
  return box;
}

/* Dada una caja envolvente y el aspect ratio del canvas, calcula el nivel de zoom ortográfico
   necesario para que la caja completa entre en el frustum (con margen), con la cámara ya
   posicionada/orientada. Se proyectan las 8 esquinas de la caja al espacio de la cámara para
   encontrar el semi-ancho/semi-alto requerido — más preciso que estimar solo con el centro y el
   radio de la caja. */
function fitZoomToBox(box, aspect){
  camera.updateMatrixWorld(true);
  const inv = camera.matrixWorldInverse;
  const corners = [
    [box.min.x,box.min.y,box.min.z], [box.min.x,box.min.y,box.max.z],
    [box.min.x,box.max.y,box.min.z], [box.min.x,box.max.y,box.max.z],
    [box.max.x,box.min.y,box.min.z], [box.max.x,box.min.y,box.max.z],
    [box.max.x,box.max.y,box.min.z], [box.max.x,box.max.y,box.max.z],
  ];
  let maxAbsX = 0.001, maxAbsY = 0.001;
  corners.forEach(([x,y,z])=>{
    const v = new THREE.Vector3(x,y,z).applyMatrix4(inv);
    maxAbsX = Math.max(maxAbsX, Math.abs(v.x));
    maxAbsY = Math.max(maxAbsY, Math.abs(v.y));
  });
  const PADDING = 0.78; // deja aire alrededor para que nada quede pegado al borde del banner
  const zoomX = (FRUSTUM*aspect*PADDING) / maxAbsX;
  const zoomY = (FRUSTUM*PADDING) / maxAbsY;
  return Math.min(zoomX, zoomY, ZOOM_MAX);
}

/* Captura un snapshot del canvas 3D para usarlo como header/hero del PDF. En vez de fotografiar
   la cámara tal como la dejó el vendedor (podía estar zoomeada a un detalle, o mirando desde un
   ángulo raro), fuerza temporalmente una vista isométrica aérea "de catálogo" — la misma
   orientación del botón "Restablecer vista" — y calcula el zoom justo para que TODA la
   infraestructura (Matriz, Datacenter y cada sede) entre en el encuadre. Al terminar, restaura
   exactamente el ángulo/zoom que el vendedor tenía en pantalla, así el snapshot no altera lo que
   está viendo mientras sigue trabajando.
   También renderiza una vez con un color de fondo sólido (el canvas normalmente es transparente,
   alpha:true, así que sin esto la imagen saldría con fondo transparente/negro al insertarla en
   una página blanca), y recorta el resultado en un canvas 2D auxiliar al aspect ratio deseado
   (estilo "cover", igual que un background-size:cover en CSS) para que se vea como un banner
   prolijo sin deformar la escena. Todo esto es síncrono (drawImage de un canvas WebGL a un canvas
   2D no requiere esperar a que cargue ninguna imagen), así downloadPDF() no necesita volverse
   async. */
function captureHeroSnapshot(targetAspect){
  // --- Guardar el estado de cámara actual del vendedor, para restaurarlo al final ---
  const prevAngleX = camAngleX, prevAngleY = camAngleY, prevZoom = camera.zoom;
  const prevTarget = camTarget.clone(); // v10: si el vendedor paneó la vista, el snapshot no debe heredar ese desplazamiento
  const prevColor = renderer.getClearColor(new THREE.Color());
  const prevAlpha = renderer.getClearAlpha();

  // --- Vista isométrica aérea por defecto + auto-zoom para encuadrar todo lo colocado ---
  camAngleX = DEFAULT_CAM_ANGLE_X;
  camAngleY = DEFAULT_CAM_ANGLE_Y;
  camTarget.set(0,0,0);
  updateCameraFromAngles();
  const aspect = renderer.domElement.width / renderer.domElement.height;
  const fitZoom = fitZoomToBox(computeSceneBoundingBox(), aspect);
  camera.zoom = fitZoom;
  camera.updateProjectionMatrix();

  renderer.setClearColor(0x0a0e14, 1);
  renderer.render(scene, camera);

  const src = renderer.domElement;
  const sw = src.width, sh = src.height;
  const srcAspect = sw / sh;
  let cropW = sw, cropH = sh, sx = 0, sy = 0;
  if(srcAspect > targetAspect){
    cropW = sh * targetAspect; sx = (sw - cropW) / 2;
  } else {
    cropH = sw / targetAspect; sy = (sh - cropH) / 2;
  }
  const outW = 1600, outH = Math.round(outW / targetAspect);
  const out = document.createElement('canvas');
  out.width = outW; out.height = outH;
  const ctx = out.getContext('2d');
  ctx.drawImage(src, sx, sy, cropW, cropH, 0, 0, outW, outH);

  // --- Nombres de Sede/Matriz/Datacenter: ahora son divs HTML fuera del canvas WebGL (ver §3,
  // sistema de etiquetas), así que drawImage de arriba no los incluye. Se dibujan acá aparte,
  // proyectando el mismo punto de anclaje 3D de cada etiqueta con la cámara ya encuadrada, y
  // mapeando esa posición del espacio del canvas fuente (sw×sh) al recorte/escala del canvas de
  // salida (mismo sx/sy/cropW/cropH usados arriba para la imagen). */
  ctx.font = '700 24px Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#e6edf3';
  ctx.shadowColor = 'rgba(0,0,0,.85)';
  ctx.shadowBlur = 6;
  nameLabels.forEach(entry=>{
    getLabelScreenNDC(entry, tmpLabelVec);
    if(tmpLabelVec.z < -1 || tmpLabelVec.z > 1) return;
    const px = (tmpLabelVec.x*0.5+0.5) * sw;
    const py = (-tmpLabelVec.y*0.5+0.5) * sh;
    const outX = (px - sx) * (outW/cropW);
    const outY = (py - sy) * (outH/cropH);
    ctx.fillText(entry.el.textContent, outX, outY);
  });
  ctx.shadowBlur = 0;

  const dataUrl = out.toDataURL('image/jpeg', 0.9);

  // --- Restaurar exactamente la vista que tenía el vendedor antes de generar el PDF ---
  camAngleX = prevAngleX; camAngleY = prevAngleY;
  camTarget.copy(prevTarget);
  updateCameraFromAngles();
  camera.zoom = prevZoom;
  camera.updateProjectionMatrix();
  renderer.setClearColor(prevColor, prevAlpha);
  renderer.render(scene, camera);
  return dataUrl;
}

/* Exportación a PDF: reconstruye el mismo contenido del reporte en pantalla (Matriz, Datacenter,
   cada Sede con sus productos propios/heredados) usando jsPDF, con salto de página automático.
   Empieza con un header/hero: snapshot de la infraestructura 3D tal como quedó armada. */
function downloadPDF(){
  const config = buildConfiguracionCliente();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:'pt', format:'a4' });
  const marginX = 44;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxWidth = pageW - marginX*2;
  let y = 54;

  function ensureSpace(h){
    if(y + h > pageH - 40){ doc.addPage(); y = 54; }
  }
  function addTitle(text){
    ensureSpace(26);
    doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.setTextColor(20,24,30);
    doc.text(text, marginX, y); y += 20;
  }
  function addSubtitle(text){
    ensureSpace(18);
    doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(120,128,140);
    doc.text(text, marginX, y); y += 24;
  }
  function addSectionHeading(text){
    ensureSpace(26);
    doc.setDrawColor(215,220,228);
    doc.line(marginX, y, pageW-marginX, y);
    y += 16;
    doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(20,24,30);
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach(line=>{ ensureSpace(14); doc.text(line, marginX, y); y += 14; });
    y += 4;
  }
  function addLine(text, opts={}){
    const { bold=false, italic=false, size=9.5, color=[70,78,90], indent=10 } = opts;
    doc.setFont('helvetica', bold ? 'bold' : (italic ? 'italic' : 'normal'));
    doc.setFontSize(size);
    doc.setTextColor(color[0],color[1],color[2]);
    const lines = doc.splitTextToSize(text, maxWidth-indent);
    lines.forEach(line=>{
      ensureSpace(size+4);
      doc.text(line, marginX+indent, y);
      y += size+4;
    });
  }
  function addEmpty(text){
    addLine(text, { italic:true, size:9.5, color:[140,148,158] });
    y += 4;
  }
  function addProduct(inst, heredadoDe){
    const sub = getSubproducto(inst.subproductoId);
    const producto = getProducto(sub.productoNivel2Id);
    const vertical = getVertical(inst.verticalId);
    // Igual que en el reporte en pantalla: Canal de Conexión/Cloud Interconnect ya no aparecen
    // en "Servicios asignados" del panel (viven en "Conexiones"), pero acá en el PDF sí se
    // siguen listando — así que necesitan el destino inline, o dos líneas de "Canal de Conexión"
    // serían indistinguibles entre sí.
    const conexionLigada = sub.ocultaEnServiciosAsignados
      ? state.conexiones.find(c=>c.instanciaId===inst.instanciaId && !c.esBackup) : null;
    let destinoTxt = conexionLigada ? `  →  ${nombreEntidad(otroExtremo(conexionLigada, conexionLigada.ownerId))}` : '';
    if(!destinoTxt && sub.id==='sdwan' && inst.targetConexionId){
      const t = state.conexiones.find(c=>c.id===inst.targetConexionId);
      if(t) destinoTxt = `  →  ${nombreEntidad(t.aId)} ↔ ${nombreEntidad(t.bId)}`;
    }
    addLine(`${inst.nombreSubproducto}${destinoTxt}${heredadoDe ? ' (heredado de '+heredadoDe+')' : ''}  —  ${vertical.nombre} · ${producto.nombre}`,
      { bold:true, size:10.5, color:[20,24,30] });
    addLine(inst.marca ? `Marca: ${inst.marca}` : 'Marca: —', { size:9, color:[130,138,150] });
    const props = Object.entries(inst.propiedades||{}).filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`).join('   ·   ');
    if(props) addLine(props, { size:9, color:[90,98,110] });
    if(inst.notas) addLine(`"${inst.notas}"`, { italic:true, size:9, color:[140,148,158] });
    y += 6;

    // Backup (v9 §2): línea propia en el PDF, con su propio destino.
    const backupConexion = state.conexiones.find(c=>c.instanciaId===inst.instanciaId && c.esBackup);
    if(backupConexion){
      const backupDestinoTxt = `  →  ${nombreEntidad(otroExtremo(backupConexion, backupConexion.ownerId))}`;
      addLine(`${inst.nombreSubproducto} (Backup)${backupDestinoTxt}  —  ${vertical.nombre} · ${producto.nombre}`,
        { bold:true, size:10.5, color:[20,24,30] });
      addLine(`Enlace de respaldo en paralelo — misma contratación que ${inst.nombreSubproducto}.`, { size:9, color:[130,138,150] });
      y += 6;
    }
  }

  // --- Header/Hero: snapshot de la infraestructura 3D tal como la dejó el cliente ---
  const HERO_ASPECT = 900/320;
  const heroW = pageW;
  const heroH = heroW / HERO_ASPECT;
  const heroDataUrl = captureHeroSnapshot(HERO_ASPECT);
  doc.addImage(heroDataUrl, 'JPEG', 0, 0, heroW, heroH);

  // Logo del cliente (opcional, §9 punto 7): esquina superior izquierda del hero, sobre un fondo
  // blanco redondeado para que se lea bien encima de la escena 3D oscura.
  if(config.clienteLogo){
    const logoSize = 40, logoX = 14, logoY = 12;
    const fmtMatch = config.clienteLogo.match(/^data:image\/(\w+);/);
    let logoFormat = fmtMatch ? fmtMatch[1].toUpperCase() : 'PNG';
    if(logoFormat==='JPG') logoFormat = 'JPEG';
    doc.setFillColor(255,255,255);
    doc.roundedRect(logoX-5, logoY-5, logoSize+10, logoSize+10, 4, 4, 'F');
    try{ doc.addImage(config.clienteLogo, logoFormat, logoX, logoY, logoSize, logoSize); }
    catch(err){ /* si el formato no es soportado por jsPDF, se omite el logo sin romper el PDF */ }
  }

  // Franja inferior sobre el hero con los datos clave, para que quede legible sobre la escena 3D.
  const stripH = 34;
  doc.setFillColor(10, 14, 20);
  doc.rect(0, heroH - stripH, heroW, stripH, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(230,235,240);
  doc.text(config.nombreCliente || 'Cliente', marginX, heroH - stripH/2 - 3);
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(150,200,215);
  doc.text(`${config.sedes.length} sede(s) · generado ${new Date(config.generadoEn).toLocaleString('es-EC')}`,
    marginX, heroH - stripH/2 + 10);
  doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(120,230,250);
  doc.text('PUNTONET', heroW - marginX, heroH - stripH/2 + 3, { align:'right' });

  y = heroH + 26;

  addTitle('Configurador de Infraestructura · Puntonet');
  addSubtitle(`${config.nombreCliente} · ${config.sedes.length} sede(s) · ${config.matrices.length} matriz(ces) · generado ${new Date(config.generadoEn).toLocaleString('es-EC')}`);

  // --- Salud de infraestructura: score global (y, si se completó, el "antes" del cliente) más
  // una barra de progreso por vertical, para respaldar la conversación de "tenías X, con
  // Puntonet llegas a Y" que pidió el cliente. ---
  const antesTxt = (state.saludInicial===null || state.saludInicial===undefined) ? ''
    : `  ·  Estado inicial del cliente: ${state.saludInicial}%`;
  addSectionHeading(`Salud de infraestructura — ${config.salud.actual}%${antesTxt}`);
  config.salud.porVertical.forEach(v=>{
    ensureSpace(20);
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(70,78,90);
    doc.text(v.vertical, marginX+10, y);
    doc.text(`${v.asignados}/${v.total} · ${v.pct}%`, pageW-marginX, y, { align:'right' });
    y += 6;
    const barX = marginX+10, barW = maxWidth-20, barH = 5;
    doc.setFillColor(228,232,238);
    doc.roundedRect(barX, y, barW, barH, 2, 2, 'F');
    doc.setFillColor(34,211,238);
    if(v.pct>0) doc.roundedRect(barX, y, Math.max(barH, barW*(v.pct/100)), barH, 2, 2, 'F');
    y += barH + 10;
  });

  if(config.matrices.length===0){
    addSectionHeading('Matrices');
    addEmpty('Aún no se ha agregado ninguna Matriz al canvas.');
  } else {
    config.matrices.forEach(matriz=>{
      addSectionHeading(`${matriz.nombre}  ·  ${matriz.usuarios||0} usuarios  ·  ${matriz.instancias.length} producto(s) propio(s)  ·  ${conexionesTexto(matriz.id)}`);
      if(matriz.instancias.length===0) addEmpty('Sin productos propios asignados.');
      else matriz.instancias.forEach(inst=>addProduct(inst, null));
    });
  }

  if(config.nubes.length>0){
    config.nubes.forEach(nube=>{
      addSectionHeading(`${nube.nombre}  ·  ${nube.esAutoInternet ? 'Nube automática de Internet' : 'Nube'}  ·  ${nube.instancias.length} producto(s) propio(s)  ·  ${conexionesTexto(nube.id)}`);
      if(nube.instancias.length===0) addEmpty('Sin productos propios asignados.');
      else nube.instancias.forEach(inst=>addProduct(inst, null));
    });
  }

  addSectionHeading(`${config.datacenter.nombre}  ·  ${config.datacenter.instancias.length} producto(s) propio(s)  ·  ${conexionesTexto('datacenter')}`);
  if(config.datacenter.instancias.length===0) addEmpty('Sin productos propios asignados.');
  else config.datacenter.instancias.forEach(inst=>addProduct(inst, null));

  if(config.sedes.length===0){
    addSectionHeading('Sedes');
    addEmpty('Aún no se han agregado sedes al canvas.');
  } else {
    config.sedes.forEach(sede=>{
      const tamanoInfo = getTamanoLocal(sede.tamano);
      addSectionHeading(`${sede.nombre}  ·  ${sede.empleados} empleados · ${tamanoInfo.nombre}  ·  ${conexionesTexto(sede.id)}`);
      const heredadas = heredadasConNombreMatriz(sede, config.matrices);
      if(sede.instancias.length===0 && heredadas.length===0){
        addEmpty('Sin servicios asignados.');
      } else {
        sede.instancias.forEach(inst=>addProduct(inst, null));
        heredadas.forEach(h=>addProduct(h.inst, h.matrizNombre));
      }
    });
  }

  const fecha = new Date().toISOString().slice(0,10);
  doc.save(`configuracion-${safeFileName(config.nombreCliente)}-${fecha}.pdf`);
}
byId('btnExportPDF').addEventListener('click', downloadPDF);

/* =========================================================================
   10. ESTADO INICIAL (arranca casi vacío: el usuario agrega todo lo demás)
   ========================================================================= */
(function seed(){
  // Único punto de partida: el Datacenter Epicentro, solo, en su posición fija, con el punto
  // decorativo del centro de la grilla. Ninguna Matriz existe por defecto — pueden ser varias,
  // y cada una se agrega arrastrándola desde el panel izquierdo, igual que una sede. Ni sedes, ni
  // productos, ni conexiones — todo lo construye el usuario desde cero.
  rebuildConnections();
  renderRightPanel();
})();