export interface InstallState {
  canPromptInstall: boolean;
  isInstalled: boolean;
  platform: string;
  isInAppBrowser: boolean;
  isIosSafari: boolean;
  dismissedUntil: number | null;
  visits: number;
}

let deferredPrompt: any = null;

let state: InstallState = {
  canPromptInstall: false,
  isInstalled: false,
  platform: 'unknown',
  isInAppBrowser: false,
  isIosSafari: false,
  dismissedUntil: null,
  visits: 1,
};

const listeners = new Set<(state: InstallState) => void>();

function emit() {
  listeners.forEach((listener) => listener({ ...state }));
}

export function subscribeToInstallState(listener: (state: InstallState) => void) {
  listeners.add(listener);
  listener({ ...state });
  return () => {
    listeners.delete(listener);
  };
}

export function getInstallState(): InstallState {
  return { ...state };
}

export function dismissInstallPrompt(days = 14) {
  const until = Date.now() + days * 24 * 60 * 60 * 1000;
  localStorage.setItem('dtg_install_dismissed', until.toString());
  state.dismissedUntil = until;
  emit();
}

export async function promptInstall() {
  if (deferredPrompt) {
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        // user installed
      }
    } catch (e) {
      console.error('Install prompt failed', e);
    }
    deferredPrompt = null;
    state.canPromptInstall = false;
    emit();
  }
}

// ── Detect platform and browsers ──────────────────────────────────────────
function detectEnvironment() {
  if (typeof window === 'undefined') return;

  const ua = window.navigator.userAgent || '';

  // Check installed state
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  // @ts-ignore
  const isIosStandalone = window.navigator.standalone === true;
  state.isInstalled = isStandalone || isIosStandalone;

  // Platform
  if (/android/i.test(ua)) state.platform = 'android';
  else if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) state.platform = 'ios';
  else if (/Win/.test(ua)) state.platform = 'windows';
  else if (/Mac/.test(ua)) state.platform = 'mac';
  else state.platform = 'desktop';

  // Safari check
  state.isIosSafari = state.platform === 'ios' && /WebKit/i.test(ua) && !/CriOS/i.test(ua) && !/FxiOS/i.test(ua);

  // In-app browsers
  state.isInAppBrowser = /FBAN|FBAV|Instagram|WhatsApp|Telegram|Snapchat|LinkedIn/i.test(ua);

  // Dismissal check
  const dismissed = localStorage.getItem('dtg_install_dismissed');
  if (dismissed) {
    const until = parseInt(dismissed, 10);
    if (until > Date.now()) {
      state.dismissedUntil = until;
    } else {
      localStorage.removeItem('dtg_install_dismissed');
    }
  }

  // Visit tracker
  const visits = parseInt(localStorage.getItem('dtg_visits') || '0', 10);
  if (!sessionStorage.getItem('dtg_session_tracked')) {
    const newVisits = visits + 1;
    localStorage.setItem('dtg_visits', newVisits.toString());
    sessionStorage.setItem('dtg_session_tracked', '1');
    state.visits = newVisits;
  } else {
    state.visits = visits;
  }

  emit();
}

// ── Setup Listeners ────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  detectEnvironment();

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    state.canPromptInstall = true;
    emit();
  });

  window.addEventListener('appinstalled', () => {
    state.isInstalled = true;
    state.canPromptInstall = false;
    emit();
    // Dispatch analytics event
    window.dispatchEvent(new CustomEvent('dtg:app_installed'));
  });

  window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
    state.isInstalled = e.matches;
    emit();
  });
}
