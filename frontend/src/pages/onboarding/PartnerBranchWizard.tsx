import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  ShieldCheck,
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
  FileCheck,
  DollarSign,
  Lock,
} from 'lucide-react';
import { api, formatApiError } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { useAccess } from '../../shared/providers/AccessProvider.js';

interface CategoryServiceItem {
  categoryId: string;
  name: string;
  description: string;
  rateInr: number;
  enabled: boolean;
}

const DEFAULT_COMPANION_CATEGORIES: CategoryServiceItem[] = [
  {
    categoryId: '65f000000000000000000001',
    name: 'Coffee & Cafe Catchup',
    description: 'Casual coffee, deep conversations, and cozy cafe vibes.',
    rateInr: 1000,
    enabled: true,
  },
  {
    categoryId: '65f000000000000000000002',
    name: 'Dinner & Dining Companion',
    description: 'Fine dining, foodie explorations, and lively dinner company.',
    rateInr: 1500,
    enabled: true,
  },
  {
    categoryId: '65f000000000000000000003',
    name: 'City Guide & Sightseeing',
    description: 'Explore monuments, art districts, shopping streets, and city gems.',
    rateInr: 1200,
    enabled: false,
  },
  {
    categoryId: '65f000000000000000000004',
    name: 'Event Plus-One & Social',
    description: 'Weddings, galas, art openings, parties, and networking events.',
    rateInr: 2000,
    enabled: false,
  },
  {
    categoryId: '65f000000000000000000005',
    name: 'Fitness & Activity Partner',
    description: 'Gym sessions, tennis, running, cycling, or outdoor sports.',
    rateInr: 1200,
    enabled: false,
  },
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

const SAFE_VENUES = [
  '☕ Specialty Cafes & Coffee Shops',
  '🍽️ Verified Public Restaurants',
  '🛍️ Shopping Centers & Malls',
  '🎨 Art Galleries & Museums',
  '🌳 Public Parks & Promenades',
  '📚 Library & Book Cafes',
];

export const PartnerBranchWizard: React.FC = () => {
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
  const [city, setCity] = useState<string>('Bangalore');
  const [area, setArea] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [services, setServices] = useState<CategoryServiceItem[]>(DEFAULT_COMPANION_CATEGORIES);
  const [photos, setPhotos] = useState<string[]>([]);
  const [venuePreferences, setVenuePreferences] = useState<string[]>([
    '☕ Specialty Cafes & Coffee Shops',
    '🍽️ Verified Public Restaurants',
  ]);

  // KYC State
  const [docType, setDocType] = useState<'AADHAAR' | 'PAN' | 'PASSPORT' | 'VOTER_ID'>('AADHAAR');
  const [docNumber, setDocNumber] = useState<string>('');
  const [docPhotoUrl, setDocPhotoUrl] = useState<string>('');
  const [selfieUrl, setSelfieUrl] = useState<string>('');
  const [acceptedGuidelines, setAcceptedGuidelines] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const kycDocInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  // Load existing draft
  useEffect(() => {
    let isMounted = true;
    async function loadDraft() {
      try {
        const [draftRes, catRes] = await Promise.allSettled([
          api.get<any>('/auth/onboarding/draft'),
          api.get<any>('/categories'),
        ]);

        if (catRes.status === 'fulfilled' && catRes.value.data && Array.isArray(catRes.value.data) && catRes.value.data.length > 0) {
          const apiCats: CategoryServiceItem[] = catRes.value.data.map((c: any, index: number) => ({
            categoryId: c._id || `cat_${index}`,
            name: c.name || `Service ${index + 1}`,
            description: c.description || 'Companion service',
            rateInr: 1000,
            enabled: index < 2,
          }));
          if (isMounted) setServices(apiCats);
        }

        if (draftRes.status === 'fulfilled' && draftRes.value.data?.data && isMounted) {
          const d = draftRes.value.data.data;
          if (d.displayName) setDisplayName(d.displayName);
          if (d.gender) setGender(d.gender);
          if (d.city) setCity(d.city);
          if (d.area) setArea(d.area);
          if (d.bio) setBio(d.bio);
          if (d.photos) setPhotos(d.photos);
          if (d.venuePreferences) setVenuePreferences(d.venuePreferences);
          if (d.rates && Array.isArray(d.rates)) {
            setServices((prev) =>
              prev.map((s) => {
                const match = d.rates.find((r: any) => r.categoryId === s.categoryId);
                if (match) {
                  return { ...s, enabled: true, rateInr: Math.round(match.hourlyRatePaise / 100) };
                }
                return s;
              }),
            );
          }
          if (draftRes.value.data.kycDocuments && Array.isArray(draftRes.value.data.kycDocuments)) {
            const kycDocs = draftRes.value.data.kycDocuments;
            const primaryDoc = kycDocs.find((k: any) => k.docType !== 'SELFIE');
            const selfieDoc = kycDocs.find((k: any) => k.docType === 'SELFIE');
            if (primaryDoc) {
              setDocType(primaryDoc.docType);
              setDocPhotoUrl(primaryDoc.fileUrl);
            }
            if (selfieDoc) {
              setSelfieUrl(selfieDoc.fileUrl);
            }
          }
        } else if (user?.fullName && isMounted) {
          setDisplayName(user.fullName);
        }
      } catch {
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

  // Debounced auto-save
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      const activeRates = services
        .filter((s) => s.enabled)
        .map((s) => ({
          categoryId: s.categoryId,
          hourlyRatePaise: s.rateInr * 100,
        }));

      const kycDocs = [];
      if (docPhotoUrl) {
        kycDocs.push({ docType, fileUrl: docPhotoUrl, status: 'PENDING' });
      }
      if (selfieUrl) {
        kycDocs.push({ docType: 'SELFIE', fileUrl: selfieUrl, status: 'PENDING' });
      }

      api
        .patch('/auth/onboarding/draft', {
          step: `PARTNER_STEP_${step}`,
          data: {
            displayName,
            gender,
            city,
            area,
            bio,
            rates: activeRates,
            photos,
            venuePreferences,
          },
          kycDocuments: kycDocs,
        })
        .catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, [
    displayName,
    gender,
    city,
    area,
    bio,
    services,
    photos,
    venuePreferences,
    docType,
    docPhotoUrl,
    selfieUrl,
    step,
    loading,
  ]);

  const toggleVenue = (venue: string) => {
    if (venuePreferences.includes(venue)) {
      if (venuePreferences.length > 1) {
        setVenuePreferences(venuePreferences.filter((v) => v !== venue));
      }
    } else {
      setVenuePreferences([...venuePreferences, venue]);
    }
  };

  const updateServiceRate = (categoryId: string, rate: number) => {
    setServices((prev) =>
      prev.map((s) => (s.categoryId === categoryId ? { ...s, rateInr: Math.max(500, rate) } : s)),
    );
  };

  const toggleService = (categoryId: string) => {
    setServices((prev) =>
      prev.map((s) => (s.categoryId === categoryId ? { ...s, enabled: !s.enabled } : s)),
    );
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
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64 = uploadEvent.target?.result as string;
        if (base64) setPhotos((prev) => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKycUpload = async (e: React.ChangeEvent<HTMLInputElement>, isSelfie = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<{ url: string }>('/upload', formData);
      if (res.data?.url) {
        if (isSelfie) setSelfieUrl(res.data.url);
        else setDocPhotoUrl(res.data.url);
        return;
      }
    } catch {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64 = uploadEvent.target?.result as string;
        if (base64) {
          if (isSelfie) setSelfieUrl(base64);
          else setDocPhotoUrl(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const addPresetPartnerPhoto = () => {
    const partnerAvatars = [
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    ];
    const unused = partnerAvatars.find((a) => !photos.includes(a)) || partnerAvatars[0];
    setPhotos([...photos, unused]);
  };

  const addPresetKycDemo = () => {
    setDocNumber('9876-5432-1098');
    setDocPhotoUrl('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80');
    setSelfieUrl('https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80');
  };

  const validateCurrentStep = (): boolean => {
    setErrorMsg(null);
    if (step === 1) {
      if (!displayName.trim() || displayName.trim().length < 2) {
        setErrorMsg('Please enter your professional display name');
        return false;
      }
      if (!bio.trim() || bio.trim().length < 10) {
        setErrorMsg('Please write a brief bio about yourself (minimum 10 characters)');
        return false;
      }
    } else if (step === 2) {
      const enabledServices = services.filter((s) => s.enabled);
      if (enabledServices.length === 0) {
        setErrorMsg('Please enable at least 1 companion service');
        return false;
      }
    } else if (step === 3) {
      if (photos.length === 0) {
        setErrorMsg('Please upload at least 1 clear profile photo');
        return false;
      }
    } else if (step === 4) {
      if (!docPhotoUrl) {
        setErrorMsg('Please upload your Government ID document');
        return false;
      }
      if (!selfieUrl) {
        setErrorMsg('Please upload a clear selfie photo for identity matching');
        return false;
      }
    } else if (step === 5) {
      if (venuePreferences.length === 0) {
        setErrorMsg('Please select at least 1 safe venue type');
        return false;
      }
      if (!acceptedGuidelines) {
        setErrorMsg('You must agree to the Companion Safety & Escrow Guidelines');
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
      const activeRates = services
        .filter((s) => s.enabled)
        .map((s) => ({
          categoryId: s.categoryId,
          hourlyRatePaise: s.rateInr * 100,
        }));

      const kycDocs = [
        { docType, fileUrl: docPhotoUrl, status: 'PENDING' },
        { docType: 'SELFIE', fileUrl: selfieUrl, status: 'PENDING' },
      ];

      const payload = {
        data: {
          displayName: displayName.trim(),
          gender,
          city,
          area: area.trim(),
          bio: bio.trim(),
          rates: activeRates,
          photos,
          venuePreferences,
        },
        kycDocuments: kycDocs,
      };

      const res = await api.post<{ nextRoute?: string; onboardingState?: string }>(
        '/auth/onboarding/submit',
        payload,
      );

      await refreshUser();
      const updatedAccess = await refetchAccess();

      let nextRoute = res.data?.nextRoute;
      if (!nextRoute || nextRoute === '/p/dashboard') {
        if (!updatedAccess?.entitlements?.partner?.active) {
          nextRoute = '/pricing';
        } else {
          nextRoute = '/p/dashboard';
        }
      }
      navigate(nextRoute, { replace: true });
    } catch (err: any) {
      setErrorMsg(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col justify-between antialiased selection:bg-indigo-500/30">
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-30 w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="w-10">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                aria-label="Go Back"
                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-500 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
              <Briefcase size={14} />
            </div>
            <span className="font-extrabold text-base tracking-tight text-white">
              Partner Setup
            </span>
          </div>

          <div className="w-10 text-right">
            <span className="text-xs font-bold text-indigo-400 bg-indigo-950/80 border border-indigo-800 px-2 py-1 rounded-full">
              {step}/5
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-slate-800">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400"
            initial={{ width: `${((step - 1) / 5) * 100}%` }}
            animate={{ width: `${(step / 5) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </header>

      {/* ── Main Step Container ── */}
      <main className="flex-1 max-w-md w-full mx-auto px-5 py-6 flex flex-col justify-between">
        <AnimatePresence mode="wait">
          {/* STEP 1: BASICS */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col justify-start space-y-5"
            >
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800 text-indigo-400 text-xs font-bold mb-3">
                  <Briefcase size={13} />
                  <span>Step 1 of 5</span>
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  Your Professional Identity
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  How you will be presented to seekers seeking companion dates.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Ananya Sen"
                    maxLength={50}
                    className="w-full h-12 px-4 rounded-xl border border-slate-800 bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-white font-medium text-base shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Gender
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
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    City
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-slate-800 bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-white font-medium text-base shadow-sm"
                  >
                    {MAJOR_CITIES.map((c) => (
                      <option key={c} value={c} className="bg-slate-900 text-white">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Area / Locality
                  </label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Indiranagar, Bandra West, CP"
                    maxLength={60}
                    className="w-full h-12 px-4 rounded-xl border border-slate-800 bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-white font-medium text-base shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Bio & Conversation Style
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    placeholder="Describe your interests, conversational vibe, and what makes spending time with you fun and relaxing..."
                    maxLength={500}
                    className="w-full p-4 rounded-xl border border-slate-800 bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-white text-sm shadow-sm resize-none"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: SERVICES & HOURLY RATES */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col justify-start space-y-4"
            >
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800 text-indigo-400 text-xs font-bold mb-3">
                  <DollarSign size={13} />
                  <span>Step 2 of 5</span>
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  Services & Hourly Rates
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Choose date experiences you offer and set your pricing in INR (₹).
                </p>
              </div>

              <div className="space-y-3">
                {services.map((svc) => (
                  <div
                    key={svc.categoryId}
                    className={`p-4 rounded-2xl border transition-all ${
                      svc.enabled
                        ? 'border-indigo-500/60 bg-indigo-950/20 shadow-sm'
                        : 'border-slate-800 bg-slate-900/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={svc.enabled}
                            onChange={() => toggleService(svc.categoryId)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700 cursor-pointer"
                          />
                          <span className="font-bold text-white text-base">{svc.name}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 pl-6">{svc.description}</p>
                      </div>

                      {svc.enabled && (
                        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-xl shrink-0">
                          <span className="text-xs text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            min={500}
                            step={100}
                            value={svc.rateInr}
                            onChange={(e) =>
                              updateServiceRate(svc.categoryId, parseInt(e.target.value) || 500)
                            }
                            className="w-16 bg-transparent text-right font-black text-white text-sm focus:outline-none"
                          />
                          <span className="text-[11px] text-slate-500">/hr</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 3: PHOTOS */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col justify-start space-y-5"
            >
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800 text-indigo-400 text-xs font-bold mb-3">
                  <Camera size={13} />
                  <span>Step 3 of 5</span>
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  Professional Photos
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Upload crisp, high-quality portrait photos showcasing your warm personality.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {photos.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-slate-800 shadow-sm group"
                  >
                    <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    {idx === 0 && (
                      <span className="absolute bottom-2 left-2 bg-indigo-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                        Primary
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-rose-600 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}

                {photos.length < 6 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-[3/4] rounded-2xl border-2 border-dashed border-indigo-500/40 bg-indigo-950/20 hover:bg-indigo-950/40 text-indigo-400 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95"
                  >
                    <Plus size={24} />
                    <span className="text-xs font-bold">Upload Photo</span>
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
                <span className="text-xs text-slate-500">Need instant demo photos?</span>
                <button
                  type="button"
                  onClick={addPresetPartnerPhoto}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1"
                >
                  <UploadCloud size={13} />
                  Add Demo Portrait
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: INTEGRATED KYC */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col justify-start space-y-5"
            >
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-xs font-bold mb-3">
                  <ShieldCheck size={13} />
                  <span>Step 4 of 5</span>
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  Identity Verification (KYC)
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Required for all companion partners to guarantee 18+ verified platform safety.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Document Type
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as any)}
                    className="w-full h-12 px-4 rounded-xl border border-slate-800 bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-white font-medium text-sm"
                  >
                    <option value="AADHAAR">Aadhaar Card</option>
                    <option value="PAN">PAN Card</option>
                    <option value="PASSPORT">Passport</option>
                    <option value="VOTER_ID">Voter ID</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Document Number (Optional for review)
                  </label>
                  <input
                    type="text"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    placeholder="e.g. 12-digit Aadhaar / 10-char PAN"
                    className="w-full h-12 px-4 rounded-xl border border-slate-800 bg-slate-900 text-white text-sm"
                  />
                </div>

                {/* Document Upload Card */}
                <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400">
                      <FileCheck size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">Government ID Photo</div>
                      <div className="text-xs text-slate-400">
                        {docPhotoUrl ? 'Document uploaded ✓' : 'Front view of ID card'}
                      </div>
                    </div>
                  </div>

                  {docPhotoUrl ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-400 font-bold">Uploaded</span>
                      <button
                        type="button"
                        onClick={() => setDocPhotoUrl('')}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => kycDocInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all"
                    >
                      Upload ID
                    </button>
                  )}
                </div>

                {/* Selfie Card */}
                <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400">
                      <Camera size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">Live Selfie Photo</div>
                      <div className="text-xs text-slate-400">
                        {selfieUrl ? 'Selfie captured ✓' : 'Face photo matching ID'}
                      </div>
                    </div>
                  </div>

                  {selfieUrl ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-400 font-bold">Uploaded</span>
                      <button
                        type="button"
                        onClick={() => setSelfieUrl('')}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => selfieInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all"
                    >
                      Take Selfie
                    </button>
                  )}
                </div>

                <input
                  ref={kycDocInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleKycUpload(e, false)}
                />
                <input
                  ref={selfieInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleKycUpload(e, true)}
                />

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                  <Lock size={14} className="text-emerald-400 shrink-0" />
                  <span>Encrypted 256-bit vault. Documents are never shared with seekers.</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-500">Testing KYC flow?</span>
                  <button
                    type="button"
                    onClick={addPresetKycDemo}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline"
                  >
                    Auto-Fill Demo KYC
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 5: VENUES & SAFETY GUIDELINES */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col justify-start space-y-5"
            >
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800 text-indigo-400 text-xs font-bold mb-3">
                  <MapPin size={13} />
                  <span>Step 5 of 5</span>
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  Safe Venues & Code of Conduct
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  All dates must take place strictly in verified, public, high-footfall locations.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Select Permitted Public Venues
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {SAFE_VENUES.map((venue) => {
                    const isSelected = venuePreferences.includes(venue);
                    return (
                      <button
                        key={venue}
                        type="button"
                        onClick={() => toggleVenue(venue)}
                        className={`p-3 rounded-xl border text-left text-xs font-bold flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-indigo-950/40 border-indigo-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <span>{venue}</span>
                        {isSelected && <CheckCircle2 size={16} className="text-indigo-400" />}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <label className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedGuidelines}
                      onChange={(e) => setAcceptedGuidelines(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
                    />
                    <div className="text-xs text-slate-300">
                      <span className="font-bold text-white block mb-0.5">
                        I agree to the Date-to-Go Companion Safety Agreement
                      </span>
                      I understand dates are strictly platonic, public venues only, and payments are
                      released to my wallet via seeker completion PIN at the end of the date.
                    </div>
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Footer Navigation ── */}
        <div className="pt-6 space-y-3">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
            >
              <span>Continue</span>
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-600 to-emerald-500 hover:opacity-95 text-white font-black text-base shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Submitting Application...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>Submit Partner Profile</span>
                </>
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  );
};
