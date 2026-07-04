import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to inject Authorization Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('yukti_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor with automatic token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    
    // Check if error is 401 Unauthorized (expired token) and not a retry attempt
    if (
      error.response && 
      error.response.status === 401 && 
      originalRequest && 
      !(originalRequest as any)._retry &&
      !originalRequest.url?.includes('/api/auth/login') &&
      !originalRequest.url?.includes('/api/auth/register')
    ) {
      (originalRequest as any)._retry = true;
      
      const refresh = localStorage.getItem('yukti_refresh_token');
      if (refresh) {
        try {
          // Call refresh API directly to avoid circular interceptor calls
          const refreshRes = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refresh_token: refresh
          });
          const { access_token } = refreshRes.data;
          
          localStorage.setItem('yukti_access_token', access_token);
          
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh token expired too, clear storage and trigger redirect
          localStorage.removeItem('yukti_access_token');
          localStorage.removeItem('yukti_refresh_token');
          window.location.reload(); // Hard reload will boot back to login screen
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
