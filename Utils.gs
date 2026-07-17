function obtenerHoja(nombreHoja) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(nombreHoja);

  if (!sheet) {
    throw new Error("No existe la hoja requerida: " + nombreHoja);
  }

  return sheet;
}

function obtenerHojaOpcional(nombreHoja) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(nombreHoja);
}

function obtenerConfiguracion() {
  const sheet = obtenerHoja(NOMBRE_HOJA_CONFIGURACION);
  const data = sheet.getDataRange().getValues();
  const config = {};

  for (let i = 1; i < data.length; i++) {
    const parametro = data[i][0];
    const valor = data[i][1];

    if (!parametro) continue;

    config[String(parametro).trim().toUpperCase()] = valor;
  }

  return config;
}

function obtenerConfigValor(config, clave, valorPorDefecto) {
  const valor = config[String(clave).trim().toUpperCase()];
  return valor === "" || valor === null || valor === undefined ? valorPorDefecto : valor;
}

function obtenerConfigProductoRequerido(config, claveBase, producto) {
  const productoNormalizado = normalizarProducto(producto);
  const claveProducto = String(claveBase).trim().toUpperCase() + "_" + productoNormalizado;
  const valor = config[claveProducto];

  if (valor === "" || valor === null || valor === undefined) {
    throw new Error("Falta completar el parametro " + claveProducto + " en la hoja Configuracion.");
  }

  return valor;
}

function venceDentroDeDias(fechaVencimiento, diasAviso) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const vcto = parsearFecha(fechaVencimiento);
  vcto.setHours(0, 0, 0, 0);

  const diferenciaDias = Math.ceil((vcto - hoy) / (1000 * 60 * 60 * 24));

  return diferenciaDias >= 0 && diferenciaDias <= diasAviso;
}

function formatearFecha(fecha) {
  return Utilities.formatDate(parsearFecha(fecha), "America/Lima", "dd/MM/yyyy");
}

function aplicarFormatoFechaHora(sheet, fila, columna) {
  sheet.getRange(fila, columna || 1).setNumberFormat("dd/MM/yyyy HH:mm:ss");
}

function normalizarFechaClave(fecha) {
  return Utilities.formatDate(parsearFecha(fecha), "America/Lima", "yyyyMMdd");
}

function parsearFecha(fecha) {
  if (fecha instanceof Date) {
    return fecha;
  }

  const texto = String(fecha || "").trim();
  const match = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (match) {
    return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  }

  return new Date(fecha);
}

function esEmailValido(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(String(email).trim());
}

