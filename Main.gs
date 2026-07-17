function iniciarAgenteRenovaciones(productoObjetivo) {
  const seguimientoSheet = obtenerHoja(NOMBRE_HOJA_SEGUIMIENTO);
  const productoFiltrado = productoObjetivo ? normalizarProducto(productoObjetivo) : "";
  const registros = obtenerRegistrosRenovacion(productoFiltrado);
  const clavesProcesadas = obtenerClavesYaProcesadas(seguimientoSheet);
  const config = obtenerConfiguracion();
  const maxEnviosDia = Number(obtenerConfigValor(config, "MAX_ENVIOS_DIA", CONFIG_ENVIO.MAX_ENVIOS_DIA));
  const remitente = obtenerConfigValor(config, "REMITENTE", "");
  const productosAProcesar = productoFiltrado
    ? [productoFiltrado]
    : HOJAS_RENOVACIONES_PRODUCTO.map(item => item.producto);
  const diasAvisoPorProducto = {};

  productosAProcesar.forEach(producto => {
    const dias = Number(obtenerConfigProductoRequerido(config, "DIAS_AVISO", producto));

    if (!Number.isFinite(dias) || dias < 0) {
      throw new Error("DIAS_AVISO_" + producto + " debe ser un numero mayor o igual a 0.");
    }

    diasAvisoPorProducto[producto] = dias;
  });

  let total = 0;
  let enviados = 0;
  let omitidos = 0;
  let errores = 0;

  for (const registro of registros) {
    total++;

    const producto = registro.producto;
    const cliente = registro.cliente;
    const contacto = registro.contacto;
    const email = registro.email;
    const vcto = registro.vcto;
    const placa = registro.placa;
    const poliza = registro.poliza;
    const aseguradoraActual = registro.aseguradoraActual;
    const canal = registro.canal;
    const activo = registro.activo;
    const diasAviso = diasAvisoPorProducto[producto];

    if (!esRegistroActivo(activo)) {
      omitidos++;
      continue;
    }

    if (normalizarTexto(canal) !== "email") {
      omitidos++;
      continue;
    }

    if (!email || !vcto) {
      omitidos++;
      continue;
    }

    if (!venceDentroDeDias(vcto, diasAviso)) {
      omitidos++;
      continue;
    }

    const clave = generarClaveSeguimiento(registro);

    if (clavesProcesadas.has(clave)) {
      omitidos++;
      continue;
    }

    if (!esEmailValido(email)) {
      registrarSeguimiento(registro, ESTADOS.ERROR_VALIDACION, "Correo invalido", "");
      registrarLog("ENVIO", registro, "ERROR", "Correo invalido");
      errores++;
      continue;
    }

    if (enviados >= maxEnviosDia) {
      registrarLog("ENVIO", registro, "OMITIDO", "Se alcanzo el maximo de envios diarios");
      omitidos++;
      continue;
    }

    const opciones = obtenerOpcionesRenovacion(registro);
    const textoOpciones = construirOpcionesCorreo(opciones);
    const fechaVcto = formatearFecha(vcto);
    const extras = {
      PRODUCTO: producto,
      CONTACTO: contacto || cliente,
      EMAIL: email,
      POLIZA: poliza,
      ASEGURADORA_ACTUAL: aseguradoraActual,
      CANAL: canal
    };
    const plantilla = obtenerPlantillaProducto(producto, config);
    const asunto = reemplazarVariables(plantilla.asunto, cliente, placa, fechaVcto, textoOpciones, extras);
    const mensaje = reemplazarVariables(plantilla.cuerpo, cliente, placa, fechaVcto, textoOpciones, extras);
    const opcionesEnvio = remitente ? { name: remitente } : {};
    opcionesEnvio.htmlBody = convertirTextoCorreoAHtml(mensaje);

    try {
      const adjuntos = obtenerAdjuntosOpcionesRenovacion(opciones);

      if (adjuntos.length > 0) {
        opcionesEnvio.attachments = adjuntos;
      }

      GmailApp.sendEmail(email, asunto, mensaje, opcionesEnvio);

      registrarSeguimiento(registro, ESTADOS.ENVIADO, "Correo enviado correctamente", asunto);
      registrarLog("ENVIO", registro, "OK", asunto);

      clavesProcesadas.add(clave);
      enviados++;
    } catch (error) {
      registrarSeguimiento(registro, ESTADOS.ERROR_ENVIO, error.message, asunto);
      registrarLog("ENVIO", registro, "ERROR", error.message);
      errores++;
    }
  }

  Logger.log(`Total registros leidos: ${total}`);
  Logger.log(`Correos enviados: ${enviados}`);
  Logger.log(`Registros omitidos: ${omitidos}`);
  Logger.log(`Errores: ${errores}`);
}

function enviarCorreosAutomatico() {
  iniciarAgenteRenovaciones();
}

function enviarCorreosSOATAutomatico() {
  iniciarAgenteRenovaciones(PRODUCTOS.SOAT);
}

function enviarCorreosVidaLeyAutomatico() {
  iniciarAgenteRenovaciones(PRODUCTOS.VIDA_LEY);
}

function enviarCorreosSCTRAutomatico() {
  iniciarAgenteRenovaciones(PRODUCTOS.SCTR);
}

function enviarCorreosVehicularAutomatico() {
  iniciarAgenteRenovaciones(PRODUCTOS.VEHICULAR);
}

// Alias temporal para ejecuciones o triggers configurados con el nombre anterior.
function iniciarPOC() {
  iniciarAgenteRenovaciones();
}
