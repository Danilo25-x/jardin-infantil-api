# Cambios del backend (v4): kits, entregas por lote y complementos con origen

## Kits de entrega (nuevo)
Un kit es un conjunto de productos del inventario que se entregan juntos, con la cantidad que incluye cada uno.
Roles que pueden crear, editar y retirar kits: administradora, cuidadora (docente) y nutricionista.

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/kits` | Kits activos con su contenido, existencias y `unidadesDisponibles` (kits completos que se pueden entregar). |
| GET | `/api/kits/:id` | Un kit con su contenido y existencias. |
| POST | `/api/kits` | Crea un kit: `{ name, description, items: [{ kitType, quantity }] }`. |
| PUT | `/api/kits/:id` | Cambia nombre, descripción o composición. |
| DELETE | `/api/kits/:id` | Retira el kit (baja lógica; el historial de entregas se conserva). |
| POST | `/api/aid-deliveries/kit` | Entrega un kit completo: `{ kitId, childId, date, deliveryType, guardianName, nutritionist, nutritionNote }`. |

Validaciones: nombre obligatorio y único; al menos un producto; cada producto debe existir en el inventario;
sin productos repetidos; cantidades enteras mayores que cero; máximo 50 productos por kit.

## Entregas por lote
`POST /api/aid-deliveries/bulk` (de la versión anterior) ahora usa el mismo registro compartido que la entrega de kits.
Es todo o nada: si un producto falla, se revierten los anteriores (stock, registros y movimientos).

## Complementos con origen (nuevo)
`POST /api/children/:id/plans` acepta un campo `origen`:

- `"icbf"` (por defecto): productos y cantidades calculados por la edad y la programación del Anexo 2. Exige fecha de nacimiento (422 si falta). El cliente no envía productos.
- `"nutricion"`: productos indicados por el profesional, con `items: [{ name, quantity, unit, detalle? }]`. `name` debe existir en el inventario, `quantity` es entero mayor que cero, `unit` es obligatoria (máximo 20 caracteres), no hay productos repetidos y `notes` es obligatorio como justificación. No depende de la fecha de nacimiento.

Un niño puede tener planes de ambos orígenes a la vez. Cada plan se finaliza por separado. Los planes guardados antes de este cambio, sin campo `origen`, se leen como `"icbf"`.

## Pruebas
- `test/kits.test.js`: 5 pruebas de validación de la composición de kits.
- `test/planesManuales.test.js`: 8 pruebas de reglas de planes de nutrición.
- Integración: 22 casos de planes (ambos orígenes conviven, reglas, roles, finalización independiente, planes antiguos sin origen).
- `test/aidDeliveriesLote.test.js`: 8 pruebas de validación del lote.
- Integración contra MongoDB 7 y el servidor: creación, edición, retiro, entrega de kit con descuento por producto,
  kit sin existencias suficientes (revierte), duplicados y roles. Todo pasó.

## Notas
- El README no cambió; la tabla de rutas no incluye `/api/kits` ni `/api/aid-deliveries/kit`.
- El `.env` y `node_modules` no van en el zip.
