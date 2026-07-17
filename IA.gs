function debeUsarIA(config) {
  const valorConfig = obtenerConfigValor(config || {}, "IA_ACTIVA", CONFIG_IA.ACTIVO);

  if (valorConfig === true) return true;

  const texto = normalizarTexto(valorConfig);
  return texto === "true" || texto === "si" || texto === "1" || texto === "activo";
}

function clasificarRespuestaConIA(respuesta, contexto, config) {
  try {
    const resultado = llamarClasificadorGemini(respuesta, contexto || {}, config || {});
    return normalizarResultadoIA(resultado);
  } catch (error) {
    return crearResultadoClasificacion(
      INTENCIONES.RESPUESTA_NO_CLARA,
      "No se pudo clasificar con IA: " + error.message,
      "IA_ERROR",
      "BAJA"
    );
  }
}

function llamarClasificadorGemini(respuesta, contexto, config) {
  const apiKey = obtenerApiKeyGemini();
  const modelo = obtenerConfigValor(config, "GEMINI_MODEL", CONFIG_IA.MODELO);
  const url = CONFIG_IA.URL_INTERACTIONS;
  const payload = {
    model: modelo,
    input: construirPromptClasificacion(respuesta, contexto),
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: obtenerSchemaClasificacionIA()
    }
  };

  const body = ejecutarGeminiConReintentos(url, apiKey, payload);

  const data = JSON.parse(body);
  const texto = extraerTextoRespuestaGemini(data);
  const json = extraerJsonDesdeTexto(texto);

  return JSON.parse(json);
}

