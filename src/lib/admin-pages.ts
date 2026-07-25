import {
  LayoutDashboard,
  FileText,
  ScrollText,
  Landmark,
  CreditCard,
  RefreshCw,
  ShoppingCart,
  Package,
  PackageSearch,
  FolderTree,
  Users,
  Tag,
  Tags,
  Gift,
  Sticker,
  LayoutGrid,
  Image,
  Images,
  Inbox,
  Truck,
  Newspaper,
  HelpCircle,
  Mail,
  Star,
  Settings,
  File,
  BarChart2,
  UserCog,
  type LucideIcon,
} from 'lucide-react';

export interface AdminPageItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface AdminPageGroup {
  label: string | null;
  items: AdminPageItem[];
}

// Single source of truth for admin panel pages: the sidebar renders this
// directly, and the staff permission picker uses it to build its checklist.
// `href` doubles as the permission key stored in a staff user's `allowedPages`.
export const ADMIN_PAGE_GROUPS: AdminPageGroup[] = [
  {
    label: null,
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/analytics', label: 'Analytics', icon: BarChart2 },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/credit-applications', label: 'Credit Applications', icon: CreditCard },
      { href: '/invoices', label: 'Invoices', icon: FileText },
      { href: '/statements', label: 'Statements', icon: ScrollText },
      { href: '/accounts-receivable', label: 'Accounts Receivable', icon: Landmark },
      { href: '/quickbooks', label: 'QuickBooks', icon: RefreshCw },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { href: '/orders', label: 'Orders', icon: ShoppingCart },
      { href: '/back-orders', label: 'Back Orders', icon: PackageSearch },
      { href: '/products', label: 'Products', icon: Package },
      { href: '/categories', label: 'Categories', icon: FolderTree },
      { href: '/collections', label: 'Collections', icon: LayoutGrid },
      { href: '/tags', label: 'Tags', icon: Tags },
      { href: '/customers', label: 'Customers', icon: Users },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/promo-codes', label: 'Promo Codes', icon: Tag },
      { href: '/offers', label: 'Offers', icon: Gift },
      { href: '/badges', label: 'Badges', icon: Sticker },
      { href: '/banners', label: 'Banners', icon: Image },
      { href: '/banner-subscriptions', label: 'Banner Subscriptions', icon: Inbox },
      { href: '/static-banner', label: 'Static Banner', icon: Images },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/custom-pages', label: 'Pages', icon: File },
      { href: '/blog', label: 'Blog', icon: Newspaper },
      { href: '/faq', label: 'FAQ', icon: HelpCircle },
      { href: '/contact-messages', label: 'Contact', icon: Mail },
      { href: '/reviews', label: 'Reviews', icon: Star },
    ],
  },
  {
    label: 'Platform',
    items: [
      { href: '/shipping', label: 'Shipping', icon: Truck },
      { href: '/settings', label: 'Settings', icon: Settings },
      { href: '/staff', label: 'Staff', icon: UserCog },
    ],
  },
];

export const ADMIN_PAGES: AdminPageItem[] = ADMIN_PAGE_GROUPS.flatMap((g) => g.items);

/**
 * Empty `allowedPages` means unrestricted (full admin) access. Otherwise a
 * pathname is allowed if its top-level segment matches one of the allowed
 * hrefs — so `/orders/123` is covered by an allowed `/orders`.
 */
export function hasPageAccess(allowedPages: string[], pathname: string): boolean {
  if (!allowedPages.length) return true;
  return allowedPages.some((href) => pathname === href || pathname.startsWith(`${href}/`));
}
