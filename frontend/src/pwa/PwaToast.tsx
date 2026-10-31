import React from 'react';
import { usePwa } from './usePwa.js';

export const PwaToast: React.FC = () => {
  const { needRefresh, updateServiceWorker, closePrompt, isOffline } = usePwa();

  return (
    <>
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center py-2 z-50 text-sm font-medium shadow-md flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          You are offline. Some features are unavailable.
        </div>
      )}

      {needRefresh && (
        <div className="fixed bottom-24 left-4 right-4 bg-white rounded-2xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] z-50 flex items-center justify-between border border-gray-100">
          <div>
            <h4 className="text-[#7000A4] font-bold text-base mb-0.5">Update Available</h4>
            <p className="text-gray-600 text-sm">A new version of Date to Go is ready.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => closePrompt()} 
              className="px-3 py-2 text-gray-500 font-medium text-sm rounded-lg"
            >
              Later
            </button>
            <button 
              onClick={() => updateServiceWorker(true)} 
              className="px-4 py-2 bg-[#7000A4] text-white font-bold text-sm rounded-xl shadow-md active:scale-95 transition-transform"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </>
  );
};
