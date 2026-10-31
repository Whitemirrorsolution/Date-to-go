import React, { useEffect, useState } from 'react';
import { useParams, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../../services/api';
import { StageChip } from '../../../components/StageChip';
import {
  ChevronLeft, Loader2, Calendar, Clock, MapPin,
  IndianRupee, User, MessageCircle, Shield,
  FileText, AlertCircle, CheckCircle2, KeyRound, Sparkles
} from 'lucide-react';

export const PartnerBookingDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isReviewDeepLink = searchParams.get('review') === 'true';

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quickReplies, setQuickReplies] = useState<any[]>([]);

  // Actions state
  const [actionLoading, setActionLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpError, setOtpError] = useState('');
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchBooking();
    api.get<any>('/partner/quick-replies').then(res => setQuickReplies(res.data || [])).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!toastMsg) return;
    const timer = setTimeout(() => setToastMsg(null), 3500);
    return () => clearTimeout(timer);
  }, [toastMsg]);

  const fetchBooking = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<any>(`/partner/bookings/${id}`);
      setBooking(res.data || (res as any).booking || res);
    } catch (e: any) {
      console.error(e);
      setError(e.response?.data?.message || 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      await api.post(`/bookings/${id}/accept`);
      setToastMsg({ text: 'Booking request accepted successfully!', type: 'success' });
      fetchBooking();
    } catch (e: any) {
      setToastMsg({ text: e.response?.data?.message || 'Failed to accept booking', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!window.confirm('Are you sure you want to decline this booking request?')) return;
    setActionLoading(true);
    try {
      await api.post(`/bookings/${id}/decline`);
      setToastMsg({ text: 'Booking request declined.', type: 'success' });
      fetchBooking();
    } catch (e: any) {
      setToastMsg({ text: e.response?.data?.message || 'Failed to decline booking', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError('');
    setActionLoading(true);
    try {
      if (stage === 'PAID') {
        // Start meeting verification
        await api.post(`/bookings/${id}/start-meeting`, { pin: otpValue });
        setShowOtpModal(false);
        setOtpValue('');
        setToastMsg({ text: 'In-person PIN verified! Meeting officially started.', type: 'success' });
      } else {
        // Completion verification
        await api.post(`/bookings/${id}/verify-otp`, { otp: otpValue });
        setShowOtpModal(false);
        setOtpValue('');
        setToastMsg({ text: 'Booking verified and completed! Payout unlocked.', type: 'success' });
      }
      fetchBooking();
    } catch (e: any) {
      setOtpError(e.response?.data?.message || 'Invalid 4-digit PIN. Please ask the seeker.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTravelStatus = async (status: 'ON_THE_WAY' | 'ARRIVED') => {
    setActionLoading(true);
    try {
      await api.post(`/bookings/${id}/travel-status`, { status });
      setToastMsg({
        text: status === 'ON_THE_WAY' ? 'Updated status: You are on the way! 🚗' : 'Updated status: You have arrived! 📍',
        type: 'success',
      });
      fetchBooking();
    } catch (e: any) {
      setToastMsg({ text: e.response?.data?.message || 'Failed to update travel status', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteMeeting = async () => {
    if (!window.confirm('Are you sure you want to conclude this date and complete the booking?')) return;
    setActionLoading(true);
    try {
      await api.post(`/bookings/${id}/complete`);
      setToastMsg({ text: 'Meeting completed! Earnings released to your wallet. 💰', type: 'success' });
      fetchBooking();
    } catch (e: any) {
      setToastMsg({ text: e.response?.data?.message || 'Failed to complete booking', type: 'error' });
    } finally {
      setActionLoading(false);
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

  if (loading) {
    return (
      <div className="h-[100dvh] bg-bg flex flex-col items-center justify-center text-textMain">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full" />
        </div>
        <p className="mt-4 text-sm font-bold text-muted animate-pulse">Loading Booking Details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[100dvh] bg-bg flex flex-col items-center justify-center text-textMain p-6 text-center">
        <AlertCircle size={48} className="text-failed-text mb-4 opacity-70" />
        <h2 className="text-xl font-black mb-2">Booking Not Found</h2>
        <p className="text-sm text-muted mb-6 max-w-sm">{error}</p>
        <button
          onClick={() => navigate('/p/dashboard?tab=requests')}
          className="px-6 py-3 bg-primary text-white font-bold rounded-full active:scale-95 transition-transform shadow-lg shadow-primary/25"
        >
          Back to Bookings
        </button>
      </div>
    );
  }

  if (!booking) return <Navigate to="/p/dashboard" replace />;

  const seekerName = booking.seekerId?.displayName || 'Seeker';
  const seekerInitial = seekerName.charAt(0).toUpperCase();
  const stage = booking.stage || booking.status || 'UNKNOWN';

  return (
    <div className="h-[100dvh] overflow-hidden w-full flex flex-col bg-bg text-textMain">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm animate-in slide-in-from-top-3 fade-in duration-200">
          <div className={`p-4 rounded-2xl shadow-xl flex items-center gap-3 border ${
            toastMsg.type === 'error'
              ? 'bg-failed-bg border-failed-text/30 text-failed-text'
              : 'bg-surface border-success-text/30 text-success-text'
          }`}>
            {toastMsg.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span className="text-xs font-bold leading-tight flex-1">{toastMsg.text}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-bg/90 backdrop-blur-xl border-b border-borderLight/50 pt-safe">
        <div className="h-16 px-4 md:px-8 flex items-center justify-between max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-surface border border-borderLight active:scale-95 transition-transform"
              aria-label="Back"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none">Booking Details</h1>
              <p className="text-[11px] font-semibold text-muted mt-0.5 font-mono">
                #{booking._id?.slice(-8)?.toUpperCase()}
              </p>
            </div>
          </div>

          <StageChip stage={stage as any} />
        </div>
      </header>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto px-4 md:px-8 pt-6 pb-32 scrollbar-hide max-w-4xl mx-auto w-full space-y-6">

        {/* Deep-link Action Banner */}
        {isReviewDeepLink && stage === 'REQUESTED' && (
          <div className="bg-primary/10 border-2 border-primary/30 rounded-3xl p-5 flex items-start gap-3.5 shadow-sm">
            <Sparkles size={22} className="text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-black text-sm text-primary">Pending Request Review</h3>
              <p className="text-xs text-textMain/80 leading-relaxed mt-0.5">
                Opened via notification link. Please review the booking slot and venue below, then accept or decline.
              </p>
            </div>
          </div>
        )}

        {/* HERO CARD: Seeker Info & Actions */}
        <div className="bg-surface border border-borderLight rounded-3xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-start justify-between mb-5 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-primary/20">
                {seekerInitial}
              </div>
              <div>
                <h2 className="text-xl font-black text-textMain leading-tight mb-1">{seekerName}</h2>
                <p className="text-sm text-muted font-semibold flex items-center gap-1.5">
                  <User size={14} /> Seeker Partner Request
                </p>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row gap-3 relative z-10">
            <button
              onClick={() => navigate(`/p/chat/${booking._id}`)}
              className="flex-1 h-12 flex items-center justify-center gap-2 bg-primary text-white font-bold rounded-2xl active:scale-95 transition-transform shadow-lg shadow-primary/25"
            >
              <MessageCircle size={18} /> Open Direct Chat
            </button>

            {stage === 'REQUESTED' && (
              <div className="flex flex-col gap-2 w-full sm:w-auto">
                {quickReplies.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Quick Note:</span>
                    {quickReplies.slice(0, 3).map((qr) => (
                      <button
                        key={qr._id}
                        type="button"
                        onClick={() => {
                          setToastMsg({ text: `Template attached: "${qr.title}"`, type: 'success' });
                        }}
                        className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors"
                      >
                        {qr.shortcut || qr.title}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleDecline}
                    disabled={actionLoading}
                    className="h-12 px-5 bg-bg border border-borderLight text-failed-text hover:bg-failed-bg font-bold rounded-2xl active:scale-95 transition-transform"
                  >
                    Decline
                  </button>
                  <button
                    onClick={handleAccept}
                    disabled={actionLoading}
                    className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl active:scale-95 transition-transform shadow-lg shadow-emerald-600/25 flex items-center gap-1.5"
                  >
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Accept Request
                  </button>
                </div>
              </div>
            )}

            {(stage === 'ACCEPTED' || stage === 'PAYMENT_PENDING') && (
              <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-2xl text-xs font-bold text-blue-600 dark:text-blue-400">
                <Clock size={16} className="animate-spin text-blue-500 shrink-0" />
                <span>Accepted! Waiting for seeker to complete escrow payment.</span>
              </div>
            )}

            {stage === 'PAID' && (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleTravelStatus('ON_THE_WAY')}
                    disabled={actionLoading || booking.partnerTravelStatus === 'ON_THE_WAY'}
                    className={`h-12 px-4 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                      booking.partnerTravelStatus === 'ON_THE_WAY'
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                        : 'bg-surface border border-borderLight text-textMain hover:bg-bg'
                    }`}
                  >
                    🚗 On The Way
                  </button>
                  <button
                    onClick={() => handleTravelStatus('ARRIVED')}
                    disabled={actionLoading || booking.partnerTravelStatus === 'ARRIVED'}
                    className={`h-12 px-4 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                      booking.partnerTravelStatus === 'ARRIVED'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                        : 'bg-surface border border-borderLight text-textMain hover:bg-bg'
                    }`}
                  >
                    📍 Arrived
                  </button>
                </div>
                <button
                  onClick={() => setShowOtpModal(true)}
                  className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl active:scale-95 transition-transform shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
                >
                  <KeyRound size={18} /> Start Date (Enter PIN)
                </button>
              </div>
            )}

            {stage === 'IN_PROGRESS' && (
              <button
                onClick={handleCompleteMeeting}
                disabled={actionLoading}
                className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl active:scale-95 transition-transform shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={18} />}
                Conclude Date & Complete
              </button>
            )}

            {stage === 'AWAITING_OTP' && (
              <button
                onClick={() => setShowOtpModal(true)}
                className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl active:scale-95 transition-transform shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
              >
                <KeyRound size={18} /> Enter Completion OTP
              </button>
            )}

            {stage === 'COMPLETED' && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-2xl text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>Date Completed! ₹{formatCurrency(booking.partnerNetPaise || 0)} Paid to Wallet.</span>
              </div>
            )}
          </div>
        </div>

        {/* SCHEDULE & LOCATION GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Schedule */}
          <div className="bg-surface border border-borderLight rounded-3xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Calendar size={20} />
              </div>
              <h3 className="font-black text-base">Schedule</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-bg rounded-xl p-3">
                <Calendar size={16} className="text-primary shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Date</p>
                  <p className="font-bold text-sm text-textMain">
                    {formatDate(booking.scheduledStartTime)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-bg rounded-xl p-3">
                <Clock size={16} className="text-primary shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Time</p>
                  <p className="font-bold text-sm text-textMain">
                    {booking.scheduledStartTime ? formatTime(booking.scheduledStartTime) : 'Not set'}
                    {booking.scheduledEndTime && ` — ${formatTime(booking.scheduledEndTime)}`}
                  </p>
                </div>
              </div>
              {booking.durationMins && (
                <div className="flex items-center gap-3 bg-bg rounded-xl p-3">
                  <Clock size={16} className="text-primary shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Duration</p>
                    <p className="font-bold text-sm text-textMain">
                      {booking.durationMins >= 60
                        ? `${Math.floor(booking.durationMins / 60)}h ${booking.durationMins % 60 ? (booking.durationMins % 60) + 'm' : ''}`
                        : `${booking.durationMins} mins`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Venue */}
          <div className="bg-surface border border-borderLight rounded-3xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <MapPin size={20} />
              </div>
              <h3 className="font-black text-base">Venue</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-bg rounded-xl p-3">
                <MapPin size={16} className="text-primary shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Location</p>
                  <p className="font-bold text-sm text-textMain">{booking.venueName || booking.venue || 'Public Location'}</p>
                </div>
              </div>
              {booking.venueAddress && (
                <div className="flex items-center gap-3 bg-bg rounded-xl p-3">
                  <FileText size={16} className="text-primary shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Address</p>
                    <p className="font-bold text-sm text-textMain">{booking.venueAddress}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* EARNINGS BREAKDOWN */}
        {(() => {
          const totalBookingPaise = booking.totalPricePaise ?? booking.totalPaise ?? booking.basePaise ?? 0;
          const platformFeePaise = booking.platformFeePaise ?? booking.commissionPaise ?? Math.round(totalBookingPaise * 0.2);
          const partnerNetPaise = booking.partnerNetPaise ?? (totalBookingPaise - platformFeePaise);
          const durationHours = booking.durationMins ? booking.durationMins / 60 : 2;

          return (
            <div className="bg-[#111111] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-success-text/20 rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-5">
                  <IndianRupee size={18} className="text-white/70" />
                  <h3 className="font-black text-base">Payment & Deduction Breakdown</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-white/10 rounded-xl p-3.5">
                    <div>
                      <span className="text-sm font-semibold text-white/90 block">Booking Total</span>
                      <span className="text-[10px] text-white/60">{durationHours} hr{durationHours > 1 ? 's' : ''} meetup with Seeker</span>
                    </div>
                    <span className="font-black text-lg">₹{formatCurrency(totalBookingPaise)}</span>
                  </div>

                  <div className="flex justify-between items-center bg-white/10 rounded-xl p-3.5">
                    <div>
                      <span className="text-sm font-semibold text-white/90 block">Platform Fee & Taxes</span>
                      <span className="text-[10px] text-white/60">Deducted for safety, escrow & platform services</span>
                    </div>
                    <span className="font-bold text-rose-300">−₹{formatCurrency(platformFeePaise)}</span>
                  </div>

                  <div className="border-t border-white/20 pt-3 mt-1">
                    <div className="flex justify-between items-baseline">
                      <div>
                        <span className="text-sm font-black uppercase tracking-wider text-white/90 block">Your Net Payout</span>
                        <span className="text-[10px] text-emerald-400 font-medium">Credited to wallet on OTP completion</span>
                      </div>
                      <span className="font-black text-3xl text-emerald-400">
                        ₹{formatCurrency(partnerNetPaise)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* BOOKING INFO & NOTES */}
        <div className="bg-surface border border-borderLight rounded-3xl p-5 shadow-sm">
          <h3 className="font-black text-base mb-4 flex items-center gap-2">
            <FileText size={18} className="text-primary" /> Booking Info
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-bg rounded-xl p-3">
              <span className="text-sm font-semibold text-muted">Booking Reference</span>
              <span className="font-bold text-sm text-textMain font-mono">{booking._id?.slice(-8)?.toUpperCase()}</span>
            </div>
            {booking.categoryId?.name && (
              <div className="flex justify-between items-center bg-bg rounded-xl p-3">
                <span className="text-sm font-semibold text-muted">Service Category</span>
                <span className="font-bold text-sm text-textMain">{booking.categoryId.name}</span>
              </div>
            )}
            {booking.createdAt && (
              <div className="flex justify-between items-center bg-bg rounded-xl p-3">
                <span className="text-sm font-semibold text-muted">Booked At</span>
                <span className="font-bold text-sm text-textMain">{formatDate(booking.createdAt)}</span>
              </div>
            )}
            {booking.notes && (
              <div className="bg-bg rounded-xl p-3">
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Seeker's Note</p>
                <p className="text-sm font-medium text-textMain leading-relaxed">{booking.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* SAFETY NOTICE */}
        <div className="bg-surface border border-borderLight rounded-3xl p-5 flex items-start gap-3.5 shadow-sm">
          <Shield size={22} className="text-primary shrink-0 mt-0.5" />
          <div>
            <h4 className="font-black text-sm text-textMain">Platonic Safety & Escrow Guarantee</h4>
            <p className="text-xs text-muted leading-relaxed mt-0.5">
              Never share phone numbers or exchange off-platform cash. All earnings are securely held in escrow and released to your wallet upon verification of the 4-digit seeker OTP.
            </p>
          </div>
        </div>

      </main>

      {/* OTP COMPLETION MODAL */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-sm rounded-t-[2.5rem] sm:rounded-3xl p-6 pb-safe shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
            <div className="w-12 h-1.5 bg-borderLight rounded-full mx-auto mb-6 sm:hidden" />

            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                <KeyRound size={28} />
              </div>
              <h2 className="text-2xl font-black mb-1">Enter Booking OTP</h2>
              <p className="text-xs font-semibold text-muted">
                Ask the seeker for the 4-digit completion code to finalize the meeting and receive payment.
              </p>
            </div>

            <div className="flex justify-center mb-6">
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                maxLength={4}
                placeholder="• • • •"
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full max-w-[200px] bg-bg border-2 border-borderLight focus:border-primary rounded-2xl px-4 py-4 text-center text-4xl font-black tracking-[0.4em] outline-none transition-colors"
              />
            </div>

            {otpError && (
              <p className="text-failed-text text-xs text-center font-bold mb-4 bg-failed-text/10 py-2.5 px-3 rounded-xl">
                {otpError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowOtpModal(false); setOtpValue(''); setOtpError(''); }}
                className="flex-1 h-14 bg-bg border border-borderLight text-textMain rounded-2xl font-bold active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyOtp}
                disabled={otpValue.length !== 4 || actionLoading}
                className="flex-1 h-14 bg-primary text-white rounded-2xl font-bold disabled:opacity-50 active:scale-95 transition-transform shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : 'Verify Code'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
