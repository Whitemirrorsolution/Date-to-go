import { logger } from '../../utils/logger.js';
import type { KycProvider, KycSessionResult } from './KycProvider.js';

/**
 * DigiLocker KYC provider stub.
 * Implement using DigiLocker Partner API or a bridge service like Digio/Signzy.
 *
 * IMPORTANT: Only store the session/request reference ID (providerRefId).
 * NEVER store Aadhaar numbers, document images, or XML responses in our DB.
 *
 * Docs: https://partners.digitallocker.gov.in
 */
export class DigiLockerKycProvider implements KycProvider {
  async startSession(userId: string): Promise<KycSessionResult> {
    logger.warn({ userId }, '[STUB] DigiLockerKycProvider.startSession not implemented');
    throw new Error('DigiLockerKycProvider is a stub — implement before going to production');
  }

  async handleWebhook(_payload: unknown): Promise<{
    providerRefId: string;
    status: 'VERIFIED' | 'REJECTED';
    rejectionReason?: string;
  }> {
    logger.warn({}, '[STUB] DigiLockerKycProvider.handleWebhook not implemented');
    throw new Error('DigiLockerKycProvider is a stub — implement before going to production');
  }
}
