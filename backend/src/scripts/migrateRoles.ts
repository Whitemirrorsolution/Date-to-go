import { connect, disconnect } from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Plan } from '../models/Plan.js';

async function migrate() {
  await connect(env.MONGODB_URI);
  console.log('Migrating users...');
  
  // Update normal users
  await User.updateMany(
    { role: 'USER' },
    { $set: { roles: ['SEEKER'], activeMode: 'SEEKER' }, $unset: { role: "" } }
  );
  
  // Update partners
  await User.updateMany(
    { role: 'PARTNER' },
    { $set: { roles: ['SEEKER', 'PARTNER'], activeMode: 'PARTNER' }, $unset: { role: "" } }
  );

  // Update admins
  await User.updateMany(
    { role: 'ADMIN' },
    { $set: { roles: ['ADMIN'], activeMode: 'SEEKER' }, $unset: { role: "" } }
  );

  // Some users might already have roles array if script ran partially
  await User.updateMany(
    { roles: { $exists: false } },
    { $set: { roles: ['SEEKER'], activeMode: 'SEEKER' } }
  );

  console.log('Migrating plans...');
  await Plan.updateMany(
    { audience: 'USER' },
    { $set: { audience: 'SEEKER' } }
  );

  console.log('Migration completed.');
  await disconnect();
}

migrate().catch(console.error);
