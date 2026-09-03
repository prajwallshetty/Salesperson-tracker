import { create } from "zustand";
import { api, registerUnauthorizedHandler } from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import type { AuthUser, LoginResponse } from "@/types";

// Auth is cookie-based now (httpOnly `sf_token`, see API_CONTRACT.md) — there is no token for
// this store to hold or persist. `sessionStatus` replaces the old "wait for zustand persist to
// rehydrate a cached token" gate with a real server check: it starts at "checking" on every load
// and only becomes "authenticated"/"unauthenticated" once `GET /api/auth/me` (cookie sent
// automatically) actually resolves. Callers that gate routing on this MUST treat "checking" as
// "don't know yet, don't redirect" — never fall back to a locally-cached boolean, which is the
// race that bit this store's persisted-token predecessor.
type SessionStatus = "checking" | "authenticated" | "unauthenticated";

interface AuthState {
  user: AuthUser | null;
  sessionStatus: SessionStatus;
  loginStatus: "idle" | "loading" | "error";
  error: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  sessionStatus: "checking",
  loginStatus: "idle",
  error: null,

  // Called once at app boot (from Providers, mounted for every route including /login) to
  // determine whether the sf_token cookie (if any) still represents a valid session.
  checkSession: async () => {
    try {
      const res = await api.get<AuthUser>("/auth/me");
      if (res.data.role !== "SALESPERSON") {
        set({ user: null, sessionStatus: "unauthenticated" });
        return;
      }
      set({ user: res.data, sessionStatus: "authenticated" });
      connectSocket();
    } catch {
      set({ user: null, sessionStatus: "unauthenticated" });
    }
  },

  login: async (email, password) => {
    set({ loginStatus: "loading", error: null });
    try {
      const res = await api.post<LoginResponse>("/auth/login", { email, password });
      const { user } = res.data;
      if (user.role !== "SALESPERSON") {
        const message = "This app is for salespeople only. Please use the admin console.";
        set({ loginStatus: "error", error: message, user: null, sessionStatus: "unauthenticated" });
        // The server already set the sf_token cookie for this (non-salesperson) account — clear
        // it immediately so this device isn't left holding a live session for the wrong app.
        api.post("/auth/logout").catch(() => {});
        throw new Error(message);
      }
      set({ user, sessionStatus: "authenticated", loginStatus: "idle", error: null });
      connectSocket();
      return user;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      set({ loginStatus: "error", error: message });
      throw err;
    }
  },

  logout: async () => {
    disconnectSocket();
    set({ user: null, sessionStatus: "unauthenticated", loginStatus: "idle", error: null });
    try {
      await api.post("/auth/logout");
    } catch {
      // Cookie may already be expired/cleared server-side — local state is already logged out.
    }
  },
}));

// Wire the api 401 handler to the store without a circular import at module-load time.
// A 401 on any request (session expired, deactivated mid-session per API_CONTRACT.md) means the
// cookie no longer represents a valid session — drop local state, but don't re-call
// /auth/logout here (that would itself 401 and could loop with a still-broken session).
registerUnauthorizedHandler(() => {
  disconnectSocket();
  useAuthStore.setState({ user: null, sessionStatus: "unauthenticated" });
});
