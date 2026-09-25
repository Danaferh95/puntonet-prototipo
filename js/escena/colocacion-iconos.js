/* =========================================================================
   3E. COLOCACIÓN DE LOS ÍCONOS SOBRE LA ENTIDAD — v46
   -------------------------------------------------------------------------
   Hasta v45 los íconos de producto se repartían en un anillo horizontal que flotaba POR ENCIMA
   del edificio (radio `assetRadius` del tamaño, altura `dims.h + 0.35`). Se leían como objetos
   sueltos al lado de la sede, no como parte de ella — que es justo lo que marcó el cliente.

   La lámina de referencia del proveedor ("Revisión de protecciones") muestra que cada ícono tiene
   una relación PROPIA con el edificio, y que esa relación es parte del significado del producto:
   el escudo de Perimetral abraza la plataforma por donde entra el cable, el candado de End Point
   envuelve el edificio con sus aros, el arco de Acceso se planta sobre la ruta de conexión como
   una puerta que hay que cruzar, el panel de Aplicación se monta contra la fachada y el firewall
   físico se apoya en la plataforma como el equipo que es.

   De ahí que esto sea una TABLA por assetKey y no un solo layout: no hay una posición "correcta"
   común a los 14. Cada modo se calcula contra las medidas reales del modelo ya escalado
   (`dimsEntidad`), así que sigue funcionando si cambia MODELOS_ESCALA o si el proveedor entrega
   un modelo con otra proporción.

   Modos disponibles:
     envolver    — centrado en el edificio, escalado para rodearlo (aros del candado).
     abrazar     — a ras de piso, escalado a la huella de la plataforma (brackets del escudo).
     portico     — en el techo, enmarcando el puerto (+) de T01: la puerta por la que entra el cable.
     fachada     — montado contra una pared, semihundido en ella, a media altura del cuerpo.
     plataforma  — apoyado en la plataforma, pegado a la pared, repartido por el perímetro.
     cubierta    — sobre el techo (lo que "está en la nube" o irradia, no sobre el piso),
                   repartido alrededor del puerto (+) de T01, que ocupa el centro.

   `envolver`, `abrazar` y `portico` son de ocupación única: si dos productos de la misma entidad
   piden el mismo modo, el segundo cae a `plataforma`. `fachada` tiene 4 huecos (las 4 paredes) y
   desborda igual. `plataforma` y `cubierta` no se agotan: reparten cuantos haga falta.
   ========================================================================= */

/* Proporciones del modelo de entidad que el .glb no declara y hay que estimar: cuánto de la
   altura total es la plataforma iluminada, y cuánto de la huella total ocupa el cuerpo del
   edificio sobre ella. Medidos a ojo contra los renders del proveedor; son los dos números a
   tocar si una tanda futura cambia la proporción de las plataformas. */
const PLATAFORMA_ALTO_REL = 0.16;
const PLATAFORMA_CUERPO_REL = 0.72;

const COLOCACION_ICONOS = {
  // Ciberseguridad — las cinco de la lámina de referencia, cada una en su relación
  escudo:             { modo:'abrazar',    factor:1.15,     // Perimetral: brackets alrededor de la plataforma
                        // 25/09 (Dei): On Premise, IaaS e Internet Seguro comparten las paredes.
                        // Cada uno nuevo envuelve al anterior (el primero que se agregó queda
                        // adentro), con su color, como anillos concéntricos. Ver colocarAnidado().
                        apila:true, pilaAnidada:true, pilaOrdenAlta:true },
  candado:            { modo:'envolver',   factor:1.30,     // End Point: aros que rodean el edificio
                        // T07 paso 2 (24/09): los candados de End Point (EDR, XDR, Seg. Móvil, Correo)
                        // se apilan como SD-WAN, en vez de caer chiquitos a la plataforma. Los aros
                        // son uno solo (los del primero); lo que se apila es la placa del candado,
                        // hacia afuera de la fachada. `pilaSoloPrimera`: mallas que mezclan los aros
                        // con el dibujo del candado; se parten (ver construirPilaFachada).
                        apila:true, pilaSoloPrimera:['Endpoint_loop'],
                        // T07 (24/09, Dei): los candados van LADO A LADO en la fachada, en fila
                        // centrada (no frente/fondo), en el orden en que se agregaron.
                        pilaLateral:true, pilaOrdenAlta:true },
  // Acceso: arco en el punto de conexión (T07). Varias instancias de MFA no suman arcos sueltos:
  // se apilan como un túnel, un arco pegado delante del otro, hacia la cámara.
  llave:              { modo:'portico',    factor:0.95, apila:true },
  // T07 paso 2 (24/09): WAF y DNS/DDoS se apilan contra la pared, igual que los candados: el
  // primero semihundido en la fachada y los demás delante, pegados.
  muro:               { modo:'fachada',    factor:0.74, apila:true },  // Aplicación: panel contra la pared
  firewall_onpremise: { modo:'plataforma', factor:0.42 },  // equipo físico apoyado en la plataforma
  // Firewall Virtual sigue sin modelo (el proveedor lo excluyó del lineup, v2 §3 B8): es la
  // primitiva escudo+anillo. Va a la plataforma como cualquier equipo, no `abrazar`: la
  // primitiva es un cono alto, no los brackets anchos del escudo real.
  firewall_virtual:   { modo:'plataforma', factor:0.55 },
  // Cloud
  // T07 (24/09, Dei): Housing (Collocation, Crossconexión) se superponía; se apila frente/fondo.
  rack:               { modo:'plataforma', factor:0.62, apila:true },
  // T07 paso 2 (24/09): IaaS, BaaS y DRaaS se apilan en el techo, igual que SD-WAN.
  nube:               { modo:'cubierta',   factor:0.52, apila:true },
  // Colaboración
  pantalla:           { modo:'fachada',    factor:0.76 },  // igual que el render de Conferencia
  documento:          { modo:'fachada',    factor:0.58 },
  // T07 paso 1 (24/09): Portal Cautivo sube al techo, junto al Punto de Acceso: los dos irradian
  // cobertura y se leen mejor arriba que apoyados en la plataforma.
  puerta:             { modo:'cubierta',   factor:0.50 },
  antena:             { modo:'cubierta',   factor:0.55 },
  // Conectividad
  // T07 (24/09, Dei): Datos (Canal de Conexión, Cloud Interconnect) nace del punto de conexión:
  // va justo encima del "+", más grande que en la plataforma (ahí se perdía). Varias instancias
  // se apilan frente/fondo como el resto.
  enlace:             { modo:'puerto',     factor:0.46, apila:true },
  // T07 paso 1 (24/09): SD-WAN sube al techo, junto a Internet: los dos comparten el punto de
  // conexión del techo (T01), que es de donde salen sus cables.
  // T07 paso 2 (24/09): `apila` junta las variantes (Sdwan, Túnel IPsec) en UNA pila tipo lego:
  // piezas pegadas una detrás de otra, cada una con el tono de su subproducto, en un solo hueco.
  // Solo para íconos de forma "encastrable": los redondos (globo) no apilan bien, y los que
  // quedaron igual en el paso 1 no cambian.
  nodo:               { modo:'cubierta',   factor:0.50, apila:true },
  // T07 (24/09, Dei): Internet (Corporativo, Startup, Teleworking, Punto Space) se apila EN
  // VERTICAL, de abajo hacia arriba: el globo es redondo y en fila frente/fondo no se lee.
  // TODOS los globos de la pila miden lo mismo, y ese tamaño depende de cuántos hay:
  // `pilaVertical[n-1]` (1 → tamaño normal, 2 → 80%, 3 o más → la mitad). Orden: el de alta
  // (el primero que se agregó queda abajo), no el del catálogo.
  globo:              { modo:'cubierta',   factor:0.60, apila:true, pilaVertical:[1, 0.8, 0.5] },
  // 25/09: Puntonet Space en el techo, como una antena real. Varias instancias se apilan en fila.
  puntonet_space:     { modo:'cubierta',   factor:0.70, apila:true },
};
const COLOCACION_DEFECTO = { modo:'plataforma', factor:0.50 };
// fachada: una pared por ícono, y solo las dos visibles (ver CARAS_VISIBLES).
// Alto del arco de Acceso sobre el techo (ver colocarAsset, 'portico'). El vano interior del
// .glb es ~86% del alto total y ~73% del ancho: a 0.9 el puerto (0.46, centrado a
// PUERTO_SOBRE_TECHO del techo) entra justo; en el pico del pulso (0.52) roza los postes.
// Dei pidió achicarlo desde 1.05 (24/09).
const PORTICO_ALTO = 0.9;
const PORTICO_AIRE_ETIQUETA = 0.45; // la etiqueta de nombre sube hasta quedar este margen por encima del arco
// fachada: hasta 4 (2 por cada pared visible, ver asignarParedes); antes eran 2 y el tercero caía a
// plataforma, más chico.
const HUECOS_POR_MODO = { envolver:1, abrazar:1, portico:1, puerto:1, fachada:4 };
// Huella del ícono de Datos cuando nace del "+" (modo 'puerto'). En mundo, como el puerto.
const PUERTO_ICONO_HUELLA = 1.3;

