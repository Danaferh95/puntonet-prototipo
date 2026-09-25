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
const HUECOS_POR_MODO = { envolver:1, abrazar:1, portico:1, puerto:1, fachada:2 };
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
  const d = dimsEntidad(entity);
  const plintoY = d.h * PLATAFORMA_ALTO_REL;
  return {
    w: d.w, h: d.h, d: d.d,
    plintoY,
    cuerpoW: d.w * PLATAFORMA_CUERPO_REL,
    cuerpoD: d.d * PLATAFORMA_CUERPO_REL,
    cuerpoH: Math.max(0.1, d.h - plintoY),
  };
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

/* T07 paso 1 — Huecos del techo. El puerto (+) de T01 está en el centro, así que los íconos van
   en los cuadrantes del techo del cuerpo, a un cuarto del ancho/fondo del centro (más afuera se
   caen de los techos escalonados de los modelos). El orden importa con la cámara isométrica por
   defecto (mira desde +X/+Z): las diagonales (+X,-Z) y (-X,+Z) quedan a la derecha y a la
   izquierda del puerto en pantalla, mientras que (+X,+Z) y (-X,-Z) quedan justo debajo y encima
   de él y lo tapan. Por eso los dos primeros ocupan los costados. Con más de cuatro se suman los
   cuatro puntos medios, con huecos más chicos. `lado` es la huella máxima de cada ícono. */
const HUECOS_CUBIERTA = [ [1,-1], [-1,1], [1,1], [-1,-1], [1,0], [0,1], [-1,0], [0,-1] ];
const CUBIERTA_AIRE = 0.85; // fracción del hueco que puede ocupar el ícono
function huecoCubierta(g, turno, total){
  const [sx, sz] = HUECOS_CUBIERTA[turno % HUECOS_CUBIERTA.length];
  const divisor = total <= 4 ? 2 : 3;
  return { x: sx * g.cuerpoW/4, z: sz * g.cuerpoD/4, lado: Math.min(g.cuerpoW, g.cuerpoD)/divisor * CUBIERTA_AIRE * ICONOS_TAMANO };
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
function colocarAsset(asset, modo, factor, g, turno, totalModo){
  const huellaCuerpo = Math.max(g.cuerpoW, g.cuerpoD);
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
      const { cara, indice, enCara } = huecoPerimetral(turno, totalModo, g);
      escalarPorAltura(asset, g.cuerpoH * factor);
      asset.rotation.y = cara.rotY;
      const m = medidaAsset(asset);
      const c = medidasCara(g, cara);
      // Semihundido: se mete en la pared el 45% de su fondo ya girado, para que se lea como
      // parte del edificio y no como una calcomanía pegada por delante.
      const fondo = Math.abs(cara.nx) ? m.tam.x : m.tam.z;
      const dNormal = c.normal - fondo*0.45 + fondo/2;
      const lateral = (indice - (enCara-1)/2) * (Math.abs(cara.nx) ? m.tam.z : m.tam.x) * 1.15
        + corrimientoFrente(g, cara);
      asset.position.set(
        cara.nx * dNormal + (cara.nx ? 0 : lateral),
        g.plintoY + (g.cuerpoH - m.alto)/2,
        cara.nz * dNormal + (cara.nx ? lateral : 0)
      );
      break;
    }
    case 'cubierta': {
      // T07 paso 1: el centro del techo es del puerto (+) y de los cables que salen de él (T01),
      // así que los íconos de cubierta se reparten en huecos ALREDEDOR del centro, nunca encima.
      // Cada uno se acota al lado de su hueco para no invadir al vecino ni al puerto.
      const h = huecoCubierta(g, turno, totalModo);
      // Una pila (paso 2) tiene la altura de un ícono, pero su huella es más larga (largoRel):
      // el hueco se agranda en esa proporción para que cada pieza conserve su tamaño.
      // Una pila vertical crece en altura (alturaRel = alto total ÷ alto de un ícono suelto):
      // así cada pieza queda al tamaño que le fijó la pila (normal, 80% o la mitad).
      escalarPorAltura(asset, g.cuerpoH * factor * (asset.userData.alturaRel || 1));
      // Si el hueco acota la huella, la pila vertical se acota en la misma proporción que sus
      // piezas: si no, en una sede chica el globo al 80% quedaría igual que uno suelto.
      const lado = h.lado * Math.max(1, asset.userData.largoRel || 1) * (asset.userData.escalaPieza || 1);
      const m0 = medidaAsset(asset);
      if(m0.huella > lado) asset.scale.multiplyScalar(lado / m0.huella);
      asset.position.set(h.x, g.h, h.z);
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
      const { cara, indice, enCara } = huecoPerimetral(turno, totalModo, g);
      asset.rotation.y = cara.rotY;
      const m = medidaAsset(asset);
      const c = medidasCara(g, cara);
      const fondo = Math.abs(cara.nx) ? m.tam.x : m.tam.z;
      // Pegado a la pared, pero sin pasarse del plinto: en Z la plataforma sobra apenas ~0.19
      // por lado, así que el ícono se recuesta contra el edificio en vez de quedar en el aire.
      // El max() es el tope del tope: cuando el ícono es más ancho que ese sobrante, quedarse
      // dentro del plinto significaría meterlo DENTRO del edificio. Entre volar un poco sobre el
      // borde y atravesar la pared, vuela: solo se le permite solaparse un 15% de su fondo.
      const dNormal = Math.max(
        c.normal + fondo*0.15,
        Math.min(c.normal + fondo/2 + 0.04, c.normalPlinto - fondo/2)
      );
      const lateral = (indice - (enCara-1)/2) * (Math.abs(cara.nx) ? m.tam.z : m.tam.x) * 1.2
        + corrimientoFrente(g, cara);
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
    fuera.forEach(o=>o.parent.remove(o));
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

function refreshSedeAssets(sede){
  // limpiar assets previos
  const old = sede.group.getObjectByName('assetsContainer');
  if(old) sede.group.remove(old);
  const container = new THREE.Group();
  container.name = 'assetsContainer';

  const g = geometriaEntidad(sede);
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
      colocarAsset(piezas[0], p.modo, p.factor, g, p.turno, totalPorModo[p.modo]);
      let anillos = null;
      if(p.col.pilaSoloPrimera){
        anillos = build(getSubproductoColor(visibles[0].sub));
        etiquetarAssetDeSede(anillos, sede, visibles[0]);
      }
      const r = construirPilaFachada(piezas, p.col.pilaSoloPrimera || [], anillos,
        p.col.pilaLateral ? { anchoMax: g.cuerpoW * FILA_ANCHO_MAX } : null);
      if(r.anillos) container.add(r.anillos);
      r.placas.userData.sobrePuerto = p.modo === 'portico' || p.modo === 'puerto';
      container.add(r.placas);
      return;
    }
    const asset = piezas.length < 2 ? piezas[0]
      : (p.col.pilaVertical ? construirPilaVertical(piezas, p.col.pilaVertical) : construirPila(piezas));
    colocarAsset(asset, p.modo, p.factor, g, p.turno, totalPorModo[p.modo]);
    asset.userData.sobrePuerto = p.modo === 'portico' || p.modo === 'puerto';
    container.add(asset);
  });

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

