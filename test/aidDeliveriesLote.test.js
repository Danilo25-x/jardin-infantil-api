const test = require('node:test');
const assert = require('node:assert/strict');
const { _internos } = require('../src/controllers/aidDeliveries.controller');
const { normalizarItemsLote, validarEntregaBase, MAX_ITEMS_LOTE } = _internos;

const sinItems = (fn) => assert.throws(fn, (e) => e.status === 400);

test('acepta varios kits con sus cantidades', () => {
  const items = normalizarItemsLote([{ kitType: ' Leche ', quantity: 5 }, { kitType: 'Galletas', quantity: 2 }]);
  assert.deepEqual(items, [{ kitType: 'Leche', quantity: 5 }, { kitType: 'Galletas', quantity: 2 }]);
});

test('rechaza una lista vacía o que no es lista', () => {
  sinItems(() => normalizarItemsLote([]));
  sinItems(() => normalizarItemsLote(undefined));
  sinItems(() => normalizarItemsLote('leche'));
});

test('rechaza el mismo kit dos veces en el lote', () => {
  sinItems(() => normalizarItemsLote([{ kitType: 'Leche', quantity: 1 }, { kitType: 'Leche', quantity: 2 }]));
});

test('rechaza cantidades que no son enteros positivos', () => {
  for (const quantity of [0, -1, 1.5, '3', null, undefined]) {
    sinItems(() => normalizarItemsLote([{ kitType: 'Leche', quantity }]));
  }
});

test('rechaza kits sin nombre', () => {
  sinItems(() => normalizarItemsLote([{ kitType: '  ', quantity: 1 }]));
});

test('limita el número de kits por lote', () => {
  const muchos = Array.from({ length: MAX_ITEMS_LOTE + 1 }, (_, i) => ({ kitType: 'k' + i, quantity: 1 }));
  sinItems(() => normalizarItemsLote(muchos));
});

test('la entrega al hogar exige acudiente', () => {
  assert.throws(() => validarEntregaBase({ childId: 'x', deliveryType: 'hogar' }, { role: 'cuidadora' }),
    (e) => e.status === 400 && /guardianName/.test(e.message));
});

test('solo administración o nutrición pueden registrar apoyo adicional', () => {
  const body = { childId: 'x', deliveryType: 'adicional', nutritionist: 'Dra', nutritionNote: 'nota' };
  assert.throws(() => validarEntregaBase(body, { role: 'cuidadora' }), (e) => e.status === 403);
  assert.equal(validarEntregaBase(body, { role: 'nutricionista' }).deliveryType, 'adicional');
});
