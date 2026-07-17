function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("AGENTE PREVISORA")
    .addItem("Enviar correos pendientes", "iniciarAgenteRenovaciones")
    .addItem("Revisar respuestas nuevas", "leerRespuestasClientes")
    .addItem("Revisar correos rebotados", "procesarRebotes")
    .addItem("Enviar recordatorios pendientes", "enviarRecordatorios")
    .addSeparator()
    .addItem("Ejecutar todo ahora", "ejecutarAgenteCompleto")
    .addToUi();
}

function ejecutarAgenteCompleto() {
  iniciarAgenteRenovaciones();
  leerRespuestasClientes();
  procesarRebotes();
  enviarRecordatorios();
}
