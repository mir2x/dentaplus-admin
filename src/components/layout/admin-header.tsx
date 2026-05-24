'use client';

import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

function getTitle(pathname: string): string {
  if (pathname === '/orders') return 'Orders';
  if (pathname.startsWith('/orders/')) return 'Order Detail';
  if (pathname === '/products') return 'Products';
  if (pathname === '/customers') return 'Customers';
  return 'Admin';
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
