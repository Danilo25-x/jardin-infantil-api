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
| `GET /api/auth/users` | Administradora | Lista las cuentas del jardín, sin contraseñas. |
| `POST /api/auth/users` | Administradora | Crea una cuenta con contraseña inicial (mínimo 8 caracteres) y rol. |
| `PATCH /api/auth/users/:id` | Administradora | Cambia nombre, rol, estado (`active`) o contraseña. No permite quitarse el rol ni desactivarse. |
| `GET /api/auth/me` | Sesión | Devuelve la cuenta actual. |
| `POST /api/auth/change-password` | Sesión | Cambia la contraseña propia. Obligatorio cuando `mustChangePassword` es `true`. |
| `GET /api/children?classroom=` | Sesión | Lista niños activos. |
| `GET /api/children/:id` | Sesión | Perfil y acudientes autorizados. |
| `POST /api/children` | Administradora | Crea niño y acudientes. |
| `PUT /api/children/:id` | Administradora | Actualiza datos y acudientes. |
| `DELETE /api/children/:id` | Administradora | Baja lógica, preserva historial. |
| `GET /api/attendance?date=`, `?month=`, `?from=&to=` | Sesión | Historial de llegadas y entregas. |
| `POST /api/attendance` | Sesión | Registra llegada. |
| `PATCH /api/attendance/:id/checkout` | Sesión | Entrega solo a un acudiente autorizado. |
| `GET /api/aid-deliveries?date=`, `?month=` | Sesión | Historial de alimentación servida. |
| `POST /api/aid-deliveries` | Sesión (`adicional`: administradora o nutricionista) | Registra una entrega, descuenta stock y bloquea duplicados diarios. |
| `GET /api/inventory` | Sesión | Existencias actuales. |
| `POST /api/inventory/restock` | Administradora | Reposición con fecha, nota y registro de movimiento. |
| `GET /api/inventory/movements?date=`, `?month=` | Administradora | Historial de reposiciones. |
| `GET /api/reports/summary?date=` o `?month=` | Administradora | Totales y detalle por niño y kit. |
| `GET /api/children/:id/programacion?date=&vigencia=&modalidad=` | Sesión | Programación de AAVN según la edad en meses cumplidos del niño. Requiere fecha de nacimiento. |
| `GET /api/programacion?vigencia=&modalidad=` | Sesión | Programación completa de AAVN por vigencia y modalidad (Anexo 2, vigencia 2026). |
| `GET /api/children/:id/plans` | Sesión | Complementos indicados por nutrición del niño. |
| `POST /api/children/:id/plans` | Administradora, nutricionista | Agrega un complemento indicado, sin modificar el apoyo ordinario. |
| `PATCH /api/children/:id/plans/:planId/finish` | Administradora, nutricionista | Finaliza un complemento; el registro se conserva. |

Las solicitudes protegidas envían `Authorization: Bearer <token>`. Roles: `cuidadora` (consulta y entregas básicas), `nutricionista` (además, complementos indicados y apoyos adicionales) y `administradora` (todo lo anterior, más niños, inventario y reportes). Los roles los vuelve a validar el servidor; ocultar un control en Android no sustituye el permiso de API.

## Postman

Importa `docs/postman_collection.json`. La colección inicia sesión y guarda el token. Su secuencia cubre autenticación, gestión de niños, asistencia, alimentación, reposiciones, movimientos y reportes; las fechas se calculan con la zona horaria de Colombia.
