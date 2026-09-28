# App Android (tablets) · Configurador Puntonet

Guía para compilar, instalar, actualizar y desinstalar la app, y qué hace con los permisos y los
datos. Cubre los controles 9, 10, 11 y 13 del registro de Puntonet.

> Estado al 28/09/2026: el proyecto Android está generado y configurado (Fases 1, 3 y 4 en la rama
> `android-offline`). **Todavía no se compiló ni se probó en una tablet real** (Fases 2 y 5): los
> pasos de abajo son los que faltan correr en Windows.

## 1. Requisitos en la PC (Windows)

| Qué | Versión | Para qué |
|---|---|---|
| Node.js | **22 o superior** (lo exige Capacitor 8) | `npm ci`, `npm test`, sincronizar el proyecto |
| Android Studio | 2025.2.1 o superior | Trae el JDK y el SDK de Android (API 36) |
| Git | cualquiera reciente | rama `android-offline` |

En la tablet: Opciones de desarrollador → **Depuración USB**, y permitir instalar apps de
orígenes desconocidos (solo para pruebas; en producción la distribución depende del MDM de Puntonet).

## 2. Preparar el proyecto (una vez por cambio en la web)

En PowerShell, desde la carpeta del proyecto:

```powershell
cd "C:\Users\danaf\OneDrive\Documents\trabajos\Matte\PuntNet\prototipo"
git checkout android-offline
node -v                 # tiene que decir v22 o más
npm ci                  # instala exactamente las versiones de package-lock.json
npm test                # tiene que terminar en "Todos los tests pasan"
npm run android:sync    # arma www/ (solo index.html, css, js, assets) y la copia al proyecto Android
```

La primera vez, abrir el proyecto en Android Studio para que descargue lo que falte y cree
`android/local.properties` (ruta del SDK):

```powershell
npm run android:open
```

## 3. Fase 2 · Probar en la tablet por la red local (sin compilar)

Sirve para encontrar problemas de uso táctil antes de armar el APK.

```powershell
ipconfig                                  # anotar la "Dirección IPv4" del wifi, p. ej. 192.168.1.20
npx http-server -a 0.0.0.0 -p 8080 -c-1   # o: python -m http.server 8080
```

Si Windows pregunta por el firewall, permitir en **redes privadas**. En Chrome de la tablet abrir
`http://192.168.1.20:8080` (con la IP anotada). Para ver la consola de la tablet: conectarla por
USB, abrir `chrome://inspect/#devices` en Chrome de la PC y tocar **inspect**.

Checklist (anotar cada falla en una lista):
- Arrastrar Sede, Matriz y Nube con el dedo; arrastrar productos sobre sedes; tocar para armar y tocar para colocar.
- Un dedo orbita; **pellizcar** hace zoom; **dos dedos** desplazan la cámara. Mover una sede. Estirar un cable desde el (+).
- Botón **Seleccionar varias** (junto al ✋): cada toque suma o quita una sede/Matriz.
- **Mantener el dedo** sobre un ícono de producto: aparece su tooltip y no cambia la selección.
- Popups (el aviso de datos personales bajo "Notas del vendedor"), panel derecho, teclado en pantalla al escribir nombres.
- Rendimiento con 20+ sedes.
- Reporte y PDF.
- Horizontal a 1024×768 y 1180×820 (o la resolución real de la tablet).
- Cerrar Chrome desde la multitarea y volver a abrir: la sesión tiene que volver ("Se recuperó la sesión anterior").

## 4. Fase 5 · APK de prueba (debug)

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"   # JDK que trae Android Studio
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
cd android
.\gradlew.bat assembleDebug
& $adb devices                                                    # la tablet tiene que aparecer como "device"
& $adb install -r app\build\outputs\apk\debug\app-debug.apk
```

También se puede copiar el `.apk` a la tablet e instalarlo desde el explorador de archivos.
Con el APK de debug instalado, `chrome://inspect` también muestra la WebView de la app.

**Verificar que el APK no pide permisos** (control 10):

```powershell
$bt = (Get-ChildItem "$env:LOCALAPPDATA\Android\Sdk\build-tools" | Sort-Object Name | Select-Object -Last 1).FullName
& "$bt\aapt2.exe" dump permissions app\build\outputs\apk\debug\app-debug.apk
```

No tiene que aparecer ningún permiso de Android (`android.permission.*`). Es normal que aparezca
`com.puntonet.configurador.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`: lo agrega la librería AndroidX,
es un permiso **propio de la app**, de nivel firma, que no le da acceso a nada del equipo ni lo ve
el usuario. Guardar la salida en `docs/evidencia/`.

