'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { CreditApplication } from '@/types/api';
import { useAuthStore } from '@/stores/auth';
import { formatDate } from '@/lib/format';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  applicationId: string | null;
  onClose: () => void;
}

export function CreditApplicationDetailSheet({ applicationId, onClose }: Props) {
  const queryClient = useQueryClient();
  const email = useAuthStore((s) => s.user?.email ?? 'admin');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const { data: app, isLoading } = useQuery<CreditApplication>({
    queryKey: ['credit-application', applicationId],
    queryFn: async () => (await api.get(`/admin/credit-applications/${applicationId}`)).data,
    enabled: !!applicationId,
  });

  const review = useMutation({
    mutationFn: (body: { action: 'APPROVE' | 'REJECT'; reviewedBy: string; rejectionReason?: string }) =>
      api.patch(`/admin/credit-applications/${applicationId}/review`, body),
    onSuccess: (_d, vars) => {
      toast.success(vars.action === 'APPROVE' ? 'Application approved' : 'Application rejected');
      queryClient.invalidateQueries({ queryKey: ['credit-applications'] });
      queryClient.invalidateQueries({ queryKey: ['credit-application', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setRejecting(false);
      setReason('');
      onClose();
    },
    onError: () => toast.error('Review failed'),
  });

  return (
    <Sheet open={!!applicationId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {isLoading || !app ? (
          <div className="space-y-3 p-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="mb-4">
              <SheetTitle>{app.registeredBusinessName}</SheetTitle>
              <Badge
                className="w-fit"
                variant={
                  app.status === 'APPROVED'
                    ? 'default'
                    : app.status === 'REJECTED'
                      ? 'destructive'
                      : 'secondary'
                }
              >
                {app.status}
              </Badge>
            </SheetHeader>

            <section className="space-y-1.5 text-sm mb-4">
              <Row label="Trading name" value={app.tradingName ?? '—'} />
              <Row label="ABN" value={app.abn} />
              <Row label="Email" value={app.email} />
              <Row label="Phone" value={app.phone} />
              <Row label="Submitted" value={formatDate(app.submittedAt)} />
              {app.reviewedAt && <Row label="Reviewed" value={formatDate(app.reviewedAt)} />}
              {app.reviewedBy && <Row label="Reviewed by" value={app.reviewedBy} />}
              {app.rejectionReason && <Row label="Reason" value={app.rejectionReason} />}
            </section>

            {app.status === 'PENDING' && (
              <>
                <Separator className="mb-4" />
                {!rejecting ? (
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      disabled={review.isPending}
                      onClick={() => review.mutate({ action: 'APPROVE', reviewedBy: email })}
                    >
                      {review.isPending ? 'Saving…' : 'Approve'}
                    </Button>
                    <Button
                      className="flex-1"
                      variant="outline"
                      onClick={() => setRejecting(true)}
                    >
                      Reject
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Reason for rejection (optional)"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        variant="destructive"
                        disabled={review.isPending}
                        onClick={() =>
                          review.mutate({
                            action: 'REJECT',
                            reviewedBy: email,
                            rejectionReason: reason || undefined,
                          })
                        }
                      >
                        {review.isPending ? 'Saving…' : 'Confirm Reject'}
                      </Button>
                      <Button className="flex-1" variant="outline" onClick={() => setRejecting(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
