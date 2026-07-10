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

export type ProductBadgeKind =
  | 'BEST_SELLER'
  | 'BULK_SALE'
  | 'SAVE_MORE'
  | 'EOF_SALE'
  | 'NEW'
  | 'CLEARANCE'
  | 'CUSTOM';

export interface ProductBadge {
  id: string;
  label: string;
  kind: ProductBadgeKind;
  color: string | null;
  priority: number;
  isActive: boolean;
  _count?: { products: number };
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  position: number;
}

/** A badge assigned to a specific product, with that product's own badge image (if uploaded). */
export interface ProductBadgeAssignment extends ProductBadge {
  imageUrl: string | null;
}

export interface Banner {
  id: string;
  productId: string | null;
  imageUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  product: { id: string; name: string; slug: string } | null;
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
  images?: ProductImage[];
}

export interface ProductVariantDetail {
  id: string;
  productId?: string;
  sku: string | null;
  name: string | null;
  regularCents: number | null;
  saleCents: number | null;
  stockQuantity: number | null;
  thumbnailUrl?: string | null;
  quickbooksItemId?: string | null;
  quickbooksSyncedAt?: string | null;
  isActive: boolean;
  options: { attributeName: string; value: string }[];
}

export interface Attribute {
  id: string;
  name: string;
  description: string | null;
  values: string[];
}

/** Full product detail returned by GET /admin/products/:id (admin detail page). */
export interface ProductDetail extends Product {
  hasVariant: boolean;
  gtin: string | null;
  description: string | null;
  catalogVisibility: string | null;
  requiresPrescription: boolean;
  allowReviews: boolean;
  taxStatus: string | null;
  taxClass: string | null;
  position: number | null;
  legacyWooId: number | null;
  weightKg: string | null;
  lengthCm: string | null;
  widthCm: string | null;
  heightCm: string | null;
  createdAt: string;
  updatedAt: string;
  inventory:
    | {
        inStock: boolean;
        quantity: number | null;
        lowStockAmount: number | null;
        backordersAllowed: boolean;
        soldIndividually: boolean;
      }
    | null;
  tags: { tag: { id: string; name: string; slug: string } }[];
  attributes: { name: string; values: string[]; visible: boolean; global: boolean }[];
  variants: ProductVariantDetail[];
  wholesaleRules: WholesaleRule[];
  badges: { badge: ProductBadge; imageUrl: string | null }[];
}

/** Raw QuickBooks snapshots (on-demand refresh). */
export interface QboItem {
  Id: string;
  Name?: string;
  Sku?: string;
  Description?: string;
  UnitPrice?: number;
  QtyOnHand?: number;
  Type?: string;
  Active?: boolean;
}

export interface QboCustomer {
  Id: string;
  DisplayName?: string;
  CompanyName?: string;
  Active?: boolean;
  Balance?: number;
  PrimaryEmailAddr?: { Address?: string };
  PrimaryPhone?: { FreeFormNumber?: string };
  BillAddr?: {
    Line1?: string;
    Line2?: string;
    City?: string;
    CountrySubDivisionCode?: string;
    PostalCode?: string;
    Country?: string;
  };
}

export type QboProductSnapshot =
  | { linked: false }
  | { linked: true; connected: true; item: QboItem }
  | { linked: true; connected: false; error: string };

export type QboCustomerSnapshot =
  | { linked: false }
  | { linked: true; connected: true; customer: QboCustomer }
  | { linked: true; connected: false; error: string };

export interface Brand {
  id: string;
  name: string;
  slug: string;
}

export interface CustomerRole {
  id: string;
  key: string;
  name: string;
}

export interface ShippingMethod {
  id: string;
  name: string;
  description: string | null;
  country: string;
  state: string | null;
  postcodes: string | null;
  priority: number;
  rateCents: number;
  freeThresholdCents: number | null;
  isActive: boolean;
  sortOrder: number;
}

export type WholesaleDiscountType = 'FIXED' | 'PERCENTAGE';

export interface WholesaleRule {
  id: string;
  productId: string;
  roleKey: string;
  minQuantity: number;
  discountType: WholesaleDiscountType;
  amountCents: number | null;
  percentageBps: number | null;
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
  profile: {
    company: string | null;
    legacyOrderCount: number | null;
    nickname?: string | null;
    notes?: string | null;
  } | null;
}

export interface CustomerAddress {
  id: string;
  type: 'BILLING' | 'SHIPPING';
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  isDefault: boolean;
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
  soleTraderPartnershipName?: string | null;
  tradingName: string | null;
  ownerName?: string;
  dentistName?: string | null;
  accountManagerName?: string | null;
  orderAuthorizerName?: string | null;
  proprietorNames?: string | null;

