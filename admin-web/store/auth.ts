import { create } from "zustand";
import { api } from "../lib/api";
import { disconnectSocket } from "../lib/socket";
import type { AuthUser } from "../types";

// Auth transport migrated to an httpOnly `sf_token` cookie (see API_CONTRACT.md) - the
// server never returns a token in the response body, and JS cannot read the cookie.
// So there is nothing to persist as a "logged in" flag: the only real source of truth
// for "am I logged in" is a live `GET /api/auth/me` call, since the cookie can be
// expired or cleared server-side (e.g. an admin deactivated this account) without the
// client knowing. `localStorage["sf_user"]` below is purely a *display* cache — name/
// avatar/role for an instant paint before that check resolves - never trust it as proof
// of a session.
type SessionStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  user: AuthUser | null;
  status: SessionStatus;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

function cacheUser(user: AuthUser) {
  try {
    localStorage.setItem("sf_user", JSON.stringify(user));
  } catch {
    // ignore (private mode / storage disabled)
  }
}

function loadCachedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem("sf_user");
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function clearCachedUser() {
  try {
    localStorage.removeItem("sf_user");
    // Drop the legacy bearer-token keys from before the cookie migration, if present.
    localStorage.removeItem("sf_token");
    localStorage.removeItem("sf_auth");
  } catch {
    // ignore
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  // Seed from the display cache so the shell can paint a name/avatar instantly; status
  // starts "loading" regardless, and checkSession() (run once on app mount) is what
  // actually decides authenticated vs. unauthenticated.
  user: typeof window !== "undefined" ? loadCachedUser() : null,
  status: "loading",

  checkSession: async () => {
    try {
      const res = await api.get("/auth/me");
      const user = res.data as AuthUser;
      if (user.role !== "ADMIN") {
        // A non-admin account somehow holds a session cookie for this dashboard
        // (e.g. a salesperson token from a shared browser) - this dashboard is
        // admin-only, so clear the server-side cookie too, not just local state.
        await api.post("/auth/logout").catch(() => {});
        clearCachedUser();
        set({ user: null, status: "unauthenticated" });
        return;
      }
      cacheUser(user);
      set({ user, status: "authenticated" });
    } catch {
      clearCachedUser();
      set({ user: null, status: "unauthenticated" });
    }
  },

  login: async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    const { user } = res.data as { user: AuthUser };
    if (user.role !== "ADMIN") {
      // The server already set the httpOnly cookie for this account before we can
      // inspect its role - clear it immediately so a rejected login never leaves a
      // valid session behind.
      await api.post("/auth/logout").catch(() => {});
      set({ user: null, status: "unauthenticated" });
      throw new Error("This dashboard is for administrators only. Your account does not have admin access.");
    }
    cacheUser(user);
    set({ user, status: "authenticated" });
    return user;
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Best-effort - fall through and clear local state regardless, since the whole
      // point of logging out is that this device should stop acting authenticated.
    }
    clearCachedUser();
    disconnectSocket();
    set({ user: null, status: "unauthenticated" });
  },
}));
