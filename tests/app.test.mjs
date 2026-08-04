import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leerFormulario, validarEnCliente, enviarSolicitud, MENSAJES } from '../js/app.js';

test('leerFormulario limpia espacios y normaliza la cédula', () => {
  const datos = leerFormulario(
    new Map([
      ['nombre', '  Carlos   Ríos  '],
      ['cedula', '1.032.456.789'],
      ['correo', ' CRIOS@wcs.org '],
      ['autoriza', 'on'],
    ])
  );

  assert.deepEqual(datos, {
    nombre: 'Carlos Ríos',
    cedula: '1032456789',
    correo: 'crios@wcs.org',
    autoriza: true,
  });
});

test('validarEnCliente repite las mismas reglas del backend', () => {
  const base = { nombre: 'Carlos Ríos', cedula: '1032456789', correo: 'c@wcs.org', autoriza: true };
  assert.equal(validarEnCliente(base), null);
  assert.match(validarEnCliente({ ...base, nombre: 'Carlos' }), /nombre y apellido/i);
  assert.match(validarEnCliente({ ...base, cedula: '12' }), /cédula/i);
  assert.match(validarEnCliente({ ...base, correo: 'nope' }), /correo/i);
  assert.match(validarEnCliente({ ...base, autoriza: false }), /autoriza/i);
});

test('validarEnCliente usa la misma regla de tokens y conectores que apps-script/Matcher.gs', () => {
  const base = { cedula: '1032456789', correo: 'c@wcs.org', autoriza: true };

  // Caso de iniciales que la dueña del proyecto decidió aceptar: el navegador
  // ya no debe rechazarlo aunque solo tenga una letra en el primer token.
  assert.equal(validarEnCliente({ ...base, nombre: 'J Pérez' }), null);
  // Nombre compuesto escrito junto: dos tokens reales tras normalizar.
  assert.equal(validarEnCliente({ ...base, nombre: 'Anamaría Torres' }), null);
  // Solo conectores más un apellido: un único token real, igual que rechaza el servidor.
  assert.match(validarEnCliente({ ...base, nombre: 'De Los Santos' }), /nombre y apellido/i);
  assert.match(validarEnCliente({ ...base, nombre: 'Carlos' }), /nombre y apellido/i);
});

test('enviarSolicitud reintenta y termina devolviendo la respuesta', async () => {
  let intentos = 0;
  const fetchFalso = async () => {
    intentos += 1;
    if (intentos < 3) throw new Error('red caída');
    return { ok: true, json: async () => ({ estado: 'aprobado', tipo: 'primera' }) };
  };

  const respuesta = await enviarSolicitud(
    { nombre: 'Carlos Ríos', cedula: '1032456789', correo: 'c@wcs.org', autoriza: true },
    { fetch: fetchFalso, url: 'https://ejemplo', esperaMs: 0 }
  );

  assert.equal(intentos, 3);
  assert.deepEqual(respuesta, { estado: 'aprobado', tipo: 'primera' });
});

test('enviarSolicitud se rinde después de tres intentos', async () => {
  let intentos = 0;
  const fetchFalso = async () => {
    intentos += 1;
    throw new Error('red caída');
  };

  await assert.rejects(
    enviarSolicitud({ nombre: 'Carlos Ríos', cedula: '1032456789', correo: 'c@wcs.org', autoriza: true }, { fetch: fetchFalso, url: 'https://ejemplo', esperaMs: 0 }),
    /red caída/
  );
  assert.equal(intentos, 3);
});

test('enviarSolicitud manda el cuerpo como texto plano para evitar el preflight', async () => {
  let opcionesRecibidas;
  const fetchFalso = async (_url, opciones) => {
    opcionesRecibidas = opciones;
    return { ok: true, json: async () => ({ estado: 'pendiente' }) };
  };

  await enviarSolicitud({ nombre: 'A B', cedula: '123456', correo: 'a@b.co', autoriza: true }, { fetch: fetchFalso, url: 'https://ejemplo', esperaMs: 0 });

  assert.equal(opcionesRecibidas.method, 'POST');
  assert.equal(opcionesRecibidas.headers['Content-Type'], 'text/plain;charset=utf-8');
  assert.equal(JSON.parse(opcionesRecibidas.body).cedula, '123456');
});

test('enviarSolicitud no espera para siempre si el servidor no responde', async () => {
  let abortos = 0;
  const fetchFalso = (_url, opciones) =>
    new Promise((_, rechazar) => {
      opciones.signal.addEventListener('abort', () => {
        abortos += 1;
        rechazar(new Error('la solicitud se abortó por tiempo'));
      });
    });

  await assert.rejects(
    enviarSolicitud(
      { nombre: 'Carlos Ríos', cedula: '1032456789', correo: 'c@wcs.org', autoriza: true },
      { fetch: fetchFalso, url: 'https://ejemplo', esperaMs: 0, limiteMs: 20 }
    ),
    /tiempo/
  );
  assert.equal(abortos, 3, 'debería abortar cada uno de los tres intentos');
});

test('hay un mensaje para cada estado que puede devolver el backend', () => {
  for (const estado of ['aprobado', 'repetida', 'pendiente', 'error', 'pdf']) {
    assert.ok(MENSAJES[estado], `falta el mensaje de ${estado}`);
  }
});
