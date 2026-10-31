import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertCircle, CreditCard, CheckCircle, Clock } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, this would fetch from /admin/dashboard/stats
    // For now, we mock it.
    setTimeout(() => {
      setStats({
        newUsersToday: 42,
        activePartners: 156,
        activeBookings: 89,
        revenueMonth: 4500000,
        pendingKyc: 12,
        pendingApprovals: 8,
        openReports: 3
      });
      setLoading(false);
    }, 500);
  }, []);

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="animate-in fade-in space-y-8">
      <div>
        <h1 className="text-3xl font-black">Dashboard</h1>
        <p className="text-muted mt-1">Platform overview and quick actions.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 shadow-sm border-l-4 border-primary">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-muted uppercase">Revenue (MTD)</p>
              <p className="text-2xl font-black mt-1">₹{(stats.revenueMonth / 100).toLocaleString()}</p>
            </div>
            <div className="p-2 bg-primary/10 rounded-lg text-primary"><CreditCard size={20} /></div>
          </div>
        </div>
        
        <div className="card p-5 shadow-sm border-l-4 border-success-text">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-muted uppercase">Live Partners</p>
              <p className="text-2xl font-black mt-1">{stats.activePartners}</p>
            </div>
            <div className="p-2 bg-success-text/10 rounded-lg text-success-text"><CheckCircle size={20} /></div>
          </div>
        </div>

        <div className="card p-5 shadow-sm border-l-4 border-amber-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-muted uppercase">Pending Approvals</p>
              <p className="text-2xl font-black mt-1">{stats.pendingApprovals + stats.pendingKyc}</p>
            </div>
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500"><Clock size={20} /></div>
          </div>
        </div>

        <div className="card p-5 shadow-sm border-l-4 border-failed-text">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-muted uppercase">Open Reports (SOS)</p>
              <p className="text-2xl font-black mt-1">{stats.openReports}</p>
            </div>
            <div className="p-2 bg-failed-text/10 rounded-lg text-failed-text"><AlertCircle size={20} /></div>
          </div>
        </div>
      </div>

      {/* Two Column Layout for Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Needs Attention */}
        <div className="card p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><AlertCircle className="text-amber-500" /> Needs Attention</h2>
          <div className="space-y-3">
            <div className="p-3 bg-failed-bg text-failed-text rounded-xl border border-failed-text/20 flex justify-between items-center">
              <div>
                <p className="font-bold text-sm">SOS Alert - Booking #BK-8821</p>
                <p className="text-xs mt-0.5">Reported 2 mins ago by Seeker "Rahul"</p>
              </div>
              <button className="px-3 py-1 bg-failed-text text-white text-xs font-bold rounded">View</button>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex justify-between items-center text-amber-900">
              <div>
                <p className="font-bold text-sm">SLA Breach Warning</p>
                <p className="text-xs mt-0.5">5 KYC verifications pending &gt; 24 hours</p>
              </div>
              <button className="px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded">Review</button>
            </div>
            <div className="p-3 bg-surface border border-borderLight rounded-xl flex justify-between items-center">
              <div>
                <p className="font-bold text-sm">Payout Failures</p>
                <p className="text-xs text-muted mt-0.5">2 payouts failed due to invalid UPI</p>
              </div>
              <button className="px-3 py-1 bg-bg border border-borderLight font-bold text-xs rounded">Resolve</button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><TrendingUp className="text-primary" /> Live Activity</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                <div>
                  <p className="text-sm font-medium">New Partner Registration: <span className="font-bold">Priya K.</span></p>
                  <p className="text-xs text-muted">Mumbai • Just now</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
