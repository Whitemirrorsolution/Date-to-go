/**
 * Provider factory — resolves concrete implementations based on env vars.
 * Import provider singletons from here throughout the app.
 */
import { env } from '../config/env.js';
import type { EmailProvider } from './email/EmailProvider.js';
import type { SmsProvider } from './sms/SmsProvider.js';
import type { KycProvider } from './kyc/KycProvider.js';
import { ConsoleEmailProvider } from './email/ConsoleEmailProvider.js';
import { ResendEmailProvider } from './email/ResendEmailProvider.js';
import { ConsoleSmsProvider } from './sms/ConsoleSmsProvider.js';
import { MSG91SmsProvider } from './sms/MSG91SmsProvider.js';
import { WhatsappSmsProvider } from './sms/WhatsappSmsProvider.js';
import { MockKycProvider } from './kyc/MockKycProvider.js';
import { DigiLockerKycProvider } from './kyc/DigiLockerKycProvider.js';

function buildEmailProvider(): EmailProvider {
  switch (env.EMAIL_PROVIDER) {
    case 'resend':
    case 'ses':
      return new ResendEmailProvider();
    default:
      return new ConsoleEmailProvider();
  }
}

function buildSmsProvider(): SmsProvider {
  switch (env.SMS_PROVIDER) {
    case 'whatsapp':
      return new WhatsappSmsProvider();
    case 'msg91':
    case 'twilio':
      return new MSG91SmsProvider();
    default:
      return new ConsoleSmsProvider();
  }
}

function buildKycProvider(): KycProvider {
  switch (env.KYC_PROVIDER) {
    case 'digilocker':
    case 'digio':
    case 'signzy':
      return new DigiLockerKycProvider();
    default:
      return new MockKycProvider();
  }
}

// Singletons
export const emailProvider: EmailProvider = buildEmailProvider();
export const smsProvider: SmsProvider = buildSmsProvider();
export const kycProvider: KycProvider = buildKycProvider();
