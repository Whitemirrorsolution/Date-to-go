import React, { useState } from 'react';
import { api } from '../services/api.js';

type ReportContext = 'PROFILE' | 'BOOKING' | 'CHAT' | 'REVIEW';
type ReportReason =
  | 'SEXUAL_SOLICITATION' | 'CONTACT_SHARING' | 'PAYMENT_BYPASS'
  | 'HARASSMENT' | 'FRAUD' | 'INAPPROPRIATE_CONTENT' | 'SAFETY_CONCERN'
  | 'NO_SHOW' | 'VENUE_VIOLATION' | 'UNDERAGE' | 'DRUG_ALCOHOL' | 'OTHER';

interface ReportModalProps {
  targetUserId: string;
  targetName: string;
  context: ReportContext;
  bookingId?: string | undefined;
  messageId?: string | undefined;
  onClose: () => void;
}

const REASON_LABELS: Record<ReportReason, string> = {
  SEXUAL_SOLICITATION: 'Sexual / Romantic Solicitation',
  CONTACT_SHARING: 'Sharing Personal Contact Info',
  PAYMENT_BYPASS: 'Attempting Payment Outside App',
  HARASSMENT: 'Harassment / Threatening Behaviour',
  FRAUD: 'Fake Profile / Impersonation / Scam',
  INAPPROPRIATE_CONTENT: 'Inappropriate Bio or Photos',
  SAFETY_CONCERN: 'I Felt Unsafe',
  NO_SHOW: "Didn't Show Up",
  VENUE_VIOLATION: 'Non-Public / Unsafe Meeting Place',
  UNDERAGE: 'Appears to be Under 18',
  DRUG_ALCOHOL: 'Alcohol / Drug Incident',
  OTHER: 'Other',
};

export const ReportModal: React.FC<ReportModalProps> = ({
  targetUserId, targetName, context, bookingId, messageId, onClose,
}) => {
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;
    setLoading(true);
    setError(null);
    try {
      await api.post('/safety/report', {
        targetUserId,
        context,
        reason,
        details,
        bookingId,
        messageId,
      });
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="glass"
        style={{
          width: '100%', maxWidth: '480px',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        {done ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Report Submitted</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Our safety team will review this within the defined SLA. Thank you for keeping the community safe.
            </p>
            <button
              id="report-done-btn"
              onClick={onClose}
              style={{ padding: '0.75rem 2rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 700, cursor: 'pointer' }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0 }}>Report {targetName}</h3>
              <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}>×</button>
            </div>

            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
              Reason *
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
              {(Object.entries(REASON_LABELS) as [ReportReason, string][]).map(([val, label]) => (
                <label
                  key={val}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.6rem 0.75rem',
                    background: reason === val ? 'rgba(var(--color-primary-rgb), 0.15)' : 'var(--color-surface-2)',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${reason === val ? 'var(--color-primary)' : 'transparent'}`,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={val}
                    checked={reason === val}
                    onChange={() => setReason(val)}
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  {label}
                </label>
              ))}
            </div>

            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
              Details (optional but helpful)
            </label>
            <textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe what happened..."
              rows={4}
              style={{
                width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                color: 'var(--color-text)', resize: 'vertical', fontFamily: 'inherit',
                fontSize: '0.875rem', boxSizing: 'border-box', marginBottom: '1rem',
              }}
            />

            {error && (
              <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>
            )}

            <button
              id="report-submit-btn"
              type="submit"
              disabled={!reason || loading}
              style={{
                width: '100%', padding: '0.875rem',
                background: reason ? '#ef4444' : 'var(--color-surface-2)',
                color: reason ? 'white' : 'var(--color-text-muted)',
                border: 'none', borderRadius: 'var(--radius-md)',
                fontWeight: 700, cursor: reason ? 'pointer' : 'not-allowed',
                fontSize: '0.95rem',
              }}
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
