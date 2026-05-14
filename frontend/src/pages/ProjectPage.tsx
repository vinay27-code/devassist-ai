import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Send, Bot, User, ArrowLeft, Loader2, Grip } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { taskApi, projectApi, aiApi } from '../services/api';
import { KanbanBoard, Task, ChatMessage } from '../types';
import toast from 'react-hot-toast';

const COLUMNS = [
  { key: 'todo' as const, label: 'To Do', color: '#94a3b8', glow: 'rgba(148,163,184,0.3)', gradient: 'linear-gradient(135deg, #64748b, #94a3b8)' },
  { key: 'in_progress' as const, label: 'In Progress', color: '#818cf8', glow: 'rgba(129,140,248,0.3)', gradient: 'linear-gradient(135deg, #667eea, #764ba2)' },
  { key: 'review' as const, label: 'Review', color: '#fb923c', glow: 'rgba(251,146,60,0.3)', gradient: 'linear-gradient(135deg, #f093fb, #f5576c)' },
  { key: 'done' as const, label: 'Done', color: '#34d399', glow: 'rgba(52,211,153,0.3)', gradient: 'linear-gradient(135deg, #43e97b, #38f9d7)' },
];

const PRIORITY_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  low:    { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)' },
  medium: { color: '#818cf8', bg: 'rgba(129,140,248,0.1)',  border: 'rgba(129,140,248,0.25)' },
  high:   { color: '#fb923c', bg: 'rgba(251,146,60,0.1)',   border: 'rgba(251,146,60,0.25)' },
  urgent: { color: '#f87171', bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.25)' },
};

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'board' | 'chat'>('board');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [addingTask, setAddingTask] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [dragTask, setDragTask] = useState<Task | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.getOne(projectId!).then(r => r.data.data),
  });

  const { data: board } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => taskApi.getByProject(projectId!).then(r => r.data.data as KanbanBoard),
  });

  useEffect(() => {
    if (projectId) {
      aiApi.getChatHistory(projectId).then(r => {
        if (r.data.data?.length) setChatMessages(r.data.data);
      }).catch(() => {});
    }
  }, [projectId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const createTaskMutation = useMutation({
    mutationFn: (status: string) => taskApi.create(projectId!, { title: newTaskTitle, status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks', projectId] }); setNewTaskTitle(''); setAddingTask(null); },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) => taskApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => taskApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });

  const handleDragStart = (task: Task) => setDragTask(task);
  const handleDragEnd = () => { setDragTask(null); setDragOver(null); };
  const handleDragOver = (e: React.DragEvent, colKey: string) => { e.preventDefault(); setDragOver(colKey); };
  const handleDrop = (colKey: string) => {
    if (dragTask && dragTask.status !== colKey) {
      updateTaskMutation.mutate({ id: dragTask.id, data: { status: colKey as Task['status'] } });
    }
    setDragTask(null); setDragOver(null);
  };

  const handleChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const message = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: message }]);
    setChatLoading(true);
    try {
      const { data } = await aiApi.chat({ project_id: projectId!, message });
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.data.reply }]);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Chat failed');
      setChatMessages(prev => prev.slice(0, -1));
    } finally { setChatLoading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0,
        background: 'rgba(8,8,24,0.8)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <button onClick={() => navigate('/dashboard')} style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 12px',
          color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}>
          <ArrowLeft size={13} /> Dashboard
        </button>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 16 }}>/</span>
        <h1 style={{ fontSize: 18, fontWeight: 700 }} className="text-gradient">{project?.name}</h1>

        {/* Tab switcher */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, background: 'rgba(0,0,0,0.3)', padding: 4, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
          {(['board', 'chat'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 500, fontFamily: 'inherit', transition: 'all 0.2s',
              background: activeTab === tab ? 'linear-gradient(135deg, rgba(102,126,234,0.5), rgba(118,75,162,0.5))' : 'transparent',
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: activeTab === tab ? 'inset 0 1px 0 rgba(255,255,255,0.1), 0 0 20px rgba(129,140,248,0.1)' : 'none',
              outline: activeTab === tab ? '1px solid rgba(129,140,248,0.25)' : '1px solid transparent',
            } as React.CSSProperties}>
              {tab === 'board' ? '⬛ Kanban' : '🤖 AI Chat'}
            </button>
          ))}
        </div>
      </div>

      {/* KANBAN BOARD */}
      {activeTab === 'board' && (
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: 28 }}>
          <div style={{ display: 'flex', gap: 20, height: '100%', minWidth: 'max-content' }}>
            {COLUMNS.map(({ key, label, color, glow, gradient }) => {
              const tasks = board?.[key] || [];
              const isOver = dragOver === key;
              return (
                <div key={key}
                  onDragOver={e => handleDragOver(e, key)}
                  onDrop={() => handleDrop(key)}
                  style={{
                    width: 280, display: 'flex', flexDirection: 'column', borderRadius: 20,
                    background: isOver ? 'rgba(129,140,248,0.06)' : 'rgba(255,255,255,0.03)',
                    backdropFilter: 'blur(16px)',
                    border: `1px solid ${isOver ? 'rgba(129,140,248,0.4)' : 'rgba(255,255,255,0.07)'}`,
                    boxShadow: isOver ? `0 0 30px rgba(129,140,248,0.1)` : 'none',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}>
                  {/* Column header */}
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${glow}`, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', flex: 1 }}>{label}</span>
                    <span className="mono" style={{ fontSize: 11, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '2px 8px', color: 'var(--text-muted)' }}>
                      {tasks.length}
                    </span>
                  </div>

                  {/* Tasks */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tasks.map((task: Task) => (
                      <div key={task.id} draggable
                        onDragStart={() => handleDragStart(task)}
                        onDragEnd={handleDragEnd}
                        className="fade-in"
                        style={{
                          background: dragTask?.id === task.id ? 'rgba(129,140,248,0.08)' : 'rgba(0,0,0,0.25)',
                          backdropFilter: 'blur(8px)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 12, padding: 14, cursor: 'grab',
                          opacity: dragTask?.id === task.id ? 0.5 : 1,
                          transition: 'all 0.2s', userSelect: 'none',
                          position: 'relative', overflow: 'hidden',
                        }}
                        onMouseEnter={e => {
                          const el = e.currentTarget as HTMLDivElement;
                          el.style.background = 'rgba(255,255,255,0.05)';
                          el.style.borderColor = 'rgba(129,140,248,0.3)';
                          el.style.transform = 'translateY(-2px)';
                          el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
                        }}
                        onMouseLeave={e => {
                          const el = e.currentTarget as HTMLDivElement;
                          el.style.background = 'rgba(0,0,0,0.25)';
                          el.style.borderColor = 'rgba(255,255,255,0.08)';
                          el.style.transform = 'translateY(0)';
                          el.style.boxShadow = 'none';
                        }}>
                        {/* Top shimmer line */}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }} />

                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <Grip size={11} color="rgba(255,255,255,0.15)" style={{ marginTop: 2, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 8 }}>{task.title}</p>
                            {task.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.description}</p>}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span className="mono" style={{
                                fontSize: 10, padding: '3px 8px', borderRadius: 6, fontWeight: 500,
                                color: PRIORITY_STYLES[task.priority].color,
                                background: PRIORITY_STYLES[task.priority].bg,
                                border: `1px solid ${PRIORITY_STYLES[task.priority].border}`,
                              }}>{task.priority}</span>
                              <button onClick={() => deleteTaskMutation.mutate(task.id)} style={{
                                background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)',
                                fontSize: 14, padding: '2px 6px', borderRadius: 4, transition: 'color 0.2s', lineHeight: 1,
                              }}
                              onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-red)')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}>✕</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add task */}
                    {addingTask === key ? (
                      <div className="fade-in" style={{ background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.3)', borderRadius: 12, padding: 12 }}>
                        <input autoFocus value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newTaskTitle.trim()) createTaskMutation.mutate(key);
                            if (e.key === 'Escape') { setAddingTask(null); setNewTaskTitle(''); }
                          }}
                          style={{ width: '100%', background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', marginBottom: 10 }}
                          placeholder="Task title… Enter to save" />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => newTaskTitle.trim() && createTaskMutation.mutate(key)}
                            style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none', borderRadius: 7, padding: '5px 14px', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Add
                          </button>
                          <button onClick={() => { setAddingTask(null); setNewTaskTitle(''); }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAddingTask(key)} style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px',
                        background: 'none', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 10,
                        color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(129,140,248,0.4)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(129,140,248,0.05)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}>
                        <Plus size={13} /> Add task
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI CHAT */}
      {activeTab === 'chat' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {chatMessages.length === 0 && (
              <div className="fade-in" style={{ textAlign: 'center', margin: 'auto', paddingTop: 40 }}>
                <div className="glow-pulse" style={{
                  width: 72, height: 72, borderRadius: 24, margin: '0 auto 20px',
                  background: 'linear-gradient(135deg, rgba(102,126,234,0.2), rgba(118,75,162,0.2))',
                  border: '1px solid rgba(129,140,248,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Bot size={30} color="var(--accent)" />
                </div>
                <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }} className="text-gradient">Chat with your codebase</p>
                <p className="mono" style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>RAG-powered · searches your code snippets</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                  {['Explain the auth flow', 'Find security issues', 'How does RAG work here?'].map(q => (
                    <button key={q} onClick={() => setChatInput(q)} style={{
                      padding: '8px 16px', borderRadius: 20, background: 'rgba(129,140,248,0.08)',
                      border: '1px solid rgba(129,140,248,0.2)', color: 'var(--text-secondary)',
                      fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(129,140,248,0.5)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(129,140,248,0.12)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(129,140,248,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(129,140,248,0.08)'; }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <div key={i} className="fade-in" style={{ display: 'flex', gap: 12, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: msg.role === 'assistant' ? 'linear-gradient(135deg, rgba(102,126,234,0.4), rgba(118,75,162,0.4))' : 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  {msg.role === 'assistant' ? <Bot size={15} color="var(--accent)" /> : <User size={15} color="var(--text-secondary)" />}
                </div>
                <div style={{
                  maxWidth: '70%', padding: '12px 16px', fontSize: 13, lineHeight: 1.6,
                  ...(msg.role === 'user' ? {
                    background: 'linear-gradient(135deg, rgba(102,126,234,0.5), rgba(118,75,162,0.5))',
                    border: '1px solid rgba(129,140,248,0.3)',
                    borderRadius: '16px 16px 4px 16px',
                    color: 'var(--text-primary)',
                    backdropFilter: 'blur(12px)',
                  } : {
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px 16px 16px 4px',
                    backdropFilter: 'blur(12px)',
                  }),
                }}>
                  {msg.role === 'assistant'
                    ? <div className="prose-glass"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                    : msg.content}
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="fade-in" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(102,126,234,0.4), rgba(118,75,162,0.4))', border: '1px solid rgba(129,140,248,0.3)' }}>
                  <Bot size={15} color="var(--accent)" />
                </div>
                <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px 16px 16px 4px' }}>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'bounce 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />
                    ))}
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>thinking…</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div style={{ padding: '16px 32px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(8,8,24,0.8)', backdropFilter: 'blur(20px)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChat()}
                className="glass-input" style={{ flex: 1 }}
                placeholder="Ask about your codebase…" />
              <button onClick={handleChat} disabled={!chatInput.trim() || chatLoading}
                className="btn-gradient" style={{ width: 'auto', padding: '0 20px', flexShrink: 0 }}>
                {chatLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
              </button>
            </div>
            <p className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
              RAG-powered · searches code snippets · Enter to send
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
