export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    VERIFY_OTP: '/auth/verify-otp',
    LOGOUT: '/auth/logout',
    PROFILE: '/auth/profile', // Or wherever the user info endpoint is
  },
  BOOKINGS: {
    GET_ALL: '/bookings',
    GET_DETAILS: (id: string) => `/bookings/${id}`,
    CREATE: '/bookings',
    UPDATE_STATUS: (id: string) => `/bookings/${id}/status`,
  },
  DISCOVER: {
    CATEGORIES: '/social/categories',
    ALL_LISTINGS: '/discover/categories/all/listings',
    CATEGORY_LISTINGS: (slug: string) => `/discover/categories/${slug}/listings`,
  },
  WALLET: {
    BALANCE: '/wallet/balance',
    TOPUP: '/wallet/topup',
    HISTORY: '/payments/history',
  }
};
