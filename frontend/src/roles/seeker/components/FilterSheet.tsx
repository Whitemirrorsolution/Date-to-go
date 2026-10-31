import React from 'react';
import { X } from 'lucide-react';

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: any) => void;
}

export const FilterSheet: React.FC<FilterSheetProps> = ({ isOpen, onClose, onApply }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[101] rounded-t-[32px] bg-surface p-6 pb-safe shadow-2xl animate-slide-up max-w-[480px] mx-auto flex flex-col h-[80vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h3 className="text-xl font-bold text-textMain">Filters</h3>
          <button onClick={onClose} className="p-2 text-muted hover:text-textMain bg-bg rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto hide-scrollbar space-y-6 pb-20">
          {/* Location */}
          <div>
            <label className="block font-bold text-textMain mb-2 text-sm">Location & Distance</label>
            <input type="text" placeholder="City or Pincode" className="w-full h-[48px] bg-bg border border-borderLight rounded-xl px-4 text-sm mb-3 outline-none focus:border-primary" />
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted whitespace-nowrap">Within 20 km</span>
              <input type="range" className="w-full accent-primary" />
            </div>
          </div>

          {/* Age Range */}
          <div>
            <label className="block font-bold text-textMain mb-2 text-sm">Age Range</label>
            <div className="flex items-center gap-3">
              <input type="number" placeholder="Min" className="flex-1 h-[48px] bg-bg border border-borderLight rounded-xl px-4 text-sm outline-none focus:border-primary" />
              <span className="text-muted font-bold">-</span>
              <input type="number" placeholder="Max" className="flex-1 h-[48px] bg-bg border border-borderLight rounded-xl px-4 text-sm outline-none focus:border-primary" />
            </div>
          </div>

          {/* Verified Only */}
          <div className="flex items-center justify-between p-4 bg-bg border border-borderLight rounded-xl">
            <div>
              <p className="font-bold text-textMain text-sm">Verified Partners Only</p>
              <p className="text-xs text-muted">Show only ID-verified companions</p>
            </div>
            <input type="checkbox" className="w-5 h-5 rounded border-2 border-primary accent-primary" />
          </div>

          {/* Interests */}
          <div>
            <label className="block font-bold text-textMain mb-3 text-sm">Interests & Hobbies</label>
            <div className="flex flex-wrap gap-2">
              {['Movies', 'Coffee', 'Travel', 'Reading', 'Music', 'Fitness', 'Art'].map(interest => (
                <div key={interest} className="px-4 py-2 border border-borderLight rounded-pill text-sm font-medium text-muted active:scale-95 cursor-pointer hover:border-primary hover:text-primary">
                  {interest}
                </div>
              ))}
            </div>
          </div>

          {/* Lifestyle */}
          <div>
            <label className="block font-bold text-textMain mb-3 text-sm">Lifestyle</label>
            <div className="grid grid-cols-2 gap-3">
              <select className="h-[48px] bg-bg border border-borderLight rounded-xl px-4 text-sm outline-none focus:border-primary appearance-none">
                <option>Any Smoking</option>
                <option>Non-Smoker</option>
                <option>Smoker</option>
              </select>
              <select className="h-[48px] bg-bg border border-borderLight rounded-xl px-4 text-sm outline-none focus:border-primary appearance-none">
                <option>Any Drinking</option>
                <option>Non-Drinker</option>
                <option>Social Drinker</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-surface border-t border-borderLight flex gap-3 pb-safe">
          <button className="flex-1 h-[56px] bg-bg border border-borderLight text-textMain font-bold rounded-[20px] active:scale-95 transition-transform">
            Reset
          </button>
          <button onClick={() => { onApply({}); onClose(); }} className="flex-[2] h-[56px] bg-primary text-white font-bold rounded-[20px] shadow-[0_8px_20px_rgba(112,0,164,0.3)] active:scale-[0.98] transition-transform">
            Apply Filters
          </button>
        </div>

      </div>
    </>
  );
};
