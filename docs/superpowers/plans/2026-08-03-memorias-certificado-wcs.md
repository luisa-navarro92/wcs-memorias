# Memorias IA Learn WCS + generador de certificados — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar una página estática de memorias del taller IA Learn para WCS Colombia que genere el certificado de participación en PDF en el navegador y registre cada descarga en un Google Sheet.

**Architecture:** Sitio estático (HTML + CSS + módulos ES, sin framework) servido en GitHub Pages. El certificado se dibuja por código con jsPDF vendorizado localmente. Un Web App de Google Apps Script es el único backend: valida el nombre contra la hoja `Asistentes` y escribe en `Descargas` o `Solicitudes`. La lógica del backend se escribe como funciones puras en archivos `.gs` que se prueban en Node con dobles de prueba, sin desplegar nada.

**Tech Stack:** JavaScript ES2022 (módulos), jsPDF 4.2.1, Google Apps Script, Google Sheets, pngjs 7.0.0 para preparar imágenes, `node --test` como corredor de pruebas.

**Spec:** `docs/superpowers/specs/2026-08-03-memorias-certificado-wcs-design.md`

## Global Constraints

- Node 24.15.0 y npm 11.12.1 ya instalados. `gh` autenticado como `luisa-navarro92`. `git config --global user.name` = `luisa-navarro92`, `user.email` = `luisa.navarro@porcontar.com`: no pasar `-c user.name` en los commits.
- Dependencias fijadas exactamente y sin agregar ninguna otra: `jspdf@4.2.1`, `pngjs@7.0.0`. Ambas son `devDependencies`; en producción el navegador carga jsPDF desde `assets/vendor/`.
- En tiempo de ejecución la página no depende de ningún CDN salvo Google Fonts para la landing y el script de embebido de Instagram. jsPDF va vendorizado.
- Todo el texto visible va en español con tildes y signos de apertura (`¿`, `¡`).
- Paleta exacta: marfil `#F4EFE4`, blanco cálido `#FBF8F2`, verde bosque `#14432F`, verde petróleo `#1E5E4E`, teal WCS `#2F9C8B`, azul agua WCS `#2E7BA6`, arena `#DCD3C2`, texto `#11162A`, azul PorContar `#2B4FE8`, amarillo PorContar `#FFF401`.
- Tipografías: Poppins para títulos, Hanken Grotesk para cuerpo. El PDF embebe únicamente Poppins Regular y Poppins Bold.
- La landing usa la línea editorial de WCS; el certificado usa la línea de PorContar. No se mezclan.
- Datos del taller, literales: taller «IA Learn: Inteligencia Artificial para la Productividad», 27 de julio de 2026, modalidad virtual en vivo, duración total 4 horas, emite PorContar Group S.A.S. NIT 901986736-1, firma Ximena Andrea Villalobos, Gerente.
- Los nombres de los asistentes nunca se embeben en el código del navegador.
- Mensajes de commit en español, en imperativo, sin prefijos tipo `feat:`.
- Directorio de trabajo: `C:\Users\Usser\Desktop\wcs-memorias`. Es un repo git ya inicializado con el spec y los assets commiteados.

---

### Task 1: Andamiaje del proyecto y matcher de nombres

El corazón de la validación. Se escribe primero porque todo lo demás depende de que un nombre escrito a mano encuentre a la persona correcta en la lista.

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `tests/ayudas.mjs`
- Create: `apps-script/Matcher.gs`
- Test: `tests/matcher.test.mjs`

**Interfaces:**
- Consumes: nada
- Produces: en el ámbito global de Apps Script, `normalizarNombre(texto) → string`, `tokensNombre(texto) → string[]`, `formasComparables(tokens) → string[]`, `tokenAparece(token, formas) → boolean`, `estaContenido(tokens, otrosTokens) → boolean`, `coincideNombre(a, b) → boolean`, `buscarAsistente(nombre, listaAsistentes: string[]) → string|null`. El helper de pruebas `cargarGs(archivos: string[], opciones: { globales?: object, exportar?: string[] }) → object`.

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "wcs-memorias",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "Memorias del taller IA Learn para WCS Colombia y generador de certificados",
  "scripts": {
    "test": "node --test \"tests/*.test.mjs\"",
    "assets": "node tools/preparar-assets.mjs",
    "fuentes": "node tools/preparar-fuentes.mjs",
    "servir": "node tools/servidor.mjs"
  },
  "devDependencies": {
    "jspdf": "4.2.1",
    "pngjs": "7.0.0"
  }
}
```

- [ ] **Step 2: Crear `.gitignore`**

```
node_modules/
*.log
.DS_Store
Thumbs.db
```

- [ ] **Step 3: Instalar dependencias**

Run: `npm install`
Expected: crea `node_modules/` y `package-lock.json` sin errores.

- [ ] **Step 4: Crear el helper de pruebas `tests/ayudas.mjs`**

Los archivos `.gs` de Apps Script no son módulos: declaran funciones en el ámbito global. Este helper los concatena, los evalúa y devuelve las funciones pedidas, inyectando dobles de prueba para los servicios de Google.

```js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Carga archivos .gs y devuelve las funciones indicadas en `exportar`.
 * Las claves de `globales` se inyectan como parámetros, así los servicios
 * de Google (SpreadsheetApp, MailApp...) quedan disponibles como si fueran globales.
 */
export function cargarGs(archivos, { globales = {}, exportar = [] } = {}) {
  const codigo = archivos
    .map((archivo) => readFileSync(path.join(raiz, 'apps-script', archivo), 'utf8'))
    .join('\n;\n');
  const nombres = Object.keys(globales);
  const valores = Object.values(globales);
  const fabrica = new Function(...nombres, `${codigo}\n;return { ${exportar.join(', ')} };`);
  return fabrica(...valores);
}
```

- [ ] **Step 5: Escribir las pruebas del matcher**

Crear `tests/matcher.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarGs } from './ayudas.mjs';

const { normalizarNombre, tokensNombre, coincideNombre, buscarAsistente } = cargarGs(
  ['Matcher.gs'],
  { exportar: ['normalizarNombre', 'tokensNombre', 'coincideNombre', 'buscarAsistente'] }
);

test('normalizarNombre quita tildes, mayúsculas y puntuación', () => {
  assert.equal(normalizarNombre('HÉCTOR FABIO ORTIZ CORTÁZAR'), 'hector fabio ortiz cortazar');
  assert.equal(normalizarNombre('  Jahel   García de la Hoz  '), 'jahel garcia de la hoz');
  assert.equal(normalizarNombre('Muñoz-Pérez, Ana'), 'munoz perez ana');
  assert.equal(normalizarNombre(null), '');
});

test('tokensNombre descarta conectores y conserva las iniciales', () => {
  assert.deepEqual(tokensNombre('Jahel García de la Hoz'), ['jahel', 'garcia', 'hoz']);
  assert.deepEqual(tokensNombre('María del Pilar Aguirre'), ['maria', 'pilar', 'aguirre']);
  assert.deepEqual(tokensNombre('J Pérez'), ['j', 'perez']);
});

test('coincideNombre acepta los casos reales de la hoja', () => {
  const iguales = [
    ['Dayana Reyes', 'Dayana Esther Reyes Martiena'],
    ['Sandra Gonzalez Watson', 'Sandra González'],
    ['HECTOR FABIO ORTIZ CORTAZAR', 'Hector Fabio Ortiz Cortazar'],
    ['Carlos Ríos', 'Carlos Andrés Ríos Franco'],
    ['William Yezid Bonell Rojas', 'William Bonell'],
  ];
  for (const [a, b] of iguales) {
    assert.equal(coincideNombre(a, b), true, `debería coincidir: ${a} / ${b}`);
  }
});

test('coincideNombre acepta iniciales sueltas y nombres compuestos pegados', () => {
  assert.equal(coincideNombre('J Pérez', 'Juan Pérez Gómez'), true);
  assert.equal(coincideNombre('Anamaría Torres', 'Ana María Torres'), true);
  assert.equal(coincideNombre('Ana María Torres', 'Anamaría Torres'), true);
});

test('coincideNombre rechaza personas distintas que comparten un nombre', () => {
  const distintos = [
    ['Carlos Castillo', 'Carlos Saavedra'],
    ['Laura Ortega', 'Laura Natalia Rosado Muñoz'],
    ['Angie Tatiana Arciniegas', 'Maricruz Jaramillo'],
    ['Carlos', 'Carlos Saavedra'],
  ];
  for (const [a, b] of distintos) {
    assert.equal(coincideNombre(a, b), false, `no debería coincidir: ${a} / ${b}`);
  }
});

test('buscarAsistente prefiere la coincidencia exacta', () => {
  const lista = ['Dayana Reyes', 'Dayana Esther Reyes Martiena'];
  assert.equal(buscarAsistente('Dayana Esther Reyes Martiena', lista), 'Dayana Esther Reyes Martiena');
  assert.equal(buscarAsistente('Dayana Reyes', lista), 'Dayana Reyes');
});

test('buscarAsistente devuelve null si el nombre es ambiguo', () => {
  const lista = ['Carlos Andrés Ríos Franco', 'Carlos Andrés Ríos Pérez'];
  assert.equal(buscarAsistente('Carlos Ríos', lista), null);
});

test('buscarAsistente devuelve null si nadie coincide', () => {
  assert.equal(buscarAsistente('Persona Que No Vino', ['Carlos Saavedra', 'Silvia Alvarez']), null);
});
```

- [ ] **Step 6: Correr las pruebas y verificar que fallan**

Run: `npm test`
Expected: FAIL. `cargarGs` no encuentra `apps-script/Matcher.gs` (`ENOENT`).

- [ ] **Step 7: Implementar `apps-script/Matcher.gs`**

Sintaxis ES5 con `var` y `function`: Apps Script la acepta sin sorpresas y el helper de pruebas la evalúa igual.

```js
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
```

- [ ] **Step 8: Correr las pruebas y verificar que pasan**

Run: `npm test`
Expected: PASS, 8 pruebas.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json .gitignore tests/ apps-script/
git commit -m "Agrega el matcher de nombres contra la lista de asistentes

Compara nombres escritos a mano normalizando tildes y descartando
conectores. Cubre los casos reales de la hoja de satisfaccion, incluidos
los que no deben coincidir."
```

---

### Task 2: Lógica del backend

Decide qué pasa con una solicitud, sin tocar Google. Recibe un repositorio como parámetro, así se prueba entera con dobles.

**Files:**
- Create: `apps-script/Logica.gs`
- Test: `tests/logica.test.mjs`

**Interfaces:**
- Consumes: `tokensNombre`, `buscarAsistente` de `Matcher.gs`
- Produces: `validarDatos(datos) → string|null` (mensaje de error o null), `procesarSolicitud(datos, repo) → { estado, tipo?, mensaje? }`. El `repo` debe implementar `leerAsistentes() → string[]`, `yaDescargo(cedula) → boolean`, `registrarDescarga(datos, nombreEnLista, tipo)`, `registrarSolicitud(datos)`, `notificarSolicitud(datos)`. `datos` es `{ nombre, cedula, correo, autoriza }`.

- [ ] **Step 1: Escribir las pruebas**

Crear `tests/logica.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarGs } from './ayudas.mjs';

const { validarDatos, procesarSolicitud } = cargarGs(['Matcher.gs', 'Logica.gs'], {
  exportar: ['validarDatos', 'procesarSolicitud'],
});

function datosValidos(extra = {}) {
  return {
    nombre: 'Carlos Andrés Ríos Franco',
    cedula: '1032456789',
    correo: 'crios@wcs.org',
    autoriza: true,
    ...extra,
  };
}

function repoFalso({ asistentes = ['Carlos Andrés Ríos Franco'], descargados = [] } = {}) {
  return {
    descargas: [],
    solicitudes: [],
    avisos: [],
    leerAsistentes: () => asistentes,
    yaDescargo(cedula) {
      return descargados.includes(cedula);
    },
    registrarDescarga(datos, nombreEnLista, tipo) {
      this.descargas.push({ datos, nombreEnLista, tipo });
    },
    registrarSolicitud(datos) {
      this.solicitudes.push(datos);
    },
    notificarSolicitud(datos) {
      this.avisos.push(datos);
    },
  };
}

test('validarDatos exige nombre de al menos dos palabras', () => {
  assert.match(validarDatos(datosValidos({ nombre: 'Carlos' })), /nombre y apellido/i);
  assert.equal(validarDatos(datosValidos()), null);
});

test('validarDatos exige cédula de 6 a 12 dígitos', () => {
  assert.match(validarDatos(datosValidos({ cedula: '123' })), /cédula/i);
  assert.match(validarDatos(datosValidos({ cedula: '1234567890123' })), /cédula/i);
  assert.equal(validarDatos(datosValidos({ cedula: '1.032.456.789' })), null);
});

test('validarDatos exige correo con formato válido', () => {
  assert.match(validarDatos(datosValidos({ correo: 'no-es-correo' })), /correo/i);
});

test('validarDatos exige la autorización de datos', () => {
  assert.match(validarDatos(datosValidos({ autoriza: false })), /autoriza/i);
});

test('procesarSolicitud aprueba a quien está en la lista y registra la descarga', () => {
  const repo = repoFalso();
  const resultado = procesarSolicitud(datosValidos(), repo);

  assert.deepEqual(resultado, { estado: 'aprobado', tipo: 'primera' });
  assert.equal(repo.descargas.length, 1);
  assert.equal(repo.descargas[0].nombreEnLista, 'Carlos Andrés Ríos Franco');
  assert.equal(repo.solicitudes.length, 0);
});

test('procesarSolicitud marca como repetida la segunda descarga', () => {
  const repo = repoFalso({ descargados: ['1032456789'] });
  const resultado = procesarSolicitud(datosValidos(), repo);

  assert.deepEqual(resultado, { estado: 'aprobado', tipo: 'repetida' });
  assert.equal(repo.descargas[0].tipo, 'repetida');
});

test('procesarSolicitud deja pendiente a quien no está en la lista y avisa', () => {
  const repo = repoFalso({ asistentes: ['Silvia Alvarez'] });
  const resultado = procesarSolicitud(datosValidos(), repo);

  assert.deepEqual(resultado, { estado: 'pendiente' });
  assert.equal(repo.solicitudes.length, 1);
  assert.equal(repo.avisos.length, 1);
  assert.equal(repo.descargas.length, 0);
});

test('procesarSolicitud rechaza datos inválidos sin tocar el repositorio', () => {
  const repo = repoFalso();
  const resultado = procesarSolicitud(datosValidos({ correo: 'malo' }), repo);

  assert.equal(resultado.estado, 'error');
  assert.match(resultado.mensaje, /correo/i);
  assert.equal(repo.descargas.length, 0);
  assert.equal(repo.solicitudes.length, 0);
});
```