> **Si la app abre en blanco o con un error de red:** es la única decisión que falta confirmar en
> un equipo real. La app se sirve desde dentro del APK y no debería necesitar `INTERNET`, por eso
> se quitó. Si algún modelo de WebView lo exige, volver a permitirlo borrando la línea
> `<uses-permission android:name="android.permission.INTERNET" tools:node="remove" />` de
> `android/app/src/main/AndroidManifest.xml` y documentar por qué queda (igual la app no hace
> ninguna llamada de red: lo verifica `tests/offline.js`).

## 5. Firma del release (control 9)

La llave de firma identifica al autor de la app: **con otra llave, Android no deja actualizar la
app instalada**. Si se pierde, hay que desinstalar e instalar de nuevo en cada tablet.

1. Crear la llave **fuera de OneDrive** (una carpeta sincronizada la copia a la nube):

   ```powershell
   mkdir C:\firma-puntonet
   & "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -v -keystore C:\firma-puntonet\puntonet-configurador.jks -alias configurador -keyalg RSA -keysize 4096 -validity 10000
   ```

2. Copiar `android/keystore.properties.ejemplo` como `android/keystore.properties` y completar las
   contraseñas. Ese archivo y el `.jks` están en `.gitignore`: **nunca se suben al repo**.
3. Custodia (a definir con Byron y dejar escrito acá): quién guarda el `.jks` y las contraseñas,
   dónde está la copia de respaldo (idealmente un gestor de secretos o una bóveda, no un correo) y
   quién puede firmar.
4. Compilar y verificar:

   ```powershell
   cd android
   .\gradlew.bat assembleRelease
   & "$bt\apksigner.bat" verify --verbose --print-certs app\build\outputs\apk\release\app-release.apk
   ```

   Guardar la salida (incluye la huella **SHA-256** del certificado) en `docs/evidencia/`. Esa
   huella es la que Puntonet usa para comprobar que un APK es nuestro.

## 6. Medir consumo (control 5)

Con el APK release instalado:

```powershell
(Get-Item app\build\outputs\apk\release\app-release.apk).Length / 1MB   # tamaño del APK
& $adb shell dumpsys meminfo com.puntonet.configurador                   # RAM: fila "TOTAL PSS"
```

Medir la RAM con 5 sedes y con 30 sedes (con productos y conexiones), y el espacio ocupado en
Ajustes → Apps → Configurador Puntonet → Almacenamiento. También se puede usar el Profiler de
Android Studio. Anotar el modelo de tablet y la versión de Android. Esto alimenta
`docs/requisitos-y-consumo.md` (Fase 6).

## 7. Permisos (control 10)

| Permiso | ¿Lo pide? | Por qué |
|---|---|---|
| Internet | **No** (se quita explícitamente) | La web va dentro del APK. Capacitor la sirve en `https://localhost` interceptando las peticiones dentro de la app; no sale a la red. |
| Almacenamiento | No | El PDF se escribe en la caché privada de la app y se entrega con el menú de compartir de Android (FileProvider), que no necesita permisos. |
| Cámara, ubicación, contactos, etc. | No | La app no los usa. |

La app no necesita privilegios de administrador en la tablet ni en la PC.

## 8. Datos (control 11)

- **Qué guarda:** la sesión de trabajo (nombre y logo del cliente, sedes, productos, conexiones,
  notas y las capturas de "Guardar estado actual"), en el almacenamiento local de la WebView,
  dentro de los datos privados de la app. Ver `js/core/persistencia.js`.
- **Dónde no va:** a ningún servidor ni a la nube. `allowBackup="false"` y
  `data_extraction_rules.xml` excluyen todo de la copia de seguridad de Google y del traspaso a
  otro equipo.
- **Cuándo se borra:** con **Nueva sesión** (botón del encabezado), con Ajustes → Apps → Borrar
  datos, y **al desinstalar** la app.
- **Lo que sale de la app:** un PDF o JSON **compartido** queda en la app que el vendedor eligió
  (correo, Drive, WhatsApp, Archivos…) y ya no depende de esta app ni se borra al desinstalarla.
  Las restricciones para compartir son una decisión pendiente con Puntonet.

## 9. Instalación, actualización y desinstalación (control 13)

- **Instalar:** APK firmado. Por ahora con `adb install` o copiándolo a la tablet; en producción,
  por el MDM de Puntonet (pendiente: cuál usan y si es APK directo o Managed Google Play).
- **Actualizar:** subir `versionCode` (y `versionName`) en `android/app/build.gradle`, compilar el
  release **con la misma llave** e instalar encima (`adb install -r …`). La sesión guardada se conserva.
  No hay actualizaciones automáticas ni código remoto.
- **Desinstalar:** Ajustes → Apps → Configurador Puntonet → Desinstalar, o
  `& $adb uninstall com.puntonet.configurador`. Borra la app y todos sus datos.
