import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { api, clearToken, registerUnauthorizedHandler, setToken } from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import type { AuthUser, LoginResponse } from "@/types";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  status: "idle" | "loading" | "authenticated" | "error";
  error: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  hydrateFromMe: () => Promise<void>;
}

// Guard against Next.js's server-side prerender pass of this "use client" module tree,
// where `localStorage` does not exist. Fall back to a no-op storage in that case.
const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      status: "idle",
      error: null,
      login: async (email, password) => {
        set({ status: "loading", error: null });
        try {
          const res = await api.post<LoginResponse>("/auth/login", { email, password });
          const { token, user } = res.data;
          if (user.role !== "SALESPERSON") {
            set({ status: "error", error: "This app is for salespeople only. Please use the admin console." });
            throw new Error("This app is for salespeople only. Please use the admin console.");
          }
          setToken(token);
          set({ token, user, status: "authenticated", error: null });
          connectSocket();
          return user;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Login failed";
          set({ status: "error", error: message });
          throw err;
        }
      },
      logout: () => {
        clearToken();
        disconnectSocket();
        set({ user: null, token: null, status: "idle", error: null });
      },
      hydrateFromMe: async () => {
        const { token } = get();
        if (!token) return;
        try {
          const res = await api.get<AuthUser>("/auth/me");
          if (res.data.role !== "SALESPERSON") {
            get().logout();
            return;
          }
          set({ user: res.data, status: "authenticated" });
          connectSocket();
        } catch {
          get().logout();
        }
      },
    }),
    {
      name: "sfp-auth",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : noopStorage)),
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);

// Wire the api 401 handler to the store without a circular import at module-load time.
registerUnauthorizedHandler(() => {
  useAuthStore.getState().logout();
});
