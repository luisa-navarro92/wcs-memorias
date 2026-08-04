/**
 * Comparación de nombres escritos a mano contra la lista de asistentes.
 * Vive en el servidor a propósito: la lista de nombres no se expone al navegador.
 */

var CONECTORES = ['de', 'del', 'la', 'las', 'los', 'y', 'da', 'do', 'van', 'von'];

function normalizarNombre(texto) {
  return String(texto == null ? '' : texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokensNombre(texto) {
  return normalizarNombre(texto)
    .split(' ')
    .filter(function (token) {
      return token.length > 1 && CONECTORES.indexOf(token) === -1;
    });
}

function coincideNombre(nombreA, nombreB) {
  var a = tokensNombre(nombreA);
  var b = tokensNombre(nombreB);
  if (a.length < 2 || b.length < 2) return false;

  var comunes = a.filter(function (token) {
    return b.indexOf(token) !== -1;
  });
  if (comunes.length < 2) return false;

  var aDentroDeB = a.every(function (token) { return b.indexOf(token) !== -1; });
  var bDentroDeA = b.every(function (token) { return a.indexOf(token) !== -1; });
  return aDentroDeB || bDentroDeA;
}

/**
 * Devuelve el nombre tal como está en la lista, o null si no hay coincidencia
 * o si el nombre es ambiguo (coincide con más de una persona).
 */
function buscarAsistente(nombre, listaAsistentes) {
  var normalizado = normalizarNombre(nombre);
  var parciales = [];

  for (var i = 0; i < listaAsistentes.length; i++) {
    var candidato = listaAsistentes[i];
    if (normalizarNombre(candidato) === normalizado) return candidato;
    if (coincideNombre(nombre, candidato)) parciales.push(candidato);
  }

  return parciales.length === 1 ? parciales[0] : null;
}
