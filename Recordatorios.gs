function enviarRecordatorios() {
  const seguimientoSheet = obtenerHoja(NOMBRE_HOJA_SEGUIMIENTO);
  const config = obtenerConfiguracion();
  const data = seguimientoSheet.getDataRange().getValues();
  const columnas = crearMapaEncabezadosDesdeFila(data[0] || []);
  const diasRecordatorio1 = Number(obtenerConfigValor(config, "RECORDATORIO_1_DIAS", 2));
  const diasRecordatorio2 = Number(obtenerConfigValor(config, "RECORDATORIO_2_DIAS", 4));
  const remitente = obtenerConfigValor(config, "REMITENTE", "");

  let enviados = 0;

  for (let i = 1; i < data.length; i++) {
    const fechaEnvio = obtenerValorFilaPorEncabezado(data[i], columnas, "FECHA", "");
    const estado = obtenerTextoFilaPorEncabezado(data[i], columnas, "ESTADO", "");
    const registro = construirRegistroDesdeFilaSeguimiento(data[i], columnas);

    if (!fechaEnvio || !registro.email) continue;
    if (!esEmailValido(registro.email)) continue;

    const diasDesdeEnvio = calcularDiasDesde(fechaEnvio);
    const siguiente = obtenerSiguienteRecordatorio(estado, diasDesdeEnvio, diasRecordatorio1, diasRecordatorio2);

    if (!siguiente) continue;

    const opciones = obtenerOpcionesRenovacion(registro);
    const textoOpciones = construirOpcionesCorreo(opciones);
    const fechaVcto = formatearFecha(registro.vcto);
    const asuntoKey = siguiente.numero === 1 ? "ASUNTO_RECORDATORIO_1" : "ASUNTO_RECORDATORIO_2";
    const cuerpoKey = siguiente.numero === 1 ? "CUERPO_RECORDATORIO_1" : "CUERPO_RECORDATORIO_2";
    const asuntoBase = obtenerConfigValor(config, asuntoKey, "Recordatorio de renovacion {{PRODUCTO}} - {{CLIENTE}}");
    const cuerpoBase = obtenerConfigValor(config, cuerpoKey, obtenerPlantillaRecordatorio(siguiente.numero));
    const extras = {
      PRODUCTO: registro.producto,
      CONTACTO: registro.contacto || registro.cliente,
      EMAIL: registro.email,
      POLIZA: registro.poliza
    };
    const asunto = reemplazarVariables(asuntoBase, registro.cliente, registro.placa, fechaVcto, textoOpciones, extras);
    const cuerpo = reemplazarVariables(cuerpoBase, registro.cliente, registro.placa, fechaVcto, textoOpciones, extras);
    const opcionesEnvio = remitente ? { name: remitente } : {};
    opcionesEnvio.htmlBody = convertirTextoCorreoAHtml(cuerpo);

    try {
      GmailApp.sendEmail(registro.email, asunto, cuerpo, opcionesEnvio);
      actualizarSeguimientoRecordatorio(
        seguimientoSheet,
        i + 1,
        siguiente.estado,
        "Recordatorio " + siguiente.numero + " enviado correctamente",
        asunto
      );
      registrarLog("RECORDATORIO", registro, "OK", asunto);
      enviados++;
    } catch (error) {
      registrarLog("RECORDATORIO", registro, "ERROR", error.message);
    }
  }

  Logger.log("Recordatorios enviados: " + enviados);
}

function obtenerSiguienteRecordatorio(estado, diasDesdeEnvio, diasRecordatorio1, diasRecordatorio2) {
  if (estado === ESTADOS.ENVIADO && diasDesdeEnvio >= diasRecordatorio1) {
    return {
      numero: 1,
      estado: ESTADOS.RECORDATORIO_1_ENVIADO
    };
  }

  if (estado === ESTADOS.RECORDATORIO_1_ENVIADO && diasDesdeEnvio >= diasRecordatorio2) {
    return {
      numero: 2,
      estado: ESTADOS.RECORDATORIO_2_ENVIADO
    };
  }

  return null;
}

function calcularDiasDesde(fecha) {
  const inicio = new Date(fecha);
  inicio.setHours(0, 0, 0, 0);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24));
}

function obtenerPlantillaRecordatorio(numero) {
  if (numero === 1) {
    return [
      "Estimado(a) {{CONTACTO}},",
      "",
      "Le escribimos para hacer seguimiento a la renovacion {{PRODUCTO}} de {{CLIENTE}}.",
      "{{OPCIONES_RENOVACION}}",
      "Puede responder este correo para recibir apoyo con la renovacion.",
      "",
      "Saludos cordiales."
    ].join("\n");
  }

  return [
    "Estimado(a) {{CONTACTO}},",
    "",
    "Le recordamos que la renovacion {{PRODUCTO}} de {{CLIENTE}} vence el {{VENCIMIENTO}}.",
    "Aun estamos a tiempo de gestionarla para evitar inconvenientes con el vencimiento.",
    "{{OPCIONES_RENOVACION}}",
    "",
    "Saludos cordiales."
  ].join("\n");
}
