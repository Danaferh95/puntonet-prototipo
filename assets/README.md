# assets/

Carpeta reservada para los modelos 3D definitivos (actualmente el prototipo usa wireframes
generados por Three.js, sin modelos externos).

Cuando se agreguen modelos (GLTF/GLB, texturas, etc.), se cargarán desde aquí, por ejemplo:

```js
const loader = new THREE.GLTFLoader();
loader.load('assets/modelo.glb', (gltf) => { ... });
```

Nota: si se usa GLTFLoader, hay que añadir su script (no incluido en el build actual, que solo
carga three.min.js r128 core + jsPDF).
