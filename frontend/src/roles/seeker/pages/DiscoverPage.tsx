import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api.js';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Search, MapPin, Calendar, Star, ShieldCheck, 
  SlidersHorizontal, X, ChevronLeft, Sparkles 
} from 'lucide-react';
import { CategoryIcon } from '../../../components/CategoryIcon.js';

interface ListingItem {
  _id: string;
  title: string;
  description: string;
  startAt: string;
  durationMins: number;
  city: string;
  area: string;
  venueType: string;
  venueName: string;
  basePricePaise: number;
  profile: {
    displayName: string;
    primaryPhoto: string;
    ratingAverage: number;
    totalReviews: number;
  };
  partnerUser: {
    gender: string;
  };
}

interface CategoryItem {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
}

export const DiscoverPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialSlug = searchParams.get('categorySlug') || 'all';

  // State
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Mobile Filter Drawer State
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Filters State
  const [city, setCity] = useState('');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState(initialSlug);
  const [maxBudget, setMaxBudget] = useState<number>(5000);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    searchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategorySlug]);

  const fetchCategories = async () => {
    try {
      const res = await api.get<any>('/categories'); 
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data) && data.length > 0) {
        setCategories(data);
      } else {
        throw new Error("No data");
      }
    } catch {
      // Fallback if API fails
      setCategories([
        { _id: 'c1', name: 'Coffee Date', slug: 'coffee', icon: '☕' },
        { _id: 'c2', name: 'City Tour', slug: 'city-tour', icon: '🏙️' },
        { _id: 'c3', name: 'Dinner', slug: 'dinner', icon: '🍽️' },
        { _id: 'c4', name: 'Event Companion', slug: 'event', icon: '🎉' },
        { _id: 'c5', name: 'Movies', slug: 'movies', icon: '🍿' },
      ]);
    }
  };

  const searchListings = async () => {
    setLoading(true);
    setShowMobileFilters(false); // Close drawer if open on mobile
    
    try {
      const params = new URLSearchParams();
      if (city) params.append('city', city);
      if (maxBudget) params.append('maxPrice', String(maxBudget * 100));

      const endpoint = (!selectedCategorySlug || selectedCategorySlug === 'all')
        ? `/discover/categories/all/listings`
        : `/discover/categories/${selectedCategorySlug}/listings`;

      const res = await api.get<any>(`${endpoint}?${params.toString()}`);
      const rawData = res.data?.data || res.data || [];
      
      if (Array.isArray(rawData)) {
        setListings(rawData);
      } else {
        setListings([]);
      }
    } catch (err) {
      console.error('Discovery error:', err);
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (slug: string) => {
    setSelectedCategorySlug(slug);
    // Silent URL update without full page reload
    const newUrl = slug === 'all' ? '/s/discover' : `/s/discover?categorySlug=${slug}`;
    window.history.replaceState({}, '', newUrl);
  };

  const formatCurrency = (paise: number) => {
    return (paise / 100).toLocaleString('en-IN');
  };

  const formatDateTime = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // --- Filter Controls Component (Used in Desktop Sidebar & Mobile Drawer) ---
  const FilterControls = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Location (City)</label>
        <div className="relative">
          <input
            type="text"
            placeholder="e.g. Mumbai, Bengaluru"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full h-14 pl-11 pr-4 rounded-2xl bg-bg border border-borderLight focus:border-primary outline-none font-bold text-textMain placeholder:font-medium placeholder:text-muted/50 transition-colors shadow-sm"
          />
          <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <label className="block text-xs font-bold text-muted uppercase tracking-wider">Max Hourly Rate</label>
          <span className="text-sm font-black text-primary bg-primary/10 px-3 py-1 rounded-full">₹{maxBudget}</span>
        </div>
        <input
          type="range"
          min="500"
          max="10000"
          step="500"
          value={maxBudget}
          onChange={(e) => setMaxBudget(Number(e.target.value))}
          className="w-full h-2.5 bg-borderLight rounded-full appearance-none cursor-pointer accent-primary"
        />
        <div className="flex justify-between text-[10px] font-bold text-muted mt-2">
          <span>₹500</span>
          <span>₹10,000+</span>
        </div>
      </div>

      <button
        onClick={searchListings}
        className="w-full h-14 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/25 active:scale-95 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 mt-4"
      >
        <Search size={18} /> Apply Filters
      </button>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-bg flex flex-col w-full relative">
      
      {/* 1. Main Header (Sticky) */}
      <header className="sticky top-0 z-40 bg-bg/95 backdrop-blur-xl transition-all">
        <div className="h-16 md:h-20 px-4 md:px-8 max-w-7xl mx-auto flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface border border-borderLight active:scale-95 transition-transform md:hidden">
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-xl md:text-3xl font-black tracking-tight flex items-center gap-2 text-textMain">
              Discover <Sparkles size={22} className="text-primary" />
            </h1>
          </div>
          
          {/* Mobile Filter Toggle */}
          <button 
            onClick={() => setShowMobileFilters(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-surface border border-borderLight active:scale-95 transition-transform md:hidden shadow-sm"
          >
            <SlidersHorizontal size={18} className="text-textMain" />
          </button>
        </div>

        {/* 2. Scrollable Category Pills (Sticky below Header) */}
  <div className="sticky top-16 md:top-20 z-30 border-y border-borderLight/40 bg-surface/50 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2.5 min-w-max">
              <button
                onClick={() => handleCategorySelect('all')}
                className={`h-11 px-6 rounded-full text-sm font-bold transition-all active:scale-95 ${
                  selectedCategorySlug === 'all' 
                    ? 'bg-primary text-white shadow-md shadow-primary/30' 
                    : 'bg-bg border border-borderLight text-muted hover:border-primary/50 hover:bg-surface'
                }`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c._id}
                  onClick={() => handleCategorySelect(c.slug)}
                  className={`h-11 px-5 rounded-full text-sm font-bold transition-all active:scale-95 flex items-center gap-2 ${
                    selectedCategorySlug === c.slug 
                      ? 'bg-primary text-white shadow-md shadow-primary/30' 
                      : 'bg-bg border border-borderLight text-textMain hover:border-primary/50 hover:bg-surface'
                  }`}
                >
                  <CategoryIcon icon={c.icon} slug={c.slug} name={c.name} size={16} /> <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* 3. Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col md:flex-row gap-8">
        
        {/* Desktop Sidebar Filters */}
        <aside className="hidden md:block w-[280px] lg:w-[320px] shrink-0">
          <div className="sticky top-[160px] bg-surface border border-borderLight rounded-[2rem] p-6 shadow-sm">
            <h2 className="text-lg font-black mb-6 flex items-center gap-2 text-textMain">
              <SlidersHorizontal size={20} className="text-primary" /> Refine Search
            </h2>
            <FilterControls />
          </div>
        </aside>

        {/* Listings Grid Area */}
        <div className="flex-1 pb-24 md:pb-8">
          
          <div className="flex justify-between items-end mb-6 md:mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-black mb-1 md:mb-2 text-textMain">Available Partners</h2>
              <p className="text-xs md:text-sm font-bold text-muted flex items-center gap-1.5 bg-success-text/10 w-fit px-3 py-1.5 rounded-lg text-success-text">
                <ShieldCheck size={16} /> 100% KYC Verified • Public Venues Only
              </p>
            </div>
          </div>

          {loading ? (
            /* Skeleton Loading Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5 md:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-surface rounded-[2rem] border border-borderLight overflow-hidden shadow-sm">
                  <div className="aspect-[4/5] bg-borderLight/30 animate-pulse"></div>
                  <div className="p-5 space-y-4">
                    <div className="h-6 bg-borderLight/50 rounded-full w-2/3 animate-pulse"></div>
                    <div className="h-4 bg-borderLight/50 rounded-full w-1/3 animate-pulse"></div>
                    <div className="h-12 bg-borderLight/50 rounded-xl w-full mt-4 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            /* Empty State */
            <div className="bg-surface border border-dashed border-borderLight rounded-[2rem] p-10 md:p-16 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-bg rounded-full flex items-center justify-center text-5xl mb-6 shadow-sm">🕵️</div>
              <h3 className="text-2xl font-black text-textMain mb-2">No listings found</h3>
              <p className="text-muted font-medium max-w-md text-sm md:text-base mb-8">Try adjusting your filters, changing the city, or increasing your budget to see more amazing partners.</p>
              <button 
                onClick={() => { setCity(''); setMaxBudget(5000); handleCategorySelect('all'); searchListings(); }} 
                className="px-8 py-4 bg-primary text-white rounded-full font-bold active:scale-95 transition-transform shadow-lg shadow-primary/25"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            /* Listings Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5 md:gap-6">
              {listings.map((c) => (
                <div
                  key={c._id}
                  onClick={() => navigate(`/s/listings/${c._id}`)}
                  className="bg-surface rounded-[2rem] border border-borderLight overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex flex-col relative"
                >
                  {/* Image & Badges Overlay */}
                  <div className="relative aspect-[4/5] overflow-hidden bg-bg">
                    <img
                      src={c.profile.primaryPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
                      alt={c.profile.displayName}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-[#111]/20 to-transparent"></div>

                    <div className="absolute top-4 left-4 flex gap-2 z-10">
                      <span className="bg-white/90 backdrop-blur-md text-success-text px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                        <ShieldCheck size={14} strokeWidth={3} /> Verified
                      </span>
                    </div>

                    <div className="absolute bottom-4 left-4 right-4 z-10 flex justify-between items-end">
                      <div className="flex-1 pr-2">
                        <h3 className="font-black text-white text-2xl md:text-3xl drop-shadow-md line-clamp-1 mb-1">{c.title || c.profile.displayName}</h3>
                        <p className="text-white/90 text-xs md:text-sm font-bold drop-shadow-sm flex items-center gap-1.5">
                          <MapPin size={14} className="text-primary-300" /> {c.area}, {c.city}
                        </p>
                      </div>
                      <div className="bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 shadow-sm border border-white/10 shrink-0 mb-1">
                        <Star size={14} className="text-amber-400 fill-amber-400" /> 
                        {c.profile.ratingAverage?.toFixed(1) || '5.0'}
                      </div>
                    </div>
                  </div>

                  {/* Card Content Footer */}
                  <div className="p-5 md:p-6 flex flex-col flex-1 bg-surface">
                    <p className="text-sm font-medium text-muted line-clamp-2 mb-5 leading-relaxed">
                      {c.description || 'Join me for an amazing experience. Fully professional and verified companion.'}
                    </p>
                    
                    <div className="mt-auto space-y-4">
                      <div className="flex items-center justify-between text-[11px] md:text-xs font-bold text-muted bg-bg px-4 py-3 rounded-xl border border-borderLight/50">
                        <div className="flex items-center gap-2 truncate">
                          <Calendar size={16} className="text-primary shrink-0" />
                          <span className="truncate">{formatDateTime(c.startAt)}</span>
                        </div>
                        <div className="shrink-0 bg-primary/10 text-primary px-2 py-1 rounded-md">
                          {c.durationMins}m
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2">
                        <div>
                          <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">Rate</p>
                          <span className="font-black text-primary text-2xl">₹{formatCurrency(c.basePricePaise)}</span>
                        </div>
                        <button className="h-12 px-6 bg-textMain text-bg font-black rounded-xl active:scale-95 transition-transform shadow-md hover:opacity-90">
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 4. Mobile Filters Bottom Sheet (PWA) */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 md:hidden flex items-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full rounded-t-[2rem] p-6 pb-safe shadow-2xl animate-in slide-in-from-bottom-8">
            <div className="w-12 h-1.5 bg-borderLight rounded-full mx-auto mb-6"></div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-textMain">Refine Search</h2>
              <button 
                onClick={() => setShowMobileFilters(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-bg border border-borderLight active:scale-95 transition-transform"
              >
                <X size={20} className="text-textMain" />
              </button>
            </div>
            
            <FilterControls />
          </div>
        </div>
      )}

    </div>
  );
};