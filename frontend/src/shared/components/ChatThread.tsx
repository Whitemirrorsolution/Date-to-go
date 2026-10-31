import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../../config/index.js';
import {
  Send, ShieldCheck, AlertTriangle, Lock, Clock,
  CheckCheck, Sparkles, AlertCircle
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { ReportModal } from '../../components/ReportModal.js';

export interface ChatMessage {
  _id?: string;
  bookingId: string;
  senderId: string;
  recipientId?: string;
  kind?: 'TEXT' | 'QUICK_REPLY' | 'SYSTEM' | 'LOCATION_PIN';
  text: string;
  quickReplyKey?: string;
  flagged?: boolean;
  deliveredAt?: string;
  createdAt?: string;
}

export interface ChatWindowPermissions {
  status: 'LOCKED' | 'OPEN' | 'READ_ONLY' | 'CLOSED';
  canSendText: boolean;
  canSendQuickReply: boolean;
  maxChars: number;
  remainingNotes?: number;
  notice: string;
}

export interface QuickReplyItem {
  key: string;
  textEn: string;
  textHi: string;
  phases: string[];
}

interface ChatThreadProps {
  bookingId: string;
  role: 'SEEKER' | 'PARTNER';
  otherPartyName?: string;
  onClose?: () => void;
}

export const ChatThread: React.FC<ChatThreadProps> = ({
  bookingId,
  role: _role = 'SEEKER',
  otherPartyName = 'Partner',
  onClose,
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [text, setText] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [permissions, setPermissions] = useState<ChatWindowPermissions | null>(null);
  const [templates, setTemplates] = useState<QuickReplyItem[]>([]);
  const [lang, setLang] = useState<'EN' | 'HI'>('EN');
  const [showReport, setShowReport] = useState<boolean>(false);
  const [nudgeMessage, setNudgeMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat window state and messages
  const loadChatData = async () => {
    try {
      setLoading(true);
      const [windowRes, msgRes] = await Promise.all([
        api.get<{ status: any; permissions: ChatWindowPermissions; templates: QuickReplyItem[] }>(
          `/bookings/${bookingId}/messages/window`
        ),
        api.get<ChatMessage[]>(`/bookings/${bookingId}/messages`),
      ]);

      if (windowRes.success && windowRes.data) {
        setPermissions(windowRes.data.permissions);
        setTemplates(windowRes.data.templates || []);
      }

      if (msgRes.success && Array.isArray(msgRes.data)) {
        setMessages(msgRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load chat data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChatData();

    // Setup Socket.io connection for real-time delivery
    const socket = io(SOCKET_URL, { path: '/socket.io' });
    socketRef.current = socket;

    socket.emit('join_booking_chat', bookingId);

    socket.on('receive_message', (msg: ChatMessage) => {
      setMessages((prev) => {
        if (msg._id && prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on('chat.message', (msg: ChatMessage) => {
      setMessages((prev) => {
        if (msg._id && prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [bookingId]);

  // Send Direct Text
  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || sending) return;

    const trimmed = text.trim();
    const maxChars = permissions?.maxChars || 300;

    if (trimmed.length > maxChars) {
      setNudgeMessage(`Message exceeds max limit of ${maxChars} characters.`);
      return;
    }

    try {
      setSending(true);
      setNudgeMessage(null);

      const res = await api.post<ChatMessage>(`/bookings/${bookingId}/messages`, {
        kind: 'TEXT',
        text: trimmed,
      });

      if (res.success && res.data) {
        setMessages((prev) => [...prev, res.data!]);
        setText('');
        // Refresh permissions if in REQUESTED mode (note spent)
        if (permissions?.remainingNotes !== undefined) {
          loadChatData();
        }
      } else {
        setNudgeMessage(res.message || 'Unable to send message.');
      }
    } catch (err: any) {
      setNudgeMessage(err?.message || 'For your safety, contact details or links cannot be shared.');
    } finally {
      setSending(false);
    }
  };

  // Send Quick Reply
  const handleSendTemplate = async (template: QuickReplyItem) => {
    if (sending) return;

    try {
      setSending(true);
      setNudgeMessage(null);

      const res = await api.post<ChatMessage>(`/bookings/${bookingId}/messages`, {
        kind: 'QUICK_REPLY',
        quickReplyKey: template.key,
      });

      if (res.success && res.data) {
        setMessages((prev) => [...prev, res.data!]);
      }
    } catch (err: any) {
      setNudgeMessage(err?.message || 'Failed to send quick reply.');
    } finally {
      setSending(false);
    }
  };

  const isLocked = permissions?.status === 'LOCKED' && !permissions?.canSendText;
  const isReadOnly = permissions?.status === 'READ_ONLY' || permissions?.status === 'CLOSED';
  const charLimit = permissions?.maxChars || 300;
  const charsRemaining = charLimit - text.length;

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden text-textMain">
      {/* ── Top Safety Notice Banner ── */}
      <div className="bg-amber-50 border-b border-amber-200/70 px-4 py-2.5 flex items-start justify-between gap-3 shrink-0">
        <div className="flex items-start gap-2">
          <ShieldCheck size={16} className="text-amber-700 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-tight text-amber-900 font-medium">
            <span className="font-bold">Safety Guarantee: </span>
            Chat is for coordinating your meeting. Messages are scanned. Sharing off-app contacts or paying outside the app removes your escrow protection.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReport(true)}
            className="text-[11px] font-bold text-amber-800 hover:text-red-600 underline shrink-0 whitespace-nowrap"
          >
            Report off-app
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs text-amber-900 font-bold px-1.5 py-0.5 rounded hover:bg-amber-100"
              aria-label="Close chat"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Chat Window Status Bar ── */}
      {permissions && (
        <div className="px-4 py-1.5 bg-surface border-b border-borderLight flex items-center justify-between text-xs text-muted shrink-0">
          <div className="flex items-center gap-1.5">
            {permissions.status === 'OPEN' ? (
              <span className="flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Chat Active
              </span>
            ) : permissions.status === 'LOCKED' ? (
              <span className="flex items-center gap-1 text-amber-600 font-bold text-[11px]">
                <Lock size={12} />
                Partially Locked
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-500 font-bold text-[11px]">
                <Clock size={12} />
                Read-Only
              </span>
            )}
            <span className="text-borderLight">|</span>
            <span className="truncate max-w-[240px] sm:max-w-md">{permissions.notice}</span>
          </div>

          {/* Quick reply language switcher */}
          {templates.length > 0 && permissions.canSendQuickReply && (
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-borderLight text-[10px] font-bold">
              <button
                onClick={() => setLang('EN')}
                className={`px-1.5 py-0.5 rounded ${lang === 'EN' ? 'bg-primary text-white shadow-xs' : 'text-muted'}`}
              >
                EN
              </button>
              <button
                onClick={() => setLang('HI')}
                className={`px-1.5 py-0.5 rounded ${lang === 'HI' ? 'bg-primary text-white shadow-xs' : 'text-muted'}`}
              >
                हिन्दी
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Anti-Circumvention Friendly Nudge Modal/Banner ── */}
      {nudgeMessage && (
        <div className="mx-4 mt-2 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 shadow-sm animate-fade-in shrink-0">
          <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-rose-900">Security Nudge</p>
            <p className="mt-0.5">{nudgeMessage}</p>
          </div>
          <button
            onClick={() => setNudgeMessage(null)}
            className="text-rose-500 hover:text-rose-800 font-bold text-sm px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Message Thread List ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="w-7 h-7 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary mb-3">
              <Sparkles size={24} />
            </div>
            <h4 className="font-bold text-sm text-textMain">Coordinate safely</h4>
            <p className="text-xs text-muted max-w-xs mx-auto mt-1">
              Say hello or use the quick templates below to confirm meeting venue and arrival details.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === user?.id;

            if (msg.kind === 'SYSTEM') {
              return (
                <div key={msg._id || index} className="flex justify-center my-2">
                  <span className="text-[11px] bg-slate-200 text-slate-700 px-3 py-1 rounded-full font-medium shadow-2xs">
                    {msg.text}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg._id || index}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
              >
                <div
                  className={`max-w-[82%] sm:max-w-md px-4 py-2.5 rounded-2xl text-xs shadow-xs relative ${
                    isMe
                      ? 'bg-gradient-to-r from-primary to-accent text-white rounded-br-xs'
                      : 'bg-surface border border-borderLight text-textMain rounded-bl-xs'
                  }`}
                >
                  {/* Quick Reply Badge */}
                  {msg.kind === 'QUICK_REPLY' && (
                    <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mb-1 ${
                      isMe ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                    }`}>
                      ⚡ Template
                    </span>
                  )}

                  <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>

                  {/* Flag indicator for moderation */}
                  {msg.flagged && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-300 font-medium">
                      <AlertTriangle size={11} /> Flagged for review
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                    isMe ? 'text-white/70' : 'text-muted'
                  }`}>
                    <span>
                      {msg.createdAt
                        ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : ''}
                    </span>
                    {isMe && <CheckCheck size={11} />}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Quick Reply Templates Carousel / Chips ── */}
      {templates.length > 0 && permissions?.canSendQuickReply && !isReadOnly && (
        <div className="bg-surface/90 backdrop-blur-xs border-t border-borderLight px-3 py-2 shrink-0">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={11} className="text-primary" /> Quick Coordination Replies
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {templates.map((tpl) => (
              <button
                key={tpl.key}
                onClick={() => handleSendTemplate(tpl)}
                disabled={sending}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-slate-100 hover:bg-primary/10 border border-slate-200 hover:border-primary/30 text-xs font-semibold text-textMain hover:text-primary transition-all active:scale-95 shrink-0 shadow-2xs"
              >
                {lang === 'HI' ? tpl.textHi : tpl.textEn}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Bottom Input Composer ── */}
      <div className="p-3 bg-surface border-t border-borderLight shrink-0">
        {isReadOnly ? (
          <div className="text-center py-2 text-xs text-muted font-medium bg-slate-100 rounded-xl">
            This conversation is closed. Issue reporting remains active above.
          </div>
        ) : isLocked ? (
          <div className="text-center py-2 text-xs text-muted font-medium bg-amber-50/70 border border-amber-200/50 rounded-xl px-3 flex items-center justify-center gap-2">
            <Lock size={14} className="text-amber-700" />
            <span>Direct typing unlocks after booking payment. Please use the quick templates above.</span>
          </div>
        ) : (
          <form onSubmit={handleSendText} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Message ${otherPartyName}...`}
                maxLength={charLimit}
                className="flex-1 bg-slate-100 border border-borderLight focus:border-primary focus:bg-white rounded-pill px-4 py-2.5 text-xs text-textMain outline-none transition-all shadow-inner"
              />
              <button
                type="submit"
                disabled={!text.trim() || sending}
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all shrink-0"
                aria-label="Send"
              >
                <Send size={16} />
              </button>
            </div>

            {/* Character counter */}
            <div className="flex justify-between items-center px-2 text-[10px] text-muted">
              <span>Plain text only (no links/phones)</span>
              <span className={charsRemaining < 30 ? (charsRemaining < 0 ? 'text-red-600 font-bold' : 'text-amber-600 font-bold') : ''}>
                {text.length}/{charLimit}
              </span>
            </div>
          </form>
        )}
      </div>

      {/* ── Report Modal ── */}
      {showReport && (
        <ReportModal
          targetUserId={messages.find((m) => m.senderId !== user?.id)?.senderId || bookingId}
          targetName={otherPartyName}
          context="CHAT"
          bookingId={bookingId}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
};
