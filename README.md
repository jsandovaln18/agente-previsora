# agente-previsora

Agente de renovaciones para La Previsora construido con Google Apps Script, Google Sheets, Gmail y Gemini.

Las hojas principales de registros se separan por producto:

- `Renovaciones_SOAT`
- `Renovaciones_VIDA_LEY`
- `Renovaciones_SCTR`
- `Renovaciones_VEHICULAR`

La hoja `Renovaciones` queda solo como compatibilidad temporal.

El encabezado de fecha de vencimiento debe ser `VENCIMIENTO`.

Las plantillas de correo pueden configurarse por producto en la hoja `Configuracion`, por ejemplo `ASUNTO_SOAT`, `CUERPO_SOAT`, `ASUNTO_VIDA_LEY` y `CUERPO_VIDA_LEY`. Si falta una plantilla especifica, el agente usa una plantilla base interna para ese producto.

Las opciones de renovacion tambien se separan por producto:

- `Opciones_SOAT`
- `Opciones_VEHICULAR`

En `Opciones_VEHICULAR`, la columna opcional `ARCHIVO_DRIVE` permite adjuntar al correo el archivo de cotizacion asociado a cada opcion. Se puede pegar el enlace normal de Google Drive o el ID del archivo. Para adjuntar varios archivos en una opcion, separar los enlaces con punto y coma o con saltos de linea. La cuenta que ejecuta Apps Script debe tener acceso a todos los archivos.

Las respuestas clasificadas se guardan por producto:

- `Respuestas_SOAT`
- `Respuestas_VIDA_LEY`
- `Respuestas_SCTR`
- `Respuestas_VEHICULAR`

## Modulos

- `Config.gs`: constantes, nombres de hojas, estados, productos e intenciones.
- `Main.gs`: orquestacion del envio inicial.
- `Renovaciones.gs`: opciones de renovacion y armado del bloque de opciones.
- `Respuestas.gs`: lectura, limpieza y clasificacion de respuestas.
- `IA.gs`: clasificacion con Gemini como fallback configurable.
- `Rebotes.gs`: deteccion de correos rebotados con deduplicacion.
- `Recordatorios.gs`: envio de recordatorios por dias sin respuesta.
- `Seguimiento.gs`: altas, logs y actualizacion de estados.
- `Menu.gs`: menu en Google Sheets.
- `Triggers.gs`: configuracion de triggers.
- `Utils.gs`: helpers compartidos.

## IA

La IA usa Gemini y esta apagada por defecto. Para activarla:

1. Guardar la API key en Apps Script > Project Settings > Script Properties:
   - `GEMINI_API_KEY`
2. Agregar en la hoja `Configuracion`:
   - `IA_ACTIVA` = `SI`
   - `GEMINI_MODEL` = modelo a usar

El flujo primero usa reglas locales. Solo llama a IA cuando la respuesta queda como `RESPUESTA_NO_CLARA`.

## Configuracion operativa recomendada

- `DIAS_AVISO_SOAT` y `HORA_ENVIO_SOAT`: anticipacion y hora de envio de SOAT.
- `DIAS_AVISO_VIDA_LEY` y `HORA_ENVIO_VIDA_LEY`: anticipacion y hora de envio de Vida Ley.
- `DIAS_AVISO_SCTR` y `HORA_ENVIO_SCTR`: anticipacion y hora de envio de SCTR.
- `DIAS_AVISO_VEHICULAR` y `HORA_ENVIO_VEHICULAR`: anticipacion y hora de envio de Vehicular.
- `GMAIL_QUERY_RESPUESTAS`: busqueda de Gmail para localizar respuestas, por ejemplo `newer_than:7d`.
- `MAX_HILOS_RESPUESTAS`: cantidad maxima de hilos de Gmail a revisar por ejecucion. Valor sugerido: `30`.
