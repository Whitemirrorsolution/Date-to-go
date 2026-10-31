import React, { useState } from 'react';
import { api } from '../../../services/api';
import { Clock, Check } from 'lucide-react';

interface AvailabilityBuffersCardProps {
  initialBefore?: number;
  initialAfter?: number;
  onSaved?: () => void;
}

export const AvailabilityBuffersCard: React.FC<AvailabilityBuffersCardProps> = ({
  initialBefore = 30,
  initialAfter = 30,
  onSaved,
}) => {
  const [bufferBefore, setBufferBefore] = useState(initialBefore);
  const [bufferAfter, setBufferAfter] = useState(initialAfter);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSavedSuccess(false);

    try {
      await api.patch('/partner/profile', {
        bufferMinutesBefore: Number(bufferBefore),
        bufferMinutesAfter: Number(bufferAfter),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      if (onSaved) onSaved();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update buffer settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '20px 24px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <Clock size={20} color="#7000A4" />
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1E293B' }}>
          Schedule Buffers & Transit Protection
        </h3>
      </div>
      <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#64748B' }}>
        Protect your personal time between dates. Our conflict engine automatically enforces these buffers and calculates estimated travel time between venues before permitting a booking.
      </p>

      {errorMsg && (
        <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '14px' }}>
          {errorMsg}
        </div>
      )}

      {savedSuccess && (
        <div style={{ background: '#DCFCE7', color: '#166534', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Check size={16} /> Buffer preferences saved successfully!
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Buffer Before Booking (mins)
            </label>
            <input
              type="number"
              min={0}
              max={120}
              step={5}
              value={bufferBefore}
              onChange={(e) => setBufferBefore(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.9rem',
              }}
            />
            <span style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '3px', display: 'block' }}>
              Minimum transit/prep window before start
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Buffer After Booking (mins)
            </label>
            <input
              type="number"
              min={0}
              max={120}
              step={5}
              value={bufferAfter}
              onChange={(e) => setBufferAfter(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.9rem',
              }}
            />
            <span style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '3px', display: 'block' }}>
              Decompression / return transit window
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '9px 20px',
              borderRadius: '8px',
              border: 'none',
              background: '#7000A4',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            {saving ? 'Saving...' : 'Save Buffer Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
