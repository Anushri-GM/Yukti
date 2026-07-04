import { create } from 'zustand';
import { User } from './authStore';

interface UserState {
  users: User[];
  fetchUsers: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  users: [],
  fetchUsers: async () => {
    // Logic skeleton
    set({ users: [] });
  },
}));
