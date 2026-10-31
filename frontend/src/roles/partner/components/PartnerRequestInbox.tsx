import React, { useEffect, useState } from 'react';
import { Calendar, Check, X } from 'lucide-react';
import { api } from '../../../services/api';

interface Request {
  _id: string;
  seekerName: string;
  seekerPhoto?: string;
  startAt: string;
  durationMins: number;
  pricePaise: number;
  category: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
}

const formatCurrency = (paise: number) => (paise / 100).toLocaleString('en-IN');
const formatDateTime = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
};

export const PartnerRequestInbox: React.FC = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<any>('/partner/bookings');
        const list = Array.isArray(res.data) ? res.data : (res as any)?.bookings || [];
        setRequests(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAccept = async (id: string) => {
    try {
      await api.post(`/bookings/${id}/accept`);
      setRequests(prev => prev.map(r => (r._id === id ? { ...r, status: 'ACCEPTED' } : r)));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDecline = async (id: string) => {
    try {
      await api.post(`/bookings/${id}/decline`);
      setRequests(prev => prev.map(r => (r._id === id ? { ...r, status: 'DECLINED' } : r)));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><span className="text-muted">Loading requests...</span></div>;
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-2xl font-black text-textMain mb-4">No pending requests</h3>
        <p className="text-muted max-w-md mx-auto">When seekers book you, they will appear here. You can accept or decline each request within the allocated response window.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {requests.map(req => (
        <div key={req._id} className="bg-surface rounded-[2rem] border border-borderLight p-5 flex items-start gap-5 shadow-sm hover:shadow-lg transition-shadow">
          <img
            src={req.seekerPhoto || 'https://images.unsplash.com/photo-1586281380398-5efbd8c9e6f0?auto=format&fit=crop&w=80&q=80'}
            alt={req.seekerName}
            className="w-20 h-20 rounded-full object-cover"
          />
          <div className="flex-1">
            <h4 className="text-xl font-black text-textMain">{req.seekerName}</h4>
            <p className="text-muted text-sm">
              <Calendar size={14} className="inline mr-1" /> {formatDateTime(req.startAt)} • {req.durationMins} min
            </p>
            {(() => {
              const totalAmount = (req as any).totalPricePaise ?? (req as any).totalPaise ?? (req as any).basePaise ?? req.pricePaise ?? 0;
              const netPayout = (req as any).partnerNetPaise ?? Math.round(totalAmount * 0.8);
              return (
                <div className="mt-2 flex items-center gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted block">Seeker Total</span>
                    <span className="font-bold text-sm text-textMain/80">₹{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="h-4 w-[1px] bg-borderLight" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-success-text block">Your Net Earning</span>
                    <span className="font-black text-lg text-success-text">₹{formatCurrency(netPayout)}</span>
                  </div>
                </div>
              );
            })()}
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleAccept(req._id)}
              disabled={req.status !== 'PENDING'}
              className="bg-primary text-white rounded-full px-4 py-2 flex items-center gap-1 hover:opacity-90 disabled:opacity-50 transition"
            >
              <Check size={16} /> Accept
            </button>
            <button
              onClick={() => handleDecline(req._id)}
              disabled={req.status !== 'PENDING'}
              className="bg-red-600 text-white rounded-full px-4 py-2 flex items-center gap-1 hover:opacity-90 disabled:opacity-50 transition"
            >
              <X size={16} /> Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
