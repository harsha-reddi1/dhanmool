import { Capacitor } from '@capacitor/core';

const PROD_API_URL = import.meta.env.VITE_API_BASE_URL || 'https://dhanmool.vercel.app';
const isNative = typeof window !== 'undefined' && (Capacitor.isNativePlatform() || window.location.protocol === 'capacitor:' || window.location.protocol === 'file:');
const isLocal = typeof window !== 'undefined' && !isNative && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE = (isLocal ? '' : PROD_API_URL.replace(/\/$/, '')) + '/api/v1';

function getToken() {
  return localStorage.getItem('dhanmool_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('dhanmool_token', token);
  } else {
    localStorage.removeItem('dhanmool_token');
  }
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // If unauthorized, clear token and redirect to login if not already there
    setToken(null);
    if (!window.location.pathname.includes('/login')) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.detail || response.statusText || 'Request failed';
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getMe: () => request('/auth/me'),
  updateProfile: (profile) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(profile) }),
  changePassword: (data) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),

  // Expenses
  getExpenses: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/expenses${query ? `?${query}` : ''}`);
  },
  getCategories: () => request('/expenses/categories'),
  createExpense: (data) => request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  updateExpense: (id, data) => request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),

  // Analytics
  getDashboard: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/analytics/dashboard${query ? `?${query}` : ''}`);
  },

  // Events & Sinking Funds
  getEvents: () => request('/events'),
  getEvent: (id) => request(`/events/${id}`),
  createEvent: (data) => request('/events', { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (id, data) => request(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEvent: (id) => request(`/events/${id}`, { method: 'DELETE' }),

  // Shared Ledgers
  getProjects: () => request('/shared/projects'),
  getProject: (id) => request(`/shared/projects/${id}`),
  createProject: (data) => request('/shared/projects', { method: 'POST', body: JSON.stringify(data) }),
  addProjectMember: (projectId, data) => request(`/shared/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify(data) }),
  removeProjectMember: (projectId, userId) => request(`/shared/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),
  createProjectExpense: (projectId, data) => request(`/shared/projects/${projectId}/expenses`, { method: 'POST', body: JSON.stringify(data) }),

  // Informal Lending (Udhar)
  getLending: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/lending${query ? `?${query}` : ''}`);
  },
  createLending: (data) => request('/lending', { method: 'POST', body: JSON.stringify(data) }),
  getRepayments: (id) => request(`/lending/${id}/repayments`),
  addRepayment: (id, data) => request(`/lending/${id}/repayments`, { method: 'POST', body: JSON.stringify(data) }),
  deleteLending: (id) => request(`/lending/${id}`, { method: 'DELETE' }),

  // AI & NLP
  parseNL: (text) => request('/ai/parse-nl', { method: 'POST', body: JSON.stringify({ text }) }),
  getAIInsights: () => request('/ai/insights'),
  askAIAdvisor: (message) => request('/ai/chat', { method: 'POST', body: JSON.stringify({ message }) }),

  // Admin
  getAdminUsers: () => request('/admin/users'),
  createAdminUser: (data) => request('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  updateAdminUser: (userId, data) => request(`/admin/users/${userId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAdminUser: (userId) => request(`/admin/users/${userId}`, { method: 'DELETE' }),
  toggleUserStatus: (userId, isActive) => request(`/admin/users/${userId}/status`, { method: 'PATCH', body: JSON.stringify({ is_active: isActive }) }),
  resetUserPassword: (userId, newPassword) => request(`/admin/users/${userId}/reset-password`, { method: 'POST', body: JSON.stringify({ new_password: newPassword }) }),
  getAdminStats: () => request('/admin/stats'),
};
