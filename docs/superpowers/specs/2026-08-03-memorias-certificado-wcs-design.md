# Memorias del taller IA Learn WCS + generador de certificados

**Fecha:** 2026-08-03
**Cliente:** WCS Colombia (Wildlife Conservation Society) — contacto Mónica Lozano
**Emite:** PorContar Group S.A.S · NIT 901986736-1
**Taller:** IA Learn: Inteligencia Artificial para la Productividad · 27 de julio de 2026 · virtual en vivo · 4 horas

## Qué es

Una página web pública que funciona como memorias del taller y, dentro de ella, un generador
de certificados de participación. La persona escribe su nombre, su cédula y su correo; el
sistema valida que haya asistido, registra la descarga en un Google Sheet y el navegador
genera y descarga el PDF del certificado.

Sirve dos objetivos a la vez: que los participantes tengan a la mano lo que se vio en la
sesión, y que PorContar sepa quién descargó su certificado sin trabajo manual.

## Alcance

Incluye:

- Landing de memorias con el contenido del taller
- Formulario y generación del certificado en PDF
- Backend en Google Apps Script con registro en Google Sheets
- Flujo de aprobación manual para quien no aparezca en la lista de asistentes

No incluye:

- Página pública de verificación de certificados
- Envío automático del PDF por correo (el PDF se genera en el navegador de la persona)
- Panel de administración propio: la administración se hace en el Google Sheet

## Arquitectura

Sitio estático servido en GitHub Pages, más un Web App de Apps Script como único backend.
Mismo patrón que Prestige CRM y el dashboard de Alquería.

```
wcs-memorias/
  index.html                    Landing completa
  css/styles.css                Sistema de diseño
  js/config.js                  Todo lo editable: textos, links, reels, URL del backend
  js/app.js                     Formulario, llamada al backend, estados de la UI
  js/certificado.js             Generación del PDF
  assets/
    logo-porcontar.png
    logo-wcs.png
    firma-ximena.png
    fuentes/                    Poppins y Hanken Grotesk en base64 para jsPDF
    descargas/                  Los tres PDFs de regalo
  apps-script/
    Codigo.gs                   doPost, validación, registro
    Menu.gs                     Menú "Certificados" dentro del Sheet
    Pruebas.gs                  Casos de prueba del matcher
  docs/superpowers/specs/       Este documento
```

### Google Sheet: "Certificados IA Learn WCS 2026"

Tres hojas.

**`Asistentes`** — la lista contra la que se valida.

| Columna | Contenido |
| --- | --- |
| Nombre | Nombre tal como quedó en la encuesta |
| Origen | `Encuesta` o `Aprobado manual` |
| Fecha de alta | Cuándo entró a la lista |

Se siembra con los 42 nombres de la hoja de satisfacción del 27 de julio. Los nombres
duplicados (Carlos Saavedra aparece dos veces; Dayana Reyes y Dayana Esther Reyes Martiena
son la misma persona) se consolidan al sembrarla.

**`Descargas`** — una fila por certificado generado.

| Columna | Contenido |
| --- | --- |
| Marca temporal | Fecha y hora de la descarga |
| Nombre ingresado | Lo que la persona escribió |
| Nombre en lista | Con qué registro de `Asistentes` coincidió |
| Cédula | |
| Correo | |
| Tipo | `Primera descarga` o `Repetida` |

**`Solicitudes`** — quien no apareció en la lista.

| Columna | Contenido |
| --- | --- |
| Marca temporal | |
| Nombre | |
| Cédula | |
| Correo | |
| Estado | `Pendiente` o `Aprobado` |

### Por qué la validación vive en el servidor

Los 42 nombres no se embeben en el JavaScript. Si estuvieran en `config.js`, quedarían
visibles en el código fuente de una página pública: una lista de empleados de WCS con nombre
completo, expuesta. La validación ocurre dentro de Apps Script y el navegador solo recibe
`aprobado` o `pendiente`. En el propio taller el equipo de WCS levantó el tema de política
de datos, así que la decisión es coherente con lo que se les enseñó.

### Contrato del backend

Un solo endpoint, `doPost`, con el cuerpo en JSON.

Petición:

```json
{ "nombre": "Carlos Andrés Ríos Franco", "cedula": "1032456789", "correo": "crios@wcs.org" }
```