/* T07 paso 2 — Pila tipo lego, en HORIZONTAL: las piezas se encastran una DETRÁS de otra sobre
   el eje frente/fondo del edificio (Z), alineadas en una sola fila recta —mismo X, misma altura,
   misma rotación— y pegadas cara con cara: cada pieza arranca donde termina la de adelante
   (× PILA_PASO; 1 = se tocan, menos de 1 las encastra un poco). Cada pieza se centra por su caja
   real, así la fila queda derecha aunque el pivote del .glb no esté perfectamente centrado.
   El grupo queda con el pivote en el centro de su base, igual que un ícono suelto, así que
   `colocarAsset` lo ubica como si fuera uno solo. Orden: la primera pieza va ADELANTE (+Z, la
   más cercana a la cámara); por ahora es el orden del catálogo (hasta el paso 3, que define
   pesos), no el orden en que se agregaron. */
// Sin tope (pedido de Dei, 24/09): la pila muestra TODAS las instancias. Se deja la constante
// por si en una sede muy cargada hace falta volver a limitarla.
const PILA_MAX = Infinity;
const PILA_PASO = 1.0;
function construirPila(piezas){
  const pila = new THREE.Group();
  pila.name = 'pilaIconos';
  const medidas = piezas.map(p=>medidaAsset(p));
  const pasos = medidas.map(m=>m.tam.z * PILA_PASO);
  const largo = pasos.reduce((a,b)=>a+b, 0);
  let z = largo/2; // se arranca por el frente y se avanza hacia el fondo
  piezas.forEach((pieza, i)=>{
    const m = medidas[i];
    const c = m.caja.getCenter(new THREE.Vector3());
    const zCentro = z - pasos[i]/2;
    pieza.position.set(-c.x, -m.caja.min.y, zCentro - c.z);
    z -= pasos[i];
    pila.add(pieza);
  });
  // Cuántas veces la huella de una pieza mide la fila: `colocarAsset` agranda el hueco en esa
  // proporción para que cada pieza conserve el tamaño de un ícono suelto. Si la fila se achicara
  // para entrar en el hueco de un ícono, dejaría de verse "más pesada".
  pila.userData.largoRel = largo / Math.max(...medidas.map(m=>Math.max(m.tam.x, m.tam.z)), 0.001);
  return pila;
}

/* Medidas derivadas que necesita la colocación: dónde termina la plataforma y qué huella tiene
   el cuerpo del edificio sobre ella. */
function geometriaEntidad(entity){
  const g = geometriaDeDims(dimsEntidad(entity));
  g.tam = geometriaTamano(entity, g);
  return g;
}
function geometriaDeDims(d){
  const plintoY = d.h * PLATAFORMA_ALTO_REL;
  return {
    w: d.w, h: d.h, d: d.d,
    plintoY,
    cuerpoW: d.w * PLATAFORMA_CUERPO_REL,
    cuerpoD: d.d * PLATAFORMA_CUERPO_REL,
    cuerpoH: Math.max(0.1, d.h - plintoY),
  };
}
/* 25/09 (Dei): "los íconos en las sedes del mismo tamaño que en las Matrices; no importa si
   ocupan un poco más que el techo de la sede". Todo se escalaba contra el cuerpo de SU entidad,
   y como la Sede es más chica que la Matriz sus íconos quedaban chicos. Ahora hay dos medidas:
   `g` (dónde va cada ícono: techo, paredes, plinto de la entidad real) y `g.tam` (de qué tamaño
   es). En una Sede más chica que la Matriz, `g.tam` es la geometría de la Matriz; en el resto,
   la propia. Corrección de Dei (25/09): SOLO los íconos del techo (`cubierta`) usan `g.tam`;
   los de paredes, plataforma y el candado vuelven a medirse contra su propia entidad. */
function geometriaTamano(entity, g){
  if(entity.tipo !== 'sede' || typeof ModelLibrary === 'undefined' || !ModelLibrary.dims) return g;
  const dm = ModelLibrary.dims('matriz');
  if(!dm) return g;
  const gm = geometriaDeDims(dm);
  return Math.max(gm.cuerpoW, gm.cuerpoD) > Math.max(g.cuerpoW, g.cuerpoD) ? gm : g;
}

/* Los íconos salen de IconLibrary con el pivote en el centro de su base (v18), así que basta la
   envolvente para escalarlos: no hay que recentrar nada. Las primitivas de fallback no cumplen
   esa promesa, y por eso se mide en vez de asumir el 0.58 de ICONOS_DIM_OBJETIVO. */
function medidaAsset(asset){
  // El ícono todavía no cuelga de la escena, así que hay que forzar las matrices: Box3 solo
  // actualiza la del objeto, no la de sus hijos, y sin esto la medida ignora escala y rotación.
  asset.updateMatrixWorld(true);
  const caja = new THREE.Box3().setFromObject(asset);
  const tam = caja.getSize(new THREE.Vector3());
  return { alto: Math.max(tam.y, 0.001), huella: Math.max(tam.x, tam.z, 0.001), tam, caja };
}
function escalarPorAltura(asset, alto){
  const m = medidaAsset(asset);
  asset.scale.multiplyScalar(alto / m.alto);
}
function escalarPorHuella(asset, huella){
  const m = medidaAsset(asset);
  asset.scale.multiplyScalar(huella / m.huella);
}

/* Las 4 caras de la entidad, en el orden en que entran en cuadro con la cámara por defecto (que
   mira desde +X/+Z): primero la frontal y la derecha, que son las dos visibles sin orbitar, y
   después las dos de atrás. `n` es la normal hacia afuera; `rotY` gira el ícono para que la cara
   que el proveedor modeló "de frente" (+Z) apunte en esa dirección. */
const CARAS_ENTIDAD = [
  { nx: 0, nz: 1, rotY: 0 },
  { nx: 1, nz: 0, rotY: Math.PI/2 },
  { nx: 0, nz:-1, rotY: Math.PI },
  { nx:-1, nz: 0, rotY:-Math.PI/2 },
];

/* T07 (24/09, regla de Dei): NUNCA se pone un ícono detrás del mesh. Las paredes de atrás (-Z y
   -X) quedan tapadas por el propio edificio con la cámara por defecto, así que `fachada` y
   `plataforma` solo usan la frontal y la derecha. Lo que no entra en una pared se corre
   lateralmente sobre la misma pared, en vez de irse a la de atrás. */
const CARAS_VISIBLES = CARAS_ENTIDAD.slice(0, 2);

