import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOffline } from '../hooks/useOffline';

export const OfflineBanner: React.FC = () => {
  const isOffline = useOffline();

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[10000] flex items-center justify-center gap-2 bg-red-500 py-1.5 px-4 text-xs font-bold text-white shadow-md">
      <WifiOff size={14} />
      <span>You are offline. Some features are restricted.</span>
    </div>
  );
};
