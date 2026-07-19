'use client';

import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { PaginatedResponse, TagListItem } from '@/types/api';
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
import { TagEditSheet } from './tag-edit-sheet';

const LIMIT = 20;

export function TagsView() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<TagListItem | 'new' | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['tags-browse', search],
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string> = { page: String(pageParam), limit: String(LIMIT) };
      if (search) params.search = search;
      return (await api.get<PaginatedResponse<TagListItem>>('/admin/tags/browse', { params })).data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.pages ? lastPage.meta.page + 1 : undefined,
  });

  const tags = data?.pages.flatMap((p) => p.data) ?? [];

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
            ) : tags.length ? (
              tags.map((tag) => (
                <TableRow key={tag.id} className="cursor-pointer" onClick={() => setEditing(tag)}>
                  <TableCell className="font-medium">{tag.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{tag.slug}</TableCell>
                  <TableCell className="text-center text-sm">{tag.productCount}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  No tags found
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

      <TagEditSheet editing={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
