let rawDomain = import.meta.env.VITE_BASE_DOMAIN;

if (!rawDomain) {
  if (import.meta.env.DEV) {
    rawDomain = 'http://localhost:5000';
  } else {
    throw new Error(
      'Configuration Error: VITE_BASE_DOMAIN is missing in production environment. Please configure VITE_BASE_DOMAIN in your environment.'
    );
  }
}

// Clean trailing slash if present
export const BASE_URL = rawDomain.replace(/\/+$/, '');
export const API_URL = `${BASE_URL}/api`;
export const SOCKET_URL = BASE_URL;
export const IMAGE_URL = `${BASE_URL}/api/v1/images`;

export const config = {
  BASE_URL,
  API_URL,
  SOCKET_URL,
  IMAGE_URL,
};

export default config;

