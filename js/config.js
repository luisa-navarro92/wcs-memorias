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
