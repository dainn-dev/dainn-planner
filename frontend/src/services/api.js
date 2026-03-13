/**
 * API Service - Handles all backend API calls
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

/** Base URL for API server (no /api suffix), for static assets like avatars */
export const getAvatarFullUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const base = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h = ((h << 5) - h) + c;
    h = h & h;
  }
  return Math.abs(h).toString(36);
}

function getDeviceLabel() {
  if (typeof navigator === 'undefined') return undefined;
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
  return 'Web';
}

// In-flight GET request de-dupe (prevents duplicate GETs in React StrictMode/dev)
const inflightGetRequests = new Map();

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Helper function to set auth token
const setAuthToken = (token) => {
  localStorage.setItem('token', token);
};

// Helper function to remove auth token
const removeAuthToken = () => {
  localStorage.removeItem('token');
};

// Helper function to make API requests
const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const url = `${API_BASE_URL}${endpoint}`;

  const config = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  // Remove Content-Type for FormData
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const method = String(config.method || 'GET').toUpperCase();
  const inflightKey = method === 'GET' && config.body == null
    ? `${url}::${config.headers?.Authorization || ''}`
    : null;

  const doRequest = async () => {
    const response = await fetch(url, config);
    
    // Check if we were redirected to a login page (302 redirects are automatically followed by fetch)
    const finalUrl = response.url;
    // Only treat as auth failure if we get a 401 or the response is actually indicating auth failure
    // Don't clear tokens just because backend redirects - might be a backend configuration issue
    if ((finalUrl.includes('/Login') || finalUrl.includes('/Account/Login')) && response.status === 401) {
      // Backend redirected to login page with 401 - this means authentication failed
      // Clear tokens and throw authentication error
      removeAuthToken();
      localStorage.removeItem('user');
      localStorage.removeItem('refreshToken');
      throw new Error('Authentication required. Please login again.');
    }
    
    // Handle 302 redirects that haven't been followed (shouldn't happen with fetch, but just in case)
    // Don't clear tokens on redirects - might be backend configuration
    if (response.status === 302) {
      const location = response.headers.get('location');
      if (location && (location.includes('/Login') || location.includes('/Account/Login'))) {
        // Just throw error, don't clear tokens - backend might be misconfigured
        throw new Error('Backend redirected to login page. This might be a backend configuration issue.');
      }
    }
    
    // Check if response is HTML (likely a redirect to login page that returned 404)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      // Got HTML response, likely redirected to login page
      // Only treat as auth failure if we got 401, otherwise it might be a backend config issue
      if (finalUrl.includes('/Login') || finalUrl.includes('/Account/Login')) {
        // Don't clear tokens unless it's a real 401 - backend redirects might be misconfigured
        if (response.status === 401) {
          removeAuthToken();
          localStorage.removeItem('user');
          localStorage.removeItem('refreshToken');
          throw new Error('Authentication required. Please login again.');
        }
        // Just throw error without clearing tokens - might be backend issue
        throw new Error('Backend configuration issue: redirected to login page');
      }
      throw new Error('Endpoint not found or authentication required');
    }
    
    // Handle text/plain response
    let data;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // Try to parse as JSON even if content-type is text/plain
      const text = await response.text();
      // If it looks like HTML, it's probably a redirect
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        throw new Error('Endpoint not found or authentication required');
      }
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text || 'An error occurred' };
      }
    }

    if (!response.ok) {
      // Handle specific status codes
      if (response.status === 401) {
        // Unauthorized - clear tokens and redirect to login
        removeAuthToken();
        localStorage.removeItem('user');
        localStorage.removeItem('refreshToken');
        throw new Error('Authentication required. Please login again.');
      }
      if (response.status === 403) {
        throw new Error('Access forbidden');
      }
      if (response.status === 404) {
        // Don't clear tokens on 404 - endpoint might just not exist
        // Only clear if we explicitly got a 401 before the redirect
        throw new Error('Endpoint not found');
      }
      throw new Error(data.message || data.error || 'An error occurred');
    }

    // Automatically unwrap response.data if present, otherwise return the full response
    return data.data !== undefined ? data.data : data;
  };

  if (inflightKey) {
    const existing = inflightGetRequests.get(inflightKey);
    if (existing) return await existing;

    const p = (async () => {
      try {
        return await doRequest();
      } finally {
        inflightGetRequests.delete(inflightKey);
      }
    })();

    inflightGetRequests.set(inflightKey, p);
    return await p;
  }

  try {
    return await doRequest();
  } catch (error) {
    throw error;
  }
};

