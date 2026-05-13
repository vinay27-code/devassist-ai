import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Brain, FileText, Loader2, Copy, Check, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { aiApi, projectApi } from '../services/api';
import { Project } from '../types';
import toast from 'react-hot-toast';

const LANGUAGES = ['typescript', 'javascript', 'python', 'java', 'go', 'rust', 'c++', 'c#', 'php', 'ruby'];

const SAMPLE = `async function getUser(id) {
  const result = await db.query("SELECT * FROM users WHERE id = " + id)
  return result.rows[0]
}`;

export default function AIReviewPage() {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [projectId, setProjectId] = useState('');
  const [mode, setMode] = useState<'review' | 'docs'>('review');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.getAll().then(r => r.data.data as Project[]),
  });

  const handleRun = async () => {
    if (!code.trim()) return toast.error('Paste some code first');
    setLoading(true); setResult('');
    try {
      if (mode === 'review') {
        const { data } = await aiApi.reviewCode({ code, language, title: `Review · ${new Date().toLocaleDateString()}`, project_id: projectId || undefined });
        setResult(data.data.review);
        toast.success('Review complete! ✨');
      } else {
        const { data } = await aiApi.generateDocs({ code, language, snippet_id: undefined });
        setResult(data.data.documentation);
        toast.success('Docs generated! ✨');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setLoading(false); }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectStyle = {
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: 'var(--text-secondary)',
    fontSize: 12,
    padding: '6px 10px',
    outline: 'none',
    fontFamily: 'inherit',
    cursor: 'pointer',
  };

  return (
    <div style={{ padding: '40px 48px', height: '100%', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200 }}>
      {/* Header */}
      <div className="fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 6 }} className="text-gradient">AI Tools</h1>
          <p className="mono" style={{ color: 'var(--text-muted)', fontSize: 13 }}>GPT-4o · Code review & documentation generator</p>
        </div>
        {/* Mode toggle */}
        <div className="glass-sm" style={{ display: 'flex', padding: 4, gap: 4 }}>
          {([['review', Brain, 'Code Review'], ['docs', FileText, 'Generate Docs']] as const).map(([m, Icon, label]) => (
            <button key={m} onClick={() => { setMode(m as 'review' | 'docs'); setResult(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                transition: 'all 0.2s', fontFamily: 'inherit',
                background: mode === m ? 'linear-gradient(135deg, rgba(102,126,234,0.5), rgba(118,75,162,0.5))' : 'transparent',
                color: mode === m ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: mode === m ? 'inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
              }}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>
      </div>

      {/* Main split layout */}
      <div className="fade-in stagger-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, flex: 1, minHeight: 0 }}>
        {/* Left: Code editor */}
        <div className="glass" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['#f87171', '#fb923c', '#34d399'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.8 }} />)}
            </div>
            <span className="mono" style={{ color: 'var(--text-muted)', fontSize: 11, flex: 1 }}>editor.{language}</span>
            <select value={language} onChange={e => setLanguage(e.target.value)} style={selectStyle}>
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} style={selectStyle}>
              <option value="">Don't save</option>
              {projects.map((p: Project) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <textarea value={code} onChange={e => setCode(e.target.value)}
            style={{
              flex: 1, fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: 13,
              lineHeight: 1.7, background: 'rgba(0,0,0,0.3)', border: 'none', outline: 'none',
              padding: 20, color: 'var(--text-primary)', resize: 'none',
            }}
            placeholder={SAMPLE} />

          <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={handleRun} disabled={loading || !code.trim()} className="btn-gradient">
              {loading
                ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /><span className="mono" style={{ fontSize: 12 }}>processing…</span></>
                : <><Zap size={15} />{mode === 'review' ? 'Review with AI' : 'Generate Documentation'}</>
              }
            </button>
          </div>
        </div>

        {/* Right: Output */}
        <div className="glass" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)',
          }}>
            <span className="mono" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              {mode === 'review' ? 'review_output.md' : 'documentation.md'}
            </span>
            {result && (
              <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, transition: 'color 0.2s', fontFamily: 'inherit', color: copied ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
            {!result && !loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', gap: 12 }}>
                <div className="glass glow-pulse" style={{ width: 64, height: 64, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(129,140,248,0.08)' }}>
                  {mode === 'review' ? <Brain size={26} color="var(--accent)" /> : <FileText size={26} color="var(--accent)" />}
                </div>
                <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-secondary)' }}>
                  {mode === 'review' ? 'AI review will appear here' : 'Generated docs will appear here'}
                </p>
                <p className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Paste code → click Run</p>
              </div>
            )}
            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
                <Loader2 size={32} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
                <p className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {mode === 'review' ? 'Analyzing your code…' : 'Writing documentation…'}
                </p>
              </div>
            )}
            {result && <div className="prose-glass fade-in"><ReactMarkdown>{result}</ReactMarkdown></div>}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
