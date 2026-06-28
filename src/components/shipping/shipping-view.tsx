'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { ShippingMethod } from '@/types/api';
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
import { formatCents } from '@/lib/format';
import { ShippingEditSheet } from './shipping-edit-sheet';

export function ShippingView() {
  const [editing, setEditing] = useState<ShippingMethod | 'new' | null>(null);

  const { data, isLoading } = useQuery<ShippingMethod[]>({
    queryKey: ['shipping-methods'],
    queryFn: async () => (await api.get('/admin/shipping-methods')).data,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing('new')}>
          <Plus className="size-4" /> New method
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Covers</TableHead>
              <TableHead className="text-center">Priority</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Free over</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.length ? (
              data.map((m) => (
                <TableRow key={m.id} className="cursor-pointer" onClick={() => setEditing(m)}>
                  <TableCell className="font-medium">
                    {m.name}
                    {m.description && (
                      <span className="block text-xs text-muted-foreground">{m.description}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[18rem] truncate">
                    {[m.state, m.postcodes].filter(Boolean).join(' · ') || 'All Australia'}
                  </TableCell>
                  <TableCell className="text-center text-sm">{m.priority}</TableCell>
                  <TableCell className="text-right">{formatCents(m.rateCents)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {m.freeThresholdCents != null ? formatCents(m.freeThresholdCents) : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={m.isActive ? 'default' : 'secondary'}>
                      {m.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No shipping zones
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ShippingEditSheet editing={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
