import React from 'react';

import { AppHeader } from '../components/AppHeader.js';
import { usePushNotifications } from '../pwa/usePushNotifications.js';
import { Bell, BellOff, Info } from 'lucide-react';

export const NotificationSettingsPage: React.FC = () => {
  const { isSupported, permission, isSubscribed, loading, subscribe, unsubscribe } = usePushNotifications();

  return (
    <div className="min-h-screen bg-bg pb-safe">
      <AppHeader title="Notification Settings" />
      
      <main className="px-5 pt-6 flex flex-col gap-5">
        <section className="card p-5">
          <div className="flex items-start gap-4 mb-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isSubscribed ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}>
              {isSubscribed ? <Bell size={24} /> : <BellOff size={24} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Push Notifications</h2>
              <p className="text-sm text-gray-500">
                Receive important updates about your bookings and account security.
              </p>
            </div>
          </div>

          {!isSupported && (
            <div className="bg-orange-50 text-orange-700 p-4 rounded-xl text-sm flex gap-3">
              <Info size={20} className="shrink-0" />
              <p>Your browser does not support push notifications, or you are using iOS without adding the app to your Home Screen first.</p>
            </div>
          )}

          {isSupported && permission === 'denied' && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm flex gap-3">
              <Info size={20} className="shrink-0" />
              <p>You have blocked notifications in your browser. Please change your browser settings to allow them.</p>
            </div>
          )}

          {isSupported && permission !== 'denied' && (
            <button
              disabled={loading}
              onClick={isSubscribed ? unsubscribe : subscribe}
              className={`w-full py-4 rounded-xl font-bold transition-all shadow-sm ${
                isSubscribed 
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                  : 'bg-primary text-white hover:bg-primaryDark'
              } ${loading ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'}`}
            >
              {loading ? 'Processing...' : isSubscribed ? 'Turn Off Notifications' : 'Turn On Notifications'}
            </button>
          )}
        </section>
      </main>
    </div>
  );
};
