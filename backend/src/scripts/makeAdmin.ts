import 'dotenv/config';
import mongoose from 'mongoose';
import argon2 from 'argon2';
import { User } from '../models/User.js';

const MONGODB_URI = process.env['MONGODB_URI'];
const ADMIN_EMAIL = process.env['ADMIN_EMAIL'] || 'admin@date-to-go.in';
const ADMIN_PASSWORD = process.env['ADMIN_PASSWORD'] || 'Admin@1234Secure!';

async function main() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in .env');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const passwordHash = await argon2.hash(ADMIN_PASSWORD);

  const admin = await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    {
      $set: {
        role: 'ADMIN',
        fullName: 'System Admin',
        passwordHash,
        gender: 'OTHER',
        dob: new Date('1990-01-01'),
        preferredGender: [],
        allowedSeekerGenders: [],
        city: 'System',
        status: 'ACTIVE',
        emailVerified: true,
        phoneVerified: true,
        kycStatus: 'VERIFIED',
        tokenVersion: 1,
        failedLoginAttempts: 0,
        walletBalancePaise: 0
      }
    },
    { upsert: true, new: true }
  );

  console.log(`✅ Admin user ensured: ${admin.email}`);
  process.exit(0);
}

main().catch(console.error);
