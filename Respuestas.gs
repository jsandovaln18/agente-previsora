function leerRespuestasClientes() {
  const seguimientoSheet = obtenerHoja(NOMBRE_HOJA_SEGUIMIENTO);
  const seguimiento = seguimientoSheet.getDataRange().getValues();
  const config = obtenerConfiguracion();
  const idsProcesados = obtenerIdsRespuestasProcesadas();
  const query = obtenerConfigValor(config, "GMAIL_QUERY_RESPUESTAS", "newer_than:7d");
  const maxHilos = Number(obtenerConfigValor(config, "MAX_HILOS_RESPUESTAS", 30));
  const emailAgente = obtenerEmailAgente();
  const threads = GmailApp.search(query, 0, maxHilos);

  for (const thread of threads) {
    thread.refresh();
    const mensajes = thread.getMessages();

    for (let j = 0; j < mensajes.length; j++) {
      const msg = mensajes[j];
      const idMensaje = msg.getId();

      if (idsProcesados.has(idMensaje)) continue;

      const remitente = msg.getFrom();
      const emailCliente = extraerEmailDesdeRemitente(remitente);

      if (emailCliente === emailAgente) continue;

      const asunto = msg.getSubject();
      const respuesta = limpiarRespuestaCliente(msg.getPlainBody());
      const tieneAdjuntos = mensajeTieneAdjuntos(msg);
      const fecha = msg.getDate();

      if (!respuesta && !tieneAdjuntos) continue;

      const asuntosConversacion = obtenerAsuntosEnviadosAntesDeRespuesta(mensajes, j, emailAgente);
      asuntosConversacion.push(asunto);
      const filaSeguimiento = buscarFilaSeguimientoPorConversacion(
        seguimiento,
        emailCliente,
        asuntosConversacion
      );

      if (!filaSeguimiento) continue;

      const contexto = {
        producto: filaSeguimiento.producto,
        cliente: filaSeguimiento.cliente,
        placa: filaSeguimiento.placa,
        poliza: filaSeguimiento.poliza,
        email: emailCliente,
        asunto: asunto,
        estadoActual: filaSeguimiento.estado,
        tieneAdjuntos: tieneAdjuntos,
        historialRespuestas: obtenerHistorialRespuestasCliente(mensajes, j, emailAgente)
      };

      const resultado = clasificarRespuestaClienteDetallada(respuesta, contexto, config);
      const respuestasSheet = obtenerHojaRespuestasProducto(filaSeguimiento.producto);

      const filaRespuesta = agregarFilaEnPrimerEspacioLibre(
        respuestasSheet,
        construirFilaRespuestaProducto(filaSeguimiento, fecha, emailCliente, asunto, respuesta, resultado, idMensaje)
      );
      aplicarFormatoFechaHora(respuestasSheet, filaRespuesta, 1);

      actualizarSeguimientoPorRespuesta(seguimientoSheet, filaSeguimiento.rowIndex, resultado);
      filaSeguimiento.estado = resultado.clasificacion;
      idsProcesados.add(idMensaje);
    }
  }
}

function mensajeTieneAdjuntos(mensaje) {
  return mensaje.getAttachments({
    includeInlineImages: false,
    includeAttachments: true
  }).length > 0;
}

function obtenerHistorialRespuestasCliente(mensajes, indiceRespuesta, emailAgente) {
  const historial = [];

  for (let i = 0; i < indiceRespuesta; i++) {
    const remitente = extraerEmailDesdeRemitente(mensajes[i].getFrom());

    if (remitente === emailAgente) continue;

    const texto = limpiarRespuestaCliente(mensajes[i].getPlainBody());

    if (texto) {
      historial.push({
        fecha: mensajes[i].getDate().toISOString(),
        respuesta: texto
      });
    }
  }

  return historial.slice(-5);
}

function obtenerAsuntosEnviadosAntesDeRespuesta(mensajes, indiceRespuesta, emailAgente) {
  const asuntos = [];

  for (let i = indiceRespuesta - 1; i >= 0; i--) {
    const remitente = extraerEmailDesdeRemitente(mensajes[i].getFrom());

    if (remitente === emailAgente) {
      asuntos.push(mensajes[i].getSubject());
    }
  }

  return asuntos;
}

function obtenerEmailAgente() {
  const email = Session.getEffectiveUser().getEmail() || Session.getActiveUser().getEmail();
  return String(email || "").trim().toLowerCase();
}

function obtenerHojaRespuestasProducto(producto) {
  const productoNormalizado = normalizarProducto(producto);
  const configHoja = HOJAS_RESPUESTAS_PRODUCTO.find(item => item.producto === productoNormalizado);

  if (!configHoja) {
    throw new Error("No existe configuracion de hoja de respuestas para producto: " + producto);
  }

  return obtenerHoja(configHoja.hoja);
}

