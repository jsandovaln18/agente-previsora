# Contexto Cliente - Agente Previsora

Este documento consolida la informacion recopilada para orientar el desarrollo del agente de renovaciones de La Previsora. La meta es construir el producto final entregable, reutilizable para distintas campanas y productos de seguros.

## Vision del Producto

El agente no debe ser solo un script de envio de correos. Debe funcionar como un sistema modular para gestionar renovaciones, interpretar respuestas, actualizar seguimiento comercial y escalar hacia asistencia con Gemini cuando las reglas simples no sean suficientes.

Tecnologias base:
- Google Apps Script.
- Google Sheets.
- Gmail Workspace.
- Gemini para clasificacion y redaccion asistida en etapas posteriores.

Alcance esperado:
- Lectura de datos desde Google Sheets.
- Identificacion de vencimientos.
- Envio automatico de correos o mensajes base.
- Gestion de estados por cliente/producto.
- Recordatorios automaticos.
- Lectura y limpieza de respuestas.
- Clasificacion de intencion.
- Actualizacion automatica de seguimiento.
- Alertas comerciales ante interes, solicitud de contacto o casos que requieren accion humana.

Fuera del alcance inicial:
- Integracion directa con aseguradoras.
- Obtencion automatica de tarifas mediante APIs de aseguradoras.
- Portal web administrativo.
- Integracion con CRM.
- Automatizacion de llamadas telefonicas.
- Dashboard o reportes analiticos avanzados.

## Productos Identificados

### SOAT

Flujo principal:
1. Detectar vencimiento.
2. Enviar aviso inicial.
3. Enviar opciones de renovacion por aseguradora.
4. Interpretar respuesta del cliente.
5. Si acepta una opcion, seguir el flujo interno segun aseguradora.
6. Si no responde, enviar recordatorios.
7. Si rechaza o indica que renovo por otro lado, cerrar o marcar seguimiento posterior.

Aseguradoras y procesos frecuentes:
- QUALITAS: enviar numero de cuenta para pago. Luego de recibir pago, proceder con emision.
- RIMAC: indicar que se renovara el SOAT, emitir manualmente y enviar ruta de pago.
- PACIFICO: enviar enlace de renovacion para que el cliente ingrese.
- MAPFRE: indicar que se renovara el SOAT, emitir manualmente y enviar ruta de pago.

Escenarios frecuentes:
- Cliente indica que renovara por su cuenta o con otro proveedor: agradecer, cerrar seguimiento y verificar despues del vencimiento.
- Cliente consulta si las aseguradoras tienen la misma cobertura: responder que si, porque al ser obligatorio todas tienen como minimo las coberturas exigidas por ley.

Plantilla base de aviso por WhatsApp:
> Hola, buen dia. Le recordamos que el SOAT de su vehiculo placa {{PLACA}} vence el {{VENCIMIENTO}}. Puede renovarlo desde ahora y dejar programado el inicio de vigencia para la fecha de vencimiento de su poliza actual. Por favor, confirmenos si desea que le enviemos las cotizaciones.

Recordatorio 1:
> Hola, buen dia. Le escribo para hacer seguimiento al SOAT de su vehiculo {{PLACA}}. Si desea, puedo enviarle las opciones disponibles para que pueda evaluarlas y dejar la renovacion lista desde ahora. Quedo atenta.

Recordatorio 2:
> Hola, buen dia. Le escribo para recordarle que el SOAT de su vehiculo vence en los proximos dias. Aun estamos a tiempo de gestionarlo para que no tenga que preocuparse por el vencimiento. Quedo atenta.

### Seguro Vehicular

Tiene dos tipos de comunicacion:

1. Envio de renovacion ya gestionada:
- Aseguradora.
- Numero de poliza.
- Contratante.
- Vigencia.
- Debito automatico.
- Suma asegurada.
- Costo anual.
- Formato de pago.
- Primer vencimiento.
- Comision de agenciamiento.
- Informacion adicional.

Mensajes importantes:
- Solicitar respuesta en senal de conformidad y recepcion.
- Indicar que la poliza adjunta contiene coberturas, deducibles, exclusiones y condiciones.
- Informar plazo de 15 dias calendario para actualizar datos o anular renovacion.
- Advertir consecuencias por incumplimiento del convenio de pago.
- Solicitar copia firmada del documento adjunto.

