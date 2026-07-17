function configurarTriggersAutomaticos() {
  const config = obtenerConfiguracion();
  const respuestasCadaHoras = Number(obtenerConfigValor(config, "RESPUESTAS_CADA_HORAS", CONFIG_RESPUESTAS.CADA_HORAS));
  const rebotesCadaHoras = Number(obtenerConfigValor(config, "REBOTES_CADA_HORAS", CONFIG_REBOTES.CADA_HORAS));
  const horaRecordatorios = Number(obtenerConfigValor(config, "HORA_RECORDATORIOS", CONFIG_RECORDATORIOS.HORA));
  const definiciones = [];

  if (CONFIG_ENVIO.ACTIVO) {
    obtenerConfiguracionTriggersProducto().forEach(configProducto => {
      const horaEnvio = Number(obtenerConfigProductoRequerido(
        config,
        "HORA_ENVIO",
        configProducto.producto
      ));

      validarHoraTrigger(horaEnvio, configProducto.producto);
      definiciones.push({
        funcion: configProducto.funcion,
        tipo: "DIARIO",
        valor: horaEnvio,
        descripcion: configProducto.producto + " a las " + horaEnvio + ":00"
      });
    });
  }

  if (CONFIG_RESPUESTAS.ACTIVO) {
    validarIntervaloHoras(respuestasCadaHoras, "RESPUESTAS_CADA_HORAS");
    definiciones.push({
      funcion: "leerRespuestasAutomatico",
      tipo: "CADA_HORAS",
      valor: respuestasCadaHoras,
      descripcion: "lectura de respuestas cada " + respuestasCadaHoras + " hora(s)"
    });
  }

  if (CONFIG_REBOTES.ACTIVO) {
    validarIntervaloHoras(rebotesCadaHoras, "REBOTES_CADA_HORAS");
    definiciones.push({
      funcion: "procesarRebotesAutomatico",
      tipo: "CADA_HORAS",
      valor: rebotesCadaHoras,
      descripcion: "revision de rebotes cada " + rebotesCadaHoras + " hora(s)"
    });
  }

  if (CONFIG_RECORDATORIOS.ACTIVO) {
    validarHoraTrigger(horaRecordatorios, "RECORDATORIOS");
    definiciones.push({
      funcion: "enviarRecordatoriosAutomatico",
      tipo: "DIARIO",
      valor: horaRecordatorios,
      descripcion: "recordatorios a las " + horaRecordatorios + ":00"
    });
  }

  eliminarTriggersProyecto();
  Utilities.sleep(500);

  const triggersRestantes = ScriptApp.getProjectTriggers().length;

  if (triggersRestantes + definiciones.length > 20) {
    throw new Error(
      "No se pueden crear los triggers: el proyecto superaria el limite de 20. " +
      "Actualmente quedan " + triggersRestantes + " y el agente necesita " + definiciones.length + "."
    );
  }

  definiciones.forEach(crearTriggerSeguro);

  Logger.log("Triggers configurados correctamente: " + definiciones.length);
}

function crearTriggerSeguro(definicion) {
  let ultimoError = null;

  for (let intento = 1; intento <= 3; intento++) {
    try {
      let builder = ScriptApp.newTrigger(definicion.funcion).timeBased();

      if (definicion.tipo === "DIARIO") {
        builder = builder
          .atHour(definicion.valor)
          .everyDays(1)
          .inTimezone("America/Lima");
      } else {
        builder = builder.everyHours(definicion.valor);
      }

      builder.create();
      Logger.log("Trigger creado: " + definicion.descripcion);
      return;
    } catch (error) {
      ultimoError = error;

      if (existeTriggerParaFuncion(definicion.funcion)) {
        Logger.log("Trigger confirmado despues del error temporal: " + definicion.descripcion);
        return;
      }

      if (intento < 3) {
        Utilities.sleep(intento * 1000);
      }
    }
  }

  throw new Error(
    "No se pudo crear el trigger de " + definicion.descripcion + ". Detalle: " +
    (ultimoError && ultimoError.message ? ultimoError.message : ultimoError)
  );
}

function existeTriggerParaFuncion(nombreFuncion) {
  return ScriptApp.getProjectTriggers().some(trigger =>
    trigger.getHandlerFunction() === nombreFuncion
  );
}

function validarIntervaloHoras(valor, parametro) {
  const intervalosPermitidos = [1, 2, 4, 6, 8, 12];

  if (!intervalosPermitidos.includes(valor)) {
    throw new Error(parametro + " debe ser uno de estos valores: " + intervalosPermitidos.join(", ") + ".");
  }
}

function eliminarTriggersProyecto() {
  const triggers = ScriptApp.getProjectTriggers();
  const funcionesAgente = [
    "enviarCorreosAutomatico",
    "enviarCorreosSOATAutomatico",
    "enviarCorreosVidaLeyAutomatico",
    "enviarCorreosSCTRAutomatico",
    "enviarCorreosVehicularAutomatico",
    "leerRespuestasAutomatico",
    "procesarRebotesAutomatico",
    "enviarRecordatoriosAutomatico"
  ];

  triggers.forEach(trigger => {
    const funcion = trigger.getHandlerFunction();

    if (funcionesAgente.includes(funcion)) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function obtenerConfiguracionTriggersProducto() {
  return [
    { producto: PRODUCTOS.SOAT, funcion: "enviarCorreosSOATAutomatico" },
    { producto: PRODUCTOS.VIDA_LEY, funcion: "enviarCorreosVidaLeyAutomatico" },
    { producto: PRODUCTOS.SCTR, funcion: "enviarCorreosSCTRAutomatico" },
    { producto: PRODUCTOS.VEHICULAR, funcion: "enviarCorreosVehicularAutomatico" }
  ];
}

function validarHoraTrigger(hora, producto) {
  if (!Number.isInteger(hora) || hora < 0 || hora > 23) {
    throw new Error("HORA_ENVIO_" + producto + " debe ser un numero entero entre 0 y 23.");
  }
}

function leerRespuestasAutomatico() {
  leerRespuestasClientes();
}

function enviarRecordatoriosAutomatico() {
  enviarRecordatorios();
}
