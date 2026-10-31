import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';

interface SafetyModalProps {
  bookingId?: string;
  onClose: () => void;
}

export const SafetyModal: React.FC<SafetyModalProps> = ({ bookingId, onClose }) => {
  const [tips, setTips] = useState<string[]>([]);
  const [shareLink, setShareLink] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [sosTriggered, setSosTriggered] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [sosError, setSosError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch safety tips
    api.get<{ tips: string[] }>('/safety/tips')
      .then((res) => {
        if (res.data?.tips) setTips(res.data.tips);
      })
      .catch(() => {
        setTips([
          'Always meet in a verified, public place (e.g. coffee shop, mall, museum).',
          'Never share personal contact info, home addresses, or social handles.',
          'Keep all payments and interactions strictly on the Date to Go platform.',
          'Share your live booking details link with a family member or trusted friend before the meeting.',
          'In any uncomfortable situation, leave immediately and use the emergency SOS button.',
        ]);
      });

    if (bookingId) {
      api.get<{ shareUrl: string }>(`/safety/share-link/${bookingId}`)
        .then((res) => {
          if (res.data?.shareUrl) setShareLink(res.data.shareUrl);
        })
        .catch(() => {
          setShareLink(`${window.location.origin}/safety/track/${bookingId}`);
        });
    }
  }, [bookingId]);

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleTriggerSOS = async () => {
    if (!bookingId) {
      setSosError('No active booking specified for SOS.');
      return;
    }
    const confirmed = window.confirm(
      '🚨 EMERGENCY SOS CONFIRMATION\n\nThis will immediately dispatch an SMS with your live booking venue and companion details to your designated emergency contact and alert the Date to Go Safety Rapid Response Team.\n\nDo you want to proceed?'
    );
    if (!confirmed) return;

    setSosLoading(true);
    setSosError(null);
    try {
      await api.post('/safety/sos', { bookingId });
      setSosTriggered(true);
    } catch (err: any) {
      setSosError(err.message || 'Failed to dispatch SOS alert. Please dial 112 or local emergency services immediately.');
    } finally {
      setSosLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="glass animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '540px',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🛡️</span>
            <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 700 }}>Safety &amp; Emergency Hub</h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              fontSize: '1.25rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* SOS Alert Section */}
        {bookingId && (
          <div
            style={{
              background: 'hsl(0 80% 50% / 0.1)',
              border: '1px solid hsl(0 80% 50% / 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              textAlign: 'center',
            }}
          >
            {sosTriggered ? (
              <div style={{ color: '#4ade80' }}>
                <p style={{ fontSize: '1.75rem', margin: '0 0 0.5rem 0' }}>✅</p>
                <h4 style={{ margin: 0, fontWeight: 700 }}>Emergency SOS Dispatched</h4>
                <p style={{ fontSize: 'var(--text-xs)', marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>
                  SMS sent to your registered emergency contact and an alert has been escalated to Date to Go Admin Dispatch.
                </p>
              </div>
            ) : (
              <>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#f87171', fontWeight: 700 }}>
                  🚨 Emergency Assistance
                </h4>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: '0 0 1rem 0' }}>
                  Pressing SOS sends your active booking venue and companion details to your emergency contact and alerts the platform dispatch.
                </p>
                <button
                  onClick={handleTriggerSOS}
                  disabled={sosLoading}
                  style={{
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    padding: '0.875rem 1.5rem',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 700,
                    fontSize: 'var(--text-sm)',
                    cursor: sosLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 0 20px rgba(220, 38, 38, 0.4)',
                    width: '100%',
                  }}
                >
                  {sosLoading ? 'Dispatching Emergency Alert...' : '🔴 Trigger Instant SOS'}
                </button>
                {sosError && (
                  <p style={{ color: '#f87171', fontSize: 'var(--text-xs)', marginTop: '0.5rem' }}>
                    {sosError}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Share Booking Section */}
        {bookingId && (
          <div
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
              🔗 Share Live Booking Link
            </h4>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: '0 0 0.75rem 0' }}>
              Share this secure tracking link with a friend or family member for peace of mind.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                readOnly
                value={shareLink || 'Generating link...'}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  fontSize: 'var(--text-xs)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-muted)',
                }}
              />
              <button
                onClick={handleCopyLink}
                style={{
                  background: copied ? '#10b981' : 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {copied ? 'Copied! ✓' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {/* Platonic Community Rules & Safety Tips */}
        <div>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
            🛡️ Platform Safety Protocol
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {tips.map((tip, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-muted)',
                  background: 'var(--color-surface-2)',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span style={{ color: 'var(--color-primary-light)', fontWeight: 700 }}>✓</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: '1.5rem',
            width: '100%',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
          }}
        >
          Close Safety Window
        </button>
      </div>
    </div>
  );
};
