import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarGs } from './ayudas.mjs';

const { construirAprobaciones } = cargarGs(['Menu.gs'], { exportar: ['construirAprobaciones'] });

function entornoAprobacion(filasSolicitudes) {
  const asistentesFilas = [];
  const alertas = [];

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
  };

  return { filasSolicitudes, asistentesFilas, alertas, globales };
}

function correrAprobacion(globales) {
  const { aprobarSeleccionados } = cargarGs(['Menu.gs'], { globales, exportar: ['aprobarSeleccionados'] });
  aprobarSeleccionados();
}

const filas = [
  ['Marca temporal', 'Nombre', 'Cédula', 'Estado'],
  ['2026-08-03', 'Silvia Alvarez', '52123456', 'Pendiente'],
  ['2026-08-03', 'Leonor Valenzuela', '41234567', 'Aprobado'],
  ['2026-08-03', 'Catalina Gutiérrez', '1010101010', 'Pendiente'],
];

test('construirAprobaciones toma solo las filas seleccionadas que están pendientes', () => {
  const resultado = construirAprobaciones(filas, 2, 3);

  assert.deepEqual(resultado, [
    { fila: 2, nombre: 'Silvia Alvarez' },
    { fila: 4, nombre: 'Catalina Gutiérrez' },
  ]);
});

test('construirAprobaciones ignora la cabecera si queda dentro de la selección', () => {
  assert.deepEqual(construirAprobaciones(filas, 1, 2), [
    { fila: 2, nombre: 'Silvia Alvarez' },
  ]);
});

test('construirAprobaciones devuelve vacío si no hay pendientes', () => {
  assert.deepEqual(construirAprobaciones(filas, 3, 1), []);
});

test('construirAprobaciones no se sale del rango si la selección pasa del último dato', () => {
  // Caso real: seleccionar la columna entera en el Sheet.
  assert.deepEqual(construirAprobaciones(filas, 3, 100), [
    { fila: 4, nombre: 'Catalina Gutiérrez' },
  ]);
  assert.deepEqual(construirAprobaciones(filas, 50, 10), []);
});

test('aprobarSeleccionados aprueba todo el lote y avisa que hay que notificar por otro medio', () => {
  const ent = entornoAprobacion([
    ['Marca temporal', 'Nombre', 'Cédula', 'Estado'],
    ['2026-08-03', 'Silvia Alvarez', '52123456', 'Pendiente'],
    ['2026-08-03', 'Catalina Gutiérrez', '1010101010', 'Pendiente'],
  ]);

  correrAprobacion(ent.globales);

  assert.equal(ent.asistentesFilas.length, 2);
  assert.equal(ent.filasSolicitudes[1][3], 'Aprobado');
  assert.equal(ent.filasSolicitudes[2][3], 'Aprobado');

  assert.equal(ent.alertas.length, 1);
  assert.match(ent.alertas[0], /2/);
  assert.match(ent.alertas[0], /otro medio/i);
});

test('aprobarSeleccionados no hace nada si la hoja activa no es Solicitudes', () => {
  const ent = entornoAprobacion([
    ['Marca temporal', 'Nombre', 'Cédula', 'Estado'],
    ['2026-08-03', 'Catalina Gutiérrez', '1010101010', 'Pendiente'],
  ]);
  const hojaOtra = { getName: () => 'Otra' };
  ent.globales.SpreadsheetApp.getActiveSpreadsheet = () => ({
    getActiveSheet: () => hojaOtra,
  });

  correrAprobacion(ent.globales);

  assert.equal(ent.asistentesFilas.length, 0);
  assert.equal(ent.alertas.length, 1);
  assert.match(ent.alertas[0], /Solicitudes/);
});

test('aprobarSeleccionados avisa si no hay pendientes en la selección', () => {
  const ent = entornoAprobacion([
    ['Marca temporal', 'Nombre', 'Cédula', 'Estado'],
    ['2026-08-03', 'Leonor Valenzuela', '41234567', 'Aprobado'],
  ]);

  correrAprobacion(ent.globales);

  assert.equal(ent.asistentesFilas.length, 0);
  assert.equal(ent.alertas.length, 1);
  assert.match(ent.alertas[0], /no hay solicitudes pendientes/i);
});
