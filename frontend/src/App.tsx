import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AccessProvider } from './shared/providers/AccessProvider';
import { RequireAccess } from './shared/components/RequireAccess';
import { SplashScreen } from './shared/components/SplashScreen';

// Public pages
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PricingPage } from './pages/PricingPage';
import { VerifyEmailPage, VerifyPhonePage } from './pages/VerifyPages';
import { ForgotPasswordPage, ResetPasswordPage, ChangePasswordPage } from './pages/PasswordPages';

// Shared / Authenticated 
import { NotificationsPage } from './pages/NotificationsPage';

// Lazy load shells
const SeekerShell = lazy(() => import('./components/layout/SeekerShell').then(m => ({ default: m.SeekerShell })));
const PartnerLayout = lazy(() => import('./layout/PartnerLayout').then(m => ({ default: m.PartnerLayout })));

// Seeker Pages
const BookingPage = lazy(() => import('./roles/seeker/pages/BookingPage').then(m => ({ default: m.BookingPage })));
const BookingChatPage = lazy(() => import('./pages/BookingChatPage').then(m => ({ default: m.BookingChatPage })));
const BillingPage = lazy(() => import('./pages/BillingPage').then(m => ({ default: m.BillingPage })));
const DiscoverPage = lazy(() => import('./roles/seeker/pages/DiscoverPage').then(m => ({ default: m.DiscoverPage })));
const HistoryPage = lazy(() => import('./roles/seeker/pages/HistoryPage').then(m => ({ default: m.HistoryPage })));
const SavedFavoritesPage = lazy(() => import('./roles/seeker/pages/SavedFavoritesPage').then(m => ({ default: m.SavedFavoritesPage })));
const HomeDashboard = lazy(() => import('./roles/seeker/pages/HomeDashboard').then(m => ({ default: m.HomeDashboard })));
const MyDetailsPage = lazy(() => import('./pages/MyDetailsPage').then(m => ({ default: m.MyDetailsPage })));
const NotificationSettingsPage = lazy(() => import('./pages/NotificationSettingsPage').then(m => ({ default: m.NotificationSettingsPage })));
const HelpPage = lazy(() => import('./pages/HelpPage').then(m => ({ default: m.HelpPage })));
const TicketsPage = lazy(() => import('./pages/TicketsPage').then(m => ({ default: m.TicketsPage })));
const PolicyPages = lazy(() => import('./pages/PolicyPages').then(m => ({ default: m.PolicyPages })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const ServiceDetailsPage = lazy(() => import('./roles/seeker/pages/ServiceDetailsPage').then(m => ({ default: m.ServiceDetailsPage })));
const PartnerPublicProfilePage = lazy(() => import('./roles/seeker/pages/PartnerPublicProfilePage').then(m => ({ default: m.PartnerPublicProfilePage })));
const WalletPage = lazy(() => import('./pages/WalletPage').then(m => ({ default: m.WalletPage })));
const WalletTopupPage = lazy(() => import('./pages/WalletTopupPage').then(m => ({ default: m.WalletTopupPage })));

// Partner Pages
const BecomePartnerWizard = lazy(() => import('./roles/partner/pages/BecomePartnerWizard').then(m => ({ default: m.BecomePartnerWizard })));
const PartnerDashboardPage = lazy(() => import('./roles/partner/pages/PartnerDashboardPage').then(m => ({ default: m.PartnerDashboardPage })));
const PartnerProfilePage = lazy(() => import('./roles/partner/pages/PartnerProfilePage').then(m => ({ default: m.PartnerProfilePage })));
const KycPage = lazy(() => import('./roles/partner/pages/KycPage').then(m => ({ default: m.KycPage })));
const PartnerBookingDetailsPage = lazy(() => import('./roles/partner/pages/PartnerBookingDetailsPage').then(m => ({ default: m.PartnerBookingDetailsPage })));
const PartnerListingDetailsPage = lazy(() => import('./roles/partner/pages/PartnerListingDetailsPage').then(m => ({ default: m.PartnerListingDetailsPage })));

// Admin Pages
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const OnboardingPage = lazy(() => import('./pages/onboarding/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const SeekerBranchWizard = lazy(() => import('./pages/onboarding/SeekerBranchWizard').then(m => ({ default: m.SeekerBranchWizard })));
const PartnerBranchWizard = lazy(() => import('./pages/onboarding/PartnerBranchWizard').then(m => ({ default: m.PartnerBranchWizard })));
import { useAuth } from './context/AuthContext';

function HomeRedirect(): JSX.Element {
  const { user, isLoading, accessData } = useAuth();
  if (isLoading) return <SplashScreen />;
  if (!user) return <Navigate to="/onboarding" replace />;

  if (user.activeMode === 'PARTNER' || user.roles?.includes('PARTNER')) {
    if (!accessData?.entitlements?.partner?.active && !user.roles?.includes('ADMIN')) {
      return <Navigate to="/pricing" replace />;
    }
    return <Navigate to="/p/dashboard" replace />;
  }

  if (accessData?.nextRoute) {
    return <Navigate to={accessData.nextRoute} replace />;
  }

  return <Navigate to="/s/home" replace />;
}

function AppContent(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/onboarding/seeker" element={<Suspense fallback={<SplashScreen />}><SeekerBranchWizard /></Suspense>} />
      <Route path="/onboarding/partner" element={<Suspense fallback={<SplashScreen />}><PartnerBranchWizard /></Suspense>} />
      <Route path="/onboarding" element={<Suspense fallback={<SplashScreen />}><OnboardingPage /></Suspense>} />
      <Route path="/onboarding/*" element={<Suspense fallback={<SplashScreen />}><OnboardingPage /></Suspense>} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/verify-otp" element={<VerifyPhonePage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/help" element={<HelpPage />} />
      <Route path="/help/tickets/*" element={<RequireAccess><Suspense fallback={<SplashScreen />}><TicketsPage /></Suspense></RequireAccess>} />
      <Route path="/privacy" element={<PolicyPages type="privacy" />} />
      <Route path="/terms" element={<PolicyPages type="terms" />} />
      <Route path="/code-of-conduct" element={<PolicyPages type="guidelines" />} />

      {/* Seeker Route Tree */}
      <Route path="/s" element={<RequireAccess><Suspense fallback={<SplashScreen />}><SeekerShell /></Suspense></RequireAccess>}>
        <Route index element={<Navigate to="/s/home" replace />} />
        <Route path="home" element={<HomeDashboard />} />
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="favorites" element={<SavedFavoritesPage />} />
        <Route path="saved" element={<SavedFavoritesPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="booking" element={<BookingPage />} />
        <Route path="booking/:id" element={<BookingPage />} />
        <Route path="chat/:id" element={<BookingChatPage />} />
        <Route path="chat" element={<Navigate to="/s/booking" replace />} />
        <Route path="listings/:id" element={<ServiceDetailsPage />} />
        <Route path="partner/:id" element={<PartnerPublicProfilePage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="profile/details" element={<MyDetailsPage />} />
        <Route path="notification-settings" element={<NotificationSettingsPage />} />
        <Route path="subscription" element={<BillingPage />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="wallet/topup" element={<WalletTopupPage />} />
        <Route path="*" element={<div>Seeker Page Not Found</div>} />
      </Route>

      {/* Partner Route Tree */}
      <Route path="/p" element={<RequireAccess><Suspense fallback={<SplashScreen />}><PartnerLayout /></Suspense></RequireAccess>}>
        <Route index element={<Navigate to="/p/dashboard" replace />} />
        <Route path="" element={<Navigate to="/p/dashboard" replace />} />
        <Route path="home" element={<Navigate to="/p/dashboard" replace />} />
        <Route path="dashboard" element={<PartnerDashboardPage />} />
        <Route path="onboarding" element={<BecomePartnerWizard />} />
        <Route path="kyc" element={<KycPage />} />
        <Route path="status" element={<KycPage />} />
        <Route path="suspended" element={<PartnerDashboardPage />} />
        <Route path="profile" element={<PartnerProfilePage />} />
        <Route path="renew" element={<PricingPage />} />
        <Route path="booking/:id" element={<PartnerBookingDetailsPage />} />
        <Route path="listings/:id" element={<PartnerListingDetailsPage />} />
        <Route path="chat/:id" element={<BookingChatPage />} />
        <Route path="chat" element={<Navigate to="/p/dashboard?tab=requests" replace />} />
        <Route path="*" element={<div>Partner Page Not Found</div>} />
      </Route>

      {/* Admin Route Tree */}
      <Route path="/admin/*" element={<RequireAccess><Suspense fallback={<SplashScreen />}><AdminDashboardPage /></Suspense></RequireAccess>} />

      {/* Partner Public Profile — viewed by seekers and visitors */}
      <Route
        path="/partner/:id"
        element={
          <Suspense fallback={<SplashScreen />}>
            <PartnerPublicProfilePage />
          </Suspense>
        }
      />
      <Route
        path="/s/partner/:id"
        element={
          <Suspense fallback={<SplashScreen />}>
            <PartnerPublicProfilePage />
          </Suspense>
        }
      />

      {/* Shared Auth */}
      <Route path="/notifications" element={<RequireAccess><NotificationsPage /></RequireAccess>} />


      {/* Fallback */}
      <Route path="*" element={<div>404 Page Not Found</div>} />
    </Routes>
  );
}

import { OfflineBanner } from './shared/components/OfflineBanner';
import { PwaUpdateNotifier } from './shared/components/PwaUpdateNotifier';

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AccessProvider>
          <OfflineBanner />
          <PwaUpdateNotifier />
          <AppContent />
        </AccessProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
