/**
 * Imita el Web App de Apps Script para probar la página sin desplegar nada.
 * Aprueba a quien tenga "Prueba" en el nombre; al resto lo deja pendiente.
 */
import { createServer } from 'node:http';

createServer((peticion, respuesta) => {
  respuesta.setHeader('Access-Control-Allow-Origin', '*');

  let cuerpo = '';
  peticion.on('data', (trozo) => (cuerpo += trozo));
  peticion.on('end', () => {
    let salida = { estado: 'error', mensaje: 'Cuerpo inválido' };
    try {
      const datos = JSON.parse(cuerpo);
      salida = /prueba/i.test(datos.nombre)
        ? { estado: 'aprobado', tipo: 'primera' }
        : { estado: 'pendiente' };
      console.log(datos.nombre, '→', salida.estado);
    } catch {}
    respuesta.writeHead(200, { 'Content-Type': 'application/json' });
    respuesta.end(JSON.stringify(salida));
  });
}).listen(4174, () => console.log('Backend falso en http://localhost:4174'));
