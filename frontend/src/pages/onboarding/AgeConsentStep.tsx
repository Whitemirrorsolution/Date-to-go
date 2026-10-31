import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ShieldAlert, Check, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../../services/api.js';

interface AgeConsentStepProps {
  onSuccess: (data: any) => void;
}

export const AgeConsentStep: React.FC<AgeConsentStepProps> = ({ onSuccess }) => {
  // Default to 21 years ago
  const defaultYear = new Date().getFullYear() - 22;
  const [dob, setDob] = useState(`${defaultYear}-01-15`);
  const [consentAge, setConsentAge] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentPlatonic, setConsentPlatonic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate age
  const calculateAge = (dateStr: string): number => {
    if (!dateStr) return 0;
    const birthDate = new Date(dateStr);
    if (isNaN(birthDate.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const calculatedAge = calculateAge(dob);
  const isAdult = calculatedAge >= 18;
  const canSubmit = isAdult && consentAge && consentTerms && consentPlatonic;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdult) {
      setError('You must be at least 18 years old to use Date to Go.');
      return;
    }
    if (!consentAge || !consentTerms || !consentPlatonic) {
      setError('Please accept all required safety and consent declarations.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post<any>('/auth/onboarding/consent', {
        dob,
        acceptedTerms: true,
        acceptedPrivacy: true,
        acceptedCommunity: true,
      });

      onSuccess(res.data || res);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit consent.';
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
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto sm:mx-0 shadow-sm">
          <Calendar size={24} />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Age & Community Consent
        </h2>
        <p className="text-sm text-slate-500">
          We strictly uphold an 18+ verified, safe, and platonic environment.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* DOB Input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Your Date of Birth
          </label>
          <div className="relative">
            <input
              type="date"
              value={dob}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => {
                setDob(e.target.value);
                if (error) setError(null);
              }}
              className="w-full h-14 px-4 rounded-2xl bg-white border border-slate-200 text-slate-900 font-bold text-base focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 shadow-sm transition-all"
            />
          </div>

          {/* Age validation badge */}
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium">
            {isAdult ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                <Check size={13} />
                Age: {calculatedAge} years old (Verified 18+)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-red-600 font-bold bg-red-50 px-2.5 py-1 rounded-lg border border-red-200/60">
                <ShieldAlert size={13} />
                Must be at least 18 years old
              </span>
            )}
          </div>
        </div>

        {/* Safety & Consent Declarations */}
        <div className="space-y-2.5 pt-1">
          <label
            onClick={() => setConsentAge(!consentAge)}
            className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
              consentAge
                ? 'bg-purple-50/50 border-purple-300 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                consentAge ? 'bg-purple-600 text-white' : 'border border-slate-300 bg-white'
              }`}
            >
              {consentAge && <Check size={13} strokeWidth={3} />}
            </div>
            <span className="text-xs font-medium text-slate-700 leading-snug">
              I certify that I am at least 18 years of age and the date of birth entered above is accurate.
            </span>
          </label>

          <label
            onClick={() => setConsentTerms(!consentTerms)}
            className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
              consentTerms
                ? 'bg-purple-50/50 border-purple-300 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                consentTerms ? 'bg-purple-600 text-white' : 'border border-slate-300 bg-white'
              }`}
            >
              {consentTerms && <Check size={13} strokeWidth={3} />}
            </div>
            <span className="text-xs font-medium text-slate-700 leading-snug">
              I accept the{' '}
              <a href="/terms" target="_blank" rel="noreferrer" className="text-purple-600 underline font-bold" onClick={(e) => e.stopPropagation()}>
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" target="_blank" rel="noreferrer" className="text-purple-600 underline font-bold" onClick={(e) => e.stopPropagation()}>
                Privacy Policy
              </a>
              .
            </span>
          </label>

          <label
            onClick={() => setConsentPlatonic(!consentPlatonic)}
            className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
              consentPlatonic
                ? 'bg-purple-50/50 border-purple-300 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                consentPlatonic ? 'bg-purple-600 text-white' : 'border border-slate-300 bg-white'
              }`}
            >
              {consentPlatonic && <Check size={13} strokeWidth={3} />}
            </div>
            <span className="text-xs font-medium text-slate-700 leading-snug">
              <strong className="text-slate-900 block font-bold mb-0.5">Strict Platonic Companion Policy:</strong>
              I understand Date to Go is strictly for platonic companionship. Solicitation of romantic exclusivity, adult content, sexual services, or harassment results in an immediate permanent ban and forfeiture of funds.
            </span>
          </label>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200/80 text-red-600 text-xs font-semibold leading-relaxed">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="w-full h-13 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-bold text-base shadow-lg shadow-pink-500/25 hover:opacity-95 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Saving Consent...</span>
            </>
          ) : (
            <>
              <span>Confirm & Choose Role</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
};
