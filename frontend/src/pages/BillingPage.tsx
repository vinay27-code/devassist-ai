import { useQuery, useMutation } from '@tanstack/react-query';
import { Zap, Check, CreditCard, ArrowRight, Shield } from 'lucide-react';
import { billingApi } from '../services/api';
import { BillingStatus } from '../types';
import toast from 'react-hot-toast';

export default function BillingPage() {
  const { data: billing } = useQuery({
    queryKey: ['billing'],
    queryFn: () => billingApi.getStatus().then(r => r.data.data as BillingStatus),
  });

  const checkoutMutation = useMutation({
    mutationFn: () => billingApi.createCheckout(),
    onSuccess: ({ data }) => { window.location.href = data.data.url; },
    onError: () => toast.error('Failed to open checkout'),
  });

  const portalMutation = useMutation({
    mutationFn: () => billingApi.createPortal(),
    onSuccess: ({ data }) => { window.location.href = data.data.url; },
    onError: () => toast.error('Failed to open portal'),
  });

  const isPro = billing?.plan === 'pro';
  const usagePercent = billing?.daily_limit ? Math.min(100, ((billing.ai_usage_today || 0) / billing.daily_limit) * 100) : 0;

  const FREE_FEATURES = ['3 projects', '10 AI actions/day', 'Kanban board', 'Code review'];
  const PRO_FEATURES = ['Unlimited projects', 'Unlimited AI actions', 'RAG codebase chat', 'Doc generation', 'Priority support'];

  return (
    <div style={{ padding: '40px 48px', maxWidth: 760 }}>
      {/* Header */}
      <div className="fade-in" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 6 }} className="text-gradient">Billing</h1>
        <p className="mono" style={{ color: 'var(--text-muted)', fontSize: 13 }}>Manage your subscription and AI usage</p>
      </div>

      {/* Current plan card */}
      <div className="glass fade-in stagger-1" style={{
        padding: 28, marginBottom: 24,
        border: isPro ? '1px solid rgba(167,139,250,0.35)' : '1px solid rgba(255,255,255,0.08)',
        boxShadow: isPro ? '0 8px 40px rgba(0,0,0,0.5), 0 0 40px rgba(167,139,250,0.08)' : undefined,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Top gradient line for pro */}
        {isPro && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #667eea, #a78bfa, #f093fb)' }} />}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isPro ? 16 : 20 }}>
          <div>
            <p className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 8 }}>CURRENT PLAN</p>
            <p className="text-gradient" style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{isPro ? 'Pro' : 'Free'}</p>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 30,
            background: isPro ? 'rgba(167,139,250,0.12)' : 'rgba(255,255,255,0.04)',
            border: isPro ? '1px solid rgba(167,139,250,0.3)' : '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: isPro ? '#a78bfa' : 'var(--text-muted)', boxShadow: isPro ? '0 0 8px #a78bfa' : 'none' }} />
            <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: isPro ? '#a78bfa' : 'var(--text-muted)', letterSpacing: '0.08em' }}>
              {isPro ? 'ACTIVE' : 'FREE TIER'}
            </span>
          </div>
        </div>

        {/* Usage bar for free */}
        {!isPro && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>AI actions today</span>
              <span className="mono" style={{ fontSize: 13, color: usagePercent > 80 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                {billing?.ai_usage_today || 0} / {billing?.daily_limit || 10}
              </span>
            </div>
            <div style={{ width: '100%', height: 6, borderRadius: 20, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 20, transition: 'width 0.5s ease',
                width: `${usagePercent}%`,
                background: usagePercent > 80 ? 'linear-gradient(90deg, #f87171, #ef4444)' : 'linear-gradient(90deg, #667eea, #a78bfa)',
              }} />
            </div>
          </div>
        )}

        {/* Pro portal link */}
        {isPro && (
          <button onClick={() => portalMutation.mutate()} disabled={portalMutation.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'inherit', padding: 0, transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
            <CreditCard size={15} /> {portalMutation.isPending ? 'Opening…' : 'Manage billing & invoices'} <ArrowRight size={13} />
          </button>
        )}
      </div>

      {/* Plans comparison */}
      {!isPro && (
        <div className="fade-in stagger-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Free plan */}
          <div className="glass" style={{ padding: 24, border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 12 }}>FREE</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 20 }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)' }}>$0</span>
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/month</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {FREE_FEATURES.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(52,211,153,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={12} color="var(--accent-green)" />
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{f}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
              Current plan
            </div>
          </div>

          {/* Pro plan */}
          <div className="glass" style={{ padding: 24, border: '1px solid rgba(129,140,248,0.35)', boxShadow: '0 0 30px rgba(129,140,248,0.08)', position: 'relative', overflow: 'hidden' }}>
            {/* Top accent line */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #667eea, #a78bfa, #f093fb)' }} />
            {/* Glow bg */}
            <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(129,140,248,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, position: 'relative' }}>
              <p className="mono" style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.1em' }}>PRO</p>
              <span className="glass-tag" style={{ fontSize: 9, letterSpacing: '0.06em' }}>POPULAR</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 20, position: 'relative' }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)' }}>$19</span>
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/month</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, position: 'relative' }}>
              {PRO_FEATURES.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(129,140,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={12} color="var(--accent)" />
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{f}</span>
                </div>
              ))}
            </div>
            <button onClick={() => checkoutMutation.mutate()} disabled={checkoutMutation.isPending}
              className="btn-gradient" style={{ position: 'relative' }}>
              <Zap size={15} /> {checkoutMutation.isPending ? 'Loading…' : 'Upgrade to Pro'}
            </button>
          </div>
        </div>
      )}

      {/* Security note */}
      <div className="fade-in stagger-3" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Shield size={13} color="var(--text-muted)" />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Payments secured by Stripe · Cancel anytime · No hidden fees</span>
      </div>
    </div>
  );
}
