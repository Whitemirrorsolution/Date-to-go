import 'dotenv/config';

const NODE_ENV = process.env.NODE_ENV || 'development';
const isDev = NODE_ENV === 'development';

const rawDomain = process.env.BASE_DOMAIN || (isDev ? 'http://localhost:5000' : '');

if (!rawDomain && !isDev && NODE_ENV !== 'test') {
  throw new Error('BASE_DOMAIN environment variable is missing. Please define BASE_DOMAIN in your environment.');
}

export const BASE_URL = (rawDomain || 'http://localhost:5000').replace(/\/+$/, '');
export const CLIENT_URL = BASE_URL;
export const API_URL = `${BASE_URL}/api`;
export const IMAGE_URL = `${BASE_URL}/api/v1/images`;
export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

const originsSet = new Set();

if (BASE_URL) {
  originsSet.add(BASE_URL);
  try {
    const url = new URL(BASE_URL);
    if (url.hostname.startsWith('www.')) {
      const nonWww = url.hostname.replace(/^www\./, '');
      originsSet.add(`${url.protocol}//${nonWww}${url.port ? `:${url.port}` : ''}`);
    } else if (url.hostname !== 'localhost' && !url.hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      originsSet.add(`${url.protocol}//www.${url.hostname}${url.port ? `:${url.port}` : ''}`);
    }
  } catch {
    // If not a full URL, fallback
  }
}

if (isDev || NODE_ENV === 'test') {
  originsSet.add('http://localhost:5173');
  originsSet.add('http://localhost:3000');
  originsSet.add('http://localhost:5000');
  originsSet.add('http://127.0.0.1:5173');
  originsSet.add('http://127.0.0.1:3000');
  originsSet.add('http://127.0.0.1:5000');
}

if (process.env.CORS_ORIGINS) {
  process.env.CORS_ORIGINS.split(',').forEach((o) => {
    const trimmed = o.trim();
    if (trimmed) originsSet.add(trimmed);
  });
}

export const ALLOWED_ORIGINS = Array.from(originsSet);

export const config = {
  BASE_URL,
  CLIENT_URL,
  API_URL,
  IMAGE_URL,
  PORT,
  NODE_ENV,
  ALLOWED_ORIGINS,
};

export default config;

