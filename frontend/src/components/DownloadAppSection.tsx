import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { api } from '../services/api.js';
import { InstallButton } from './InstallButton.js';
import { getInstallState, subscribeToInstallState } from '../pwa/installStore.js';

export const DownloadAppSection: React.FC = () => {
  const [config, setConfig] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(getInstallState().isInstalled);

  useEffect(() => {
    api.get<{ data: any }>('/support/config').then(res => setConfig(res.data?.data || null)).catch(() => {});
    return subscribeToInstallState((state) => setIsInstalled(state.isInstalled));
  }, []);

  if (isInstalled) return null;

  return (
    <section className="bg-gradient-to-br from-[#1A0B2E] to-primaryDark rounded-[24px] p-6 text-white text-center shadow-lg relative overflow-hidden my-6">
      <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-primary rounded-full blur-[40px] opacity-60"></div>
      
      <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/20">
        <Download size={32} className="text-white" />
      </div>
      
      <h3 className="text-2xl font-bold mb-2">Download the App</h3>
      <p className="text-white/70 text-sm mb-6 max-w-[240px] mx-auto">
        Get Date to Go on your home screen for notifications and a faster experience.
      </p>
      
      <div className="flex justify-center">
        <InstallButton variant="primary" className="mb-4 bg-white text-primary hover:bg-gray-100 border-none !w-auto max-w-[220px] px-6" />
      </div>
      
      {(config?.playStoreUrl || config?.appStoreUrl) && (
        <div className="flex justify-center gap-3 mt-4 pt-4 border-t border-white/10">
          {config.playStoreUrl && (
            <a href={config.playStoreUrl} target="_blank" rel="noopener noreferrer" className="opacity-80 hover:opacity-100 transition-opacity">
              <div className="px-3 py-1.5 bg-black rounded-lg border border-gray-700 text-[10px] flex items-center gap-2">
                <span className="font-bold text-white text-xs">Google Play</span>
              </div>
            </a>
          )}
          {config.appStoreUrl && (
            <a href={config.appStoreUrl} target="_blank" rel="noopener noreferrer" className="opacity-80 hover:opacity-100 transition-opacity">
              <div className="px-3 py-1.5 bg-black rounded-lg border border-gray-700 text-[10px] flex items-center gap-2">
                <span className="font-bold text-white text-xs">App Store</span>
              </div>
            </a>
          )}
        </div>
      )}
    </section>
  );
};
