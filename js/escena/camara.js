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
   toca: ese se calcula solo con encuadrarEsquema() (§9-bis). */
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
  // Apariencia del estado activo en css/componentes/visor.css (.zoom-btn.is-active) — antes eran estilos inline.
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

