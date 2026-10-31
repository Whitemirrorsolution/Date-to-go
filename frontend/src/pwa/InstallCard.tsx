import React from 'react';
import { useInstallPrompt } from './useInstallPrompt.js';
import { Download, Share, PlusSquare, X } from 'lucide-react';

export const InstallCard: React.FC = () => {
  const { canInstall, install, isStandalone, showIosPrompt, closeIosPrompt } = useInstallPrompt();

  if (isStandalone || !canInstall) {
    return null;
  }

  return (
    <>
      <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-gray-100 flex items-center justify-between mb-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#F6F7FD] text-[#7000A4] rounded-2xl flex items-center justify-center shadow-inner">
            <Download size={24} />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-0.5">Install App</h4>
            <p className="text-gray-500 text-xs">For faster access and notifications</p>
          </div>
        </div>
        <button 
          onClick={install}
          className="bg-[#7000A4] text-white px-4 py-2 rounded-full font-bold text-sm shadow-md active:scale-95 transition-transform"
        >
          Install
        </button>
      </div>

      {/* iOS Installation Guide Bottom Sheet */}
      {showIosPrompt && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center animate-fade-in pb-safe">
          <div className="bg-white w-full max-w-md rounded-t-[32px] p-6 pb-12 animate-slide-up relative">
            <button 
              onClick={closeIosPrompt}
              className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"
            >
              <X size={18} />
            </button>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-[#F6F7FD] rounded-3xl flex items-center justify-center">
                <img src="/pwa-192x192.png" alt="Icon" className="w-10 h-10 object-contain rounded-xl" />
              </div>
            </div>
            <h3 className="text-center font-bold text-[22px] mb-2 text-gray-900">Install Date to Go</h3>
            <p className="text-center text-gray-600 text-sm mb-8">Install this application on your home screen for quick and easy access.</p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-blue-500">
                  <Share size={20} />
                </div>
                <div className="flex-1 text-sm font-medium text-gray-800">
                  Tap the <span className="font-bold text-blue-500 mx-1">Share</span> icon in Safari's bottom menu bar.
                </div>
              </div>
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-900">
                  <PlusSquare size={20} />
                </div>
                <div className="flex-1 text-sm font-medium text-gray-800">
                  Scroll down and tap <span className="font-bold text-gray-900 mx-1">Add to Home Screen</span>.
                </div>
              </div>
            </div>
            
            <button 
              onClick={closeIosPrompt}
              className="w-full mt-8 py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl active:bg-gray-200 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