- [ ] **Step 2: Correr las pruebas y verificar que fallan**

Run: `npm test`
Expected: FAIL, `ENOENT` sobre `apps-script/Logica.gs`.

- [ ] **Step 3: Implementar `apps-script/Logica.gs`**

```js
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
```

- [ ] **Step 4: Correr las pruebas y verificar que pasan**

Run: `npm test`
Expected: PASS, 16 pruebas en total.

- [ ] **Step 5: Commit**

```bash
git add apps-script/Logica.gs tests/logica.test.mjs
git commit -m "Agrega la logica de decision de una solicitud de certificado

Valida los datos del formulario y decide entre aprobado, repetido y
pendiente. Recibe el repositorio por parametro para poder probarla
completa sin desplegar en Apps Script."
```

---

### Task 3: Endpoint doPost y repositorio de Google Sheets

Conecta la lógica con el Sheet real. Se prueba con dobles de `SpreadsheetApp`, `MailApp`, `LockService` y `ContentService`, así que los cuatro caminos quedan verificados sin desplegar.

**Files:**
- Create: `apps-script/Codigo.gs`
- Create: `apps-script/appsscript.json`
- Test: `tests/backend.test.mjs`

**Interfaces:**
- Consumes: `procesarSolicitud` de `Logica.gs`
- Produces: `doPost(e) → TextOutput` con cuerpo JSON, `doGet() → TextOutput`, `crearRepositorio() → repo`. Constantes `ID_HOJA` y `CORREO_AVISOS`. Hojas y columnas: `Asistentes` (Nombre, Origen, Fecha de alta), `Descargas` (Marca temporal, Nombre ingresado, Nombre en lista, Cédula, Correo, Tipo), `Solicitudes` (Marca temporal, Nombre, Cédula, Correo, Estado).

- [ ] **Step 1: Escribir las pruebas**

Crear `tests/backend.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarGs } from './ayudas.mjs';

function hojaFalsa(filas) {
  return {
    filas,
    getDataRange: () => ({ getValues: () => filas.map((f) => f.slice()) }),
    getLastRow: () => filas.length,
    appendRow: (fila) => filas.push(fila.slice()),
  };
}

function entorno({ asistentes = [['Nombre', 'Origen', 'Fecha de alta']], descargas = [['Marca temporal', 'Nombre ingresado', 'Nombre en lista', 'Cédula', 'Correo', 'Tipo']], solicitudes = [['Marca temporal', 'Nombre', 'Cédula', 'Correo', 'Estado']] } = {}) {
  const hojas = {
    Asistentes: hojaFalsa(asistentes),
    Descargas: hojaFalsa(descargas),
    Solicitudes: hojaFalsa(solicitudes),
  };
  const correos = [];

  return {
    hojas,
    correos,
    globales: {
      SpreadsheetApp: { openById: () => ({ getSheetByName: (nombre) => hojas[nombre] }) },
      MailApp: { sendEmail: (opciones) => correos.push(opciones) },
      LockService: {
        getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }),
      },
      ContentService: {
        MimeType: { JSON: 'application/json' },
        createTextOutput: (texto) => ({
          contenido: texto,
          setMimeType() { return this; },
          getContent() { return this.contenido; },
        }),
      },
    },
  };
}

function llamar(globales, cuerpo) {
  const { doPost } = cargarGs(['Matcher.gs', 'Logica.gs', 'Codigo.gs'], {
    globales,
    exportar: ['doPost'],
  });
  const salida = doPost({ postData: { contents: JSON.stringify(cuerpo) } });
  return JSON.parse(salida.getContent());
}

const solicitud = {
  nombre: 'Carlos Andrés Ríos Franco',
  cedula: '1032456789',
  correo: 'crios@wcs.org',
  autoriza: true,
};

test('doPost aprueba y escribe una fila en Descargas', () => {
  const ent = entorno({
    asistentes: [['Nombre', 'Origen', 'Fecha de alta'], ['Carlos Andrés Ríos Franco', 'Encuesta', '2026-08-03']],
  });

  const respuesta = llamar(ent.globales, solicitud);

  assert.deepEqual(respuesta, { estado: 'aprobado', tipo: 'primera' });
  assert.equal(ent.hojas.Descargas.filas.length, 2);
  const fila = ent.hojas.Descargas.filas[1];
  assert.equal(fila[1], 'Carlos Andrés Ríos Franco');
  assert.equal(fila[3], '1032456789');
  assert.equal(fila[5], 'Primera descarga');
});

test('doPost detecta una descarga repetida por cédula', () => {
  const ent = entorno({
    asistentes: [['Nombre', 'Origen', 'Fecha de alta'], ['Carlos Andrés Ríos Franco', 'Encuesta', '2026-08-03']],
    descargas: [
      ['Marca temporal', 'Nombre ingresado', 'Nombre en lista', 'Cédula', 'Correo', 'Tipo'],
      ['2026-08-03', 'Carlos Ríos', 'Carlos Andrés Ríos Franco', '1032456789', 'crios@wcs.org', 'Primera descarga'],
    ],
  });

  const respuesta = llamar(ent.globales, solicitud);

  assert.deepEqual(respuesta, { estado: 'aprobado', tipo: 'repetida' });
  assert.equal(ent.hojas.Descargas.filas[2][5], 'Repetida');
});

test('doPost deja pendiente a quien no está en la lista y manda correo', () => {
  const ent = entorno();

  const respuesta = llamar(ent.globales, solicitud);

  assert.deepEqual(respuesta, { estado: 'pendiente' });
  assert.equal(ent.hojas.Solicitudes.filas.length, 2);
  assert.equal(ent.hojas.Solicitudes.filas[1][4], 'Pendiente');
  assert.equal(ent.correos.length, 1);
  assert.equal(ent.correos[0].to, 'info.porcontar@gmail.com');
  assert.match(ent.correos[0].body, /Carlos Andrés Ríos Franco/);
});

test('doPost guarda la cédula sin puntos y detecta la repetición', () => {
  const ent = entorno({
    asistentes: [['Nombre', 'Origen', 'Fecha de alta'], ['Carlos Andrés Ríos Franco', 'Encuesta', '2026-08-03']],
  });

  const primera = llamar(ent.globales, { ...solicitud, cedula: '1.032.456.789' });
  assert.deepEqual(primera, { estado: 'aprobado', tipo: 'primera' });
  assert.equal(ent.hojas.Descargas.filas[1][3], '1032456789', 'la cédula debe guardarse sin puntos');

  const segunda = llamar(ent.globales, { ...solicitud, cedula: '1032456789' });
  assert.deepEqual(segunda, { estado: 'aprobado', tipo: 'repetida' });
});

test('doPost responde error si el cuerpo no es JSON', () => {
  const ent = entorno();
  const { doPost } = cargarGs(['Matcher.gs', 'Logica.gs', 'Codigo.gs'], {
    globales: ent.globales,
    exportar: ['doPost'],
  });

  const salida = doPost({ postData: { contents: 'esto no es json' } });
  const respuesta = JSON.parse(salida.getContent());

  assert.equal(respuesta.estado, 'error');
  assert.ok(respuesta.mensaje.length > 0);
});

test('doPost libera el candado aunque falle la escritura', () => {
  const ent = entorno();
  let liberado = false;
  ent.globales.LockService = {
    getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => { liberado = true; } }),
  };
  ent.globales.SpreadsheetApp = {
    openById: () => { throw new Error('sin permisos'); },
  };

  const respuesta = llamar(ent.globales, solicitud);

  assert.equal(respuesta.estado, 'error');
  assert.equal(liberado, true);
});
```

- [ ] **Step 2: Correr las pruebas y verificar que fallan**

Run: `npm test`
Expected: FAIL, `ENOENT` sobre `apps-script/Codigo.gs`.

- [ ] **Step 3: Implementar `apps-script/Codigo.gs`**

```js
/**
 * Web App que recibe las solicitudes de certificado.
 * Publicar como aplicación web: ejecutar como yo, acceso para cualquier persona.
 */

var ID_HOJA = 'REEMPLAZAR_CON_EL_ID_DEL_SHEET';
var CORREO_AVISOS = 'info.porcontar@gmail.com';

function doPost(e) {
  var candado = LockService.getScriptLock();
  var respuesta;

  try {
    candado.waitLock(20000);
    var datos = JSON.parse(e.postData.contents);
    respuesta = procesarSolicitud(datos, crearRepositorio());
  } catch (error) {
    respuesta = { estado: 'error', mensaje: 'No pudimos registrar tu solicitud: ' + error.message };
  } finally {
    candado.releaseLock();
  }

  return ContentService.createTextOutput(JSON.stringify(respuesta))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ estado: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function crearRepositorio() {
  var libro = SpreadsheetApp.openById(ID_HOJA);

  return {
    leerAsistentes: function () {
      var filas = libro.getSheetByName('Asistentes').getDataRange().getValues();
      return filas
        .slice(1)
        .map(function (fila) { return String(fila[0]).trim(); })
        .filter(function (nombre) { return nombre !== ''; });
    },

    yaDescargo: function (cedula) {
      var filas = libro.getSheetByName('Descargas').getDataRange().getValues();
      return filas.slice(1).some(function (fila) {
        return String(fila[3]).replace(/\D/g, '') === cedula;
      });
    },

    registrarDescarga: function (datos, nombreEnLista, tipo) {
      libro.getSheetByName('Descargas').appendRow([
        new Date(),
        String(datos.nombre).trim(),
        nombreEnLista,
        String(datos.cedula).replace(/\D/g, ''),
        String(datos.correo).trim(),
        tipo === 'repetida' ? 'Repetida' : 'Primera descarga',
      ]);
    },

    registrarSolicitud: function (datos) {
      libro.getSheetByName('Solicitudes').appendRow([
        new Date(),
        String(datos.nombre).trim(),
        String(datos.cedula).replace(/\D/g, ''),
        String(datos.correo).trim(),
        'Pendiente',
      ]);
    },

    notificarSolicitud: function (datos) {
      MailApp.sendEmail({
        to: CORREO_AVISOS,
        subject: 'Certificado IA Learn WCS: solicitud por aprobar',
        body:
          'Alguien pidió su certificado y no aparece en la lista de asistentes.\n\n' +
          'Nombre: ' + datos.nombre + '\n' +
          'Cédula: ' + String(datos.cedula).replace(/\D/g, '') + '\n' +
          'Correo: ' + datos.correo + '\n\n' +
          'Aprobalo desde la hoja Solicitudes, en el menú Certificados.',
      });
    },
  };
}
```

- [ ] **Step 4: Crear `apps-script/appsscript.json`**

```json
{
  "timeZone": "America/Bogota",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}
```

- [ ] **Step 5: Correr las pruebas y verificar que pasan**

Run: `npm test`
Expected: PASS, 22 pruebas en total.

- [ ] **Step 6: Commit**

```bash
git add apps-script/Codigo.gs apps-script/appsscript.json tests/backend.test.mjs
git commit -m "Agrega el endpoint doPost y el repositorio de Google Sheets

Escribe en Descargas o Solicitudes segun el resultado de la validacion,
avisa por correo las solicitudes pendientes y serializa las escrituras
con LockService. Los cuatro caminos quedan probados con dobles."
```

---

### Task 4: Menú de aprobación dentro del Sheet

Sin esto, aprobar a alguien obliga a editar filas a mano.

**Files:**
- Create: `apps-script/Menu.gs`
- Test: `tests/menu.test.mjs`

**Interfaces:**
- Consumes: nada de tareas anteriores
- Produces: `onOpen()`, `aprobarSeleccionados()`, y la función pura `construirAprobaciones(filas, primeraFila, cantidad) → { fila, nombre, correo }[]` que descarta las que ya están aprobadas. `filas` son las filas completas de `Solicitudes` incluida la cabecera; `primeraFila` es el número de fila de la hoja (base 1).

- [ ] **Step 1: Escribir las pruebas**

