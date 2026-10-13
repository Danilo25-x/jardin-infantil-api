# API Jardín Infantil - Entrega 3 (Backend)

API REST para registrar la asistencia y entrega de niños, controlar la entrega del complemento nutricional y generar reportes para la administradora.

## Tecnologías
- Node.js 18+
- Express 5
- MongoDB con Mongoose

## Instalación

1. Instala MongoDB Community Server y asegúrate de que esté corriendo en `mongodb://127.0.0.1:27017`.
2. Copia `.env.example` como `.env` (opcional; si no existe, usa los valores por defecto).
3. Instala dependencias y carga datos de prueba:

```bash
npm install
npm run seed
```

4. Inicia el servidor:

```bash
npm start
```

La API queda en `http://localhost:3000/api`.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | /api/children | Lista niños (filtro opcional `?classroom=`) |
| POST | /api/children | Crea un niño con sus acudientes autorizados |
| GET | /api/children/:id | Obtiene un niño |
| POST | /api/attendance | Registra la llegada del niño |
| PATCH | /api/attendance/:id/checkout | Registra la entrega (valida acudiente autorizado) |
| GET | /api/attendance?date=&status= | Asistencias; `status=presente` muestra niños pendientes de entrega |
| POST | /api/aid-deliveries | Entrega de ayuda nutricional (valida existencias y descuenta inventario) |
| GET | /api/aid-deliveries?date= | Entregas de ayuda por fecha |
| GET | /api/inventory | Existencias por tipo de kit |
| GET | /api/reports/summary?date= o ?month= | Reporte para la administradora |

## Reglas de negocio

1. **Entrega a acudiente autorizado:** `PATCH /checkout` solo se acepta si el nombre y documento de quien recoge coinciden con la lista de acudientes del niño. Si no coinciden, responde `403`.
2. **Ayuda nutricional con existencias:** `POST /aid-deliveries` descuenta el inventario con cada entrega. Si no hay stock suficiente, responde `409` y no descuenta nada.
3. **Una llegada por niño y día:** si ya existe, responde `409`.
4. **Una entrega por niño:** un niño ya entregado no puede volver a entregarse (`409`).

## Códigos de respuesta

- `200` / `201`: operación exitosa.
- `400`: datos inválidos o faltantes.
- `403`: persona no autorizada para recoger.
- `404`: recurso no encontrado.
- `409`: conflicto (ya registrado o sin existencias).

## Pruebas con Postman

1. Abre Postman → **Import** → selecciona `docs/postman_collection.json`.
2. Ejecuta **Run collection** en orden (1 a 14). Las variables `childId` y `attendanceId` se llenan solas.
3. Para repetir las pruebas desde cero, ejecuta `npm run seed` y vuelve a correr la colección.
