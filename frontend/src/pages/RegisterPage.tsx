import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { StatusDialog, StatusVariant } from '../components/StatusDialog.js';
import { api, formatApiError } from '../services/api.js';
import { InstallButton } from '../components/InstallButton.js';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  React.useEffect(() => {
    navigate('/onboarding', { replace: true });
  }, [navigate]);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState(() => {
    const saved = sessionStorage.getItem('dtg_register_form');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      mobile: '',
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      pincode: '',
      city: '',
      gender: '',
      intent: '',
      consent: false
    };
  });

  React.useEffect(() => {
    sessionStorage.setItem('dtg_register_form', JSON.stringify(formData));
  }, [formData]);

  // Dialog State
  const [dialog, setDialog] = useState<{ isOpen: boolean; variant: StatusVariant; title: string; msg: string; btn: string; action: () => void }>({
    isOpen: false, variant: 'info', title: '', msg: '', btn: 'OK', action: () => {}
  });

  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setFormData((prev: any) => ({ ...prev, pincode: val }));
    
    if (val.length === 6) {
      try {
        const res = await api.get<any>(`/geo/pincode/${val}`);
        const data = res.data;

        if (data.success) {
          setFormData((prev: any) => ({ ...prev, city: data.city }));
          setDialog({
            isOpen: true,
            variant: 'success',
            title: '📍 Address Found!',
            msg: `✓ City: ${data.city}\n✓ State: ${data.state}\nCity has been auto-filled automatically!`,
            btn: 'OK',
            action: () => setDialog((prev: any) => ({ ...prev, isOpen: false }))
          });
        } else {
          throw new Error('Not found');
        }
      } catch (err) {
        setFormData((prev: any) => ({ ...prev, city: '' }));
        setDialog({
          isOpen: true,
          variant: 'error',
          title: 'Pincode not found',
          msg: 'Please check the 6-digit pincode and try again.',
          btn: 'OK',
          action: () => setDialog((prev: any) => ({ ...prev, isOpen: false }))
        });
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const payload = {
        role: 'USER',
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        gender: formData.gender.toUpperCase(),
        dob: new Date(new Date().setFullYear(new Date().getFullYear() - 25)).toISOString().split('T')[0], // YYYY-MM-DD
        city: formData.city || 'Unknown',
        pincode: formData.pincode,
        acceptedTerms: formData.consent,
        acceptedPrivacy: formData.consent,
        acceptedCommunity: formData.consent,
        phone: formData.mobile,
        intent: formData.intent
      };

      const res = await api.post<any>('/auth/register/otp/request', payload);
      
      if (res.success) {
        setDialog({
          isOpen: true,
          variant: 'success',
          title: '🎉 Registration Successful!',
          msg: `Welcome, ${formData.fullName}!\nWe've sent an OTP to ${formData.mobile}. Please verify to complete your registration.`,
          btn: 'Continue Now',
          action: () => {
            setDialog((prev: any) => ({ ...prev, isOpen: false }));
            navigate('/verify-otp', { state: { formData, phone: formData.mobile, isLogin: false } });
          }
        });
      }
    } catch (err: any) {
      setDialog({
        isOpen: true,
        variant: 'error',
        title: 'Registration Failed',
        msg: formatApiError(err),
        btn: 'Try Again',
        action: () => setDialog((prev: any) => ({ ...prev, isOpen: false }))
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
            Create Account
          </div>
        </div>

        {/* Splash Info */}
        <div className="flex flex-col items-center lg:items-start justify-center mt-2 lg:mt-0 lg:hidden">
          <h1 className="text-white text-[32px] font-bold leading-tight text-center">Join Us</h1>
        </div>
        <div className="hidden lg:flex flex-col items-start justify-center mt-2 lg:mt-0">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/20 flex items-center justify-center mb-8 shadow-float">
            <span className="text-5xl text-white font-bold">D2G</span>
          </div>
          <h1 className="text-white text-[56px] font-bold leading-tight">Create Account</h1>
          <p className="text-white/80 text-2xl mt-4">Join our community today.</p>
        </div>
      </div>

      {/* Right/Bottom Auth Card Area */}
      <div className="bg-white rounded-t-[40px] lg:rounded-none lg:rounded-l-[40px] flex-1 lg:flex-none w-full lg:w-[500px] xl:w-[600px] px-6 lg:px-12 pt-8 pb-safe flex flex-col shadow-[-10px_0_40px_rgba(0,0,0,0.1)] overflow-y-auto hide-scrollbar z-10">
        
        <div className="hidden lg:block mb-6">
          <h2 className="text-3xl font-black text-textMain">Sign Up</h2>
          <p className="text-muted mt-1">Please fill in your details</p>
        </div>
        
        <form onSubmit={handleRegister} className="flex flex-col gap-5 flex-1">
          
          <div>
            <label className="block text-primary font-medium mb-3 pl-2 text-sm">I want to... <span className="text-failed-text">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({...formData, intent: 'Find a partner'})}
                className={`py-3 px-4 rounded-[20px] font-bold text-sm border-2 transition-all ${
                  formData.intent === 'Find a partner' 
                    ? 'border-primary bg-primary/10 text-primary' 
                    : 'border-[#E5E5E5] bg-[#FAFAFA] text-muted'
                }`}
              >
                Find a Partner
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, intent: 'Become a partner'})}
                className={`py-3 px-4 rounded-[20px] font-bold text-sm border-2 transition-all ${
                  formData.intent === 'Become a partner' 
                    ? 'border-primary bg-primary/10 text-primary' 
                    : 'border-[#E5E5E5] bg-[#FAFAFA] text-muted'
                }`}
              >
                Become a Partner
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-primary font-medium mb-2 pl-2 text-sm">Mobile Number <span className="text-failed-text">*</span></label>
            <div className="relative flex items-center">
              <span className="absolute left-5 font-bold text-textMain flex items-center gap-1">🇮🇳 +91</span>
              <input 
                type="tel" 
                inputMode="numeric"
                maxLength={10}
                placeholder="9876543210"
                value={formData.mobile}
                onChange={e => setFormData({...formData, mobile: e.target.value})}
                className="w-full h-[56px] bg-[#FAFAFA] border-[1.5px] border-[#E5E5E5] rounded-[24px] pl-[85px] pr-5 text-base font-bold tracking-wide focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-primary font-medium mb-2 pl-2 text-sm">Email <span className="text-failed-text">*</span></label>
            <input 
              type="email" 
              placeholder="you@example.com"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full h-[56px] bg-[#FAFAFA] border-[1.5px] border-[#E5E5E5] rounded-[24px] px-5 text-base focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-primary font-medium mb-2 pl-2 text-sm">Password <span className="text-failed-text">*</span></label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Min 10 chars, symbols & numbers"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full h-[56px] bg-[#FAFAFA] border-[1.5px] border-[#E5E5E5] rounded-[24px] px-5 pr-12 text-base focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-primary p-1">
                {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-primary font-medium mb-2 pl-2 text-sm">Confirm Password <span className="text-failed-text">*</span></label>
            <div className="relative">
              <input 
                type={showConfirm ? 'text' : 'password'} 
                placeholder="Repeat password"
                value={formData.confirmPassword}
                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                className="w-full h-[56px] bg-[#FAFAFA] border-[1.5px] border-[#E5E5E5] rounded-[24px] px-5 pr-12 text-base focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-primary p-1">
                {showConfirm ? <EyeOff size={22} /> : <Eye size={22} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-primary font-medium mb-2 pl-2 text-sm">Full Name <span className="text-failed-text">*</span></label>
            <input 
              type="text" 
              placeholder="As per government ID"
              value={formData.fullName}
              onChange={e => setFormData({...formData, fullName: e.target.value})}
              className="w-full h-[56px] bg-[#FAFAFA] border-[1.5px] border-[#E5E5E5] rounded-[24px] px-5 text-base focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-primary font-medium mb-2 pl-2 text-sm">Pincode <span className="text-failed-text">*</span></label>
              <input 
                type="text" 
                inputMode="numeric"
                maxLength={6}
                placeholder="e.g. 400001"
                value={formData.pincode}
                onChange={handlePincodeChange}
                className="w-full h-[56px] bg-[#FAFAFA] border-[1.5px] border-[#E5E5E5] rounded-[24px] px-5 text-base focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none tracking-widest"
              />
            </div>
            <div>
              <label className="block text-primary font-medium mb-2 pl-2 text-sm">City <span className="text-failed-text">*</span></label>
              <input 
                type="text" 
                placeholder="Auto-fill"
                value={formData.city}
                readOnly
                className="w-full h-[56px] bg-[#E5E5E5]/50 border-[1.5px] border-[#E5E5E5] rounded-[24px] px-5 text-base text-muted outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-primary font-medium mb-2 pl-2 text-sm">Gender <span className="text-failed-text">*</span></label>
            <select 
              value={formData.gender}
              onChange={e => setFormData({...formData, gender: e.target.value})}
              className="w-full h-[56px] bg-[#FAFAFA] border-[1.5px] border-[#E5E5E5] rounded-[24px] px-5 text-base focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none appearance-none"
            >
              <option value="" disabled>Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-primary font-medium mb-2 pl-2 text-sm">I want to <span className="text-failed-text">*</span></label>
            <select 
              value={formData.intent}
              onChange={e => setFormData({...formData, intent: e.target.value})}
              className="w-full h-[56px] bg-[#FAFAFA] border-[1.5px] border-[#E5E5E5] rounded-[24px] px-5 text-base focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none appearance-none"
            >
              <option value="" disabled>Select your goal</option>
              <option value="Find a partner">Find a partner</option>
              <option value="Become a partner">Become a partner</option>
            </select>
          </div>

          <div className="flex items-start gap-3 p-2 mt-2">
            <input 
              type="checkbox" 
              id="consent"
              checked={formData.consent}
              onChange={e => setFormData({...formData, consent: e.target.checked})}
              className="mt-1 w-5 h-5 rounded border-2 border-primary text-primary focus:ring-primary"
            />
            <label htmlFor="consent" className="text-xs text-muted font-medium leading-relaxed">
              I am 18 or older and I agree to the <a href="/terms" className="text-primary font-bold">Terms of Service</a>, <a href="/privacy" className="text-primary font-bold">Privacy Policy</a> and <a href="/code-of-conduct" className="text-primary font-bold">Code of Conduct</a>.
            </label>
          </div>

          <div className="mt-4 flex flex-col gap-5">
            <button 
              type="submit" 
              disabled={!formData.consent || isLoading}
              className="flex justify-center items-center gap-2 w-full h-[56px] bg-[#6A00A0] text-white font-medium text-[20px] rounded-[28px] shadow-[0_8px_20px_rgba(106,0,160,0.3)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none disabled:scale-100"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  Loading...
                </>
              ) : (
                'Create Account'
              )}
            </button>
            <p className="text-center text-muted font-medium pb-2">
              Already have an account? <button type="button" onClick={() => navigate('/login')} className="text-primary font-bold ml-1">Login Now</button>
            </p>
            <div className="flex justify-center pb-2">
              <InstallButton variant="pill" />
            </div>
          </div>
        </form>
      </div>

      <StatusDialog 
        isOpen={dialog.isOpen} 
        variant={dialog.variant} 
        title={dialog.title} 
        message={dialog.msg} 
        buttonText={dialog.btn} 
        onClose={() => setDialog((prev: any) => ({ ...prev, isOpen: false }))} 
        onAction={dialog.action} 
        {...(dialog.variant === 'success' ? { progressStep: 1 } : {})}
      />
    </div>
  );
};
