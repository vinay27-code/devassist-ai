import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Brain, CreditCard, LogOut, Zap, Code2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/snippets', icon: Code2, label: 'Snippets' },
  { to: '/ai-review', icon: Brain, label: 'AI Tools' },
  { to: '/billing', icon: CreditCard, label: 'Billing' },
];

export default function Layout() {
  const { user, refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { if (refreshToken) await authApi.logout(refreshToken); } finally {
      logout(); navigate('/login'); toast.success('Logged out');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: 'rgba(8,8,30,0.85)', backdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(255,255,255,0.07)', position: 'relative',
      }}>
        {/* Sidebar top glow */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 200,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(129,140,248,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="glow-pulse" style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Zap size={16} color="white" />
            </div>
            <div>
              <div className="text-gradient" style={{ fontSize: 15, fontWeight: 800 }}>DevAssist</div>
              <div className="mono" style={{ color: 'var(--accent)', fontSize: 9, letterSpacing: '0.15em' }}>AI · BETA</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 4, position: 'relative' }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 12,
                  background: isActive ? 'rgba(129,140,248,0.15)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  border: `1px solid ${isActive ? 'rgba(129,140,248,0.25)' : 'transparent'}`,
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: isActive ? 'inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
                  position: 'relative', overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)';
                    (e.currentTarget as HTMLDivElement).style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                    (e.currentTarget as HTMLDivElement).style.color = 'var(--text-secondary)';
                  }
                }}>
                  {isActive && <div style={{ position: 'absolute', left: 0, top: '15%', bottom: '15%', width: 3, borderRadius: '0 3px 3px 0', background: 'linear-gradient(180deg, #818cf8, #a78bfa)' }} />}
                  <Icon size={16} />
                  <span>{label}</span>
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            borderRadius: 12, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 8,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #667eea, #f093fb)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: 'white',
            }}>
              {user?.full_name?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.full_name}</div>
              <div className="mono" style={{ fontSize: 10, color: user?.plan === 'pro' ? '#a78bfa' : 'var(--text-muted)' }}>
                {user?.plan === 'pro' ? '✦ PRO' : '○ FREE'}
              </div>
            </div>
          </div>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '8px 12px', borderRadius: 8, background: 'none', border: 'none',
            color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-red)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'auto' }}><Outlet /></main>
    </div>
  );
}
