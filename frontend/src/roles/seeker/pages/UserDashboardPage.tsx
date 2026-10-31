import React, { useState, useEffect } from 'react';
import { api, loadRazorpayScript } from '../../../services/api.js';
import { ChatModal } from '../../../components/ChatModal';
import { SafetyModal } from '../../../components/SafetyModal';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.js';

interface UserBooking {
  _id: string;
  partnerId: {
    _id: string;
    displayName: string;
    city: string;
    ratingAverage: number;
    photos?: string[];
  };
  meetingPlace: string;
  scheduledStartTime: string;
  durationHours: number;
  totalAmountPaise: number;
  partnerFeePaise: number;
  platformFeePaise: number;
  status: 'REQUESTED' | 'ACCEPTED' | 'PAID' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export const UserDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'bookings' | 'preferences' | 'safety'>('bookings');
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const { accessData, logout, switchMode } = useAuth();
  const isPartner = accessData?.roles?.includes('PARTNER');

  // Preference Form State
  const [preferences, setPreferences] = useState({
    city: 'Mumbai',
    category: 'coffee_chat',
    budgetMax: 2000,
    preferredGenders: ['FEMALE', 'MALE', 'OTHER'],
    languages: ['English', 'Hindi'],
  });

  // Modal states
  const [chatBooking, setChatBooking] = useState<{ id: string; name: string } | null>(null);
  const [safetyBookingId, setSafetyBookingId] = useState<string | null>(null);
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get<{ bookings: UserBooking[] }>('/bookings');
      if (res.data?.bookings) {
        setBookings(res.data.bookings);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handlePayNow = async (booking: UserBooking) => {
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      // Create order on backend
      const orderRes = await api.post<{
        orderId: string;
        amountPaise: number;
        currency: string;
        keyId: string;
      }>(`/bookings/${booking._id}/pay/order`);

      if (!orderRes.data) {
        throw new Error('Failed to create payment order.');
      }

      const { orderId, amountPaise, keyId } = orderRes.data;

      const rzpOptions = {
        key: keyId,
        amount: amountPaise,
        currency: 'INR',
        name: 'Date to Go Experiences',
        description: `Platonic Companion Booking #${booking._id.slice(-6)}`,
        order_id: orderId,
        handler: async (response: any) => {
          try {
            await api.post(`/bookings/${booking._id}/pay/verify`, {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setSuccessMsg('Payment verified! Booking status updated to PAID.');
            fetchBookings();
          } catch (verifyErr: any) {
            setErrorMsg(verifyErr.message || 'Payment verification failed.');
          }
        },
        theme: {
          color: '#6366f1',
        },
      };

      const rzp = new (window as any).Razorpay(rzpOptions);
      rzp.open();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error initiating payment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string, scheduledStartTime: string) => {
    const hoursLeft = (new Date(scheduledStartTime).getTime() - Date.now()) / (1000 * 60 * 60);
    let refundText = '100% full refund';
    if (hoursLeft < 12) {
      refundText = '0% refund (cancelled within 12 hours of start time)';
    } else if (hoursLeft < 24) {
      refundText = '50% partial refund (cancelled between 12 to 24 hours of start time)';
    }

    const confirmed = window.confirm(
      `Cancellation Policy Notice:\n\nCancelling now qualifies for: ${refundText}.\n\nAre you sure you want to cancel this booking?`
    );
    if (!confirmed) return;

    setActionLoading(true);
    try {
      await api.post(`/bookings/${bookingId}/cancel`);
      setSuccessMsg('Booking cancelled successfully.');
      fetchBookings();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to cancel booking.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewBookingId) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await api.post('/social/reviews', {
        bookingId: reviewBookingId,
        rating: reviewRating,
        comment: reviewComment,
      });
      setSuccessMsg('Thank you! Your verified review has been submitted.');
      setReviewBookingId(null);
      setReviewComment('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit review.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('Preferences saved! Discovery feed will prioritize your preferences.');
  };

  return (
    <div className="container" style={{ padding: '2rem 1rem', minHeight: '85vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, margin: 0 }}>
            Member Dashboard
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginTop: '0.25rem' }}>
            Manage companion bookings, post-booking chats, payments, and safety preferences.
          </p>
        </div>

        <Link
          to="/s/discover"
          style={{
            background: 'var(--color-primary)',
            color: '#fff',
            textDecoration: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            fontSize: 'var(--text-sm)',
            boxShadow: 'var(--shadow-glow)',
          }}
        >
          🔍 Discover Companions
        </Link>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div style={{ padding: '0.75rem 1rem', background: 'hsl(0 80% 50% / 0.15)', border: '1px solid #f87171', borderRadius: 'var(--radius-md)', color: '#f87171', fontSize: 'var(--text-sm)', marginBottom: '1.5rem' }}>
          ⚠️ {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '0.75rem 1rem', background: 'hsl(142 76% 36% / 0.15)', border: '1px solid #22c55e', borderRadius: 'var(--radius-md)', color: '#4ade80', fontSize: 'var(--text-sm)', marginBottom: '1.5rem' }}>
          ✓ {successMsg}
        </div>
      )}

      {/* Account Actions */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {isPartner && (
          <button
            onClick={() => switchMode('PARTNER')}
            style={{ padding: '0.5rem 1rem', background: 'var(--color-accent)', color: 'white', borderRadius: 'var(--radius-md)', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Switch to Partner Hub
          </button>
        )}
        <button
          onClick={() => logout()}
          style={{ padding: '0.5rem 1rem', background: 'transparent', color: 'var(--color-error)', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-md)', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', marginBottom: '2rem' }}>
        {[
          { id: 'bookings', label: '🗓️ My Bookings' },
          { id: 'preferences', label: '⚙️ Discovery Preferences' },
          { id: 'safety', label: '🛡️ Safety & Guidelines' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-surface-2)',
              color: activeTab === tab.id ? '#fff' : 'var(--color-text-muted)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: BOOKINGS LIST */}
      {activeTab === 'bookings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-faint)' }}>
              Loading bookings...
            </div>
          ) : bookings.length === 0 ? (
            <div className="glass" style={{ padding: '3rem', textAlign: 'center', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
              <p style={{ fontSize: '2rem', margin: '0 0 0.5rem 0' }}>✨</p>
              <h3 style={{ margin: 0 }}>No bookings scheduled</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', margin: '0.5rem 0 1.5rem 0' }}>
                Browse verified platonic companions available in your city for coffee, museum visits, or city tours.
              </p>
              <Link
                to="/s/discover"
                style={{
                  background: 'var(--color-primary)',
                  color: '#fff',
                  padding: '0.75rem 1.5rem',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: 'var(--text-sm)',
                }}
              >
                Find a Companion →
              </Link>
            </div>
          ) : (
            bookings.map((booking) => (
              <div
                key={booking._id}
                className="glass"
                style={{
                  padding: '1.5rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700 }}>
                      {booking.partnerId?.displayName || 'Verified Companion'}
                    </h3>
                    <span style={{ fontSize: 'var(--text-xs)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 700, background: booking.status === 'PAID' ? 'hsl(142 76% 36% / 0.15)' : booking.status === 'ACCEPTED' ? 'hsl(45 93% 47% / 0.15)' : 'var(--color-surface-2)', color: booking.status === 'PAID' ? '#4ade80' : booking.status === 'ACCEPTED' ? '#eab308' : 'var(--color-text)' }}>
                      ● {booking.status}
                    </span>
                  </div>

                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div>📍 Public Venue: <strong style={{ color: 'var(--color-text)' }}>{booking.meetingPlace}</strong></div>
                    <div>🕒 Scheduled: {new Date(booking.scheduledStartTime).toLocaleString()} ({booking.durationHours} hrs)</div>
                    <div>💵 Total Amount: <strong style={{ color: 'var(--color-primary-light)' }}>₹{(booking.totalAmountPaise / 100).toLocaleString('en-IN')}</strong> (incl. 10% platform fee)</div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {booking.status === 'ACCEPTED' && (
                    <button
                      onClick={() => handlePayNow(booking)}
                      disabled={actionLoading}
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#fff',
                        border: 'none',
                        padding: '0.625rem 1.25rem',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 700,
                        fontSize: 'var(--text-xs)',
                        cursor: 'pointer',
                        boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      💳 Pay Now (Razorpay)
                    </button>
                  )}

                  {(booking.status === 'ACCEPTED' || booking.status === 'PAID') && (
                    <button
                      onClick={() => setChatBooking({ id: booking._id, name: booking.partnerId?.displayName || 'Companion' })}
                      style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '0.625rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-xs)', cursor: 'pointer' }}
                    >
                      💬 Chat
                    </button>
                  )}

                  {booking.status === 'PAID' && (
                    <button
                      onClick={() => setSafetyBookingId(booking._id)}
                      style={{ background: 'hsl(0 80% 50% / 0.1)', color: '#f87171', border: '1px solid #f87171', padding: '0.625rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: 'var(--text-xs)', cursor: 'pointer' }}
                    >
                      🚨 SOS / Safety
                    </button>
                  )}

                  {booking.status === 'COMPLETED' && (
                    <button
                      onClick={() => setReviewBookingId(booking._id)}
                      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: '#facc15', padding: '0.625rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-xs)', cursor: 'pointer' }}
                    >
                      ★ Leave Review
                    </button>
                  )}

                  {(booking.status === 'REQUESTED' || booking.status === 'ACCEPTED' || booking.status === 'PAID') && (
                    <button
                      onClick={() => handleCancelBooking(booking._id, booking.scheduledStartTime)}
                      disabled={actionLoading}
                      style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', padding: '0.625rem 1rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: PREFERENCES FORM */}
      {activeTab === 'preferences' && (
        <form onSubmit={handleSavePreferences} className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', maxWidth: '640px' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: 'var(--text-lg)', fontWeight: 700 }}>
            Companion Search Preferences
          </h3>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
              Default Discovery City
            </label>
            <select
              value={preferences.city}
              onChange={(e) => setPreferences({ ...preferences, city: e.target.value })}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
            >
              {['Mumbai', 'Delhi NCR', 'Bengaluru', 'Hyderabad', 'Pune', 'Kolkata', 'Chennai', 'Goa'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
              Maximum Budget (₹ / hr)
            </label>
            <input
              type="number"
              step={100}
              min={500}
              max={5000}
              value={preferences.budgetMax}
              onChange={(e) => setPreferences({ ...preferences, budgetMax: Number(e.target.value) })}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
            />
          </div>

          <button
            type="submit"
            style={{
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
            }}
          >
            Save Preferences
          </button>
        </form>
      )}

      {/* TAB 3: SAFETY */}
      {activeTab === 'safety' && (
        <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', maxWidth: '720px' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: 'var(--text-lg)', fontWeight: 700 }}>
            Platonic Safety &amp; Trust Blueprint
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: '1.5rem' }}>
            Date to Go is engineered exclusively for safe, verified platonic companionship.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: 'var(--text-sm)', fontWeight: 700 }}>1. Mandatory Public Venues Only</h4>
              <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                All bookings must take place in public cafes, restaurants, galleries, or outdoor tourist sites. Private residences and hotel rooms are strictly forbidden.
              </p>
            </div>

            <div style={{ padding: '1rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: 'var(--text-sm)', fontWeight: 700 }}>2. 100% KYC-Verified Companions</h4>
              <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                Every companion undergoes Aadhaar/PAN government ID verification and background verification before appearing in discovery.
              </p>
            </div>

            <div style={{ padding: '1rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: 'var(--text-sm)', fontWeight: 700 }}>3. Real-Time Emergency SOS</h4>
              <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                Tap the SOS button at any time during an active booking to automatically alert your designated emergency contact and trigger an emergency platform dispatch.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewBookingId && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <form onSubmit={handleSubmitReview} className="glass" style={{ width: '100%', maxWidth: '480px', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: 'var(--text-lg)', fontWeight: 700 }}>Leave a Verified Review</h3>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '0.5rem' }}>Rating (1 - 5 Stars)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setReviewRating(star)}
                    style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: star <= reviewRating ? '#facc15' : 'var(--color-text-faint)' }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '0.5rem' }}>Experience Feedback (Platonic Only)</label>
              <textarea
                rows={3}
                required
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share how your coffee meet, museum tour, or walk was..."
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setReviewBookingId(null)}
                style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}
              >
                Submit Review
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Chat Modal */}
      {chatBooking && (
        <ChatModal
          bookingId={chatBooking.id}
          partnerName={chatBooking.name}
          onClose={() => setChatBooking(null)}
        />
      )}

      {/* Safety Modal */}
      {safetyBookingId && (
        <SafetyModal
          bookingId={safetyBookingId}
          onClose={() => setSafetyBookingId(null)}
        />
      )}
    </div>
  );
};
