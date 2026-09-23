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
  // Campo `destinosConexion` (solo junto a conexion:'entreSedes'): a qué TIPOS de entidad apunta
  // el dropdown "Conectar a" — lista con cualquier combinación de 'sede'|'matriz'|'nube'|
  // 'datacenter'. Por defecto (sin campo) son Sedes/Matrices; Cloud Interconnect usa ['nube'] y
  // Canal de Conexión ['sede','matriz','datacenter'] — ver candidatosConexionEntreSedes.
  // Ojo: es independiente de `destinos` (sobre qué nodo se puede SOLTAR el chip). Uno responde
  // "¿de quién sale el servicio?" y el otro "¿a quién puede llegar el cable?".
  // Campo `permiteBackup`: habilita el checkbox "Backup" en el popup (v9 §2) — genera un segundo
  // enlace en paralelo hacia el mismo destino, ligado a la misma instancia (ver syncBackupConexion).
  // Campo `sumaConcentrador` (sep/2026, pedido cliente 03/09): el ancho de banda de este enlace
  // suma al Concentrador de la entidad a la que llega (hoy solo se muestra en la Matriz, ver
  // concentradorDe/renderConcentradorField). Es un dato CALCULADO, no un producto que se arrastre:
  // "3 canales de 100 megas → concentrador de 300 megas". Los enlaces de Backup NO suman: heredan
  // el ancho de banda de su canal principal, no lo duplican.
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
    // ago/2026 (pedido cliente 28/08): el Datacenter Epicentro entra por los dos lados —
    // `destinos` lo suma como nodo sobre el que se puede SOLTAR el producto, y `destinosConexion`
    // lo suma a la lista del dropdown "Conectar a" (antes solo Sedes/Matrices), de modo que un
    // canal Sede↔Datacenter se pueda contratar como producto y no solo tendiendo el cable a mano
    // desde el puerto.
    destinos:['sede','matriz','datacenter'], destinosConexion:['sede','matriz','datacenter'],
    ocultaEnServiciosAsignados:true, permiteBackup:true, sumaConcentrador:true },
  // Cloud Interconnect (v9 §4): el dropdown "Conectar a" ya no lista Sedes/Matrices — lista
  // Nubes (entidad `nube`, ver createNube/candidatosConexionEntreSedes). Sigue siendo
  // `conexion:'entreSedes'` (así reutiliza el mismo dropdown genérico y el mismo flujo de
  // "+ Agregar nueva ..."), pero con `destinosConexion:['nube']` para que
  // renderPopupConexionOptions y candidatosConexionEntreSedes sepan de qué lista de candidatos
  // tomar. ago/2026 (pedido cliente 28/08): "solo se puede conectar a Azure, no al internet" —
  // la Nube automática de Internet (`esAutoInternet`) queda EXCLUIDA de esos candidatos; el
  // destino válido es siempre una nube de proveedor (Azure/AWS/GCP), ver
  // candidatosConexionEntreSedes.
  { id:'cloud_interconnect', productoNivel2Id:'datos', nombre:'Cloud Interconnect',
    eslogan:'¡El camino más directo y seguro hacia tu nube!',
    descripcion:'Enlace de comunicación entre la ubicación del cliente y una nube.',
    parametros:['Ancho de banda'], conexion:'entreSedes', destinosConexion:['nube'],
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
    // ago/2026 (pedido cliente 28/08): "podrías contratar un canal dedicado, tuyo, del datacenter
    // al internet" — el Datacenter Epicentro pasa a ser un nodo válido para este producto. Al
    // asignarlo ahí, `conexion:'internetAuto'` genera el cable Datacenter → Nube de Internet
    // igual que desde una sede (ver ensureConexionAutomatica).
    destinos:['sede','matriz','datacenter'],
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
  // ago/2026 (pedido cliente 28/08): "Firewall, también datacenter, on premise e IaaS, ambos" —
  // los dos suman el Datacenter Epicentro a sus destinos (el equipo físico se instala en el rack
  // del cliente dentro del DC; el virtual protege el perímetro de lo que el cliente tenga ahí).
  { id:'firewall_on_premise', productoNivel2Id:'perimetral', nombre:'Firewall On Premise',
    eslogan:'¡Tu primera línea de defensa, instalada en casa!',
    descripcion:'Hardware físico para protección perimetral.',
    parametros:['Marca','Modelo de equipo'], assetKey:'firewall_onpremise',
    destinos:['sede','matriz','datacenter'] },
  { id:'firewall_iaas', productoNivel2Id:'perimetral', nombre:'Firewall IaaS',
    eslogan:'¡La misma protección, sin cables ni hardware!',
    descripcion:'Hardware virtual para protección perimetral.',
    parametros:['Marca','Modelo de equipo'],
    destinos:['sede','matriz','datacenter'] },
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
  // además de sede/Matriz (comportamiento previo). Es el único de Aplicación que llega a 'nube'.
  { id:'waf', productoNivel2Id:'aplicacion', nombre:'WAF',
    eslogan:'¡Tu sitio web, a prueba de ataques 24/7!',
    descripcion:'Protege aplicaciones web, sitios de comercio electrónico y portales al filtrar y bloquear ataques.',
    parametros:['Ancho de banda','Tipo de licencia'],
    parametrosTipos:{ 'Ancho de banda':'anchoBanda' },
    destinos:['sede','matriz','datacenter','nube'] },
  // DNS/DDoS (ago/2026, pedido cliente 28/08): "DDoS también se puede añadir a datacenter". Suma
  // el Datacenter a sus destinos. Queda SIN 'nube' a propósito: WAF sí la tiene, así que los dos
  // productos de Aplicación ya no tienen el mismo alcance (el comentario de WAF que decía "igual
  // alcance que DNS/DDoS" quedó viejo) — está en la lista de puntos a confirmar.
  { id:'dns_ddos', productoNivel2Id:'aplicacion', nombre:'DNS/DDoS',
    eslogan:'¡Que ningún ataque tumbe tu operación en línea!',
    descripcion:'Solución en la nube que protege el acceso a internet y los servicios DNS, filtrando tráfico malicioso.',
    parametros:['Ancho de banda','Número de licencias'],
    parametrosTipos:{ 'Ancho de banda':'anchoBanda' },
    destinos:['sede','matriz','datacenter'] },
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
     fillMesh(geo)           -> el relleno oscuro estandar de los volumenes "edificio" (opaco, T02)
     colorOpaco(color, a)    -> el color que tendría `color` con opacidad `a` sobre ese relleno
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
/* T02: las entidades son opacas, también en las primitivas de respaldo. Antes el relleno iba al
   55 % y se veía la grilla, los cables y las otras entidades a través del edificio. */
function fillMesh(geometry){
  return solid(geometry, { color:FILL_COLOR });
}
/* T02: las aristas y detalles de las primitivas que antes iban translúcidos pasan a opacos con el
   color que efectivamente se veía: la mezcla de su color con el relleno oscuro, en la proporción
   de la opacidad vieja. Se conserva el tono sin dejar ver nada detrás. */
function colorOpaco(color, opacidad){
  const a = new THREE.Color(FILL_COLOR), b = new THREE.Color(color);
  return a.lerp(b, opacidad).getHex();
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

/* T01 — Punto de conexión en el techo, al centro.
   Hasta v48 el puerto (+) vivía a un costado de cada entidad (+X, o +Z en el Datacenter), con
   offsets fijos distintos por tipo. Si el otro extremo quedaba del lado opuesto, el cable nacía
   de una pared y atravesaba el propio edificio. Ahora las cuatro entidades lo ponen en el mismo
   lugar: centrado en X/Z y apenas por encima del techo, calculado con la caja real del modelo
   (`userData.dims`, que el builder llena igual con .glb o con primitiva). Como el puerto es hijo
   del group, reconstruir la sede al cambiar los empleados lo recoloca solo.
   PUERTO_SOBRE_TECHO deja el sprite (0.46 de lado) entero por encima de la cubierta. */
const PUERTO_SOBRE_TECHO = 0.3;
function colocarPuertoEnTecho(port, dims){
  port.position.set(0, dims.h + PUERTO_SOBRE_TECHO, 0);
}

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

/* =========================================================================
   3A-ter. PIPELINE DE COLOR (v2 §7.2, la pieza que faltaba)
   -------------------------------------------------------------------------
   Hasta v42 el renderer quedaba en los defaults de r128: `outputEncoding =
   LinearEncoding` y `toneMapping = NoToneMapping`. Con MeshBasicMaterial daba igual, pero desde
   que las entidades y los íconos son MeshStandardMaterial (§3B/§3D) eso anulaba medio trabajo del
   environment map: los medios tonos salían aplastados —la escena se veía "plana" por más que el
   metal fuera correcto— y el emisivo saturaba a blanco de golpe en vez de hacer roll-off, así que
   el neón se leía como línea de color plano y nunca como núcleo caliente.

   Son dos líneas, pero cambian TODOS los colores de la escena a la vez. Lo que sigue en esta
   sección es la compensación, y conviene entenderla como una sola pieza:

   a) `sRGBEncoding` aplica la curva de gamma a la salida. r128 no tiene ColorManagement (llegó en
      r152), así que los hex se usan tal cual, en lineal: sin compensar, CADA color de la escena
      sale bastante más claro que como fue elegido.
   b) Los colores de superficie (albedo de entidades e íconos, emisivos) SÍ deben convertirse de
      sRGB a lineal: fueron elegidos a ojo en sRGB y en un pipeline PBR el albedo va en lineal.
      Esa conversión es, además, buena parte de la "recalibración de paleta" pendiente de
      v2 §7.2 punto 10 — no toda, pero sí la mitad mecánica.
   c) Los materiales SIN iluminación (cables, halos, partículas, badges, grilla, piso, sprites de
      puerto) son INTERFAZ, no superficie física: fueron afinados a ojo contra el degradado CSS
      de #canvasWrap y tienen que seguir viéndose exactamente igual. Para eso van con
      `toneMapped:false` (no los toca la curva filmica) y con su color convertido a lineal, de
      modo que la conversión de salida los devuelva al valor original: sRGB→lineal→sRGB = identidad.
      Lo hace normalizarMaterialesUI(), abajo.
   ========================================================================= */
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.75;

/* Marca un material como "interfaz": fuera de la curva filmica y con el color pre-convertido para
   que sobreviva intacto a outputEncoding. Idempotente vía userData.pnUI — importa porque
   convertSRGBToLinear() es destructivo y aplicarlo dos veces apaga el color. */
function normalizarMaterialUI(material){
  if(!material || material.userData.pnUI) return;
  material.userData.pnUI = true;
  material.toneMapped = false;
  if(material.color) material.color.convertSRGBToLinear();
  material.needsUpdate = true; // toneMapped entra en la clave del programa: sin esto no recompila
}

/* Color de un material de interfaz que cambia en runtime: hay que reconvertir, porque .set()
   escribe el hex crudo y pisa la conversión que hizo normalizarMaterialUI(). */
function setColorUI(material, hex){
  material.color.set(hex).convertSRGBToLinear();
}

/* Barrido de seguridad: recorre la escena y normaliza todo material sin iluminación que todavía
   no haya pasado por acá. Va colgado del traverse que animate() ya hace cada frame (§4), así que
   no agrega un recorrido nuevo, y gracias al guard de userData cada material se toca UNA vez y
   después es un if que falla. Se hace por barrido y no en cada `new MeshBasicMaterial(...)` a
   propósito: son ~20 puntos de creación repartidos por el archivo y un material nuevo que se
   olvide de la llamada saldría oscurecido sin ningún aviso. */
function normalizarMaterialesUI(objeto){
  const m = objeto.material;
  if(!m) return;
  const lista = Array.isArray(m) ? m : [m];
  lista.forEach(mat=>{
    if(mat.isMeshBasicMaterial || mat.isLineBasicMaterial || mat.isSpriteMaterial || mat.isPointsMaterial){
      normalizarMaterialUI(mat);
    }
  });
}

/* Luces: con env map real (§3B) un ambiente fuerte es contraproducente — le mete luz plana a
   todas las caras por igual y borra justo el contraste que genera el IBL. Venían de la época de
   MeshBasicMaterial, cuando efectivamente no hacían nada (de ahí la nota de v2 §7.2 punto 6) y
   nadie las volvió a mirar después de migrar a Standard, donde sí pesan. El ambiente baja a un
   relleno mínimo que solo evita que las caras en sombra se cierren a negro puro, y la direccional
   sube un poco para marcar de dónde viene la luz. */
scene.add(new THREE.AmbientLight(0xffffff, .14));
const dirLight = new THREE.DirectionalLight(0xffffff, .85);
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
  nameLabels.forEach((entry, id)=>{
    // EntityLabel del design system: borde cian más marcado en la entidad seleccionada.
    entry.el.classList.toggle('is-selected', state.selectedSedeIds.includes(id));
    getLabelScreenNDC(entry, tmpLabelVec);
    if(tmpLabelVec.z < -1 || tmpLabelVec.z > 1){ entry.el.style.display = 'none'; return; }
    entry.el.style.display = '';
    entry.el.style.left = ((tmpLabelVec.x*0.5+0.5) * w) + 'px';
    entry.el.style.top = ((-tmpLabelVec.y*0.5+0.5) * h) + 'px';
  });
}

const grid = new THREE.GridHelper(80, 20, 0x1f2733, 0x161c26);
/* GridHelper no pasa por normalizarMaterialesUI(): r128 ya le pone toneMapped:false, pero sus dos
   tonos no viven en material.color sino horneados en el atributo `color` de la geometría
   (vertexColors:true), así que la conversión de §3A-ter no los alcanza y la grilla salía bastante
   más clara de lo elegido. Se convierten a mano, una sola vez. */
(()=>{
  const attr = grid.geometry.getAttribute('color');
  const c = new THREE.Color();
  for(let i=0;i<attr.count;i++){
    c.fromBufferAttribute(attr, i).convertSRGBToLinear();
    attr.setXYZ(i, c.r, c.g, c.b);
  }
  attr.needsUpdate = true;
})();
scene.add(grid);

/* =========================================================================
   3A-bis. PISO OSCURO CON REFLEJO FALSO (v2 §7.3 punto 13, pendiente desde v17)
   -------------------------------------------------------------------------
   Reflejo FALSO: copias espejadas (scale.y = -1) de cada entidad, translúcidas y sincronizadas a
   mano cada frame — no un THREE.Reflector real (cámara espejada que renderiza la escena completa
   una segunda vez). Con la cámara ortográfica sin culling (§1) y hasta ~150 íconos en pantalla,
   Reflector es el paso más caro de la lista y queda deliberadamente fuera de esta tanda; esto es
   lo barato de la misma sección, para medir antes de subir de nivel.
   Solo se reflejan las ENTIDADES (sedes, matrices, nubes, datacenter — unas 20 como mucho), nunca
   los íconos de producto que orbitan alrededor: son esos ~150 los que harían caro el efecto, y
   quedan afuera clonando la entidad SIN su `assetsContainer` (§3E). */
const piso = new THREE.Mesh(
  new THREE.CircleGeometry(60, 48),
  new THREE.MeshBasicMaterial({ color:0x05070d, transparent:true, opacity:0.55, depthWrite:false })
);
piso.name = 'piso';
piso.rotation.x = -Math.PI/2;
piso.position.y = -0.02; // apenas debajo de la grilla, evita z-fighting con sus líneas
piso.raycast = function(){}; // decorativo: no debe interceptar los clicks/arrastres que hoy resuelven contra un plano matemático (§4)
scene.add(piso);

/* T02: el reflejo deja de ser translúcido. Antes era el edificio al 18 % de opacidad, y como la
   grilla y el fondo se veían a través, se leía como un edificio de vidrio que seguía bajo el piso.
   Ahora es opaco y se atenúa bajando su luz: `intensidad` escala el color, el reflejo del entorno y
   el emisivo de la copia. */
const PISO_REFLEJO = { activo:true, intensidad:0.18 };
const reflejosPiso = new THREE.Group();
reflejosPiso.name = 'reflejosPiso';
scene.add(reflejosPiso);
const reflejosPorEntidad = new Map(); // entityId -> { espejo, origen: entity.group de cuando se creó el reflejo }

function disposeReflejo(espejo){
  espejo.traverse(o=>{ if(o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m=>m.dispose()); });
}

/* Fuerza a actualizarReflejosPiso() a reconstruir TODOS los reflejos desde cero en el próximo
   frame. Hace falta porque no todas las entidades reemplazan su `.group` al pasar de primitiva a
   modelo real — el Datacenter reconstruye sus hijos sobre el mismo objeto (ver construirDatacenter
   y su llamador aplicarModelosAEscena, §5/§6) — así que el chequeo por identidad de objeto no
   detecta ese caso por sí solo. Barato: son ~20 entidades como mucho, y solo pasa una vez por
   tanda de modelos cargada, no en cada frame. */
function invalidarReflejosPiso(){
  reflejosPorEntidad.forEach(entry=>{ reflejosPiso.remove(entry.espejo); disposeReflejo(entry.espejo); });
  reflejosPorEntidad.clear();
}

/* Copia espejada de UNA entidad: solo su cuerpo real, los meshes con material 'pn_<look>_base' o
   'pn_<look>_glow' que arma ModelLibrary (§3B) — halos, hitboxes, puertos y sprites quedan afuera
   (se ocultan, no se borran, para no desincronizar el clon de su origen). */
function atenuarMaterialReflejo(m, k){
  m.transparent = false;
  m.opacity = 1;
  m.depthWrite = true;
  if(m.color) m.color.multiplyScalar(k);
  if(m.envMapIntensity !== undefined) m.envMapIntensity *= k;
  if(m.emissiveIntensity !== undefined) m.emissiveIntensity *= k;
}
function crearReflejoDeEntidad(entity){
  const espejo = entity.group.clone(true);
  const assetsContainer = espejo.getObjectByName('assetsContainer');
  if(assetsContainer) espejo.remove(assetsContainer);
  espejo.traverse(o=>{
    if(o.isSprite){ o.visible = false; return; }
    if(!o.isMesh) return;
    const nombreMat = (o.material && o.material.name) || '';
    if(nombreMat.indexOf('pn_') !== 0){ o.visible = false; return; } // halo, hitbox, primitivas de fallback, etc. — no son el cuerpo del modelo
    o.raycast = function(){}; // nunca intercepta clicks ni arrastre: es un reflejo, no un objeto
    o.layers.disable(CAPA_BRILLO); // fuera del paso de brillo — si no, el cuerpo completo "brillaría" en el reflejo (ver Brillo.renderizarFuente, §3C)
    o.material = o.material.clone();
    atenuarMaterialReflejo(o.material, PISO_REFLEJO.intensidad);
    o.material.side = THREE.DoubleSide; // el flip en Y invierte el sentido de las caras; sin esto se ve hueco
  });
  espejo.renderOrder = -1; // se dibuja antes que la escena real, nunca la tapa
  return espejo;
}

/* Sincroniza reflejosPiso contra el estado real, cuadro a cuadro (llamada desde animate(), §4).
   Deliberadamente NO se engancha a createSede/deleteSede/createMatriz/etc.: lee
   todasLasEntidades() —la misma fuente de verdad que ya usa el resto del código— y arma, mueve o
   borra reflejos por diferencia contra el frame anterior. Así arrastrar una sede, cambiarle el
   tier, eliminarla o cargar un proyecto guardado quedan cubiertos sin tocar esos flujos uno por
   uno ni arriesgarse a que alguno quede sin su reflejo actualizado. */
function actualizarReflejosPiso(){
  if(!PISO_REFLEJO.activo){ reflejosPiso.visible = false; return; }
  reflejosPiso.visible = true;
  const activos = new Set();
  todasLasEntidades().forEach(entity=>{
    if(!entity || !entity.group || entity.group.visible === false) return;
    activos.add(entity.id);
    let entry = reflejosPorEntidad.get(entity.id);
    if(entry && entry.origen !== entity.group){
      reflejosPiso.remove(entry.espejo);
      disposeReflejo(entry.espejo);
      entry = null;
    }
    if(!entry){
      entry = { espejo: crearReflejoDeEntidad(entity), origen: entity.group };
      reflejosPorEntidad.set(entity.id, entry);
      reflejosPiso.add(entry.espejo);
    }
    const g = entity.group;
    entry.espejo.position.set(g.position.x, g.position.y, g.position.z);
    entry.espejo.quaternion.copy(g.quaternion);
    entry.espejo.scale.set(g.scale.x, -g.scale.y, g.scale.z);
  });
  reflejosPorEntidad.forEach((entry, id)=>{
    if(activos.has(id)) return;
    reflejosPiso.remove(entry.espejo);
    disposeReflejo(entry.espejo);
    reflejosPorEntidad.delete(id);
  });
}

/* =========================================================================
   3B. MODELOS 3D (.glb) — v16 (reemplazo de las primitivas de las entidades)
   -------------------------------------------------------------------------
   Primera tanda del proveedor: las 6 ENTIDADES (3 Sedes, Matriz, Nube, Datacenter). Los íconos
   de producto (AssetRegistry) siguen siendo primitivas hasta que llegue su tanda.

   Qué resuelve este bloque:
   - Carga cada .glb UNA sola vez (ModelLibrary.precargar) y entrega clones que COMPARTEN la
     geometría (ModelLibrary.instanciar). 20 sedes medianas = 1 buffer en la GPU, no 20.
   - Reemplaza los materiales del proveedor por materiales propios, COMPARTIDOS por tipo de
     entidad (MODELO_LOOKS). El color lo decide el código, no el archivo: el proveedor entregó
     un metal azul marino y un emisivo azul (no el blanco de la especificación v2 §6.5), pero como
     cada modelo trae exactamente 2 slots bien separados, se mapean por NOMBRE de material y el
     efecto es el mismo que con el blanco. Se aceptan los 2 juegos de nombres: 'metal'/'emissive'
     (esta entrega) y 'mat_base'/'mat_glow' (la especificación), así una entrega corregida no
     obliga a tocar código.
   - Si un .glb no carga (archivo faltante, GLTFLoader ausente, error de parseo), esa entidad
     sigue dibujándose con su primitiva de siempre: el fallback es el código que ya existía.

   De dónde salen los bytes (resuelve el caso "abrir index.html con doble clic"):
   1. window.PN_MODELOS_GLB — js/modelos-glb.js, los mismos .glb embebidos en base64. Funciona
      con file://, con servidor y dentro del empaquetado de la app. Se regenera con
      `node tools/empaquetar-modelos.js` cada vez que cambia un .glb de assets/glb/.
   2. Si ese archivo no está, fetch('assets/glb/<archivo>.glb') — requiere servidor (http://).

   Escala (v47): el proveedor modeló todas las entidades más chicas que la envolvente de §2 (ver
   doc v16). Hasta v46 una sola escala global las agrandaba a TODAS por igual, conservando la
   proporción entre ellas que diseñó el proveedor. Ya no alcanza: el cliente pidió tamaños
   concretos por entidad (Datacenter de dos celdas de ancho, Matriz por encima de la Sede Grande,
   sedes al doble), y esas proporciones no son las del proveedor. Así que MODELOS_ESCALA queda
   como la escala de SEDES Y NUBE, y Matriz y Datacenter llevan su propia `escala`.

   Que los overrides sean NÚMEROS MÁS CHICOS que la global no es un error: cada uno multiplica su
   propio modelo, y los modelos parten de tamaños muy distintos (el Datacenter mide 2.9 de ancho
   sin escalar; la Sede Grande, 1.2). Lo que importa es el ancho resultante:

     Sede Pequeña 3.04 · Sede Mediana 3.80 · Nube 3.42 · Sede Grande 4.56 · Matriz 5.60 ·
     Datacenter 8.00 (= 2 celdas exactas de GRID_SPACING)

   Con estos tamaños varias entidades son MÁS ANCHAS que su celda, así que la grilla ya no puede
   razonar por celda suelta: `occupied()` compara huellas reales (ver §4). Es lo que permite subir
   los tamaños sin tocar GRID_SPACING, que sigue en 4.

   El layout (halo, hitbox, puerto, colocación de íconos, etiqueta) se calcula a partir de las
   medidas reales del modelo ya escalado (userData.dims), no de números fijos.
   ========================================================================= */
const MODELOS_ESCALA = 3.8;

// clave interna -> archivo (sin .glb) + familia de materiales (+ `escala` opcional, pisa a
// MODELOS_ESCALA). Las claves de sede usan los mismos ids que TAMANOS_LOCAL ('pequeno' |
// 'mediano' | 'grande').
const MODELOS = {
  sede_pequeno: { archivo:'pn_ent_sede_pequena', look:'sede' },
  sede_mediano: { archivo:'pn_ent_sede_mediana', look:'sede' },
  sede_grande:  { archivo:'pn_ent_sede_grande',  look:'sede' },
  matriz:       { archivo:'pn_ent_matriz',       look:'matriz',     escala:2.80 }, // 2.0 × 2.80 = 5.60
  nube:         { archivo:'pn_ent_nube',         look:'nube' },
  datacenter:   { archivo:'pn_ent_datacenter',   look:'datacenter', escala:2.76 }, // 2.9 × 2.76 = 8.00
};
const MODELOS_RUTA = 'assets/glb/';

/* Paleta de las entidades en la escena 3D. No vive en css/styles.css porque no es estilo del DOM:
   son parámetros de materiales WebGL, igual que los colores del catálogo (§1). Se conserva el
   acento de cada entidad en v39 (cian en Sede/Matriz/Datacenter, violeta en la Nube: "otra clase
   de nodo"). `glowIntensidad` > 1 queda preparado para el bloom de la fase de post-proceso. */
/* El cuerpo va oscuro a propósito: en la referencia aprobada las cajas son casi negras y TODO el
   azul que se les ve es reflejo del entorno, no color propio. El 0x7d95c0 de v42 era un azul
   grisáceo medio que competía con el reflejo y aplanaba la pieza — con el env map ya armado
   (crearEntornoMetal) el motor para el acabado estaba, y el color base lo estaba contradiciendo.
   Con `metalness` alto el albedo casi no aporta difuso: tiñe el reflejo, que es justo lo buscado. */
/* v48: el cliente pidió edificios en ALUMINIO SATINADO CLARO (referencias: plata fría con leve
   tinte azul, caras superiores casi blancas, laterales gris azulado que nunca llegan a negro, y el
   azul del fondo reflejado en las caras bajas). Reemplaza el cuerpo oscuro de v43-v47. El color
   base ahora es plata clara y el entorno que refleja es otro, propio de las entidades
   (ENTORNO_ENTIDADES, más abajo): uno neutro y luminoso arriba y azul abajo. `roughness` sube a
   satinado para que el reflejo sea suave y no un espejo. Los íconos de producto NO cambian. */
const MODELO_METAL = { color:0xd3dae6, metalness:0.85, roughness:0.34, envMapIntensity:0.45 };
/* glowIntensidad por encima de 1 es lo que el comentario de v39 dejaba anunciado y el pipeline de
   color (§3A-ter) recién ahora hace posible: bajo ACES un emisivo de 1.0 sale a ~0.8 y se lee como
   color plano. Hace falta entrar bien arriba de 1 para que el centro de la línea sature a blanco y
   la caída quede del color — que es exactamente cómo se lee el neón de la referencia. */
const MODELO_LOOKS = {
  sede:       { glow:0x22d3ee, glowIntensidad:1.6 },
  matriz:     { glow:0x22d3ee, glowIntensidad:1.6 },
  nube:       { glow:0xa78bfa, glowIntensidad:1.5 },
  datacenter: { glow:0x22d3ee, glowIntensidad:1.6 },
};
const NOMBRES_SLOT_BASE = ['metal', 'mat_base'];
const NOMBRES_SLOT_GLOW = ['emissive', 'mat_glow'];

/* Environment map propio para el metal, COMPARTIDO por entidades (ModelLibrary, acá abajo) e
   íconos de producto (IconLibrary, §3D) — ver obtenerEntornoMetal(). Sin él, un
   MeshStandardMaterial con metalness alto se ve negro (v2 §7.2 punto 7). Es una "sala" chica
   armada por código — cúpula con degradado azul marino, dos paneles claros que hacen de softbox,
   una tira de contraluz y un filo angosto y casi blanco que da el highlight nítido sobre los
   biseles — procesada una sola vez con PMREMGenerator. Si el renderer no puede generarlo (p. ej.
   en el smoke test), el metal queda sin reflejos pero la escena no se rompe. */
const ENTORNO_ICONOS = {
  arriba:0x3a5a8c, horizonte:0x101a2e, abajo:0x020409,
  cenital:[0x6f9bff, 3.2], lateral:[0x4a7dff, 1.8], contraluz:[0x5f8fff, 2.4], filo:[0xc3daff, 9.0],
};
const ENTORNO_ENTIDADES = {
  arriba:0xb3bdcc, horizonte:0x46536d, abajo:0x122a66,
  cenital:[0xf2f6ff, 1.8], lateral:[0xc4d3ee, 1.0], contraluz:[0x4d86ff, 2.0], filo:[0xffffff, 3.5],
};
function crearEntornoMetal(cfg){
  cfg = Object.assign({}, ENTORNO_ICONOS, cfg || {});
  try{
    const envScene = new THREE.Scene();
    const domoGeo = new THREE.SphereGeometry(10, 32, 16);
    const colores = [];
    const pos = domoGeo.attributes.position;
    const arriba = new THREE.Color(cfg.arriba), horizonte = new THREE.Color(cfg.horizonte), abajo = new THREE.Color(cfg.abajo);
    const c = new THREE.Color();
    for(let i=0;i<pos.count;i++){
      const y = pos.getY(i) / 10; // -1..1
      if(y >= 0) c.copy(horizonte).lerp(arriba, Math.pow(y, 0.7));
      else c.copy(horizonte).lerp(abajo, Math.min(1, -y*2.2));
      c.convertSRGBToLinear(); // la cúpula es el relleno ambiental del IBL: también va en lineal
      colores.push(c.r, c.g, c.b);
    }
    domoGeo.setAttribute('color', new THREE.Float32BufferAttribute(colores, 3));
    envScene.add(new THREE.Mesh(domoGeo, new THREE.MeshBasicMaterial({ vertexColors:true, side:THREE.BackSide })));
    // softboxes: uno cenital grande, uno lateral frío, una tira de contraluz y un filo angosto y
    // más brillante — el "hot spot" que engancha el reflejo como una línea de luz nítida.
    /* Los paneles van en HDR: `intensidad` multiplica el color por encima de 1, que es lo que un
       LDR no puede representar. Importa más de lo que parece — PMREMGenerator trabaja en half
       float, así que esos valores sobreviven, y son los que producen el reflejo especular
       QUEMADO sobre el bisel. Con paneles topados en 1.0 (como hasta v42) el metal nunca llega a
       la parte alta del rango: medido contra la referencia, las altas luces se quedaban ~45%
       cortas y la pieza se leía apagada por más oscura que fuera la base. El filo angosto es el
       más caliente de los cuatro: es el que se lee como línea de luz sobre la arista. */
    const panel = (w, h, color, intensidad, x, y, z)=>{
      const c = new THREE.Color(color).convertSRGBToLinear().multiplyScalar(intensidad);
      const mat = new THREE.MeshBasicMaterial({ side:THREE.DoubleSide });
      mat.color.copy(c);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      m.position.set(x, y, z); m.lookAt(0, 0, 0); envScene.add(m);
    };
    panel(9, 4, cfg.cenital[0], cfg.cenital[1], 0, 8.5, 2);       // cenital: el grueso de la luz
    panel(3, 6, cfg.lateral[0], cfg.lateral[1], 8, 3, 4);         // lateral frío
    panel(10, 0.8, cfg.contraluz[0], cfg.contraluz[1], -3, 2, -8);// contraluz: despega la silueta del fondo
    panel(0.6, 5, cfg.filo[0], cfg.filo[1], 6, 4, -6);            // filo caliente: el highlight nítido del bisel
    const pmrem = new THREE.PMREMGenerator(renderer);
    const rt = pmrem.fromScene(envScene, 0.03);
    pmrem.dispose();
    return rt.texture;
  } catch(err){
    console.warn('[modelos] sin environment map, el metal se verá plano:', err);
    return null;
  }
}

/* Cache del environment de crearEntornoMetal(): se genera una sola vez (la primera vez que algún
   material lo pide, entidad o ícono) y de ahí en más se reusa — mismo look en todo, sin pagar el
   costo de PMREMGenerator dos veces. `false` (en vez de null) marca "ya se intentó y no se pudo",
   así un renderer sin soporte no reintenta en cada material nuevo que se crea. */
let entornoMetalCache = null;
function obtenerEntornoMetal(){
  if(entornoMetalCache === null) entornoMetalCache = crearEntornoMetal() || false;
  return entornoMetalCache || null;
}

/* v48: entorno propio de las entidades (edificios, Datacenter, Nube). Los íconos siguen con
   ENTORNO_ICONOS; estos dos objetos definen la "sala" que refleja cada familia:
   colores de la cúpula (arriba / horizonte / abajo) y [color, intensidad HDR] de cada panel.
   El de entidades es neutro y claro arriba (lo que da la plata casi blanca en las caras
   superiores) y azul abajo (el tinte azul de los laterales y la base, como en las referencias). */
let entornoEntidadesCache = null;
function obtenerEntornoEntidades(){
  if(entornoEntidadesCache === null) entornoEntidadesCache = crearEntornoMetal(ENTORNO_ENTIDADES) || false;
  return entornoEntidadesCache || null;
}

const ModelLibrary = (()=>{
  const plantillas = {};   // archivo -> { objeto:THREE.Group (escalado y con materiales propios), dims:{w,h,d} }
  const materiales = {};   // look -> { base, glow } — compartidos por todas las instancias de ese tipo
  const animables = { beams:[], luces:[] }; // materiales que el loop anima (ver animarModelos)
  let estado = 'pendiente'; // 'pendiente' | 'listo' | 'parcial' | 'sin_modelos'
  const errores = {};       // archivo -> mensaje

  function materialesDe(look){
    if(materiales[look]) return materiales[look];
    const L = MODELO_LOOKS[look];
    // T02: opacidad explícita. Son los valores por defecto de three, pero quedan escritos porque
    // el cliente pidió edificios sin transparencia y el smoke test los verifica: si mañana alguien
    // agrega `transparent` acá (o el .glb trae alfa), se nota. El material del .glb se reemplaza
    // entero en prepararPlantilla, así que el alfa que traiga el archivo nunca llega a la escena.
    const OPACO = { transparent:false, opacity:1, depthWrite:true, alphaTest:0 };
    const base = new THREE.MeshStandardMaterial(Object.assign({}, MODELO_METAL, OPACO, { envMap: obtenerEntornoEntidades() }));
    const glow = new THREE.MeshStandardMaterial(Object.assign({
      color:0x000000, emissive:L.glow, emissiveIntensity:L.glowIntensidad, metalness:0, roughness:1,
    }, OPACO));
    // Albedo y emisivo se eligieron a ojo en sRGB; en un pipeline PBR van en lineal (§3A-ter b).
    // Sin esto el cian se va hacia un celeste lavado en cuanto sube la intensidad.
    base.color.convertSRGBToLinear();
    glow.emissive.convertSRGBToLinear();
    base.name = 'pn_' + look + '_base';
    glow.name = 'pn_' + look + '_glow';
    materiales[look] = { base, glow };
    return materiales[look];
  }

  function base64ABuffer(b64){
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }
  function obtenerBytes(archivo){
    const embebido = window.PN_MODELOS_GLB && window.PN_MODELOS_GLB[archivo];
    if(embebido) return Promise.resolve(base64ABuffer(embebido));
    if(typeof fetch !== 'function') return Promise.reject(new Error('sin datos embebidos y sin fetch'));
    return fetch(MODELOS_RUTA + archivo + '.glb').then(r=>{
      if(!r.ok) throw new Error('HTTP ' + r.status);
      return r.arrayBuffer();
    });
  }
  function parsear(buffer){
    return new Promise((resolve, reject)=> new THREE.GLTFLoader().parse(buffer, '', resolve, reject));
  }

  /* Deja la plantilla lista para clonar: materiales propios, pivote verificado, escala aplicada.
     Todo lo que depende del archivo se resuelve acá UNA vez; instanciar() solo clona. */
  function prepararPlantilla(archivo, look, escala, gltf){
    const raiz = gltf.scene;
    const mats = materialesDe(look);
    raiz.traverse(o=>{
      if(!o.isMesh) return;
      o.layers.enable(CAPA_BRILLO); // v17: participa de la fuente del bloom (§3C); clone() copia las capas
      const nombre = (o.material && o.material.name) || '';
      if(NOMBRES_SLOT_GLOW.includes(nombre)) o.material = mats.glow;
      else {
        if(!NOMBRES_SLOT_BASE.includes(nombre)) console.warn('[modelos] ' + archivo + ': material "' + nombre + '" desconocido, se trata como base');
        o.material = mats.base;
      }
    });
    // Piezas que el código anima por nombre (v2 §6.4): cada una recibe su propio material para
    // poder variar la intensidad sin afectar al resto del modelo.
    const beam = raiz.getObjectByName('beam');
    if(beam){
      const m = mats.glow.clone();
      beam.traverse(o=>{ if(o.isMesh) o.material = m; });
      animables.beams.push(m);
    }
    for(let i=1;i<=7;i++){
      const luz = raiz.getObjectByName('luz_' + String(i).padStart(2,'0'));
      if(!luz) continue;
      const m = mats.glow.clone();
      luz.traverse(o=>{ if(o.isMesh) o.material = m; });
      animables.luces.push({ material:m, fase:i });
    }
    // Pivote: la especificación pide base en Y=0 y centrado en X/Z. Esta entrega cumple; si una
    // futura no, se corrige acá con un aviso en consola en vez de que el edificio aparezca hundido.
    const caja = new THREE.Box3().setFromObject(raiz);
    const centro = caja.getCenter(new THREE.Vector3());
    if(Math.abs(caja.min.y) > 0.005 || Math.abs(centro.x) > 0.01 || Math.abs(centro.z) > 0.01){
      console.warn('[modelos] ' + archivo + ': pivote fuera de la base, se corrige por código', caja.min, centro);
      raiz.position.set(-centro.x, -caja.min.y, -centro.z);
    }
    const envoltorio = new THREE.Group();
    envoltorio.name = 'modeloGLB';
    envoltorio.add(raiz);
    envoltorio.scale.setScalar(escala);
    const tam = caja.getSize(new THREE.Vector3()).multiplyScalar(escala);
    plantillas[archivo] = { objeto:envoltorio, dims:{ w:tam.x, h:tam.y, d:tam.z } };
  }

  function precargar(){
    if(typeof THREE.GLTFLoader !== 'function'){
      estado = 'sin_modelos';
      console.warn('[modelos] THREE.GLTFLoader no está cargado (js/vendor/GLTFLoader.js): se usan las primitivas');
      return Promise.resolve(estado);
    }
    const archivos = {};
    Object.values(MODELOS).forEach(m=>{ archivos[m.archivo] = m; });
    const tareas = Object.keys(archivos).map(archivo=>
      obtenerBytes(archivo)
        .then(parsear)
        .then(gltf=> prepararPlantilla(archivo, archivos[archivo].look, archivos[archivo].escala || MODELOS_ESCALA, gltf))
        .catch(err=>{ errores[archivo] = String(err && err.message || err); console.warn('[modelos] ' + archivo + ' no cargó, se usa la primitiva:', err); })
    );
    return Promise.all(tareas).then(()=>{
      const cargados = Object.keys(plantillas).length, total = Object.keys(archivos).length;
      estado = cargados === total ? 'listo' : (cargados ? 'parcial' : 'sin_modelos');
      return estado;
    });
  }

  /* Devuelve { objeto, dims } o null si ese modelo no está disponible (-> primitiva).
     clone(true) comparte geometría y material con la plantilla. Las mallas del modelo NO
     participan del raycast: la selección usa los hitbox invisibles de siempre, que son 1 caja o
     1 cilindro por entidad en vez de miles de triángulos. */
  function instanciar(clave){
    const def = MODELOS[clave];
    const plantilla = def && plantillas[def.archivo];
    if(!plantilla) return null;
    const objeto = plantilla.objeto.clone(true);
    objeto.traverse(o=>{ if(o.isMesh) o.raycast = ()=>{}; });
    return { objeto, dims: Object.assign({}, plantilla.dims) };
  }

  /* Medidas del modelo ya escalado, SIN instanciarlo: la grilla (§4) necesita saber cuánto va a
     medir una entidad antes de construirla, para elegir dónde cabe. Devuelve null si ese modelo
     no está disponible (-> el que pregunta cae a las medidas de la primitiva). */
  function dims(clave){
    const def = MODELOS[clave];
    const plantilla = def && plantillas[def.archivo];
    return plantilla ? Object.assign({}, plantilla.dims) : null;
  }

  return {
    precargar, instanciar, dims,
    estado: ()=> estado,
    errores: ()=> Object.assign({}, errores),
    animables,
    materiales: ()=> materiales,
  };
})();

/* =========================================================================
   3D. ÍCONOS DE PRODUCTO (.glb) — v23 (tandas: Ciberseguridad v18 + Cloud v20 + Colaboración v21
        + Conectividad v23)
   -------------------------------------------------------------------------
   Reemplaza, assetKey por assetKey, las primitivas de AssetRegistry (§5) por modelos reales, a
   medida que llegan tandas del proveedor. Mismo patrón que ModelLibrary (arriba), con una
   diferencia importante: una ENTIDAD tiene ~4 "looks" fijos (sede/matriz/nube/datacenter), pero
   un ÍCONO se tiñe con el color del Subproducto — hasta ~40 colores de catálogo distintos (v2
   §7.2 punto 8) — así que el material no se cachea por tipo de ícono sino por color resuelto, y
   se comparte entre TODOS los assetKeys que usen ese mismo color.

   Slots de material (v2 §6.5, ampliados en la entrega de Ciberseguridad — ver LEEME.md del
   paquete): `mat_base` (cuerpo), `mat_glow` (rasgo distintivo — ranuras, pantallas: NO participa
   del bloom de §3C, ver mockup v17 "no brillan… íconos de producto"; acá "glow" es una variante
   más clara del MISMO tinte, no una capa que pasa por UnrealBloomPass), `mat_translucido`
   (vidrio/pantalla) y `mat_receso` (hueco/sombra — variante más oscura del mismo tinte). Un
   ícono no necesariamente trae los 4 slots (p. ej. el escudo no trae `mat_base`, ver checks.json
   del paquete). La tanda Cloud (v20) trae solo `mat_base` + `mat_glow`, que es lo que pide la
   especificación base; los otros dos slots siguen disponibles para tandas que los usen. La tanda
   Colaboración (v21) es la primera que usa los 4 en un mismo archivo: `pn_ico_puerta` combina
   cuerpo, aros emisivos, carcasa oscura y credencial translúcida.

   Sobre el color del archivo: el .glb de Cloud llega teñido en el celeste de la categoría y con
   emisión, no en el blanco puro que pide v2 §6.5. No hace falta corregirlo en el archivo porque
   `materialesDeColor()` DESCARTA el material del .glb y crea el suyo desde el color del catálogo;
   de la entrega solo se lee el NOMBRE del slot para saber qué malla es cuerpo y cuál es glow. El
   acabado celeste del render del proveedor, entonces, no llega a la app a propósito — decisión
   tomada en v20 para que los 7 íconos se tiñan por el mismo camino (ver doc v20).

   Fuente de los bytes: window.PN_ICONOS_GLB (js/iconos-glb.js, generado por
   tools/empaquetar-iconos.js desde assets/glb-iconos/) y, si falta, fetch('assets/glb-iconos/…').
   Deliberadamente en un archivo y una carpeta separados de los de las 6 entidades
   (PN_MODELOS_GLB / assets/glb/): smoke-test-modelos.js valida que PN_MODELOS_GLB traiga
   EXACTAMENTE los archivos de MODELOS, así que mezclar los íconos ahí rompería ese test.

   Si un assetKey no está en ICONOS_GLB, o su .glb no cargó, AssetRegistry sigue usando su
   primitiva de siempre — mismo criterio de entrega por tandas que las entidades (v2 §6.7).
   ========================================================================= */
const ICONOS_ESCALA = 1;

// assetKey (mismo que en PRODUCTOS/SUBPRODUCTOS, §1) -> archivo (sin .glb). Va creciendo tanda a
// tanda; los assetKeys que faltan acá siguen con su primitiva de AssetRegistry (§5).
// Claves opcionales de cada entrada:
//   escala   — multiplica la escala del ícono (se aplica DESPUÉS de ICONOS_DIM_OBJETIVO).
//   repetir  — { copias, paso:[x,y,z] }: el .glb no es el ícono entero sino una pieza que se
//              repite. Ver prepararPlantilla(). Hoy solo lo usa `enlace` (v23).
const ICONOS_GLB = {
  escudo:              { archivo:'pn_ico_escudo' },             // Perimetral
  candado:             { archivo:'pn_ico_candado' },            // End Point
  llave:               { archivo:'pn_ico_llave' },              // Acceso
  muro:                { archivo:'pn_ico_muro' },                // Aplicación
  firewall_onpremise:  { archivo:'pn_ico_firewall_onpremise' },  // Firewall On Premise (subproducto propio)
  // v20 — tanda Cloud
  rack:                { archivo:'pn_ico_rack' },                // Housing (Collocation/Energía, Crossconexión)
  nube:                { archivo:'pn_ico_nube' },                // Hosting (IaaS, BaaS, DRaaS)
  // v21 — tanda Colaboración
  pantalla:            { archivo:'pn_ico_pantalla' },            // Conferencia (además: fallback de cualquier producto sin ícono, v2 §3 B12)
  documento:           { archivo:'pn_ico_documento' },           // Ofimática
  puerta:              { archivo:'pn_ico_puerta' },              // Portal Cautivo
  antena:              { archivo:'pn_ico_antena' },              // Zona Wireless
  // v23 — tanda Conectividad. Con esta tanda el catálogo queda sin primitivas visibles salvo
  // firewall_virtual, que el proveedor excluyó del lineup a propósito (v2 §3, nota B8).
  enlace:              { archivo:'pn_ico_enlace',                // Datos (Canal de Conexión, Cloud Interconnect)
                         repetir:{ copias:3, paso:[0.26, 0.175, 0] } },
  nodo:                { archivo:'pn_ico_nodo' },                // SD-WAN (Sdwan, Túnel IPsec)
  globo:               { archivo:'pn_ico_globo' },               // Internet (Corporativo, Startup, Teleworking, Puntonet Space)
};
const ICONOS_RUTA = 'assets/glb-iconos/';
const NOMBRES_SLOT_ICONO_TRANSLUCIDO = ['mat_translucido'];
const NOMBRES_SLOT_ICONO_RECESO = ['mat_receso'];

/* Normalización de tamaño entre tandas (v21 — resuelve el Pendiente 39 de v20).
   El proveedor entrega cada ícono dentro de la envolvente de 0.6³ de v2 §3, pero la
   especificación fija un TECHO, no una medida común, así que cada tanda se acomoda distinto
   adentro de esa caja. Medidos por su dimensión mayor los 11 van de 0.460 a 0.580 — apenas un
   26% de dispersión —, y este factor los lleva a todos al mismo número.

   Por qué la dimensión MAYOR y no la altura, que es como lo planteaba el Pendiente 39: `antena` y
   `puerta` son chatos (0.089 y 0.290 de alto) pero gastan los 0.580 completos en X y Z, porque su
   rasgo son los aros de cobertura, que son horizontales. Escalarlos hasta una altura común los
   llevaría a ~2.3 de ancho: cuatro veces la envolvente, invadiendo las sedes vecinas del anillo.
   La dimensión mayor es la que el ojo lee como "tamaño del ícono" con cámara ortográfica fija.

   Consecuencia que conviene tener presente: esto NO iguala alturas y no pretende hacerlo. Un
   access point sigue siendo chato y un rack sigue siendo alto, que es como se leen en la realidad;
   lo que se empareja es cuánto espacio ocupa cada ícono en el anillo.

   Para desactivarlo y volver a la escala tal cual la entrega el proveedor: ICONOS_DIM_OBJETIVO = 0. */
const ICONOS_DIM_OBJETIVO = 0.58;

const IconLibrary = (()=>{
  const plantillas = {};          // archivo -> THREE.Group crudo (geometría cacheada, SIN material asignado)
  const materialesPorColor = {};  // color (int) -> { base, glow, translucido, receso } — compartidos entre assetKeys
  let estado = 'pendiente';       // 'pendiente' | 'listo' | 'parcial' | 'sin_modelos'
  const errores = {};             // archivo -> mensaje

  function materialesDeColor(color){
    if(materialesPorColor[color]) return materialesPorColor[color];
    // Mismo environment que las entidades (ModelLibrary, §3B): antes los íconos no tenían envMap
    // y por eso no mostraban ningún reflejo aunque el material ya fuera metálico. `receso` queda
    // sin envMap a propósito: es un hueco/sombra, un reflejo ahí contradice la lectura de "hundido".
    const entorno = obtenerEntornoMetal();
    const set = {
      base:        new THREE.MeshStandardMaterial({ color, metalness:0.6, roughness:0.32, envMap: entorno, envMapIntensity:1.3 }),
      glow:        new THREE.MeshStandardMaterial({ color: lightenColor(color, 1.5), emissive:color, emissiveIntensity:1.35, metalness:0.15, roughness:0.3, envMap: entorno, envMapIntensity:0.9 }),
      translucido: new THREE.MeshStandardMaterial({ color, transparent:true, opacity:0.45, depthWrite:false, metalness:0.1, roughness:0.25, side:THREE.DoubleSide, envMap: entorno, envMapIntensity:1.2 }),
      receso:      new THREE.MeshStandardMaterial({ color: darkenColor(color, 0.45), metalness:0.2, roughness:0.75 }),
    };
    /* Los colores del catálogo se eligieron a ojo en sRGB: hay que pasarlos a lineal para que el
       tinte por familia se conserve bajo el nuevo pipeline (§3A-ter b). Los íconos quedan fuera
       del bloom por decisión de v17/v19, así que su emisivo no necesita entrar tan arriba como el
       de las entidades: alcanza con pasar de 1 para que se despegue del cuerpo. */
    Object.values(set).forEach(m=>{
      m.color.convertSRGBToLinear();
      if(m.emissive) m.emissive.convertSRGBToLinear();
    });
    materialesPorColor[color] = set;
    return set;
  }

  function base64ABuffer(b64){
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }
  function obtenerBytes(archivo){
    const embebido = window.PN_ICONOS_GLB && window.PN_ICONOS_GLB[archivo];
    if(embebido) return Promise.resolve(base64ABuffer(embebido));
    if(typeof fetch !== 'function') return Promise.reject(new Error('sin datos embebidos y sin fetch'));
    return fetch(ICONOS_RUTA + archivo + '.glb').then(r=>{
      if(!r.ok) throw new Error('HTTP ' + r.status);
      return r.arrayBuffer();
    });
  }
  function parsear(buffer){
    return new Promise((resolve, reject)=> new THREE.GLTFLoader().parse(buffer, '', resolve, reject));
  }

  /* Deja la plantilla lista para clonar y teñir: pivote verificado, escala aplicada, SIN
     material propio todavía (eso se resuelve por color en instanciar/materialesDeColor). Guarda
     el slot de cada malla en userData para no tener que volver a mirar el nombre de material del
     proveedor en cada clonado. */
  function prepararPlantilla(archivo, def, gltf){
    const escala = def.escala || ICONOS_ESCALA;
    let raiz = gltf.scene;
    raiz.traverse(o=>{
      if(!o.isMesh) return;
      const nombre = (o.material && o.material.name) || '';
      if(NOMBRES_SLOT_GLOW.includes(nombre)) o.userData.slot = 'glow';
      else if(NOMBRES_SLOT_ICONO_TRANSLUCIDO.includes(nombre)) o.userData.slot = 'translucido';
      else if(NOMBRES_SLOT_ICONO_RECESO.includes(nombre)) o.userData.slot = 'receso';
      else {
        if(!NOMBRES_SLOT_BASE.includes(nombre)) console.warn('[iconos] ' + archivo + ': material "' + nombre + '" desconocido, se trata como base');
        o.userData.slot = 'base';
      }
    });
    /* Composición por repetición (v23, Datos). El proveedor no entrega el ícono entero sino UNA
       pieza — el cubito de 0.18 de `pn_ico_enlace` — con la indicación de repetirla para formar el
       flujo; el ícono aprobado son tres paquetes sobre una diagonal ascendente, igual que el SVG
       del menú. Se arma acá, ANTES de medir, para que la corrección de pivote y la normalización
       de ICONOS_DIM_OBJETIVO trabajen sobre el conjunto: al revés, el cubito solo se inflaría
       hasta 0.58 y Datos quedaría como un cubo suelto en vez de un flujo.
       El `paso` está en unidades del archivo (metros, v2 §6.1), no en unidades ya normalizadas. */
    if(def.repetir){
      const copias = def.repetir.copias, paso = def.repetir.paso;
      const conjunto = new THREE.Group();
      conjunto.name = 'iconoRepetido';
      const desde = -(copias - 1) / 2;
      for(let i=0; i<copias; i++){
        const copia = raiz.clone(true);   // clone(true) comparte geometría y arrastra userData.slot
        copia.position.set(paso[0]*(desde+i), paso[1]*(desde+i), paso[2]*(desde+i));
        conjunto.add(copia);
      }
      raiz = conjunto;
    }
    // Pivote: la especificación pide base en Y=0 y centrado en X/Z (v2 §6.4), igual que las
    // entidades — misma corrección defensiva si alguna entrega futura no cumple. Con `repetir`
    // se corrige el conjunto, no cada copia: la diagonal deja la pieza de abajo por debajo de Y=0.
    const caja = new THREE.Box3().setFromObject(raiz);
    const centro = caja.getCenter(new THREE.Vector3());
    if(Math.abs(caja.min.y) > 0.005 || Math.abs(centro.x) > 0.01 || Math.abs(centro.z) > 0.01){
      // Con `repetir` el desplazamiento lo introdujimos nosotros al armar la diagonal, así que no
      // es un defecto de la entrega y no se avisa: el archivo del proveedor sí tiene su pivote bien.
      if(!def.repetir) console.warn('[iconos] ' + archivo + ': pivote fuera de la base, se corrige por código', caja.min, centro);
      raiz.position.set(-centro.x, -caja.min.y, -centro.z);
    }
    // Normalización de tamaño entre tandas (ver ICONOS_DIM_OBJETIVO, arriba). Se mide DESPUÉS de
    // corregir el pivote y se multiplica por la escala del catálogo, no la reemplaza: un ícono que
    // algún día pida su propia `escala` sigue respetándola sobre la medida ya normalizada.
    let factor = escala;
    if(ICONOS_DIM_OBJETIVO > 0){
      const tam = caja.getSize(new THREE.Vector3());
      const mayor = Math.max(tam.x, tam.y, tam.z);
      if(mayor > 0.001) factor = escala * (ICONOS_DIM_OBJETIVO / mayor);
    }
    const envoltorio = new THREE.Group();
    envoltorio.name = 'iconoGLB';
    envoltorio.add(raiz);
    envoltorio.scale.setScalar(factor);
    plantillas[archivo] = envoltorio;
  }

  function precargar(){
    if(typeof THREE.GLTFLoader !== 'function'){
      estado = 'sin_modelos';
      return Promise.resolve(estado);
    }
    const archivos = {};
    Object.values(ICONOS_GLB).forEach(m=>{ archivos[m.archivo] = m; });
    const claves = Object.keys(archivos);
    if(!claves.length){ estado = 'sin_modelos'; return Promise.resolve(estado); }
    const tareas = claves.map(archivo=>
      obtenerBytes(archivo)
        .then(parsear)
        .then(gltf=> prepararPlantilla(archivo, archivos[archivo], gltf))
        .catch(err=>{ errores[archivo] = String(err && err.message || err); console.warn('[iconos] ' + archivo + ' no cargó, se usa la primitiva:', err); })
    );
    return Promise.all(tareas).then(()=>{
      const cargados = Object.keys(plantillas).length, total = claves.length;
      estado = cargados === total ? 'listo' : (cargados ? 'parcial' : 'sin_modelos');
      return estado;
    });
  }

  /* Devuelve un THREE.Group listo para agregar a la escena, teñido con `color`, o null si ese
     assetKey todavía no tiene .glb o no cargó — el llamador (AssetRegistry) cae a la primitiva.
     clone(true) comparte geometría entre instancias; los materiales salen del caché por color.
     A diferencia de ModelLibrary.instanciar(), NO se desactiva el raycast: los íconos se siguen
     seleccionando por su malla real, igual que las primitivas de siempre (no tienen hitbox propio). */
  function instanciar(assetKey, color){
    const def = ICONOS_GLB[assetKey];
    const plantilla = def && plantillas[def.archivo];
    if(!plantilla) return null;
    const mats = materialesDeColor(color);
    const objeto = plantilla.clone(true);
    objeto.traverse(o=>{
      if(!o.isMesh) return;
      o.material = mats[o.userData.slot] || mats.base;
    });
    return objeto;
  }

  return {
    precargar, instanciar,
    estado: ()=> estado,
    errores: ()=> Object.assign({}, errores),
  };
})();

/* Animación de las piezas nombradas. La Matriz de esta entrega NO trae cascarones que giren
   (el proveedor los reemplazó por alas fijas, ver doc v16): lo único que se anima es el pulso
   del acento vertical (`beam`) y el parpadeo escalonado de las 7 luces de la fachada del
   Datacenter. Todo por intensidad de emisión, sin mover geometría. */
function animarModelos(t){
  const A = ModelLibrary.animables;
  const pulso = 0.75 + 0.25 * Math.sin(t * 2.2);
  A.beams.forEach(m=>{ m.emissiveIntensity = MODELO_LOOKS.matriz.glowIntensidad * pulso; });
  A.luces.forEach(({ material, fase })=>{
    const s = Math.sin(t * 1.6 + fase * 1.3);
    material.emissiveIntensity = MODELO_LOOKS.datacenter.glowIntensidad * (s > 0.82 ? 0.35 : 1);
  });
}

/* Medidas visuales de una entidad (las que usa el layout: halo, anillo de productos, etiqueta,
   efecto de recubrimiento). Las pone el builder en group.userData.dims, tanto si la entidad usa
   el modelo como la primitiva. */
function dimsEntidad(entity){
  const ud = entity.group && entity.group.userData;
  if(ud && ud.dims) return ud.dims;
  if(entity.tipo === 'sede'){ const [w,h,d] = getTamanoLocal(entity.tamano).box; return { w, h, d }; }
  return { w:2, h:2, d:2 };
}

/* =========================================================================
   3C. BRILLO (post-proceso) — v17
   -------------------------------------------------------------------------
   El resplandor de neón de los renders aprobados: el emisivo no es solo una línea de color, se
   "abre" en un halo alrededor. Eso es bloom (especificación v2 §7.3, puntos 12 y 15).

   Es un bloom SELECTIVO: solo brillan los emisivos de los modelos .glb (ranuras, luces, canal de
   la plataforma, contorno de la Nube). Los cables, halos de selección, íconos y puertos NO
   brillan, así que la escena no se lava ni la selección se convierte en una mancha.

   Cómo, en cada frame:
   1. Fuente del brillo: se dibujan solo las mallas de los modelos (capa CAPA_BRILLO) en un render
      target aparte. El metal se dibuja con colorWrite:false — escribe profundidad pero no color —,
      así tapa los emisivos que quedan detrás del edificio sin aportar brillo. Son 4 materiales
      compartidos (uno por tipo de entidad): el cambio es de 4 flags, no un recorrido de la escena.
   2. UnrealBloomPass (three r128) difumina esa fuente en 5 niveles.
   3. Se dibuja la escena normal en pantalla y encima, en modo aditivo, la fuente + su halo, sin
      tocar el alfa: el canvas sigue transparente y el halo se suma como luz sobre el degradado de
      fondo que define css/styles.css (#canvasWrap).
   4. Los puertos de conexión (+) se vuelven a dibujar encima del halo (capa CAPA_PUERTOS): son
      un control, no parte del edificio, y el brillo no debe lavarlos.

   Si el post-proceso no está (falta js/vendor/postproceso-r128.js) o falla en un frame, se apaga
   solo y la escena sigue exactamente como en v40, sin brillo.

   PDF (v2 §7.4, decisión tomada: "el reporte sale sin efectos, por ahora"): BRILLO_EN_PDF = false.
   Si el cliente lo pide con efectos, es cambiar ese booleano — captureHeroSnapshot ya pasa por
   renderizarFrame().
   ========================================================================= */
const CAPA_BRILLO = 1;
const CAPA_PUERTOS = 2; // los puertos (+) siguen en la capa 0 para el raycast; esta capa es solo para redibujarlos
const BRILLO = {
  activo: true,
  // Re-afinados para el pipeline de color de §3A-ter: los valores de v42 (3.0 / 0.5 / 1.5) estaban
  // calibrados contra salida lineal sin tone mapping, donde el emisivo llegaba crudo al halo. Ahora
  // la fuente entra comprimida por ACES y codificada a sRGB, así que la misma fuerza numérica rinde
  // bastante más y hay que bajarla o la escena se lava.
  intensidad: 0.9,  // fuerza del halo (UnrealBloomPass.strength)
  radio: 0.30,       // cuánto se abre (UnrealBloomPass.radius, 0..1). Más de ~0.6 ya es neblina, no neón
  nucleo: 0.60,      // cuánto se suma la línea emisiva sobre sí misma: da el centro casi blanco del neón
  resolucion: 1,     // tamaño del render target respecto del canvas en px CSS (bajar a 0.5 si la tablet no da)
  // v45: media precisión (RGBA16F) en TODOS los render targets del halo. Ver "PRECISIÓN" abajo.
  // Ponerlo en false devuelve el pipeline exacto de v44 (8 bits), por si hay que recuperar VRAM.
  precisionAlta: true,
};

/* -------------------------------------------------------------------------
   PRECISIÓN DEL HALO (v45) — por qué media precisión y no solo "más resolución"
   -------------------------------------------------------------------------
   El halo salía con anillos concéntricos y bordes escalonados. No eran dos defectos: eran uno.

   La cola del halo se guardaba en 8 bits y en LINEAL, y recién al componer se codificaba a sRGB
   (ver el fragment shader de `quad`). Esa codificación ESTIRA la zona oscura: el código lineal
   1/255 aterriza cerca de 0.08 en sRGB, el 2/255 cerca de 0.11. O sea que dos pasos consecutivos
   de 8 bits, justo donde el halo se apaga, quedaban a una distancia perceptual enorme → anillos.
   Y esos anillos, al dibujar cada curva de nivel, hacían VISIBLE la malla del upsample bilineal de
   los mips (UnrealBloomPass arranca en resolución/2), que es lo que se leía como "pixelado".
   Por eso se ataca la precisión y no la resolución: sin curvas de nivel no hay malla que mostrar,
   y subir la resolución del pase costaba llenado en cada frame (el dial `resolucion` sigue ahí).

   Se toca la cadena ENTERA, no solo los mips: UnrealBloomPass compone los 5 niveles y después
   suma el resultado de vuelta sobre `fuente` (su readBuffer). Si `fuente` quedaba en 8 bits, el
   halo se recuantizaba en el último paso, justo antes del sRGB, y media precisión en los mips no
   se notaba. Los 11 targets internos suman ~3 MB; `fuente` es el caro, porque es multisample
   (~+24 MB en un canvas de 1400×850). De ahí el interruptor `precisionAlta`.

   Si la GPU no puede renderizar a media precisión, `tipoRenderTarget()` devuelve 8 bits y todo
   sigue exactamente como en v44 — el dithering del composite (abajo) tapa buena parte del banding
   igual, y no cuesta nada.
   ------------------------------------------------------------------------- */
const BRILLO_EN_PDF = false;

const Brillo = (()=>{
  let estado = 'pendiente'; // 'activo' | 'apagado' | 'sin_soporte' | 'error'
  let fuente = null, pase = null, quad = null;
  let tipoRT = THREE.UnsignedByteType; // tipo real con el que quedaron los render targets del halo
  const tam = new THREE.Vector2();
  const clearPrevio = new THREE.Color();

  function medidas(){
    renderer.getSize(tam);
    return { w: Math.max(2, Math.round(tam.x * BRILLO.resolucion)), h: Math.max(2, Math.round(tam.y * BRILLO.resolucion)) };
  }

  /* ¿Se puede renderizar a media precisión? Hacen falta tres cosas, y las tres se consultan antes
     de crear nada: poder DIBUJAR a RGBA16F, poder FILTRARLO en lineal (los mips se muestrean con
     LinearFilter) y, en WebGL1, tener el tipo de textura. Si falta alguna, 8 bits y a otra cosa:
     pedir media precisión sin soporte no tira excepción, deja el framebuffer incompleto y el halo
     se vería negro, que es peor que el banding. */
  function tipoRenderTarget(){
    if(!BRILLO.precisionAlta) return THREE.UnsignedByteType;
    const ext = renderer.extensions;
    if(!ext || typeof ext.has !== 'function') return THREE.UnsignedByteType;
    const esWebGL2 = !!(renderer.capabilities && renderer.capabilities.isWebGL2);
    const dibuja = ext.has('EXT_color_buffer_half_float') || (esWebGL2 && ext.has('EXT_color_buffer_float'));
    const filtra = esWebGL2 || ext.has('OES_texture_half_float_linear');
    const tipo   = esWebGL2 || ext.has('OES_texture_half_float');
    return (dibuja && filtra && tipo) ? THREE.HalfFloatType : THREE.UnsignedByteType;
  }

  /* Todos los render targets por los que pasa el halo: `fuente` + los 11 internos del pase
     (bright + 5 horizontales + 5 verticales). UnrealBloomPass los crea en su constructor con el
     tipo por defecto y no admite configurarlo; como todavía no se subió ninguna textura a la GPU,
     reasignar `texture.type` antes del primer frame alcanza — three los crea con ese tipo, y
     `setSize()` lo respeta al recrearlos en cada resize. Se hace desde acá, y NO editando
     js/vendor/postproceso-r128.js, para que el vendor siga siendo una copia limpia de upstream. */
  function objetivosPrecision(){
    if(!fuente || !pase) return [];
    return [fuente, pase.renderTargetBright]
      .concat(pase.renderTargetsHorizontal || [], pase.renderTargetsVertical || [])
      .filter(rt => rt && rt.texture);
  }

  function crear(){
    if(typeof THREE.UnrealBloomPass !== 'function' || typeof THREE.FullScreenQuad !== 'function'){
      estado = 'sin_soporte';
      console.warn('[brillo] falta js/vendor/postproceso-r128.js: la escena sigue sin bloom');
      return;
    }
    if(!BRILLO.activo){ estado = 'apagado'; return; }
    try{
      const { w, h } = medidas();
      tipoRT = tipoRenderTarget();
      // Multisample (WebGL2): las líneas emisivas miden ~1 px en pantalla; sin antialiasing el
      // contorno de la Nube salía punteado. En WebGL1 cae a un render target común.
      const opciones = { minFilter:THREE.LinearFilter, magFilter:THREE.LinearFilter, format:THREE.RGBAFormat, type:tipoRT };
      if(renderer.capabilities && renderer.capabilities.isWebGL2 && typeof THREE.WebGLMultisampleRenderTarget === 'function'){
        fuente = new THREE.WebGLMultisampleRenderTarget(w, h, opciones);
        fuente.samples = 4;
      } else {
        fuente = new THREE.WebGLRenderTarget(w, h, opciones);
      }
      fuente.texture.name = 'brillo.fuente';
      pase = new THREE.UnrealBloomPass(new THREE.Vector2(w, h), BRILLO.intensidad, BRILLO.radio, 0);
      objetivosPrecision().forEach(rt=>{ rt.texture.type = tipoRT; }); // ver "PRECISIÓN DEL HALO"
      quad = new THREE.FullScreenQuad(new THREE.ShaderMaterial({
        uniforms: { tBrillo:{ value:fuente.texture }, nucleo:{ value:BRILLO.nucleo } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        // Luz pura: suma color y NO toca el alfa del canvas. Sobre la escena (alfa 1) es un aditivo
        // normal; donde el canvas es transparente, el navegador compone color premultiplicado con
        // alfa 0 como "sumar sobre lo de abajo", así el halo ilumina el degradado CSS del fondo en
        // vez de oscurecerlo (con alfa > 0 el fondo quedaba teñido y más oscuro alrededor del halo).
        // El render target `fuente` queda en LINEAL: r128 solo aplica outputEncoding cuando
        // dibuja al canvas, no a un render target. El canvas, en cambio, ya está en sRGB desde
        // §3A-ter. Sumar lineal sobre sRGB mezcla dos espacios y el halo sale apagado y sucio, así
        // que acá se codifica a sRGB antes de sumar. `nucleo` multiplica después de codificar, para
        // que siga siendo una fuerza de pantalla directa de afinar.
        // El dithering va al FINAL, después del sRGB y del `nucleo`: el canvas sigue siendo de 8
        // bits por canal, así que aunque el halo llegue en media precisión, la cuantización final
        // ocurre igual acá. Media precisión arregla los pasos intermedios; el dithering, el último.
        // Son los chunks de three (`dithering: true` define DITHERING y habilita el par/fragment),
        // y `<common>` entra porque ahí vive el rand() que usan. Los #include tienen que arrancar
        // la línea — por eso el shader se arma como lista y no como concatenación suelta.
        fragmentShader: [
          '#include <common>',
          '#include <dithering_pars_fragment>',
          'uniform sampler2D tBrillo; uniform float nucleo; varying vec2 vUv;',
          'vec3 aSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(max(c, vec3(0.0)), vec3(0.41666))-0.055, step(vec3(0.0031308), c)); }',
          'void main(){',
          '  gl_FragColor = vec4(aSRGB(texture2D(tBrillo, vUv).rgb) * nucleo, 0.0);',
          '#include <dithering_fragment>',
          '}',
        ].join('\n'),
        dithering: true, // entra en la clave del programa: sin esto los chunks de arriba no hacen nada
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
        blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor, // el alfa del canvas no cambia
        depthTest: false, depthWrite: false, transparent: true,
      }));
      estado = 'activo';
    } catch(err){
      estado = 'error';
      console.warn('[brillo] no se pudo crear el post-proceso, la escena sigue sin bloom:', err);
    }
  }

  function asegurarTamano(){
    const { w, h } = medidas();
    if(fuente.width !== w || fuente.height !== h){ fuente.setSize(w, h); pase.setSize(w, h); }
  }

  // Paso 1 y 2: fuente (solo modelos, metal sin color) + halo. Todo lo que se toca se restaura
  // en el finally, falle lo que falle.
  function renderizarFuente(){
    const bases = Object.values(ModelLibrary.materiales()).map(m=>m.base);
    const capasPrevias = camera.layers.mask;
    renderer.getClearColor(clearPrevio);
    const alfaPrevio = renderer.getClearAlpha();
    try{
      bases.forEach(m=>{ m.colorWrite = false; });
      camera.layers.set(CAPA_BRILLO);
      renderer.setRenderTarget(fuente);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      renderer.render(scene, camera);
    } finally {
      bases.forEach(m=>{ m.colorWrite = true; });
      camera.layers.mask = capasPrevias;
      renderer.setClearColor(clearPrevio, alfaPrevio);
    }
    pase.strength = BRILLO.intensidad;
    pase.radius = BRILLO.radio;
    pase.render(renderer, null, fuente, 0, false); // deja fuente = emisivos + halo
    renderer.setRenderTarget(null);
  }

  function hayModelos(){ const e = ModelLibrary.estado(); return e === 'listo' || e === 'parcial'; }

  /* Dibuja un frame. conBrillo=false (o brillo no disponible) = render directo, igual que v40. */
  function renderizar(conBrillo){
    if(!conBrillo || estado !== 'activo' || !hayModelos()){ renderer.render(scene, camera); return; }
    try{
      asegurarTamano();
      renderizarFuente();
      renderer.render(scene, camera);
      quad.material.uniforms.nucleo.value = BRILLO.nucleo;
      const autoClearPrevio = renderer.autoClear, capasPrevias = camera.layers.mask;
      renderer.autoClear = false;
      try {
        quad.render(renderer);
        camera.layers.set(CAPA_PUERTOS); // paso 4: solo los puertos, sobre el halo
        renderer.render(scene, camera);
      } finally { renderer.autoClear = autoClearPrevio; camera.layers.mask = capasPrevias; }
    } catch(err){
      estado = 'error';
      console.warn('[brillo] falló el post-proceso, se apaga y la escena sigue sin bloom:', err);
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    }
  }

  function activar(si){
    if(si && !fuente){ BRILLO.activo = true; crear(); return estado; }
    if(estado === 'activo' || estado === 'apagado') estado = si ? 'activo' : 'apagado';
    return estado;
  }

  /* Tipo con el que quedó la cadena del halo, leído de los render targets REALES y no de la
     intención: devuelve null si alguno quedó distinto del resto, así el smoke test verifica los 12
     y no solo que `tipoRT` se haya calculado bien. */
  function precision(){
    const tipos = objetivosPrecision().map(rt => rt.texture.type);
    if(!tipos.length) return null;
    return tipos.every(t => t === tipos[0]) ? tipos[0] : null;
  }

  crear();
  return {
    renderizar, activar, precision,
    estado: ()=> estado,
    tamano: ()=> fuente ? { w:fuente.width, h:fuente.height } : null,
    // El material del composite, para que el smoke test verifique el shader ARMADO (los #include
    // tienen que quedar al principio de línea) y no el texto indentado del archivo fuente.
    material: ()=> quad ? quad.material : null,
  };
})();

function renderizarFrame(conBrillo){ Brillo.renderizar(conBrillo); }

/* --- Matriz: geometría 3D reutilizable ---
   Antes era un único "hub" fijo en el centro. Ahora una Matriz se comporta como una sede
   especial: se puede crear más de una, y cada una se coloca donde el usuario la arrastre en la
   grilla. buildMatrizMesh() construye un ejemplar nuevo cada vez (mismo patrón que
   buildSedeMesh()), y createMatriz() (más abajo, §4B) lo instancia y lo agrega al estado. */
function buildMatrizMesh(){
  const group = new THREE.Group();
  let coreY = 0;

  // v16: modelo .glb del proveedor si está cargado; si no, la torre de primitivas de siempre
  const modelo = ModelLibrary.instanciar('matriz');
  if(modelo){
    group.add(modelo.objeto);
    coreY = modelo.dims.h;
    group.userData.dims = modelo.dims;
    group.userData.modelo = true;
  } else {
    construirMatrizPrimitiva(group);
    coreY = group.userData.dims.h;
  }
  // v47: el radio sale de la planta del modelo. Eran 2.3/2.5 fijos, pensados para la Matriz de
  // 3.0 de ancho; con 5.60 el halo quedaba DENTRO del edificio y la hitbox no lo cubría.
  const rMatriz = modelo ? Math.hypot(modelo.dims.w/2, modelo.dims.d/2) : 2.3;
  const matrizHitbox = hitboxMesh(new THREE.CylinderGeometry(rMatriz, rMatriz, coreY + 2.6, 16), 'matrizHitbox');
  matrizHitbox.position.y = (coreY + 2.6) / 2;
  group.add(matrizHitbox);

  group.add(haloRing(rMatriz + 0.2, rMatriz + 0.38, 0x22d3ee, 'matrizHalo', 0.03));

  // Puerto de conexión: desde aquí se arrastra un cable hacia otra Matriz, una sede o el Datacenter.
  const matrizPort = makePortSprite();
  colocarPuertoEnTecho(matrizPort, group.userData.dims); // T01
  group.add(matrizPort);

  // coreY se guarda en userData porque otras funciones (nombre flotante, anillo de productos,
  // efecto de "recubrimiento") necesitan conocer la altura del núcleo para posicionarse bien,
  // y cada Matriz ahora es una instancia independiente (ya no hay una variable global coreY).
  group.userData.coreY = coreY;
  return group;
}

/* Matriz de primitivas (v39): fallback de v16 cuando pn_ent_matriz.glb no está disponible. */
function construirMatrizPrimitiva(group){
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
  const hubShell = wire(hubShellGeo, colorOpaco(0x22d3ee, .45));
  hubShell.position.y = coreY * 0.62;
  hubShell.name = 'hubShell';
  group.add(hubShell);

  // segundo cascarón, más pequeño, gira en sentido contrario para dar profundidad
  const hubShell2Geo = new THREE.IcosahedronGeometry(1.25, 0);
  const hubShell2 = wire(hubShell2Geo, colorOpaco(0x67e3fa, .3));
  hubShell2.position.y = coreY * 0.62;
  hubShell2.name = 'hubShell2';
  group.add(hubShell2);

  // haz vertical sutil sobre el hub
  const beamGeo = new THREE.CylinderGeometry(0.04,0.04, 2.4, 8, 1, true);
  const beam = solid(beamGeo, { color:colorOpaco(0x22d3ee, .18), side:THREE.DoubleSide });
  beam.position.y = coreY + 1.2;
  group.add(beam);

  group.userData.dims = { w:2.0, h:coreY, d:2.0 };
}

/* --- Nube (v9 §4/§5): entidad destino de Cloud Interconnect. Representación mínima para esta
   fase — un cúmulo de esferas wireframe (silueta de nube) sobre una base, con el mismo patrón de
   hitbox/halo/puerto que una Matriz, para reutilizar selección, arrastre y cableado sin cambios.
   El catálogo de productos montables (IaaS/BaaS/DRaaS) queda para una fase siguiente: por ahora
   solo sirve como punto de conexión. --- */
function buildNubeMesh(){
  const group = new THREE.Group();
  const color = 0xa78bfa; // violeta, distinto de los tonos de Conectividad/Matriz — se lee como "otra clase de nodo"

  // v16: modelo .glb si está cargado; si no, el cúmulo de primitivas de siempre
  const modelo = ModelLibrary.instanciar('nube');
  let coreY;
  if(modelo){
    group.add(modelo.objeto);
    coreY = modelo.dims.h;
    group.userData.dims = modelo.dims;
    group.userData.modelo = true;
  } else {
    construirNubePrimitiva(group, color);
    coreY = 1.9; // altura de referencia para nombre flotante y efecto "recubrimiento"
    group.userData.dims = { w:2.3, h:coreY, d:2.3 };
  }
  // mismo name que Matriz/Datacenter: hitTest/selección son genéricos por userData
  // v47: mismo criterio que la Matriz — radio derivado de la planta, no fijo.
  const rNube = modelo ? Math.hypot(modelo.dims.w/2, modelo.dims.d/2) : 1.4;
  const nubeHitbox = hitboxMesh(new THREE.CylinderGeometry(rNube, rNube, coreY + 0.6, 16), 'matrizHitbox');
  nubeHitbox.position.y = (coreY + 0.6) / 2;
  group.add(nubeHitbox);

  // mismo name que la Matriz: updateSelectionVisuals los trata igual
  group.add(haloRing(rNube + 0.15, rNube + 0.3, color, 'matrizHalo', 0.03));

  const nubePort = makePortSprite();
  colocarPuertoEnTecho(nubePort, group.userData.dims); // T01
  group.add(nubePort);

  group.userData.coreY = coreY;
  return group;
}

/* Nube de primitivas (v39): fallback de v16 cuando pn_ent_nube.glb no está disponible. */
function construirNubePrimitiva(group, color){
  const puffs = [
    { r:0.62, pos:[-0.55, 1.05, 0.05] },
    { r:0.78, pos:[0.05, 1.25, 0] },
    { r:0.6,  pos:[0.68, 1.0, -0.1] },
    { r:0.5,  pos:[0.0, 0.78, 0.42] },
  ];
  puffs.forEach(p=>{
    const geo = new THREE.IcosahedronGeometry(p.r, 0);
    const edges = wire(geo, colorOpaco(color, .7));
    const fill = fillMesh(geo);
    edges.position.set(...p.pos); fill.position.set(...p.pos);
    group.add(edges); group.add(fill);
  });

  // base: plataforma delgada, para anclar visualmente la nube al piso de la grilla
  const baseGeo = new THREE.CylinderGeometry(1.15, 1.15, 0.12, 20);
  const baseEdges = wire(baseGeo, colorOpaco(color, .4));
  const baseFill = fillMesh(baseGeo);
  baseEdges.position.y = 0.06; baseFill.position.y = 0.06;
  group.add(baseEdges, baseFill);
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
const DATACENTER_GZ = -2; // celdas de grilla detrás del hub — se excluye de las celdas libres para sedes.
// sep/2026, pedido del cliente: venía de -5 (quedaba perdido al fondo), se probó -3 y sobre esa
// prueba pidió acercarlo una celda más. -1 no entra: el edificio y la etiqueta se enciman con una
// Matriz puesta en el centro. También mueve sola la Nube automática de Internet, que se crea en
// esta misma fila (getOrCreateNubeInternetAuto, §1).
const datacenterGroup = new THREE.Group();
const dcPos = { x: 0*GRID_SPACING, z: DATACENTER_GZ*GRID_SPACING };
datacenterGroup.position.set(dcPos.x, 0, dcPos.z);
scene.add(datacenterGroup);
state.datacenter.group = datacenterGroup;

const DC_TIERS = [ [3.0,0.55,2.2], [2.0,1.0,1.5], [1.1,0.7,0.85] ];
let dcY = 0;

/* v16: el contenido del Datacenter se arma en una función (antes era código suelto a nivel de
   archivo) porque ahora hay que poder rearmarlo cuando terminan de cargar los modelos
   (aplicarModelosAEscena). datacenterGroup NO se reemplaza — hay referencias a él en todo el
   archivo —: se vacía y se vuelve a llenar, conservando el anillo de productos. */
function construirDatacenter(){
  datacenterGroup.children.filter(o=>o.name!=='assetsContainer').forEach(o=>datacenterGroup.remove(o));
  const modelo = ModelLibrary.instanciar('datacenter');
  let w, d;
  if(modelo){
    datacenterGroup.add(modelo.objeto);
    ({ w, d } = modelo.dims);
    dcY = modelo.dims.h;
  } else {
    dcY = 0;
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
        { color: colorOpaco(i%2===0 ? 0x22d3ee : 0x4ade80, .85) });
      light.position.set(-1.2 + i*0.4, 0.3, 1.11);
      datacenterGroup.add(light);
    }
    w = DC_TIERS[0][0]; d = DC_TIERS[0][2];
  }
  datacenterGroup.userData.dims = { w, h:dcY, d };
  datacenterGroup.userData.modelo = !!modelo;
  if(state.datacenter.activo) upsertNameLabel('datacenter', datacenterGroup, dcY + 0.8, 'Datacenter Epicentro');

  // mismo name que el halo de la Matriz: updateSelectionVisuals los trata igual. Con el modelo el
  // radio sale de la diagonal de la planta, para que las esquinas no atraviesen el anillo.
  const haloR = modelo ? Math.hypot(w/2, d/2) + 0.2 : 2.2;
  datacenterGroup.add(haloRing(haloR, haloR + 0.18, 0x22d3ee, 'matrizHalo', 0.03));

  // mismo name que la Matriz: sedeId + isSedeRoot
  const dcHitbox = hitboxMesh(new THREE.BoxGeometry(Math.max(3.4, w + 0.4), dcY+0.6, Math.max(2.6, d + 0.4)), 'matrizHitbox');
  dcHitbox.position.y = (dcY+0.6)/2;
  dcHitbox.userData = { sedeId:'datacenter', isSedeRoot:true, isMatrizRoot:true };
  datacenterGroup.add(dcHitbox);

  const dcPort = makePortSprite();
  colocarPuertoEnTecho(dcPort, datacenterGroup.userData.dims); // T01
  dcPort.userData = { isPort:true, entityId:'datacenter' };
  datacenterGroup.add(dcPort);
}
construirDatacenter();

/* --- Cables entre entidades (arcos suaves con partícula viajera) ---
   Cada conexión (state.conexiones) es un producto contratado independiente, se dibuja como un
   arco delgado, de grosor FIJO, entre los "puertos" de sus 2 extremos (Sede, Matriz o
   Datacenter), que desde T01 están en el centro del techo (ver curvaDeCable). Ya NO escala su grosor/brillo según cuántos servicios tenga
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

/* --- Trazado del cable entre dos puertos de techo (T01) ---
   Bézier cúbica con los dos puntos de control EN VERTICAL sobre cada puerto: el cable sale
   hacia arriba del techo del origen, cruza por encima y baja al techo del destino. Con el
   puerto al centro del techo, eso basta para que no atraviese ni su edificio ni el del destino,
   esté donde esté el otro extremo (la curva es una combinación convexa de puntos que están
   todos por encima de ambos techos mientras recorre sus huellas).

   Lo que no garantiza la forma es un TERCER edificio en el medio (dos sedes a los lados del
   Datacenter, por ejemplo). Para eso se muestrea la curva contra la caja de cada entidad
   colocada y, si algún punto cae dentro, se sube el arco y se vuelve a probar.

   `abanico` es el desfase lateral de las conexiones repetidas entre el mismo par: corre los
   puntos de control hacia un costado, así todas nacen del mismo puerto y se separan en el aire. */
const CABLE_MUESTRAS = 48;
const CABLE_HOLGURA = 0.12;   // aire mínimo entre el tubo (con su glow) y cualquier edificio
const CABLE_SUBIDA_PASO = 0.6;
const CABLE_SUBIDA_MAX = 14;  // intentos: 14 × 0.6 = 8.4 de altura extra como máximo

function cajasDeEntidades(){
  const cajas = [];
  const p = new THREE.Vector3();
  todasLasEntidades().forEach(e=>{
    if(!e || !e.group) return;
    if(e === state.datacenter && !state.datacenter.activo) return;
    const d = dimsEntidad(e);
    e.group.getWorldPosition(p);
    cajas.push({ x0:p.x - d.w/2, x1:p.x + d.w/2, z0:p.z - d.d/2, z1:p.z + d.d/2, y1:p.y + d.h });
  });
  return cajas;
}

function puntoEnCaja(pt, c, holgura){
  return pt.x > c.x0 - holgura && pt.x < c.x1 + holgura &&
         pt.z > c.z0 - holgura && pt.z < c.z1 + holgura &&
         pt.y < c.y1 + holgura;
}

/* true si algún punto muestreado de la curva queda dentro de alguna caja */
function curvaCruzaEntidades(curve, cajas, holgura){
  const pts = curve.getPoints(CABLE_MUESTRAS);
  return pts.some(pt=> cajas.some(c=> puntoEnCaja(pt, c, holgura)));
}

function curvaDeCable(start, end, abanico, cajas){
  cajas = cajas || cajasDeEntidades();
  const dist = Math.hypot(end.x - start.x, end.z - start.z);
  const dir = new THREE.Vector3(end.x - start.x, 0, end.z - start.z);
  if(dir.lengthSq() > 1e-6) dir.normalize(); else dir.set(1, 0, 0);
  const perp = new THREE.Vector3(-dir.z, 0, dir.x); // perpendicular horizontal al cable
  let techo = Math.max(start.y, end.y) + Math.min(3, 0.9 + dist*0.12);
  let curve = null;
  for(let i=0; i<=CABLE_SUBIDA_MAX; i++){
    const c1 = new THREE.Vector3(start.x, techo, start.z).addScaledVector(perp, abanico);
    const c2 = new THREE.Vector3(end.x, techo, end.z).addScaledVector(perp, abanico);
    curve = new THREE.CubicBezierCurve3(start.clone(), c1, c2, end.clone());
    if(!curvaCruzaEntidades(curve, cajas, CABLE_HOLGURA)) break;
    techo += CABLE_SUBIDA_PASO;
  }
  return curve;
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
  const cajas = cajasDeEntidades(); // T01: una vez por reconstrucción, no por cable

  state.conexiones.forEach((c, idx)=>{
    const start = getEntityPortWorldPos(c.aId);
    const end = getEntityPortWorldPos(c.bId);
    const key = pairKey(c.aId, c.bId);
    const idxInPair = pairDrawnCount[key] || 0;
    pairDrawnCount[key] = idxInPair + 1;
    let abanico = 0;
    if(idxInPair>0){
      const side = idxInPair%2===1 ? 1 : -1;
      abanico = side * Math.ceil(idxInPair/2) * 0.55;
    }
    const curve = curvaDeCable(start, end, abanico, cajas);
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
/* Zoom con el que arranca la app y al que vuelve "Restablecer vista" (los dos usan esta misma
   constante a propósito: el botón tiene que devolver exactamente la vista de entrada).
   sep/2026, pedido del cliente: "los elementos un poco más grandes" — 1.5 = todo se ve 50% más
   grande al entrar. Es la cámara la que se acerca, NO los modelos: agrandar los modelos es
   MODELOS_ESCALA (§3B), que ya está en su tope (1.5) porque más arriba los edificios de celdas
   vecinas se chocan entre sí. El rango de zoom manual no cambia (ZOOM_MIN/ZOOM_MAX), así que
   alejarse sigue llegando igual de lejos que antes, y el encuadre del snapshot del PDF tampoco se
   toca: ese se calcula solo con fitZoomToBox() (§7). */
const ZOOM_INICIAL = 1.5;
function applyZoom(newZoom){
  zoomLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));
  camera.zoom = zoomLevel;
  camera.updateProjectionMatrix();
}
applyZoom(ZOOM_INICIAL);

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
  applyZoom(ZOOM_INICIAL);
});

