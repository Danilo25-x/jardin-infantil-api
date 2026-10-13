require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Child = require('./models/Child');
const Attendance = require('./models/Attendance');
const AidDelivery = require('./models/AidDelivery');
const Inventory = require('./models/Inventory');

async function run() {
  await connectDB();

  await Promise.all([
    Child.deleteMany({}),
    Attendance.deleteMany({}),
    AidDelivery.deleteMany({}),
    Inventory.deleteMany({}),
  ]);

  await Child.insertMany([
    {
      name: 'Sofía Ramírez',
      classroom: 'Sala Azul',
      authorizedGuardians: [{ name: 'María Ramírez', document: '1061000001' }],
    },
    {
      name: 'Mateo Gómez',
      classroom: 'Sala Verde',
      authorizedGuardians: [
        { name: 'Carlos Gómez', document: '1061000002' },
        { name: 'Lucía Gómez', document: '1061000003' },
      ],
    },
    {
      name: 'Valentina Pérez',
      classroom: 'Sala Azul',
      authorizedGuardians: [{ name: 'Ana Pérez', document: '1061000004' }],
    },
  ]);

  await Inventory.insertMany([
    { kitType: 'Complemento nutricional básico', stock: 20 },
    { kitType: 'Complemento nutricional especial', stock: 5 },
  ]);

  console.log('Datos de prueba cargados');
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
