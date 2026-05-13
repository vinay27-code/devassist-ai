export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'admin';
  plan: 'free' | 'pro';
  avatar_url?: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'archived' | 'completed';
  task_count: number;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  position: number;
  due_date?: string;
  created_at: string;
}

export interface KanbanBoard {
  todo: Task[];
  in_progress: Task[];
  review: Task[];
  done: Task[];
}

export interface CodeSnippet {
  id: string;
  title: string;
  code: string;
  language: string;
  ai_review?: string;
  ai_documentation?: string;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export interface BillingStatus {
  plan: 'free' | 'pro';
  ai_usage_today: number;
  daily_limit: number | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