/* Reparte `total` íconos entre las caras visibles: uno por cara hasta agotarlas, y recién
   entonces un segundo por cara, corridos lateralmente. Devuelve la cara, cuántos comparten esa
   cara y qué lugar ocupa dentro de ella, que es lo que permite centrar el grupo sobre la pared. */
function huecoPerimetral(turno, total, g){
  // Si la placa del candado (End Point) ocupa el centro del frente, se arranca por la derecha.
  const caras = g && g.frenteLleno ? [CARAS_VISIBLES[1]]
    : (g && g.frenteOcupado ? [CARAS_VISIBLES[1], CARAS_VISIBLES[0]] : CARAS_VISIBLES);
  const n = caras.length;
  const iCara = turno % n;
  const enCara = Math.floor(total / n) + ((total % n) > iCara ? 1 : 0);
  return { cara: caras[iCara], indice: Math.floor(turno / n), enCara: Math.max(enCara, 1) };
}

/* 25/09 (Dei): "máximo 2 íconos por lado; si ya hay 2, al otro lado, menos en la cara trasera".
   Antes fachada y plataforma se repartían cada uno por su cuenta (y con 2 o más candados todo iba
   a la pared derecha), así que una pared podía juntar 4 o 5 íconos y la otra ninguno. Ahora se
   asignan juntos, en orden: cada ícono va a la pared visible que tenga menos, sin pasar de
   PARED_MAX; recién cuando las dos están llenas se admite un tercero (nunca las caras de atrás,
   regla T07). La fila de candados no cuenta: sus íconos se acomodan a los costados de la fila
   (repartirParedes). Con candados se arranca por la derecha, que está libre.
   Devuelve { cara, indice, enCara } por entrada, lo mismo que huecoPerimetral. */
const PARED_MAX = 2;
function asignarParedes(planeadas, g){
  const visibles = g.frenteOcupado ? [CARAS_VISIBLES[1], CARAS_VISIBLES[0]] : CARAS_VISIBLES;
  const caras = [...visibles, CARAS_ENTIDAD[3]]; // + izquierda (-X); nunca la trasera (-Z)
  const cuenta = new Map(caras.map(c=> [c, 0]));
  if(g.frenteOcupado) cuenta.set(CARAS_VISIBLES[0], 1); // la fila de candados ocupa un lugar
  const elegida = planeadas.filter(p=> p.modo === 'fachada' || p.modo === 'plataforma').map(p=>{
    const libresVis = visibles.filter(c=> cuenta.get(c) < PARED_MAX);
    const libres = libresVis.length ? libresVis : caras.filter(c=> cuenta.get(c) < PARED_MAX);
    const opciones = libres.length ? libres : caras;
    const cara = opciones.reduce((a, c)=> cuenta.get(c) < cuenta.get(a) ? c : a, opciones[0]);
    const indice = cuenta.get(cara);
    cuenta.set(cara, indice + 1);
    return { p, cara, indice };
  });
  const enFila = c=> cuenta.get(c) - (g.frenteOcupado && c === CARAS_VISIBLES[0] ? 1 : 0);
  elegida.forEach(e=>{ e.p.hueco = { cara: e.cara, indice: e.indice - (g.frenteOcupado && e.cara === CARAS_VISIBLES[0] ? 1 : 0), enCara: Math.max(1, enFila(e.cara)) }; });
}

/* La placa del candado de End Point va centrada en la fachada frontal. Lo que además cae en esa
   pared se corre a su mitad izquierda para no quedar tapado por la placa ni taparla. */
const FRENTE_CORRIMIENTO = 0.36; // fracción del ancho del cuerpo
function corrimientoFrente(g, cara){
  return (g.frenteOcupado && cara.nz === 1) ? -g.cuerpoW * FRENTE_CORRIMIENTO : 0;
}

/* Medio ancho del cuerpo en la dirección de una normal, y su medida perpendicular (la que se usa
   para correr lateralmente los íconos que comparten pared). */
function medidasCara(g, cara){
  return cara.nx !== 0
    ? { normal: g.cuerpoW/2, lateral: g.cuerpoD, normalPlinto: g.w/2 }
    : { normal: g.cuerpoD/2, lateral: g.cuerpoW, normalPlinto: g.d/2 };
}

/* 25/09 (cliente): "los íconos de los lados se chocan con la columna". medidasCara() supone una
   pared lisa a cuerpoW/2 (o cuerpoD/2), pero los modelos no son cajas: la Matriz tiene un anexo
   pegado a la pared derecha (+X, `shell_b`) que sobresale ~0.45 del cuerpo, y un ícono de
   fachada o de plataforma puesto contra la pared "teórica" quedaba atravesado por él.
   Ahora se mide la pared REAL: los vértices del modelo de la entidad (sin íconos, hitbox, halo
   ni puerto), por encima del plinto, que caen dentro de la franja que ocupa el ícono (ancho
   sobre la pared y alto). Lo más saliente de esa franja es la pared contra la que se apoya.
   Los vértices se juntan una vez por grupo de entidad (WeakMap: el grupo se rehace al cambiar el
   tamaño de una sede, y el caché se va con él). */
const _verticesPared = new WeakMap();
function verticesModelo(group, plintoY){
  if(_verticesPared.has(group)) return _verticesPared.get(group);
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const m = new THREE.Matrix4(), v = new THREE.Vector3(), lista = [];
  const excluir = o=> o.name === 'assetsContainer' || /hitbox|halo/i.test(o.name) || (o.userData && o.userData.isPort);
  (function recorrer(o){
    if(excluir(o)) return;
    if(o.isMesh && o.visible !== false && o.geometry && o.geometry.attributes.position){
      const pos = o.geometry.attributes.position;
      m.multiplyMatrices(inv, o.matrixWorld);
      for(let i=0; i<pos.count; i++){
        v.fromBufferAttribute(pos, i).applyMatrix4(m);
        if(v.y > plintoY + 0.02) lista.push(v.x, v.y, v.z);
      }
    }
    o.children.forEach(recorrer);
  })(group);
  const arr = new Float32Array(lista);
  _verticesPared.set(group, arr);
  return arr;
}
/* Distancia desde el centro hasta la pared real de `cara`, dentro de la franja [latMin, latMax]
   (sobre la pared) × [yMin, yMax]. Sin modelo medible (primitivas, smoke test) → la teórica. */
function paredReal(g, cara, latMin, latMax, yMin, yMax){
  const teorica = medidasCara(g, cara).normal;
  const vs = g.grupo ? verticesModelo(g.grupo, g.plintoY) : null;
  if(!vs || !vs.length) return teorica;
  let max = -Infinity;
  for(let i=0; i<vs.length; i+=3){
    const x = vs[i], y = vs[i+1], z = vs[i+2];
    if(y < yMin || y > yMax) continue;
    const lat = cara.nx ? z : x;
    if(lat < latMin || lat > latMax) continue;
    const n = cara.nx ? x*cara.nx : z*cara.nz;
    if(n > max) max = n;
  }
  return max === -Infinity ? teorica : max;
}
// Si la pared real sobresale más que esto de la teórica, es un volumen agregado (anexo,
// columna) y no la fachada: el ícono se apoya delante, sin hundirse en él.
const PARED_SALIENTE = 0.08;

/* Huecos del techo. El puerto (+) de T01 está en el centro, así que los íconos van ALREDEDOR de
   él, nunca encima.
   25/09 (cliente): con los íconos a la escala del candado (ver tamanoCandado) ya no entran en los
   cuatro cuadrantes chicos de T07, que los amontonaban sobre el puerto. Ahora se reparten
   parejos sobre una elipse que sigue la forma del techo (CUBIERTA_RADIO de cada semieje). El
   primero va a la derecha de la pantalla (-45°: la cámara por defecto mira desde +X/+Z) y el
   segundo enfrente, a la izquierda: así con uno o dos el puerto queda libre.
   Desde la tarde del 25/09 esto es solo la posición PROVISORIA: repartirCubierta() (más abajo)
   ubica a todos juntos, sin achicarlos y sin que se pisen. `escala` ya no se usa. */
