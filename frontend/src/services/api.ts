/**
 * API client for Date to Go frontend.
 *
 * Uses the shared axios instance (src/api/axios.js) configured with config.API_URL.
 */

import { axiosInstance, getAccessToken, setAccessToken, silentRefresh } from '../api/axios.js';

export { getAccessToken, setAccessToken, silentRefresh };

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

// ── Core request function using shared axios instance ──────────────────────

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  let url = endpoint;
  if (!url.startsWith('/v1/') && url !== '/v1') {
    url = `/v1${url.startsWith('/') ? '' : '/'}${url}`;
  }

  try {
    const isFormData = options.body instanceof FormData;
    let dataPayload = options.body;
    if (dataPayload && typeof dataPayload === 'string' && !isFormData) {
      try {
        dataPayload = JSON.parse(dataPayload);
      } catch {
        // Leave as string if not JSON
      }
    }

    const res = await axiosInstance.request<ApiResponse<T>>({
      url,
      method: (options.method as any) || 'GET',
      data: dataPayload,
      headers: (options.headers as Record<string, string>) || {},
    });

    return res.data;
  } catch (err: any) {
    if (err.response?.data) {
      throw err.response.data;
    }
    throw {
      success: false,
      message: err.message || 'An unexpected error occurred. Please try again.',
    };
  }
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