/* --- Modo mano (pan): botón que alterna el gesto por defecto del arrastre entre orbitar y
   desplazar — pensado sobre todo para táctil (no requiere Ctrl/Cmd, que en desktop también
   activa pan mientras se mantiene apretado). El estado se lee desde onPointerDown más abajo. */
let panModeActive = false;
const panToggleBtn = byId('panToggle');
function setPanModeActive(active){
  panModeActive = active;
  // Apariencia del estado activo en styles.css (.zoom-btn.is-active) — antes eran estilos inline.
  panToggleBtn.classList.toggle('is-active', active);
  panToggleBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
}
panToggleBtn.addEventListener('click', ()=> setPanModeActive(!panModeActive));

/* --- Pantalla completa (fase 6 del rediseño): alterna toda la app a pantalla completa con la
   Fullscreen API (con prefijo webkit para Safari). Si el navegador no la soporta (p.ej. Safari
   en iPhone), el botón se oculta. El canvas se reajusta solo con el evento 'resize'. --- */
const fullscreenBtn = byId('fullscreenToggle');
function fullscreenElement(){
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}
function toggleFullscreen(){
  const root = document.documentElement;
  if(fullscreenElement()){
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  } else {
    const req = root.requestFullscreen || root.webkitRequestFullscreen;
    const res = req && req.call(root);
    if(res && res.catch) res.catch(()=> showToast('El navegador no permitió la pantalla completa'));
  }
}
function syncFullscreenButton(){
  const on = !!fullscreenElement();
  fullscreenBtn.classList.toggle('is-active', on);
  fullscreenBtn.title = on ? 'Salir de pantalla completa' : 'Pantalla completa';
  setTimeout(handleViewportResize, 60);
}
if(document.fullscreenEnabled || document.webkitFullscreenEnabled){
  fullscreenBtn.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', syncFullscreenButton);
  document.addEventListener('webkitfullscreenchange', syncFullscreenButton);
} else {
  fullscreenBtn.hidden = true;
}

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
    // v18: modelo .glb (Perimetral, tanda Ciberseguridad) si está cargado; si no, la primitiva de siempre.
    const modelo = IconLibrary.instanciar('escudo', color);
    if(modelo) return modelo;
    const g = new THREE.ConeGeometry(0.34, 0.55, 4);
    const mesh = wire(g, color);
    mesh.rotation.y = Math.PI/4;
    return mesh;
  },
  // Firewall On Premise (ago/2026): caja compacta de hardware de rack, con "puertos" en el
  // frente — se lee como equipo físico, a diferencia del escudo con anillo de firewall_virtual.
  firewall_onpremise: (color)=>{
    // v18: modelo .glb (tanda Ciberseguridad) si está cargado; si no, la primitiva de siempre.
    const modelo = IconLibrary.instanciar('firewall_onpremise', color);
    if(modelo) return modelo;
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
    // v20: modelo .glb (Hosting, tanda Cloud) si está cargado; si no, la primitiva de siempre.
    const modelo = IconLibrary.instanciar('nube', color);
    if(modelo) return modelo;
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
    // v23: modelo .glb (Datos, tanda Conectividad) si está cargado; si no, la primitiva de siempre.
    // El .glb es un solo cubito: los tres paquetes en diagonal los arma IconLibrary desde
    // ICONOS_GLB.enlace.repetir (§3D), no este builder.
    const modelo = IconLibrary.instanciar('enlace', color);
    if(modelo) return modelo;
    const g = new THREE.CylinderGeometry(0.05,0.05,0.6,8);
    const mesh = wire(g, color);
    mesh.rotation.z = Math.PI/2.4;
    mesh.position.y = 0.3;
    return mesh;
  },
  candado: (color)=>{
    // v18: modelo .glb (End Point, tanda Ciberseguridad) si está cargado; si no, la primitiva de siempre.
    const modelo = IconLibrary.instanciar('candado', color);
    if(modelo) return modelo;
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
    // v21: modelo .glb (Conferencia, tanda Colaboración) si está cargado; si no, la primitiva.
    // Nota (LEEME del paquete): el diseño aprobado de Conferencia ya no es literalmente una
    // pantalla — son tres participantes y una cámara. El assetKey se conserva por compatibilidad
    // con el catálogo, y porque además es el fallback de cualquier producto sin ícono (v2 §3 B12).
    const modelo = IconLibrary.instanciar('pantalla', color);
    if(modelo) return modelo;
    const g = new THREE.BoxGeometry(0.5,0.34,0.04);
    const mesh = wire(g, color);
    mesh.position.y = 0.3;
    return mesh;
  },
  nodo: (color)=>{
    // Sdwan: nodo de red inteligente (octaedro)
    // v23: modelo .glb (SD-WAN, tanda Conectividad) si está cargado; si no, la primitiva de siempre.
    // El diseño aprobado ya no es un poliedro sino tres terminales en triángulo equilátero unidos
    // por sus canales; el assetKey se conserva por compatibilidad con el catálogo.
    const modelo = IconLibrary.instanciar('nodo', color);
    if(modelo) return modelo;
    const g = new THREE.OctahedronGeometry(0.26, 0);
    const mesh = wire(g, color);
    mesh.position.y = 0.3;
    return mesh;
  },
  globo: (color)=>{
    // Internet: globo con anillos, como una red/wifi global
    // v23: modelo .glb (Internet, tanda Conectividad) si está cargado; si no, la primitiva.
    // Único de la tanda que llega solo con `mat_base`: no tiene rasgo emisivo propio y se tiñe
    // entero como cuerpo (ver LEEME.md del paquete).
    const modelo = IconLibrary.instanciar('globo', color);
    if(modelo) return modelo;
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
    // v20: modelo .glb (tanda Cloud) si está cargado; si no, la primitiva de siempre.
    const modelo = IconLibrary.instanciar('rack', color);
    if(modelo) return modelo;
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
    // v18: modelo .glb (Acceso, tanda Ciberseguridad) si está cargado; si no, la primitiva de siempre.
    // Nota (LEEME del paquete): el diseño aprobado de Acceso ya no es literalmente una llave —
    // el nombre del assetKey/archivo se conserva por compatibilidad con el catálogo.
    const modelo = IconLibrary.instanciar('llave', color);
    if(modelo) return modelo;
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
    // v18: modelo .glb (Aplicación, tanda Ciberseguridad) si está cargado; si no, la primitiva de siempre.
    // Nota (LEEME del paquete): el diseño aprobado de Aplicación ya no es literalmente un muro —
    // el nombre del assetKey/archivo se conserva por compatibilidad con el catálogo.
    const modelo = IconLibrary.instanciar('muro', color);
    if(modelo) return modelo;
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
    // v21: modelo .glb (Ofimática, tanda Colaboración) si está cargado; si no, la primitiva.
    const modelo = IconLibrary.instanciar('documento', color);
    if(modelo) return modelo;
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
    // v21: modelo .glb (Portal Cautivo, tanda Colaboración) si está cargado; si no, la primitiva.
    // Nota (LEEME del paquete): el diseño aprobado ya no es un arco sino el mismo access point de
    // `antena` más una credencial translúcida — es el único ícono del lineup que usa los 4 slots
    // de material. El assetKey se conserva por compatibilidad con el catálogo.
    const modelo = IconLibrary.instanciar('puerta', color);
    if(modelo) return modelo;
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
    // v21: modelo .glb (Zona Wireless, tanda Colaboración) si está cargado; si no, la primitiva.
    // Nota (LEEME del paquete): el diseño aprobado no tiene antenas sino aros de cobertura —
    // bandas planas de doble cara, no tubos. Se ven mal mirados exactamente a ras; con la cámara
    // ortográfica elevada de la app eso no pasa.
    const modelo = IconLibrary.instanciar('antena', color);
    if(modelo) return modelo;
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
  // v16: modelo .glb del tamaño si está cargado; si no, la caja de primitivas de siempre
  const modelo = ModelLibrary.instanciar('sede_' + tamano.id);
  let w, h, d;
  if(modelo){
    ({ w, h, d } = modelo.dims);
    group.add(modelo.objeto);
    // hitbox invisible del tamaño del modelo (antes el blanco del raycast eran las aristas)
    const hitbox = hitboxMesh(new THREE.BoxGeometry(w, h, d), 'sedeHitbox');
    hitbox.position.y = h/2;
    group.add(hitbox);
    group.userData.modelo = true;
  } else {
    [w,h,d] = tamano.box;
    const geo = new THREE.BoxGeometry(w,h,d);
    const edges = wire(geo, 0xe6edf3);
    edges.position.y = h/2;
    edges.name = 'sedeHitbox';
    group.add(edges);
    const fill = solid(geo, { color:0x1a2230 }); // T02: opaco
    fill.position.y = h/2;
    group.add(fill);
  }
  group.userData.dims = { w, h, d };

  // marcador de selección (halo), escalado según el tamaño de la sede
  const haloR = Math.max(w,d)/2 + 0.35;
  group.add(haloRing(haloR, haloR+0.15, 0x22d3ee, 'halo', 0.02, 32));

  // Puerto de conexión: desde aquí el usuario arrastra un cable hacia otra Sede, la Matriz o el Datacenter.
  const port = makePortSprite();
  colocarPuertoEnTecho(port, group.userData.dims); // T01
  group.add(port);

  return group;
}

