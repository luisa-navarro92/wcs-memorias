import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { aBlanco, quitarFondoBlanco, main } from '../tools/preparar-assets.mjs';

function pngDe(pixeles) {
  const png = new PNG({ width: pixeles.length, height: 1 });
  pixeles.forEach(([r, g, b, a], i) => {
    png.data[i * 4] = r;
    png.data[i * 4 + 1] = g;
    png.data[i * 4 + 2] = b;
    png.data[i * 4 + 3] = a;
  });
  return png;
}

function pixel(png, i) {
  return [png.data[i * 4], png.data[i * 4 + 1], png.data[i * 4 + 2], png.data[i * 4 + 3]];
}

test('aBlanco convierte el negro en blanco y respeta el amarillo', () => {
  const resultado = aBlanco(pngDe([[0, 0, 0, 255], [255, 244, 1, 255], [0, 0, 0, 0]]));

  assert.deepEqual(pixel(resultado, 0), [255, 255, 255, 255]);
  assert.deepEqual(pixel(resultado, 1), [255, 244, 1, 255]);
  assert.equal(pixel(resultado, 2)[3], 0, 'los píxeles transparentes siguen transparentes');
});

test('quitarFondoBlanco deja transparente el blanco y opaco el trazo', () => {
  const resultado = quitarFondoBlanco(pngDe([[255, 255, 255, 255], [30, 30, 30, 255]]));

  assert.equal(pixel(resultado, 0)[3], 0);
  assert.equal(pixel(resultado, 1)[3], 255);
});

test('main genera los tres archivos listos para usar', () => {
  main();

  const rutas = [
    'assets/generados/logo-porcontar-blanco.png',
    'assets/generados/firma-ximena.png',
    'assets/generados/logo-wcs.png',
  ];
  for (const ruta of rutas) {
    assert.ok(existsSync(ruta), `falta ${ruta}`);
  }

  const wcs = PNG.sync.read(readFileSync('assets/generados/logo-wcs.png'));
  assert.equal(wcs.colorType, 6, 'el logo de WCS debe quedar en RGBA de 8 bits por canal');

  const firma = PNG.sync.read(readFileSync('assets/generados/firma-ximena.png'));
  assert.equal(firma.data[3], 0, 'la esquina de la firma debe quedar transparente');
});
