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

/* Multiplicador del grosor de los cables. Siempre 1 en pantalla; la foto del PDF lo sube un
   momento (ESQUEMA_PDF.grosorCables, §9-bis) porque a esa escala el cable fino desaparece. */
let grosorCables = 1;
function rebuildConnections(){
  vaciarGrupo(connectionsGroup); // libera los tubos, partículas y badges anteriores (recursos.js)
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
    const coreRadius = 0.032 * (selected ? 1.6 : 1) * grosorCables;
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

    // una sola partícula viajera por cable, ritmo fijo (ya no escala con "potencia").
    // T07 (24/09, Dei): más grande y más brillante, que se lea sin buscarla. Núcleo casi blanco
    // que participa del bloom (CAPA_BRILLO) + un halo aditivo del color del cable alrededor.
    const particle = new THREE.Group();
    const nucleo = new THREE.Mesh(
      new THREE.SphereGeometry(PARTICULA_RADIO, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xeafcff, transparent:true, opacity: 1, depthWrite:false })
    );
    nucleo.name = 'particulaNucleo';
    nucleo.layers.enable(CAPA_BRILLO);
    const aura = new THREE.Mesh(
      new THREE.SphereGeometry(PARTICULA_RADIO * 2.4, 16, 12),
      new THREE.MeshBasicMaterial({ color: baseColor, transparent:true, opacity: 0.32,
        blending: THREE.AdditiveBlending, depthWrite:false })
    );
    particle.add(nucleo, aura);
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

/* Centro de la cara del panel de la antena de Puntonet Space de esa instancia, en mundo, o null
   si la entidad no la está mostrando (p. ej. sin assets todavía). */
function panelSatelital(entity, instanciaId){
  const cont = entity.group && entity.group.getObjectByName('assetsContainer');
  if(!cont) return null;
  let cara = null;
  cont.traverse(o=>{ if(!cara && o.name === 'space_radiating_face' && o.userData.instanciaId === instanciaId) cara = o; });
  if(!cara) return null;
  entity.group.updateMatrixWorld(true);
  const caja = new THREE.Box3().setFromObject(cara);
  const c = caja.getCenter(new THREE.Vector3());
  c.y = caja.max.y;
  return c;
}

function rebuildSatelliteLinks(){
  satelliteAnims = [];
  entidadesPortadoras().forEach(entity=>{
    const satInstancias = entity.instancias.filter(inst=>{
      const sub = getSubproducto(inst.subproductoId);
      return sub && sub.conexion==='satelital';
    });
    if(satInstancias.length===0) return;
    const puerto = getEntityPortWorldPos(entity.id);
    satInstancias.forEach((inst, i)=>{
      const sub = getSubproducto(inst.subproductoId);
      const color = getSubproductoColor(sub);
      // 25/09: si la sede muestra la antena de Puntonet Space, las ondas nacen de su panel y no
      // del puerto (LEEME del paquete: "mantener las ondas existentes y anclarlas al terminal").
      const panel = panelSatelital(entity, inst.instanciaId);
      const start = panel || puerto;
      // ligera inclinación (no 100% vertical) para diferenciar varios enlaces satelitales en la
      // misma entidad, y para que se lea más "hacia el cielo, en esa dirección" que un poste recto
      const baseAngle = i * 2.4 + start.x*0.13 + start.z*0.17;
      const dir = new THREE.Vector3(Math.cos(baseAngle)*0.3, 1, Math.sin(baseAngle)*0.3).normalize();
      // desfase determinístico por posición, para que las tandas de distintas sedes no pulsen
      // todas al mismo tiempo (puramente estético, no afecta el ritmo tanda/descanso de cada una)
      const cycleOffset = Math.abs((start.x*13.7 + start.z*7.3) % SATELLITE_CYCLE_SECONDS);

      // pequeño marcador (antena) en el puerto: de ahí "nacen" las ondas. Con la antena 3D de
      // Space ya no hace falta: el panel es el marcador.
      if(!panel){
        const antennaGeo = new THREE.OctahedronGeometry(0.12, 0);
        const antennaMat = new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.85 });
        const antenna = new THREE.Mesh(antennaGeo, antennaMat);
        antenna.position.copy(start);
        connectionsGroup.add(antenna);
      }

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

