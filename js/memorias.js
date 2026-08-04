/** Pinta las secciones de contenido a partir de config.js. */
import { MODULOS, ELEMENTOS_PROMPT, GLOSARIO, HERRAMIENTAS, CONSEJOS, DESCARGAS, REELS, REDES, EVALUACION } from './config.js';

export function plantillaModulo(modulo) {
  const etiquetas = modulo.etiquetas.map((e) => `<span class="etiqueta">${e}</span>`).join('');
  return `
    <article class="tarjeta">
      <p class="antetitulo">Módulo ${modulo.numero}</p>
      <h3>${modulo.titulo}</h3>
      <p>${modulo.texto}</p>
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
 * La tarjeta envuelve al blockquote para que la sección se vea igual de
 * intencional cuando el script de Instagram no carga: en equipos corporativos
 * suele estar bloqueado, y sin la tarjeta quedarían enlaces sueltos.
 */
export function plantillaReel(url) {
  return `
    <article class="reel">
      <blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14">
        <a class="boton" href="${url}" target="_blank" rel="noopener">Ver el reel en Instagram</a>
      </blockquote>
    </article>`;
}

function pintar(documento, id, html) {
  const contenedor = documento.getElementById(id);
  if (contenedor) contenedor.innerHTML = html;
}

/**
 * El script de Instagram se carga con `async`: puede terminar después de que
 * pintamos. Sin el reintento, los reels se quedarían como enlaces sueltos.
 */
function procesarInstagram(documento) {
  if (typeof window === 'undefined') return;

  if (window.instgrm) {
    window.instgrm.Embeds.process();
    return;
  }

  const script = documento.querySelector('script[src*="instagram.com/embed.js"]');
  if (!script) return;

  script.addEventListener(
    'load',
    () => {
      if (window.instgrm) window.instgrm.Embeds.process();
    },
    { once: true }
  );
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
  pintar(documento, 'lista-consejos', CONSEJOS.map((c) => `<li>${c}</li>`).join(''));
  pintar(documento, 'lista-descargas', DESCARGAS.map(plantillaDescarga).join(''));
  pintar(documento, 'lista-reels', REELS.map(plantillaReel).join(''));
  pintar(documento, 'lista-redes', REDES.map((r) => `<a href="${r.url}" target="_blank" rel="noopener">${r.nombre} · ${r.usuario}</a>`).join(''));

  procesarInstagram(documento);
}
