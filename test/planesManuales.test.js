const test = require('node:test');
const assert = require('node:assert/strict');
const { _internos } = require('../src/controllers/nutritionPlans.controller');
const { normalizarItemsManuales, validarBase, MAX_ITEMS_MANUALES } = _internos;

const falla400 = (fn, patron) => assert.throws(fn, (e) => e.status === 400 && (!patron || patron.test(e.message)));

test('acepta productos con cantidad entera y unidad', () => {
  const items = normalizarItemsManuales([{ name: ' Leche ', quantity: 5, unit: 'paquete' }, { name: 'Galletas', quantity: 2, unit: 'unidad', detalle: ' sin azúcar ' }]);
  assert.deepEqual(items, [
    { name: 'Leche', tipo: 'indicacion', quantity: 5, unit: 'paquete', detalle: '' },
    { name: 'Galletas', tipo: 'indicacion', quantity: 2, unit: 'unidad', detalle: 'sin azúcar' },
  ]);
});

test('exige al menos un producto', () => {
  falla400(() => normalizarItemsManuales([]));
  falla400(() => normalizarItemsManuales(undefined));
  falla400(() => normalizarItemsManuales('leche'));
});

test('rechaza productos repetidos', () => {
  falla400(() => normalizarItemsManuales([{ name: 'Leche', quantity: 1, unit: 'u' }, { name: 'Leche', quantity: 2, unit: 'u' }]), /repetido/);
});

test('rechaza cantidades que no son enteros positivos', () => {
  for (const quantity of [0, -1, 1.5, '3', null, undefined]) {
    falla400(() => normalizarItemsManuales([{ name: 'Leche', quantity, unit: 'u' }]), /entero mayor que 0/);
  }
});

test('la unidad es obligatoria y tiene largo máximo', () => {
  falla400(() => normalizarItemsManuales([{ name: 'Leche', quantity: 1, unit: '  ' }]), /unidad/);
  falla400(() => normalizarItemsManuales([{ name: 'Leche', quantity: 1, unit: 'x'.repeat(21) }]), /máximo/);
});

test('cada producto necesita nombre', () => {
  falla400(() => normalizarItemsManuales([{ name: ' ', quantity: 1, unit: 'u' }]), /name/);
});

test('limita el número de productos por plan', () => {
  const muchos = Array.from({ length: MAX_ITEMS_MANUALES + 1 }, (_, i) => ({ name: 'p' + i, quantity: 1, unit: 'u' }));
  falla400(() => normalizarItemsManuales(muchos), /máximo/);
});

test('validarBase exige fecha real, profesional y fin posterior al inicio', () => {
  const ok = { startDate: '2026-03-01', professionalName: ' Dra. Pérez ', notes: ' nota ' };
  assert.deepEqual(validarBase(ok), { startDate: '2026-03-01', endDate: null, professionalName: 'Dra. Pérez', professionalRole: '', notes: 'nota' });
  falla400(() => validarBase({ ...ok, startDate: '2026-02-30' }), /startDate/);
  falla400(() => validarBase({ ...ok, professionalName: '  ' }), /professionalName/);
  falla400(() => validarBase({ ...ok, endDate: '2026-02-01' }), /endDate/);
});
