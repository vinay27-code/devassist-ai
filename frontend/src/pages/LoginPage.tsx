import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, ArrowRight } from 'lucide-react';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.login(form);
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
      navigate('/dashboard');
      toast.success(`Welcome back, ${data.data.user.full_name.split(' ')[0]}! ✨`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Floating orbs */}
      {[
        { w: 400, h: 400, top: '5%', left: '5%', color: 'rgba(102,126,234,0.2)' },
        { w: 350, h: 350, bottom: '10%', right: '5%', color: 'rgba(167,139,250,0.15)' },
        { w: 250, h: 250, top: '50%', right: '20%', color: 'rgba(79,172,254,0.12)' },
      ].map((orb, i) => (
        <div key={i} style={{
          position: 'fixed',
          width: orb.w, height: orb.h,
          top: (orb as any).top, left: (orb as any).left,
          bottom: (orb as any).bottom, right: (orb as any).right,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
          filter: 'blur(40px)',
          animation: `float${i} ${8 + i * 3}s ease-in-out infinite alternate`,
          pointerEvents: 'none',
        }} />
      ))}

      <style>{`
        @keyframes float0 { from { transform: translate(0,0) scale(1); } to { transform: translate(20px,-20px) scale(1.1); } }
        @keyframes float1 { from { transform: translate(0,0) scale(1); } to { transform: translate(-15px,15px) scale(0.95); } }
        @keyframes float2 { from { transform: translate(0,0) scale(1); } to { transform: translate(10px,-25px) scale(1.05); } }
      `}</style>

      <div className="fade-in" style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div className="glow-pulse" style={{
              width: 52, height: 52, borderRadius: 16,
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={24} color="white" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div className="text-gradient" style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1 }}>DevAssist AI</div>
              <div className="mono" style={{ color: 'var(--text-muted)', fontSize: 11, letterSpacing: '0.12em' }}>v1.0.0 · BETA</div>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Sign in to your AI workspace</p>
        </div>

        {/* Glass card */}
        <div className="glass" style={{ padding: 36 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label className="mono" style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 8 }}>EMAIL ADDRESS</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="glass-input" placeholder="you@company.com" required />
            </div>
            <div style={{ marginBottom: 28 }}>
              <label className="mono" style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 8 }}>PASSWORD</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                className="glass-input" placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading} className="btn-gradient">
              {loading ? <><span className="mono" style={{ fontSize: 12 }}>authenticating</span><span className="cursor-blink" /></> : <><span>Sign in</span><ArrowRight size={16} /></>}
            </button>
          </form>

          <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              No account?{' '}
              <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
                Create one free →
              </Link>
            </p>
          </div>
        </div>

        {/* Features row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 32 }}>
          {['AI Code Review', 'RAG Chat', 'Kanban Board'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
