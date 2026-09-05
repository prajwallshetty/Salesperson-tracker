import axios from "axios";

// Completely separate axios instance from lib/api.ts's tenant `api`: platform auth uses its own
// httpOnly cookie (`sg_platform_token`, set by POST /api/platform/login) which coexists in the
// browser alongside a tenant's `sf_token` without either being able to satisfy the other's auth
// check server-side. A 401 here means the platform session is invalid, so it must redirect to
// /super-admin/login - never /login (that's the tenant login and would be the wrong destination
// for a platform admin, and could bounce a signed-in tenant admin who happens to share a browser).
export const platformApi = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api/platform`,
  withCredentials: true,
});

platformApi.interceptors.response.use(
  (res) => res,
  (error) => {
    if (typeof window !== "undefined" && error?.response?.status === 401) {
      try {
        localStorage.removeItem("sg_platform_admin");
      } catch {
        // ignore (private mode / storage disabled)
      }
      if (window.location.pathname !== "/super-admin/login") {
        window.location.href = "/super-admin/login";
      }
    }
    return Promise.reject(error);
  }
);
