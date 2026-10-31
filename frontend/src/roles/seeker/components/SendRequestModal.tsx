import React from 'react';
import { X } from 'lucide-react';

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

type Props = {
  listing: ListingItem;
  onClose: () => void;
};

const SendRequestModal: React.FC<Props> = ({ listing, onClose }) => {
  const handleSend = () => {
    // TODO: integrate request API call
    alert('Request sent!');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-surface rounded-2xl shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted hover:text-textMain transition-colors"
        >
          <X size={20} />
        </button>
        <h2 className="text-2xl font-black mb-4 text-textMain">Send Request</h2>
        <div className="flex items-center gap-4 mb-4">
          <img
            src={listing.profile.primaryPhoto || '/placeholder.png'}
            alt={listing.title}
            className="w-16 h-16 rounded-full object-cover"
          />
          <div>
            <h3 className="font-black text-lg">{listing.title || listing.profile.displayName}</h3>
            <p className="text-sm text-muted">{listing.city}, {listing.area}</p>
          </div>
        </div>
        <p className="text-sm text-muted mb-6">
          {listing.description}
        </p>
        <button
          onClick={handleSend}
          className="w-full bg-primary text-white py-2 rounded-xl font-bold hover:opacity-90 transition-opacity"
        >
          Send Request & Pay ₹{(listing.basePricePaise / 100).toLocaleString('en-IN')}
        </button>
      </div>
    </div>
  );
};

export default SendRequestModal;
