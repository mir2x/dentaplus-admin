'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { CreditApplication } from '@/types/api';
import { useAuthStore } from '@/stores/auth';
import { formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

interface Props {
  applicationId: string;
}

export function CreditApplicationDetailView({ applicationId }: Props) {
  const queryClient = useQueryClient();
  const router = useRouter();
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
    },
    onError: () => toast.error('Review failed'),
  });

  if (isLoading || !app) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/credit-applications')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{app.registeredBusinessName}</h1>
        <Badge
          className="ml-auto"
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
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="space-y-6 p-6">
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
          <Separator />
          <Group title="Contact & delivery address">
            <Row label="Contact" value={[app.firstName, app.lastName].filter(Boolean).join(' ') || null} />
            <Row label="Company" value={app.companyName} />
            <Row label="Email" value={app.email} />
            <Row label="Phone" value={app.phone} />
            <Row
              label="Address"
              value={
                [
                  app.deliveryAddress1,
                  app.deliveryAddress2,
                  app.deliverySuburb,
                  app.deliveryState,
                  app.deliveryPostcode,
                  app.country,
                ]
                  .filter(Boolean)
                  .join(', ') || null
              }
            />
          </Group>

          {(app.billingAddress1 || app.billingSuburb) && (
            <>
              <Separator />
              <Group title="Billing address">
                <Row
                  label="Address"
                  value={
                    [
                      app.billingAddress1,
                      app.billingAddress2,
                      app.billingSuburb,
                      app.billingState,
                      app.billingPostcode,
                    ]
                      .filter(Boolean)
                      .join(', ') || null
                  }
                />
              </Group>
            </>
          )}

          <Separator />
          <Group title="Trade references">
            <Row label="Ref 1" value={tradeRef(app.tradeRef1Company, app.tradeRef1ContactPerson, app.tradeRef1Phone)} />
            <Row label="Ref 2" value={tradeRef(app.tradeRef2Company, app.tradeRef2ContactPerson, app.tradeRef2Phone)} />
            <Row label="Ref 3" value={tradeRef(app.tradeRef3Company, app.tradeRef3ContactPerson, app.tradeRef3Phone)} />
          </Group>

          <Separator />
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
              <div className="pt-1 grid grid-cols-3 gap-4">
                <span className="text-muted-foreground text-sm">Signature</span>
                <div className="col-span-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={app.signatureUrl}
                    alt="Applicant signature"
                    className="max-h-32 max-w-full rounded border bg-white p-2"
                  />
                </div>
              </div>
            ) : (
              <Row label="Signature" value={null} />
            )}
          </Group>

          <Separator />
          <Group title="Review">
            <Row label="Submitted" value={formatDate(app.submittedAt)} />
            {app.reviewedAt && <Row label="Reviewed" value={formatDate(app.reviewedAt)} />}
            {app.reviewedBy && <Row label="Reviewed by" value={app.reviewedBy} />}
            {app.user?.dentaplusId && <Row label="DentaPlus ID" value={app.user.dentaplusId} />}
            {app.rejectionReason && <Row label="Rejection reason" value={app.rejectionReason} />}
          </Group>
        </div>

        {app.status === 'PENDING' && (
          <div className="border-t bg-muted/50 p-6 rounded-b-lg">
            {!rejecting ? (
              <div className="flex gap-4">
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
              <div className="space-y-4">
                <Textarea
                  placeholder="Reason for rejection (optional)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div className="flex gap-4">
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
          </div>
        )}
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="space-y-3 text-sm">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="col-span-2 font-medium [overflow-wrap:anywhere]">
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
