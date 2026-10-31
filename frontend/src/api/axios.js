import axios from 'axios';
import { API_URL } from '../config/index.js';

// In-memory token store (survives page transitions, lost on hard refresh)
let _accessToken = null;
let _refreshPromise = null;

export function getAccessToken() {
  return _accessToken;
}

export function setAccessToken(token) {
  _accessToken = token;
}

/**
 * Single-flight silent token refresh using httpOnly cookie
 */
export async function silentRefresh() {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      const res = await axios.post(
        `${API_URL}/v1/auth/refresh`,
        {},
        {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const token = res.data?.data?.accessToken || res.data?.accessToken || null;
      _accessToken = token;
      return token;
    } catch {
      _accessToken = null;
      return null;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

// Create the single shared axios instance
export const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach Authorization header
axiosInstance.interceptors.request.use(
  (reqConfig) => {
    const token = getAccessToken();
    if (token) {
      reqConfig.headers = reqConfig.headers || {};
      reqConfig.headers.Authorization = `Bearer ${token}`;
    }
    return reqConfig;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 retry & 402 plan-gate
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 402: subscription plan required
    if (error.response?.status === 402) {
      window.dispatchEvent(
        new CustomEvent('dtg:plan_required', {
          detail: { message: 'An active subscription plan is required for this action.' },
        })
      );
    }

    // 401: token expired, single retry with refreshed token
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const newToken = await silentRefresh();
        if (newToken) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshErr) {
        window.dispatchEvent(new CustomEvent('dtg:session_expired'));
        return Promise.reject(refreshErr);
      }
      window.dispatchEvent(new CustomEvent('dtg:session_expired'));
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
export { axiosInstance as axios };

