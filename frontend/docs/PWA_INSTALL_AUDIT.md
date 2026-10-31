# PWA Installability Audit

This document details the audit of the PWA installability criteria, tests run, issues found, and fixes applied.

## Audit Criteria (Chrome Lighthouse / PWA Standard)
1. **Valid Manifest**: `manifest.webmanifest` must contain `id`, `name`, `short_name`, `start_url`, `display: standalone`, `theme_color`, `background_color`.
2. **Icons**: Must include at least a 192x192 icon and a 512x512 icon, with `purpose: any maskable` correctly formatted.
3. **Service Worker**: Must be registered and correctly caching resources for offline access.
4. **HTTPS**: App must be served over HTTPS (or localhost during dev).

## Results

### Pre-Fix State
- **Missing Icons**: The `public` directory was missing the required 192x192, 512x512, and maskable icons. This automatically failed Chrome's installability criteria.
- **No Early Event Capture**: The `beforeinstallprompt` event fires very early on page load. React components mounting later were missing the event, making the native prompt impossible to trigger manually from an install button.
- **Missing Fallbacks**: Users on iOS Safari, in-app browsers, or unsupported platforms had no guidance.

### Post-Fix Verification (Passed)
- Generated required `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png` and placed them in `/public`.
- Updated `vite.config.ts` to include the assets and correctly map them in the manifest.
- Implemented `installStore.ts` as a pure JS singleton loaded directly in `main.tsx` before React renders, successfully capturing `beforeinstallprompt`.
- Built and previewed using `npm run build && vite preview`. The dev tools Application > Manifest tab shows "Installability: Passed".
- Tested the `/dev/pwa-debug` route, which confirms all 4 criteria pass successfully in a supported environment.
