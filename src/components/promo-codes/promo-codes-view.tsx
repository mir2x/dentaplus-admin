'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { PaginatedResponse, PromoCode } from '@/types/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCents, formatDate } from '@/lib/format';
import { PromoCodeEditSheet } from './promo-code-edit-sheet';

export function PromoCodesView() {
  const [editing, setEditing] = useState<PromoCode | 'new' | null>(null);

  const { data, isLoading } = useQuery<PaginatedResponse<PromoCode>>({
    queryKey: ['promo-codes'],
    queryFn: async () => (await api.get('/admin/promo-codes', { params: { limit: 100 } })).data,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing('new')}>
          <Plus className="size-4" /> New promo code
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Min order</TableHead>
              <TableHead>Uses</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.data.length ? (
              data.data.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => setEditing(p)}>
                  <TableCell className="font-medium">{p.code}</TableCell>
                  <TableCell>
                    {p.type === 'FIXED' ? formatCents(p.value) : `${p.value}%`}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {p.minOrder != null ? formatCents(Math.round(p.minOrder * 100)) : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {p.usedCount}
                    {p.maxUses != null ? ` / ${p.maxUses}` : ''}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {p.expiresAt ? formatDate(p.expiresAt) : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={p.isActive ? 'default' : 'secondary'}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No promo codes
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <PromoCodeEditSheet editing={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
