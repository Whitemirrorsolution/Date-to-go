import React, { useState } from 'react';
import { SlidersHorizontal, CheckCircle2, FileBadge, ChevronRight, X } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [showFilter, setShowFilter] = useState(false);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await (await import('../../../services/api')).api.get<any[]>('/payments/history');
      if (res.success && res.data) {
        setTransactions(res.data);
      }
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-bg">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col gap-4">
        
        {/* In-page Header */}
        <div className="flex items-center justify-between pb-2 border-b border-borderLight/60">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-textMain tracking-tight">
              Transaction History
            </h1>
            <p className="text-xs sm:text-sm font-medium text-muted mt-0.5">
              Review receipts, payments, and refunds for your companion bookings
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowFilter(true)} 
              className="p-2 sm:px-3 sm:py-1.5 bg-surface border border-borderLight rounded-xl text-primary font-bold text-xs flex items-center gap-1.5 shadow-xs hover:bg-bg active:scale-95 transition-all"
            >
              <SlidersHorizontal size={16} />
              <span className="hidden sm:inline">Filter</span>
            </button>
          </div>
        </div>

        <main className="w-full">
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
          ) : transactions.length === 0 ? (
            <div className="text-center text-muted py-16 bg-surface border border-borderLight rounded-3xl p-6">
              <p className="font-bold text-base text-textMain">No transaction history found</p>
              <p className="text-xs text-muted mt-1">Transactions will appear here once you make bookings or pass purchases.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
            {transactions.map((tx) => {
              const type = tx.purpose === 'BOOKING' ? 'Booking' : 'Membership';
              const status = tx.status === 'CAPTURED' ? 'Success' : tx.status === 'CREATED' ? 'Pending' : tx.status;
              const isSuccess = status === 'Success';
              const isPending = status === 'Pending';
              
              return (
                <button 
                  key={tx._id} 
                  onClick={() => setShowDetails(tx._id)}
                  className="card !p-0 overflow-hidden hover:shadow-md active:scale-[0.98] transition-all text-left w-full border border-borderLight/60"
                >
                  <div className="p-4 flex items-center justify-between border-b border-borderLight/50 bg-surface">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${type === 'Booking' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                        {type === 'Booking' ? <CheckCircle2 size={20} /> : <FileBadge size={20} />}
                      </div>
                      <div>
                        <h3 className="font-bold text-[15px]">{type}</h3>
                        <p className="text-xs text-muted">Order #{tx.razorpayOrderId ? tx.razorpayOrderId.slice(0, 12) + '...' : tx._id.slice(-6)}</p>
                      </div>
                    </div>
                    <div className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider
                      ${isSuccess ? 'bg-success-bg text-success-text' : 
                        isPending ? 'bg-pending-bg text-pending-text' : 
                        'bg-failed-bg text-failed-text'}`}
                    >
                      {status}
                    </div>
                  </div>
                  
                  <div className="p-4 flex justify-between items-center bg-bg/30">
                    <div>
                      <p className="text-[11px] text-muted font-medium mb-0.5">Date & Time</p>
                      <p className="text-sm font-semibold">{new Date(tx.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="text-[11px] text-muted font-medium mb-0.5">Amount</p>
                        <p className="text-[17px] font-bold text-primary">₹{(tx.amountPaise / 100).toFixed(2)}</p>
                      </div>
                      <ChevronRight size={20} className="text-muted/40" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
      </div>

      {/* Filter Bottom Sheet */}
      {showFilter && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFilter(false)} />
          <div className="relative w-full max-w-[480px] mx-auto bg-surface rounded-t-[28px] p-6 pb-safe animate-fade-in shadow-2xl">
            <div className="w-12 h-1.5 bg-borderLight rounded-full mx-auto mb-6" />
            <h2 className="text-xl font-bold mb-5">Filter Transactions</h2>
            
            <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-3">Filter by Status</h3>
            <div className="flex flex-wrap gap-2 mb-8">
              {['All Statuses', 'Success', 'Pending', 'Failed', 'Expired'].map(status => (
                <button key={status} className={`px-4 py-2 rounded-pill border text-sm font-semibold transition-colors
                  ${status === 'All Statuses' ? 'bg-primary text-white border-primary' : 'bg-surface text-textMain border-borderLight'}`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowFilter(false)} className="flex-1 py-3.5 rounded-pill font-bold bg-bg text-textMain">Clear All</button>
              <button onClick={() => setShowFilter(false)} className="flex-1 py-3.5 rounded-pill font-bold bg-primary text-white shadow-glow">Apply Filters</button>
            </div>
          </div>
        </div>
      )}

      {/* Details Bottom Sheet */}
      {showDetails && (() => {
        const tx = transactions.find(t => t._id === showDetails);
        if (!tx) return null;
        const type = tx.purpose === 'BOOKING' ? 'Booking' : 'Membership';
        const isSuccess = tx.status === 'CAPTURED';
        
        return (
          <div className="fixed inset-0 z-50 flex items-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDetails(null)} />
            <div className="relative w-full max-w-[480px] mx-auto bg-surface rounded-t-[28px] p-6 pb-safe animate-fade-in shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Transaction Details</h2>
                <button onClick={() => setShowDetails(null)} className="p-2 bg-bg rounded-full"><X size={20}/></button>
              </div>
              
              <div className="flex justify-center mb-6">
                <div className={`${isSuccess ? 'bg-success-bg text-success-text' : 'bg-pending-bg text-pending-text'} px-4 py-1.5 rounded-pill font-bold text-sm tracking-wide uppercase`}>
                  {isSuccess ? 'Success' : tx.status}
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between border-b border-borderLight pb-3">
                  <span className="text-muted">Order ID</span>
                  <span className="font-semibold">{tx.razorpayOrderId || tx._id}</span>
                </div>
                <div className="flex justify-between border-b border-borderLight pb-3">
                  <span className="text-muted">Type</span>
                  <span className="font-semibold">{type}</span>
                </div>
                <div className="flex justify-between border-b border-borderLight pb-3">
                  <span className="text-muted">Date & Time</span>
                  <span className="font-semibold">{new Date(tx.createdAt).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between border-b border-borderLight pb-3">
                  <span className="text-muted">Amount</span>
                  <span className="font-bold text-primary text-lg">₹{(tx.amountPaise / 100).toFixed(2)}</span>
                </div>
                {isSuccess && (
                  <div className="text-center pt-2">
                    <button className="text-accent font-bold text-sm underline decoration-accent/30 underline-offset-4">Download Invoice</button>
                  </div>
                )}
              </div>

              <button onClick={() => setShowDetails(null)} className="w-full py-3.5 rounded-pill font-bold bg-primary text-white shadow-glow">
                Close
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