Crear `tests/menu.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarGs } from './ayudas.mjs';

const { construirAprobaciones } = cargarGs(['Menu.gs'], { exportar: ['construirAprobaciones'] });

const filas = [
  ['Marca temporal', 'Nombre', 'Cédula', 'Correo', 'Estado'],
  ['2026-08-03', 'Silvia Alvarez', '52123456', 'salvarez@wcs.org', 'Pendiente'],
  ['2026-08-03', 'Leonor Valenzuela', '41234567', 'lvalenzuela@wcs.org', 'Aprobado'],
  ['2026-08-03', 'Catalina Gutiérrez', '1010101010', 'cgutierrez@wcs.org', 'Pendiente'],
];

test('construirAprobaciones toma solo las filas seleccionadas que están pendientes', () => {
  const resultado = construirAprobaciones(filas, 2, 3);

  assert.deepEqual(resultado, [
    { fila: 2, nombre: 'Silvia Alvarez', correo: 'salvarez@wcs.org' },
    { fila: 4, nombre: 'Catalina Gutiérrez', correo: 'cgutierrez@wcs.org' },
  ]);
});

test('construirAprobaciones ignora la cabecera si queda dentro de la selección', () => {
  assert.deepEqual(construirAprobaciones(filas, 1, 2), [
    { fila: 2, nombre: 'Silvia Alvarez', correo: 'salvarez@wcs.org' },
  ]);
});

test('construirAprobaciones devuelve vacío si no hay pendientes', () => {
  assert.deepEqual(construirAprobaciones(filas, 3, 1), []);
});

test('construirAprobaciones no se sale del rango si la selección pasa del último dato', () => {
  // Caso real: seleccionar la columna entera en el Sheet.
  assert.deepEqual(construirAprobaciones(filas, 3, 100), [
    { fila: 4, nombre: 'Catalina Gutiérrez', correo: 'cgutierrez@wcs.org' },
  ]);
  assert.deepEqual(construirAprobaciones(filas, 50, 10), []);
});
```

- [ ] **Step 2: Correr las pruebas y verificar que fallan**

Run: `npm test`
Expected: FAIL, `ENOENT` sobre `apps-script/Menu.gs`.

- [ ] **Step 3: Implementar `apps-script/Menu.gs`**

```js
/**
 * Menú "Certificados" dentro del Google Sheet.
 * Aprobar significa mover el nombre a la hoja Asistentes y avisarle a la persona.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Certificados')
    .addItem('Aprobar seleccionados', 'aprobarSeleccionados')
    .addToUi();
}

function construirAprobaciones(filas, primeraFila, cantidad) {
  var aprobaciones = [];

  for (var i = 0; i < cantidad; i++) {
    var numeroFila = primeraFila + i;
    if (numeroFila < 2 || numeroFila > filas.length) continue;

    var fila = filas[numeroFila - 1];
    if (String(fila[4]).trim() !== 'Pendiente') continue;

    aprobaciones.push({
      fila: numeroFila,
      nombre: String(fila[1]).trim(),
      correo: String(fila[3]).trim(),
    });
  }

  return aprobaciones;
}

function aprobarSeleccionados() {
  var ui = SpreadsheetApp.getUi();
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = libro.getActiveSheet();

  if (hoja.getName() !== 'Solicitudes') {
    ui.alert('Abrí la hoja Solicitudes y seleccioná las filas que querés aprobar.');
    return;
  }

  var seleccion = hoja.getActiveRange();
  var aprobaciones = construirAprobaciones(
    hoja.getDataRange().getValues(),
    seleccion.getRow(),
    seleccion.getNumRows()
  );

  if (aprobaciones.length === 0) {
    ui.alert('No hay solicitudes pendientes en la selección.');
    return;
  }

  var asistentes = libro.getSheetByName('Asistentes');

  for (var i = 0; i < aprobaciones.length; i++) {
    var aprobacion = aprobaciones[i];
    asistentes.appendRow([aprobacion.nombre, 'Aprobado manual', new Date()]);
    hoja.getRange(aprobacion.fila, 5).setValue('Aprobado');

    MailApp.sendEmail({
      to: aprobacion.correo,
      subject: 'Tu certificado del taller IA Learn ya está disponible',
      body:
        'Hola ' + aprobacion.nombre + ',\n\n' +
        'Ya validamos tu participación en el taller IA Learn: Inteligencia Artificial ' +
        'para la Productividad. Volvé al link de las memorias y descargá tu certificado ' +
        'con los mismos datos que ingresaste.\n\n' +
        'Ximena Villalobos y Luisa Navarro\nPorContar',
    });
  }

  ui.alert('Listo: ' + aprobaciones.length + ' solicitud(es) aprobada(s).');
}
```

- [ ] **Step 4: Correr las pruebas y verificar que pasan**

Run: `npm test`
Expected: PASS, 26 pruebas en total.

- [ ] **Step 5: Commit**

```bash
git add apps-script/Menu.gs tests/menu.test.mjs
git commit -m "Agrega el menu de aprobacion manual en el Sheet

Aprobar mueve el nombre a Asistentes, marca la solicitud y le avisa a la
persona por correo."
```

---

### Task 5: Preparación de las imágenes

Los tres archivos que entregó Luisa no sirven tal cual: el logo de PorContar es negro y desaparecería sobre los bloques verdes, la firma trae fondo blanco opaco y el logo de WCS es un PNG indexado que jsPDF maneja mal.

**Files:**
- Create: `tools/preparar-assets.mjs`
- Test: `tests/assets.test.mjs`
- Genera: `assets/generados/logo-porcontar-blanco.png`, `assets/generados/firma-ximena.png`, `assets/generados/logo-wcs.png`

**Interfaces:**
- Consumes: `assets/logo-porcontar.png`, `assets/firma-ximena.png`, `assets/logo-wcs.png`
- Produces: funciones exportadas `luminancia(r, g, b) → number`, `limitesDelGlobo(png) → [number, number][]`, `aBlanco(png, umbral = 90) → PNG`, `quitarFondoBlanco(png, { alto = 245, bajo = 200 }) → PNG`, `extraerMarcaDeColor(png, { umbral = 30 }) → PNG`, `main() → void`. Las tres funciones de imagen mutan el PNG que reciben y devuelven; `main` siempre les pasa uno recién leído, nunca encadena dos sobre el mismo objeto.

- [ ] **Step 1: Escribir las pruebas**

Crear `tests/assets.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { aBlanco, quitarFondoBlanco, main } from '../tools/preparar-assets.mjs';

function pngDe(pixeles) {
  const png = new PNG({ width: pixeles.length, height: 1 });
  pixeles.forEach(([r, g, b, a], i) => {
    png.data[i * 4] = r;
    png.data[i * 4 + 1] = g;
    png.data[i * 4 + 2] = b;
    png.data[i * 4 + 3] = a;
  });
  return png;
}

function pixel(png, i) {
  return [png.data[i * 4], png.data[i * 4 + 1], png.data[i * 4 + 2], png.data[i * 4 + 3]];
}

test('aBlanco convierte el negro en blanco y respeta el amarillo', () => {
  const resultado = aBlanco(pngDe([[0, 0, 0, 255], [255, 244, 1, 255], [0, 0, 0, 0]]));

  assert.deepEqual(pixel(resultado, 0), [255, 255, 255, 255]);
  assert.deepEqual(pixel(resultado, 1), [255, 244, 1, 255]);
  assert.equal(pixel(resultado, 2)[3], 0, 'los píxeles transparentes siguen transparentes');
});

test('aBlanco conserva los puntos que viven dentro del globo amarillo', () => {
  // amarillo · blanco · punto negro · blanco · amarillo
  const resultado = aBlanco(
    pngDe([
      [255, 244, 1, 255],
      [255, 255, 255, 255],
      [0, 0, 0, 255],
      [255, 255, 255, 255],
      [255, 244, 1, 255],
    ])
  );

  assert.deepEqual(pixel(resultado, 2), [0, 0, 0, 255], 'el punto del globo no se blanquea');
});

test('quitarFondoBlanco deja transparente el blanco y opaco el trazo', () => {
  const resultado = quitarFondoBlanco(pngDe([[255, 255, 255, 255], [30, 30, 30, 255]]));

  assert.equal(pixel(resultado, 0)[3], 0);
  assert.equal(pixel(resultado, 1)[3], 255);
});

test('extraerMarcaDeColor borra el tablero de transparencia y recorta', () => {
  // gris del tablero · blanco del tablero · teal del logo · gris claro del texto WCS
  const resultado = extraerMarcaDeColor(
    pngDe([
      [238, 239, 239, 255],
      [255, 255, 255, 255],
      [44, 140, 125, 255],
      [201, 204, 203, 255],
    ])
  );

  assert.equal(resultado.width, 1, 'debe recortarse a la marca de color');
  assert.deepEqual(pixel(resultado, 0), [44, 140, 125, 255]);
});

test('main genera los tres archivos listos para usar', () => {
  main();

  const rutas = [
    'assets/generados/logo-porcontar-blanco.png',
    'assets/generados/firma-ximena.png',
    'assets/generados/logo-wcs.png',
  ];
  for (const ruta of rutas) {
    assert.ok(existsSync(ruta), `falta ${ruta}`);
  }

  const wcs = PNG.sync.read(readFileSync('assets/generados/logo-wcs.png'));
  assert.equal(wcs.colorType, 6, 'el logo de WCS debe quedar en RGBA de 8 bits por canal');
  const opacosWcs = contarOpacos(wcs);
  assert.ok(opacosWcs > 5000, `el logo de WCS quedó casi vacío: ${opacosWcs} píxeles opacos`);
  assert.equal(
    contarOpacosSinColor(wcs),
    0,
    'quedaron píxeles grises opacos: el tablero de transparencia no se limpió'
  );

  const firma = PNG.sync.read(readFileSync('assets/generados/firma-ximena.png'));
  assert.equal(firma.data[3], 0, 'la esquina de la firma debe quedar transparente');
  assert.ok(contarOpacos(firma) > 500, 'la firma quedó borrada');

  const logo = PNG.sync.read(readFileSync('assets/generados/logo-porcontar-blanco.png'));
  assert.ok(contarNegros(logo) > 1000, 'los tres puntos del globo se perdieron al blanquear el logo');
});

function contarOpacos(png) {
  let total = 0;
  for (let i = 3; i < png.data.length; i += 4) if (png.data[i] > 200) total++;
  return total;
}

function contarNegros(png) {
  let total = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i + 3] > 200 && png.data[i] < 60 && png.data[i + 1] < 60 && png.data[i + 2] < 60) total++;
  }
  return total;
}

function contarOpacosSinColor(png) {
  let total = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    const saturacion = Math.max(png.data[i], png.data[i + 1], png.data[i + 2]) -
      Math.min(png.data[i], png.data[i + 1], png.data[i + 2]);
    if (png.data[i + 3] > 200 && saturacion < 30) total++;
  }
  return total;
}
```

- [ ] **Step 2: Correr las pruebas y verificar que fallan**

Run: `npm test`
Expected: FAIL, no se resuelve `../tools/preparar-assets.mjs`.

- [ ] **Step 3: Implementar `tools/preparar-assets.mjs`**

```js
/**
 * Deja las imágenes de marca listas para la landing y el certificado.
 * Correr con: npm run assets
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { PNG } from 'pngjs';

const ENTRADA = 'assets';
const SALIDA = 'assets/generados';

export function luminancia(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function esAmarillo(r, g, b) {
  return r > 200 && g > 180 && b < 120;
}

/**
 * Para cada fila, la primera y la última columna con amarillo: el contorno del globo.
 * Devuelve [-1, -1] en las filas donde no hay globo.
 */
export function limitesDelGlobo(png) {
  const limites = [];
  for (let y = 0; y < png.height; y++) {
    let primera = -1;
    let ultima = -1;
    for (let x = 0; x < png.width; x++) {
      const i = (png.width * y + x) * 4;
      if (png.data[i + 3] > 0 && esAmarillo(png.data[i], png.data[i + 1], png.data[i + 2])) {
        if (primera === -1) primera = x;
        ultima = x;
      }
    }
    limites.push([primera, ultima]);
  }
  return limites;
}

/**
 * Vuelve blancos los píxeles oscuros, para usar el logo sobre fondos verdes.
 * Los tres puntos del globo quedan encerrados por el contorno amarillo y viven
 * sobre el interior blanco: si se blanquearan, desaparecerían. Por eso todo lo
 * que esté entre el borde izquierdo y el derecho del globo se deja intacto.
 */
export function aBlanco(png, umbral = 90) {
  const limites = limitesDelGlobo(png);

  for (let y = 0; y < png.height; y++) {
    const [primera, ultima] = limites[y];
    for (let x = 0; x < png.width; x++) {
      const i = (png.width * y + x) * 4;
      if (png.data[i + 3] === 0) continue;

      const dentroDelGlobo = primera !== -1 && x > primera && x < ultima;
      if (dentroDelGlobo) continue;

      if (luminancia(png.data[i], png.data[i + 1], png.data[i + 2]) < umbral) {
        png.data[i] = 255;
        png.data[i + 1] = 255;
        png.data[i + 2] = 255;
      }
    }
  }
  return png;
}

/** Convierte el fondo blanco en transparencia con una rampa, para no dejar bordes duros. */
export function quitarFondoBlanco(png, { alto = 245, bajo = 200 } = {}) {
  for (let i = 0; i < png.data.length; i += 4) {
    const lum = luminancia(png.data[i], png.data[i + 1], png.data[i + 2]);
    if (lum >= alto) {
      png.data[i + 3] = 0;
    } else if (lum > bajo) {
      png.data[i + 3] = Math.round(((alto - lum) / (alto - bajo)) * 255);
    } else {
      png.data[i + 3] = 255;
    }
  }
  return png;
}

/**
 * Deja solo los píxeles con color y recorta el sobrante.
 *
 * El logo de WCS que entregó el cliente es una captura de pantalla: trae
 * horneado el tablero de ajedrez con el que los visores dibujan la
 * transparencia (alterna 255,255,255 con 238,239,239) y el texto "WCS" en gris
 * claro. Nada de eso tiene saturación, así que filtrar por saturación deja la
 * W de colores limpia y con transparencia real.
 */
export function extraerMarcaDeColor(png, { umbral = 30 } = {}) {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (png.width * y + x) * 4;
      const r = png.data[i];
      const g = png.data[i + 1];
      const b = png.data[i + 2];
      const saturacion = Math.max(r, g, b) - Math.min(r, g, b);

      if (saturacion >= umbral) {
        png.data[i + 3] = 255;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      } else {
        png.data[i + 3] = 0;
      }
    }
  }

  if (maxX < 0) return png;

  const recortado = new PNG({ width: maxX - minX + 1, height: maxY - minY + 1 });
  for (let y = 0; y < recortado.height; y++) {
    for (let x = 0; x < recortado.width; x++) {
      const origen = (png.width * (y + minY) + (x + minX)) * 4;
      const destino = (recortado.width * y + x) * 4;
      for (let c = 0; c < 4; c++) recortado.data[destino + c] = png.data[origen + c];
    }
  }
  return recortado;
}

function leer(nombre) {
  return PNG.sync.read(readFileSync(`${ENTRADA}/${nombre}`));
}

function escribir(png, nombre) {
  writeFileSync(`${SALIDA}/${nombre}`, PNG.sync.write(png, { colorType: 6 }));
}

export function main() {
  mkdirSync(SALIDA, { recursive: true });

  escribir(aBlanco(leer('logo-porcontar.png')), 'logo-porcontar-blanco.png');
  escribir(quitarFondoBlanco(leer('firma-ximena.png')), 'firma-ximena.png');
  escribir(extraerMarcaDeColor(leer('logo-wcs.png')), 'logo-wcs.png');

  console.log('Imágenes listas en', SALIDA);
}

if (process.argv[1] && process.argv[1].endsWith('preparar-assets.mjs')) main();
```

