function obtenerRegistrosRenovacion(productoObjetivo) {
  const registros = [];
  const productoFiltrado = productoObjetivo ? normalizarProducto(productoObjetivo) : "";

  HOJAS_RENOVACIONES_PRODUCTO.forEach(configHoja => {
    if (productoFiltrado && configHoja.producto !== productoFiltrado) return;

    const sheet = obtenerHojaOpcional(configHoja.hoja);

    if (!sheet) return;

    registros.push.apply(
      registros,
      obtenerRegistrosRenovacionDesdeHoja(sheet, configHoja.producto)
    );
  });

  const hojaCompatibilidad = obtenerHojaOpcional(NOMBRE_HOJA_RENOVACIONES);

  if (hojaCompatibilidad && (!productoFiltrado || productoFiltrado === PRODUCTOS.SOAT)) {
    registros.push.apply(
      registros,
      obtenerRegistrosRenovacionDesdeHoja(hojaCompatibilidad, PRODUCTOS.SOAT)
    );
  }

  return registros;
}

function obtenerRegistrosRenovacionDesdeHoja(sheet, productoDefault) {
  const data = sheet.getDataRange().getValues();
  const columnas = crearMapaEncabezados(sheet);
  const registros = [];

  for (let i = 1; i < data.length; i++) {
    const registro = construirRegistroRenovacionDesdeFila(data[i], columnas, productoDefault, sheet.getName(), i + 1);

    if (registro) {
      registros.push(registro);
    }
  }

  return registros;
}

function construirRegistroRenovacionDesdeFila(fila, columnas, productoDefault, nombreHoja, numeroFila) {
  const producto = normalizarProducto(obtenerTextoFilaPorEncabezado(fila, columnas, "PRODUCTO", productoDefault));
  const cliente = obtenerTextoFilaPorEncabezado(fila, columnas, "CLIENTE", "");
  const contacto = obtenerTextoFilaPorEncabezado(fila, columnas, "CONTACTO", "");
  const email = obtenerTextoFilaPorEncabezado(fila, columnas, ["EMAIL", "CORREO"], "");
  const vcto = obtenerValorFilaPorEncabezado(fila, columnas, "VENCIMIENTO", "");
  const placa = obtenerTextoFilaPorEncabezado(fila, columnas, ["PLACA", "PLACA DE RODAJE"], "");
  const poliza = obtenerTextoFilaPorEncabezado(fila, columnas, ["POLIZA", "NRO_POLIZA", "NUMERO_POLIZA"], "");
  const aseguradoraActual = obtenerTextoFilaPorEncabezado(fila, columnas, "ASEGURADORA_ACTUAL", "");
  const canal = obtenerTextoFilaPorEncabezado(fila, columnas, "CANAL", "EMAIL");
  const activo = obtenerValorFilaPorEncabezado(fila, columnas, "ACTIVO", "SI");

  if (!cliente && !email && !vcto && !placa && !poliza) {
    return null;
  }

  return {
    producto: producto,
    cliente: cliente,
    contacto: contacto,
    email: email,
    vcto: vcto,
    placa: placa,
    poliza: poliza,
    aseguradoraActual: aseguradoraActual,
    canal: canal,
    activo: activo,
    hojaOrigen: nombreHoja,
    filaOrigen: numeroFila
  };
}

