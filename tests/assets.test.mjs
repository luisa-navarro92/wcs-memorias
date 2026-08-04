import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { aBlanco, quitarFondoBlanco, extraerMarcaDeColor, main } from '../tools/preparar-assets.mjs';

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

test('aBlanco conserva los puntos que viven dentro del globo amarillo', () => {
  // amarillo · blanco · punto negro · blanco · amarillo
  const resultado = aBlanco(
    pngDe([
      [255, 244, 1, 255],
      [255, 255, 255, 255],
      [0, 0, 0, 255],
      [255, 255, 255, 255],
      [255, 244, 1, 255],
    ])
  );

  assert.deepEqual(pixel(resultado, 2), [0, 0, 0, 255], 'el punto del globo no se blanquea');
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

  const logo = PNG.sync.read(readFileSync('assets/generados/logo-porcontar-blanco.png'));
  assert.ok(contarNegros(logo) > 1000, 'los tres puntos del globo se perdieron al blanquear el logo');
});

function contarOpacos(png) {
  let total = 0;
  for (let i = 3; i < png.data.length; i += 4) if (png.data[i] > 200) total++;
  return total;
}

function contarNegros(png) {
  let total = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i + 3] > 200 && png.data[i] < 60 && png.data[i + 1] < 60 && png.data[i + 2] < 60) total++;
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
