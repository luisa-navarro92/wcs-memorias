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
  // Sin el parámetro de compresión en addImage, el logo de 1200 px se guarda
  // en crudo y el certificado pasa de 3,5 MB.
  assert.ok(bytes.length < 400000, `el PDF pesa ${Math.round(bytes.length / 1024)} KB: falta comprimir las imágenes`);

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