- [ ] **Step 4: Correr el script y revisar el resultado a ojo**

Run: `npm run assets`
Expected: imprime "Imágenes listas en assets/generados". Abrir los tres PNG y confirmar que el logo blanco conserva el globo amarillo y que la firma se ve limpia sin halo gris.

- [ ] **Step 5: Correr las pruebas y verificar que pasan**

Run: `npm test`
Expected: PASS, 31 pruebas en total.

- [ ] **Step 6: Commit**

```bash
git add tools/preparar-assets.mjs tests/assets.test.mjs assets/generados/
git commit -m "Prepara las imagenes de marca para la landing y el certificado

Genera la variante blanca del logo de PorContar, le quita el fondo blanco
a la firma y reescribe el logo de WCS como RGBA, que es lo que jsPDF sabe
embeber."
```

---

### Task 6: Fuentes del PDF y jsPDF vendorizado

**Files:**
- Create: `tools/preparar-fuentes.mjs`
- Test: `tests/fuentes.test.mjs`
- Genera: `assets/vendor/jspdf.umd.min.js`, `assets/generados/recursos.js`

**Interfaces:**
- Consumes: `assets/generados/*.png` de la Task 5
- Produces: `assets/generados/recursos.js`, un módulo ES que exporta `POPPINS_REGULAR`, `POPPINS_BOLD` (base64 de las TTF, sin prefijo `data:`) y `LOGO_PORCONTAR`, `LOGO_PORCONTAR_BLANCO`, `LOGO_WCS`, `FIRMA` (data URL completa `data:image/png;base64,...`).

- [ ] **Step 1: Escribir las pruebas**

Crear `tests/fuentes.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';

test('el bundle de recursos existe y trae fuentes e imágenes utilizables', async () => {
  assert.ok(existsSync('assets/generados/recursos.js'), 'falta recursos.js: corré npm run fuentes');

  const recursos = await import('../assets/generados/recursos.js');

  for (const clave of ['POPPINS_REGULAR', 'POPPINS_BOLD']) {
    const base64 = recursos[clave];
    assert.ok(base64.length > 100000, `${clave} parece truncada`);
    const cabecera = Buffer.from(base64.slice(0, 8), 'base64');
    const firma = cabecera.readUInt32BE(0);
    assert.ok(
      firma === 0x00010000 || firma === 0x74727565 || firma === 0x4f54544f,
      `${clave} no parece una fuente TrueType`
    );
  }

  for (const clave of ['LOGO_PORCONTAR', 'LOGO_PORCONTAR_BLANCO', 'LOGO_WCS', 'FIRMA']) {
    assert.match(recursos[clave], /^data:image\/png;base64,/, `${clave} debe ser una data URL`);
  }
});

test('jsPDF quedó vendorizado para el navegador', () => {
  assert.ok(existsSync('assets/vendor/jspdf.umd.min.js'), 'falta jsPDF: corré npm run fuentes');
  assert.ok(statSync('assets/vendor/jspdf.umd.min.js').size > 200000);
});
```

- [ ] **Step 2: Correr las pruebas y verificar que fallan**

Run: `npm test`
Expected: FAIL con "falta recursos.js: corré npm run fuentes".

- [ ] **Step 3: Implementar `tools/preparar-fuentes.mjs`**

```js
/**
 * Descarga Poppins y jsPDF, y arma el bundle de recursos que consume el certificado.
 * Correr con: npm run fuentes
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const FUENTES = {
  POPPINS_REGULAR: 'https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Regular.ttf',
  POPPINS_BOLD: 'https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Bold.ttf',
};

const JSPDF = 'https://cdn.jsdelivr.net/npm/jspdf@4.2.1/dist/jspdf.umd.min.js';

const IMAGENES = {
  LOGO_PORCONTAR: 'assets/logo-porcontar.png',
  LOGO_PORCONTAR_BLANCO: 'assets/generados/logo-porcontar-blanco.png',
  LOGO_WCS: 'assets/generados/logo-wcs.png',
  FIRMA: 'assets/generados/firma-ximena.png',
};

async function descargar(url) {
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error(`No se pudo descargar ${url}: HTTP ${respuesta.status}`);
  return Buffer.from(await respuesta.arrayBuffer());
}

async function main() {
  mkdirSync('assets/generados', { recursive: true });
  mkdirSync('assets/vendor', { recursive: true });

  const lineas = [
    '// Generado por tools/preparar-fuentes.mjs. No editar a mano.',
    '',
  ];

  for (const [nombre, url] of Object.entries(FUENTES)) {
    const datos = await descargar(url);
    lineas.push(`export const ${nombre} = '${datos.toString('base64')}';`, '');
    console.log(`${nombre}: ${(datos.length / 1024).toFixed(0)} KB`);
  }

  for (const [nombre, ruta] of Object.entries(IMAGENES)) {
    const datos = readFileSync(ruta);
    lineas.push(`export const ${nombre} = 'data:image/png;base64,${datos.toString('base64')}';`, '');
  }

  writeFileSync('assets/generados/recursos.js', lineas.join('\n'));

  const jspdf = await descargar(JSPDF);
  writeFileSync('assets/vendor/jspdf.umd.min.js', jspdf);
  console.log(`jsPDF: ${(jspdf.length / 1024).toFixed(0)} KB`);
}

main();
```

- [ ] **Step 4: Correr el script**

Run: `npm run fuentes`
Expected: imprime los tamaños de las dos fuentes (alrededor de 150 KB cada una) y de jsPDF (más de 300 KB). Si GitHub o jsDelivr fallan, reintentar; no hay plan B automático, y si el problema persiste se sustituyen las fuentes embebidas por las estándar de jsPDF dejando constancia en el README.

- [ ] **Step 5: Correr las pruebas y verificar que pasan**

Run: `npm test`
Expected: PASS, 33 pruebas en total.

- [ ] **Step 6: Commit**

```bash
git add tools/preparar-fuentes.mjs tests/fuentes.test.mjs assets/generados/recursos.js assets/vendor/
git commit -m "Vendoriza jsPDF y arma el bundle de fuentes e imagenes del certificado

Poppins Regular y Bold en base64 mas los logos y la firma como data URL,
en un solo modulo que el navegador carga bajo demanda."
```

---

### Task 7: Contenido del taller en `config.js`

Todo lo editable en un solo archivo, para que cambiar de cliente sea editar este archivo y reemplazar dos logos.

**Files:**
- Create: `js/config.js`
- Test: `tests/config.test.mjs`

**Interfaces:**
- Consumes: nada
- Produces: exportaciones nombradas `TALLER`, `BACKEND`, `MODULOS`, `ELEMENTOS_PROMPT`, `GLOSARIO`, `HERRAMIENTAS`, `CONSEJOS`, `DESCARGAS`, `REELS`, `REDES`, `EVALUACION`. Formas exactas en el código de la Step 3.

- [ ] **Step 1: Escribir las pruebas**

Crear `tests/config.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as config from '../js/config.js';

test('los datos del taller coinciden con el certificado', () => {
  assert.equal(config.TALLER.nombre, 'IA Learn: Inteligencia Artificial para la Productividad');
  assert.equal(config.TALLER.fecha, '27 de julio de 2026');
  assert.equal(config.TALLER.duracion, '4 horas');
  assert.equal(config.TALLER.cliente, 'WCS Colombia');
  assert.equal(config.TALLER.nit, '901986736-1');
  assert.equal(config.TALLER.firmante, 'Ximena Andrea Villalobos');
  assert.equal(config.TALLER.cargoFirmante, 'Gerente');
});

test('el contenido de las memorias está completo', () => {
  assert.equal(config.MODULOS.length, 5);
  assert.equal(config.ELEMENTOS_PROMPT.length, 6);
  assert.equal(config.GLOSARIO.length, 12);
  assert.equal(config.CONSEJOS.length, 4);
  assert.equal(config.HERRAMIENTAS.length, 3);
  assert.equal(config.DESCARGAS.length, 3);
  assert.equal(config.REELS.length, 5);

  for (const modulo of config.MODULOS) {
    assert.ok(modulo.titulo && modulo.texto && Array.isArray(modulo.etiquetas));
  }
  for (const termino of config.GLOSARIO) {
    assert.ok(termino.termino && termino.definicion);
  }
});

test('los reels apuntan a la cuenta correcta', () => {
  for (const url of config.REELS) {
    assert.match(url, /^https:\/\/www\.instagram\.com\/por\.contar\/reel\/[\w-]+\/$/);
  }
  assert.equal(new Set(config.REELS).size, config.REELS.length, 'hay reels repetidos');
});

test('las descargas apuntan a archivos que existen', async () => {
  const { existsSync } = await import('node:fs');
  for (const descarga of config.DESCARGAS) {
    assert.ok(existsSync(descarga.archivo), `falta ${descarga.archivo}`);
  }
});

test('la URL del backend está declarada', () => {
  assert.equal(typeof config.BACKEND.url, 'string');
  assert.ok(config.BACKEND.url.length > 0);
});
```

- [ ] **Step 2: Correr las pruebas y verificar que fallan**

Run: `npm test`
Expected: FAIL, no se resuelve `../js/config.js`.

- [ ] **Step 3: Implementar `js/config.js`**

