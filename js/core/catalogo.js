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
    parametrosTipos:{ 'Con/sin firewall':'checkbox' },
    // 25/09 (Dei): ícono 3D propio — la antena satelital plana (pn_ico_puntonet_space.glb) en el
    // techo, de donde nacen las ondas. Deja de apilarse con los globos de Internet.
    assetKey:'puntonet_space' },
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
  // Firewall On Premise: tuvo ícono propio ('firewall_onpremise', ago/2026). Desde el 25/09 (Dei)
  // los TRES de Perimetral (On Premise, IaaS, Internet Seguro) usan las paredes del escudo, cada
  // uno con su color, anidadas hacia afuera (ver COLOCACION_ICONOS.escudo, `pilaAnidada`).
  // ago/2026 (pedido cliente 28/08): "Firewall, también datacenter, on premise e IaaS, ambos" —
  // los dos suman el Datacenter Epicentro a sus destinos (el equipo físico se instala en el rack
  // del cliente dentro del DC; el virtual protege el perímetro de lo que el cliente tenga ahí).
  { id:'firewall_on_premise', productoNivel2Id:'perimetral', nombre:'Firewall On Premise',
    eslogan:'¡Tu primera línea de defensa, instalada en casa!',
    descripcion:'Hardware físico para protección perimetral.',
    parametros:['Marca','Modelo de equipo'],
    destinos:['sede','matriz','datacenter'] },
  { id:'firewall_iaas', productoNivel2Id:'perimetral', nombre:'Firewall IaaS',
    eslogan:'¡La misma protección, sin cables ni hardware!',
    descripcion:'Hardware virtual para protección perimetral.',
    parametros:['Marca','Modelo de equipo'],
    destinos:['sede','matriz','datacenter'] },
  // Internet Seguro (ago/2026): a partir de esta fase se comporta como el resto de la familia
  // Internet — `conexion:'internetAuto'` lo conecta solo a la Nube de Internet compartida del
  // proyecto (getOrCreateNubeInternetAuto), igual que Internet Corporativo/Startup/Teleworking —
  // en vez de quedar suelto en la sede sin cable, como antes. Tuvo un ícono propio provisional
  // ('firewall_virtual', el cono); desde el 25/09 (Dei) usa las paredes de Perimetral como sus
  // hermanos, con su propio color.
  { id:'internet_seguro', productoNivel2Id:'perimetral', nombre:'Internet Seguro',
    eslogan:'¡Navega rápido y blindado, todo en uno!',
    descripcion:'Internet más un firewall virtualizado.',
    parametros:['Ancho de banda','Plan (básico/avanzado)'],
    parametrosTipos:{ 'Ancho de banda':'anchoBanda' },
    conexion:'internetAuto' },
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

