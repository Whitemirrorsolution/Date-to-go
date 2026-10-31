import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const location = useLocation();

  const links = [
    { name: 'Home', path: '/' },
    { name: '🔍 Discover', path: '/s/discover' },
    { name: '👤 Profile', path: '/s/profile' },
    { name: '💼 Partner Portal', path: '/p/home' },
    { name: '💎 Plans', path: '/pricing' },
  ];

  return (
    <header className="glass" style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--color-border)' }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '4.5rem' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <div style={{
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            boxShadow: 'var(--shadow-glow)'
          }}>
            ✨
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
            Date to Go
          </span>
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {links.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500,
                  color: isActive ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: isActive ? 'hsl(255 100% 65% / 0.1)' : 'transparent',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
