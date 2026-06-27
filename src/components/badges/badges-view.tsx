'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { ProductBadge } from '@/types/api';
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
import { BadgeEditSheet } from './badge-edit-sheet';

export function BadgesView() {
  const [editing, setEditing] = useState<ProductBadge | 'new' | null>(null);

  const { data, isLoading } = useQuery<ProductBadge[]>({
    queryKey: ['badges'],
    queryFn: async () => (await api.get('/admin/badges')).data,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing('new')}>
          <Plus className="size-4" /> New badge
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead className="text-center">Priority</TableHead>
              <TableHead className="text-center">Products</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.length ? (
              data.map((b) => (
                <TableRow key={b.id} className="cursor-pointer" onClick={() => setEditing(b)}>
                  <TableCell className="font-medium">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      style={
                        b.color
                          ? { backgroundColor: b.color, color: '#fff' }
                          : undefined
                      }
                    >
                      {b.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{b.kind}</TableCell>
                  <TableCell className="text-center text-sm">{b.priority}</TableCell>
                  <TableCell className="text-center text-sm">
                    {b._count?.products ?? 0}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={b.isActive ? 'default' : 'secondary'}>
                      {b.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No badges yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <BadgeEditSheet editing={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
