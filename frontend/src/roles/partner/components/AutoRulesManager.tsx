import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import {
  Sparkles, Plus, Trash2, Edit3, Play, CheckCircle2, XCircle,
  Clock, Check
} from 'lucide-react';

export interface PartnerRuleItem {
  _id: string;
  name: string;
  description?: string;
  priority: number;
  enabled: boolean;
  action: 'AUTO_DECLINE' | 'AUTO_ACCEPT';
  conditions: {
    minLeadTimeHours?: number;
    maxDistanceKm?: number;
    allowedPincodes?: string[];
    allowedCategoryIds?: string[];
    minDurationMins?: number;
    maxDurationMins?: number;
    maxDailyBookings?: number;
    verifiedSeekersOnly?: boolean;
    noUpheldStrikesLast12Months?: boolean;
  };
  hitCount: number;
  lastFiredAt?: string;
}

interface SimulationStep {
  ruleId: string;
  ruleName: string;
  priority: number;
  action: 'AUTO_DECLINE' | 'AUTO_ACCEPT';
  conditionsChecked: Array<{
    name: string;
    expected: any;
    actual: any;
    matched: boolean;
  }>;
  overallMatch: boolean;
  actionTaken?: 'AUTO_DECLINE' | 'AUTO_ACCEPT';
  blockedBySafetyConstraint?: boolean;
}

