import React from 'react';

export const PolicyPages: React.FC<{ type: 'terms' | 'privacy' | 'guidelines' }> = ({ type }) => {
  const content = {
    terms: {
      title: 'Terms of Service',
      body: 'Welcome to Date to Go. This platform is strictly for platonic companionship...',
    },
    privacy: {
      title: 'Privacy Policy',
      body: 'Aligned with DPDP Act 2023. We collect KYC data which is stored securely...',
    },
    guidelines: {
      title: 'Safety & Community Guidelines',
      body: '1. Always meet in public.\n2. No romantic or sexual solicitations.\n3. Report suspicious behavior.',
    },
  };

  const { title, body } = content[type];

  return (
    <div className="container" style={{ padding: '4rem 1rem', maxWidth: '800px', margin: '0 auto' }}>
      <div className="glass" style={{ padding: '3rem', borderRadius: 'var(--radius-xl)' }}>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, marginBottom: '2rem' }}>{title}</h1>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', color: 'var(--color-text-muted)' }}>
          {body}
          <br /><br />
          <strong style={{ color: '#f59e0b' }}>[REVIEW WITH A LAWYER]</strong>
        </div>
      </div>
    </div>
  );
};
