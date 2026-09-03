import axios, { AxiosError } from "axios";

// Auth is cookie-based (httpOnly `sf_token` set by the server) — see API_CONTRACT.md's
// "Auth transport — httpOnly cookie" section. There is no token for JS to read/store anymore;
// `withCredentials: true` is what makes the browser attach the cookie to every request.
export const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api`,
  timeout: 20000,
  withCredentials: true,
});

// Set by the auth store at startup to avoid a circular import between api.ts and store/auth.ts
let onUnauthorized: (() => void) | null = null;
export function registerUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ error?: string; details?: unknown }>) => {
    if (error.response?.status === 401) {
      onUnauthorized?.();
    }
    const message =
      error.response?.data?.error ||
      (error.code === "ECONNABORTED" ? "Request timed out. Check your connection." : undefined) ||
      error.message ||
      "Something went wrong";
    return Promise.reject(new Error(message));
  }
);

export function apiErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
