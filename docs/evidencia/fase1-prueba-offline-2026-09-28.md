# Fase 1 · Prueba offline (28/09/2026)

**Entorno:** Chromium headless (Playwright, WebGL por SwiftShader), `file:///…/index.html`,
contexto en modo offline, viewport 1180×820.

| Verificación | Resultado |
|---|---|
| Peticiones a algo que no sea `file:`/`data:`/`blob:` | 0 |
| Peticiones fallidas | 0 |
| Errores de página o de consola | 0 |
| `THREE.REVISION` | `128` |
| Inter 300 / 400 / 500 / 700 cargadas desde `assets/fonts/` | sí / sí / sí / sí |
| jsPDF cargado desde `js/vendor/` | 4.2.1 |
| html2canvas cargado desde `js/vendor/` | sí |
| Exportar PDF (Generar reporte → Descargar PDF) | PDF A4 de 3 páginas generado |

`npm test` (incluye `tests/offline.js`: sin URLs remotas, copias de `js/vendor/` idénticas a
`node_modules`, versiones exactas, sin `eval`/`new Function`): pasa.

`npm audit`: ver `npm-audit-2026-09-28-fase1.txt` / `.json`.

Pendiente de repetir en hardware real (Fase 2): tablet Android con el wifi apagado.
