import React, { useEffect, useState } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../../../services/api';
import { 
  ChevronLeft, Calendar, Clock, MapPin, 
  Trash2, Share2, CheckCircle2, AlertCircle, 
  ExternalLink, FileText, Shield, Loader2, Sparkles,
  Coffee
} from 'lucide-react';
import { CategoryIcon } from '../../../components/CategoryIcon';

export const PartnerListingDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchListing();
  }, [id]);

  useEffect(() => {
    if (!feedbackMsg) return;
    const timer = setTimeout(() => setFeedbackMsg(null), 3500);
    return () => clearTimeout(timer);
  }, [feedbackMsg]);

  const fetchListing = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<any>(`/partner/listings/${id}`);
      if (res.data) {
        setListing(res.data);
      } else if ((res as any).listing) {
        setListing((res as any).listing);
      } else {
        setListing(res);
      }
    } catch (e: any) {
      console.error('Failed to load listing:', e);
      setError(e.response?.data?.message || e.message || 'Failed to load listing details');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (paise?: number) => {
    if (paise == null) return '0';
    return (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not scheduled';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleShare = async () => {
    const url = window.location.origin + `/s/listings/${id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing?.categoryId?.name ? `${listing.categoryId.name} with me` : 'Companion Listing',
          text: `Check out my available companion slot on Date to Go!`,
          url: url
        });
        return;
      } catch (err) {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setFeedbackMsg({ text: 'Listing link copied to clipboard!', type: 'success' });
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      setFeedbackMsg({ text: 'Could not copy link to clipboard.', type: 'error' });
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/partner/listings/${id}`);
      navigate('/p/dashboard?tab=listings', { replace: true });
    } catch (e: any) {
      console.error('Failed to delete listing:', e);
      setFeedbackMsg({ 
        text: e.response?.data?.message || 'Could not delete listing. Please try again.', 
        type: 'error' 
      });
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleToggleStatus = async () => {
    const isLive = listing.status === 'ACTIVE' || listing.status === 'OPEN';
    const newStatus = isLive ? 'PAUSED' : 'ACTIVE';
    setToggling(true);
    try {
      const res = await api.patch<any>(`/partner/listings/${id}`, { status: newStatus });
      const updated = res?.data || { ...listing, status: newStatus };
      setListing((prev: any) => ({ ...prev, ...updated, status: newStatus }));
      setFeedbackMsg({ 
        text: `Listing marked as ${newStatus === 'ACTIVE' ? 'Active' : 'Paused'}.`, 
        type: 'success' 
      });
    } catch (e: any) {
      // If patch fails, attempt fallback
      try {
        const res2 = await api.post<any>(`/partner/listings/${id}/status`, { status: newStatus });
        const updated2 = res2?.data || { ...listing, status: newStatus };
        setListing((prev: any) => ({ ...prev, ...updated2, status: newStatus }));
        setFeedbackMsg({ 
          text: `Listing status updated to ${newStatus}.`, 
          type: 'success' 
        });
      } catch (err2: any) {
        setFeedbackMsg({ 
          text: e?.message || e?.response?.data?.message || 'Could not update status.', 
          type: 'error' 
        });
      }
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[100dvh] bg-bg flex flex-col items-center justify-center text-textMain">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full" />
        </div>
        <p className="mt-4 text-sm font-bold text-muted animate-pulse">Loading Listing Details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[100dvh] bg-bg flex flex-col items-center justify-center text-textMain p-6 text-center">
        <AlertCircle size={48} className="text-failed-text mb-4 opacity-70" />
        <h2 className="text-xl font-black mb-2">Listing Not Found</h2>
        <p className="text-sm text-muted mb-6 max-w-sm">{error}</p>
        <button
          onClick={() => navigate('/p/dashboard?tab=listings')}
          className="px-6 py-3 bg-primary text-white font-bold rounded-full active:scale-95 transition-transform shadow-lg shadow-primary/25"
        >
          Back to Listings
        </button>
      </div>
    );
  }

  if (!listing) return <Navigate to="/p/dashboard?tab=listings" replace />;

  const status = listing.status || 'ACTIVE';
  const isActive = status === 'ACTIVE' || status === 'OPEN';
  const price = listing.basePricePaise ?? listing.pricePaise ?? 0;
  const categoryName = listing.categoryId?.name || listing.category?.name || 'Experience';
  const durationHours = listing.durationMins ? listing.durationMins / 60 : 2;

  const getStatusBadge = () => {
    switch (status) {
      case 'ACTIVE':
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-black uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live · Active
          </span>
        );
      case 'BOOKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 text-xs font-black uppercase tracking-wider">
            <CheckCircle2 size={12} />
            Booked
          </span>
        );
      case 'PAUSED':
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs font-black uppercase tracking-wider">
            Paused
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-500/10 text-gray-500 border border-gray-500/20 text-xs font-black uppercase tracking-wider">
            Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-borderLight text-muted text-xs font-black uppercase tracking-wider">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="h-[100dvh] overflow-hidden w-full flex flex-col bg-bg text-textMain">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm animate-in slide-in-from-top-3 fade-in duration-200">
          <div className={`p-4 rounded-2xl shadow-xl flex items-center gap-3 border ${
            feedbackMsg.type === 'error'
              ? 'bg-failed-bg border-failed-text/30 text-failed-text'
              : 'bg-surface border-success-text/30 text-success-text'
          }`}>
            {feedbackMsg.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span className="text-xs font-bold leading-tight flex-1">{feedbackMsg.text}</span>
          </div>
        </div>
      )}

      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 bg-bg/90 backdrop-blur-xl border-b border-borderLight/50 pt-safe">
        <div className="h-16 px-4 md:px-8 flex items-center justify-between max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/p/dashboard?tab=listings')}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-surface border border-borderLight active:scale-95 transition-transform"
              aria-label="Back to listings"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none">Listing Details</h1>
              <p className="text-[11px] font-semibold text-muted mt-0.5 font-mono">
                ID: {listing._id ? listing._id.slice(-6).toUpperCase() : 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="h-10 px-3.5 flex items-center gap-2 rounded-full bg-surface border border-borderLight text-xs font-bold text-textMain hover:border-primary/50 active:scale-95 transition-all"
              title="Share listing"
            >
              {copied ? <CheckCircle2 size={15} className="text-success-text" /> : <Share2 size={15} />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-failed-bg text-failed-text active:scale-95 transition-transform"
              title="Delete listing"
            >
              <Trash2 size={17} />
            </button>
          </div>
        </div>
      </header>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto px-4 md:px-8 pt-6 pb-32 scrollbar-hide max-w-4xl mx-auto w-full space-y-6">
        
        {/* HERO CARD */}
        <div className="bg-surface border border-borderLight rounded-3xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 relative z-10">
            <div className="flex items-start gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-bg border border-borderLight flex items-center justify-center text-primary shrink-0 shadow-sm">
                <CategoryIcon 
                  icon={listing.categoryId?.icon} 
                  slug={listing.categoryId?.slug} 
                  name={categoryName} 
                  size={26} 
                />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    {categoryName}
                  </span>
                  {getStatusBadge()}
                </div>
                <h2 className="text-xl md:text-2xl font-black text-textMain leading-tight">
                  {listing.title || `${categoryName} Experience`}
                </h2>
              </div>
            </div>

            <div className="bg-bg border border-borderLight/80 rounded-2xl p-4 sm:text-right w-full sm:w-auto">
              <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-0.5">Price / Slot</p>
              <p className="text-3xl font-black text-primary leading-none">
                ₹{formatCurrency(price)}
              </p>
              <p className="text-[11px] font-semibold text-muted mt-1">
                For {durationHours} {durationHours === 1 ? 'hour' : 'hours'}
              </p>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 relative z-10 pt-2 border-t border-borderLight/60">
            <div className="bg-bg rounded-2xl p-3 border border-borderLight/50">
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Slot Duration</p>
              <p className="font-black text-base text-textMain flex items-center gap-1.5">
                <Clock size={15} className="text-primary" />
                {durationHours} {durationHours === 1 ? 'Hour' : 'Hours'}
              </p>
            </div>
            <div className="bg-bg rounded-2xl p-3 border border-borderLight/50">
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Venue Type</p>
              <p className="font-black text-base text-textMain flex items-center gap-1.5 capitalize">
                <Coffee size={15} className="text-primary" />
                {listing.venueType?.toLowerCase() || 'Public Venue'}
              </p>
            </div>
            <div className="bg-bg rounded-2xl p-3 border border-borderLight/50 col-span-2 sm:col-span-1">
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Booking Status</p>
              <p className="font-black text-base text-textMain flex items-center gap-1.5">
                <Sparkles size={15} className="text-primary" />
                {listing.bookingId ? 'Reserved' : 'Available for booking'}
              </p>
            </div>
          </div>
        </div>

        {/* SCHEDULE & TIMING CARD */}
        <div className="bg-surface border border-borderLight rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="font-black text-base leading-tight">Date & Schedule</h3>
              <p className="text-xs font-semibold text-muted">When this companion slot takes place</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="bg-bg rounded-2xl p-4 border border-borderLight/50 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Calendar size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Start Date</p>
                <p className="font-bold text-sm text-textMain">{formatDate(listing.startAt)}</p>
              </div>
            </div>

            <div className="bg-bg rounded-2xl p-4 border border-borderLight/50 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Clock size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Time Slot</p>
                <p className="font-bold text-sm text-textMain">
                  {listing.startAt ? formatTime(listing.startAt) : 'N/A'}
                  {listing.endAt ? ` — ${formatTime(listing.endAt)}` : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* VENUE & LOCATION CARD */}
        <div className="bg-surface border border-borderLight rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <MapPin size={20} />
            </div>
            <div>
              <h3 className="font-black text-base leading-tight">Meeting Venue</h3>
              <p className="text-xs font-semibold text-muted">Designated safe, public meeting spot</p>
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="bg-bg rounded-2xl p-4 border border-borderLight/50">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Venue Name</p>
                  <p className="font-black text-base text-textMain">
                    {listing.venueName || listing.publicVenueName || 'Public Meeting Venue'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-surface text-textMain text-xs font-bold border border-borderLight uppercase tracking-wider">
                  {listing.venueType || 'PUBLIC'}
                </span>
              </div>
            </div>

            {listing.venueAddress && (
              <div className="bg-bg rounded-2xl p-4 border border-borderLight/50">
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Full Address</p>
                <p className="font-semibold text-sm text-textMain leading-relaxed">
                  {listing.venueAddress}
                </p>
              </div>
            )}

            {listing.venueName && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  (listing.venueName || '') + ' ' + (listing.venueAddress || '')
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline px-1 py-1"
              >
                <ExternalLink size={14} /> Open in Google Maps
              </a>
            )}
          </div>
        </div>

        {/* DESCRIPTION CARD */}
        {listing.description && (
          <div className="bg-surface border border-borderLight rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <FileText size={20} />
              </div>
              <h3 className="font-black text-base leading-tight">Experience Description</h3>
            </div>
            <div className="bg-bg rounded-2xl p-4 border border-borderLight/50">
              <p className="text-sm font-medium text-textMain leading-relaxed whitespace-pre-wrap">
                {listing.description}
              </p>
            </div>
          </div>
        )}

        {/* ASSOCIATED BOOKING (IF BOOKED) */}
        {listing.bookingId && (
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-primary" />
                <h3 className="font-black text-base text-textMain">This Slot Is Booked!</h3>
              </div>
              <span className="text-xs font-black text-primary uppercase bg-primary/15 px-3 py-1 rounded-full">
                Active Booking
              </span>
            </div>
            <p className="text-xs font-medium text-muted mb-4">
              A seeker has successfully booked this listing slot. View the booking page to coordinate.
            </p>
            <button
              onClick={() => navigate(`/p/booking/${listing.bookingId}`)}
              className="h-11 px-6 bg-primary text-white font-bold text-xs rounded-xl active:scale-95 transition-transform shadow-md shadow-primary/20"
            >
              View Booking Details →
            </button>
          </div>
        )}

        {/* PLATONIC SAFETY BADGE */}
        <div className="bg-surface border border-borderLight rounded-3xl p-5 flex items-start gap-3.5 shadow-sm">
          <Shield size={22} className="text-primary shrink-0 mt-0.5" />
          <div>
            <h4 className="font-black text-sm text-textMain">100% Platonic & Public Only</h4>
            <p className="text-xs text-muted leading-relaxed mt-0.5">
              Date to Go operates strictly under platonic community guidelines. All meetings must occur in verified public cafes, restaurants, or approved venues with OTP completion verification.
            </p>
          </div>
        </div>

      </main>

      {/* BOTTOM ACTION BAR */}
      <footer className="fixed bottom-0 left-0 w-full bg-surface/90 backdrop-blur-xl border-t border-borderLight/50 p-4 pb-safe z-40 flex justify-center">
        <div className="max-w-4xl w-full flex items-center gap-3">
          <button
            onClick={handleToggleStatus}
            disabled={toggling || status === 'BOOKED'}
            className={`flex-1 h-14 rounded-2xl font-black text-sm active:scale-95 transition-all flex items-center justify-center gap-2 border ${
              isActive
                ? 'bg-bg text-textMain border-borderLight hover:bg-surface'
                : 'bg-emerald-600 text-white border-transparent shadow-lg shadow-emerald-600/25'
            } disabled:opacity-50`}
          >
            {toggling ? (
              <Loader2 size={18} className="animate-spin" />
            ) : isActive ? (
              'Pause Listing'
            ) : (
              'Activate Listing'
            )}
          </button>

          <button
            onClick={() => navigate('/p/dashboard?tab=listings')}
            className="flex-1 h-14 bg-primary text-white rounded-2xl font-black text-sm active:scale-95 transition-transform shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
          >
            All Offerings
          </button>
        </div>
      </footer>

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-borderLight rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-14 h-14 rounded-full bg-failed-bg text-failed-text flex items-center justify-center mx-auto mb-4">
              <Trash2 size={26} />
            </div>
            <h3 className="text-xl font-black text-textMain mb-2">Delete this Listing?</h3>
            <p className="text-xs font-semibold text-muted mb-6 leading-relaxed">
              This action cannot be undone. Seekers will no longer be able to discover or book this slot.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 h-12 rounded-xl bg-bg border border-borderLight text-textMain font-bold text-sm active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 h-12 rounded-xl bg-failed-text text-white font-bold text-sm active:scale-95 transition-transform shadow-lg shadow-failed-text/25 flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
