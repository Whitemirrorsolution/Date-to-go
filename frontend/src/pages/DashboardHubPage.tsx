import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader.js';
import { Edit2, Star, Clock, CheckCircle2, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export const DashboardHubPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isLive = user?.roles?.includes('PARTNER');

  return (
    <div className="min-h-screen bg-bg pb-24">
      <AppHeader title="Dashboard" showBack={true} />

      <main className="px-5 pt-4 flex flex-col gap-5">
        
        {/* Welcome Card */}
        <section className="card flex flex-col relative overflow-hidden">
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="w-[60px] h-[60px] rounded-full p-0.5 border-2 border-primary/30 shrink-0">
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold text-xl">
                {user?.fullName?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-textMain leading-tight">Welcome, {user?.fullName || user?.email || 'User'}</h2>
              <p className="text-xs text-muted uppercase tracking-widest font-bold mt-1">Role: {user?.roles?.[0] || 'User'}</p>
            </div>
            <button className="ml-auto p-2 bg-bg rounded-full">
              <Edit2 size={16} className="text-muted" />
            </button>
          </div>
          
          <div className="flex gap-2 relative z-10">
            <div className="bg-success-bg text-success-text px-3 py-1 rounded-pill text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Membership Active
            </div>
            {isLive ? (
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-pill text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                Profile Live
              </div>
            ) : (
              <div className="bg-pending-bg text-pending-text px-3 py-1 rounded-pill text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                Complete KYC
              </div>
            )}
          </div>
          
          {/* Decorative background element */}
          <div className="absolute right-[-10%] top-[-20%] w-32 h-32 bg-primary/5 rounded-full blur-xl pointer-events-none"></div>
        </section>

        {/* You're Live Stats Strip */}
        {isLive && (
          <section className="bg-gradient-to-r from-green-600 to-green-800 rounded-3xl p-5 text-white shadow-float flex justify-between items-center">
            <div className="text-center w-1/3 border-r border-white/20">
              <p className="text-[10px] text-white/70 uppercase tracking-wider font-bold mb-1">Avg Rate</p>
              <p className="text-lg font-bold">₹1k/hr</p>
            </div>
            <div className="text-center w-1/3 border-r border-white/20">
              <p className="text-[10px] text-white/70 uppercase tracking-wider font-bold mb-1">Rating</p>
              <div className="flex items-center justify-center gap-1">
                <Star size={14} fill="currentColor" className="text-yellow-400" />
                <p className="text-lg font-bold">4.9 <span className="text-xs text-white/70 font-normal">(42)</span></p>
              </div>
            </div>
            <div className="text-center w-1/3">
              <p className="text-[10px] text-white/70 uppercase tracking-wider font-bold mb-1">Status</p>
              <p className="text-lg font-bold flex items-center justify-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Live
              </p>
            </div>
          </section>
        )}

        {/* Gradient Action Cards */}
        <section className="flex flex-col gap-4">
          <div className="w-full bg-gradient-to-br from-primary to-accent rounded-3xl p-6 text-white relative overflow-hidden shadow-float">
            <div className="relative z-10">
              <h2 className="text-2xl font-bold leading-tight mb-2">Find a Partner</h2>
              <p className="text-sm opacity-90 mb-5 max-w-[80%]">Purchase a service and book verified platonic partners for your needs.</p>
              <div className="flex gap-3">
                <button onClick={() => navigate('/pricing')} className="bg-white text-primary px-5 py-2.5 rounded-pill font-bold text-sm active:scale-95 transition-transform shadow-sm">
                  Buy Services
                </button>
                <button onClick={() => navigate('/home')} className="bg-white/20 backdrop-blur-sm text-white px-5 py-2.5 rounded-pill font-bold text-sm active:scale-95 transition-transform">
                  Browse
                </button>
              </div>
            </div>
            <Users className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
          </div>

          <div className="w-full bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 text-white relative overflow-hidden shadow-float">
            <div className="relative z-10">
              <h2 className="text-2xl font-bold leading-tight mb-2">Become a Partner</h2>
              <p className="text-sm opacity-90 mb-5 max-w-[80%]">Start earning by offering your platonic companionship services to others.</p>
              <div className="flex gap-3">
                <button onClick={() => navigate('/pricing')} className="bg-white text-orange-600 px-5 py-2.5 rounded-pill font-bold text-sm active:scale-95 transition-transform shadow-sm">
                  Get Started
                </button>
                <button onClick={() => navigate('/booking')} className="bg-white/20 backdrop-blur-sm text-white px-5 py-2.5 rounded-pill font-bold text-sm active:scale-95 transition-transform">
                  My Bookings
                </button>
              </div>
            </div>
            <Clock className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
          </div>
        </section>

      </main>
    </div>
  );
};
