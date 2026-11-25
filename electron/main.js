/* Escritorio Windows (Electron): abre la misma app web que va en Android, desde la carpeta www/
   empaquetada dentro del instalador. No hay servidor: los modelos y texturas ya viajan como .js
   (tools/empaquetar-*.js), así que file:// funciona igual que en el navegador.

   Pensado para un kiosko táctil:
   - Arranca en pantalla completa sin barras ni menú (kiosk). Para salir: Alt+F4.
   - Sin zoom por pellizco ni Ctrl+rueda (la app maneja sus propios gestos en el canvas).
   - Abrir con el parámetro --ventana para usarla en una ventana normal (útil para probar).
   - Los reportes PDF se guardan con el diálogo "Guardar como" de Windows.

   Uso: npm run escritorio            (probar sin instalar)
        npm run escritorio:instalador (genera el .exe en dist-escritorio/) */
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

const enVentana = process.argv.includes('--ventana');

if(!app.requestSingleInstanceLock()){
  app.quit();
}

let ventana = null;

function crearVentana(){
  ventana = new BrowserWindow({
    width: 1600,
    height: 900,
    backgroundColor: '#000000',
    show: false,
    kiosk: !enVentana,
    fullscreen: !enVentana,
    autoHideMenuBar: true,
    title: 'Configurador Puntonet',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  Menu.setApplicationMenu(null);

  ventana.loadFile(path.join(__dirname, '..', 'www', 'index.html'));
  ventana.once('ready-to-show', ()=> ventana.show());

  const wc = ventana.webContents;
  /* Sin zoom de página: ni pellizco ni Ctrl+rueda/Ctrl+(+/-). */
  wc.setVisualZoomLevelLimits(1, 1);
  wc.on('before-input-event', (ev, input)=>{
    if((input.control || input.meta) && ['+', '-', '=', '0'].includes(input.key)) ev.preventDefault();
  });
  wc.on('zoom-changed', ()=> wc.setZoomFactor(1));

  /* Ningún enlace navega fuera de la app: los externos (si hubiera) se abren en el navegador. */
  wc.setWindowOpenHandler(({ url })=>{
    if(/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  wc.on('will-navigate', (ev, url)=>{
    if(!url.startsWith('file:')) ev.preventDefault();
  });

  /* Si el proceso de la página se cae, recargar en vez de dejar la pantalla en blanco. */
  wc.on('render-process-gone', ()=>{ if(ventana && !ventana.isDestroyed()) ventana.reload(); });

  ventana.on('closed', ()=>{ ventana = null; });
}

app.on('second-instance', ()=>{
  if(ventana){ if(ventana.isMinimized()) ventana.restore(); ventana.focus(); }
});

/* Sin gestos de historial (deslizar para atrás) ni menú de clic largo del sistema. */
app.commandLine.appendSwitch('disable-features', 'OverscrollHistoryNavigation,TouchpadOverscrollHistoryNavigation');
app.commandLine.appendSwitch('overscroll-history-navigation', '0');

app.whenReady().then(crearVentana);
app.on('window-all-closed', ()=> app.quit());
