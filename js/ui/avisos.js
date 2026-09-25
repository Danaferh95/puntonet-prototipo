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

