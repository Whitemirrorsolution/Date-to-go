import React from 'react';
// Note: Requires vite-plugin-pwa to be correctly resolving virtual modules
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export const PwaUpdateNotifier: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ', r);
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[10000] flex items-center justify-between gap-3 rounded-2xl bg-surface p-4 shadow-xl border border-primary/20">
      <div className="flex flex-col">
        <span className="font-bold text-textMain text-sm">New version available</span>
        <span className="text-xs text-muted">Refresh to get the latest features</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setNeedRefresh(false)}
          className="p-2 text-muted hover:text-textMain transition-colors"
        >
          <X size={18} />
        </button>
        <button
          onClick={() => updateServiceWorker(true)}
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm transition-transform active:scale-95"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>
    </div>
  );
};
