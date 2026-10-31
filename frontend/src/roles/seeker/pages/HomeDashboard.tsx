import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, HeartHandshake, Headphones, Lock, MapPin, 
  Calendar, ChevronRight, Search, Sparkles, 
  ArrowRight, Wallet
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext.js';
import { api } from '../../../services/api.js';
import { walletApi } from '../../../services/wallet.js';
import { StageChip } from '../../../components/StageChip.js';
import { InstallButton } from '../../../components/InstallButton.js';
import { CategoryIcon } from '../../../components/CategoryIcon.js';

export const HomeDashboard: React.FC = () => {
  const { user, accessData } = useAuth();
  const navigate = useNavigate();
  
  const [categories, setCategories] = useState<any[]>([]);
  const [activeBookings, setActiveBookings] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState(user?.city || 'Mumbai');

  const isPartner = accessData?.roles?.includes('PARTNER');
  const cities = ['Mumbai', 'Delhi NCR', 'Bengaluru', 'Pune', 'Hyderabad', 'Kolkata'];

  // Time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, bookRes, balRes] = await Promise.all([
          api.get<any>('/categories').catch(() => ({ data: { data: [] } })),
          api.get<any>('/bookings').catch(() => ({ data: [] })),
          walletApi.getBalance().catch(() => 0)
        ]);

        setWalletBalance(balRes);

        // Process categories
        const catData = catRes.data?.data || catRes.data || [];
        const colors = ['#8B5CF6', '#3B82F6', '#F59E0B', '#EC4899', '#10B981', '#14B8A6'];
        
        if (Array.isArray(catData) && catData.length > 0) {
          const tags = ['Popular', 'Top Choice', 'Trending', 'Special', 'Chill', 'Active'];
          const mapped = catData.map((c: any, i: number) => ({
            ...c,
            icon: c.icon || '🏷️',
            color: c.accentColor || colors[i % colors.length],
            pricePaise: c.defaultRatePaise || 50000,
            tag: tags[i % tags.length]
          }));
          setCategories(mapped);
        } else {
          // Curated fallbacks so dashboard always looks rich
          setCategories([
            { _id: 'cat1', name: 'Coffee Date', slug: 'coffee', icon: '☕', color: '#8B5CF6', pricePaise: 49900, description: 'Casual café conversations, relaxed ambience and friendly chats.', tag: 'Popular' },
            { _id: 'cat2', name: 'Dinner & Dining', slug: 'dinner', icon: '🍽️', color: '#EC4899', pricePaise: 99900, description: 'Fine dining companion, food explorations, and social dinners.', tag: 'Top Choice' },
            { _id: 'cat3', name: 'City Tour', slug: 'city-tour', icon: '🏙️', color: '#3B82F6', pricePaise: 79900, description: 'Explore iconic spots, hidden gems, and cultural heritage together.', tag: 'Trending' },
            { _id: 'cat4', name: 'Event Companion', slug: 'event', icon: '🎉', color: '#F59E0B', pricePaise: 129900, description: 'Weddings, galas, art exhibitions, or company gatherings.', tag: 'Special' },
            { _id: 'cat5', name: 'Movies & Cinema', slug: 'movies', icon: '🍿', color: '#10B981', pricePaise: 59900, description: 'Catch the latest movie premiere with snacks and lively discussions.', tag: 'Chill' },
            { _id: 'cat6', name: 'Fitness Buddy', slug: 'fitness', icon: '🏃', color: '#14B8A6', pricePaise: 49900, description: 'Morning jogs, badminton sessions, gym workout motivation.', tag: 'Active' }
          ]);
        }

        // Process bookings
        const bookData = bookRes.data?.bookings || bookRes.data?.data || bookRes.data || [];
        if (Array.isArray(bookData)) {
          const active = bookData.filter((b: any) => 
            ['REQUESTED', 'ACCEPTED', 'PAYMENT_PENDING', 'CONFIRMED', 'PAID', 'IN_PROGRESS', 'AWAITING_OTP'].includes(b.status)
          );
          setActiveBookings(active);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      }
    };
    fetchData();
  }, []);

  // Filter Bookings for Action Required vs Upcoming
  const actionRequiredBookings = activeBookings.filter(b => b.status === 'ACCEPTED');
  const nextBookings = activeBookings.filter(b => ['CONFIRMED', 'PAID', 'IN_PROGRESS', 'AWAITING_OTP'].includes(b.status));

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.append('q', searchQuery.trim());
    if (selectedCity) params.append('city', selectedCity);
    navigate(`/s/discover?${params.toString()}`);
  };

  const formattedBalance = (walletBalance / 100).toLocaleString('en-IN', {
    maximumFractionDigits: 0
  });

  return (
    <div className="w-full min-h-screen bg-bg">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-8 space-y-6 md:space-y-8">
        
        {/* ── TOP HERO HEADER SECTION ── */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface rounded-3xl p-5 md:p-7 border border-borderLight shadow-xs">
          <div className="flex items-center gap-3.5 md:gap-5">
            <div className="w-13 h-13 md:w-16 md:h-16 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-black text-xl md:text-2xl shadow-md shadow-primary/25 shrink-0">
              {user?.fullName?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black tracking-wider uppercase text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                  {greeting}
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-muted">
                  <MapPin size={12} className="text-primary" /> {selectedCity}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-textMain tracking-tight mt-1 leading-tight">
                {user?.fullName || user?.email?.split('@')[0] || 'Friend'} 👋
              </h1>
              <p className="text-xs sm:text-sm font-medium text-muted mt-0.5 max-w-xl">
                Ready to find verified companions for dinner, coffee, events, or city adventures?
              </p>
            </div>
          </div>

          {/* Quick Stats Strip on Desktop */}
          <div className="flex items-center gap-2.5 sm:gap-3 self-stretch md:self-auto pt-2 md:pt-0 border-t md:border-t-0 border-borderLight/60">
            {/* Wallet Quick Widget */}
            <div 
              onClick={() => navigate('/s/wallet')}
              className="flex-1 md:flex-initial flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-bg hover:bg-borderLight/40 border border-borderLight cursor-pointer transition-all active:scale-95 group"
            >
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Wallet size={16} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Wallet</p>
                <p className="text-sm font-black text-textMain">₹{formattedBalance}</p>
              </div>
            </div>

            {/* Active Bookings Quick Pill */}
            <div 
              onClick={() => navigate('/s/booking')}
              className="flex-1 md:flex-initial flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-bg hover:bg-borderLight/40 border border-borderLight cursor-pointer transition-all active:scale-95 group"
            >
              <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                <Calendar size={16} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Bookings</p>
                <p className="text-sm font-black text-textMain">
                  {activeBookings.length} Active
                </p>
              </div>
            </div>

            <div className="hidden lg:block">
              <InstallButton variant="icon" />
            </div>
          </div>
        </section>

        {/* ── ACTION REQUIRED BOOKINGS (High Priority) ── */}
        {actionRequiredBookings.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
              <h2 className="text-sm font-black uppercase tracking-wider text-blue-900">
                Action Required ({actionRequiredBookings.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {actionRequiredBookings.map((b) => (
                <div 
                  key={b._id} 
                  onClick={() => navigate(`/s/booking/${b._id}`)}
                  className="bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200/80 rounded-2xl p-4 md:p-5 flex items-center justify-between shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-blue-500 text-white flex items-center justify-center font-bold text-lg shadow-sm shadow-blue-500/30 group-hover:scale-105 transition-transform">
                      {b.partnerId?.displayName?.charAt(0) || b.partnerId?.name?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full">
                          Accepted!
                        </span>
                      </div>
                      <p className="text-sm md:text-base font-black text-blue-950 mt-0.5 leading-tight">
                        {b.partnerId?.displayName || b.partnerId?.name || 'Companion'}
                      </p>
                      <p className="text-xs font-medium text-blue-700 mt-0.5">
                        Confirm & Pay now to lock date
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-white text-blue-600 px-3 py-1.5 rounded-xl font-black text-xs shadow-xs border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <span>Pay</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── SEARCH & SPOTLIGHT STRIP ── */}
        <section className="bg-surface border border-borderLight rounded-3xl p-4 md:p-6 shadow-xs">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search companions, coffee dates, dinner, city tours..."
                className="w-full bg-bg border border-borderLight rounded-2xl py-3 pl-11 pr-4 text-xs sm:text-sm font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted"
              />
            </div>

            {/* City Selector */}
            <div className="flex items-center gap-2">
              <div className="relative shrink-0 w-full md:w-44">
                <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" />
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full bg-bg border border-borderLight rounded-2xl py-3 pl-9 pr-8 text-xs sm:text-sm font-bold appearance-none outline-none focus:border-primary transition-all cursor-pointer"
                >
                  {cities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted text-xs">▼</div>
              </div>

              {/* Submit CTA Button */}
              <button
                type="submit"
                className="shrink-0 px-6 py-3 bg-gradient-to-r from-primary to-accent hover:from-primaryDark hover:to-primary text-white font-black text-xs sm:text-sm rounded-2xl shadow-md shadow-primary/25 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                <span>Find Dates</span>
              </button>
            </div>
          </form>

          {/* Quick Category Suggestions Chips */}
          <div className="flex items-center gap-2 mt-3.5 overflow-x-auto hide-scrollbar pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted shrink-0 mr-1">Trending:</span>
            {['Coffee Date', 'Dinner', 'City Tour', 'Events', 'Weekend Meet'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => navigate(`/s/discover?q=${encodeURIComponent(tag)}`)}
                className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold bg-bg hover:bg-primary/10 hover:text-primary border border-borderLight transition-all active:scale-95"
              >
                {tag}
              </button>
            ))}
          </div>
        </section>

        {/* ── HERO BANNER & NEXT BOOKING SECTION ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          
          {/* Main Hero Showcase Card */}
          <section className={`w-full bg-gradient-to-r from-primaryDark via-primary to-accent rounded-3xl p-6 md:p-8 lg:p-9 text-white relative overflow-hidden shadow-lg shadow-primary/15 flex flex-col justify-between ${nextBookings.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            <div className="relative z-10 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-black uppercase tracking-wider mb-3.5">
                <Sparkles size={13} className="text-accent animate-spin" />
                <span>Verified Social Companion Network</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black leading-tight tracking-tight">
                Your perfect companion <br className="hidden sm:block" />for every occasion.
              </h2>
              <p className="text-xs sm:text-sm text-white/90 font-medium mt-2.5 max-w-md leading-relaxed">
                Connect with verified companions in {selectedCity} for relaxed café chats, memorable dinners, events, and authentic local tours.
              </p>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center gap-2.5 mt-4 sm:mt-6">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold">
                  <ShieldCheck size={14} className="text-emerald-300" /> 100% ID Verified
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold">
                  <HeartHandshake size={14} className="text-pink-300" /> Safe Public Meets
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold">
                  <Lock size={14} className="text-amber-300" /> Escrow Payment
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => navigate('/s/discover')}
                  className="px-6 py-3 rounded-2xl bg-white text-primaryDark hover:bg-white/95 font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-2"
                >
                  <span>Explore Partners</span>
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => navigate('/help')}
                  className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 font-bold text-xs sm:text-sm active:scale-95 transition-all"
                >
                  Safety Guide
                </button>
              </div>
            </div>

            {/* Decorative Glow Elements */}
            <div className="absolute right-[-10%] top-[-20%] w-60 h-60 md:w-80 md:h-80 bg-accent/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute right-10 bottom-[-10%] w-40 h-40 bg-white/15 rounded-full blur-2xl pointer-events-none" />
          </section>

          {/* Upcoming Confirmed Booking Card (If exists) */}
          {nextBookings.length > 0 && (
            <section className="lg:col-span-1">
              {nextBookings.slice(0, 1).map((b) => (
                <div 
                  key={b._id}
                  onClick={() => navigate(`/s/booking/${b._id}`)}
                  className="h-full bg-[#151124] text-white rounded-3xl p-6 border border-white/10 shadow-lg relative overflow-hidden flex flex-col justify-between group cursor-pointer hover:border-primary/50 transition-all"
                >
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/25 rounded-full blur-3xl pointer-events-none" />

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-wider text-white/80">Upcoming Date</span>
                      </div>
                      <StageChip stage={b.status === 'CONFIRMED' ? 'PAID' : b.status as any} />
                    </div>

                    <div className="flex items-center gap-3.5 mb-5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center font-bold text-lg text-white shadow-md">
                        {b.partnerId?.displayName?.charAt(0) || b.partnerId?.name?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <h3 className="font-black text-lg text-white leading-tight">
                          {b.partnerId?.displayName || b.partnerId?.name || 'Companion'}
                        </h3>
                        <p className="text-xs text-white/70 font-medium mt-0.5">
                          {b.categoryId?.name || 'Social Experience'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                        <Calendar size={16} className="text-accent shrink-0" />
                        <span className="text-xs sm:text-sm font-bold text-white/90">
                          {new Date(b.startTime || b.startAt).toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' })} • {new Date(b.startTime || b.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                        <MapPin size={16} className="text-primary shrink-0" />
                        <span className="text-xs sm:text-sm font-bold text-white/90 truncate">
                          {b.location?.address || b.meetingPlace || b.city || 'Verified Public Venue'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/70">View Booking Details</span>
                    <ChevronRight size={18} className="text-accent group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </section>
          )}

        </div>

        {/* ── OUR CURATED EXPERIENCES (Services Grid) ── */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-wider mb-2">
                <Sparkles size={13} />
                <span>Handpicked Activities</span>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-textMain tracking-tight">
                Curated Experiences
              </h2>
              <p className="text-xs sm:text-sm font-medium text-muted mt-1 max-w-xl">
                Explore hand-picked platonic companion activities designed for memorable times in verified public venues.
              </p>
            </div>
            <button
              onClick={() => navigate('/s/discover')}
              className="text-xs sm:text-sm font-bold text-primary hover:text-primaryDark flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/15 transition-all self-start sm:self-auto active:scale-95 shrink-0"
            >
              <span>View All Experiences</span>
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {categories.map((service) => (
              <div 
                key={service._id}
                onClick={() => navigate(`/s/discover?categorySlug=${service.slug || 'all'}`)}
                className="group relative bg-surface border border-borderLight/90 rounded-3xl p-5 sm:p-6 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-xl hover:border-primary/40 hover:-translate-y-1.5 active:scale-[0.99] transition-all duration-300 cursor-pointer min-h-[240px]"
              >
                {/* Accent ambient lighting glow in corner */}
                <div 
                  className="absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity duration-300"
                  style={{ backgroundColor: service.color }}
                />

                {/* Top: Icon + Badge */}
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xs border transition-transform duration-300 group-hover:scale-110 group-hover:rotate-2 shrink-0"
                      style={{ 
                        backgroundColor: `${service.color}15`,
                        borderColor: `${service.color}30`
                      }}
                    >
                      <CategoryIcon 
                        icon={service.icon} 
                        slug={service.slug} 
                        name={service.name} 
                        size={28} 
                        color={service.color} 
                      />
                    </div>

                    <span 
                      className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider"
                      style={{ 
                        backgroundColor: `${service.color}15`,
                        color: service.color,
                        border: `1px solid ${service.color}30`
                      }}
                    >
                      {service.tag || 'Popular'}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-black text-textMain text-lg sm:text-xl tracking-tight leading-tight group-hover:text-primary transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted font-medium mt-1.5 line-clamp-2 leading-relaxed">
                    {service.description || 'Verified companions available for this experience.'}
                  </p>

                  {/* Micro-Features */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-3.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-bg text-[10px] sm:text-[11px] font-bold text-muted border border-borderLight/70">
                      🛡️ 100% Platonic
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-bg text-[10px] sm:text-[11px] font-bold text-muted border border-borderLight/70">
                      📍 Public Venues
                    </span>
                  </div>
                </div>

                {/* Bottom: Price & Explore CTA */}
                <div className="mt-5 pt-4 border-t border-borderLight/60 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                      Starting from
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-base sm:text-lg font-black text-textMain">
                        ₹{((service.pricePaise || 50000) / 100).toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs font-semibold text-muted">/hr</span>
                    </div>
                  </div>

                  <div className="px-3.5 py-2 rounded-xl bg-bg text-textMain font-bold text-xs sm:text-sm border border-borderLight group-hover:bg-primary group-hover:text-white group-hover:border-primary group-hover:shadow-md group-hover:shadow-primary/25 transition-all flex items-center gap-1.5">
                    <span>Explore</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS WALKTHROUGH ── */}
        <section className="bg-surface border border-borderLight rounded-3xl p-6 md:p-8 shadow-xs">
          <div className="max-w-2xl mx-auto text-center mb-6 md:mb-8">
            <span className="text-xs font-black text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full">
              Seamless & Transparent
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-textMain mt-2 tracking-tight">
              How Date To Go Works
            </h2>
            <p className="text-xs sm:text-sm font-medium text-muted mt-1">
              Zero awkwardness, complete safety verification, and transparent hourly rates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-bg rounded-2xl p-5 border border-borderLight/80 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl mb-3">
                1
              </div>
              <h3 className="font-black text-base text-textMain">Browse & Choose</h3>
              <p className="text-xs sm:text-sm text-muted font-medium mt-1 leading-relaxed">
                Filter verified companions by city, language, and interests. Send an experience request.
              </p>
            </div>

            <div className="bg-bg rounded-2xl p-5 border border-borderLight/80 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center font-black text-xl mb-3">
                2
              </div>
              <h3 className="font-black text-base text-textMain">Meet at Public Spots</h3>
              <p className="text-xs sm:text-sm text-muted font-medium mt-1 leading-relaxed">
                Meet at reputable cafes, restaurants, or events with built-in safety guidelines.
              </p>
            </div>

            <div className="bg-bg rounded-2xl p-5 border border-borderLight/80 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black text-xl mb-3">
                3
              </div>
              <h3 className="font-black text-base text-textMain">Escrow Peace of Mind</h3>
              <p className="text-xs sm:text-sm text-muted font-medium mt-1 leading-relaxed">
                Payments are securely held in Razorpay escrow and only released after your meeting finishes.
              </p>
            </div>
          </div>
        </section>

        {/* ── SAFETY & TRUST GUARANTEES (4 Pillars) ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-primary" />
            <h2 className="text-lg sm:text-xl font-black text-textMain">Safety & Integrity</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
            {[
              { 
                icon: ShieldCheck, 
                title: 'Govt ID KYC', 
                sub: 'Every companion verified with govt ID & selfie check', 
                color: 'text-emerald-600', 
                bg: 'bg-emerald-50 border-emerald-100' 
              },
              { 
                icon: HeartHandshake, 
                title: 'Public Venues Only', 
                sub: 'All meetings occur exclusively in public establishments', 
                color: 'text-purple-600', 
                bg: 'bg-purple-50 border-purple-100' 
              },
              { 
                icon: Headphones, 
                title: '24/7 SOS Safety', 
                sub: 'Instant emergency assistance & live contact alert', 
                color: 'text-blue-600', 
                bg: 'bg-blue-50 border-blue-100' 
              },
              { 
                icon: Lock, 
                title: 'Escrow Protection', 
                sub: 'Zero advance risk. Funds protected by platform policy', 
                color: 'text-amber-600', 
                bg: 'bg-amber-50 border-amber-100' 
              },
            ].map((feat, i) => {
              const Icon = feat.icon;
              return (
                <div key={i} className={`p-4 sm:p-5 rounded-3xl border transition-all hover:shadow-md ${feat.bg}`}>
                  <div className={`w-11 h-11 rounded-2xl bg-white shadow-xs flex items-center justify-center ${feat.color} mb-3.5`}>
                    <Icon size={22} />
                  </div>
                  <h3 className="text-base font-black text-textMain leading-tight">{feat.title}</h3>
                  <p className="text-xs font-medium text-muted mt-1 leading-relaxed">{feat.sub}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── BECOME A PARTNER PROMOTIONAL BANNER ── */}
        {!isPartner && (
          <section className="pt-2">
            <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 border border-amber-200/80 rounded-3xl p-6 sm:p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-xs hover:shadow-md transition-shadow">
              <div className="absolute right-[-5%] top-[-10%] w-72 h-72 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 max-w-xl text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-700 rounded-full text-xs font-black uppercase tracking-wider mb-2.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Now Onboarding Companions</span>
                </div>
                <h3 className="font-black text-2xl sm:text-3xl text-amber-950 tracking-tight leading-tight">
                  Earn on your schedule as a Verified Companion
                </h3>
                <p className="text-xs sm:text-sm font-medium text-amber-800/90 mt-2 leading-relaxed">
                  Accompany seekers to coffee, dinners, city tours, and social functions. Choose your own rates, flexible hours, and complete safety protections.
                </p>
                <div className="flex items-center gap-4 mt-4 font-bold text-xs text-amber-900">
                  <span className="flex items-center gap-1">✨ Earn ₹1,500 - ₹5,000 / date</span>
                  <span className="flex items-center gap-1">🛡️ Full Escrow Security</span>
                </div>
              </div>

              <div className="relative z-10 shrink-0 self-stretch md:self-auto flex items-center justify-end">
                <button
                  onClick={() => navigate('/pricing?intent=become_partner')}
                  className="w-full md:w-auto px-8 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-amber-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span>Apply as Partner</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  );
};