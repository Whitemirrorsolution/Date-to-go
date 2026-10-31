import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  isPartnerMode?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ title, showBack = true, rightAction, isPartnerMode = false }) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-borderLight flex justify-center">
      <div className="max-w-4xl mx-auto w-full px-4 py-4 flex items-center justify-between">
        <div className="w-10">
          {showBack && (
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 -ml-2 rounded-full hover:bg-bg transition-colors active:scale-95"
              aria-label="Go back"
            >
              <ChevronLeft size={24} className="text-textMain" />
            </button>
          )}
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center truncate">
          <h1 className="text-lg font-bold text-textMain truncate w-full text-center">
            {title}
          </h1>
          {isPartnerMode && (
            <span className="mt-0.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold tracking-wide uppercase border border-amber-500/20 leading-none">
              Partner Mode
            </span>
          )}
        </div>
        
        <div className="w-10 flex justify-end">
          {rightAction}
        </div>
      </div>
    </header>
  );
};
