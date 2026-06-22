'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Customer, Customer360 } from '@/types/api';
import { formatCents, formatDate } from '@/lib/format';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  customer: Customer | null;
  onClose: () => void;
}

export function CustomerDetailSheet({ customer, onClose }: Props) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const { data: detail, isLoading } = useQuery<Customer360>({
    queryKey: ['customer-360', customer?.id],
    queryFn: async () => (await api.get(`/admin/customers/${customer!.id}`)).data,
    enabled: !!customer,
  });

  const toggleActive = useMutation({
    mutationFn: (isActive: boolean) =>
      api.patch(`/admin/customers/${customer!.id}`, { isActive }),
    onSuccess: () => {
      toast.success(`Customer ${customer?.isActive ? 'deactivated' : 'activated'}`);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setConfirming(false);
      onClose();
    },
    onError: () => toast.error('Failed to update customer'),
  });

  const balance = detail?.accountBalance;
  const balanceTotal = balance
    ? balance.bucket0 + balance.bucket30 + balance.bucket60 + balance.bucket90 + balance.bucket120 + balance.bucket120plus
    : 0;

  return (
    <Sheet open={!!customer} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {customer && (
          <>
            <SheetHeader className="mb-4">
              <SheetTitle>
                {customer.displayName ??
                  (`${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || customer.email)}
              </SheetTitle>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <Badge variant={customer.isActive ? 'default' : 'secondary'}>
                  {customer.isActive ? 'Active' : 'Inactive'}
                </Badge>
                {detail?.dentaplusId && (
                  <Badge variant="outline" className="text-xs">{detail.dentaplusId}</Badge>
                )}
                {detail?.creditAccountStatus && detail.creditAccountStatus !== 'NONE' && (
                  <Badge variant="outline" className="text-xs">Credit: {detail.creditAccountStatus}</Badge>
                )}
              </div>
            </SheetHeader>

            <section className="space-y-1 text-sm mb-4 text-muted-foreground">
              <p>{customer.email}</p>
              {customer.phone && <p>{customer.phone}</p>}
              {customer.profile?.company && <p>{customer.profile.company}</p>}
              <p className="text-xs">QuickBooks-synced profile (read-only)</p>
            </section>

            <Separator className="mb-4" />

            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="space-y-5">
                <Section title="Account balance">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Outstanding</span>
                    <span className="font-medium">{formatCents(balanceTotal)}</span>
                  </div>
                  {balance && balanceTotal > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-muted-foreground">
                      <Bucket label="Current" v={balance.bucket0} />
                      <Bucket label="1–30" v={balance.bucket30} />
                      <Bucket label="31–60" v={balance.bucket60} />
                      <Bucket label="61–90" v={balance.bucket90} />
                      <Bucket label="91–120" v={balance.bucket120} />
                      <Bucket label="120+" v={balance.bucket120plus} />
                    </div>
                  )}
                </Section>

                <MiniList
                  title="Recent orders"
                  rows={detail?.orders ?? []}
                  empty="No orders"
                  render={(o) => (
                    <Row key={o.id} left={o.orderNo} mid={o.status} right={formatCents(o.totalCents)} />
                  )}
                />

                <MiniList
                  title="Invoices"
                  rows={detail?.invoices ?? []}
                  empty="No invoices"
                  render={(i) => (
                    <Row
                      key={i.id}
                      left={i.invoiceNo}
                      mid={i.syncStatus ?? i.type}
                      right={`${formatCents(i.outstandingCents)} due`}
                    />
                  )}
                />

                <MiniList
                  title="Statements"
                  rows={detail?.statements ?? []}
                  empty="No statements"
                  render={(s) => (
                    <Row
                      key={s.id}
                      left={s.statementNo}
                      mid={formatDate(s.statementDate)}
                      right={formatCents(s.closingBalance)}
                    />
                  )}
                />
              </div>
            )}

            <Separator className="my-4" />

            <section>
              {!confirming ? (
                <Button
                  variant={customer.isActive ? 'outline' : 'default'}
                  className="w-full"
                  onClick={() => setConfirming(true)}
                >
                  {customer.isActive ? 'Deactivate Account' : 'Activate Account'}
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {customer.isActive
                      ? 'This will prevent the customer from logging in.'
                      : 'This will allow the customer to log in again.'}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      variant={customer.isActive ? 'destructive' : 'default'}
                      disabled={toggleActive.isPending}
                      onClick={() => toggleActive.mutate(!customer.isActive)}
                    >
                      {toggleActive.isPending ? 'Saving…' : 'Confirm'}
                    </Button>
                    <Button className="flex-1" variant="outline" onClick={() => setConfirming(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="text-sm font-medium mb-2">{title}</p>
      {children}
    </section>
  );
}

function MiniList<T>({
  title,
  rows,
  empty,
  render,
}: {
  title: string;
  rows: T[];
  empty: string;
  render: (row: T) => React.ReactNode;
}) {
  return (
    <Section title={title}>
      {rows.length ? (
        <div className="divide-y rounded-md border">{rows.map(render)}</div>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </Section>
  );
}

function Row({ left, mid, right }: { left: string; mid: string; right: string }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
      <span className="font-medium">{left}</span>
      <span className="text-muted-foreground text-xs capitalize">{mid.toLowerCase()}</span>
      <span>{right}</span>
    </div>
  );
}

function Bucket({ label, v }: { label: string; v: number }) {
  return (
    <div>
      <p>{label}</p>
      <p className="text-foreground">{formatCents(v)}</p>
    </div>
  );
}
