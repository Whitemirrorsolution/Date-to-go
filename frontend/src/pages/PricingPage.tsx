import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Check, Zap, Sparkles } from 'lucide-react';
import { api, loadRazorpayScript } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useAccess } from '../shared/providers/AccessProvider.js';
import { resolveHomeRoute } from '@date-to-go/access-policy';
import { CheckoutSheet } from './CheckoutSheet.js';
import { StatusDialog, StatusVariant } from '../components/StatusDialog.js';

interface Plan {
  _id: string;
  name: string;
  pricePaise: number;
  durationDays: number;
  features: string[];
}

interface SubscriptionData {
  _id: string;
  status: string;
  endsAt: string;
  planId?: {
    _id: string;
    name: string;
  };
}

export const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser, switchMode } = useAuth();
  const { refetchAccess } = useAccess();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSub, setCurrentSub] = useState<SubscriptionData | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [dialog, setDialog] = useState<{ isOpen: boolean; variant: StatusVariant; title: string; msg: string; btn: string; action: () => void; progressStep?: 1|2|3 }>({
    isOpen: false, variant: 'info', title: '', msg: '', btn: 'OK', action: () => {}
  });

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isBecomePartner = searchParams.get('intent') === 'become_partner' || user?.activeMode === 'PARTNER' || location.pathname === '/p/renew';
  
  useEffect(() => {
    if (user !== undefined) {
      fetchPlans();
    }
  }, [user, location.search]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      
      const audience = isBecomePartner ? 'PARTNER' : 'SEEKER';

      const [plansRes, subRes] = await Promise.all([
        api.get<Plan[]>(`/plans?audience=${audience}`).catch(() => ({ success: false, data: [] })),
        api.get<{ currentSubscription: SubscriptionData | null }>('/payments/subscription').catch(() => ({ success: false, data: null }))
      ]);
      
      if (plansRes.success && plansRes.data) setPlans(plansRes.data);
      if (subRes.data?.currentSubscription) setCurrentSub(subRes.data.currentSubscription);
    } catch (err) {
      console.error('Failed to fetch plans', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPlanId) return;
    try {
      setProcessing(true);
      
      // 1. Create Order
      const orderRes = await api.post<any>('/payments/plan/order', { planId: selectedPlanId });
      if (!orderRes.success || !orderRes.data) throw new Error('Order creation failed');
      
      const { orderId, amountPaise: amount, currency, keyId: rzpKeyId } = orderRes.data;
      
      // 2. Load Razorpay
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Razorpay SDK failed to load');

      // 3. Open Razorpay Checkout
      const options = {
        key: rzpKeyId, 
        amount: amount.toString(),
        currency: currency,
        name: 'Date to Go',
        description: 'Plan Subscription',
        order_id: orderId,
        handler: async (response: any) => {
          try {
            setProcessing(true);
            setDialog({
              isOpen: true,
              variant: 'info',
              title: 'Payment Processing',
              msg: 'Please wait while we confirm your payment securely...',
              btn: '',
              action: () => {}
            });
            // 4. Verify Payment
            let isFulfilled = false;
            try {
              const verifyRes = await api.post<{ success: boolean; data?: any }>('/payments/verify', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              isFulfilled = verifyRes.data?.success || false;
            } catch (err: any) {
              // If it returns 409 (PAYMENT_PROCESSING), it means the webhook is handling it. Fallback to polling.
              if (err.status !== 409) {
                throw err;
              }
            }
            let attempts = 0;
            while (!isFulfilled && attempts < 30) {
              const statusRes = await api.get<{ isFulfilled: boolean }>(`/payments/status/${response.razorpay_order_id}`);
              if (statusRes.success && statusRes.data?.isFulfilled) {
                isFulfilled = true;
                break;
              }
              await new Promise(resolve => setTimeout(resolve, 2000));
              attempts++;
            }

            if (isFulfilled) {
              await refreshUser();
              if (isBecomePartner) {
                try {
                  await switchMode('PARTNER');
                } catch (err) {
                  console.error('Failed to switch mode to PARTNER', err);
                }
              }
              const newAccess = await refetchAccess();
              window.dispatchEvent(new CustomEvent('dtg:payment_success'));
              
              setDialog({
                isOpen: true,
                variant: 'success',
                title: '🎉 Payment Successful',
                msg: `Your ${selectedPlan?.name || 'subscription'} is now active!`,
                btn: 'Go to Dashboard',
                action: () => {
                  setDialog(prev => ({ ...prev, isOpen: false }));
                  if (newAccess) {
                    const home = resolveHomeRoute(newAccess);
                    navigate(home, { replace: true });
                  } else {
                    navigate('/', { replace: true });
                  }
                }
              });
            } else {
              setDialog({
                isOpen: true,
                variant: 'error',
                title: 'Processing Delayed',
                msg: 'Payment is taking longer than expected to process. Please check your dashboard later.',
                btn: 'Go to Dashboard',
                action: () => {
                  setDialog(prev => ({ ...prev, isOpen: false }));
                  navigate('/', { replace: true });
                }
              });
            }
          } catch (err) {
            setProcessing(false);
            setDialog({
              isOpen: true,
              variant: 'error',
              title: 'Verification Failed',
              msg: 'Payment verification failed. If money was deducted, it will be refunded automatically.',
              btn: 'OK',
              action: () => setDialog(prev => ({ ...prev, isOpen: false }))
            });
          }
        },
        prefill: {
          email: user?.email || '',
        },
        theme: {
          color: '#7000A4'
        },
        modal: {
          ondismiss: () => setProcessing(false)
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setProcessing(false);
        setDialog({
          isOpen: true,
          variant: 'error',
          title: 'Payment Failed',
          msg: response.error.description || 'An error occurred during payment.',
          btn: 'Try Again',
          action: () => setDialog(prev => ({ ...prev, isOpen: false }))
        });
      });
      rzp.open();

    } catch (err: any) {
      console.error(err);
      setProcessing(false);
      setDialog({
        isOpen: true,
        variant: 'error',
        title: 'Checkout Failed',
        msg: err.message || 'Failed to initiate checkout',
        btn: 'OK',
        action: () => setDialog(prev => ({ ...prev, isOpen: false }))
      });
    }
  };

  const selectedPlan = plans.find(p => p._id === selectedPlanId);
  const totalAmount = selectedPlan ? (selectedPlan.pricePaise / 100).toFixed(2) : '0';

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0518] flex flex-col pb-28 text-white relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[30%] bg-[#7000A4] rounded-full blur-[120px] opacity-40 mix-blend-screen pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[30%] bg-[#FF2D55] rounded-full blur-[120px] opacity-20 mix-blend-screen pointer-events-none"></div>

      <div className="pt-safe px-5 pt-6 pb-6 flex items-center relative z-10">
        <button onClick={() => navigate(-1)} className="w-12 h-12 bg-white/10 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white absolute hover:bg-white/20 transition-all">
          <ChevronLeft size={24} />
        </button>
        <div className="w-full text-center font-bold text-[24px] tracking-wide">
          Membership
        </div>
      </div>

      <div className="px-6 mb-8 text-center z-10 relative">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-4">
          <Sparkles size={16} className="text-[#FF2D55]" />
          <span className="text-sm font-semibold tracking-wide text-white/90">UNLOCK PREMIUM</span>
        </div>
        <h1 className="text-4xl font-extrabold mb-3 leading-tight bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
          Elevate Your Journey
        </h1>
        <p className="text-white/60 text-base leading-relaxed max-w-sm mx-auto">
          Choose a plan to get unlimited access to verified profiles, priority support, and exclusive events.
        </p>

        {currentSub && currentSub.status === 'ACTIVE' && (
          <div className="mt-6 p-4 rounded-2xl bg-white/10 border border-[#7000A4] backdrop-blur-md">
            <p className="text-white font-bold text-lg mb-1">Your Active Subscription</p>
            <p className="text-white/70 text-sm">
              <span className="text-[#FF2D55] font-bold">{currentSub.planId?.name || 'Premium Plan'}</span> — Valid until {new Date(currentSub.endsAt).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      <div className="px-5 flex flex-col gap-6 z-10">
        {plans.length === 0 ? (
          <div className="text-center text-white/50 py-10 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
            No active plans available at the moment.
          </div>
        ) : (
          plans.map((plan, index) => {
            const isSelected = selectedPlanId === plan._id;
            const price = plan.pricePaise / 100;
            // Highlight the middle plan generally, or the selected one
            const isPopular = index === 1 && !selectedPlanId; 
            
            return (
              <div 
                key={plan._id}
                onClick={() => setSelectedPlanId(plan._id)}
                className={`relative rounded-[32px] p-1 cursor-pointer transition-all duration-300 transform ${isSelected || isPopular ? 'scale-[1.02]' : 'scale-100 hover:scale-[1.01]'}`}
              >
                {/* Gradient Border Wrap */}
                <div className={`absolute inset-0 rounded-[32px] transition-opacity duration-300 ${isSelected ? 'bg-gradient-to-br from-[#7000A4] to-[#FF2D55] opacity-100' : 'bg-white/10 opacity-100'}`}></div>
                
                {/* Card Content */}
                <div className={`relative h-full rounded-[30px] p-6 backdrop-blur-xl transition-all duration-300 ${isSelected ? 'bg-[#1A0B2E]' : 'bg-[#150A21] border border-white/5 hover:bg-[#1A0B2E]'}`}>
                  
                  {isSelected && (
                    <div className="absolute top-0 right-8 -translate-y-1/2 bg-gradient-to-r from-[#7000A4] to-[#FF2D55] text-white text-[11px] font-bold px-4 py-1.5 rounded-full shadow-[0_4px_15px_rgba(112,0,164,0.4)] uppercase tracking-wider flex items-center gap-1">
                      <Check size={12} strokeWidth={4} /> Selected
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-1">{plan.name}</h3>
                      <p className="text-white/50 text-sm font-medium">{plan.durationDays} Days Access</p>
                    </div>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${isSelected ? 'bg-gradient-to-br from-[#7000A4] to-[#FF2D55] shadow-[0_0_15px_rgba(112,0,164,0.5)]' : 'bg-white/10 border border-white/20'}`}>
                      {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-extrabold text-white">₹{price}</span>
                    <span className="text-[13px] font-bold text-white/40 tracking-wider">+ GST</span>
                  </div>
                  
                  {plan.features.length > 0 && (
                    <div className="space-y-3 pt-5 border-t border-white/10">
                      {plan.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-gradient-to-br from-[#7000A4] to-[#FF2D55] text-white' : 'bg-white/10 text-white/70'}`}>
                            <Check size={12} strokeWidth={isSelected ? 4 : 3} />
                          </div>
                          <span className={`text-[15px] font-medium leading-tight ${isSelected ? 'text-white/90' : 'text-white/60'}`}>{feat}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-gradient-to-t from-[#0D0518] via-[#0D0518] to-transparent pt-12 pb-safe z-20 flex justify-center">
        <div className="w-full max-w-md px-5 pb-5">
          <button 
            disabled={!selectedPlanId || processing}
            onClick={() => setShowCheckout(true)}
            className="relative w-full h-[56px] rounded-full font-bold text-[17px] overflow-hidden transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Button Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#7000A4] via-[#9D00FF] to-[#FF2D55] transition-transform duration-500 group-hover:scale-105"></div>
            
            {/* Button Content */}
            <div className="relative flex items-center justify-center gap-2 text-white h-full">
              {processing ? (
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  {selectedPlanId ? (
                    <>Checkout • ₹{totalAmount} <Zap size={20} className="fill-current" /></>
                  ) : (
                    'Select a Plan to Continue'
                  )}
                </>
              )}
            </div>
          </button>
        </div>
      </div>

      <CheckoutSheet 
        isOpen={showCheckout} 
        onClose={() => setShowCheckout(false)}
        planName={selectedPlan?.name || ''}
        pricePaise={selectedPlan?.pricePaise || 0}
        onPay={handlePurchase}
        processing={processing}
      />

      <StatusDialog 
        isOpen={dialog.isOpen} 
        variant={dialog.variant} 
        title={dialog.title} 
        message={dialog.msg} 
        buttonText={dialog.btn} 
        onClose={dialog.action} 
        onAction={dialog.action}
        progressStep={dialog.progressStep}
        hideCloseIcon={dialog.title === 'Payment Processing'}
      />
    </div>
  );
};
