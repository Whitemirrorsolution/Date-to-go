import React, { useState } from 'react';
import { X, ShieldCheck, ChevronRight } from 'lucide-react';

interface CheckoutSheetProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  pricePaise: number;
  onPay: () => void;
  processing: boolean;
}

export const CheckoutSheet: React.FC<CheckoutSheetProps> = ({ 
  isOpen, 
  onClose, 
  planName, 
  pricePaise,
  onPay,
  processing
}) => {
  const [coupon, setCoupon] = useState('');
  
  if (!isOpen) return null;

  // Assuming pricePaise already includes GST for display purposes as per the flow
  // "price, GST, total"
  const total = pricePaise / 100;
  const base = (total / 1.18).toFixed(2);
  const gst = (total - Number(base)).toFixed(2);

  return (
    <>
      <div 
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in" 
        onClick={processing ? undefined : onClose}
      />
      <div className="fixed bottom-0 left-0 right-0 z-[101] rounded-t-[32px] bg-surface p-6 shadow-2xl animate-slide-up max-w-[480px] mx-auto border-t border-borderLight">
        
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-textMain">Checkout</h3>
          <button 
            disabled={processing}
            onClick={onClose} 
            className="p-2 text-muted hover:text-textMain bg-bg rounded-full disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Breakdown */}
        <div className="bg-bg rounded-2xl p-5 mb-5 border border-borderLight/50 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="text-textMain font-bold text-lg">{planName}</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted">
              <span>Plan Base Price</span>
              <span>₹{base}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>GST (18%)</span>
              <span>₹{gst}</span>
            </div>
            <div className="h-px w-full bg-borderLight my-2"></div>
            <div className="flex justify-between text-textMain font-black text-xl pt-1">
              <span>Total amount</span>
              <span className="text-primary">₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Coupon */}
        <div className="flex gap-2 mb-6">
          <input 
            type="text" 
            placeholder="Got a coupon code?" 
            value={coupon}
            onChange={(e) => setCoupon(e.target.value.toUpperCase())}
            disabled={processing}
            className="flex-1 h-12 bg-bg border border-borderLight rounded-xl px-4 font-bold text-sm outline-none focus:border-primary uppercase placeholder:normal-case"
          />
          <button 
            disabled={!coupon || processing}
            className="h-12 px-5 bg-textMain text-white font-bold text-sm rounded-xl disabled:opacity-50 active:scale-95 transition-transform"
          >
            Apply
          </button>
        </div>

        <div className="flex items-center gap-2 justify-center text-xs text-muted font-medium mb-6">
          <ShieldCheck size={16} className="text-green-500" />
          Secure 256-bit SSL encryption
          <span>•</span>
          <a href="/refund-policy" target="_blank" className="text-primary underline flex items-center">
            Refund Policy <ChevronRight size={12}/>
          </a>
        </div>

        <button 
          onClick={onPay}
          disabled={processing}
          className="w-full h-14 bg-primary text-white font-black text-lg rounded-full shadow-lg active:scale-[0.98] transition-all disabled:opacity-70 flex justify-center items-center gap-2"
        >
          {processing ? (
            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            `Pay Securely`
          )}
        </button>
      </div>
    </>
  );
};