function normalizarTexto(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizarAsuntoConversacion(asunto) {
  let resultado = normalizarTexto(asunto);
  let anterior;

  do {
    anterior = resultado;
    resultado = resultado.replace(/^\s*(re|rv|r|fw|fwd)\s*:\s*/i, "").trim();
  } while (resultado !== anterior);

  return resultado;
}

function extraerEmailDesdeRemitente(remitente) {
  const match = String(remitente).match(/<(.+?)>/);

  if (match && match[1]) {
    return match[1].trim().toLowerCase();
  }

  return String(remitente).trim().toLowerCase();
}

function limpiarRespuestaCliente(texto) {
  if (!texto) return "";

  let respuesta = String(texto);
  const cortes = [
    "\nEl ",
    "\r\nEl ",
    "\nOn ",
    "\r\nOn ",
    "\n>",
    "\r\n>",
    "escribio:",
    "wrote:"
  ];

  for (const corte of cortes) {
    const index = respuesta.indexOf(corte);
    if (index !== -1) {
      respuesta = respuesta.substring(0, index);
    }
  }

  return respuesta
    .split("\n")
    .map(linea => linea.trim())
    .filter(linea => linea !== "")
    .join("\n")
    .trim();
}

function reemplazarVariables(texto, cliente, placa, fechaVcto, opcionesRenovacion, extras) {
  const variables = Object.assign({
    CLIENTE: cliente,
    PLACA: placa,
    VENCIMIENTO: fechaVcto,
    OPCIONES_RENOVACION: opcionesRenovacion
  }, extras || {});

  let resultado = String(texto || "");

  Object.keys(variables).forEach(clave => {
    resultado = resultado.replaceAll("{{" + clave + "}}", variables[clave] || "");
  });

  return resultado;
}

function convertirTextoCorreoAHtml(texto) {
  const contenido = String(texto || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  if (!contenido) return "";

  const parrafos = contenido
    .split(/\n\s*\n+/)
    .map(parrafo => escaparHtml(parrafo).replace(/\n/g, "<br>"));

  const htmlParrafos = parrafos
    .map((parrafo, index) => {
      const margen = index === parrafos.length - 1 ? "0" : "0 0 8px 0";
      return '<p style="margin:' + margen + ';">' + parrafo + "</p>";
    })
    .join("");

  return '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.4;color:#202124;">' +
    htmlParrafos +
    "</div>";
}

function escaparHtml(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function generarClaveSeguimiento(registroOrCliente, placa, email, vcto) {
  if (typeof registroOrCliente === "object" && registroOrCliente !== null) {
    const registro = registroOrCliente;

    return [
      normalizarProducto(registro.producto),
      String(registro.cliente || "").trim().toUpperCase(),
      String(registro.placa || "").trim().toUpperCase(),
      String(registro.poliza || "").trim().toUpperCase(),
      String(registro.email || "").trim().toLowerCase(),
      normalizarFechaClave(registro.vcto || registro.vencimiento)
    ].join("|");
  }

  return [
    String(registroOrCliente).trim().toUpperCase(),
    String(placa).trim().toUpperCase(),
    String(email).trim().toLowerCase(),
    normalizarFechaClave(vcto)
  ].join("|");
}

function crearMapaEncabezados(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return crearMapaEncabezadosDesdeFila(headers);
}

function crearMapaEncabezadosDesdeFila(headers) {
  const mapa = {};

  headers.forEach((header, index) => {
    if (!header) return;
    mapa[normalizarNombreColumna(header)] = index + 1;
  });

  return mapa;
}

function obtenerValorFilaPorEncabezado(fila, mapaEncabezados, nombres, valorPorDefecto) {
  const opciones = Array.isArray(nombres) ? nombres : [nombres];

  for (const nombre of opciones) {
    const columna = mapaEncabezados[normalizarNombreColumna(nombre)];

    if (!columna) continue;

    const valor = fila[columna - 1];

    if (!esValorVacio(valor)) {
      return valor;
    }
  }

  return valorPorDefecto;
}

function obtenerTextoFilaPorEncabezado(fila, mapaEncabezados, nombres, valorPorDefecto) {
  const valor = obtenerValorFilaPorEncabezado(fila, mapaEncabezados, nombres, valorPorDefecto || "");
  return esValorVacio(valor) ? (valorPorDefecto || "") : String(valor).trim();
}

function normalizarProducto(producto) {
  const texto = normalizarNombreColumna(producto || PRODUCTOS.SOAT);

  if (texto === "VIDA_LEY" || texto === "SEGURO_VIDA_LEY") return PRODUCTOS.VIDA_LEY;
  if (texto === "SCTR") return PRODUCTOS.SCTR;
  if (texto === "VEHICULAR" || texto === "SEGURO_VEHICULAR") return PRODUCTOS.VEHICULAR;
  if (texto === "LAFT") return PRODUCTOS.LAFT;

  return PRODUCTOS.SOAT;
}

function esRegistroActivo(valorActivo) {
  if (esValorVacio(valorActivo)) {
    return true;
  }

  const texto = normalizarTexto(valorActivo);
  return texto === "si" || texto === "s" || texto === "true" || texto === "activo" || texto === "1";
}

function agregarFilaEnPrimerEspacioLibre(sheet, valores) {
  const fila = obtenerPrimeraFilaVacia(sheet, valores.length);
  sheet.getRange(fila, 1, 1, valores.length).setValues([valores]);
  return fila;
}

function obtenerPrimeraFilaVacia(sheet, anchoBusqueda) {
  const ultimaColumna = Math.max(Number(anchoBusqueda || sheet.getLastColumn()), 1);
  const ultimaFila = Math.max(sheet.getLastRow(), 1);

  if (ultimaFila < 2) {
    return 2;
  }

  const data = sheet.getRange(2, 1, ultimaFila - 1, ultimaColumna).getValues();

  for (let i = 0; i < data.length; i++) {
    const filaVacia = data[i].every(esValorVacio);

    if (filaVacia) {
      return i + 2;
    }
  }

  return ultimaFila + 1;
}

function esValorVacio(valor) {
  return valor === "" || valor === null || valor === undefined || String(valor).trim() === "";
}

function diagnosticarFilasOcupadasRespuestas() {
  HOJAS_RESPUESTAS_PRODUCTO.forEach(configHoja => {
    const sheet = obtenerHojaOpcional(configHoja.hoja);

    if (!sheet) return;

    const ultimaFila = Math.max(sheet.getLastRow(), 1);
    const ultimaColumna = Math.max(sheet.getLastColumn(), 1);
    const data = sheet.getRange(1, 1, ultimaFila, ultimaColumna).getValues();

    data.forEach((fila, index) => {
      const tieneContenido = fila.some(valor => !esValorVacio(valor));

      if (tieneContenido) {
        Logger.log(configHoja.hoja + " - Fila ocupada " + (index + 1) + ": " + JSON.stringify(fila));
      }
    });
  });
}

function normalizarNombreColumna(nombre) {
  return normalizarTexto(nombre)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}
