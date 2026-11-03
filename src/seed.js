require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Child = require('./models/Child');
const Attendance = require('./models/Attendance');
const AidDelivery = require('./models/AidDelivery');
const Inventory = require('./models/Inventory');
const InventoryMovement = require('./models/InventoryMovement');
const User = require('./models/User');
const { hashPassword } = require('./utils/passwords');

async function seedDemoUsers() {
  if (process.env.SEED_DEMO_USERS === '0') return;
  if (process.env.NODE_ENV === 'production') throw new Error('No cargues cuentas de demostración en producción.');
  const accounts = [
    { name: 'Administradora del jardín', email: process.env.DEMO_ADMIN_EMAIL || 'admin@jardin.local', password: process.env.DEMO_ADMIN_PASSWORD || 'JardinLocal2026!', role: 'administradora' },
    { name: 'Cuidadora del jardín', email: process.env.DEMO_CAREGIVER_EMAIL || 'cuidadora@jardin.local', password: process.env.DEMO_CAREGIVER_PASSWORD || 'JardinLocal2026!', role: 'cuidadora' },
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
  await Promise.all([Child.deleteMany({}), Attendance.deleteMany({}), AidDelivery.deleteMany({}), Inventory.deleteMany({}), InventoryMovement.deleteMany({})]);
  await Child.insertMany([
    { name: 'Sofía Ramírez', classroom: 'Sala Azul', authorizedGuardians: [{ name: 'María Ramírez', document: '1061000001' }] },
    { name: 'Mateo Gómez', classroom: 'Sala Verde', authorizedGuardians: [{ name: 'Carlos Gómez', document: '1061000002' }, { name: 'Lucía Gómez', document: '1061000003' }] },
    { name: 'Valentina Pérez', classroom: 'Sala Azul', authorizedGuardians: [{ name: 'Ana Pérez', document: '1061000004' }] },
  ]);
  await Inventory.insertMany([
    { kitType: 'Complemento nutricional básico', stock: 20 },
    { kitType: 'Complemento nutricional especial', stock: 5 },
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
