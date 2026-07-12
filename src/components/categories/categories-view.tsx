'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { Category } from '@/types/api';
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
import { CategoryEditSheet } from './category-edit-sheet';

export function CategoriesView() {
  const [editing, setEditing] = useState<Category | Category['children'][number] | 'new' | null>(
    null,
  );

  const { data, isLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/admin/categories')).data,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing('new')}>
          <Plus className="size-4" /> New category
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-center">Subcategories</TableHead>
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
              data.flatMap((category) => [
                <TableRow
                  key={category.id}
                  className="cursor-pointer"
                  onClick={() => setEditing(category)}
                >
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{category.slug}</TableCell>
                  <TableCell className="text-center text-sm">
                    {category.children.length}
                  </TableCell>
                </TableRow>,
                ...category.children.map((child) => (
                  <TableRow
                    key={child.id}
                    className="cursor-pointer"
                    onClick={() => setEditing(child)}
                  >
                    <TableCell className="pl-8 text-sm text-muted-foreground">
                      — {child.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{child.slug}</TableCell>
                    <TableCell className="text-center text-sm">—</TableCell>
                  </TableRow>
                )),
              ])
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  No categories yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <CategoryEditSheet
        editing={editing}
        topLevel={data ?? []}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
