import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token from localStorage on load
const savedToken = localStorage.getItem('gravit_token');
if (savedToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
}

// Response interceptor for auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('gravit_token');
      delete api.defaults.headers.common['Authorization'];
      // Don't redirect here — let AuthContext handle it
    }
    return Promise.reject(error);
  }
);

export default api;
