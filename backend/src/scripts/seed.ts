/**
 * Seed Script – Date to Go
 * ──────────────────────────────────────────────────────────────────────────
 * Usage: npm run seed
 *
 * Creates:
 *  - 8 default categories
 *  - 4 subscription plans (Partner: monthly/quarterly, User: monthly/quarterly)
 *  - 1 ADMIN user (from ADMIN_EMAIL / ADMIN_PASSWORD env vars)
 *
 * Safe to run repeatedly: uses upsert logic so existing data is not duplicated.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import argon2 from 'argon2';
import { Category, DEFAULT_CATEGORIES } from '../models/Category.js';
import { Plan } from '../models/Plan.js';
import { User } from '../models/User.js';
import { CompanySettings } from '../models/CompanySettings.js';
import { Page } from '../models/Page.js';


// ── Validate critical env vars ─────────────────────────────────────────────

const MONGODB_URI = process.env['MONGODB_URI'];
const ADMIN_EMAIL = process.env['ADMIN_EMAIL'];
const ADMIN_PASSWORD = process.env['ADMIN_PASSWORD'];

if (!MONGODB_URI) {
  console.error('❌  MONGODB_URI is not set in .env');
  process.exit(1);
}

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌  ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
  process.exit(1);
}

if (ADMIN_PASSWORD.length < 12) {
  console.error('❌  ADMIN_PASSWORD must be at least 12 characters');
  process.exit(1);
}

// ── Seed data definitions ──────────────────────────────────────────────────

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
    audience: 'SEEKER' as const,
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
    audience: 'SEEKER' as const,
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

// ── Seed helpers ───────────────────────────────────────────────────────────

async function seedCategories(): Promise<void> {
  console.log('\n📂  Seeding categories…');
  let created = 0;
  let skipped = 0;

  for (const cat of DEFAULT_CATEGORIES) {
    const result = await Category.findOneAndUpdate(
      { slug: cat.slug },
      { $setOnInsert: { ...cat, isActive: true } },
      { upsert: true, new: false },
    );

    if (result === null) {
      console.log(`  ✅  Created: ${cat.name}`);
      created++;
    } else {
      console.log(`  ⏭️   Skipped (exists): ${cat.name}`);
      skipped++;
    }
  }

  console.log(`  → ${created} created, ${skipped} skipped`);
}

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

    const price = `₹${plan.pricePaise / 100}`;
    if (result === null) {
      console.log(`  ✅  Created: ${plan.name} (${price})`);
      created++;
    } else {
      console.log(`  ⏭️   Skipped (exists): ${plan.name} (${price})`);
      skipped++;
    }
  }

  console.log(`  → ${created} created, ${skipped} skipped`);
}

async function seedAdminUser(): Promise<void> {
  console.log('\n👤  Seeding admin user…');

  const existing = await User.findOne({ email: ADMIN_EMAIL!.toLowerCase() });

  if (existing) {
    console.log(`  ⏭️   Admin already exists: ${ADMIN_EMAIL}`);
    return;
  }

  const passwordHash = await argon2.hash(ADMIN_PASSWORD!, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  await User.create({
    roles: ['ADMIN'],
    fullName: 'Platform Administrator',
    email: ADMIN_EMAIL!.toLowerCase().trim(),
    passwordHash,
    gender: 'OTHER',
    dob: new Date('1990-01-01'),
    city: 'Mumbai',
    status: 'ACTIVE',
    emailVerified: true,
    kycStatus: 'VERIFIED',
  });

  console.log(`  ✅  Admin user created: ${ADMIN_EMAIL}`);
}

async function seedCmsData(): Promise<void> {
  console.log('\n📄  Seeding CMS (Company Settings, Pages, FAQs)…');

  // Company Settings
  await CompanySettings.findOneAndUpdate(
    {},
    {
      $setOnInsert: {
        legalName: 'Date to Go Experiences Pvt Ltd',
        brandName: 'Date to Go',
        supportEmail: 'support@datetogo.in',
        supportPhone: '1800-000-0000',
        emergencyContacts: [
          { label: 'Police', number: '100', tone: 'danger' },
          { label: 'Women Helpline', number: '1091', tone: 'pink' },
          { label: 'National Emergency', number: '112', tone: 'info' }
        ]
      }
    },
    { upsert: true }
  );
  console.log(`  ✅  CompanySettings verified`);

  // Draft Pages
  const pages = [
    { slug: 'privacy', title: 'Privacy Policy' },
    { slug: 'terms', title: 'Terms of Service' },
    { slug: 'code-of-conduct', title: 'Code of Conduct' },
    { slug: 'refund-policy', title: 'Refund Policy' },
    { slug: 'safety-guidelines', title: 'Safety Guidelines' },
    { slug: 'about', title: 'About Us' }
  ];

  for (const p of pages) {
    const exists = await Page.findOne({ slug: p.slug });
    if (!exists) {
      await Page.create({
        slug: p.slug,
        title: p.title,
        status: 'DRAFT',
        blocks: [{ type: 'paragraph', text: 'This is a draft page pending lawyer review.' }]
      });
    }
  }
  console.log(`  ✅  CMS Pages seeded (DRAFT status)`);
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🌱  Date to Go – Seed Script');
  console.log('────────────────────────────');

  await mongoose.connect(MONGODB_URI!, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 5_000,
  });
  console.log('✅  Connected to MongoDB');

  await seedCategories();
  await seedPlans();
  await seedAdminUser();
  await seedCmsData();

  await mongoose.disconnect();
  console.log('\n✅  Seeding complete. MongoDB disconnected.\n');
}

main().catch((err: unknown) => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});
