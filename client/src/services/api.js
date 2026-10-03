import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 60000 // 60 second request timeout to tolerate Render cold boots gracefully
});

// Request interceptor: attach bearer token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('campuspro_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const historicalManage = sessionStorage.getItem('campuspro_historical_manage') || localStorage.getItem('campuspro_historical_manage');
    if (historicalManage === 'true') {
      config.headers['x-historical-manage'] = 'true';
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: handle 401 unauthorized, 429 rate limits, and network errors gracefully
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // If request was cancelled intentionally via AbortController, ignore
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    if (error.response) {
      const { status } = error.response;
      if (status === 401) {
        // Clear stale token and redirect to login if not already on an auth page
        localStorage.removeItem('campuspro_token');
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        const isAuthPage = ['/login', '/register', '/forgot-password'].includes(currentPath) || currentPath.startsWith('/reset-password');
        if (typeof window !== 'undefined' && !isAuthPage) {
          window.location.href = '/login';
        }
      } else if (status === 429) {
        console.warn('[CampusPro Rate Limit] Too many requests. Please slow down.');
      }
    } else if (error.code === 'ECONNABORTED') {
      console.warn('[CampusPro Network] Request timed out after 30 seconds.');
    }

    return Promise.reject(error);
  }
);

export const isCancel = axios.isCancel;

export default API;
