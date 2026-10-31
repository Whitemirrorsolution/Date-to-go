import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../services/api.js';
import {
  ChevronLeft, ShieldCheck, Star, MapPin, Globe,
  Briefcase, Heart, Calendar, Clock, ChevronRight,
  ChevronLeft as PhotoLeft, Sparkles, AlertCircle,
  MessageSquare
} from 'lucide-react';

interface OpenListing {
  _id: string;
  title?: string;
  startAt: string;
  endAt?: string;
  durationMins: number;
  basePricePaise: number;
  city: string;
  area: string;
}

interface Review {
  rating: number;
  comment?: string;
  createdAt: string;
}

interface PartnerPublicProfile {
  id: string;
  userId: string;
  displayName: string;
  bio?: string;
  photos?: string[];
  primaryPhoto?: string;
  hourlyRatePaise: number;
  hourlyRateInRupees?: string;
  languages?: string[];
  interests?: string[];
  hobbies?: string[];
  occupation?: string;
  industry?: string;
  categories?: Array<{ categoryId?: { name: string; icon: string }; hourlyRatePaise: number }>;
  weeklySlots?: Array<{ day: string; start: string; end: string }>;
  isAvailableNow?: boolean;
  ratingAvg?: number;
  ratingCount?: number;
  kycVerified?: boolean;
  openListings?: OpenListing[];
  recentReviews?: Review[];
}

