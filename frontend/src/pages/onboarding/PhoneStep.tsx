import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Smartphone, ArrowRight, Loader2, MessageSquare, CheckCircle2, X } from 'lucide-react';
import { api } from '../../services/api.js';

interface PhoneStepProps {
  onSuccess: (phone: string) => void;
  initialPhone?: string;
}

export const PhoneStep: React.FC<PhoneStepProps> = ({ onSuccess, initialPhone = '' }) => {
  const sanitizeDigits = (raw: string) => {
    let digits = raw.replace(/\D/g, '');
    // If user enters/pastes +91... or 91... (12+ digits)
    if (digits.length >= 12 && digits.startsWith('91')) {
      digits = digits.slice(2);
    } else if (digits.length === 11 && digits.startsWith('0')) {
      // Leading zero
      digits = digits.slice(1);
    } else if (digits.length > 10 && digits.startsWith('91')) {
      digits = digits.slice(2);
    }
    return digits.slice(0, 10);
  };

  const [phone, setPhone] = useState(sanitizeDigits(initialPhone));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanNumber = phone.replace(/\D/g, '');
  const isComplete = cleanNumber.length === 10;
  const startsValid = cleanNumber.length === 0 || /^[6-9]/.test(cleanNumber);
  const isValid = isComplete && /^[6-9]\d{9}$/.test(cleanNumber);

  // Formats 9876543210 -> "98765 43210" for readable display
  const formatDisplay = (digits: string) => {
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = sanitizeDigits(e.target.value);
    setPhone(digits);
    if (error) setError(null);
  };

  const handleClear = () => {
    setPhone('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!/^[6-9]/.test(cleanNumber)) {
      setError('Mobile number should start with 6, 7, 8, or 9.');
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
      className="flex flex-col space-y-5 sm:space-y-6 w-full max-w-md mx-auto my-auto py-2"
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
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Mobile Number (India)
            </label>
            <span className="text-xs font-semibold text-slate-400">
              {cleanNumber.length}/10 digits
            </span>
          </div>

          <div className="relative flex items-center">
            {/* Country code prefix */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-800 font-bold text-sm bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 select-none z-10 pointer-events-none">
              <span className="text-base leading-none">🇮🇳</span>
              <span>+91</span>
            </div>

            {/* Input field with guaranteed padding to never overlap badge */}
            <input
              type="tel"
              inputMode="numeric"
              autoFocus
              value={formatDisplay(phone)}
              onChange={handleInputChange}
              placeholder="98765 43210"
              style={{ paddingLeft: '96px' }}
              className={`w-full h-14 pr-12 rounded-2xl bg-white border ${
                error
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                  : isValid
                  ? 'border-emerald-400 focus:border-emerald-500 focus:ring-emerald-100'
                  : 'border-slate-200 focus:border-purple-500 focus:ring-purple-100'
              } text-slate-900 font-bold text-lg tracking-wide placeholder:text-slate-300 placeholder:font-normal focus:outline-none focus:ring-4 shadow-sm transition-all`}
            />

            {/* Right action / status icon */}
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {isValid && (
                <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
              )}
              {phone.length > 0 && !loading && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  aria-label="Clear number"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {!startsValid && cleanNumber.length > 0 && (
            <p className="text-xs text-amber-600 font-medium mt-1.5 pl-1">
              Note: Indian mobile numbers typically start with 6, 7, 8, or 9.
            </p>
          )}
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
