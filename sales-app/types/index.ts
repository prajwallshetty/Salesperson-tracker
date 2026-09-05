// Shared domain types mirroring the backend API contract (see API_CONTRACT.md)

export type Role = "ADMIN" | "SALESPERSON";
export type FieldWorkStatus = "ACTIVE" | "INACTIVE";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string | null;
  salespersonId?: string | null;
  salespersonStatus?: FieldWorkStatus | null;
}

export interface LoginResponse {
  user: AuthUser;
}

export interface Territory {
  id: string;
  name: string;
  description?: string | null;
  _count?: { salespersons: number; customers: number };
}

export interface Salesperson {
  id: string;
  employeeCode: string;
  phone?: string | null;
  territoryId?: string | null;
  territory?: Territory | null;
  managerId?: string | null;
  fieldWorkStatus: FieldWorkStatus;
  fieldWorkStartAt?: string | null;
  isOnline?: boolean;
  lastSeenAt?: string | null;
  lastLat?: number | null;
  lastLng?: number | null;
  todayDistanceKm?: number | null;
  user: { id: string; name: string; email: string; avatarUrl?: string | null };
  _count?: { customers: number; visits: number; orders: number };
}

export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  territoryId?: string | null;
  territory?: Territory | null;
  salespersonId?: string | null;
  notes?: string | null;
  distanceKm?: number;
  createdAt?: string;
  recentVisits?: Visit[];
  recentOrders?: Order[];
  recentCollections?: Collection[];
}

export type VisitStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "MISSED" | "CANCELLED";
export type VisitOutcome =
  | "ORDER_PLACED"
  | "FOLLOW_UP_REQUIRED"
  | "NOT_INTERESTED"
  | "NO_RESPONSE"
  | "PAYMENT_COLLECTED"
  | "OTHER";

export interface Visit {
  id: string;
  customerId: string;
  customer?: Customer;
  salespersonId: string;
  status: VisitStatus;
  plannedAt?: string | null;
  checkInAt?: string | null;
  checkInLat?: number | null;
  checkInLng?: number | null;
  checkInDistanceMeters?: number | null;
  checkInLocationValidated?: boolean | null;
  checkOutAt?: string | null;
  checkOutLat?: number | null;
  checkOutLng?: number | null;
  notes?: string | null;
  outcome?: VisitOutcome | null;
  followUpDate?: string | null;
  photoUrls?: string[];
  createdAt: string;
}

export type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "NEGOTIATION" | "CONVERTED" | "LOST";

export interface Lead {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  source?: string | null;
  notes?: string | null;
  status: LeadStatus;
  salespersonId?: string | null;
  createdAt: string;
}

export type FollowUpStatus = "PENDING" | "COMPLETED" | "OVERDUE" | "CANCELLED";

export interface FollowUp {
  id: string;
  leadId?: string | null;
  lead?: Lead | null;
  customerId?: string | null;
  customer?: Customer | null;
  salespersonId?: string | null;
  dueDate: string;
  notes?: string | null;
  status: FollowUpStatus;
  createdAt: string;
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
  description?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
}

export interface LineItemInput {
  productId: string;
  quantity: number;
  discountPercent?: number;
}

export interface LineItem {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
  discountPercent: number;
  lineTotal: number;
}

export type QuotationStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED";

export interface Quotation {
  id: string;
  number: string;
  customerId: string;
  customer?: Customer;
  salespersonId: string;
  status: QuotationStatus;
  notes?: string | null;
  items: LineItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  convertedOrderId?: string | null;
  createdAt: string;
}

export type OrderStatus = "CONFIRMED" | "DELIVERED" | "CANCELLED";

export interface Order {
  id: string;
  number: string;
  customerId: string;
  customer?: Customer;
  salespersonId: string;
  status: OrderStatus;
  items: LineItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  amountCollected?: number;
  collections?: Collection[];
  createdAt: string;
}

export type CollectionMethod = "CASH" | "CHEQUE" | "UPI" | "BANK_TRANSFER" | "CARD" | "OTHER";

export interface Collection {
  id: string;
  customerId: string;
  customer?: Customer;
  orderId?: string | null;
  salespersonId: string;
  amount: number;
  method?: CollectionMethod | null;
  notes?: string | null;
  createdAt: string;
}

export interface PerformanceSummary {
  todaySales: number;
  todayOrders: number;
  monthlySales: number;
  monthlyOrders: number;
  todayVisits: number;
  pendingFollowUps: number;
  monthlyCollections: number;
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

export interface LeaderboardEntry {
  rank: number;
  salespersonId: string;
  name: string;
  avatarUrl?: string | null;
  sales: number;
  [key: string]: unknown;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

export interface LocationPing {
  lat: number;
  lng: number;
  speed?: number | null;
  accuracy?: number | null;
  heading?: number | null;
  recordedAt?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