// ============================================
// AUTHENTICATION API
// ============================================

export const authAPI = {
  register: async (userData) => {
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    // Response is already unwrapped by apiRequest
    return response;
  },

  login: async (email, password) => {
    const deviceId = (typeof localStorage !== 'undefined' && localStorage.getItem('deviceId')) || (typeof navigator !== 'undefined' && navigator.userAgent ? `web-${hashString(navigator.userAgent).slice(0, 24)}` : undefined);
    const deviceName = typeof navigator !== 'undefined' ? getDeviceLabel() : undefined;
    const platform = 'web';
    const body = { email, password };
    if (deviceId) body.deviceId = deviceId;
    if (deviceName) body.deviceName = deviceName;
    body.platform = platform;
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (response.requiresTwoFactor) {
      return { ...response, requiresTwoFactor: true };
    }

    const token = response.token;
    const user = response.user;
    if (token) {
      setAuthToken(token);
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
      if (deviceId && typeof localStorage !== 'undefined' && !localStorage.getItem('deviceId')) {
        localStorage.setItem('deviceId', deviceId);
      }
    }
    return { ...response, user, token };
  },

  verify2FA: async (email, code, devicePayload = {}) => {
    const deviceId = devicePayload.deviceId ?? (typeof localStorage !== 'undefined' && localStorage.getItem('deviceId')) ?? (typeof navigator !== 'undefined' && navigator.userAgent ? `web-${hashString(navigator.userAgent).slice(0, 24)}` : undefined);
    const deviceName = devicePayload.deviceName ?? (typeof navigator !== 'undefined' ? getDeviceLabel() : undefined);
    const platform = devicePayload.platform ?? 'web';
    const body = { email, code, deviceId, deviceName, platform };
    const response = await apiRequest('/auth/verify-2fa', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const token = response.token;
    const user = response.user;
    if (token) {
      setAuthToken(token);
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
      const deviceId = devicePayload.deviceId || (typeof localStorage !== 'undefined' && localStorage.getItem('deviceId'));
      if (deviceId && typeof localStorage !== 'undefined' && !localStorage.getItem('deviceId')) {
        localStorage.setItem('deviceId', deviceId);
      }
    }
    return { ...response, user, token };
  },

  socialLogin: async (provider, accessToken, devicePayload = {}) => {
    const deviceId = devicePayload.deviceId ?? (typeof localStorage !== 'undefined' && localStorage.getItem('deviceId')) ?? (typeof navigator !== 'undefined' && navigator.userAgent ? `web-${hashString(navigator.userAgent).slice(0, 24)}` : undefined);
    const deviceName = devicePayload.deviceName ?? (typeof navigator !== 'undefined' ? getDeviceLabel() : undefined);
    const platform = devicePayload.platform ?? 'web';
    const body = { provider, accessToken };
    if (deviceId) body.deviceId = deviceId;
    if (deviceName) body.deviceName = deviceName;
    body.platform = platform;
    const response = await apiRequest('/auth/social-login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const token = response.token;
    const user = response.user;
    const refreshToken = response.refreshToken;
    if (token) {
      setAuthToken(token);
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
      if (refreshToken && typeof localStorage !== 'undefined') {
        localStorage.setItem('refreshToken', refreshToken);
      }
      if (deviceId && typeof localStorage !== 'undefined' && !localStorage.getItem('deviceId')) {
        localStorage.setItem('deviceId', deviceId);
      }
    }
    return { ...response, user, token };
  },

  forgotPassword: async (email) => {
    return await apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: async (email, token, newPassword, confirmPassword) => {
    return await apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, token, newPassword, confirmPassword }),
    });
  },

  logout: async () => {
    try {
      // Try to call logout endpoint if it exists
      try {
        await apiRequest('/auth/logout', {
          method: 'POST',
        });
      } catch (error) {
        // If logout endpoint doesn't exist (404), that's okay
        // We'll still clear local storage
        if (!error.message.includes('not found') && !error.message.includes('Authentication required')) {
          throw error;
        }
        console.warn('Logout endpoint not available, clearing local storage only');
      }
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API error:', error);
    } finally {
      removeAuthToken();
      localStorage.removeItem('user');
      localStorage.removeItem('refreshToken');
    }
  },
};