function construirFilaRespuestaProducto(filaSeguimiento, fecha, emailCliente, asunto, respuesta, resultado, idMensaje) {
  const producto = normalizarProducto(filaSeguimiento.producto);
  const estado = obtenerEstadoRespuestaClasificada(resultado);
  const baseInicio = [
    fecha,
    emailCliente,
    filaSeguimiento.cliente,
    filaSeguimiento.contacto || ""
  ];
  const baseFin = [
    asunto,
    respuesta,
    resultado.clasificacion,
    estado,
    resultado.observacion,
    idMensaje,
    resultado.fuente
  ];

  if (producto === PRODUCTOS.SOAT) {
    return baseInicio.concat([
      filaSeguimiento.placa || ""
    ], baseFin);
  }

  if (producto === PRODUCTOS.VIDA_LEY || producto === PRODUCTOS.SCTR) {
    return baseInicio.concat([
      filaSeguimiento.poliza || ""
    ], baseFin);
  }

  return baseInicio.concat([
    filaSeguimiento.placa || "",
    filaSeguimiento.poliza || ""
  ], baseFin);
}

function obtenerEstadoRespuestaClasificada(resultado) {
  if (String(resultado.fuente || "").startsWith("IA_ERROR")) {
    return "IA_ERROR";
  }

  if (String(resultado.fuente || "").startsWith("IA")) {
    return "CLASIFICADO_IA";
  }

  return "CLASIFICADO";
}

function obtenerIdsRespuestasProcesadas() {
  const idsProcesados = new Set();

  HOJAS_RESPUESTAS_PRODUCTO.forEach(configHoja => {
    const sheet = obtenerHojaOpcional(configHoja.hoja);

    if (!sheet) return;

    const respuestas = sheet.getDataRange().getValues();
    const columnas = crearMapaEncabezadosDesdeFila(respuestas[0] || []);

    for (let i = 1; i < respuestas.length; i++) {
      const idMensaje = obtenerValorFilaPorEncabezado(respuestas[i], columnas, "ID_MENSAJE", "");

      if (idMensaje) {
        idsProcesados.add(String(idMensaje).trim());
      }
    }
  });

  return idsProcesados;
}

function clasificarRespuestaCliente(respuesta) {
  return clasificarRespuestaClienteDetallada(respuesta).clasificacion;
}

function clasificarRespuestaClienteDetallada(respuesta, contexto, config) {
  const contextoClasificacion = contexto || {};
  const resultadoReglas = clasificarRespuestaPorReglas(respuesta);

  if (!debeUsarIA(config)) {
    return resolverClasificacionSoloConReglas(resultadoReglas, contextoClasificacion);
  }

  const resultadoIA = clasificarRespuestaConIA(respuesta, contextoClasificacion, config || {});
  return resolverClasificacionConGuardrails(resultadoIA, resultadoReglas, contextoClasificacion);
}

function resolverClasificacionSoloConReglas(resultadoReglas, contextoClasificacion) {
  if (
    contextoClasificacion.tieneAdjuntos &&
    resultadoReglas.clasificacion === INTENCIONES.RESPUESTA_NO_CLARA
  ) {
    return crearResultadoClasificacion(
      INTENCIONES.ENVIA_DOCUMENTOS,
      "Cliente respondio con adjuntos y el texto no fue concluyente.",
      "REGLAS",
      "ALTA"
    );
  }

  return resultadoReglas;
}

function resolverClasificacionConGuardrails(resultadoIA, resultadoReglas, contextoClasificacion) {
  const reglasConPrioridad = [
    INTENCIONES.NO_INTERESADO,
    INTENCIONES.YA_RENOVO
  ];

  if (reglasConPrioridad.includes(resultadoReglas.clasificacion)) {
    resultadoReglas.fuente = resultadoIA.fuente === "IA_ERROR" ? "IA_ERROR+REGLAS" : "IA+REGLAS_GUARDRAIL";
    return resultadoReglas;
  }

  if (
    contextoClasificacion.tieneAdjuntos &&
    resultadoReglas.clasificacion === INTENCIONES.RESPUESTA_NO_CLARA
  ) {
    return crearResultadoClasificacion(
      INTENCIONES.ENVIA_DOCUMENTOS,
      "Cliente respondio con adjuntos y el texto no fue concluyente.",
      resultadoIA.fuente === "IA_ERROR" ? "IA_ERROR+REGLAS" : "IA+REGLAS_GUARDRAIL",
      "ALTA"
    );
  }

  if (resultadoIA.fuente === "IA_ERROR") {
    resultadoReglas.fuente = "IA_ERROR+REGLAS";
    return resultadoReglas;
  }

  return resultadoIA;
}

