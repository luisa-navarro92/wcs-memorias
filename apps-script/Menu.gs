/**
 * Menú "Certificados" dentro del Google Sheet.
 * Aprobar significa mover el nombre a la hoja Asistentes y avisarle a la persona.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Certificados')
    .addItem('Aprobar seleccionados', 'aprobarSeleccionados')
    .addToUi();
}

function construirAprobaciones(filas, primeraFila, cantidad) {
  var aprobaciones = [];

  for (var i = 0; i < cantidad; i++) {
    var numeroFila = primeraFila + i;
    if (numeroFila < 2 || numeroFila > filas.length) continue;

    var fila = filas[numeroFila - 1];
    if (String(fila[3]).trim() !== 'Pendiente') continue;

    aprobaciones.push({
      fila: numeroFila,
      nombre: String(fila[1]).trim(),
    });
  }

  return aprobaciones;
}

function aprobarSeleccionados() {
  var ui = SpreadsheetApp.getUi();
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = libro.getActiveSheet();

  if (hoja.getName() !== 'Solicitudes') {
    ui.alert('Abrí la hoja Solicitudes y seleccioná las filas que querés aprobar.');
    return;
  }

  var seleccion = hoja.getActiveRange();
  var aprobaciones = construirAprobaciones(
    hoja.getDataRange().getValues(),
    seleccion.getRow(),
    seleccion.getNumRows()
  );

  if (aprobaciones.length === 0) {
    ui.alert('No hay solicitudes pendientes en la selección.');
    return;
  }

  var asistentes = libro.getSheetByName('Asistentes');

  for (var i = 0; i < aprobaciones.length; i++) {
    var aprobacion = aprobaciones[i];
    asistentes.appendRow([aprobacion.nombre, 'Aprobado manual', new Date()]);
    hoja.getRange(aprobacion.fila, 4).setValue('Aprobado');
  }

  ui.alert(
    'Listo: ' + aprobaciones.length + ' solicitud(es) aprobada(s). ' +
    'Como el sistema ya no guarda el correo de estas personas, avísales por otro medio que su certificado está listo.'
  );
}