const CUBIERTA_RADIO = 0.72;       // fracción de cada semieje del techo donde se paran los íconos
const CUBIERTA_SEPARACION = 1.0;   // distancia mínima entre centros, en tamaños de ícono
function huecoCubierta(g, turno, total, tam){
  const n = Math.max(1, total);
  const rx = g.cuerpoW/2 * CUBIERTA_RADIO, rz = g.cuerpoD/2 * CUBIERTA_RADIO;
  const ang = -Math.PI/4 + turno * 2*Math.PI / n;
  // Perímetro de la elipse (Ramanujan) repartido entre n: cuánto lugar le toca a cada ícono.
  // Se mide sobre el techo de `g.tam` (la Matriz, en una Sede): con la misma cantidad, los
  // íconos de una Sede quedan del mismo tamaño que en la Matriz aunque se salgan de su techo.
  const gt = g.tam || g;
  const ex = gt.cuerpoW/2 * CUBIERTA_RADIO, ez = gt.cuerpoD/2 * CUBIERTA_RADIO;
  const h = Math.pow(ex - ez, 2) / Math.pow(ex + ez, 2);
  const perimetro = Math.PI * (ex + ez) * (1 + 3*h / (10 + Math.sqrt(4 - 3*h)));
  const escala = n < 2 ? 1 : Math.min(1, perimetro / n / (tam * CUBIERTA_SEPARACION));
  return { x: Math.cos(ang) * rx, z: Math.sin(ang) * rz, escala };
}

/* Coloca UN ícono según su modo. `turno` es el índice dentro de los que comparten ese modo en
   esta entidad (0 = el primero), y `totalModo` cuántos son, para poder repartirlos.

   Los modos que apoyan el ícono contra una cara ROTAN PRIMERO y miden después: la medida que
   importa es la profundidad del ícono ya girado, no la del .glb tal como vino. Medir antes deja
   los íconos de las caras laterales hundidos o despegados de la pared. */
/* T07 (24/09, Dei): "los íconos en general un poco más grandes". Multiplica el tamaño de todos
   los modos y los topes de huella que los acotan. El arco de Acceso (`portico`) queda afuera: Dei
   ya lo había achicado a propósito (PORTICO_ALTO). */
const ICONOS_TAMANO = 1.15;
/* 25/09 (cliente): "los íconos de arriba del mesh, todos en la escala de los candados". Lado
   mayor de la placa del candado de End Point, medido en Matriz y Sede: 0.40 × la huella del
   cuerpo (1.61 / 4.03 y 1.31 / 3.28), porque el candado se escala contra max(cuerpoW, cuerpoD).
   Si cambia el factor del candado en COLOCACION_ICONOS, este número se mueve con él. */
const CANDADO_LADO_REL = 0.40;
function tamanoCandado(g){ return Math.max(g.cuerpoW, g.cuerpoD) * CANDADO_LADO_REL; }
function colocarAsset(asset, modo, factor, g, turno, totalModo, hueco){
  const huellaCuerpo = Math.max(g.cuerpoW, g.cuerpoD);
  const gt = g.tam || g; // tamaño de los íconos del TECHO (ver geometriaTamano); `g` es el lugar
  if(modo !== 'portico') factor *= ICONOS_TAMANO;
  switch(modo){
    case 'envolver': {
      escalarPorHuella(asset, huellaCuerpo * factor);
      // Centrado en ALTURA sobre el cuerpo, no apoyado en el plinto: los aros tienen que quedar
      // a la altura del edificio, como en la lámina. Apoyarlos los deja flotando por encima.
      const m = medidaAsset(asset);
      asset.position.set(0, g.plintoY + (g.cuerpoH - m.alto)/2, 0);
      break;
    }
    case 'abrazar': {
      // Contra la huella del CUERPO, no la del plinto: escalado a la plataforma entera, los
      // brackets del escudo suben más que el edificio y dejan de leerse como algo que lo abraza.
      escalarPorHuella(asset, huellaCuerpo * factor);
      asset.position.set(0, 0.01, 0);
      break;
    }
    case 'portico': {
      // T07 (24/09, pedido de Dei): el arco de Acceso (MFA) es la puerta por la que ENTRA la
      // conexión, así que va justo en el punto de conexión de T01: parado en el centro del techo,
      // enmarcando el puerto (+). Se escala a una altura fija en mundo (el sprite del puerto
      // también mide lo mismo en todas las entidades) para que el "+" quepa entero dentro del
      // vano. Alineado con el edificio, mirando al frente (+Z) como las demás piezas de fachada:
      // girado 45° hacia la cámara se veía raro (Dei, 24/09).
      escalarPorAltura(asset, PORTICO_ALTO);
      asset.position.set(0, g.h, 0);
      asset.rotation.y = 0;
      break;
    }
    case 'puerto': {
      // T07: justo encima del "+" (centro del techo). Si hay arco de Acceso, se apoya sobre su
      // dintel; si no, apenas por encima del sprite del puerto.
      escalarPorHuella(asset, PUERTO_ICONO_HUELLA * ICONOS_TAMANO);
      const base = g.hayPortico ? PORTICO_ALTO : PUERTO_SOBRE_TECHO + PORT_BASE_SCALE * 0.62;
      asset.position.set(0, g.h + base, 0);
      break;
    }
    case 'fachada': {
      const { cara, indice, enCara } = hueco || huecoPerimetral(turno, totalModo, g);
      asset.userData.pared = { cara, modo }; // para repartirParedes (2ª pasada)
      escalarPorAltura(asset, g.cuerpoH * factor);
      asset.rotation.y = cara.rotY;
      const m = medidaAsset(asset);
      const c = medidasCara(g, cara);
      // Semihundido: se mete en la pared el 45% de su fondo ya girado, para que se lea como
      // parte del edificio y no como una calcomanía pegada por delante.
      const fondo = Math.abs(cara.nx) ? m.tam.x : m.tam.z;
      const ancho = Math.abs(cara.nx) ? m.tam.z : m.tam.x;
      const lateral = (indice - (enCara-1)/2) * ancho * 1.15
        + corrimientoFrente(g, cara);
      const y0 = g.plintoY + (g.cuerpoH - m.alto)/2;
      // Contra la pared REAL de la franja que ocupa (ver paredReal): en la fachada lisa se hunde
      // el 45 % como siempre; si ahí hay un anexo o una columna, se apoya delante de él.
      const pared = paredReal(g, cara, lateral - ancho/2, lateral + ancho/2, y0, y0 + m.alto);
      const hundido = pared > c.normal + PARED_SALIENTE ? 0 : 0.45;
      const dNormal = Math.max(c.normal, pared) - fondo*hundido + fondo/2;
      asset.position.set(
        cara.nx * dNormal + (cara.nx ? 0 : lateral),
        y0,
        cara.nz * dNormal + (cara.nx ? lateral : 0)
      );
      break;
    }
    case 'cubierta': {
      // Alrededor del puerto (+), sobre la elipse de huecoCubierta.
      // 25/09 (cliente): los íconos del techo van a la MISMA escala que el candado de End Point
      // (antes se escalaban por altura y se acotaban al hueco, y quedaban chicos al lado del
      // candado). Se escala para que UNA pieza mida `tamanoCandado(g)` (× la `escala` del hueco) en su lado mayor (alto o
      // huella). En una pila horizontal la pieza es la huella ÷ largoRel; en una vertical, el
      // alto ÷ alturaRel: así la pila conserva sus proporciones (80 %, la mitad) por pieza.
      const m0 = medidaAsset(asset);
      const pieza = Math.max(m0.alto / (asset.userData.alturaRel || 1),
                             m0.huella / Math.max(1, asset.userData.largoRel || 1));
      // Tamaño completo siempre: si no entran en el techo, repartirCubierta() agranda el anillo
      // donde se paran (un techo "virtual" más grande) en vez de achicarlos.
      const tam = tamanoCandado(gt);
      const h = huecoCubierta(g, turno, totalModo, tam); // posición provisoria
      asset.scale.multiplyScalar(tam / pieza);
      asset.position.set(h.x, g.h, h.z);
      asset.userData.techo = true;
      break;
    }
    default: { // 'plataforma'
      escalarPorAltura(asset, g.cuerpoH * factor);
      // La plataforma sobresale poco del cuerpo en los modelos del proveedor (~0.2 por lado en
      // Z), así que un ícono escalado solo por altura se sale del plinto y queda flotando en el
      // aire. Se acota la huella a una fracción del lado corto: apoyado y con un vuelo mínimo,
      // que es como se ve el firewall físico de la lámina.
      const huellaMax = Math.min(g.w, g.d) * 0.45 * ICONOS_TAMANO;
      const m0 = medidaAsset(asset);
      if(m0.huella > huellaMax) asset.scale.multiplyScalar(huellaMax / m0.huella);
      const { cara, indice, enCara } = hueco || huecoPerimetral(turno, totalModo, g);
      asset.userData.pared = { cara, modo }; // para repartirParedes (2ª pasada)
      asset.rotation.y = cara.rotY;
      const m = medidaAsset(asset);
      const c = medidasCara(g, cara);
      const fondo = Math.abs(cara.nx) ? m.tam.x : m.tam.z;
      // Pegado a la pared, pero sin pasarse del plinto: en Z la plataforma sobra apenas ~0.19
      // por lado, así que el ícono se recuesta contra el edificio en vez de quedar en el aire.
      // El max() es el tope del tope: cuando el ícono es más ancho que ese sobrante, quedarse
      // dentro del plinto significaría meterlo DENTRO del edificio. Entre volar un poco sobre el
      // borde y atravesar la pared, vuela: solo se le permite solaparse un 15% de su fondo.
      const ancho = Math.abs(cara.nx) ? m.tam.z : m.tam.x;
      const lateral = (indice - (enCara-1)/2) * ancho * 1.2
        + corrimientoFrente(g, cara);
      // 25/09: la pared es la real de su franja (un anexo sobresale de la teórica, ver paredReal).
      const pared = Math.max(c.normal, paredReal(g, cara, lateral - ancho/2, lateral + ancho/2, g.plintoY, g.plintoY + m.alto));
      const dNormal = Math.max(
        pared + fondo*0.15,
        Math.min(pared + fondo/2 + 0.04, c.normalPlinto - fondo/2)
      );
      asset.position.set(
        cara.nx * dNormal + (cara.nx ? 0 : lateral),
        g.plintoY,
        cara.nz * dNormal + (cara.nx ? lateral : 0)
      );
      break;
    }
  }
}