```js
/**
 * Todo el contenido editable de las memorias.
 * Para reusar esta página en otro taller: cambiar este archivo y los dos logos.
 */

export const TALLER = {
  nombre: 'IA Learn: Inteligencia Artificial para la Productividad',
  nombreCorto: 'IA Learn para la Productividad',
  fecha: '27 de julio de 2026',
  duracion: '4 horas',
  modalidad: 'virtual en vivo',
  cliente: 'WCS Colombia',
  emisor: 'POR CONTAR GROUP S.A.S',
  nit: '901986736-1',
  firmante: 'Ximena Andrea Villalobos',
  cargoFirmante: 'Gerente',
  facilitadoras: 'Ximena Villalobos · Luisa Navarro',
};

export const BACKEND = {
  // Se reemplaza con la URL del Web App al desplegar Apps Script (Task 13).
  url: 'REEMPLAZAR_CON_LA_URL_DEL_WEB_APP',
};

export const EVALUACION = [
  { cifra: '42', etiqueta: 'evaluaciones recibidas' },
  { cifra: '4,5', etiqueta: 'de 5 en calificación promedio' },
  { cifra: '5', etiqueta: 'módulos en 4 horas' },
];

export const MODULOS = [
  {
    numero: '1',
    titulo: 'Fundamentos',
    texto:
      'Qué es la IA generativa y cómo llega a una respuesta: entrena con grandes volúmenes de texto, reconoce patrones y construye la respuesta palabra por palabra, ajustada después con revisión humana. A partir de ahí, la idea de pensar el problema completo antes de escribirle a la IA: quién lo va a leer, de dónde sale la información, qué formato necesitas y qué parte de la decisión sigue siendo tuya. Cerramos identificando, cada quien, qué tarea repetitiva de su semana valdría la pena delegar primero.',
    etiquetas: ['IA generativa', 'Pensamiento sistemático'],
  },
  {
    numero: '2',
    titulo: 'Panorama y modelos',
    texto:
      'Un mapa de las herramientas que existen hoy, agrupadas por lo que resuelven: las de uso general (ChatGPT, Gemini, Claude, Copilot), las menos conocidas pero útiles para tareas puntuales, y las de automatización sin código. Con eso, un criterio práctico para elegir el modelo según la tarea: uno rápido y económico para consultas simples, uno equilibrado para el trabajo diario, uno más potente para problemas de varios pasos.',
    etiquetas: ['Mapa de herramientas', 'Elegir el modelo correcto'],
  },
  {
    numero: '3',
    titulo: 'Prompt & context engineering',
    texto:
      'Los seis elementos que hacen que un prompt funcione, y la diferencia entre pedirle bien algo a la IA (prompt engineering) y tenerle listo el entorno de trabajo antes de pedírselo (context engineering): documentos de referencia, instrucciones que no hay que repetir cada vez, ejemplos previos, herramientas conectadas y el contexto del negocio. Cada participante armó su primer prompt aplicado a algo de uso diario: un informe, un resumen, un correo o una propuesta comercial.',
    etiquetas: ['Los 6 elementos del prompt', 'Context engineering'],
  },
  {
    numero: '4',
    titulo: 'Productividad por herramienta',
    texto:
      'Un recorrido práctico por Gemini, ChatGPT y Claude, mirando qué hace mejor cada uno: Gemini por su integración con el ecosistema Google, ChatGPT por sus conectores y tareas programadas, Claude por su manejo de documentos largos, PDFs y hojas de cálculo, además de Proyectos, Artefactos y Skills. Terminamos construyendo, sin escribir código, una primera mini-aplicación funcional.',
    etiquetas: ['Gemini', 'ChatGPT', 'Claude'],
  },
  {
    numero: '5',
    titulo: 'Seguridad, ética y gobernanza',
    texto:
      'Reglas simples para un uso responsable, basadas en marcos como NIST AI RMF e ISO/IEC 42001: no compartir información confidencial en herramientas públicas, verificar cualquier resultado antes de usarlo, cuidar los datos personales, revisar sesgos en resultados sobre personas y no delegarle a la IA decisiones de contratación, evaluación o despido.',
    etiquetas: ['Buenas prácticas', 'Uso responsable'],
  },
];

export const ELEMENTOS_PROMPT = [
  { numero: '01', titulo: 'Rol', texto: 'Quién es el modelo en esta tarea; eso enfoca su forma de responder.' },
  { numero: '02', titulo: 'Contexto', texto: 'El porqué y el para qué: antecedentes del proyecto o la tarea.' },
  { numero: '03', titulo: 'Datos de entrada', texto: 'La información que debe usar: texto, PDF, Excel, un enlace.' },
  { numero: '04', titulo: 'Datos de salida', texto: 'El formato del resultado: texto largo, tabla, resumen, imagen.' },
  { numero: '05', titulo: 'Secuencia', texto: 'El orden de los pasos que debe seguir para completar la tarea.' },
  { numero: '06', titulo: 'Ejemplos', texto: 'Muestras de cómo quieres el resultado, para que la IA calibre el estilo.' },
];

export const GLOSARIO = [
  { termino: 'IA generativa', definicion: 'Modelo capaz de crear contenido nuevo (texto, imagen, audio, código) a partir de una instrucción, en vez de solo buscar una respuesta que ya existe.' },
  { termino: 'Prompt', definicion: 'La instrucción que le das a la IA para obtener un resultado específico.' },
  { termino: 'Prompt engineering', definicion: 'La disciplina de redactar bien esa instrucción: con rol, contexto, formato y ejemplos claros.' },
  { termino: 'Context engineering', definicion: 'Preparar de antemano todo lo que la IA tiene disponible antes de pedirle algo: documentos, memoria, herramientas conectadas.' },
  { termino: 'Loop engineering', definicion: 'Cuando el contexto es tan sólido que el modelo corrige sus propios resultados en ciclos, sin que intervengas en cada paso.' },
  { termino: 'Modelo', definicion: 'El motor que corre por dentro de una herramienta (por ejemplo Sonnet dentro de Claude); elegir bien el modelo cambia el resultado.' },
  { termino: 'Proyectos (Claude)', definicion: 'Carpeta que agrupa conversaciones de un mismo tema, con documentos e instrucciones fijas.' },
  { termino: 'Artefactos', definicion: 'El panel donde vive lo que construyes con la IA: documentos, páginas, diagramas. Se edita y se reutiliza.' },
  { termino: 'Skills', definicion: 'Instrucciones guardadas que le enseñan a la IA a repetir una tarea siempre de la misma forma, a tu manera.' },
  { termino: 'Conector', definicion: 'La integración que le permite a la IA leer y actuar sobre herramientas reales: correo, calendario, CRM.' },
  { termino: 'GEM (Gemini)', definicion: 'Un asistente personalizado dentro de Gemini, con instrucciones y comportamiento propios.' },
  { termino: 'Notebook LM', definicion: 'Herramienta de Google para trabajar a partir de tus propias fuentes: resúmenes, mapas mentales, preguntas.' },
];

export const HERRAMIENTAS = [
  {
    grupo: 'Populares',
    items: [
      { nombre: 'ChatGPT', para: 'Redacción, síntesis, ideación, uso general' },
      { nombre: 'Gemini + Notebook LM', para: 'Ecosistema Google: Docs, Gmail, Calendar' },
      { nombre: 'Claude', para: 'Documentos largos, PDFs, análisis y contexto amplio' },
      { nombre: 'Copilot', para: 'Ecosistema Microsoft: PowerPoint, Word, Excel' },
    ],
  },
  {
    grupo: 'Poco conocidas',
    items: [
      { nombre: 'DeepSeek', para: 'Razonamiento y apoyo técnico' },
      { nombre: 'Kimi', para: 'Contexto muy amplio, investigación' },
      { nombre: 'Z.ai', para: 'Asistencia general de texto' },
      { nombre: 'Manus', para: 'Ejecución más autónoma de tareas' },
    ],
  },
  {
    grupo: 'Automatizaciones',
    items: [
      { nombre: 'Make', para: 'Automatización visual, sin código' },
      { nombre: 'n8n', para: 'Flujos personalizados, más control' },
      { nombre: 'LangGraph', para: 'Orquestación de agentes y lógica' },
      { nombre: 'Hermes Agent', para: 'Agentes para tareas encadenadas' },
    ],
  },
];

export const CONSEJOS = [
  'Empieza pequeño: una tarea, no todo el proceso de una vez.',
  'Verifica siempre lo que la IA te entrega antes de usarlo.',
  'Protege la información sensible de la empresa y de tus clientes.',
  'Comparte con tu equipo lo que te funcionó, no solo lo que aprendiste.',
];

export const DESCARGAS = [
  {
    titulo: 'Kit de 3 prompts · línea editorial WCS Colombia',
    texto: 'Presentaciones, infografías y videos que mantienen la misma dirección de arte de los informes de WCS. Listos para pegar en Notebook LM.',
    archivo: 'assets/descargas/kit-prompts-wcs.pdf',
  },
  {
    titulo: 'Prompt para que la IA suene humana',
    texto: 'Una instrucción de sistema que elimina los patrones que delatan un texto escrito por IA. Se pega al inicio de cualquier conversación.',
    archivo: 'assets/descargas/prompt-claude-humano.pdf',
  },
  {
    titulo: 'Recapitulación del taller',
    texto: 'Los cinco módulos, los seis elementos del prompt y el glosario completo, en un PDF para guardar.',
    archivo: 'assets/descargas/recapitulacion-ia-learn.pdf',
  },
];

export const REELS = [
  'https://www.instagram.com/por.contar/reel/Dad_uTjOEpe/',
  'https://www.instagram.com/por.contar/reel/DYX_Oj5OQ3X/',
  'https://www.instagram.com/por.contar/reel/DZs-OvoO96n/',
  'https://www.instagram.com/por.contar/reel/DaTnSWXOoOy/',
  'https://www.instagram.com/por.contar/reel/DZldEgpuV7a/',
];

export const REDES = [
  { nombre: 'Instagram', usuario: '@por.contar', url: 'https://www.instagram.com/por.contar/' },
  { nombre: 'TikTok', usuario: '@por.contar', url: 'https://www.tiktok.com/@por.contar' },
  { nombre: 'YouTube', usuario: '@porcontar', url: 'https://www.youtube.com/@porcontar' },
  { nombre: 'LinkedIn Ximena', usuario: 'Ximena Villalobos', url: 'https://www.linkedin.com/in/ximena-villalobos-vel%C3%A1squez/' },
  { nombre: 'LinkedIn Luisa', usuario: 'Luisa Navarro', url: 'https://www.linkedin.com/in/luisa-navarro-salgado-porcontar' },
  { nombre: 'Correo', usuario: 'info.porcontar@gmail.com', url: 'mailto:info.porcontar@gmail.com' },
  { nombre: 'Web', usuario: 'porcontar.com', url: 'https://porcontar.com/' },
];
```

- [ ] **Step 4: Correr las pruebas y verificar que pasan**

Run: `npm test`
Expected: PASS, 38 pruebas en total.

- [ ] **Step 5: Commit**

```bash
git add js/config.js tests/config.test.mjs
git commit -m "Agrega el contenido del taller en un unico archivo de configuracion

Modulos, glosario, herramientas, consejos, descargas, reels y redes,
tomados de la recapitulacion que se entrego a WCS."
```

---

### Task 8: Generación del certificado en PDF

**Files:**
- Create: `js/certificado.js`
- Test: `tests/certificado.test.mjs`

**Interfaces:**
- Consumes: `TALLER` de `js/config.js`, el bundle `assets/generados/recursos.js`
- Produces: `formatearCedula(valor) → string`, `nombreParaMostrar(valor) → string`, `nombreArchivo(nombre) → string`, `construirCertificado(jsPDF, { nombre, cedula }, recursos) → doc`, `descargarCertificado({ nombre, cedula }) → Promise<void>` (solo navegador; carga jsPDF y los recursos bajo demanda).

- [ ] **Step 1: Escribir las pruebas**

Crear `tests/certificado.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jsPDF } from 'jspdf';
import { formatearCedula, nombreParaMostrar, nombreArchivo, construirCertificado } from '../js/certificado.js';
import * as recursos from '../assets/generados/recursos.js';

test('formatearCedula separa los miles con puntos', () => {
  assert.equal(formatearCedula('1032456789'), '1.032.456.789');
  assert.equal(formatearCedula('17953987'), '17.953.987');
  assert.equal(formatearCedula('1.032.456.789'), '1.032.456.789');
});

test('nombreParaMostrar deja los conectores en minúscula', () => {
  assert.equal(nombreParaMostrar('JAHEL GARCÍA DE LA HOZ'), 'Jahel García de la Hoz');
  assert.equal(nombreParaMostrar('maría del pilar aguirre'), 'María del Pilar Aguirre');
  assert.equal(nombreParaMostrar('  carlos   saavedra '), 'Carlos Saavedra');
});

test('nombreArchivo produce un nombre seguro para el sistema de archivos', () => {
  assert.equal(
    nombreArchivo('Jahel García de la Hoz'),
    'Certificado-IA-Learn-WCS-Jahel-Garcia-de-la-Hoz.pdf'
  );
  assert.equal(nombreArchivo('Ana Muñoz/Pérez'), 'Certificado-IA-Learn-WCS-Ana-Munoz-Perez.pdf');
});

test('construirCertificado arma un PDF A4 horizontal', () => {
  const doc = construirCertificado(jsPDF, { nombre: 'Carlos Andrés Ríos Franco', cedula: '1032456789' }, recursos);
  const bytes = new Uint8Array(doc.output('arraybuffer'));

  assert.equal(Buffer.from(bytes.slice(0, 5)).toString(), '%PDF-');
  assert.ok(bytes.length > 50000, 'el PDF debería traer las fuentes y los logos embebidos');

  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  assert.ok(Math.abs(ancho - 297) < 1, `ancho inesperado: ${ancho}`);
  assert.ok(Math.abs(alto - 210) < 1, `alto inesperado: ${alto}`);
});

test('el bloque de textos no invade el bloque de la firma', () => {
  const doc = construirCertificado(jsPDF, { nombre: 'María del Pilar Aguirre Hernández de la Torre', cedula: '52123456' }, recursos);
  assert.ok(doc.__finTextos <= 155, `los párrafos llegan hasta ${doc.__finTextos} mm y la firma empieza en 158`);
});

test('construirCertificado no revienta con un nombre muy corto', () => {
  const doc = construirCertificado(jsPDF, { nombre: 'Ana Ruiz', cedula: '123456' }, recursos);
  assert.ok(new Uint8Array(doc.output('arraybuffer')).length > 50000);
});
```

- [ ] **Step 2: Correr las pruebas y verificar que fallan**

Run: `npm test`
Expected: FAIL, no se resuelve `../js/certificado.js`.

- [ ] **Step 3: Implementar `js/certificado.js`**

