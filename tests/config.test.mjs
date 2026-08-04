import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as config from '../js/config.js';

test('los datos del taller coinciden con el certificado', () => {
  assert.equal(config.TALLER.nombre, 'IA Learn: Inteligencia Artificial para la Productividad');
  assert.equal(config.TALLER.fecha, '27 de julio de 2026');
  assert.equal(config.TALLER.duracion, '4 horas');
  assert.equal(config.TALLER.cliente, 'WCS Colombia');
  assert.equal(config.TALLER.nit, '901986736-1');
  assert.equal(config.TALLER.firmante, 'Ximena Andrea Villalobos');
  assert.equal(config.TALLER.cargoFirmante, 'Gerente');
  assert.equal(config.TALLER.slugCertificado, 'IA-Learn-WCS');
});

test('el contenido de las memorias está completo', () => {
  assert.equal(config.MODULOS.length, 4);
  assert.equal(config.ELEMENTOS_PROMPT.length, 6);
  assert.equal(config.GLOSARIO.length, 12);
  assert.equal(config.CONSEJOS.length, 4);
  assert.equal(config.HERRAMIENTAS.length, 3);
  assert.equal(config.DESCARGAS.length, 3);
  assert.equal(config.REELS.length, 5);

  for (const modulo of config.MODULOS) {
    assert.ok(modulo.titulo && Array.isArray(modulo.puntos) && modulo.puntos.length > 0 && Array.isArray(modulo.etiquetas));
  }
  for (const termino of config.GLOSARIO) {
    assert.ok(termino.termino && termino.definicion);
  }
});

test('los reels apuntan a la cuenta correcta', () => {
  for (const url of config.REELS) {
    assert.match(url, /^https:\/\/www\.instagram\.com\/por\.contar\/reel\/[\w-]+\/$/);
  }
  assert.equal(new Set(config.REELS).size, config.REELS.length, 'hay reels repetidos');
});

test('las descargas apuntan a archivos que existen', async () => {
  const { existsSync } = await import('node:fs');
  for (const descarga of config.DESCARGAS) {
    assert.ok(existsSync(descarga.archivo), `falta ${descarga.archivo}`);
  }
});

test('la URL del backend está declarada', () => {
  assert.equal(typeof config.BACKEND.url, 'string');
  assert.ok(config.BACKEND.url.length > 0);
});
