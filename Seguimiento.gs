function registrarSeguimiento(registro, estado, observacion, ultimoAsunto) {
  const sheet = obtenerHoja(NOMBRE_HOJA_SEGUIMIENTO);
  const fechaActual = new Date();

  const fila = agregarFilaEnPrimerEspacioLibre(sheet, [
    fechaActual,
    normalizarProducto(registro.producto),
    registro.cliente || "",
    registro.contacto || "",
    registro.email || "",
    registro.placa || "",
    registro.poliza || "",
    formatearFecha(registro.vcto || registro.vencimiento),
    estado,
    observacion,
    ultimoAsunto || "",
    registro.hojaOrigen || "",
    registro.filaOrigen || ""
  ]);

  aplicarFormatoFechaHora(sheet, fila, 1);
  actualizarUltimaInteraccionSeguimiento(sheet, fila, fechaActual);
}

function registrarLog(proceso, registro, resultado, detalle) {
  const sheet = obtenerHoja(NOMBRE_HOJA_LOG_ENVIOS);

  const fila = agregarFilaEnPrimerEspacioLibre(sheet, [
    new Date(),
    proceso,
    normalizarProducto(registro.producto),
    registro.cliente || "",
    registro.email || "",
    registro.placa || "",
    registro.poliza || "",
    resultado,
    detalle
  ]);
  aplicarFormatoFechaHora(sheet, fila, 1);
}

function obtenerClavesYaProcesadas(seguimientoSheet) {
  const data = seguimientoSheet.getDataRange().getValues();
  const columnas = crearMapaEncabezadosDesdeFila(data[0] || []);
  const claves = new Set();

  for (let i = 1; i < data.length; i++) {
    const registro = construirRegistroDesdeFilaSeguimiento(data[i], columnas);
    const estado = obtenerTextoFilaPorEncabezado(data[i], columnas, "ESTADO", "");

    if (!registro.email || !registro.vcto) continue;

    if (estadoBloqueaNuevoEnvio(estado)) {
      claves.add(generarClaveSeguimiento(registro));
    }
  }

  return claves;
}

function estadoBloqueaNuevoEnvio(estado) {
  return [
    ESTADOS.ENVIADO,
    ESTADOS.RECORDATORIO_1_ENVIADO,
    ESTADOS.RECORDATORIO_2_ENVIADO,
    ESTADOS.RESPONDIDO,
    ESTADOS.ACEPTA_RENOVACION,
    ESTADOS.SOLICITA_INFORMACION,
    ESTADOS.ENVIA_DOCUMENTOS,
    ESTADOS.SOLICITA_VALIDACION,
    ESTADOS.SOLICITA_CONTACTO,
    ESTADOS.NO_INTERESADO,
    ESTADOS.YA_RENOVO,
    ESTADOS.RESPUESTA_NO_CLARA,
    ESTADOS.REQUIERE_REVISION,
    ESTADOS.REBOTADO,
    ESTADOS.CERRADO
  ].includes(estado);
}

function buscarFilaSeguimientoPorEmail(seguimiento, emailCliente) {
  const columnas = crearMapaEncabezadosDesdeFila(seguimiento[0] || []);
  const emailNormalizado = String(emailCliente || "").trim().toLowerCase();

  for (let i = seguimiento.length - 1; i >= 1; i--) {
    const fila = seguimiento[i];
    const email = obtenerTextoFilaPorEncabezado(fila, columnas, "EMAIL", "").toLowerCase();

    if (emailNormalizado === email) {
      const registro = construirRegistroDesdeFilaSeguimiento(fila, columnas);
      registro.rowIndex = i + 1;
      registro.estado = obtenerTextoFilaPorEncabezado(fila, columnas, "ESTADO", "");
      return registro;
    }
  }

  return null;
}

function buscarFilaSeguimientoPorConversacion(seguimiento, emailCliente, asuntosConversacion) {
  const columnas = crearMapaEncabezadosDesdeFila(seguimiento[0] || []);
  const emailNormalizado = String(emailCliente || "").trim().toLowerCase();
  const asuntos = (asuntosConversacion || [])
    .map(normalizarAsuntoConversacion)
    .filter(asunto => asunto !== "");
  const coincidenciasEmail = [];

  for (let i = seguimiento.length - 1; i >= 1; i--) {
    const fila = seguimiento[i];
    const email = obtenerTextoFilaPorEncabezado(fila, columnas, "EMAIL", "").toLowerCase();

    if (emailNormalizado !== email) continue;

    const registro = construirRegistroDesdeFilaSeguimiento(fila, columnas);
    registro.rowIndex = i + 1;
    registro.estado = obtenerTextoFilaPorEncabezado(fila, columnas, "ESTADO", "");
    registro.ultimoAsunto = obtenerTextoFilaPorEncabezado(fila, columnas, "ULTIMO_ASUNTO", "");
    coincidenciasEmail.push(registro);

    if (asuntos.includes(normalizarAsuntoConversacion(registro.ultimoAsunto))) {
      return registro;
    }
  }

  // Compatibilidad con hojas antiguas: el email basta solo si no es ambiguo.
  return coincidenciasEmail.length === 1 ? coincidenciasEmail[0] : null;
}

