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
import { Mail, User, Clock, MessageSquare, Trash2 } from 'lucide-react';

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
      queryClient.invalidateQueries({ queryKey: ['contact-messages-unread-count'] });
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/contact-messages/${id}`),
    onSuccess: () => {
      toast.success('Message deleted');
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
      queryClient.invalidateQueries({ queryKey: ['contact-messages-unread-count'] });
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
        <SheetContent className="w-full overflow-y-auto sm:w-[40vw] sm:min-w-[26rem] sm:max-w-2xl">
          {selected && (
            <>
              <SheetHeader className="gap-1.5 border-b pb-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Subject</p>
                <div className="flex items-start justify-between gap-3 pr-6">
                  <SheetTitle className="text-lg leading-snug">{selected.subject}</SheetTitle>
                  {!selected.isRead && <Badge className="mt-0.5 shrink-0">New</Badge>}
                </div>
              </SheetHeader>

              <div className="space-y-6 px-6 py-6">
                <section className="space-y-3 rounded-lg border bg-muted/30 p-4">
                  <ContactInfoRow icon={User} label="Name">
                    {selected.firstName} {selected.lastName}
                  </ContactInfoRow>
                  <ContactInfoRow icon={Mail} label="Email">
                    {selected.email ?? '—'}
                  </ContactInfoRow>
                  <ContactInfoRow icon={Clock} label="Received">
                    {formatDateTime(selected.createdAt)}
                  </ContactInfoRow>
                </section>

                <section className="space-y-2">
                  <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <MessageSquare className="size-3.5" /> Message
                  </p>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.message}</p>
                  </div>
                </section>
              </div>

              <div className="mt-auto flex gap-2 border-t p-4">
                {selected.email && (
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => {
                      window.location.href = `mailto:${selected.email}?subject=${encodeURIComponent('Re: ' + selected.subject)}`;
                    }}
                  >
                    <Mail className="size-4" /> Reply by email
                  </Button>
                )}
                <Button
                  variant="destructive"
                  disabled={del.isPending}
                  onClick={() => del.mutate(selected.id)}
                >
                  <Trash2 className="size-4" /> {del.isPending ? 'Deleting…' : 'Delete'}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ContactInfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-medium">{children}</p>
      </div>
    </div>
  );
}
