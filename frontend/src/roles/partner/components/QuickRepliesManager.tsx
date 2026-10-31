import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import {
  MessageSquare, Plus, Edit3, Trash2, CheckCircle2, Copy
} from 'lucide-react';

export type QuickReplyType = 'ACCEPT_NOTE' | 'DECLINE_REASON' | 'CHAT_REPLY';

export interface QuickReplyItem {
  _id: string;
  type: QuickReplyType;
  title: string;
  content: string;
  shortcut?: string;
  order: number;
  isDefault: boolean;
  useCount: number;
}

export const QuickRepliesManager: React.FC = () => {
  const [replies, setReplies] = useState<QuickReplyItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | QuickReplyType>('ALL');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReply, setEditingReply] = useState<QuickReplyItem | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<QuickReplyType>('CHAT_REPLY');
  const [shortcut, setShortcut] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchReplies();
  }, []);

  const fetchReplies = async () => {
    setLoading(true);
    try {
      const res = await api.get<QuickReplyItem[]>('/partner/quick-replies');
      setReplies(res.data || []);
    } catch (e: any) {
      console.error('Failed to load quick replies', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredReplies = replies.filter((r) =>
    activeFilter === 'ALL' ? true : r.type === activeFilter
  );

  const handleOpenCreate = () => {
    setEditingReply(null);
    setTitle('');
    setContent('');
    setType(activeFilter === 'ALL' ? 'CHAT_REPLY' : activeFilter);
    setShortcut('');
    setIsDefault(false);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (reply: QuickReplyItem) => {
    setEditingReply(reply);
    setTitle(reply.title);
    setContent(reply.content);
    setType(reply.type);
    setShortcut(reply.shortcut || '');
    setIsDefault(!!reply.isDefault);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await api.delete(`/partner/quick-replies/${id}`);
      setReplies((prev) => prev.filter((r) => r._id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setErrorMsg('Title and template message content are required');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      if (editingReply) {
        const res = await api.put<QuickReplyItem>(`/partner/quick-replies/${editingReply._id}`, {
          title,
          content,
          type,
          shortcut: shortcut.trim() ? (shortcut.startsWith('/') ? shortcut : `/${shortcut}`) : undefined,
          isDefault,
        });
        if (res.data) {
          setReplies((prev) =>
            prev.map((r) => (r._id === editingReply._id ? res.data! : r))
          );
        }
      } else {
        const res = await api.post<QuickReplyItem>('/partner/quick-replies', {
          title,
          content,
          type,
          shortcut: shortcut.trim() ? (shortcut.startsWith('/') ? shortcut : `/${shortcut}`) : undefined,
          isDefault,
        });
        if (res.data) {
          setReplies((prev) => [...prev, res.data!]);
        }
      }
      setShowModal(false);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save template. Please ensure it follows platonic rules.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '20px 24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <MessageSquare size={20} color="#818CF8" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Quick Replies & Notes</h2>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.9 }}>
            Save reusable responses for accept notes, polite decline reasons, and frequently sent chat updates.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            background: '#ffffff',
            color: '#312E81',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.875rem',
          }}
        >
          <Plus size={16} />
          New Template
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
        {[
          { key: 'ALL', label: 'All Templates' },
          { key: 'ACCEPT_NOTE', label: 'Accept Notes' },
          { key: 'DECLINE_REASON', label: 'Decline Reasons' },
          { key: 'CHAT_REPLY', label: 'Chat Quick Replies' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key as any)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeFilter === tab.key ? '#7000A4' : 'transparent',
              color: activeFilter === tab.key ? '#ffffff' : '#475569',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>Loading templates...</div>
      ) : filteredReplies.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '2px dashed #CBD5E1',
            padding: '40px 20px',
            textAlign: 'center',
          }}
        >
          <MessageSquare size={32} color="#94A3B8" style={{ marginBottom: '10px' }} />
          <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#334155' }}>No templates in this category</h4>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#64748B' }}>
            Save time replying to date requests by creating shortcuts and standard notes.
          </p>
          <button
            onClick={handleOpenCreate}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#7000A4',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Add Template
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
          {filteredReplies.map((item) => (
            <div
              key={item._id}
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background:
                          item.type === 'ACCEPT_NOTE'
                            ? '#DCFCE7'
                            : item.type === 'DECLINE_REASON'
                            ? '#FEE2E2'
                            : '#EDE9FE',
                        color:
                          item.type === 'ACCEPT_NOTE'
                            ? '#166534'
                            : item.type === 'DECLINE_REASON'
                            ? '#991B1B'
                            : '#6B21A8',
                      }}
                    >
                      {item.type.replace('_', ' ')}
                    </span>
                    {item.shortcut && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontFamily: 'monospace',
                          background: '#F1F5F9',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          color: '#475569',
                        }}
                      >
                        {item.shortcut}
                      </span>
                    )}
                  </div>

                  <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Used {item.useCount || 0}x</span>
                </div>

                <h4 style={{ margin: '10px 0 6px 0', fontSize: '0.95rem', fontWeight: 700, color: '#1E293B' }}>
                  {item.title}
                </h4>

                <p
                  style={{
                    margin: 0,
                    fontSize: '0.85rem',
                    color: '#475569',
                    lineHeight: '1.4',
                    whiteSpace: 'pre-line',
                  }}
                >
                  "{item.content}"
                </p>
              </div>

              {/* Actions Footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '14px',
                  borderTop: '1px solid #F1F5F9',
                  paddingTop: '10px',
                }}
              >
                <button
                  onClick={() => handleCopy(item._id, item.content)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'none',
                    border: 'none',
                    color: copiedId === item._id ? '#16A34A' : '#7000A4',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {copiedId === item._id ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  {copiedId === item._id ? 'Copied!' : 'Copy Text'}
                </button>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => handleOpenEdit(item)}
                    style={{
                      background: 'none',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    <Edit3 size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(item._id)}
                    style={{
                      background: 'none',
                      border: '1px solid #FEE2E2',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      color: '#DC2626',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 14px 0', fontSize: '1.15rem', fontWeight: 700, color: '#1E293B' }}>
              {editingReply ? 'Edit Quick Reply' : 'New Quick Reply Template'}
            </h3>

            {errorMsg && (
              <div
                style={{
                  background: '#FEE2E2',
                  color: '#991B1B',
                  padding: '10px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  marginBottom: '14px',
                }}
              >
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Template Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as QuickReplyType)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="CHAT_REPLY">Chat Quick Reply</option>
                  <option value="ACCEPT_NOTE">Accept Note (Seeker notification on accept)</option>
                  <option value="DECLINE_REASON">Decline Reason</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Title / Label *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Venue meetup instructions"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Template Message *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Type the message template here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                  }}
                />
                <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'block', marginTop: '3px' }}>
                  Strictly platonic. Contact info and personal handles are prohibited.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Shortcut (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. /cafe or /running-late"
                  value={shortcut}
                  onChange={(e) => setShortcut(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#7000A4',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  {saving ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
