import { create } from "zustand";
import { platformApi } from "../lib/platformApi";

export interface PlatformAdmin {
  id: string;
  name: string;
  email: string;
}

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

interface PlatformAuthState {
  admin: PlatformAdmin | null;
  status: SessionStatus;
  login: (email: string, password: string) => Promise<PlatformAdmin>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

function cacheAdmin(admin: PlatformAdmin) {
  try {
    localStorage.setItem("sg_platform_admin", JSON.stringify(admin));
  } catch {
    // ignore
  }
}

function loadCachedAdmin(): PlatformAdmin | null {
  try {
    const raw = localStorage.getItem("sg_platform_admin");
    return raw ? (JSON.parse(raw) as PlatformAdmin) : null;
  } catch {
    return null;
  }
}

function clearCachedAdmin() {
  try {
    localStorage.removeItem("sg_platform_admin");
  } catch {
    // ignore
  }
}

// Mirrors store/auth.ts's shape exactly, but talks to /api/platform/* and its own
// `sg_platform_token` cookie - kept as a separate store (not a mode flag on useAuthStore) so a
// platform session and a tenant session can never be confused for one another in the same tab.
export const usePlatformAuthStore = create<PlatformAuthState>((set) => ({
  admin: typeof window !== "undefined" ? loadCachedAdmin() : null,
  status: "loading",

  checkSession: async () => {
    try {
      const res = await platformApi.get("/me");
      const admin = res.data as PlatformAdmin;
      cacheAdmin(admin);
      set({ admin, status: "authenticated" });
    } catch {
      clearCachedAdmin();
      set({ admin: null, status: "unauthenticated" });
    }
  },

  login: async (email: string, password: string) => {
    const res = await platformApi.post("/login", { email, password });
    const { admin } = res.data as { admin: PlatformAdmin };
    cacheAdmin(admin);
    set({ admin, status: "authenticated" });
    return admin;
  },

  logout: async () => {
    try {
      await platformApi.post("/logout");
    } catch {
      // best-effort
    }
    clearCachedAdmin();
    set({ admin: null, status: "unauthenticated" });
  },
}));
