const test = require('node:test');
const assert = require('node:assert/strict');
const { construirItems, resumenFrecuencia, formatearNumero } = require('../src/services/programacionAAVN');

const HOGAR_INFANTIL = [
  { producto: 'Bienestarina Más® - consumo diario', tipo: 'servicio_diario', cantidad: 15, unidad: 'g', diasAnuales: 200, mesesEntrega: [] },
  { producto: 'Bienestarina Más® - paquete para casa (900 g)', tipo: 'paquete_casa', cantidad: 900, unidad: 'g', diasAnuales: null, mesesEntrega: [3, 5, 7, 9, 11] },
];

test('formatea miles con punto', () => {
  assert.equal(formatearNumero(4500), '4.500');
  assert.equal(formatearNumero(900), '900');
});

test('Hogar Infantil: 15 g por día hábil y 4.500 g al año en cinco paquetes', () => {
  const items = construirItems(HOGAR_INFANTIL);
  assert.equal(items[0].name, 'Bienestarina Más®');
  assert.equal(items[0].quantity, 15);
  assert.equal(items[0].detalle, '15 g por día hábil durante 200 días');
  assert.equal(items[1].quantity, 4500);
  assert.equal(items[1].detalle, '4.500 g al año: 5 paquetes de 900 g en marzo, mayo, julio, septiembre y noviembre');
});

test('la frecuencia resume todos los items', () => {
  const texto = resumenFrecuencia(construirItems(HOGAR_INFANTIL));
  assert.match(texto, /15 g por día hábil durante 200 días; 4\.500 g al año/);
});
