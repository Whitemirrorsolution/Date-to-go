import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../../services/api.js';
import { useAuth } from '../../../context/AuthContext.js';
import { useAccess } from '../../../shared/providers/AccessProvider.js';
import { 
  Home, Inbox, List, Wallet, User, LogOut, ArrowLeftRight, 
  AlertCircle, ChevronRight, CheckCircle2, Calendar, IndianRupee, ShieldAlert, MapPin,
  Sparkles, MessageSquare
} from 'lucide-react';
import { StageChip } from '../../../components/StageChip.js';
import { CreateListingSheet } from '../components/CreateListingSheet.js';
import { CategoryIcon } from '../../../components/CategoryIcon.js';
import { AutoRulesManager } from '../components/AutoRulesManager.js';
import { QuickRepliesManager } from '../components/QuickRepliesManager.js';
import { BulkListingsBar } from '../components/BulkListingsBar.js';
import { AvailabilityBuffersCard } from '../components/AvailabilityBuffersCard.js';
import { PartnerRequestInbox } from '../components/PartnerRequestInbox.js';
import { PartnerOtpSheet } from '../components/PartnerOtpSheet.js';
import { setAppBadge } from '../../../pwa/badging.js';

export type PartnerTabType = 'home' | 'requests' | 'listings' | 'wallet' | 'profile' | 'accepted' | 'rules' | 'templates';

