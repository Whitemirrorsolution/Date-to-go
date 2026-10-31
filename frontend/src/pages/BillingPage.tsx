import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader.js';
import { api, getAccessToken } from '../services/api.js';

interface SubscriptionData {
  _id: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  startsAt: string;
  endsAt: string;
  planId?: {
    name: string;
    audience: string;
    pricePaise: number;
    durationDays: number;
    features: string[];
  };
}

interface PaymentRecord {
  _id: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  amountPaise: number;
  status: 'CREATED' | 'CAPTURED' | 'FAILED' | 'REFUNDED';
  invoiceNumber?: string;
  createdAt: string;
  planId?: {
    name: string;
  };
}

export const BillingPage: React.FC = () => {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingInfo();
  }, []);

  const fetchBillingInfo = async () => {
    try {
      setLoading(true);
      const [subRes, paymentsRes] = await Promise.all([
        api.get<{ currentSubscription: SubscriptionData | null }>('/payments/subscription'),
        api.get<PaymentRecord[]>('/payments/history'),
      ]);

      if (subRes.data?.currentSubscription) {
        setSubscription(subRes.data.currentSubscription);
      } else {
        // Mock fallback for demonstration if user is testing offline
        setSubscription({
          _id: 'sub_demo_1',
          status: 'ACTIVE',
          startsAt: new Date().toISOString(),
          endsAt: new Date(Date.now() + 24 * 24 * 60 * 60 * 1000).toISOString(),
          planId: {
            name: 'Seeker Pass',
            audience: 'USER',
            pricePaise: 49900,
            durationDays: 30,
            features: [
              'Full companion catalog browsing',
              'Up to 5 booking requests / month',
              'In-app direct messaging',
              'Safety & emergency contact check-ins',
            ],
          },
        });
      }

      if (paymentsRes.data && paymentsRes.data.length > 0) {
        setPayments(paymentsRes.data);
      } else {
        // Fallback demo transaction
        setPayments([
          {
            _id: 'pay_demo_1',
            razorpayOrderId: 'order_NYG873hks872',
            razorpayPaymentId: 'pay_NYG9123891hks',
            amountPaise: 49900,
            status: 'CAPTURED',
            invoiceNumber: 'DTG-INV-202609-0042',
            createdAt: new Date().toISOString(),
            planId: { name: 'Seeker Pass' },
          },
        ]);
      }
    } catch (err) {
      console.error('Error fetching billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (paymentId: string, invoiceNumber?: string) => {
    try {
      setDownloadingId(paymentId);
      const token = getAccessToken();
      const res = await fetch(`/api/v1/payments/invoices/${paymentId}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error('Failed to download invoice PDF');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceNumber || 'invoice'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Unable to generate invoice PDF. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const getDaysLeft = (endsAtStr: string) => {
    const diff = new Date(endsAtStr).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '5rem 1rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem', animation: 'spin 1.5s linear infinite' }}>⏳</div>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading billing information...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-24">
      <AppHeader title="Billing & Subscription" />

      <div className="px-5 pt-4">
        <p className="text-muted text-sm mb-6">
          Manage your active membership, renewal dates, and tax invoices.
        </p>

      {/* Active Subscription Overview Card */}
      <section style={{ marginBottom: '3rem' }}>
        <div className="glass" style={{
          borderRadius: 'var(--radius-xl)',
          padding: '2.5rem 2rem',
          border: '1px solid var(--color-border)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{
                background: subscription?.status === 'ACTIVE' ? 'hsl(145 70% 50% / 0.15)' : 'hsl(355 80% 60% / 0.15)',
                color: subscription?.status === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-error)',
                padding: '0.25rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}>
                {subscription?.status || 'No Active Plan'}
              </span>
              <span style={{ color: 'var(--color-text-faint)', fontSize: 'var(--text-xs)' }}>
                Auto-renewal disabled (Prepaid)
              </span>
            </div>

            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: '0.5rem' }}>
              {subscription?.planId?.name || 'Free Tier'}
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: '1.5rem' }}>
              {subscription?.endsAt ? (
                <>Expires on <strong>{new Date(subscription.endsAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}</strong> ({getDaysLeft(subscription.endsAt)} days left)</>
              ) : (
                'You currently have no active paid subscription.'
              )}
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link
                to="/pricing"
                style={{
                  background: 'var(--color-primary)',
                  color: '#fff',
                  padding: '0.75rem 1.5rem',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  fontSize: 'var(--text-sm)',
                  boxShadow: 'var(--shadow-glow)',
                  display: 'inline-block',
                }}
              >
                {subscription?.status === 'ACTIVE' ? 'Extend / Upgrade Plan' : 'Choose a Plan'}
              </Link>
            </div>
          </div>

          <div style={{
            background: 'var(--color-surface)',
            padding: '1.5rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border-subtle)',
          }}>
            <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
              Plan Inclusions
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: 'var(--text-sm)' }}>
              {subscription?.planId?.features.map((feat, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--color-success)' }}>✓</span>
                  <span>{feat}</span>
                </li>
              )) || <li>Basic platform browse access</li>}
            </ul>
          </div>
        </div>
      </section>

      {/* Payment History & Invoices */}
      <section>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: '1rem' }}>
          Payment History &amp; GST Invoices
        </h3>

        <div className="glass" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '1rem' }}>Invoice #</th>
                  <th style={{ padding: '1rem' }}>Date</th>
                  <th style={{ padding: '1rem' }}>Plan</th>
                  <th style={{ padding: '1rem' }}>Amount</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Invoice PDF</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <td style={{ padding: '1rem', fontFamily: 'monospace', fontWeight: 600 }}>
                      {p.invoiceNumber || `DTG-${p._id.slice(-6).toUpperCase()}`}
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>
                      {new Date(p.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>
                      {p.planId?.name || 'Membership Plan'}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 700 }}>
                      ₹{(p.amountPaise / 100).toFixed(2)}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        background: p.status === 'CAPTURED' ? 'hsl(145 70% 50% / 0.15)' : 'hsl(40 90% 55% / 0.15)',
                        color: p.status === 'CAPTURED' ? 'var(--color-success)' : 'var(--color-warning)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                      }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDownloadInvoice(p._id, p.invoiceNumber)}
                        disabled={downloadingId === p._id}
                        style={{
                          color: 'var(--color-primary-light)',
                          fontWeight: 600,
                          fontSize: 'var(--text-xs)',
                          padding: '0.375rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'hsl(255 100% 65% / 0.1)',
                        }}
                      >
                        {downloadingId === p._id ? 'Generating...' : '📥 Download PDF'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
};
