/* =========================================================================
   CAPA DE PLATAFORMA — lo único que cambia entre navegador, app Android (Capacitor) y, a futuro,
   escritorio Windows (Tauri). El resto del código no pregunta en qué plataforma corre: llama a
   Plataforma.* y esta capa decide.

   API
     Plataforma.nombre                     'navegador' | 'capacitor'
     Plataforma.almacen.leer(clave)        → string | null
     Plataforma.almacen.escribir(clave, v) → true si se guardó; false si no hay espacio o no hay almacén
     Plataforma.almacen.borrar(clave)
     Plataforma.guardarArchivo({ nombre, mime, blob })  → Promise
         Navegador: descarga el archivo. Capacitor: lo escribe en la caché de la app y abre el
         menú de compartir de Android (ver guardarArchivoCapacitor, Fase 4).

   Almacén: localStorage en todas las plataformas. Dentro de la app Android vive en los datos
   privados de la app, que se borran al desinstalar (control 11; allowBackup=false en el
   manifiesto evita que viajen a una copia de respaldo).

   Sin red: nada de esta capa hace peticiones. Los plugins nativos se leen de
   window.Capacitor.Plugins, que Capacitor inyecta en la WebView (no hay bundler ni import).
   ========================================================================= */
const Plataforma = (function(){
  const cap = window.Capacitor;
  const esCapacitor = !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());

  function almacenDisponible(){
    try { return !!window.localStorage; } catch(_){ return false; }
  }
  const almacen = {
    leer(clave){
      if(!almacenDisponible()) return null;
      try { return localStorage.getItem(clave); } catch(_){ return null; }
    },
    escribir(clave, valor){
      if(!almacenDisponible()) return false;
      try { localStorage.setItem(clave, valor); return true; }
      catch(err){ console.warn('[plataforma] no se pudo guardar en el almacén local:', err && err.name); return false; }
    },
    borrar(clave){
      if(!almacenDisponible()) return;
      try { localStorage.removeItem(clave); } catch(_){}
    },
  };

  function descargarEnNavegador({ nombre, blob }){
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=> URL.revokeObjectURL(url), 1000);
    return Promise.resolve();
  }

  function blobABase64(blob){
    return new Promise((resolver, rechazar)=>{
      const lector = new FileReader();
      lector.onload = ()=> resolver(String(lector.result).split(',')[1] || '');
      lector.onerror = ()=> rechazar(lector.error);
      lector.readAsDataURL(blob);
    });
  }

  /* Android: escribe en Directory.Cache (privado de la app, se borra al desinstalar) y abre el
     menú de compartir para que el vendedor elija dónde mandarlo. Una vez compartido, el archivo
     queda fuera de la app (en la app que el usuario eligió): eso se documenta en docs/android.md. */
  async function guardarArchivoCapacitor({ nombre, mime, blob }){
    const { Filesystem, Share } = cap.Plugins;
    if(!Filesystem || !Share) throw new Error('Faltan los plugins Filesystem/Share de Capacitor');
    const data = await blobABase64(blob);
    const escrito = await Filesystem.writeFile({ path: nombre, data, directory: 'CACHE' });
    await Share.share({ title: nombre, url: escrito.uri, dialogTitle: 'Compartir ' + nombre });
  }

  return {
    nombre: esCapacitor ? 'capacitor' : 'navegador',
    almacen,
    guardarArchivo(opts){
      return esCapacitor ? guardarArchivoCapacitor(opts) : descargarEnNavegador(opts);
    },
  };
})();
