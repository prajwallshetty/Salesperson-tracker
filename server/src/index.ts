import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import http from "http";
import { Server } from "socket.io";

import authRoutes from "./routes/auth.routes";
import salespersonsRoutes from "./routes/salespersons.routes";
import territoriesRoutes from "./routes/territories.routes";
import productsRoutes from "./routes/products.routes";
import categoriesRoutes from "./routes/categories.routes";
import pricingRoutes from "./routes/pricing.routes";
import customersRoutes from "./routes/customers.routes";
import visitsRoutes from "./routes/visits.routes";
import leadsRoutes from "./routes/leads.routes";
import followupsRoutes from "./routes/followups.routes";
import quotationsRoutes from "./routes/quotations.routes";
import ordersRoutes from "./routes/orders.routes";
import collectionsRoutes from "./routes/collections.routes";
import trackingRoutes from "./routes/tracking.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import performanceRoutes from "./routes/performance.routes";
import notificationsRoutes from "./routes/notifications.routes";
import targetsRoutes from "./routes/targets.routes";
import attendanceRoutes from "./routes/attendance.routes";
import usersRoutes from "./routes/users.routes";
import platformRoutes from "./routes/platform.routes";
import publicRoutes from "./routes/public.routes";
import billingRoutes from "./routes/billing.routes";
import razorpayWebhookRoutes from "./routes/razorpayWebhook.routes";

import { setIO } from "./sockets/io";
import { registerLocationSocket } from "./sockets/locationSocket";
import { redactAccessCode } from "./middleware/redactAccessCode";

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CLIENT_ORIGIN || "").split(",").map((o) => o.trim()).filter(Boolean);
const isProduction = process.env.NODE_ENV === "production";

// Browsers reject `Access-Control-Allow-Origin: *` combined with credentials outright -
// the request silently loses its cookies/Authorization header instead of erroring loudly,
// which is exactly the failure mode that looks like intermittent "insufficient access" or
// randomly-broken login. So CORS must never fall back to a wildcard while credentials are
// enabled: in production, an unset CLIENT_ORIGIN fails CLOSED (reject all origins, which
// surfaces immediately as a visible CORS error) rather than falling back to "*" and
// silently breaking every authenticated request instead. In development, default to the
// two local frontends so this doesn't need configuring for local work.
if (isProduction && allowedOrigins.length === 0) {
  console.error(
    "FATAL: CLIENT_ORIGIN is not set in production. Cookie-based auth requires an explicit, " +
      "non-wildcard CORS origin when credentials are used. Set CLIENT_ORIGIN to a comma-" +
      "separated list of your deployed frontend origins, e.g. " +
      "CLIENT_ORIGIN=https://admin.example.com,https://app.example.com"
  );
}
const corsOrigin = allowedOrigins.length > 0 ? allowedOrigins : isProduction ? [] : ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"];

const io = new Server(server, {
  cors: { origin: corsOrigin, credentials: true },
});
setIO(io);
registerLocationSocket(io);

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

// Mounted before express.json() - this route needs the exact raw request bytes to verify
// Razorpay's webhook signature (see routes/razorpayWebhook.routes.ts's top comment). Every
// other route needs a parsed JSON body, which is why this one line has to come first.
app.use("/api/billing/razorpay", razorpayWebhookRoutes);

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(redactAccessCode);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/api/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use("/api/public", publicRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/salespersons", salespersonsRoutes);
app.use("/api/territories", territoriesRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/pricing", pricingRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/visits", visitsRoutes);
app.use("/api/leads", leadsRoutes);
app.use("/api/followups", followupsRoutes);
app.use("/api/quotations", quotationsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/collections", collectionsRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/performance", performanceRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/targets", targetsRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/platform", platformRoutes);
app.use("/api/billing", billingRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.name === "ZodError") {
    return res.status(400).json({ error: "Validation error", details: err.errors });
  }
  console.error(err);
  res.status(err?.status || 500).json({ error: err?.message || "Internal server error" });
});

const PORT = Number(process.env.PORT) || 4000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