export const AutoRulesManager: React.FC = () => {
  const [rules, setRules] = useState<PartnerRuleItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<PartnerRuleItem | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [action, setAction] = useState<'AUTO_DECLINE' | 'AUTO_ACCEPT'>('AUTO_DECLINE');
  const [minLeadTimeHours, setMinLeadTimeHours] = useState<number | ''>(2);
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | ''>('');
  const [minDurationMins, setMinDurationMins] = useState<number | ''>('');
  const [maxDurationMins, setMaxDurationMins] = useState<number | ''>('');
  const [maxDailyBookings, setMaxDailyBookings] = useState<number | ''>('');
  const [verifiedSeekersOnly, setVerifiedSeekersOnly] = useState(false);
  const [noStrikes, setNoStrikes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Simulator state
  const [showSimulator, setShowSimulator] = useState(false);
  const [simDate, setSimDate] = useState(() => {
    const d = new Date(Date.now() + 3 * 3600 * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [simDuration, setSimDuration] = useState(60);
  const [simCategory, setSimCategory] = useState('');
  const [simPincode, setSimPincode] = useState('110001');
  const [simRunning, setSimRunning] = useState(false);
  const [simResults, setSimResults] = useState<{
    steps: SimulationStep[];
    matchedRule?: SimulationStep;
  } | null>(null);

  useEffect(() => {
    fetchRules();
    fetchCategories();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await api.get<PartnerRuleItem[]>('/partner/rules');
      setRules(res.data || []);
    } catch (err: any) {
      console.error('Failed to load rules', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get<any[]>('/categories');
      setCategories(res.data || []);
      if (res.data && res.data.length > 0 && !simCategory) {
        setSimCategory(res.data[0]._id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenCreate = () => {
    setEditingRule(null);
    setName('');
    setAction('AUTO_DECLINE');
    setMinLeadTimeHours(2);
    setMaxDistanceKm('');
    setMinDurationMins('');
    setMaxDurationMins('');
    setMaxDailyBookings('');
    setVerifiedSeekersOnly(false);
    setNoStrikes(false);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (rule: PartnerRuleItem) => {
    setEditingRule(rule);
    setName(rule.name);
    setAction(rule.action);
    setMinLeadTimeHours(rule.conditions.minLeadTimeHours ?? '');
    setMaxDistanceKm(rule.conditions.maxDistanceKm ?? '');
    setMinDurationMins(rule.conditions.minDurationMins ?? '');
    setMaxDurationMins(rule.conditions.maxDurationMins ?? '');
    setMaxDailyBookings(rule.conditions.maxDailyBookings ?? '');
    setVerifiedSeekersOnly(!!rule.conditions.verifiedSeekersOnly);
    setNoStrikes(!!rule.conditions.noUpheldStrikesLast12Months);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleToggleRule = async (rule: PartnerRuleItem) => {
    try {
      await api.put(`/partner/rules/${rule._id}`, { enabled: !rule.enabled });
      setRules((prev) =>
        prev.map((r) => (r._id === rule._id ? { ...r, enabled: !r.enabled } : r))
      );
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    try {
      await api.delete(`/partner/rules/${ruleId}`);
      setRules((prev) => prev.filter((r) => r._id !== ruleId));
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter a rule name');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    const conditions: any = {};
    if (minLeadTimeHours !== '') conditions.minLeadTimeHours = Number(minLeadTimeHours);
    if (maxDistanceKm !== '') conditions.maxDistanceKm = Number(maxDistanceKm);
    if (minDurationMins !== '') conditions.minDurationMins = Number(minDurationMins);
    if (maxDurationMins !== '') conditions.maxDurationMins = Number(maxDurationMins);
    if (maxDailyBookings !== '') conditions.maxDailyBookings = Number(maxDailyBookings);
    if (verifiedSeekersOnly) conditions.verifiedSeekersOnly = true;
    if (noStrikes) conditions.noUpheldStrikesLast12Months = true;

    try {
      if (editingRule) {
        const res = await api.put<PartnerRuleItem>(`/partner/rules/${editingRule._id}`, {
          name,
          action,
          conditions,
        });
        if (res.data) {
          setRules((prev) =>
            prev.map((r) => (r._id === editingRule._id ? res.data! : r))
          );
        }
      } else {
        const res = await api.post<PartnerRuleItem>('/partner/rules', {
          name,
          action,
          conditions,
        });
        if (res.data) {
          setRules((prev) => [...prev, res.data!]);
        }
      }
      setShowModal(false);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save automation rule');
    } finally {
      setSaving(false);
    }
  };

  const runSimulation = async () => {
    setSimRunning(true);
    try {
      const res = await api.post<{ steps: SimulationStep[]; matchedRule?: SimulationStep }>(
        '/partner/rules/simulate',
        {
          startAt: new Date(simDate).toISOString(),
          durationMins: simDuration,
          categoryId: simCategory || (categories[0]?._id ?? '000000000000000000000000'),
          venuePincode: simPincode,
        }
      );
      if (res.data) {
        setSimResults(res.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Simulation failed');
    } finally {
      setSimRunning(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner / Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'linear-gradient(135deg, #7000A4 0%, #9B2BD6 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '20px 24px',
          boxShadow: '0 8px 24px rgba(112, 0, 164, 0.2)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Sparkles size={20} color="#FACC15" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Smart Auto-Rules</h2>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.9 }}>
            Set automated policies for instant replies. Tested repeat clients can auto-accept; instant auto-decline applies safely with privacy.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowSimulator(!showSimulator)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.4)',
              background: showSimulator ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)',
              color: '#ffffff',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            <Play size={16} />
            Test My Rules
          </button>
          <button
            onClick={handleOpenCreate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              background: '#ffffff',
              color: '#7000A4',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.875rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            <Plus size={16} />
            New Rule
          </button>
        </div>
      </div>

      {/* Simulator Drawer (Collapsible) */}
      {showSimulator && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '20px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Play size={18} color="#7000A4" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1E293B' }}>
              Automation Simulator (Live Test)
            </h3>
          </div>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.825rem', color: '#64748B' }}>
            Enter hypothetical booking parameters to inspect step-by-step how your configured rules evaluate.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                value={simDate}
                onChange={(e) => setSimDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.85rem',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Duration (minutes)
              </label>
              <input
                type="number"
                min={15}
                step={15}
                value={simDuration}
                onChange={(e) => setSimDuration(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.85rem',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Venue Pincode
              </label>
              <input
                type="text"
                maxLength={6}
                value={simPincode}
                onChange={(e) => setSimPincode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.85rem',
                }}
              />
            </div>
          </div>

          <button
            onClick={runSimulation}
            disabled={simRunning}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              background: '#7000A4',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            {simRunning ? 'Evaluating Rules...' : 'Run Simulation'}
          </button>

          {/* Simulation Output */}
          {simResults && (
            <div style={{ marginTop: '20px', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: simResults.matchedRule ? (simResults.matchedRule.action === 'AUTO_ACCEPT' ? '#DCFCE7' : '#FEE2E2') : '#F8FAFC',
                  marginBottom: '14px',
                }}
              >
                {simResults.matchedRule ? (
                  simResults.matchedRule.action === 'AUTO_ACCEPT' ? (
                    <CheckCircle2 size={20} color="#16A34A" />
                  ) : (
                    <XCircle size={20} color="#DC2626" />
                  )
                ) : (
                  <Clock size={20} color="#64748B" />
                )}
                <div>
                  <strong style={{ fontSize: '0.9rem', color: '#1E293B' }}>
                    Final Verdict:{' '}
                    {simResults.matchedRule
                      ? `${simResults.matchedRule.action} (Triggered by "${simResults.matchedRule.ruleName}")`
                      : 'NO_RULE_FIRED (Goes to manual partner review inbox)'}
                  </strong>
                  {simResults.matchedRule?.blockedBySafetyConstraint && (
                    <div style={{ color: '#DC2626', fontSize: '0.8rem', marginTop: '4px' }}>
                      Safety Gate Active: Auto-Accept blocked because seeker is not a verified repeat client with $\ge 1$ completed date.
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {simResults.steps.map((step) => (
                  <div
                    key={step.ruleId}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      fontSize: '0.825rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, color: '#334155' }}>
                        #{step.priority} {step.ruleName} ({step.action})
                      </span>
                      <span
                        style={{
                          fontWeight: 600,
                          color: step.overallMatch ? '#16A34A' : '#64748B',
                        }}
                      >
                        {step.overallMatch ? 'MATCHED' : 'DID NOT MATCH'}
                      </span>
                    </div>
                    {step.conditionsChecked.map((c, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                        {c.matched ? <Check size={14} color="#16A34A" /> : <XCircle size={14} color="#DC2626" />}
                        <span>
                          {c.name}: Expected {c.expected}, got {c.actual}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rules List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>Loading automation rules...</div>
      ) : rules.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '2px dashed #CBD5E1',
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <Sparkles size={36} color="#A855F7" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E293B', margin: '0 0 6px 0' }}>
            No Auto-Rules Set Up Yet
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#64748B', margin: '0 0 20px 0', maxWidth: '440px', marginInline: 'auto' }}>
            Create auto-rules to instantly decline requests with short notice or long distances, or configure verified-only requirements.
          </p>
          <button
            onClick={handleOpenCreate}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              background: '#7000A4',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Create Your First Rule
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {rules.map((rule) => (
            <div
              key={rule._id}
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                opacity: rule.enabled ? 1 : 0.6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <span
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: rule.action === 'AUTO_ACCEPT' ? '#DCFCE7' : '#FEE2E2',
                    color: rule.action === 'AUTO_ACCEPT' ? '#166534' : '#991B1B',
                  }}
                >
                  {rule.action}
                </span>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1E293B' }}>
                      {rule.name}
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Priority #{rule.priority}</span>
                  </div>

                  {/* Conditions Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    {rule.conditions.minLeadTimeHours != null && (
                      <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: '#F1F5F9', borderRadius: '4px', color: '#475569' }}>
                        Lead Time: &lt;{rule.conditions.minLeadTimeHours}h
                      </span>
                    )}
                    {rule.conditions.maxDistanceKm != null && (
                      <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: '#F1F5F9', borderRadius: '4px', color: '#475569' }}>
                        Distance: &gt;{rule.conditions.maxDistanceKm}km
                      </span>
                    )}
                    {rule.conditions.verifiedSeekersOnly && (
                      <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: '#EDE9FE', borderRadius: '4px', color: '#6B21A8' }}>
                        Verified Seekers Only
                      </span>
                    )}
                    {rule.conditions.noUpheldStrikesLast12Months && (
                      <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: '#FEF3C7', borderRadius: '4px', color: '#92400E' }}>
                        Zero Strikes (12m)
                      </span>
                    )}
                    {rule.conditions.maxDailyBookings != null && (
                      <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: '#F1F5F9', borderRadius: '4px', color: '#475569' }}>
                        Daily Limit: {rule.conditions.maxDailyBookings}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '6px' }}>
                    Triggered {rule.hitCount || 0} times
                    {rule.lastFiredAt && ` • Last fired ${new Date(rule.lastFiredAt).toLocaleDateString()}`}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => handleToggleRule(rule)}
                    style={{ accentColor: '#7000A4', cursor: 'pointer' }}
                  />
                  {rule.enabled ? 'Enabled' : 'Paused'}
                </label>

                <button
                  onClick={() => handleOpenEdit(rule)}
                  style={{
                    background: 'none',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  <Edit3 size={15} />
                </button>

                <button
                  onClick={() => handleDeleteRule(rule._id)}
                  style={{
                    background: 'none',
                    border: '1px solid #FEE2E2',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    color: '#DC2626',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Rule Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 700, color: '#1E293B' }}>
              {editingRule ? 'Edit Rule' : 'Create Auto-Rule'}
            </h3>

            {errorMsg && (
              <div
                style={{
                  background: '#FEE2E2',
                  color: '#991B1B',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  marginBottom: '16px',
                }}
              >
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveRule} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Rule Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Decline requests with < 3 hours notice"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Action *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setAction('AUTO_DECLINE')}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: action === 'AUTO_DECLINE' ? '2px solid #DC2626' : '1px solid #CBD5E1',
                      background: action === 'AUTO_DECLINE' ? '#FEF2F2' : '#ffffff',
                      color: action === 'AUTO_DECLINE' ? '#991B1B' : '#475569',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Auto-Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => setAction('AUTO_ACCEPT')}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: action === 'AUTO_ACCEPT' ? '2px solid #16A34A' : '1px solid #CBD5E1',
                      background: action === 'AUTO_ACCEPT' ? '#F0FDF4' : '#ffffff',
                      color: action === 'AUTO_ACCEPT' ? '#166534' : '#475569',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Auto-Accept (Trusted Repeat Only)
                  </button>
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#1E293B', display: 'block', marginBottom: '10px' }}>
                  Trigger Conditions
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                      Lead Time Hours (min)
                    </label>
                    <input
                      type="number"
                      min={2}
                      placeholder="Min 2 hrs"
                      value={minLeadTimeHours}
                      onChange={(e) => setMinLeadTimeHours(e.target.value === '' ? '' : Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.85rem',
                        marginTop: '3px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                      Max Distance (km)
                    </label>
                    <input
                      type="number"
                      min={1}
                      placeholder="e.g. 25"
                      value={maxDistanceKm}
                      onChange={(e) => setMaxDistanceKm(e.target.value === '' ? '' : Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.85rem',
                        marginTop: '3px',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                      Min Duration (mins)
                    </label>
                    <input
                      type="number"
                      step={15}
                      placeholder="e.g. 30"
                      value={minDurationMins}
                      onChange={(e) => setMinDurationMins(e.target.value === '' ? '' : Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.85rem',
                        marginTop: '3px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                      Max Daily Bookings
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      placeholder="e.g. 3"
                      value={maxDailyBookings}
                      onChange={(e) => setMaxDailyBookings(e.target.value === '' ? '' : Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.85rem',
                        marginTop: '3px',
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#334155' }}>
                    <input
                      type="checkbox"
                      checked={verifiedSeekersOnly}
                      onChange={(e) => setVerifiedSeekersOnly(e.target.checked)}
                      style={{ accentColor: '#7000A4' }}
                    />
                    Require Phone or KYC Verified Seekers
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#334155' }}>
                    <input
                      type="checkbox"
                      checked={noStrikes}
                      onChange={(e) => setNoStrikes(e.target.checked)}
                      style={{ accentColor: '#7000A4' }}
                    />
                    Require zero conduct violations in last 12 months
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#7000A4',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {saving ? 'Saving...' : editingRule ? 'Update Rule' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
