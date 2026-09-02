import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/auth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./layout/AppLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import SalespersonsList from "./pages/Salespersons/SalespersonsList";
import SalespersonDetail from "./pages/Salespersons/SalespersonDetail";
import ProductsList from "./pages/Products/ProductsList";
import LiveTracking from "./pages/Tracking/LiveTracking";
import RouteHistory from "./pages/Tracking/RouteHistory";
import LeadsList from "./pages/Leads/LeadsList";
import QuotationsList from "./pages/Quotations/QuotationsList";
import OrdersList from "./pages/Orders/OrdersList";
import FollowupsList from "./pages/Followups/FollowupsList";
import CollectionsList from "./pages/Collections/CollectionsList";
import Performance from "./pages/Performance/Performance";
import NotificationsPage from "./pages/Notifications/NotificationsPage";

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) return null;

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/salespersons" element={<SalespersonsList />} />
          <Route path="/salespersons/:id" element={<SalespersonDetail />} />
          <Route path="/products" element={<ProductsList />} />
          <Route path="/tracking" element={<LiveTracking />} />
          <Route path="/routes" element={<RouteHistory />} />
          <Route path="/leads" element={<LeadsList />} />
          <Route path="/quotations" element={<QuotationsList />} />
          <Route path="/orders" element={<OrdersList />} />
          <Route path="/followups" element={<FollowupsList />} />
          <Route path="/collections" element={<CollectionsList />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
