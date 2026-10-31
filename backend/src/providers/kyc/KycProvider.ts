/**
 * KycProvider interface.
 * All KYC providers must return an opaque providerRefId (session ID) only.
 * NEVER store Aadhaar numbers or raw ID images in our DB.
 */
export interface KycSessionResult {
  /** Opaque session/request ID from the KYC provider */
  providerRefId: string;
  /** URL to redirect the user to for completing KYC on the provider's side */
  redirectUrl?: string;
}

export interface KycProvider {
  /** Initiate a KYC session for the given user */
  startSession(userId: string): Promise<KycSessionResult>;
  /** Verify a webhook/callback payload — returns the updated KYC status */
  handleWebhook(payload: unknown): Promise<{
    providerRefId: string;
    status: 'VERIFIED' | 'REJECTED';
    rejectionReason?: string;
  }>;
}
