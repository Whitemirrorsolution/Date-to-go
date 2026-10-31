# PWA Features and Installability

This document details the Progressive Web App (PWA) configuration and installation experience for Date to Go.

## Overview
Date to Go is fully installable as a PWA across desktop and mobile devices. We use `vite-plugin-pwa` with an `injectManifest` strategy to control caching and offline behavior through a custom service worker.

## Installability Criteria
To ensure Chrome and other browsers recognize the app as installable, the app serves:
- A `manifest.webmanifest` containing `name`, `short_name`, `start_url`, `display: standalone`, `theme_color`, and `background_color`.
- A 192x192 PNG icon and a 512x512 PNG icon (with `purpose: maskable` configured).
- A registered, active Service Worker.

## Early Event Capture
The `beforeinstallprompt` event fires immediately upon page load (often before React mounts). To prevent losing this event, we have a pure JavaScript module `src/pwa/installStore.ts` that is imported at the very top of `main.tsx`. 
This module:
1. Prevents the default prompt behavior.
2. Saves the event reference (`deferredPrompt`).
3. Determines the environment (iOS Safari, in-app browsers, desktop).
4. Emits state to React components via `subscribeToInstallState`.

## User Interface Placements
We provide a seamless installation experience by scattering contextual install buttons throughout the app without blocking navigation:
- **Global Bottom Banner**: Appears only on the 2nd visit and after login. Can be dismissed for 14 days.
- **Header Icon**: A compact download icon on the Home Dashboard header.
- **Auth Screens**: Secondary action buttons below the Login and Register cards.
- **Profile Screen**: A dedicated row in the App Settings section showing the installation status.
- **Marketing/Help Pages**: A rich visual component `DownloadAppSection` that includes store fallback buttons.

## Fallback Experiences
Not all browsers support the native `prompt()` method. The `InstallButton` intelligently handles unsupported states via bottom sheets:
- **In-App Browsers** (Instagram, Facebook, WhatsApp, etc.): Shows a sheet instructing the user to tap "Open in Browser" with a button to copy the app link.
- **iOS Safari**: Shows a sheet instructing the user to use the "Share -> Add to Home Screen" option.
- **Desktop/Unsupported**: Instructs the user to look for the install icon in their address bar or browser menu.

## Debugging
A dedicated route `/dev/pwa-debug` is available to view:
- Environment state (Platform, Visits, Dismissed Status).
- Service Worker registration state and scope.
- Live manifest file output.
- A checklist of installability criteria.
