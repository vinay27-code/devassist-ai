import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        const { data } = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          { refreshToken }
        );
        useAuthStore.getState().setTokens(data.data.accessToken, data.data.refreshToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  register: (data: { email: string; password: string; full_name: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
  getMe: () => api.get('/auth/me'),
};

// Projects
export const projectApi = {
  getAll: () => api.get('/projects'),
  getOne: (id: string) => api.get(`/projects/${id}`),
  create: (data: { name: string; description?: string }) =>
    api.post('/projects', data),
  update: (id: string, data: Partial<{ name: string; description: string; status: string }>) =>
    api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
};

// Tasks
export const taskApi = {
  getByProject: (projectId: string) =>
    api.get(`/tasks/projects/${projectId}/tasks`),
  create: (projectId: string, data: Partial<{ title: string; description: string; priority: string; status: string }>) =>
    api.post(`/tasks/projects/${projectId}/tasks`, data),
  update: (id: string, data: Partial<{ title: string; status: string; priority: string; position: number }>) =>
    api.put(`/tasks/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/tasks/${id}`),
};

// AI
export const aiApi = {
  reviewCode: (data: { code: string; language: string; title?: string; project_id?: string }) =>
    api.post('/ai/review', data),
  generateDocs: (data: { code: string; language: string; snippet_id?: string }) =>
    api.post('/ai/docs', data),
  chat: (data: { project_id: string; message: string }) =>
    api.post('/ai/chat', data),
  getSnippets: (projectId: string) =>
    api.get(`/ai/snippets/${projectId}`),
  getChatHistory: (projectId: string) =>
    api.get(`/ai/chat/${projectId}/history`),
};

// Billing
export const billingApi = {
  getStatus: () => api.get('/billing/status'),
  createCheckout: () => api.post('/billing/checkout'),
  createPortal: () => api.post('/billing/portal'),
};

export default api;
