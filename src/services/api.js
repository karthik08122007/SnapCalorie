import axios from 'axios';

const API_URL = 'https://snapcalorie-backend-production.up.railway.app/api';

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
};

export const mealsAPI = {
  analyze: (formData) => api.post('/meals/analyze-meal', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  analyzeText: (query, mealType) => api.post('/meals/analyze-text', { query, mealType }),
  getAll: (page = 1, limit = 50) => api.get(`/meals?page=${page}&limit=${limit}`),
  delete: (id) => api.delete(`/meals/${id}`),
  update: (id, data) => api.patch(`/meals/${id}`, data),
};

export default api;