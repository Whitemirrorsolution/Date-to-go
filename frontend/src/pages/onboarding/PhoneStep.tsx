import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Smartphone, ArrowRight, Loader2, MessageSquare } from 'lucide-react';
import { api } from '../../services/api.js';

interface PhoneStepProps {
  onSuccess: (phone: string) => void;
  initialPhone?: string;
}

export const PhoneStep: React.FC<PhoneStepProps> = ({ onSuccess, initialPhone = '' }) => {
  const [phone, setPhone] = useState(initialPhone.replace(/\D/g, '').slice(-10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanNumber = phone.replace(/\D/g, '');
  const isValid = cleanNumber.length === 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    setError(null);

    const fullPhone = `+91${cleanNumber}`;

    try {
      // Call trunk OTP endpoint
      await api.post('/auth/trunk/otp/request', { phone: fullPhone });
      onSuccess(fullPhone);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to send OTP. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex flex-col space-y-6"
    >
      <div className="space-y-2 text-center sm:text-left">
        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto sm:mx-0 shadow-sm">
          <Smartphone size={24} />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Enter Mobile Number
        </h2>
        <p className="text-sm text-slate-500">
          We'll send a 6-digit OTP code to instantly verify your identity.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Mobile Number (India)
          </label>
          <div className="relative flex items-center">
            {/* Country code prefix */}
            <div className="absolute left-3.5 flex items-center gap-1.5 text-slate-700 font-bold text-sm bg-slate-100/80 px-2.5 py-1.5 rounded-xl border border-slate-200/60 select-none">
              <span>🇮🇳</span>
              <span>+91</span>
            </div>
            <input
              type="tel"
              inputMode="numeric"
              autoFocus
              value={phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setPhone(val);
                if (error) setError(null);
              }}
              placeholder="98765 43210"
              className="w-full h-14 pl-26 pr-4 rounded-2xl bg-white border border-slate-200 text-slate-900 font-bold text-lg tracking-wide placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 shadow-sm transition-all"
            />
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200/80 text-red-600 text-xs font-semibold leading-relaxed">
            {error}
          </div>
        )}

        {/* WhatsApp & SMS info */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-emerald-800 text-xs font-medium">
          <MessageSquare size={16} className="text-emerald-600 shrink-0" />
          <span>Instant verification available via WhatsApp and SMS.</span>
        </div>

        <button
          type="submit"
          disabled={!isValid || loading}
          className="w-full h-13 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-bold text-base shadow-lg shadow-pink-500/25 hover:opacity-95 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Sending Code...</span>
            </>
          ) : (
            <>
              <span>Send Verification Code</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
};
