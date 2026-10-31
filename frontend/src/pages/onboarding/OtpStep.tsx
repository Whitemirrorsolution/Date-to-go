import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, CheckCircle2, Loader2, RefreshCw, Pencil } from 'lucide-react';
import { api, setAccessToken } from '../../services/api.js';

interface OtpStepProps {
  phone: string;
  onEditPhone: () => void;
  onSuccess: (data: { accessToken: string; user: any }) => void;
}

export const OtpStep: React.FC<OtpStepProps> = ({ phone, onEditPhone, onSuccess }) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(45);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Focus first input on mount
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const handleChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    setError(null);

    // Auto-advance
    if (char && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    // Auto-submit if completed
    if (char && index === 5 && newDigits.every((d) => d.length === 1)) {
      submitOtp(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setDigits(newDigits);

    const focusIdx = Math.min(pasted.length, 5);
    inputsRef.current[focusIdx]?.focus();

    if (pasted.length === 6) {
      submitOtp(pasted);
    }
  };

  const submitOtp = async (code: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.post<any>('/auth/trunk/otp/verify', {
        phone,
        otp: code,
      });

      const data = res.data || res;
      if (data.accessToken) {
        setAccessToken(data.accessToken);
      }

      onSuccess(data);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Invalid or expired OTP. Please try again.';
      setError(msg);
      // Reset digits on error
      setDigits(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setError(null);

    try {
      await api.post('/auth/trunk/otp/request', { phone });
      setCountdown(60);
      setDigits(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  const fullCode = digits.join('');
  const isFilled = fullCode.length === 6;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex flex-col space-y-6"
    >
      <div className="space-y-2 text-center sm:text-left">
        <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center mx-auto sm:mx-0 shadow-sm">
          <KeyRound size={24} />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Verify Phone Code
        </h2>
        <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-slate-500">
          <span>Code sent to <strong className="text-slate-800">{phone}</strong></span>
          <button
            type="button"
            onClick={onEditPhone}
            aria-label="Edit Phone Number"
            className="p-1 rounded-md text-purple-600 hover:text-purple-800 hover:bg-purple-50 transition-colors"
          >
            <Pencil size={13} />
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {/* 6 Digit Inputs */}
        <div className="flex justify-between gap-2 sm:gap-2.5">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (inputsRef.current[idx] = el)}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={idx === 0 ? handlePaste : undefined}
              disabled={loading}
              className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-black rounded-2xl border transition-all focus:outline-none shadow-sm ${
                digit
                  ? 'border-purple-600 bg-purple-50/20 text-purple-900 ring-2 ring-purple-600/20'
                  : 'border-slate-200 bg-white text-slate-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200/80 text-red-600 text-xs font-semibold leading-relaxed">
            {error}
          </div>
        )}

        {/* Resend Option */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>Didn't receive code?</span>
          {countdown > 0 ? (
            <span className="font-bold text-slate-400">Resend in {countdown}s</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 active:scale-95 transition-all"
            >
              {resending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              <span>Resend Code</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => submitOtp(fullCode)}
          disabled={!isFilled || loading}
          className="w-full h-13 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-bold text-base shadow-lg shadow-pink-500/25 hover:opacity-95 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Verifying Code...</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={18} />
              <span>Verify & Continue</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};
