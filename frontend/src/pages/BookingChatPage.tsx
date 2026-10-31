import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, AlertTriangle, Flag } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { SosButton } from '../components/SosButton.js';
import { ReportModal } from '../components/ReportModal.js';
import { ChatThread } from '../shared/components/ChatThread.js';

export const BookingChatPage: React.FC = () => {
  const { id: bookingId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [booking, setBooking] = useState<any | null>(null);
  const [activeSos, setActiveSos] = useState<boolean>(false);
  const [showReport, setShowReport] = useState<boolean>(false);

  useEffect(() => {
    if (!bookingId) return;
    api
      .get<any>(`/bookings/${bookingId}`)
      .then((res) => {
        if (res.data) {
          setBooking(res.data.booking || res.data);
        }
      })
      .catch((err) => console.error('Failed to load booking details', err));
  }, [bookingId]);

  const isSeeker = user?.id === booking?.clientId?._id || user?.id === booking?.clientId;
  const companionName = isSeeker
    ? booking?.partnerId?.displayName || booking?.partnerId?.name || 'Companion'
    : booking?.clientId?.fullName || booking?.clientId?.name || 'Seeker';

  const companionInitial = companionName.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden text-textMain">
      {/* ── Top Chat Header ── */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-borderLight px-4 py-2.5 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Back & Companion Profile */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 -ml-1 text-muted hover:text-textMain rounded-xl bg-slate-100 border border-borderLight active:scale-95 transition-all"
              aria-label="Go Back"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0 relative">
              {companionInitial}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white"></span>
            </div>

            <div className="min-w-0">
              <h1 className="text-sm font-bold text-textMain truncate leading-tight">{companionName}</h1>
              <div className="flex items-center gap-1.5 text-[10px] text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span>Active · Platonic Safe Chat</span>
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSos(!activeSos)}
              className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-2.5 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition-all"
              title="Emergency SOS"
            >
              <AlertTriangle size={14} />
              <span>SOS</span>
            </button>

            <button
              onClick={() => setShowReport(true)}
              className="p-1.5 text-muted hover:text-red-600 rounded-xl bg-slate-100 border border-borderLight active:scale-95 transition-all"
              title="Report User"
            >
              <Flag size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ── SOS Drawer Panel (If toggled) ── */}
      {activeSos && bookingId && (
        <div className="bg-red-50 border-b border-red-200 p-4 max-w-4xl mx-auto w-full animate-fade-in shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-red-700 font-bold text-xs">
              <AlertTriangle size={16} />
              <span>24/7 Emergency Assistance</span>
            </div>
            <button
              onClick={() => setActiveSos(false)}
              className="text-xs font-bold text-red-700 underline"
            >
              Close
            </button>
          </div>
          <SosButton bookingId={bookingId} variant="full" />
        </div>
      )}

      {/* ── Main Safe Chat Thread ── */}
      <main className="flex-1 w-full max-w-4xl mx-auto overflow-hidden flex flex-col bg-surface border-x border-borderLight shadow-sm">
        {bookingId && (
          <ChatThread
            bookingId={bookingId}
            role={isSeeker ? 'SEEKER' : 'PARTNER'}
            otherPartyName={companionName}
          />
        )}
      </main>

      {/* ── Report Modal ── */}
      {showReport && bookingId && (
        <ReportModal
          targetUserId={isSeeker ? booking?.partnerId?._id : booking?.clientId?._id}
          targetName={companionName}
          context="CHAT"
          bookingId={bookingId}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
};
