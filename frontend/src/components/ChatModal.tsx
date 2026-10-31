import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.js';

interface ChatModalProps {
  bookingId: string;
  partnerName?: string;
  onClose: () => void;
}

interface MessageItem {
  _id: string;
  senderId: string;
  text: string;
  flagged?: boolean;
  createdAt: string;
}

export const ChatModal: React.FC<ChatModalProps> = ({ bookingId, partnerName, onClose }) => {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await api.get<any>(`/bookings/${bookingId}/messages`)
        .catch(() => api.get<any>(`/chat/${bookingId}/messages`))
        .catch(() => null);
      const list = res?.data?.messages || res?.data || res;
      if (Array.isArray(list)) {
        setMessages((prev) => {
          if (list.length === 0) return prev;
          return list;
        });
      }
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to load chat messages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [bookingId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    setSending(true);
    setErrorMsg(null);
    try {
      let res: any = null;
      try {
        res = await api.post<any>(`/bookings/${bookingId}/messages`, { text: inputText.trim() });
      } catch (err1) {
        res = await api.post<any>(`/chat/${bookingId}/messages`, { text: inputText.trim() });
      }
      const newMsg = res?.data?.message || res?.data || res;
      if (newMsg && (newMsg._id || newMsg.text)) {
        setMessages((prev) => [...prev, newMsg]);
        setInputText('');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Message blocked: Platonic policy violation.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
          maxWidth: '560px',
          height: '650px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          background: 'var(--color-surface)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-surface-2)',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 600 }}>
              💬 Chat with {partnerName || 'Companion'}
            </h3>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
              Booking #{bookingId.slice(-6)} · 100% Platonic Code Active
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              fontSize: '1.25rem',
              cursor: 'pointer',
              padding: '0.25rem',
            }}
          >
            ✕
          </button>
        </div>

        {/* Platonic Advisory Notice */}
        <div
          style={{
            background: 'hsl(255 100% 65% / 0.08)',
            borderBottom: '1px solid var(--color-border)',
            padding: '0.5rem 1rem',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-primary-light)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>🛡️</span>
          <span>
            Strictly platonic. Sharing phone numbers, emails, social handles, or off-platform payment info is blocked automatically.
          </span>
        </div>

        {/* Message Stream */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-faint)' }}>
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
              <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>👋</p>
              <p style={{ fontWeight: 600, margin: 0 }}>Start the conversation!</p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                Coordinate arrival times and venue directions.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg._id}
                style={{
                  alignSelf: 'flex-start',
                  maxWidth: '80%',
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  position: 'relative',
                }}
              >
                <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                  {msg.text}
                </p>
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--color-text-faint)',
                    marginTop: '0.35rem',
                    textAlign: 'right',
                  }}
                >
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error / Moderation Warning */}
        {errorMsg && (
          <div
            style={{
              padding: '0.5rem 1rem',
              background: 'hsl(0 80% 50% / 0.15)',
              borderTop: '1px solid hsl(0 80% 50% / 0.3)',
              color: '#f87171',
              fontSize: 'var(--text-xs)',
              fontWeight: 500,
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Input Form */}
        <form
          onSubmit={handleSend}
          style={{
            padding: '1rem',
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-surface-2)',
            display: 'flex',
            gap: '0.75rem',
          }}
        >
          <input
            type="text"
            placeholder="Type a platonic message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={sending}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: 'var(--text-sm)',
            }}
          />
          <button
            type="submit"
            disabled={sending || !inputText.trim()}
            style={{
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              padding: '0.75rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              cursor: sending || !inputText.trim() ? 'not-allowed' : 'pointer',
              opacity: sending || !inputText.trim() ? 0.6 : 1,
            }}
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};
