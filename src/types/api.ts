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
  meta: { page: number; limit: number; total: number; pageCount: number };
}
