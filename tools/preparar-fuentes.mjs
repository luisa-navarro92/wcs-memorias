/**
 * Descarga Poppins y jsPDF, y arma el bundle de recursos que consume el certificado.
 * Correr con: npm run fuentes
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const FUENTES = {
  POPPINS_REGULAR: 'https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Regular.ttf',
  POPPINS_BOLD: 'https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Bold.ttf',
};

const JSPDF = 'https://cdn.jsdelivr.net/npm/jspdf@4.2.1/dist/jspdf.umd.min.js';

const IMAGENES = {
  LOGO_PORCONTAR: 'assets/generados/logo-porcontar-oscuro.png',
  LOGO_PORCONTAR_BLANCO: 'assets/generados/logo-porcontar-blanco.png',
  LOGO_WCS: 'assets/generados/logo-wcs.png',
  FIRMA: 'assets/generados/firma-ximena.png',
};

async function descargar(url) {
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error(`No se pudo descargar ${url}: HTTP ${respuesta.status}`);
  return Buffer.from(await respuesta.arrayBuffer());
}

/** Las imágenes las produce `npm run assets`, que corre antes que este script. */
function leerImagen(ruta) {
  try {
    return readFileSync(ruta);
  } catch {
    throw new Error(`Falta ${ruta}. Corré primero: npm run assets`);
  }
}

async function main() {
  mkdirSync('assets/generados', { recursive: true });
  mkdirSync('assets/vendor', { recursive: true });

  const lineas = [
    '// Generado por tools/preparar-fuentes.mjs. No editar a mano.',
    '',
  ];

  for (const [nombre, url] of Object.entries(FUENTES)) {
    const datos = await descargar(url);
    lineas.push(`export const ${nombre} = '${datos.toString('base64')}';`, '');
    console.log(`${nombre}: ${(datos.length / 1024).toFixed(0)} KB`);
  }

  for (const [nombre, ruta] of Object.entries(IMAGENES)) {
    const datos = leerImagen(ruta);
    lineas.push(`export const ${nombre} = 'data:image/png;base64,${datos.toString('base64')}';`, '');
  }

  writeFileSync('assets/generados/recursos.js', lineas.join('\n'));

  const jspdf = await descargar(JSPDF);
  writeFileSync('assets/vendor/jspdf.umd.min.js', jspdf);
  console.log(`jsPDF: ${(jspdf.length / 1024).toFixed(0)} KB`);
}

main();