function clasificarRespuestaPorReglas(respuesta) {
  if (!respuesta) {
    return crearResultadoClasificacion(INTENCIONES.RESPUESTA_NO_CLARA, "Respuesta vacia.", "REGLAS", "BAJA");
  }

  const texto = normalizarTexto(respuesta);

  const noInteresado = [
    "no gracias",
    "no deseo",
    "no me interesa",
    "no estoy interesado",
    "no estamos interesados",
    "no quiero",
    "por ahora no",
    "no procede",
    "no vamos a renovar"
  ];

  const yaRenovo = [
    "ya renove",
    "ya lo renove",
    "ya renovamos",
    "renove con otra",
    "renovamos con otra",
    "otro proveedor",
    "otra aseguradora"
  ];

  const documentos = [
    "adjunto",
    "adjuntamos",
    "envio el archivo",
    "envio excel",
    "comparto la planilla",
    "planilla actualizada",
    "archivo solicitado"
  ];

  const validacion = [
    "esta correcto",
    "todo correcto",
    "falta algo",
    "requieren algo adicional",
    "requieres algo adicional",
    "confirmarme si todo esta correcto"
  ];

  const contacto = [
    "llamame",
    "llameme",
    "me llaman",
    "contactame",
    "contacteme",
    "manana conversamos",
    "coordinar una llamada"
  ];

  const informacion = [
    "precio",
    "costo",
    "cuanto",
    "informacion",
    "detalle",
    "opciones",
    "cotizacion",
    "cobertura",
    "link",
    "forma de pago"
  ];

  const acepta = [
    "si",
    "acepto",
    "renovar",
    "renovar seguro",
    "renovar poliza",
    "renovar póliza",
    "deseo renovar",
    "quiero renovar",
    "quiero renovar seguro",
    "ok quiero renovar",
    "me interesa",
    "estoy interesado",
    "proceder",
    "procede",
    "adelante",
    "confirmo",
    "renovacion y envio de liquidacion"
  ];

  if (contieneAlgunaFrase(texto, yaRenovo)) {
    return crearResultadoClasificacion(INTENCIONES.YA_RENOVO, obtenerObservacionClasificacion(INTENCIONES.YA_RENOVO), "REGLAS", "ALTA");
  }

  if (contieneAlgunaFrase(texto, noInteresado)) {
    return crearResultadoClasificacion(INTENCIONES.NO_INTERESADO, obtenerObservacionClasificacion(INTENCIONES.NO_INTERESADO), "REGLAS", "ALTA");
  }

  if (contieneAlgunaFrase(texto, documentos)) {
    return crearResultadoClasificacion(INTENCIONES.ENVIA_DOCUMENTOS, obtenerObservacionClasificacion(INTENCIONES.ENVIA_DOCUMENTOS), "REGLAS", "ALTA");
  }

  if (contieneAlgunaFrase(texto, validacion)) {
    return crearResultadoClasificacion(INTENCIONES.SOLICITA_VALIDACION, obtenerObservacionClasificacion(INTENCIONES.SOLICITA_VALIDACION), "REGLAS", "MEDIA");
  }

  if (contieneAlgunaFrase(texto, contacto)) {
    return crearResultadoClasificacion(INTENCIONES.SOLICITA_CONTACTO, obtenerObservacionClasificacion(INTENCIONES.SOLICITA_CONTACTO), "REGLAS", "MEDIA");
  }

  if (contieneAlgunaFrase(texto, informacion)) {
    return crearResultadoClasificacion(INTENCIONES.SOLICITA_INFORMACION, obtenerObservacionClasificacion(INTENCIONES.SOLICITA_INFORMACION), "REGLAS", "ALTA");
  }

  if (contieneAlgunaFrase(texto, acepta)) {
    return crearResultadoClasificacion(INTENCIONES.ACEPTA_RENOVACION, obtenerObservacionClasificacion(INTENCIONES.ACEPTA_RENOVACION), "REGLAS", "MEDIA");
  }

  return crearResultadoClasificacion(
    INTENCIONES.RESPUESTA_NO_CLARA,
    obtenerObservacionClasificacion(INTENCIONES.RESPUESTA_NO_CLARA),
    "REGLAS",
    "BAJA"
  );
}

function contieneAlgunaFrase(texto, frases) {
  for (const frase of frases) {
    if (contieneFraseNormalizada(texto, frase)) {
      return true;
    }
  }

  return false;
}

function contieneFraseNormalizada(texto, frase) {
  const textoNormalizado = normalizarTexto(texto).replace(/\s+/g, " ");
  const fraseNormalizada = normalizarTexto(frase).replace(/\s+/g, " ");
  const patron = new RegExp("(^|[^a-z0-9])" + escaparRegex(fraseNormalizada) + "($|[^a-z0-9])");

  return patron.test(textoNormalizado);
}

function escaparRegex(texto) {
  return String(texto || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function crearResultadoClasificacion(clasificacion, observacion, fuente, confianza, datosExtraidos) {
  return {
    clasificacion: clasificacion,
    observacion: observacion,
    fuente: fuente || "REGLAS",
    confianza: confianza || "MEDIA",
    requiereRevision: clasificacion === INTENCIONES.RESPUESTA_NO_CLARA,
    datosExtraidos: datosExtraidos || {}
  };
}
