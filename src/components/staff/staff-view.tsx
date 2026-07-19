'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { StaffMember } from '@/types/api';
import { ADMIN_PAGES } from '@/lib/admin-pages';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';
import { StaffEditSheet } from './staff-edit-sheet';

export function StaffView() {
  const [editing, setEditing] = useState<StaffMember | 'new' | null>(null);

  const { data: staff, isLoading } = useQuery<StaffMember[]>({
    queryKey: ['staff'],
    queryFn: async () => (await api.get('/admin/staff')).data,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Staff log in to this admin panel with the same access as any admin account —
          the pages they can see here are limited to what you assign below.
        </p>
        <Button className="sm:shrink-0" onClick={() => setEditing('new')}>Add staff</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Access</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : staff?.map((s) => (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => setEditing(s)}>
                    <TableCell className="font-medium">{s.displayName ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{s.email}</TableCell>
                    <TableCell>
                      {s.allowedPages.length === 0 ? (
                        <Badge variant="outline">Full access</Badge>
                      ) : (
                        <Badge variant="secondary">
                          {s.allowedPages.length} of {ADMIN_PAGES.length} pages
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(s.createdAt)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={s.isActive ? 'default' : 'secondary'}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      <StaffEditSheet editing={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
