function procesarRebotes() {
  const seguimientoSheet = obtenerHoja(NOMBRE_HOJA_SEGUIMIENTO);
  const data = seguimientoSheet.getDataRange().getValues();
  const columnas = crearMapaEncabezadosDesdeFila(data[0] || []);
  const idsProcesados = obtenerIdsRebotesProcesados();
  const threads = GmailApp.search("newer_than:7d from:mailer-daemon@googlemail.com");

  let rebotesDetectados = 0;

  for (const thread of threads) {
    const messages = thread.getMessages();

    for (const msg of messages) {
      const idMensaje = msg.getId();

      if (idsProcesados.has(idMensaje)) continue;

      const contenido = (
        msg.getSubject() + " " +
        msg.getPlainBody() + " " +
        msg.getBody()
      ).toLowerCase();

      let procesado = false;

      for (let i = 1; i < data.length; i++) {
        const registro = construirRegistroDesdeFilaSeguimiento(data[i], columnas);
        const email = String(registro.email || "").trim().toLowerCase();
        const estado = obtenerTextoFilaPorEncabezado(data[i], columnas, "ESTADO", "");

        if (!email) continue;
        if (estado === ESTADOS.REBOTADO) continue;

        if (contenido.includes(email)) {
          marcarSeguimientoRebotado(seguimientoSheet, i + 1, "Correo rebotado / direccion no encontrada");
          registrarLog("REBOTE", registro, "REBOTADO", "Detectado desde Mail Delivery Subsystem");

          rebotesDetectados++;
          procesado = true;
        }
      }

      if (procesado) {
        idsProcesados.add(idMensaje);
      }
    }
  }

  guardarIdsRebotesProcesados(idsProcesados);
  Logger.log("Rebotes detectados: " + rebotesDetectados);
}

function procesarRebotesAutomatico() {
  procesarRebotes();
}

function obtenerIdsRebotesProcesados() {
  const raw = PropertiesService.getScriptProperties().getProperty("REBOTES_IDS_PROCESADOS");

  if (!raw) {
    return new Set();
  }

  try {
    return new Set(JSON.parse(raw));
  } catch (error) {
    return new Set();
  }
}

function guardarIdsRebotesProcesados(idsProcesados) {
  const ids = Array.from(idsProcesados).slice(-500);
  PropertiesService.getScriptProperties().setProperty("REBOTES_IDS_PROCESADOS", JSON.stringify(ids));
}
