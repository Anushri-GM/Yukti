import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

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
    const token = localStorage.getItem('yukti_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor with global error handling & retry
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    // Retry structure (1 retry maximum)
    if (error.response && error.response.status === 500 && originalRequest && !(originalRequest as any)._retry) {
      (originalRequest as any)._retry = true;
      return apiClient(originalRequest);
    }
    
    // Global Error notification hook trigger
    console.error("Global API Error: ", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;
