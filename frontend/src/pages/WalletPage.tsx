import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, History, Clock } from 'lucide-react';
import { walletApi, type WalletLedgerEntry } from '../services/wallet.js';

export const WalletPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [balancePaise, setBalancePaise] = useState(0);
  const [ledger, setLedger] = useState<WalletLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWallet = async () => {
    try {
      const bal = await walletApi.getBalance();
      setBalancePaise(bal);
      
      const { records } = await walletApi.getLedger(10);
      setLedger(records);
    } catch (err) {
      console.error('Failed to fetch wallet', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  return (
    <div className="bg-bg min-h-screen text-textMain pb-20">
      <header className="bg-surface sticky top-0 z-10 px-4 py-4 flex items-center shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-textMain active:bg-borderLight rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold ml-2">Wallet</h1>
      </header>

      <main className="p-4 space-y-6">
        <section className="card bg-gradient-to-br from-primaryDark to-primary text-white border-none shadow-float p-6">
          <p className="text-sm text-white/80 uppercase tracking-wider mb-2 font-medium">Available Balance</p>
          <p className="text-5xl font-black mb-6">₹{(balancePaise / 100).toFixed(2)}</p>
          <div className="flex gap-4">
            <button 
              onClick={() => navigate('/wallet/topup')}
              className="flex-1 bg-white text-primary font-bold py-3 rounded-xl shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Add Money
            </button>
          </div>
        </section>

        <section className="card">
          <div className="flex justify-between items-center p-4 border-b border-borderLight">
            <h3 className="font-bold flex items-center gap-2 text-lg">
              <History size={20} className="text-accent" />
              Recent Transactions
            </h3>
            <button className="text-primary text-sm font-bold active:opacity-70 transition-opacity">
              View All
            </button>
          </div>
          <div className="p-2">
            {isLoading ? (
              <div className="text-center py-8 text-muted">Loading...</div>
            ) : ledger.length === 0 ? (
              <div className="text-center py-10">
                <Clock size={40} className="mx-auto text-muted/30 mb-3" />
                <p className="text-muted font-medium">No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {ledger.map((entry) => (
                  <div key={entry._id} className="flex justify-between items-center p-3 rounded-xl hover:bg-bg transition-colors">
                    <div>
                      <p className="font-bold text-textMain">{entry.reason}</p>
                      <p className="text-xs text-muted mt-1">{new Date(entry.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${['CREDIT', 'REFUND'].includes(entry.type) ? 'text-green-600' : 'text-textMain'}`}>
                        {['CREDIT', 'REFUND'].includes(entry.type) ? '+' : '-'}₹{Math.abs(entry.amountPaise / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted mt-1">Bal: ₹{(entry.balanceAfterPaise / 100).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
