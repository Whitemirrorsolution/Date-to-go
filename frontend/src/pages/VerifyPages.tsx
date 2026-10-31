import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { StatusDialog, StatusVariant } from '../components/StatusDialog.js';
import { api, setAccessToken, formatApiError } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';

export const VerifyPages: React.FC = () => {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const phone = location.state?.phone || '';
  const isLogin = location.state?.isLogin || false;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  
  const [timer, setTimer] = useState(30);

  const [dialog, setDialog] = useState<{ isOpen: boolean; variant: StatusVariant; title: string; msg: string; btn: string; action: () => void; progressStep?: 1|2|3 }>({
    isOpen: false, variant: 'info', title: '', msg: '', btn: 'OK', action: () => {}
  });

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [timer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value.replace(/\D/g, '');
    if (!value) return;

    const newOtp = [...otp];
    newOtp[index] = value[value.length - 1]; // take last char if pasted
    setOtp(newOtp);

    if (index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputs.current[index - 1]?.focus();
      }
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6 || !phone) return;
    
    try {
      if (isLogin) {
        const res = await api.post<{ accessToken: string }>('/auth/login/otp/verify', { phone, otp: otpCode });
        if (res.success && res.data?.accessToken) {
          setAccessToken(res.data.accessToken);
          await refreshUser();
          setDialog({
            isOpen: true,
            variant: 'success',
            title: 'Welcome Back!',
            msg: 'Logged in successfully.',
            btn: 'Go to Dashboard ->',
            action: () => {
              setDialog(prev => ({ ...prev, isOpen: false }));
              navigate('/');
            }
          });
        }
      } else {
        const formData = location.state?.formData;
        if (!formData) throw new Error('Missing registration data');

        const payload = {
          role: 'USER',
          email: formData.email,
          intent: formData.intent,
          password: formData.password,
          fullName: formData.fullName,
          gender: formData.gender.toUpperCase(),
          dob: new Date(new Date().setFullYear(new Date().getFullYear() - 25)).toISOString().split('T')[0],
          city: formData.city || 'Unknown',
          pincode: formData.pincode,
          acceptedTerms: formData.consent,
          acceptedPrivacy: formData.consent,
          acceptedCommunity: formData.consent,
          phone: formData.mobile,
          otp: otpCode
        };

        const res = await api.post<{ accessToken: string }>('/auth/register', payload);
        if (res.success && res.data?.accessToken) {
          setAccessToken(res.data.accessToken);
          await refreshUser();
          setDialog({
            isOpen: true,
            variant: 'success',
            title: 'Phone Verified!',
            msg: `Your phone number has been verified successfully.`,
            btn: 'Choose a plan',
            action: () => {
              setDialog(prev => ({ ...prev, isOpen: false }));
              const intentParam = formData.intent === 'Become a partner' ? '?intent=become_partner' : '';
              navigate(`/pricing${intentParam}`);
            },
            progressStep: 2
          });
        }
      }
    } catch (err: any) {
      setDialog({
        isOpen: true,
        variant: 'error',
        title: 'Verification Failed',
        msg: formatApiError(err) || 'Invalid OTP',
        btn: 'Try Again',
        action: () => setDialog(prev => ({ ...prev, isOpen: false }))
      });
    }
  };

  const handleResend = async () => {
    try {
      if (isLogin) {
        await api.post('/auth/login/otp/request', { phone });
      } else {
        const formData = location.state?.formData;
        if (!formData) throw new Error('Missing registration data');
        
        const payload = {
          role: 'USER',
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          gender: formData.gender.toUpperCase(),
          dob: new Date(new Date().setFullYear(new Date().getFullYear() - 25)).toISOString().split('T')[0],
          city: formData.city || 'Unknown',
          pincode: formData.pincode,
          acceptedTerms: formData.consent,
          acceptedPrivacy: formData.consent,
          acceptedCommunity: formData.consent,
          phone: formData.mobile
        };
        await api.post('/auth/register/otp/request', payload);
      }
      setTimer(30);
    } catch (err: any) {
      alert(err.message || 'Failed to resend');
    }
  };

  const maskedPhone = phone ? `+91 ******${phone.slice(-4)}` : '+91 ******0000';

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
            Verify OTP
          </div>
        </div>

        {/* Splash Info */}
        <div className="flex flex-col items-center lg:items-start justify-center mt-2 lg:mt-0 text-center lg:text-left">
          <div className="hidden lg:flex w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/20 items-center justify-center mb-8 shadow-float">
            <span className="text-4xl lg:text-5xl text-white font-bold">D2G</span>
          </div>
          <h1 className="text-white text-[32px] lg:text-[56px] font-bold leading-tight mb-2 lg:mb-4">Check your SMS</h1>
          <p className="text-white/80 text-base lg:text-2xl">We've sent a 6-digit code to</p>
          <p className="text-white font-bold text-lg lg:text-3xl mt-1 lg:mt-2 tracking-widest">{maskedPhone}</p>
        </div>
      </div>

      {/* Right/Bottom Auth Card Area */}
      <div className="bg-white rounded-t-[40px] lg:rounded-none lg:rounded-l-[40px] flex-1 lg:flex-none w-full lg:w-[500px] xl:w-[600px] px-6 lg:px-12 pt-10 pb-safe flex flex-col shadow-[-10px_0_40px_rgba(0,0,0,0.1)] overflow-y-auto hide-scrollbar z-10">
        
        <div className="hidden lg:block mb-8">
          <h2 className="text-3xl font-black text-textMain">Verification</h2>
          <p className="text-muted mt-1">Please enter the OTP sent to your phone</p>
        </div>

        <form onSubmit={handleVerify} className="flex flex-col gap-8 flex-1">
            
            <div className="flex justify-between gap-2 px-2">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => inputs.current[idx] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(e, idx)}
                  onKeyDown={e => handleKeyDown(e, idx)}
                  className="w-12 h-14 bg-[#FAFAFA] border-[1.5px] border-[#E5E5E5] rounded-[16px] text-center text-2xl font-bold focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                />
              ))}
            </div>

            <div className="text-center">
              {timer > 0 ? (
                <p className="text-muted font-medium">Resend code in <span className="text-primary font-bold">{timer}s</span></p>
              ) : (
                <button type="button" onClick={handleResend} className="text-primary font-bold">Resend OTP</button>
              )}
            </div>

            <div className="mt-auto pt-6 flex flex-col gap-5 shrink-0">
              <button 
                type="submit" 
                disabled={otp.join('').length !== 6}
                className="w-full h-[56px] bg-[#6A00A0] text-white font-medium text-[20px] rounded-[28px] shadow-[0_8px_20px_rgba(106,0,160,0.3)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
              >
                Verify
              </button>
              <p className="text-center text-muted font-medium pb-4">
                Entered wrong number? <button type="button" onClick={() => navigate(-1)} className="text-primary font-bold ml-1">Change</button>
              </p>
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
          progressStep={dialog.progressStep as 1|2|3}
        />
    </div>
  );
};

// Expose individual pages if needed by routes
export const VerifyPhonePage = VerifyPages;
export const VerifyEmailPage = VerifyPages;
