import React, { useState } from 'react';
import { api } from '../../../services/api';
import {
  X, Pause, Play, Trash2, DollarSign, Clock, Copy
} from 'lucide-react';

interface BulkListingsBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onRefresh: () => void;
}

export const BulkListingsBar: React.FC<BulkListingsBarProps> = ({
  selectedIds,
  onClearSelection,
  onRefresh,
}) => {
  const [loading, setLoading] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [newPriceRupees, setNewPriceRupees] = useState('');
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [deltaMinutes, setDeltaMinutes] = useState<number | ''>(30);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateDates, setDuplicateDates] = useState<string[]>([]);
  const [tempDate, setTempDate] = useState('');

  // Results state
  const [resultsModal, setResultsModal] = useState<{
    total: number;
    succeeded: string[];
    failed: Array<{ id: string; reason: string }>;
  } | null>(null);

  if (selectedIds.length === 0) return null;

  const executeBulkAction = async (payload: {
    action: 'CLOSE' | 'PAUSE' | 'RESUME' | 'DUPLICATE_DATES' | 'CHANGE_PRICE' | 'MOVE_TIME';
    pricePaise?: number;
    deltaMinutes?: number;
    targetDates?: string[];
  }) => {
    setLoading(true);
    try {
      const res = await api.post<{
        total: number;
        succeeded: string[];
        failed: Array<{ id: string; reason: string }>;
      }>('/partner/listings/bulk', {
        action: payload.action,
        listingIds: selectedIds,
        pricePaise: payload.pricePaise,
        deltaMinutes: payload.deltaMinutes,
        targetDates: payload.targetDates,
      });

      if (res.data) {
        setResultsModal(res.data);
        onRefresh();
        if (res.data.failed.length === 0) {
          onClearSelection();
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Bulk action failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePriceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const paise = Math.round(Number(newPriceRupees) * 100);
    if (isNaN(paise) || paise < 0) return;
    setShowPriceModal(false);
    executeBulkAction({ action: 'CHANGE_PRICE', pricePaise: paise });
  };

  const handleTimeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (deltaMinutes === '') return;
    setShowTimeModal(false);
    executeBulkAction({ action: 'MOVE_TIME', deltaMinutes: Number(deltaMinutes) });
  };

  const handleAddDuplicateDate = () => {
    if (!tempDate || duplicateDates.includes(tempDate)) return;
    setDuplicateDates([...duplicateDates, tempDate]);
    setTempDate('');
  };

  const handleDuplicateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (duplicateDates.length === 0) return;
    setShowDuplicateModal(false);
    executeBulkAction({ action: 'DUPLICATE_DATES', targetDates: duplicateDates });
    setDuplicateDates([]);
  };

  return (
    <>
      <div
        style={{
          position: 'sticky',
          bottom: '20px',
          zIndex: 80,
          background: '#1E293B',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
          border: '1px solid #334155',
          animation: 'fadeIn 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              background: '#7000A4',
              padding: '4px 10px',
              borderRadius: '20px',
              fontWeight: 700,
              fontSize: '0.8rem',
            }}
          >
            {selectedIds.length} Selected
          </span>
          <button
            onClick={onClearSelection}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <X size={14} /> Deselect All
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            disabled={loading}
            onClick={() => executeBulkAction({ action: 'RESUME' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '7px 12px',
              borderRadius: '8px',
              background: '#059669',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Play size={14} /> Resume (Check Conflicts)
          </button>

          <button
            disabled={loading}
            onClick={() => executeBulkAction({ action: 'PAUSE' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '7px 12px',
              borderRadius: '8px',
              background: '#D97706',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Pause size={14} /> Pause
          </button>

          <button
            disabled={loading}
            onClick={() => setShowPriceModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '7px 12px',
              borderRadius: '8px',
              background: '#334155',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <DollarSign size={14} /> Price
          </button>

          <button
            disabled={loading}
            onClick={() => setShowTimeModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '7px 12px',
              borderRadius: '8px',
              background: '#334155',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Clock size={14} /> Shift Time
          </button>

          <button
            disabled={loading}
            onClick={() => setShowDuplicateModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '7px 12px',
              borderRadius: '8px',
              background: '#7000A4',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Copy size={14} /> Duplicate Dates
          </button>

          <button
            disabled={loading}
            onClick={() => {
              if (window.confirm(`Close ${selectedIds.length} listings?`)) {
                executeBulkAction({ action: 'CLOSE' });
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '7px 12px',
              borderRadius: '8px',
              background: '#DC2626',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Trash2 size={14} /> Close
          </button>
        </div>
      </div>

      {/* Price Modal */}
      {showPriceModal && (
        <div style={modalBackdropStyle}>
          <div style={modalContentStyle}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 700 }}>Batch Change Price</h4>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#64748B' }}>
              Set new price for {selectedIds.length} selected listings. Must be within the allowable category rates.
            </p>
            <form onSubmit={handlePriceSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>
                  New Price (₹ INR)
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  placeholder="e.g. 1500"
                  value={newPriceRupees}
                  onChange={(e) => setNewPriceRupees(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowPriceModal(false)} style={cancelBtnStyle}>
                  Cancel
                </button>
                <button type="submit" style={submitBtnStyle}>
                  Apply Price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shift Time Modal */}
      {showTimeModal && (
        <div style={modalBackdropStyle}>
          <div style={modalContentStyle}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 700 }}>Batch Move Time</h4>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#64748B' }}>
              Shift time forward or backward. Conflict engine verifies buffers and travel times before shifting.
            </p>
            <form onSubmit={handleTimeSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>
                  Shift by Minutes (+ for later, - for earlier)
                </label>
                <input
                  type="number"
                  step={15}
                  required
                  value={deltaMinutes}
                  onChange={(e) => setDeltaMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowTimeModal(false)} style={cancelBtnStyle}>
                  Cancel
                </button>
                <button type="submit" style={submitBtnStyle}>
                  Shift Listings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Duplicate to Dates Modal */}
      {showDuplicateModal && (
        <div style={modalBackdropStyle}>
          <div style={modalContentStyle}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: 700 }}>Duplicate Listings to Dates</h4>
            <p style={{ margin: '0 0 14px 0', fontSize: '0.85rem', color: '#64748B' }}>
              Clone the selected {selectedIds.length} listings to upcoming calendar dates with automated conflict validation.
            </p>
            <form onSubmit={handleDuplicateSubmit}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={tempDate}
                  onChange={(e) => setTempDate(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleAddDuplicateDate}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: '#7000A4',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Add Date
                </button>
              </div>

              {/* Added Dates Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                {duplicateDates.map((d) => (
                  <span
                    key={d}
                    style={{
                      background: '#F1F5F9',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {d}
                    <X
                      size={12}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setDuplicateDates(duplicateDates.filter((x) => x !== d))}
                    />
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowDuplicateModal(false)} style={cancelBtnStyle}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={duplicateDates.length === 0}
                  style={{ ...submitBtnStyle, opacity: duplicateDates.length === 0 ? 0.5 : 1 }}
                >
                  Duplicate ({duplicateDates.length} Dates)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Partial Failure / Success Report Modal */}
      {resultsModal && (
        <div style={modalBackdropStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Bulk Action Report</h4>
              <button
                onClick={() => setResultsModal(null)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <div
                style={{
                  flex: 1,
                  background: '#DCFCE7',
                  padding: '12px',
                  borderRadius: '10px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#166534' }}>
                  {resultsModal.succeeded.length}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#166534' }}>Succeeded</div>
              </div>

              <div
                style={{
                  flex: 1,
                  background: resultsModal.failed.length > 0 ? '#FEE2E2' : '#F1F5F9',
                  padding: '12px',
                  borderRadius: '10px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: resultsModal.failed.length > 0 ? '#991B1B' : '#64748B',
                  }}
                >
                  {resultsModal.failed.length}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: resultsModal.failed.length > 0 ? '#991B1B' : '#64748B',
                  }}
                >
                  Blocked / Failed
                </div>
              </div>
            </div>

            {resultsModal.failed.length > 0 && (
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', display: 'block', marginBottom: '8px' }}>
                  Specific Conflict Explanations:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {resultsModal.failed.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: '#FEF2F2',
                        border: '1px solid #FEE2E2',
                        fontSize: '0.8rem',
                        color: '#991B1B',
                      }}
                    >
                      <strong style={{ display: 'block', marginBottom: '2px' }}>Item {f.id.slice(-6)}:</strong>
                      {f.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setResultsModal(null)}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '10px',
                borderRadius: '8px',
                background: '#1E293B',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 999,
  padding: '16px',
};

const modalContentStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '20px',
  maxWidth: '460px',
  width: '100%',
  padding: '24px',
  boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
  color: '#1E293B',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #CBD5E1',
  fontSize: '0.9rem',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '8px',
  border: '1px solid #CBD5E1',
  background: '#ffffff',
  color: '#475569',
  fontSize: '0.85rem',
  cursor: 'pointer',
};

const submitBtnStyle: React.CSSProperties = {
  padding: '8px 20px',
  borderRadius: '8px',
  border: 'none',
  background: '#7000A4',
  color: '#ffffff',
  fontWeight: 700,
  fontSize: '0.85rem',
  cursor: 'pointer',
};
