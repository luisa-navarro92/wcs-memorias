/** Servidor estático mínimo para revisar la página en local. npm run servir */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.ttf': 'font/ttf',
};

createServer(async (peticion, respuesta) => {
  const ruta = decodeURIComponent(peticion.url.split('?')[0]);
  const archivo = join(process.cwd(), normalize(ruta === '/' ? '/index.html' : ruta));

  try {
    const contenido = await readFile(archivo);
    respuesta.writeHead(200, { 'Content-Type': TIPOS[extname(archivo)] || 'application/octet-stream' });
    respuesta.end(contenido);
  } catch {
    respuesta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    respuesta.end('No encontrado');
  }
}).listen(4173, () => console.log('http://localhost:4173'));