Respuestas posibles:

```json
{ "estado": "aprobado", "tipo": "primera" }
{ "estado": "aprobado", "tipo": "repetida" }
{ "estado": "pendiente" }
{ "estado": "error", "mensaje": "..." }
```

El `fetch` se envía con `Content-Type: text/plain` para evitar el preflight de CORS, que
Apps Script no responde bien. El cuerpo sigue siendo JSON y se parsea con `JSON.parse` dentro
del script.

Cuando la respuesta es `pendiente`, Apps Script escribe la fila en `Solicitudes` y manda un
correo a `info.porcontar@gmail.com` con los datos.

### Algoritmo de coincidencia

1. Normalizar ambos nombres: minúsculas, sin tildes ni diéresis, sin signos de puntuación,
   espacios colapsados.
2. Partir en tokens y descartar conectores (`de`, `del`, `la`, `las`, `los`, `y`).
3. Hay coincidencia si todos los tokens de un nombre aparecen en el otro, en cualquier
   dirección, y ambos nombres tienen al menos dos tokens. Un token aparece si es idéntico,
   si es una inicial de una sola letra y algún token del otro nombre empieza por esa letra,
   o si equivale a dos tokens seguidos del otro nombre escritos juntos.
4. Si coincide con más de un registro de `Asistentes`, gana la coincidencia exacta; si no hay
   ninguna exacta, se responde `pendiente` para que lo resuelva una persona.

Casos reales que debe resolver, tomados de la hoja:

| Ingresa | Está en la lista como | Resultado |
| --- | --- | --- |
| Dayana Reyes | Dayana Esther Reyes Martiena | Coincide |
| Sandra Gonzalez Watson | Sandra González | Coincide |
| HECTOR FABIO ORTIZ CORTAZAR | Hector Fabio Ortiz Cortazar | Coincide |
| Carlos Ríos | Carlos Andrés Ríos Franco | Coincide |
| J Pérez | Juan Pérez Gómez | Coincide |
| Anamaría Torres | Ana María Torres | Coincide |
| Carlos Castillo | Carlos Saavedra | No coincide |
| Laura Ortega | Laura Natalia Rosado Muñoz | No coincide |

**Riesgo aceptado.** El matcher es deliberadamente permisivo, por decisión de Luisa el
2026-08-03: prioriza que ningún asistente real se quede sin su certificado por escribir su
nombre distinto. El costo es que dos personas que comparten el primer nombre y un apellido
pueden confundirse — «Ana Rodríguez» coincide con «Ana Milena Herrera Rodríguez» — y alguien
que no asistió podría descargar un certificado. La hoja `Descargas` deja el rastro para
detectarlo.

### Flujo de aprobación

En `Solicitudes`, un menú propio del Sheet (`Certificados → Aprobar seleccionados`) toma las
filas marcadas, agrega el nombre a `Asistentes` con origen `Aprobado manual`, cambia el estado
a `Aprobado` y envía un correo a la persona avisándole que ya puede volver al link y descargar.
No se genera ningún PDF del lado del servidor: el certificado siempre se fabrica en el
navegador de quien lo descarga.

### Manejo de errores

- Si el registro en el Sheet falla, **no se genera el PDF**. Se muestra el error y un botón de
  reintentar. Un certificado sin fila en el Sheet rompe el conteo, que es justamente el punto
  del backend.
- Dos reintentos automáticos con espera antes de mostrar el error, porque el primer arranque
  de un Web App de Apps Script es lento.
- Si la persona ya descargó antes, se permite de nuevo y se marca `Repetida`, para que el
  conteo de personas únicas quede limpio.
- Validación en el navegador antes de enviar: nombre con al menos dos palabras, cédula de 6 a
  12 dígitos, correo con formato válido, casilla de autorización marcada.

### Tratamiento de datos

El formulario incluye una casilla obligatoria de autorización de tratamiento de datos
personales, con el detalle de qué se guarda (nombre, cédula, correo), para qué (emisión del
certificado y control de entrega) y a quién escribir para pedir su eliminación
(`info.porcontar@gmail.com`). Se está recogiendo un documento de identidad de empleados de un
cliente institucional; sin esa casilla la recolección queda mal parada frente a la Ley 1581.

## Dirección de arte

Las dos marcas no comparten lenguaje visual y no se mezclan: cada una manda donde le
corresponde.

