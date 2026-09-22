// Two independent axes — see SYSTEM_MODEL.md "The two status axes". Never
// merge these back into one field.
export type OrderChannel = 'DIRECT' | 'CREDIT';
export type OrderFulfillmentStatus =
  | 'PROCESSING'
  | 'READY_TO_SHIP'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';
export type OrderPaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED';

export type ProductType = 'GENERAL' | 'MEDICINE' | 'PRESCRIPTION_ONLY' | 'EQUIPMENT';

export interface Order {
  id: string;
  orderNo: string;
  channel: OrderChannel;
  fulfillmentStatus: OrderFulfillmentStatus;
  paymentStatus: OrderPaymentStatus;
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
  invoices?: OrderInvoiceRef[];
  refunds?: Refund[];
  backOrders?: { id: string; backOrderNo: string }[];
}

export interface RefundAttachment {
  id: string;
  fileName: string | null;
  mimeType: string | null;
  url: string | null;
}

export interface Refund {
  id: string;
  orderId: string;
  fullRefund: boolean;
  amountCents: number;
  currency: string;
  notes: string | null;
  reference: string | null;
  recordedBy: string | null;
  refundedAt: string;
  orderItemIds: string[];
  attachments: RefundAttachment[];
}

export interface OrderInvoiceRef {
  id: string;
  invoiceNo: string;
  type: string;
  totalCents: number;
  outstandingCents: number;
  status: InvoiceStatus;
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

// Pure tracking, never an invoice/payment — see SYSTEM_MODEL.md "Backorder
// (tracking only)". DRAFT is staff's working copy (never shown to the
// customer); PROCESSING freezes auto-rebuild and becomes customer-visible.
export type BackOrderStatus =
  | 'DRAFT'
  | 'PROCESSING'
  | 'PARTIALLY_FULFILLED'
  | 'FULFILLED'
  | 'CANCELLED';

export interface BackOrderItem {
  id: string;
  sku: string | null;
  name: string;
  quantity: number;
  fulfilledQty: number;
}

export interface BackOrder {
  id: string;
  backOrderNo: string;
  status: BackOrderStatus;
  createdAt: string;
  updatedAt: string;
  items: BackOrderItem[];
  orderNo: string;
  customer: { id: string; email: string; displayName: string | null } | null;
}

export interface ProductPrice {
  type: 'REGULAR' | 'SALE';
  amountCents: number;
  currency: string;
}

/** A staff-managed sticker/label attached 1:1 to a category. */
export interface Badge {
  id: string;
  label: string;
  imageUrl: string | null;
  isActive: boolean;
  categoryId: string;
  category?: { id: string; name: string; slug: string };
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  position: number;
}

export type BannerType = 'PAGE' | 'PRODUCT';

export interface Banner {
  id: string;
  label: string;
  type: BannerType;
  productId: string | null;
  path: string | null;
  imageUrl: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  product: { id: string; name: string; slug: string } | null;
}

/** An email captured via a banner's "Subscribe now" form. */
export interface BannerSubscription {
  id: string;
  bannerId: string;
  email: string;
  createdAt: string;
  banner: { id: string; label: string };
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
  brand: string | null;
  supplier?: string | null;
  costCents?: number | null;
  prices: ProductPrice[];
  inventory: { inStock: boolean | null; quantity: number | null; backordersAllowed: boolean } | null;
  categories: { category: { id: string; name: string; slug: string } }[];
  images?: ProductImage[];
  _count?: { variants: number };
}

export interface ProductVariantDetail {
  id: string;
  productId?: string;
  sku: string | null;
  name: string | null;
  regularCents: number | null;
  saleCents: number | null;
  thumbnailUrl?: string | null;
  supplier?: string | null;
  costCents?: number | null;
  isActive: boolean;
  options: { attributeName: string; value: string }[];
  inventory: {
    id: string;
    inStock: boolean | null;
    quantity: number | null;
    lowStockAmount: number | null;
    backordersAllowed: boolean;
    soldIndividually: boolean;
  } | null;
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
  createdAt: string;
  updatedAt: string;
  inventory:
    | {
        inStock: boolean | null;
        quantity: number | null;
        lowStockAmount: number | null;
        backordersAllowed: boolean;
        soldIndividually: boolean;
      }
    | null;
  tags: { tag: { id: string; name: string; slug: string } }[];
  collections: { collection: { id: string; title: string; imageUrl: string } }[];
  attributes: { id: string; productId: string; attributeName: string; value: string }[];
  variants: ProductVariantDetail[];
  wholesaleRules: WholesaleRule[];
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
  rateCents: number;
  freeThresholdCents: number | null;
  isActive: boolean;
  isDefault: boolean;
}

export type WholesaleDiscountType = 'FIXED' | 'PERCENTAGE';

export interface WholesaleRule {
  id: string;
  productId: string | null;
  variantId: string | null;
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
  parentId: string | null;
  children: { id: string; name: string; slug: string; parentId: string | null }[];
}

/** Curated storefront tile — a title + image pointing at a set of products. */
export interface Collection {
  id: string;
  title: string;
  imageUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  _count?: { products: number };
}

export interface CategoryListItem {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  parentName: string | null;
  productCount: number;
}

export interface TagListItem {
  id: string;
  name: string;
  slug: string;
  productCount: number;
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

export interface StaffMember {
  id: string;
  email: string;
  displayName: string | null;
  isActive: boolean;
  allowedPages: string[];
  createdAt: string;
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

// ── Operations: credit / invoicing / statements ────────────────────────────

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
  deliveryAddress1?: string;
  deliveryAddress2?: string | null;
  deliverySuburb?: string;
  deliveryState?: string;
  deliveryPostcode?: string;
  country?: string;
  billingAddress1?: string | null;
  billingAddress2?: string | null;
  billingSuburb?: string | null;
  billingState?: string | null;
  billingPostcode?: string | null;
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

// Staff-driven lifecycle (create -> send -> paid/void). OVERDUE is derived by
// the backend at read time from OPEN + a past due date, never stored as such.
export type InvoiceStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'OVERDUE'
  | 'PARTIAL'
  | 'PAID'
  | 'VOID';

export interface AdminInvoice {
  id: string;
  invoiceNo: string;
  orderId: string | null;
  type: 'INVOICE' | 'CREDIT_NOTE';
  reference: string | null;
  consignment: string | null;
  subtotal: number;
  tax: number;
  total: number;
  outstanding: number;
  amountPaid: number;
  currency: string;
  status: InvoiceStatus;
  hasPdf: boolean;
  dueDate: string | null;
  dateInvoiced: string;
  sentAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  paidAt: string | null;
  notes: string | null;
  customer?: {
    id: string;
    email: string;
    displayName: string | null;
    dentaplusId: string | null;
  };
}

export interface InvoiceLine {
  id: string;
  lineType: string;
  sku: string | null;
  description: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
  unitPriceCents: number;
  amountCents: number;
  taxable: boolean;
}

export type PaymentMethod = 'BANK_TRANSFER' | 'CARD' | 'CASH' | 'CHEQUE' | 'OTHER';

export interface InvoicePayment {
  id: string;
  amount: number;
  amountCents: number;
  paidAt: string;
  method: string | null;
  reference: string | null;
  notes: string | null;
  source: string;
  // Only staff-recorded (MANUAL) entries can be reversed from the admin panel.
  reversible: boolean;
}

export interface AdminInvoiceDetail extends Omit<AdminInvoice, 'customer'> {
  customer: { id: string; email: string; displayName: string | null; dentaplusId: string | null } | null;
  order: { id: string; orderNo: string; channel: OrderChannel } | null;
  // Lines/totals are frozen once a payment exists or the invoice is PAID/VOID.
  locked: boolean;
  payments: InvoicePayment[];
  lines: InvoiceLine[];
  pdfUrl: string | null;
}

export interface InvoiceLineInput {
  sku?: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  // false = GST-free line. Defaults to true.
  taxable?: boolean;
}

export interface CreateInvoiceInput {
  orderId?: string;
  userId: string;
  reference?: string;
  dateInvoiced?: string;
  dueDate?: string;
  consignment?: string;
  lines?: InvoiceLineInput[];
  // Header-only totals, used only when `lines` is omitted.
  subtotalCents?: number;
  taxCents?: number;
  totalCents?: number;
  notes?: string;
}

export interface UpdateInvoiceInput {
  reference?: string | null;
  dateInvoiced?: string;
  dueDate?: string | null;
  consignment?: string | null;
  notes?: string | null;
  lines?: InvoiceLineInput[];
  subtotalCents?: number;
  taxCents?: number;
  totalCents?: number;
}

export interface RecordPaymentInput {
  amountCents: number;
  paidAt?: string;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

/** Pre-filled invoice (lines + totals) for an order — GET .../invoice-draft. Nothing is saved. */
export interface OrderInvoiceDraft {
  orderId: string;
  orderNo: string;
  userId: string;
  customer: { id: string; email: string; displayName: string | null };
  reference: string;
  consignment: string | null;
  dueDate: string;
  lines: InvoiceLineInput[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  existingInvoices: { id: string; invoiceNo: string; status: InvoiceStatus }[];
}

export interface Statement {
  id: string;
  statementNo: string;
  statementDate: string;
  periodFrom: string | null;
  periodTo: string | null;
  openingBalance: number;
  closingBalance: number;
  currency?: string;
  notes?: string | null;
  sentAt: string | null;
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

export interface Customer360 extends Customer {
  dentaplusId: string | null;
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
    fulfillmentStatus: OrderFulfillmentStatus;
    paymentStatus: OrderPaymentStatus;
    totalCents: number;
    orderDate: string | null;
  }[];
  invoices: {
    id: string;
    invoiceNo: string;
    type: string;
    totalCents: number;
    outstandingCents: number;
    status: InvoiceStatus;
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
// SAME: exact item purchased. ANY_VARIANT: customer picks any variant of the
// trigger product. SPECIFIC: admin-curated variant pool (freeVariants).
// Both ANY_VARIANT and SPECIFIC require the trigger product to have variants.
export type FreeProductScope = 'SAME' | 'SPECIFIC' | 'ANY_VARIANT';
// INDIVIDUAL (default): each variant's own quantity must independently clear
// minQuantity. COLLECTIVE: quantities across this offer's trigger variants
// are summed per product toward one shared threshold — only meaningful for
// variant products, and requires freeScope ANY_VARIANT/SPECIFIC (not SAME)
// for FREE_PRODUCT offers.
export type OfferTriggerMode = 'INDIVIDUAL' | 'COLLECTIVE';

export interface Offer {
  id: string;
  name: string;
  description: string | null;
  minQuantity: number;
  triggerMode: OfferTriggerMode;
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
  triggerVariants: { id: string; name: string | null; sku: string | null; productId: string | null }[];
  // SPECIFIC's admin-curated free-variant pool. One entry auto-adds; two or
  // more prompt the customer to choose. Unused for SAME/ANY_VARIANT.
  freeVariants: { id: string; name: string | null; sku: string | null; productId: string }[];
}

// ── Content & support ─────────────────────────────────────────────────────────

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  _count?: { posts: number };
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  featuredImageUrl: string | null;
  thumbnailUrl: string | null;
  tags: string[];
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  author?: { firstName: string | null; lastName: string | null } | null;
  categories: { id: string; name: string; slug: string }[];
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
  newContactMessages: number;
  overdueInvoices: number;
  ordersAwaitingInvoice: number;
  draftInvoices: number;
  inventory: { lowStock: number; outOfStock: number };
  accountsReceivable: { outstanding: number; aging: AgingBuckets };
}

export type DatePreset = 'today' | '7d' | '30d' | 'quarter' | 'ytd' | 'last_year' | 'custom';

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
