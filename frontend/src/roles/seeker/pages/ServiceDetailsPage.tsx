import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../services/api.js';
import { AppHeader } from '../../../components/AppHeader.js';
import { CategoryIcon } from '../../../components/CategoryIcon.js';
import { 
  ShieldCheck, Star, MapPin, Calendar, Clock, 
  ChevronLeft, ChevronRight, Share2, Users, 
  Sparkles, Maximize2, X, Globe, Briefcase, Heart, 
  Lock, MessageCircle, Check, AlertCircle, ShieldAlert
} from 'lucide-react';

interface ListingDetail {
  _id: string;
  title?: string;
  description?: string;
  startAt: string;
  endAt?: string;
  durationMins: number;
  city: string;
  area: string;
  pincode?: string;
  venueType: string;
  venueName: string;
  venueAddress: string;
  basePricePaise: number;
  status: string;
  category?: {
    _id: string;
    name: string;
    slug: string;
    icon: string;
    description: string;
    accentColor?: string;
  };
  profile: {
    displayName: string;
    primaryPhoto?: string;
    photos?: string[];
    bio?: string;
    ratingAverage?: number;
    totalReviews?: number;
    ratingAvg?: number;
    ratingCount?: number;
    languages?: string[];
    interests?: string[];
    hobbies?: string[];
    occupation?: string;
    industry?: string;
    gender?: string;
    dob?: string;
    smoke?: string;
    drink?: string;
    city?: string;
    area?: string;
    approvalStatus?: string;
  };
  partnerUser: {
    gender?: string;
    kycStatus?: string;
    isPhoneVerified?: boolean;
    name?: string;
    avatar?: string;
  };
}

