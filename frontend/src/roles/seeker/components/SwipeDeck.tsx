import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { api } from '../../../services/api.js';
import SendRequestModal from './SendRequestModal';
import SoftPaywallSheet from './SoftPaywallSheet';

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

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => Math.abs(offset) * velocity;

const SwipeDeck: React.FC = () => {
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<ListingItem | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const hasSubscription = false; // placeholder logic

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<any>('/discover/categories/all/listings');
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data)) setListings(data);
    } catch (e) {
      console.error('Failed to fetch listings', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const offsetX = info.offset.x;
    const velocityX = info.velocity.x;
    const swipe = swipePower(offsetX, velocityX);
    if (swipe < -swipeConfidenceThreshold) {
      setCurrent((prev) => (prev + 1) % listings.length);
    } else if (swipe > swipeConfidenceThreshold) {
      const listing = listings[current];
      setSelectedListing(listing);
      if (!hasSubscription) {
        setShowPaywall(true);
      } else {
        setShowRequestModal(true);
      }
    }
  };

  const closeModals = () => {
    setShowRequestModal(false);
    setShowPaywall(false);
    setSelectedListing(null);
    setCurrent((prev) => (prev + 1) % listings.length);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="animate-pulse text-xl font-bold">Loading matches…</div>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-black">No partners available</h2>
        <p className="mt-4 text-muted">Try adjusting your filters or come back later.</p>
      </div>
    );
  }

  const listing = listings[current];

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center">
      <AnimatePresence>
        <motion.div
          key={listing._id}
          className="absolute w-80 max-w-full h-auto bg-surface rounded-2xl shadow-xl overflow-hidden cursor-grab"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          whileTap={{ cursor: 'grabbing' }}
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <img
            src={listing.profile.primaryPhoto || '/placeholder.png'}
            alt={listing.title}
            className="w-full h-48 object-cover"
          />
          <div className="p-4">
            <h3 className="text-xl font-black mb-1">{listing.title || listing.profile.displayName}</h3>
            <p className="text-sm text-muted line-clamp-2 mb-2">{listing.description}</p>
            <div className="flex justify-between items-center text-sm mt-3">
              <span className="font-bold text-primary">₹{(listing.basePricePaise / 100).toLocaleString('en-IN')}</span>
              <span className="text-muted">{listing.durationMins} min</span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
        <div className="transform -translate-x-6 rotate-12 text-4xl text-primary/30">✕</div>
        <div className="transform translate-x-6 -rotate-12 text-4xl text-primary/30">❤</div>
      </div>

      {showPaywall && <SoftPaywallSheet onClose={closeModals} />}
      {showRequestModal && selectedListing && (
        <SendRequestModal listing={selectedListing} onClose={closeModals} />
      )}
    </div>
  );
};

export default SwipeDeck;
