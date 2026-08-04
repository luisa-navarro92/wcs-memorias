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

function esAmarillo(r, g, b) {
  return r > 200 && g > 180 && b < 120;
}

/** Recorta un png al rectángulo [minX, minY, maxX, maxY] (inclusive). */
function recortarA(png, minX, minY, maxX, maxY) {
  const recortado = new PNG({ width: maxX - minX + 1, height: maxY - minY + 1 });
  for (let y = 0; y < recortado.height; y++) {
    for (let x = 0; x < recortado.width; x++) {
      const origen = (png.width * (y + minY) + (x + minX)) * 4;
      const destino = (recortado.width * y + x) * 4;
      for (let c = 0; c < 4; c++) recortado.data[destino + c] = png.data[origen + c];
    }
  }
  return recortado;
}

/**
 * Recorta el png al rectángulo de los píxeles con alfa mayor al umbral.
 * Si no hay ningún píxel visible, devuelve el png sin cambios.
 */
export function recortarAlContenido(png, { umbralAlfa = 20 } = {}) {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (png.width * y + x) * 4;
      if (png.data[i + 3] > umbralAlfa) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return png;
  return recortarA(png, minX, minY, maxX, maxY);
}

/**
 * Reemplaza por `color` los píxeles claros (luminancia mayor al umbral) que no
 * sean transparentes, dejando intactos los amarillos. Sirve para tener el
 * mismo logo (texto en blanco) listo para usar sobre fondo blanco.
 */
export function aOscuro(png, { umbral = 200, color = [17, 22, 42] } = {}) {
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i + 3] === 0) continue;
    if (esAmarillo(png.data[i], png.data[i + 1], png.data[i + 2])) continue;

    if (luminancia(png.data[i], png.data[i + 1], png.data[i + 2]) > umbral) {
      png.data[i] = color[0];
      png.data[i + 1] = color[1];
      png.data[i + 2] = color[2];
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

/**
 * Deja solo los píxeles con color y recorta el sobrante.
 *
 * El logo de WCS que entregó el cliente es una captura de pantalla: trae
 * horneado el tablero de ajedrez con el que los visores dibujan la
 * transparencia (alterna 255,255,255 con 238,239,239) y el texto "WCS" en gris
 * claro. Nada de eso tiene saturación, así que filtrar por saturación deja la
 * W de colores limpia y con transparencia real.
 */
export function extraerMarcaDeColor(png, { umbral = 30 } = {}) {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (png.width * y + x) * 4;
      const r = png.data[i];
      const g = png.data[i + 1];
      const b = png.data[i + 2];
      const saturacion = Math.max(r, g, b) - Math.min(r, g, b);

      if (saturacion >= umbral) {
        png.data[i + 3] = 255;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      } else {
        png.data[i + 3] = 0;
      }
    }
  }

  if (maxX < 0) return png;
  return recortarA(png, minX, minY, maxX, maxY);
}

function leer(nombre) {
  return PNG.sync.read(readFileSync(`${ENTRADA}/${nombre}`));
}

function escribir(png, nombre) {
  writeFileSync(`${SALIDA}/${nombre}`, PNG.sync.write(png, { colorType: 6 }));
}

export function main() {
  mkdirSync(SALIDA, { recursive: true });

  escribir(recortarAlContenido(leer('logo-porcontar-oficial.png')), 'logo-porcontar-blanco.png');
  escribir(aOscuro(recortarAlContenido(leer('logo-porcontar-oficial.png'))), 'logo-porcontar-oscuro.png');
  escribir(quitarFondoBlanco(leer('firma-ximena.png')), 'firma-ximena.png');
  escribir(extraerMarcaDeColor(leer('logo-wcs.png')), 'logo-wcs.png');

  console.log('Imágenes listas en', SALIDA);
}

if (process.argv[1] && process.argv[1].endsWith('preparar-assets.mjs')) main();