/* 25/09 (Dei) — Pila ANIDADA (Perimetral). Cada instancia aporta sus propias paredes y la
   siguiente envuelve a la anterior: la primera se coloca como el escudo de siempre (`abrazar`) y
   cada capa de afuera se agranda solo en planta (X/Z) para dejar ANIDADO_PASO de aire por lado
   respecto de la anterior, manteniendo la misma altura. El paso es proporcional al cuerpo, así el
   anidado se lee igual en una Sede pequeña que en una Matriz. */
const ANIDADO_PASO = 0.075; // aire entre capas, por lado, como fracción de la huella del cuerpo
function colocarAnidado(asset, factor, g, capa){
  colocarAsset(asset, 'abrazar', factor, g, 0, 1);
  if(!capa) return;
  const m = medidaAsset(asset);
  const huella = m.huella + 2 * capa * ANIDADO_PASO * Math.max(g.cuerpoW, g.cuerpoD);
  const k = huella / m.huella;
  asset.scale.x *= k;
  asset.scale.z *= k;
}

/* T07 paso 2 — Pila de fachada, de cara a la cámara. Para íconos que envuelven el edificio (el
   candado de End Point: aros alrededor + placa con el candado en la fachada), apilar el ícono
   entero duplicaría los aros. Así que se separa en dos:
     · ANILLOS: una sola copia de los aros (la parte grande de las mallas `soloPrimera`), fija,
       del color de la primera instancia.
     · PLACAS: cada instancia aporta su placa con el dibujo del candado, sin los aros. Todas copian la escala y la posición de
       la primera (mismo tamaño, alineadas) y se corren hacia afuera, pegadas cara con cara, como
       la pila de SD-WAN: la primera contra la pared y las demás delante.
   La pila queda ESTÁTICA en la fachada frontal (+Z), como el candado suelto de v46. Se probó
   girarla para que siguiera a la cámara y Dei prefirió que no se mueva (24/09).
   `piezas[0]` tiene que llegar ya colocada (con `colocarAsset`), con los aros todavía puestos. */
/* La malla `Endpoint_loop` del .glb trae en una sola geometría los 3 aros Y el dibujo del
   candado (cuerpo y arco) que va sobre la placa. Se parte por componentes conexas: las grandes
   (lado mayor a PARTIR_LADO_MAX, los aros) quedan fijas; las chicas (el candado) viajan con la
   placa, que es lo que tiene que verse de frente. La geometría es compartida entre instancias,
   así que no se toca: se arman dos geometrías nuevas que reusan los mismos atributos con otro
   índice, y se cachean por geometría. */
const PARTIR_LADO_MAX = 0.3;
const _partidas = new Map();
function partirPorComponentes(geo){
  if(_partidas.has(geo.uuid)) return _partidas.get(geo.uuid);
  const pos = geo.attributes.position;
  const idx = geo.index;
  const padre = Array.from({ length: pos.count }, (_, i)=>i);
  const raiz = i=>{ while(padre[i] !== i){ padre[i] = padre[padre[i]]; i = padre[i]; } return i; };
  const unir = (a, b)=>{ a = raiz(a); b = raiz(b); if(a !== b) padre[a] = b; };
  // Vértices repetidos en las costuras (misma posición, distinta normal) cuentan como uno.
  const porPosicion = {};
  for(let i=0; i<pos.count; i++){
    const k = pos.getX(i).toFixed(4)+','+pos.getY(i).toFixed(4)+','+pos.getZ(i).toFixed(4);
    if(porPosicion[k] !== undefined) unir(i, porPosicion[k]); else porPosicion[k] = i;
  }
  const n = idx ? idx.count : pos.count;
  const v = t=> idx ? idx.getX(t) : t;
  for(let t=0; t<n; t+=3){ unir(v(t), v(t+1)); unir(v(t+1), v(t+2)); }
  const cajas = {};
  const p = new THREE.Vector3();
  for(let i=0; i<pos.count; i++){
    const r = raiz(i);
    (cajas[r] = cajas[r] || new THREE.Box3()).expandByPoint(p.set(pos.getX(i), pos.getY(i), pos.getZ(i)));
  }
  const esChica = {};
  Object.keys(cajas).forEach(r=>{ const t = cajas[r].getSize(new THREE.Vector3()); esChica[r] = Math.max(t.x, t.z) < PARTIR_LADO_MAX; });
  const grandes = [], chicas = [];
  for(let t=0; t<n; t+=3){
    (esChica[raiz(v(t))] ? chicas : grandes).push(v(t), v(t+1), v(t+2));
  }
  const armar = indices=>{
    const g = new THREE.BufferGeometry();
    Object.keys(geo.attributes).forEach(nombre=> g.setAttribute(nombre, geo.attributes[nombre]));
    g.setIndex(indices);
    // computeBoundingBox() recorre TODO el atributo de posición (también los vértices que este
    // índice no usa), así que la caja de las chicas saldría del tamaño de los aros. Se arma a mano.
    const caja = new THREE.Box3(), q = new THREE.Vector3();
    indices.forEach(i=> caja.expandByPoint(q.set(pos.getX(i), pos.getY(i), pos.getZ(i))));
    g.boundingBox = caja;
    g.boundingSphere = caja.getBoundingSphere(new THREE.Sphere());
    return g;
  };
  const r = { grandes: armar(grandes), chicas: armar(chicas) };
  _partidas.set(geo.uuid, r);
  marcarCompartido(r.grandes, r.chicas); // caché: la reusan todas las instancias (recursos.js)
  return r;
}

