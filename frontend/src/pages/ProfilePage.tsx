import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User as UserIcon, CalendarCheck, Clock, ShieldCheck, 
  Settings, HelpCircle, FileText, FileLock, Wallet, LogOut, ChevronRight, Edit2, ShieldAlert, Bell, Download, MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useAccess } from '../shared/providers/AccessProvider.js';
import { InstallButton } from '../components/InstallButton.js';
import { walletApi } from '../services/wallet.js';

export const ProfilePage: React.FC = () => {
  const { user, logout, switchMode } = useAuth();
  const { refetchAccess } = useAccess();
  const navigate = useNavigate();
  const [walletBalance, setWalletBalance] = React.useState<number>(0);

  React.useEffect(() => {
    if (user) {
      walletApi.getBalance().then(setWalletBalance).catch(console.error);
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="w-full min-h-screen bg-bg">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col gap-5">
        
        {/* In-page Header */}
        <div className="flex items-center justify-between pb-2 border-b border-borderLight/60">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-textMain tracking-tight">
              Profile & Settings
            </h1>
            <p className="text-xs sm:text-sm font-medium text-muted mt-0.5">
              Manage your account, companion passes, wallet, and safety preferences
            </p>
          </div>
        </div>

        <main className="flex flex-col gap-5 w-full">
        
        {/* Top Profile Card */}
        <section className="card flex items-center gap-4 relative">
          <button 
            className="relative w-[72px] h-[72px] rounded-full p-1 border-2 border-borderLight"
            onClick={() => {/* Open Photo Sheet */}}
          >
            <div className="w-full h-full rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold text-2xl">
              {user?.fullName?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            <div className="absolute bottom-0 right-0 bg-surface rounded-full p-1 shadow-sm border border-borderLight">
              <Edit2 size={12} className="text-muted" />
            </div>
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-textMain">{user?.fullName || 'Guest User'}</h2>
            <p className="text-sm text-muted">{user?.phone || '+91 - Update Profile'}</p>
          </div>
          <button 
            onClick={() => navigate('/s/profile/details')}
            className="p-3 bg-primary/10 text-primary rounded-full"
          >
            <Edit2 size={18} />
          </button>
        </section>

        {/* Quick Actions */}
        <section className="card flex justify-around items-center py-5">
          <button onClick={() => navigate('/s/booking')} className="flex flex-col items-center gap-2 w-1/3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <CalendarCheck size={24} />
            </div>
            <span className="text-xs font-semibold text-textMain text-center">Your<br/>Bookings</span>
          </button>
          <button onClick={() => navigate('/s/history')} className="flex flex-col items-center gap-2 w-1/3">
            <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
              <Clock size={24} />
            </div>
            <span className="text-xs font-semibold text-textMain text-center">Transaction<br/>History</span>
          </button>
          <button onClick={() => navigate('/s/subscription')} className="flex flex-col items-center gap-2 w-1/3">
            <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <span className="text-xs font-semibold text-textMain text-center">Your<br/>Subscription</span>
          </button>
        </section>

        {/* Credit Card */}
        <section className="card bg-gradient-to-br from-primaryDark to-primary text-white border-none shadow-float">
          <div 
            className="flex items-center gap-2 mb-4 cursor-pointer"
            onClick={() => navigate('/s/wallet')}
          >
            <Wallet size={20} className="text-accent" />
            <h3 className="font-bold text-lg">Date to Go Credit</h3>
            <ChevronRight size={20} className="ml-auto opacity-50" />
          </div>
          <div className="bg-white/10 rounded-2xl p-4 flex justify-between items-center backdrop-blur-md border border-white/10">
            <div onClick={() => navigate('/s/wallet')} className="cursor-pointer">
              <p className="text-xs text-white/70 uppercase tracking-wider mb-1">Available Credit</p>
              <p className="text-3xl font-bold">₹{(walletBalance / 100).toFixed(2)}</p>
            </div>
            <button 
              onClick={() => navigate('/s/wallet/topup')}
              className="bg-accent text-white font-bold px-6 py-2.5 rounded-pill shadow-sm active:scale-95 transition-transform"
            >
              Add Money
            </button>
          </div>
        </section>

        {/* System Settings */}
        <section className="card p-2">
          <h3 className="px-4 pt-3 pb-2 text-sm font-bold text-muted uppercase tracking-wider">App Settings</h3>
          <InstallButton variant="row" className="mb-2 border-none shadow-none" />
          <button className="w-full flex items-center p-4 hover:bg-bg rounded-xl transition-colors active:bg-borderLight">
            <Download size={20} className="text-muted mr-4" />
            <div className="flex-1 text-left">
              <span className="font-medium text-textMain block">App Version</span>
              <span className="text-xs text-muted block">v0.0.1 (Check for updates)</span>
            </div>
            <ChevronRight size={20} className="text-muted/50" />
          </button>
        </section>

        {/* Info Links */}
        <section className="card p-2">
          <h3 className="px-4 pt-3 pb-2 text-sm font-bold text-muted uppercase tracking-wider">Your Information</h3>
          
          {[
            { icon: UserIcon, label: 'Your Details', to: '/s/profile/details' },
            { icon: Bell, label: 'Notification Settings', to: '/s/notification-settings' },
            { icon: Settings, label: 'Change Password', to: '/change-password' },
            { icon: MessageSquare, label: 'Support Tickets', to: '/help/tickets' },
            { icon: HelpCircle, label: 'Help & FAQs', to: '/help' },
            { icon: FileLock, label: 'Privacy Policy', to: '/privacy' },
            { icon: FileText, label: 'Terms of Service', to: '/terms' },
            { icon: ShieldAlert, label: 'Community Guidelines', to: '/code-of-conduct' },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <button 
                key={idx}
                onClick={() => navigate(item.to)}
                className="w-full flex items-center p-4 hover:bg-bg rounded-xl transition-colors active:bg-borderLight"
              >
                <Icon size={20} className="text-muted mr-4" />
                <span className="font-medium text-textMain flex-1 text-left">{item.label}</span>
                <ChevronRight size={20} className="text-muted/50" />
              </button>
            );
          })}

          <button 
            onClick={handleLogout}
            className="w-full flex items-center p-4 mt-2 hover:bg-failed-bg rounded-xl transition-colors text-failed-text active:bg-failed-bg/80"
          >
            <LogOut size={20} className="mr-4" />
            <span className="font-medium flex-1 text-left">Log Out</span>
          </button>
        </section>

        {/* Role Switch */}
        {user?.roles?.includes('PARTNER') || user?.roles?.includes('ADMIN') ? (
          <button 
            onClick={async () => {
              if (user.roles?.includes('ADMIN')) {
                navigate('/admin');
              } else {
                try {
                  await switchMode('PARTNER');
                  await refetchAccess();
                  navigate('/p/home');
                } catch(e) {
                  console.error(e);
                }
              }
            }}
            className="pill-outline w-full mb-6"
          >
            Go to {user.roles?.includes('ADMIN') ? 'Admin' : 'Partner'} Dashboard
          </button>
        ) : (
          <button 
            onClick={() => navigate('/pricing?intent=become_partner')}
            className="text-primary font-bold text-sm mb-6 underline underline-offset-4 decoration-primary/30"
          >
            Become a Partner
          </button>
        )}

      </main>
      </div>
    </div>
  );
};
