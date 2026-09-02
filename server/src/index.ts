import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import http from "http";
import { Server } from "socket.io";

import authRoutes from "./routes/auth.routes";
import salespersonsRoutes from "./routes/salespersons.routes";
import territoriesRoutes from "./routes/territories.routes";
import productsRoutes from "./routes/products.routes";
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

import { setIO } from "./sockets/io";
import { registerLocationSocket } from "./sockets/locationSocket";

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CLIENT_ORIGIN || "").split(",").map((o) => o.trim()).filter(Boolean);

const io = new Server(server, {
  cors: { origin: allowedOrigins.length ? allowedOrigins : "*", credentials: true },
});
setIO(io);
registerLocationSocket(io);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : "*",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/api/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/salespersons", salespersonsRoutes);
app.use("/api/territories", territoriesRoutes);
app.use("/api/products", productsRoutes);
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