/* `lateral` (opcional, { anchoMax }): en vez de apilar frente/fondo, pone las placas LADO A LADO
   sobre la pared, en una fila centrada y pegadas. Si la fila no entra en `anchoMax`, se achican
   todas por igual, cada una alrededor de su propio centro para que no se meta en la pared. */
const FILA_ANCHO_MAX = 0.85; // fracción del ancho del cuerpo que puede ocupar la fila de candados
function construirPilaFachada(piezas, soloPrimera, anillos, lateral){
  const base = piezas[0];
  const esMixta = o=> o.isMesh && soloPrimera.includes(o.name);
  if(anillos){
    // En los anillos quedan solo las partes grandes de las mallas mixtas (los aros); el resto sale.
    const fuera = [];
    anillos.traverse(o=>{
      if(!o.isMesh) return;
      if(esMixta(o)) o.geometry = partirPorComponentes(o.geometry).grandes;
      else fuera.push(o);
    });
    fuera.forEach(o=>{ o.parent.remove(o); liberarObjeto3D(o); });
    anillos.scale.copy(base.scale);
    anillos.rotation.copy(base.rotation);
    anillos.position.copy(base.position);
  }

  const placas = new THREE.Group();
  placas.name = 'pilaFachada';
  // En cada placa, de las mallas mixtas queda solo el dibujo del candado.
  piezas.forEach(pz=> pz.traverse(o=>{ if(esMixta(o)) o.geometry = partirPorComponentes(o.geometry).chicas; }));
  // Hacia afuera de la pared = el +Z del ícono ya girado (la cara que el proveedor modeló de
  // frente). En la fachada derecha eso es +X. El fondo de cada placa se mide en esa dirección.
  // El fondo se mide sobre el ícono SIN girar (su +Z de modelo): medido ya girado, en un ícono
  // que no esté alineado a los ejes la caja mezcla ancho y fondo y las piezas quedan separadas.
  const normal = new THREE.Vector3(0, 0, 1).applyEuler(base.rotation);
  const rotOriginal = base.rotation.clone();
  base.rotation.set(0, 0, 0);
  base.updateMatrixWorld(true);
  const tamBase = new THREE.Box3().setFromObject(base).getSize(new THREE.Vector3());
  base.rotation.copy(rotOriginal);

  if(lateral){
    // Fila lado a lado sobre la pared: el eje es el +X del ícono ya girado.
    const eje = new THREE.Vector3(1, 0, 0).applyEuler(base.rotation);
    const n = piezas.length;
    let ancho = tamBase.x * PILA_PASO;
    const k = Math.min(1, lateral.anchoMax / (ancho * n));
    if(k < 1){
      // Achicar alrededor del centro de la placa, no del pivote del ícono (que está en el centro
      // del edificio): si no, la placa se acercaría a la pared y se hundiría en ella.
      base.updateMatrixWorld(true);
      const centro = new THREE.Box3().setFromObject(base).getCenter(new THREE.Vector3());
      const r = base.position.clone().sub(centro).multiplyScalar(k);
      base.scale.multiplyScalar(k);
      base.position.copy(centro).add(r);
      ancho *= k;
    }
    const origen = base.position.clone();
    piezas.forEach((pieza, i)=>{
      pieza.scale.copy(base.scale);
      pieza.rotation.copy(base.rotation);
      pieza.position.copy(origen).addScaledVector(eje, ancho * (i - (n-1)/2));
      placas.add(pieza);
    });
    return { anillos: anillos || null, placas };
  }

  const fondo = tamBase.z * PILA_PASO;
  piezas.forEach((pieza, i)=>{
    pieza.scale.copy(base.scale);
    pieza.rotation.copy(base.rotation);
    pieza.position.copy(base.position).addScaledVector(normal, fondo * i);
    placas.add(pieza);
  });
  return { anillos: anillos || null, placas };
}

/* T07 — Pila VERTICAL (Internet). Las piezas se ponen una ENCIMA de otra, centradas en el mismo
   eje y pegadas (cada una arranca donde termina la de abajo). Todas con el mismo tamaño, que
   depende de cuántas son: `escalas[n-1]` (la última se repite si hay más). Pivote en el centro de
   la base, como un ícono suelto. `alturaRel` = alto total ÷ alto de UNA pieza a tamaño normal,
   para que `cubierta` escale la pila sin deshacer la reducción. */
function construirPilaVertical(piezas, escalas){
  const pila = new THREE.Group();
  pila.name = 'pilaVertical';
  const k = escalas[Math.min(piezas.length - 1, escalas.length - 1)];
  let y = 0, altoNormal = 0;
  piezas.forEach(pieza=>{
    if(!altoNormal) altoNormal = medidaAsset(pieza).alto;
    pieza.scale.multiplyScalar(k);
    const m = medidaAsset(pieza);
    const c = m.caja.getCenter(new THREE.Vector3());
    pieza.position.set(-c.x, y - m.caja.min.y, -c.z);
    y += m.alto * PILA_PASO;
    pila.add(pieza);
  });
  pila.userData.alturaRel = y / Math.max(altoNormal, 0.001);
  pila.userData.escalaPieza = k; // `cubierta` acota la huella del hueco en esta misma proporción
  return pila;
}

/* Marca un ícono (o una pieza de pila) con la instancia a la que pertenece, para que el clic
   seleccione esa instancia. Las heredadas de una Matriz van en estilo "fantasma": mismo ícono y
   color, translúcido, y no editables desde la sede (se editan desde la Matriz). */
function etiquetarAssetDeSede(asset, sede, m){
  if(m.heredado){
    asset.traverse(o=>{
      if(o.material){ o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.5; }
    });
    const ud = { sedeId: sede.id, matrizInstanciaId: m.inst.instanciaId, isHeredadoAsset:true };
    asset.userData = ud;
    asset.traverse(o=>{ o.userData.sedeId=ud.sedeId; o.userData.matrizInstanciaId=ud.matrizInstanciaId; o.userData.isHeredadoAsset=true; });
  } else {
    const ud = { sedeId: sede.id, instanciaId: m.inst.instanciaId, isAsset:true };
    asset.userData = ud;
    asset.traverse(o=>{ o.userData.sedeId=ud.sedeId; o.userData.instanciaId=ud.instanciaId; o.userData.isAsset=true; });
  }
}

/* =========================================================================
   REPARTO SIN SUPERPOSICIÓN (25/09, pedido de Dei)
   "Íconos que son diferentes ocupan su propio espacio." colocarAsset() ubica cada ícono solo,
   sin saber de los demás; estas dos funciones corren después, con todos ya medidos:
   - repartirCubierta: los del techo, en anillo alrededor del puerto (+) si entran; si no, en
     una grilla sobre un techo "virtual" más grande (misma proporción que el real), así que
     pueden quedar un poco fuera del edificio. Nunca se achican ni se pisan.
   - repartirParedes: los de cada pared (fachada y plataforma juntos; máx. 2 por pared, ver
     asignarParedes) en una fila, uno al lado del otro. Si en el frente está la fila de candados,
     lo demás va a su izquierda. La fila puede pasarse del ancho de la pared hacia las esquinas
     de atrás, nunca hacia la esquina que comparten las dos paredes visibles.
   Las pilas (varias instancias del mismo ícono) se tratan como UN ícono: pueden quedar juntas.
   Los aros del candado y el escudo de Perimetral envuelven el edificio y no entran acá.
   ========================================================================= */
