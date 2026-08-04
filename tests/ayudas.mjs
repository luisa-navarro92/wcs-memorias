import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Carga archivos .gs y devuelve las funciones indicadas en `exportar`.
 * Las claves de `globales` se inyectan como parámetros, así los servicios
 * de Google (SpreadsheetApp, MailApp...) quedan disponibles como si fueran globales.
 */
export function cargarGs(archivos, { globales = {}, exportar = [] } = {}) {
  const codigo = archivos
    .map((archivo) => readFileSync(path.join(raiz, 'apps-script', archivo), 'utf8'))
    .join('\n;\n');
  const nombres = Object.keys(globales);
  const valores = Object.values(globales);
  const fabrica = new Function(...nombres, `${codigo}\n;return { ${exportar.join(', ')} };`);
  return fabrica(...valores);
}
