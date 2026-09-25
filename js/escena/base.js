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
const FILL_COLOR = 0x141b26; // mismo tono que --panel-2 en css/base/tokens.css
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

