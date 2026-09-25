/* =========================================================================
   8. DESELECCIONAR
   ========================================================================= */

byId('btnDeselect').addEventListener('click', ()=>{
  state.selectedSedeIds = [];
  const hadConexion = !!state.selectedConexionId;
  state.selectedConexionId = null;
  updateSelectionVisuals();
  if(hadConexion) rebuildConnections();
  renderRightPanel();
});

