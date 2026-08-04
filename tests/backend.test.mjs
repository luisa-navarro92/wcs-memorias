import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarGs } from './ayudas.mjs';

function hojaFalsa(filas) {
  return {
    filas,
    getDataRange: () => ({ getValues: () => filas.map((f) => f.slice()) }),
    getLastRow: () => filas.length,
    appendRow: (fila) => filas.push(fila.slice()),
  };
}

function entorno({ asistentes = [['Nombre', 'Origen', 'Fecha de alta']], descargas = [['Marca temporal', 'Nombre ingresado', 'Nombre en lista', 'Cédula', 'Correo', 'Tipo']], solicitudes = [['Marca temporal', 'Nombre', 'Cédula', 'Correo', 'Estado']] } = {}) {
  const hojas = {
    Asistentes: hojaFalsa(asistentes),
    Descargas: hojaFalsa(descargas),
    Solicitudes: hojaFalsa(solicitudes),
  };
  const correos = [];

  return {
    hojas,
    correos,
    globales: {
      SpreadsheetApp: { openById: () => ({ getSheetByName: (nombre) => hojas[nombre] }) },
      MailApp: { sendEmail: (opciones) => correos.push(opciones) },
      LockService: {
        getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }),
      },
      ContentService: {
        MimeType: { JSON: 'application/json' },
        createTextOutput: (texto) => ({
          contenido: texto,
          setMimeType() { return this; },
          getContent() { return this.contenido; },
        }),
      },
    },
  };
}

function llamar(globales, cuerpo) {
  const { doPost } = cargarGs(['Matcher.gs', 'Logica.gs', 'Codigo.gs'], {
    globales,
    exportar: ['doPost'],
  });
  const salida = doPost({ postData: { contents: JSON.stringify(cuerpo) } });
  return JSON.parse(salida.getContent());
}

const solicitud = {
  nombre: 'Carlos Andrés Ríos Franco',
  cedula: '1032456789',
  correo: 'crios@wcs.org',
  autoriza: true,
};

test('doPost aprueba y escribe una fila en Descargas', () => {
  const ent = entorno({
    asistentes: [['Nombre', 'Origen', 'Fecha de alta'], ['Carlos Andrés Ríos Franco', 'Encuesta', '2026-08-03']],
  });

  const respuesta = llamar(ent.globales, solicitud);

  assert.deepEqual(respuesta, { estado: 'aprobado', tipo: 'primera' });
  assert.equal(ent.hojas.Descargas.filas.length, 2);
  const fila = ent.hojas.Descargas.filas[1];
  assert.equal(fila[1], 'Carlos Andrés Ríos Franco');
  assert.equal(fila[3], '1032456789');
  assert.equal(fila[5], 'Primera descarga');
});

test('doPost detecta una descarga repetida por cédula', () => {
  const ent = entorno({
    asistentes: [['Nombre', 'Origen', 'Fecha de alta'], ['Carlos Andrés Ríos Franco', 'Encuesta', '2026-08-03']],
    descargas: [
      ['Marca temporal', 'Nombre ingresado', 'Nombre en lista', 'Cédula', 'Correo', 'Tipo'],
      ['2026-08-03', 'Carlos Ríos', 'Carlos Andrés Ríos Franco', '1032456789', 'crios@wcs.org', 'Primera descarga'],
    ],
  });

  const respuesta = llamar(ent.globales, solicitud);

  assert.deepEqual(respuesta, { estado: 'aprobado', tipo: 'repetida' });
  assert.equal(ent.hojas.Descargas.filas[2][5], 'Repetida');
});

test('doPost deja pendiente a quien no está en la lista y manda correo', () => {
  const ent = entorno();

  const respuesta = llamar(ent.globales, solicitud);

  assert.deepEqual(respuesta, { estado: 'pendiente' });
  assert.equal(ent.hojas.Solicitudes.filas.length, 2);
  assert.equal(ent.hojas.Solicitudes.filas[1][4], 'Pendiente');
  assert.equal(ent.correos.length, 1);
  assert.equal(ent.correos[0].to, 'info.porcontar@gmail.com');
  assert.match(ent.correos[0].body, /Carlos Andrés Ríos Franco/);
});

test('doPost responde error si el cuerpo no es JSON', () => {
  const ent = entorno();
  const { doPost } = cargarGs(['Matcher.gs', 'Logica.gs', 'Codigo.gs'], {
    globales: ent.globales,
    exportar: ['doPost'],
  });

  const salida = doPost({ postData: { contents: 'esto no es json' } });
  const respuesta = JSON.parse(salida.getContent());

  assert.equal(respuesta.estado, 'error');
  assert.ok(respuesta.mensaje.length > 0);
});

test('doPost libera el candado aunque falle la escritura', () => {
  const ent = entorno();
  let liberado = false;
  ent.globales.LockService = {
    getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => { liberado = true; } }),
  };
  ent.globales.SpreadsheetApp = {
    openById: () => { throw new Error('sin permisos'); },
  };

  const respuesta = llamar(ent.globales, solicitud);

  assert.equal(respuesta.estado, 'error');
  assert.equal(liberado, true);
});
