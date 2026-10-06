package com.puntonet.configurador;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * "Guardar como" de Android para el PDF y el JSON del reporte.
 *
 * Abre el selector del sistema (Storage Access Framework, ACTION_CREATE_DOCUMENT): el vendedor
 * elige la carpeta (Descargas, Documentos, Drive…) y el nombre, y el archivo se copia ahí desde
 * la caché de la app. No necesita ningún permiso: Android le da a la app acceso solo al archivo
 * que el usuario acaba de crear (control 10).
 *
 * Reemplaza el camino anterior de "compartir → Imprimir → Guardar como PDF", que en algunas
 * tablets dejaba el archivo vacío (0 B) porque el servicio de impresión vuelve a generar el PDF.
 *
 * JS: Capacitor.Plugins.GuardarArchivo.guardar({ ruta, nombre, mime }), donde `ruta` es el
 * file:// que devolvió Filesystem.writeFile en Directory.Cache. Solo se aceptan archivos de la
 * caché de la app (no se puede usar para leer otros archivos).
 */
@CapacitorPlugin(name = "GuardarArchivo")
public class GuardarArchivoPlugin extends Plugin {

    @PluginMethod
    public void guardar(PluginCall call) {
        String ruta = call.getString("ruta");
        String nombre = call.getString("nombre", "archivo");
        String mime = call.getString("mime", "application/octet-stream");
        if (ruta == null || archivoDeCache(ruta) == null) {
            call.reject("Ruta inválida: solo se pueden guardar archivos de la caché de la app");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mime);
        intent.putExtra(Intent.EXTRA_TITLE, nombre);
        startActivityForResult(call, intent, "alElegirDestino");
    }

    @ActivityCallback
    private void alElegirDestino(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }
        Intent datos = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || datos == null || datos.getData() == null) {
            call.reject("Guardado cancelado");
            return;
        }
        File origen = archivoDeCache(call.getString("ruta"));
        Uri destino = datos.getData();
        if (origen == null) {
            call.reject("Ruta inválida");
            return;
        }
        try (
            InputStream entrada = new FileInputStream(origen);
            OutputStream salida = getContext().getContentResolver().openOutputStream(destino, "w")
        ) {
            if (salida == null) {
                throw new java.io.IOException("No se pudo abrir el destino");
            }
            byte[] buffer = new byte[64 * 1024];
            long total = 0;
            int leidos;
            while ((leidos = entrada.read(buffer)) != -1) {
                salida.write(buffer, 0, leidos);
                total += leidos;
            }
            salida.flush();
            JSObject respuesta = new JSObject();
            respuesta.put("uri", destino.toString());
            respuesta.put("bytes", total);
            call.resolve(respuesta);
        } catch (Exception e) {
            call.reject("No se pudo guardar el archivo: " + e.getMessage(), e);
        }
    }

    /** Devuelve el archivo si `ruta` (file://…) está dentro de la caché de la app; si no, null. */
    private File archivoDeCache(String ruta) {
        if (ruta == null) {
            return null;
        }
        try {
            String path = Uri.parse(ruta).getPath();
            if (path == null) {
                return null;
            }
            File archivo = new File(path).getCanonicalFile();
            String cache = getContext().getCacheDir().getCanonicalPath() + File.separator;
            return archivo.getPath().startsWith(cache) && archivo.isFile() ? archivo : null;
        } catch (Exception e) {
            return null;
        }
    }
}
