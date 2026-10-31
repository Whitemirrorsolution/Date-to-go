import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../../../components/AppHeader.js';
import { Search, MapPin, Star, ShieldCheck, SlidersHorizontal, Heart, Briefcase } from 'lucide-react';
import { useFavoritesStore, type FavoriteItem } from '../store/useFavoritesStore.js';
import { FilterSheet } from '../components/FilterSheet.js';

export const BrowsePartnersPage: React.FC = () => {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const { favorites, addFavorite, removeFavorite, loadFavorites } = useFavoritesStore();

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // Mock partners data
  const partners = [
    { id: 'p1', name: 'Aisha', age: '24', rating: 4.9, reviews: 120, city: 'Mumbai', area: 'Bandra', rate: 1000, nextSlot: 'Today, 18:00', duration: '2 hrs', verified: true, avatar: 'A', occupation: 'Software Engineer', interests: ['Coffee', 'Movies'], languages: 'Hindi, English', match: 92 },
    { id: 'p2', name: 'Rahul', age: '27', rating: 4.8, reviews: 85, city: 'Mumbai', area: 'Andheri', rate: 1500, nextSlot: 'Tomorrow, 10:00', duration: '3 hrs', verified: true, avatar: 'R', occupation: 'Photographer', interests: ['Art', 'Travel'], languages: 'English', match: 85 },
    { id: 'p3', name: 'Priya', age: '22', rating: 5.0, reviews: 34, city: 'Delhi', area: 'South Ext', rate: 800, nextSlot: 'Today, 15:30', duration: '1 hr', verified: true, avatar: 'P', occupation: 'Student', interests: ['Reading', 'Music'], languages: 'Hindi', match: 78 },
  ];

  const filterChips = ['City: Mumbai', 'Under ₹1500/hr', 'Female', 'Available Today'];

  return (
    <div className="min-h-screen bg-bg pb-24">
      <AppHeader 
        title="Find a Partner" 
        rightAction={
          <button onClick={() => setShowFilters(true)} className="p-2 -mr-2 text-primary active:scale-95 transition-transform">
            <SlidersHorizontal size={24} />
          </button>
        }
      />

      <main className="px-5 pt-4 flex flex-col gap-5">
        
        {/* Search Bar */}
        <div className="relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input 
            type="text" 
            placeholder="Search by name or service..." 
            className="w-full bg-surface border border-borderLight rounded-pill py-3 pl-12 pr-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
          />
        </div>

        {/* Filter Chips (Horizontal Scroll) */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-5 px-5 snap-x">
          {filterChips.map((chip, idx) => (
            <div key={idx} className="snap-start whitespace-nowrap bg-primary/10 border border-primary/20 text-primary text-xs font-bold px-4 py-1.5 rounded-pill">
              {chip}
            </div>
          ))}
        </div>

        {/* Partner Cards */}
        <div className="flex flex-col gap-4 mt-2">
          {partners.map(partner => {
            const isFav = favorites.some((f: FavoriteItem) => f.partnerId === partner.id);
            return (
              <div key={partner.id} className="relative group">
                <div 
                  onClick={() => navigate(`/partner/${partner.id}`)}
                  className="card !p-0 overflow-hidden flex text-left active:scale-[0.98] transition-transform w-full cursor-pointer"
                >
                  <div className="w-[100px] bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-3xl font-bold shrink-0 relative">
                    {partner.avatar}
                    {partner.verified && (
                      <div className="absolute top-2 right-2 bg-white text-primary p-0.5 rounded-full shadow-sm">
                        <ShieldCheck size={14} />
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-1 pr-6">
                        <h3 className="font-bold text-lg text-textMain">{partner.name}, {partner.age}</h3>
                        <div className="flex items-center gap-1 bg-gradient-to-r from-primary to-accent text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                          {partner.match}% Match
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted mb-2">
                        <MapPin size={12} /> {partner.city}, {partner.area}
                      </div>
                      
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted mb-3">
                        <span className="flex items-center gap-1"><Briefcase size={10} /> {partner.occupation}</span>
                        <span className="flex items-center gap-1"><Heart size={10} /> {partner.interests.join(', ')}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-1 text-yellow-500 text-xs font-bold">
                          <Star size={12} fill="currentColor" /> {partner.rating} <span className="text-muted font-normal">({partner.reviews})</span>
                        </div>
                        <span className="text-muted text-[10px] bg-bg px-2 py-0.5 rounded">{partner.languages}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-end border-t border-borderLight pt-3 mt-1">
                      <div>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-wider mb-0.5">Rate</p>
                        <p className="font-bold text-primary text-base">₹{partner.rate}<span className="text-xs text-muted font-medium">/hr</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted font-bold uppercase tracking-wider mb-0.5">Next Slot</p>
                        <p className="text-xs font-bold text-textMain">{partner.nextSlot} <span className="text-muted font-normal ml-0.5">({partner.duration})</span></p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Heart Toggle Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isFav) {
                      removeFavorite(partner.id);
                    } else {
                      addFavorite(partner.id);
                    }
                  }}
                  className="absolute top-3 right-3 p-2 bg-surface/90 hover:bg-surface rounded-full shadow-sm hover:shadow active:scale-90 transition-all z-10"
                  aria-label={isFav ? 'Remove favorite' : 'Add favorite'}
                >
                  <Heart size={18} className={isFav ? 'text-red-500 fill-red-500' : 'text-muted hover:text-primary'} />
                </button>
              </div>
            );
          })}
        </div>
      </main>

      <FilterSheet 
        isOpen={showFilters} 
        onClose={() => setShowFilters(false)} 
        onApply={(f) => console.log('Applied', f)} 
      />
    </div>
  );
};
