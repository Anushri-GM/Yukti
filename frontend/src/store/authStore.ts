import { create } from 'zustand';
import apiClient from '../services/api';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: 'Citizen' | 'Officer' | 'MP';
  preferred_language: string;
  phone_number?: string;
  profile_image?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  register: (payload: any) => Promise<boolean>;
  login: (credentials: { email: string; password: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateProfile: (payload: any) => Promise<boolean>;
  changePassword: (payload: any) => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: localStorage.getItem('yukti_access_token'),
  refreshToken: localStorage.getItem('yukti_refresh_token'),
  isAuthenticated: !!localStorage.getItem('yukti_access_token'),
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  register: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post('/api/auth/register', payload);
      const { access_token, refresh_token, user } = res.data;
      
      localStorage.setItem('yukti_access_token', access_token);
      localStorage.setItem('yukti_refresh_token', refresh_token);
      
      set({
        accessToken: access_token,
        refreshToken: refresh_token,
        user,
        isAuthenticated: true,
        isLoading: false
      });
      return true;
    } catch (e: any) {
      set({ 
        isLoading: false, 
        error: e.response?.data?.detail || "Registration failed. Please verify your details." 
      });
      return false;
    }
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post('/api/auth/login', credentials);
      const { access_token, refresh_token, user } = res.data;
      
      localStorage.setItem('yukti_access_token', access_token);
      localStorage.setItem('yukti_refresh_token', refresh_token);
      
      set({
        accessToken: access_token,
        refreshToken: refresh_token,
        user,
        isAuthenticated: true,
        isLoading: false
      });
      return true;
    } catch (e: any) {
      set({ 
        isLoading: false, 
        error: e.response?.data?.detail || "Invalid email or password." 
      });
      return false;
    }
  },

  logout: async () => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (e) {
      console.warn("Logout request failed on server, cleaning client state.", e);
    } finally {
      localStorage.removeItem('yukti_access_token');
      localStorage.removeItem('yukti_refresh_token');
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    }
  },

  checkAuth: async () => {
    const token = get().accessToken;
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }
    set({ isLoading: true });
    try {
      const res = await apiClient.get('/api/auth/me');
      set({ user: res.data, isAuthenticated: true, isLoading: false });
    } catch (e) {
      // If verification fails, try to refresh first or reset session
      localStorage.removeItem('yukti_access_token');
      localStorage.removeItem('yukti_refresh_token');
      set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateProfile: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.put('/api/users/profile', payload);
      set({ user: res.data, isLoading: false });
      return true;
    } catch (e: any) {
      set({ 
        isLoading: false, 
        error: e.response?.data?.detail || "Failed to update profile." 
      });
      return false;
    }
  },

  changePassword: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post('/api/users/change-password', payload);
      set({ isLoading: false });
      return true;
    } catch (e: any) {
      set({ 
        isLoading: false, 
        error: e.response?.data?.detail || "Failed to change password." 
      });
      return false;
    }
  }
}));
