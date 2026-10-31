import React from 'react';


export const AdminPlaceholderPage: React.FC<{ title: string; icon: any }> = ({ title, icon: Icon }) => {
  return (
    <div className="animate-in fade-in flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6">
        <Icon size={40} />
      </div>
      <h1 className="text-3xl font-black mb-2">{title} Module</h1>
      <p className="text-muted max-w-md">
        This module is part of the Admin Panel structure as defined in PLATFORM_FLOW.md. 
        It handles {title.toLowerCase()} management, audit logging, and related SLA operations.
      </p>
    </div>
  );
};
