/* --- Registro de assets por assetKey (§5) --- */
const SPACE_ROT_Y = 0.35; // giro de la antena de Puntonet Space respecto de su frente (+Z)
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
  // 25/09: Puntonet Space — antena satelital plana. Sin el .glb, un panel inclinado sobre un poste.
  puntonet_space: (color)=>{
    const modelo = IconLibrary.instanciar('puntonet_space', color);
    // El panel mira a +Z (frente del glTF). De frente a la cámara (45°) se lee como un rectángulo
    // blanco plano; a ~20° se ve en 3/4, con el canto azul y el soporte, como en el render.
    if(modelo){ modelo.rotation.y = SPACE_ROT_Y; return modelo; }
    const group = new THREE.Group();
    const poste = wire(new THREE.BoxGeometry(0.06, 0.26, 0.06), color);
    poste.position.y = 0.13;
    group.add(poste);
    const panel = wire(new THREE.BoxGeometry(0.46, 0.03, 0.36), color);
    panel.name = 'space_radiating_face';
    panel.position.y = 0.3;
    panel.rotation.x = -0.6;
    group.add(panel);
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
/* El dibujo del puerto es el mismo en todas las entidades: se pinta y se sube a la GPU una sola
   vez y todos los sprites lo comparten (antes cada puerto creaba su propio canvas y su textura). */
let texturaPuerto = null;
function texturaDelPuerto(){
  if(texturaPuerto) return texturaPuerto;
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
  texturaPuerto = texture;
  marcarCompartido(texture);
  return texture;
}
function makePortSprite(){
  const texture = texturaDelPuerto();
  const material = new THREE.SpriteMaterial({ map:texture, transparent:true, depthWrite:false, depthTest:false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(PORT_BASE_SCALE, PORT_BASE_SCALE, 1);
  sprite.name = 'connPort';
  sprite.renderOrder = 10; // siempre visible por encima de otros objetos, no se "esconde" detrás de una caja
  sprite.layers.enable(CAPA_PUERTOS); // v17: se redibuja DESPUÉS del halo del brillo, para que no lo lave (§3C)
  return sprite;
}