2. Envio de opciones de renovacion:
- Fecha de vencimiento.
- Vehiculo: marca, modelo y ano.
- Aseguradora actual.
- Suma asegurada.
- Alternativas por aseguradora.
- Recomendacion basada en menor costo u otro criterio.
- Vigencia de cotizacion, usualmente 7 dias.

### Vida Ley

Patron recurrente:
1. Avisar vencimiento del seguro Vida Ley de la empresa.
2. Solicitar planilla actualizada en formato adjunto.
3. En algunos casos, solicitar documentos LAFT y nombramiento.
4. Recibir planilla/documentos del cliente.
5. Enviar cotizacion u opciones de renovacion.
6. Recomendar cambio de aseguradora si mantiene coberturas y reduce costo.
7. Esperar confirmacion para proceder.

Plantilla corta de solicitud de planilla:
> Estimada/o {{CONTACTO}}, esperamos que esten bien. Queremos recordarles que el {{VENCIMIENTO}} vence el seguro de Vida Ley de su empresa, vigente con {{ASEGURADORA_ACTUAL}}. Para brindarles las mejores opciones, sirvanse proporcionarnos la planilla actualizada de acuerdo con el formato adjunto. Quedo atento a su pronta respuesta.

Plantilla con documentos LAFT:
> Con la finalidad de cotizar el Seguro de Vida Ley correspondiente a la vigencia del {{VIGENCIA}}, apreciamos puedan proporcionarnos la planilla actualizada de acuerdo con el formato adjunto. Adicionalmente, necesitamos carta de nombramiento actualizada, formato de conocimiento del cliente, ficha RUC e imagen del documento de identidad de los representantes legales.

Respuesta frecuente del cliente:
- "Adjunto el archivo solicitado."
- "Por favor tu apoyo con la renovacion y envio de liquidacion para realizar el pago."
- "Procede con {{COMPANIA}} para el Seguro Vida Ley."
- "Requieres de algo adicional para la activacion?"
- "Puedes confirmarme si todo esta correcto?"

### SCTR

Patron recurrente:
1. Avisar vencimiento de vigencia actual.
2. Solicitar planillas actualizadas.
3. Indicar consideraciones de gratificaciones cuando aplique.
4. Recordar que para activar cobertura de Pension SCTR los trabajadores deben tener vinculo contractual formal.

Plantilla base:
> Buenas tardes. Les recordamos que la vigencia actual del SCTR esta proxima a vencer. Para garantizar la continuidad de la cobertura, les solicitamos enviarnos las planillas actualizadas a la brevedad.

Consideracion operativa:
- Si existen gratificaciones programadas, deben incluirse en la planilla del mes correspondiente o considerarse en la declaracion posterior.
- La cobertura requiere trabajadores con vinculo contractual formal.

### LAFT / Conocimiento del Cliente

Este flujo aparece como parte de renovaciones de Vida Ley y procesos empresariales.

Documentos solicitados:
- Carta de nombramiento con fecha actualizada, firma y sello del representante legal.
- Formato de Conocimiento del Cliente llenado, firmado y sellado.
- Formulario PEP si corresponde.
- Ficha RUC.
- Documento de identidad de representantes legales por ambas caras.
- Documento de identidad de accionistas si aplica.

Base normativa referida:
- Resolucion SBS 2660-2015.
- Resolucion SBS 809-2019.
- Ley de Proteccion de Datos Personales N. 29733.

## Intenciones de Respuesta

El agente debe iniciar con reglas deterministicas y usar IA solo cuando la respuesta sea ambigua, incompleta o contextualmente dificil.

Intenciones base:
- ACEPTA_RENOVACION: cliente acepta renovar o pide proceder.
- SOLICITA_INFORMACION: pregunta por precio, cobertura, condiciones, documentos, pasos o links.
- ENVIA_DOCUMENTOS: cliente adjunta planilla, RUC, DNI, nombramiento u otros archivos solicitados.
- SOLICITA_VALIDACION: cliente pregunta si la documentacion esta correcta o si falta algo.
- SOLICITA_CONTACTO: cliente pide llamada, reunion o contacto posterior.
- NO_INTERESADO: cliente no desea renovar.
- YA_RENOVO: cliente indica que ya renovo por su cuenta o con otro proveedor.
- RESPUESTA_NO_CLARA: no se puede determinar intencion con reglas.
- REBOTADO: correo devuelto o direccion invalida.

