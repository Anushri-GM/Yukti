import { create } from 'zustand';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'Citizen' | 'Officer' | 'MP';
  language: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials: { email: string; role: 'Citizen' | 'Officer' | 'MP' }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  login: (credentials) => {
    // Skeleton implementation
    set({
      user: {
        id: 1,
        name: `Demo ${credentials.role}`,
        email: `${credentials.role.toLowerCase()}@yukti.gov.in`,
        role: credentials.role,
        language: 'en'
      },
      token: 'demo-token',
      isAuthenticated: true
    });
  },
  logout: () => set({ user: null, token: null, isAuthenticated: false }),
}));
