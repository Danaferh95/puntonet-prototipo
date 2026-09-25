/* --- Loop de render --- */
const clock = new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  state.matrices.forEach(matriz=>{
    const shell = matriz.group.getObjectByName('hubShell');
    if(shell) shell.rotation.y = t * 0.25;
    const shell2 = matriz.group.getObjectByName('hubShell2');
    if(shell2) shell2.rotation.y = -t * 0.35;
  });

  connectionAnims.forEach(c=>{
    const tt = (t * c.speed * 0.3 + c.phase) % 1;
    const p = c.curve.getPointAt(tt);
    c.particle.position.copy(p);
    c.particle.scale.setScalar(1 + Math.sin(t * PARTICULA_TITILEO + c.phase * 6.28) * 0.12); // brillo que respira
  });
  updateSatelliteAnims(t);
  updateSdwanAnims(t);
  animarModelos(t);
  actualizarGlowPiso(); // §3A-bis: halo de luz en el piso bajo cada entidad

  // pulso sutil en los puertos de conexión, para invitar a arrastrar desde ahí
  const portPulse = 1 + Math.sin(t*3) * 0.14;
  scene.traverse(o=>{
    if(o.userData && o.userData.isPort) o.scale.setScalar(PORT_BASE_SCALE * portPulse);
    normalizarMaterialesUI(o); // §3A-ter: mantiene cables, halos, badges y sprites fuera de la curva filmica
  });

  renderizarFrame(true); // v17: escena + bloom de los emisivos (§3C)
  updateNameLabelPositions();
}

/* --- v16: carga de modelos .glb ---
   La escena arranca de inmediato con las primitivas (el Datacenter ya está dibujado). Cuando los
   modelos terminan de cargar — con los datos embebidos es cuestión de milisegundos —, cada
   entidad que ya exista se reconstruye con su modelo, conservando posición, productos,
   conexiones y selección. Las que se creen después ya nacen con el modelo. */
function reconstruirGrupoEntidad(entity, build){
  const group = build();
  group.position.copy(entity.group.position);
  scene.remove(entity.group);
  scene.add(group);
  entity.group = group;
  tagEntityGroup(group, entity.id);
  refreshSedeAssets(entity);
  updateSedeNameSprite(entity);
}
function aplicarModelosAEscena(){
  construirDatacenter();
  refreshSedeAssets(state.datacenter);
  if(!state.datacenter.activo) datacenterGroup.visible = false;
  state.sedes.forEach(sede=> rebuildSedeMeshIfNeeded(sede, sede.tamano, true));
  state.matrices.forEach(m=> reconstruirGrupoEntidad(m, buildMatrizMesh));
  state.nubes.forEach(n=> reconstruirGrupoEntidad(n, buildNubeMesh));
  rebuildConnections();
  updateSelectionVisuals();
  // §3A-bis: el glow del piso se ajusta solo a la huella nueva (actualizarGlowPiso compara w/d).
}

