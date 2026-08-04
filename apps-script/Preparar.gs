/**
 * Deja el Sheet listo para el backend: crea las pestañas y cabeceras exactas
 * que Codigo.gs y Menu.gs esperan. Se corre UNA sola vez desde el editor de
 * Apps Script (menú "Ejecutar función" > prepararHoja), y es seguro volver a
 * correrla: no duplica pestañas ni borra datos.
 */

var ESQUEMA_HOJAS = {
  Asistentes: ['Nombre', 'Origen', 'Fecha de alta'],
  Descargas: ['Marca temporal', 'Nombre ingresado', 'Nombre en lista', 'Cédula', 'Tipo'],
  Solicitudes: ['Marca temporal', 'Nombre', 'Cédula', 'Estado'],
};

var ORDEN_HOJAS = ['Asistentes', 'Descargas', 'Solicitudes'];

function prepararHoja() {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var renombrada = rescatarAsistentes(libro);
  var creadas = [];

  for (var i = 0; i < ORDEN_HOJAS.length; i++) {
    var nombre = ORDEN_HOJAS[i];
    var hoja = libro.getSheetByName(nombre);

    if (!hoja) {
      hoja = libro.insertSheet(nombre);
      creadas.push(nombre);
    }

    escribirCabeceras(hoja, ESQUEMA_HOJAS[nombre]);

    if (nombre === 'Descargas' || nombre === 'Solicitudes') {
      formatearCedulaComoTexto(hoja, ESQUEMA_HOJAS[nombre]);
    }
  }

  var totalNombres = contarAsistentes(libro.getSheetByName('Asistentes'));
  var mensaje = construirResumen(creadas, renombrada, totalNombres);
  mostrarResumen(mensaje);
}

/**
 * Si ya existe una pestaña llamada "Asistentes" no hace nada. Si no existe
 * pero hay alguna pestaña cuya celda A1 diga "Nombre" (la que la dueña ya
 * llenó a mano), la renombra en vez de crear una pestaña nueva y perder los
 * datos. Si hay varias candidatas, toma la primera.
 */
function rescatarAsistentes(libro) {
  if (libro.getSheetByName('Asistentes')) return null;

  var hojas = libro.getSheets();
  for (var i = 0; i < hojas.length; i++) {
    var hoja = hojas[i];
    var valorA1 = hoja.getRange(1, 1).getValue();
    if (String(valorA1).trim() === 'Nombre') {
      var nombreOriginal = hoja.getName();
      hoja.setName('Asistentes');
      return nombreOriginal;
    }
  }

  return null;
}

function escribirCabeceras(hoja, cabeceras) {
  var rango = hoja.getRange(1, 1, 1, cabeceras.length);
  rango.setValues([cabeceras]);
  rango.setFontWeight('bold');
  hoja.setFrozenRows(1);

  // Si la hoja venía de un esquema viejo con más columnas (p. ej. el antiguo
  // "Correo"), la fila 1 puede tener cabeceras sobrantes más allá del nuevo
  // esquema: hay que borrarlas para que no queden restos confusos.
  var ultimaColumna = hoja.getLastColumn();
  if (ultimaColumna > cabeceras.length) {
    hoja.getRange(1, cabeceras.length + 1, 1, ultimaColumna - cabeceras.length).clearContent();
  }
}

function formatearCedulaComoTexto(hoja, cabeceras) {
  var indiceCedula = cabeceras.indexOf('Cédula') + 1;
  if (indiceCedula === 0) return;

  hoja.getRange(1, indiceCedula, hoja.getMaxRows(), 1).setNumberFormat('@');
}

function contarAsistentes(hoja) {
  if (!hoja) return 0;
  var totalFilas = hoja.getLastRow();
  return totalFilas > 1 ? totalFilas - 1 : 0;
}

function construirResumen(creadas, renombrada, totalNombres) {
  var lineas = ['Sheet preparado.'];

  if (renombrada) {
    lineas.push('Se renombró la pestaña "' + renombrada + '" a "Asistentes" para conservar los datos que ya tenías.');
  }

  if (creadas.length > 0) {
    lineas.push('Se crearon las pestañas: ' + creadas.join(', ') + '.');
  } else {
    lineas.push('No hizo falta crear pestañas nuevas.');
  }

  lineas.push('La pestaña Asistentes quedó con ' + totalNombres + ' nombre(s).');

  return lineas.join('\n');
}

function mostrarResumen(mensaje) {
  try {
    SpreadsheetApp.getUi().alert(mensaje);
  } catch (error) {
    Logger.log(mensaje);
  }
}