function obtenerOpcionesRenovacion(registro) {
  const producto = normalizarProducto(registro.producto);

  if (!productoUsaOpcionesRenovacion(producto)) {
    return [];
  }

  const sheet = obtenerHojaOpcionesProducto(producto);

  if (!sheet) {
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const columnas = crearMapaEncabezados(sheet);
  const opciones = [];

  for (let i = 1; i < data.length; i++) {
    const fila = data[i];
    const opcion = construirOpcionRenovacionDesdeFila(fila, columnas, producto);

    if (!opcion) continue;
    if (!opcionCoincideConRegistro(opcion, registro)) continue;

    opciones.push(opcion);
  }

  return opciones;
}

function productoUsaOpcionesRenovacion(producto) {
  const productoNormalizado = normalizarProducto(producto);
  return productoNormalizado === PRODUCTOS.SOAT ||
    productoNormalizado === PRODUCTOS.VEHICULAR;
}

function obtenerHojaOpcionesProducto(producto) {
  const productoNormalizado = normalizarProducto(producto);
  const configHoja = HOJAS_OPCIONES_PRODUCTO.find(item => item.producto === productoNormalizado);

  if (!configHoja) {
    return null;
  }

  return obtenerHojaOpcional(configHoja.hoja);
}

function construirOpcionRenovacionDesdeFila(fila, columnas, productoDefault) {
  const producto = normalizarProducto(obtenerTextoFilaPorEncabezado(fila, columnas, "PRODUCTO", productoDefault));
  const cliente = obtenerTextoFilaPorEncabezado(fila, columnas, "CLIENTE", "");
  const placa = obtenerTextoFilaPorEncabezado(fila, columnas, ["PLACA", "PLACA DE RODAJE"], "");
  const poliza = obtenerTextoFilaPorEncabezado(fila, columnas, ["POLIZA", "NRO_POLIZA", "NUMERO_POLIZA"], "");
  const aseguradora = obtenerTextoFilaPorEncabezado(fila, columnas, "ASEGURADORA", "");
  const precio = obtenerValorFilaPorEncabezado(fila, columnas, ["PRECIO", "COSTO", "PRIMA"], "");
  const descripcion = obtenerTextoFilaPorEncabezado(fila, columnas, "DESCRIPCION", "");
  const link = obtenerTextoFilaPorEncabezado(fila, columnas, ["LINK_PAGO", "LINK"], "");
  const archivoDrive = obtenerTextoFilaPorEncabezado(fila, columnas, ["ARCHIVO_DRIVE", "ADJUNTO_DRIVE"], "");
  const activo = obtenerValorFilaPorEncabezado(fila, columnas, "ACTIVO", "SI");

  if (!esRegistroActivo(activo)) {
    return null;
  }

  if (!cliente && !placa && !poliza && !aseguradora && !descripcion && esValorVacio(precio)) {
    return null;
  }

  return {
    producto: producto,
    cliente: cliente,
    placa: placa,
    poliza: poliza,
    aseguradora: aseguradora,
    precio: precio,
    descripcion: descripcion,
    link: link,
    archivoDrive: archivoDrive
  };
}

function obtenerAdjuntosOpcionesRenovacion(opciones) {
  const adjuntos = [];
  const idsAgregados = new Set();
  let pesoTotal = 0;
  const pesoMaximo = 25 * 1024 * 1024;

  (opciones || []).forEach(opcion => {
    obtenerReferenciasArchivosDrive(opcion.archivoDrive).forEach(referencia => {
      const idArchivo = extraerIdArchivoDrive(referencia);

      if (!idArchivo) {
        throw new Error("No se pudo reconocer el enlace de Drive configurado: " + referencia);
      }

      if (idsAgregados.has(idArchivo)) return;

      try {
        const archivo = DriveApp.getFileById(idArchivo);
        pesoTotal += archivo.getSize();

        if (pesoTotal > pesoMaximo) {
          throw new Error("Los adjuntos superan el limite total de 25 MB por correo.");
        }

        adjuntos.push(archivo.getBlob().setName(archivo.getName()));
        idsAgregados.add(idArchivo);
      } catch (error) {
        throw new Error(
          "No se pudo adjuntar el archivo de Drive " + referencia +
          ". Verifica el enlace y los permisos. Detalle: " + error.message
        );
      }
    });
  });

  return adjuntos;
}

function obtenerReferenciasArchivosDrive(valor) {
  return String(valor || "")
    .split(/[;\n\r]+/)
    .map(referencia => referencia.trim())
    .filter(referencia => referencia !== "");
}

function extraerIdArchivoDrive(referencia) {
  const texto = String(referencia || "").trim();

  if (!texto) return "";

  const patrones = [
    /\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /^([a-zA-Z0-9_-]{20,})$/
  ];

  for (const patron of patrones) {
    const coincidencia = texto.match(patron);

    if (coincidencia && coincidencia[1]) {
      return coincidencia[1];
    }
  }

  return "";
}

function autorizarAccesoDrive() {
  const carpetaPrincipal = DriveApp.getRootFolder();
  Logger.log("Acceso a Google Drive autorizado correctamente: " + carpetaPrincipal.getName());
}

function opcionCoincideConRegistro(opcion, registro) {
  const productoRegistro = normalizarProducto(registro.producto);

  if (opcion.producto && opcion.producto !== productoRegistro) {
    return false;
  }

  if (productoRegistro === PRODUCTOS.SOAT) {
    return coincideTexto(opcion.placa, registro.placa);
  }

  if (productoRegistro === PRODUCTOS.VEHICULAR) {
    return coincideTexto(opcion.placa, registro.placa) ||
      coincideTexto(opcion.poliza, registro.poliza);
  }

  if (productoRegistro === PRODUCTOS.VIDA_LEY || productoRegistro === PRODUCTOS.SCTR) {
    return coincideTexto(opcion.poliza, registro.poliza) ||
      coincideTexto(opcion.cliente, registro.cliente);
  }

  return coincideTexto(opcion.poliza, registro.poliza) ||
    coincideTexto(opcion.placa, registro.placa) ||
    coincideTexto(opcion.cliente, registro.cliente);
}

function coincideTexto(valorOpcion, valorRegistro) {
  if (esValorVacio(valorOpcion) || esValorVacio(valorRegistro)) {
    return false;
  }

  return normalizarTexto(valorOpcion) === normalizarTexto(valorRegistro);
}

function construirOpcionesCorreo(opciones) {
  if (opciones.length === 0) {
    return "";
  }

  let texto = "Opciones disponibles para la renovacion:\n\n";

  opciones.forEach((o, index) => {
    texto += `${index + 1}. ${o.aseguradora || "Opcion de renovacion"}\n`;

    if (o.producto) texto += `Producto: ${o.producto}\n`;
    if (!esValorVacio(o.precio)) texto += `Precio: S/ ${o.precio}\n`;
    if (o.descripcion) texto += `${o.descripcion}\n`;
    if (o.link) texto += `Link: ${o.link}\n`;

    texto += "\n";
  });

  return texto;
}

function obtenerPlantillaProducto(producto, config) {
  const productoNormalizado = normalizarProducto(producto);
  const asuntoKey = "ASUNTO_" + productoNormalizado;
  const cuerpoKey = "CUERPO_" + productoNormalizado;
  const defaults = obtenerPlantillaDefaultProducto(productoNormalizado);

  return {
    asunto: obtenerConfigValor(config, asuntoKey, defaults.asunto),
    cuerpo: obtenerConfigValor(config, cuerpoKey, defaults.cuerpo)
  };
}

function obtenerPlantillaDefaultProducto(producto) {
  if (producto === PRODUCTOS.SOAT) {
    return {
      asunto: "Recordatorio de renovacion SOAT - {{PLACA}}",
      cuerpo: [
        "Estimado(a) {{CLIENTE}},",
        "",
        "Le recordamos que el SOAT asociado a la placa {{PLACA}} vence el {{VENCIMIENTO}}.",
        "{{OPCIONES_RENOVACION}}",
        "",
        "Puede responder este correo para recibir apoyo con la renovacion.",
        "",
        "Saludos cordiales."
      ].join("\n")
    };
  }

  if (producto === PRODUCTOS.VIDA_LEY) {
    return {
      asunto: "Renovacion del Seguro Vida Ley - {{CLIENTE}}",
      cuerpo: [
        "Estimado(a) {{CONTACTO}},",
        "",
        "Esperamos que se encuentren bien.",
        "",
        "Queremos recordarles que el {{VENCIMIENTO}} vence el Seguro Vida Ley de su empresa, vigente con {{ASEGURADORA_ACTUAL}}.",
        "",
        "Para brindarles las mejores opciones, sirvanse proporcionarnos la planilla actualizada de acuerdo con el formato adjunto.",
        "",
        "Quedamos atentos a su respuesta.",
        "",
        "Saludos cordiales."
      ].join("\n")
    };
  }

  if (producto === PRODUCTOS.SCTR) {
    return {
      asunto: "Renovacion SCTR - {{CLIENTE}}",
      cuerpo: [
        "Estimado(a) {{CONTACTO}},",
        "",
        "Les recordamos que la vigencia actual del SCTR esta proxima a vencer.",
        "Para garantizar la continuidad de la cobertura, les solicitamos enviarnos las planillas actualizadas a la brevedad.",
        "",
        "Quedamos atentos a cualquier consulta adicional.",
        "",
        "Saludos cordiales."
      ].join("\n")
    };
  }

  if (producto === PRODUCTOS.VEHICULAR) {
    return {
      asunto: "Opciones de renovacion seguro vehicular - {{PLACA}}",
      cuerpo: [
        "Estimado(a) {{CLIENTE}},",
        "",
        "Esperamos que se encuentre muy bien.",
        "",
        "Queremos recordarle que el {{VENCIMIENTO}} vence el seguro de su vehiculo, actualmente asegurado con {{ASEGURADORA_ACTUAL}}.",
        "",
        "Para brindarle las mejores opciones, hemos gestionado las siguientes alternativas:",
        "",
        "{{OPCIONES_RENOVACION}}",
        "",
        "Quedamos atentos a su confirmacion.",
        "",
        "Saludos cordiales."
      ].join("\n")
    };
  }

  return {
    asunto: "Recordatorio de renovacion {{PRODUCTO}} - {{CLIENTE}}",
    cuerpo: [
      "Estimado(a) {{CLIENTE}},",
      "",
      "Le recordamos que su renovacion {{PRODUCTO}} vence el {{VENCIMIENTO}}.",
      "{{OPCIONES_RENOVACION}}",
      "",
      "Saludos cordiales."
    ].join("\n")
  };
}
