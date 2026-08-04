# Memorias IA Learn · WCS Colombia

Página de memorias del taller *IA Learn: Inteligencia Artificial para la Productividad*,
dictado por PorContar para WCS Colombia el 27 de julio de 2026, con generación del
certificado de participación en PDF.

## Cómo correrlo en local

```bash
npm install
npm run assets     # prepara logos y firma
npm run fuentes    # descarga Poppins y jsPDF
npm test           # 65 pruebas
npm run servir     # http://localhost:4173
```

Para probar el formulario sin Google: `node tools/backend-falso.mjs` y apuntar
`BACKEND.url` en `js/config.js` a `http://localhost:4174`.

## Estructura

- `index.html`, `css/`, `js/` — la página
- `js/config.js` — todo el contenido editable
- `js/certificado.js` — el diseño del PDF
- `apps-script/` — el backend que se pega en el editor de Apps Script
- `apps-script/Preparar.gs` — deja el Sheet listo (pestañas y cabeceras); se ejecuta una sola vez
- `tools/` — scripts de preparación y servidores de desarrollo

## Cambiar el taller o el cliente

Editar `js/config.js` y reemplazar `assets/logo-porcontar-oficial.png` y `assets/logo-wcs.png`.
Después correr `npm run assets && npm run fuentes`.
