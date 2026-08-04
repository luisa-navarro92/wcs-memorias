import { BACKEND } from './config.js';
import { descargarCertificado } from './certificado.js';
import { pintarMemorias } from './memorias.js';

export const MENSAJES = {
  aprobado: {
    clase: 'estado--ok',
    texto: 'Listo. Tu certificado se está descargando; revisá la carpeta de descargas.',
  },
  repetida: {
    clase: 'estado--ok',
    texto: 'Listo, te lo generamos de nuevo. Tu certificado se está descargando.',
  },
  pendiente: {
    clase: 'estado--aviso',
    texto: 'No encontramos tu nombre en la lista de asistentes. Ya avisamos a Ximena y te escribimos apenas lo validemos.',
  },
  error: {
    clase: 'estado--error',
    texto: 'No pudimos generar tu certificado en este momento. Intentá de nuevo en un minuto o escribinos a info.porcontar@gmail.com.',
  },
  // El registro quedó hecho pero el PDF no se pudo armar: no es lo mismo que
  // un fallo de red, y la persona necesita saber que su solicitud sí llegó.
  pdf: {
    clase: 'estado--aviso',
    texto: 'Registramos tu solicitud, pero no pudimos armar el PDF en este navegador. Intentá de nuevo, o escribinos a info.porcontar@gmail.com y te lo enviamos.',
  },
};

export function leerFormulario(campos) {
  return {
    nombre: String(campos.get('nombre') || '').trim().replace(/\s+/g, ' '),
    cedula: String(campos.get('cedula') || '').replace(/\D/g, ''),
    correo: String(campos.get('correo') || '').trim().toLowerCase(),
    autoriza: Boolean(campos.get('autoriza')),
  };
}

export function validarEnCliente(datos) {
  if (datos.nombre.split(' ').filter((t) => t.length > 1).length < 2) {
    return 'Escribe tu nombre y apellido completos.';
  }
  if (!/^\d{6,12}$/.test(datos.cedula)) {
    return 'La cédula debe tener entre 6 y 12 dígitos.';
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(datos.correo)) {
    return 'Escribe un correo electrónico válido.';
  }
  if (!datos.autoriza) {
    return 'Necesitamos tu autorización para el tratamiento de tus datos.';
  }
  return null;
}

const dormir = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

/**
 * El cuerpo va como text/plain a propósito: con application/json el navegador
 * dispara un preflight OPTIONS que Apps Script no responde.
 */
export async function enviarSolicitud(datos, opciones = {}) {
  const peticion = opciones.fetch || globalThis.fetch;
  const url = opciones.url || BACKEND.url;
  const esperaMs = opciones.esperaMs ?? 1200;
  // Sin límite de tiempo, un Apps Script que no responde deja el botón
  // deshabilitado para siempre y la persona sin saber qué pasó.
  const limiteMs = opciones.limiteMs ?? 20000;
  let ultimoError;

  for (let intento = 1; intento <= 3; intento++) {
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), limiteMs);

    try {
      const respuesta = await peticion(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(datos),
        signal: control.signal,
      });
      if (!respuesta.ok) throw new Error(`El servidor respondió ${respuesta.status}`);
      return await respuesta.json();
    } catch (error) {
      ultimoError = error;
      if (intento < 3) await dormir(esperaMs * intento);
    } finally {
      clearTimeout(reloj);
    }
  }

  throw ultimoError;
}

function mostrarEstado(caja, variante, textoExtra) {
  const mensaje = MENSAJES[variante] || MENSAJES.error;
  caja.className = `estado ${mensaje.clase}`;
  caja.textContent = textoExtra || mensaje.texto;
  caja.dataset.visible = 'true';
}

function conectarFormulario(documento) {
  const formulario = documento.getElementById('formulario-certificado');
  if (!formulario) return;

  const boton = documento.getElementById('boton-generar');
  const caja = documento.getElementById('estado-certificado');

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const datos = leerFormulario(new FormData(formulario));

    const errorLocal = validarEnCliente(datos);
    if (errorLocal) {
      mostrarEstado(caja, 'error', errorLocal);
      return;
    }

    boton.disabled = true;
    boton.textContent = 'Validando…';
    caja.dataset.visible = 'false';

    try {
      const respuesta = await enviarSolicitud(datos);

      if (respuesta.estado === 'aprobado') {
        try {
          await descargarCertificado(datos);
        } catch {
          // La descarga ya quedó registrada: distinguirlo de un fallo de red.
          mostrarEstado(caja, 'pdf');
          return;
        }
        mostrarEstado(caja, respuesta.tipo === 'repetida' ? 'repetida' : 'aprobado');
        formulario.reset();
      } else if (respuesta.estado === 'pendiente') {
        mostrarEstado(caja, 'pendiente');
      } else {
        mostrarEstado(caja, 'error', respuesta.mensaje);
      }
    } catch {
      mostrarEstado(caja, 'error');
    } finally {
      boton.disabled = false;
      boton.textContent = 'Generar mi certificado';
    }
  });
}

if (typeof document !== 'undefined') {
  pintarMemorias(document);
  conectarFormulario(document);
}
