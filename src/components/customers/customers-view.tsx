'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Customer, PaginatedResponse } from '@/types/api';
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
import { PaginationControls } from '@/components/ui/pagination-controls';
import { formatDate } from '@/lib/format';
import { LoginAsButton } from './login-as-button';

const LIMIT = 25;

export function CustomersView() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [wholesaleOnly, setWholesaleOnly] = useState(false);
  const [page, setPage] = useState(1);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  const { data: result, isLoading } = useQuery<PaginatedResponse<Customer>>({
    queryKey: ['customers', search, page],
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), limit: String(LIMIT) };
      if (search) params.q = search;
      return (await api.get('/admin/customers', { params })).data;
    },
  });

  const visibleCustomers = wholesaleOnly
    ? result?.data.filter((c) => c.roles.some(({ role }) => role.key === 'wholesale_customer'))
    : result?.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search name, email or company…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full sm:max-w-xs"
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
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: LIMIT }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
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
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <LoginAsButton customerId={customer.id} />
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
        {result && (
          <div className="border-t px-3">
            <PaginationControls
              page={result.meta.page}
              pages={result.meta.pages}
              total={result.meta.total}
              limit={result.meta.limit}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
