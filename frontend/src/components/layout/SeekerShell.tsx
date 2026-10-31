import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SeekerNavbar } from '../../roles/seeker/components/SeekerNavbar.js';

export const SeekerShell: React.FC = () => {
  const { pathname } = useLocation();

  // Hide on auth routes or checkout
  if (['/login', '/register', '/verify-otp', '/checkout'].some(p => pathname.startsWith(p))) {
    return <Outlet />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg text-textMain selection:bg-primary/20 selection:text-primary">
      {/* Responsive Unified Seeker Navbar (Top Desktop bar + Bottom Mobile dock) */}
      <SeekerNavbar />

      {/* Main Content Viewport */}
      <main className="flex-1 w-full pb-24 md:pb-10 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

