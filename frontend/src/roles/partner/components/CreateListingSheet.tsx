import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Info, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { api } from '../../../services/api.js';
import { CategoryIcon } from '../../../components/CategoryIcon.js';

interface CreateListingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  categoriesList: any[];
  partnerProfile: any;
  onSuccess: () => void;
}

export const CreateListingSheet: React.FC<CreateListingSheetProps> = ({ 
  isOpen, onClose, categoriesList, partnerProfile, onSuccess 
}) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    categoryId: '',
    startDate: '',
    startTime: '',
    durationHours: 2,
    pricePaise: 0,
    venueType: 'CAFE',
    publicVenueName: '',
    fullAddress: '',
    description: '',
    safetyAck: false
  });
  
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string|null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setErrorMsg(null);
      // Auto-select first category and calculate price
      if (categoriesList?.length > 0) {
        // Find if user has a custom rate for this category
        const firstCat = categoriesList[0];
        const catId = firstCat._id || firstCat.id;
        const customRate = partnerProfile?.categories?.find((c:any) => (c.categoryId || c._id || c.id) === catId)?.hourlyRatePaise;
        const rateToUse = customRate || firstCat.defaultRatePaise || 50000;
        
        let calculatedPrice = rateToUse * 2; // default 2 hours
        const minPrice = (firstCat.minRatePaise || 10000) * 2;
        const maxPrice = (firstCat.maxRatePaise || 1000000) * 2;
        if (calculatedPrice < minPrice) calculatedPrice = minPrice;
        if (calculatedPrice > maxPrice) calculatedPrice = maxPrice;
        
        // Default to tomorrow 18:00
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const defaultDateStr = tomorrow.toISOString().split('T')[0];

        setFormData(prev => ({ 
          ...prev, 
          categoryId: catId, 
          pricePaise: calculatedPrice,
          safetyAck: false,
          startDate: defaultDateStr,
          startTime: '18:00',
          publicVenueName: '',
          fullAddress: '',
          description: ''
        }));
      }
    }
  }, [isOpen, partnerProfile, categoriesList]);

  if (!isOpen) return null;

  const handleCategoryChange = (catId: string) => {
    const selectedCat = categoriesList.find(c => (c._id || c.id) === catId);
    if (!selectedCat) return;
    const customRate = partnerProfile?.categories?.find((c:any) => (c.categoryId || c._id || c.id) === catId)?.hourlyRatePaise;
    const rateToUse = customRate || selectedCat.defaultRatePaise || 50000;
    
    const duration = formData.durationHours || 2;
    let calculatedPrice = rateToUse * duration;
    const minPrice = (selectedCat.minRatePaise || 10000) * duration;
    const maxPrice = (selectedCat.maxRatePaise || 1000000) * duration;
    if (calculatedPrice < minPrice) calculatedPrice = minPrice;
    if (calculatedPrice > maxPrice) calculatedPrice = maxPrice;

    setFormData(prev => ({ ...prev, categoryId: catId, pricePaise: calculatedPrice }));
  };

  const handleDurationChange = (hours: number) => {
    const selectedCat = categoriesList.find(c => (c._id || c.id) === formData.categoryId);
    if (!selectedCat) return;
    const customRate = partnerProfile?.categories?.find((c:any) => (c.categoryId || c._id || c.id) === formData.categoryId)?.hourlyRatePaise;
    const rateToUse = customRate || selectedCat.defaultRatePaise || 50000;
    
    let calculatedPrice = rateToUse * hours;
    const minPrice = (selectedCat.minRatePaise || 10000) * hours;
    const maxPrice = (selectedCat.maxRatePaise || 1000000) * hours;
    if (calculatedPrice < minPrice) calculatedPrice = minPrice;
    if (calculatedPrice > maxPrice) calculatedPrice = maxPrice;

    setFormData(prev => ({ ...prev, durationHours: hours, pricePaise: calculatedPrice }));
  };

  const formatCurrency = (paise: number) => {
    return (paise / 100).toLocaleString('en-IN');
  };

  const submitListing = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}:00`);
      if (isNaN(startDateTime.getTime()) || startDateTime.getTime() <= Date.now()) {
        setErrorMsg('Listing start time must be in the future.');
        setSaving(false);
        return;
      }
      const endDateTime = new Date(startDateTime.getTime() + formData.durationHours * 60 * 60 * 1000);

      await api.post('/partner/listings', {
        categoryId: formData.categoryId,
        startAt: startDateTime.toISOString(),
        endAt: endDateTime.toISOString(),
        durationMins: formData.durationHours * 60,
        pricePaise: formData.pricePaise,
        venueType: formData.venueType,
        venueName: formData.publicVenueName,
        venueAddress: formData.fullAddress,
        description: formData.description
      });
      
      onSuccess();
      onClose();
    } catch (e: any) {
      console.error('Payload Sent:', { categoryId: formData.categoryId });
      setErrorMsg(`[ID: '${formData.categoryId}'] ` + (e.response?.data?.message || e.message || 'Failed to publish listing'));
    } finally {
      setSaving(false);
    }
  };

  const currentCategory = categoriesList.find(cat => cat._id === formData.categoryId);
  const hourlyRate = partnerProfile?.categories?.find((c:any) => c.categoryId === formData.categoryId)?.hourlyRatePaise || 50000;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={!saving ? onClose : undefined} 
      />
      
      {/* Modal/Sheet Container (Bottom on Mobile, Center on Desktop) */}
      <div className="fixed z-[101] bottom-0 md:bottom-auto md:top-1/2 left-1/2 -translate-x-1/2 md:-translate-y-1/2 w-full md:max-w-lg bg-surface rounded-t-[2rem] md:rounded-[2rem] flex flex-col max-h-[90dvh] shadow-2xl animate-in slide-in-from-bottom-8 md:zoom-in-95 duration-300">
        
        {/* Header (Sticky inside modal) */}
        <div className="shrink-0 px-6 pt-6 pb-4 border-b border-borderLight/50 flex justify-between items-center bg-surface rounded-t-[2rem]">
          <div>
            <h3 className="text-xl font-black text-textMain">Create Offering</h3>
            <p className="text-xs font-bold text-muted mt-1 uppercase tracking-wider">Step {step} of 3</p>
          </div>
          <button 
            onClick={onClose} 
            disabled={saving}
            className="w-10 h-10 bg-bg rounded-full flex items-center justify-center border border-borderLight hover:bg-borderLight/50 active:scale-95 transition-all disabled:opacity-50"
          >
            <X size={20} className="text-textMain"/>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 pb-safe scrollbar-hide">
          
          {errorMsg && (
            <div className="mb-6 p-4 bg-failed-bg/50 border border-failed-text/30 text-failed-text text-sm font-bold rounded-2xl flex items-start gap-3">
              <Info size={18} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Details */}
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-2 px-1">Select Service</label>
                <div className="relative">
                  <select 
                    value={formData.categoryId} 
                    onChange={e => handleCategoryChange(e.target.value)}
                    className="w-full h-14 px-4 bg-bg border border-borderLight rounded-2xl text-sm font-bold appearance-none outline-none focus:border-primary text-textMain transition-colors"
                  >
                    {categoriesList.length > 0 ? (
                      categoriesList.map((c: any) => {
                        const catId = c._id || c.id;
                        return <option key={catId} value={catId}>{c.icon} {c.name}</option>;
                      })
                    ) : (
                      <option value="">Loading services...</option>
                    )}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">▼</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-2 px-1">Date</label>
                  <input 
                    type="date" 
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.startDate} 
                    onChange={e => setFormData({...formData, startDate: e.target.value})} 
                    className="w-full h-14 px-4 bg-bg border border-borderLight rounded-2xl text-sm font-bold outline-none focus:border-primary text-textMain transition-colors" 
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-2 px-1">Start Time</label>
                  <input 
                    type="time" 
                    value={formData.startTime} 
                    onChange={e => setFormData({...formData, startTime: e.target.value})} 
                    className="w-full h-14 px-4 bg-bg border border-borderLight rounded-2xl text-sm font-bold outline-none focus:border-primary text-textMain transition-colors" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-2 px-1">Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map(hours => (
                    <button
                      key={hours}
                      onClick={() => handleDurationChange(hours)}
                      className={`h-12 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center ${
                        formData.durationHours === hours 
                          ? 'bg-primary text-white shadow-md shadow-primary/25 border-transparent' 
                          : 'bg-bg border border-borderLight text-textMain hover:border-primary/50'
                      }`}
                    >
                      {hours} hr{hours > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-muted uppercase tracking-wider">Meetup Total ({formData.durationHours} hrs)</p>
                    <p className="text-sm font-medium text-textMain/80 mt-0.5">₹{formatCurrency(hourlyRate)}/hr × {formData.durationHours} hrs</p>
                  </div>
                  <p className="text-xl font-black text-textMain">₹{formatCurrency(formData.pricePaise)}</p>
                </div>
                <div className="flex justify-between items-center text-xs text-muted pt-2 border-t border-borderLight/60">
                  <span>Est. Platform Deduction (20%)</span>
                  <span className="font-semibold text-rose-500">−₹{formatCurrency(Math.round(formData.pricePaise * 0.2))}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-xs font-bold text-success-text uppercase tracking-wider">Your Net Payout</span>
                  <span className="text-xl font-black text-success-text">₹{formatCurrency(Math.round(formData.pricePaise * 0.8))}</span>
                </div>
              </div>

              <button 
                onClick={() => {
                  const startDateTime = new Date(`${formData.startDate}T${formData.startTime}:00`);
                  if (isNaN(startDateTime.getTime()) || startDateTime.getTime() <= Date.now()) {
                    setErrorMsg('Please select a future date and time for your listing.');
                    return;
                  }
                  setErrorMsg(null);
                  setStep(2);
                }} 
                disabled={!formData.startDate || !formData.startTime} 
                className="w-full h-14 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/25 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
              >
                Next: Location <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* STEP 2: Location */}
          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              
              <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
                <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-blue-900 leading-relaxed">
                  For your safety, all bookings must take place in verified public venues. Private residences are strictly prohibited.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-2 px-1">Venue Type</label>
                <div className="relative">
                  <select 
                    value={formData.venueType} 
                    onChange={e => setFormData({...formData, venueType: e.target.value})} 
                    className="w-full h-14 px-4 bg-bg border border-borderLight rounded-2xl text-sm font-bold appearance-none outline-none focus:border-primary text-textMain transition-colors"
                  >
                    <option value="CAFE">☕ Cafe / Coffee Shop</option>
                    <option value="RESTAURANT">🍽️ Restaurant / Fine Dining</option>
                    <option value="MALL">🛍️ Shopping Mall</option>
                    <option value="CINEMA">🍿 Cinema / Theater</option>
                    <option value="PARK">🌳 Public Park</option>
                    <option value="EVENT">🎉 Event / Concert Venue</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">▼</div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-baseline mb-2 px-1">
                  <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Public Name</label>
                  <span className="text-[10px] font-bold text-success-text">Visible to all</span>
                </div>
                <input 
                  type="text" 
                  value={formData.publicVenueName} 
                  onChange={e => setFormData({...formData, publicVenueName: e.target.value})} 
                  className="w-full h-14 px-4 bg-bg border border-borderLight rounded-2xl text-sm font-bold outline-none focus:border-primary text-textMain placeholder:text-muted/50 transition-colors" 
                  placeholder="e.g. Starbucks, Bandra West" 
                />
              </div>

              <div>
                <div className="flex justify-between items-baseline mb-2 px-1">
                  <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Full Exact Address</label>
                  <span className="text-[10px] font-bold text-primary">Hidden until paid</span>
                </div>
                <textarea 
                  rows={3} 
                  value={formData.fullAddress} 
                  onChange={e => setFormData({...formData, fullAddress: e.target.value})} 
                  className="w-full p-4 bg-bg border border-borderLight rounded-2xl text-sm font-bold outline-none focus:border-primary text-textMain placeholder:text-muted/50 transition-colors resize-none" 
                  placeholder="Paste the exact Google Maps address or shop number here..." 
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setStep(1)} 
                  className="flex-1 h-14 bg-bg border border-borderLight text-textMain font-black rounded-2xl active:scale-95 transition-transform"
                >
                  Back
                </button>
                <button 
                  onClick={() => setStep(3)} 
                  disabled={!formData.publicVenueName || !formData.fullAddress} 
                  className="flex-[2] h-14 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/25 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  Review <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Review */}
          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              
              <div className="bg-[#111111] p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-lg border border-white/10">
                        <CategoryIcon 
                          icon={currentCategory?.icon} 
                          slug={currentCategory?.slug} 
                          name={currentCategory?.name} 
                          size={18} 
                        />
                      </span>
                      <span className="font-bold text-white/80">{currentCategory?.name || 'Service'}</span>
                    </div>
                    <h3 className="font-black text-2xl">{partnerProfile?.displayName}</h3>
                  </div>
                  <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-center">
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider mb-0.5">Duration</p>
                    <p className="text-sm font-black">{formData.durationHours} hrs</p>
                  </div>
                </div>

                <div className="relative z-10 space-y-3 mb-6">
                  <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                    <Calendar size={18} className="text-primary shrink-0" /> 
                    <span className="font-semibold text-sm">
                      {new Date(formData.startDate).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} • {formData.startTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                    <MapPin size={18} className="text-primary shrink-0" /> 
                    <span className="font-semibold text-sm line-clamp-1">{formData.publicVenueName}</span>
                  </div>
                </div>

                <div className="relative z-10 space-y-2 border-t border-white/10 pt-4">
                  <div className="flex justify-between items-center text-xs text-white/70">
                    <span>Booking Total ({formData.durationHours} hrs)</span>
                    <span className="font-bold text-white">₹{formatCurrency(formData.pricePaise)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-white/70">
                    <span>Platform Deductions (incl. taxes)</span>
                    <span className="font-bold text-rose-300">−₹{formatCurrency(Math.round(formData.pricePaise * 0.2))}</span>
                  </div>
                  <div className="flex justify-between items-end pt-2 border-t border-white/10">
                    <p className="text-xs font-bold text-white/80 uppercase tracking-wider">Your Net Payout</p>
                    <p className="text-3xl font-black text-emerald-400">₹{formatCurrency(Math.round(formData.pricePaise * 0.8))}</p>
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-3 p-4 bg-surface border border-borderLight rounded-2xl cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.safetyAck} 
                  onChange={e => setFormData({...formData, safetyAck: e.target.checked})} 
                  className="mt-0.5 w-5 h-5 accent-primary shrink-0 rounded" 
                />
                <p className="text-xs font-semibold text-muted leading-relaxed">
                  I agree to meet exclusively at the verified public venue. I will not share personal contact info prior to booking confirmation and adhere to the platform's safety guidelines.
                </p>
              </label>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setStep(2)} 
                  disabled={saving} 
                  className="flex-1 h-14 bg-bg border border-borderLight text-textMain font-black rounded-2xl active:scale-95 transition-transform disabled:opacity-50"
                >
                  Edit
                </button>
                <button 
                  onClick={submitListing} 
                  disabled={!formData.safetyAck || saving} 
                  className="flex-[2] h-14 bg-success-text text-white font-black rounded-2xl shadow-lg shadow-success-text/30 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {saving ? <><Loader2 size={18} className="animate-spin" /> Publishing...</> : <><CheckCircle2 size={18} /> Go Live</>}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};