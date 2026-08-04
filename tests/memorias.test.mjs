import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { plantillaModulo, plantillaDescarga, plantillaReel, pintarMemorias } from '../js/memorias.js';
import { MODULOS, DESCARGAS, REELS } from '../js/config.js';

test('plantillaModulo arma el bloque con número, título, puntos en lista y etiquetas', () => {
  const html = plantillaModulo(MODULOS[0]);
  assert.match(html, /Fundamentos/);
  assert.match(html, /<ul[^>]*>/);
  for (const punto of MODULOS[0].puntos) {
    assert.ok(html.includes(`<li>${punto}</li>`), `falta el punto "${punto}" como <li>`);
  }
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
  assert.match(html, /Ver el reel en Instagram/);
});

test('plantillaReel deja un respaldo utilizable si Instagram no carga', () => {
  const html = plantillaReel(REELS[2]);
  assert.match(html, /<article class="reel">/, 'falta la tarjeta que enmarca el reel');
  assert.match(html, /<a class="boton" href="https:\/\/www\.instagram\.com\/por\.contar\/reel\/DZs-OvoO96n\/"/);
  assert.match(html, /rel="noopener"/);
});

test('el HTML deja los contenedores que va a llenar el script', () => {
  const html = readFileSync('index.html', 'utf8');
  for (const id of ['lista-modulos', 'lista-prompt', 'lista-glosario', 'lista-herramientas', 'lista-consejos', 'lista-descargas', 'lista-reels', 'lista-redes', 'lista-cifras']) {
    assert.ok(html.includes(`id="${id}"`), `falta el contenedor ${id}`);
  }
});

test('pintarMemorias llena todos los contenedores que declara el HTML', () => {
  // Cruza los id del HTML contra los que usa el script: si alguien escribe mal
  // uno de los dos, la sección quedaría vacía en silencio.
  const html = readFileSync('index.html', 'utf8');
  const ids = [...html.matchAll(/id="(lista-[^"]+)"/g)].map((coincidencia) => coincidencia[1]);
  assert.ok(ids.length >= 9, `se esperaban al menos 9 contenedores, hay ${ids.length}`);

  const nodos = new Map(ids.map((id) => [id, { innerHTML: '' }]));
  const documentoFalso = {
    getElementById: (id) => nodos.get(id) || null,
    querySelector: () => null,
  };

  pintarMemorias(documentoFalso);

  for (const id of ids) {
    assert.ok(nodos.get(id).innerHTML.length > 0, `el contenedor #${id} quedó vacío`);
  }
});

test('el pie enlaza a Instagram y al correo de PorContar', () => {
  const html = readFileSync('index.html', 'utf8');
  assert.match(html, /instagram\.com\/por\.contar/);
  assert.match(html, /info\.porcontar@gmail\.com/);
});
