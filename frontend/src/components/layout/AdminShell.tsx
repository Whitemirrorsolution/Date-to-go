import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Users, CheckCircle, FileText, Settings, LogOut, LayoutDashboard, AlertTriangle, MessageSquare, CreditCard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const AdminShell: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { id: 'users', icon: Users, label: 'Users', path: '/admin/users' },
    { id: 'approvals', icon: CheckCircle, label: 'Approvals', path: '/admin/approvals' },
    { id: 'kyc', icon: FileText, label: 'KYC Review', path: '/admin/kyc' },
    { id: 'disputes', icon: AlertTriangle, label: 'Disputes & Reports', path: '/admin/disputes' },
    { id: 'finance', icon: CreditCard, label: 'Finance', path: '/admin/finance' },
    { id: 'support', icon: MessageSquare, label: 'Support Tickets', path: '/admin/support' },
    { id: 'settings', icon: Settings, label: 'Settings', path: '/admin/settings' },
  ];

  return (
    <div className="flex h-screen bg-bg text-textMain overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-borderLight flex flex-col hidden md:flex shrink-0">
        <div className="p-6 border-b border-borderLight">
          <h2 className="text-xl font-black flex items-center gap-2 text-primary">
            <Shield size={24} /> Admin Portal
          </h2>
          <p className="text-xs text-muted mt-1 uppercase font-bold tracking-wider">Super Admin</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== '/admin');
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium text-sm ${isActive ? 'bg-primary text-white' : 'text-muted hover:bg-bg hover:text-textMain'}`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            )
          })}
        </nav>
        
        <div className="p-4 border-t border-borderLight">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {(user as any)?.displayName?.charAt(0) || 'A'}
            </div>
            <div>
              <p className="font-bold text-sm">{user?.fullName || 'Admin User'}</p>
              <p className="text-xs text-muted">{user?.email || user?.phone || 'admin@datetogo.com'}</p>
            </div>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-2 justify-center py-2 px-4 rounded-xl text-failed-text hover:bg-failed-text/10 transition-colors text-sm font-bold">
            <LogOut size={16} /> Logout
          </button>
          <button onClick={() => navigate('/')} className="w-full mt-2 flex items-center gap-2 justify-center py-2 px-4 rounded-xl text-primary hover:bg-primary/10 transition-colors text-sm font-bold border border-primary/20">
            <LayoutDashboard size={16} /> User View
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Nav Warning (Admin should ideally be desktop) */}
      <div className="md:hidden fixed inset-0 z-50 bg-bg p-8 flex flex-col items-center justify-center text-center">
        <Shield size={64} className="text-primary mb-4" />
        <h2 className="text-2xl font-bold mb-2">Desktop Required</h2>
        <p className="text-muted">The Admin Portal is designed for desktop screens. Please log in from a computer to manage the platform.</p>
        <button onClick={logout} className="mt-8 px-6 py-3 bg-surface border border-borderLight rounded-xl font-bold">Log out</button>
      </div>
    </div>
  );
};
