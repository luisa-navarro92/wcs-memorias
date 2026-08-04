import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { plantillaModulo, plantillaDescarga, plantillaReel } from '../js/memorias.js';
import { MODULOS, DESCARGAS, REELS } from '../js/config.js';

test('plantillaModulo arma el bloque con número, título, texto y etiquetas', () => {
  const html = plantillaModulo(MODULOS[0]);
  assert.match(html, /Fundamentos/);
  assert.match(html, /IA generativa/);
  assert.match(html, /class="etiqueta"/);
});

test('plantillaDescarga enlaza al PDF y fuerza la descarga', () => {
  const html = plantillaDescarga(DESCARGAS[0]);
  assert.match(html, /assets\/descargas\/kit-prompts-wcs\.pdf/);
  assert.match(html, /download/);
});

test('plantillaReel produce el blockquote que espera el script de Instagram', () => {
  const html = plantillaReel(REELS[0]);
  assert.match(html, /class="instagram-media"/);
  assert.match(html, /data-instgrm-permalink="https:\/\/www\.instagram\.com\/por\.contar\/reel\/Dad_uTjOEpe\/"/);
  assert.match(html, /Ver este reel en Instagram/);
});

test('el HTML deja los contenedores que va a llenar el script', () => {
  const html = readFileSync('index.html', 'utf8');
  for (const id of ['lista-modulos', 'lista-prompt', 'lista-glosario', 'lista-herramientas', 'lista-consejos', 'lista-descargas', 'lista-reels', 'lista-redes', 'lista-cifras']) {
    assert.ok(html.includes(`id="${id}"`), `falta el contenedor ${id}`);
  }
});

test('el pie enlaza a Instagram y al correo de PorContar', () => {
  const html = readFileSync('index.html', 'utf8');
  assert.match(html, /instagram\.com\/por\.contar/);
  assert.match(html, /info\.porcontar@gmail\.com/);
});
