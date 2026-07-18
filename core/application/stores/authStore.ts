import { create } from 'zustand';
import {
  clearSession,
  getAccessToken,
  storeTokens,
} from '@/core/infrastructure/session';

// Zustand = the React reactivity layer on top of infrastructure/session.ts
// (the real token source). access_token NEVER touches localStorage — module
// memory only (AGENTS.md Security Rules).

type AuthState = {
  isAuthenticated: boolean;
  setSession: (accessToken: string, refreshToken: string) => void;
  syncFromSession: () => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,

  setSession: (accessToken, refreshToken) => {
    storeTokens(accessToken, refreshToken);
    set({ isAuthenticated: true });
  },

  // Called after api.bootstrapSession() in AppProviders.
  syncFromSession: () => set({ isAuthenticated: getAccessToken() !== null }),

  clear: () => {
    clearSession();
    set({ isAuthenticated: false });
  },
}));
