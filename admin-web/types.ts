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
  lastSeenAt: string | null;
  todayDistanceKm: number;
  todayVisits: number;
  todaySales: number;
  todayCollections: number;
  currentCustomer: string | null;
  currentVisitStatus: string;
}

export interface RouteHistoryResponse {
  date: string;
  points: LocationPing[];
  stops: Visit[];
  distanceKm: number;
  durationMin: number;
  start: LocationPing | null;
  end: LocationPing | null;
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

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}