El kit de prompts que PorContar entregó a WCS declara la línea editorial de WCS Colombia —
verdes de bosque y petróleo, marfil, arena, fotografía documental — y pide explícitamente
evitar neón, degradados digitales y azul corporativo brillante, que es la línea de PorContar.

**La landing usa la línea WCS.** Fondo marfil, bloques en verde petróleo, títulos en
mayúsculas con mucha presencia, fotografía y aire. El azul y el amarillo de PorContar entran
solo como acentos de firma: botones, subrayados, el badge del hero.

**El certificado usa la línea PorContar.** Es un documento que emite PorContar Group S.A.S.,
así que ahí manda el azul, con el verde WCS y su logo como co-marca.

### Paleta

Los verdes salen del propio logo de WCS.

| Rol | Hex |
| --- | --- |
| Marfil (fondo de página) | `#F4EFE4` |
| Blanco cálido (tarjetas) | `#FBF8F2` |
| Verde bosque (bloques oscuros) | `#14432F` |
| Verde petróleo | `#1E5E4E` |
| Teal WCS | `#2F9C8B` |
| Azul agua WCS | `#2E7BA6` |
| Arena / borde | `#DCD3C2` |
| Texto | `#11162A` |
| Azul PorContar (acento) | `#2B4FE8` |
| Amarillo PorContar (acento) | `#FFF401` |

### Tipografía

Poppins para títulos (600/700/800, mayúsculas en los de sección) y Hanken Grotesk para el
cuerpo, cargadas desde Google Fonts. Son las mismas de porcontar.com, y cumplen con la sans
condensada fuerte que pide la línea WCS. Botones en píldora, radio 999px, como en la web.

## El certificado

A4 horizontal, 297 × 210 mm, dibujado por código con jsPDF. Texto real y seleccionable,
alrededor de 130 KB con las imágenes comprimidas — sin comprimir se va a 3,5 MB, porque jsPDF
guarda los mapas de bits en crudo —, y cambiar una fecha es editar una línea. Se descartaron la plantilla
exportada de Canva (cada ajuste obliga a reexportar) y html2canvas (produce una imagen).

Poppins y Hanken Grotesk se embeben en base64 para que el PDF lleve las tipografías reales y
no el Helvetica por defecto de jsPDF.

Composición, de arriba abajo:

- Marco azul `#2B4FE8` con un sello circular en amarillo `#FFF401` arriba a la derecha
- Logo PorContar a la izquierda, logo WCS a la derecha
- `CERTIFICADO` en Poppins ExtraBold navy, `DE PARTICIPACIÓN` debajo en azul
- `POR CONTAR GROUP S.A.S · NIT 901986736-1`
- «Por medio de la presente se deja constancia de que»
- Nombre en mayúsculas, azul PorContar, Poppins Bold
- `C.C. 1.032.456.789` con separadores de miles
- Cuerpo: «Participó en el taller "IA Learn: Inteligencia Artificial para la Productividad",
  realizado para WCS Colombia en modalidad virtual en vivo el 27 de julio de 2026, con una
  duración total de 4 horas.»
- Segundo párrafo: «Durante este espacio, los participantes fortalecieron su comprensión sobre
  los fundamentos de la inteligencia artificial, la ingeniería de prompts y de contexto, las
  herramientas aplicadas al entorno laboral y las prácticas de uso seguro y responsable de la
  IA en la organización.»
- Firma escaneada de Ximena sobre fondo blanco, línea, `Ximena Andrea Villalobos` y `Gerente`
- Sin código de verificación

El nombre impreso es el que la persona escribió, no el de la lista, porque la lista tiene
nombres parciales. Se normaliza a mayúsculas para el certificado y a formato título en el
resto de la interfaz, respetando los conectores en minúscula.

Nombre del archivo: `Certificado-IA-Learn-WCS-Nombre-Apellido.pdf`.

## La landing

Secciones en orden:

1. **Hero** — co-marca PorContar × WCS Colombia, título del taller, `27 de julio de 2026 · 4
   horas · virtual`, botón principal al certificado.
2. **Descarga tu certificado aquí** — inmediatamente después del hero, porque es a lo que la
   mayoría entra. Formulario de nombre, cédula, correo y autorización de datos, con sus
   estados: cargando, aprobado, pendiente, error.
