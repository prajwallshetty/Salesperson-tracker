import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, token, logout } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== "ADMIN") {
    logout();
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
