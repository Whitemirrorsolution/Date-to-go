import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { StatusDialog, StatusVariant } from '../components/StatusDialog.js';
import { useAuth } from '../context/AuthContext.js';
import { api, formatApiError } from '../services/api.js';
import { InstallButton } from '../components/InstallButton.js';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'password' | 'otp'>('password');
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Dialog State
  const [dialog, setDialog] = useState<{ isOpen: boolean; variant: StatusVariant; title: string; msg: string; btn: string; action: () => void }>({
    isOpen: false, variant: 'info', title: '', msg: '', btn: 'OK', action: () => {}
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(identifier, password);
      navigate('/');
    } catch (err: any) {
      setDialog({
        isOpen: true,
        variant: 'error',
        title: 'Login Failed',
        msg: formatApiError(err),
        btn: 'Try Again',
        action: () => setDialog(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) return;
    setIsLoading(true);

    try {
      await api.post('/auth/login/otp/request', { phone: identifier });
      
      setDialog({
        isOpen: true,
        variant: 'info',
        title: 'Check your messages',
        msg: 'If an account exists, we have sent an OTP via WhatsApp.',
        btn: 'Enter OTP ->',
        action: () => {
          setDialog(prev => ({ ...prev, isOpen: false }));
          navigate('/verify-otp', { state: { phone: identifier, isLogin: true } });
        }
      });
    } catch (err: any) {
      setDialog({
        isOpen: true,
        variant: 'error',
        title: 'Failed to send OTP',
        msg: formatApiError(err),
        btn: 'Try Again',
        action: () => setDialog(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setIsLoading(false);
    }
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
            Login
          </div>
        </div>

        {/* Splash Info */}
        <div className="flex flex-col items-center lg:items-start justify-center mt-2 lg:mt-0">
          <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/20 flex items-center justify-center mb-4 lg:mb-8 shadow-float">
            <span className="text-4xl lg:text-5xl text-white font-bold">D2G</span>
          </div>
          <h1 className="text-white text-[36px] lg:text-[56px] font-bold leading-tight text-center lg:text-left">Welcome Back</h1>
          <p className="text-white/80 text-lg lg:text-2xl mt-2 lg:mt-4 text-center lg:text-left">Login to continue your journey with us.</p>
        </div>
      </div>

      {/* Right/Bottom Auth Card Area */}
      <div className="bg-white rounded-t-[40px] lg:rounded-none lg:rounded-l-[40px] flex-1 lg:flex-none w-full lg:w-[500px] xl:w-[600px] px-6 lg:px-12 pt-8 pb-safe flex flex-col shadow-[-10px_0_40px_rgba(0,0,0,0.1)] overflow-y-auto hide-scrollbar z-10">
        
        <div className="hidden lg:block mb-8">
          <h2 className="text-3xl font-black text-textMain">Sign In</h2>
          <p className="text-muted mt-1">Enter your details to access your account</p>
        </div>

        {/* Segmented Tabs */}
        <div className="bg-[#F0E4F5] rounded-pill p-1.5 flex mb-8 shrink-0">
          <button 
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-3.5 rounded-pill font-bold text-[15px] transition-all ${activeTab === 'password' ? 'bg-primary text-white shadow-md' : 'text-primary'}`}
          >
            Password
          </button>
          <button 
            onClick={() => setActiveTab('otp')}
            className={`flex-1 py-3.5 rounded-pill font-bold text-[15px] transition-all ${activeTab === 'otp' ? 'bg-primary text-white shadow-md' : 'text-primary'}`}
          >
            Login with OTP
          </button>
        </div>

          {activeTab === 'password' ? (
            <form onSubmit={handleLogin} className="flex flex-col gap-5 flex-1">
              <div>
                <label className="block text-primary font-medium mb-2 pl-2 text-sm">Email or Phone Number <span className="text-failed-text">*</span></label>
                <input 
                  type="text" 
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your email or phone"
                  className="w-full h-[56px] bg-[#FAFAFA] border-[1.5px] border-[#E5E5E5] rounded-[24px] px-5 text-base focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-primary font-medium mb-2 pl-2 text-sm">Password <span className="text-failed-text">*</span></label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-[56px] bg-[#FAFAFA] border-[1.5px] border-[#E5E5E5] rounded-[24px] px-5 pr-12 text-base focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-primary p-1"
                  >
                    {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                  </button>
                </div>
              </div>
              
              <div className="text-right">
                <button type="button" onClick={() => navigate('/forgot-password')} className="text-primary font-bold text-sm">Forgot password?</button>
              </div>

              <div className="mt-auto pt-6 flex flex-col gap-5 shrink-0">
                <button type="submit" disabled={isLoading} className="flex justify-center items-center gap-2 w-full h-[56px] bg-[#6A00A0] text-white font-medium text-[20px] rounded-[28px] shadow-[0_8px_20px_rgba(106,0,160,0.3)] active:scale-[0.98] transition-all disabled:opacity-70 disabled:scale-100">
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={24} />
                      Loading...
                    </>
                  ) : (
                    'Login'
                  )}
                </button>
                <p className="text-center text-muted font-medium mb-2">
                  Don't have an account? <button type="button" onClick={() => navigate('/register')} className="text-primary font-bold ml-1">Register Now</button>
                </p>
                <div className="flex justify-center">
                  <InstallButton variant="pill" />
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-5 flex-1">
              <div>
                <label className="block text-primary font-medium mb-2 pl-2 text-sm">Phone Number <span className="text-failed-text">*</span></label>
                <div className="relative flex items-center">
                  <span className="absolute left-5 font-bold text-textMain">+91</span>
                  <input 
                    type="tel" 
                    inputMode="numeric"
                    maxLength={10}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    className="w-full h-[56px] bg-[#FAFAFA] border-[1.5px] border-[#E5E5E5] rounded-[24px] pl-[52px] pr-5 text-base font-bold tracking-wide focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                  />
                </div>
              </div>

              <div className="mt-auto pt-6 flex flex-col gap-5 shrink-0">
                <button type="submit" disabled={isLoading} className="flex justify-center items-center gap-2 w-full h-[56px] bg-[#6A00A0] text-white font-medium text-[20px] rounded-[28px] shadow-[0_8px_20px_rgba(106,0,160,0.3)] active:scale-[0.98] transition-all disabled:opacity-70 disabled:scale-100">
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={24} />
                      Loading...
                    </>
                  ) : (
                    'Continue'
                  )}
                </button>
                <p className="text-center text-muted font-medium mb-2">
                  Don't have an account? <button type="button" onClick={() => navigate('/register')} className="text-primary font-bold ml-1">Register Now</button>
                </p>
                <div className="flex justify-center">
                  <InstallButton variant="pill" />
                </div>
              </div>
            </form>
          )}
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
