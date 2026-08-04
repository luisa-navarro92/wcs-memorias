import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import {
  recortarAlContenido,
  aOscuro,
  quitarFondoBlanco,
  extraerMarcaDeColor,
  main,
} from '../tools/preparar-assets.mjs';

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

function pngVacio(width, height) {
  return new PNG({ width, height });
}

function ponerPixel(png, x, y, [r, g, b, a]) {
  const i = (png.width * y + x) * 4;
  png.data[i] = r;
  png.data[i + 1] = g;
  png.data[i + 2] = b;
  png.data[i + 3] = a;
}

function pixelXY(png, x, y) {
  const i = (png.width * y + x) * 4;
  return [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]];
}

test('recortarAlContenido recorta al rectángulo con píxeles visibles', () => {
  const png = pngVacio(5, 4);
  // Contenido en las filas 1-2, columnas 2-3; el resto queda transparente.
  ponerPixel(png, 2, 1, [10, 20, 30, 255]);
  ponerPixel(png, 3, 1, [40, 50, 60, 255]);
  ponerPixel(png, 2, 2, [70, 80, 90, 255]);
  ponerPixel(png, 3, 2, [100, 110, 120, 255]);

  const resultado = recortarAlContenido(png);

  assert.equal(resultado.width, 2, 'debe recortar el ancho al contenido');
  assert.equal(resultado.height, 2, 'debe recortar el alto al contenido');
  assert.deepEqual(pixelXY(resultado, 0, 0), [10, 20, 30, 255]);
  assert.deepEqual(pixelXY(resultado, 1, 1), [100, 110, 120, 255]);
});

test('recortarAlContenido devuelve el png tal cual si no hay ningún píxel visible', () => {
  const png = pngVacio(3, 3);
  const resultado = recortarAlContenido(png);

  assert.equal(resultado.width, 3);
  assert.equal(resultado.height, 3);
});

test('aOscuro cambia el blanco por el navy y no toca el amarillo ni la transparencia', () => {
  const resultado = aOscuro(
    pngDe([
      [255, 255, 255, 255],
      [255, 244, 1, 255],
      [255, 255, 255, 0],
    ])
  );

  assert.deepEqual(pixel(resultado, 0), [17, 22, 42, 255], 'el blanco opaco debe pasar a navy');
  assert.deepEqual(pixel(resultado, 1), [255, 244, 1, 255], 'el amarillo se deja intacto');
  assert.equal(pixel(resultado, 2)[3], 0, 'los píxeles transparentes siguen transparentes');
});

test('quitarFondoBlanco deja transparente el blanco y opaco el trazo', () => {
  const resultado = quitarFondoBlanco(pngDe([[255, 255, 255, 255], [30, 30, 30, 255]]));

  assert.equal(pixel(resultado, 0)[3], 0);
  assert.equal(pixel(resultado, 1)[3], 255);
});

test('extraerMarcaDeColor borra el tablero de transparencia y recorta', () => {
  // gris del tablero · blanco del tablero · teal del logo · gris claro del texto WCS
  const resultado = extraerMarcaDeColor(
    pngDe([
      [238, 239, 239, 255],
      [255, 255, 255, 255],
      [44, 140, 125, 255],
      [201, 204, 203, 255],
    ])
  );

  assert.equal(resultado.width, 1, 'debe recortarse a la marca de color');
  assert.deepEqual(pixel(resultado, 0), [44, 140, 125, 255]);
});

test('main genera los archivos listos para usar', () => {
  main();

  const rutas = [
    'assets/generados/logo-porcontar-blanco.png',
    'assets/generados/logo-porcontar-oscuro.png',
    'assets/generados/firma-ximena.png',
    'assets/generados/logo-wcs.png',
  ];
  for (const ruta of rutas) {
    assert.ok(existsSync(ruta), `falta ${ruta}`);
  }

  const wcs = PNG.sync.read(readFileSync('assets/generados/logo-wcs.png'));
  assert.equal(wcs.colorType, 6, 'el logo de WCS debe quedar en RGBA de 8 bits por canal');
  const opacosWcs = contarOpacos(wcs);
  assert.ok(opacosWcs > 5000, `el logo de WCS quedó casi vacío: ${opacosWcs} píxeles opacos`);
  assert.equal(
    contarOpacosSinColor(wcs),
    0,
    'quedaron píxeles grises opacos: el tablero de transparencia no se limpió'
  );

  const firma = PNG.sync.read(readFileSync('assets/generados/firma-ximena.png'));
  assert.equal(firma.data[3], 0, 'la esquina de la firma debe quedar transparente');
  assert.ok(contarOpacos(firma) > 500, 'la firma quedó borrada');

  const blanco = PNG.sync.read(readFileSync('assets/generados/logo-porcontar-blanco.png'));
  assert.ok(contarBlancosOpacos(blanco) > 1000, 'el logo blanco debería tener texto blanco opaco');

  const oscuro = PNG.sync.read(readFileSync('assets/generados/logo-porcontar-oscuro.png'));
  assert.ok(contarNavyOpacos(oscuro) > 1000, 'el logo oscuro debería tener texto navy opaco');
  assert.equal(
    contarBlancosOpacos(oscuro),
    0,
    'el logo oscuro no debería tener píxeles blancos opacos'
  );
});

function contarOpacos(png) {
  let total = 0;
  for (let i = 3; i < png.data.length; i += 4) if (png.data[i] > 200) total++;
  return total;
}

function contarBlancosOpacos(png) {
  let total = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i + 3] > 200 && png.data[i] > 240 && png.data[i + 1] > 240 && png.data[i + 2] > 240) total++;
  }
  return total;
}

function contarNavyOpacos(png) {
  let total = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    if (
      png.data[i + 3] > 200 &&
      Math.abs(png.data[i] - 17) < 10 &&
      Math.abs(png.data[i + 1] - 22) < 10 &&
      Math.abs(png.data[i + 2] - 42) < 10
    ) {
      total++;
    }
  }
  return total;
}

function contarOpacosSinColor(png) {
  let total = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    const saturacion = Math.max(png.data[i], png.data[i + 1], png.data[i + 2]) -
      Math.min(png.data[i], png.data[i + 1], png.data[i + 2]);
    if (png.data[i + 3] > 200 && saturacion < 30) total++;
  }
  return total;
}
