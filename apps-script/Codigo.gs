/**
 * Web App que recibe las solicitudes de certificado.
 * Publicar como aplicación web: ejecutar como yo, acceso para cualquier persona.
 */

var ID_HOJA = 'REEMPLAZAR_CON_EL_ID_DEL_SHEET';
var CORREO_AVISOS = 'info.porcontar@gmail.com';

function doPost(e) {
  var candado = LockService.getScriptLock();
  var respuesta;

  try {
    candado.waitLock(20000);
    var datos = JSON.parse(e.postData.contents);
    respuesta = procesarSolicitud(datos, crearRepositorio());
  } catch (error) {
    respuesta = { estado: 'error', mensaje: 'No pudimos registrar tu solicitud: ' + error.message };
  } finally {
    candado.releaseLock();
  }

  return ContentService.createTextOutput(JSON.stringify(respuesta))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ estado: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function crearRepositorio() {
  var libro = SpreadsheetApp.openById(ID_HOJA);

  return {
    leerAsistentes: function () {
      var filas = libro.getSheetByName('Asistentes').getDataRange().getValues();
      return filas
        .slice(1)
        .map(function (fila) { return String(fila[0]).trim(); })
        .filter(function (nombre) { return nombre !== ''; });
    },

    yaDescargo: function (cedula) {
      var filas = libro.getSheetByName('Descargas').getDataRange().getValues();
      return filas.slice(1).some(function (fila) {
        return String(fila[3]).replace(/\D/g, '') === cedula;
      });
    },

    registrarDescarga: function (datos, nombreEnLista, tipo) {
      libro.getSheetByName('Descargas').appendRow([
        new Date(),
        String(datos.nombre).trim(),
        nombreEnLista,
        String(datos.cedula).replace(/\D/g, ''),
        String(datos.correo).trim(),
        tipo === 'repetida' ? 'Repetida' : 'Primera descarga',
      ]);
    },

    registrarSolicitud: function (datos) {
      libro.getSheetByName('Solicitudes').appendRow([
        new Date(),
        String(datos.nombre).trim(),
        String(datos.cedula).replace(/\D/g, ''),
        String(datos.correo).trim(),
        'Pendiente',
      ]);
    },

    notificarSolicitud: function (datos) {
      MailApp.sendEmail({
        to: CORREO_AVISOS,
        subject: 'Certificado IA Learn WCS: solicitud por aprobar',
        body:
          'Alguien pidió su certificado y no aparece en la lista de asistentes.\n\n' +
          'Nombre: ' + datos.nombre + '\n' +
          'Cédula: ' + String(datos.cedula).replace(/\D/g, '') + '\n' +
          'Correo: ' + datos.correo + '\n\n' +
          'Aprobalo desde la hoja Solicitudes, en el menú Certificados.',
      });
    },
  };
}