  firstName?: string;
  lastName?: string;
  companyName?: string | null;
  address1?: string;
  address2?: string | null;
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
  postalAddress1?: string | null;
  postalAddress2?: string | null;
  postalSuburb?: string | null;
  postalState?: string | null;
  postalPostcode?: string | null;
  email: string;
  phone: string;

  abn: string;
  stateOfRegistration?: string;
  businessEstablishedDuration?: string | null;
  proprietorOwnershipDuration?: string | null;
  businessActivity?: string | null;
  businessType?: string | null;
  businessTypeSpecify?: string | null;

  tradeRef1Company?: string | null;
  tradeRef1ContactPerson?: string | null;
  tradeRef1Phone?: string | null;
  tradeRef2Company?: string | null;
  tradeRef2ContactPerson?: string | null;
  tradeRef2Phone?: string | null;
  tradeRef3Company?: string | null;
  tradeRef3ContactPerson?: string | null;
  tradeRef3Phone?: string | null;

  signatureUrl?: string | null;
  agreementAccepted?: boolean;
  agreementAcceptedAt?: string | null;
  agreementVersion?: string | null;

  applicationDate?: string | null;
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

interface QboRef {
  value?: string;
  name?: string;
}
interface QboAddr {
  Line1?: string;
  Line2?: string;
  City?: string;
  CountrySubDivisionCode?: string;
  PostalCode?: string;
  Country?: string;
}
export interface QboInvoiceLine {
  Id?: string;
  LineNum?: number;
  Description?: string;
  Amount?: number;
  DetailType?: string;
  SalesItemLineDetail?: {
    ItemRef?: QboRef;
    Qty?: number;
    UnitPrice?: number;
    TaxCodeRef?: QboRef;
  };
}
export interface QboInvoice {
  Id: string;
  DocNumber?: string;
  TxnDate?: string;
  DueDate?: string;
  CustomerRef?: QboRef;
  BillEmail?: { Address?: string };
  BillAddr?: QboAddr;
  ShipAddr?: QboAddr;
  SalesTermRef?: QboRef;
  ShipMethodRef?: QboRef;
  ShipDate?: string;
  TrackingNum?: string;
  CustomField?: { Name?: string; StringValue?: string }[];
  Line?: QboInvoiceLine[];
  TxnTaxDetail?: { TotalTax?: number };
  TotalAmt?: number;
  Balance?: number;
  CustomerMemo?: { value?: string };
  PrivateNote?: string;
}

export type QboInvoiceSnapshot =
  | { linked: false }
  | { linked: true; connected: true; invoice: QboInvoice | null; skuByItemRef: Record<string, string> }
  | { linked: true; connected: false; error: string };

export interface AdminInvoiceDetail extends AdminInvoice {
  reference: string | null;
  consignment: string | null;
  subtotal: number;
  tax: number;
  currency: string;
  paidAt: string | null;
  notes: string | null;
  payments: { amount: number; paidAt: string; source: string }[];
  quickbooks: {
    raw: QboInvoice | null;
    syncedAt: string | null;
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
  quickbooksCustomerId: string | null;
  creditAccountStatus: string;
  username: string | null;
  avatarUrl: string | null;
  lastActiveAt: string | null;
  createdAt: string;
  addresses: CustomerAddress[];
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
export type FreeProductScope = 'SAME' | 'SPECIFIC' | 'ANY';

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
  // Trigger products: empty array = a general offer that applies to the whole cart.
  triggerProducts: { id: string; name: string; sku: string | null }[];
  // Trigger variants: fires only for these specific variants.
  triggerVariants: { id: string; name: string | null; sku: string | null }[];
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

export type DatePreset = 'today' | '7d' | '30d' | 'quarter' | 'ytd' | 'last_year';

export interface AnalyticsSummary {
  orderCount: number;
  grossSales: number;
  discounts: number;
  netSales: number;
  tax: number;
  revenue: number;
}

export interface TrendPoint {
  period: string;
  grossSales: number;
  netSales: number;
  revenue: number;
  orderCount: number;
}

export interface TopProduct {
  productId: string | null;
  name: string;
  sku: string | null;
  revenue: number;
  quantitySold: number;
}

export interface TopVariant {
  variantId: string | null;
  name: string;
  sku: string | null;
  revenue: number;
  quantitySold: number;
}

export interface TopCustomer {
  customerId: string;
  email: string | null;
  displayName: string | null;
  company: string | null;
  isWholesale: boolean;
  revenue: number;
  orderCount: number;
}

export interface WholesaleCustomer extends TopCustomer {
  discounts: number;
}

export interface CouponUsage {
  promoCodeId: string;
  code: string;
  type: string | null;
  value: number | null;
  usageCount: number;
  totalDiscount: number;
  revenueWithCoupon: number;
}
