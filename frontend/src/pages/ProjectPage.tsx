import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Send, Bot, User, ArrowLeft, Loader2, Grip } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { taskApi, projectApi, aiApi } from '../services/api';
import { KanbanBoard, Task, ChatMessage } from '../types';
import toast from 'react-hot-toast';

const COLUMNS = [
  { key: 'todo' as const, label: 'To Do', color: 'rgba(148,163,184,0.6)', gradient: 'linear-gradient(135deg, #64748b, #94a3b8)' },
  { key: 'in_progress' as const, label: 'In Progress', color: 'rgba(129,140,248,0.8)', gradient: 'linear-gradient(135deg, #667eea, #764ba2)' },
  { key: 'review' as const, label: 'Review', color: 'rgba(251,146,60,0.8)', gradient: 'linear-gradient(135deg, #f093fb, #f5576c)' },
  { key: 'done' as const, label: 'Done', color: 'rgba(52,211,153,0.8)', gradient: 'linear-gradient(135deg, #43e97b, #38f9d7)' },
];

const PRIORITY_STYLES: Record<string, { color: string; bg: string }> = {
  low: { color: 'rgba(148,163,184,0.9)', bg: 'rgba(148,163,184,0.08)' },
  medium: { color: '#818cf8', bg: 'rgba(129,140,248,0.1)' },
  high: { color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  urgent: { color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 flex items-center gap-4 flex-shrink-0"
        style={{ background: 'rgba(10,10,30,0.6)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-xs transition-all px-3 py-1.5 rounded-lg"
          style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}>
          <ArrowLeft size={12} /> Dashboard
        </button>
        <span style={{ color: 'var(--text-muted)' }}>/</span>
        <h1 className="text-sm font-semibold text-gradient">{project?.name}</h1>
        <div className="ml-auto flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {(['board', 'chat'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: activeTab === tab ? 'linear-gradient(135deg, rgba(102,126,234,0.4), rgba(118,75,162,0.4))' : 'transparent',
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                border: activeTab === tab ? '1px solid rgba(129,140,248,0.3)' : '1px solid transparent',
              }}>
              {tab === 'board' ? '⬛ Kanban' : '🤖 AI Chat'}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban */}
      {activeTab === 'board' && (
        <div className="flex-1 overflow-auto p-6">
          <div className="flex gap-4 min-w-max">
            {COLUMNS.map(({ key, label, color, gradient }) => {
              const tasks = board?.[key] || [];
              const isOver = dragOver === key;
              return (
                <div key={key} className="w-72 flex flex-col rounded-2xl transition-all"
                  style={{
                    background: isOver ? 'rgba(129,140,248,0.08)' : 'rgba(255,255,255,0.03)',
                    backdropFilter: 'blur(12px)',
                    border: `1px solid ${isOver ? 'rgba(129,140,248,0.4)' : 'rgba(255,255,255,0.07)'}`,
                    boxShadow: isOver ? '0 0 30px rgba(129,140,248,0.1)' : 'none',
                  }}
                  onDragOver={e => handleDragOver(e, key)}
                  onDrop={() => handleDrop(key)}>
                  {/* Column header */}
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-t-2xl"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <span className="ml-auto mono text-xs px-2 py-0.5 rounded-md"
                      style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {tasks.length}
                    </span>
                  </div>

                  {/* Tasks */}
                  <div className="flex-1 p-3 space-y-2 overflow-y-auto" style={{ minHeight: 200 }}>
                    {tasks.map((task: Task) => (
                      <div key={task.id}
                        draggable onDragStart={() => handleDragStart(task)} onDragEnd={handleDragEnd}
                        className="task-card group fade-in"
                        style={{ opacity: dragTask?.id === task.id ? 0.4 : 1 }}>
                        <div className="flex items-start gap-2">
                          <Grip size={11} className="mt-0.5 flex-shrink-0 opacity-20" style={{ color: 'var(--text-muted)' }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium leading-relaxed" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
                            {task.description && <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{task.description}</p>}
                            <div className="flex items-center gap-2 mt-2.5">
                              <span className="text-xs px-2 py-0.5 rounded-md font-medium mono"
                                style={{ color: PRIORITY_STYLES[task.priority].color, background: PRIORITY_STYLES[task.priority].bg, border: `1px solid ${PRIORITY_STYLES[task.priority].color}30` }}>
                                {task.priority}
                              </span>
                              <button onClick={() => deleteTaskMutation.mutate(task.id)}
                                className="ml-auto opacity-0 group-hover:opacity-100 text-xs transition-all"
                                style={{ color: 'var(--text-muted)' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-red)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>✕</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {addingTask === key ? (
                      <div className="rounded-xl p-3 fade-in"
                        style={{ background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.3)' }}>
                        <input autoFocus value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newTaskTitle.trim()) createTaskMutation.mutate(key);
                            if (e.key === 'Escape') { setAddingTask(null); setNewTaskTitle(''); }
                          }}
                          className="w-full text-xs bg-transparent outline-none"
                          placeholder="Task title… Enter to save" style={{ color: 'var(--text-primary)' }} />
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => newTaskTitle.trim() && createTaskMutation.mutate(key)}
                            className="btn-gradient text-xs" style={{ padding: '4px 12px' }}>Add</button>
                          <button onClick={() => { setAddingTask(null); setNewTaskTitle(''); }}
                            className="text-xs" style={{ color: 'var(--text-muted)' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAddingTask(key)}
                        className="flex items-center gap-1.5 w-full p-2 rounded-lg text-xs transition-all"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(129,140,248,0.06)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                        <Plus size={12} /> Add task
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Chat */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {chatMessages.length === 0 && (
              <div className="text-center py-16 fade-in">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 glow-pulse"
                  style={{ background: 'linear-gradient(135deg, rgba(102,126,234,0.3), rgba(118,75,162,0.3))', border: '1px solid rgba(129,140,248,0.3)' }}>
                  <Bot size={26} style={{ color: 'var(--accent)' }} />
                </div>
                <p className="font-bold text-sm mb-1 text-gradient">Chat with your codebase</p>
                <p className="text-xs mono" style={{ color: 'var(--text-muted)' }}>RAG-powered · searches your code snippets</p>
                <div className="flex flex-wrap gap-2 justify-center mt-5">
                  {['Explain the auth flow', 'Find security issues', 'How does RAG work here?'].map(q => (
                    <button key={q} onClick={() => setChatInput(q)}
                      className="text-xs px-3 py-1.5 rounded-full transition-all glass-sm"
                      style={{ color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(129,140,248,0.4)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex gap-3 fade-in ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: msg.role === 'assistant' ? 'linear-gradient(135deg, rgba(102,126,234,0.4), rgba(118,75,162,0.4))' : 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}>
                  {msg.role === 'assistant' ? <Bot size={14} style={{ color: 'var(--accent)' }} /> : <User size={14} style={{ color: 'var(--text-secondary)' }} />}
                </div>
                <div className="max-w-2xl" style={msg.role === 'user'
                  ? { background: 'linear-gradient(135deg, rgba(102,126,234,0.5), rgba(118,75,162,0.5))', backdropFilter: 'blur(12px)', border: '1px solid rgba(129,140,248,0.3)', borderRadius: '14px 14px 2px 14px', padding: '10px 14px', fontSize: 13, color: 'var(--text-primary)' }
                  : { background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px 14px 14px 2px', padding: '10px 14px' }}>
                  {msg.role === 'assistant'
                    ? <div className="prose-glass"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                    : <span style={{ fontSize: 13 }}>{msg.content}</span>}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex gap-3 fade-in">
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(102,126,234,0.4), rgba(118,75,162,0.4))', border: '1px solid rgba(129,140,248,0.3)' }}>
                  <Bot size={14} style={{ color: 'var(--accent)' }} />
                </div>
                <div className="px-4 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ background: 'var(--accent)', animationDelay: `${i * 150}ms` }} />
                    ))}
                    <span className="mono text-xs ml-2" style={{ color: 'var(--text-muted)' }}>thinking</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,10,30,0.6)', backdropFilter: 'blur(20px)' }}>
            <div className="flex gap-3">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChat()}
                className="glass-input flex-1" placeholder="Ask about your codebase…" />
              <button onClick={handleChat} disabled={!chatInput.trim() || chatLoading}
                className="btn-gradient px-4 flex items-center gap-2">
                {chatLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
            <p className="text-xs mt-2 mono" style={{ color: 'var(--text-muted)' }}>
              RAG-powered · searches code snippets · Enter to send
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
