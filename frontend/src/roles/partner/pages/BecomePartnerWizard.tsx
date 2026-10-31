import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../services/api.js';
import { 
  CheckCircle2, ChevronRight, AlertCircle, Camera, 
  ChevronLeft, UploadCloud, Shield, Loader2, Sparkles, 
  MapPin, Trash2, Check
} from 'lucide-react';

type Step = 'BASICS' | 'LOCATION' | 'LIFESTYLE' | 'INTERESTS' | 'SERVICES' | 'PHOTOS' | 'KYC' | 'REVIEW';

const stepsOrder: Step[] = ['BASICS', 'LOCATION', 'LIFESTYLE', 'INTERESTS', 'SERVICES', 'PHOTOS', 'KYC', 'REVIEW'];

export const BecomePartnerWizard: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('BASICS');
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<any>({
    displayName: '',
    gender: '',
    dob: '',
    bio: '',
    city: '',
    area: '',
    pincode: '',
    occupation: '',
    interests: [],
    hobbies: [],
    languages: [],
    smoke: 'PREFER_NOT_TO_SAY',
    drink: 'PREFER_NOT_TO_SAY',
    allowedSeekerGenders: [],
    categories: [],
    primaryPhoto: '',
    photos: []
  });

  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [interestsStr, setInterestsStr] = useState('');
  const [hobbiesStr, setHobbiesStr] = useState('');
  const [languagesStr, setLanguagesStr] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-save debounced
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.displayName || formData.city || formData.gender) {
        api.patch('/partner/profile', formData).catch(() => {});
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [formData]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const profileRes = await api.get<any>('/partner/profile');
      
      const [healthRes, catRes] = await Promise.all([
        api.get<any>('/partner/profile/health'),
        api.get<any>('/categories'),
      ]);
      setHealth(healthRes.data);
      setCategoriesList(catRes.data || []);
      if (profileRes.data) {
        const pd = { ...profileRes.data };
        if (pd.dob && pd.dob.includes('T')) pd.dob = pd.dob.split('T')[0];
        setFormData({ ...formData, ...pd });
        setInterestsStr(pd.interests?.join(', ') || '');
        setHobbiesStr(pd.hobbies?.join(', ') || '');
        setLanguagesStr(pd.languages?.join(', ') || '');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to load setup data');
    } finally {
      setLoading(false);
    }
  };

  const savePartial = async (): Promise<boolean> => {
    setSaving(true);
    setErrorMsg(null);
    try {
      await api.patch('/partner/profile', formData);
      const healthRes = await api.get<any>('/partner/profile/health');
      setHealth(healthRes.data);
      return true;
    } catch (e: any) {
      const msg = e.message || 'Failed to save progress';
      setErrorMsg(msg);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const nextStep = async (next: Step) => {
    const success = await savePartial();
    if (success) {
      setCurrentStep(next);
      // Smooth scroll to top of the scrollable area
      document.getElementById('wizard-scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goBack = (prev: Step) => {
    setCurrentStep(prev);
  };

  const submitForReview = async () => {
    const success = await savePartial();
    if (!success) return;
    
    try {
      await api.post('/partner/submit-review');
      navigate('/p/dashboard?tab=home');
    } catch (e: any) {
      const msg = e.message || 'Submission failed';
      setErrorMsg(msg);
    }
  };

  // --- Upload Handlers (Kept exactly same for logic) ---
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setSaving(true);
    setErrorMsg('Uploading photos...');
    try {
      const newPhotos = [...(formData.photos || [])];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const data = new FormData();
        data.append('file', file);
        
        const res = await api.post<any>('/upload', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        if (res.success && res.data?.url) {
          newPhotos.push(res.data.url);
        } else {
          setErrorMsg('Upload failed: ' + (res.message || 'Unknown error'));
        }
      }
      const newPrimary = formData.primaryPhoto || newPhotos[0] || '';
      setFormData({ ...formData, photos: newPhotos, primaryPhoto: newPrimary });
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg('Failed to upload photos: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMainPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setSaving(true);
    setErrorMsg(null);
    try {
      const data = new FormData();
      data.append('file', file);
      
      const res = await api.post<any>('/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (res.success && res.data?.url) {
        const url = res.data.url;
        const newPhotos = Array.from(new Set([...(formData.photos || []), url]));
        setFormData({ ...formData, photos: newPhotos, primaryPhoto: url });
      } else {
        alert('Upload failed: ' + (res.message || 'Unknown error'));
      }
    } catch (err: any) {
      setErrorMsg('Failed to upload main photo: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const removePhoto = (urlToRemove: string) => {
    const newPhotos = (formData.photos || []).filter((url: string) => url !== urlToRemove);
    const newPrimary = formData.primaryPhoto === urlToRemove ? (newPhotos[0] || '') : formData.primaryPhoto;
    setFormData({ ...formData, photos: newPhotos, primaryPhoto: newPrimary });
  };

  // --- Custom UI Components for PWA ---
  const InputLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="block text-[13px] font-bold text-textMain/70 mb-1.5 uppercase tracking-wide px-1">
      {children}
    </label>
  );

  const SelectionPill = ({ active, onClick, children }: { active: boolean, onClick: () => void, children: React.ReactNode }) => (
    <button
      onClick={onClick}
      type="button"
      className={`h-12 px-4 rounded-2xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center ${
        active 
          ? 'bg-primary text-white shadow-lg shadow-primary/25 border-transparent' 
          : 'bg-surface border border-borderLight text-textMain hover:border-primary/50'
      }`}
    >
      {children}
    </button>
  );

  // --- Loading State ---
  if (loading) return (
    <div className="h-[100dvh] bg-bg flex flex-col items-center justify-center text-textMain p-4">
      <div className="relative">
        <Loader2 size={48} className="text-primary animate-spin" />
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
      </div>
      <h2 className="text-2xl font-black mt-6 mb-2">Preparing workspace...</h2>
      <p className="text-muted text-center text-sm">Loading your partner profile securely.</p>
    </div>
  );

  const currentIndex = stepsOrder.indexOf(currentStep);
  const progressPercent = ((currentIndex + 1) / stepsOrder.length) * 100;

  // --- Step Content Renderer ---
  const renderStep = () => {
    switch (currentStep) {
      case 'BASICS':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div>
              <h2 className="text-3xl font-black mb-1">Let's start!</h2>
              <p className="text-muted text-sm">Tell clients who you are.</p>
            </div>
            
            <div className="flex justify-center mb-4">
              <label className="relative cursor-pointer group">
                <div className="w-28 h-28 rounded-full bg-surface border-2 border-dashed border-primary/50 flex flex-col items-center justify-center overflow-hidden shadow-xl shadow-primary/5">
                  {formData.primaryPhoto ? (
                    <img src={formData.primaryPhoto} alt="Main" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera size={28} className="text-primary/70 mb-1" />
                      <span className="text-[10px] font-bold text-primary/70 uppercase">Add Photo</span>
                    </>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform border-2 border-bg">
                  <UploadCloud size={16} />
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleMainPhotoUpload} disabled={saving} />
              </label>
            </div>

            <div className="space-y-5">
              <div>
                <InputLabel>Display Name</InputLabel>
                <input 
                  type="text" 
                  value={formData.displayName} 
                  onChange={e => setFormData({...formData, displayName: e.target.value})} 
                  className="w-full h-14 px-4 rounded-2xl bg-surface border border-borderLight focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium" 
                  placeholder="e.g. Rahul Sharma" 
                />
              </div>

              <div>
                <InputLabel>Gender</InputLabel>
                <div className="grid grid-cols-3 gap-2">
                  <SelectionPill active={formData.gender === 'MALE'} onClick={() => setFormData({...formData, gender: 'MALE'})}>Male</SelectionPill>
                  <SelectionPill active={formData.gender === 'FEMALE'} onClick={() => setFormData({...formData, gender: 'FEMALE'})}>Female</SelectionPill>
                  <SelectionPill active={formData.gender === 'OTHER'} onClick={() => setFormData({...formData, gender: 'OTHER'})}>Other</SelectionPill>
                </div>
              </div>

              <div>
                <InputLabel>Date of Birth (18+)</InputLabel>
                <input 
                  type="date" 
                  value={formData.dob} 
                  onChange={e => setFormData({...formData, dob: e.target.value})} 
                  className="w-full h-14 px-4 rounded-2xl bg-surface border border-borderLight focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-textMain" 
                />
              </div>
            </div>
          </div>
        );

      case 'LOCATION':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
             <div>
              <h2 className="text-3xl font-black mb-1">Location</h2>
              <p className="text-muted text-sm">Where are you based? (Kept private)</p>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <InputLabel>Pincode</InputLabel>
                  <input 
                    type="text" inputMode="numeric"
                    value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} 
                    className="w-full h-14 px-4 rounded-2xl bg-surface border border-borderLight focus:border-primary outline-none font-medium" 
                    placeholder="400001" 
                  />
                </div>
                <div>
                  <InputLabel>City</InputLabel>
                  <input 
                    type="text" 
                    value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} 
                    className="w-full h-14 px-4 rounded-2xl bg-surface border border-borderLight focus:border-primary outline-none font-medium" 
                    placeholder="Mumbai" 
                  />
                </div>
              </div>
              
              <div>
                <InputLabel>Area / Neighborhood</InputLabel>
                <input 
                  type="text" 
                  value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} 
                  className="w-full h-14 px-4 pl-11 rounded-2xl bg-surface border border-borderLight focus:border-primary outline-none font-medium relative" 
                  placeholder="e.g. Bandra West" 
                />
                <MapPin size={20} className="absolute left-4 translate-y-[-42px] text-muted pointer-events-none" />
              </div>
            </div>
          </div>
        );

      case 'LIFESTYLE':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div>
              <h2 className="text-3xl font-black mb-1">Your Vibe</h2>
              <p className="text-muted text-sm">Tell clients about your lifestyle.</p>
            </div>

            <div className="space-y-6">
              <div>
                <InputLabel>Bio ({formData.bio?.length || 0}/500)</InputLabel>
                <textarea 
                  rows={4} 
                  value={formData.bio} 
                  onChange={e => setFormData({...formData, bio: e.target.value})} 
                  className="w-full p-4 rounded-2xl bg-surface border border-borderLight focus:border-primary outline-none font-medium resize-none" 
                  placeholder="Write at least 80 characters about yourself, your vibe, and why clients should book you..." 
                />
              </div>

              <div>
                <InputLabel>Occupation</InputLabel>
                <input 
                  type="text" 
                  value={formData.occupation} onChange={e => setFormData({...formData, occupation: e.target.value})} 
                  className="w-full h-14 px-4 rounded-2xl bg-surface border border-borderLight focus:border-primary outline-none font-medium" 
                  placeholder="e.g. Freelancer, Model, Student" 
                />
              </div>

              <div>
                <InputLabel>Smoking Habits</InputLabel>
                <div className="flex flex-wrap gap-2">
                  {['PREFER_NOT_TO_SAY', 'NEVER', 'OCCASIONALLY', 'REGULARLY'].map((val) => (
                    <SelectionPill key={val} active={formData.smoke === val} onClick={() => setFormData({...formData, smoke: val})}>
                      {val.replace(/_/g, ' ')}
                    </SelectionPill>
                  ))}
                </div>
              </div>

              <div>
                <InputLabel>Drinking Habits</InputLabel>
                <div className="flex flex-wrap gap-2">
                  {['PREFER_NOT_TO_SAY', 'NEVER', 'OCCASIONALLY', 'REGULARLY'].map((val) => (
                    <SelectionPill key={val} active={formData.drink === val} onClick={() => setFormData({...formData, drink: val})}>
                      {val.replace(/_/g, ' ')}
                    </SelectionPill>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'INTERESTS':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div>
              <h2 className="text-3xl font-black mb-1">Interests</h2>
              <p className="text-muted text-sm">Helps seekers find the perfect match.</p>
            </div>

            <div className="space-y-5">
              <div>
                <InputLabel>Top Interests (Comma separated)</InputLabel>
                <input 
                  type="text" 
                  value={interestsStr} 
                  onChange={e => {
                    setInterestsStr(e.target.value);
                    setFormData({...formData, interests: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)});
                  }}
                  className="w-full h-14 px-4 rounded-2xl bg-surface border border-borderLight focus:border-primary outline-none font-medium" 
                  placeholder="e.g. Art, Coffee, Tech, Fitness" 
                />
              </div>

              <div>
                <InputLabel>Hobbies</InputLabel>
                <input 
                  type="text" 
                  value={hobbiesStr} 
                  onChange={e => {
                    setHobbiesStr(e.target.value);
                    setFormData({...formData, hobbies: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)});
                  }}
                  className="w-full h-14 px-4 rounded-2xl bg-surface border border-borderLight focus:border-primary outline-none font-medium" 
                  placeholder="e.g. Reading, Hiking, Cooking" 
                />
              </div>

              <div>
                <InputLabel>Languages Spoken</InputLabel>
                <input 
                  type="text" 
                  value={languagesStr} 
                  onChange={e => {
                    setLanguagesStr(e.target.value);
                    setFormData({...formData, languages: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)});
                  }}
                  className="w-full h-14 px-4 rounded-2xl bg-surface border border-borderLight focus:border-primary outline-none font-medium" 
                  placeholder="e.g. English, Hindi, Marathi" 
                />
              </div>
            </div>
          </div>
        );

      case 'SERVICES':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div>
              <h2 className="text-3xl font-black mb-1">Services</h2>
              <p className="text-muted text-sm">Select what you offer and set your rate.</p>
            </div>
            
            <div className="space-y-3">
              {categoriesList.map(cat => {
                const isSelected = formData.categories?.some((c: any) => c.categoryId === cat._id);
                const existingRate = formData.categories?.find((c: any) => c.categoryId === cat._id)?.hourlyRatePaise || cat.defaultRatePaise;

                const toggleCategory = () => {
                  if (isSelected) {
                    setFormData({...formData, categories: formData.categories.filter((c:any) => c.categoryId !== cat._id)});
                  } else {
                    setFormData({...formData, categories: [...(formData.categories || []), { categoryId: cat._id, hourlyRatePaise: cat.defaultRatePaise }]});
                  }
                };

                const updateRate = (rate: number) => {
                  setFormData({...formData, categories: formData.categories.map((c:any) => c.categoryId === cat._id ? {...c, hourlyRatePaise: rate} : c)});
                };

                return (
                  <div key={cat._id} className={`p-4 rounded-2xl transition-all border-2 ${isSelected ? 'border-primary bg-primary/5' : 'border-borderLight bg-surface hover:border-borderLight/80'}`}>
                    <div className="flex items-center justify-between cursor-pointer" onClick={toggleCategory}>
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${isSelected ? 'bg-primary text-white' : 'border-2 border-muted'}`}>
                          {isSelected && <Check size={14} strokeWidth={3} />}
                        </div>
                        <div>
                          <p className="font-bold text-base">{cat.icon} {cat.name}</p>
                          <p className="text-xs text-muted">₹{cat.minRatePaise/100} - ₹{cat.maxRatePaise/100} limit</p>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="mt-4 pt-4 border-t border-primary/10 flex items-center justify-between">
                        <span className="text-sm font-semibold text-textMain/80">Hourly Rate</span>
                        <div className="flex items-center gap-2 bg-surface p-1 rounded-xl border border-borderLight">
                          <span className="text-sm font-bold pl-3 text-muted">₹</span>
                          <input 
                            type="number" inputMode="numeric"
                            value={existingRate/100} 
                            onChange={e => updateRate(parseInt(e.target.value)*100)} 
                            min={cat.minRatePaise/100} max={cat.maxRatePaise/100} 
                            className="w-16 h-10 bg-transparent text-center font-bold outline-none" 
                          />
                          <span className="text-xs text-muted pr-3">/hr</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        );

      case 'PHOTOS':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div>
              <h2 className="text-3xl font-black mb-1">Gallery</h2>
              <p className="text-muted text-sm">Upload 3-8 clear photos of yourself.</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <label className="aspect-[3/4] rounded-2xl border-2 border-dashed border-primary bg-primary/5 flex flex-col items-center justify-center text-primary cursor-pointer active:scale-95 transition-transform">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                  <Camera size={20} />
                </div>
                <span className="text-sm font-bold">Add Photos</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={saving} />
              </label>
              
              {formData.photos?.map((url: string, idx: number) => (
                <div key={idx} className="aspect-[3/4] rounded-2xl bg-borderLight overflow-hidden relative group">
                  <img src={url} alt={`photo-${idx}`} className="w-full h-full object-cover" />
                  
                  {formData.primaryPhoto === url && (
                    <div className="absolute top-2 left-2 bg-primary text-white text-[10px] px-2.5 py-1 rounded-full font-bold uppercase shadow-md">Main</div>
                  )}
                  
                  <button 
                    onClick={() => removePhoto(url)}
                    className="absolute top-2 right-2 bg-black/50 backdrop-blur-md text-white rounded-full w-8 h-8 flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <Trash2 size={14} />
                  </button>
                  
                  {formData.primaryPhoto !== url && (
                    <button 
                      onClick={() => setFormData({ ...formData, primaryPhoto: url })}
                      className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-md text-white text-xs py-2 rounded-xl font-bold active:scale-95 transition-transform"
                    >
                      Set as Main
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'KYC':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div>
              <h2 className="text-3xl font-black mb-1">Verification</h2>
              <p className="text-muted text-sm">Your privacy is our priority.</p>
            </div>
            
            <div className="bg-surface border border-borderLight rounded-3xl p-6 text-center shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
              <Shield size={56} className="mx-auto mb-4 text-primary relative z-10" />
              <h3 className="font-bold text-xl mb-2 relative z-10">Identity Check</h3>
              <p className="text-sm text-muted mb-6 relative z-10">We need your PAN, masked Aadhaar/Passport, and a Selfie to verify your identity.</p>
              
              <button onClick={() => window.open('/p/kyc', '_blank')} className="w-full h-14 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-primary/30 relative z-10">
                <UploadCloud size={20} /> Open Secure Portal
              </button>
              <p className="text-xs text-muted mt-4 relative z-10">Come back and click 'Next' once completed.</p>
            </div>
          </div>
        );

      case 'REVIEW':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div>
              <h2 className="text-3xl font-black mb-1">Final Step</h2>
              <p className="text-muted text-sm">Review before submitting.</p>
            </div>
            
            {health && (
              <div className="bg-surface rounded-3xl p-6 border border-borderLight shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg">Profile Score</h3>
                  <span className={`text-xl font-black ${health.score >= 90 ? 'text-success-text' : 'text-primary'}`}>{health.score}%</span>
                </div>
                
                <div className="w-full bg-bg rounded-full h-3 mb-6 overflow-hidden border border-borderLight">
                  <div className={`h-full transition-all duration-1000 ${health.score >= 90 ? 'bg-success-text' : 'bg-primary'}`} style={{ width: `${health.score}%` }}></div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase text-muted tracking-wider">Checklist</p>
                  {health.items.filter((i: any) => i.mandatory).map((item: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 bg-bg p-3 rounded-xl border border-borderLight/50">
                      {item.done ? (
                        <CheckCircle2 size={18} className="text-success-text shrink-0 mt-0.5" />
                      ) : (
                        <div className="w-4.5 h-4.5 rounded-full border-2 border-muted shrink-0 mt-0.5" />
                      )}
                      <span className={`text-sm font-semibold ${item.done ? 'text-textMain/70' : 'text-textMain'}`}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="h-[100dvh] overflow-hidden w-full flex flex-col bg-bg">
      {/* Main App Container */}
      <div className="w-full flex-1 flex flex-col bg-bg relative">
        
        {/* Sticky Header with Progress */}
        <div className="absolute top-0 left-0 w-full z-50 bg-bg/90 backdrop-blur-xl border-b border-borderLight/50 pt-safe flex flex-col items-center">
          <div className="h-14 flex items-center justify-between px-4 max-w-4xl w-full">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Sparkles size={18} /> <span className="tracking-tight">Partner Setup</span>
            </div>
            <div className="text-xs font-bold text-muted bg-surface px-3 py-1.5 rounded-full">
              {currentIndex + 1} / {stepsOrder.length}
            </div>
          </div>
          {/* Progress Bar */}
          <div className="w-full h-1 bg-surface">
            <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {/* Scrollable Form Content */}
        <div id="wizard-scroll-container" className="flex-1 overflow-y-auto px-5 pt-24 pb-32 hide-scrollbar max-w-4xl mx-auto w-full">
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-sm flex items-start gap-3 animate-in slide-in-from-top-2">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-0.5">Please review</p>
                <p className="opacity-90">{errorMsg}</p>
              </div>
            </div>
          )}
          
          {renderStep()}
        </div>

        {/* Sticky Action Footer */}
        <div className="absolute bottom-0 left-0 w-full z-50 bg-bg/90 backdrop-blur-xl border-t border-borderLight/50 pb-safe flex justify-center">
          <div className="max-w-4xl w-full p-4 flex items-center justify-between gap-3">
            {currentIndex > 0 ? (
              <button 
                onClick={() => goBack(stepsOrder[currentIndex - 1])} 
                disabled={saving} 
                className="h-14 px-6 rounded-2xl bg-surface border border-borderLight font-bold text-textMain active:scale-95 transition-all flex items-center justify-center min-w-[80px]"
              >
                <ChevronLeft size={20} />
              </button>
            ) : (
              <div className="w-[80px]"></div> /* Placeholder for spacing */
            )}

            {currentStep === 'REVIEW' ? (
              <button 
                onClick={submitForReview} 
                disabled={(!health?.canCreateListings && health?.score < 90) || saving} 
                className="flex-1 h-14 rounded-2xl bg-success-text text-white font-bold text-lg active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-success-text/30 disabled:opacity-50 disabled:active:scale-100"
              >
                {saving ? <Loader2 size={20} className="animate-spin" /> : 'Submit for Review'}
              </button>
            ) : (
              <button 
                onClick={() => nextStep(stepsOrder[currentIndex + 1])} 
                disabled={saving} 
                className="flex-1 h-14 rounded-2xl bg-primary text-white font-bold text-lg active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/30"
              >
                {saving ? <Loader2 size={20} className="animate-spin" /> : <>Next <ChevronRight size={20} /></>}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};