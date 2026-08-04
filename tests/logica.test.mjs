import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarGs } from './ayudas.mjs';

const { validarDatos, procesarSolicitud } = cargarGs(['Matcher.gs', 'Logica.gs'], {
  exportar: ['validarDatos', 'procesarSolicitud'],
});

function datosValidos(extra = {}) {
  return {
    nombre: 'Carlos Andrés Ríos Franco',
    cedula: '1032456789',
    correo: 'crios@wcs.org',
    autoriza: true,
    ...extra,
  };
}

function repoFalso({ asistentes = ['Carlos Andrés Ríos Franco'], descargados = [] } = {}) {
  return {
    descargas: [],
    solicitudes: [],
    avisos: [],
    leerAsistentes: () => asistentes,
    yaDescargo(cedula) {
      return descargados.includes(cedula);
    },
    registrarDescarga(datos, nombreEnLista, tipo) {
      this.descargas.push({ datos, nombreEnLista, tipo });
    },
    registrarSolicitud(datos) {
      this.solicitudes.push(datos);
    },
    notificarSolicitud(datos) {
      this.avisos.push(datos);
    },
  };
}

test('validarDatos exige nombre de al menos dos palabras', () => {
  assert.match(validarDatos(datosValidos({ nombre: 'Carlos' })), /nombre y apellido/i);
  assert.equal(validarDatos(datosValidos()), null);
});

test('validarDatos exige cédula de 6 a 12 dígitos', () => {
  assert.match(validarDatos(datosValidos({ cedula: '123' })), /cédula/i);
  assert.match(validarDatos(datosValidos({ cedula: '1234567890123' })), /cédula/i);
  assert.equal(validarDatos(datosValidos({ cedula: '1.032.456.789' })), null);
});

test('validarDatos exige correo con formato válido', () => {
  assert.match(validarDatos(datosValidos({ correo: 'no-es-correo' })), /correo/i);
});

test('validarDatos exige la autorización de datos', () => {
  assert.match(validarDatos(datosValidos({ autoriza: false })), /autoriza/i);
});

test('procesarSolicitud aprueba a quien está en la lista y registra la descarga', () => {
  const repo = repoFalso();
  const resultado = procesarSolicitud(datosValidos(), repo);

  assert.deepEqual(resultado, { estado: 'aprobado', tipo: 'primera' });
  assert.equal(repo.descargas.length, 1);
  assert.equal(repo.descargas[0].nombreEnLista, 'Carlos Andrés Ríos Franco');
  assert.equal(repo.solicitudes.length, 0);
});

test('procesarSolicitud marca como repetida la segunda descarga', () => {
  const repo = repoFalso({ descargados: ['1032456789'] });
  const resultado = procesarSolicitud(datosValidos(), repo);

  assert.deepEqual(resultado, { estado: 'aprobado', tipo: 'repetida' });
  assert.equal(repo.descargas[0].tipo, 'repetida');
});

test('procesarSolicitud deja pendiente a quien no está en la lista y avisa', () => {
  const repo = repoFalso({ asistentes: ['Silvia Alvarez'] });
  const resultado = procesarSolicitud(datosValidos(), repo);

  assert.deepEqual(resultado, { estado: 'pendiente' });
  assert.equal(repo.solicitudes.length, 1);
  assert.equal(repo.avisos.length, 1);
  assert.equal(repo.descargas.length, 0);
});

test('procesarSolicitud rechaza datos inválidos sin tocar el repositorio', () => {
  const repo = repoFalso();
  const resultado = procesarSolicitud(datosValidos({ correo: 'malo' }), repo);

  assert.equal(resultado.estado, 'error');
  assert.match(resultado.mensaje, /correo/i);
  assert.equal(repo.descargas.length, 0);
  assert.equal(repo.solicitudes.length, 0);
});
