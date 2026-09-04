import axios from "axios";

// Auth is cookie-based (httpOnly `sf_token` set by the server) — every request must
// go out `withCredentials` so the browser attaches it. There is no token in JS to
// read or attach anymore; do not add an Authorization header here.
export const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api`,
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (typeof window !== "undefined" && error?.response?.status === 401) {
      // The cookie is invalid/expired/cleared server-side (e.g. an admin deactivated
      // this account) - drop any cached display info and hard-redirect so no stale
      // client state or rendered page lingers. Skip the redirect on public pages, since an
      // unauthenticated GET /auth/me from any of them is expected to 401 - without this list
      // a public page other than /login (e.g. /signup) would immediately bounce a fresh,
      // never-logged-in visitor straight to /login before they could even see it.
      const PUBLIC_PATHS = ["/login", "/signup"];
      try {
        localStorage.removeItem("sf_user");
      } catch {
        // ignore (private mode / storage disabled)
      }
      if (!PUBLIC_PATHS.includes(window.location.pathname)) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

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

export function apiErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    const backendMessage = data?.error;
    if (backendMessage && !GENERIC_BACKEND_MESSAGES.has(backendMessage)) return backendMessage;
    return statusFallback(err.response?.status) || backendMessage || err.message || fallback;
  }
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}

// Resolves a server-relative asset path (e.g. "/uploads/foo.png") to an absolute URL
// against the API origin. Absolute URLs (http(s)://, blob:, data:) pass through unchanged.
export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^(https?:|blob:|data:)/.test(path)) return path;
  return `${process.env.NEXT_PUBLIC_API_URL}${path}`;
}
