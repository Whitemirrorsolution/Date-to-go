import React, { useState, useEffect } from 'react';
import { 
  X, User, Shield, CreditCard, Calendar, AlertTriangle, 
  CheckCircle, Wallet, Award, 
  FileText, Activity, DollarSign, RefreshCw, Edit3, Save
} from 'lucide-react';
import { api } from '../../services/api.js';

interface AdminUserDetailsModalProps {
  userId: string;
  onClose: () => void;
  onUserUpdated?: () => void;
}

type DetailTab = 'overview' | 'partner' | 'wallet' | 'bookings' | 'payments' | 'safety' | 'audit';

export const AdminUserDetailsModal: React.FC<AdminUserDetailsModalProps> = ({
  userId,
  onClose,
  onUserUpdated,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [data, setData] = useState<any>(null);

  // Edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: '',
    city: '',
    gender: 'OTHER',
    emailVerified: false,
    phoneVerified: false,
    kycStatus: 'NOT_STARTED',
  });

  // Wallet adjustment state
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState<'ADD' | 'DEDUCT'>('ADD');
  const [adjustReason, setAdjustReason] = useState('');
  const [walletLoading, setWalletLoading] = useState(false);

  // Role update state
  const [selectedRole, setSelectedRole] = useState<'SEEKER' | 'PARTNER' | 'ADMIN'>('SEEKER');
  const [selectedMode, setSelectedMode] = useState<'SEEKER' | 'PARTNER'>('SEEKER');

  const fetchUserDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<any>(`/admin/users/${userId}`);
      if (res.data?.data) {
        const d = res.data.data;
        setData(d);
        setProfileForm({
          fullName: d.user?.fullName || '',
          phone: d.user?.phone || '',
          city: d.user?.city || '',
          gender: d.user?.gender || 'OTHER',
          emailVerified: !!d.user?.emailVerified,
          phoneVerified: !!d.user?.phoneVerified,
          kycStatus: d.user?.kycStatus || 'NOT_STARTED',
        });
        setSelectedRole(d.user?.roles?.[0] || 'SEEKER');
        setSelectedMode(d.user?.activeMode || 'SEEKER');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
    }
  }, [userId]);

  const handleSaveProfile = async () => {
    try {
      await api.patch(`/admin/users/${userId}/profile`, profileForm);
      alert('User profile updated successfully');
      setIsEditingProfile(false);
      fetchUserDetails();
      onUserUpdated?.();
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    }
  };

  const handleUpdateRole = async () => {
    try {
      await api.patch(`/admin/users/${userId}/role`, {
        roles: [selectedRole],
        activeMode: selectedMode,
      });
      alert('Role and Mode updated successfully');
      fetchUserDetails();
      onUserUpdated?.();
    } catch (err: any) {
      alert(err.message || 'Failed to update role');
    }
  };

  const handleAdjustWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedRupees = parseFloat(adjustAmount);
    if (isNaN(parsedRupees) || parsedRupees <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    const paise = Math.round(parsedRupees * 100) * (adjustType === 'ADD' ? 1 : -1);
    setWalletLoading(true);
    try {
      await api.post(`/admin/users/${userId}/wallet-adjust`, {
        amountPaise: paise,
        reason: adjustReason || 'Admin manual balance adjustment',
      });
      alert('Wallet adjustment applied successfully');
      setAdjustAmount('');
      setAdjustReason('');
      fetchUserDetails();
      onUserUpdated?.();
    } catch (err: any) {
      alert(err.message || 'Failed to adjust wallet balance');
    } finally {
      setWalletLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!window.confirm(`Are you sure you want to change user status to ${newStatus}?`)) return;
    try {
      await api.patch(`/admin/users/${userId}/status`, {
        status: newStatus,
        reason: `Admin changed status to ${newStatus}`,
      });
      alert('Status updated successfully');
      fetchUserDetails();
      onUserUpdated?.();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-surface p-8 rounded-2xl flex flex-col items-center gap-4 text-center max-w-sm w-full shadow-2xl border border-borderLight">
          <RefreshCw className="animate-spin text-primary" size={36} />
          <h3 className="font-bold text-lg text-textMain">Loading User Profile...</h3>
          <p className="text-xs text-muted">Fetching complete platform data for ID: {userId}</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-surface p-6 rounded-2xl max-w-md w-full shadow-2xl border border-borderLight flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg text-failed-text">Error Loading Details</h3>
            <button onClick={onClose} className="p-1 text-muted hover:text-textMain"><X size={20} /></button>
          </div>
          <p className="text-sm text-textMain">{error || 'User not found'}</p>
          <button onClick={onClose} className="btn-primary w-full py-2">Close</button>
        </div>
      </div>
    );
  }

  const { user, partnerProfile, kycSubmission, subscriptions, bookings, payments, walletLedger, reports, auditLogs } = data;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 overflow-hidden">
      <div className="bg-surface w-full max-w-5xl h-full max-h-[92vh] rounded-2xl shadow-2xl border border-borderLight flex flex-col overflow-hidden animate-fadeIn">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-borderLight bg-bg/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-accent text-white font-bold flex items-center justify-center text-xl shadow-sm">
              {user.fullName?.charAt(0) || user.email?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-textMain">{user.fullName || 'No Name Provided'}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  user.status === 'ACTIVE' ? 'bg-success-bg text-success-text' :
                  user.status === 'SUSPENDED' ? 'bg-failed-bg text-failed-text' : 'bg-warning/20 text-warning'
                }`}>
                  {user.status}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                  {user.roles?.join(', ') || 'SEEKER'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface border border-borderLight text-muted">
                  Mode: {user.activeMode || 'SEEKER'}
                </span>
              </div>
              <p className="text-xs text-muted flex items-center gap-2 mt-0.5">
                <span>{user.email}</span>
                <span>•</span>
                <span>ID: {user._id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user.status === 'ACTIVE' ? (
              <button 
                onClick={() => handleStatusChange('SUSPENDED')}
                className="btn-sm bg-failed-bg text-failed-text hover:bg-failed-bg/80 text-xs px-3 py-1.5 rounded-lg font-semibold"
              >
                Suspend User
              </button>
            ) : (
              <button 
                onClick={() => handleStatusChange('ACTIVE')}
                className="btn-sm bg-success-bg text-success-text hover:bg-success-bg/80 text-xs px-3 py-1.5 rounded-lg font-semibold"
              >
                Activate User
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 rounded-xl text-muted hover:bg-bg hover:text-textMain transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 px-4 border-b border-borderLight bg-surface overflow-x-auto hide-scrollbar shrink-0 text-xs font-semibold">
          {[
            { id: 'overview', label: 'Overview & Profile', icon: User, count: null },
            { id: 'partner', label: 'Partner & KYC', icon: Award, count: partnerProfile ? 'Active' : null },
            { id: 'wallet', label: 'Wallet & Ledger', icon: Wallet, count: `₹${((user.walletBalancePaise || 0) / 100).toFixed(0)}` },
            { id: 'bookings', label: 'Bookings History', icon: Calendar, count: bookings?.length || 0 },
            { id: 'payments', label: 'Payments & Plans', icon: CreditCard, count: payments?.length || 0 },
            { id: 'safety', label: 'Safety & Reports', icon: AlertTriangle, count: reports?.length || 0 },
            { id: 'audit', label: 'Audit Logs', icon: Activity, count: auditLogs?.length || 0 },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DetailTab)}
                className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-all whitespace-nowrap ${
                  isActive 
                    ? 'border-primary text-primary font-bold' 
                    : 'border-transparent text-muted hover:text-textMain'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-primary text-white' : 'bg-bg text-muted'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-bg/30">

          {/* 1. OVERVIEW & PROFILE TAB */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-6">
              
              {/* Profile Card with Edit capability */}
              <div className="card bg-surface p-5 border border-borderLight rounded-xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-base text-textMain flex items-center gap-2">
                    <User size={18} className="text-primary" />
                    Personal & Account Information
                  </h3>
                  {!isEditingProfile ? (
                    <button 
                      onClick={() => setIsEditingProfile(true)}
                      className="flex items-center gap-1.5 text-xs text-primary font-bold hover:underline"
                    >
                      <Edit3 size={14} /> Edit Info
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setIsEditingProfile(false)}
                        className="text-xs text-muted px-2.5 py-1 rounded border border-borderLight"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSaveProfile}
                        className="flex items-center gap-1 text-xs bg-primary text-white px-3 py-1 rounded font-bold"
                      >
                        <Save size={14} /> Save
                      </button>
                    </div>
                  )}
                </div>

                {!isEditingProfile ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-bg p-3 rounded-lg border border-borderLight">
                      <span className="text-xs text-muted block">Full Name</span>
                      <span className="font-semibold text-textMain">{user.fullName || '—'}</span>
                    </div>
                    <div className="bg-bg p-3 rounded-lg border border-borderLight">
                      <span className="text-xs text-muted block">Email Address</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-textMain truncate">{user.email}</span>
                        {user.emailVerified ? (
                          <CheckCircle size={14} className="text-success-text shrink-0" />
                        ) : (
                          <span className="text-[10px] text-warning bg-warning/10 px-1.5 py-0.5 rounded">Unverified</span>
                        )}
                      </div>
                    </div>
                    <div className="bg-bg p-3 rounded-lg border border-borderLight">
                      <span className="text-xs text-muted block">Phone Number</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-textMain">{user.phone || '—'}</span>
                        {user.phoneVerified ? (
                          <CheckCircle size={14} className="text-success-text shrink-0" />
                        ) : (
                          <span className="text-[10px] text-warning bg-warning/10 px-1.5 py-0.5 rounded">Unverified</span>
                        )}
                      </div>
                    </div>
                    <div className="bg-bg p-3 rounded-lg border border-borderLight">
                      <span className="text-xs text-muted block">Gender</span>
                      <span className="font-semibold text-textMain">{user.gender || '—'}</span>
                    </div>
                    <div className="bg-bg p-3 rounded-lg border border-borderLight">
                      <span className="text-xs text-muted block">City</span>
                      <span className="font-semibold text-textMain">{user.city || '—'}</span>
                    </div>
                    <div className="bg-bg p-3 rounded-lg border border-borderLight">
                      <span className="text-xs text-muted block">KYC Status</span>
                      <span className="font-semibold text-textMain">{user.kycStatus || 'NOT_STARTED'}</span>
                    </div>
                    <div className="bg-bg p-3 rounded-lg border border-borderLight">
                      <span className="text-xs text-muted block">Registered On</span>
                      <span className="font-semibold text-textMain">
                        {user.createdAt ? new Date(user.createdAt).toLocaleString() : '—'}
                      </span>
                    </div>
                    <div className="bg-bg p-3 rounded-lg border border-borderLight">
                      <span className="text-xs text-muted block">Last Login</span>
                      <span className="font-semibold text-textMain">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never logged in'}
                      </span>
                    </div>
                    <div className="bg-bg p-3 rounded-lg border border-borderLight">
                      <span className="text-xs text-muted block">Emergency Contact</span>
                      <span className="font-semibold text-textMain">
                        {user.emergencyContact ? `${user.emergencyContact.name} (${user.emergencyContact.phone})` : 'None'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <label className="text-xs font-semibold text-muted block mb-1">Full Name</label>
                      <input 
                        type="text" 
                        value={profileForm.fullName}
                        onChange={e => setProfileForm({ ...profileForm, fullName: e.target.value })}
                        className="w-full p-2.5 text-sm rounded-lg bg-bg border border-borderLight text-textMain"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted block mb-1">Phone Number</label>
                      <input 
                        type="text" 
                        value={profileForm.phone}
                        onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className="w-full p-2.5 text-sm rounded-lg bg-bg border border-borderLight text-textMain"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted block mb-1">City</label>
                      <input 
                        type="text" 
                        value={profileForm.city}
                        onChange={e => setProfileForm({ ...profileForm, city: e.target.value })}
                        className="w-full p-2.5 text-sm rounded-lg bg-bg border border-borderLight text-textMain"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted block mb-1">Gender</label>
                      <select 
                        value={profileForm.gender}
                        onChange={e => setProfileForm({ ...profileForm, gender: e.target.value })}
                        className="w-full p-2.5 text-sm rounded-lg bg-bg border border-borderLight text-textMain"
                      >
                        <option value="MALE">MALE</option>
                        <option value="FEMALE">FEMALE</option>
                        <option value="OTHER">OTHER</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted block mb-1">KYC Status</label>
                      <select 
                        value={profileForm.kycStatus}
                        onChange={e => setProfileForm({ ...profileForm, kycStatus: e.target.value })}
                        className="w-full p-2.5 text-sm rounded-lg bg-bg border border-borderLight text-textMain"
                      >
                        <option value="NOT_STARTED">NOT_STARTED</option>
                        <option value="PENDING">PENDING</option>
                        <option value="VERIFIED">VERIFIED</option>
                        <option value="REJECTED">REJECTED</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-2 justify-center pt-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-textMain">
                        <input 
                          type="checkbox"
                          checked={profileForm.emailVerified}
                          onChange={e => setProfileForm({ ...profileForm, emailVerified: e.target.checked })}
                          className="rounded text-primary"
                        />
                        Email Verified
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-textMain">
                        <input 
                          type="checkbox"
                          checked={profileForm.phoneVerified}
                          onChange={e => setProfileForm({ ...profileForm, phoneVerified: e.target.checked })}
                          className="rounded text-primary"
                        />
                        Phone Verified
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Role & Mode Switcher */}
              <div className="card bg-surface p-5 border border-borderLight rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h4 className="font-bold text-sm text-textMain flex items-center gap-2">
                    <Shield size={16} className="text-primary" />
                    Role & Mode Permission Controls
                  </h4>
                  <p className="text-xs text-muted mt-0.5">Change platform roles and active interface mode for this user</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <select 
                    value={selectedRole}
                    onChange={e => setSelectedRole(e.target.value as any)}
                    className="p-2 text-xs font-bold rounded-lg bg-bg border border-borderLight text-textMain"
                  >
                    <option value="SEEKER">Role: SEEKER</option>
                    <option value="PARTNER">Role: PARTNER</option>
                    <option value="ADMIN">Role: ADMIN</option>
                  </select>

                  <select 
                    value={selectedMode}
                    onChange={e => setSelectedMode(e.target.value as any)}
                    className="p-2 text-xs font-bold rounded-lg bg-bg border border-borderLight text-textMain"
                  >
                    <option value="SEEKER">Mode: SEEKER</option>
                    <option value="PARTNER">Mode: PARTNER</option>
                  </select>

                  <button 
                    onClick={handleUpdateRole}
                    className="btn-sm bg-primary text-white font-bold px-3 py-2 rounded-lg text-xs"
                  >
                    Update
                  </button>
                </div>
              </div>

              {/* Quick Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-surface p-4 rounded-xl border border-borderLight">
                  <span className="text-xs text-muted block">Wallet Balance</span>
                  <span className="text-xl font-extrabold text-primary mt-1 block">
                    ₹{((user.walletBalancePaise || 0) / 100).toFixed(2)}
                  </span>
                </div>
                <div className="bg-surface p-4 rounded-xl border border-borderLight">
                  <span className="text-xs text-muted block">Total Bookings</span>
                  <span className="text-xl font-extrabold text-textMain mt-1 block">
                    {bookings?.length || 0}
                  </span>
                </div>
                <div className="bg-surface p-4 rounded-xl border border-borderLight">
                  <span className="text-xs text-muted block">Active Plans</span>
                  <span className="text-xl font-extrabold text-success-text mt-1 block">
                    {subscriptions?.filter((s: any) => s.status === 'ACTIVE').length || 0}
                  </span>
                </div>
                <div className="bg-surface p-4 rounded-xl border border-borderLight">
                  <span className="text-xs text-muted block">Safety Reports</span>
                  <span className={`text-xl font-extrabold mt-1 block ${reports?.length ? 'text-failed-text' : 'text-textMain'}`}>
                    {reports?.length || 0}
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* 2. PARTNER & KYC TAB */}
          {activeTab === 'partner' && (
            <div className="flex flex-col gap-6">
              {partnerProfile ? (
                <div className="card bg-surface p-5 border border-borderLight rounded-xl flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-base text-textMain flex items-center gap-2">
                      <Award size={18} className="text-primary" />
                      Partner Profile Details
                    </h3>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                      partnerProfile.approvalStatus === 'APPROVED' ? 'bg-success-bg text-success-text' :
                      partnerProfile.approvalStatus === 'REJECTED' ? 'bg-failed-bg text-failed-text' : 'bg-warning/20 text-warning'
                    }`}>
                      Approval: {partnerProfile.approvalStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="bg-bg p-3 rounded-lg border border-borderLight">
                      <span className="text-xs text-muted block">Display Name</span>
                      <span className="font-semibold text-textMain">{partnerProfile.displayName}</span>
                    </div>
                    <div className="bg-bg p-3 rounded-lg border border-borderLight">
                      <span className="text-xs text-muted block">Bio / Introduction</span>
                      <p className="font-medium text-textMain text-xs mt-1">{partnerProfile.bio || 'No bio provided'}</p>
                    </div>
                    <div className="bg-bg p-3 rounded-lg border border-borderLight">
                      <span className="text-xs text-muted block">Occupation / Industry</span>
                      <span className="font-semibold text-textMain">
                        {partnerProfile.occupation || '—'} ({partnerProfile.industry || 'General'})
                      </span>
                    </div>
                    <div className="bg-bg p-3 rounded-lg border border-borderLight">
                      <span className="text-xs text-muted block">Languages</span>
                      <span className="font-semibold text-textMain">
                        {partnerProfile.languages?.join(', ') || 'English, Hindi'}
                      </span>
                    </div>
                    <div className="bg-bg p-3 rounded-lg border border-borderLight">
                      <span className="text-xs text-muted block">Hobbies & Interests</span>
                      <span className="font-semibold text-textMain">
                        {[...(partnerProfile.interests || []), ...(partnerProfile.hobbies || [])].join(', ') || 'None listed'}
                      </span>
                    </div>
                    <div className="bg-bg p-3 rounded-lg border border-borderLight">
                      <span className="text-xs text-muted block">Payout Info</span>
                      <span className="font-semibold text-textMain">
                        {partnerProfile.payoutDetails?.upiId 
                          ? `UPI: ${partnerProfile.payoutDetails.upiId}` 
                          : partnerProfile.payoutDetails?.accountNumber 
                          ? `Bank A/C: ${partnerProfile.payoutDetails.accountNumber} (${partnerProfile.payoutDetails.ifsc})`
                          : 'Not set up'}
                      </span>
                    </div>
                  </div>

                  {/* Categories & Rates */}
                  <div>
                    <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Offered Categories & Rates</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {partnerProfile.categories?.map((cat: any, idx: number) => (
                        <div key={idx} className="bg-bg p-3 rounded-lg border border-borderLight flex items-center justify-between">
                          <span className="font-bold text-xs text-textMain">{cat.categoryId?.name || 'Category'}</span>
                          <span className="text-xs font-extrabold text-primary">₹{(cat.hourlyRatePaise / 100).toFixed(0)}/hr</span>
                        </div>
                      ))}
                      {(!partnerProfile.categories || partnerProfile.categories.length === 0) && (
                        <p className="text-xs text-muted italic">No categories assigned yet</p>
                      )}
                    </div>
                  </div>

                  {/* Photos Gallery */}
                  {partnerProfile.photos?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Gallery Photos</h4>
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {partnerProfile.photos.map((photo: string, idx: number) => (
                          <img key={idx} src={photo} alt={`Partner ${idx}`} className="w-20 h-20 rounded-xl object-cover border border-borderLight shadow-sm" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="card bg-surface p-8 text-center text-muted border border-borderLight rounded-xl">
                  <Award size={36} className="mx-auto mb-2 opacity-30 text-primary" />
                  <p className="font-bold text-sm text-textMain">No Partner Profile Created</p>
                  <p className="text-xs mt-1">This user is currently a regular Seeker and has not submitted a Partner onboarding form.</p>
                </div>
              )}

              {/* KYC Submission Status */}
              <div className="card bg-surface p-5 border border-borderLight rounded-xl">
                <h3 className="font-bold text-base text-textMain flex items-center gap-2 mb-3">
                  <FileText size={18} className="text-primary" />
                  KYC Verification & Documents
                </h3>
                {kycSubmission ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between bg-bg p-3 rounded-lg border border-borderLight">
                      <div>
                        <span className="text-xs text-muted block">Submission Status</span>
                        <span className="font-bold text-sm text-textMain">{kycSubmission.status}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted block">Submitted Date</span>
                        <span className="font-semibold text-xs text-textMain">
                          {kycSubmission.createdAt ? new Date(kycSubmission.createdAt).toLocaleDateString() : '—'}
                        </span>
                      </div>
                      {kycSubmission.reason && (
                        <div>
                          <span className="text-xs text-muted block">Decision Note</span>
                          <span className="text-xs font-semibold text-failed-text">{kycSubmission.reason}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-bold text-muted uppercase tracking-wider">Uploaded Documents ({kycSubmission.documents?.length || 0})</span>
                      {kycSubmission.documents?.map((doc: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-bg border border-borderLight rounded-lg text-xs">
                          <div>
                            <span className="font-bold text-textMain block">{doc.type}</span>
                            <span className="text-muted">Storage Key: {doc.storageKey}</span>
                          </div>
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded font-bold">Encrypted</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted italic">No KYC submissions found for this user.</p>
                )}
              </div>
            </div>
          )}

          {/* 3. WALLET & LEDGER TAB */}
          {activeTab === 'wallet' && (
            <div className="flex flex-col gap-6">
              
              {/* Wallet Adjustment Panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card bg-gradient-to-br from-primaryDark to-primary text-white p-5 rounded-xl flex flex-col justify-between shadow-md">
                  <div>
                    <span className="text-xs text-white/70 uppercase tracking-wider font-semibold">Current Wallet Balance</span>
                    <h3 className="text-3xl font-black mt-2">₹{((user.walletBalancePaise || 0) / 100).toFixed(2)}</h3>
                  </div>
                  <p className="text-[11px] text-white/80 mt-4">
                    Available balance can be used for booking payments, subscription plans, and companion tips.
                  </p>
                </div>

                <div className="md:col-span-2 card bg-surface p-5 border border-borderLight rounded-xl">
                  <h4 className="font-bold text-sm text-textMain flex items-center gap-2 mb-3">
                    <DollarSign size={16} className="text-primary" />
                    Admin Balance Adjustment
                  </h4>
                  <form onSubmit={handleAdjustWallet} className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-muted block mb-1">Adjustment Type</label>
                        <select 
                          value={adjustType}
                          onChange={e => setAdjustType(e.target.value as any)}
                          className="w-full p-2 text-xs font-bold rounded-lg bg-bg border border-borderLight text-textMain"
                        >
                          <option value="ADD">Credit (+) Add Balance</option>
                          <option value="DEDUCT">Debit (-) Deduct Balance</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted block mb-1">Amount (in Rupees ₹)</label>
                        <input 
                          type="number"
                          placeholder="e.g. 500"
                          value={adjustAmount}
                          onChange={e => setAdjustAmount(e.target.value)}
                          className="w-full p-2 text-xs rounded-lg bg-bg border border-borderLight text-textMain"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted block mb-1">Adjustment Reason (Logged into Ledger)</label>
                      <input 
                        type="text"
                        placeholder="e.g. Compensation for cancelled booking / Promotional bonus"
                        value={adjustReason}
                        onChange={e => setAdjustReason(e.target.value)}
                        className="w-full p-2 text-xs rounded-lg bg-bg border border-borderLight text-textMain"
                        required
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={walletLoading}
                      className="btn-sm bg-primary text-white font-bold py-2 rounded-lg text-xs self-end px-5"
                    >
                      {walletLoading ? 'Applying...' : 'Apply Wallet Adjustment'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Wallet Ledger History */}
              <div className="card bg-surface p-5 border border-borderLight rounded-xl">
                <h4 className="font-bold text-sm text-textMain mb-3">Transaction & Ledger Entries ({walletLedger?.length || 0})</h4>
                {walletLedger?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-borderLight text-muted uppercase">
                          <th className="p-3">Date</th>
                          <th className="p-3">Type</th>
                          <th className="p-3">Amount</th>
                          <th className="p-3">Balance After</th>
                          <th className="p-3">Reason</th>
                          <th className="p-3">Ref</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-borderLight">
                        {walletLedger.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-bg/50">
                            <td className="p-3 text-muted">{new Date(item.createdAt).toLocaleString()}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                item.type === 'CREDIT' ? 'bg-success-bg text-success-text' :
                                item.type === 'REFUND' ? 'bg-blue-100 text-blue-700' : 'bg-failed-bg text-failed-text'
                              }`}>
                                {item.type}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-textMain">
                              ₹{(item.amountPaise / 100).toFixed(2)}
                            </td>
                            <td className="p-3 font-semibold text-muted">
                              ₹{(item.balanceAfterPaise / 100).toFixed(2)}
                            </td>
                            <td className="p-3 text-textMain truncate max-w-xs">{item.reason}</td>
                            <td className="p-3 text-muted text-[10px]">{item.refType || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-muted italic">No wallet transactions recorded yet.</p>
                )}
              </div>

            </div>
          )}

          {/* 4. BOOKINGS HISTORY TAB */}
          {activeTab === 'bookings' && (
            <div className="card bg-surface p-5 border border-borderLight rounded-xl">
              <h3 className="font-bold text-base text-textMain mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-primary" />
                All Bookings Record ({bookings?.length || 0})
              </h3>
              {bookings?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-borderLight text-muted uppercase">
                        <th className="p-3">Booking ID</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Client / Seeker</th>
                        <th className="p-3">Partner</th>
                        <th className="p-3">Date & Time</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Stage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-borderLight">
                      {bookings.map((b: any, idx: number) => (
                        <tr key={idx} className="hover:bg-bg/50">
                          <td className="p-3 font-mono text-muted text-[11px] truncate max-w-[120px]">{b._id}</td>
                          <td className="p-3 font-semibold text-textMain">{b.categoryId?.name || 'General'}</td>
                          <td className="p-3 text-textMain">{b.clientId?.fullName || b.clientId?.email || 'Seeker'}</td>
                          <td className="p-3 text-textMain">{b.partnerId?.fullName || b.partnerId?.email || 'Partner'}</td>
                          <td className="p-3 text-muted">{b.startAt ? new Date(b.startAt).toLocaleString() : '—'}</td>
                          <td className="p-3 font-bold text-primary">₹{(b.totalPaise / 100).toFixed(2)}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-primary/10 text-primary">
                              {b.stage}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-muted italic text-center py-6">No bookings associated with this user.</p>
              )}
            </div>
          )}

          {/* 5. PAYMENTS & PLANS TAB */}
          {activeTab === 'payments' && (
            <div className="flex flex-col gap-6">
              
              {/* Subscriptions */}
              <div className="card bg-surface p-5 border border-borderLight rounded-xl">
                <h4 className="font-bold text-sm text-textMain mb-3 flex items-center gap-2">
                  <CreditCard size={16} className="text-primary" />
                  Subscription Plans ({subscriptions?.length || 0})
                </h4>
                {subscriptions?.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {subscriptions.map((sub: any, idx: number) => (
                      <div key={idx} className="bg-bg p-4 rounded-xl border border-borderLight flex flex-col justify-between gap-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-extrabold text-sm text-textMain">{sub.planId?.name || 'Standard Plan'}</span>
                            <span className="text-xs text-muted block">Duration: {sub.planId?.durationDays || 30} days</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            sub.status === 'ACTIVE' ? 'bg-success-bg text-success-text' : 'bg-failed-bg text-failed-text'
                          }`}>
                            {sub.status}
                          </span>
                        </div>
                        <div className="text-xs text-muted pt-2 border-t border-borderLight flex justify-between">
                          <span>Starts: {new Date(sub.startsAt).toLocaleDateString()}</span>
                          <span>Ends: {sub.endsAt ? new Date(sub.endsAt).toLocaleDateString() : 'Lifetime'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted italic">No subscriptions found.</p>
                )}
              </div>

              {/* Payment Orders */}
              <div className="card bg-surface p-5 border border-borderLight rounded-xl">
                <h4 className="font-bold text-sm text-textMain mb-3">Razorpay Payment Transactions ({payments?.length || 0})</h4>
                {payments?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-borderLight text-muted uppercase">
                          <th className="p-3">Order ID</th>
                          <th className="p-3">Payment ID</th>
                          <th className="p-3">Purpose</th>
                          <th className="p-3">Amount</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-borderLight">
                        {payments.map((p: any, idx: number) => (
                          <tr key={idx} className="hover:bg-bg/50">
                            <td className="p-3 font-mono text-[11px] text-textMain">{p.razorpayOrderId}</td>
                            <td className="p-3 font-mono text-[11px] text-muted">{p.razorpayPaymentId || '—'}</td>
                            <td className="p-3 font-bold text-primary">{p.purpose}</td>
                            <td className="p-3 font-extrabold text-textMain">₹{(p.amountPaise / 100).toFixed(2)}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                p.status === 'CAPTURED' ? 'bg-success-bg text-success-text' : 'bg-warning/20 text-warning'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="p-3 text-muted">{new Date(p.createdAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-muted italic">No payment transactions on file.</p>
                )}
              </div>

            </div>
          )}

          {/* 6. SAFETY & REPORTS TAB */}
          {activeTab === 'safety' && (
            <div className="card bg-surface p-5 border border-borderLight rounded-xl">
              <h3 className="font-bold text-base text-textMain mb-4 flex items-center gap-2">
                <AlertTriangle size={18} className="text-failed-text" />
                Reports & Safety Flags ({reports?.length || 0})
              </h3>
              {reports?.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {reports.map((rep: any, idx: number) => (
                    <div key={idx} className="bg-bg p-4 rounded-xl border border-borderLight flex flex-col gap-2 text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-failed-text uppercase tracking-wider">{rep.reason}</span>
                          <span className="text-muted block text-[11px] mt-0.5">Context: {rep.context} • Status: {rep.status}</span>
                        </div>
                        <span className="text-muted">{new Date(rep.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-textMain font-medium bg-surface p-2.5 rounded border border-borderLight mt-1">{rep.details}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted">
                  <CheckCircle size={36} className="mx-auto mb-2 text-success-text opacity-50" />
                  <p className="font-bold text-sm text-textMain">Clean Safety Record</p>
                  <p className="text-xs mt-1">No reports or violations logged for this account.</p>
                </div>
              )}
            </div>
          )}

          {/* 7. AUDIT LOGS TAB */}
          {activeTab === 'audit' && (
            <div className="card bg-surface p-5 border border-borderLight rounded-xl">
              <h3 className="font-bold text-base text-textMain mb-4 flex items-center gap-2">
                <Activity size={18} className="text-primary" />
                System & Admin Audit Trail ({auditLogs?.length || 0})
              </h3>
              {auditLogs?.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {auditLogs.map((log: any, idx: number) => (
                    <div key={idx} className="p-3 bg-bg rounded-lg border border-borderLight flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-textMain block">{log.action}</span>
                        <span className="text-muted text-[11px]">Actor ID: {log.actorId}</span>
                      </div>
                      <span className="text-muted">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted italic">No audit trail entries for this user.</p>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
