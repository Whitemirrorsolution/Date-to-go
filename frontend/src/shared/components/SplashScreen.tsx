import React from 'react';

export const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-primary">
      {/* Logo container */}
      <div className="relative mb-8 flex h-24 w-24 items-center justify-center rounded-2xl bg-white shadow-xl">
        <span className="text-4xl font-extrabold text-primary">DG</span>
        
        {/* Simple ripple animation using Tailwind */}
        <div className="absolute inset-0 -z-10 animate-ping rounded-2xl bg-white opacity-40"></div>
      </div>
      
      {/* Brand Text */}
      <h1 className="text-3xl font-black tracking-tight text-white mb-2">
        Date to Go
      </h1>
      <p className="text-primary-100/80 font-medium">
        Loading your experience...
      </p>

      {/* Modern thin loader bar */}
      <div className="absolute bottom-12 w-48 overflow-hidden rounded-full bg-white/20 h-1.5">
        <div className="h-full w-full origin-left animate-[progress_1.5s_ease-in-out_infinite] bg-white rounded-full"></div>
      </div>
    </div>
  );
};
