import 'dotenv/config';
import mongoose from 'mongoose';
import argon2 from 'argon2';
import { User } from '../models/User.js';
import { PartnerProfile } from '../models/PartnerProfile.js';
import { Subscription } from '../models/Subscription.js';
import { Category } from '../models/Category.js';

const MONGODB_URI = process.env['MONGODB_URI'];

async function seedPartners() {
  console.log('🌱 Seeding sample Partners...');

  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI missing in .env');
    process.exit(1);
  }
  await mongoose.connect(MONGODB_URI);

  const categories = await Category.find();
  if (categories.length === 0) {
    console.log('⚠️ No categories found. Run `npm run seed` first.');
    process.exit(1);
  }

  const passwordHash = await argon2.hash('Test@1234', { type: argon2.argon2id });

  const partnersData = [
    { name: 'Aarohi Sen', email: 'aarohi@example.com', gender: 'FEMALE', city: 'Mumbai', bio: 'History graduate & art enthusiast.', rate: 80000, cats: [categories[0]._id] },
    { name: 'Dev Patel', email: 'dev@example.com', gender: 'MALE', city: 'Mumbai', bio: 'Culinary explorer & food tour companion.', rate: 100000, cats: [categories[1]._id] },
    { name: 'Meera Deshmukh', email: 'meera@example.com', gender: 'FEMALE', city: 'Mumbai', bio: 'Classical music lover and corporate event companion.', rate: 150000, cats: [categories[2]._id] }
  ];

  for (const p of partnersData) {
    let user = await User.findOne({ email: p.email });
    if (!user) {
      user = await User.create({
        name: p.name,
        email: p.email,
        passwordHash,
        gender: p.gender,
        role: 'PARTNER',
        status: 'ACTIVE',
        kycStatus: 'VERIFIED',
        emailVerified: true,
        city: p.city,
        dob: new Date('1995-01-01')
      });
      console.log(`✅ User created: ${p.name}`);
    }

    // Active subscription
    await Subscription.findOneAndUpdate(
      { userId: user._id },
      { 
        planId: new mongoose.Types.ObjectId(), // Fake plan id for seeding
        status: 'ACTIVE',
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      { upsert: true }
    );

    // Profile
    await PartnerProfile.findOneAndUpdate(
      { userId: user._id },
      {
        displayName: p.name,
        bio: p.bio,
        hourlyRatePaise: p.rate,
        city: p.city,
        photos: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'],
        languages: ['English', 'Hindi'],
        categories: p.cats,
        isListed: true,
        approvalStatus: 'APPROVED',
        isAvailableNow: true
      },
      { upsert: true }
    );
    console.log(`✅ Profile & Subscription created: ${p.name}`);
  }

  await mongoose.disconnect();
  console.log('✅ Partner Seeding complete.');
}

seedPartners().catch(console.error);