```js
/**
 * Dibuja el certificado de participación.
 * Línea gráfica PorContar: el certificado lo emite PorContar Group S.A.S.
 * A4 horizontal, 297 x 210 mm. Las medidas están en milímetros.
 */
import { TALLER } from './config.js';

const AZUL = [43, 79, 232];
const NAVY = [17, 22, 42];
const AMARILLO = [255, 244, 1];
const GRIS = [91, 100, 121];
const VERDE = [30, 94, 78];

const ANCHO = 297;
const ALTO = 210;
const CENTRO = ANCHO / 2;
const CONECTORES = ['de', 'del', 'la', 'las', 'los', 'y'];

export function formatearCedula(valor) {
  const digitos = String(valor).replace(/\D/g, '');
  return digitos.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function nombreParaMostrar(valor) {
  return String(valor)
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es')
    .split(' ')
    .map((palabra) =>
      CONECTORES.includes(palabra) ? palabra : palabra.charAt(0).toLocaleUpperCase('es') + palabra.slice(1)
    )
    .join(' ');
}

export function nombreArchivo(nombre) {
  const limpio = nombreParaMostrar(nombre)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ /g, '-');
  return `Certificado-IA-Learn-WCS-${limpio}.pdf`;
}

function centrar(doc, texto, y) {
  doc.text(texto, CENTRO, y, { align: 'center' });
}

export function construirCertificado(jsPDF, datos, recursos) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.addFileToVFS('Poppins-Regular.ttf', recursos.POPPINS_REGULAR);
  doc.addFont('Poppins-Regular.ttf', 'Poppins', 'normal');
  doc.addFileToVFS('Poppins-Bold.ttf', recursos.POPPINS_BOLD);
  doc.addFont('Poppins-Bold.ttf', 'Poppins', 'bold');

  // Bandas y marco
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, ANCHO, 10, 'F');
  doc.setFillColor(...VERDE);
  doc.rect(0, ALTO - 6, ANCHO, 6, 'F');
  doc.setDrawColor(...AZUL);
  doc.setLineWidth(0.5);
  doc.rect(10, 14, ANCHO - 20, 182);

  // Logos
  doc.addImage(recursos.LOGO_PORCONTAR, 'PNG', 22, 22, 42, 26.5);
  doc.addImage(recursos.LOGO_WCS, 'PNG', ANCHO - 47, 22, 25, 25.2);

  // Título
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(34);
  doc.setTextColor(...NAVY);
  centrar(doc, 'CERTIFICADO', 62);

  doc.setFont('Poppins', 'normal');
  doc.setFontSize(15);
  doc.setTextColor(...AZUL);
  centrar(doc, 'DE PARTICIPACIÓN', 71);

  doc.setFillColor(...AMARILLO);
  doc.rect(CENTRO - 20, 74.5, 40, 1.8, 'F');

  doc.setFontSize(8.5);
  doc.setTextColor(...GRIS);
  centrar(doc, `${TALLER.emisor} · NIT ${TALLER.nit}`, 83);

  // Persona
  doc.setFontSize(10.5);
  centrar(doc, 'Por medio de la presente se deja constancia de que', 95);

  doc.setFont('Poppins', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...AZUL);
  centrar(doc, nombreParaMostrar(datos.nombre).toLocaleUpperCase('es'), 109);

  doc.setFont('Poppins', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...NAVY);
  centrar(doc, `C.C. ${formatearCedula(datos.cedula)}`, 117);

  // Cuerpo
  const parrafos = [
    `Participó en el taller "${TALLER.nombre}", realizado para ${TALLER.cliente} en modalidad ${TALLER.modalidad} el ${TALLER.fecha}, con una duración total de ${TALLER.duracion}.`,
    'Durante este espacio, los participantes fortalecieron su comprensión sobre los fundamentos de la inteligencia artificial, la ingeniería de prompts y de contexto, las herramientas aplicadas al entorno laboral y las prácticas de uso seguro y responsable de la IA en la organización.',
  ];

  doc.setFontSize(9.5);
  doc.setTextColor(...GRIS);
  let y = 128;
  for (const parrafo of parrafos) {
    const lineas = doc.splitTextToSize(parrafo, 215);
    for (const linea of lineas) {
      centrar(doc, linea, y);
      y += 5;
    }
    y += 3;
  }
  doc.__finTextos = y;

  // Firma
  doc.addImage(recursos.FIRMA, 'PNG', CENTRO - 18, 158, 36, 29);
  doc.setDrawColor(...GRIS);
  doc.setLineWidth(0.3);
  doc.line(CENTRO - 32, 186, CENTRO + 32, 186);

  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  centrar(doc, TALLER.firmante, 191);

  doc.setFont('Poppins', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRIS);
  centrar(doc, TALLER.cargoFirmante, 195.5);

  return doc;
}

/** Solo navegador: carga jsPDF y el bundle de recursos, y dispara la descarga. */
export async function descargarCertificado(datos) {
  if (!window.jspdf) {
    await new Promise((resolver, rechazar) => {
      const script = document.createElement('script');
      script.src = 'assets/vendor/jspdf.umd.min.js';
      script.onload = resolver;
      script.onerror = () => rechazar(new Error('No se pudo cargar el generador de PDF.'));
      document.head.appendChild(script);
    });
  }
  const recursos = await import('../assets/generados/recursos.js');
  const doc = construirCertificado(window.jspdf.jsPDF, datos, recursos);
  doc.save(nombreArchivo(datos.nombre));
}
```

- [ ] **Step 4: Correr las pruebas y verificar que pasan**

Run: `npm test`
Expected: PASS, 44 pruebas en total. Si la prueba del bloque de textos falla, bajar el tamaño del cuerpo a 9 pt o acortar el segundo párrafo: no mover el bloque de la firma.

- [ ] **Step 5: Generar un certificado de muestra y revisarlo a ojo**

Crear `tools/certificado-muestra.mjs`:

```js
import { writeFileSync } from 'node:fs';
import { jsPDF } from 'jspdf';
import { construirCertificado } from '../js/certificado.js';
import * as recursos from '../assets/generados/recursos.js';

const doc = construirCertificado(
  jsPDF,
  { nombre: process.argv[2] || 'Jahel García de la Hoz', cedula: process.argv[3] || '1032456789' },
  recursos
);
writeFileSync('muestra.pdf', Buffer.from(doc.output('arraybuffer')));
console.log('Escrito muestra.pdf');
```

Run: `node tools/certificado-muestra.mjs "María del Pilar Aguirre" 52123456`
Expected: abre `muestra.pdf` y se ve: tipografía Poppins (no Helvetica), logos nítidos, firma sin recuadro blanco, nada encimado. Agregar `muestra.pdf` a `.gitignore`.

- [ ] **Step 6: Commit**

```bash
git add js/certificado.js tests/certificado.test.mjs tools/certificado-muestra.mjs .gitignore
git commit -m "Genera el certificado en PDF con jsPDF

A4 horizontal en linea grafica PorContar, con Poppins embebida, los dos
logos y la firma. Incluye un script para revisar una muestra a ojo."
```

---

### Task 9: Sistema de diseño, encabezado y sección del certificado

Primera mitad de la landing: los estilos base y las dos secciones que van arriba de todo.

**Files:**
- Create: `index.html`
- Create: `css/styles.css`
- Create: `tools/servidor.mjs`
- Test: `tests/landing.test.mjs`

**Interfaces:**
- Consumes: `js/config.js`
- Produces: el `index.html` con los `id` de sección `hero`, `certificado`, `gracias`, `modulos`, `prompt`, `glosario`, `herramientas`, `consejos`, `regalos`, `instagram` y el `<footer>`. El formulario tiene `id="formulario-certificado"` con campos `nombre`, `cedula`, `correo`, `autoriza` y un contenedor de mensajes `id="estado-certificado"`.

- [ ] **Step 1: Escribir las pruebas**

Crear `tests/landing.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('css/styles.css', 'utf8');

test('la landing declara todas las secciones en el orden acordado', () => {
  const orden = ['hero', 'certificado', 'gracias', 'modulos', 'prompt', 'glosario', 'herramientas', 'consejos', 'regalos', 'instagram'];
  let posicion = -1;
  for (const id of orden) {
    const nueva = html.indexOf(`id="${id}"`);
    assert.ok(nueva > -1, `falta la sección ${id}`);
    assert.ok(nueva > posicion, `la sección ${id} está fuera de orden`);
    posicion = nueva;
  }
});

test('el formulario del certificado trae los cuatro campos y el aviso de datos', () => {
  assert.match(html, /id="formulario-certificado"/);
  for (const campo of ['name="nombre"', 'name="cedula"', 'name="correo"', 'name="autoriza"']) {
    assert.ok(html.includes(campo), `falta el campo ${campo}`);
  }
  assert.match(html, /id="estado-certificado"/);
  assert.match(html, /tratamiento de (mis )?datos/i);
});

test('la paleta acordada está declarada como variables CSS', () => {
  const colores = ['#F4EFE4', '#FBF8F2', '#14432F', '#1E5E4E', '#2F9C8B', '#2E7BA6', '#DCD3C2', '#11162A', '#2B4FE8', '#FFF401'];
  for (const color of colores) {
    assert.ok(css.toUpperCase().includes(color), `falta el color ${color} en styles.css`);
  }
});

test('la página carga las tipografías de la marca', () => {
  assert.match(html, /fonts\.googleapis\.com/);
  assert.match(html, /Poppins/);
  assert.match(html, /Hanken\+Grotesk/);
});

test('la página declara idioma español y viewport responsive', () => {
  assert.match(html, /<html lang="es">/);
  assert.match(html, /name="viewport"[^>]+width=device-width/);
});
```

- [ ] **Step 2: Correr las pruebas y verificar que fallan**

Run: `npm test`
Expected: FAIL, `ENOENT` sobre `index.html`.

- [ ] **Step 3: Crear `css/styles.css` con el sistema de diseño**

```css
/* Memorias IA Learn WCS. Línea editorial WCS Colombia; PorContar entra como acento. */

:root {
  --marfil: #F4EFE4;
  --blanco-calido: #FBF8F2;
  --verde-bosque: #14432F;
  --verde-petroleo: #1E5E4E;
  --teal: #2F9C8B;
  --azul-agua: #2E7BA6;
  --arena: #DCD3C2;
  --texto: #11162A;
  --azul-porcontar: #2B4FE8;
  --amarillo-porcontar: #FFF401;

  --display: "Poppins", system-ui, sans-serif;
  --cuerpo: "Hanken Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif;

  --ancho: 1120px;
  --radio: 18px;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--marfil);
  color: var(--texto);
  font-family: var(--cuerpo);
  font-size: 17px;
  line-height: 1.6;
}

.contenedor {
  width: min(100% - 2.5rem, var(--ancho));
  margin-inline: auto;
}

section { padding: 5rem 0; }

.seccion-oscura {
  background: var(--verde-bosque);
  color: var(--blanco-calido);
}

.antetitulo {
  font-family: var(--display);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--verde-petroleo);
  margin: 0 0 0.6rem;
}

.seccion-oscura .antetitulo { color: var(--teal); }

h1, h2, h3 { font-family: var(--display); line-height: 1.15; margin: 0 0 1rem; }
h1 { font-size: clamp(2.4rem, 5.5vw, 4rem); font-weight: 700; }
h2 { font-size: clamp(1.8rem, 3.4vw, 2.7rem); font-weight: 700; text-transform: uppercase; letter-spacing: -0.01em; }
h3 { font-size: 1.15rem; font-weight: 600; }

a { color: var(--azul-porcontar); }
.seccion-oscura a { color: var(--teal); }

.boton {
  display: inline-block;
  padding: 0.95rem 2rem;
  border: 0;
  border-radius: 999px;
  background: var(--azul-porcontar);
  color: #fff;
  font-family: var(--display);
  font-weight: 600;
  font-size: 1rem;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
}
.boton:hover { transform: translateY(-2px); background: #1B34B0; }
.boton:disabled { opacity: 0.6; cursor: progress; transform: none; }

.boton-secundario {
  background: transparent;
  color: var(--blanco-calido);
  border: 1.5px solid rgba(251, 248, 242, 0.4);
}

/* Hero */
.hero {
  background: var(--verde-bosque);
  color: var(--blanco-calido);
  padding: 4rem 0 5rem;
}
.hero__marcas {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 3.5rem;
}
.hero__marcas img { height: 46px; width: auto; }
.hero__separador { color: rgba(251, 248, 242, 0.45); font-size: 1.5rem; }
.hero__badge {
  display: inline-block;
  background: var(--amarillo-porcontar);
  color: var(--texto);
  font-family: var(--display);
  font-weight: 600;
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 0.45rem 1.1rem;
  border-radius: 999px;
  margin-bottom: 1.5rem;
}
.hero h1 { max-width: 16ch; }
.hero h1 em { font-style: normal; color: var(--amarillo-porcontar); }
.hero__datos {
  font-family: var(--display);
  font-weight: 500;
  color: rgba(251, 248, 242, 0.75);
  margin: 1.5rem 0 2.5rem;
}

/* Formulario del certificado */
.certificado { background: var(--verde-petroleo); color: var(--blanco-calido); }
.tarjeta-formulario {
  background: var(--blanco-calido);
  color: var(--texto);
  border-radius: var(--radio);
  padding: 2.5rem;
  max-width: 620px;
  box-shadow: 0 24px 60px rgba(20, 67, 47, 0.28);
}
.campo { margin-bottom: 1.2rem; }
.campo label {
  display: block;
  font-family: var(--display);
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 0.35rem;
}
.campo input[type="text"],
.campo input[type="email"] {
  width: 100%;
  padding: 0.85rem 1rem;
  border: 1.5px solid var(--arena);
  border-radius: 12px;
  background: #fff;
  font-family: var(--cuerpo);
  font-size: 1rem;
}
.campo input:focus {
  outline: 2px solid var(--azul-porcontar);
  outline-offset: 1px;
  border-color: transparent;
}
.campo-autorizacion {
  display: flex;
  gap: 0.7rem;
  align-items: flex-start;
  font-size: 0.9rem;
  color: #5b6479;
  margin: 1.5rem 0;
}
.estado { margin-top: 1.2rem; padding: 1rem 1.2rem; border-radius: 12px; display: none; }
.estado[data-visible="true"] { display: block; }
.estado--ok { background: #e7f5ef; color: #14432F; }
.estado--aviso { background: #fdf3d8; color: #6b5300; }
.estado--error { background: #fdeaea; color: #8b1d1d; }

/* Rejillas */
.rejilla { display: grid; gap: 1.5rem; }
.rejilla--2 { grid-template-columns: repeat(2, 1fr); }
.rejilla--3 { grid-template-columns: repeat(3, 1fr); }

.tarjeta {
  background: var(--blanco-calido);
  border: 1px solid var(--arena);
  border-radius: var(--radio);
  padding: 1.8rem;
}
.seccion-oscura .tarjeta {
  background: rgba(251, 248, 242, 0.06);
  border-color: rgba(251, 248, 242, 0.16);
}

.cifras { display: flex; gap: 3rem; flex-wrap: wrap; margin-top: 2.5rem; }
.cifra strong {
  display: block;
  font-family: var(--display);
  font-size: 3rem;
  font-weight: 700;
  line-height: 1;
  color: var(--verde-petroleo);
}
.cifra span { font-size: 0.95rem; color: #5b6479; }

.etiqueta {
  display: inline-block;
  background: var(--arena);
  color: var(--verde-bosque);
  font-family: var(--display);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.3rem 0.8rem;
  border-radius: 999px;
  margin: 0.3rem 0.3rem 0 0;
}

.glosario dt { font-family: var(--display); font-weight: 600; margin-top: 1.2rem; }
.glosario dd { margin: 0.2rem 0 0; color: #5b6479; }

.descarga {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1.2rem;
}

.reels { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
.reels blockquote { margin: 0 auto; }

footer { background: var(--verde-bosque); color: var(--blanco-calido); padding: 4rem 0 3rem; }
footer a { color: var(--blanco-calido); text-decoration: none; }
footer a:hover { text-decoration: underline; }
.footer__redes { display: flex; flex-wrap: wrap; gap: 1.5rem; margin: 2rem 0; }

.boton-flotante {
  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  z-index: 20;
  box-shadow: 0 12px 30px rgba(43, 79, 232, 0.35);
}

@media (max-width: 780px) {
  section { padding: 3.5rem 0; }
  .rejilla--2, .rejilla--3 { grid-template-columns: 1fr; }
  .tarjeta-formulario { padding: 1.6rem; }
  .cifras { gap: 1.8rem; }
  .hero__marcas img { height: 34px; }
}
```

