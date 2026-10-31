/**
 * Model validation tests.
 * These tests use Mongoose's built-in validate() to verify schema constraints
 * WITHOUT connecting to a real MongoDB instance.
 */
import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
import { PartnerProfile } from '../src/models/PartnerProfile.js';
import { Category } from '../src/models/Category.js';
import { Plan } from '../src/models/Plan.js';
import { Booking } from '../src/models/Booking.js';
import { Review } from '../src/models/Review.js';
import { Message } from '../src/models/Message.js';
import { Report } from '../src/models/Report.js';
import { Block } from '../src/models/Block.js';
import { Payment } from '../src/models/Payment.js';
import { Subscription } from '../src/models/Subscription.js';
import { ConsentLog } from '../src/models/ConsentLog.js';
import { Notification } from '../src/models/Notification.js';
import { AuditLog } from '../src/models/AuditLog.js';

// Helper to make a valid ObjectId
const oid = () => new mongoose.Types.ObjectId();

// Helper that runs Mongoose validateSync and expects validation to pass
async function expectValid(doc: mongoose.Document): Promise<void> {
  const err = doc.validateSync();
  expect(err, `Expected no validation error but got: ${JSON.stringify(err?.errors)}`).toBeUndefined();
}

// Helper that runs Mongoose validateSync and expects a specific field error
async function expectInvalid(doc: mongoose.Document, field: string): Promise<void> {
  const err = doc.validateSync();
  expect(err, `Expected validation error on '${field}' but got none`).toBeDefined();
  expect(err?.errors[field], `Expected error on field '${field}'`).toBeDefined();
}

// ── User ───────────────────────────────────────────────────────────────────

describe('User model validation', () => {
  const validUserData = () => ({
    role: 'USER' as const,
    email: 'test@example.com',
    passwordHash: 'hashed',
    gender: 'MALE' as const,
    dob: new Date('1995-06-15'),
    city: 'Mumbai',
  });

  it('should pass with valid data', async () => {
    const doc = new User(validUserData());
    await expectValid(doc);
  });

  it('should default status to PENDING', () => {
    const doc = new User(validUserData());
    expect(doc.status).toBe('PENDING');
  });

  it('should default emailVerified to false', () => {
    const doc = new User(validUserData());
    expect(doc.emailVerified).toBe(false);
  });

  it('should default kycStatus to NOT_STARTED', () => {
    const doc = new User(validUserData());
    expect(doc.kycStatus).toBe('NOT_STARTED');
  });

  it('should default tokenVersion to 0', () => {
    const doc = new User(validUserData());
    expect(doc.tokenVersion).toBe(0);
  });

  it('should fail when email is missing', async () => {
    const data = validUserData();
    const doc = new User({ ...data, email: undefined });
    await expectInvalid(doc, 'email');
  });

  it('should fail when email format is invalid', async () => {
    const doc = new User({ ...validUserData(), email: 'not-an-email' });
    await expectInvalid(doc, 'email');
  });

  it('should fail when role is invalid', async () => {
    const doc = new User({ ...validUserData(), role: 'SUPERUSER' });
    await expectInvalid(doc, 'role');
  });

  it('should fail when gender is missing', async () => {
    const data = validUserData();
    const doc = new User({ ...data, gender: undefined });
    await expectInvalid(doc, 'gender');
  });

  it('should fail when dob is missing', async () => {
    const data = validUserData();
    const doc = new User({ ...data, dob: undefined });
    await expectInvalid(doc, 'dob');
  });

  it('should fail when city is missing', async () => {
    const data = validUserData();
    const doc = new User({ ...data, city: undefined });
    await expectInvalid(doc, 'city');
  });

  it('should fail with invalid phone format', async () => {
    const doc = new User({ ...validUserData(), phone: 'abc123' });
    await expectInvalid(doc, 'phone');
  });

  it('should accept valid phone number', async () => {
    const doc = new User({ ...validUserData(), phone: '+919876543210' });
    await expectValid(doc);
  });

  it('should accept valid emergency contact', async () => {
    const doc = new User({
      ...validUserData(),
      emergencyContact: { name: 'Jane Doe', phone: '+911234567890' },
    });
    await expectValid(doc);
  });

  it('should fail with invalid emergency contact phone', async () => {
    const doc = new User({
      ...validUserData(),
      emergencyContact: { name: 'Jane', phone: 'bad-phone' },
    });
    await expectInvalid(doc, 'emergencyContact.phone');
  });
});

// ── PartnerProfile ─────────────────────────────────────────────────────────