Ejemplos para IA:
- "Buenas tardes, llameme manana." => SOLICITA_CONTACTO.
- "Ya renove con otra aseguradora." => YA_RENOVO o NO_INTERESADO, con observacion de cierre.
- "Adjunto Excel para tu revision." => ENVIA_DOCUMENTOS.
- "Procede con Rimac." => ACEPTA_RENOVACION, aseguradora seleccionada RIMAC.
- "Puedes confirmarme si todo esta correcto?" => SOLICITA_VALIDACION.

## Estados Operativos Sugeridos

Estados actuales y futuros deben distinguir entre estado comercial y tipo de interaccion.

Estados sugeridos:
- PENDIENTE_ENVIO.
- ENVIADO.
- RECORDATORIO_1_ENVIADO.
- RECORDATORIO_2_ENVIADO.
- RESPONDIDO.
- ACEPTA_RENOVACION.
- SOLICITA_INFORMACION.
- ENVIA_DOCUMENTOS.
- SOLICITA_VALIDACION.
- SOLICITA_CONTACTO.
- NO_INTERESADO.
- YA_RENOVO.
- REBOTADO.
- CERRADO.
- REQUIERE_REVISION.
- ERROR_ENVIO.
- ERROR_VALIDACION.

## Arquitectura Modular Deseada

Mantener archivos independientes por responsabilidad:
- Config.gs: constantes, nombres de hojas, estados, parametros de envio, productos y reglas base.
- Main.gs: orquestacion de alto nivel.
- Renovaciones.gs: lectura de renovaciones, opciones y armado de mensajes.
- Respuestas.gs: lectura, limpieza y clasificacion de respuestas.
- Rebotes.gs: deteccion y registro de correos rebotados.
- Recordatorios.gs: reglas de seguimiento por dias sin respuesta.
- Seguimiento.gs: alta, busqueda y actualizacion de filas de seguimiento.
- Menu.gs: menu en Google Sheets.
- IA.gs: llamadas a Gemini y prompts para casos ambiguos.
- Utils.gs: fechas, emails, normalizacion, validaciones y helpers compartidos.

## Diseno Multi-Producto

El modelo de datos debe evitar depender de SOAT como caso unico. Debe soportar:
- Producto: SOAT, Vehicular, Vida Ley, SCTR u otro.
- Campana.
- Cliente o empresa.
- Contacto.
- Email.
- Placa cuando aplique.
- Poliza cuando aplique.
- Aseguradora actual.
- Fecha de vencimiento.
- Vigencia.
- Opciones de renovacion.
- Documentos requeridos.
- Canal: correo, WhatsApp u otro.
- Estado.
- Ultima interaccion.
- Proximo recordatorio.
- Observacion.

Los datos de entrada se separan por hoja de producto para que el usuario operativo solo vea los campos que necesita. Internamente el agente normaliza cada fila a un formato comun.

## Recomendaciones Para El Google Sheet

La version actual funciona con estas hojas:
- Renovaciones_SOAT.
- Renovaciones_VIDA_LEY.
- Renovaciones_SCTR.
- Renovaciones_VEHICULAR.
- Seguimiento.
- Log_Envios.
- Configuracion.
- Opciones_Renovacion.
- Respuestas_Clientes.

La hoja `Renovaciones` se mantiene solo como compatibilidad temporal. El uso recomendado para el producto final es trabajar con una hoja por producto.

### Renovaciones_SOAT

Columnas obligatorias/recomendadas:
- CAMPANA.
- CLIENTE.
- CONTACTO.
- EMAIL.
- VENCIMIENTO.
- PLACA.
- ASEGURADORA_ACTUAL.
- CANAL.
- ACTIVO.

El agente asigna internamente `PRODUCTO = SOAT`.

### Renovaciones_VIDA_LEY

Columnas obligatorias/recomendadas:
- CAMPANA.
- CLIENTE.
- CONTACTO.
- EMAIL.
- VENCIMIENTO.
- POLIZA.
- ASEGURADORA_ACTUAL.
- CANAL.
- ACTIVO.

El agente asigna internamente `PRODUCTO = VIDA_LEY`.

### Renovaciones_SCTR

Columnas obligatorias/recomendadas:
- CAMPANA.
- CLIENTE.
- CONTACTO.
- EMAIL.
- VENCIMIENTO.
- POLIZA.
- ASEGURADORA_ACTUAL.
- CANAL.
- ACTIVO.

El agente asigna internamente `PRODUCTO = SCTR`.

### Renovaciones_VEHICULAR

