import { BACKEND } from './config.js';
import { descargarCertificado } from './certificado.js';
import { pintarMemorias } from './memorias.js';

export const MENSAJES = {
  aprobado: {
    clase: 'estado--ok',
    texto: 'Listo. Tu certificado se está descargando; revisa la carpeta de descargas.',
  },
  repetida: {
    clase: 'estado--ok',
    texto: 'Listo, te lo generamos de nuevo. Tu certificado se está descargando.',
  },
  pendiente: {
    clase: 'estado--aviso',
    texto: 'No encontramos tu nombre en la lista de asistentes. Ya les avisamos y te escribimos apenas lo validemos.',
  },
  error: {
    clase: 'estado--error',
    texto: 'No pudimos generar tu certificado en este momento. Intenta de nuevo en un minuto o escríbenos a info.porcontar@gmail.com.',
  },
  // El registro quedó hecho pero el PDF no se pudo armar: no es lo mismo que
  // un fallo de red, y la persona necesita saber que su solicitud sí llegó.
  pdf: {
    clase: 'estado--aviso',
    texto: 'Registramos tu solicitud, pero no pudimos armar el PDF en este navegador. Intenta de nuevo, o escríbenos a info.porcontar@gmail.com y te lo enviamos.',
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

// Copia navegador de la normalización y del conteo de tokens de
// apps-script/Matcher.gs (tokensNombre). Si una cambia, la otra debe
// cambiar junto con ella: si no, el navegador y el servidor discrepan
// sobre qué nombres son válidos.
const CONECTORES_NOMBRE = ['de', 'del', 'la', 'las', 'los', 'y', 'da', 'do', 'van', 'von'];

function tokensNombreCliente(texto) {
  return String(texto == null ? '' : texto)
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((token) => token.length >= 1 && !CONECTORES_NOMBRE.includes(token));
}

export function validarEnCliente(datos) {
  if (tokensNombreCliente(datos.nombre).length < 2) {
    return { campo: 'nombre', mensaje: 'Escribe tu nombre y apellido completos.' };
  }
  if (!/^\d{6,12}$/.test(datos.cedula)) {
    return { campo: 'cedula', mensaje: 'La cédula debe tener entre 6 y 12 dígitos.' };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(datos.correo)) {
    return { campo: 'correo', mensaje: 'Escribe un correo electrónico válido.' };
  }
  if (!datos.autoriza) {
    return { campo: 'autoriza', mensaje: 'Necesitamos tu autorización para el tratamiento de tus datos.' };
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

// Campos que puede señalar validarEnCliente, en el mismo orden que sus reglas.
const CAMPOS_VALIDABLES = ['nombre', 'cedula', 'correo', 'autoriza'];

function limpiarInvalidos(formulario) {
  for (const id of CAMPOS_VALIDABLES) {
    formulario.querySelector(`#${id}`)?.removeAttribute('aria-invalid');
  }
}

function marcarInvalido(formulario, campoId) {
  const campo = formulario.querySelector(`#${campoId}`);
  if (!campo) return;
  campo.setAttribute('aria-invalid', 'true');
  campo.focus();
}

function conectarFormulario(documento) {
  const formulario = documento.getElementById('formulario-certificado');
  if (!formulario) return;

  const boton = documento.getElementById('boton-generar');
  const caja = documento.getElementById('estado-certificado');
  // El texto vive solo acá: index.html ya no necesita repetirlo, así que
  // el botón no puede quedarse en "Validando…" si un solo lugar cambia de texto.
  const textoBoton = boton.textContent;

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limpiarInvalidos(formulario);
    const datos = leerFormulario(new FormData(formulario));

    const errorLocal = validarEnCliente(datos);
    if (errorLocal) {
      mostrarEstado(caja, 'error', errorLocal.mensaje);
      marcarInvalido(formulario, errorLocal.campo);
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
      boton.textContent = textoBoton;
    }
  });
}

if (typeof document !== 'undefined') {
  pintarMemorias(document);
  conectarFormulario(document);
}
