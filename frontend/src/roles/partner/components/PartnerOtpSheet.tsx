import React, { useState } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../../services/api.js';

interface PartnerOtpSheetProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  onSuccess?: () => void;
}

export const PartnerOtpSheet: React.FC<PartnerOtpSheetProps> = ({
  isOpen,
  onClose,
  bookingId,
  onSuccess,
}) => {
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (otp.length !== 4) {
      setError('OTP must be 4 digits');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.post<any>(`/bookings/${bookingId}/verify-otp`, { otp });
      if (res.success) {
        setSuccess('OTP verified and escrow released successfully');
        onSuccess?.();
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(res.message || 'Verification failed');
      }
    } catch (e: any) {
      console.error(e);
      setError(e.response?.data?.message || e.message || 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={!submitting ? onClose : undefined}
      />

      {/* Modal Sheet */}
      <div className="fixed z-[101] inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-gradient-to-br from-primary/10 to-surface rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-300">
          {/* Close Button */}
          <button
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-bg hover:bg-borderLight/30 transition"
            onClick={onClose}
            disabled={submitting}
          >
            <X size={20} className="text-textMain" />
          </button>

          <h2 className="text-2xl font-black text-textMain mb-4">Enter Completion OTP</h2>
          <p className="text-sm text-muted mb-6">Enter the 4‑digit PIN shown by the seeker to release escrow.</p>

          {error && (
            <div className="mb-4 p-3 bg-failed-bg/20 border border-failed-text/30 text-failed-text rounded-lg flex items-start gap-2">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-success-bg/20 border border-success-text/30 text-success-text rounded-lg flex items-start gap-2">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <input
            type="text"
            maxLength={4}
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
            className="w-full px-4 py-3 bg-bg border border-borderLight rounded-xl text-center text-2xl font-mono tracking-widest focus:border-primary outline-none transition"
            placeholder="1234"
            disabled={submitting}
          />

          <button
            onClick={handleSubmit}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary/80 disabled:opacity-50 transition"
            disabled={submitting}
          >
            {submitting ? <Loader2 className="animate-spin" size={20} /> : 'Verify OTP'}
          </button>
        </div>
      </div>
    </>
  );
};
