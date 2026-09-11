'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ExternalLink, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { Category, CategoryListItem, PaginatedResponse } from '@/types/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { CategoryEditSheet } from './category-edit-sheet';

const LIMIT = 20;

export function CategoriesView() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<CategoryListItem | 'new' | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Unpaginated top-level + children tree — only used to populate the "Parent category" dropdown.
  const { data: tree } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/admin/categories')).data,
  });

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['categories-browse', search],
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string> = { page: String(pageParam), limit: String(LIMIT) };
      if (search) params.search = search;
      return (await api.get<PaginatedResponse<CategoryListItem>>('/admin/categories/browse', { params }))
        .data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.pages ? lastPage.meta.page + 1 : undefined,
  });

  const categories = data?.pages.flatMap((p) => p.data) ?? [];

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search name or slug…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-xs"
        />
        <Button className="sm:ml-auto" onClick={() => setEditing('new')}>
          <Plus className="size-4" /> New category
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-center">Products</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : categories.length ? (
              categories.map((category) => (
                <TableRow
                  key={category.id}
                  className="cursor-pointer"
                  onClick={() => setEditing(category)}
                >
                  <TableCell className="font-medium">
                    {category.parentName ? (
                      <>
                        <span className="text-muted-foreground">{category.parentName} › </span>
                        {category.name}
                      </>
                    ) : (
                      category.name
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{category.slug}</TableCell>
                  <TableCell className="text-center text-sm">{category.productCount}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/products?categoryId=${category.id}&categoryName=${encodeURIComponent(category.name)}`,
                        )
                      }
                    >
                      <ExternalLink className="size-3.5" /> View products
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No categories found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div ref={sentinelRef} />
      {isFetchingNextPage && (
        <p className="text-center text-xs text-muted-foreground">Loading more…</p>
      )}

      <CategoryEditSheet editing={editing} topLevel={tree ?? []} onClose={() => setEditing(null)} />
    </div>
  );
}
