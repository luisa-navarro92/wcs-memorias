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
