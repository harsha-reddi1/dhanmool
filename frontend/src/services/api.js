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
    invalidateCache(); // Clear cached user data on logout
  }
}

// -------------------------------------------------------------
// High-Speed In-Memory & Storage Cache Layer
// -------------------------------------------------------------
const memoryCache = new Map();
const CACHE_STORAGE_PREFIX = 'dm_cache_';

export function getCachedData(key, maxAgeMs = 60000) {
  const now = Date.now();
  // 1. Check in-memory Map first (instant 0ms)
  const mem = memoryCache.get(key);
  if (mem && now - mem.timestamp < maxAgeMs) {
    return mem.data;
  }

  // 2. Fallback to localStorage for warm resume
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_PREFIX + key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (now - parsed.timestamp < maxAgeMs) {
        memoryCache.set(key, parsed);
        return parsed.data;
      }
    }
  } catch (e) {
    // Ignore storage parse issues
  }
  return null;
}

export function setCachedData(key, data, tag = '') {
  const entry = { data, timestamp: Date.now(), tag };
  memoryCache.set(key, entry);
  try {
    localStorage.setItem(CACHE_STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch (e) {
    // Ignore storage quota limits
  }
}

export function invalidateCache(tags = []) {
  const tagList = Array.isArray(tags) ? tags : [tags];
  
  if (tagList.length === 0) {
    memoryCache.clear();
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith(CACHE_STORAGE_PREFIX))
        .forEach(k => localStorage.removeItem(k));
    } catch (e) {}
  } else {
    // Invalidate matching tags in memory
    for (const [k, v] of memoryCache.entries()) {
      if (tagList.some(t => v.tag === t || k.includes(t))) {
        memoryCache.delete(k);
      }
    }
    // Invalidate matching tags in localStorage
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith(CACHE_STORAGE_PREFIX))
        .forEach(k => {
          if (tagList.some(t => k.includes(t))) {
            localStorage.removeItem(k);
          }
        });
    } catch (e) {}
  }

  // Dispatch reactive event so listening components update without refresh
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dhanmool:cache-invalidated', { detail: { tags: tagList } }));
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

/**
 * Cached GET helper: returns cached data immediately if valid, or fetches and caches.
 */
async function cachedGet(endpoint, cacheKey, tag, ttl = 60000, bypassCache = false) {
  if (!bypassCache) {
    const cached = getCachedData(cacheKey, ttl);
    if (cached !== null) {
      return cached;
    }
  }

  const data = await request(endpoint);
  setCachedData(cacheKey, data, tag);
  return data;
}