- [ ] **Step 4: Crear `index.html` con el encabezado y la sección del certificado**

El resto de las secciones se agregan en la Task 10; por ahora quedan como contenedores vacíos con su `id` para que la prueba de orden pase.

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Memorias · IA Learn para la Productividad · WCS Colombia</title>
<meta name="description" content="Memorias del taller IA Learn para la Productividad dictado por PorContar para WCS Colombia, y descarga del certificado de participación.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/styles.css">
</head>
<body>

<header class="hero" id="hero">
  <div class="contenedor">
    <div class="hero__marcas">
      <img src="assets/generados/logo-porcontar-blanco.png" alt="PorContar">
      <span class="hero__separador">×</span>
      <img src="assets/generados/logo-wcs.png" alt="WCS Colombia">
    </div>
    <p class="hero__badge">Memorias del taller</p>
    <h1>IA Learn para la <em>productividad</em></h1>
    <p class="hero__datos">27 de julio de 2026 · 4 horas · Virtual en vivo · Ximena Villalobos y Luisa Navarro</p>
    <a class="boton" href="#certificado">Descargar mi certificado</a>
    <a class="boton boton-secundario" href="#modulos">Ver las memorias</a>
  </div>
</header>

<main>
  <section class="certificado" id="certificado">
    <div class="contenedor">
      <p class="antetitulo" style="color: var(--amarillo-porcontar)">Tu certificado</p>
      <h2>Descarga tu certificado aquí</h2>
      <p>Escribe tu nombre completo como aparece en tu documento. Validamos que estés en la lista de asistentes y el certificado se descarga al instante.</p>

      <form class="tarjeta-formulario" id="formulario-certificado" novalidate>
        <div class="campo">
          <label for="nombre">Nombre completo</label>
          <input type="text" id="nombre" name="nombre" autocomplete="name" required placeholder="Como aparece en tu cédula">
        </div>
        <div class="campo">
          <label for="cedula">Cédula</label>
          <input type="text" id="cedula" name="cedula" inputmode="numeric" required placeholder="Solo números">
        </div>
        <div class="campo">
          <label for="correo">Correo electrónico</label>
          <input type="email" id="correo" name="correo" autocomplete="email" required placeholder="tucorreo@wcs.org">
        </div>
        <label class="campo-autorizacion">
          <input type="checkbox" name="autoriza" id="autoriza" required>
          <span>Autorizo a PorContar Group S.A.S. el tratamiento de mis datos (nombre, cédula y correo) para emitir mi certificado y llevar el control de entrega. Puedo pedir su eliminación escribiendo a <a href="mailto:info.porcontar@gmail.com">info.porcontar@gmail.com</a>.</span>
        </label>
        <button class="boton" type="submit" id="boton-generar">Generar mi certificado</button>
        <div class="estado" id="estado-certificado" role="status" aria-live="polite"></div>
      </form>
    </div>
  </section>

  <section id="gracias"></section>
  <section id="modulos"></section>
  <section id="prompt"></section>
  <section id="glosario"></section>
  <section id="herramientas"></section>
  <section id="consejos"></section>
  <section id="regalos"></section>
  <section id="instagram"></section>
</main>

<footer></footer>

<a class="boton boton-flotante" href="#certificado">Mi certificado</a>

<script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 5: Crear `tools/servidor.mjs` para probar en local**

Los módulos ES no funcionan abriendo el archivo con doble clic: hace falta servirlo por HTTP.

```js
/** Servidor estático mínimo para revisar la página en local. npm run servir */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.ttf': 'font/ttf',
};

createServer(async (peticion, respuesta) => {
  const ruta = decodeURIComponent(peticion.url.split('?')[0]);
  const archivo = join(process.cwd(), normalize(ruta === '/' ? '/index.html' : ruta));

  try {
    const contenido = await readFile(archivo);
    respuesta.writeHead(200, { 'Content-Type': TIPOS[extname(archivo)] || 'application/octet-stream' });
    respuesta.end(contenido);
  } catch {
    respuesta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    respuesta.end('No encontrado');
  }
}).listen(4173, () => console.log('http://localhost:4173'));
```

- [ ] **Step 6: Correr las pruebas y verificar que pasan**

Run: `npm test`
Expected: PASS, 49 pruebas en total.

- [ ] **Step 7: Revisión visual**

Run: `npm run servir` y abrir `http://localhost:4173`
Expected: el hero se ve verde bosque con los dos logos en blanco y el badge amarillo; la sección del certificado muestra la tarjeta clara sobre verde petróleo; en una ventana angosta todo cae a una columna. El formulario todavía no hace nada.

- [ ] **Step 8: Commit**

```bash
git add index.html css/styles.css tools/servidor.mjs tests/landing.test.mjs
git commit -m "Agrega el sistema de diseno, el hero y la seccion del certificado

Linea editorial WCS con el azul y el amarillo de PorContar como acento.
Incluye un servidor estatico minimo para revisar en local."
```

---

### Task 10: Secciones de contenido de las memorias

**Files:**
- Modify: `index.html` (reemplazar las secciones vacías `gracias`, `modulos`, `prompt`, `glosario`, `herramientas`, `consejos`, `regalos`, `instagram` y el `<footer>`)
- Create: `js/memorias.js`
- Test: `tests/memorias.test.mjs`

**Interfaces:**
- Consumes: `MODULOS`, `ELEMENTOS_PROMPT`, `GLOSARIO`, `HERRAMIENTAS`, `CONSEJOS`, `DESCARGAS`, `REELS`, `REDES`, `EVALUACION` de `js/config.js`
- Produces: `pintarMemorias(documento) → void`, más las funciones puras `plantillaModulo(modulo) → string`, `plantillaDescarga(descarga) → string`, `plantillaReel(url) → string`. Todas devuelven HTML como texto.

- [ ] **Step 1: Escribir las pruebas**

Crear `tests/memorias.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { plantillaModulo, plantillaDescarga, plantillaReel } from '../js/memorias.js';
import { MODULOS, DESCARGAS, REELS } from '../js/config.js';

test('plantillaModulo arma el bloque con número, título, texto y etiquetas', () => {
  const html = plantillaModulo(MODULOS[0]);
  assert.match(html, /Fundamentos/);
  assert.match(html, /IA generativa/);
  assert.match(html, /class="etiqueta"/);
});

test('plantillaDescarga enlaza al PDF y fuerza la descarga', () => {
  const html = plantillaDescarga(DESCARGAS[0]);
  assert.match(html, /assets\/descargas\/kit-prompts-wcs\.pdf/);
  assert.match(html, /download/);
});

test('plantillaReel produce el blockquote que espera el script de Instagram', () => {
  const html = plantillaReel(REELS[0]);
  assert.match(html, /class="instagram-media"/);
  assert.match(html, /data-instgrm-permalink="https:\/\/www\.instagram\.com\/por\.contar\/reel\/Dad_uTjOEpe\/"/);
  assert.match(html, /Ver este reel en Instagram/);
});

test('el HTML deja los contenedores que va a llenar el script', () => {
  const html = readFileSync('index.html', 'utf8');
  for (const id of ['lista-modulos', 'lista-prompt', 'lista-glosario', 'lista-herramientas', 'lista-consejos', 'lista-descargas', 'lista-reels', 'lista-redes', 'lista-cifras']) {
    assert.ok(html.includes(`id="${id}"`), `falta el contenedor ${id}`);
  }
});

test('el pie enlaza a Instagram y al correo de PorContar', () => {
  const html = readFileSync('index.html', 'utf8');
  assert.match(html, /instagram\.com\/por\.contar/);
  assert.match(html, /info\.porcontar@gmail\.com/);
});
```

- [ ] **Step 2: Correr las pruebas y verificar que fallan**

Run: `npm test`
Expected: FAIL, no se resuelve `../js/memorias.js`.

- [ ] **Step 3: Implementar `js/memorias.js`**

```js
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

export function plantillaReel(url) {
  return `
    <blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14">
      <a href="${url}" target="_blank" rel="noopener">Ver este reel en Instagram</a>
    </blockquote>`;
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
  pintar(documento, 'lista-consejos', CONSEJOS.map((c) => `<li>${c}</li>`).join(''));
  pintar(documento, 'lista-descargas', DESCARGAS.map(plantillaDescarga).join(''));
  pintar(documento, 'lista-reels', REELS.map(plantillaReel).join(''));
  pintar(documento, 'lista-redes', REDES.map((r) => `<a href="${r.url}" target="_blank" rel="noopener">${r.nombre} · ${r.usuario}</a>`).join(''));

  if (window.instgrm) window.instgrm.Embeds.process();
}
```

- [ ] **Step 4: Reemplazar las secciones vacías en `index.html`**

Sustituir el bloque que va desde `<section id="gracias"></section>` hasta `<footer></footer>` por:

```html
  <section id="gracias">
    <div class="contenedor">
      <p class="antetitulo">Gracias</p>
      <h2>Gracias por estas cuatro horas</h2>
      <p style="max-width: 62ch">Al equipo de WCS Colombia: gracias por la disposición, por las preguntas incómodas sobre gobernanza de datos y por traer tareas reales al taller. Esto es lo que trabajamos, para que quede a la mano cuando lo necesiten.</p>
      <div class="cifras" id="lista-cifras"></div>
    </div>
  </section>

  <section class="seccion-oscura" id="modulos">
    <div class="contenedor">
      <p class="antetitulo">Contenido del taller</p>
      <h2>Esto fue lo que trabajamos</h2>
      <div class="rejilla rejilla--2" id="lista-modulos" style="margin-top: 2.5rem"></div>
    </div>
  </section>

  <section id="prompt">
    <div class="contenedor">
      <p class="antetitulo">Referencia rápida</p>
      <h2>Los seis elementos de un buen prompt</h2>
      <p>La clave no es escribirle mucho a la IA: es darle las piezas correctas para que entienda qué necesitas.</p>
      <div class="rejilla rejilla--3" id="lista-prompt" style="margin-top: 2.5rem"></div>
    </div>
  </section>

  <section id="glosario">
    <div class="contenedor">
      <p class="antetitulo">Glosario</p>
      <h2>Vocabulario del taller</h2>
      <dl class="glosario" id="lista-glosario"></dl>
    </div>
  </section>

  <section class="seccion-oscura" id="herramientas">
    <div class="contenedor">
      <p class="antetitulo">Panorama</p>
      <h2>El mapa de herramientas</h2>
      <p>No todas resuelven lo mismo. Así se agrupan las que vas a encontrar en tu día a día.</p>
      <div class="rejilla rejilla--3" id="lista-herramientas" style="margin-top: 2.5rem"></div>
    </div>
  </section>

  <section id="consejos">
    <div class="contenedor">
      <p class="antetitulo">Para seguir</p>
      <h2>Empieza a usarla mañana</h2>
      <p style="max-width: 62ch">Elige una sola tarea repetitiva de tu semana y pruébala con lo que vimos: rol, contexto, formato de salida y ejemplos. La constancia importa más que encontrar la herramienta perfecta.</p>
      <ul id="lista-consejos" style="max-width: 62ch"></ul>
    </div>
  </section>

  <section id="regalos">
    <div class="contenedor">
      <p class="antetitulo">Guía de recursos</p>
      <h2>Tus regalos</h2>
      <p>Los prompts que quedaron listos para tu trabajo en WCS, y el resumen del taller para guardar.</p>
      <div class="rejilla rejilla--3" id="lista-descargas" style="margin-top: 2.5rem"></div>
    </div>
  </section>

  <section id="instagram">
    <div class="contenedor">
      <p class="antetitulo">Seguí aprendiendo</p>
      <h2>Míranos en Instagram</h2>
      <p>Publicamos casos, prompts y herramientas cada semana en <a href="https://www.instagram.com/por.contar/" target="_blank" rel="noopener">@por.contar</a>.</p>
      <div class="reels" id="lista-reels" style="margin-top: 2.5rem"></div>
    </div>
  </section>
</main>

<footer>
  <div class="contenedor">
    <h2>PorContar</h2>
    <p>Ximena Villalobos · Luisa Navarro — Facilitadoras</p>
    <div class="footer__redes" id="lista-redes"></div>
    <p style="opacity: 0.6; font-size: 0.85rem">Taller realizado para WCS Colombia · 27 de julio de 2026</p>
  </div>
</footer>
```