/* --- Etiqueta de nombre flotante sobre la sede/Matriz: ver §3, sistema de etiquetas HTML
   (nameLabels/upsertNameLabel) definido junto con la escena. Se mantiene el mismo nombre de
   función que antes (updateSedeNameSprite) para no tener que tocar cada punto donde se llama al
   renombrar, cambiar de tamaño o crear una sede/Matriz. */
function updateSedeNameSprite(sede){
  const y = (sede.tipo==='matriz' || sede.tipo==='nube') ? sede.group.userData.coreY + 1.7 : dimsEntidad(sede).h + 0.85;
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
  // El canvas 2D ya está pintado en sRGB. Sin declararlo, r128 lo toma como lineal y la conversión
  // de salida (§3A-ter) le aplica gamma una segunda vez: el puerto salía lavado y casi blanco.
  texture.encoding = THREE.sRGBEncoding;
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({ map:texture, transparent:true, depthWrite:false, depthTest:false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(PORT_BASE_SCALE, PORT_BASE_SCALE, 1);
  sprite.name = 'connPort';
  sprite.renderOrder = 10; // siempre visible por encima de otros objetos, no se "esconde" detrás de una caja
  sprite.layers.enable(CAPA_PUERTOS); // v17: se redibuja DESPUÉS del halo del brillo, para que no lo lave (§3C)
  return sprite;
}
/* =========================================================================
   3E. COLOCACIÓN DE LOS ÍCONOS SOBRE LA ENTIDAD — v46
   -------------------------------------------------------------------------
   Hasta v45 los íconos de producto se repartían en un anillo horizontal que flotaba POR ENCIMA
   del edificio (radio `assetRadius` del tamaño, altura `dims.h + 0.35`). Se leían como objetos
   sueltos al lado de la sede, no como parte de ella — que es justo lo que marcó el cliente.

   La lámina de referencia del proveedor ("Revisión de protecciones") muestra que cada ícono tiene
   una relación PROPIA con el edificio, y que esa relación es parte del significado del producto:
   el escudo de Perimetral abraza la plataforma por donde entra el cable, el candado de End Point
   envuelve el edificio con sus aros, el arco de Acceso se planta sobre la ruta de conexión como
   una puerta que hay que cruzar, el panel de Aplicación se monta contra la fachada y el firewall
   físico se apoya en la plataforma como el equipo que es.

   De ahí que esto sea una TABLA por assetKey y no un solo layout: no hay una posición "correcta"
   común a los 14. Cada modo se calcula contra las medidas reales del modelo ya escalado
   (`dimsEntidad`), así que sigue funcionando si cambia MODELOS_ESCALA o si el proveedor entrega
   un modelo con otra proporción.

   Modos disponibles:
     envolver    — centrado en el edificio, escalado para rodearlo (aros del candado).
     abrazar     — a ras de piso, escalado a la huella de la plataforma (brackets del escudo).
     portico     — plantado sobre la ruta del cable, del lado del puerto, como un arco a cruzar.
     fachada     — montado contra una pared, semihundido en ella, a media altura del cuerpo.
     plataforma  — apoyado en la plataforma, pegado a la pared, repartido por el perímetro.
     cubierta    — sobre el techo (lo que "está en la nube" o irradia, no sobre el piso).

   `envolver`, `abrazar` y `portico` son de ocupación única: si dos productos de la misma entidad
   piden el mismo modo, el segundo cae a `plataforma`. `fachada` tiene 4 huecos (las 4 paredes) y
   desborda igual. `plataforma` y `cubierta` no se agotan: reparten cuantos haga falta.
   ========================================================================= */

/* Proporciones del modelo de entidad que el .glb no declara y hay que estimar: cuánto de la
   altura total es la plataforma iluminada, y cuánto de la huella total ocupa el cuerpo del
   edificio sobre ella. Medidos a ojo contra los renders del proveedor; son los dos números a
   tocar si una tanda futura cambia la proporción de las plataformas. */
const PLATAFORMA_ALTO_REL = 0.16;
const PLATAFORMA_CUERPO_REL = 0.72;

const COLOCACION_ICONOS = {
  // Ciberseguridad — las cinco de la lámina de referencia, cada una en su relación
  escudo:             { modo:'abrazar',    factor:1.15 },  // Perimetral: brackets alrededor de la plataforma
  candado:            { modo:'envolver',   factor:1.30 },  // End Point: aros que rodean el edificio
  llave:              { modo:'portico',    factor:0.95 },  // Acceso: arco sobre la ruta de conexión
  muro:               { modo:'fachada',    factor:0.74 },  // Aplicación: panel contra la pared
  firewall_onpremise: { modo:'plataforma', factor:0.42 },  // equipo físico apoyado en la plataforma
  // Firewall Virtual sigue sin modelo (el proveedor lo excluyó del lineup, v2 §3 B8): es la
  // primitiva escudo+anillo. Va a la plataforma como cualquier equipo, no `abrazar`: la
  // primitiva es un cono alto, no los brackets anchos del escudo real.
  firewall_virtual:   { modo:'plataforma', factor:0.55 },
  // Cloud
  rack:               { modo:'plataforma', factor:0.62 },
  nube:               { modo:'cubierta',   factor:0.52 },
  // Colaboración
  pantalla:           { modo:'fachada',    factor:0.76 },  // igual que el render de Conferencia
  documento:          { modo:'fachada',    factor:0.58 },
  puerta:             { modo:'plataforma', factor:0.50 },
  antena:             { modo:'cubierta',   factor:0.55 },
  // Conectividad
  enlace:             { modo:'plataforma', factor:0.46 },
  nodo:               { modo:'plataforma', factor:0.50 },
  globo:              { modo:'cubierta',   factor:0.60 },
};
const COLOCACION_DEFECTO = { modo:'plataforma', factor:0.50 };
const HUECOS_POR_MODO = { envolver:1, abrazar:1, portico:1, fachada:4 };

/* Medidas derivadas que necesita la colocación: dónde termina la plataforma y qué huella tiene
   el cuerpo del edificio sobre ella. */
function geometriaEntidad(entity){
  const d = dimsEntidad(entity);
  const plintoY = d.h * PLATAFORMA_ALTO_REL;
  return {
    w: d.w, h: d.h, d: d.d,
    plintoY,
    cuerpoW: d.w * PLATAFORMA_CUERPO_REL,
    cuerpoD: d.d * PLATAFORMA_CUERPO_REL,
    cuerpoH: Math.max(0.1, d.h - plintoY),
  };
}

/* Los íconos salen de IconLibrary con el pivote en el centro de su base (v18), así que basta la
   envolvente para escalarlos: no hay que recentrar nada. Las primitivas de fallback no cumplen
   esa promesa, y por eso se mide en vez de asumir el 0.58 de ICONOS_DIM_OBJETIVO. */
function medidaAsset(asset){
  // El ícono todavía no cuelga de la escena, así que hay que forzar las matrices: Box3 solo
  // actualiza la del objeto, no la de sus hijos, y sin esto la medida ignora escala y rotación.
  asset.updateMatrixWorld(true);
  const caja = new THREE.Box3().setFromObject(asset);
  const tam = caja.getSize(new THREE.Vector3());
  return { alto: Math.max(tam.y, 0.001), huella: Math.max(tam.x, tam.z, 0.001), tam, caja };
}
function escalarPorAltura(asset, alto){
  const m = medidaAsset(asset);
  asset.scale.multiplyScalar(alto / m.alto);
}
function escalarPorHuella(asset, huella){
  const m = medidaAsset(asset);
  asset.scale.multiplyScalar(huella / m.huella);
}

/* Las 4 caras de la entidad, en el orden en que entran en cuadro con la cámara por defecto (que
   mira desde +X/+Z): primero la frontal y la derecha, que son las dos visibles sin orbitar, y
   después las dos de atrás. `n` es la normal hacia afuera; `rotY` gira el ícono para que la cara
   que el proveedor modeló "de frente" (+Z) apunte en esa dirección. */
const CARAS_ENTIDAD = [
  { nx: 0, nz: 1, rotY: 0 },
  { nx: 1, nz: 0, rotY: Math.PI/2 },
  { nx: 0, nz:-1, rotY: Math.PI },
  { nx:-1, nz: 0, rotY:-Math.PI/2 },
];

/* Reparte `total` íconos entre las 4 caras: uno por cara hasta agotarlas, y recién entonces un
   segundo por cara, corridos lateralmente. Devuelve la cara, cuántos comparten esa cara y qué
   lugar ocupa dentro de ella, que es lo que permite centrar el grupo sobre la pared. */
function huecoPerimetral(turno, total){
  const iCara = turno % CARAS_ENTIDAD.length;
  const enCara = Math.floor(total / CARAS_ENTIDAD.length) + ((total % CARAS_ENTIDAD.length) > iCara ? 1 : 0);
  return { cara: CARAS_ENTIDAD[iCara], indice: Math.floor(turno / CARAS_ENTIDAD.length), enCara: Math.max(enCara, 1) };
}

/* Medio ancho del cuerpo en la dirección de una normal, y su medida perpendicular (la que se usa
   para correr lateralmente los íconos que comparten pared). */
function medidasCara(g, cara){
  return cara.nx !== 0
    ? { normal: g.cuerpoW/2, lateral: g.cuerpoD, normalPlinto: g.w/2 }
    : { normal: g.cuerpoD/2, lateral: g.cuerpoW, normalPlinto: g.d/2 };
}

/* Coloca UN ícono según su modo. `turno` es el índice dentro de los que comparten ese modo en
   esta entidad (0 = el primero), y `totalModo` cuántos son, para poder repartirlos.

   Los modos que apoyan el ícono contra una cara ROTAN PRIMERO y miden después: la medida que
   importa es la profundidad del ícono ya girado, no la del .glb tal como vino. Medir antes deja
   los íconos de las caras laterales hundidos o despegados de la pared. */
function colocarAsset(asset, modo, factor, g, turno, totalModo, ladoPuerto){
  const huellaCuerpo = Math.max(g.cuerpoW, g.cuerpoD);
  switch(modo){
    case 'envolver': {
      escalarPorHuella(asset, huellaCuerpo * factor);
      // Centrado en ALTURA sobre el cuerpo, no apoyado en el plinto: los aros tienen que quedar
      // a la altura del edificio, como en la lámina. Apoyarlos los deja flotando por encima.
      const m = medidaAsset(asset);
      asset.position.set(0, g.plintoY + (g.cuerpoH - m.alto)/2, 0);
      break;
    }
    case 'abrazar': {
      // Contra la huella del CUERPO, no la del plinto: escalado a la plataforma entera, los
      // brackets del escudo suben más que el edificio y dejan de leerse como algo que lo abraza.
      escalarPorHuella(asset, huellaCuerpo * factor);
      asset.position.set(0, 0.01, 0);
      break;
    }
    case 'portico': {
      escalarPorAltura(asset, g.h * factor);
      const m = medidaAsset(asset);
      // Del lado `ladoPuerto`, apenas por fuera de la plataforma. Hasta T01 ahí estaba el puerto
      // (+) y la ruta del cable; ahora el puerto está en el techo y el arco quedó en el mismo
      // lugar a la espera de T07 (jerarquía de íconos), que define dónde va cada producto.
      const radio = (ladoPuerto.x !== 0 ? g.w/2 : g.d/2) + 0.34 + m.huella*0.6;
      asset.position.set(ladoPuerto.x * radio, 0.01, ladoPuerto.z * radio);
      asset.rotation.y = ladoPuerto.x !== 0 ? Math.PI/2 : 0;
      break;
    }
    case 'fachada': {
      const { cara, indice, enCara } = huecoPerimetral(turno, totalModo);
      escalarPorAltura(asset, g.cuerpoH * factor);
      asset.rotation.y = cara.rotY;
      const m = medidaAsset(asset);
      const c = medidasCara(g, cara);
      // Semihundido: se mete en la pared el 45% de su fondo ya girado, para que se lea como
      // parte del edificio y no como una calcomanía pegada por delante.
      const fondo = Math.abs(cara.nx) ? m.tam.x : m.tam.z;
      const dNormal = c.normal - fondo*0.45 + fondo/2;
      const lateral = (indice - (enCara-1)/2) * (Math.abs(cara.nx) ? m.tam.z : m.tam.x) * 1.15;
      asset.position.set(
        cara.nx * dNormal + (cara.nx ? 0 : lateral),
        g.plintoY + (g.cuerpoH - m.alto)/2,
        cara.nz * dNormal + (cara.nx ? lateral : 0)
      );
      break;
    }
    case 'cubierta': {
      escalarPorAltura(asset, g.cuerpoH * factor);
      const m = medidaAsset(asset);
      const offset = (turno - (totalModo-1)/2) * m.huella * 1.15;
      asset.position.set(offset, g.h, 0);
      break;
    }
    default: { // 'plataforma'
      escalarPorAltura(asset, g.cuerpoH * factor);
      // La plataforma sobresale poco del cuerpo en los modelos del proveedor (~0.2 por lado en
      // Z), así que un ícono escalado solo por altura se sale del plinto y queda flotando en el
      // aire. Se acota la huella a una fracción del lado corto: apoyado y con un vuelo mínimo,
      // que es como se ve el firewall físico de la lámina.
      const huellaMax = Math.min(g.w, g.d) * 0.45;
      const m0 = medidaAsset(asset);
      if(m0.huella > huellaMax) asset.scale.multiplyScalar(huellaMax / m0.huella);
      const { cara, indice, enCara } = huecoPerimetral(turno, totalModo);
      asset.rotation.y = cara.rotY;
      const m = medidaAsset(asset);
      const c = medidasCara(g, cara);
      const fondo = Math.abs(cara.nx) ? m.tam.x : m.tam.z;
      // Pegado a la pared, pero sin pasarse del plinto: en Z la plataforma sobra apenas ~0.19
      // por lado, así que el ícono se recuesta contra el edificio en vez de quedar en el aire.
      // El max() es el tope del tope: cuando el ícono es más ancho que ese sobrante, quedarse
      // dentro del plinto significaría meterlo DENTRO del edificio. Entre volar un poco sobre el
      // borde y atravesar la pared, vuela: solo se le permite solaparse un 15% de su fondo.
      const dNormal = Math.max(
        c.normal + fondo*0.15,
        Math.min(c.normal + fondo/2 + 0.04, c.normalPlinto - fondo/2)
      );
      const lateral = (indice - (enCara-1)/2) * (Math.abs(cara.nx) ? m.tam.z : m.tam.x) * 1.2;
      asset.position.set(
        cara.nx * dNormal + (cara.nx ? 0 : lateral),
        g.plintoY,
        cara.nz * dNormal + (cara.nx ? lateral : 0)
      );
      break;
    }
  }
}

function refreshSedeAssets(sede){
  // limpiar assets previos
  const old = sede.group.getObjectByName('assetsContainer');
  if(old) sede.group.remove(old);
  const container = new THREE.Group();
  container.name = 'assetsContainer';

  const g = geometriaEntidad(sede);
  // Lado donde se planta el `portico` de Acceso: +Z en el Datacenter, +X en el resto. Era el
  // lado del puerto hasta T01; se conserva para no mover íconos antes de T07.
  const ladoPuerto = sede.tipo === 'datacenter' ? { x:0, z:1 } : { x:1, z:0 };

  const propias = sede.instancias;
  // Productos heredados de Matrices conectadas (solo aplica a sedes reales, no a las Matrices
  // mismas). Se filtran referencias huérfanas por si el producto ya no existe en ninguna Matriz.
  const heredadas = sede.tipo==='matriz' ? [] :
    (sede.herenciaIds||[]).map(hid=>findInstanciaEnMatrices(hid)).filter(Boolean);

  // 1ª pasada: resolver el modo de cada instancia y repartir los huecos. Los modos de ocupación
  // única se asignan por orden de llegada; el que no entra cae a 'plataforma', que no se agota.
  const usados = {};
  const planeadas = [...propias.map(i=>({inst:i, heredado:false})), ...heredadas.map(i=>({inst:i, heredado:true}))]
    .map(entrada=>{
      const sub = getSubproducto(entrada.inst.subproductoId);
      const producto = getProducto(sub.productoNivel2Id);
      const clave = sub.assetKey || producto.assetKey;
      let col = COLOCACION_ICONOS[clave] || COLOCACION_DEFECTO;
      const tope = HUECOS_POR_MODO[col.modo];
      if(tope !== undefined && (usados[col.modo]||0) >= tope) col = COLOCACION_DEFECTO;
      usados[col.modo] = (usados[col.modo]||0) + 1;
      return { ...entrada, sub, producto, clave, modo: col.modo, factor: col.factor, turno: usados[col.modo]-1 };
    });
  const totalPorModo = planeadas.reduce((acc,p)=>{ acc[p.modo]=(acc[p.modo]||0)+1; return acc; }, {});

  // 2ª pasada: construir, colocar y etiquetar
  planeadas.forEach(p=>{
    // Un subproducto puede tener su propio `assetKey` (ago/2026: Firewall Virtual/On Premise,
    // ver AssetRegistry) para distinguirse de sus hermanos, que por defecto comparten el ícono
    // del Producto (N2) — ver comentario del §1 del catálogo.
    const build = AssetRegistry[p.clave] || AssetRegistry.pantalla;
    const asset = build(getSubproductoColor(p.sub));
    colocarAsset(asset, p.modo, p.factor, g, p.turno, totalPorModo[p.modo], ladoPuerto);

    if(p.heredado){
      // estilo "fantasma": mismo ícono/color, pero translúcido, y no editable desde la sede
      // (el producto pertenece a la Matriz; se edita/elimina desde allí).
      asset.traverse(o=>{
        if(o.material){ o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.5; }
      });
      const ud = { sedeId: sede.id, matrizInstanciaId: p.inst.instanciaId, isHeredadoAsset:true };
      asset.userData = ud;
      asset.traverse(o=>{ o.userData.sedeId=ud.sedeId; o.userData.matrizInstanciaId=ud.matrizInstanciaId; o.userData.isHeredadoAsset=true; });
    } else {
      const ud = { sedeId: sede.id, instanciaId: p.inst.instanciaId, isAsset:true };
      asset.userData = ud;
      asset.traverse(o=>{ o.userData.sedeId=ud.sedeId; o.userData.instanciaId=ud.instanciaId; o.userData.isAsset=true; });
    }
    container.add(asset);
  });

  sede.group.add(container);
}

/* =========================================================================
   4. GESTIÓN DE SEDES (crear, seleccionar, drag&drop)
   ========================================================================= */

function gridToWorld(gx,gz){ return { x: gx*GRID_SPACING, z: gz*GRID_SPACING }; }

/* --- Ocupación de la grilla POR HUELLA REAL (v47) ---------------------------------------------
   Hasta v46 la grilla razonaba por celda suelta: una entidad ocupaba su celda y nada más. Eso
   funcionaba mientras toda entidad entrara holgada en los 4 de GRID_SPACING. Con los tamaños de
   v47 ya no entran: el Datacenter mide 8 (dos celdas exactas), la Matriz 5.60 y la Sede Grande
   4.56. Con la regla vieja, dos Sedes Grandes vecinas se solapan medio metro y el Datacenter
   invade las dos celdas de al lado, cada una "libre" según la grilla.

   Así que `occupied` pasa a comparar RECTÁNGULOS: la huella que tendría lo que se quiere colocar
   contra la huella real de todo lo ya colocado, con un aire mínimo entre plataformas. Esto es lo
   que permite subir los tamaños sin tocar GRID_SPACING: las entidades siguen encajando en la
   grilla, solo que las grandes reservan de hecho la celda vecina.

   Consecuencia buscada: la grilla se llena más rápido. Una Matriz y una Sede Grande consumen dos
   celdas de ancho cada una, así que colocar muchas entidades obliga a repartirse más en Z. */
const HOLGURA_ENTIDADES = 0.35; // aire mínimo entre dos plataformas vecinas

function huellaEnCelda(gx, gz, w, d){
  const c = gridToWorld(gx, gz);
  return { x0: c.x - w/2, x1: c.x + w/2, z0: c.z - d/2, z1: c.z + d/2 };
}
function huellaDeColocada(entity){
  const d = dimsEntidad(entity);
  return huellaEnCelda(entity.gx, entity.gz, d.w, d.d);
}
function seSolapan(a, b){
  return a.x0 < b.x1 + HOLGURA_ENTIDADES && b.x0 < a.x1 + HOLGURA_ENTIDADES &&
         a.z0 < b.z1 + HOLGURA_ENTIDADES && b.z0 < a.z1 + HOLGURA_ENTIDADES;
}

/* Cuánto va a medir una entidad ANTES de construirla. Si el .glb de esa clave no está cargado,
   cae a la medida de su primitiva, que es lo que se va a dibujar en ese caso. */
const HUELLA_PRIMITIVA = {
  sede_pequeno:{ w:1.2, d:1.2 }, sede_mediano:{ w:1.7, d:1.7 }, sede_grande:{ w:2.4, d:2.4 },
  matriz:{ w:2.0, d:2.0 }, nube:{ w:2.3, d:2.3 }, datacenter:{ w:3.0, d:2.2 },
};
function huellaDeClave(clave){
  const d = ModelLibrary.dims(clave);
  return d ? { w:d.w, d:d.d } : (HUELLA_PRIMITIVA[clave] || HUELLA_PRIMITIVA.sede_mediano);
}
function huellaDeSedePorEmpleados(empleados){
  return huellaDeClave('sede_' + tamanoPorEmpleados(Math.max(1, Math.round(empleados || EMPLEADOS_DEFAULT))).id);
}

/* `huella` es el tamaño de lo que se quiere colocar (huellaDeClave / dimsEntidad). Sin ella se
   asume una sede mediana, que es el tamaño con el que se arrastra por defecto. */
function occupied(gx, gz, excludeId, huella){
  const h = huella || huellaDeClave('sede_mediano');
  const caja = huellaEnCelda(gx, gz, h.w, h.d);
  if(state.datacenter.activo){
    const dcDims = datacenterGroup.userData.dims || { w:3, d:2.2 };
    if(seSolapan(caja, huellaEnCelda(0, DATACENTER_GZ, dcDims.w, dcDims.d))) return true;
  }
  return todasLasEntidades().some(e=>
    e && e.id !== excludeId && e.id !== 'datacenter' && e.group && seSolapan(caja, huellaDeColocada(e)));
}

/* Busca la celda libre más cercana recorriendo anillos alrededor de la pedida. Hasta v46 el
   barrido era solo en X (gx += ±1), que alcanzaba cuando cada entidad ocupaba una celda; ahora que
   las grandes reservan dos, una fila se agota rápido y hay que poder bajar a la siguiente. */
function nearestFreeCell(worldX, worldZ, excludeId, huella){
  const gx0 = Math.round(worldX/GRID_SPACING);
  const gz0 = Math.round(worldZ/GRID_SPACING);
  if(!occupied(gx0, gz0, excludeId, huella)) return { gx:gx0, gz:gz0 };
  for(let r=1; r<=8; r++){
    const candidatos = [];
    for(let dx=-r; dx<=r; dx++){
      for(let dz=-r; dz<=r; dz++){
        if(Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        candidatos.push({ gx:gx0+dx, gz:gz0+dz, dist: dx*dx + dz*dz });
      }
    }
    candidatos.sort((a,b)=>a.dist-b.dist);
    const libre = candidatos.find(c=>!occupied(c.gx, c.gz, excludeId, huella));
    if(libre) return { gx:libre.gx, gz:libre.gz };
  }
  return { gx:gx0, gz:gz0 };
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
  Object.assign(group.userData, { sedeId:id, isSedeRoot:true }); // Object.assign: conserva userData.dims del builder (v16)
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
function rebuildSedeMeshIfNeeded(sede, newTamanoId, forzar){
  if(sede.tamano === newTamanoId && !forzar){ updateSedeNameSprite(sede); return; }
  sede.tamano = newTamanoId;
  const pos = sede.group.position.clone();
  const wasSelected = state.selectedSedeIds.includes(sede.id);
  scene.remove(sede.group);
  const group = buildSedeMesh(newTamanoId);
  group.position.copy(pos);
  Object.assign(group.userData, { sedeId: sede.id, isSedeRoot:true });
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

/* --- Diálogo propio (Dialog del design system, fase 7a del rediseño) ---
   Reemplaza confirm() y prompt() del navegador, que no se pueden diseñar. showDialog devuelve
   una promesa con { ok, value }: ok=true si se confirmó, value = texto del campo (si lo hay).
   Escape o clic fuera cancelan; Enter en el campo confirma. */
const dialogOverlay = byId('dialogOverlay');
const dialogTitleEl = byId('dialogTitle');
const dialogBodyEl = byId('dialogBody');
const dialogFieldEl = byId('dialogField');
const dialogFieldLabelEl = byId('dialogFieldLabel');
const dialogInputEl = byId('dialogInput');
const dialogCancelBtn = byId('dialogCancel');
const dialogConfirmBtn = byId('dialogConfirm');
let dialogResolve = null;
function showDialog({ title, body='', confirmText='Aceptar', cancelText='Cancelar', danger=false, input=null }){
  if(dialogResolve) closeDialog(false);
  dialogTitleEl.textContent = title;
  dialogBodyEl.textContent = body;
  dialogBodyEl.hidden = !body;
  dialogFieldEl.hidden = !input;
  dialogInputEl.value = input && input.value ? input.value : '';
  dialogInputEl.placeholder = input && input.placeholder ? input.placeholder : '';
  dialogFieldLabelEl.textContent = input && input.label ? input.label : '';
  dialogConfirmBtn.textContent = confirmText;
  dialogCancelBtn.textContent = cancelText;
  dialogConfirmBtn.classList.toggle('danger-outline', danger);
  dialogConfirmBtn.classList.toggle('primary', !danger);
  dialogOverlay.classList.add('show');
  (input ? dialogInputEl : (danger ? dialogCancelBtn : dialogConfirmBtn)).focus();
  return new Promise(resolve=>{ dialogResolve = resolve; });
}
function closeDialog(ok){
  if(!dialogResolve) return;
  const resolve = dialogResolve;
  dialogResolve = null;
  dialogOverlay.classList.remove('show');
  resolve({ ok, value: dialogInputEl.value });
}
dialogConfirmBtn.addEventListener('click', ()=>closeDialog(true));
dialogCancelBtn.addEventListener('click', ()=>closeDialog(false));
dialogOverlay.addEventListener('click', (e)=>{ if(e.target===dialogOverlay) closeDialog(false); });
document.addEventListener('keydown', (e)=>{
  if(!dialogResolve) return;
  if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); closeDialog(false); }
  else if(e.key==='Enter' && document.activeElement===dialogInputEl){ e.preventDefault(); e.stopPropagation(); closeDialog(true); }
}, true);
/* Confirmación de borrado: título corto + el mismo texto que antes usaba confirm(). */
function confirmDialog(opts){
  return showDialog(Object.assign({ confirmText:'Eliminar', danger:true }, opts)).then(r=>r.ok);
}
/* Proveedor de una Nube nueva (antes prompt()). "Omitir" deja el nombre vacío, igual que
   cancelar el prompt: createNube le pone un nombre genérico numerado. */
function pedirProveedorNube(){
  return showDialog({
    title:'Nueva Nube',
    body:'¿Con qué proveedor es este Hosting/Nube?',
    input:{ label:'Proveedor', placeholder:'Ej. AWS, Azure, GCP…' },
    confirmText:'Crear Nube', cancelText:'Omitir',
  }).then(r=> r.ok ? (r.value || '').trim() : '');
}

function placeSedeAtClientPoint(clientX, clientY){
  const point = pickGroundPoint({ clientX, clientY });
  if(!point) return;
  const {gx,gz} = nearestFreeCell(point.x, point.z, null, huellaDeSedePorEmpleados(EMPLEADOS_DEFAULT));
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
  const {gx,gz} = nearestFreeCell(point.x, point.z, null, huellaDeClave('matriz'));
  createMatriz(gx, gz);
}

/* Crear una Nube directamente desde el catálogo (v9 §5), sin pasar por el dropdown de Cloud
   Interconnect — mismo patrón de arrastre que Sede/Matriz. Pide el proveedor con un prompt de
   texto libre, igual que "+ Agregar nueva Nube" en el dropdown (misma función createNube). */
function placeNubeAtClientPoint(clientX, clientY){
  const point = pickGroundPoint({ clientX, clientY });
  if(!point) return;
  pedirProveedorNube().then(nombre=>{
    const {gx,gz} = nearestFreeCell(point.x, point.z, null, huellaDeClave('nube'));
    createNube(nombre, gx, gz);
  });
}
/* Efecto "recubrimiento": al soltar un producto sobre una sede/Matriz/Datacenter, antes de abrir
   el popup se ve brevemente cómo el edificio se cubre con el color del producto (como si lo
   estuviera "vistiendo"), y solo entonces se abre el formulario para completar sus atributos. */
function playWrapEffect(entityId, subproductoId, onDone){
  const entity = getSedeById(entityId);
  const sub = getSubproducto(subproductoId);
  const color = getSubproductoColor(sub);
  let w=1.8, h=1.8, d=1.8;
  if(entity.group.userData.modelo){
    // v16: con modelo, el recubrimiento abraza el edificio real (su planta no es cuadrada)
    const dims = dimsEntidad(entity);
    w = dims.w + 0.35; h = dims.h + 0.2; d = dims.d + 0.35;
  }
  else if(entity.tipo==='matriz'){ w = d = 4.6; h = entity.group.userData.coreY + 0.5; }
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
      ghost.style.background = ghostColor || 'var(--pn-color-cyan)';
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
    place:placeSedeAtClientPoint,   ghostLabel:'Sede',   ghostColor:'var(--pn-color-cyan)' },
  { elementId:'matrizDragCard', tipo:'matriz', hint:'Toca el canvas para colocar la Matriz',
    place:placeMatrizAtClientPoint, ghostLabel:'Matriz', ghostColor:'var(--pn-color-focus)' },
  { elementId:'nubeDragCard',   tipo:'nube',   hint:'Toca el canvas para colocar la Nube',
    place:placeNubeAtClientPoint,   ghostLabel:'Nube',   ghostColor:'var(--pn-color-white)' },
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
  // T01: sobre un destino válido se previsualiza el mismo arco que va a quedar dibujado; mientras
  // sigue al cursor es una recta, porque el cursor no es un techo.
  const pts = valid ? curvaDeCable(from, to, 0).getPoints(32) : [from, to];
  tempCableLine.geometry = new THREE.BufferGeometry().setFromPoints(pts);
  setColorUI(tempCableLine.material, valid ? 0x4ade80 : 0x22d3ee); // §3A-ter: .set() crudo pisaría la conversión a lineal
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
      // El cable manual desde el puerto siempre es un Canal de Conexión (ver
      // tipoConexionPorDestino, ago/2026) — no sabe de Nubes (v9 §4), así que una Nube no puede
      // ser origen de este gesto. Conectar una Nube es solo vía el dropdown "Conectar a" de
      // Cloud Interconnect (candidatosConexionEntreSedes).
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
        const subproductoId = tipoConexionPorDestino();
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
      const {gx,gz} = nearestFreeCell(movingSede.group.position.x, movingSede.group.position.z, movingSede.id, dimsEntidad(movingSede));
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
  animarModelos(t);
  actualizarReflejosPiso(); // v18-bis: piso con reflejo falso (§3A-bis)

  // pulso sutil en los puertos de conexión, para invitar a arrastrar desde ahí
  const portPulse = 1 + Math.sin(t*3) * 0.14;
  scene.traverse(o=>{
    if(o.userData && o.userData.isPort) o.scale.setScalar(PORT_BASE_SCALE * portPulse);
    normalizarMaterialesUI(o); // §3A-ter: mantiene cables, halos, badges y sprites fuera de la curva filmica
  });

  renderizarFrame(true); // v17: escena + bloom de los emisivos (§3C)
  updateNameLabelPositions();
}
animate();

/* --- v16: carga de modelos .glb ---
   La escena arranca de inmediato con las primitivas (el Datacenter ya está dibujado). Cuando los
   modelos terminan de cargar — con los datos embebidos es cuestión de milisegundos —, cada
   entidad que ya exista se reconstruye con su modelo, conservando posición, productos,
   conexiones y selección. Las que se creen después ya nacen con el modelo. */
function reconstruirGrupoEntidad(entity, build){
  const group = build();
  group.position.copy(entity.group.position);
  scene.remove(entity.group);
  scene.add(group);
  entity.group = group;
  tagEntityGroup(group, entity.id);
  refreshSedeAssets(entity);
  updateSedeNameSprite(entity);
}
function aplicarModelosAEscena(){
  construirDatacenter();
  refreshSedeAssets(state.datacenter);
  if(!state.datacenter.activo) datacenterGroup.visible = false;
  state.sedes.forEach(sede=> rebuildSedeMeshIfNeeded(sede, sede.tamano, true));
  state.matrices.forEach(m=> reconstruirGrupoEntidad(m, buildMatrizMesh));
  state.nubes.forEach(n=> reconstruirGrupoEntidad(n, buildNubeMesh));
  rebuildConnections();
  updateSelectionVisuals();
  invalidarReflejosPiso(); // §3A-bis: construirDatacenter() reconstruye datacenterGroup EN el mismo
  // objeto (no reasigna .group), así que el chequeo "origen !== entity.group" de
  // actualizarReflejosPiso() no alcanza a notar el cambio por sí solo — se fuerza acá.
}
const modelosListos = ModelLibrary.precargar().then(estado=>{
  if(estado !== 'sin_modelos') aplicarModelosAEscena();
  return estado;
});
/* v18: misma estrategia que modelosListos, pero para los íconos de producto (§3D), en su propia
   promesa — deliberadamente SIN tocar el contrato de modelosListos (los smoke tests existentes
   lo esperan resuelto como un string de estado de las 6 entidades nada más). Si una sede/Matriz
   ya tiene productos asignados y sus íconos llegan después de dibujarse, aplicarModelosAEscena()
   los reconstruye igual que hace con las entidades. */
const iconosListos = IconLibrary.precargar().then(estado=>{
  if(estado !== 'sin_modelos') aplicarModelosAEscena();
  return estado;
});

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
/* El color, el símbolo y el glow de cada categoría viven en styles.css (.salud-row--<vertical>),
   según el design system: Conectividad mint, Cloud cyan, Ciberseguridad coral, Colaboración lime. */

const saludBarsEl = byId('saludBars');
const saludGlobalBadgeEl = byId('saludGlobalBadge');
function renderSaludPanel(){
  const porVertical = saludPorVertical();
  saludGlobalBadgeEl.textContent = saludGlobal() + '%';
  saludBarsEl.innerHTML = '';
  porVertical.forEach(v=>{
    const row = document.createElement('div');
    row.className = 'salud-row salud-row--' + v.vertical.id;
    row.title = `${v.vertical.nombre}: ${v.asignados} de ${v.total} productos (${v.pct}%)`;
    // El ancho de la barra es el único valor que se calcula en tiempo de ejecución (inline, como antes).
    row.innerHTML = `
      <span class="salud-icon" aria-hidden="true"></span>
      <span class="salud-main">
        <span class="salud-head">
          <span class="salud-label">${v.vertical.nombre}</span>
          <span class="salud-count">${v.asignados}/${v.total}</span>
        </span>
        <span class="salud-bar-track"><span class="salud-bar-fill" style="width:${v.pct}%;"></span></span>
      </span>`;
    saludBarsEl.appendChild(row);
  });
}

/* Catálogo del panel izquierdo (design system, fase 3b): acordeón por Vertical (solo una abierta
   a la vez). Cada Vertical es una cápsula con su medallón metálico; al abrirse muestra un
   desplegable con los Productos (N2) como encabezados de familia y cada Subproducto (N3) como
   una cápsula arrastrable con su pictograma, nombre y agarre. Las badges DC / NUBE siguen
   indicando sobre qué entidades se puede soltar. Al soltarse sobre una sede o una Matriz en el
   canvas, abre el popup de asignación (ver §5, drop handler). */
let catalogOpenVerticalId = VERTICALES[0].id;

/* Pictograma del design system (assets/ui/icons) para cada Subproducto. Asignación provisional
   hasta tener el catalog.json del paquete de entrega; si falta una clave se usa el símbolo de la
   categoría. */
const ICONO_UI_SUBPRODUCTO = {
  canal_conexion:'cliente_datos', cloud_interconnect:'cloud_interconnect', sdwan:'sdwan',
  tunel_ipsec:'red_cloud', internet_corporativo:'internet', internet_startup:'router',
  internet_teleworking:'portatil', puntonet_space:'wifi_equipo',
  collocation:'housing', crossconexion:'ethernet', iaas:'hosting', baas:'guardar', draas:'cloud_descarga',
  firewall_on_premise:'firewall', firewall_iaas:'cloud_seguro', internet_seguro:'navegador',
  edr:'endpoint', xdr:'inspeccion', seguridad_movil:'movil_cloud', correo_electronico:'correo_cloud',
  mfa:'credencial', waf:'app_segura', dns_ddos:'internet_cloud',
  conferencia:'conferencia', ofimatica:'ofimatica', portal_cautivo:'ventana', zona_wireless:'antena',
};
const ICONO_UI_VERTICAL = {
  conectividad:'categoria_conectividad', cloud:'categoria_cloud',
  ciberseguridad:'categoria_seguridad', colaboracion:'cliente_personas',
};
function iconoUiSubproducto(s){
  const p = PRODUCTOS.find(x=>x.id===s.productoNivel2Id);
  const key = ICONO_UI_SUBPRODUCTO[s.id] || (p && ICONO_UI_VERTICAL[p.verticalId]) || 'categoria_networking';
  return `assets/ui/icons/${key}.svg`;
}

function renderCatalogPanel(){
  const container = byId('productLegend');
  container.innerHTML = '';
  VERTICALES.forEach(v=>{
    const isOpen = catalogOpenVerticalId === v.id;
    const vBlock = document.createElement('div');
    vBlock.className = 'catalog-vertical' + (isOpen ? ' open' : '');

    const vHeader = document.createElement('button');
    vHeader.type = 'button';
    vHeader.className = 'catalog-vertical-header';
    vHeader.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    vHeader.innerHTML = `<span class="catalog-medallion catalog-medallion--${v.id}" aria-hidden="true"></span>`
      + `<span class="catalog-vertical-name">${v.nombre}</span>`
      + `<span class="catalog-vertical-arrow" aria-hidden="true">${isOpen ? '⌄' : '›'}</span>`;
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
      pLabel.textContent = p.nombre;
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
        chip.innerHTML = `<img class="catalog-chip-icon" src="${iconoUiSubproducto(s)}" alt="" draggable="false">`
          + `<span class="catalog-chip-label"></span>`
          + `<span class="catalog-chip-grip" aria-hidden="true"></span>`;
        chip.querySelector('.catalog-chip-label').textContent = s.nombre;
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
        chipItem.appendChild(chip);
        // Mini badges: sobre qué entidades especiales se puede soltar este producto.
        const destinos = destinosPermitidos(s);
        const badges = document.createElement('div');
        badges.className = 'chip-badges';
        if(destinos.includes('datacenter')){
          const badge = document.createElement('span');
          badge.className = 'chip-dc-badge';
          badge.textContent = 'DC';
          badges.appendChild(badge);
        }
        if(destinos.includes('nube')){
          const badge = document.createElement('span');
          badge.className = 'chip-dc-badge badge-nube';
          badge.textContent = 'NUBE';
          badges.appendChild(badge);
        }
        if(badges.childElementCount) chipItem.appendChild(badges);
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
  navActions.innerHTML = '';

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
  // Design system (fase 4a): el nombre va solo, grande; el tipo de entidad pasa a la línea de
  // abajo y el render de la entidad se muestra arriba (clase detail-asset--<tipo>).
  const esNubeAuto = isNube && getNubeById(singleId) && getNubeById(singleId).esAutoInternet;
  navSedeLabel.textContent = isDatacenter ? 'Datacenter Epicentro'
    : ids.length===1 ? (nombres[0] || '(sin nombre)')
    : `${ids.length} entidades seleccionadas`;
  navSedeLabel.classList.toggle('is-multi', ids.length>1);
  navSedeSub.textContent = isMatriz ? 'Matriz'
    : isNube ? (esNubeAuto ? 'Nube · automática de Internet' : 'Nube')
    : isDatacenter ? 'Datacenter Puntonet'
    : ids.length===1 ? 'Sede'
    : nombres.join(' · ');
  const assetTipo = isMatriz ? 'matriz' : isNube ? 'nube' : isDatacenter ? 'epicentro' : isSedeSingle ? 'sede' : '';
  navAsset.className = 'detail-asset' + (assetTipo ? ' detail-asset--' + assetTipo : '');

  matrizHintEl.style.display = (isMatriz || isNube || isDatacenter) ? 'block' : 'none';
  matrizHintEl.textContent = isMatriz
    ? 'Arrastra un producto desde el panel izquierdo sobre esta Matriz para agregarlo como producto propio.'
    : isNube
      ? 'Arrastra un producto de Hosting (IaaS/BaaS/DRaaS) desde el panel izquierdo sobre esta Nube para agregarlo como producto propio.'
      : isDatacenter
      ? 'Arrastra sobre el Datacenter un producto de Cloud (Housing/Hosting), un Canal de Conexión, un Internet Corporativo o un producto de seguridad (Firewall On Premise/IaaS, WAF, DNS/DDoS) para agregarlo como producto propio. También puedes tender un cable a mano desde el puerto (●) de una sede o Matriz hasta aquí.'
      : '';

  renderSedeEditBox(isSedeSingle ? getSedeById(singleId) : null);
  renderMatrizEditBox(isMatriz ? getMatrizById(singleId) : null);
  renderNubeEditBox(isNube ? getNubeById(singleId) : null);
  renderDatacenterEditBox(isDatacenter ? state.datacenter : null);
  renderConnectionsBox(singleId);
  renderHerenciaBox(isSedeSingle ? getSedeById(singleId) : null);
  // Design system (fase 4b): el botón "Eliminar …" de cada bloque va al pie del panel, después
  // de conexiones y productos. Se mueve el mismo nodo, así que conserva su listener.
  navContent.querySelectorAll('.editBox > .btn.danger-outline').forEach(btn=>navActions.appendChild(btn));

  if(ids.length===1){
    const entity = getSedeById(ids[0]);
    instanceSectionTitle.textContent = isMatriz ? 'Productos de la Matriz'
      : isNube ? 'Productos de la Nube'
      : isDatacenter ? 'Productos del Datacenter'
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
        row.innerHTML = `<img class="inst-icon" src="${iconoUiSubproducto(sub)}" alt="">
          <span class="inst-body">
            <span class="inst-name">${nombreMostrado}</span>
            <span class="inst-vertical">${vertical.nombre}</span>
          </span>
          <button type="button" class="inst-delete" title="Quitar producto" aria-label="Quitar ${escapeHtml(sub.nombre)}">−</button>`;
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
    const iconSrc = tipoSub ? iconoUiSubproducto(tipoSub) : 'assets/ui/icons/categoria_networking.svg';
    const tipoLabel = tipoSub ? tipoSub.nombre + (c.esBackup ? ' (Backup)' : '') : (c.esBackup ? 'Backup' : '');
    const sdwanAplicado = buscarSdwanQueApuntaA(c.id);
    const sdwanTag = sdwanAplicado ? `<span class="connSdwan" title="Sdwan balanceando este canal">⚡ Sdwan</span>` : '';
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
      <img class="connIcon" src="${iconSrc}" alt="">
      <span class="connBody">
        <span class="connName">${escapeHtml(nombreEntidad(otro))}</span>
        ${tipoLabel ? `<span class="connTipo">${tipoLabel}</span>` : ''}
        ${detalle ? `<span class="connValor">${detalle}</span>` : ''}
        ${sdwanTag}
      </span>
      <span class="connActions">
        <button type="button" class="connArrow" title="Editar" aria-label="Editar conexión"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4"/></svg></button>
        <button type="button" class="connDelete" title="${c.esBackup ? 'Quitar este enlace de backup' : 'Eliminar conexión (y el servicio asignado que representa)'}">−</button>
      </span>`;
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
    navSedeLabel.textContent = sede.nombre || '(sin nombre)';
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
    confirmDialog({ title:'Eliminar sede',
      body:`¿Eliminar "${sede.nombre}" y todo lo que tiene asignado (productos y conexiones)? Esta acción no se puede deshacer.` })
      .then(ok=>{ if(ok) deleteSede(sede); });
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
      const checked = sede.herenciaIds.includes(inst.instanciaId);
      return `<label class="herenciaRow">
        <input type="checkbox" class="herenciaCheck" data-inst="${inst.instanciaId}" ${checked?'checked':''}>
        <img class="herenciaIcon" src="${iconoUiSubproducto(sub)}" alt="">
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
    version: 14, // v14: cada Matriz exporta su `concentrador` calculado (total + desglose por
                 // canal). Es dato derivado, no editable — se incluye para que quien consuma el
                 // JSON no tenga que reimplementar la regla de "los backups no suman".
                 // v13: Sdwan se aplica sobre un canal EXISTENTE elegido por el vendedor
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
  renderizarFrame(BRILLO_EN_PDF); // v17: sin efectos por decisión (v2 §7.4); cambiar el booleano los incluye

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
    // sep/2026 (pedido cliente 03/09): el backup hereda el ancho de banda del canal principal —
    // se imprimen las MISMAS propiedades que el principal (es la misma instancia), que era
    // justamente lo que faltaba en el reporte.
    const backupConexion = state.conexiones.find(c=>c.instanciaId===inst.instanciaId && c.esBackup);
    if(backupConexion){
      const backupDestinoTxt = `  →  ${nombreEntidad(otroExtremo(backupConexion, backupConexion.ownerId))}`;
      addLine(`${inst.nombreSubproducto} (Backup)${backupDestinoTxt}  —  ${vertical.nombre} · ${producto.nombre}`,
        { bold:true, size:10.5, color:[20,24,30] });
      const notaConcentrador = sub.sumaConcentrador
        ? ' No suma al concentrador: es el respaldo del mismo canal, no capacidad adicional.' : '';
      addLine(`Enlace de respaldo en paralelo — hereda las propiedades del canal principal (misma contratación que ${inst.nombreSubproducto}).${notaConcentrador}`,
        { size:9, color:[130,138,150] });
      if(props) addLine(props, { size:9, color:[90,98,110] });
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
      // Concentrador (sep/2026): mismo criterio que en el reporte en pantalla — va antes de los
      // productos propios y se omite si no llega ningún canal.
      const conc = concentradorDe(matriz.id);
      if(conc.enlaces.length>0){
        addLine(`Concentrador: ${conc.texto}  (calculado — no es un producto contratable)`,
          { bold:true, size:10.5, color:[20,24,30] });
        const notaBackup = conc.conBackup>0
          ? ` ${conc.conBackup} de ${conc.enlaces.length} canal(es) tiene(n) Backup: el respaldo hereda el mismo ancho de banda, pero no suma al concentrador.` : '';
        addLine(`Suma de los ${conc.enlaces.length} Canal(es) de Conexión que llegan a esta Matriz.${notaBackup}`,
          { size:9, color:[130,138,150] });
        addLine(conc.enlaces.map(e=>
          `${e.origen}: ${formatAnchoBandaMbps(e.mbps) || 'sin ancho de banda'}${e.tieneBackup ? ' (+ backup)' : ''}`
        ).join('   ·   '), { size:9, color:[90,98,110] });
        y += 6;
      }
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