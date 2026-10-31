import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle } from 'lucide-react';
import { walletApi } from '../services/wallet.js';
import { api } from '../services/api.js';

const TOPUP_PACKAGES = [
  { amount: 500, label: 'Starter' },
  { amount: 1500, label: 'Popular' },
  { amount: 3000, label: 'Value' },
  { amount: 5000, label: 'Pro' },
];

export const WalletTopupPage: React.FC = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState<number>(TOPUP_PACKAGES[1].amount);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleTopup = async () => {
    const finalAmount = customAmount ? parseInt(customAmount) : amount;
    if (!finalAmount || finalAmount < 100) {
      alert('Minimum topup amount is ₹100');
      return;
    }

    setIsProcessing(true);
    try {
      const configRes = await api.get<{ data: { keyId: string } }>('/payments/config');
      const keyId = configRes.data!.data.keyId;

      const order = await walletApi.createTopupOrder(finalAmount * 100);

      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Date to Go',
        description: 'Wallet Top-up',
        order_id: order.id,
        handler: async (response: any) => {
          try {
            await walletApi.verifyTopup(
              response.razorpay_payment_id,
              response.razorpay_order_id,
              response.razorpay_signature,
              order.amount
            );
            setIsSuccess(true);
            setTimeout(() => navigate('/wallet'), 2000);
          } catch (err) {
            alert('Verification failed');
            setIsProcessing(false);
          }
        },
        theme: { color: '#E11D48' },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', () => {
        setIsProcessing(false);
        alert('Payment failed');
      });
      rzp.open();
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      alert('Failed to initiate topup');
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-bg min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <CheckCircle size={64} className="text-green-500 mb-4" />
        <h2 className="text-2xl font-black text-textMain mb-2">Top-up Successful!</h2>
        <p className="text-muted">Your wallet has been credited.</p>
      </div>
    );
  }

  return (
    <div className="bg-bg min-h-screen text-textMain pb-20">
      <header className="bg-surface sticky top-0 z-10 px-4 py-4 flex items-center shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-textMain active:bg-borderLight rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold ml-2">Add Money</h1>
      </header>

      <main className="p-4 space-y-6">
        <section className="card p-6">
          <h2 className="text-lg font-bold mb-4">Select Amount</h2>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {TOPUP_PACKAGES.map((pkg) => (
              <button
                key={pkg.amount}
                onClick={() => {
                  setAmount(pkg.amount);
                  setCustomAmount('');
                }}
                className={`py-3 px-4 rounded-xl border-2 font-bold transition-colors ${
                  amount === pkg.amount && !customAmount
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-borderLight text-textMain hover:border-primary/50'
                }`}
              >
                ₹{pkg.amount}
                <span className="block text-xs font-medium text-muted mt-0.5">{pkg.label}</span>
              </button>
            ))}
          </div>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold">₹</span>
            <input
              type="number"
              placeholder="Custom Amount"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setAmount(0);
              }}
              className="w-full pl-10 pr-4 py-4 bg-bg border border-borderLight rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-bold text-lg"
            />
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface border-t border-borderLight safe-area-bottom">
        <button
          onClick={handleTopup}
          disabled={isProcessing}
          className="w-full bg-primary text-white font-black py-4 rounded-xl shadow-float active:scale-95 transition-transform disabled:opacity-50"
        >
          {isProcessing ? 'Processing...' : `Pay ₹${customAmount || amount}`}
        </button>
      </div>
    </div>
  );
};
