/**
 * Web App que recibe las solicitudes de certificado.
 * Publicar como aplicación web: ejecutar como yo, acceso para cualquier persona.
 */

var ID_HOJA = 'REEMPLAZAR_CON_EL_ID_DEL_SHEET';
var CORREO_AVISOS = 'info.porcontar@gmail.com';

function doPost(e) {
  var candado = null;
  var respuesta;

  try {
    candado = LockService.getScriptLock();
    candado.waitLock(20000);
    var datos = JSON.parse(e.postData.contents);
    respuesta = procesarSolicitud(datos, crearRepositorio());
  } catch (error) {
    console.error(error);
    respuesta = { estado: 'error', mensaje: 'No pudimos registrar tu solicitud. Intenta de nuevo en un minuto.' };
  } finally {
    if (candado) candado.releaseLock();
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

    solicitudPendiente: function (cedula) {
      var filas = libro.getSheetByName('Solicitudes').getDataRange().getValues();
      return filas.slice(1).some(function (fila) {
        return String(fila[2]).replace(/\D/g, '') === cedula && String(fila[4]).trim() === 'Pendiente';
      });
    },

    descargaReciente: function (cedula, segundos) {
      var ahora = new Date().getTime();
      var filas = libro.getSheetByName('Descargas').getDataRange().getValues();
      return filas.slice(1).some(function (fila) {
        if (String(fila[3]).replace(/\D/g, '') !== cedula) return false;
        var marca = new Date(fila[0]).getTime();
        if (isNaN(marca)) return false;
        return (ahora - marca) / 1000 <= segundos;
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
          'Correo: ' + datos.correo + '\n\n' +
          'Revisa la hoja Solicitudes para ver el detalle y aprobarlo desde el menú Certificados.',
      });
    },
  };
}
