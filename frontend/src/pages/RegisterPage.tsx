import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, ArrowRight } from 'lucide-react';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.register(form);
      setAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
      navigate('/dashboard');
      toast.success('Welcome to DevAssist AI! 🚀');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  const fields = [
    { key: 'full_name', label: 'FULL NAME', type: 'text', placeholder: 'John Doe' },
    { key: 'email', label: 'EMAIL ADDRESS', type: 'email', placeholder: 'you@company.com' },
    { key: 'password', label: 'PASSWORD', type: 'password', placeholder: 'Min 8 characters' },
  ] as const;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      {[
        { w: 450, h: 450, top: '-5%', right: '0%', color: 'rgba(118,75,162,0.18)' },
        { w: 350, h: 350, bottom: '5%', left: '0%', color: 'rgba(79,172,254,0.15)' },
      ].map((orb, i) => (
        <div key={i} style={{
          position: 'fixed', width: orb.w, height: orb.h,
          top: (orb as any).top, right: (orb as any).right,
          bottom: (orb as any).bottom, left: (orb as any).left,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
          filter: 'blur(50px)', pointerEvents: 'none',
        }} />
      ))}

      <div className="fade-in" style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div className="glow-pulse" style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={24} color="white" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div className="text-gradient" style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1 }}>DevAssist AI</div>
              <div className="mono" style={{ color: 'var(--text-muted)', fontSize: 11, letterSpacing: '0.12em' }}>v1.0.0 · BETA</div>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Create your free AI workspace</p>
        </div>

        <div className="glass" style={{ padding: 36 }}>
          <form onSubmit={handleSubmit}>
            {fields.map(({ key, label, type, placeholder }) => (
              <div key={key} style={{ marginBottom: 20 }}>
                <label className="mono" style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 8 }}>{label}</label>
                <input type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                  className="glass-input" placeholder={placeholder} required />
              </div>
            ))}
            <div style={{ marginTop: 8 }}>
              <button type="submit" disabled={loading} className="btn-gradient">
                {loading ? <><span className="mono" style={{ fontSize: 12 }}>creating account</span><span className="cursor-blink" /></> : <><span>Create free account</span><ArrowRight size={16} /></>}
              </button>
            </div>
          </form>
          <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Sign in →</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
