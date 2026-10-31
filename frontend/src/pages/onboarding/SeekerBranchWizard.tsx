import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Heart,
  Sparkles,
  Camera,
  MapPin,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  X,
  UploadCloud,
} from 'lucide-react';
import { api, formatApiError } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { useAccess } from '../../shared/providers/AccessProvider.js';

const INTEREST_OPTIONS = [
  '☕ Coffee & Cafes',
  '🍷 Fine Dining',
  '🎬 Cinema & Movies',
  '🎨 Art & Museums',
  '🎵 Live Concerts',
  '✈️ Travel & Roadtrips',
  '🧘 Fitness & Yoga',
  '🎲 Board Games',
  '🍸 Nightlife & Bars',
  '💻 Tech & Startups',
  '📚 Books & Reading',
  '🐕 Pet Lovers',
  '🌿 Nature & Hiking',
  '🍜 Street Food Walks',
];

const MAJOR_CITIES = [
  'Bangalore',
  'Mumbai',
  'Delhi-NCR',
  'Hyderabad',
  'Pune',
  'Chennai',
  'Kolkata',
  'Goa',
  'Chandigarh',
  'Ahmedabad',
];

export const SeekerBranchWizard: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { refetchAccess } = useAccess();

  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [displayName, setDisplayName] = useState<string>('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('FEMALE');
  const [preferredGenders, setPreferredGenders] = useState<string[]>(['MALE']);
  const [interests, setInterests] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [city, setCity] = useState<string>('Bangalore');
  const [area, setArea] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing draft
  useEffect(() => {
    let isMounted = true;
    async function loadDraft() {
      try {
        const res = await api.get<any>('/auth/onboarding/draft');
        if (res.data?.data && isMounted) {
          const d = res.data.data;
          if (d.displayName) setDisplayName(d.displayName);
          if (d.gender) setGender(d.gender);
          if (d.preferredGenders) setPreferredGenders(d.preferredGenders);
          if (d.interests) setInterests(d.interests);
          if (d.photos) setPhotos(d.photos);
          if (d.city) setCity(d.city);
          if (d.area) setArea(d.area);
          if (d.bio) setBio(d.bio);
        } else if (user?.fullName && isMounted) {
          setDisplayName(user.fullName);
        }
      } catch {
        // Fallback to user data if draft fetch fails
        if (user?.fullName && isMounted) setDisplayName(user.fullName);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadDraft();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Debounced auto-save to draft
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      api
        .patch('/auth/onboarding/draft', {
          step: `SEEKER_STEP_${step}`,
          data: {
            displayName,
            gender,
            preferredGenders,
            interests,
            photos,
            city,
            area,
            bio,
          },
        })
        .catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, [displayName, gender, preferredGenders, interests, photos, city, area, bio, step, loading]);

  const toggleInterest = (item: string) => {
    if (interests.includes(item)) {
      setInterests(interests.filter((i) => i !== item));
    } else {
      if (interests.length < 8) {
        setInterests([...interests, item]);
      }
    }
  };

  const togglePreferredGender = (val: string) => {
    if (preferredGenders.includes(val)) {
      if (preferredGenders.length > 1) {
        setPreferredGenders(preferredGenders.filter((g) => g !== val));
      }
    } else {
      setPreferredGenders([...preferredGenders, val]);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<{ url: string }>('/upload', formData);
      if (res.data?.url) {
        setPhotos((prev) => [...prev, res.data!.url]);
        return;
      }
    } catch {
      // Local fallback with FileReader if server upload encounters offline/storage issues
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64 = uploadEvent.target?.result as string;
        if (base64) {
          setPhotos((prev) => [...prev, base64]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const addPresetAvatar = () => {
    const avatars = [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    ];
    const unused = avatars.find((a) => !photos.includes(a)) || avatars[0];
    setPhotos([...photos, unused]);
  };

  const validateCurrentStep = (): boolean => {
    setErrorMsg(null);
    if (step === 1) {
      if (!displayName.trim() || displayName.trim().length < 2) {
        setErrorMsg('Please enter your name (at least 2 characters)');
        return false;
      }
    } else if (step === 2) {
      if (preferredGenders.length === 0) {
        setErrorMsg('Please choose at least one preference');
        return false;
      }
    } else if (step === 3) {
      if (interests.length === 0) {
        setErrorMsg('Select at least 1 interest to match great companion dates');
        return false;
      }
    } else if (step === 4) {
      if (photos.length === 0) {
        setErrorMsg('Please add at least 1 profile picture or sample photo');
        return false;
      }
    } else if (step === 5) {
      if (!city) {
        setErrorMsg('Please select your current city');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setStep((s) => Math.min(5, s + 1));
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const payload = {
        data: {
          displayName: displayName.trim(),
          gender,
          preferredGenders,
          interests,
          photos,
          city,
          area: area.trim(),
          bio: bio.trim(),
        },
      };

      const res = await api.post<{ nextRoute?: string; onboardingState?: string }>(
        '/auth/onboarding/submit',
        payload,
      );

      await refreshUser();
      await refetchAccess();

      const nextRoute = res.data?.nextRoute || '/s/home';
      navigate(nextRoute, { replace: true });
    } catch (err: any) {
      setErrorMsg(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-pink-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-b from-rose-50/40 via-white to-pink-50/20 flex flex-col justify-between antialiased selection:bg-pink-500/20">
      {/* ── Top App Bar ── */}
      <header className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur-md border-b border-rose-100">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="w-10">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                aria-label="Go Back"
                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-rose-50 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center text-white shadow-sm shadow-pink-500/20">
              <Heart size={14} className="fill-white" />
            </div>
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
              Seeker Profile
            </span>
          </div>

          <div className="w-10 text-right">
            <span className="text-xs font-bold text-pink-600 bg-pink-50 px-2 py-1 rounded-full">
              {step}/5
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-rose-100/50">
          <motion.div
            className="h-full bg-gradient-to-r from-pink-500 to-rose-600"
            initial={{ width: `${((step - 1) / 5) * 100}%` }}
            animate={{ width: `${(step / 5) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <main className="flex-1 max-w-md w-full mx-auto px-5 py-6 flex flex-col justify-between">
        <AnimatePresence mode="wait">
          {/* STEP 1: BASICS */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col justify-start space-y-6"
            >
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 text-pink-600 text-xs font-bold mb-3">
                  <User size={13} />
                  <span>Step 1 of 5</span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  What should we call you?
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  This will appear on your companion date profile.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Your Name / Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Maya Sharma"
                    maxLength={50}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 text-slate-900 font-medium text-base shadow-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Your Gender
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'FEMALE', label: 'Female' },
                      { id: 'MALE', label: 'Male' },
                      { id: 'OTHER', label: 'Non-Binary' },
                    ].map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setGender(g.id as any)}
                        className={`h-11 rounded-xl font-semibold text-sm transition-all border ${
                          gender === g.id
                            ? 'bg-pink-600 text-white border-pink-600 shadow-md shadow-pink-500/20 scale-[1.02]'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-pink-300'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: PREFERENCES ("SHOW ME") */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col justify-start space-y-6"
            >
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 text-pink-600 text-xs font-bold mb-3">
                  <Heart size={13} />
                  <span>Step 2 of 5</span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Who would you like to date?
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  We will curate companion suggestions tailored to your preferences.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { id: 'FEMALE', title: 'Women', desc: 'Discover female companion partners' },
                  { id: 'MALE', title: 'Men', desc: 'Discover male companion partners' },
                  { id: 'OTHER', title: 'Everyone & Non-Binary', desc: 'Open to companions of all identities' },
                ].map((item) => {
                  const isSelected = preferredGenders.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => togglePreferredGender(item.id)}
                      className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? 'border-pink-500 bg-pink-50/50 shadow-sm ring-1 ring-pink-500'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900 text-base">{item.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-pink-600 border-pink-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <CheckCircle2 size={16} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 3: INTERESTS */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col justify-start space-y-6"
            >
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 text-pink-600 text-xs font-bold mb-3">
                  <Sparkles size={13} />
                  <span>Step 3 of 5</span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  What are your favorite vibes?
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Pick your top companion date activities (select up to 8).
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {INTEREST_OPTIONS.map((item) => {
                  const isSelected = interests.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleInterest(item)}
                      className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border ${
                        isSelected
                          ? 'bg-pink-600 text-white border-pink-600 shadow-sm scale-105'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-pink-300 hover:bg-pink-50/30'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>

              <div className="text-xs text-slate-400 font-medium">
                {interests.length} selected (minimum 1 required)
              </div>
            </motion.div>
          )}

          {/* STEP 4: PHOTOS */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col justify-start space-y-6"
            >
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 text-pink-600 text-xs font-bold mb-3">
                  <Camera size={13} />
                  <span>Step 4 of 5</span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Add your photos
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Companions like seeing who they are meeting in person.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {photos.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-slate-200 shadow-sm group"
                  >
                    <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    {idx === 0 && (
                      <span className="absolute bottom-2 left-2 bg-pink-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                        Main
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-rose-600 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}

                {photos.length < 6 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-[3/4] rounded-2xl border-2 border-dashed border-pink-200 bg-pink-50/40 hover:bg-pink-50 text-pink-600 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95"
                  >
                    <Plus size={24} />
                    <span className="text-xs font-bold">Add Photo</span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400">Want to test with sample photos?</span>
                <button
                  type="button"
                  onClick={addPresetAvatar}
                  className="text-xs font-bold text-pink-600 hover:text-pink-700 underline flex items-center gap-1"
                >
                  <UploadCloud size={13} />
                  Add Demo Photo
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 5: LOCATION & BIO */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col justify-start space-y-6"
            >
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 text-pink-600 text-xs font-bold mb-3">
                  <MapPin size={13} />
                  <span>Step 5 of 5</span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Where are you located?
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Discover partners available in your neighborhood.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    City
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 text-slate-900 font-medium text-base shadow-sm"
                  >
                    {MAJOR_CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Area / Locality (Optional)
                  </label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Indiranagar, Koramangala, Bandra"
                    maxLength={60}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 text-slate-900 font-medium text-base shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    A short bio (Optional)
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    placeholder="Say hello! What kind of companion dates do you enjoy?"
                    maxLength={300}
                    className="w-full p-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 text-slate-900 text-sm shadow-sm resize-none"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Footer Controls ── */}
        <div className="pt-6 space-y-3">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold text-base shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
            >
              <span>Continue</span>
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:opacity-95 text-white font-black text-base shadow-lg shadow-pink-500/30 flex items-center justify-center gap-2 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Publishing Profile...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Start Exploring Dates</span>
                </>
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  );
};
