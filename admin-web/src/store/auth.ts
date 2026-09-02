import { create } from "zustand";
import { api } from "../lib/api";
import { disconnectSocket } from "../lib/socket";
import type { AuthUser } from "../types";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: (message?: string) => void;
  hydrate: () => void;
}

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem("sf_auth");
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  hydrated: false,

  hydrate: () => {
    const token = localStorage.getItem("sf_token");
    const user = loadStoredUser();
    set({ token, user, hydrated: true });
  },

  login: async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    const { token, user } = res.data as { token: string; user: AuthUser };
    if (user.role !== "ADMIN") {
      throw new Error("This dashboard is for administrators only. Your account does not have admin access.");
    }
    localStorage.setItem("sf_token", token);
    localStorage.setItem("sf_auth", JSON.stringify(user));
    set({ token, user });
    return user;
  },

  logout: (_message?: string) => {
    localStorage.removeItem("sf_token");
    localStorage.removeItem("sf_auth");
    disconnectSocket();
    set({ token: null, user: null });
  },
}));
