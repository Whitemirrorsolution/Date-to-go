import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../services/api.js';
import { AppHeader } from '../../../components/AppHeader.js';
import { 
  ShieldCheck, MapPin, Star, Edit3, 
  Briefcase, Globe, Heart, 
  Camera, ShieldAlert, Award
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext.js';

export const PartnerProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get<any>('/partner/profile');
        if (res.success && res.data) {
          setPartner(res.data);
        } else if (res.data) {
          setPartner(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="h-[100dvh] bg-bg flex flex-col items-center justify-center text-textMain">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full" />
        </div>
        <p className="mt-4 text-sm font-bold text-muted animate-pulse">Loading Profile...</p>
      </div>
    );
  }

  const displayName = partner?.displayName || user?.fullName || 'Partner';
  const displayAge = partner?.dob ? (new Date().getFullYear() - new Date(partner.dob).getFullYear()) : null;
  const displayCity = partner?.city || 'City not set';
  const primaryPhoto = partner?.primaryPhoto || null;
  const photos: string[] = partner?.photos || [];
  const categories: any[] = partner?.categories || [];
  const interests: string[] = partner?.interests || [];
  const hobbies: string[] = partner?.hobbies || [];
  const languages: string[] = partner?.languages || [];

  return (
    <div className="h-[100dvh] overflow-hidden w-full flex flex-col bg-bg text-textMain">
      <AppHeader 
        title="Partner Profile"
        isPartnerMode={true}
      />

      <main className="flex-1 overflow-y-auto px-4 md:px-8 pt-6 pb-36 scrollbar-hide max-w-5xl mx-auto w-full space-y-6">
        
        {/* TOP SUMMARY HERO */}
        <section className="bg-surface rounded-3xl p-6 md:p-8 shadow-sm border border-borderLight relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
            {/* Avatar */}
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white text-5xl font-black shadow-xl shadow-primary/20 overflow-hidden ring-4 ring-bg shrink-0">
              {primaryPhoto ? (
                <img src={primaryPhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 mb-2">
                <h2 className="text-2xl md:text-3xl font-black text-textMain tracking-tight">
                  {displayName}
                  {displayAge && <span className="font-semibold text-muted text-xl md:text-2xl">, {displayAge}</span>}
                </h2>
                {user?.kycStatus === 'VERIFIED' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-bold">
                    <ShieldCheck size={14} /> Verified Partner
                  </span>
                ) : (
                  <button
                    onClick={() => navigate('/p/kyc')}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs font-bold hover:bg-amber-500/20 active:scale-95 transition-all"
                  >
                    <ShieldAlert size={14} /> Verify KYC
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-semibold text-muted mb-4">
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-primary" /> {displayCity}
                </span>
                {partner?.occupation && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase size={14} className="text-primary" /> {partner.occupation}
                  </span>
                )}
                {languages.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Globe size={14} className="text-primary" /> {languages.slice(0, 3).join(', ')}
                  </span>
                )}
              </div>

              {/* Stats Pills */}
              <div className="grid grid-cols-3 gap-2 md:max-w-md">
                <div className="bg-bg rounded-2xl p-3 text-center border border-borderLight/60">
                  <p className="text-[10px] text-muted font-bold uppercase tracking-wider mb-0.5">Rating</p>
                  <p className="text-base md:text-lg font-black flex items-center justify-center gap-1 text-textMain">
                    <Star size={16} className="text-yellow-500" fill="currentColor" /> {partner?.averageRating || 'New'}
                  </p>
                </div>
                <div className="bg-bg rounded-2xl p-3 text-center border border-borderLight/60">
                  <p className="text-[10px] text-muted font-bold uppercase tracking-wider mb-0.5">Reviews</p>
                  <p className="text-base md:text-lg font-black text-textMain">{partner?.totalReviews || 0}</p>
                </div>
                <div className="bg-bg rounded-2xl p-3 text-center border border-borderLight/60">
                  <p className="text-[10px] text-muted font-bold uppercase tracking-wider mb-0.5">Services</p>
                  <p className="text-base md:text-lg font-black text-primary">{categories.length}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PHOTO GALLERY (IF PHOTOS EXIST) */}
        {photos.length > 0 && (
          <section className="bg-surface rounded-3xl p-6 shadow-sm border border-borderLight">
            <h3 className="font-black text-lg md:text-xl mb-4 text-textMain flex items-center gap-2">
              <Camera size={20} className="text-primary" /> Photos ({photos.length})
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {photos.map((url, idx) => (
                <div key={idx} className="aspect-square rounded-2xl overflow-hidden border border-borderLight bg-bg shadow-sm">
                  <img src={url} alt={`Partner photo ${idx + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* BIO SECTION */}
        <section className="bg-surface rounded-3xl p-6 shadow-sm border border-borderLight">
          <h3 className="font-black text-lg md:text-xl mb-3 text-textMain">About Me</h3>
          <p className="text-sm md:text-base text-muted leading-relaxed font-medium whitespace-pre-wrap">
            {partner?.bio || 'You have not added a bio yet. Click Edit Profile below to introduce yourself to seekers!'}
          </p>
        </section>

        {/* SERVICES OFFERED */}
        <section className="bg-surface rounded-3xl p-6 shadow-sm border border-borderLight">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-black text-lg md:text-xl text-textMain flex items-center gap-2">
              <Award size={20} className="text-primary" /> Services Offered
            </h3>
            <button
              onClick={() => navigate('/p/onboarding')}
              className="text-xs font-bold text-primary hover:underline"
            >
              Manage Rates
            </button>
          </div>

          {categories.length === 0 ? (
            <div className="bg-bg border border-dashed border-borderLight rounded-2xl p-8 text-center">
              <p className="text-sm font-semibold text-muted">No services added yet.</p>
              <button 
                onClick={() => navigate('/p/onboarding')}
                className="mt-3 text-xs font-bold text-primary"
              >
                + Add Services Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {categories.map((srv: any, idx: number) => (
                <div key={idx} className="border border-borderLight bg-bg rounded-2xl p-4 flex flex-col justify-between hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="text-2xl">{srv.categoryId?.icon || '✨'}</span>
                    <h4 className="font-black text-sm leading-tight text-textMain">
                      {srv.categoryId?.name || 'Service'}
                    </h4>
                  </div>
                  <div className="border-t border-borderLight/60 pt-2.5 flex justify-between items-baseline">
                    <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Rate</span>
                    <span className="text-lg font-black text-primary">
                      ₹{((srv.hourlyRatePaise || 0) / 100).toLocaleString('en-IN')}<span className="text-xs text-muted font-bold">/hr</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* INTERESTS & LIFESTYLE */}
        {(interests.length > 0 || hobbies.length > 0 || partner?.smoke || partner?.drink) && (
          <section className="bg-surface rounded-3xl p-6 shadow-sm border border-borderLight space-y-5">
            <h3 className="font-black text-lg md:text-xl text-textMain flex items-center gap-2">
              <Heart size={20} className="text-primary" /> Interests & Lifestyle
            </h3>

            {interests.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Interests</p>
                <div className="flex flex-wrap gap-2">
                  {interests.map((item, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-bg border border-borderLight rounded-xl text-xs font-bold text-textMain">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {hobbies.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Hobbies</p>
                <div className="flex flex-wrap gap-2">
                  {hobbies.map((item, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-bold">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {partner?.smoke && partner.smoke !== 'PREFER_NOT_TO_SAY' && (
                <div className="bg-bg rounded-xl p-3 border border-borderLight/50">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">Smoking</p>
                  <p className="text-xs font-bold text-textMain capitalize">{partner.smoke.toLowerCase()}</p>
                </div>
              )}
              {partner?.drink && partner.drink !== 'PREFER_NOT_TO_SAY' && (
                <div className="bg-bg rounded-xl p-3 border border-borderLight/50">
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">Drinking</p>
                  <p className="text-xs font-bold text-textMain capitalize">{partner.drink.toLowerCase()}</p>
                </div>
              )}
            </div>
          </section>
        )}

      </main>

      {/* FIXED BOTTOM ACTION BAR */}
      <footer className="fixed bottom-0 left-0 w-full bg-surface/90 backdrop-blur-xl border-t border-borderLight/50 p-4 pb-safe z-40 flex justify-center">
        <div className="max-w-4xl w-full flex items-center gap-3">
          <button 
            onClick={() => navigate('/p/dashboard')}
            className="flex-1 h-14 bg-bg border border-borderLight text-textMain font-black text-sm rounded-2xl active:scale-95 transition-transform"
          >
            Dashboard
          </button>
          <button 
            onClick={() => navigate('/p/onboarding')}
            className="flex-1 h-14 flex items-center justify-center gap-2 rounded-2xl font-black text-sm bg-primary text-white shadow-lg shadow-primary/25 active:scale-95 transition-transform"
          >
            <Edit3 size={18} /> Edit Details
          </button>
        </div>
      </footer>
    </div>
  );
};