function construirRegistroDesdeFilaSeguimiento(fila, columnas) {
  return {
    producto: normalizarProducto(obtenerTextoFilaPorEncabezado(fila, columnas, "PRODUCTO", PRODUCTOS.SOAT)),
    cliente: obtenerTextoFilaPorEncabezado(fila, columnas, "CLIENTE", ""),
    contacto: obtenerTextoFilaPorEncabezado(fila, columnas, "CONTACTO", ""),
    email: obtenerTextoFilaPorEncabezado(fila, columnas, "EMAIL", ""),
    placa: obtenerTextoFilaPorEncabezado(fila, columnas, "PLACA", ""),
    poliza: obtenerTextoFilaPorEncabezado(fila, columnas, "POLIZA", ""),
    vcto: obtenerValorFilaPorEncabezado(fila, columnas, "VENCIMIENTO", ""),
    vencimiento: obtenerValorFilaPorEncabezado(fila, columnas, "VENCIMIENTO", ""),
    ultimaInteraccion: obtenerValorFilaPorEncabezado(fila, columnas, "ULTIMA_INTERACCION", ""),
    hojaOrigen: obtenerTextoFilaPorEncabezado(fila, columnas, "HOJA_ORIGEN", ""),
    filaOrigen: obtenerValorFilaPorEncabezado(fila, columnas, "FILA_ORIGEN", "")
  };
}

function actualizarSeguimientoPorRespuesta(seguimientoSheet, fila, resultadoClasificacion) {
  const columnas = crearMapaEncabezados(seguimientoSheet);
  const estado = resultadoClasificacion.clasificacion || ESTADOS.RESPUESTA_NO_CLARA;
  const observacion = resultadoClasificacion.observacion || obtenerObservacionClasificacion(estado);
  const fechaActual = new Date();

  seguimientoSheet.getRange(fila, columnas.ESTADO).setValue(estado);
  seguimientoSheet.getRange(fila, columnas.OBSERVACION).setValue(observacion);
  actualizarUltimaInteraccionSeguimiento(seguimientoSheet, fila, fechaActual, columnas);
}

function actualizarSeguimientoRecordatorio(seguimientoSheet, fila, estado, observacion, asunto) {
  const columnas = crearMapaEncabezados(seguimientoSheet);
  const fechaActual = new Date();

  seguimientoSheet.getRange(fila, columnas.ESTADO).setValue(estado);
  seguimientoSheet.getRange(fila, columnas.OBSERVACION).setValue(observacion);

  if (columnas.ULTIMO_ASUNTO) {
    seguimientoSheet.getRange(fila, columnas.ULTIMO_ASUNTO).setValue(asunto || "");
  }

  actualizarUltimaInteraccionSeguimiento(seguimientoSheet, fila, fechaActual, columnas);
}

function marcarSeguimientoRebotado(seguimientoSheet, fila, observacion) {
  const columnas = crearMapaEncabezados(seguimientoSheet);
  const fechaActual = new Date();

  seguimientoSheet.getRange(fila, columnas.ESTADO).setValue(ESTADOS.REBOTADO);
  seguimientoSheet.getRange(fila, columnas.OBSERVACION).setValue(observacion || "Correo rebotado / direccion no encontrada");
  actualizarUltimaInteraccionSeguimiento(seguimientoSheet, fila, fechaActual, columnas);
}

function actualizarUltimaInteraccionSeguimiento(seguimientoSheet, fila, fecha, columnas) {
  const mapaColumnas = columnas || crearMapaEncabezados(seguimientoSheet);

  if (!mapaColumnas.ULTIMA_INTERACCION) {
    return;
  }

  seguimientoSheet.getRange(fila, mapaColumnas.ULTIMA_INTERACCION).setValue(fecha);
  aplicarFormatoFechaHora(seguimientoSheet, fila, mapaColumnas.ULTIMA_INTERACCION);
}

function obtenerObservacionClasificacion(clasificacion) {
  switch (clasificacion) {
    case INTENCIONES.ACEPTA_RENOVACION:
      return "Cliente acepto renovar.";
    case INTENCIONES.SOLICITA_INFORMACION:
      return "Cliente solicita mas informacion.";
    case INTENCIONES.ENVIA_DOCUMENTOS:
      return "Cliente envio documentos o adjuntos solicitados.";
    case INTENCIONES.SOLICITA_VALIDACION:
      return "Cliente solicita validacion de informacion o documentos.";
    case INTENCIONES.SOLICITA_CONTACTO:
      return "Cliente solicita contacto comercial.";
    case INTENCIONES.NO_INTERESADO:
      return "Cliente no esta interesado.";
    case INTENCIONES.YA_RENOVO:
      return "Cliente indica que ya renovo por su cuenta o con otro proveedor.";
    default:
      return "Respuesta recibida, requiere revision.";
  }
}
