/**
 * API client for Date to Go frontend.
 *
 * Security design:
 * - Access token stored IN MEMORY ONLY (never localStorage/sessionStorage)
 *   → survives page navigation but is lost on hard-refresh (intentional)
 *   → silent refresh on mount restores session from httpOnly cookie
 * - Single-flight refresh: concurrent 401s queue behind one refresh call
 * - Refresh token lives only in httpOnly Secure SameSite=Strict cookie
 *   (managed by the backend, invisible to JavaScript)
 */

const API_BASE = '/api/v1';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  code?: string;
  errors?: Record<string, string[]>;
}

export function formatApiError(err: any): string {
  if (err?.errors && Object.keys(err.errors).length > 0) {
    const messages: string[] = [];
    for (const [field, fieldErrors] of Object.entries(err.errors)) {
      const formattedField = field === '_root' ? '' : `${field.charAt(0).toUpperCase() + field.slice(1)}: `;
      const errList = Array.isArray(fieldErrors) ? fieldErrors.join(', ') : fieldErrors;
      messages.push(`• ${formattedField}${errList}`);
    }
    return messages.join('\n');
  }
  return err?.message || 'An unexpected error occurred. Please try again.';
}

// ── In-memory token store (NOT localStorage) ──────────────────────────────

let _accessToken: string | null = null;

export function getAccessToken(): string | null {
  return _accessToken;
}
export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

// ── Single-flight refresh mutex ────────────────────────────────────────────

let _refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // sends httpOnly refresh cookie
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      _accessToken = null;
      return null;
    }

    const json = (await res.json()) as ApiResponse<{ accessToken: string }>;
    const token = json.data?.accessToken ?? null;
    _accessToken = token;
    return token;
  } catch {
    _accessToken = null;
    return null;
  }
}

/**
 * Attempt a silent token refresh.
 * Multiple concurrent callers share the same Promise (single-flight).
 */
export async function silentRefresh(): Promise<string | null> {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = doRefresh().finally(() => {
    _refreshPromise = null;
  });
  return _refreshPromise;
}

// ── Core request function ──────────────────────────────────────────────────

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  _retry = true,
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  // 402: subscription plan required — emit global event for the plan-gate listener
  if (res.status === 402) {
    window.dispatchEvent(
      new CustomEvent('dtg:plan_required', {
        detail: { message: 'An active subscription plan is required for this action.' },
      }),
    );
  }

  // 401: access token expired → attempt silent refresh once, then retry
  if (res.status === 401 && _retry) {
    const newToken = await silentRefresh();
    if (newToken) {
      // Retry the original request with the fresh token
      return request<T>(endpoint, options, false);
    }
    // Refresh failed — emit logout event
    window.dispatchEvent(new CustomEvent('dtg:session_expired'));
  }

  const data = (await res.json()) as ApiResponse<T>;

  if (!res.ok) {
    throw data; // Caller receives the API error object
  }

  return data;
}

// ── Convenience methods ────────────────────────────────────────────────────

export const api = {
  get<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return request<T>(endpoint, { method: 'GET', ...options });
  },

  post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    const isFormData = body instanceof FormData;
    return request<T>(endpoint, {
      method: 'POST',
      ...(body !== undefined ? { body: isFormData ? (body as any) : JSON.stringify(body) } : {}),
      ...options,
    });
  },

  patch<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    const isFormData = body instanceof FormData;
    return request<T>(endpoint, {
      method: 'PATCH',
      ...(body !== undefined ? { body: isFormData ? (body as any) : JSON.stringify(body) } : {}),
      ...options,
    });
  },

  put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    const isFormData = body instanceof FormData;
    return request<T>(endpoint, {
      method: 'PUT',
      ...(body !== undefined ? { body: isFormData ? (body as any) : JSON.stringify(body) } : {}),
      ...options,
    });
  },

  delete<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    const isFormData = body instanceof FormData;
    return request<T>(endpoint, {
      method: 'DELETE',
      ...(body !== undefined ? { body: isFormData ? (body as any) : JSON.stringify(body) } : {}),
      ...options,
    });
  },
};

/**
 * Loads the Razorpay checkout script dynamically (idempotent).
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-sdk')) return resolve(true);
    const script = document.createElement('script');
    script.id = 'razorpay-sdk';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
