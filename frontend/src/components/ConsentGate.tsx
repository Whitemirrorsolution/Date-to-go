import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';

interface PendingConsent {
  slug: string;
  title: string;
  version: number;
}

export const ConsentGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [pending, setPending] = useState<PendingConsent[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setLoading(true);
      api.get<{ pending: PendingConsent[] }>('/consents/pending')
        .then(res => setPending(res.data?.pending || []))
        .catch(err => console.error('Failed to fetch pending consents:', err))
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleAgree = async () => {
    setSubmitting(true);
    try {
      await api.post('/consents', {
        consents: pending.map(p => ({ pageSlug: p.slug, version: p.version }))
      });
      setPending([]); // clears the gate
    } catch (err) {
      console.error('Failed to submit consents:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || pending.length === 0) {
    return <>{children}</>;
  }

  // The Gate Overlay
  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm" />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-surface rounded-t-3xl shadow-2xl p-6 pb-safe z-[1000] animate-slide-up">
        <h2 className="text-xl font-bold mb-2">Updated Policies</h2>
        <p className="text-sm text-muted mb-6">
          We have updated our terms and policies. Please review and accept them to continue using Date to Go.
        </p>

        <div className="flex flex-col gap-3 mb-8">
          {pending.map(p => (
            <div key={p.slug} className="flex justify-between items-center bg-bg p-3 rounded-xl border border-borderLight">
              <span className="font-semibold text-sm">{p.title} <span className="text-xs text-muted font-normal">(v{p.version})</span></span>
              <a 
                href={`/${p.slug}`} 
                target="_blank" 
                rel="noreferrer"
                className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-pill"
              >
                Read
              </a>
            </div>
          ))}
        </div>

        <button 
          onClick={handleAgree}
          disabled={submitting || loading}
          className="w-full py-4 rounded-pill font-bold text-white bg-primary disabled:opacity-50 transition-all shadow-glow"
        >
          {submitting ? 'Recording...' : 'I Agree to All'}
        </button>
      </div>
      
      {/* Underlying app is blocked */}
      <div className="pointer-events-none blur-[2px] select-none h-screen overflow-hidden">
        {children}
      </div>
    </>
  );
};
