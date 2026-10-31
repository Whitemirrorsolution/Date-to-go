const argon2 = require('argon2');
const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

async function updatePassword() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/date-to-go');
  const hash = await argon2.hash('Password123!', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
  await mongoose.connection.collection('users').updateOne(
    { email: 'vikkypatel1209@gmail.com' },
    { $set: { passwordHash: hash, failedLoginAttempts: 0, lockUntil: null } }
  );
  console.log('SUCCESS_PASSWORD_UPDATED');
  await mongoose.disconnect();
}

updatePassword().catch(err => {
  console.error(err);
  process.exit(1);
});