const CUBIERTA_SEP = 1.12;       // aire entre íconos del techo (× la suma de sus radios)
const CUBIERTA_CENTRO = 0.6;     // radio libre alrededor del puerto (+) y de lo que va sobre él
const PARED_SEP = 0.1;           // aire entre íconos de una misma pared (unidades de mundo)
function repartirCubierta(items, g){
  const n = items.length;
  if(!n) return;
  const radios = items.map(o=>{ const t = medidaAsset(o).tam; return Math.max(t.x, t.z)/2; });
  const libre = (pos)=> pos.every(([x, z], i)=> Math.hypot(x, z) >= radios[i] + CUBIERTA_CENTRO * 0.5 &&
    pos.every(([x2, z2], j)=> j <= i || Math.hypot(x - x2, z - z2) >= (radios[i] + radios[j]) * 0.98));
  // 1) Si entran en el techo real: anillo parejo alrededor del puerto (el primero a la derecha
  //    de la pantalla), como en la Matriz.
  const rx = g.cuerpoW/2 * CUBIERTA_RADIO, rz = g.cuerpoD/2 * CUBIERTA_RADIO;
  const anillo = radios.map((r, i)=>{ const a = -Math.PI/4 + i * 2*Math.PI / n; return [Math.cos(a)*rx, Math.sin(a)*rz]; });
  if(libre(anillo)){ items.forEach((o, i)=>{ o.position.x = anillo[i][0]; o.position.z = anillo[i][1]; }); return; }
  // 2) Si no: una grilla de casilleros del tamaño del ícono más grande, sobre un techo "virtual"
  //    con la proporción del real, que crece hasta que entran todos sin tocar el centro (+).
  //    Se ocupan primero los casilleros más cercanos al centro y, entre esos, los de atrás (que
  //    en pantalla quedan arriba y no tapan las paredes del frente y de la derecha).
  const celda = Math.max(...radios) * 2 * CUBIERTA_SEP;
  let cols = Math.max(1, Math.floor(g.cuerpoW / celda)), filas = Math.max(1, Math.floor(g.cuerpoD / celda));
  let casilleros = [];
  for(let intento = 0; intento < 40; intento++){
    casilleros = [];
    for(let c = 0; c < cols; c++) for(let f = 0; f < filas; f++){
      const x = (c - (cols-1)/2) * celda, z = (f - (filas-1)/2) * celda;
      if(Math.hypot(x, z) >= celda/2 * 0.9 + CUBIERTA_CENTRO * 0.5) casilleros.push([x, z]);
    }
    if(casilleros.length >= n) break;
    // Crece el lado que deja la grilla más parecida a la forma del techo.
    if((cols + 1) / filas - g.cuerpoW / g.cuerpoD <= g.cuerpoW / g.cuerpoD - cols / (filas + 1)) cols++; else filas++;
  }
  casilleros.sort((p, q)=> ((p[0] + p[1]) - (q[0] + q[1])) || (Math.hypot(...p) - Math.hypot(...q)));
  items.forEach((o, i)=>{ const [x, z] = casilleros[i] || [0, 0]; o.position.x = x; o.position.z = z; });
}
function repartirParedes(items, g, bloqueos){
  const porCara = new Map();
  items.forEach(o=>{
    const c = o.userData.pared.cara;
    if(!porCara.has(c)) porCara.set(c, []);
    porCara.get(c).push(o);
  });
  const lat = (v, cara)=> cara.nx ? v.z : v.x;
  const nor = (v, cara)=> cara.nx ? v.x * cara.nx : v.z * cara.nz;
  porCara.forEach((lista, cara)=>{
    const medidas = lista.map(o=>{
      o.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(o);
      const l0 = Math.min(lat(b.min, cara), lat(b.max, cara)), l1 = Math.max(lat(b.min, cara), lat(b.max, cara));
      const n0 = Math.min(nor(b.min, cara), nor(b.max, cara));
      // Fondo de UNA pieza (en una pila de WAF el grupo entero es más grueso): la primera hija.
      const base = o.name === 'pilaFachada' ? o.children[0] : o;
      const tb = new THREE.Box3().setFromObject(base).getSize(new THREE.Vector3());
      return { o, l0, l1, n0, y0: b.min.y, y1: b.max.y, fondo: cara.nx ? tb.x : tb.z, alto: tb.y };
    }).sort((a, b)=> (a.l0 + a.l1) - (b.l0 + b.l1));
    const total = medidas.reduce((t, m)=> t + (m.l1 - m.l0), 0) + PARED_SEP * (medidas.length - 1);
    // ¿La fila de candados ocupa esta pared? Solo pasa en el frente.
    let bloqueo = null;
    if(cara.nz === 1) bloqueos.forEach(b=>{
      const bb = new THREE.Box3().setFromObject(b);
      bloqueo = bloqueo ? { min: Math.min(bloqueo.min, bb.min.x), max: Math.max(bloqueo.max, bb.max.x) }
        : { min: bb.min.x, max: bb.max.x };
    });
    // Si no entran en la fila de antes y sin tocarse, se reacomoda; si ya estaban bien, se deja.
    const pisados = medidas.some((m, i)=> i > 0 && m.l0 < medidas[i-1].l1 + PARED_SEP*0.5)
      || (bloqueo !== null && medidas.some(m=> m.l1 > bloqueo.min - PARED_SEP*0.5 && m.l0 < bloqueo.max + PARED_SEP*0.5));
    // Sin candados: fila centrada. Con candados: todo a su IZQUIERDA (la esquina de la derecha es
    // la de la otra pared visible, y lo que se pasa de ahí choca con sus íconos).
    let cursor = -total/2, izq = bloqueo && bloqueo.min - PARED_SEP;
    medidas.forEach(m=>{
      const ancho = m.l1 - m.l0;
      if(!pisados) m.nl0 = m.l0;
      else if(bloqueo){ m.nl0 = izq - ancho; izq = m.nl0 - PARED_SEP; }
      else { m.nl0 = cursor; cursor += ancho + PARED_SEP; }
    });
    // 25/09 (Dei): la esquina entre el frente y la derecha es de las dos paredes visibles. Nada de
    // una pared se pasa de esa esquina (se corre la fila entera hacia el otro lado), así un ícono
    // ancho del frente no se mete delante de los de la derecha ni al revés.
    const esquina = cara.nz === 1 ? g.cuerpoW/2 : (cara.nx === 1 ? g.cuerpoD/2 : Infinity);
    const fin = Math.max(...medidas.map(m=> m.nl0 + (m.l1 - m.l0)));
    if(fin > esquina) medidas.forEach(m=>{ m.nl0 -= fin - esquina; });
    const c = medidasCara(g, cara);
    medidas.forEach(m=>{
      const ancho = m.l1 - m.l0;
      const nl0 = m.nl0;
      if(Math.abs(nl0 - m.l0) < 1e-4) return; // no se movió
      const nl1 = nl0 + ancho;
      const dLat = nl0 - m.l0;
      // Fondo: contra la pared real de la franja NUEVA, con las mismas reglas de colocarAsset.
      let atras;
      if(m.o.userData.pared.modo === 'fachada'){
        const pared = paredReal(g, cara, nl0, nl1, m.y0, m.y0 + m.alto);
        atras = Math.max(c.normal, pared) - m.fondo * (pared > c.normal + PARED_SALIENTE ? 0 : 0.45);
      } else {
        const pared = Math.max(c.normal, paredReal(g, cara, nl0, nl1, g.plintoY, g.plintoY + m.alto));
        atras = Math.max(pared + m.fondo*0.15, Math.min(pared + m.fondo/2 + 0.04, c.normalPlinto - m.fondo/2)) - m.fondo/2;
      }
      const dNor = atras - m.n0;
      if(cara.nx){ m.o.position.z += dLat; m.o.position.x += dNor * cara.nx; }
      else { m.o.position.x += dLat; m.o.position.z += dNor * cara.nz; }
    });
  });
}

