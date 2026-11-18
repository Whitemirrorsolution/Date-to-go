import React, { useEffect, useState, useMemo } from 'react';
import { Calendar, Check, X, Loader2, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../services/api';

interface Request {
  _id: string;
  seekerName?: string;
  seekerPhoto?: string;
  startAt: string;
  endAt?: string;
  durationMins: number;
  venueName?: string;
  venueAddress?: string;
  pricePaise?: number;
  totalPricePaise?: number;
  totalPaise?: number;
  partnerNetPaise?: number;
  category?: any;
  categoryId?: any;
  clientId?: any;
  stage?: string;
  status?: string;
}

const formatCurrency = (paise: number) => (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const formatDateTime = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return dateStr;
  }
};

interface PartnerRequestInboxProps {
  onActionSuccess?: () => void;
}

export const PartnerRequestInbox: React.FC<PartnerRequestInboxProps> = ({ onActionSuccess }) => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'accept' | 'decline' | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [filterTab, setFilterTab] = useState<'pending' | 'all'>('pending');
  const [recentlyActedIds, setRecentlyActedIds] = useState<string[]>([]);

  const fetchRequests = async () => {
    try {
      const res = await api.get<any>('/partner/bookings');
      const list: Request[] = Array.isArray(res.data) ? res.data : (res as any)?.bookings || [];
      setRequests(list);
    } catch (e: any) {
      console.error('Failed to load bookings:', e);
      setToast({ message: e?.message || 'Failed to load booking requests', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const isPending = (r: Request) => {
    const s = (r.stage || r.status || '').toUpperCase();
    return s === 'REQUESTED' || s === 'PENDING';
  };

  const pendingRequests = useMemo(() => requests.filter(r => isPending(r) || recentlyActedIds.includes(r._id)), [requests, recentlyActedIds]);
  const displayedRequests = useMemo(() => {
    if (filterTab === 'pending') return pendingRequests;
    return requests;
  }, [filterTab, pendingRequests, requests]);

  const handleAccept = async (id: string) => {
    setProcessingId(id);
    setActionType('accept');
    try {
      try {
        await api.post(`/partner/bookings/${id}/accept`);
      } catch (err1) {
        // Fallback to core bookings router
        await api.post(`/bookings/${id}/accept`);
      }

      setRecentlyActedIds(prev => [...prev, id]);
      setRequests(prev =>
        prev.map(r => (r._id === id ? { ...r, stage: 'ACCEPTED', status: 'ACCEPTED' } : r))
      );
      setToast({ message: 'Booking request accepted! 🎉 The seeker has been notified to complete payment.', type: 'success' });
      onActionSuccess?.();
    } catch (e: any) {
      console.error('Failed to accept booking:', e);
      setToast({ message: e?.message || 'Failed to accept booking. Please try again.', type: 'error' });
    } finally {
      setProcessingId(null);
      setActionType(null);
    }
  };

  const handleDecline = async (id: string) => {
    if (!window.confirm('Are you sure you want to decline this booking request?')) {
      return;
    }

    setProcessingId(id);
    setActionType('decline');
    try {
      try {
        await api.post(`/partner/bookings/${id}/decline`);
      } catch (err1) {
        // Fallback to core bookings router
        await api.post(`/bookings/${id}/decline`);
      }

      setRecentlyActedIds(prev => [...prev, id]);
      setRequests(prev =>
        prev.map(r => (r._id === id ? { ...r, stage: 'DECLINED', status: 'DECLINED' } : r))
      );
      setToast({ message: 'Booking request declined. The slot has been reopened.', type: 'success' });
      onActionSuccess?.();
    } catch (e: any) {
      console.error('Failed to decline booking:', e);
      setToast({ message: e?.message || 'Failed to decline booking. Please try again.', type: 'error' });
    } finally {
      setProcessingId(null);
      setActionType(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
        <span className="text-muted text-sm font-semibold">Loading requests...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      {/* Header and Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-borderLight/60">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-textMain tracking-tight">Booking Requests</h2>
          <p className="text-sm text-muted font-medium mt-0.5">
            Manage incoming meetup requests and respond within your window.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-surface p-1 rounded-2xl border border-borderLight self-start sm:self-auto">
          <button
            onClick={() => setFilterTab('pending')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterTab === 'pending'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted hover:text-textMain'
            }`}
          >
            Pending ({pendingRequests.length})
          </button>
          <button
            onClick={() => setFilterTab('all')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterTab === 'all'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted hover:text-textMain'
            }`}
          >
            All History ({requests.length})
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-4 rounded-2xl border text-sm flex items-start justify-between gap-3 shadow-md animate-in slide-in-from-top-2 ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-600'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {toast.type === 'success' ? (
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
            )}
            <span className="font-semibold">{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-xs font-bold underline opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Requests List */}
      {displayedRequests.length === 0 ? (
        <div className="bg-surface rounded-3xl border border-dashed border-borderLight p-10 sm:p-14 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-xl font-black text-textMain mb-2">
            {filterTab === 'pending' ? 'No pending requests' : 'No requests found'}
          </h3>
          <p className="text-muted text-sm max-w-md mx-auto">
            {filterTab === 'pending'
              ? 'When seekers book your open listings, they will appear here for you to accept or decline.'
              : 'No booking history is available yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedRequests.map(req => {
            const currentStage = (req.stage || req.status || 'REQUESTED').toUpperCase();
            const actionable = currentStage === 'REQUESTED' || currentStage === 'PENDING';
            const isProcessing = processingId === req._id;

            const totalAmount =
              req.totalPricePaise ?? req.totalPaise ?? req.pricePaise ?? 0;
            const netPayout =
              req.partnerNetPaise ?? Math.round(totalAmount * 0.8);

            const displayName =
              req.seekerName ||
              (req.clientId as any)?.fullName ||
              (req.clientId as any)?.email?.split('@')[0] ||
              'Seeker';

            const photoUrl =
              req.seekerPhoto ||
              (req.clientId as any)?.avatar ||
              (req.clientId as any)?.photo;

            return (
              <div
                key={req._id}
                className="bg-surface rounded-3xl border border-borderLight p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center gap-5 justify-between"
              >
                <div className="flex items-start gap-4">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={displayName}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover shrink-0 border border-borderLight"
                    />
                  ) : (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 text-primary font-black text-xl flex items-center justify-center shrink-0">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-lg font-black text-textMain truncate">
                        {displayName}
                      </h4>
                      {actionable ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          Pending Request
                        </span>
                      ) : currentStage === 'ACCEPTED' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                          Accepted
                        </span>
                      ) : currentStage === 'DECLINED' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                          Declined
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          {currentStage}
                        </span>
                      )}
                    </div>

                    <p className="text-muted text-xs sm:text-sm font-semibold mt-1 flex items-center gap-1.5 flex-wrap">
                      <Calendar size={14} className="shrink-0 text-primary" />
                      <span>{formatDateTime(req.startAt)}</span>
                      <span>•</span>
                      <span>{req.durationMins || 60} mins</span>
                      {req.venueName && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[200px]">{req.venueName}</span>
                        </>
                      )}
                    </p>

                    <div className="mt-3 flex items-center gap-4 flex-wrap">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted block">
                          Seeker Total
                        </span>
                        <span className="font-bold text-sm text-textMain/80">
                          ₹{formatCurrency(totalAmount)}
                        </span>
                      </div>
                      <div className="h-5 w-[1px] bg-borderLight" />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-success-text block">
                          Your Net Earning
                        </span>
                        <span className="font-black text-base sm:text-lg text-success-text">
                          ₹{formatCurrency(netPayout)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 self-end md:self-center shrink-0 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-borderLight/60">
                  {actionable ? (
                    <>
                      <button
                        onClick={() => handleAccept(req._id)}
                        disabled={isProcessing}
                        className="flex-1 md:flex-none h-11 px-5 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold text-sm shadow-md shadow-primary/25 flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isProcessing && actionType === 'accept' ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Check size={16} strokeWidth={2.5} />
                        )}
                        <span>Accept</span>
                      </button>

                      <button
                        onClick={() => handleDecline(req._id)}
                        disabled={isProcessing}
                        className="flex-1 md:flex-none h-11 px-4 rounded-xl bg-surface hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isProcessing && actionType === 'decline' ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <X size={16} strokeWidth={2.5} />
                        )}
                        <span>Decline</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => navigate(`/p/booking/${req._id}`)}
                      className="h-10 px-4 rounded-xl bg-surface border border-borderLight text-textMain hover:border-primary/50 font-bold text-xs flex items-center gap-1.5 transition-all"
                    >
                      <span>View Details</span>
                      <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
