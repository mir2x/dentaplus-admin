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
      <SheetContent className="w-full overflow-y-auto p-0 sm:w-[44rem] sm:max-w-[calc(100vw-2rem)]">
        {isLoading || !app ? (
          <div className="space-y-3 p-6 pr-14">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="px-6 pb-2 pt-6 pr-14">
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

            <div className="space-y-5 px-6 pb-6">
              <Group title="Business">
                <Row label="Registered name" value={app.registeredBusinessName} />
                <Row label="Trading name" value={app.tradingName} />
                <Row label="Sole trader / partnership" value={app.soleTraderPartnershipName} />
                <Row label="Owner" value={app.ownerName} />
                <Row label="Dentist" value={app.dentistName} />
                <Row label="Account manager" value={app.accountManagerName} />
                <Row label="Order authorizer" value={app.orderAuthorizerName} />
                <Row label="Proprietor names" value={app.proprietorNames} />
                <Row label="ABN" value={app.abn} />
                <Row label="State of registration" value={app.stateOfRegistration} />
                <Row label="Business established" value={app.businessEstablishedDuration} />
                <Row label="Ownership duration" value={app.proprietorOwnershipDuration} />
                <Row label="Business activity" value={app.businessActivity} />
                <Row
                  label="Business type"
                  value={
                    [app.businessType, app.businessTypeSpecify].filter(Boolean).join(' — ') || null
                  }
                />
              </Group>

              <Group title="Contact & delivery address">
                <Row label="Contact" value={[app.firstName, app.lastName].filter(Boolean).join(' ') || null} />
                <Row label="Company" value={app.companyName} />
                <Row label="Email" value={app.email} />
                <Row label="Phone" value={app.phone} />
                <Row
                  label="Address"
                  value={
                    [app.address1, app.address2, app.suburb, app.state, app.postcode, app.country]
                      .filter(Boolean)
                      .join(', ') || null
                  }
                />
              </Group>

              {(app.postalAddress1 || app.postalSuburb) && (
                <Group title="Postal address">
                  <Row
                    label="Address"
                    value={
                      [
                        app.postalAddress1,
                        app.postalAddress2,
                        app.postalSuburb,
                        app.postalState,
                        app.postalPostcode,
                      ]
                        .filter(Boolean)
                        .join(', ') || null
                    }
                  />
                </Group>
              )}

              <Group title="Trade references">
                <Row label="Ref 1" value={tradeRef(app.tradeRef1Company, app.tradeRef1ContactPerson, app.tradeRef1Phone)} />
                <Row label="Ref 2" value={tradeRef(app.tradeRef2Company, app.tradeRef2ContactPerson, app.tradeRef2Phone)} />
                <Row label="Ref 3" value={tradeRef(app.tradeRef3Company, app.tradeRef3ContactPerson, app.tradeRef3Phone)} />
              </Group>

              <Group title="Agreement & signature">
                <Row
                  label="Agreement accepted"
                  value={
                    app.agreementAccepted
                      ? `Yes${app.agreementAcceptedAt ? ` (${formatDate(app.agreementAcceptedAt)})` : ''}`
                      : 'No'
                  }
                />
                {app.applicationDate && <Row label="Date" value={formatDate(app.applicationDate)} />}
                {app.signatureUrl ? (
                  <div className="pt-1">
                    <span className="text-muted-foreground text-sm">Signature</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={app.signatureUrl}
                      alt="Applicant signature"
                      className="mt-1 max-h-32 max-w-full rounded border bg-white p-2"
                    />
                  </div>
                ) : (
                  <Row label="Signature" value={null} />
                )}
              </Group>

              <Group title="Review">
                <Row label="Submitted" value={formatDate(app.submittedAt)} />
                {app.reviewedAt && <Row label="Reviewed" value={formatDate(app.reviewedAt)} />}
                {app.reviewedBy && <Row label="Reviewed by" value={app.reviewedBy} />}
                {app.rejectionReason && <Row label="Rejection reason" value={app.rejectionReason} />}
              </Group>
            </div>

            {app.status === 'PENDING' && (
              <>
                <Separator className="mb-4" />
                {!rejecting ? (
                  <div className="flex gap-2 px-6 pb-6">
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
                  <div className="space-y-2 px-6 pb-6">
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

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="space-y-2 text-sm">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid grid-cols-[minmax(9rem,14rem)_minmax(0,1fr)] gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right font-medium [overflow-wrap:anywhere]">
        {value || '—'}
      </span>
    </div>
  );
}

function tradeRef(
  company?: string | null,
  contact?: string | null,
  phone?: string | null,
): string | null {
  const parts = [company, contact, phone].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}