Agregar el script de Instagram justo antes de `</body>`, después del módulo de la app:

```html
<script async src="https://www.instagram.com/embed.js"></script>
```

- [ ] **Step 5: Correr las pruebas y verificar que pasan**

Run: `npm test`
Expected: PASS, 54 pruebas en total.

- [ ] **Step 6: Revisión visual**

Run: `npm run servir`
Expected: las secciones todavía aparecen vacías porque `pintarMemorias` se llama desde `js/app.js`, que se escribe en la Task 11. Verificar únicamente que los títulos y los fondos alternados se ven bien.

- [ ] **Step 7: Commit**

```bash
git add index.html js/memorias.js tests/memorias.test.mjs
git commit -m "Agrega las secciones de contenido de las memorias

Modulos, seis elementos del prompt, glosario, mapa de herramientas,
consejos, descargas, reels y pie, pintados desde config.js."
```

---

### Task 11: Formulario, llamada al backend y descarga

**Files:**
- Create: `js/app.js`
- Test: `tests/app.test.mjs`

**Interfaces:**
- Consumes: `BACKEND` de `js/config.js`, `descargarCertificado` de `js/certificado.js`, `pintarMemorias` de `js/memorias.js`
- Produces: `leerFormulario(formData) → { nombre, cedula, correo, autoriza }`, `validarEnCliente(datos) → string|null`, `enviarSolicitud(datos, opciones) → Promise<respuesta>` con reintentos, `MENSAJES` con las variantes de texto por estado.

- [ ] **Step 1: Escribir las pruebas**

Crear `tests/app.test.mjs`:

```js
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

test('hay un mensaje para cada estado que puede devolver el backend', () => {
  for (const estado of ['aprobado', 'repetida', 'pendiente', 'error']) {
    assert.ok(MENSAJES[estado], `falta el mensaje de ${estado}`);
  }
});
```

- [ ] **Step 2: Correr las pruebas y verificar que fallan**

Run: `npm test`
Expected: FAIL, no se resuelve `../js/app.js`.

- [ ] **Step 3: Implementar `js/app.js`**

`leerFormulario` recibe cualquier cosa con `.get(clave)`, así el test puede pasarle un `Map` y el navegador un `FormData`.

```js
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
  let ultimoError;

  for (let intento = 1; intento <= 3; intento++) {
    try {
      const respuesta = await peticion(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(datos),
      });
      if (!respuesta.ok) throw new Error(`El servidor respondió ${respuesta.status}`);
      return await respuesta.json();
    } catch (error) {
      ultimoError = error;
      if (intento < 3) await dormir(esperaMs * intento);
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
        await descargarCertificado(datos);
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
```

- [ ] **Step 4: Correr las pruebas y verificar que pasan**

Run: `npm test`
Expected: PASS, 60 pruebas en total.

- [ ] **Step 5: Commit**

```bash
git add js/app.js tests/app.test.mjs
git commit -m "Conecta el formulario con el backend y la descarga del PDF

Valida en el cliente con las mismas reglas del servidor, reintenta tres
veces y solo genera el PDF cuando la descarga quedo registrada."
```

---

### Task 12: Verificación end-to-end en local

Antes de tocar Google, comprobar que el circuito completo funciona contra un backend simulado.

**Files:**
- Create: `tools/backend-falso.mjs`
- Modify: `README.md` (crear)

**Interfaces:**
- Consumes: todo lo anterior
- Produces: un servidor en `http://localhost:4174` que imita las respuestas del Web App

- [ ] **Step 1: Crear `tools/backend-falso.mjs`**

```js
/**
 * Imita el Web App de Apps Script para probar la página sin desplegar nada.
 * Aprueba a quien tenga "Prueba" en el nombre; al resto lo deja pendiente.
 */
import { createServer } from 'node:http';

createServer((peticion, respuesta) => {
  respuesta.setHeader('Access-Control-Allow-Origin', '*');

  let cuerpo = '';
  peticion.on('data', (trozo) => (cuerpo += trozo));
  peticion.on('end', () => {
    let salida = { estado: 'error', mensaje: 'Cuerpo inválido' };
    try {
      const datos = JSON.parse(cuerpo);
      salida = /prueba/i.test(datos.nombre)
        ? { estado: 'aprobado', tipo: 'primera' }
        : { estado: 'pendiente' };
      console.log(datos.nombre, '→', salida.estado);
    } catch {}
    respuesta.writeHead(200, { 'Content-Type': 'application/json' });
    respuesta.end(JSON.stringify(salida));
  });
}).listen(4174, () => console.log('Backend falso en http://localhost:4174'));
```

- [ ] **Step 2: Apuntar la configuración al backend falso**

En `js/config.js`, cambiar temporalmente `BACKEND.url` a `'http://localhost:4174'`.

- [ ] **Step 3: Levantar ambos servidores y recorrer la página**

Run en una terminal: `node tools/backend-falso.mjs`
Run en otra: `npm run servir`

Abrir `http://localhost:4173` y verificar, uno por uno:

- [ ] Las once secciones tienen contenido: cinco módulos, seis elementos, doce términos del glosario, tres grupos de herramientas, cuatro consejos, tres descargas y cinco reels.
- [ ] Los cinco reels de Instagram cargan el video.
- [ ] Enviar el formulario vacío muestra el error de nombre sin llamar al servidor.
- [ ] Con cédula `12` aparece el error de cédula.
- [ ] Sin marcar la autorización aparece el error correspondiente.
- [ ] Con nombre "Persona Prueba", cédula `1032456789` y un correo válido: el botón pasa a "Validando…", se descarga el PDF y aparece el mensaje verde.
- [ ] Abrir el PDF descargado: tipografía Poppins, los dos logos, la firma limpia, nombre y cédula correctos.
- [ ] Con nombre "Alguien Ajeno" aparece el mensaje amarillo de pendiente y no se descarga nada.
- [ ] Apagar el backend falso y enviar de nuevo: tras unos segundos aparece el mensaje rojo y no se descarga ningún PDF.
- [ ] En una ventana de 380 px de ancho todo queda en una columna y el botón flotante no tapa el formulario.

- [ ] **Step 4: Devolver la configuración a su valor de despliegue**

En `js/config.js`, restaurar `BACKEND.url` a `'REEMPLAZAR_CON_LA_URL_DEL_WEB_APP'`.

- [ ] **Step 5: Escribir el `README.md`**

```markdown
# Memorias IA Learn · WCS Colombia

Página de memorias del taller *IA Learn: Inteligencia Artificial para la Productividad*,
dictado por PorContar para WCS Colombia el 27 de julio de 2026, con generación del
certificado de participación en PDF.

## Cómo correrlo en local

```bash
npm install
npm run assets     # prepara logos y firma
npm run fuentes    # descarga Poppins y jsPDF
npm test           # 60 pruebas
npm run servir     # http://localhost:4173
```

Para probar el formulario sin Google: `node tools/backend-falso.mjs` y apuntar
`BACKEND.url` en `js/config.js` a `http://localhost:4174`.

## Estructura

- `index.html`, `css/`, `js/` — la página
- `js/config.js` — todo el contenido editable
- `js/certificado.js` — el diseño del PDF
- `apps-script/` — el backend que se pega en el editor de Apps Script
- `tools/` — scripts de preparación y servidores de desarrollo

## Cambiar el taller o el cliente

Editar `js/config.js` y reemplazar `assets/logo-porcontar.png` y `assets/logo-wcs.png`.
Después correr `npm run assets && npm run fuentes`.
```

- [ ] **Step 6: Commit**

```bash
git add tools/backend-falso.mjs README.md js/config.js
git commit -m "Agrega el backend falso y el README

Permite recorrer el circuito completo en local, sin desplegar nada en
Google."
```

---

### Task 13: Publicación

**Files:**
- Modify: `js/config.js` (URL real del Web App)
- Create: `.nojekyll`

**Interfaces:**
- Consumes: todo lo anterior
- Produces: el Sheet operativo, el Web App desplegado y la página publicada en GitHub Pages

- [ ] **Step 1: Crear el Google Sheet**

Crear una hoja de cálculo llamada `Certificados IA Learn WCS 2026` con tres pestañas y estas cabeceras exactas en la fila 1:

- `Asistentes`: `Nombre`, `Origen`, `Fecha de alta`
- `Descargas`: `Marca temporal`, `Nombre ingresado`, `Nombre en lista`, `Cédula`, `Correo`, `Tipo`
- `Solicitudes`: `Marca temporal`, `Nombre`, `Cédula`, `Correo`, `Estado`

En `Descargas` y `Solicitudes`, seleccionar la columna de la cédula y aplicar Formato → Número → Texto sin formato, para que Sheets no la convierta en número.

- [ ] **Step 2: Sembrar la hoja `Asistentes`**

Pegar en `A2` los nombres de la encuesta de satisfacción del 27 de julio, consolidando los duplicados. Son 40 nombres: `Carlos Saavedra` aparece dos veces en la encuesta y va una sola vez; `Dayana Reyes` y `Dayana Esther Reyes Martiena` son la misma persona y va el nombre completo. En la columna `Origen` poner `Encuesta`.

- [ ] **Step 3: Crear el proyecto de Apps Script**

Desde el Sheet: Extensiones → Apps Script. Crear cuatro archivos con el contenido exacto de `apps-script/`: `Matcher.gs`, `Logica.gs`, `Codigo.gs` y `Menu.gs`. En `Codigo.gs`, reemplazar `ID_HOJA` por el id que aparece en la URL del Sheet, entre `/d/` y `/edit`.

- [ ] **Step 4: Desplegar el Web App**

Implementar → Nueva implementación → Aplicación web. Ejecutar como: yo. Con acceso a: cualquier usuario. Copiar la URL que termina en `/exec`.

Aceptar los permisos de Sheets y Gmail cuando los pida.

- [ ] **Step 5: Probar el Web App desde la terminal**

```bash
curl -s -L -X POST "PEGAR_LA_URL_DEL_WEB_APP" \
  -H "Content-Type: text/plain;charset=utf-8" \
  -d '{"nombre":"Carlos Saavedra","cedula":"1032456789","correo":"prueba@wcs.org","autoriza":true}'
```

Expected: `{"estado":"aprobado","tipo":"primera"}` y una fila nueva en `Descargas`. Repetir con un nombre inventado: debe responder `{"estado":"pendiente"}`, escribir en `Solicitudes` y llegar el correo a `info.porcontar@gmail.com`.

Borrar las filas de prueba del Sheet al terminar.

- [ ] **Step 6: Poner la URL real en la configuración**

En `js/config.js`, reemplazar `BACKEND.url` por la URL del Web App.

- [ ] **Step 7: Crear `.nojekyll`**

Archivo vacío en la raíz. Sin él, GitHub Pages ignora los directorios que empiezan con guion bajo y puede procesar los archivos de más.

```bash
touch .nojekyll
```

- [ ] **Step 8: Publicar en GitHub Pages**

```bash
git add js/config.js .nojekyll
git commit -m "Apunta la pagina al Web App desplegado"
git branch -M main
gh repo create wcs-memorias --public --source=. --remote=origin --push
gh api -X POST repos/luisa-navarro92/wcs-memorias/pages -f "source[branch]=main" -f "source[path]=/"
```

Expected: `gh` devuelve la configuración de Pages. La URL queda en `https://luisa-navarro92.github.io/wcs-memorias/`. Tarda uno o dos minutos en estar arriba.

- [ ] **Step 9: Verificación en producción**

Abrir la URL publicada y repetir el recorrido de la Task 12, esta vez contra el backend real:

- [ ] Con un nombre que sí está en `Asistentes`: descarga el PDF y aparece la fila en `Descargas`.
- [ ] Repetir con la misma cédula: descarga otra vez y la fila queda marcada `Repetida`.
- [ ] Con un nombre que no está: mensaje amarillo, fila en `Solicitudes` y correo recibido.
- [ ] Desde el Sheet, seleccionar esa fila y usar Certificados → Aprobar seleccionados: el nombre aparece en `Asistentes`, la fila queda `Aprobado` y llega el correo a la persona.
- [ ] Volver a la página con ese nombre: ahora sí descarga el certificado.
- [ ] Borrar del Sheet todas las filas de prueba.
- [ ] Abrir la página desde un celular y revisar que los reels y el formulario funcionen.

- [ ] **Step 10: Commit final**

```bash
git add -A
git commit -m "Publica las memorias del taller IA Learn para WCS Colombia"
git push
```

---

## Pendientes fuera del plan

Dos cosas dependen de terceros y no bloquean la implementación:

- La autorización de Mónica Lozano para usar el logo de WCS en el certificado. Si no llega, quitar `LOGO_WCS` del certificado en `js/certificado.js` y dejarlo solo en la landing.
- La versión del logo de WCS con el texto en oscuro. Si no llega, el logo se ve bien igual sobre el fondo verde de la landing; en el certificado, sobre blanco, el texto "WCS" queda gris claro.
