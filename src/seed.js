require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Child = require('./models/Child');
const Attendance = require('./models/Attendance');
const AidDelivery = require('./models/AidDelivery');
const Inventory = require('./models/Inventory');
const InventoryMovement = require('./models/InventoryMovement');
const AAVNProgramacion = require('./models/AAVNProgramacion');
const User = require('./models/User');
const { hashPassword } = require('./utils/passwords');

async function seedDemoUsers() {
  if (process.env.SEED_DEMO_USERS === '0') return;
  if (process.env.NODE_ENV === 'production') throw new Error('No cargues cuentas de demostración en producción.');
  const accounts = [
    { name: 'Administradora del jardín', email: process.env.DEMO_ADMIN_EMAIL || 'admin@jardin.local', password: process.env.DEMO_ADMIN_PASSWORD || 'JardinLocal2026!', role: 'administradora' },
    { name: 'Cuidadora del jardín', email: process.env.DEMO_CAREGIVER_EMAIL || 'cuidadora@jardin.local', password: process.env.DEMO_CAREGIVER_PASSWORD || 'JardinLocal2026!', role: 'cuidadora' },
    { name: 'Nutricionista del jardín', email: process.env.DEMO_NUTRITIONIST_EMAIL || 'nutricion@jardin.local', password: process.env.DEMO_NUTRITIONIST_PASSWORD || 'JardinLocal2026!', role: 'nutricionista' },
  ];
  for (const account of accounts) {
    await User.findOneAndUpdate(
      { email: account.email.toLowerCase() },
      { $set: { name: account.name, email: account.email, role: account.role, active: true, passwordHash: hashPassword(account.password) } },
      { upsert: true, runValidators: true }
    );
  }
}

async function run() {
  await connectDB();
  await Promise.all([Child.deleteMany({}), Attendance.deleteMany({}), AidDelivery.deleteMany({}), Inventory.deleteMany({}), InventoryMovement.deleteMany({}), AAVNProgramacion.deleteMany({})]);
  await Child.insertMany([
    { name: 'Sofía Ramírez', classroom: 'Sala Azul', authorizedGuardians: [{ name: 'María Ramírez', document: '1061000001' }] },
    { name: 'Mateo Gómez', classroom: 'Sala Verde', authorizedGuardians: [{ name: 'Carlos Gómez', document: '1061000002' }, { name: 'Lucía Gómez', document: '1061000003' }] },
    { name: 'Valentina Pérez', classroom: 'Sala Azul', authorizedGuardians: [{ name: 'Ana Pérez', document: '1061000004' }] },
  ]);
  await Inventory.insertMany([
    { kitType: 'Bienestarina Más® - consumo diario', description: 'Alimento de Alto Valor Nutricional (AAVN). Para Hogar Infantil, el lineamiento 2026 programa 15 g por niño en día hábil durante 200 días.', stock: 20 },
    { kitType: 'Bienestarina Más® - paquete para casa (900 g)', description: 'Ración para llevar a casa. El lineamiento 2026 de Hogar Infantil programa 4.500 g por niño al año, entregados en cinco paquetes de 900 g en los meses definidos para la vigencia.', stock: 5 },
  ]);
  await AAVNProgramacion.insertMany([
    { vigencia: 2026, modalidad: 'hogar_infantil', producto: 'Bienestarina Más® - consumo diario', tipo: 'servicio_diario', cantidad: 15, unidad: 'g', diasAnuales: 200, mesesEntrega: [], edadMinMeses: 6, edadMaxMesesExclusivo: 60, fuente: 'Anexo 2 AAVN Vigencia 2026, Hogar Infantil' },
    { vigencia: 2026, modalidad: 'hogar_infantil', producto: 'Bienestarina Más® - paquete para casa (900 g)', tipo: 'paquete_casa', cantidad: 900, unidad: 'g', diasAnuales: null, mesesEntrega: [3, 5, 7, 9, 11], edadMinMeses: 6, edadMaxMesesExclusivo: 60, fuente: 'Anexo 2 AAVN Vigencia 2026, Hogar Infantil' },
  ]);
  await seedDemoUsers();
  console.log('Datos de demostración cargados. Las contraseñas se configuran con DEMO_ADMIN_PASSWORD y DEMO_CAREGIVER_PASSWORD.');
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});


