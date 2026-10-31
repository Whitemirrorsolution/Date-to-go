import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, Sparkles, CalendarCheck, Clock, User, 
  Bell, Wallet, ArrowLeftRight, ChevronDown, 
  MapPin, LogOut, ShieldCheck, HelpCircle, 
  Settings, CreditCard, Plus, Heart
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext.js';
import { walletApi } from '../../../services/wallet.js';

export const SeekerNavbar: React.FC = () => {
  const { user, accessData, switchMode, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isPartner = accessData?.roles?.includes('PARTNER');
  const userInitial = user?.fullName?.charAt(0) || user?.email?.charAt(0) || 'U';

  // Load wallet balance
  useEffect(() => {
    let mounted = true;
    if (user) {
      walletApi.getBalance()
        .then(bal => {
          if (mounted) setWalletBalance(bal);
        })
        .catch(() => {});
    }
    return () => { mounted = false; };
  }, [user, location.pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { to: '/s/home', label: 'Home', icon: Home },
    { to: '/s/discover', label: 'Discover', icon: Sparkles, badge: 'Popular' },
    { to: '/s/booking', label: 'Bookings', icon: CalendarCheck },
    { to: '/s/history', label: 'History', icon: Clock },
  ];

  const mobileNavItems = [
    { to: '/s/home', label: 'Home', icon: Home },
    { to: '/s/discover', label: 'Discover', icon: Sparkles },
    { to: '/s/booking', label: 'Bookings', icon: CalendarCheck },
    { to: '/s/history', label: 'History', icon: Clock },
    { to: '/s/profile', label: 'Profile', icon: User },
  ];

  const handleModeSwitch = async () => {
    if (isPartner) {
      await switchMode('PARTNER');
      navigate('/p/dashboard');
    } else {
      navigate('/pricing?intent=become_partner');
    }
  };

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate('/login');
  };

  const formattedBalance = (walletBalance / 100).toLocaleString('en-IN', {
    maximumFractionDigits: 0
  });

  return (
    <>
      {/* ── TOP NAVBAR (Desktop & Tablet: md+) ── */}
      <header className="sticky top-0 z-50 w-full bg-white/30 backdrop-blur-xl border-b border-white/20 shadow-sm transition-all" style={{ backdropFilter: "blur(12px)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-18 flex items-center justify-between gap-4">
          
          {/* Left Brand & Logo */}
          <div className="flex items-center gap-3 md:gap-6">
            <NavLink 
              to="/s/home" 
              className="flex items-center gap-2.5 group transition-transform active:scale-95"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-md shadow-primary/20 group-hover:scale-105 transition-transform hover:shadow-lg" style={{ animation: "pulse 2s infinite" }}>
                <Sparkles size={20} className="animate-pulse" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-black tracking-tight text-textMain group-hover:text-primary transition-colors">
                    Date<span className="text-accent">ToGo</span>
                  </span>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                    Seeker
                  </span>
                </div>
              </div>
            </NavLink>

            {/* City / Location Pill (Desktop) */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg border border-borderLight text-xs font-semibold text-textMain">
              <MapPin size={14} className="text-primary shrink-0" />
              <span className="truncate max-w-[120px]">{user?.city || 'Mumbai'}</span>
            </div>
          </div>

          {/* Center Navigation Links (Desktop & Tablet) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`relative flex items-center gap-2 px-3.5 lg:px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-primary/20 text-primary shadow-md scale-105'
                      : 'text-muted hover:text-textMain hover:bg-white/10 hover:scale-105'
                  }`}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={`transition-colors duration-200 ${isActive ? 'text-primary' : 'text-muted'} `} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.2 rounded-md bg-accent text-[9px] font-black text-white uppercase tracking-tight">
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full" />
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Right Action Widgets */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Wallet Pill */}
            <button
              onClick={() => navigate('/s/wallet')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg hover:bg-borderLight/40 border border-borderLight transition-all active:scale-95 group"
              title="Open Wallet"
            >
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Wallet size={13} strokeWidth={2.5} />
              </div>
              <div className="flex items-center gap-1 text-left">
                <span className="text-xs font-black text-textMain">₹{formattedBalance}</span>
                <span className="hidden sm:inline-block text-[10px] text-primary font-bold">
                  <Plus size={11} strokeWidth={3} />
                </span>
              </div>
            </button>

            {/* Notifications Button */}
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2 sm:p-2.5 rounded-full bg-bg hover:bg-borderLight/40 border border-borderLight text-textMain transition-all active:scale-95"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full border-2 border-surface animate-pulse" />
            </button>

            {/* Role Switcher Button (Desktop & Tablet) */}
            <div className="hidden sm:block">
              {isPartner ? (
                <button
                  onClick={handleModeSwitch}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold border border-primary/25 transition-all active:scale-95"
                >
                  <ArrowLeftRight size={13} strokeWidth={2.5} />
                  <span>Partner Portal</span>
                </button>
              ) : (
                <button
                  onClick={handleModeSwitch}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-sm shadow-amber-500/20 transition-all active:scale-95"
                >
                  <span>Become Partner</span>
                  <span className="text-xs">✨</span>
                </button>
              )}
            </div>

            {/* User Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-1.5 p-1 rounded-full border border-borderLight hover:border-primary/50 transition-all active:scale-95 bg-surface shadow-xs"
                aria-label="User Menu"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold text-sm shadow-inner">
                  {userInitial}
                </div>
                <ChevronDown size={14} className={`hidden sm:block text-muted mr-1 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Popover */}
              {profileOpen && (
                <div className="absolute right-0 top-12 w-64 bg-surface rounded-2xl shadow-xl border border-borderLight py-2 z-50 animate-in fade-in zoom-in-95 origin-top-right">
                  {/* User Profile Summary */}
                  <div className="px-4 py-3 border-b border-borderLight/60">
                    <p className="font-black text-sm text-textMain truncate">
                      {user?.fullName || 'Valued Seeker'}
                    </p>
                    <p className="text-xs text-muted truncate mt-0.5">
                      {user?.email || user?.phone || 'seeker@datetogo.com'}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-[11px] font-bold text-success-text">
                      <ShieldCheck size={13} />
                      <span>Verified Seeker</span>
                    </div>
                  </div>

                  {/* Menu Links */}
                  <div className="py-1">
                    <button
                      onClick={() => { setProfileOpen(false); navigate('/s/profile'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-textMain hover:bg-bg transition-colors text-left"
                    >
                      <User size={15} className="text-primary" />
                      <span>My Profile</span>
                    </button>
                    <button
                      onClick={() => { setProfileOpen(false); navigate('/s/favorites'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-textMain hover:bg-bg transition-colors text-left"
                    >
                      <Heart size={15} className="text-primary" />
                      <span>Saved Partners</span>
                    </button>
                    <button
                      onClick={() => { setProfileOpen(false); navigate('/s/profile/details'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-textMain hover:bg-bg transition-colors text-left"
                    >
                      <Settings size={15} className="text-primary" />
                      <span>Personal Details</span>
                    </button>
                    <button
                      onClick={() => { setProfileOpen(false); navigate('/s/subscription'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-textMain hover:bg-bg transition-colors text-left"
                    >
                      <CreditCard size={15} className="text-primary" />
                      <span>Seeker Pass & Plans</span>
                    </button>
                    <button
                      onClick={() => { setProfileOpen(false); navigate('/help'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-textMain hover:bg-bg transition-colors text-left"
                    >
                      <HelpCircle size={15} className="text-primary" />
                      <span>Safety & Support</span>
                    </button>
                  </div>

                  {/* Switch Role Mobile Action in Dropdown */}
                  <div className="sm:hidden border-t border-borderLight/60 py-1">
                    <button
                      onClick={() => { setProfileOpen(false); handleModeSwitch(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-amber-600 hover:bg-amber-50 transition-colors text-left"
                    >
                      <ArrowLeftRight size={15} />
                      <span>{isPartner ? 'Switch to Partner Mode' : 'Become a Partner ✨'}</span>
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-borderLight/60 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-failed-text hover:bg-failed-bg/40 transition-colors text-left"
                    >
                      <LogOut size={15} />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </header>

      {/* ── MOBILE BOTTOM NAVIGATION (Mobile: < md) ── */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/30 backdrop-blur-xl border-t border-white/20 shadow-md pb-safe transition-all" style={{ backdropFilter: "blur(12px)" }}
        aria-label="Mobile Navigation"
      >
        <div className="max-w-md mx-auto px-3 py-1.5 flex items-center justify-around">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            const isDiscover = item.label === 'Discover';

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center min-w-[60px] py-1 px-2 rounded-2xl transition-all relative ${
                  isActive 
                    ? 'text-primary' 
                    : 'text-muted hover:text-textMain'
                }`}
              >
                {/* Active Indicator Backdrop Pill */}
                {isActive && (
                  <span className="absolute inset-x-1 inset-y-0.5 bg-primary/20 rounded-xl -z-10 animate-pulse" />
                )}

                <div className="relative">
                  <Icon 
                    size={22} 
                    strokeWidth={isActive ? 2.5 : 2}
                    className={`transition-transform duration-200 ${
                      isActive ? 'scale-110 text-primary' : 'text-muted'
                    } ${isDiscover && !isActive ? 'text-accent' : ''}`}
                  />
                  {/* Subtle sparkle dot on Discover */}
                  {isDiscover && (
                    <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-accent rounded-full animate-ping" />
                  )}
                </div>

                <span className={`text-[10px] mt-1 font-bold tracking-tight transition-colors ${
                  isActive ? 'text-primary' : 'text-muted'
                }`}>
                  {item.label}
                </span>

                {/* Micro Dot on Active */}
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
};
