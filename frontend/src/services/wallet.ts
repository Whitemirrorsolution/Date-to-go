import { api } from './api.js';

export interface WalletLedgerEntry {
  _id: string;
  type: 'CREDIT' | 'DEBIT' | 'REFUND' | 'ADJUSTMENT';
  amountPaise: number;
  balanceAfterPaise: number;
  reason: string;
  refType: string;
  refId?: string;
  createdAt: string;
}

export const walletApi = {
  async getBalance(): Promise<number> {
    const res = await api.get<{ balancePaise: number }>('/wallet');
    return res.data?.balancePaise || 0;
  },

  async getLedger(limit = 50, skip = 0): Promise<{ records: WalletLedgerEntry[]; total: number }> {
    const res = await api.get<{ records: WalletLedgerEntry[]; total: number }>(`/wallet/ledger?limit=${limit}&skip=${skip}`);
    return res.data || { records: [], total: 0 };
  },

  async createTopupOrder(amountPaise: number): Promise<{ id: string; amount: number; currency: string }> {
    const res = await api.post<{ id: string; amount: number; currency: string }>('/wallet/topup/order', { amountPaise });
    return res.data!;
  },

  async verifyTopup(paymentId: string, orderId: string, signature: string, amountPaise: number): Promise<void> {
    await api.post('/wallet/topup/verify', { paymentId, orderId, signature, amountPaise });
  },
};
