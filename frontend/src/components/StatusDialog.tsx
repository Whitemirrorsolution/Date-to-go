import React from 'react';
import { Check, X, AlertTriangle, Info } from 'lucide-react';

export type StatusVariant = 'success' | 'error' | 'warning' | 'info';

interface StatusDialogProps {
  isOpen: boolean;
  variant: StatusVariant;
  title: string;
  message: string;
  details?: string[];
  buttonText: string;
  onClose: () => void;
  onAction: () => void;
  progressStep?: 1 | 2 | 3 | undefined;
  hideCloseIcon?: boolean;
}

export const StatusDialog: React.FC<StatusDialogProps> = ({
  isOpen,
  variant,
  title,
  message,
  details,
  buttonText,
  onClose,
  onAction,
  progressStep,
  hideCloseIcon
}) => {
  if (!isOpen) return null;

  const styles = {
    success: { bar: 'bg-gradient-to-r from-[#43A047] to-[#2E7D32]', iconBg: 'bg-green-50', ring: 'border-green-100', icon: 'text-green-600', btn: 'bg-gradient-to-r from-[#43A047] to-[#2E7D32]' },
    error: { bar: 'bg-gradient-to-r from-[#E53935] to-[#B71C1C]', iconBg: 'bg-red-50', ring: 'border-red-100', icon: 'text-red-600', btn: 'bg-gradient-to-r from-[#E53935] to-[#B71C1C]' },
    warning: { bar: 'bg-gradient-to-r from-[#FFA000] to-[#F57C00]', iconBg: 'bg-orange-50', ring: 'border-orange-100', icon: 'text-orange-600', btn: 'bg-gradient-to-r from-[#FFA000] to-[#F57C00]' },
    info: { bar: 'bg-gradient-to-r from-primary to-accent', iconBg: 'bg-primary/10', ring: 'border-primary/20', icon: 'text-primary', btn: 'bg-gradient-to-r from-primary to-accent' }
  }[variant];

  const Icon = variant === 'success' ? Check : variant === 'error' ? X : variant === 'warning' ? AlertTriangle : Info;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-[rgba(20,0,35,0.7)] backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-[36px] w-full max-w-[400px] overflow-hidden relative shadow-2xl animate-scale-in">
        {/* Top Color Bar */}
        <div className={`h-[6px] w-full ${styles.bar}`} />
        
        {/* Close Button */}
        {!hideCloseIcon && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-surface border border-borderLight rounded-full flex items-center justify-center text-muted shadow-sm z-10"
          >
            <X size={16} />
          </button>
        )}

        <div className="p-8 flex flex-col items-center text-center">
          {/* Icon Circle */}
          <div className={`w-[110px] h-[110px] rounded-full flex items-center justify-center ${styles.ring} border-[8px] mb-6`}>
            <div className={`w-[84px] h-[84px] rounded-full ${styles.iconBg} flex items-center justify-center`}>
              <Icon size={40} className={styles.icon} />
            </div>
          </div>

          <h2 className="text-[28px] font-bold text-textMain leading-tight mb-3">{title}</h2>
          <p className="text-[17px] text-muted mb-6 leading-relaxed">{message}</p>

          {details && details.length > 0 && (
            <div className="w-full text-left mb-6">
              {details.map((detail, idx) => (
                <div key={idx} className="flex items-start gap-2 mb-2 text-sm text-textMain/80 font-medium">
                  <Check size={16} className="text-success-text mt-0.5 shrink-0" /> {detail}
                </div>
              ))}
            </div>
          )}

          <hr className="w-full border-borderLight mb-6" />

          <button 
            onClick={onAction}
            className={`w-full h-[68px] rounded-pill text-white font-bold text-lg shadow-glow transition-transform active:scale-95 ${styles.btn}`}
          >
            {buttonText}
          </button>

          {/* Progress Dots */}
          {progressStep && (
            <div className="flex gap-2 mt-6 justify-center">
              {[1, 2, 3].map(step => (
                <div 
                  key={step} 
                  className={`h-2 rounded-full transition-all ${step === progressStep ? 'w-6 bg-primary' : 'w-2 bg-borderLight'}`} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
