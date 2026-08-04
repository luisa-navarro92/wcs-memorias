/**
 * Arma en `dist/` solo lo que el sitio publicado necesita.
 *
 * Se construye a partir de lo que está commiteado, no de la copia de trabajo:
 * durante el desarrollo `js/config.js` suele apuntar al backend simulado local,
 * y eso jamás debe salir publicado.
 *
 * Correr con: npm run construir
 */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SALIDA = 'dist';

/** Rutas que se copian tal cual desde el commit actual. */
const INCLUIR = [
  'index.html',
  'css',
  'js',
  'assets/generados',
  'assets/vendor',
  'assets/descargas',
  'assets/banner-wcs.jpg',
  '.nojekyll',
];

function desdeElCommit(ruta) {
  // `git archive` respeta lo commiteado e ignora la copia de trabajo.
  return execFileSync('git', ['archive', 'HEAD', ruta], { maxBuffer: 1024 * 1024 * 64 });
}

function pesoDe(ruta) {
  if (!existsSync(ruta)) return 0;
  const info = statSync(ruta);
  if (!info.isDirectory()) return info.size;
  return readdirSync(ruta).reduce((total, hijo) => total + pesoDe(join(ruta, hijo)), 0);
}

function main() {
  rmSync(SALIDA, { recursive: true, force: true });
  mkdirSync(SALIDA, { recursive: true });

  const tar = join(SALIDA, 'sitio.tar');
  writeFileSync(tar, execFileSync('git', ['archive', 'HEAD', ...INCLUIR], { maxBuffer: 1024 * 1024 * 128 }));
  execFileSync('tar', ['-xf', 'sitio.tar'], { cwd: SALIDA });
  rmSync(tar);

  const total = pesoDe(SALIDA);
  console.log(`Sitio armado en ${SALIDA}/`);
  for (const entrada of INCLUIR) {
    const ruta = join(SALIDA, entrada);
    if (existsSync(ruta)) {
      console.log(`  ${entrada.padEnd(20)} ${(pesoDe(ruta) / 1024).toFixed(0)} KB`);
    }
  }
  console.log(`  ${'TOTAL'.padEnd(20)} ${(total / 1024).toFixed(0)} KB`);
}

main();
