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
