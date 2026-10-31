import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, HeartHandshake, Sparkles, ArrowRight, Lock } from 'lucide-react';

interface WelcomeStepProps {
  onStart: () => void;
  onLogin: () => void;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onStart, onLogin }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex flex-col items-center text-center space-y-6"
    >
      {/* Hero Badge */}
      <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-pink-50 border border-pink-200/60 text-pink-700 text-xs font-bold shadow-sm">
        <Sparkles size={13} className="text-pink-500" />
        <span>India's Platonic Companion Network</span>
      </div>

      {/* Main Headline */}
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Real Dates.{' '}
          <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 bg-clip-text text-transparent">
            100% Platonic.
          </span>
        </h1>
        <p className="text-slate-500 text-sm sm:text-base leading-relaxed max-w-sm mx-auto">
          Connect with verified companions for coffee, dining, events, and city exploration without awkward pressure.
        </p>
      </div>

      {/* Value Pillars */}
      <div className="w-full space-y-2.5 text-left py-2">
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Govt. ID & KYC Verified</h4>
            <p className="text-[11px] text-slate-500">Every companion profile is vetted for mutual safety.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center text-pink-600 shrink-0">
            <Lock size={19} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Escrow Payment Protection</h4>
            <p className="text-[11px] text-slate-500">Funds are released only after the in-person completion OTP is verified.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
            <HeartHandshake size={20} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Strictly Platonic & Safe</h4>
            <p className="text-[11px] text-slate-500">Public venues only. Adult or explicit services strictly prohibited.</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="w-full pt-2 space-y-3">
        <button
          type="button"
          onClick={onStart}
          className="w-full h-13 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-bold text-base shadow-lg shadow-pink-500/25 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <span>Get Started</span>
          <ArrowRight size={18} />
        </button>

        <button
          type="button"
          onClick={onLogin}
          className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 active:scale-95 transition-all"
        >
          Already have an account? <span className="text-purple-600 underline">Sign In</span>
        </button>
      </div>
    </motion.div>
  );
};
