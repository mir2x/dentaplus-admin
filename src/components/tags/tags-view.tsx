'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { Tag } from '@/types/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TagEditSheet } from './tag-edit-sheet';

export function TagsView() {
  const [editing, setEditing] = useState<Tag | 'new' | null>(null);

  const { data, isLoading } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: async () => (await api.get('/admin/tags')).data,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing('new')}>
          <Plus className="size-4" /> New tag
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-center">Products</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 3 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.length ? (
              data.map((tag) => (
                <TableRow key={tag.id} className="cursor-pointer" onClick={() => setEditing(tag)}>
                  <TableCell className="font-medium">{tag.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{tag.slug}</TableCell>
                  <TableCell className="text-center text-sm">{tag._count?.products ?? 0}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  No tags yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <TagEditSheet editing={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
