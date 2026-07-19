'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { BackOrder, BackOrderItemDecision } from '@/types/api';
import { formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  backOrderId: string;
}

const REVIEW_STATUS_VARIANT = {
  DRAFT: 'outline',
  PENDING: 'secondary',
  PROCESSING: 'default',
  DECLINED: 'destructive',
} as const;

export function BackOrderDetailView({ backOrderId }: Props) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [decisions, setDecisions] = useState<Record<string, BackOrderItemDecision>>({});
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');

  const { data: bo, isLoading } = useQuery<BackOrder>({
    queryKey: ['back-order', backOrderId],
    queryFn: async () => (await api.get(`/admin/backorders/${backOrderId}`)).data,
    enabled: !!backOrderId,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['back-orders'] });
    queryClient.invalidateQueries({ queryKey: ['back-order', backOrderId] });
  }

  const sendConfirmation = useMutation({
    mutationFn: async (finalDecisions: { itemId: string; decision: BackOrderItemDecision }[]) => {
      if (finalDecisions.length > 0) {
        await api.patch(`/admin/backorders/${backOrderId}/decisions`, {
          decisions: finalDecisions,
        });
      }
      return api.post(`/admin/backorders/${backOrderId}/send-confirmation`);
    },
    onSuccess: () => {
      toast.success('Customer notified — awaiting their reply');
      invalidate();
      setDecisions({});
    },
    onError: () => toast.error('Failed to send confirmation'),
  });

  const confirm = useMutation({
    mutationFn: () => api.post(`/admin/backorders/${backOrderId}/confirm`),
    onSuccess: () => {
      toast.success('Marked as confirmed — fulfillment can begin');
      invalidate();
    },
    onError: () => toast.error('Failed to confirm'),
  });

  const decline = useMutation({
    mutationFn: (declineReason?: string) =>
      api.post(`/admin/backorders/${backOrderId}/decline`, { reason: declineReason }),
    onSuccess: () => {
      toast.success('Back order declined');
      invalidate();
      setDeclining(false);
      setReason('');
    },
    onError: () => toast.error('Failed to decline'),
  });

  if (isLoading || !bo) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const effectiveDecision = (itemId: string, current: BackOrderItemDecision) =>
    decisions[itemId] ?? current;
  const allDecided = bo.items.every(
    (i) => effectiveDecision(i.id, i.decision) !== 'PENDING_REVIEW',
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/back-orders')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{bo.backOrderNo}</h1>
        <Badge className="ml-auto" variant={REVIEW_STATUS_VARIANT[bo.reviewStatus]}>
          {bo.reviewStatus}
        </Badge>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="space-y-6 p-6">
          <section>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Order
            </p>
            <div className="space-y-3 text-sm">
              <Row label="Order" value={`#${bo.orderNo}`} />
              <Row
                label="Customer"
                value={bo.customer?.displayName ?? bo.customer?.email ?? null}
              />
              <Row label="Created" value={formatDate(bo.createdAt)} />
              {bo.status && <Row label="Fulfillment" value={bo.status} />}
            </div>
          </section>

          <Separator />

          <section>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Items
            </p>
            <div className="space-y-3">
              {bo.items.map((item) => {
                const decision = effectiveDecision(item.id, item.decision);
                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-md border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">
                        {item.quantity}× {item.name}
                      </p>
                      {item.sku && <p className="text-muted-foreground text-xs">SKU: {item.sku}</p>}
                      {item.fulfilledQty > 0 && (
                        <p className="text-muted-foreground text-xs">
                          Shipped: {item.fulfilledQty}/{item.quantity}
                        </p>
                      )}
                    </div>
                    {bo.reviewStatus === 'DRAFT' ? (
                      <div className="flex shrink-0 gap-2">
                        <Button
                          size="sm"
                          variant={decision === 'APPROVED' ? 'default' : 'outline'}
                          onClick={() =>
                            setDecisions((d) => ({ ...d, [item.id]: 'APPROVED' }))
                          }
                        >
                          Deliver later
                        </Button>
                        <Button
                          size="sm"
                          variant={decision === 'DECLINED' ? 'destructive' : 'outline'}
                          onClick={() =>
                            setDecisions((d) => ({ ...d, [item.id]: 'DECLINED' }))
                          }
                        >
                          Can&apos;t deliver
                        </Button>
                      </div>
                    ) : (
                      <Badge
                        variant={
                          decision === 'APPROVED'
                            ? 'default'
                            : decision === 'DECLINED'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {decision}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {bo.reviewStatus === 'DRAFT' && (
          <div className="border-t bg-muted/50 p-6 rounded-b-lg">
            <p className="mb-3 text-sm text-muted-foreground">
              Mark every item, then notify the customer about the ones you can still deliver.
            </p>
            <Button
              className="w-full"
              disabled={!allDecided || sendConfirmation.isPending}
              onClick={() =>
                sendConfirmation.mutate(
                  bo.items.map((i) => ({
                    itemId: i.id,
                    decision: effectiveDecision(i.id, i.decision),
                  })),
                )
              }
            >
              {sendConfirmation.isPending ? 'Sending…' : 'Send Confirmation to Customer'}
            </Button>
          </div>
        )}

        {bo.reviewStatus === 'PENDING' && (
          <div className="border-t bg-muted/50 p-6 rounded-b-lg">
            {!declining ? (
              <div className="flex gap-4">
                <Button
                  className="flex-1"
                  disabled={confirm.isPending}
                  onClick={() => confirm.mutate()}
                >
                  {confirm.isPending ? 'Saving…' : 'Customer Confirmed'}
                </Button>
                <Button className="flex-1" variant="outline" onClick={() => setDeclining(true)}>
                  Customer Declined
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Textarea
                  placeholder="Reason (optional)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div className="flex gap-4">
                  <Button
                    className="flex-1"
                    variant="destructive"
                    disabled={decline.isPending}
                    onClick={() => decline.mutate(reason || undefined)}
                  >
                    {decline.isPending ? 'Saving…' : 'Confirm Decline'}
                  </Button>
                  <Button className="flex-1" variant="outline" onClick={() => setDeclining(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="col-span-2 font-medium [overflow-wrap:anywhere]">{value || '—'}</span>
    </div>
  );
}
