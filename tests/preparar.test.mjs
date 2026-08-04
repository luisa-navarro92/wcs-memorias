import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarGs } from './ayudas.mjs';

const CABECERAS_ASISTENTES = ['Nombre', 'Origen', 'Fecha de alta'];
const CABECERAS_DESCARGAS = ['Marca temporal', 'Nombre ingresado', 'Nombre en lista', 'Cédula', 'Correo', 'Tipo'];
const CABECERAS_SOLICITUDES = ['Marca temporal', 'Nombre', 'Cédula', 'Correo', 'Estado'];

function hojaFalsa(nombre, filas) {
  return {
    nombre,
    filas: filas || [],
    fontWeight: null,
    filasCongeladas: null,
    formatosAplicados: [],
    getName() { return this.nombre; },
    setName(nuevoNombre) { this.nombre = nuevoNombre; },
    getRange(fila, columna, numFilas, numColumnas) {
      const self = this;
      return {
        getValue() {
          const f = self.filas[fila - 1];
          return f ? f[columna - 1] : '';
        },
        setValues(valores) {
          const fila0 = fila - 1;
          if (!self.filas[fila0]) self.filas[fila0] = [];
          const nuevaFila = valores[0];
          for (let c = 0; c < nuevaFila.length; c++) {
            self.filas[fila0][columna - 1 + c] = nuevaFila[c];
          }
        },
        setFontWeight(peso) { self.fontWeight = peso; },
        setNumberFormat(formato) {
          self.formatosAplicados.push({ columna, numFilas, numColumnas, formato });
        },
      };
    },
    setFrozenRows(n) { this.filasCongeladas = n; },
    getLastRow() { return this.filas.length; },
    getMaxRows() { return 1000; },
  };
}

function libroFalso(hojasIniciales) {
  const hojas = hojasIniciales.slice();
  return {
    hojas,
    getSheets() { return hojas; },
    getSheetByName(nombre) {
      return hojas.find((h) => h.getName() === nombre) || null;
    },
    insertSheet(nombre) {
      const nueva = hojaFalsa(nombre, []);
      hojas.push(nueva);
      return nueva;
    },
  };
}

function entorno(hojasIniciales) {
  const libro = libroFalso(hojasIniciales);
  const alertas = [];
  const logs = [];

  const globales = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => libro,
      getUi: () => ({ alert: (mensaje) => alertas.push(mensaje) }),
    },
    Logger: { log: (mensaje) => logs.push(mensaje) },
  };

  return { libro, alertas, logs, globales };
}

function correr(globales) {
  const { prepararHoja } = cargarGs(['Preparar.gs'], { globales, exportar: ['prepararHoja'] });
  prepararHoja();
}

test('prepararHoja rescata la pestaña existente con A1 "Nombre" y crea las otras dos', () => {
  const hoja1 = hojaFalsa('Hoja 1', [
    ['Nombre'],
    ['Ana Pérez'],
    ['Luis Gómez'],
  ]);
  const ent = entorno([hoja1]);

  correr(ent.globales);

  assert.equal(ent.libro.hojas.length, 3);
  assert.equal(hoja1.getName(), 'Asistentes');
  assert.ok(ent.libro.getSheetByName('Descargas'));
  assert.ok(ent.libro.getSheetByName('Solicitudes'));

  // Los 42 nombres (aquí 2, de ejemplo) se conservan: solo se tocó la fila 1.
  assert.equal(hoja1.filas[1][0], 'Ana Pérez');
  assert.equal(hoja1.filas[2][0], 'Luis Gómez');
  assert.equal(hoja1.filas[0][0], 'Nombre');
});

test('prepararHoja no crea nada si las tres pestañas ya existen con sus cabeceras', () => {
  const hojas = [
    hojaFalsa('Asistentes', [CABECERAS_ASISTENTES.slice(), ['Ana Pérez', 'Encuesta', '2026-08-03']]),
    hojaFalsa('Descargas', [CABECERAS_DESCARGAS.slice()]),
    hojaFalsa('Solicitudes', [CABECERAS_SOLICITUDES.slice()]),
  ];
  const ent = entorno(hojas);

  correr(ent.globales);

  assert.equal(ent.libro.hojas.length, 3);
  assert.equal(ent.libro.getSheetByName('Asistentes').filas.length, 2);

  // Correrla otra vez no debe duplicar ni romper nada (idempotencia).
  correr(ent.globales);
  assert.equal(ent.libro.hojas.length, 3);
  assert.equal(ent.libro.getSheetByName('Asistentes').filas.length, 2);
});

