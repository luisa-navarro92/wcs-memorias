/**
 * Deja las imágenes de marca listas para la landing y el certificado.
 * Correr con: npm run assets
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { PNG } from 'pngjs';

const ENTRADA = 'assets';
const SALIDA = 'assets/generados';

export function luminancia(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Reemplaza los píxeles oscuros por blanco, para usar el logo sobre fondos verdes. */
export function aBlanco(png, umbral = 90) {
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i + 3] === 0) continue;
    const lum = luminancia(png.data[i], png.data[i + 1], png.data[i + 2]);
    if (lum < umbral) {
      png.data[i] = 255;
      png.data[i + 1] = 255;
      png.data[i + 2] = 255;
    }
  }
  return png;
}

/** Convierte el fondo blanco en transparencia con una rampa, para no dejar bordes duros. */
export function quitarFondoBlanco(png, { alto = 245, bajo = 200 } = {}) {
  for (let i = 0; i < png.data.length; i += 4) {
    const lum = luminancia(png.data[i], png.data[i + 1], png.data[i + 2]);
    if (lum >= alto) {
      png.data[i + 3] = 0;
    } else if (lum > bajo) {
      png.data[i + 3] = Math.round(((alto - lum) / (alto - bajo)) * 255);
    } else {
      png.data[i + 3] = 255;
    }
  }
  return png;
}

function leer(nombre) {
  return PNG.sync.read(readFileSync(`${ENTRADA}/${nombre}`));
}

function escribir(png, nombre) {
  writeFileSync(`${SALIDA}/${nombre}`, PNG.sync.write(png, { colorType: 6 }));
}

export function main() {
  mkdirSync(SALIDA, { recursive: true });

  escribir(aBlanco(leer('logo-porcontar.png')), 'logo-porcontar-blanco.png');
  escribir(quitarFondoBlanco(leer('firma-ximena.png')), 'firma-ximena.png');
  escribir(leer('logo-wcs.png'), 'logo-wcs.png');

  console.log('Imágenes listas en', SALIDA);
}

if (process.argv[1] && process.argv[1].endsWith('preparar-assets.mjs')) main();