export const PartnerPublicProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<PartnerPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    api
      .get<any>(`/discover/by-user/${id}`)
      .then((res: any) => {
        const data = res?.data?.data || res?.data || null;
        setProfile(data);
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.message || err?.message || 'Could not load profile';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const allPhotos = useMemo(() => {
    const list: string[] = [];
    if (profile?.primaryPhoto) list.push(profile.primaryPhoto);
    if (Array.isArray(profile?.photos)) {
      profile.photos.forEach((p) => { if (p && !list.includes(p)) list.push(p); });
    }
    if (list.length === 0) {
      list.push(
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
      );
    }
    return list;
  }, [profile]);

  const nextPhoto = () => setPhotoIndex((p) => (p + 1) % allPhotos.length);
  const prevPhoto = () => setPhotoIndex((p) => (p - 1 + allPhotos.length) % allPhotos.length);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  };

  const formatCurrency = (paise: number) => {
    return (paise / 100).toLocaleString('en-IN');
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="h-[100dvh] w-full bg-bg flex flex-col items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
        </div>
        <p className="mt-6 text-sm font-bold text-muted animate-pulse">Loading partner profile...</p>
      </div>
    );
  }

  /* ── Error / Not found ── */
  if (error || !profile) {
    return (
      <div className="h-[100dvh] w-full bg-bg flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="w-24 h-24 rounded-[2rem] bg-failed-bg flex items-center justify-center shadow-sm">
          <AlertCircle size={40} className="text-failed-text" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-textMain mb-2">Profile Unavailable</h2>
          <p className="text-sm font-medium text-muted max-w-sm">{error || 'This companion profile could not be found or has been removed.'}</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="px-8 py-4 bg-primary text-white font-black rounded-2xl active:scale-95 transition-transform shadow-lg shadow-primary/30"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    // FIX: Added `h-[100dvh] w-full overflow-y-auto scrollbar-hide` to enable native scrolling
    <div className="h-[100dvh] w-full overflow-y-auto scrollbar-hide bg-bg relative pb-24 md:pb-12">
      
      {/* ── Desktop/Tablet Grid Architecture ── */}
      <div className="max-w-7xl mx-auto md:px-6 lg:px-8 md:py-8 flex flex-col md:flex-row gap-6 lg:gap-10">
        
        {/* ── LEFT SIDEBAR (Sticky on Desktop, Hero on Mobile) ── */}
        <aside className="w-full md:w-[360px] lg:w-[420px] shrink-0 relative">
          <div className="md:sticky md:top-8 space-y-5 md:space-y-6">
            
            {/* Photo Gallery & Hero */}
            <div className="relative h-[55vh] md:h-auto md:aspect-[4/5] md:rounded-[2.5rem] overflow-hidden bg-slate-900 shadow-md group">
              <img
                src={allPhotos[photoIndex]}
                alt={profile.displayName}
                className="w-full h-full object-cover transition-transform duration-700 ease-out md:group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-black/20 to-black/40 md:to-transparent" />

              {/* Mobile Back Button */}
              <button
                onClick={() => navigate(-1)}
                className="absolute top-safe-4 left-4 md:hidden z-20 p-2.5 bg-black/40 backdrop-blur-md text-white rounded-full active:scale-90 transition-transform"
              >
                <ChevronLeft size={22} />
              </button>

              {/* Photo Nav */}
              {allPhotos.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 bg-black/40 backdrop-blur-md text-white rounded-full active:scale-90 transition-transform opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  >
                    <PhotoLeft size={18} />
                  </button>
                  <button
                    onClick={nextPhoto}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 bg-black/40 backdrop-blur-md text-white rounded-full active:scale-90 transition-transform opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  >
                    <ChevronRight size={18} />
                  </button>
                  {/* Dots */}
                  <div className="absolute bottom-24 md:bottom-32 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {allPhotos.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPhotoIndex(i)}
                        className={`rounded-full transition-all duration-300 ${i === photoIndex ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/50'}`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Badges & Name */}
              <div className="absolute bottom-6 left-6 right-6 text-white z-10">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {profile.kycVerified && (
                    <span className="flex items-center gap-1 bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border border-white/20 shadow-sm">
                      <ShieldCheck size={14} /> Verified
                    </span>
                  )}
                  {profile.isAvailableNow && (
                    <span className="flex items-center gap-1.5 bg-success-text/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      Available Now
                    </span>
                  )}
                </div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight drop-shadow-lg mb-1">{profile.displayName}</h1>
                
                {profile.ratingAvg !== undefined && profile.ratingAvg > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 bg-black/40 backdrop-blur-sm w-fit px-3 py-1.5 rounded-xl border border-white/10">
                    <Star size={14} className="text-amber-400 fill-amber-400" />
                    <span className="text-sm font-bold">{profile.ratingAvg.toFixed(1)}</span>
                    {profile.ratingCount !== undefined && (
                      <span className="text-xs font-medium text-white/70">({profile.ratingCount})</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Summary Card (Desktop & Mobile) */}
            <div className="px-4 md:px-0">
              <div className="bg-surface border border-borderLight rounded-[2rem] p-6 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Hourly Rate</p>
                  <p className="text-3xl font-black text-primary">₹{formatCurrency(profile.hourlyRatePaise)}</p>
                </div>
                <div className="w-px h-12 bg-borderLight"></div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Open Slots</p>
                  <p className="text-3xl font-black text-textMain">{profile.openListings?.length ?? 0}</p>
                </div>
              </div>
            </div>

            {/* Quick Tags */}
            <div className="px-4 md:px-0 flex flex-wrap gap-2">
              {profile.occupation && (
                <span className="flex items-center gap-1.5 bg-surface border border-borderLight text-xs font-bold text-textMain px-4 py-2 rounded-xl shadow-sm">
                  <Briefcase size={14} className="text-primary" /> {profile.occupation}
                </span>
              )}
              {profile.languages?.map((lang) => (
                <span key={lang} className="flex items-center gap-1.5 bg-surface border border-borderLight text-xs font-bold text-textMain px-4 py-2 rounded-xl shadow-sm">
                  <Globe size={14} className="text-primary" /> {lang}
                </span>
              ))}
            </div>

          </div>
        </aside>

        {/* ── RIGHT CONTENT (Scrollable naturally within the parent) ── */}
        <main className="flex-1 min-w-0 px-4 md:px-0 space-y-6 md:space-y-8">
          
          {/* Bio */}
          {profile.bio && (
            <section className="bg-surface border border-borderLight rounded-[2rem] p-6 md:p-8 shadow-sm">
              <h2 className="text-lg font-black text-textMain flex items-center gap-2 mb-4">
                <Sparkles size={20} className="text-primary" /> About Me
              </h2>
              <p className="text-sm md:text-base font-medium text-muted leading-relaxed whitespace-pre-wrap">
                {profile.bio}
              </p>
            </section>
          )}

          {/* Interests & Hobbies */}
          {((profile.interests && profile.interests.length > 0) || (profile.hobbies && profile.hobbies.length > 0)) && (
            <section className="bg-surface border border-borderLight rounded-[2rem] p-6 md:p-8 shadow-sm">
              <h2 className="text-lg font-black text-textMain flex items-center gap-2 mb-5">
                <Heart size={20} className="text-primary" /> Interests & Vibe
              </h2>
              <div className="flex flex-wrap gap-2.5">
                {[...(profile.interests || []), ...(profile.hobbies || [])].map((item) => (
                  <span key={item} className="bg-primary/5 text-primary text-sm font-bold px-4 py-2 rounded-xl border border-primary/20">
                    {item}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Open Listings / Slots */}
          <section id="listings" className="pt-2">
            <h2 className="text-2xl font-black text-textMain flex items-center gap-2 mb-6">
              <Calendar size={24} className="text-primary" /> Available Slots
            </h2>
            
            {profile.openListings && profile.openListings.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {profile.openListings.map((listing) => (
                  <div
                    key={listing._id}
                    onClick={() => navigate(`/s/listings/${listing._id}`)}
                    className="bg-surface border border-borderLight rounded-3xl p-5 hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] transition-all cursor-pointer flex flex-col relative group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 pr-4">
                        <p className="font-black text-lg text-textMain line-clamp-1 mb-1">{listing.title || 'Experience Booking'}</p>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-muted">
                          <MapPin size={14} className="text-primary" /> {listing.city}{listing.area ? `, ${listing.area}` : ''}
                        </div>
                      </div>
                      <div className="text-right shrink-0 bg-bg px-3 py-2 rounded-xl border border-borderLight/50">
                        <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">Price</p>
                        <p className="font-black text-primary text-xl">₹{formatCurrency(listing.basePricePaise)}</p>
                      </div>
                    </div>

                    <div className="mt-auto flex flex-wrap gap-2">
                      <span className="flex items-center gap-1.5 bg-bg border border-borderLight text-xs font-bold text-textMain px-3 py-2 rounded-xl">
                        <Calendar size={14} className="text-primary" /> {formatDate(listing.startAt)}
                      </span>
                      <span className="flex items-center gap-1.5 bg-bg border border-borderLight text-xs font-bold text-textMain px-3 py-2 rounded-xl">
                        <Clock size={14} className="text-primary" /> {formatDuration(listing.durationMins)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-surface border border-dashed border-borderLight rounded-[2rem] p-10 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-bg rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <Calendar size={28} className="text-muted" />
                </div>
                <p className="text-lg font-black text-textMain mb-1">No Open Slots</p>
                <p className="text-sm font-medium text-muted">This companion hasn't posted any upcoming availability right now.</p>
              </div>
            )}
          </section>

          {/* Reviews */}
          {profile.recentReviews && profile.recentReviews.length > 0 && (
            <section className="pt-2">
              <h2 className="text-2xl font-black text-textMain flex items-center gap-2 mb-6">
                <MessageSquare size={24} className="text-primary" /> Recent Reviews
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile.recentReviews.map((rev, i) => (
                  <div key={i} className="bg-surface border border-borderLight rounded-[2rem] p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
                        <Star size={14} className="text-amber-400 fill-amber-400" />
                        <span className="text-sm font-black text-amber-900">{rev.rating.toFixed(1)}</span>
                      </div>
                      <span className="text-xs font-bold text-muted">
                        {new Date(rev.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {rev.comment && (
                      <p className="text-sm font-medium text-textMain leading-relaxed line-clamp-4">"{rev.comment}"</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

        </main>
      </div>

      {/* ── Mobile Sticky CTA (Hidden on Desktop) ── */}
      {profile.openListings && profile.openListings.length > 0 && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-xl border-t border-borderLight p-4 pb-safe animate-in slide-in-from-bottom-4">
          <button
            onClick={() => {
              document.getElementById('listings')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full h-14 bg-primary text-white font-black text-base rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
          >
            View Available Slots <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};