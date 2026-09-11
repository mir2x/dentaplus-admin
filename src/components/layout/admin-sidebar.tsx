'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ADMIN_PAGE_GROUPS, hasPageAccess } from '@/lib/admin-pages';
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

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const allowedPages = user?.allowedPages ?? [];
  const navGroups = ADMIN_PAGE_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => hasPageAccess(allowedPages, item.href)),
  })).filter((group) => group.items.length > 0);

  const { data: unreadContactCount } = useQuery({
    queryKey: ['contact-messages-unread-count'],
    queryFn: async () => (await api.get<{ count: number }>('/admin/contact-messages/unread-count')).data.count,
    refetchInterval: 30_000,
  });
  const { data: ordersNewCount } = useQuery({
    queryKey: ['orders-new-count'],
    queryFn: async () => (await api.get<{ count: number }>('/admin/orders/new-count')).data.count,
    refetchInterval: 30_000,
  });
  const { data: creditApplicationsNewCount } = useQuery({
    queryKey: ['credit-applications-new-count'],
    queryFn: async () =>
      (await api.get<{ count: number }>('/admin/credit-applications/new-count')).data.count,
    refetchInterval: 30_000,
  });

  // href -> sidebar badge count. Zero/undefined renders no badge.
  const badgeCounts: Record<string, number | undefined> = {
    '/contact-messages': unreadContactCount,
    '/orders': ordersNewCount,
    '/credit-applications': creditApplicationsNewCount,
  };

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
              {group.items.map(({ href, label, icon: Icon }) => {
                const badgeCount = badgeCounts[href];
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      isActive={pathname.startsWith(href)}
                      render={<Link href={href} />}
                    >
                      <Icon className="size-4" />
                      {label}
                    </SidebarMenuButton>
                    {!!badgeCount && (
                      <SidebarMenuBadge className="bg-primary text-primary-foreground">
                        {badgeCount}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="px-4 py-4 border-t">
        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 w-full justify-start rounded-md px-2 hover:bg-destructive/10 hover:text-destructive"
          onClick={handleLogout}
        >
          Sign out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
