import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { StatusDialog, StatusVariant } from '../components/StatusDialog.js';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');

  const [dialog, setDialog] = useState<{ isOpen: boolean; variant: StatusVariant; title: string; msg: string; btn: string; action: () => void }>({
    isOpen: false, variant: 'info', title: '', msg: '', btn: 'OK', action: () => {}
  });

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setDialog({
      isOpen: true,
      variant: 'info',
      title: 'Check your messages',
      msg: 'If an account exists, we have sent an OTP to recover your password.',
      btn: 'Enter OTP',
      action: () => {
        setDialog(prev => ({ ...prev, isOpen: false }));
        navigate('/reset-password');
      }
    });
  };

  return (
    <div className="h-[100dvh] w-full bg-primary flex flex-col lg:flex-row overflow-hidden">
      
      {/* Left/Top Splash Area */}
      <div className="flex-none lg:flex-1 w-full lg:w-1/2 flex flex-col relative p-5 lg:p-12 lg:justify-center">
        {/* Header */}
        <div className="pt-safe pb-8 flex items-center relative lg:absolute lg:top-8 lg:left-8 lg:w-full">
          <button onClick={() => navigate(-1)} className="w-14 h-14 bg-white/15 rounded-full flex items-center justify-center text-white lg:hover:bg-white/25 transition-colors absolute lg:static">
            <ChevronLeft size={28} />
          </button>
          <div className="w-full text-center text-white font-medium text-[22px] lg:hidden">
            Recover Password
          </div>
        </div>

        {/* Splash Info */}
        <div className="flex flex-col items-center lg:items-start justify-center mt-2 lg:mt-0 text-center lg:text-left">
          <div className="hidden lg:flex w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/20 items-center justify-center mb-8 shadow-float">
            <span className="text-4xl lg:text-5xl text-white font-bold">D2G</span>
          </div>
          <h1 className="text-white text-[32px] lg:text-[56px] font-bold leading-tight mb-2 lg:mb-4">Recover Password</h1>
          <p className="text-white/80 text-base lg:text-2xl max-w-[400px]">
            Enter your registered email or phone number to receive a reset code.
          </p>
        </div>
      </div>

      {/* Right/Bottom Auth Card Area */}
      <div className="bg-white rounded-t-[40px] lg:rounded-none lg:rounded-l-[40px] flex-1 lg:flex-none w-full lg:w-[500px] xl:w-[600px] px-6 lg:px-12 pt-10 pb-safe flex flex-col shadow-[-10px_0_40px_rgba(0,0,0,0.1)] overflow-y-auto hide-scrollbar z-10">
        
        <div className="hidden lg:block mb-8">
          <h2 className="text-3xl font-black text-textMain">Send OTP</h2>
          <p className="text-muted mt-1">We'll send you a secure code to reset your password.</p>
        </div>

        <form onSubmit={handleSendOtp} className="flex flex-col gap-6 flex-1">
            <div>
              <label className="block text-primary font-medium mb-2 pl-2 text-sm">Email or Phone Number <span className="text-failed-text">*</span></label>
              <input 
                type="text" 
                placeholder="Enter your registered details"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                className="w-full h-[56px] bg-[#FAFAFA] border-[1.5px] border-[#E5E5E5] rounded-[24px] px-5 text-base focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
              />
            </div>

            <div className="mt-auto pt-6 flex flex-col gap-5 shrink-0">
              <button 
                type="submit" 
                disabled={!identifier}
                className="w-full h-[56px] bg-[#6A00A0] text-white font-medium text-[20px] rounded-[28px] shadow-[0_8px_20px_rgba(106,0,160,0.3)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
              >
                Send OTP
              </button>
              <button type="button" onClick={() => navigate('/login')} className="text-primary font-bold text-center text-base pb-4">
                ← Back to Login
              </button>
            </div>
          </form>
        </div>

        <StatusDialog 
          isOpen={dialog.isOpen} 
          variant={dialog.variant} 
          title={dialog.title} 
          message={dialog.msg} 
          buttonText={dialog.btn} 
          onClose={() => setDialog(prev => ({ ...prev, isOpen: false }))} 
          onAction={dialog.action} 
        />
    </div>
  );
};

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  // Simplified for time...
  return (
    <div className="min-h-screen bg-bg p-6 flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold mb-4">Reset Password</h1>
      <p className="mb-6">Please pretend you entered OTP and a new password.</p>
      <button onClick={() => navigate('/login')} className="pill-outline px-6 py-2">Go to Login</button>
    </div>
  )
};

export const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-bg p-6 flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold mb-4">Change Password</h1>
      <p className="mb-6 text-center text-muted max-w-sm">
        For security reasons, password changes are handled via a reset link. Click below to initiate a password reset.
      </p>
      <div className="flex gap-4">
        <button onClick={() => navigate(-1)} className="px-6 py-2 rounded-full border border-borderLight text-textMain font-medium">Cancel</button>
        <button onClick={() => navigate('/forgot-password')} className="px-6 py-2 rounded-full bg-primary text-white font-bold shadow-md">Reset Password</button>
      </div>
    </div>
  )
};
