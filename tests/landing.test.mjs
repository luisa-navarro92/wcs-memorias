import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('css/styles.css', 'utf8');

test('la landing declara todas las secciones en el orden acordado', () => {
  const orden = ['hero', 'certificado', 'gracias', 'modulos', 'prompt', 'glosario', 'herramientas', 'consejos', 'regalos', 'instagram'];
  let posicion = -1;
  for (const id of orden) {
    const nueva = html.indexOf(`id="${id}"`);
    assert.ok(nueva > -1, `falta la sección ${id}`);
    assert.ok(nueva > posicion, `la sección ${id} está fuera de orden`);
    posicion = nueva;
  }
});

test('el formulario del certificado trae los cuatro campos y el aviso de datos', () => {
  assert.match(html, /id="formulario-certificado"/);
  for (const campo of ['name="nombre"', 'name="cedula"', 'name="correo"', 'name="autoriza"']) {
    assert.ok(html.includes(campo), `falta el campo ${campo}`);
  }
  assert.match(html, /id="estado-certificado"/);
  assert.match(html, /tratamiento de (mis )?datos/i);
});

test('cada campo tiene su etiqueta, los ids no se repiten y el estado se anuncia', () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((coincidencia) => coincidencia[1]);
  assert.equal(new Set(ids).size, ids.length, `hay id repetidos: ${ids.join(', ')}`);

  for (const [, destino] of html.matchAll(/<label[^>]*\sfor="([^"]+)"/g)) {
    assert.ok(ids.includes(destino), `una etiqueta apunta a #${destino}, que no existe`);
  }

  for (const campo of ['nombre', 'cedula', 'correo']) {
    assert.match(html, new RegExp(`<label[^>]*for="${campo}"`), `falta la etiqueta de ${campo}`);
    assert.match(html, new RegExp(`<input[^>]*id="${campo}"`), `falta el campo ${campo}`);
  }

  // Un lector de pantalla debe anunciar el resultado sin que la persona lo busque.
  assert.match(html, /id="estado-certificado"[^>]*role="status"[^>]*aria-live="polite"/);
});

test('la paleta acordada está declarada como variables CSS', () => {
  const colores = ['#F4EFE4', '#FBF8F2', '#14432F', '#1E5E4E', '#2F9C8B', '#2E7BA6', '#DCD3C2', '#11162A', '#2B4FE8', '#FFF401'];
  for (const color of colores) {
    assert.ok(css.toUpperCase().includes(color), `falta el color ${color} en styles.css`);
  }
});

test('la página carga las tipografías de la marca', () => {
  assert.match(html, /fonts\.googleapis\.com/);
  assert.match(html, /Poppins/);
  assert.match(html, /Hanken\+Grotesk/);
});

test('la página declara idioma español y viewport responsive', () => {
  assert.match(html, /<html lang="es">/);
  assert.match(html, /name="viewport"[^>]+width=device-width/);
});
