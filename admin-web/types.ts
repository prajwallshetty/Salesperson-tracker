// Shared API response type definitions for the admin dashboard.

export type Role = "ADMIN" | "SALESPERSON";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  salespersonId: string | null;
  salespersonStatus: string | null;
}

export interface Territory {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count?: { salespersons: number; customers: number };
}

export interface SalespersonUser {
  id?: string;
  name: string;
  email?: string;
  phone?: string | null;
  avatarUrl: string | null;
}

export interface Salesperson {
  id: string;
  userId: string;
  employeeCode: string;
  status: "ACTIVE" | "INACTIVE";
  territoryId: string | null;
  managerId: string | null;
  joinedAt: string;
  fieldWorkStatus: "NOT_STARTED" | "ACTIVE" | "ENDED";
  fieldWorkStartAt: string | null;
  fieldWorkEndAt: string | null;
  lastSeenAt: string | null;
  lastLat: number | null;
  lastLng: number | null;
  lastSpeed: number | null;
  isOnline: boolean;
  todayDistanceKm: number;
  createdAt: string;
  updatedAt: string;
  user: SalespersonUser;
  territory: Territory | null;
  manager: { id: string; user: SalespersonUser } | null;
  _count?: { customers: number; visits?: number; orders?: number };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  territoryId: string | null;
  salespersonId: string | null;
  fromLeadId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  territory?: Territory | null;
  salesperson?: Salesperson | null;
  visits?: Visit[];
  orders?: Order[];
  collections?: Collection[];
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  price: number;
  taxPercent: number;
  discountPercent: number;
  imageUrl: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type VisitOutcome =
  | "ORDER_PLACED"
  | "FOLLOW_UP_REQUIRED"
  | "NOT_INTERESTED"
  | "NO_RESPONSE"
  | "PAYMENT_COLLECTED"
  | "OTHER";

export interface Visit {
  id: string;
  salespersonId: string;
  customerId: string;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  plannedAt: string | null;
  checkInAt: string | null;
  checkInLat: number | null;
  checkInLng: number | null;
  checkOutAt: string | null;
  checkOutLat: number | null;
  checkOutLng: number | null;
  durationMin: number | null;
  notes: string | null;
  photoUrls: string[];
  outcome: VisitOutcome | null;
  followUpDate: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  salesperson?: Salesperson;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  product?: Product;
}

export interface Order {
  id: string;
  number: string;
  salespersonId: string;
  customerId: string;
  status: "CONFIRMED" | "DELIVERED" | "CANCELLED";
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  amountCollected: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  salesperson?: Salesperson;
  items?: OrderItem[];
}

export interface Quotation {
  id: string;
  number?: string;
  salespersonId: string;
  customerId: string;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED";
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  salesperson?: Salesperson;
  items?: OrderItem[];
}

export interface Lead {
  id: string;
  salespersonId: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  source: string | null;
  status: "NEW" | "CONTACTED" | "QUALIFIED" | "NEGOTIATION" | "CONVERTED" | "LOST";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  salesperson?: Salesperson;
}

export interface FollowUp {
  id: string;
  salespersonId: string;
  leadId: string | null;
  customerId: string | null;
  dueDate: string;
  notes: string | null;
  status: "PENDING" | "COMPLETED" | "OVERDUE" | "CANCELLED";
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lead?: Lead | null;
  customer?: Customer | null;
  salesperson?: Salesperson;
}

export type CollectionMethod = "CASH" | "CHEQUE" | "UPI" | "BANK_TRANSFER" | "CARD" | "OTHER";

export interface Collection {
  id: string;
  salespersonId: string;
  customerId: string;
  orderId: string | null;
  amount: number;
  method: CollectionMethod;
  notes: string | null;
  collectedAt: string;
  customer?: Customer;
  order?: Order | null;
  salesperson?: Salesperson;
}

export interface LocationPing {
  id: string;
  salespersonId: string;
  lat: number;
  lng: number;
  speed: number | null;
  accuracy: number | null;
  heading: number | null;
  recordedAt: string;
  createdAt: string;
}

export interface LiveSalesperson {
  id: string;
  name: string;
  avatarUrl: string | null;
  territory: string | null;
  isOnline: boolean;
  fieldWorkStatus: "NOT_STARTED" | "ACTIVE" | "ENDED";
  fieldWorkStartAt: string | null;
  lastLat: number | null;
  lastLng: number | null;
  lastSpeed: number | null;
  lastHeading?: number | null;
  lastAccuracy?: number | null;
  lastSeenAt: string | null;
  todayDistanceKm: number;
  todayVisits: number;
  todaySales: number;
  todayCollections: number;
  currentCustomerId?: string | null;
  currentCustomer: string | null;
  currentVisitId?: string | null;
  currentVisitStatus: string;
}

export interface RouteHistoryResponse {
  date: string;
  fieldWorkSession: FieldWorkSession | null;
  points: LocationPing[];
  excludedPointCount: number;
  stops: Visit[];
  distanceKm: number;
  durationMin: number;
  start: LocationPing | null;
  end: LocationPing | null;
}

export interface FieldWorkSession {
  id: string;
  status: "ACTIVE" | "ENDED";
  startedAt: string;
  endedAt: string | null;
  startLatitude: number;
  startLongitude: number;
  endLatitude: number | null;
  endLongitude: number | null;
  totalDistanceMeters: number;
}

export interface DashboardSummary {
  totalSalespersons: number;
  activeSalespersons: number;
  todaySales: number;
  monthlySales: number;
  todayVisits: number;
  pendingFollowups: number;
  todayOrdersCount: number;
  todayCollections: number;
  targetAmount: number;
  achievement: number;
  achievementPercent: number;
  topPerformers: { salespersonId: string; name: string; avatarUrl: string | null; sales: number }[];
}

export interface TargetRow {
  salespersonId: string;
  name: string;
  avatarUrl: string | null;
  targetAmount: number;
  achieved: number;
  percent: number;
}

export interface TopPerformerRow {
  salespersonId: string;
  name: string;
  avatarUrl: string | null;
  sales: number;
  orders: number;
}

export interface PerformanceLeaderboardRow {
  salespersonId: string;
  name: string;
  avatarUrl: string | null;
  sales: number;
  orders: number;
  visits: number;
  collections: number;
  rank: number;
}

export interface PerformanceDetail {
  dailySales: number;
  weeklySales: number;
  monthlySales: number;
  targetAmount: number;
  achievementPercent: number;
  monthlyOrders: number;
  monthlyVisits: number;
  newCustomers: number;
  followUpsCompleted: number;
  monthlyCollections: number;
  totalDistanceKm: number;
  workingHours: number;
  avgOrderValue: number;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  productCount: number;
}

export interface PriceListEntry {
  id: string;
  productId: string;
  territoryId: string | null;
  customerId: string | null;
  price: number;
  discountPercent: number;
  taxPercent: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  product?: Product | null;
  territory?: Territory | null;
  customer?: Customer | null;
}

export type TargetPeriod = "DAILY" | "WEEKLY" | "MONTHLY";

export interface AdminTargetRow {
  id: string;
  salespersonId: string;
  salespersonName: string;
  territory: string | null;
  period: TargetPeriod;
  periodStart: string;
  periodEnd: string;
  targetAmount: number;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = "PRESENT" | "INCOMPLETE" | "ABSENT";

export interface AttendanceRow {
  id: string;
  salespersonId: string;
  salespersonName: string;
  avatarUrl: string | null;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  checkInLat: number | null;
  checkInLng: number | null;
  checkOutLat: number | null;
  checkOutLng: number | null;
  totalDistanceKm: number | null;
  totalDurationMin: number | null;
  status: AttendanceStatus;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  salesperson: { id: string; employeeCode: string; status: string; territory: Territory | null } | null;
}

export interface TerritoryPerformanceRow {
  salespersonId: string;
  name: string;
  avatarUrl: string | null;
  sales: number;
  orders: number;
  visits: number;
  collections: number;
  targetAmount: number;
  achievementPercent: number;
}

export interface TerritoryPerformance {
  territoryId: string;
  territoryName: string;
  salespersonCount: number;
  customerCount: number;
  period: { gte: string; lte: string };
  totals: {
    sales: number;
    orders: number;
    visits: number;
    collections: number;
    targetAmount: number;
    achievementPercent: number;
  };
  salespersons: TerritoryPerformanceRow[];
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED" | "SUSPENDED";
export type BillingInterval = "MONTHLY" | "YEARLY";

export interface PlanFeatures {
  gpsTracking?: boolean;
  liveTracking?: boolean;
  routeHistory?: boolean;
  targets?: boolean;
  territories?: boolean;
  reports?: boolean;
  quotations?: boolean;
  orders?: boolean;
  collections?: boolean;
}

export interface PublicPlan {
  key: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number | null;
  maxSalespersons: number;
  maxAdmins: number;
  features: PlanFeatures;
}

export interface TenantSubscription {
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  plan: PublicPlan;
  usage: { salespersons: number };
}

// ─── Super Admin (platform) ──────────────────────────────────────────────

export type TenantStatus = "ACTIVE" | "SUSPENDED";

export interface PlatformTenantListItem {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  createdAt: string;
  userCount: number;
  salespersonCount: number;
  subscription: { status: SubscriptionStatus; planName: string; planKey: string; currentPeriodEnd: string | null } | null;
}

export interface PlatformTenantDetail {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
  subscription:
    | (TenantSubscription & { id: string; providerSubscriptionId: string | null; billingProvider: string | null; trialStart: string | null; plan: PublicPlan & { id: string; description: string | null; trialDays: number } })
    | null;
  userCount: number;
  salespersonCount: number;
  customerCount: number;
  razorpayCustomerId: string | null;
  lastPaymentEvent: { action: string; at: string } | null;
}

export interface PlatformBillingAuditLogItem {
  id: string;
  tenantId: string | null;
  actorType: "PLATFORM_ADMIN" | "TENANT_ADMIN" | "SYSTEM";
  actorId: string | null;
  action: string;
  previousState: unknown;
  newState: unknown;
  providerEventId: string | null;
  createdAt: string;
}

export interface PlatformDashboardStats {
  tenants: { total: number; active: number; suspended: number; newLast30d: number };
  subscriptions: { trialing: number; active: number; pastDue: number; cancelled: number; expired: number; suspended: number };
  salespersons: { total: number };
  revenue: { mrr: number; arr: number; currency: string; note: string };
  failedPaymentsLast30d: number;
}

export interface PlatformSubscriptionListItem {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantStatus: TenantStatus;
  planKey: string;
  planName: string;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  providerSubscriptionId: string | null;
  salespersonCount: number;
  maxSalespersons: number;
  createdAt: string;
}

export interface PlatformPaymentItem {
  billingEventId: string;
  eventType: string;
  razorpayPaymentId: string;
  razorpaySubscriptionId: string | null;
  amount: number | null;
  currency: string;
  status: string;
  tenantId: string | null;
  tenantName: string | null;
  createdAt: string;
}

export interface PlatformBillingEventItem {
  id: string;
  provider: string;
  eventId: string;
  eventType: string;
  processed: boolean;
  processedAt: string | null;
  createdAt: string;
  tenantId: string | null;
}

export interface PlatformAnalytics {
  revenue: { mrr: number; arr: number; currency: string };
  revenueByMonth: { month: string; amount: number }[];
  revenueByMonthNote: string;
  tenantGrowthByMonth: { month: string; count: number }[];
  subscriptionsByPlan: { planKey: string; planName: string; count: number }[];
  subscriptionsByStatus: { status: SubscriptionStatus; count: number }[];
  newTenantsLast30d: number;
  cancellationsLast30d: number;
}

export interface PlatformPlan {
  id: string;
  key: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  annualPrice: number | null;
  maxSalespersons: number;
  maxAdmins: number;
  features: PlanFeatures;
  trialDays: number;
  isActive: boolean;
  razorpayMonthlyPlanId: string | null;
  razorpayYearlyPlanId: string | null;
  createdAt: string;
  updatedAt: string;
}
