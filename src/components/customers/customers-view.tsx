'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Customer } from '@/types/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';

export function CustomersView() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [wholesaleOnly, setWholesaleOnly] = useState(false);

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ['customers', search],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search) params.q = search;
      const { data } = await api.get('/admin/customers', { params });
      return data;
    },
  });

  const visibleCustomers = wholesaleOnly
    ? customers?.filter((c) => c.roles.some(({ role }) => role.key === 'wholesale_customer'))
    : customers;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search name, email or company…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button
          variant={wholesaleOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setWholesaleOnly((v) => !v)}
        >
          Wholesale only
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : visibleCustomers?.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/customers/${customer.id}`)}
                  >
                    <TableCell className="font-medium">
                      {customer.displayName ??
                        (`${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || '—')}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {customer.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {customer.profile?.company ?? '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {customer.roles.map(({ role }) => (
                          <Badge key={role.key} variant="outline" className="text-xs capitalize">
                            {role.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {customer.registeredAt ? formatDate(customer.registeredAt) : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={customer.isActive ? 'default' : 'secondary'}>
                        {customer.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
