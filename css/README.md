# Estilos (css/)

Hasta el 25/09/2026 todo estaba en `css/styles.css`. Ahora cada sección del índice original es un
archivo propio. Las reglas son las mismas, en el mismo orden.

## Cómo se cargan

- Cada archivo es un `<link rel="stylesheet">` en `index.html`, **en este orden**. El orden importa:
  es la cascada, igual que cuando todo estaba en un solo archivo.
- Sin `@import` entre archivos: `@import` hace que el navegador espere a leer un CSS para recién
  pedir el siguiente. Con `<link>` los pide todos en paralelo.
- La fuente Inter se carga con `<link>` en `index.html` (antes era un `@import` al inicio del CSS).
- Las rutas de imágenes son relativas a cada archivo: desde `css/<carpeta>/` los assets están en
  `../../assets/`.

## Mapa

| Archivo | Sección |
|---|---|
| `base/tokens.css` | 1. Tokens del design system (colores, tipografía, radios, renders) |
| `base/mascaras.css` | Íconos usados como `mask-image`, embebidos (**generado**, no editar) |
| `base/layout.css` | 2. Escala (rem según viewport), base y grilla de pantalla |
| `componentes/boton.css` | 3. Botón base |
| `componentes/header.css` | 4. Header |
| `componentes/catalogo.css` | 5. Catálogo del panel izquierdo |
| `componentes/visor.css` | 6. Visor 3D: título, controles, etiquetas, tooltip, toasts |
| `componentes/panel-detalle.css` | 7. Panel de detalle (derecho) |
| `componentes/campos.css` | 8. Campos, slider y checkbox |
| `componentes/salud.css` | 9. Salud de infraestructura |
| `componentes/modales.css` | 10. Formulario de producto y diálogo |
| `reporte/reporte.css` | 11. Reporte en pantalla |
| `reporte/pdf.css` | 12. Páginas del PDF |

## Reglas del proyecto

- **Toda la apariencia vive acá, nunca inline en `js/`.** Si algo solo se puede calcular en tiempo
  de ejecución y no se resuelve con una clase o una variable CSS, hay que pedir autorización antes.
- **Un componente nuevo:** archivo nuevo en `componentes/`, agregado a `index.html` en el lugar que
  le corresponda en la cascada (normalmente antes de `reporte/`).
- **Íconos como máscara (`mask-image`):** nunca con `url("../../assets/…")`. Chrome bloquea las
  máscaras locales al abrir `index.html` con doble clic (`file://`) y el ícono desaparece. Súmalo a
  `MASCARAS` en `tools/empaquetar-mascaras.js`, corre `node tools/empaquetar-mascaras.js` y úsalo
  como `var(--pn-mask-<nombre>)`. Las imágenes normales (`background-image`, `<img>`) no tienen
  este problema.
- **Colores y medidas:** usa los tokens de `base/tokens.css` (`--pn-color-*`), no valores sueltos.
