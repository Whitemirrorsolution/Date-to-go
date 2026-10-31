import 'dotenv/config';
import mongoose from 'mongoose';
import { Plan } from '../models/Plan.js';

const MONGODB_URI = process.env['MONGODB_URI'];

const PLANS = [
  // Partner plans
  {
    name: 'Partner Monthly',
    audience: 'PARTNER' as const,
    pricePaise: 199_00, // ₹199
    durationDays: 30,
    features: [
      'List your profile',
      'Accept up to 10 bookings/month',
      'Basic analytics dashboard',
      'Standard support',
    ],
    bookingLimit: 10,
    isActive: true,
  },
  {
    name: 'Partner Quarterly',
    audience: 'PARTNER' as const,
    pricePaise: 499_00, // ₹499
    durationDays: 90,
    features: [
      'List your profile',
      'Accept up to 40 bookings/quarter',
      'Advanced analytics dashboard',
      'Priority support',
      'Featured profile badge',
    ],
    bookingLimit: 40,
    isActive: true,
  },
  // User plans
  {
    name: 'User Monthly',
    audience: 'USER' as const,
    pricePaise: 299_00, // ₹299
    durationDays: 30,
    features: [
      'Book up to 5 companions/month',
      'Access all categories',
      'In-app messaging (after booking)',
      'Standard support',
    ],
    bookingLimit: 5,
    isActive: true,
  },
  {
    name: 'User Quarterly',
    audience: 'USER' as const,
    pricePaise: 799_00, // ₹799
    durationDays: 90,
    features: [
      'Book up to 20 companions/quarter',
      'Access all categories',
      'In-app messaging (after booking)',
      'Priority support',
      'Early access to new features',
    ],
    bookingLimit: 20,
    isActive: true,
  },
];

async function seedPlans(): Promise<void> {
  console.log('\n💳  Seeding subscription plans…');
  let created = 0;
  let skipped = 0;

  for (const plan of PLANS) {
    const result = await Plan.findOneAndUpdate(
      { name: plan.name, audience: plan.audience },
      { $setOnInsert: plan },
      { upsert: true, new: false },
    );

    if (result === null) {
      console.log(`  ✅  Created: ${plan.name}`);
      created++;
    } else {
      console.log(`  ⏭️   Skipped (exists): ${plan.name}`);
      skipped++;
    }
  }

  console.log(`  → ${created} created, ${skipped} skipped`);
}

async function main() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in .env');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  await seedPlans();
  
  process.exit(0);
}

main().catch(console.error);
