import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * PartnerLayout – Wrapper shell for all /p/* routes.
 * Currently a simple pass-through like the original PartnerShell.
 * Individual partner pages (Dashboard, KYC, Profile, etc.) manage their own
 * headers, sidebars, and navigation internally.
 */
export const PartnerLayout: React.FC = () => {
  return <Outlet />;
};
