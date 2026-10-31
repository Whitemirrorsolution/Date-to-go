import React, { useState } from 'react';
import { AppHeader } from '../components/AppHeader.js';
import { Bell, MoreVertical, CheckCircle2, Trash2 } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: '1', title: 'Booking Accepted! 🎉', body: 'Sarah has accepted your coffee date request. Pay now to confirm.', time: '10 mins ago', unread: true },
    { id: '2', title: 'Payment Successful', body: 'Your payment of ₹470.82 for Order #order_Mkp3... was successful.', time: '2 hours ago', unread: true },
    { id: '3', title: 'Welcome to Date to Go!', body: 'Complete your profile to start booking verified companions.', time: '1 day ago', unread: false },
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader 
        title="Notifications" 
        rightAction={
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 -mr-2">
              <MoreVertical size={24} className="text-textMain" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-10 bg-surface rounded-xl shadow-lg border border-borderLight w-48 z-50 overflow-hidden">
                <button 
                  onClick={() => {
                    setNotifications(notifications.map(n => ({ ...n, unread: false })));
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center px-4 py-3 hover:bg-bg text-sm font-medium"
                >
                  <CheckCircle2 size={16} className="mr-3 text-muted" /> Mark all as read
                </button>
                <button 
                  onClick={() => {
                    setNotifications([]);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center px-4 py-3 hover:bg-failed-bg text-failed-text text-sm font-medium border-t border-borderLight"
                >
                  <Trash2 size={16} className="mr-3" /> Clear all
                </button>
              </div>
            )}
          </div>
        }
      />

      <main className="px-5 pt-4 pb-24">
        {unreadCount > 0 && (
          <div className="bg-primary/10 border border-primary/20 text-primary font-medium px-4 py-3 rounded-xl mb-4 flex items-center text-sm">
            <Bell size={18} className="mr-2" />
            You have {unreadCount} unread notification(s)
          </div>
        )}

        <div className="flex flex-col gap-3">
          {notifications.map((notif) => (
            <div 
              key={notif.id} 
              className={`card !p-4 flex gap-4 transition-colors ${notif.unread ? 'bg-primary/5 border-primary/20' : ''}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.unread ? 'bg-primary text-white' : 'bg-bg text-muted'}`}>
                <Bell size={20} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h3 className={`text-[15px] ${notif.unread ? 'font-bold text-textMain' : 'font-semibold text-muted'}`}>
                    {notif.title}
                  </h3>
                  {notif.unread && <div className="w-2.5 h-2.5 bg-primary rounded-full shrink-0 mt-1.5" />}
                </div>
                <p className={`text-sm mb-2 line-clamp-2 ${notif.unread ? 'text-textMain/80' : 'text-muted'}`}>
                  {notif.body}
                </p>
                <span className="text-xs text-muted/70 font-medium">{notif.time}</span>
              </div>
            </div>
          ))}

          {notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-bg rounded-full flex items-center justify-center text-muted mb-4">
                <Bell size={32} />
              </div>
              <h3 className="font-bold text-lg mb-1">No notifications yet</h3>
              <p className="text-sm text-muted">When you get updates, they'll show up here.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