3. **Gracias** — agradecimiento al equipo de WCS, con las cifras de la evaluación: 42
   evaluaciones y 4,5 sobre 5 de calificación promedio.
4. **Esto fue lo que trabajamos** — los cinco módulos con el texto de la recapitulación.
5. **Los seis elementos de un buen prompt** — tarjeta de referencia rápida.
6. **Vocabulario del taller** — el glosario de doce términos.
7. **El mapa de herramientas** — populares, poco conocidas y automatizaciones.
8. **Empieza a usarla mañana** — los cuatro consejos de cierre.
9. **Tus regalos** — descarga de los tres PDFs: Kit de 3 prompts con la línea editorial de WCS
   Colombia, Prompt para que Claude suene humano, y la Recapitulación del taller. Esta sección
   es también la guía de recursos; no hay links externos de documentación.
10. **Míranos en Instagram** — cinco reels embebidos con el script oficial de Instagram.
11. **Footer** — Instagram y TikTok `@por.contar`, YouTube `@porcontar`, los LinkedIn de Ximena
    y de Luisa, `info.porcontar@gmail.com` y `porcontar.com`.

Un botón flotante lleva de vuelta al formulario desde cualquier punto de la página.

Responsive de una columna en móvil. Los reels de Instagram no cargan si el visitante bloquea
scripts de terceros; en ese caso cada bloque cae a una tarjeta con link al reel.

### Contenido fijo en `config.js`

Todo lo editable vive en un solo archivo: URL del Web App, fecha y duración del taller, textos
del certificado, links de los cinco reels, redes, y la lista de descargas. Cambiar el taller a
otro cliente debería ser editar `config.js` y reemplazar dos logos.

## Assets

Entregados, en `assets/`:

| Archivo | Formato | Observación |
| --- | --- | --- |
| `logo-porcontar.png` | 1200 × 756, ARGB con transparencia | El texto va en negro. Hace falta derivar una variante blanca para los bloques en verde oscuro: se genera en build reemplazando el negro por blanco y conservando el amarillo |
| `logo-wcs.png` | 360 × 363, PNG indexado **sin transparencia** | Es una captura de pantalla del logo, no el logo: trae horneado el tablero de ajedrez con el que los visores dibujan la transparencia (alterna `255,255,255` con `238,239,239`) y el texto «WCS» en gris claro. Se extrae la W por saturación de color, lo que deja la marca limpia y con transparencia real, y se recorta. El texto «WCS» se pierde: es la salida que Luisa aprobó mientras no llegue el archivo original del cliente |
| `firma-ximena.png` | 301 × 243, fondo blanco opaco | Se le quita el blanco por umbral en build, para poder ubicarla sobre cualquier fondo. A 45 mm de ancho queda en ~170 ppp: suficiente para una firma, pero si aparece un escaneo de mayor resolución conviene reemplazarla |

En `assets/descargas/`: `kit-prompts-wcs.pdf`, `prompt-claude-humano.pdf` y
`recapitulacion-ia-learn.pdf`.

Pendiente:

- Confirmación de Mónica Lozano sobre el uso del logo de WCS en el certificado.
- Versión del logo de WCS con el texto en oscuro, para que se lea sobre el blanco del
  certificado. Si no llega, el logo va sin el texto «WCS» o sobre un tono verde de fondo.

## Pruebas

- `Pruebas.gs` corre el matcher contra la tabla de casos reales de este documento, incluidos
  los que no deben coincidir.
- Prueba manual del `doPost` con los cuatro caminos: aprobado primera vez, aprobado repetido,
  pendiente, y error de escritura.
- Revisión visual del PDF generado con un nombre corto, uno muy largo y uno con tildes y ñ.
- Revisión de la landing en móvil y en escritorio, con y sin el script de Instagram cargado.

## Riesgos

- **Nombres que no coinciden.** La encuesta tiene 42 respuestas y al taller entraron cerca de
  67 personas. Se espera un volumen real de solicitudes pendientes; el flujo de aprobación no
  es un caso raro sino parte del funcionamiento normal.
- **Uso del logo de WCS.** Falta la autorización expresa del cliente.
- **Cuotas de Apps Script.** Irrelevantes a esta escala: el límite de correos diarios y de
  ejecuciones queda muy por encima de 67 personas.
