/**
 * API Service - Handles all backend API calls
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

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

  try {
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
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    // Response is already unwrapped by apiRequest, so response should contain { token, user }
    const token = response.token;
    const user = response.user;
    
    if (token) {
      setAuthToken(token);
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
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

  getStats: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = `/admin/dashboard/stats${queryParams ? `?${queryParams}` : ''}`;
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
};

