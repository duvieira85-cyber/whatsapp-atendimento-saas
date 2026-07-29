import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const isLoginRequest = (config: InternalAxiosRequestConfig) =>
  config.url?.includes('/auth/login/');

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (!originalRequest) return Promise.reject(error);

    if (error.response?.status === 401 && !originalRequest._retry && !isLoginRequest(originalRequest)) {
      originalRequest._retry = true;
      const storedRefresh = localStorage.getItem('refresh_token');

      if (storedRefresh) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh/`, {
            refresh: storedRefresh,
          });
          const { access } = response.data;
          localStorage.setItem('access_token', access);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access}`;
          }
          return api(originalRequest);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
