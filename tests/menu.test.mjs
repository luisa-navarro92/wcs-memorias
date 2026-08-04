import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarGs } from './ayudas.mjs';

const { construirAprobaciones } = cargarGs(['Menu.gs'], { exportar: ['construirAprobaciones'] });

function entornoAprobacion(filasSolicitudes) {
  const asistentesFilas = [];
  const alertas = [];
  const correosEnviados = [];

  const hojaSolicitudes = {
    getName: () => 'Solicitudes',
    getActiveRange: () => ({ getRow: () => 2, getNumRows: () => filasSolicitudes.length - 1 }),
    getDataRange: () => ({ getValues: () => filasSolicitudes.map((f) => f.slice()) }),
    getRange: (fila, columna) => ({
      setValue: (valor) => { filasSolicitudes[fila - 1][columna - 1] = valor; },
    }),
  };

  const hojaAsistentes = { appendRow: (fila) => asistentesFilas.push(fila) };

  const libro = {
    getActiveSheet: () => hojaSolicitudes,
    getSheetByName: (nombre) => (nombre === 'Asistentes' ? hojaAsistentes : null),
  };

  const globales = {
    SpreadsheetApp: {
      getUi: () => ({ alert: (mensaje) => alertas.push(mensaje) }),
      getActiveSpreadsheet: () => libro,
    },
    MailApp: {
      sendEmail: (opciones) => {
        if (opciones.to === 'falla@wcs.org') throw new Error('cuota de Gmail agotada');
        correosEnviados.push(opciones);
      },
    },
  };

  return { filasSolicitudes, asistentesFilas, alertas, correosEnviados, globales };
}

function correrAprobacion(globales) {
  const { aprobarSeleccionados } = cargarGs(['Menu.gs'], { globales, exportar: ['aprobarSeleccionados'] });
  aprobarSeleccionados();
}

const filas = [
  ['Marca temporal', 'Nombre', 'Cédula', 'Correo', 'Estado'],
  ['2026-08-03', 'Silvia Alvarez', '52123456', 'salvarez@wcs.org', 'Pendiente'],
  ['2026-08-03', 'Leonor Valenzuela', '41234567', 'lvalenzuela@wcs.org', 'Aprobado'],
  ['2026-08-03', 'Catalina Gutiérrez', '1010101010', 'cgutierrez@wcs.org', 'Pendiente'],
];

test('construirAprobaciones toma solo las filas seleccionadas que están pendientes', () => {
  const resultado = construirAprobaciones(filas, 2, 3);

  assert.deepEqual(resultado, [
    { fila: 2, nombre: 'Silvia Alvarez', correo: 'salvarez@wcs.org' },
    { fila: 4, nombre: 'Catalina Gutiérrez', correo: 'cgutierrez@wcs.org' },
  ]);
});

test('construirAprobaciones ignora la cabecera si queda dentro de la selección', () => {
  assert.deepEqual(construirAprobaciones(filas, 1, 2), [
    { fila: 2, nombre: 'Silvia Alvarez', correo: 'salvarez@wcs.org' },
  ]);
});

test('construirAprobaciones devuelve vacío si no hay pendientes', () => {
  assert.deepEqual(construirAprobaciones(filas, 3, 1), []);
});

test('construirAprobaciones no se sale del rango si la selección pasa del último dato', () => {
  // Caso real: seleccionar la columna entera en el Sheet.
  assert.deepEqual(construirAprobaciones(filas, 3, 100), [
    { fila: 4, nombre: 'Catalina Gutiérrez', correo: 'cgutierrez@wcs.org' },
  ]);
  assert.deepEqual(construirAprobaciones(filas, 50, 10), []);
});

test('aprobarSeleccionados sigue con el resto del lote si un correo falla y avisa cuántos fallaron', () => {
  const ent = entornoAprobacion([
    ['Marca temporal', 'Nombre', 'Cédula', 'Correo', 'Estado'],
    ['2026-08-03', 'Silvia Alvarez', '52123456', 'falla@wcs.org', 'Pendiente'],
    ['2026-08-03', 'Catalina Gutiérrez', '1010101010', 'cgutierrez@wcs.org', 'Pendiente'],
  ]);

  correrAprobacion(ent.globales);

  // Las dos personas quedan aprobadas aunque el correo de la primera falle.
  assert.equal(ent.asistentesFilas.length, 2);
  assert.equal(ent.filasSolicitudes[1][4], 'Aprobado');
  assert.equal(ent.filasSolicitudes[2][4], 'Aprobado');
  // Solo se envió el correo que no falló.
  assert.equal(ent.correosEnviados.length, 1);
  assert.equal(ent.correosEnviados[0].to, 'cgutierrez@wcs.org');
  // El aviso final dice cuántas se aprobaron y a cuántas no se les pudo avisar.
  assert.equal(ent.alertas.length, 1);
  assert.match(ent.alertas[0], /2/);
  assert.match(ent.alertas[0], /1/);
});

test('aprobarSeleccionados no reporta fallos cuando todos los correos se envían bien', () => {
  const ent = entornoAprobacion([
    ['Marca temporal', 'Nombre', 'Cédula', 'Correo', 'Estado'],
    ['2026-08-03', 'Catalina Gutiérrez', '1010101010', 'cgutierrez@wcs.org', 'Pendiente'],
  ]);

  correrAprobacion(ent.globales);

  assert.equal(ent.correosEnviados.length, 1);
  assert.match(ent.alertas[0], /aprobada/i);
  assert.doesNotMatch(ent.alertas[0], /no se/i);
});