// localStorage key for persisted user settings (full settings object from GET /users/me/settings)
export const USER_SETTINGS_STORAGE_KEY = 'user_settings';

// ============================================
// USER PROFILE API
// ============================================

export const userAPI = {
  getProfile: async () => {
    return await apiRequest('/users/me');
  },

  updateProfile: async (profileData) => {
    return await apiRequest('/users/me', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  uploadAvatar: async (file) => {
    const form = new FormData();
    form.append('file', file);
    return await apiRequest('/users/me/avatar', {
      method: 'POST',
      body: form,
    });
  },

  getSettings: async () => {
    const response = await apiRequest('/users/me/settings');
    const settings = response?.data?.data ?? response?.data ?? response;
    if (settings && typeof settings === 'object') {
      try {
        localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('userSettingsUpdated'));
        }
      } catch (e) {
        // ignore quota or serialization errors
      }
    }
    return settings;
  },

  updateSettings: async (payload) => {
    const response = await apiRequest('/users/me/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    const settings = response?.data?.data ?? response?.data ?? response;
    if (settings && typeof settings === 'object') {
      try {
        localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('userSettingsUpdated'));
        }
      } catch (e) {
        // ignore
      }
    }
    return settings;
  },

  getDevices: async () => {
    const list = await apiRequest('/users/me/devices');
    return Array.isArray(list) ? list : [];
  },

  revokeDevice: async (deviceId) => {
    await apiRequest(`/users/me/devices/${deviceId}`, { method: 'DELETE' });
  },

  changePassword: async ({ currentPassword, newPassword }) => {
    await apiRequest('/users/me/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  get2FAStatus: async () => {
    const result = await apiRequest('/users/me/2fa/status');
    return result === true || result === false ? result : (result?.data ?? false);
  },

  setup2FA: async () => {
    const result = await apiRequest('/users/me/2fa/setup');
    return result?.sharedKey != null ? result : (result?.data ?? result);
  },

  enable2FA: async ({ code }) => {
    await apiRequest('/users/me/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  disable2FA: async ({ code }) => {
    await apiRequest('/users/me/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },
};

// ============================================
// TASKS API
// ============================================

export const tasksAPI = {
  getTasks: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = `/tasks${queryParams ? `?${queryParams}` : ''}`;
    return await apiRequest(endpoint);
  },

  createTask: async (taskData) => {
    return await apiRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  },

  updateTask: async (taskId, taskData) => {
    return await apiRequest(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  },

  completeTask: async (taskId) => {
    return await apiRequest(`/tasks/${taskId}/toggle`, {
      method: 'PATCH',
    });
  },

  deleteTask: async (taskId) => {
    return await apiRequest(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  },

  getTagsWithUsage: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = `/tasks/tags${queryParams ? `?${queryParams}` : ''}`;
    return await apiRequest(endpoint);
  },
};

// ============================================
// GOALS API
// ============================================

export const goalsAPI = {
  getGoals: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = `/goals${queryParams ? `?${queryParams}` : ''}`;
    return await apiRequest(endpoint);
  },

  getGoal: async (goalId) => {
    return await apiRequest(`/goals/${goalId}`);
  },

  createGoal: async (goalData) => {
    return await apiRequest('/goals', {
      method: 'POST',
      body: JSON.stringify(goalData),
    });
  },

  updateGoal: async (goalId, goalData) => {
    return await apiRequest(`/goals/${goalId}`, {
      method: 'PUT',
      body: JSON.stringify(goalData),
    });
  },

  deleteGoal: async (goalId) => {
    return await apiRequest(`/goals/${goalId}`, {
      method: 'DELETE',
    });
  },

  toggleMilestone: async (goalId, milestoneId) => {
    return await apiRequest(`/goals/${goalId}/milestones/${milestoneId}/toggle`, {
      method: 'PATCH',
    });
  },
};

// ============================================
// EVENTS API
// ============================================

export const eventsAPI = {
  getEvents: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = `/events${queryParams ? `?${queryParams}` : ''}`;
    return await apiRequest(endpoint);
  },

  getEvent: async (eventId) => {
    return await apiRequest(`/events/${eventId}`);
  },

  createEvent: async (eventData) => {
    return await apiRequest('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  },

  updateEvent: async (eventId, eventData) => {
    return await apiRequest(`/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  },

  deleteEvent: async (eventId) => {
    return await apiRequest(`/events/${eventId}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// NOTIFICATIONS API
// ============================================

export const notificationsAPI = {
  getNotifications: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = `/notifications${queryParams ? `?${queryParams}` : ''}`;
    return await apiRequest(endpoint);
  },

  markAsRead: async (notificationId) => {
    return await apiRequest(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  },
};

// ============================================
// CONTACT API
// ============================================

export const contactAPI = {
  submitContact: async (contactData) => {
    return await apiRequest('/contact', {
      method: 'POST',
      body: JSON.stringify(contactData),
    });
  },
};

// ============================================
// ADMIN API
// ============================================

export const adminAPI = {
  getUsers: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = `/admin/users${queryParams ? `?${queryParams}` : ''}`;
    return await apiRequest(endpoint);
  },

  getUserStats: async () => {
    return await apiRequest('/admin/users/stats');
  },

  getStats: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = `/admin/dashboard/stats${queryParams ? `?${queryParams}` : ''}`;
    return await apiRequest(endpoint);
  },

  getUserGrowth: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = `/admin/dashboard/user-growth${queryParams ? `?${queryParams}` : ''}`;
    return await apiRequest(endpoint);
  },

  getUser: async (id) => {
    return await apiRequest(`/admin/users/${id}`);
  },

  updateUser: async (id, data) => {
    return await apiRequest(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteUser: async (id) => {
    return await apiRequest(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  },

  resetUserPassword: async (id, { newPassword }) => {
    return await apiRequest(`/admin/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },

  exportUsers: async (params = {}) => {
    const token = getAuthToken();
    const queryParams = new URLSearchParams();
    if (params.format) queryParams.set('format', params.format);
    if (params.search) queryParams.set('search', params.search);
    if (params.status) queryParams.set('status', params.status);
    if (params.role) queryParams.set('role', params.role);
    if (params.dateRange) queryParams.set('dateRange', params.dateRange);
    if (params.sort) queryParams.set('sort', params.sort);
    if (params.ids && Array.isArray(params.ids) && params.ids.length > 0) {
      queryParams.set('ids', params.ids.join(','));
    }
    const url = `${API_BASE_URL}/admin/users/export${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      let message = 'Export failed';
      if (contentType.includes('application/json')) {
        try {
          const data = await response.json();
          message = data.message || data.error || message;
        } catch (_) {}
      }
      throw new Error(message);
    }
    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition');
    let filename = 'users_export';
    if (params.format === 'csv') filename += '.csv';
    else if (params.format === 'excel') filename += '.xlsx';
    else if (params.format === 'pdf') filename += '.pdf';
    else filename += '.bin';
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, '').trim();
      }
    }
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  },

  getLogFiles: async () => {
    const res = await apiRequest('/admin/logs');
    return Array.isArray(res) ? res : (res?.data ?? []);
  },

  getLogContent: async (fileName, options = {}) => {
    const params = new URLSearchParams();
    if (options.tail != null) params.set('tail', String(options.tail));
    if (options.offset != null) params.set('offset', String(options.offset));
    if (options.limit != null) params.set('limit', String(options.limit));
    const q = params.toString();
    const endpoint = `/admin/logs/${encodeURIComponent(fileName)}${q ? `?${q}` : ''}`;
    const res = await apiRequest(endpoint);
    return res;
  },

  subscribeLogStream: (fileName, onMessage, onError) => {
    if (!fileName || typeof fileName !== 'string' || !fileName.trim()) {
      onError?.(new Error('File name is required for stream'));
      return () => {};
    }
    const token = getAuthToken();
    const url = `${API_BASE_URL}/admin/logs/stream?file=${encodeURIComponent(fileName.trim())}`;
    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            ...(token && { Authorization: `Bearer ${token}` })
          },
          credentials: 'include',
          signal: controller.signal
        });
        if (!response.ok) {
          const errBody = await response.text();
          let msg = 'Stream failed';
          try {
            const json = JSON.parse(errBody);
            if (json.message) msg = json.message;
          } catch (_) {}
          onError?.(new Error(msg));
          return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const parts = buf.split('\n\n');
          buf = parts.pop() ?? '';
          for (const part of parts) {
            const match = part.match(/^data:\s*(.+)/m);
            if (match) {
              try {
                const data = JSON.parse(match[1].trim());
                onMessage(data);
              } catch (_) {}
            }
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') onError?.(err);
      }
    })();

    return () => controller.abort();
  },
};