test('prepararHoja escribe las cabeceras exactas del esquema, carácter por carácter', () => {
  const ent = entorno([]);

  correr(ent.globales);

  const asistentes = ent.libro.getSheetByName('Asistentes');
  const descargas = ent.libro.getSheetByName('Descargas');
  const solicitudes = ent.libro.getSheetByName('Solicitudes');

  assert.deepEqual(asistentes.filas[0], CABECERAS_ASISTENTES);
  assert.deepEqual(descargas.filas[0], CABECERAS_DESCARGAS);
  assert.deepEqual(solicitudes.filas[0], CABECERAS_SOLICITUDES);

  assert.equal(asistentes.fontWeight, 'bold');
  assert.equal(descargas.fontWeight, 'bold');
  assert.equal(solicitudes.fontWeight, 'bold');
  assert.equal(asistentes.filasCongeladas, 1);
  assert.equal(descargas.filasCongeladas, 1);
  assert.equal(solicitudes.filasCongeladas, 1);
});

test('prepararHoja crea las tres pestañas cuando el libro está vacío y lo reporta en el resumen', () => {
  const ent = entorno([]);

  correr(ent.globales);

  assert.equal(ent.libro.hojas.length, 3);
  assert.equal(ent.alertas.length, 1);
  assert.match(ent.alertas[0], /Asistentes/);
  assert.match(ent.alertas[0], /Descargas/);
  assert.match(ent.alertas[0], /Solicitudes/);
  assert.match(ent.alertas[0], /0 nombre/);
});

test('prepararHoja pone la columna de Cédula en formato de texto plano en Descargas y Solicitudes', () => {
  const ent = entorno([]);

  correr(ent.globales);

  const descargas = ent.libro.getSheetByName('Descargas');
  const solicitudes = ent.libro.getSheetByName('Solicitudes');

  const columnaCedulaDescargas = CABECERAS_DESCARGAS.indexOf('Cédula') + 1;
  const columnaCedulaSolicitudes = CABECERAS_SOLICITUDES.indexOf('Cédula') + 1;

  assert.equal(descargas.formatosAplicados.length, 1);
  assert.equal(descargas.formatosAplicados[0].columna, columnaCedulaDescargas);
  assert.equal(descargas.formatosAplicados[0].formato, '@');

  assert.equal(solicitudes.formatosAplicados.length, 1);
  assert.equal(solicitudes.formatosAplicados[0].columna, columnaCedulaSolicitudes);
  assert.equal(solicitudes.formatosAplicados[0].formato, '@');
});

test('prepararHoja avisa cuántos nombres quedaron en Asistentes tras el rescate', () => {
  const hoja1 = hojaFalsa('Hoja 1', [
    ['Nombre'],
    ['Ana Pérez'],
    ['Luis Gómez'],
    ['Marta Ruiz'],
  ]);
  const ent = entorno([hoja1]);

  correr(ent.globales);

  assert.match(ent.alertas[0], /renombr/i);
  assert.match(ent.alertas[0], /3 nombre/);
});

test('prepararHoja usa Logger.log si no hay interfaz disponible (getUi falla)', () => {
  const ent = entorno([]);
  ent.globales.SpreadsheetApp.getUi = () => { throw new Error('sin interfaz'); };

  correr(ent.globales);

  assert.equal(ent.alertas.length, 0);
  assert.equal(ent.logs.length, 1);
  assert.match(ent.logs[0], /Asistentes/);
});

test('prepararHoja toma la primera candidata cuando hay varias hojas con A1 "Nombre"', () => {
  const primera = hojaFalsa('Hoja 1', [['Nombre'], ['Ana Pérez']]);
  const segunda = hojaFalsa('Hoja 2', [['Nombre'], ['Otro']]);
  const ent = entorno([primera, segunda]);

  correr(ent.globales);

  assert.equal(primera.getName(), 'Asistentes');
  assert.equal(segunda.getName(), 'Hoja 2');
});
