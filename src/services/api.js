import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://snapcalorie-backend-production.up.railway.app/api';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = global.authToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  googleAuth: (idToken) => api.post('/auth/google', { idToken }),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/me', data),
  deleteAccount: (password) => api.delete('/auth/account', { data: { password } }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (email, otp, newPassword) => api.post('/auth/reset-password', { email, otp, newPassword }),
  verifyPhoneOtp: (data) => api.post('/auth/verify-phone-otp', data),
};

export const mealsAPI = {
  analyze: (formData) => api.post('/meals/analyze-meal', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  analyzeText: (query, mealType) => api.post('/meals/analyze-text', { query, mealType }),
  getAll: (page = 1, limit = 100) => api.get(`/meals?page=${page}&limit=${limit}`),
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