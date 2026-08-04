import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarGs } from './ayudas.mjs';

const { construirAprobaciones } = cargarGs(['Menu.gs'], { exportar: ['construirAprobaciones'] });

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
