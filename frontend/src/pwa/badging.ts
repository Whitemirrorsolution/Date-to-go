/**
 * PWA Badging API Utility
 * Safely updates or clears the OS/PWA application icon badge count with fallback.
 */

export async function setAppBadge(count: number): Promise<void> {
  try {
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        await (navigator as any).setAppBadge(count);
      } else {
        await (navigator as any).clearAppBadge();
      }
    }
  } catch (err) {
    // Non-critical API: silently swallow or debug log
    console.debug('PWA Badging API unavailable or restricted:', err);
  }
}

export async function clearAppBadge(): Promise<void> {
  try {
    if ('clearAppBadge' in navigator) {
      await (navigator as any).clearAppBadge();
    }
  } catch (err) {
    console.debug('PWA Badging clear unavailable:', err);
  }
}
