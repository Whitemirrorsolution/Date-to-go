import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Check, ArrowRight, Loader2, Compass, Heart } from 'lucide-react';
import { api } from '../../services/api.js';

interface RoleForkStepProps {
  onSuccess: (data: { role: string; nextRoute: string; currentStep: string }) => void;
}

export const RoleForkStep: React.FC<RoleForkStepProps> = ({ onSuccess }) => {
  const [selectedRole, setSelectedRole] = useState<'SEEKER' | 'PARTNER'>('SEEKER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmRole = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.post<any>('/auth/fork-role', {
        role: selectedRole,
      });

      const responseData = res.data?.data || res.data || res;
      onSuccess(responseData);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to select role. Please try again.';
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
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 text-white flex items-center justify-center mx-auto sm:mx-0 shadow-md shadow-pink-500/20">
          <Compass size={24} />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          How will you use Date to Go?
        </h2>
        <p className="text-sm text-slate-500">
          Select your primary mode. Your experience will be customized specifically for this role.
        </p>
      </div>

      {/* Two Role Fork Cards */}
      <div className="space-y-3.5">
        {/* ── CARD 1: SEEKER (Find a date) ── */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setSelectedRole('SEEKER')}
          className={`relative p-5 rounded-3xl border-2 transition-all cursor-pointer text-left select-none ${
            selectedRole === 'SEEKER'
              ? 'border-purple-600 bg-gradient-to-br from-purple-50/70 to-white shadow-md shadow-purple-500/10 ring-4 ring-purple-600/10'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          {/* Top Row: Icon + Badge + Check */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
                  selectedRole === 'SEEKER' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-600'
                }`}
              >
                <Heart size={20} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-purple-700 bg-purple-100/80 px-2.5 py-1 rounded-full">
                For Members
              </span>
            </div>

            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                selectedRole === 'SEEKER'
                  ? 'bg-purple-600 text-white scale-100 shadow-sm'
                  : 'border-2 border-slate-300 bg-transparent scale-90'
              }`}
            >
              {selectedRole === 'SEEKER' && <Check size={14} strokeWidth={3} />}
            </div>
          </div>

          <h3 className="text-lg font-extrabold text-slate-900 mb-1">
            Find a date
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed mb-3">
            Discover verified companion profiles, swipe through listings, and book platonic companionship for dining, events, and city tours.
          </p>

          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
              ✨ Swipe Deck
            </span>
            <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
              🛡️ Escrow Protection
            </span>
            <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
              📍 Public Venues Only
            </span>
          </div>
        </motion.div>

        {/* ── CARD 2: PARTNER (Offer dates) ── */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setSelectedRole('PARTNER')}
          className={`relative p-5 rounded-3xl border-2 transition-all cursor-pointer text-left select-none ${
            selectedRole === 'PARTNER'
              ? 'border-pink-600 bg-gradient-to-br from-pink-50/70 to-white shadow-md shadow-pink-500/10 ring-4 ring-pink-600/10'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          {/* Top Row: Icon + Badge + Check */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
                  selectedRole === 'PARTNER' ? 'bg-pink-600 text-white' : 'bg-pink-50 text-pink-600'
                }`}
              >
                <Briefcase size={20} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-pink-700 bg-pink-100/80 px-2.5 py-1 rounded-full">
                For Companions
              </span>
            </div>

            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                selectedRole === 'PARTNER'
                  ? 'bg-pink-600 text-white scale-100 shadow-sm'
                  : 'border-2 border-slate-300 bg-transparent scale-90'
              }`}
            >
              {selectedRole === 'PARTNER' && <Check size={14} strokeWidth={3} />}
            </div>
          </div>

          <h3 className="text-lg font-extrabold text-slate-900 mb-1">
            Offer dates
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed mb-3">
            Set your own hourly companion rates, publish availability listings, accept meetup requests, and earn through guaranteed escrow payouts.
          </p>

          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
              📊 Partner Dashboard
            </span>
            <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
              💵 Guaranteed Wallet Payouts
            </span>
            <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
              🔐 4-Digit OTP Escrow Release
            </span>
          </div>
        </motion.div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200/80 text-red-600 text-xs font-semibold leading-relaxed">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleConfirmRole}
        disabled={loading}
        className="w-full h-13 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-bold text-base shadow-lg shadow-pink-500/25 hover:opacity-95 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Locking Role...</span>
          </>
        ) : (
          <>
            <span>Lock Role & Continue</span>
            <ArrowRight size={18} />
          </>
        )}
      </button>
    </motion.div>
  );
};
