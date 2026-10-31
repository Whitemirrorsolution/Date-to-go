import React from 'react';
import { PolicyPages } from './PolicyPages.js';

// Re-routing old policy pages to the new dynamic DocumentPage
export const DynamicPolicyPage: React.FC<{ type: 'terms' | 'privacy' | 'guidelines' }> = ({ type }) => {
  return <PolicyPages type={type} />; 
};
// We will modify App.tsx directly instead.
