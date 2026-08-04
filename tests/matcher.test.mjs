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
