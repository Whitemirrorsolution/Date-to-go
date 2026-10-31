import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingLayout } from '../../layout/OnboardingLayout.js';
import { WelcomeStep } from './WelcomeStep.js';
import { PhoneStep } from './PhoneStep.js';
import { OtpStep } from './OtpStep.js';
import { AgeConsentStep } from './AgeConsentStep.js';
import { RoleForkStep } from './RoleForkStep.js';
import { useAuth } from '../../context/AuthContext.js';
import { useAccess } from '../../shared/providers/AccessProvider.js';
import { SplashScreen } from '../../shared/components/SplashScreen.js';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, refreshUser, user } = useAuth();
  // Remove duplicate useAuth call


  // If the logged‑in user is an admin, skip onboarding completely
  useEffect(() => {
    if (isAuthenticated && user?.roles?.includes('ADMIN')) {
      // Adjust the destination to whatever admin dashboard route you have
      navigate('/admin', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);
  const { access, refetchAccess, isLoading: isAccessLoading } = useAccess();

  // Step indexes: 0: Welcome, 1: Phone, 2: OTP, 3: Consent, 4: Fork
  const [step, setStep] = useState<number>(0);
  const [phone, setPhone] = useState<string>('');
  const [initializing, setInitializing] = useState<boolean>(true);

  // Sync state with backend if authenticated
  useEffect(() => {
    if (isAccessLoading) return;

    if (isAuthenticated && access) {
      if (access.onboardingState === 'PHONE_VERIFIED') {
        setStep(3); // Age & Consent
      } else if (access.onboardingState === 'FORK') {
        setStep(4); // Role Fork
      } else if (access.onboardingState === 'IN_PROGRESS') {
        if (access.nextRoute) {
          navigate(access.nextRoute, { replace: true });
          return;
        }
        if (access.activeRole === 'PARTNER') {
          navigate('/onboarding/partner', { replace: true });
        } else {
          navigate('/onboarding/seeker', { replace: true });
        }
        return;
      } else if (access.onboardingState === 'SUBMITTED' || access.onboardingState === 'LIVE') {
        if (access.activeRole === 'PARTNER') {
          if (!access.entitlements?.partner?.active && !user?.roles?.includes('ADMIN')) {
            navigate('/pricing', { replace: true });
          } else {
            navigate('/p/dashboard', { replace: true });
          }
        } else {
          navigate('/s/home', { replace: true });
        }
        return;
      }
    }
    setInitializing(false);
  }, [isAuthenticated, access, isAccessLoading, navigate]);

  if (initializing && isAccessLoading) {
    return <SplashScreen />;
  }

  const handlePhoneSuccess = (enteredPhone: string) => {
    setPhone(enteredPhone);
    setStep(2); // OTP Step
  };

  const handleOtpSuccess = async () => {
    // Refresh user & access snapshot
    await refreshUser();
    const updatedAccess = await refetchAccess();

    if (updatedAccess?.onboardingState === 'FORK') {
      setStep(4);
    } else if (updatedAccess?.onboardingState === 'LIVE') {
      navigate(updatedAccess.nextRoute || '/s/home', { replace: true });
    } else {
      setStep(3); // Age & Consent
    }
  };

  const handleConsentSuccess = async () => {
    await refreshUser();
    await refetchAccess();
    setStep(4); // Role Fork Step
  };

  const handleRoleForkSuccess = async (data: { role: string; nextRoute: string; currentStep: string }) => {
    await refreshUser();
    await refetchAccess();

    if (data.nextRoute) {
      navigate(data.nextRoute, { replace: true });
    } else if (data.role === 'PARTNER') {
      navigate('/onboarding/partner', { replace: true });
    } else {
      navigate('/onboarding/seeker', { replace: true });
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    else if (step === 1) setStep(0);
    else if (step > 0) setStep((s) => s - 1);
  };

  return (
    <OnboardingLayout
      currentStep={step}
      totalSteps={4}
      showBack={step > 0 && step < 4}
      onBack={handleBack}
    >
      {step === 0 && (
        <WelcomeStep
          onStart={() => setStep(1)}
          onLogin={() => navigate('/login')}
        />
      )}

      {step === 1 && (
        <PhoneStep
          initialPhone={phone}
          onSuccess={handlePhoneSuccess}
        />
      )}

      {step === 2 && (
        <OtpStep
          phone={phone}
          onEditPhone={() => setStep(1)}
          onSuccess={handleOtpSuccess}
        />
      )}

      {step === 3 && (
        <AgeConsentStep
          onSuccess={handleConsentSuccess}
        />
      )}

      {step === 4 && (
        <RoleForkStep
          onSuccess={handleRoleForkSuccess}
        />
      )}
    </OnboardingLayout>
  );
};
