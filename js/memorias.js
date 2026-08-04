/** Pinta las secciones de contenido a partir de config.js. */
import { MODULOS, ELEMENTOS_PROMPT, GLOSARIO, HERRAMIENTAS, DESCARGAS, REELS, REDES, EVALUACION } from './config.js';

export function plantillaModulo(modulo) {
  const etiquetas = modulo.etiquetas.map((e) => `<span class="etiqueta">${e}</span>`).join('');
  const puntos = modulo.puntos.map((p) => `<li>${p}</li>`).join('');
  return `
    <article class="tarjeta">
      <p class="antetitulo">Módulo ${modulo.numero}</p>
      <h3>${modulo.titulo}</h3>
      <ul class="tarjeta__puntos">${puntos}</ul>
      <div>${etiquetas}</div>
    </article>`;
}

export function plantillaDescarga(descarga) {
  return `
    <article class="tarjeta descarga">
      <div>
        <h3>${descarga.titulo}</h3>
        <p>${descarga.texto}</p>
      </div>
      <a class="boton" href="${descarga.archivo}" download>Descargar PDF</a>
    </article>`;
}

/**
 * Extrae el código del reel de una URL con forma
 * https://www.instagram.com/por.contar/reel/CODIGO/ y arma el iframe de
 * embed directo de Instagram, que no necesita ningún script de terceros y
 * respeta `loading="lazy"` para no cargar el video hasta que la persona
 * llegue a la sección. Si la URL no trae ese formato, se deja un enlace de
 * respaldo a la publicación en Instagram.
 */
export function plantillaReel(url) {
  const coincidencia = url.match(/\/reel\/([\w-]+)\/?/);
  if (!coincidencia) {
    return `<article class="reel"><a class="boton" href="${url}" target="_blank" rel="noopener">Ver el reel en Instagram</a></article>`;
  }

  const codigo = coincidencia[1];
  return `
    <article class="reel">
      <iframe src="https://www.instagram.com/reel/${codigo}/embed/" title="Reel de @por.contar" loading="lazy" allowtransparency="true" allowfullscreen="true" frameborder="0" scrolling="no"></iframe>
    </article>`;
}

function pintar(documento, id, html) {
  const contenedor = documento.getElementById(id);
  if (contenedor) contenedor.innerHTML = html;
}

export function pintarMemorias(documento) {
  pintar(documento, 'lista-cifras', EVALUACION.map((c) => `<div class="cifra"><strong>${c.cifra}</strong><span>${c.etiqueta}</span></div>`).join(''));
  pintar(documento, 'lista-modulos', MODULOS.map(plantillaModulo).join(''));
  pintar(documento, 'lista-prompt', ELEMENTOS_PROMPT.map((e) => `<article class="tarjeta"><p class="antetitulo">${e.numero}</p><h3>${e.titulo}</h3><p>${e.texto}</p></article>`).join(''));
  pintar(documento, 'lista-glosario', GLOSARIO.map((g) => `<dt>${g.termino}</dt><dd>${g.definicion}</dd>`).join(''));
  pintar(documento, 'lista-herramientas', HERRAMIENTAS.map((grupo) => `
    <article class="tarjeta">
      <p class="antetitulo">${grupo.grupo}</p>
      ${grupo.items.map((i) => `<h3>${i.nombre}</h3><p>${i.para}</p>`).join('')}
    </article>`).join(''));
  pintar(documento, 'lista-descargas', DESCARGAS.map(plantillaDescarga).join(''));
  pintar(documento, 'lista-reels', REELS.map(plantillaReel).join(''));
  pintar(documento, 'lista-redes', REDES.map((r) => `<a href="${r.url}" target="_blank" rel="noopener">${r.nombre} · ${r.usuario}</a>`).join(''));
}
