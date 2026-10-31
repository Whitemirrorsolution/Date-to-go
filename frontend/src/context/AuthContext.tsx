/**
 * AuthContext — provides authentication state to the entire React tree.
 *
 * Design:
 * - Access token is NEVER stored in localStorage or sessionStorage.
 * - Token lives in `api.ts` module scope (in-memory).
 * - On mount, a silent refresh attempt restores the session from the
 *   httpOnly refresh-token cookie — transparent to the user.
 * - On `dtg:session_expired` event (from api.ts), user is logged out.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { api, setAccessToken, getAccessToken, silentRefresh } from '../services/api.js';

// ── Types ──────────────────────────────────────────────────────────────────

export type UserRole = 'USER' | 'PARTNER' | 'ADMIN';

export interface AuthUser {
  id: string;
  roles: string[];
  activeMode: 'SEEKER' | 'PARTNER';
  emailVerified: boolean;
  phoneVerified?: boolean;
  onboardingState?: string;
  currentStep?: string;
  roleForkLocked?: boolean;
  kycStatus?: string;
  email?: string;
  fullName?: string;
  phone?: string;
  city?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessData: {
    roles: string[];
    activeMode: 'SEEKER' | 'PARTNER';
    entitlements: { seeker: any; partner: any };
    partner: any;
    nextRoute: string;
  } | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (dto: RegisterDto) => Promise<{ userId: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  switchMode: (mode: 'SEEKER' | 'PARTNER') => Promise<void>;
}

export interface RegisterDto {
  intent: 'Find a partner' | 'Become a partner';
  email: string;
  password: string;
  fullName: string;
  phone: string;
  otp: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dob: string;
  city: string;
  acceptedTerms: true;
  acceptedPrivacy: true;
  acceptedCommunity: true;
}

// ── Context ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessData, setAccessData] = useState<AuthContextValue['accessData']>(null);
  const [isLoading, setIsLoading] = useState(true); // true while restoring session

  /** Fetch /me to hydrate user state after we have a valid token */
  const fetchMe = useCallback(async (): Promise<void> => {
    try {
      const [meRes, accessRes] = await Promise.all([
        api.get<{ user: AuthUser }>('/auth/me'),
        api.get<any>('/auth/me/access')
      ]);
      if (meRes.data?.user) {
        setUser(meRes.data.user);
      }
      if (accessRes.data) {
        setAccessData(accessRes.data);
      }
    } catch (error) {
      setUser(null);
      setAccessData(null);
      setAccessToken(null);
    }
  }, []);

  /** Restore session on mount via silent refresh */
  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      try {
        const token = await silentRefresh();
        if (token) {
          await fetchMe();
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [fetchMe]);

  /** Listen for session expiry events from the api layer */
  useEffect(() => {
    const onExpired = (): void => {
      setUser(null);
      setAccessToken(null);
    };
    window.addEventListener('dtg:session_expired', onExpired);
    return () => window.removeEventListener('dtg:session_expired', onExpired);
  }, []);

  const login = useCallback(
    async (identifier: string, password: string): Promise<void> => {
      const res = await api.post<{ accessToken: string; user: AuthUser }>('/auth/login', {
        identifier,
        password,
      });
      if (res.data?.accessToken) {
        setAccessToken(res.data.accessToken);
        await fetchMe();
      }
    },
    [fetchMe],
  );

  const register = useCallback(async (dto: RegisterDto): Promise<{ userId: string }> => {
    const res = await api.post<{ userId: string; accessToken: string }>('/auth/register', dto);
    if (res.data?.accessToken) {
      setAccessToken(res.data.accessToken);
      // Fetch user profile after registration
      await fetchMe();
    }
    return { userId: res.data?.userId ?? '' };
  }, [fetchMe]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    if (getAccessToken()) {
      await fetchMe();
    }
  }, [fetchMe]);

  const switchMode = useCallback(async (targetMode: 'SEEKER' | 'PARTNER'): Promise<void> => {
    await api.post('/auth/me/mode', { mode: targetMode });
    await refreshUser();
    // Await access fetch separately or let SSE handle it?
    // SSE will trigger AccessProvider refetch, which will trigger route redirect automatically.
  }, [refreshUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessData,
        isLoading,
        isAuthenticated: user !== null,
        login,
        register,
        logout,
        refreshUser,
        switchMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>');
  }
  return ctx;
}
