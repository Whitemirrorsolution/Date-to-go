import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { 
  Users, UserCheck, CreditCard, Calendar, AlertTriangle, 
  FileText, HelpCircle, Shield, ChevronRight, Activity, X, LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useNavigate } from 'react-router-dom';
import { AdminUserDetailsModal } from '../components/admin/AdminUserDetailsModal.js';

type Tab = 'overview' | 'users' | 'partners' | 'bookings' | 'payouts' | 'safety' | 'kyc' | 'pages' | 'faqs' | 'categories' | 'packages' | 'plans' | 'settings' | 'tickets';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <Activity size={18} /> },
  { id: 'users', label: 'Users', icon: <Users size={18} /> },
  { id: 'partners', label: 'Partners', icon: <UserCheck size={18} /> },
  { id: 'bookings', label: 'Bookings', icon: <Calendar size={18} /> },
  { id: 'payouts', label: 'Payouts', icon: <CreditCard size={18} /> },
  { id: 'safety', label: 'Safety Suite', icon: <Shield size={18} /> },
  { id: 'kyc', label: 'KYC Queue', icon: <UserCheck size={18} /> },
  { id: 'pages', label: 'CMS Pages', icon: <FileText size={18} /> },
  { id: 'faqs', label: 'FAQs', icon: <HelpCircle size={18} /> },
  { id: 'categories', label: 'Categories', icon: <FileText size={18} /> },
  { id: 'packages', label: 'Packages', icon: <FileText size={18} /> },
  { id: 'plans', label: 'Plans', icon: <CreditCard size={18} /> },
  { id: 'settings', label: 'Settings', icon: <Activity size={18} /> },
  { id: 'tickets', label: 'Support Tickets', icon: <HelpCircle size={18} /> },
];

