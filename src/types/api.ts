export type OrderStatus =
  | 'DRAFT'
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PROCESSING'
  | 'READY_TO_SHIP'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'FAILED'
  | 'ON_HOLD';

export type ProductType = 'GENERAL' | 'MEDICINE' | 'PRESCRIPTION_ONLY' | 'EQUIPMENT';

export interface Order {
  id: string;
  orderNo: string;
  status: OrderStatus;
  currency: string;
  customerEmail: string | null;
  orderDate: string | null;
  totalCents: number;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  discountCents: number;
  customerNote: string | null;
  customer: { id: string; email: string; displayName: string | null } | null;
  items: OrderItem[];
  addresses: OrderAddress[];
  payment: OrderPayment | null;
  shipping: OrderShipping | null;
  notes: OrderNote[];
  quickbooksSyncPending?: boolean;
  invoices?: OrderInvoiceRef[];
}

export interface OrderInvoiceRef {
  id: string;
  invoiceNo: string;
  type: string;
  totalCents: number;
  outstandingCents: number;
  syncStatus: InvoiceSyncStatus | null;
  quickbooksInvoiceId: string | null;
}

export interface OrderItem {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  subtotalCents: number;
  totalCents: number;
  taxCents: number;
}

export interface OrderAddress {
  type: 'BILLING' | 'SHIPPING';
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
}

export interface OrderPayment {
  method: string | null;
  methodTitle: string | null;
  transactionId: string | null;
}

export interface OrderShipping {
  methodTitle: string | null;
  totalCents: number;
}

export interface OrderNote {
  id: string;
  content: string;
  notedAt: string;
  addedBy: string | null;
  isCustomerNote: boolean;
}

export interface ProductPrice {
  type: 'REGULAR' | 'SALE';
  amountCents: number;
  currency: string;
}

export interface Product {
  id: string;
  sku: string | null;
  name: string;
  slug: string;
  type: ProductType;
  published: boolean;
  featured: boolean;
  shortDescription: string | null;
  quickbooksItemId?: string | null;
  brand: { id: string; name: string; slug: string } | null;
  prices: ProductPrice[];
  inventory: { inStock: boolean; quantity: number | null } | null;
  categories: { category: { id: string; name: string; slug: string } }[];
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  children: { id: string; name: string; slug: string }[];
}

export interface Customer {
  id: string;
  email: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  isActive: boolean;
  registeredAt: string | null;
  roles: { role: { key: string; name: string } }[];
  profile: { company: string | null; legacyOrderCount: number | null } | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; pages: number };
}

// ── Operations: credit / invoicing / statements / QuickBooks ──────────────────

export type CreditApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CreditApplication {
  id: string;
  userId: string;
  status: CreditApplicationStatus;
  registeredBusinessName: string;
  tradingName: string | null;
  abn: string;
  email: string;
  phone: string;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    dentaplusId: string | null;
  };
}

export type InvoiceSyncStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'OVERDUE'
  | 'PARTIAL'
  | 'PAID'
  | 'VOID';

export interface AdminInvoice {
  id: string;
  invoiceNo: string;
  type: 'INVOICE' | 'CREDIT_NOTE';
  total: number;
  outstanding: number;
  amountPaid: number;
  status: InvoiceSyncStatus | null;
  payViaQuickbooks: boolean;
  dueDate: string | null;
  dateInvoiced: string;
  customer?: {
    id: string;
    email: string;
    displayName: string | null;
    dentaplusId: string | null;
  };
}

export interface Statement {
  id: string;
  statementNo: string;
  statementDate: string;
  periodFrom: string | null;
  periodTo: string | null;
  openingBalance: number;
  closingBalance: number;
}

export interface AgingBuckets {
  bucket0: number;
  bucket30: number;
  bucket60: number;
  bucket90: number;
  bucket120: number;
  bucket120plus: number;
}

export interface ArReport {
  totals: AgingBuckets & { total: number };
  customers: (AgingBuckets & {
    total: number;
    customer: { id: string; email: string; displayName: string | null; dentaplusId: string | null };
  })[];
}

export interface QuickbooksStatus {
  configured: boolean;
  connected: boolean;
  environment: string;
  realmId: string | null;
  accessExpiresAt: string | null;
  refreshExpiresAt: string | null;
}

export interface Customer360 extends Customer {
  dentaplusId: string | null;
  creditAccountStatus: string;
  accountBalance: (AgingBuckets & { id: string }) | null;
  creditAccountApplications: {
    id: string;
    status: CreditApplicationStatus;
    registeredBusinessName: string;
    submittedAt: string;
  }[];
  orders: {
    id: string;
    orderNo: string;
    status: OrderStatus;
    totalCents: number;
    orderDate: string | null;
  }[];
  invoices: {
    id: string;
    invoiceNo: string;
    type: string;
    totalCents: number;
    outstandingCents: number;
    syncStatus: InvoiceSyncStatus | null;
    dueDate: string | null;
    dateInvoiced: string;
  }[];
  statements: {
    id: string;
    statementNo: string;
    statementDate: string;
    closingBalance: number;
  }[];
}

export type DiscountType = 'FIXED' | 'PERCENTAGE';

export interface PromoCode {
  id: string;
  code: string;
  type: DiscountType;
  value: number; // cents when FIXED, percent when PERCENTAGE
  minOrder: number | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
}

export type OfferRewardType = 'FIXED_DISCOUNT' | 'PERCENTAGE_DISCOUNT' | 'FREE_PRODUCT';
export type FreeProductScope = 'SAME' | 'SPECIFIC';

export interface Offer {
  id: string;
  name: string;
  description: string | null;
  minQuantity: number;
  rewardType: OfferRewardType;
  discountAmountCents: number | null;
  discountBps: number | null;
  freeQty: number | null;
  freeScope: FreeProductScope | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  product: { id: string; name: string } | null;
  freeProduct: { id: string; name: string } | null;
}

// ── Content & support ─────────────────────────────────────────────────────────

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  featuredImageUrl: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  author?: { firstName: string | null; lastName: string | null } | null;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ContactMessage {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AdminReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  createdAt: string;
  product: { id: string; name: string } | null;
  user: { id: string; email: string; displayName: string | null } | null;
}

export interface DashboardSummary {
  ordersToday: number;
  ordersMtd: number;
  grossSalesMtd: number;
  newCustomersMtd: number;
  pendingCreditApplications: number;
  overdueInvoices: number;
  pendingQboPushes: number;
  inventory: { lowStock: number; outOfStock: number };
  accountsReceivable: { outstanding: number; aging: AgingBuckets };
}
