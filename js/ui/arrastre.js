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



