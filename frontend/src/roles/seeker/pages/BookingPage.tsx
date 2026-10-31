import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  MessageCircle, AlertTriangle, Star, CheckCircle2,
  Clock, MapPin, KeyRound, Copy, Check, ChevronRight, X,
  Loader2, ShieldCheck, CreditCard, Wallet, Car, Navigation,
  Sparkles, AlertCircle, CalendarCheck, User
} from 'lucide-react';



import { SosButton } from '../../../components/SosButton.js';
import { ReportModal } from '../../../components/ReportModal.js';
import { StageChip } from '../../../components/StageChip.js';
import { BookingStage } from '../../../utils/bookingStages.js';
import { useOffline } from '../../../shared/hooks/useOffline.js';
import { CategoryIcon } from '../../../components/CategoryIcon.js';
import { api, loadRazorpayScript } from '../../../services/api.js';
import { walletApi } from '../../../services/wallet.js';

export const BookingPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: urlBookingId } = useParams<{ id: string }>();
  const isOffline = useOffline();

  const [activeTab, setActiveTab] = useState('All');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Action States
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [paymentModalBooking, setPaymentModalBooking] = useState<any | null>(null);
  const [reviewModalBooking, setReviewModalBooking] = useState<any | null>(null);
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string; bookingId?: string } | null>(null);
  const [activeSosBooking, setActiveSosBooking] = useState<string | null>(null);

  // Wallet & Payment State
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [pinCopied, setPinCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Review Form State
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewTags, setReviewTags] = useState<string[]>([]);

  const tabs = ['All', 'Requested', 'Accepted', 'Paid', 'In progress', 'Completed', 'Cancelled'];

  const availableReviewTags = [
    'Punctual ⏱️',
    'Great Conversation 💬',
    'Polite & Respectful 🤝',
    'Safe & Courteous 🛡️',
    'Friendly & Warm 😊',
    'Good Listener 🎧',
  ];

  useEffect(() => {
    fetchBookings();
    loadWallet();
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const timer = setTimeout(() => setToastMsg(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMsg]);

  // If URL has /s/booking/:id, open that booking in the details hub
  useEffect(() => {
    if (urlBookingId && bookings.length > 0) {
      const match = bookings.find((b) => b._id === urlBookingId);
      if (match) setSelectedBooking(match);
    }
  }, [urlBookingId, bookings]);

  const loadWallet = async () => {
    try {
      const bal = await walletApi.getBalance();
      setWalletBalance(bal);
    } catch {
      // ignore wallet fetch error
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await api.get<any[]>('/bookings');
      if (res.success && res.data) {
        setBookings(res.data);
      }
    } catch (err) {
      console.error('Failed to load bookings', err);
    } finally {
      setLoading(false);
    }
  };

  const getTabForStatus = (stage: string) => {
    if (stage === 'REQUESTED') return 'Requested';
    if (stage === 'ACCEPTED' || stage === 'PAYMENT_PENDING') return 'Accepted';
    if (stage === 'PAID' || stage === 'CONFIRMED') return 'Paid';
    if (stage === 'IN_PROGRESS' || stage === 'AWAITING_OTP') return 'In progress';
    if (stage === 'COMPLETED') return 'Completed';
    if (['DECLINED', 'CANCELLED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_PARTNER', 'EXPIRED', 'NO_SHOW'].includes(stage)) return 'Cancelled';
    return 'All';
  };

  const getStageForStatus = (status: string): BookingStage => {
    if (status === 'CONFIRMED') return 'PAID';
    if (['CANCELLED_BY_CLIENT', 'CANCELLED_BY_PARTNER'].includes(status)) return 'CANCELLED';
    if (status === 'NO_SHOW') return 'CANCELLED';
    return status as BookingStage;
  };

  // ── PAYMENT: Razorpay Flow ───────────────────────────────────────────────
  const handlePayRazorpay = async (booking: any) => {
    setActionLoading(true);
    try {
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) {
        setToastMsg({ text: 'Razorpay SDK failed to load. Please check your internet connection.', type: 'error' });
        return;
      }

      // Create order
      const orderRes = await api.post<any>(`/bookings/${booking._id}/pay/order`);
      const { orderId, amountPaise, keyId } = orderRes.data || {};

      const rzpOptions = {
        key: keyId || 'rzp_test_dummy',
        amount: amountPaise || booking.totalAmountPaise || booking.totalPaise,
        currency: 'INR',
        name: 'Date to Go',
        description: `Escrow payment for booking #${booking._id.slice(-6).toUpperCase()}`,
        order_id: orderId,
        handler: async (response: any) => {
          try {
            await api.post(`/bookings/${booking._id}/pay/verify`, {
              razorpayOrderId: response.razorpay_order_id || orderId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setToastMsg({ text: 'Payment verified! Date slot locked in escrow. Safe chat unlocked! 🎉', type: 'success' });
            setPaymentModalBooking(null);
            fetchBookings();
          } catch (err: any) {
            setToastMsg({ text: err.response?.data?.message || 'Payment verification failed.', type: 'error' });
          }
        },
        theme: { color: '#E11D48' },
      };

      const rzp = new (window as any).Razorpay(rzpOptions);
      rzp.open();
    } catch (err: any) {
      setToastMsg({ text: err.response?.data?.message || err.message || 'Payment initiation failed.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // ── PAYMENT: Wallet Balance ───────────────────────────────────────────────
  const handlePayWallet = async (booking: any) => {
    const totalPaise = booking.totalAmountPaise || booking.totalPaise;
    if (walletBalance < totalPaise) {
      setToastMsg({
        text: `Insufficient wallet balance. You have ₹${(walletBalance / 100).toFixed(0)}, required: ₹${(totalPaise / 100).toFixed(0)}.`,
        type: 'error',
      });
      return;
    }

    if (!window.confirm(`Pay ₹${(totalPaise / 100).toFixed(0)} from your Date-to-go Wallet balance to lock this date in escrow?`)) {
      return;
    }

    setActionLoading(true);
    try {
      await api.post(`/bookings/${booking._id}/pay/wallet`);
      setToastMsg({ text: 'Paid successfully from wallet! Date slot locked and safe chat unlocked. 🎉', type: 'success' });
      setPaymentModalBooking(null);
      fetchBookings();
      loadWallet();
    } catch (err: any) {
      setToastMsg({ text: err.response?.data?.message || 'Wallet payment failed.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // ── CONCLUDE / COMPLETE MEETING ──────────────────────────────────────────
  const handleCompleteDate = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to conclude this date? Companion escrow earnings will be released.')) {
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/bookings/${bookingId}/complete`);
      setToastMsg({ text: 'Date concluded successfully! Thank you for choosing Date to Go. ✨', type: 'success' });
      fetchBookings();
      // Open review modal for this booking
      const b = bookings.find((item) => item._id === bookingId);
      if (b) setReviewModalBooking(b);
    } catch (err: any) {
      setToastMsg({ text: err.response?.data?.message || 'Failed to complete date', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // ── SUBMIT REVIEW ────────────────────────────────────────────────────────
  const handleSubmitReview = async () => {
    if (!reviewModalBooking) return;
    setActionLoading(true);
    try {
      const commentWithTags = reviewTags.length > 0
        ? `[${reviewTags.join(', ')}] ${reviewComment}`.trim()
        : reviewComment;

      await api.post('/social/reviews', {
        bookingId: reviewModalBooking._id,
        rating: reviewRating,
        comment: commentWithTags,
      });

      setToastMsg({ text: 'Thank you for your rating & review! 🌟', type: 'success' });
      setReviewModalBooking(null);
      setReviewComment('');
      setReviewTags([]);
      fetchBookings();
    } catch (err: any) {
      setToastMsg({ text: err.response?.data?.message || 'Failed to submit review', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // ── COPY PIN HELPER ──────────────────────────────────────────────────────
  const handleCopyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    setPinCopied(true);
    setTimeout(() => setPinCopied(false), 2500);
  };

  const filteredBookings =
    activeTab === 'All'
      ? bookings
      : bookings.filter((b) => getTabForStatus(b.stage || b.status) === activeTab);

  return (
    <div className="w-full min-h-screen bg-bg text-textMain pb-20">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm animate-in slide-in-from-top-3 fade-in duration-200">
          <div
            className={`p-4 rounded-2xl shadow-xl flex items-center gap-3 border ${toastMsg.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-surface'
              }`}
          >
            {toastMsg.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span className="text-xs font-bold leading-tight flex-1">{toastMsg.text}</span>
          </div>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-borderLight/60">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-textMain tracking-tight">
              My Dates & Bookings
            </h1>
            <p className="text-xs sm:text-sm font-medium text-muted mt-0.5">
              Live status, escrow payments, secret PINs, and post-meeting reviews
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 bg-surface border border-borderLight rounded-full text-muted">
              {filteredBookings.length} {filteredBookings.length === 1 ? 'booking' : 'bookings'}
            </span>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="sticky top-16 md:top-20 z-30 bg-bg/95 backdrop-blur-md py-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-all active:scale-95 ${activeTab === tab
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'bg-surface border border-borderLight text-muted hover:bg-bg hover:text-textMain'
                  }`}
              >
                {tab}
                {activeTab === tab && <span className="inline-block w-1.5 h-1.5 bg-white rounded-full ml-2 mb-0.5" />}
              </button>
            ))}
          </div>
        </div>

        {/* Bookings List */}
        <main className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
          {loading ? (
            <div className="col-span-full flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-surface border border-borderLight rounded-3xl p-6">
              <CalendarCheck size={40} className="mx-auto text-muted/40 mb-3" />
              <p className="font-bold text-base text-textMain">No bookings found in this filter</p>
              <p className="text-xs text-muted mt-1">Explore companions and send a date request to get started.</p>
              <button
                onClick={() => navigate('/s/discover')}
                className="mt-4 px-6 py-2.5 bg-primary text-white font-bold text-xs rounded-full shadow-md shadow-primary/20 active:scale-95 transition-all"
              >
                Browse Companions
              </button>
            </div>
          ) : (
            filteredBookings.map((booking) => {
              const stage = booking.stage || booking.status;
              const starts = new Date(booking.startAt || booking.startsAt || booking.scheduledStartTime);
              const ends = new Date(booking.endAt || booking.endsAt || booking.scheduledEndTime);
              const durationHrs = booking.durationMins
                ? booking.durationMins / 60
                : (ends.getTime() - starts.getTime()) / (1000 * 60 * 60) || 2;
              const totalAmount = (booking.totalAmountPaise || booking.totalPaise || 0) / 100;
              const companionName = booking.partnerProfile?.displayName || booking.partnerId?.name || 'Companion';

              return (
                <div
                  key={booking._id}
                  className="card !p-0 overflow-hidden flex flex-col bg-surface border border-borderLight/80 rounded-3xl shadow-xs hover:shadow-md transition-shadow relative"
                >
                  {/* Card Header */}
                  <div className="p-4 border-b border-borderLight flex justify-between items-center bg-surface">
                    <div className="flex items-center gap-3">
                      {booking.partnerProfile?.primaryPhoto ? (
                        <div className="relative">
                          <img
                            src={booking.partnerProfile.primaryPhoto}
                            alt={companionName}
                            className="w-12 h-12 rounded-2xl object-cover border border-borderLight shadow-sm"
                          />
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] shadow-xs">
                            ✓
                          </span>
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shadow-sm">
                          <CategoryIcon
                            icon={booking.categoryId?.icon}
                            slug={booking.categoryId?.slug}
                            name={booking.categoryId?.name}
                            size={22}
                          />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-[15px]">{companionName}</h3>
                          <span className="text-xs text-muted font-normal">
                            · {booking.categoryId?.name || 'Experience'}
                          </span>
                        </div>
                        <div className="flex items-center text-xs text-muted mt-0.5">
                          <Star size={12} className="text-yellow-500 mr-0.5 fill-current" />
                          <span className="font-bold text-textMain mr-2">
                            {booking.partnerProfile?.ratingAvg?.toFixed(1) || '5.0'}
                          </span>
                          <span className="text-muted font-mono text-[11px]">
                            #{booking._id.slice(-6).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <StageChip stage={getStageForStatus(stage)} />
                  </div>

                  {/* Highlights Banner for Post-Accept Stages */}
                  {(stage === 'ACCEPTED' || stage === 'PAYMENT_PENDING') && (
                    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} className="shrink-0" /> Request Accepted! Complete payment to lock slot.
                      </span>
                      <button
                        onClick={() => setPaymentModalBooking(booking)}
                        className="px-3 py-1 bg-amber-500 text-white rounded-lg text-[11px] font-black active:scale-95 shadow-xs"
                      >
                        Pay ₹{totalAmount.toFixed(0)}
                      </button>
                    </div>
                  )}

                  {stage === 'PAID' && (
                    <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2.5 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck size={16} className="shrink-0" /> Escrow Secured · Confirmed
                      </span>
                      {booking.startPin && (
                        <div className="flex items-center gap-1 bg-surface border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                          <span className="text-[10px] text-muted uppercase">PIN:</span>
                          <span className="font-mono font-black text-sm text-textMain tracking-widest">
                            {booking.startPin}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {stage === 'IN_PROGRESS' && (
                    <div className="bg-emerald-600 text-white px-4 py-2 flex items-center justify-between text-xs font-bold animate-pulse">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" /> Meeting In Progress
                      </span>
                      <button
                        onClick={() => handleCompleteDate(booking._id)}
                        className="px-3 py-1 bg-white text-emerald-700 rounded-lg text-[11px] font-black active:scale-95"
                      >
                        Conclude Date
                      </button>
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="p-4 grid grid-cols-2 gap-3 bg-bg/30 text-xs">
                    <div>
                      <p className="text-[11px] text-muted font-medium mb-0.5">Date & Time</p>
                      <p className="font-semibold text-textMain">
                        {starts.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted font-medium mb-0.5">Duration</p>
                      <p className="font-semibold text-textMain">{durationHrs} hrs</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[11px] text-muted font-medium mb-0.5">Venue</p>
                      <p className="font-semibold text-textMain flex items-center gap-1 truncate">
                        <MapPin size={13} className="text-primary shrink-0" />
                        {booking.venueName || 'Public Venue'}
                        {booking.venueAddress ? ` (${booking.venueAddress})` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Live Travel Status if Active */}
                  {(stage === 'PAID' || stage === 'IN_PROGRESS') && booking.partnerTravelStatus && booking.partnerTravelStatus !== 'STATIONARY' && (
                    <div className="px-4 py-1.5 bg-primary/5 border-t border-borderLight flex items-center gap-2 text-xs font-bold text-primary">
                      {booking.partnerTravelStatus === 'ON_THE_WAY' ? (
                        <>
                          <Car size={14} className="animate-bounce" /> Companion is on the way to the venue!
                        </>
                      ) : (
                        <>
                          <Navigation size={14} className="text-emerald-500" /> Companion has arrived at the venue! Share your PIN.
                        </>
                      )}
                    </div>
                  )}

                  {/* Footer Actions */}
                  <div className="p-4 border-t border-borderLight flex justify-between items-center bg-surface mt-auto">
                    <div>
                      <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Total Price</p>
                      <p className="font-black text-primary text-base">₹{totalAmount.toFixed(0)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Chat Shortcut */}
                      <button
                        onClick={() => navigate(`/s/chat/${booking._id}`)}
                        className="p-2.5 bg-surface border border-borderLight rounded-full text-primary hover:bg-bg active:scale-95 transition-all shadow-xs"
                        title="Chat with companion"
                      >
                        <MessageCircle size={18} />
                      </button>

                      {/* Pay Now Button */}
                      {(stage === 'ACCEPTED' || stage === 'PAYMENT_PENDING') && (
                        <button
                          onClick={() => setPaymentModalBooking(booking)}
                          disabled={isOffline}
                          className="px-5 py-2.5 rounded-full bg-primary hover:bg-primary/95 text-white font-bold text-xs shadow-md shadow-primary/20 active:scale-95 transition-all flex items-center gap-1.5"
                        >
                          <CreditCard size={14} /> Pay & Confirm
                        </button>
                      )}

                      {/* Details / PIN Hub */}
                      {stage === 'PAID' && (
                        <>
                          <button
                            onClick={() => setSelectedBooking(booking)}
                            className="px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-1.5"
                          >
                            <KeyRound size={14} /> View PIN: {booking.startPin || '4821'}
                          </button>
                          <button
                            id={`sos-open-btn-${booking._id}`}
                            onClick={() => setActiveSosBooking(activeSosBooking === booking._id ? null : booking._id)}
                            className="p-2.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20 font-bold active:scale-95"
                            title="SOS Safety"
                          >
                            <AlertTriangle size={16} />
                          </button>
                        </>
                      )}

                      {/* In Progress */}
                      {stage === 'IN_PROGRESS' && (
                        <>
                          <button
                            onClick={() => handleCompleteDate(booking._id)}
                            className="px-4 py-2.5 rounded-full bg-primary text-white font-bold text-xs active:scale-95"
                          >
                            Conclude Date
                          </button>
                          <button
                            id={`sos-open-btn-${booking._id}-prog`}
                            onClick={() => setActiveSosBooking(activeSosBooking === booking._id ? null : booking._id)}
                            className="p-2.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20 font-bold active:scale-95"
                            title="SOS Safety"
                          >
                            <AlertTriangle size={16} />
                          </button>
                        </>
                      )}

                      {/* Completed: Review */}
                      {stage === 'COMPLETED' && (
                        <button
                          onClick={() => setReviewModalBooking(booking)}
                          className="px-4 py-2.5 rounded-full bg-surface border border-borderLight text-textMain hover:bg-bg font-bold text-xs flex items-center gap-1.5 active:scale-95"
                        >
                          <Star size={14} className="text-yellow-500 fill-current" /> Rate & Review
                        </button>
                      )}

                      {/* General Hub */}
                      <button
                        onClick={() => setSelectedBooking(booking)}
                        className="p-2.5 bg-surface border border-borderLight rounded-full text-muted hover:text-textMain hover:bg-bg active:scale-95"
                        title="View Full Booking Details"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </main>
      </div>

      {/* ── PAYMENT MODAL (RAZORPAY + WALLET ESCROW) ────────────────────────── */}
      {paymentModalBooking && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-md rounded-t-[2.5rem] sm:rounded-3xl p-6 pb-safe shadow-2xl animate-in slide-in-from-bottom-8 duration-300 border border-borderLight">
            <div className="flex items-center justify-between pb-4 border-b border-borderLight mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="font-black text-base">Escrow Payment</h3>
                  <p className="text-[11px] text-muted">Protected under Date to Go Escrow Guarantee</p>
                </div>
              </div>
              <button
                onClick={() => setPaymentModalBooking(null)}
                className="w-8 h-8 rounded-full bg-bg border border-borderLight flex items-center justify-center text-muted hover:text-textMain"
              >
                <X size={16} />
              </button>
            </div>

            {/* Companion & Experience Summary */}
            <div className="bg-bg rounded-2xl p-4 mb-4 border border-borderLight/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted">Companion</span>
                <span className="font-bold text-xs text-textMain">
                  {paymentModalBooking.partnerProfile?.displayName || paymentModalBooking.partnerId?.name || 'Companion'}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted">Venue</span>
                <span className="font-bold text-xs text-textMain">{paymentModalBooking.venueName || 'Public Venue'}</span>
              </div>
              <div className="flex items-center justify-between border-t border-borderLight/60 pt-2 mt-2">
                <span className="text-xs font-black">Total to Escrow</span>
                <span className="font-black text-lg text-primary">
                  ₹{((paymentModalBooking.totalAmountPaise || paymentModalBooking.totalPaise || 0) / 100).toFixed(0)}
                </span>
              </div>
            </div>

            {/* Payment Option 1: Date-to-go Wallet */}
            <div className="mb-3">
              <button
                onClick={() => handlePayWallet(paymentModalBooking)}
                disabled={actionLoading}
                className="w-full p-4 rounded-2xl border-2 border-primary/30 hover:border-primary bg-primary/5 active:scale-[0.98] transition-all text-left flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-sm">Pay with Wallet Balance</h4>
                    <p className="text-xs text-muted font-semibold">
                      Available: ₹{(walletBalance / 100).toFixed(0)} · Instant 1-Click
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black text-primary px-3 py-1.5 bg-primary/10 rounded-xl">
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Pay Now →'}
                </span>
              </button>
            </div>

            {/* Payment Option 2: Razorpay (UPI / Cards / Netbanking) */}
            <div className="mb-4">
              <button
                onClick={() => handlePayRazorpay(paymentModalBooking)}
                disabled={actionLoading}
                className="w-full p-4 rounded-2xl border border-borderLight hover:border-primary/40 bg-surface active:scale-[0.98] transition-all text-left flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-bg border border-borderLight flex items-center justify-center text-textMain">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-sm">UPI / Cards / NetBanking</h4>
                    <p className="text-xs text-muted font-semibold">Google Pay, PhonePe, Paytm, Debit/Credit Card</p>
                  </div>
                </div>
                <span className="text-xs font-black text-textMain px-3 py-1.5 bg-bg rounded-xl border border-borderLight">
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Checkout →'}
                </span>
              </button>
            </div>

            <p className="text-[11px] text-muted text-center leading-relaxed">
              Funds remain protected in platform escrow and are only released after meeting verification. 100% refund applies if cancelled before 24h.
            </p>
          </div>
        </div>
      )}

      {/* ── BOOKING DETAILS & SECRET PIN HUB MODAL ──────────────────────────── */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-lg rounded-t-[2.5rem] sm:rounded-3xl p-6 pb-safe shadow-2xl max-h-[90vh] overflow-y-auto border border-borderLight">
            <div className="flex items-center justify-between pb-3 border-b border-borderLight mb-4">
              <div>
                <h3 className="font-black text-lg">Booking Details</h3>
                <p className="text-[11px] text-muted font-mono">
                  REF: #{selectedBooking._id.slice(-8).toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="w-8 h-8 rounded-full bg-bg border border-borderLight flex items-center justify-center text-muted hover:text-textMain"
              >
                <X size={16} />
              </button>
            </div>

            {/* Secret In-Person PIN Box (For Confirmed Dates) */}
            {(selectedBooking.stage === 'PAID' || selectedBooking.stage === 'IN_PROGRESS') && (
              <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 border-2 border-primary/40 rounded-3xl p-5 mb-5 text-center relative overflow-hidden">
                <div className="flex items-center justify-center gap-1.5 text-primary text-xs font-black uppercase tracking-wider mb-2">
                  <KeyRound size={16} /> Your Secret In-Person Meeting PIN
                </div>

                <div className="flex items-center justify-center gap-2.5 my-3">
                  {(selectedBooking.startPin || '4821').split('').map((char: string, i: number) => (
                    <div
                      key={i}
                      className="w-12 h-14 bg-surface border-2 border-primary/40 rounded-2xl flex items-center justify-center text-2xl font-black font-mono text-textMain shadow-sm"
                    >
                      {char}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleCopyPin(selectedBooking.startPin || '4821')}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-surface border border-borderLight rounded-full text-xs font-bold text-textMain hover:bg-bg active:scale-95 transition-all shadow-xs"
                >
                  {pinCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  {pinCopied ? 'PIN Copied!' : 'Copy 4-digit PIN'}
                </button>

                <p className="text-[11px] text-muted font-semibold mt-3 max-w-xs mx-auto leading-relaxed">
                  🔒 Keep this secret. Share this PIN with your companion in-person when you meet at the venue to start your date.
                </p>
              </div>
            )}

            {/* Companion Profile Summary */}
            <div className="flex items-center gap-3.5 bg-bg rounded-2xl p-4 mb-4 border border-borderLight/60">
              {selectedBooking.partnerProfile?.primaryPhoto ? (
                <img
                  src={selectedBooking.partnerProfile.primaryPhoto}
                  alt="Companion"
                  className="w-14 h-14 rounded-2xl object-cover border border-borderLight shadow-sm"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <CategoryIcon icon={selectedBooking.categoryId?.icon} size={24} />
                </div>
              )}
              <div className="flex-1">
                <h4 className="font-bold text-base">
                  {selectedBooking.partnerProfile?.displayName || selectedBooking.partnerId?.name || 'Companion'}
                </h4>
                <p className="text-xs text-muted flex items-center gap-1">
                  <Star size={12} className="text-yellow-500 fill-current" />
                  <span className="font-bold text-textMain">
                    {selectedBooking.partnerProfile?.ratingAvg?.toFixed(1) || '5.0'}
                  </span>
                  · {selectedBooking.categoryId?.name || 'Companion Experience'}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedBooking(null);
                  navigate(`/s/chat/${selectedBooking._id}`);
                }}
                className="p-3 bg-primary text-white rounded-2xl font-bold active:scale-95 shadow-md shadow-primary/20"
                title="Open Chat"
              >
                <MessageCircle size={18} />
              </button>
            </div>

            {/* Venue & Time Details */}
            <div className="space-y-3 bg-bg rounded-2xl p-4 mb-4 border border-borderLight/60 text-xs">
              <div className="flex items-start gap-2.5">
                <MapPin size={16} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold text-muted uppercase">Venue Location</p>
                  <p className="font-bold text-sm text-textMain">{selectedBooking.venueName || 'Public Venue'}</p>
                  {selectedBooking.venueAddress && <p className="text-muted mt-0.5">{selectedBooking.venueAddress}</p>}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${selectedBooking.venueName} ${selectedBooking.venueAddress || ''}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-1 text-primary font-bold hover:underline"
                  >
                    Open in Google Maps →
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-2.5 border-t border-borderLight/60 pt-3">
                <Clock size={16} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold text-muted uppercase">Date & Duration</p>
                  <p className="font-bold text-sm text-textMain">
                    {new Date(selectedBooking.startAt).toLocaleString('en-IN', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric',
                    })}
                  </p>
                  <p className="text-muted mt-0.5">{selectedBooking.durationMins || 120} minutes duration</p>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedBooking(null);
                  navigate(`/s/chat/${selectedBooking._id}`);
                }}
                className="flex-1 py-3 bg-primary text-white font-bold rounded-2xl active:scale-95 shadow-md shadow-primary/25 flex items-center justify-center gap-1.5 text-xs"
              >
                <MessageCircle size={16} /> Open Chat
              </button>
              <button
                onClick={() => {
                  // Safely extract a string partner ID
                  const pid =
                    selectedBooking.partnerId && typeof selectedBooking.partnerId === 'object'
                      ? selectedBooking.partnerId._id ?? selectedBooking.partnerId.id ?? selectedBooking.partnerId.name ?? ''
                      : selectedBooking.partnerId;
                  if (pid && typeof pid === 'string' && pid.trim() !== '') {
                    setSelectedBooking(null);
                    navigate(`/partner/${pid}`);
                  } else {
                    setToastMsg({ text: 'Partner details unavailable.', type: 'error' });
                  }
                }}
                className="flex-1 py-3 bg-surface border border-borderLight text-textMain font-bold rounded-2xl active:scale-95 flex items-center justify-center gap-1.5 text-xs"
              >
                <User size={16} /> View Companion
              </button>
              {(selectedBooking.stage === 'ACCEPTED' || selectedBooking.stage === 'PAYMENT_PENDING') && (
                <button
                  onClick={() => {
                    const b = selectedBooking;
                    setSelectedBooking(null);
                    setPaymentModalBooking(b);
                  }}
                  className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-2xl active:scale-95 shadow-md shadow-emerald-600/25 flex items-center justify-center gap-1.5 text-xs"
                >
                  <CreditCard size={16} /> Pay Escrow
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── REVIEW & RATING MODAL ───────────────────────────────────────────── */}
      {reviewModalBooking && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-md rounded-t-[2.5rem] sm:rounded-3xl p-6 pb-safe shadow-2xl border border-borderLight animate-in slide-in-from-bottom-8">
            <div className="flex items-center justify-between pb-3 border-b border-borderLight mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-yellow-500" />
                <h3 className="font-black text-base">Rate Your Companion</h3>
              </div>
              <button
                onClick={() => setReviewModalBooking(null)}
                className="w-8 h-8 rounded-full bg-bg border border-borderLight flex items-center justify-center text-muted"
              >
                <X size={16} />
              </button>
            </div>

            {/* Stars Selector */}
            <div className="text-center py-3">
              <p className="text-xs font-semibold text-muted mb-2">How was your companion date experience?</p>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1 hover:scale-110 active:scale-90 transition-transform"
                  >
                    <Star
                      size={32}
                      className={
                        star <= reviewRating
                          ? 'text-yellow-400 fill-yellow-400 drop-shadow-sm'
                          : 'text-borderLight fill-none'
                      }
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Platonic Tag Badges */}
            <div className="my-3">
              <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">Select Highlights</p>
              <div className="flex flex-wrap gap-1.5">
                {availableReviewTags.map((tag) => {
                  const isSelected = reviewTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setReviewTags((prev) =>
                          isSelected ? prev.filter((t) => t !== tag) : [...prev, tag]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${isSelected
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-bg border border-borderLight text-muted hover:text-textMain'
                        }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Review Comment Textarea */}
            <div className="my-3">
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your positive feedback and thoughts about the meetup..."
                rows={3}
                maxLength={500}
                className="w-full bg-bg border border-borderLight rounded-2xl p-3 text-xs text-textMain outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setReviewModalBooking(null)}
                className="flex-1 py-3 bg-bg border border-borderLight text-textMain font-bold rounded-2xl text-xs active:scale-95"
              >
                Skip
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={actionLoading}
                className="flex-1 py-3 bg-primary text-white font-bold rounded-2xl text-xs active:scale-95 shadow-md shadow-primary/25 flex items-center justify-center gap-1.5"
              >
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOS Button Overlay Component */}
      {activeSosBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface w-full max-w-sm rounded-3xl p-6 shadow-2xl relative border border-borderLight">
            <button
              onClick={() => setActiveSosBooking(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-bg border border-borderLight flex items-center justify-center text-muted hover:text-textMain"
            >
              <X size={16} />
            </button>
            <div className="pt-2">
              <SosButton bookingId={activeSosBooking} variant="full" />
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportTarget && (
        <ReportModal
          targetUserId={reportTarget.id}
          targetName={reportTarget.name}
          context="BOOKING"
          bookingId={reportTarget.bookingId}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
};
