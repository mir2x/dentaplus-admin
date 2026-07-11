'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { BlogPost, PaginatedResponse } from '@/types/api';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/format';

export function BlogView() {
  const [search, setSearch] = useState('');
  const router = useRouter();

  const { data, isLoading } = useQuery<PaginatedResponse<BlogPost>>({
    queryKey: ['blog', search],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: 100 };
      if (search) params.search = search;
      return (await api.get('/admin/blog/posts', { params })).data;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search title or slug…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button className="ml-auto" onClick={() => router.push('/blog/posts/new')}>
          <Plus className="size-4" /> New post
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.data.length ? (
              data.data.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => router.push(`/blog/posts/${p.id}`)}>
                  <TableCell className="font-medium max-w-72 truncate">{p.title}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{p.slug}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(p.createdAt)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={p.isPublished ? 'default' : 'secondary'}>
                      {p.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No posts
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