export const AdminDashboardPage: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal states for CMS
  const [isFaqModalOpen, setFaqModalOpen] = useState(false);
  const [faqForm, setFaqForm] = useState({ question: '', answer: '', category: 'GENERAL', order: 0 });

  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ 
    name: '', icon: '🏷️', description: '', accentColor: '#3B82F6', 
    order: 0, isActive: true, minRatePaise: 100000, maxRatePaise: 1000000, defaultRatePaise: 150000,
    allowedDurationsMins: [60, 120, 180, 240], requiresExtraKyc: false, allowClientHomeVenue: false,
    commissionRule_type: 'PERCENT', commissionRule_percentBps: 2000, commissionRule_flatPaise: 0, commissionRule_gstOnFeeBps: 1800
  });

  const [isPackageModalOpen, setPackageModalOpen] = useState(false);
  const [packageForm, setPackageForm] = useState({ title: '', description: '', pricePaise: 10000, durationHours: 2, categoryId: '', isActive: true });

  const [isPlanModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState({ name: '', audience: 'PARTNER', pricePaise: 100000, durationDays: 30, features: '', bookingLimit: 0, dailyRequestLimit: 0, maxCategoriesAllowed: 0, isActive: true });

  const [activeKycReview, setActiveKycReview] = useState<any>(null);
  const [kycDecisionForm, setKycDecisionForm] = useState({ decision: 'APPROVE', reason: '' });
  const [viewingDocUrl, setViewingDocUrl] = useState<string | null>(null);
  const [selectedUserIdForDetails, setSelectedUserIdForDetails] = useState<string | null>(null);

  const [availableCategories, setAvailableCategories] = useState<any[]>([]);

  const fetchData = async (tab: Tab) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let endpoint = `/admin/${tab}`;
      if (tab === 'safety') endpoint = `/admin/safety/escalations`;
      if (tab === 'pages') endpoint = `/admin/cms/pages`;
      if (tab === 'faqs') endpoint = `/admin/cms/faqs`;
      if (tab === 'categories') endpoint = `/admin/categories`;
      if (tab === 'packages') endpoint = `/admin/packages`;
      if (tab === 'plans') endpoint = `/admin/plans`;
      if (tab === 'settings') endpoint = `/admin/settings`;
      if (tab === 'kyc') endpoint = `/admin/kyc`;
      if (tab === 'tickets') endpoint = `/admin/tickets`;
      if (tab === 'overview') endpoint = `/admin/overview`;
      
      const res = await api.get<any>(endpoint);
      const resData = res.data;
      
      if (tab === 'overview') {
        setData([resData.data || resData]); // Overview returns a single object
      } else if (resData) {
        setData(resData.data || resData || []);
      }

      if (tab === 'packages') {
        const catRes = await api.get<any>('/admin/categories');
        const catData = catRes.data;
        setAvailableCategories(catData?.data || catData || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to fetch ${tab}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  const handleAction = async (endpoint: string, payload: any = {}, method: 'POST' | 'PATCH' | 'DELETE' = 'POST') => {
    if (!window.confirm('Are you sure you want to perform this action?')) return;
    try {
      if (method === 'PATCH') {
        await api.patch(endpoint, payload);
      } else if (method === 'DELETE') {
        await api.delete(endpoint);
      } else {
        await api.post(endpoint, payload);
      }
      alert('Action successful');
      fetchData(activeTab);
    } catch (e: any) {
      alert(e.message || 'Action failed');
    }
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/cms/faqs', faqForm);
      setFaqModalOpen(false);
      setFaqForm({ question: '', answer: '', category: 'GENERAL', order: 0 });
      fetchData('faqs');
    } catch (err: any) {
      alert(err.message || 'Failed to save FAQ');
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        name: categoryForm.name,
        slug: categoryForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        icon: categoryForm.icon,
        description: categoryForm.description || categoryForm.name,
        accentColor: categoryForm.accentColor,
        order: categoryForm.order,
        isActive: categoryForm.isActive,
        minRatePaise: categoryForm.minRatePaise,
        maxRatePaise: categoryForm.maxRatePaise,
        defaultRatePaise: categoryForm.defaultRatePaise,
        allowedDurationsMins: categoryForm.allowedDurationsMins,
        requiresExtraKyc: categoryForm.requiresExtraKyc,
        allowClientHomeVenue: categoryForm.allowClientHomeVenue,
        commissionRules: [
          {
            type: categoryForm.commissionRule_type,
            percentBps: categoryForm.commissionRule_percentBps,
            flatPaise: categoryForm.commissionRule_flatPaise,
            gstOnFeeBps: categoryForm.commissionRule_gstOnFeeBps,
            effectiveFrom: new Date().toISOString(),
          }
        ]
      };
      await api.post('/admin/categories', body);
      setCategoryModalOpen(false);
      fetchData('categories');
    } catch (err: any) {
      alert(err.message || 'Failed to save Category');
    }
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/packages', packageForm);
      setPackageModalOpen(false);
      setPackageForm({ title: '', description: '', pricePaise: 10000, durationHours: 2, categoryId: '', isActive: true });
      fetchData('packages');
    } catch (err: any) {
      alert(err.message || 'Failed to save Package');
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        ...planForm,
        features: planForm.features.split('\n').map(f => f.trim()).filter(Boolean)
      };
      if (editingPlanId) {
        await api.put(`/admin/plans/${editingPlanId}`, body);
      } else {
        await api.post('/admin/plans', body);
      }
      setPlanModalOpen(false);
      setEditingPlanId(null);
      setPlanForm({ name: '', audience: 'PARTNER', pricePaise: 100000, durationDays: 30, features: '', bookingLimit: 0, dailyRequestLimit: 0, maxCategoriesAllowed: 0, isActive: true });
      fetchData('plans');
    } catch (err: any) {
      alert(err.message || 'Failed to save Plan');
    }
  };

  const handleEditPlan = (plan: any) => {
    setEditingPlanId(plan._id);
    setPlanForm({
      name: plan.name,
      audience: plan.audience,
      pricePaise: plan.pricePaise,
      durationDays: plan.durationDays,
      features: (plan.features || []).join('\n'),
      bookingLimit: plan.bookingLimit || 0,
      dailyRequestLimit: plan.dailyRequestLimit || 0,
      maxCategoriesAllowed: plan.maxCategoriesAllowed || 0,
      isActive: plan.isActive
    });
    setPlanModalOpen(true);
  };

  const handleKycDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeKycReview) return;
    try {
      await api.post(`/admin/kyc/${activeKycReview._id}/decision`, kycDecisionForm);
      setActiveKycReview(null);
      fetchData('kyc');
    } catch (err: any) {
      alert(err.message || 'Failed to submit decision');
    }
  };

  const viewKycDocument = async (subId: string, docId: string) => {
    try {
      const res = await api.get<any>(`/admin/kyc/${subId}/documents/${docId}/url`);
      setViewingDocUrl(res.data.url);
    } catch (e: any) {
      alert('Failed to load document URL');
    }
  };

  const renderOverview = () => {
    const overviewData = data[0] || { activeUsers: 0, pendingKyc: 0 };
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          <h3 className="text-white/80 font-medium mb-2">Platform Status</h3>
          <p className="text-3xl font-bold">Operational</p>
        </div>
        <div className="card bg-surface border border-borderLight">
          <h3 className="text-muted font-medium mb-2">Active Users</h3>
          <p className="text-3xl font-bold text-textMain">{overviewData.activeUsers || 0}</p>
        </div>
        <div className="card bg-surface border border-borderLight">
          <h3 className="text-muted font-medium mb-2">Pending KYC</h3>
          <p className="text-3xl font-bold text-failed-text">{overviewData.pendingKyc || 0}</p>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    if (loading) return <div className="p-12 text-center text-muted">Loading settings...</div>;
    
    // Find our specific setting
    const requireSubSetting = data.find((s: any) => s.key === 'requireSubscriptionForAccess');
    const isRequired = requireSubSetting ? requireSubSetting.value : true;

    const toggleSubscriptionRequirement = async () => {
      try {
        if (requireSubSetting) {
          await api.put(`/admin/settings/${requireSubSetting._id}`, {
            key: 'requireSubscriptionForAccess',
            type: 'BOOLEAN',
            value: !isRequired,
            description: 'Require users to purchase a plan before accessing dashboard',
            isPublic: true
          });
        } else {
          await api.post(`/admin/settings`, {
            key: 'requireSubscriptionForAccess',
            type: 'BOOLEAN',
            value: false,
            description: 'Require users to purchase a plan before accessing dashboard',
            isPublic: true
          });
        }
        alert('Setting updated successfully.');
        fetchData('settings');
      } catch (err: any) {
        alert(err.message || 'Failed to update setting');
      }
    };

    return (
      <div className="p-6 max-w-2xl">
        <h3 className="text-xl font-bold mb-6">Global Platform Settings</h3>
        
        <div className="card border border-borderLight flex items-start justify-between">
          <div>
            <h4 className="font-bold text-textMain mb-1">Strict Subscription Requirement</h4>
            <p className="text-sm text-muted mb-4 max-w-md">
              When enabled, users and partners must purchase a subscription plan immediately after signup to access their dashboard. When disabled, users can bypass this screen.
            </p>
            <div className="flex gap-2">
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${isRequired ? 'bg-success-bg text-success-text' : 'bg-surface text-muted border border-borderLight'}`}>
                {isRequired ? 'Enabled (Strict)' : 'Disabled (Bypass Allowed)'}
              </span>
            </div>
          </div>
          
          <button
            onClick={toggleSubscriptionRequirement}
            className={`px-5 py-2.5 rounded-pill font-bold shadow-sm transition-all ${isRequired ? 'bg-failed-bg text-failed-text' : 'bg-primary text-white'}`}
          >
            {isRequired ? 'Disable Requirement' : 'Enable Requirement'}
          </button>
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (loading) return <div className="p-12 text-center text-muted">Loading data...</div>;
    if (data.length === 0) return <div className="p-12 text-center text-muted">No records found for this section.</div>;

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-borderLight text-sm text-muted uppercase tracking-wider">
              <th className="p-4 font-semibold">Identifier</th>
              <th className="p-4 font-semibold">Details</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borderLight">
            {data.map((item: any, idx: number) => (
              <tr key={item._id || idx} className="hover:bg-bg/50 transition-colors">
                <td className="p-4">
                  <div className="font-bold text-sm text-textMain truncate max-w-[200px]">
                    {item.key || item.email || item.title || item.name || item.slug || item.question || item._id}
                  </div>
                  {item.fullName && <div className="text-xs text-muted mt-1">{item.fullName}</div>}
                </td>
                <td className="p-4 text-sm text-muted">
                  {item.value ? <div className="truncate max-w-[200px]">Value: {typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value)}</div> : null}
                  {item.amountPaise ? <div className="font-medium text-textMain">₹{item.amountPaise / 100}</div> : null}
                  {item.category ? <div>Cat: {item.category}</div> : null}
                  {item.reason ? <div className="truncate max-w-[200px]">Reason: {item.reason}</div> : null}
                  {item.message ? <div className="truncate max-w-[300px]">Message: {item.message}</div> : null}
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-surface border border-borderLight`}>
                    {item.status || item.approvalStatus || (item.isActive ? 'ACTIVE' : 'INACTIVE')}
                  </span>
                </td>
                <td className="p-4 text-right flex justify-end gap-2 flex-wrap items-center">
                  {/* Users */}
                  {activeTab === 'users' && (
                    <>
                      <button 
                        onClick={() => setSelectedUserIdForDetails(item._id)} 
                        className="btn-sm bg-primary/10 text-primary hover:bg-primary hover:text-white font-bold transition-colors"
                      >
                        View 360° Profile
                      </button>
                      {item.status !== 'SUSPENDED' ? (
                        <button onClick={() => handleAction(`/admin/users/${item._id}/status`, { status: 'SUSPENDED', reason: 'Admin action' }, 'PATCH')} className="btn-sm bg-failed-bg text-failed-text">Suspend</button>
                      ) : (
                        <button onClick={() => handleAction(`/admin/users/${item._id}/status`, { status: 'ACTIVE', reason: 'Admin action' }, 'PATCH')} className="btn-sm bg-success-bg text-success-text">Activate</button>
                      )}
                    </>
                  )}

                  {/* Partners */}
                  {activeTab === 'partners' && (
                    <button 
                      onClick={() => setSelectedUserIdForDetails(item.userId?._id || item.userId || item._id)} 
                      className="btn-sm bg-primary/10 text-primary hover:bg-primary hover:text-white font-bold transition-colors"
                    >
                      View 360° Profile
                    </button>
                  )}
                  
                  {/* Payouts */}
                  {activeTab === 'payouts' && item.status === 'PENDING' && (
                    <>
                      <button onClick={() => handleAction(`/admin/payouts/${item._id}/approve`)} className="btn-sm bg-success-bg text-success-text">Approve</button>
                      <button onClick={() => handleAction(`/admin/payouts/${item._id}/reject`, { adminNote: 'Rejected' })} className="btn-sm bg-failed-bg text-failed-text">Reject</button>
                    </>
                  )}

                  {/* Safety */}
                  {activeTab === 'safety' && item.status === 'ESCALATED' && (
                    <button onClick={() => handleAction(`/admin/safety/${item._id}/resolve`, { resolutionNote: 'Resolved safely' })} className="btn-sm bg-primary text-white">Resolve</button>
                  )}

                  {/* KYC */}
                  {activeTab === 'kyc' && (
                    <button onClick={() => setActiveKycReview(item)} className="btn-sm bg-primary text-white">Review</button>
                  )}

                  {/* FAQs */}
                  {activeTab === 'faqs' && (
                    <button onClick={() => handleAction(`/admin/cms/faqs/${item._id}`, {}, 'DELETE')} className="btn-sm text-failed-text">Delete</button>
                  )}

                  {/* Categories */}
                  {activeTab === 'categories' && (
                    <button onClick={() => handleAction(`/admin/categories/${item._id}`, {}, 'DELETE')} className="btn-sm text-failed-text">Delete</button>
                  )}

                  {/* Packages */}
                  {activeTab === 'packages' && (
                    <button onClick={() => handleAction(`/admin/packages/${item._id}`, {}, 'DELETE')} className="btn-sm text-failed-text">Delete</button>
                  )}

                  {/* Plans */}
                  {activeTab === 'plans' && (
                    <>
                      <button onClick={() => handleEditPlan(item)} className="btn-sm bg-primary/10 text-primary">Edit</button>
                      <button onClick={() => handleAction(`/admin/plans/${item._id}`, {}, 'DELETE')} className="btn-sm text-failed-text">Delete</button>
                    </>
                  )}

                  {/* Tickets */}
                  {activeTab === 'tickets' && item.status !== 'RESOLVED' && item.status !== 'CLOSED' && (
                    <button onClick={() => {
                      const res = window.prompt('Enter resolution message:');
                      if (res) {
                        handleAction(`/admin/tickets/${item._id}/resolve`, { resolution: res }, 'POST');
                      }
                    }} className="btn-sm bg-success-bg text-success-text">Resolve</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar Nav */}
      <aside className="w-full md:w-64 bg-surface border-r border-borderLight shrink-0 flex flex-col max-h-screen overflow-y-auto">
        <div className="p-6 border-b border-borderLight">
          <h1 className="font-black text-xl text-primary tracking-tight">Admin Console</h1>
          <p className="text-xs text-muted mt-1 mb-4">Date To Go Platform</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold uppercase">
              {user?.fullName?.charAt(0) || user?.email?.charAt(0) || 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-sm truncate">{user?.fullName || 'Admin User'}</p>
              <p className="text-xs text-muted truncate">{user?.email || user?.phone || 'admin@datetogo.com'}</p>
            </div>
          </div>
        </div>
        <nav className="p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible hide-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all whitespace-nowrap
                ${activeTab === tab.id 
                  ? 'bg-primary text-white shadow-md' 
                  : 'text-muted hover:bg-bg hover:text-textMain'
                }`}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && <ChevronRight size={16} className="ml-auto hidden md:block opacity-50" />}
            </button>
          ))}
          <button
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="flex md:hidden items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all whitespace-nowrap text-failed-text hover:bg-failed-bg"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </nav>
        <div className="mt-auto p-4 border-t border-borderLight hidden md:block">
          <button
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl font-semibold text-sm text-failed-text hover:bg-failed-bg transition-all"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold capitalize">{activeTab} Management</h2>
            <p className="text-sm text-muted mt-1">View and manage {activeTab} across the platform.</p>
          </div>
          
          {/* Contextual Actions */}
          {activeTab === 'faqs' && (
            <button onClick={() => setFaqModalOpen(true)} className="px-5 py-2.5 bg-primary text-white font-bold rounded-pill shadow-sm">
              + Add FAQ
            </button>
          )}
          {activeTab === 'categories' && (
            <button onClick={() => setCategoryModalOpen(true)} className="px-5 py-2.5 bg-primary text-white font-bold rounded-pill shadow-sm">
              + Add Category
            </button>
          )}
          {activeTab === 'packages' && (
            <button onClick={() => setPackageModalOpen(true)} className="px-5 py-2.5 bg-primary text-white font-bold rounded-pill shadow-sm">
              + Add Package
            </button>
          )}
          {activeTab === 'plans' && (
            <button onClick={() => setPlanModalOpen(true)} className="px-5 py-2.5 bg-primary text-white font-bold rounded-pill shadow-sm">
              + Add Plan
            </button>
          )}
        </header>

        {errorMsg && (
          <div className="mb-6 p-4 bg-failed-bg text-failed-text rounded-xl font-medium flex items-center gap-2">
            <AlertTriangle size={18} />
            {errorMsg}
          </div>
        )}

        <div className="card p-0 overflow-hidden min-h-[400px]">
          {activeTab === 'overview' ? (
            <div className="p-6">{renderOverview()}</div>
          ) : activeTab === 'settings' ? (
            renderSettings()
          ) : (
            renderTable()
          )}
        </div>
      </main>

      {/* Add FAQ Modal */}
      {isFaqModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-lg p-6 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl">Create New FAQ</h3>
              <button onClick={() => setFaqModalOpen(false)} className="text-muted hover:text-textMain"><X size={24}/></button>
            </div>
            <form onSubmit={handleSaveFaq} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Question</label>
                <input 
                  type="text" required
                  value={faqForm.question} onChange={e => setFaqForm({...faqForm, question: e.target.value})}
                  className="w-full p-3 rounded-lg bg-bg border border-borderLight"
                  placeholder="How does this work?"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Answer</label>
                <textarea 
                  required rows={4}
                  value={faqForm.answer} onChange={e => setFaqForm({...faqForm, answer: e.target.value})}
                  className="w-full p-3 rounded-lg bg-bg border border-borderLight"
                  placeholder="The platform works by..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Category</label>
                  <select 
                    value={faqForm.category} onChange={e => setFaqForm({...faqForm, category: e.target.value})}
                    className="w-full p-3 rounded-lg bg-bg border border-borderLight"
                  >
                    <option value="GENERAL">General</option>
                    <option value="PAYMENTS">Payments</option>
                    <option value="SAFETY">Safety</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Order</label>
                  <input 
                    type="number" required
                    value={faqForm.order} onChange={e => setFaqForm({...faqForm, order: parseInt(e.target.value)})}
                    className="w-full p-3 rounded-lg bg-bg border border-borderLight"
                  />
                </div>
              </div>
              <button type="submit" className="mt-4 w-full py-3 bg-primary text-white font-bold rounded-pill">
                Save FAQ
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-lg p-6 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl">Create New Category</h3>
              <button onClick={() => setCategoryModalOpen(false)} className="text-muted hover:text-textMain"><X size={24}/></button>
            </div>
            <form onSubmit={handleSaveCategory} className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Name</label>
                  <input 
                    type="text" required
                    value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})}
                    className="w-full p-3 rounded-lg bg-bg border border-borderLight"
                    placeholder="e.g. City Tour"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Icon (Emoji)</label>
                  <input 
                    type="text" required maxLength={2}
                    value={categoryForm.icon} onChange={e => setCategoryForm({...categoryForm, icon: e.target.value})}
                    className="w-full p-3 rounded-lg bg-bg border border-borderLight text-center"
                    placeholder="🏷️"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1">Accent Color</label>
                <div className="flex gap-2">
                  <input 
                    type="color" required
                    value={categoryForm.accentColor} onChange={e => setCategoryForm({...categoryForm, accentColor: e.target.value})}
                    className="h-12 w-12 rounded-lg cursor-pointer border border-borderLight"
                  />
                  <input 
                    type="text" required
                    value={categoryForm.accentColor} onChange={e => setCategoryForm({...categoryForm, accentColor: e.target.value})}
                    className="flex-1 p-3 rounded-lg bg-bg border border-borderLight uppercase"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Description</label>
                <textarea 
                  rows={2}
                  value={categoryForm.description} onChange={e => setCategoryForm({...categoryForm, description: e.target.value})}
                  className="w-full p-3 rounded-lg bg-bg border border-borderLight"
                  placeholder="Short description of this category"
                />
              </div>

              <div className="bg-surface p-4 rounded-xl border border-borderLight flex flex-col gap-4">
                <h4 className="font-bold text-sm text-primary">Pricing Limits (₹ INR)</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-muted">Min Rate</label>
                    <input type="number" required min="1" value={categoryForm.minRatePaise / 100 || ''} onChange={e => setCategoryForm({...categoryForm, minRatePaise: (parseInt(e.target.value) || 0) * 100})} className="w-full p-2 text-sm rounded bg-bg border border-borderLight"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-muted">Default</label>
                    <input type="number" required min="1" value={categoryForm.defaultRatePaise / 100 || ''} onChange={e => setCategoryForm({...categoryForm, defaultRatePaise: (parseInt(e.target.value) || 0) * 100})} className="w-full p-2 text-sm rounded bg-bg border border-borderLight"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-muted">Max Rate</label>
                    <input type="number" required min="1" value={categoryForm.maxRatePaise / 100 || ''} onChange={e => setCategoryForm({...categoryForm, maxRatePaise: (parseInt(e.target.value) || 0) * 100})} className="w-full p-2 text-sm rounded bg-bg border border-borderLight"/>
                  </div>
                </div>
              </div>

              <div className="bg-surface p-4 rounded-xl border border-borderLight flex flex-col gap-4">
                <h4 className="font-bold text-sm text-primary">Commission Rules</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-muted">Platform Fee (%)</label>
                    <input type="number" step="0.1" value={categoryForm.commissionRule_percentBps / 100} onChange={e => setCategoryForm({...categoryForm, commissionRule_percentBps: parseFloat(e.target.value) * 100})} className="w-full p-2 text-sm rounded bg-bg border border-borderLight"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-muted">GST on Fee (%)</label>
                    <input type="number" step="0.1" value={categoryForm.commissionRule_gstOnFeeBps / 100} onChange={e => setCategoryForm({...categoryForm, commissionRule_gstOnFeeBps: parseFloat(e.target.value) * 100})} className="w-full p-2 text-sm rounded bg-bg border border-borderLight"/>
                  </div>
                </div>
                {/* Live Preview Calculator */}
                <div className="p-3 bg-bg rounded-lg border border-borderLight text-sm">
                  <div className="flex justify-between text-muted mb-1"><span>If partner charges:</span> <span>₹1,000.00</span></div>
                  <div className="flex justify-between text-failed-text mb-1"><span>Platform Fee:</span> <span>₹{((1000 * (categoryForm.commissionRule_percentBps / 10000))).toFixed(2)}</span></div>
                  <div className="flex justify-between text-failed-text mb-2 border-b border-borderLight pb-2"><span>GST on Fee:</span> <span>₹{((1000 * (categoryForm.commissionRule_percentBps / 10000)) * (categoryForm.commissionRule_gstOnFeeBps / 10000)).toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold text-success-text"><span>Partner Receives:</span> <span>₹{(1000 - (1000 * (categoryForm.commissionRule_percentBps / 10000)) - ((1000 * (categoryForm.commissionRule_percentBps / 10000)) * (categoryForm.commissionRule_gstOnFeeBps / 10000))).toFixed(2)}</span></div>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                  <input type="checkbox" checked={categoryForm.requiresExtraKyc} onChange={e => setCategoryForm({...categoryForm, requiresExtraKyc: e.target.checked})} className="rounded border-borderLight text-primary focus:ring-primary"/>
                  Requires Extra KYC
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                  <input type="checkbox" checked={categoryForm.allowClientHomeVenue} onChange={e => setCategoryForm({...categoryForm, allowClientHomeVenue: e.target.checked})} className="rounded border-borderLight text-primary focus:ring-primary"/>
                  Allow Client Home Venue
                </label>
              </div>

              <button type="submit" className="mt-4 w-full py-3 bg-primary text-white font-bold rounded-pill shadow-lg hover:shadow-xl transition-all">
                Save Category
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Package Modal */}
      {isPackageModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-lg p-6 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl">Create New Package</h3>
              <button onClick={() => setPackageModalOpen(false)} className="text-muted hover:text-textMain"><X size={24}/></button>
            </div>
            <form onSubmit={handleSavePackage} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Title</label>
                <input 
                  type="text" required
                  value={packageForm.title} onChange={e => setPackageForm({...packageForm, title: e.target.value})}
                  className="w-full p-3 rounded-lg bg-bg border border-borderLight"
                  placeholder="e.g. Full Day Tour"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Description</label>
                <textarea 
                  required rows={2}
                  value={packageForm.description} onChange={e => setPackageForm({...packageForm, description: e.target.value})}
                  className="w-full p-3 rounded-lg bg-bg border border-borderLight"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Price (₹ INR)</label>
                  <input 
                    type="number" required min={1}
                    value={packageForm.pricePaise / 100 || ''} onChange={e => setPackageForm({...packageForm, pricePaise: (parseInt(e.target.value) || 0) * 100})}
                    className="w-full p-3 rounded-lg bg-bg border border-borderLight"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Duration (Hours)</label>
                  <input 
                    type="number" required min={1}
                    value={packageForm.durationHours} onChange={e => setPackageForm({...packageForm, durationHours: parseInt(e.target.value)})}
                    className="w-full p-3 rounded-lg bg-bg border border-borderLight"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Category</label>
                <select 
                  required
                  value={packageForm.categoryId} onChange={e => setPackageForm({...packageForm, categoryId: e.target.value})}
                  className="w-full p-3 rounded-lg bg-bg border border-borderLight"
                >
                  <option value="">Select Category</option>
                  {availableCategories.map(cat => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="mt-4 w-full py-3 bg-primary text-white font-bold rounded-pill">
                Save Package
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Plan Modal */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-lg p-6 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl">{editingPlanId ? 'Edit Subscription Plan' : 'Create New Subscription Plan'}</h3>
              <button onClick={() => { setPlanModalOpen(false); setEditingPlanId(null); }} className="text-muted hover:text-textMain"><X size={24}/></button>
            </div>
            <form onSubmit={handleSavePlan} className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              <div>
                <label className="block text-sm font-semibold mb-1">Name</label>
                <input 
                  type="text" required
                  value={planForm.name} onChange={e => setPlanForm({...planForm, name: e.target.value})}
                  className="w-full p-3 rounded-lg bg-bg border border-borderLight"
                  placeholder="e.g. Pro Partner Plan"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Audience</label>
                  <select 
                    value={planForm.audience} onChange={e => setPlanForm({...planForm, audience: e.target.value})}
                    className="w-full p-3 rounded-lg bg-bg border border-borderLight"
                  >
                    <option value="USER">User (Seeker)</option>
                    <option value="PARTNER">Partner (Provider)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Booking Limit (0 = unlmt)</label>
                  <input 
                    type="number" required min={0}
                    value={planForm.bookingLimit} onChange={e => setPlanForm({...planForm, bookingLimit: parseInt(e.target.value)})}
                    className="w-full p-3 rounded-lg bg-bg border border-borderLight"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    {planForm.audience === 'USER' ? 'Daily Requests (0 = unlmt)' : 'Max Categories (0 = unlmt)'}
                  </label>
                  <input 
                    type="number" required min={0}
                    value={planForm.audience === 'USER' ? planForm.dailyRequestLimit : planForm.maxCategoriesAllowed} 
                    onChange={e => {
                      if (planForm.audience === 'USER') {
                        setPlanForm({...planForm, dailyRequestLimit: parseInt(e.target.value)});
                      } else {
                        setPlanForm({...planForm, maxCategoriesAllowed: parseInt(e.target.value)});
                      }
                    }}
                    className="w-full p-3 rounded-lg bg-bg border border-borderLight"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Price (₹ INR)</label>
                  <input 
                    type="number" required min={0}
                    value={planForm.pricePaise / 100 || (planForm.pricePaise === 0 ? 0 : '')} onChange={e => setPlanForm({...planForm, pricePaise: (parseInt(e.target.value) || 0) * 100})}
                    className="w-full p-3 rounded-lg bg-bg border border-borderLight"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Duration (Days)</label>
                  <input 
                    type="number" required min={1}
                    value={planForm.durationDays} onChange={e => setPlanForm({...planForm, durationDays: parseInt(e.target.value)})}
                    className="w-full p-3 rounded-lg bg-bg border border-borderLight"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Features (One per line)</label>
                <textarea 
                  required rows={4}
                  value={planForm.features} onChange={e => setPlanForm({...planForm, features: e.target.value})}
                  className="w-full p-3 rounded-lg bg-bg border border-borderLight whitespace-pre-wrap"
                  placeholder="Unlimited listings\nPriority support\nVerified badge"
                />
              </div>
              <button type="submit" className="mt-4 w-full py-3 bg-primary text-white font-bold rounded-pill">
                Save Plan
              </button>
            </form>
          </div>
        </div>
      )}

      {/* KYC Review Modal */}
      {activeKycReview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="card w-full max-w-4xl p-6 animate-in slide-in-from-bottom-4 my-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl">Review KYC Submission</h3>
              <button onClick={() => { setActiveKycReview(null); setViewingDocUrl(null); }} className="text-muted hover:text-textMain"><X size={24}/></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Partner Details */}
              <div className="bg-surface p-4 rounded-xl border border-borderLight">
                <h4 className="font-bold text-sm text-primary mb-3">Partner Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted">Name:</span> <span className="font-semibold">{activeKycReview.partnerId?.displayName || 'Unknown'}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Email:</span> <span>{activeKycReview.partnerId?.email}</span></div>
                  <div className="flex justify-between"><span className="text-muted">DOB:</span> <span>{activeKycReview.partnerId?.dob ? new Date(activeKycReview.partnerId.dob).toLocaleDateString() : 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Current KYC Status:</span> <span className="font-bold text-warning">{activeKycReview.status}</span></div>
                </div>

                <h4 className="font-bold text-sm text-primary mt-6 mb-3">Submitted Documents</h4>
                <div className="space-y-3">
                  {activeKycReview.documents?.map((doc: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-bg border border-borderLight rounded-lg">
                      <div>
                        <p className="font-bold text-sm">{doc.type}</p>
                        <p className="text-xs text-muted">ID: {doc.idNumberEnc || 'Masked'}</p>
                      </div>
                      <button onClick={() => viewKycDocument(activeKycReview._id, doc._id)} className="btn-sm bg-primary/10 text-primary">View</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review Panel / Document Viewer */}
              <div className="flex flex-col gap-4">
                {viewingDocUrl ? (
                  <div className="flex-1 bg-surface rounded-xl border border-borderLight flex flex-col overflow-hidden min-h-[300px]">
                    <div className="p-2 border-b border-borderLight flex justify-between items-center bg-bg">
                      <span className="font-bold text-sm">Document Viewer (Mock)</span>
                      <button onClick={() => setViewingDocUrl(null)} className="text-muted hover:text-failed-text text-sm font-bold px-2 py-1">Close Viewer</button>
                    </div>
                    <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
                      <Shield size={48} className="text-success-text mb-4 opacity-50" />
                      <p className="font-semibold">Mock Secure Viewer</p>
                      <p className="text-xs text-muted mt-2">In production, this displays the decrypted file from S3 using the signed URL:</p>
                      <code className="text-[10px] break-all bg-bg p-2 rounded mt-2">{viewingDocUrl}</code>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 bg-surface rounded-xl border border-borderLight p-4 flex flex-col justify-center items-center text-center text-muted">
                    <FileText size={48} className="mb-4 opacity-20" />
                    <p>Select a document to view</p>
                  </div>
                )}

                <form onSubmit={handleKycDecision} className="bg-surface p-4 rounded-xl border border-borderLight flex flex-col gap-3">
                  <h4 className="font-bold text-sm text-primary">Make Decision</h4>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Decision</label>
                    <select 
                      value={kycDecisionForm.decision} onChange={e => setKycDecisionForm({...kycDecisionForm, decision: e.target.value})}
                      className="w-full p-2 text-sm rounded bg-bg border border-borderLight"
                    >
                      <option value="APPROVE">Approve</option>
                      <option value="NEEDS_CHANGES">Needs Changes</option>
                      <option value="REJECT">Reject & Ban</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Reason (Mandatory for rejection/changes)</label>
                    <textarea 
                      required={kycDecisionForm.decision !== 'APPROVE'}
                      value={kycDecisionForm.reason} onChange={e => setKycDecisionForm({...kycDecisionForm, reason: e.target.value})}
                      className="w-full p-2 text-sm rounded bg-bg border border-borderLight"
                      rows={2}
                      placeholder="e.g. Document blurry, Aadhaar not masked"
                    />
                  </div>
                  <button type="submit" className={`w-full py-2 font-bold text-white rounded shadow ${kycDecisionForm.decision === 'APPROVE' ? 'bg-success-text' : kycDecisionForm.decision === 'REJECT' ? 'bg-failed-text' : 'bg-warning'}`}>
                    Submit Decision
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User 360 Inspector Modal */}
      {selectedUserIdForDetails && (
        <AdminUserDetailsModal 
          userId={selectedUserIdForDetails} 
          onClose={() => setSelectedUserIdForDetails(null)} 
          onUserUpdated={() => fetchData(activeTab)} 
        />
      )}
    </div>
  );
};
