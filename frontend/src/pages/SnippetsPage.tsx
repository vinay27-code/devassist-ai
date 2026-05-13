import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Code2, Search, ChevronDown, ChevronUp, Star, Clock, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { aiApi, projectApi } from '../services/api';
import { CodeSnippet, Project } from '../types';

const LANG_GRADIENTS: Record<string, string> = {
  typescript: 'linear-gradient(135deg, #3178c6, #4facfe)',
  javascript: 'linear-gradient(135deg, #e8a020, #fb923c)',
  python: 'linear-gradient(135deg, #3572A5, #43e97b)',
  java: 'linear-gradient(135deg, #b07219, #fb923c)',
  go: 'linear-gradient(135deg, #00ADD8, #4facfe)',
  rust: 'linear-gradient(135deg, #ce422b, #f093fb)',
  default: 'linear-gradient(135deg, #667eea, #764ba2)',
};

function SnippetCard({ snippet }: { snippet: CodeSnippet }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'review' | 'docs'>('code');
  const gradient = LANG_GRADIENTS[snippet.language?.toLowerCase()] || LANG_GRADIENTS.default;

  return (
    <div className="glass fade-in" style={{ overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Header */}
      <div onClick={() => setExpanded(!expanded)}
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', cursor: 'pointer', background: 'rgba(0,0,0,0.15)', transition: 'background 0.2s' }}
        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'}
        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.15)'}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          <Code2 size={16} color="white" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{snippet.title}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="glass-tag">{snippet.language}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={10} /> {new Date(snippet.created_at).toLocaleDateString()}
            </span>
            {snippet.ai_review && (
              <span style={{ fontSize: 11, color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Star size={10} /> AI Reviewed
              </span>
            )}
          </div>
        </div>
        <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="fade-in">
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 20px' }}>
            {(['code', 'review', 'docs'] as const).map(tab => (
              (tab === 'code' || (tab === 'review' && snippet.ai_review) || (tab === 'docs' && snippet.ai_documentation)) && (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
                    borderBottom: `2px solid ${activeTab === tab ? 'var(--accent)' : 'transparent'}`,
                    color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
                    transition: 'all 0.2s',
                  }}>
                  {tab === 'code' ? '{ } Code' : tab === 'review' ? '⚡ AI Review' : '📄 Docs'}
                </button>
              )
            ))}
          </div>
          <div style={{ padding: 20, maxHeight: 400, overflow: 'auto' }}>
            {activeTab === 'code' && (
              <pre style={{ fontFamily: "'SF Mono', monospace", fontSize: 13, lineHeight: 1.7, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 16, overflow: 'auto', color: 'var(--text-primary)' }}>
                <code>{snippet.code}</code>
              </pre>
            )}
            {activeTab === 'review' && snippet.ai_review && <div className="prose-glass"><ReactMarkdown>{snippet.ai_review}</ReactMarkdown></div>}
            {activeTab === 'docs' && snippet.ai_documentation && <div className="prose-glass"><ReactMarkdown>{snippet.ai_documentation}</ReactMarkdown></div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SnippetsPage() {
  const [selectedProject, setSelectedProject] = useState('');
  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState('');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.getAll().then(r => r.data.data as Project[]),
  });

  const { data: snippets = [], isLoading } = useQuery({
    queryKey: ['snippets', selectedProject],
    queryFn: () => aiApi.getSnippets(selectedProject).then(r => r.data.data as CodeSnippet[]),
    enabled: !!selectedProject,
  });

  const languages = [...new Set((snippets as CodeSnippet[]).map((s: CodeSnippet) => s.language).filter(Boolean))];
  const filtered = (snippets as CodeSnippet[]).filter((s: CodeSnippet) => {
    const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase());
    const matchLang = !langFilter || s.language === langFilter;
    return matchSearch && matchLang;
  });

  const selectStyle = {
    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, color: 'var(--text-secondary)', fontSize: 13,
    padding: '10px 14px', outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
    backdropFilter: 'blur(12px)',
  };

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1000 }}>
      {/* Header */}
      <div className="fade-in" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 6 }} className="text-gradient">Snippets Library</h1>
        <p className="mono" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          {(snippets as CodeSnippet[]).length} snippet{(snippets as CodeSnippet[]).length !== 1 ? 's' : ''} · AI-reviewed & RAG-indexed
        </p>
      </div>

      {/* Filters */}
      <div className="fade-in stagger-1" style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} style={{ ...selectStyle, minWidth: 200 }}>
          <option value="">Select a project…</option>
          {(projects as Project[]).map((p: Project) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        {selectedProject && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', backdropFilter: 'blur(12px)' }}>
              <Search size={15} color="var(--text-muted)" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                style={{ background: 'none', border: 'none', outline: 'none', flex: 1, fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit' }}
                placeholder="Search snippets…" />
            </div>
            {languages.length > 0 && (
              <select value={langFilter} onChange={e => setLangFilter(e.target.value)} style={{ ...selectStyle, minWidth: 150 }}>
                <option value="">All languages</option>
                {languages.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            )}
          </>
        )}
      </div>

      {/* Empty: no project selected */}
      {!selectedProject && (
        <div className="glass fade-in stagger-2" style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: 24, background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <FileText size={30} color="var(--accent)" />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }} className="text-gradient">Select a project</h3>
          <p className="mono" style={{ color: 'var(--text-muted)', fontSize: 13 }}>Snippets are saved when you run AI code review</p>
        </div>
      )}

      {/* Loading */}
      {selectedProject && isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[...Array(3)].map((_, i) => <div key={i} className="glass shimmer" style={{ height: 72 }} />)}
        </div>
      )}

      {/* No snippets */}
      {selectedProject && !isLoading && filtered.length === 0 && (
        <div className="glass fade-in" style={{ padding: 48, textAlign: 'center' }}>
          <Code2 size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {search || langFilter ? 'No snippets match your filters' : 'No snippets yet — run an AI code review to create one'}
          </p>
        </div>
      )}

      {/* Snippets list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map((snippet: CodeSnippet) => <SnippetCard key={snippet.id} snippet={snippet} />)}
      </div>
    </div>
  );
}
