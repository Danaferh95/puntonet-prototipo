/* =========================================================================
   MEMORIA DE LA GPU — liberar lo que sale de la escena (25/09/2026)
   -------------------------------------------------------------------------
   `scene.remove()` / `group.clear()` sacan un objeto de la escena, pero su geometría, su material
   y sus texturas siguen ocupando memoria en la GPU hasta que se llama a .dispose(). Antes nadie la
   llamaba: cada rearmado de cables (que pasa en casi toda edición), cada cambio de tamaño de una
   sede y cada entidad borrada dejaban sus buffers huérfanos. En una sesión larga con el cliente
   eso crece sin techo y termina en tirones o en que el navegador de una tablet mata la pestaña.

   Regla: lo que se saca de la escena para no volver se pasa por liberarObjeto3D().

   Excepción: lo COMPARTIDO. Los clones de los .glb comparten geometría con su plantilla, los íconos
   comparten materiales por color, etc. Eso se registra con marcarCompartido() donde se crea y
   liberarObjeto3D() no lo toca. Si algo compartido se escapara igual, no se rompe nada: three.js
   lo vuelve a subir a la GPU la próxima vez que lo dibuja (solo cuesta ese re-subido).
   ========================================================================= */

const RECURSOS_COMPARTIDOS = new WeakSet();

/* Texturas que puede tener un material. envMap queda afuera a propósito: los environment maps son
   siempre cachés globales (obtenerEntornoMetal / obtenerEntornoEntidades). */
const MAPAS_DE_MATERIAL = ['map', 'alphaMap', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap',
  'aoMap', 'lightMap', 'bumpMap', 'specularMap', 'displacementMap'];

function materialesDeObjeto(o){
  if(!o.material) return [];
  return Array.isArray(o.material) ? o.material : [o.material];
}

/* Registra como compartido: un Object3D (toda su jerarquía), un material, una geometría o una
   textura. Acepta varios argumentos. */
function marcarCompartido(...cosas){
  const marcarMaterial = m=>{
    RECURSOS_COMPARTIDOS.add(m);
    MAPAS_DE_MATERIAL.forEach(k=>{ if(m[k] && m[k].isTexture) RECURSOS_COMPARTIDOS.add(m[k]); });
  };
  cosas.forEach(c=>{
    if(!c) return;
    if(c.isObject3D){
      c.traverse(o=>{
        if(o.geometry) RECURSOS_COMPARTIDOS.add(o.geometry);
        materialesDeObjeto(o).forEach(marcarMaterial);
      });
    }
    else if(c.isMaterial) marcarMaterial(c);
    else if(c.isBufferGeometry || c.isTexture) RECURSOS_COMPARTIDOS.add(c);
  });
}

/* Libera la memoria de GPU de un objeto y toda su jerarquía (salvo lo compartido). No lo saca de
   la escena: eso lo sigue haciendo quien lo llama, igual que antes. */
function liberarObjeto3D(raiz){
  if(!raiz) return;
  raiz.traverse(o=>{
    if(o.geometry && !RECURSOS_COMPARTIDOS.has(o.geometry)) o.geometry.dispose();
    materialesDeObjeto(o).forEach(m=>{
      if(RECURSOS_COMPARTIDOS.has(m)) return;
      MAPAS_DE_MATERIAL.forEach(k=>{
        const t = m[k];
        if(t && t.isTexture && !RECURSOS_COMPARTIDOS.has(t)) t.dispose();
      });
      m.dispose();
    });
  });
}

/* Vacía un grupo liberando lo que tenía adentro (reemplaza a group.clear()). */
function vaciarGrupo(grupo){
  grupo.children.forEach(liberarObjeto3D);
  grupo.clear();
}
