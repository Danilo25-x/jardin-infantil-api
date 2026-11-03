# Jardín Infantil API

API REST del proyecto móvil. Usa Node.js 18+, Express 5, MongoDB y Mongoose.

## Arranque local

1. Copia `.env.example` como `.env` y cambia `JWT_SECRET` y las dos contraseñas de desarrollo.
2. Inicia MongoDB según `MONGODB_URI`.
3. En esta carpeta ejecuta `npm install`, `npm run seed` y `npm start`.
4. Health: `GET http://localhost:3000/api/health`.

`npm run seed` restablece los datos de niños e inventario y crea las cuentas de demostración configuradas en `.env`. No lo uses sobre una base con datos que quieras conservar. Las contraseñas se guardan con hash scrypt. Usa `SEED_DEMO_USERS=0` al desactivar esas cuentas.

## Acceso de desarrollo

- Administradora: `admin@jardin.local` / `JardinLocal2026!`
- Cuidadora: `cuidadora@jardin.local` / `JardinLocal2026!`

Cámbialas en `.env`. En producción se exige `JWT_SECRET`; configura HTTPS, `CORS_ORIGIN` y `SEED_DEMO_USERS=0`.

## Rutas

| Método y ruta | Permiso | Uso |
|---|---|---|
| `POST /api/auth/login` | Público | Valida correo y contraseña; devuelve token y rol. |
| `GET /api/auth/me` | Sesión | Devuelve la cuenta actual. |
| `GET /api/children?classroom=` | Sesión | Lista niños activos. |
| `GET /api/children/:id` | Sesión | Perfil y acudientes autorizados. |
| `POST /api/children` | Administradora | Crea niño y acudientes. |
| `PUT /api/children/:id` | Administradora | Actualiza datos y acudientes. |
| `DELETE /api/children/:id` | Administradora | Baja lógica, preserva historial. |
| `GET /api/attendance?date=`, `?month=`, `?from=&to=` | Sesión | Historial de llegadas y entregas. |
| `POST /api/attendance` | Sesión | Registra llegada. |
| `PATCH /api/attendance/:id/checkout` | Sesión | Entrega solo a un acudiente autorizado. |
| `GET /api/aid-deliveries?date=`, `?month=` | Sesión | Historial de alimentación servida. |
| `POST /api/aid-deliveries` | Sesión | Registra una entrega, descuenta stock y bloquea duplicados diarios. |
| `GET /api/inventory` | Sesión | Existencias actuales. |
| `POST /api/inventory/restock` | Administradora | Reposición con fecha, nota y registro de movimiento. |
| `GET /api/inventory/movements?date=`, `?month=` | Administradora | Historial de reposiciones. |
| `GET /api/reports/summary?date=` o `?month=` | Administradora | Totales y detalle por niño y kit. |

Las solicitudes protegidas envían `Authorization: Bearer <token>`. Los roles los vuelve a validar el servidor; ocultar un control en Android no sustituye el permiso de API.

## Postman

Importa `docs/postman_collection.json`. La colección inicia sesión y guarda el token. Su secuencia cubre autenticación, gestión de niños, asistencia, alimentación, reposiciones, movimientos y reportes; las fechas se calculan con la zona horaria de Colombia.
