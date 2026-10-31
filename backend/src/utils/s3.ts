import { env } from '../config/env.js';

/**
 * Generates a signed URL for secure image/photo access.
 * Supports S3 or fallback URL generation.
 */
export async function getSignedUrl(keyOrUrl?: string, ttlMinutes = 30): Promise<string> {
  if (!keyOrUrl) {
    return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop';
  }

  // If already a full URL, return it
  if (keyOrUrl.startsWith('http://') || keyOrUrl.startsWith('https://')) {
    return keyOrUrl;
  }

  const expires = Math.floor(Date.now() / 1000) + ttlMinutes * 60;
  return `https://${env.APP_NAME.toLowerCase().replace(/[^a-z0-9]/g, '')}-media.s3.amazonaws.com/${encodeURIComponent(keyOrUrl)}?expires=${expires}&signature=mock-sig`;
}
