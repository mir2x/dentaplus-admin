'use client';

import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

const TITLES: { match: (p: string) => boolean; title: string }[] = [
  { match: (p) => p === '/dashboard', title: 'Dashboard' },
  { match: (p) => p.startsWith('/credit-applications'), title: 'Credit Applications' },
  { match: (p) => p.startsWith('/invoices'), title: 'Invoices' },
  { match: (p) => p.startsWith('/statements'), title: 'Statements' },
  { match: (p) => p.startsWith('/accounts-receivable'), title: 'Accounts Receivable' },
  { match: (p) => p.startsWith('/quickbooks'), title: 'QuickBooks' },
  { match: (p) => p.startsWith('/orders/'), title: 'Order Detail' },
  { match: (p) => p === '/orders', title: 'Orders' },
  { match: (p) => p === '/products', title: 'Products' },
  { match: (p) => p === '/inventory', title: 'Inventory' },
  { match: (p) => p === '/customers', title: 'Customers' },
  { match: (p) => p.startsWith('/promo-codes'), title: 'Promo Codes' },
  { match: (p) => p.startsWith('/offers'), title: 'Offers' },
  { match: (p) => p.startsWith('/badges'), title: 'Badges' },
  { match: (p) => p.startsWith('/blog'), title: 'Blog' },
  { match: (p) => p.startsWith('/faq'), title: 'FAQ' },
  { match: (p) => p.startsWith('/contact-messages'), title: 'Contact Messages' },
  { match: (p) => p.startsWith('/reviews'), title: 'Reviews' },
  { match: (p) => p.startsWith('/shipping'), title: 'Shipping' },
  { match: (p) => p === '/settings', title: 'Settings' },
];

function getTitle(pathname: string): string {
  return TITLES.find(({ match }) => match(pathname))?.title ?? 'Admin';
}

export function AdminHeader() {
  const pathname = usePathname();
  const title = getTitle(pathname);

  return (
    <header className="flex items-center gap-3 border-b px-4 py-3">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      <h1 className="text-sm font-medium">{title}</h1>
    </header>
  );
}
