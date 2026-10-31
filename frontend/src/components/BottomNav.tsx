import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Clock, CalendarCheck, User } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { pathname } = useLocation();

  // Hide on auth routes or checkout
  if (['/login', '/register', '/verify-otp', '/checkout'].some(p => pathname.startsWith(p))) {
    return null;
  }

  const navItems = [
    { to: '/home', icon: Home, label: 'Home' },
    { to: '/history', icon: Clock, label: 'History' },
    { to: '/booking', icon: CalendarCheck, label: 'Booking' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-primaryDark pb-safe z-50 rounded-t-[28px] shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
      <div className="flex justify-around items-center px-2 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.to);
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-1 min-w-[70px] p-2 rounded-2xl transition-all"
            >
              <Icon 
                size={24} 
                className={`transition-all ${isActive ? 'text-accent scale-110' : 'text-white/70'}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-[11px] font-medium transition-all ${isActive ? 'text-accent' : 'text-white/70'}`}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
