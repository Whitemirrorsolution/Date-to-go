import React, { useEffect, useState } from 'react';
import { getInstallState, subscribeToInstallState, InstallState } from '../pwa/installStore.js';
import { AppHeader } from '../components/AppHeader.js';
import { Check, X } from 'lucide-react';

export const PwaDebugPage: React.FC = () => {
  const [state, setState] = useState<InstallState>(getInstallState());
  const [manifest, setManifest] = useState<any>(null);
  const [swState, setSwState] = useState<string>('checking...');
  const [swScope, setSwScope] = useState<string>('checking...');
  
  useEffect(() => {
    fetch('/manifest.webmanifest')
      .then(res => res.json())
      .then(data => setManifest(data))
      .catch(err => setManifest({ error: err.message }));

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          setSwScope(reg.scope);
          if (reg.active) setSwState('active');
          else if (reg.installing) setSwState('installing');
          else if (reg.waiting) setSwState('waiting');
        } else {
          setSwState('no registration');
          setSwScope('none');
        }
      });
    } else {
      setSwState('unsupported');
      setSwScope('unsupported');
    }

    return subscribeToInstallState(setState);
  }, []);

  const hasManifest = manifest && !manifest.error;
  const hasIcons = manifest?.icons?.length >= 2;
  const isSwActive = swState === 'active';
  const hasName = !!manifest?.name;
  
  const criteria = [
    { name: 'Has Web Manifest', passed: hasManifest },
    { name: 'Manifest has name', passed: hasName },
    { name: 'Manifest has icons (192, 512)', passed: hasIcons },
    { name: 'Service Worker Active', passed: isSwActive },
  ];

  return (
    <div className="min-h-screen bg-bg pb-safe">
      <AppHeader title="PWA Debug" />
      <div className="p-4 space-y-6">
        
        <section className="card p-4">
          <h2 className="font-bold mb-3 border-b pb-2">Environment State</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted">Platform:</div><div className="font-medium">{state.platform}</div>
            <div className="text-muted">isInAppBrowser:</div><div className="font-medium">{String(state.isInAppBrowser)}</div>
            <div className="text-muted">isIosSafari:</div><div className="font-medium">{String(state.isIosSafari)}</div>
            <div className="text-muted">Visits:</div><div className="font-medium">{state.visits}</div>
            <div className="text-muted">Dismissed Until:</div><div className="font-medium">{state.dismissedUntil ? new Date(state.dismissedUntil).toLocaleString() : 'null'}</div>
            <div className="text-muted">Display Mode:</div><div className="font-medium">{state.isInstalled ? 'standalone' : 'browser'}</div>
          </div>
        </section>

        <section className="card p-4">
          <h2 className="font-bold mb-3 border-b pb-2">Install Prompt State</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted">beforeinstallprompt fired:</div>
            <div className={`font-bold ${state.canPromptInstall ? 'text-green-500' : 'text-red-500'}`}>
              {String(state.canPromptInstall)}
            </div>
          </div>
        </section>

        <section className="card p-4">
          <h2 className="font-bold mb-3 border-b pb-2">Service Worker</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted">State:</div><div className="font-medium">{swState}</div>
            <div className="text-muted">Scope:</div><div className="font-medium overflow-hidden text-ellipsis">{swScope}</div>
          </div>
        </section>

        <section className="card p-4">
          <h2 className="font-bold mb-3 border-b pb-2">Installability Criteria</h2>
          <div className="space-y-2">
            {criteria.map((c, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span>{c.name}</span>
                {c.passed ? <Check className="text-green-500" size={16} /> : <X className="text-red-500" size={16} />}
              </div>
            ))}
          </div>
        </section>
        
        <section className="card p-4">
          <h2 className="font-bold mb-3 border-b pb-2">Manifest Details</h2>
          <pre className="text-xs bg-bg p-2 rounded overflow-x-auto">
            {JSON.stringify(manifest, null, 2)}
          </pre>
        </section>

      </div>
    </div>
  );
};
