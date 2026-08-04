/**
 * Comparación de nombres escritos a mano contra la lista de asistentes.
 * Vive en el servidor a propósito: la lista de nombres no se expone al navegador.
 */

var CONECTORES = ['de', 'del', 'la', 'las', 'los', 'y', 'da', 'do', 'van', 'von'];

function normalizarNombre(texto) {
  return String(texto == null ? '' : texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokensNombre(texto) {
  return normalizarNombre(texto)
    .split(' ')
    .filter(function (token) {
      return token.length >= 1 && CONECTORES.indexOf(token) === -1;
    });
}

/**
 * Las formas con las que se puede comparar un nombre: cada token suelto y
 * cada par de tokens seguidos pegados, para reconocer los nombres compuestos
 * que la gente escribe junta ("Anamaría" por "Ana María").
 */
function formasComparables(tokens) {
  var formas = tokens.slice();
  for (var i = 0; i < tokens.length - 1; i++) {
    formas.push(tokens[i] + tokens[i + 1]);
  }
  return formas;
}

/** Una inicial suelta vale por el nombre que empieza con esa letra. */
function tokenAparece(token, formas) {
  for (var i = 0; i < formas.length; i++) {
    if (formas[i] === token) return true;
    if (token.length === 1 && formas[i].charAt(0) === token) return true;
  }
  return false;
}

function estaContenido(tokens, otrosTokens) {
  var formas = formasComparables(otrosTokens);
  return tokens.every(function (token) {
    return tokenAparece(token, formas);
  });
}

function coincideNombre(nombreA, nombreB) {
  var a = tokensNombre(nombreA);
  var b = tokensNombre(nombreB);
  if (a.length < 2 || b.length < 2) return false;
  return estaContenido(a, b) || estaContenido(b, a);
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