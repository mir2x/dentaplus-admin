'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { Banner } from '@/types/api';
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
import { formatDate } from '@/lib/format';
import { BannerEditSheet } from './banner-edit-sheet';

export function BannersView() {
  const [editing, setEditing] = useState<Banner | 'new' | null>(null);

  const { data, isLoading } = useQuery<Banner[]>({
    queryKey: ['banners'],
    queryFn: async () => (await api.get('/admin/banners')).data,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing('new')}>
          <Plus className="size-4" /> New banner
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Target</TableHead>
              <TableHead className="text-center">Priority</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.length ? (
              data.map((b) => (
                <TableRow key={b.id} className="cursor-pointer" onClick={() => setEditing(b)}>
                  <TableCell>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.imageUrl} alt="" className="h-10 w-20 rounded border object-cover" />
                  </TableCell>
                  <TableCell className="font-medium">{b.label || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {b.type === 'PAGE' ? 'Page' : 'Product'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {b.type === 'PAGE' ? (
                      b.path ? (
                        <span className="font-mono text-xs">/{b.path}</span>
                      ) : (
                        <span className="text-muted-foreground">No path</span>
                      )
                    ) : b.product ? (
                      b.product.name
                    ) : (
                      <span className="text-muted-foreground">Unattached</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-sm">{b.priority}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={b.isActive ? 'default' : 'secondary'}>
                      {b.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(b.createdAt)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No banners yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <BannerEditSheet editing={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
