import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { api } from '../services/api.js';
import { AppHeader } from '../components/AppHeader.js';
import { Plus, MessageSquare } from 'lucide-react';

const MyTicketsList: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/support/tickets')
      .then((res: any) => setTickets(res.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-bg pb-24">
      <AppHeader title="My Tickets" />
      <main className="px-5 pt-6 flex flex-col gap-4">
        <button 
          onClick={() => navigate('/help/tickets/new')}
          className="w-full py-3 bg-primary text-white font-bold rounded-pill shadow-md flex items-center justify-center gap-2 mb-4"
        >
          <Plus size={18} /> New Ticket
        </button>

        {loading ? (
          <p className="text-center text-muted">Loading...</p>
        ) : tickets.length === 0 ? (
          <div className="card text-center p-8 flex flex-col items-center">
            <MessageSquare size={40} className="text-muted mb-4" />
            <p className="font-bold text-muted">No tickets found</p>
          </div>
        ) : (
          tickets.map(t => (
            <div key={t._id} className="card p-4 shadow-sm border border-borderLight">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-base">{t.subject}</h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.status === 'RESOLVED' ? 'bg-success-bg text-success-text' : 'bg-primary/10 text-primary'}`}>
                  {t.status}
                </span>
              </div>
              <p className="text-sm text-muted mb-3 line-clamp-2">{t.message}</p>
              
              {t.messages && t.messages.length > 1 && (
                <div className="mt-3 pt-3 border-t border-borderLight bg-surface -mx-4 -mb-4 p-4 rounded-b-2xl">
                  <p className="text-xs font-bold text-primary mb-1">Admin Reply:</p>
                  <p className="text-sm">{t.messages[t.messages.length - 1].message}</p>
                </div>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
};

const NewTicketForm: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ subject: '', category: 'OTHER', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/support/tickets', form);
      alert('Ticket submitted successfully');
      navigate('/help/tickets', { replace: true });
    } catch (err: any) {
      alert(err.message || 'Failed to submit ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg pb-24">
      <AppHeader title="Raise Ticket" />
      <main className="px-5 pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold mb-1">Category</label>
            <select 
              value={form.category} 
              onChange={e => setForm({...form, category: e.target.value})}
              className="w-full p-3 rounded-lg border border-borderLight bg-surface outline-none"
            >
              <option value="ACCOUNT">Account</option>
              <option value="BOOKING">Booking</option>
              <option value="PAYMENT">Payment</option>
              <option value="SAFETY">Safety</option>
              <option value="KYC">KYC</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Subject</label>
            <input 
              type="text" required
              value={form.subject} onChange={e => setForm({...form, subject: e.target.value})}
              placeholder="Brief description of the issue"
              className="w-full p-3 rounded-lg border border-borderLight bg-surface outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Message</label>
            <textarea 
              required rows={5}
              value={form.message} onChange={e => setForm({...form, message: e.target.value})}
              placeholder="Describe your issue in detail..."
              className="w-full p-3 rounded-lg border border-borderLight bg-surface outline-none"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-primary text-white font-bold rounded-pill shadow-md mt-4 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </form>
      </main>
    </div>
  );
};

export const TicketsPage: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MyTicketsList />} />
      <Route path="/new" element={<NewTicketForm />} />
    </Routes>
  );
};
