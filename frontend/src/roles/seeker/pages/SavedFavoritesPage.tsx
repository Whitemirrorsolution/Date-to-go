import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ShieldCheck, ChevronLeft, Calendar, ArrowRight } from 'lucide-react';
import { useFavoritesStore, type FavoriteItem } from '../store/useFavoritesStore.js';

export const SavedFavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const { favorites, loading, loadFavorites, removeFavorite } = useFavoritesStore();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRemove = async (e: React.MouseEvent, partnerId: string) => {
    e.stopPropagation();
    const ok = await removeFavorite(partnerId);
    if (ok) {
      showToast('Removed from favorites');
    }
  };

  return (
    <div className="w-full min-h-screen bg-bg pb-24">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-textMain text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg transition-all animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-20 bg-surface/80 backdrop-blur-md border-b border-borderLight px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 -ml-1 text-muted hover:text-textMain transition-colors"
            aria-label="Back"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-xl font-bold text-textMain tracking-tight">Saved Partners</h1>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-primary/10 text-primary rounded-full">
          {favorites.length} saved
        </span>
      </header>

      {/* Body */}
      <main className="max-w-5xl mx-auto px-5 pt-6">
        {loading && favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-9 h-9 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs font-medium text-muted">Loading your favorites...</p>
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-20 px-4 bg-surface border border-borderLight rounded-3xl mt-4 shadow-xs">
            <div className="w-16 h-16 mx-auto mb-4 bg-rose-50 rounded-2xl flex items-center justify-center text-primary">
              <Heart size={32} className="stroke-[1.5]" />
            </div>
            <h2 className="text-lg font-bold text-textMain mb-1">No saved partners yet</h2>
            <p className="text-xs text-muted max-w-sm mx-auto mb-6">
              When browsing partners or discovering companions, tap the heart button to save them here for quick booking.
            </p>
            <button
              onClick={() => navigate('/s/discover')}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-accent text-white font-bold text-xs px-6 py-3 rounded-pill shadow-md hover:shadow-lg active:scale-95 transition-all"
            >
              Discover Partners <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((fav: FavoriteItem) => (
              <div
                key={fav.partnerId}
                onClick={() => navigate(`/partner/${fav.partnerId}`)}
                className="group relative bg-surface border border-borderLight rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col"
              >
                {/* Photo / Avatar preview */}
                <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                  <img
                    src={fav.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop'}
                    alt={fav.name || 'Partner'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                  {/* Remove favorite button */}
                  <button
                    onClick={(e) => handleRemove(e, fav.partnerId)}
                    className="absolute top-3 right-3 p-2 bg-surface/90 hover:bg-surface text-red-500 rounded-full shadow-md active:scale-90 transition-transform"
                    aria-label="Remove from favorites"
                  >
                    <Heart size={16} fill="currentColor" />
                  </button>

                  {/* Partner Name overlay */}
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-base drop-shadow-sm">{fav.name || 'Verified Partner'}</span>
                      {fav.verified && (
                        <ShieldCheck size={16} className="text-emerald-400 drop-shadow-sm shrink-0" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Details */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  {fav.openListing ? (
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar size={13} className="text-primary" />
                        Next: {new Date(fav.openListing.startAt || '').toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </span>
                      {fav.openListing.basePricePaise && (
                        <span className="font-bold text-primary">
                          ₹{(fav.openListing.basePricePaise / 100).toFixed(0)}/hr
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted">No open slots currently posted</p>
                  )}

                  <button
                    onClick={() => navigate(`/partner/${fav.partnerId}`)}
                    className="w-full text-center py-2 px-3 bg-bg hover:bg-primary/5 text-primary text-xs font-bold rounded-xl border border-borderLight/60 transition-colors"
                  >
                    View Availability
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
