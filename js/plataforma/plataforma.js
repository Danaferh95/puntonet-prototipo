/* =========================================================================
   CAPA DE PLATAFORMA — lo único que cambia entre navegador, app Android (Capacitor) y, a futuro,
   escritorio Windows (Tauri). El resto del código no pregunta en qué plataforma corre: llama a
   Plataforma.* y esta capa decide.

   API
     Plataforma.nombre                     'navegador' | 'capacitor'
     Plataforma.almacen.leer(clave)        → string | null
     Plataforma.almacen.escribir(clave, v) → true si se guardó; false si no hay espacio o no hay almacén
     Plataforma.almacen.borrar(clave)
     Plataforma.guardarArchivo({ nombre, mime, blob })  → Promise<{ compartir? }>
         Navegador: descarga el archivo. Capacitor: lo escribe en la caché de la app y abre el
         "Guardar como" de Android (plugin propio GuardarArchivo, en android/app/src/main/java/…)
         para que el vendedor elija carpeta y nombre. Devuelve `compartir()`, para ofrecer además
         el menú de compartir. Si el plugin no está, cae al menú de compartir directo.

   Almacén: localStorage en todas las plataformas. Dentro de la app Android vive en los datos
   privados de la app, que se borran al desinstalar (control 11; allowBackup=false en el
   manifiesto evita que viajen a una copia de respaldo).

   Sin red: nada de esta capa hace peticiones. Los plugins nativos se leen de
   window.Capacitor.Plugins: el lado Android de Capacitor (JSExport.getPluginJS) inyecta ahí un
   objeto por plugin instalado, con sus métodos, antes de que carguen nuestros scripts. Por eso
   no hace falta bundler, import ni registerPlugin.
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
     "Guardar como" del sistema. Lo que el vendedor guarda o comparte queda fuera de la app (en la
     carpeta o app que eligió): eso se documenta en docs/android.md.
     Antes se abría directo el menú de compartir; en la tablet de prueba (28/09) el camino
     "Imprimir → Guardar como PDF" de ese menú dejaba el archivo en 0 B. */
  async function guardarArchivoCapacitor({ nombre, mime, blob }){
    const { Filesystem, Share, GuardarArchivo } = cap.Plugins;
    if(!Filesystem || !Share) throw new Error('Faltan los plugins Filesystem/Share de Capacitor');
    const data = await blobABase64(blob);
    const escrito = await Filesystem.writeFile({ path: nombre, data, directory: 'CACHE' });
    const compartir = ()=> Share.share({ title: nombre, files: [escrito.uri], dialogTitle: 'Compartir ' + nombre });
    if(!GuardarArchivo){ await compartir(); return {}; }
    await GuardarArchivo.guardar({ ruta: escrito.uri, nombre, mime });
    return { compartir };
  }

  return {
    nombre: esCapacitor ? 'capacitor' : 'navegador',
    almacen,
    guardarArchivo(opts){
      return esCapacitor ? guardarArchivoCapacitor(opts) : descargarEnNavegador(opts).then(()=> ({}));
    },
  };
})();
