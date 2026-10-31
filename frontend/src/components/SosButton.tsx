import React, { useState } from 'react';
import { api } from '../services/api.js';

interface SosButtonProps {
  bookingId?: string;
  variant?: 'full' | 'compact';
}

const EMERGENCY_NUMBERS = [
  { label: 'Police', number: '100', icon: '🚔' },
  { label: 'National Emergency', number: '112', icon: '🚨' },
  { label: "Women's Helpline", number: '1091', icon: '👩' },
  { label: 'Date to Go Safety', number: '1800-DTG-SAFE', icon: '🛡️' },
];

export const SosButton: React.FC<SosButtonProps> = ({ bookingId, variant = 'full' }) => {
  const [state, setState] = useState<'idle' | 'confirm' | 'sent' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);

  const handleSos = async () => {
    if (state === 'idle') {
      setState('confirm');
      return;
    }

    try {
      const res = await api.post<{ data: any }>('/safety/sos', { bookingId });
      setResult(res.data?.data ?? res.data);
      setState('sent');
    } catch (err: any) {
      setState('error');
    }
  };

  const handleShareLink = async () => {
    if (!bookingId) return;
    setShareLoading(true);
    try {
      const res = await api.post<{ data: { url: string } }>('/safety/share-link', { bookingId });
      setShareLink(res.data?.data?.url ?? '');
      navigator.clipboard.writeText(res.data?.data?.url ?? '').catch(() => {});
    } catch (err: any) {
      alert('Failed to generate share link');
    } finally {
      setShareLoading(false);
    }
  };

  if (variant === 'compact') {
    return (
      <button
        id="sos-compact-btn"
        onClick={handleSos}
        style={{
          background: state === 'sent' ? '#22c55e' : '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '48px',
          height: '48px',
          fontSize: '1.25rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: state !== 'sent' ? '0 0 0 4px rgba(239,68,68,0.3)' : 'none',
          animation: state !== 'sent' ? 'pulse 2s infinite' : 'none',
          flexShrink: 0,
        }}
        title="Emergency SOS"
      >
        {state === 'sent' ? '✓' : '🆘'}
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* SOS Button */}
      <div
        style={{
          background: state === 'sent' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)',
          border: `2px solid ${state === 'sent' ? '#22c55e' : '#ef4444'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
        }}
      >
        {state === 'idle' && (
          <>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              Tap SOS to instantly alert your emergency contact and our safety team.
            </p>
            <button
              id="sos-trigger-btn"
              onClick={handleSos}
              style={{
                width: '100%',
                padding: '1rem',
                background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '1rem',
                fontWeight: 800,
                cursor: 'pointer',
                letterSpacing: '0.05em',
                boxShadow: '0 4px 15px rgba(239,68,68,0.4)',
              }}
            >
              🆘 EMERGENCY SOS
            </button>
          </>
        )}

        {state === 'confirm' && (
          <>
            <p style={{ margin: '0 0 1rem 0', fontWeight: 700, color: '#ef4444' }}>
              ⚠️ Confirm SOS?
            </p>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              This will immediately alert your emergency contact and our safety team. Only confirm if you need help.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                id="sos-confirm-btn"
                onClick={handleSos}
                style={{ flex: 1, padding: '0.75rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 700, cursor: 'pointer' }}
              >
                Yes, Send SOS
              </button>
              <button
                id="sos-cancel-btn"
                onClick={() => setState('idle')}
                style={{ flex: 1, padding: '0.75rem', background: 'var(--color-surface-2)', color: 'var(--color-text)', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {state === 'sent' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 700, color: '#22c55e' }}>SOS Dispatched!</p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              {result?.emergencyContactNotified
                ? 'Emergency contact notified with your location.'
                : 'Safety team alerted. Set up an emergency contact in profile for SMS alerts.'}
            </p>
          </div>
        )}

        {state === 'error' && (
          <p style={{ margin: 0, color: '#ef4444', textAlign: 'center' }}>
            Failed to send SOS. Call <strong>112</strong> immediately.
          </p>
        )}
      </div>

      {/* Emergency Numbers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        {EMERGENCY_NUMBERS.map(({ label, number, icon }) => (
          <a
            key={number}
            href={`tel:${number}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem',
              background: 'var(--color-surface-2)',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              color: 'var(--color-text)',
              fontSize: '0.8rem',
              fontWeight: 600,
              border: '1px solid var(--color-border)',
            }}
          >
            <span>{icon}</span>
            <div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>{label}</div>
              <div style={{ fontWeight: 800 }}>{number}</div>
            </div>
          </a>
        ))}
      </div>

      {/* Share Booking Link */}
      {bookingId && (
        <div style={{ padding: '1rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <p style={{ margin: '0 0 0.75rem 0', fontWeight: 600, fontSize: '0.9rem' }}>
            📤 Share Booking with Trusted Contact
          </p>
          {shareLink ? (
            <div>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#22c55e', wordBreak: 'break-all' }}>
                ✓ Copied to clipboard: {shareLink}
              </p>
            </div>
          ) : (
            <button
              id="safety-share-link-btn"
              onClick={handleShareLink}
              disabled={shareLoading}
              style={{
                width: '100%',
                padding: '0.6rem',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                cursor: shareLoading ? 'wait' : 'pointer',
                fontSize: '0.85rem',
              }}
            >
              {shareLoading ? 'Generating...' : '🔗 Generate Share Link'}
            </button>
          )}
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            Link shows your booking details (no login needed). Expires when booking ends.
          </p>
        </div>
      )}
    </div>
  );
};
