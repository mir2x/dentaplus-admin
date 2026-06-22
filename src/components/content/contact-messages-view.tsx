'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { ContactMessage, PaginatedResponse } from '@/types/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';

export function ContactMessagesView() {
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selected, setSelected] = useState<ContactMessage | null>(null);

  const { data, isLoading } = useQuery<PaginatedResponse<ContactMessage>>({
    queryKey: ['contact-messages', unreadOnly],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: 100 };
      if (unreadOnly) params.unreadOnly = 'true';
      return (await api.get('/admin/contact-messages', { params })).data;
    },
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/contact-messages/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contact-messages'] }),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/contact-messages/${id}`),
    onSuccess: () => {
      toast.success('Message deleted');
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
      setSelected(null);
    },
    onError: () => toast.error('Delete failed'),
  });

  const open = (m: ContactMessage) => {
    setSelected(m);
    if (!m.isRead) markRead.mutate(m.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Switch id="unread" checked={unreadOnly} onCheckedChange={setUnreadOnly} />
        <Label htmlFor="unread">Unread only</Label>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Received</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.data.length ? (
              data.data.map((m) => (
                <TableRow
                  key={m.id}
                  className={`cursor-pointer ${m.isRead ? '' : 'font-medium'}`}
                  onClick={() => open(m)}
                >
                  <TableCell>
                    {m.firstName} {m.lastName}
                    {m.email && <div className="text-xs text-muted-foreground font-normal">{m.email}</div>}
                  </TableCell>
                  <TableCell className="max-w-sm truncate">{m.subject}</TableCell>
                  <TableCell className="text-muted-foreground text-sm font-normal">
                    {formatDateTime(m.createdAt)}
                  </TableCell>
                  <TableCell className="text-center">
                    {!m.isRead && <Badge>New</Badge>}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No messages
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle>{selected.subject}</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {selected.firstName} {selected.lastName}
                  {selected.email && ` · ${selected.email}`}
                </p>
                <p className="text-xs text-muted-foreground">{formatDateTime(selected.createdAt)}</p>
              </SheetHeader>
              <p className="text-sm whitespace-pre-wrap">{selected.message}</p>
              <div className="mt-6 flex gap-2">
                {selected.email && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.location.href = `mailto:${selected.email}?subject=${encodeURIComponent('Re: ' + selected.subject)}`;
                    }}
                  >
                    Reply by email
                  </Button>
                )}
                <Button
                  variant="destructive"
                  disabled={del.isPending}
                  onClick={() => del.mutate(selected.id)}
                >
                  Delete
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
