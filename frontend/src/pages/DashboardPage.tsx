import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Trash2, ArrowRight, CheckSquare, Activity, Layers } from 'lucide-react';
import { projectApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Project } from '../types';
import toast from 'react-hot-toast';

const GRADIENTS = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.getAll().then(r => r.data.data as Project[]),
  });

  const createMutation = useMutation({
    mutationFn: () => projectApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); setShowCreate(false); setForm({ name: '', description: '' }); toast.success('Project created! ✨'); },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Deleted'); },
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div className="fade-in" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 40 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 6, lineHeight: 1.2 }}>
            <span style={{ color: 'var(--text-primary)' }}>{greeting}, </span>
            <span className="text-gradient">{user?.full_name?.split(' ')[0]}</span>
          </h1>
          <p className="mono" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-gradient" style={{ width: 'auto', padding: '12px 20px' }}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Stats */}
      {projects.length > 0 && (
        <div className="fade-in stagger-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
          {[
            { label: 'Total Projects', value: projects.length, icon: Layers, gradient: GRADIENTS[0] },
            { label: 'Active', value: projects.filter(p => p.status === 'active').length, icon: Activity, gradient: GRADIENTS[2] },
            { label: 'Total Tasks', value: projects.reduce((a, p) => a + (p.task_count || 0), 0), icon: CheckSquare, gradient: GRADIENTS[1] },
          ].map(({ label, value, icon: Icon, gradient }) => (
            <div key={label} className="glass" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
                <Icon size={20} color="white" />
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 50, padding: 24,
        }}>
          <div className="glass fade-in" style={{ width: '100%', maxWidth: 440, padding: 32, border: '1px solid rgba(129,140,248,0.3)' }}>
            <h2 className="text-gradient" style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>New Project</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="glass-input" placeholder="Project name" autoFocus />
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="glass-input" placeholder="Description (optional)" rows={3} style={{ resize: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={() => setShowCreate(false)} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
              <button onClick={() => createMutation.mutate()} disabled={!form.name || createMutation.isPending}
                className="btn-gradient" style={{ flex: 1 }}>
                {createMutation.isPending ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && projects.length === 0 && (
        <div className="fade-in" style={{ textAlign: 'center', padding: '80px 0' }}>
          <div className="glass" style={{ width: 80, height: 80, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', background: 'rgba(129,140,248,0.06)' }}>
            <FolderOpen size={32} color="var(--accent)" />
          </div>
          <h3 className="text-gradient" style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No projects yet</h3>
          <p className="mono" style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28 }}>$ mkdir my-first-project</p>
          <button onClick={() => setShowCreate(true)} className="btn-gradient" style={{ width: 'auto', padding: '12px 28px' }}>
            Create your first project
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[...Array(3)].map((_, i) => <div key={i} className="glass shimmer" style={{ height: 180 }} />)}
        </div>
      )}

      {/* Projects grid */}
      {!isLoading && projects.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {projects.map((project, i) => (
            <div key={project.id} className={`glass fade-in stagger-${Math.min(i + 1, 4)}`}
              onClick={() => navigate(`/projects/${project.id}`)}
              style={{ padding: 24, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.07)', position: 'relative', overflow: 'hidden', transition: 'all 0.25s' }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.border = '1px solid rgba(129,140,248,0.4)';
                el.style.transform = 'translateY(-4px)';
                el.style.boxShadow = '0 16px 48px rgba(0,0,0,0.5), 0 0 30px rgba(129,140,248,0.1)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.border = '1px solid rgba(255,255,255,0.07)';
                el.style.transform = 'translateY(0)';
                el.style.boxShadow = '0 8px 40px rgba(0,0,0,0.5)';
              }}>
              {/* Background gradient */}
              <div style={{
                position: 'absolute', top: -30, right: -30, width: 120, height: 120,
                borderRadius: '50%', background: GRADIENTS[i % GRADIENTS.length], opacity: 0.06, filter: 'blur(20px)',
              }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, position: 'relative' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: GRADIENTS[i % GRADIENTS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
                  <FolderOpen size={18} color="white" />
                </div>
                <button onClick={e => { e.stopPropagation(); if (confirm('Delete this project?')) deleteMutation.mutate(project.id); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, opacity: 0, transition: 'all 0.2s' }}
                  className="delete-btn"
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-red)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                  <Trash2 size={15} />
                </button>
              </div>

              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, position: 'relative' }}>{project.name}</h3>
              {project.description && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', position: 'relative' }}>{project.description}</p>}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', position: 'relative', marginTop: project.description ? 0 : 'auto' }}>
                <span className="glass-tag">{project.task_count} task{project.task_count !== 1 ? 's' : ''}</span>
                <ArrowRight size={15} color="var(--text-muted)" />
              </div>

              <style>{`.glass:hover .delete-btn { opacity: 1 !important; }`}</style>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