function refreshSedeAssets(sede){
  // limpiar assets previos
  const old = sede.group.getObjectByName('assetsContainer');
  if(old){ sede.group.remove(old); liberarObjeto3D(old); }
  const container = new THREE.Group();
  container.name = 'assetsContainer';

  const g = geometriaEntidad(sede);
  g.grupo = sede.group; // para medir la pared real del modelo (paredReal)
  // ¿Hay candado de End Point? Su placa ocupa el centro del frente (ver huecoPerimetral).
  const candados = [...sede.instancias, ...(sede.tipo==='matriz' ? [] : (sede.herenciaIds||[]).map(hid=>findInstanciaEnMatrices(hid)).filter(Boolean))]
    .filter(i=>{ const sub = getSubproducto(i.subproductoId); return (sub.assetKey || getProducto(sub.productoNivel2Id).assetKey) === 'candado'; }).length;
  g.frenteOcupado = candados > 0;
  // Con 2 o más candados la fila ocupa todo el frente: lo demás de pared va a la derecha.
  g.frenteLleno = candados > 1;

  const propias = sede.instancias;
  // Productos heredados de Matrices conectadas (solo aplica a sedes reales, no a las Matrices
  // mismas). Se filtran referencias huérfanas por si el producto ya no existe en ninguna Matriz.
  const heredadas = sede.tipo==='matriz' ? [] :
    (sede.herenciaIds||[]).map(hid=>findInstanciaEnMatrices(hid)).filter(Boolean);

  // 1ª pasada: resolver el modo de cada instancia y repartir los huecos. Los modos de ocupación
  // única se asignan por orden de llegada; el que no entra cae a 'plataforma', que no se agota.
  // T07 paso 2: las instancias de un ícono con `apila` se juntan en una sola entrada (una pila),
  // que ocupa un único hueco. Las propias y las heredadas apilan juntas.
  const usados = {};
  const pilas = {};
  const entradas = [];
  [...propias.map(i=>({inst:i, heredado:false})), ...heredadas.map(i=>({inst:i, heredado:true}))]
    .forEach(entrada=>{
      const sub = getSubproducto(entrada.inst.subproductoId);
      const producto = getProducto(sub.productoNivel2Id);
      const clave = sub.assetKey || producto.assetKey;
      const miembro = { ...entrada, sub, producto };
      if(COLOCACION_ICONOS[clave] && COLOCACION_ICONOS[clave].apila){
        if(!pilas[clave]){ pilas[clave] = { clave, miembros:[] }; entradas.push(pilas[clave]); }
        pilas[clave].miembros.push(miembro);
      } else {
        entradas.push({ clave, miembros:[miembro] });
      }
    });
  const planeadas = entradas.map(e=>{
    const colE = COLOCACION_ICONOS[e.clave];
    // Las pilas verticales y las laterales respetan el orden en que se agregaron.
    if(e.miembros.length > 1 && !(colE && (colE.pilaVertical || colE.pilaOrdenAlta))){
      e.miembros.sort((a,b)=> SUBPRODUCTOS.indexOf(a.sub) - SUBPRODUCTOS.indexOf(b.sub));
    }
    let col = COLOCACION_ICONOS[e.clave] || COLOCACION_DEFECTO;
    const tope = HUECOS_POR_MODO[col.modo];
    if(tope !== undefined && (usados[col.modo]||0) >= tope) col = COLOCACION_DEFECTO;
    usados[col.modo] = (usados[col.modo]||0) + 1;
    return { ...e, col, modo: col.modo, factor: col.factor, turno: usados[col.modo]-1 };
  });
  const totalPorModo = planeadas.reduce((acc,p)=>{ acc[p.modo]=(acc[p.modo]||0)+1; return acc; }, {});
  g.hayPortico = !!totalPorModo.portico; // el ícono de Datos se apoya sobre el arco de Acceso
  asignarParedes(planeadas, g); // qué pared le toca a cada ícono de fachada / plataforma (p.hueco)

  // 2ª pasada: construir, colocar y etiquetar
  planeadas.forEach(p=>{
    // Un subproducto puede tener su propio `assetKey` (ago/2026: Firewall Virtual/On Premise,
    // ver AssetRegistry) para distinguirse de sus hermanos, que por defecto comparten el ícono
    // del Producto (N2) — ver comentario del §1 del catálogo.
    const build = AssetRegistry[p.clave] || AssetRegistry.pantalla;
    const visibles = p.miembros.slice(0, PILA_MAX);
    const piezas = visibles.map(m=>{
      const pieza = build(getSubproductoColor(m.sub));
      etiquetarAssetDeSede(pieza, sede, m);
      return pieza;
    });
    if(p.col.pilaAnidada && p.modo === 'abrazar'){
      piezas.forEach((pieza, i)=>{ colocarAnidado(pieza, p.factor, g, i); container.add(pieza); });
      return;
    }
    // Pila "de fachada": íconos que se apoyan contra el edificio (candados, WAF/DNS). El candado
    // pasa por acá aunque sea uno solo, para que el dibujo viaje siempre con su placa. La primera
    // pieza se coloca completa, como un ícono suelto, y de ahí salen la escala y la posición de
    // los aros y de todas las placas, que se corren hacia afuera de la pared.
    if(p.col.apila && p.modo !== 'cubierta' && (p.col.pilaSoloPrimera || piezas.length > 1)){
      colocarAsset(piezas[0], p.modo, p.factor, g, p.turno, totalPorModo[p.modo], p.hueco);
      let anillos = null;
      if(p.col.pilaSoloPrimera){
        anillos = build(getSubproductoColor(visibles[0].sub));
        etiquetarAssetDeSede(anillos, sede, visibles[0]);
      }
      const r = construirPilaFachada(piezas, p.col.pilaSoloPrimera || [], anillos,
        p.col.pilaLateral ? { anchoMax: g.cuerpoW * FILA_ANCHO_MAX } : null);
      if(r.anillos) container.add(r.anillos);
      r.placas.userData.sobrePuerto = p.modo === 'portico' || p.modo === 'puerto';
      // La fila de candados del frente es fija: lo demás de esa pared se acomoda a su lado.
      if(p.col.pilaLateral) r.placas.userData.bloqueaFrente = true;
      else if(piezas[0].userData.pared) r.placas.userData.pared = piezas[0].userData.pared; // pila de WAF/DNS: se mueve entera
      container.add(r.placas);
      return;
    }
    const asset = piezas.length < 2 ? piezas[0]
      : (p.col.pilaVertical ? construirPilaVertical(piezas, p.col.pilaVertical) : construirPila(piezas));
    colocarAsset(asset, p.modo, p.factor, g, p.turno, totalPorModo[p.modo], p.hueco);
    asset.userData.sobrePuerto = p.modo === 'portico' || p.modo === 'puerto';
    container.add(asset);
  });

  // 2ª pasada (25/09, Dei): íconos DISTINTOS nunca se pisan. Los del techo se reparten en un
  // anillo tan grande como haga falta; los de cada pared, en fila. Las pilas (mismo ícono) y lo
  // que envuelve al edificio (aros del candado, escudo) quedan como estaban.
  repartirCubierta(container.children.filter(o=> o.userData.techo), g);
  repartirParedes(container.children.filter(o=> o.userData.pared), g,
    container.children.filter(o=> o.userData.bloqueaFrente));

  sede.group.add(container);
  // La etiqueta de nombre tapaba lo que está parado sobre el "+" (arco de Acceso, ícono de Datos):
  // se sube hasta quedar por encima de lo más alto de eso.
  let topeCentral = 0;
  container.children.forEach(o=>{
    if(!o.userData.sobrePuerto) return;
    topeCentral = Math.max(topeCentral, new THREE.Box3().setFromObject(o).max.y);
  });
  sede.group.userData.alturaMinEtiqueta = topeCentral ? topeCentral + PORTICO_AIRE_ETIQUETA : 0;
}

