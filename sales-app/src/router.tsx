import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { Layout } from "@/components/Layout";

import { LoginPage } from "@/pages/auth/LoginPage";
import { HomePage } from "@/pages/home/HomePage";
import { CustomersPage } from "@/pages/customers/CustomersPage";
import { NearbyCustomersPage } from "@/pages/customers/NearbyCustomersPage";
import { CustomerDetailPage } from "@/pages/customers/CustomerDetailPage";
import { VisitDetailPage } from "@/pages/visits/VisitDetailPage";
import { LeadsPage } from "@/pages/leads/LeadsPage";
import { FollowUpsPage } from "@/pages/followups/FollowUpsPage";
import { OrdersPage } from "@/pages/orders/OrdersPage";
import { OrderDetailPage } from "@/pages/orders/OrderDetailPage";
import { NewOrderPage } from "@/pages/orders/NewOrderPage";
import { QuotationsPage } from "@/pages/quotations/QuotationsPage";
import { QuotationDetailPage } from "@/pages/quotations/QuotationDetailPage";
import { NewQuotationPage } from "@/pages/quotations/NewQuotationPage";
import { NewCollectionPage } from "@/pages/collections/NewCollectionPage";
import { PerformancePage } from "@/pages/performance/PerformancePage";
import { NotificationsPage } from "@/pages/notifications/NotificationsPage";
import { MorePage } from "@/pages/more/MorePage";
import { ProfilePage } from "@/pages/more/ProfilePage";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, token } = useAuthStore();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.role !== "SALESPERSON") return <Navigate to="/login" replace />;
  return children;
}

export function AppRouter() {
  const { user, token } = useAuthStore();
  const isAuthed = !!token && !!user && user.role === "SALESPERSON";

  return (
    <Routes>
      <Route path="/login" element={isAuthed ? <Navigate to="/home" replace /> : <LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/home" element={<HomePage />} />

        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/nearby" element={<NearbyCustomersPage />} />
        <Route path="/customers/:id" element={<CustomerDetailPage />} />

        <Route path="/visits/:id" element={<VisitDetailPage />} />

        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/followups" element={<FollowUpsPage />} />

        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/new" element={<NewOrderPage />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />

        <Route path="/quotations" element={<QuotationsPage />} />
        <Route path="/quotations/new" element={<NewQuotationPage />} />
        <Route path="/quotations/:id" element={<QuotationDetailPage />} />

        <Route path="/collections/new" element={<NewCollectionPage />} />

        <Route path="/performance" element={<PerformancePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />

        <Route path="/more" element={<MorePage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to={isAuthed ? "/home" : "/login"} replace />} />
    </Routes>
  );
}
