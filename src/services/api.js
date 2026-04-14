import axios from 'axios';

export const API_URL = process.env.EXPO_PUBLIC_API_URL;

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = global.authToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle expired/invalid tokens — clear session so AuthContext redirects to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && global.authToken) {
      global.authToken = null;
      // Signal AuthContext to clear session via a global flag
      if (typeof global.onAuthExpired === 'function') global.onAuthExpired();
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  googleAuth: (idToken) => api.post('/auth/google', { idToken }),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/me', data),
  deleteAccount: ({ password, googleIdToken } = {}) => api.delete('/auth/account', { data: { password, googleIdToken } }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (email, otp, newPassword) => api.post('/auth/reset-password', { email, otp, newPassword }),
};

export const mealsAPI = {
  analyze: (formData) => api.post('/meals/analyze-meal', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  analyzeText: (query, mealType) => api.post('/meals/analyze-text', { query, mealType }),
  getAll: (page = 1, limit = 500) => api.get(`/meals?page=${page}&limit=${limit}`),
  log: (data) => api.post('/meals/log', data),
  delete: (id) => api.delete(`/meals/${id}`),
  update: (id, data) => api.patch(`/meals/${id}`, data),
};

export const waterAPI = {
  get: (date) => api.get(`/water?date=${date}`),
  set: (date, glasses) => api.put('/water', { date, glasses }),
};

export const exportAPI = {
  exportData: () => api.get('/auth/export'),
};

export const analyticsAPI = {
  track: (eventName, metadata) => api.post('/analytics/track', { eventName, metadata }),
};

export default api;