describe('PartnerProfile model validation', () => {
  const validData = () => ({
    userId: oid(),
    displayName: 'Test Partner',
    bio: 'I love helping people explore the city.',
    city: 'Delhi',
    hourlyRatePaise: 50000,
  });

  it('should pass with valid data', async () => {
    const doc = new PartnerProfile(validData());
    await expectValid(doc);
  });

  it('should default approvalStatus to DRAFT', () => {
    const doc = new PartnerProfile(validData());
    expect(doc.approvalStatus).toBe('DRAFT');
  });

  it('should default isListed to false', () => {
    const doc = new PartnerProfile(validData());
    expect(doc.isListed).toBe(false);
  });

  it('should fail when displayName is missing', async () => {
    const doc = new PartnerProfile({ ...validData(), displayName: undefined });
    await expectInvalid(doc, 'displayName');
  });

  it('should fail when hourlyRatePaise is negative', async () => {
    const doc = new PartnerProfile({ ...validData(), hourlyRatePaise: -100 });
    await expectInvalid(doc, 'hourlyRatePaise');
  });

  it('should fail with invalid approvalStatus', async () => {
    const doc = new PartnerProfile({ ...validData(), approvalStatus: 'INVALID' });
    await expectInvalid(doc, 'approvalStatus');
  });

  it('should reject weekly slot with invalid day', async () => {
    const doc = new PartnerProfile({
      ...validData(),
      availability: {
        weeklySlots: [{ day: 7, startMinute: 540, endMinute: 600 }],
        blockedDates: [],
      },
    });
    await expectInvalid(doc, 'availability.weeklySlots.0.day');
  });
});

// ── Category ───────────────────────────────────────────────────────────────

describe('Category model validation', () => {
  it('should pass with valid data', async () => {
    const doc = new Category({ name: 'City Tour', slug: 'city-tour', description: 'Explore.' });
    await expectValid(doc);
  });

  it('should fail when name is missing', async () => {
    const doc = new Category({ slug: 'test', description: 'Desc' });
    await expectInvalid(doc, 'name');
  });

  it('should auto-lowercase the slug (Mongoose lowercase:true transforms before validation)', () => {
    // Mongoose's `lowercase: true` transforms the value before the validator runs,
    // so uppercase input is silently coerced — the slug stored will be lowercase.
    const doc = new Category({ name: 'Test', slug: 'City-Tour', description: 'Desc' });
    expect(doc.slug).toBe('city-tour'); // transformed, not rejected
    const err = doc.validateSync();
    expect(err).toBeUndefined(); // passes because slug is now 'city-tour'
  });

  it('should fail when slug has spaces', async () => {
    const doc = new Category({ name: 'Test', slug: 'city tour', description: 'Desc' });
    await expectInvalid(doc, 'slug');
  });

  it('should default isActive to true', () => {
    const doc = new Category({ name: 'X', slug: 'x', description: 'Y' });
    expect(doc.isActive).toBe(true);
  });
});

// ── Plan ───────────────────────────────────────────────────────────────────

describe('Plan model validation', () => {
  const validData = () => ({
    name: 'Partner Monthly',
    audience: 'PARTNER' as const,
    pricePaise: 19900,
    durationDays: 30,
    bookingLimit: 10,
  });

  it('should pass with valid data', async () => {
    const doc = new Plan(validData());
    await expectValid(doc);
  });

  it('should fail with invalid audience', async () => {
    const doc = new Plan({ ...validData(), audience: 'GUEST' });
    await expectInvalid(doc, 'audience');
  });

  it('should fail with negative price', async () => {
    const doc = new Plan({ ...validData(), pricePaise: -1 });
    await expectInvalid(doc, 'pricePaise');
  });

  it('should fail when durationDays < 1', async () => {
    const doc = new Plan({ ...validData(), durationDays: 0 });
    await expectInvalid(doc, 'durationDays');
  });
});

// ── Booking ────────────────────────────────────────────────────────────────

describe('Booking model validation', () => {
  const validData = () => ({
    userId: oid(),
    partnerId: oid(),
    categoryId: oid(),
    startAt: new Date('2025-01-01T10:00:00Z'),
    endAt: new Date('2025-01-01T12:00:00Z'),
    amountPaise: 100000,
    platformFeePaise: 10000,
    meetingPlace: 'Cafe Coffee Day, Bandra West',
  });

  it('should pass with valid data', async () => {
    const doc = new Booking(validData());
    await expectValid(doc);
  });

  it('should default status to REQUESTED', () => {
    const doc = new Booking(validData());
    expect(doc.status).toBe('REQUESTED');
  });

  it('should fail when meetingPlace is missing', async () => {
    const doc = new Booking({ ...validData(), meetingPlace: undefined });
    await expectInvalid(doc, 'meetingPlace');
  });

  it('should fail with invalid status', async () => {
    const doc = new Booking({ ...validData(), status: 'PENDING' });
    await expectInvalid(doc, 'status');
  });
});

// ── Review ─────────────────────────────────────────────────────────────────

describe('Review model validation', () => {
  const validData = () => ({
    bookingId: oid(),
    fromUserId: oid(),
    toUserId: oid(),
    rating: 5 as const,
  });

  it('should pass with valid data', async () => {
    const doc = new Review(validData());
    await expectValid(doc);
  });

  it('should fail when rating < 1', async () => {
    const doc = new Review({ ...validData(), rating: 0 });
    await expectInvalid(doc, 'rating');
  });

  it('should fail when rating > 5', async () => {
    const doc = new Review({ ...validData(), rating: 6 });
    await expectInvalid(doc, 'rating');
  });
});

