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
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(datos.correo == null ? '' : datos.correo))) {
    return 'Escribe un correo electrónico válido.';
  }
  if (datos.autoriza !== true) {
    return 'Necesitamos tu autorización para el tratamiento de tus datos.';
  }
  return null;
}

function procesarSolicitud(datos, repo) {
  var error = validarDatos(datos);
  if (error) return { estado: 'error', mensaje: error };

  var nombreEnLista = buscarAsistente(datos.nombre, repo.leerAsistentes());

  if (!nombreEnLista) {
    repo.registrarSolicitud(datos);
    repo.notificarSolicitud(datos);
    return { estado: 'pendiente' };
  }

  var cedula = String(datos.cedula).replace(/\D/g, '');
  var tipo = repo.yaDescargo(cedula) ? 'repetida' : 'primera';
  repo.registrarDescarga(datos, nombreEnLista, tipo);
  return { estado: 'aprobado', tipo: tipo };
}