export const api = {
  // Auth
  login: async (credentials) => {
    const res = await request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
    invalidateCache();
    return res;
  },
  getMe: (bypassCache = false) => cachedGet('/auth/me', 'auth_me', 'auth', 120000, bypassCache),
  updateProfile: async (profile) => {
    const res = await request('/auth/profile', { method: 'PUT', body: JSON.stringify(profile) });
    invalidateCache(['auth', 'dashboard']);
    return res;
  },
  changePassword: (data) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),

  // Expenses
  getExpenses: (params = {}, bypassCache = false) => {
    const query = new URLSearchParams(params).toString();
    return cachedGet(`/expenses${query ? `?${query}` : ''}`, `expenses_${query}`, 'expenses', 45000, bypassCache);
  },
  getCategories: (bypassCache = false) => cachedGet('/expenses/categories', 'categories', 'categories', 600000, bypassCache), // 10 min TTL
  createExpense: async (data) => {
    const res = await request('/expenses', { method: 'POST', body: JSON.stringify(data) });
    invalidateCache(['expenses', 'dashboard', 'events', 'shared']);
    return res;
  },
  updateExpense: async (id, data) => {
    const res = await request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    invalidateCache(['expenses', 'dashboard', 'events', 'shared']);
    return res;
  },
  deleteExpense: async (id) => {
    const res = await request(`/expenses/${id}`, { method: 'DELETE' });
    invalidateCache(['expenses', 'dashboard', 'events', 'shared']);
    return res;
  },

  // Analytics
  getDashboard: (params = {}, bypassCache = false) => {
    const query = new URLSearchParams(params).toString();
    return cachedGet(`/analytics/dashboard${query ? `?${query}` : ''}`, `dashboard_${query}`, 'dashboard', 60000, bypassCache);
  },

  // Events & Sinking Funds
  getEvents: (bypassCache = false) => cachedGet('/events', 'events', 'events', 60000, bypassCache),
  getEvent: (id, bypassCache = false) => cachedGet(`/events/${id}`, `event_${id}`, 'events', 60000, bypassCache),
  createEvent: async (data) => {
    const res = await request('/events', { method: 'POST', body: JSON.stringify(data) });
    invalidateCache(['events', 'dashboard']);
    return res;
  },
  updateEvent: async (id, data) => {
    const res = await request(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    invalidateCache(['events', 'dashboard']);
    return res;
  },
  deleteEvent: async (id) => {
    const res = await request(`/events/${id}`, { method: 'DELETE' });
    invalidateCache(['events', 'dashboard', 'expenses']);
    return res;
  },

  // Shared Ledgers
  getProjects: (bypassCache = false) => cachedGet('/shared/projects', 'projects', 'shared', 60000, bypassCache),
  getProject: (id, bypassCache = false) => cachedGet(`/shared/projects/${id}`, `project_${id}`, 'shared', 60000, bypassCache),
  createProject: async (data) => {
    const res = await request('/shared/projects', { method: 'POST', body: JSON.stringify(data) });
    invalidateCache(['shared']);
    return res;
  },
  addProjectMember: async (projectId, data) => {
    const res = await request(`/shared/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify(data) });
    invalidateCache(['shared']);
    return res;
  },
  removeProjectMember: async (projectId, userId) => {
    const res = await request(`/shared/projects/${projectId}/members/${userId}`, { method: 'DELETE' });
    invalidateCache(['shared']);
    return res;
  },
  createProjectExpense: async (projectId, data) => {
    const res = await request(`/shared/projects/${projectId}/expenses`, { method: 'POST', body: JSON.stringify(data) });
    invalidateCache(['shared', 'dashboard', 'expenses']);
    return res;
  },

  // Informal Lending (Udhar)
  getLending: (params = {}, bypassCache = false) => {
    const query = new URLSearchParams(params).toString();
    return cachedGet(`/lending${query ? `?${query}` : ''}`, `lending_${query}`, 'lending', 45000, bypassCache);
  },
  createLending: async (data) => {
    const res = await request('/lending', { method: 'POST', body: JSON.stringify(data) });
    invalidateCache(['lending', 'dashboard']);
    return res;
  },
  getRepayments: (id, bypassCache = false) => cachedGet(`/lending/${id}/repayments`, `repayments_${id}`, 'lending', 60000, bypassCache),
  addRepayment: async (id, data) => {
    const res = await request(`/lending/${id}/repayments`, { method: 'POST', body: JSON.stringify(data) });
    invalidateCache(['lending', 'dashboard', 'expenses']);
    return res;
  },
  deleteLending: async (id) => {
    const res = await request(`/lending/${id}`, { method: 'DELETE' });
    invalidateCache(['lending', 'dashboard']);
    return res;
  },

  // AI & NLP
  parseNL: (text) => request('/ai/parse-nl', { method: 'POST', body: JSON.stringify({ text }) }),
  getAIInsights: (bypassCache = false) => cachedGet('/ai/insights', 'ai_insights', 'ai', 120000, bypassCache),
  askAIAdvisor: (message) => request('/ai/chat', { method: 'POST', body: JSON.stringify({ message }) }),

  // Admin
  getAdminUsers: (bypassCache = false) => cachedGet('/admin/users', 'admin_users', 'admin', 60000, bypassCache),
  createAdminUser: async (data) => {
    const res = await request('/admin/users', { method: 'POST', body: JSON.stringify(data) });
    invalidateCache(['admin']);
    return res;
  },
  updateAdminUser: async (userId, data) => {
    const res = await request(`/admin/users/${userId}`, { method: 'PUT', body: JSON.stringify(data) });
    invalidateCache(['admin']);
    return res;
  },
  deleteAdminUser: async (userId) => {
    const res = await request(`/admin/users/${userId}`, { method: 'DELETE' });
    invalidateCache(['admin']);
    return res;
  },
  toggleUserStatus: async (userId, isActive) => {
    const res = await request(`/admin/users/${userId}/status`, { method: 'PATCH', body: JSON.stringify({ is_active: isActive }) });
    invalidateCache(['admin']);
    return res;
  },
  resetUserPassword: (userId, newPassword) => request(`/admin/users/${userId}/reset-password`, { method: 'POST', body: JSON.stringify({ new_password: newPassword }) }),
  getAdminStats: (bypassCache = false) => cachedGet('/admin/stats', 'admin_stats', 'admin', 60000, bypassCache),

  // Direct Cache Control
  invalidateCache,
};