// ── Message ────────────────────────────────────────────────────────────────

describe('Message model validation', () => {
  it('should pass with valid data', async () => {
    const doc = new Message({ bookingId: oid(), senderId: oid(), text: 'Hello!' });
    await expectValid(doc);
  });

  it('should fail when text is missing', async () => {
    const doc = new Message({ bookingId: oid(), senderId: oid() });
    await expectInvalid(doc, 'text');
  });

  it('should default flagged to false', () => {
    const doc = new Message({ bookingId: oid(), senderId: oid(), text: 'Hi' });
    expect(doc.flagged).toBe(false);
  });
});

// ── Report ─────────────────────────────────────────────────────────────────

describe('Report model validation', () => {
  const validData = () => ({
    reporterId: oid(),
    targetUserId: oid(),
    reason: 'Inappropriate behaviour',
    details: 'The user said something offensive during our meeting.',
  });

  it('should pass with valid data', async () => {
    const doc = new Report(validData());
    await expectValid(doc);
  });

  it('should default status to OPEN', () => {
    const doc = new Report(validData());
    expect(doc.status).toBe('OPEN');
  });

  it('should fail when reason is missing', async () => {
    const doc = new Report({ ...validData(), reason: undefined });
    await expectInvalid(doc, 'reason');
  });
});

// ── Block ──────────────────────────────────────────────────────────────────

describe('Block model validation', () => {
  it('should pass with valid data', async () => {
    const doc = new Block({ userId: oid(), blockedUserId: oid() });
    await expectValid(doc);
  });

  it('should fail when userId is missing', async () => {
    const doc = new Block({ blockedUserId: oid() });
    await expectInvalid(doc, 'userId');
  });
});

// ── Payment ────────────────────────────────────────────────────────────────

describe('Payment model validation', () => {
  const validData = () => ({
    userId: oid(),
    purpose: 'PLAN' as const,
    razorpayOrderId: 'order_test123',
    amountPaise: 19900,
  });

  it('should pass with valid data', async () => {
    const doc = new Payment(validData());
    await expectValid(doc);
  });

  it('should default status to CREATED', () => {
    const doc = new Payment(validData());
    expect(doc.status).toBe('CREATED');
  });

  it('should fail with invalid purpose', async () => {
    const doc = new Payment({ ...validData(), purpose: 'GIFT' });
    await expectInvalid(doc, 'purpose');
  });
});

// ── ConsentLog ─────────────────────────────────────────────────────────────

describe('ConsentLog model validation', () => {
  it('should pass with valid data', async () => {
    const doc = new ConsentLog({
      userId: oid(),
      documentType: 'TERMS',
      version: '1.0',
      acceptedAt: new Date(),
    });
    await expectValid(doc);
  });

  it('should fail with invalid documentType', async () => {
    const doc = new ConsentLog({
      userId: oid(),
      documentType: 'COOKIE',
      version: '1.0',
      acceptedAt: new Date(),
    });
    await expectInvalid(doc, 'documentType');
  });
});

// ── Notification ───────────────────────────────────────────────────────────

describe('Notification model validation', () => {
  it('should pass with valid data', async () => {
    const doc = new Notification({
      userId: oid(),
      type: 'BOOKING_ACCEPTED',
      title: 'Booking Confirmed',
      body: 'Your booking has been accepted.',
    });
    await expectValid(doc);
  });

  it('should fail when title is missing', async () => {
    const doc = new Notification({
      userId: oid(),
      type: 'BOOKING_ACCEPTED',
      body: 'Body text',
    });
    await expectInvalid(doc, 'title');
  });
});

// ── AuditLog ───────────────────────────────────────────────────────────────

describe('AuditLog model validation', () => {
  it('should pass with valid data', async () => {
    const doc = new AuditLog({
      actorId: oid(),
      action: 'USER_SUSPENDED',
      entityType: 'User',
      entityId: oid(),
      ip: '127.0.0.1',
    });
    await expectValid(doc);
  });

  it('should fail when action is missing', async () => {
    const doc = new AuditLog({ actorId: oid(), entityType: 'User' });
    await expectInvalid(doc, 'action');
  });
});

// ── Subscription ───────────────────────────────────────────────────────────

describe('Subscription model validation', () => {
  it('should pass with valid data', async () => {
    const doc = new Subscription({
      userId: oid(),
      planId: oid(),
      paymentId: oid(),
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await expectValid(doc);
  });

  it('should default status to ACTIVE', () => {
    const doc = new Subscription({
      userId: oid(),
      planId: oid(),
      paymentId: oid(),
      startsAt: new Date(),
      endsAt: new Date(),
    });
    expect(doc.status).toBe('ACTIVE');
  });

  it('should fail with invalid status', async () => {
    const doc = new Subscription({
      userId: oid(),
      planId: oid(),
      paymentId: oid(),
      startsAt: new Date(),
      endsAt: new Date(),
      status: 'PENDING',
    });
    await expectInvalid(doc, 'status');
  });
});