function ejecutarGeminiConReintentos(url, apiKey, payload) {
  const maxIntentos = 4;
  let ultimoStatus = "";
  let ultimoBody = "";

  for (let intento = 1; intento <= maxIntentos; intento++) {
    const response = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      headers: {
        "x-goog-api-key": apiKey
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const status = response.getResponseCode();
    const body = response.getContentText();

    if (status >= 200 && status < 300) {
      return body;
    }

    ultimoStatus = status;
    ultimoBody = body;

    if (!esErrorTransitorioGemini(status, body) || intento === maxIntentos) {
      break;
    }

    Utilities.sleep(calcularEsperaReintento(intento));
  }

  if (esErrorCuotaGemini(ultimoStatus, ultimoBody)) {
    throw new Error("Gemini no tiene cuota disponible para esta API key/proyecto. HTTP " + ultimoStatus + ": " + resumirErrorGemini(ultimoBody));
  }

  throw new Error("Gemini no estuvo disponible tras reintentos. HTTP " + ultimoStatus + ": " + resumirErrorGemini(ultimoBody));
}

function esErrorTransitorioGemini(status, body) {
  if (esErrorCuotaGemini(status, body)) {
    return false;
  }

  return status === 408 || status === 429 || status >= 500;
}

function esErrorCuotaGemini(status, body) {
  if (status !== 429) {
    return false;
  }

  const mensaje = normalizarTexto(resumirErrorGemini(body));
  return mensaje.includes("not enough quota") ||
    mensaje.includes("quota") ||
    mensaje.includes("resource exhausted");
}

function calcularEsperaReintento(intento) {
  const baseMs = Math.pow(2, intento - 1) * 1000;
  const jitterMs = Math.floor(Math.random() * 500);
  return baseMs + jitterMs;
}

function resumirErrorGemini(body) {
  try {
    const data = JSON.parse(body);

    if (data.error && data.error.message) {
      return data.error.message;
    }
  } catch (error) {
    // Devuelve el cuerpo original si Gemini no envio JSON.
  }

  return String(body || "").substring(0, 300);
}

function obtenerApiKeyGemini() {
  const apiKey = PropertiesService
    .getScriptProperties()
    .getProperty(CONFIG_IA.API_KEY_PROPERTY);

  if (!apiKey) {
    throw new Error("Falta configurar Script Property " + CONFIG_IA.API_KEY_PROPERTY);
  }

  return apiKey;
}

function construirPromptClasificacion(respuesta, contexto) {
  return [
    "Eres un asistente de La Previsora para clasificar respuestas de clientes de seguros.",
    "Analiza la conversacion y clasifica la intencion comercial de la RESPUESTA ACTUAL.",
    "La respuesta actual es la decision mas reciente y prevalece sobre mensajes anteriores.",
    "Si antes acepto renovar pero ahora rechaza, clasifica NO_INTERESADO.",
    "Si antes rechazo pero ahora acepta, clasifica ACEPTA_RENOVACION.",
    "Extrae datos utiles sin mezclar como vigentes intenciones antiguas ya corregidas.",
    "No inventes datos. Si no hay certeza, usa RESPUESTA_NO_CLARA y requiereRevision=true.",
    "Intenciones validas:",
    Object.keys(INTENCIONES).map(k => INTENCIONES[k]).join(", "),
    "Reglas:",
    "- Si el cliente envia archivos, planillas o documentos, usa ENVIA_DOCUMENTOS.",
    "- Si pide confirmar si todo esta correcto o si falta algo, usa SOLICITA_VALIDACION.",
    "- Si pide llamada o contacto posterior, usa SOLICITA_CONTACTO.",
    "- Si dice que ya renovo con otra aseguradora o por su cuenta, usa YA_RENOVO.",
    "- Si dice que no desea, no quiere o no esta interesado en renovar, usa NO_INTERESADO.",
    "- Si pide precio, cobertura, link, opciones o detalle, usa SOLICITA_INFORMACION.",
    "- Si pide proceder, renovar o confirma una opcion, usa ACEPTA_RENOVACION.",
    "Contexto:",
    JSON.stringify(contexto || {}),
    "Respuesta del cliente:",
    respuesta
  ].join("\n");
}

function obtenerSchemaClasificacionIA() {
  return {
    type: "object",
    properties: {
      clasificacion: {
        type: "string",
        enum: Object.keys(INTENCIONES).map(k => INTENCIONES[k])
      },
      confianza: {
        type: "string",
        enum: ["ALTA", "MEDIA", "BAJA"]
      },
      observacion: {
        type: "string"
      },
      requiereRevision: {
        type: "boolean"
      },
      datosExtraidos: {
        type: "object",
        properties: {
          aseguradora: { type: "string" },
          producto: { type: "string" },
          fechaContacto: { type: "string" }
        }
      }
    },
    required: ["clasificacion", "confianza", "observacion", "requiereRevision", "datosExtraidos"]
  };
}

function extraerTextoRespuestaGemini(data) {
  if (data.output_text) {
    return data.output_text;
  }

  const partes = [];
  const steps = data.steps || [];

  steps.forEach(step => {
    const content = step.content || [];

    content.forEach(part => {
      if (part.text) {
        partes.push(part.text);
      }
    });
  });

  return partes.join("\n").trim();
}

function extraerJsonDesdeTexto(texto) {
  const limpio = String(texto || "").trim();

  if (limpio.startsWith("{") && limpio.endsWith("}")) {
    return limpio;
  }

  const match = limpio.match(/\{[\s\S]*\}/);

  if (!match) {
    throw new Error("La IA no devolvio JSON parseable");
  }

  return match[0];
}

function normalizarResultadoIA(resultado) {
  const clasificacionesValidas = Object.keys(INTENCIONES).map(k => INTENCIONES[k]);
  const clasificacion = clasificacionesValidas.includes(resultado.clasificacion)
    ? resultado.clasificacion
    : INTENCIONES.RESPUESTA_NO_CLARA;

  const normalizado = crearResultadoClasificacion(
    clasificacion,
    resultado.observacion || obtenerObservacionClasificacion(clasificacion),
    "IA",
    resultado.confianza || "MEDIA",
    resultado.datosExtraidos || {}
  );

  normalizado.requiereRevision = Boolean(resultado.requiereRevision);
  return normalizado;
}