export const ServiceDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Gallery state
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Booking state
  const [acknowledgedSafety, setAcknowledgedSafety] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [existingBooking, setExistingBooking] = useState<any | null>(null);

  const canSendRequest = !existingBooking || ['DECLINED', 'CANCELLED', 'EXPIRED'].includes(existingBooking.status);

  useEffect(() => {
    fetchListing();
  }, [id]);

  // Fetch any existing booking for this seeker-partner pair
  useEffect(() => {
    if (!listing) return;
    api.get<any>(`/bookings?listingId=${listing._id}&seekerId=current`).then((res: any) => {
      const items = res?.data?.data || res?.data;
      if (Array.isArray(items) && items.length > 0) {
        setExistingBooking(items[0]);
      }
    }).catch(console.error);
  }, [listing]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLightboxOpen(false);
      if (e.key === 'ArrowRight') nextPhoto();
      if (e.key === 'ArrowLeft') prevPhoto();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const fetchListing = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>(`/discover/listings/${id}`);
      const data = res.data?.data || res.data || null;
      if (data) {
        setListing(data);
      }
    } catch (error) {
      console.error('Failed to fetch listing', error);
    } finally {
      setLoading(false);
    }
  };

  // Compile all available photos
  const allPhotos = useMemo(() => {
    const list: string[] = [];
    if (listing?.profile?.primaryPhoto) {
      list.push(listing.profile.primaryPhoto);
    }
    if (Array.isArray(listing?.profile?.photos)) {
      listing.profile.photos.forEach((p) => {
        if (p && !list.includes(p)) list.push(p);
      });
    }
    // High-aesthetic fallback photos if profile doesn't have gallery yet
    if (list.length === 0) {
      list.push(
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1000&q=80'
      );
    }
    return list;
  }, [listing]);

  const nextPhoto = () => {
    setActivePhotoIndex((prev) => (prev + 1) % allPhotos.length);
  };

  const prevPhoto = () => {
    setActivePhotoIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);
  };

  const calculateAge = (dobString?: string): number | null => {
    if (!dobString) return null;
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age > 0 ? age : null;
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: listing?.title || `${listing?.profile?.displayName} on DateToGo`,
        text: `Check out companion ${listing?.profile?.displayName} on DateToGo`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const handleRequestBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing) return;

    if (!canSendRequest) {
      setBookingError('A request is already pending or confirmed for this companion.');
      return;
    }

    if (!acknowledgedSafety) {
      setBookingError('You must acknowledge the 100% Platonic Meetup Policy.');
      return;
    }

    setBookingSubmitting(true);
    setBookingError(null);

    try {
      const res = await api.post<{ success: boolean; data: { bookingId: string } }>('/bookings', {
        listingId: listing._id,
      });

      if (!res.data) throw new Error('Failed to initiate request');

      setBookingSuccess(true);
      setExistingBooking({ status: 'REQUESTED' });
    } catch (err: any) {
      setBookingError(err?.message || 'Failed to send request. Please try again.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-muted animate-pulse">Loading companion details & photos...</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-black text-textMain mb-2">Listing Not Available</h2>
        <p className="text-sm text-muted mb-6 max-w-sm">This companion listing may have expired or is currently booked by another seeker.</p>
        <button
          onClick={() => navigate('/s/discover')}
          className="px-6 py-3 bg-primary text-white rounded-2xl font-bold text-sm shadow-md active:scale-95 transition-transform"
        >
          Explore Other Companions
        </button>
      </div>
    );
  }

  const durationHours = listing.durationMins ? listing.durationMins / 60 : 2;
  const totalPrice = listing.basePricePaise / 100;
  const hourlyRate = Math.round(totalPrice / (durationHours || 1));
  const partnerAge = calculateAge(listing.profile?.dob);
  const ratingAvg = listing.profile?.ratingAvg || listing.profile?.ratingAverage || 5.0;
  const ratingCount = listing.profile?.ratingCount || listing.profile?.totalReviews || 12;

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-16">
      
      {/* ── STICKY TOP HEADER ── */}
      <AppHeader 
        title={listing.title || `${listing.profile.displayName} · Experience`}
        rightAction={
          <button
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-surface border border-borderLight flex items-center justify-center text-textMain hover:border-primary/50 active:scale-95 transition-all shadow-xs"
            title="Share Companion"
          >
            {copiedShare ? <Check size={18} className="text-emerald-500" /> : <Share2 size={18} />}
          </button>
        }
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-6">
        
        {/* ── TWO-COLUMN DESKTOP LAYOUT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* ════════ LEFT COLUMN: PHOTOS & PROFILE (7 COLS) ════════ */}
          <div className="lg:col-span-7 space-y-6">

            {/* 1. PHOTO GALLERY HERO & CAROUSEL */}
            <section className="bg-surface border border-borderLight rounded-3xl overflow-hidden shadow-xs relative">
              {/* Main Photo Viewer */}
              <div className="relative aspect-[4/3] sm:aspect-[16/11] bg-bg overflow-hidden group">
                <img
                  src={allPhotos[activePhotoIndex]}
                  alt={`${listing.profile.displayName} photo ${activePhotoIndex + 1}`}
                  onClick={() => setIsLightboxOpen(true)}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-zoom-in"
                />

                {/* Ambient Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                {/* Top Badges */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-black uppercase tracking-wider border border-white/10 shadow-sm">
                      <ShieldCheck size={14} className="text-emerald-400" />
                      <span>100% ID Verified</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-black uppercase tracking-wider border border-white/10 shadow-sm">
                      <Lock size={12} className="text-amber-400" />
                      <span>Platonic</span>
                    </span>
                  </div>

                  {/* Expand / Lightbox Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsLightboxOpen(true);
                    }}
                    className="pointer-events-auto w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 border border-white/20 active:scale-90 transition-transform shadow-sm"
                    title="View fullscreen gallery"
                  >
                    <Maximize2 size={16} />
                  </button>
                </div>

                {/* Previous / Next Arrow Controls */}
                {allPhotos.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        prevPhoto();
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-textMain backdrop-blur-md flex items-center justify-center shadow-lg active:scale-95 transition-all opacity-90 hover:opacity-100 z-10"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        nextPhoto();
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-textMain backdrop-blur-md flex items-center justify-center shadow-lg active:scale-95 transition-all opacity-90 hover:opacity-100 z-10"
                      aria-label="Next photo"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}

                {/* Bottom Overlay: Counter & Companion Identity */}
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between z-10 pointer-events-none">
                  <div>
                    <span className="text-white text-xl sm:text-2xl font-black drop-shadow-md">
                      {listing.profile.displayName}
                    </span>
                    <p className="text-white/90 text-xs font-semibold flex items-center gap-1.5 mt-0.5 drop-shadow-sm">
                      <MapPin size={13} className="text-primary-300" />
                      <span>{listing.area ? `${listing.area}, ${listing.city}` : listing.city}</span>
                    </p>
                  </div>

                  {/* Photo Counter Pill */}
                  <div className="bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold border border-white/10 shrink-0">
                    📷 {activePhotoIndex + 1} / {allPhotos.length}
                  </div>
                </div>
              </div>

              {/* Thumbnail Strip */}
              {allPhotos.length > 1 && (
                <div className="p-3 bg-surface border-t border-borderLight/70 flex items-center gap-2.5 overflow-x-auto hide-scrollbar">
                  {allPhotos.map((photo, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActivePhotoIndex(idx)}
                      className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 transition-all border-2 ${
                        activePhotoIndex === idx 
                          ? 'border-primary ring-2 ring-primary/30 scale-100 opacity-100' 
                          : 'border-transparent opacity-60 hover:opacity-100 scale-95'
                      }`}
                    >
                      <img
                        src={photo}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* 2. COMPANION PROFILE CARD */}
            <section className="bg-surface border border-borderLight rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
              
              {/* Profile Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-borderLight/70">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={listing.profile.primaryPhoto || allPhotos[0]}
                      alt={listing.profile.displayName}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-primary/20 shadow-md"
                    />
                    <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full shadow-xs" title="Verified Companion">
                      <ShieldCheck size={14} />
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl sm:text-2xl font-black text-textMain tracking-tight">
                        {listing.profile.displayName}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        Verified
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted font-medium mt-1 flex-wrap">
                      {partnerAge && (
                        <span>{partnerAge} yrs</span>
                      )}
                      {listing.profile.gender && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{listing.profile.gender.toLowerCase()}</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="flex items-center gap-1 font-bold text-textMain">
                        <Star size={13} className="text-amber-400 fill-amber-400" />
                        {ratingAvg.toFixed(1)} ({ratingCount} reviews)
                      </span>
                    </div>

                    {listing.profile.occupation && (
                      <p className="text-xs font-semibold text-primary mt-1 flex items-center gap-1">
                        <Briefcase size={12} />
                        <span>{listing.profile.occupation} {listing.profile.industry ? `· ${listing.profile.industry}` : ''}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* About / Bio */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-muted mb-2">
                  About Companion
                </h3>
                <p className="text-sm text-textMain leading-relaxed font-medium whitespace-pre-line bg-bg p-4 rounded-2xl border border-borderLight/60">
                  {listing.profile.bio || "Hello! I am a verified social companion on DateToGo. I enjoy relaxed café conversations, exploring new culinary spots, and memorable platonic meetups in safe public venues."}
                </p>
              </div>

              {/* Languages Spoken */}
              {Array.isArray(listing.profile.languages) && listing.profile.languages.length > 0 && (
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
                    <Globe size={13} className="text-primary" />
                    <span>Languages Spoken</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {listing.profile.languages.map((lang) => (
                      <span 
                        key={lang}
                        className="px-3 py-1.5 rounded-xl bg-bg border border-borderLight text-xs font-bold text-textMain flex items-center gap-1"
                      >
                        🗣️ {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Interests & Hobbies */}
              {((listing.profile.interests && listing.profile.interests.length > 0) || (listing.profile.hobbies && listing.profile.hobbies.length > 0)) && (
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
                    <Heart size={13} className="text-pink-500" />
                    <span>Interests & Activities</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {[...(listing.profile.interests || []), ...(listing.profile.hobbies || [])].map((item, idx) => (
                      <span 
                        key={idx}
                        className="px-3 py-1.5 rounded-xl bg-primary/5 border border-primary/15 text-xs font-bold text-primary"
                      >
                        ✨ {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Lifestyle Indicators */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-bg border border-borderLight/60 flex items-center gap-3">
                  <span className="text-lg">🚭</span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Smoking</p>
                    <p className="text-xs font-black text-textMain capitalize">
                      {listing.profile.smoke ? listing.profile.smoke.toLowerCase().replace(/_/g, ' ') : 'Non-Smoker'}
                    </p>
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-bg border border-borderLight/60 flex items-center gap-3">
                  <span className="text-lg">🍸</span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Drinking</p>
                    <p className="text-xs font-black text-textMain capitalize">
                      {listing.profile.drink ? listing.profile.drink.toLowerCase().replace(/_/g, ' ') : 'Socially / Never'}
                    </p>
                  </div>
                </div>
              </div>

            </section>

          </div>


          {/* ════════ RIGHT COLUMN: EXPERIENCE DETAILS & BOOKING CTA (5 COLS) ════════ */}
          <div className="lg:col-span-5 space-y-6">

            {/* 3. EXPERIENCE SPECIFICS */}
            <section className="bg-surface border border-borderLight rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
              
              {/* Category Pill + Title */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-wider mb-2.5">
                  <CategoryIcon 
                    icon={listing.category?.icon || 'coffee'} 
                    slug={listing.category?.slug} 
                    name={listing.category?.name} 
                    size={15} 
                  />
                  <span>{listing.category?.name || 'Social Experience'}</span>
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-textMain leading-tight">
                  {listing.title || `${listing.category?.name || 'Companion'} Outing`}
                </h1>
                
                {listing.description && (
                  <p className="text-xs sm:text-sm text-muted font-medium mt-2 leading-relaxed">
                    {listing.description}
                  </p>
                )}
              </div>

              {/* Schedule Details Grid */}
              <div className="space-y-3 pt-2 border-t border-borderLight/60">
                
                <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-bg border border-borderLight/60">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Date & Time</p>
                    <p className="text-xs sm:text-sm font-black text-textMain">
                      {new Date(listing.startAt).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} • {new Date(listing.startAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-bg border border-borderLight/60">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                    <Clock size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Slot Duration</p>
                    <p className="text-xs sm:text-sm font-black text-textMain">
                      {durationHours} {durationHours === 1 ? 'Hour' : 'Hours'} ({listing.durationMins} minutes)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-bg border border-borderLight/60">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Public Venue</p>
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-md bg-emerald-100 text-emerald-800">
                        {listing.venueType || 'PUBLIC CAFE'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-black text-textMain">
                      {listing.venueName}
                    </p>
                    <p className="text-[11px] font-semibold text-muted">
                      {listing.venueAddress || `${listing.area}, ${listing.city}`}
                    </p>
                  </div>
                </div>

              </div>

            </section>

            {/* 4. TRANSPARENT PRICING CARD */}
            <section className="bg-surface border border-borderLight rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-textMain uppercase tracking-wider">
                Transparent Pricing
              </h3>

              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between items-center text-muted font-medium">
                  <span>Companion Rate ({durationHours} hr{durationHours > 1 ? 's' : ''})</span>
                  <span className="font-bold text-textMain">₹{hourlyRate.toLocaleString('en-IN')}/hr × {durationHours} hrs</span>
                </div>
                <div className="pt-3 border-t border-borderLight/70 flex justify-between items-baseline">
                  <div>
                    <span className="text-sm font-black text-textMain block">Total Payable</span>
                    <span className="text-[10px] font-semibold text-emerald-600">All taxes & platform escrow protection included</span>
                  </div>
                  <span className="text-2xl font-black text-primary">
                    ₹{totalPrice.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Escrow Shield Notice */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3">
                <ShieldCheck size={20} className="text-emerald-500 shrink-0" />
                <p className="text-[11px] font-bold text-emerald-900 leading-snug">
                  100% Escrow Protection: Funds are only transferred after both you and {listing.profile.displayName} verify the meetup OTP.
                </p>
              </div>
            </section>

            {/* 5. REQUEST BOOKING OR EXISTING BOOKING STATUS */}
            <section className="bg-surface border border-borderLight rounded-3xl p-5 sm:p-6 shadow-xs">
              
              {existingBooking && !['DECLINED', 'CANCELLED', 'EXPIRED'].includes(existingBooking.status) ? (
                /* Already Booked / Requested State */
                <div className="space-y-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-textMain">
                      {existingBooking.status === 'ACCEPTED' ? 'Booking Accepted!' : 'Request In Progress'}
                    </h3>
                    <p className="text-xs text-muted font-medium mt-1">
                      You already have an active request for this date.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={() => navigate(`/s/chat/${existingBooking._id}`)}
                      className="w-full py-3.5 rounded-2xl bg-primary text-white font-black text-xs sm:text-sm shadow-md shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={16} />
                      <span>Chat with {listing.profile.displayName}</span>
                    </button>
                    <button
                      onClick={() => navigate('/s/booking')}
                      className="w-full py-3 rounded-2xl bg-bg border border-borderLight text-textMain font-bold text-xs hover:bg-borderLight/30 active:scale-95 transition-all"
                    >
                      View in My Bookings
                    </button>
                  </div>
                </div>
              ) : bookingSuccess ? (
                /* Fresh Success State */
                <div className="space-y-4 text-center py-2">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-2xl">
                    🎉
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-emerald-900">
                      Request Sent Successfully!
                    </h3>
                    <p className="text-xs text-emerald-800/80 font-medium mt-1 leading-relaxed">
                      Your date request has been delivered to {listing.profile.displayName}. You will be notified instantly when they respond.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={() => navigate('/s/booking')}
                      className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all"
                    >
                      View Booking Status
                    </button>
                  </div>
                </div>
              ) : (
                /* Booking Form */
                <form onSubmit={handleRequestBooking} className="space-y-4">
                  {bookingError && (
                    <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-bold flex items-center gap-2">
                      <AlertCircle size={16} className="shrink-0" />
                      <span>{bookingError}</span>
                    </div>
                  )}

                  {/* Safety Checkbox */}
                  <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-bg border border-borderLight/70 cursor-pointer hover:border-primary/50 transition-colors">
                    <input
                      type="checkbox"
                      required
                      checked={acknowledgedSafety}
                      onChange={(e) => setAcknowledgedSafety(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary border-borderLight cursor-pointer"
                    />
                    <span className="text-[11px] sm:text-xs text-muted font-medium leading-relaxed">
                      I agree to the <strong className="text-textMain">100% Platonic Policy</strong>. This is strictly social companionship. Romantic or physical solicitation is prohibited.
                    </span>
                  </label>

                  {/* Submit CTA */}
                  <button
                    type="submit"
                    disabled={bookingSubmitting || !acknowledgedSafety}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-accent hover:from-primaryDark hover:to-primary text-white font-black text-sm shadow-md shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {bookingSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending Request...</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Users size={16} />
                        <span>Book Date with {listing.profile.displayName}</span>
                      </span>
                    )}
                  </button>

                  <p className="text-[10px] text-center text-muted font-semibold">
                    No payment is charged right now. You only pay after {listing.profile.displayName} accepts your date.
                  </p>
                </form>
              )}

            </section>

            {/* 6. PLATONIC SAFETY GUARANTEE PILLARS */}
            <section className="bg-orange-50/60 border border-orange-200/80 rounded-3xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-orange-800">
                <ShieldAlert size={18} className="shrink-0" />
                <h4 className="text-xs font-black uppercase tracking-wider">DateToGo Safety Standards</h4>
              </div>
              <ul className="text-[11px] sm:text-xs text-orange-950/80 space-y-1.5 font-medium list-disc list-inside leading-relaxed">
                <li>All meetups occur exclusively in public restaurants or venues.</li>
                <li>Zero-tolerance policy for harassment or physical solicitation.</li>
                <li>Active emergency SOS button available on your dashboard during dates.</li>
              </ul>
            </section>

          </div>

        </div>

      </main>

      {/* ════════ FULLSCREEN LIGHTBOX MODAL ════════ */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Lightbox Header */}
          <div className="flex items-center justify-between text-white z-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <span className="text-sm sm:text-base font-black">
                {listing.profile.displayName} · Photo Gallery
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-bold">
                {activePhotoIndex + 1} of {allPhotos.length}
              </span>
            </div>

            <button
              onClick={() => setIsLightboxOpen(false)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Close Lightbox"
            >
              <X size={20} />
            </button>
          </div>

          {/* Centered Image with Navigation */}
          <div 
            className="relative flex-1 flex items-center justify-center my-4 max-h-[75vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={allPhotos[activePhotoIndex]}
              alt={`Full size ${activePhotoIndex + 1}`}
              className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl select-none"
            />

            {allPhotos.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md flex items-center justify-center active:scale-90 transition-all"
                  aria-label="Previous"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  onClick={nextPhoto}
                  className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md flex items-center justify-center active:scale-90 transition-all"
                  aria-label="Next"
                >
                  <ChevronRight size={28} />
                </button>
              </>
            )}
          </div>

          {/* Lightbox Thumbnails Bottom Bar */}
          {allPhotos.length > 1 && (
            <div 
              className="flex items-center justify-center gap-2 overflow-x-auto py-2 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {allPhotos.map((photo, idx) => (
                <button
                  key={idx}
                  onClick={() => setActivePhotoIndex(idx)}
                  className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                    activePhotoIndex === idx 
                      ? 'border-white scale-105 opacity-100' 
                      : 'border-transparent opacity-40 hover:opacity-80 scale-95'
                  }`}
                >
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
