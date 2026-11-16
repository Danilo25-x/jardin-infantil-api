const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizarComposicion } = require('../src/controllers/kits.controller');

test('acepta una composición válida con cantidades enteras', () => {
  assert.deepEqual(
    normalizarComposicion([{ kitType: ' Leche ', quantity: 5 }, { kitType: 'Galletas', quantity: 2 }]),
    [{ kitType: 'Leche', quantity: 5 }, { kitType: 'Galletas', quantity: 2 }]
  );
});

test('un kit necesita al menos un producto', () => {
  assert.throws(() => normalizarComposicion([]), (e) => e.status === 400);
  assert.throws(() => normalizarComposicion(null), (e) => e.status === 400);
});

test('un producto no puede repetirse dentro del kit', () => {
  assert.throws(() => normalizarComposicion([{ kitType: 'Leche', quantity: 1 }, { kitType: 'Leche', quantity: 2 }]), (e) => e.status === 400);
});

test('las cantidades deben ser enteros positivos', () => {
  for (const quantity of [0, -3, 2.5, '4', undefined]) {
    assert.throws(() => normalizarComposicion([{ kitType: 'Leche', quantity }]), (e) => e.status === 400);
  }
});

test('un kit no admite más de 50 productos', () => {
  const muchos = Array.from({ length: 51 }, (_, i) => ({ kitType: 'p' + i, quantity: 1 }));
  assert.throws(() => normalizarComposicion(muchos), (e) => e.status === 400);
});
