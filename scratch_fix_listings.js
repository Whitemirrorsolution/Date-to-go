require('dotenv').config({path: './backend/.env'});
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  await db.collection('listings').updateMany({}, { $set: { startAt: tomorrow, endAt: new Date(tomorrow.getTime() + 2*3600*1000) } });
  console.log('Updated listings');
  process.exit(0);
});
