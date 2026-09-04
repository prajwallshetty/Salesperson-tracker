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

// Generic, unhelpful backend error text that's better replaced with a clearer message
// for the specific status code - a real 403 like "This visit does not belong to you" is
// already useful and passes through unchanged; only these known-generic ones get mapped.
const GENERIC_BACKEND_MESSAGES = new Set(["Insufficient permissions", "Forbidden"]);

function statusFallback(status: number | undefined): string | null {
  switch (status) {
    case 401:
      return "Session expired. Please sign in again.";
    case 403:
      return "You don't have permission to access this section.";
    case 404:
      return "Record not found.";
    case 500:
    case 502:
    case 503:
      return "Something went wrong. Please try again.";
    default:
      return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ error?: string; details?: unknown }>) => {
    if (error.response?.status === 401) {
      onUnauthorized?.();
    }
    const backendMessage = error.response?.data?.error;
    const message =
      (backendMessage && !GENERIC_BACKEND_MESSAGES.has(backendMessage) ? backendMessage : null) ||
      statusFallback(error.response?.status) ||
      backendMessage ||
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
