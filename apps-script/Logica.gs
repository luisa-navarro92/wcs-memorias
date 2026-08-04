/**
 * Decide qué hacer con una solicitud de certificado.
 * No conoce Google: recibe un repositorio y lo usa.
 */

function validarDatos(datos) {
  if (!datos) return 'No llegaron datos.';
  if (tokensNombre(datos.nombre).length < 2) {
    return 'Escribe tu nombre y apellido completos.';
  }
  var cedula = String(datos.cedula == null ? '' : datos.cedula).replace(/\D/g, '');
  if (!/^\d{6,12}$/.test(cedula)) {
    return 'La cédula debe tener entre 6 y 12 dígitos.';
  }
  if (datos.autoriza !== true) {
    return 'Necesitamos tu autorización para el tratamiento de tus datos.';
  }
  return null;
}

function procesarSolicitud(datos, repo) {
  var error = validarDatos(datos);
  if (error) return { estado: 'error', mensaje: error };

  var cedula = String(datos.cedula).replace(/\D/g, '');
  var nombreEnLista = buscarAsistente(datos.nombre, repo.leerAsistentes());

  if (!nombreEnLista) {
    // Un reintento del navegador (o un segundo clic) no debe duplicar la fila
    // ni mandar un segundo correo: solo importa que ya haya una pendiente.
    if (!repo.solicitudPendiente(cedula)) {
      repo.registrarSolicitud(datos);
      try {
        repo.notificarSolicitud(datos);
      } catch (errorAviso) {
        // El registro ya quedó hecho; que falle el aviso (p. ej. cuota de
        // Gmail agotada) no debe hacer que la persona crea que no se registró.
      }
    }
    return { estado: 'pendiente' };
  }

  // Mismo caso que arriba pero para una solicitud ya aprobada: un reintento
  // no es una segunda descarga real.
  if (repo.descargaReciente(cedula, 120)) {
    return { estado: 'aprobado', tipo: 'primera' };
  }

  var tipo = repo.yaDescargo(cedula) ? 'repetida' : 'primera';
  repo.registrarDescarga(datos, nombreEnLista, tipo);
  return { estado: 'aprobado', tipo: tipo };
}
