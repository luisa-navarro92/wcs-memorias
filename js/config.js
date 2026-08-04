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
  // Prefijo del archivo PDF que descarga la persona.
  slugCertificado: 'IA-Learn-WCS',
  facilitadoras: 'Ximena Villalobos · Luisa Navarro',
};

export const BACKEND = {
  // Se reemplaza con la URL del Web App al desplegar Apps Script (Task 13).
  url: 'https://script.google.com/macros/s/AKfycbwlWdVL6AWZHnNv0O0eTMn0hac4Zt7ElOzG-agO0CfN4VHAfLflU1ZBebTbqo7p-FwmPw/exec',
};

export const EVALUACION = [
  { cifra: '42', etiqueta: 'evaluaciones recibidas' },
  { cifra: '4,5', etiqueta: 'de 5 en calificación promedio' },
  { cifra: '4', etiqueta: 'módulos en estas memorias' },
];

export const MODULOS = [
  {
    numero: '1',
    titulo: 'Fundamentos',
    puntos: [
      'Qué es la IA generativa y cómo llega a una respuesta.',
      'Pensar el problema completo antes de escribirle a la IA.',
      'Identificar qué tarea repetitiva vale la pena delegar primero.',
    ],
    etiquetas: ['IA generativa', 'Pensamiento sistemático'],
  },
  {
    numero: '2',
    titulo: 'Panorama y modelos',
    puntos: [
      'El mapa de herramientas: las de uso general y las menos conocidas.',
      'Cómo elegir el modelo según la tarea que tengas entre manos.',
      'Qué cambia entre un modelo rápido y uno más potente.',
    ],
    etiquetas: ['Mapa de herramientas', 'Elegir el modelo correcto'],
  },
  {
    numero: '3',
    titulo: 'Prompt & context engineering',
    puntos: [
      'Los seis elementos que hacen que un prompt funcione.',
      'La diferencia entre pedir bien y tener listo el entorno de trabajo.',
      'Cada participante armó su primer prompt aplicado a su día a día.',
    ],
    etiquetas: ['Los 6 elementos del prompt', 'Context engineering'],
  },
  {
    numero: '4',
    titulo: 'Productividad por herramienta',
    puntos: [
      'Gemini, ChatGPT y Claude: qué hace mejor cada uno.',
      'Proyectos, artefactos y asistentes personalizados.',
      'Una primera mini-aplicación funcional, sin escribir código.',
    ],
    etiquetas: ['Gemini', 'ChatGPT', 'Claude'],
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
  { termino: 'Claude', definicion: 'La IA de Anthropic. Se destaca en documentos largos, PDFs y hojas de cálculo, y permite guardar proyectos con instrucciones fijas.' },
  { termino: 'Gemini', definicion: 'La IA de Google, integrada con Gmail, Drive, Documentos y Calendar, así que puede trabajar sobre tus propios archivos.' },
  { termino: 'ChatGPT', definicion: 'La IA de OpenAI, la más extendida. Fuerte en redacción, síntesis, ideación y generación de imágenes.' },
  { termino: 'GEM (Gemini)', definicion: 'Un asistente personalizado dentro de Gemini, con sus instrucciones y su comportamiento propios, que puedes compartir con tu equipo.' },
  { termino: 'Notebook LM', definicion: 'Herramienta de Google para trabajar solo a partir de las fuentes que tú le das: resúmenes, mapas mentales y preguntas sobre tus documentos.' },
  { termino: 'Conector', definicion: 'La integración que le permite a la IA leer y actuar sobre herramientas reales: correo, calendario, CRM.' },
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
