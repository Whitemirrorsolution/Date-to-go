import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';

interface OnboardingLayoutProps {
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
  showBack?: boolean;
  children: React.ReactNode;
}

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  currentStep,
  totalSteps,
  onBack,
  showBack = false,
  children,
}) => {
  const progressPercent = Math.min(100, Math.max(0, (currentStep / totalSteps) * 100));

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-b from-slate-50 via-white to-pink-50/30 flex flex-col justify-between antialiased selection:bg-primary/20">
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="w-10 flex items-center">
            {showBack && onBack ? (
              <button
                type="button"
                onClick={onBack}
                aria-label="Go Back"
                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all"
              >
                <ArrowLeft size={20} />
              </button>
            ) : null}
          </div>

          {/* Brand Logo */}
          <div className="flex items-center gap-2 select-none">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-pink-500/20">
              <Sparkles size={16} className="animate-pulse" />
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-purple-700 via-pink-600 to-rose-500 bg-clip-text text-transparent">
              Date to Go
            </span>
          </div>

          <div className="w-10 text-right">
            {currentStep > 0 && (
              <span className="text-xs font-bold text-slate-400">
                {currentStep}/{totalSteps}
              </span>
            )}
          </div>
        </div>

        {/* Animated Progress Bar */}
        {currentStep > 0 && (
          <div className="w-full h-1 bg-slate-100 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        )}
      </header>

      {/* ── Main Content Area ── */}
      <main className="flex-1 max-w-md w-full mx-auto px-5 py-6 flex flex-col justify-center">
        {children}
      </main>

      {/* ── Trust Footer ── */}
      <footer className="w-full py-4 px-6 text-center text-xs text-slate-400 border-t border-slate-100/60 bg-white/40">
        <div className="max-w-md mx-auto flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>18+ Verified Platform • Platonic Only • Escrow Protected</span>
        </div>
      </footer>
    </div>
  );
};
