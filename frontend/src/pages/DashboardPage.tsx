import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const [hasPlan, setHasPlan] = useState<boolean>(true);

  useEffect(() => {
    // Listen for global 402 plan required events
    const handlePlanRequired = () => setHasPlan(false);
    window.addEventListener('dtg:plan_required', handlePlanRequired);

    return () => {
      window.removeEventListener('dtg:plan_required', handlePlanRequired);
    };
  }, []);

  return (
    <div className="container" style={{ padding: '3rem 1rem 5rem' }}>
      {!hasPlan && (
        <div style={{
          background: 'hsl(355 80% 60% / 0.15)',
          border: '1px solid var(--color-error)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div>
            <h4 style={{ color: 'hsl(355 80% 85%)', fontSize: 'var(--text-base)', marginBottom: '0.25rem' }}>
              ⚠️ Active Subscription Required
            </h4>
            <p style={{ color: 'hsl(355 80% 75%)', fontSize: 'var(--text-sm)' }}>
              Your subscription plan is inactive or expired. Companion discovery and bookings are locked.
            </p>
          </div>
          <Link
            to="/pricing?reason=plan_required"
            style={{
              background: 'var(--color-primary)',
              color: '#fff',
              padding: '0.625rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
            }}
          >
            Upgrade Plan →
          </Link>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', background: 'hsl(145 70% 50% / 0.1)', color: 'var(--color-success)', fontSize: 'var(--text-xs)', fontWeight: 700, marginBottom: '0.5rem' }}>
            ● Membership Active
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 800 }}>
            Welcome back to Date to Go
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Safe, verified platonic companion platform across major Indian metropolitan cities.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link
            to="/pricing"
            style={{
              background: 'var(--color-surface-2)',
              color: 'var(--color-text)',
              padding: '0.75rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              border: '1px solid var(--color-border)',
            }}
          >
            Change Plan
          </Link>
          <Link
            to="/billing"
            style={{
              background: 'var(--color-primary)',
              color: '#fff',
              padding: '0.75rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            View Invoices
          </Link>
        </div>
      </div>

      {/* Quick Action Feature Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔍</div>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '0.5rem' }}>
            Find Companions
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: '1.5rem' }}>
            Browse KYC-verified platonic companions for dinner, coffee, city tours, or corporate events.
          </p>
          <span style={{ color: 'var(--color-primary-light)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
            Unlocked with Plan ✓
          </span>
        </div>

        <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📅</div>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '0.5rem' }}>
            Active Bookings
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: '1.5rem' }}>
            Review your upcoming confirmed reservations, calendar slots, and venue details.
          </p>
          <span style={{ color: 'var(--color-primary-light)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
            0 Pending Requests
          </span>
        </div>

        <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🛡️</div>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: '0.5rem' }}>
            Safety &amp; Emergency Check-ins
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: '1.5rem' }}>
            Live emergency contact alerts, public venue verification, and 24/7 dedicated support.
          </p>
          <span style={{ color: 'var(--color-success)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
            Emergency Contact Set ✓
          </span>
        </div>
      </div>
    </div>
  );
};