Columnas obligatorias/recomendadas:
- CAMPANA.
- CLIENTE.
- CONTACTO.
- EMAIL.
- VENCIMIENTO.
- PLACA.
- POLIZA.
- ASEGURADORA_ACTUAL.
- CANAL.
- ACTIVO.

El agente asigna internamente `PRODUCTO = VEHICULAR`.

Notas generales:
- Si no existe ACTIVO, el agente asume SI.
- Si no existe CANAL, el agente asume EMAIL.
- Quitar espacios accidentales en encabezados, por ejemplo `EMAIL ` debe quedar `EMAIL`.
- `PLACA DE RODAJE` se acepta como equivalente de `PLACA`.

### Seguimiento

Columnas actuales:
- FECHA.
- CLIENTE.
- PLACA.
- EMAIL.
- VENCIMIENTO.
- ESTADO.
- OBSERVACION.

Columnas recomendadas:
- FECHA.
- PRODUCTO.
- CAMPANA.
- CLIENTE.
- CONTACTO.
- EMAIL.
- PLACA.
- POLIZA.
- VENCIMIENTO.
- ESTADO.
- OBSERVACION.
- ULTIMA_INTERACCION.
- PROXIMO_RECORDATORIO.
- INTENTOS_RECORDATORIO.
- ID_ULTIMO_MENSAJE.

### Configuracion

Parametros recomendados adicionales:
- GMAIL_QUERY_RESPUESTAS.
- IA_ACTIVA.
- GEMINI_MODEL.
- ASUNTO_SOAT.
- CUERPO_SOAT.
- ASUNTO_VIDA_LEY.
- CUERPO_VIDA_LEY.
- ASUNTO_SCTR.
- CUERPO_SCTR.
- ASUNTO_VEHICULAR.
- CUERPO_VEHICULAR.
- RECORDATORIO_1_DIAS.
- RECORDATORIO_2_DIAS.
- ASUNTO_RECORDATORIO_1.
- CUERPO_RECORDATORIO_1.
- ASUNTO_RECORDATORIO_2.
- CUERPO_RECORDATORIO_2.

Si no existe una plantilla especifica por producto, el agente usa una plantilla base interna para ese producto. `ASUNTO` y `CUERPO` quedan como parametros antiguos de compatibilidad, pero el uso recomendado es configurar plantillas por producto.

Variables disponibles en plantillas:
- `{{PRODUCTO}}`.
- `{{CAMPANA}}`.
- `{{CLIENTE}}`.
- `{{CONTACTO}}`.
- `{{EMAIL}}`.
- `{{VENCIMIENTO}}`.
- `{{PLACA}}`.
- `{{POLIZA}}`.
- `{{ASEGURADORA_ACTUAL}}`.
- `{{CANAL}}`.
- `{{OPCIONES_RENOVACION}}`.

La API key de Gemini no debe ir en esta hoja. Debe guardarse en Script Properties como `GEMINI_API_KEY`.

Descripcion de parametros:

- `DIAS_AVISO_SOAT`, `DIAS_AVISO_VIDA_LEY`, `DIAS_AVISO_SCTR` y `DIAS_AVISO_VEHICULAR`: cantidad de dias hacia adelante que el agente revisa para cada producto.
- `HORA_ENVIO_SOAT`, `HORA_ENVIO_VIDA_LEY`, `HORA_ENVIO_SCTR` y `HORA_ENVIO_VEHICULAR`: hora diaria de envio de cada producto, en formato de 24 horas.
- `MAX_ENVIOS_DIA`: limite maximo de correos que el agente puede enviar en una ejecucion diaria.
- `REMITENTE`: nombre descriptivo del remitente/equipo. Actualmente es informativo; puede usarse luego en plantillas.
- `RESPUESTAS_CADA_HORAS`: frecuencia del trigger que lee respuestas de Gmail.
- `REBOTES_CADA_HORAS`: frecuencia del trigger que revisa correos rebotados.
- `HORA_RECORDATORIOS`: hora del dia para enviar recordatorios automaticos si se activa ese trigger.
- `RECORDATORIO_1_DIAS`: dias que deben pasar desde el envio inicial para enviar el primer recordatorio.
- `RECORDATORIO_2_DIAS`: dias que deben pasar para enviar el segundo recordatorio.
- `IA_ACTIVA`: activa o desactiva Gemini. Usar `SI` para activar y `NO` para desactivar.
- `GEMINI_MODEL`: modelo Gemini usado para clasificar respuestas ambiguas.
- `GMAIL_QUERY_RESPUESTAS`: busqueda de Gmail usada para encontrar respuestas de clientes.
- `ASUNTO_SOAT`: asunto del correo para registros de `Renovaciones_SOAT`.
- `CUERPO_SOAT`: cuerpo del correo para registros de `Renovaciones_SOAT`.
- `ASUNTO_VIDA_LEY`: asunto del correo para registros de `Renovaciones_VIDA_LEY`.
- `CUERPO_VIDA_LEY`: cuerpo del correo para registros de `Renovaciones_VIDA_LEY`.
- `ASUNTO_SCTR`: asunto del correo para registros de `Renovaciones_SCTR`.
- `CUERPO_SCTR`: cuerpo del correo para registros de `Renovaciones_SCTR`.
- `ASUNTO_VEHICULAR`: asunto del correo para registros de `Renovaciones_VEHICULAR`.
- `CUERPO_VEHICULAR`: cuerpo del correo para registros de `Renovaciones_VEHICULAR`.
- `ASUNTO_RECORDATORIO_1`: asunto del primer recordatorio.
- `CUERPO_RECORDATORIO_1`: cuerpo del primer recordatorio.
- `ASUNTO_RECORDATORIO_2`: asunto del segundo recordatorio.
- `CUERPO_RECORDATORIO_2`: cuerpo del segundo recordatorio.