export const PartnerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { switchMode, logout, user } = useAuth();
  const { access } = useAccess();

  useEffect(() => {
    if (access && !access.entitlements?.partner?.active && !user?.roles?.includes('ADMIN')) {
      navigate('/pricing', { replace: true });
    }
  }, [access, user, navigate]);
  
  const searchParams = new URLSearchParams(location.search);
  const activeTab = (searchParams.get('tab') as PartnerTabType) || 'home';

  const setActiveTab = (tab: string) => {
    navigate(`/p/dashboard?tab=${tab}`, { replace: true });
  };
  
  const [loading, setLoading] = useState(true);
  
  const [profile, setProfile] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [selectedListingIds, setSelectedListingIds] = useState<string[]>([]);
  
  const [showCreateListing, setShowCreateListing] = useState(false);

  const [activeOtpBookingId, setActiveOtpBookingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profileRes, healthRes, statsRes, bookingsRes, catRes, listingsRes] = await Promise.all([
        api.get<any>('/partner/profile').catch(() => ({ data: null })),
        api.get<any>('/partner/profile/health').catch(() => ({ data: null })),
        api.get<any>('/partner/earnings').catch(() => ({ data: null })),
        api.get<any>('/partner/bookings').catch(() => ({ data: null })),
        api.get<any>('/categories').catch(() => ({ data: null })),
        api.get<any>('/partner/listings').catch(() => ({ data: null }))
      ]);
      if (profileRes.data) setProfile(profileRes.data);
      if (healthRes.data) setHealth(healthRes.data);
      if (statsRes.data) setStats(statsRes.data);
      const bData = (bookingsRes as any)?.bookings || bookingsRes.data;
      if (bData) setBookings(bData);
      if (catRes.data) setCategoriesList(catRes.data);
      if (listingsRes.data) setListings(listingsRes.data);

      console.log("booking data", bookingsRes)
      console.log("profile res", profileRes, healthRes, statsRes, catRes, listingsRes)
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };





  // --- Memos to prevent recalculation on every render ---
  const activeBookings = useMemo(() => 
    bookings.filter(b => ['CONFIRMED', 'PAID', 'IN_PROGRESS', 'AWAITING_OTP'].includes(b.stage)),
  [bookings]);

  const requestedBookings = useMemo(() => 
    bookings.filter(b => b.stage === 'REQUESTED'),
  [bookings]);
  const acceptedBookings = useMemo(() => 
    bookings.filter(b => b.stage === 'ACCEPTED' || b.status === 'ACCEPTED'),
  [bookings]);

  // Sync PWA App Badging with pending booking requests
  useEffect(() => {
    setAppBadge(requestedBookings.length);
  }, [requestedBookings.length]);

  const formatCurrency = (paise: number) => {
    return (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'requests', icon: Inbox, label: 'Requests' },
    { id: 'accepted', icon: CheckCircle2, label: 'Accepted' },
    { id: 'listings', icon: List, label: 'Listings' },
    { id: 'rules', icon: Sparkles, label: 'Auto-Rules' },
    { id: 'templates', icon: MessageSquare, label: 'Quick Replies' },
    { id: 'wallet', icon: Wallet, label: 'Wallet' },
    { id: 'profile', icon: User, label: 'Settings' }
  ];

  // --- Components ---
  const renderHealthMeter = () => {
    if (!health) return null;
    const { score, band, nextActions } = health;
    const colorMap = { RED: 'bg-failed-text', ORANGE: 'bg-orange-500', YELLOW: 'bg-yellow-500', GREEN: 'bg-success-text' };
    const bandColor = colorMap[band as keyof typeof colorMap] || 'bg-primary';

    return (
      <div className="bg-surface border border-borderLight rounded-3xl p-5 mb-6 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-[15px]">Profile Score</h3>
          <span className={`font-black text-lg ${health.score >= 90 ? 'text-success-text' : 'text-primary'}`}>{score}%</span>
        </div>
        <div className="w-full bg-bg rounded-full h-2 mb-5 overflow-hidden">
          <div className={`${bandColor} h-full transition-all duration-1000`} style={{ width: `${score}%` }}></div>
        </div>
        
        {nextActions?.length > 0 && (
          <div>
            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Boost your score</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {nextActions.slice(0, 2).map((act: string, idx: number) => (
                <div key={idx} onClick={() => navigate('/p/onboarding')} className="flex items-center justify-between p-3 rounded-2xl bg-bg border border-borderLight/50 cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] transition-all">
                  <div className="flex items-center gap-3">
                    <AlertCircle size={18} className="text-primary shrink-0" /> 
                    <span className="text-sm font-semibold text-textMain leading-tight">{act}</span>
                  </div>
                  <span className="text-[11px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full whitespace-nowrap">+5%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-[100dvh] bg-bg flex flex-col items-center justify-center text-textMain">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full" />
        </div>
        <p className="mt-4 text-sm font-bold text-muted animate-pulse">Syncing Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-hidden w-full flex bg-bg">
      
      {/* Desktop Sidebar (Hidden on Mobile) */}
      <aside className="hidden md:flex flex-col w-[260px] lg:w-[280px] bg-surface border-r border-borderLight h-full relative z-50">
        <div className="h-20 px-6 flex items-center gap-3 border-b border-borderLight/50">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Wallet size={20} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-black text-textMain tracking-tight">Partner</h1>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${
                  isActive 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' 
                    : 'text-muted hover:bg-bg hover:text-textMain'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[15px]">{tab.label}</span>
                {tab.id === 'requests' && requestedBookings.length > 0 && (
                  <span className="ml-auto w-5 h-5 bg-failed-text text-white text-[10px] rounded-full flex items-center justify-center font-black">
                    {requestedBookings.length}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Main App Container */}
      <div className="w-full flex-1 flex flex-col bg-bg relative h-[100dvh]">
        
        {/* Sticky Header */}
        <header className="absolute top-0 left-0 w-full z-40 bg-bg/90 backdrop-blur-xl border-b border-borderLight/50 pt-safe transition-all h-16 md:h-20 px-5 flex justify-between items-center">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Wallet size={16} strokeWidth={2.5} />
            </div>
            <h1 className="text-lg font-black leading-none text-textMain">Partner</h1>
          </div>
          
          {/* Desktop Title */}
          <div className="hidden md:block">
            <h1 className="text-2xl font-black capitalize text-textMain">{activeTab}</h1>
          </div>
          
          <button 
            onClick={() => switchMode('SEEKER')} 
            className="flex items-center gap-2 px-4 py-2 bg-surface border border-borderLight rounded-full hover:shadow-md active:scale-95 transition-all"
          >
            <span className="text-xs font-bold text-textMain">Switch to Seeker</span>
            <ArrowLeftRight size={14} className="text-primary" />
          </button>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 pt-20 md:pt-28 pb-28 md:pb-12 scrollbar-hide w-full max-w-6xl mx-auto">
          
          {/* HOME TAB */}
          {activeTab === 'home' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6 md:space-y-8">
              
              {user?.kycStatus !== 'VERIFIED' && !user?.roles?.includes('ADMIN') ? (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 md:p-8 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                  <ShieldAlert size={48} className="text-amber-500 mx-auto mb-4" />
                  <h2 className="text-xl md:text-2xl font-black text-amber-600 mb-2">KYC Verification Pending</h2>
                  <p className="text-sm md:text-base font-medium text-amber-700/80 mb-6 max-w-lg mx-auto leading-relaxed">
                    We are reviewing your documents. You cannot accept requests or withdraw funds until approved.
                  </p>
                  <button onClick={() => navigate('/p/kyc')} className="w-full md:w-auto md:px-12 h-12 bg-amber-500 text-white font-bold rounded-2xl md:rounded-full active:scale-95 transition-transform shadow-lg shadow-amber-500/25">
                    Check Status
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-2">
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight text-textMain">Hello, {profile?.displayName?.split(' ')[0] || 'Partner'}! 👋</h2>
                    <p className="text-sm md:text-base font-semibold text-muted mt-1.5">
                      {health?.canCreateListings ? 'Your profile is live and visible to seekers.' : 'Complete your setup to get visible.'}
                    </p>
                  </div>

                  {renderHealthMeter()}

                  {/* Dashboard Cards Grid (Responsive) */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
                    <div onClick={() => setActiveTab('wallet')} className="bg-surface border border-borderLight rounded-3xl p-5 md:p-6 flex flex-col justify-center hover:-translate-y-1 active:scale-95 transition-all cursor-pointer shadow-sm md:col-span-2">
                      <div className="w-10 h-10 rounded-full bg-success-text/10 flex items-center justify-center mb-3">
                        <IndianRupee size={20} className="text-success-text" />
                      </div>
                      <p className="text-xs font-bold text-muted uppercase tracking-wider mb-0.5">Total Earned</p>
                      <p className="text-2xl md:text-4xl font-black text-textMain">₹{formatCurrency(stats?.totalEarningsPaise || 0)}</p>
                    </div>

                    <div onClick={() => setActiveTab('requests')} className="bg-primary text-white rounded-3xl p-5 md:p-6 flex flex-col justify-center hover:-translate-y-1 active:scale-95 transition-all cursor-pointer shadow-lg shadow-primary/30 relative overflow-hidden md:col-span-2">
                      <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-3 backdrop-blur-md">
                        <Inbox size={20} className="text-white" />
                      </div>
                      <p className="text-xs font-bold text-white/80 uppercase tracking-wider mb-0.5">New Requests</p>
                      <p className="text-3xl md:text-4xl font-black leading-none">{requestedBookings.length}</p>
                    </div>
                  </div>

                  {/* Upcoming Bookings Section */}
                  <div className="pt-2 md:pt-4">
                    <div className="flex justify-between items-end mb-4 md:mb-6">
                      <h3 className="font-bold text-lg md:text-2xl">Active Bookings</h3>
                      {activeBookings.length > 2 && (
                        <button onClick={() => setActiveTab('requests')} className="text-sm font-bold text-primary active:scale-95">See all</button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {activeBookings.length === 0 ? (
                        <div className="bg-surface border border-dashed border-borderLight rounded-3xl p-8 md:p-12 flex flex-col items-center justify-center text-center lg:col-span-2">
                          <Calendar size={40} className="text-muted mb-4 opacity-50" />
                          <p className="text-base font-semibold text-muted">No upcoming bookings</p>
                        </div>
                      ) : (
                        activeBookings.slice(0, 4).map(b => (
                          <div key={b._id} className="bg-surface border border-borderLight rounded-3xl p-5 md:p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3 md:gap-4">
                                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-lg md:text-xl shrink-0">
                                  {b.seekerId?.displayName?.charAt(0).toUpperCase() || 'S'}
                                </div>
                                <div>
                                  <p className="font-bold text-base md:text-lg leading-tight mb-1">{b.seekerId?.displayName || 'Seeker'}</p>
                                  <p className="text-[11px] md:text-xs font-semibold text-muted flex items-center gap-1.5">
                                    <Calendar size={12}/> {new Date(b.scheduledStartTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                  </p>
                                </div>
                              </div>
                              <StageChip stage={(b.stage || b.status) as any} />
                            </div>
                            
                            <div className="mt-auto border-t border-borderLight/50 pt-3 flex flex-wrap gap-2 items-center justify-between">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => navigate(`/p/chat/${b._id}`)}
                                  className="h-9 px-3.5 rounded-xl bg-bg border border-borderLight text-textMain font-bold text-xs hover:border-primary/50 active:scale-95 transition-all"
                                >
                                  Chat
                                </button>
                                <button
                                  onClick={() => navigate(`/p/booking/${b._id}`)}
                                  className="h-9 px-3.5 rounded-xl bg-surface border border-borderLight text-textMain font-bold text-xs hover:border-primary/50 active:scale-95 transition-all"
                                >
                                  Details
                                </button>
                              </div>
                              
                              {(b.stage === 'AWAITING_OTP' || b.status === 'AWAITING_OTP') && (
                                <button 
                                  onClick={() => setActiveOtpBookingId(b._id)} 
                                  disabled={user?.kycStatus !== 'VERIFIED' && !user?.roles?.includes('ADMIN')}
                                  className="h-9 px-3.5 bg-primary text-white font-bold text-xs rounded-xl active:scale-95 transition-transform disabled:opacity-50"
                                >
                                  Enter OTP
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* REQUESTS TAB */}
          {activeTab === 'requests' && <PartnerRequestInbox />}
           {/* ACCEPTED TAB */}
           {activeTab === 'accepted' && (
             <div className="animate-in fade-in slide-in-from-bottom-2">
               <h2 className="text-2xl md:text-3xl font-black mb-6">Accepted Bookings</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                 {acceptedBookings.length === 0 ? (
                   <div className="bg-surface rounded-3xl p-12 flex flex-col items-center justify-center text-center border border-dashed border-borderLight md:col-span-2 lg:col-span-3">
                     <CheckCircle2 size={48} className="text-muted mb-4 opacity-50" />
                     <p className="text-xl font-bold text-textMain">No accepted bookings</p>
                   </div>
                 ) : (
                   acceptedBookings.map(b => (
                     <div key={b._id} className="bg-surface border border-borderLight rounded-3xl p-5 md:p-6 shadow-sm flex flex-col justify-between">
                       <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center gap-3 md:gap-4">
                           <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-lg md:text-xl shrink-0">
                             {b.seekerId?.displayName?.charAt(0).toUpperCase() || 'S'}
                           </div>
                           <div>
                             <p className="font-bold text-base md:text-lg leading-tight mb-1">
                               {b.seekerId?.displayName || 'Seeker'}
                             </p>
                             <p className="text-[11px] md:text-xs font-semibold text-muted flex items-center gap-1.5">
                               <Calendar size={12} /> {new Date(b.scheduledStartTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                             </p>
                           </div>
                         </div>
                         <StageChip stage={b.stage as any} />
                       </div>
                       <div className="mt-auto flex justify-between items-end border-t border-borderLight/50 pt-4">
                         <div>
                           <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Your Earning</p>
                           <p className="font-black text-success-text text-xl leading-none mt-1">₹{formatCurrency(b.partnerNetPaise)}</p>
                         </div>
                         <button className="h-10 px-4 rounded-xl bg-bg text-textMain font-bold text-sm border border-borderLight hover:bg-primary/10" onClick={() => navigate(`/p/booking/${b._id}`)}>
                           Details
                         </button>
                       </div>
                     </div>
                   ))
                 )}
               </div>
             </div>
           )}
          {/* LISTINGS TAB */}
          {activeTab === 'listings' && (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl md:text-3xl font-black">My Offerings</h2>
              </div>

              {user?.kycStatus !== 'VERIFIED' && !user?.roles?.includes('ADMIN') && (
                <div className="mb-6 p-4 md:p-5 bg-orange-50 text-orange-900 rounded-2xl text-sm border border-orange-200 flex items-start gap-3 shadow-sm">
                  <AlertCircle size={20} className="mt-0.5 shrink-0 text-orange-500" />
                  <div className="font-medium">You need to complete your Profile and KYC verification to create custom listings.</div>
                </div>
              )}
              
              <div className="bg-surface border border-dashed border-primary/40 bg-primary/5 rounded-3xl p-8 md:p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-5">
                  <List size={28} />
                </div>
                <h3 className="font-bold text-xl mb-2">Create an Offering</h3>
                <p className="text-sm font-medium text-muted mb-6 max-w-sm mx-auto">Design a specific service, experience, or package for seekers to book instantly.</p>
                
                <button 
                  onClick={() => setShowCreateListing(true)}
                  disabled={user?.kycStatus !== 'VERIFIED' && !user?.roles?.includes('ADMIN')} 
                  className="h-12 px-8 md:px-10 bg-primary text-white font-bold rounded-full disabled:opacity-50 active:scale-95 transition-transform shadow-lg shadow-primary/30"
                >
                  + Add New Listing
                </button>
              </div>

              {/* Render Listings Grid */}
              {listings.length > 0 && (
                <div className="mt-10">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-xl text-textMain">Active Listings</h3>
                    {listings.length > 0 && (
                      <button
                        onClick={() => {
                          if (selectedListingIds.length === listings.length) {
                            setSelectedListingIds([]);
                          } else {
                            setSelectedListingIds(listings.map((x) => x._id));
                          }
                        }}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        {selectedListingIds.length === listings.length ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                    {listings.map(l => {
                      const isSelected = selectedListingIds.includes(l._id);
                      return (
                        <div
                          key={l._id}
                          className={`bg-surface border ${isSelected ? 'border-primary ring-2 ring-primary/20 shadow-md' : 'border-borderLight'} rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col`}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setSelectedListingIds(prev =>
                                    prev.includes(l._id) ? prev.filter(id => id !== l._id) : [...prev, l._id]
                                  );
                                }}
                                className="w-5 h-5 rounded-md accent-[#7000A4] cursor-pointer mr-1"
                              />
                              <span className="w-10 h-10 bg-bg rounded-xl border border-borderLight flex items-center justify-center shrink-0">
                                <CategoryIcon 
                                  icon={l.categoryId?.icon} 
                                  slug={l.categoryId?.slug} 
                                  name={l.categoryId?.name} 
                                  size={20} 
                                />
                              </span>
                              <span className="font-black text-base md:text-lg">{l.categoryId?.name || 'Service'}</span>
                            </div>
                            <StageChip stage={l.status as any} />
                          </div>
                          
                          <div className="space-y-2.5 mb-5 flex-1">
                            <div className="flex items-center gap-2 text-sm text-muted font-medium bg-bg px-3 py-2 rounded-xl">
                              <Calendar size={14} className="text-primary shrink-0" />
                              <span className="truncate">
                                {new Date(l.startAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {new Date(l.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted font-medium bg-bg px-3 py-2 rounded-xl">
                              <MapPin size={14} className="text-primary shrink-0" />
                              <span className="truncate">{l.venueName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted font-medium bg-bg px-3 py-2 rounded-xl">
                              <span className="w-4 h-4 flex items-center justify-center bg-primary/10 text-primary text-[10px] font-bold rounded-sm shrink-0">⌛</span>
                              <span>{l.durationMins / 60} hours</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-end border-t border-borderLight/50 pt-4 mt-auto">
                            <div>
                              <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">Price</p>
                              <p className="font-black text-2xl text-primary leading-none">₹{formatCurrency(l.basePricePaise)}</p>
                            </div>
                            <button className="h-9 px-4 bg-bg border border-borderLight text-textMain font-bold text-sm rounded-lg hover:bg-surface active:scale-95 transition-all" onClick={() => navigate(`/p/listings/${l._id}`)}>
                              Manage
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bulk Action Toolbar */}
                  <BulkListingsBar
                    selectedIds={selectedListingIds}
                    onClearSelection={() => setSelectedListingIds([])}
                    onRefresh={fetchData}
                  />
                </div>
              )}
            </div>
          )}

          {/* WALLET TAB */}
          {activeTab === 'wallet' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6 md:space-y-8">
              <h2 className="text-2xl md:text-3xl font-black">Earnings & Wallet</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-[#111111] rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden lg:col-span-2">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-success-text/20 rounded-full blur-3xl" />
                  <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Wallet size={18} className="text-white/70" />
                        <p className="text-xs md:text-sm text-white/70 font-bold uppercase tracking-wider">Available to Withdraw</p>
                      </div>
                      <h3 className="text-5xl md:text-6xl font-black mb-8 md:mb-10 tracking-tight">₹{formatCurrency((stats?.totalEarningsPaise || 0) - (stats?.pendingPayoutPaise || 0))}</h3>
                    </div>
                    
                    <button disabled={user?.kycStatus !== 'VERIFIED' && !user?.roles?.includes('ADMIN')} className="w-full md:w-auto md:max-w-xs h-14 bg-white text-black font-black text-lg rounded-2xl active:scale-95 transition-transform disabled:opacity-50 disabled:bg-white/50 shadow-lg">
                      Withdraw to Bank
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-4 md:gap-6">
                  <div className="bg-surface border border-borderLight rounded-3xl p-6 shadow-sm flex-1 flex flex-col justify-center">
                    <p className="text-[11px] md:text-xs text-muted font-bold uppercase tracking-wider mb-2">In Escrow</p>
                    <p className="text-3xl md:text-4xl font-black text-amber-500 mb-1">₹{formatCurrency(stats?.pendingPayoutPaise || 0)}</p>
                    <p className="text-[11px] md:text-xs text-muted font-medium leading-tight">Funds clear automatically after booking completion.</p>
                  </div>
                  <div className="bg-surface border border-borderLight rounded-3xl p-6 shadow-sm flex-1 flex flex-col justify-center">
                    <p className="text-[11px] md:text-xs text-muted font-bold uppercase tracking-wider mb-2">Lifetime Earned</p>
                    <p className="text-3xl md:text-4xl font-black text-textMain">₹{formatCurrency(stats?.totalEarningsPaise || 0)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AUTO-RULES TAB */}
          {activeTab === 'rules' && (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <AutoRulesManager />
            </div>
          )}

          {/* QUICK REPLIES TAB */}
          {activeTab === 'templates' && (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <QuickRepliesManager />
            </div>
          )}

          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 max-w-3xl space-y-6">
              <h2 className="text-2xl md:text-3xl font-black mb-2">Settings & Preferences</h2>

              {/* Transit & Buffer Settings */}
              <AvailabilityBuffersCard
                initialBefore={profile?.bufferMinutesBefore ?? 30}
                initialAfter={profile?.bufferMinutesAfter ?? 30}
                onSaved={fetchData}
              />
              
              <div className="bg-surface border border-borderLight rounded-3xl overflow-hidden shadow-sm">
                {[
                  { icon: Sparkles, label: 'Smart Auto-Rules', action: () => setActiveTab('rules') },
                  { icon: MessageSquare, label: 'Quick Replies & Templates', action: () => setActiveTab('templates') },
                  { icon: User, label: 'Edit Profile Wizard', action: () => navigate('/p/onboarding') },
                  { icon: ShieldAlert, label: 'KYC Documents', action: () => navigate('/p/kyc') },
                  { icon: CheckCircle2, label: 'View Public Profile', action: () => navigate('/p/profile') },
                  { icon: IndianRupee, label: 'Payout Settings (Bank/UPI)', action: () => {} },
                ].map((item, idx, arr) => (
                  <button 
                    key={item.label}
                    onClick={item.action} 
                    className={`w-full p-5 flex items-center justify-between bg-surface hover:bg-bg transition-colors active:bg-bg ${idx !== arr.length - 1 ? 'border-b border-borderLight' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <item.icon size={18} />
                      </div>
                      <span className="font-bold text-[15px] md:text-base text-textMain">{item.label}</span>
                    </div>
                    <ChevronRight size={20} className="text-muted" />
                  </button>
                ))}
              </div>

              <div className="mt-6 md:mt-8 bg-surface border border-borderLight rounded-3xl overflow-hidden shadow-sm">
                <button 
                  onClick={logout} 
                  className="w-full p-5 flex items-center justify-between bg-surface hover:bg-failed-bg/20 transition-colors active:bg-failed-bg/30"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-failed-text/10 text-failed-text flex items-center justify-center">
                      <LogOut size={18} />
                    </div>
                    <span className="font-bold text-[15px] md:text-base text-failed-text">Log Out</span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Mobile Sticky Bottom Navigation (Hidden on Desktop) */}
        <nav className="md:hidden sticky bottom-0 left-0 w-full mt-auto z-40 bg-surface/90 backdrop-blur-xl border-t border-borderLight/50 pb-safe pt-2 flex justify-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <div className="w-full flex justify-around items-center px-2">
            {navItems.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)} 
                  className="relative flex flex-col items-center gap-1 w-16 p-2 rounded-2xl tap-highlight-transparent active:scale-95 transition-transform"
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-primary/10 rounded-2xl animate-in zoom-in duration-200"></div>
                  )}
                  <div className={`relative transition-colors duration-200 ${isActive ? 'text-primary' : 'text-muted'}`}>
                    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={`text-[10px] font-bold transition-colors duration-200 ${isActive ? 'text-primary' : 'text-muted'}`}>
                    {tab.label}
                  </span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* OTP Bottom Sheet / Dialog */}
        {activeOtpBookingId && (
        <PartnerOtpSheet
          isOpen={true}
          bookingId={activeOtpBookingId}
          onClose={() => setActiveOtpBookingId(null)}
          onSuccess={() => { fetchData(); }}
        />
      )}

        <CreateListingSheet 
          isOpen={showCreateListing}
          onClose={() => setShowCreateListing(false)}
          categoriesList={categoriesList}
          partnerProfile={profile}
          onSuccess={() => {
            fetchData();
            setShowCreateListing(false);
          }}
        />
        
      </div>
    </div>
  );
};