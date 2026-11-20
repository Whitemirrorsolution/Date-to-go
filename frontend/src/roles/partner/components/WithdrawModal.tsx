import React, { useState, useEffect } from 'react';
import { X, Building, Smartphone, CheckCircle2, AlertCircle, Loader2, IndianRupee, ShieldCheck } from 'lucide-react';
import { api } from '../../../services/api.js';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletBalancePaise: number;
  onSuccess: () => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  walletBalancePaise,
  onSuccess,
}) => {
  const [method, setMethod] = useState<'BANK_ACCOUNT' | 'UPI'>('UPI');
  const [amountRupees, setAmountRupees] = useState<string>('');
  
  // Bank fields
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [ifsc, setIfsc] = useState('');

  // UPI fields
  const [upiId, setUpiId] = useState('');
  const [upiHolderName, setUpiHolderName] = useState('');

  const [saveAsDefault, setSaveAsDefault] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const availableRupees = Math.max(0, walletBalancePaise / 100);

  // Load saved payout settings on mount
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      loadSavedSettings();
    }
  }, [isOpen]);

  const loadSavedSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await api.get<any>('/partner/payout-settings');
      if (res.data) {
        const d = res.data;
        if (d.method) setMethod(d.method);
        if (d.accountName) {
          setAccountHolderName(d.accountName);
          setUpiHolderName(d.accountName);
        }
        if (d.accountNumber) {
          setAccountNumber(d.accountNumber);
          setConfirmAccountNumber(d.accountNumber);
        }
        if (d.bankName) setBankName(d.bankName);
        if (d.ifsc) setIfsc(d.ifsc);
        if (d.upiId) setUpiId(d.upiId);
      }
    } catch {
      // Non-blocking
    } finally {
      setLoadingSettings(false);
    }
  };

  if (!isOpen) return null;

  const handleAmountSelect = (val: number) => {
    const finalVal = Math.min(val, availableRupees);
    setAmountRupees(String(Math.floor(finalVal)));
    if (error) setError(null);
  };

  const handleAllBalance = () => {
    setAmountRupees(String(Math.floor(availableRupees)));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amt = parseFloat(amountRupees);
    if (!amt || isNaN(amt) || amt < 100) {
      setError('Minimum withdrawal amount is ₹100.');
      return;
    }
    if (amt > availableRupees) {
      setError(`Amount exceeds your available balance of ₹${availableRupees.toFixed(2)}.`);
      return;
    }

    if (method === 'UPI') {
      if (!upiId.trim() || !upiId.includes('@')) {
        setError('Please enter a valid UPI ID (e.g. username@okhdfcbank or 9876543210@paytm).');
        return;
      }
    } else {
      if (!accountHolderName.trim()) {
        setError('Please enter Account Holder Name.');
        return;
      }
      if (!accountNumber.trim()) {
        setError('Please enter Bank Account Number.');
        return;
      }
      if (accountNumber !== confirmAccountNumber) {
        setError('Bank Account numbers do not match.');
        return;
      }
      if (!ifsc.trim() || ifsc.trim().length < 8) {
        setError('Please enter a valid Bank IFSC code.');
        return;
      }
    }

    setLoading(true);
    try {
      const payload: any = {
        amountPaise: Math.round(amt * 100),
        method,
        saveAsDefault,
        bankDetails: {
          accountHolderName: method === 'BANK_ACCOUNT' ? accountHolderName.trim() : upiHolderName.trim(),
          accountNumber: method === 'BANK_ACCOUNT' ? accountNumber.trim() : undefined,
          bankName: method === 'BANK_ACCOUNT' ? bankName.trim() : undefined,
          ifsc: method === 'BANK_ACCOUNT' ? ifsc.trim().toUpperCase() : undefined,
          upiId: method === 'UPI' ? upiId.trim() : undefined,
        },
      };

      await api.post('/partner/payouts', payload);
      setSuccessMsg(`Withdrawal request of ₹${amt.toFixed(0)} submitted successfully!`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit withdrawal request.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface border border-borderLight w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-borderLight flex items-center justify-between bg-bg/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <IndianRupee size={22} />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-textMain">Withdraw Earnings</h2>
              <p className="text-xs text-muted font-medium">Safe & direct transfer to your Bank or UPI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted hover:text-textMain hover:bg-borderLight/40 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="p-5 md:p-6 overflow-y-auto space-y-5">
          {/* Available Balance Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-300 font-bold">Available to Withdraw</p>
              <p className="text-2xl md:text-3xl font-black mt-0.5">₹{availableRupees.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
                <ShieldCheck size={14} /> Instant Ledger
              </span>
            </div>
          </div>

          {loadingSettings && (
            <div className="text-xs text-muted flex items-center gap-1.5 py-1">
              <Loader2 size={13} className="animate-spin text-primary" /> Loading saved payout details...
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Withdrawal Amount (₹) <span className="text-failed-text">*</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 font-black text-lg text-textMain">₹</span>
              <input
                type="number"
                min="100"
                max={availableRupees}
                step="1"
                placeholder="0.00"
                value={amountRupees}
                onChange={(e) => {
                  setAmountRupees(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full h-13 pl-9 pr-4 rounded-2xl bg-bg border border-borderLight text-textMain font-black text-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            {/* Quick Chips */}
            <div className="flex gap-2 mt-2 flex-wrap">
              {[500, 1000, 2000, 5000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleAmountSelect(val)}
                  disabled={val > availableRupees}
                  className="px-3 py-1 rounded-xl text-xs font-bold bg-bg border border-borderLight text-textMain hover:border-primary hover:text-primary active:scale-95 disabled:opacity-40 transition-all"
                >
                  ₹{val}
                </button>
              ))}
              <button
                type="button"
                onClick={handleAllBalance}
                disabled={availableRupees < 100}
                className="px-3 py-1 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white active:scale-95 disabled:opacity-40 transition-all ml-auto"
              >
                Max Balance
              </button>
            </div>
          </div>

          {/* Method Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Payout Destination Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setMethod('UPI');
                  if (error) setError(null);
                }}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all text-left ${
                  method === 'UPI'
                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                    : 'border-borderLight bg-surface text-muted hover:border-slate-300'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${method === 'UPI' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Smartphone size={18} />
                </div>
                <div>
                  <p className="font-bold text-sm text-textMain leading-tight">Instant UPI</p>
                  <p className="text-[11px] text-muted">GPay, PhonePe, Paytm</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMethod('BANK_ACCOUNT');
                  if (error) setError(null);
                }}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all text-left ${
                  method === 'BANK_ACCOUNT'
                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                    : 'border-borderLight bg-surface text-muted hover:border-slate-300'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${method === 'BANK_ACCOUNT' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Building size={18} />
                </div>
                <div>
                  <p className="font-bold text-sm text-textMain leading-tight">Bank Transfer</p>
                  <p className="text-[11px] text-muted">NEFT / IMPS Account</p>
                </div>
              </button>
            </div>
          </div>

          {/* Method-specific Form Fields */}
          {method === 'UPI' ? (
            <div className="space-y-3.5 p-4 rounded-2xl bg-bg/60 border border-borderLight">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  UPI ID (VPA) <span className="text-failed-text">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210@paytm or user@okaxis"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-surface border border-borderLight text-textMain font-medium text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Registered Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Beneficiary Name as on UPI"
                  value={upiHolderName}
                  onChange={(e) => setUpiHolderName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-surface border border-borderLight text-textMain font-medium text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-4 rounded-2xl bg-bg/60 border border-borderLight">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Account Holder Name <span className="text-failed-text">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Name as per Bank Passbook"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-surface border border-borderLight text-textMain font-medium text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Account Number <span className="text-failed-text">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Enter Account Number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-surface border border-borderLight text-textMain font-medium text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Confirm Account Number <span className="text-failed-text">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Re-enter Account Number"
                    value={confirmAccountNumber}
                    onChange={(e) => setConfirmAccountNumber(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-surface border border-borderLight text-textMain font-medium text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bank Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank, SBI"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-surface border border-borderLight text-textMain font-medium text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    IFSC Code <span className="text-failed-text">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    placeholder="e.g. HDFC0001234"
                    value={ifsc}
                    onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                    className="w-full h-11 px-3.5 rounded-xl bg-surface border border-borderLight text-textMain font-medium text-sm uppercase tracking-wide focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Save as default checkbox */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={saveAsDefault}
              onChange={(e) => setSaveAsDefault(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-borderLight"
            />
            <span className="text-xs text-muted font-medium">Save these details as my default payout destination</span>
          </label>

          {/* Breakdown / Fee */}
          <div className="p-3 rounded-xl bg-surface border border-borderLight space-y-1 text-xs">
            <div className="flex justify-between text-muted">
              <span>Withdrawal Amount:</span>
              <span className="font-bold text-textMain">₹{amountRupees ? parseFloat(amountRupees || '0').toFixed(2) : '0.00'}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Transfer Fee:</span>
              <span className="font-bold text-emerald-600">FREE (₹0.00)</span>
            </div>
            <div className="flex justify-between border-t border-borderLight pt-1.5 font-bold text-textMain text-sm">
              <span>Net to be Transferred:</span>
              <span className="text-primary font-black">₹{amountRupees ? parseFloat(amountRupees || '0').toFixed(2) : '0.00'}</span>
            </div>
          </div>

          {/* Error / Success Alerts */}
          {error && (
            <div className="p-3.5 rounded-xl bg-failed-bg/30 border border-failed-bg text-failed-text text-xs font-semibold flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || availableRupees < 100 || !amountRupees || parseFloat(amountRupees) < 100}
              className="w-full h-14 rounded-2xl bg-primary text-white font-black text-base shadow-lg shadow-primary/25 hover:opacity-95 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <span>Request ₹{amountRupees ? parseFloat(amountRupees || '0').toFixed(0) : '0'} Withdrawal</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-muted text-center mt-2.5">
              Payout requests are reviewed and processed securely into your verified account.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
