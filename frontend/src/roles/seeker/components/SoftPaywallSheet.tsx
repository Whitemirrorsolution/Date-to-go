import React from 'react';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const SoftPaywallSheet: React.FC<Props> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-surface rounded-2xl shadow-xl max-w-sm w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted hover:text-textMain transition-colors"
        >
          <X size={20} />
        </button>
        <h2 className="text-2xl font-black mb-4 text-textMain">Upgrade Required</h2>
        <p className="text-muted mb-6">
          To request a partner, you need an active subscription. Unlock unlimited requests and premium features by subscribing now.
        </p>
        <button
          onClick={() => {
            // Placeholder for subscription flow
            alert('Redirecting to subscription page...');
            onClose();
          }}
          className="w-full bg-primary text-white py-2 rounded-xl font-bold hover:opacity-90 transition-opacity"
        >
          Subscribe Now
        </button>
      </div>
    </div>
  );
};

export default SoftPaywallSheet;
