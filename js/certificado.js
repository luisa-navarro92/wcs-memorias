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
  // Se capitaliza cada grupo de letras, no cada palabra separada por espacios:
  // así "Ana Muñoz/Pérez" queda "Ana Muñoz/Pérez" y no "Ana Muñoz/pérez".
  return String(valor)
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es')
    .replace(/\p{L}+/gu, (palabra) =>
      CONECTORES.includes(palabra) ? palabra : palabra.charAt(0).toLocaleUpperCase('es') + palabra.slice(1)
    );
}

export function nombreArchivo(nombre) {
  const limpio = nombreParaMostrar(nombre)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ /g, '-');
  return `Certificado-${TALLER.slugCertificado}-${limpio}.pdf`;
}

function centrar(doc, texto, y) {
  doc.text(texto, CENTRO, y, { align: 'center' });
}

export function construirCertificado(jsPDF, datos, recursos) {
  // Un certificado es un documento formal: antes que emitir uno con la cédula
  // vacía o el nombre en blanco, no se emite ninguno.
  const cedula = String(datos.cedula == null ? '' : datos.cedula).replace(/\D/g, '');
  if (!/^\d{6,12}$/.test(cedula)) {
    throw new Error('La cédula no es válida: el certificado no se emite.');
  }
  if (nombreParaMostrar(datos.nombre).length < 3) {
    throw new Error('El nombre no es válido: el certificado no se emite.');
  }

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

  // Logo. El de WCS se retiró mientras el cliente no autorice su uso en un
  // documento formal; el texto del cuerpo sigue diciendo para quién se dictó.
  // Para volver a ponerlo: descentrar este logo a x=22 y agregar
  // doc.addImage(recursos.LOGO_WCS, 'PNG', ANCHO - 47, 22, 25, 18.1, undefined, 'SLOW');
  doc.addImage(recursos.LOGO_PORCONTAR, 'PNG', CENTRO - 21, 22, 42, 26.5, undefined, 'SLOW');

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
  centrar(doc, `C.C. ${formatearCedula(cedula)}`, 117);

  // Cuerpo
  const parrafos = [
    `Participó en el taller "${TALLER.nombre}", realizado para ${TALLER.cliente} en modalidad ${TALLER.modalidad} el ${TALLER.fecha}, con una duración total de ${TALLER.duracion}.`,
    'Durante este espacio, los participantes fortalecieron su comprensión sobre los fundamentos de la inteligencia artificial, la ingeniería de prompts y de contexto, las herramientas aplicadas al entorno laboral y las prácticas de uso seguro y responsable de la IA en la organización.',
  ];

  // Medido: a 9,5 pt sobre 240 mm el cuerpo entra en 4 líneas y termina en
  // 152,8 mm, con margen frente a la firma, que empieza en 158 mm.
  doc.setFontSize(9.5);
  doc.setTextColor(...GRIS);
  let y = 126;
  for (const parrafo of parrafos) {
    const lineas = doc.splitTextToSize(parrafo, 240);
    for (const linea of lineas) {
      centrar(doc, linea, y);
      y += 5.2;
    }
    y += 3;
  }
  doc.__finTextos = y;

  // Firma
  doc.addImage(recursos.FIRMA, 'PNG', CENTRO - 18, 158, 36, 29, undefined, 'SLOW');
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
