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
    if (String(fila[4]).trim() !== 'Pendiente') continue;

    aprobaciones.push({
      fila: numeroFila,
      nombre: String(fila[1]).trim(),
      correo: String(fila[3]).trim(),
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
    hoja.getRange(aprobacion.fila, 5).setValue('Aprobado');

    MailApp.sendEmail({
      to: aprobacion.correo,
      subject: 'Tu certificado del taller IA Learn ya está disponible',
      body:
        'Hola ' + aprobacion.nombre + ',\n\n' +
        'Ya validamos tu participación en el taller IA Learn: Inteligencia Artificial ' +
        'para la Productividad. Volvé al link de las memorias y descargá tu certificado ' +
        'con los mismos datos que ingresaste.\n\n' +
        'Ximena Villalobos y Luisa Navarro\nPorContar',
    });
  }

  ui.alert('Listo: ' + aprobaciones.length + ' solicitud(es) aprobada(s).');
}
