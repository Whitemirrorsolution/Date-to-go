import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger.js';
import type { KycProvider, KycSessionResult } from './KycProvider.js';
import { CLIENT_URL } from '../../config/index.js';

/**
 * Mock KYC provider for development and testing.
 * Always returns VERIFIED after a simulated delay.
 * Webhook simulation: POST /api/v1/kyc/webhook with { providerRefId, status }
 */
export class MockKycProvider implements KycProvider {
  async startSession(userId: string): Promise<KycSessionResult> {
    const providerRefId = `mock_kyc_${uuidv4()}`;
    logger.info({ userId, providerRefId }, '[MOCK KYC] Session started');
    return {
      providerRefId,
      // In dev, the "redirect" just goes to the KYC status page
      redirectUrl: `${CLIENT_URL}/kyc/mock-complete?ref=${providerRefId}`,
    };
  }

  async handleWebhook(payload: unknown): Promise<{
    providerRefId: string;
    status: 'VERIFIED' | 'REJECTED';
    rejectionReason?: string;
  }> {
    const p = payload as { providerRefId?: string; status?: string };
    const providerRefId = p.providerRefId ?? 'unknown';
    const status = p.status === 'REJECTED' ? 'REJECTED' : 'VERIFIED';
    logger.info({ providerRefId, status }, '[MOCK KYC] Webhook received');
    return { providerRefId, status };
  }
}
