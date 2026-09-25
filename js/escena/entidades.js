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
  datacenterGroup.children.filter(o=>o.name!=='assetsContainer').forEach(o=>{ datacenterGroup.remove(o); liberarObjeto3D(o); });
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

