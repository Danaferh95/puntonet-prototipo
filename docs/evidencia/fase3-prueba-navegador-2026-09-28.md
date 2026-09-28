# Fase 3 (parte sin decisiones pendientes) · Prueba en navegador (28/09/2026)

**Entorno:** Chromium headless (Playwright, WebGL por SwiftShader), `file://`, offline, con
soporte táctil, viewport 1180×820 (y capturas a 1024×768, 1280×800 y 1366×768).

| Verificación | Resultado |
|---|---|
| Sesión: 2 sedes, 1 Matriz, Internet Corporativo (crea la Nube automática de Internet), Firewall en sede y Matriz, Canal de Conexión Sede→Matriz, herencia de la Matriz, "Guardar estado actual" y nombre de cliente → recargar | Restaurada idéntica: `serializarSesion()` antes y después de recargar es el mismo texto. Ids, tamaños, instancias, herencia, conexiones, cables y salud (50 %) coinciden |
| Nombre de sede `Sede "A" <b>x</b>' onfocus='window.__xss=1` en el panel (input `value="…"`) | Se muestra como texto; `window.__xss` queda sin definir |
| Pellizco con dos dedos (PointerEvents táctiles) | Zoom de 1.5 a 4.5 (tope `ZOOM_MAX`) |
| Mover dos dedos juntos | La cámara se desplaza (`camTarget` cambia) |
| Terminar el gesto de dos dedos | No quedan punteros activos; la selección no cambia |
| "Nueva sesión" → confirmar | Recarga vacía; el almacén queda sin sesión |
| Errores de página o de consola | 0 |

`npm test`: pasa.

Pendiente en hardware real (Fase 2): repetir los gestos con dedos reales en la tablet, y cerrar la
app desde Android (multitarea) para confirmar que la sesión vuelve.
