import React, { useEffect, useState } from 'react';
import { Download, Share, PlusSquare, Smartphone, X, Compass, GripVertical, CheckCircle2 } from 'lucide-react';
import { subscribeToInstallState, getInstallState, promptInstall, dismissInstallPrompt, InstallState } from '../pwa/installStore.js';
import { useAuth } from '../context/AuthContext.js';

interface InstallButtonProps {
  variant?: 'pill' | 'icon' | 'row' | 'primary' | 'banner';
  label?: string;
  className?: string;
  onDismiss?: () => void;
}

export const InstallButton: React.FC<InstallButtonProps> = ({ 
  variant = 'pill', 
  label = 'Install app',
  className = '',
  onDismiss 
}) => {
  const { user } = useAuth();
  const [state, setState] = useState<InstallState>(getInstallState());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    return subscribeToInstallState(setState);
  }, []);

  const handleAction = () => {
    if (state.isInstalled) {
      alert("App is already installed! Check your home screen or app drawer.");
      return;
    }
    
    window.dispatchEvent(new CustomEvent('dtg:analytics', { detail: { name: 'install_button_clicked' } }));

    if (state.canPromptInstall) {
      promptInstall();
    } else {
      setSheetOpen(true);
    }
  };

  const handleDismiss = () => {
    dismissInstallPrompt(14);
    if (onDismiss) onDismiss();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  if (state.isInstalled && variant !== 'row') {
    return null;
  }

  // Dismissal check for banner
  if (variant === 'banner') {
    if (state.dismissedUntil && state.dismissedUntil > Date.now()) return null;
    // Don't show banner if installed or can prompt natively (we might just show native prompt later)
    if (state.isInstalled) return null;
    if (state.visits < 2 || !user) return null; // only on 2nd visit AND after login
  }

  const renderButton = () => {
    if (state.isInstalled && variant === 'row') {
      return (
        <div className={`flex items-center justify-between p-4 bg-surface rounded-xl border border-border ${className}`}>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-green-500" size={24} />
            <div>
              <p className="font-bold text-textMain">App Installed</p>
              <p className="text-sm text-muted">Date to Go is on your home screen</p>
            </div>
          </div>
        </div>
      );
    }

    switch (variant) {
      case 'icon':
        return (
          <button 
            onClick={handleAction} 
            className={`p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors ${className}`}
            aria-label="Install App"
          >
            <Download size={20} />
          </button>
        );
      case 'row':
        return (
          <button 
            onClick={handleAction} 
            className={`w-full flex items-center justify-between p-4 bg-surface rounded-xl border border-border active:bg-surfaceHighlight transition-colors ${className}`}
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Download size={20} />
              </div>
              <div>
                <p className="font-bold text-textMain">Install App</p>
                <p className="text-sm text-muted">Get notifications & faster access</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-primary">Get</span>
          </button>
        );
      case 'primary':
        return (
          <button 
            onClick={handleAction} 
            className={`py-3 px-6 rounded-xl bg-primary text-white font-bold inline-flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-primary/20 ${className}`}
          >
            <Download size={20} /> {label}
          </button>
        );
      case 'banner':
        return (
          <div className={`fixed bottom-20 left-4 right-4 z-50 animate-slide-up ${className}`}>
            <div className="bg-surface border border-primary/20 shadow-xl shadow-black/5 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-accent shrink-0 flex items-center justify-center shadow-inner">
                <img src="/pwa-192x192.png" alt="Icon" className="w-10 h-10 rounded-lg" onError={(e) => e.currentTarget.style.display = 'none'} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-textMain leading-tight mb-1">Add Date to Go to Home Screen</p>
                <p className="text-xs text-muted leading-tight mb-3">Install for a faster, app-like experience</p>
                <div className="flex gap-2">
                  <button onClick={handleAction} className="flex-1 py-1.5 bg-primary text-white text-sm font-bold rounded-lg shadow-sm">
                    Install
                  </button>
                  <button onClick={handleDismiss} className="px-3 py-1.5 bg-bg text-textMain text-sm font-semibold rounded-lg border border-border">
                    Not now
                  </button>
                </div>
              </div>
              <button onClick={handleDismiss} className="text-muted p-1 -mr-2 -mt-2">
                <X size={16} />
              </button>
            </div>
          </div>
        );
      case 'pill':
      default:
        return (
          <button 
            onClick={handleAction} 
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-semibold text-sm hover:bg-primary/20 transition-colors ${className}`}
          >
            <Download size={16} /> {label}
          </button>
        );
    }
  };

  return (
    <>
      {renderButton()}

      {/* Manual Install Sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
          <div 
            className="w-full max-w-sm bg-surface rounded-[32px] overflow-hidden shadow-2xl animate-slide-up relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 bg-border rounded-full" />
            </div>
            
            <button onClick={() => setSheetOpen(false)} className="absolute top-4 right-4 p-2 bg-bg rounded-full text-muted">
              <X size={20} />
            </button>

            <div className="p-6 pt-2">
              {state.isInAppBrowser ? (
                <>
                  <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Compass size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-center text-textMain mb-2">Open in Browser</h3>
                  <p className="text-center text-muted text-sm mb-6">
                    You're viewing this inside another app. To install Date to Go, open it in your system browser.
                  </p>
                  
                  <div className="bg-bg rounded-xl p-4 mb-4 border border-border space-y-3">
                    <div className="flex items-center gap-3">
                      <GripVertical size={20} className="text-muted shrink-0" />
                      <p className="text-sm text-textMain font-medium">Tap the menu (three dots) in the top right corner</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Compass size={20} className="text-muted shrink-0" />
                      <p className="text-sm text-textMain font-medium">Select "Open in Browser" or "Open in Chrome/Safari"</p>
                    </div>
                  </div>

                  <button 
                    onClick={copyLink}
                    className="w-full py-3 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center gap-2"
                  >
                    {isCopied ? <CheckCircle2 size={20} /> : <Share size={20} />}
                    {isCopied ? 'Link Copied!' : 'Copy Link Instead'}
                  </button>
                </>
              ) : state.isIosSafari ? (
                <>
                  <div className="w-16 h-16 bg-gray-100 text-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Smartphone size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-center text-textMain mb-2">Install on iOS</h3>
                  <p className="text-center text-muted text-sm mb-6">
                    Install Date to Go on your iPhone or iPad for a full screen experience and push notifications.
                  </p>
                  
                  <div className="bg-bg rounded-xl p-4 mb-6 border border-border space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                        <Share size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-textMain">1. Tap the Share button</p>
                        <p className="text-xs text-muted">It's at the bottom of your Safari window.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center shrink-0 mt-0.5">
                        <PlusSquare size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-textMain">2. Select "Add to Home Screen"</p>
                        <p className="text-xs text-muted">You may need to scroll down slightly.</p>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setSheetOpen(false)}
                    className="w-full py-3 rounded-xl bg-bg border border-border text-textMain font-bold"
                  >
                    Got it
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Download size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-center text-textMain mb-2">Install App</h3>
                  <p className="text-center text-muted text-sm mb-6">
                    {state.platform === 'desktop' 
                      ? "Look for the install icon in your address bar (near the bookmark star) to install the app on your computer."
                      : "Tap the menu in your browser and select 'Install app' or 'Add to Home screen' to install."}
                  </p>
                  
                  <button 
                    onClick={() => setSheetOpen(false)}
                    className="w-full py-3 rounded-xl bg-primary text-white font-bold"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
