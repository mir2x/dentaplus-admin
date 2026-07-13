'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
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
  Image,
  Images,
  Truck,
  Newspaper,
  HelpCircle,
  Mail,
  Star,
  Settings,
  BarChart2,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';

const navGroups = [
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
      { href: '/static-banner', label: 'Static Banner', icon: Images },
    ],
  },
  {
    label: 'Content',
    items: [
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
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const { data: unreadContactCount } = useQuery({
    queryKey: ['contact-messages-unread-count'],
    queryFn: async () => (await api.get<{ count: number }>('/admin/contact-messages/unread-count')).data.count,
    refetchInterval: 30_000,
  });

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-5">
        <span className="text-lg font-semibold tracking-tight">DentaPlus</span>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {navGroups.map((group, i) => (
          <SidebarGroup key={group.label ?? i}>
            {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarMenu>
              {group.items.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={pathname.startsWith(href)}
                    render={<Link href={href} />}
                  >
                    <Icon className="size-4" />
                    {label}
                  </SidebarMenuButton>
                  {href === '/contact-messages' && !!unreadContactCount && (
                    <SidebarMenuBadge className="bg-primary text-primary-foreground">
                      {unreadContactCount}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="px-4 py-4 border-t">
        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        <Button variant="ghost" size="sm" className="mt-1 w-full justify-start px-0" onClick={handleLogout}>
          Sign out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
