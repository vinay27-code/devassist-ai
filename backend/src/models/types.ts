export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: 'user' | 'admin';
  plan: 'free' | 'pro';
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  status: 'active' | 'archived' | 'completed';
  created_at: Date;
  updated_at: Date;
}

export interface Task {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  position: number;
  due_date?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CodeSnippet {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  code: string;
  language?: string;
  ai_review?: string;
  ai_documentation?: string;
  embedding?: number[];
  created_at: Date;
  updated_at: Date;
}

export interface AIConversation {
  id: string;
  project_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  plan: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