### Opciones_Renovacion

Columnas recomendadas:
- PRODUCTO.
- CLIENTE.
- PLACA.
- POLIZA.
- ASEGURADORA.
- PRECIO.
- DESCRIPCION.
- LINK_PAGO.
- ACTIVO.

Reglas de busqueda:
- SOAT: busca opciones por PRODUCTO + PLACA.
- VEHICULAR: busca por PRODUCTO + PLACA o PRODUCTO + POLIZA.
- VIDA_LEY: busca por PRODUCTO + POLIZA o PRODUCTO + CLIENTE.
- SCTR: busca por PRODUCTO + POLIZA o PRODUCTO + CLIENTE.

Compatibilidad:
- Si no existe PRODUCTO, el agente asume SOAT.
- `LINK` tambien se acepta como equivalente de `LINK_PAGO`.
- `COSTO` o `PRIMA` tambien se aceptan como equivalentes de `PRECIO`.

### Respuestas_Clientes

Columnas recomendadas adicionales:
- PRODUCTO.
- CAMPANA.
- FUENTE_CLASIFICACION.
- CONFIANZA.
- REQUIERE_REVISION.
- DATOS_EXTRAIDOS_JSON.

### Log_Envios

Columnas recomendadas adicionales:
- ID_MENSAJE.
- PRODUCTO.
- CAMPANA.
- TIPO_EVENTO.

## Menu Esperado en Google Sheets

Menu sugerido:
- AGENTE PREVISORA
  - Enviar correos.
  - Leer respuestas.
  - Procesar rebotes.
  - Enviar recordatorios.
  - Ejecutar agente completo.

## Dashboard

La propuesta comercial no incluye construccion de dashboard. Si el cliente lo solicita despues, debe tratarse como alcance adicional.

Como alternativa liviana dentro del alcance operativo, se mantienen logs y estados en `Seguimiento`, `Respuestas_Clientes` y `Log_Envios`, sin crear vistas analiticas avanzadas.

## Principios de Implementacion

- Mantener codigo modular y mantenible.
- Evitar logica duplicada.
- No hardcodear nombres de hojas, estados ni plantillas.
- Usar constantes y configuracion.
- Usar reglas antes que Gemini para respuestas sencillas.
- Usar Gemini solo en respuestas ambiguas o de alto valor comercial.
- Registrar siempre observaciones entendibles para humanos.
- Evitar reprocesar correos, respuestas o rebotes.
- Preservar trazabilidad con ID de mensaje de Gmail.
- Pensar el sistema como producto reutilizable para futuras campanas.

## Fuentes Revisadas

- Propuesta_2.pdf: propuesta de agente IA para gestion de renovaciones SOAT.
- Renovacion_Guia_Previsora.pdf: guia de automatizacion, escenarios, plantillas y flujos.
- Correos .eml de ejemplos reales: Vida Ley, SCTR, solicitud LAFT, envio de opciones y respuestas recurrentes.
- Capturas compartidas: solicitud interna de ejemplos, tabla de respuestas frecuentes y contexto de plantillas de renovacion.

