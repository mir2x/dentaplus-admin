'use client';

import { use, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Ban, Save, Send } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { AdminInvoiceDetail, UpdateInvoiceInput } from '@/types/api';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge';
import { InvoicePdfCard } from '@/components/invoices/invoice-pdf-card';
import { InvoicePaymentsCard } from '@/components/invoices/invoice-payments-card';
import {
  EditableLine,
  InvoiceLinesEditor,
  linesFromInputs,
  linesToInputs,
} from '@/components/invoices/invoice-lines-editor';

interface Settings {
  gstDivisor: number;
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data, isLoading } = useQuery<AdminInvoiceDetail>({
    queryKey: ['invoice', id],
    queryFn: async () => (await api.get(`/admin/invoices/${id}`)).data,
  });
  const { data: settings } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/admin/settings')).data,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        </div>
      </div>
    );
  }
  if (!data) return null;

  // Keyed by invoice id: a background refetch (e.g. after Save/Send/a
  // payment) reuses this instance and keeps in-progress local edits, the way
  // ProductEditForm does — only navigating to a different invoice remounts it.
  return <InvoiceEditor key={data.id} invoice={data} gstDivisor={settings?.gstDivisor ?? 11} />;
}

function InvoiceEditor({ invoice, gstDivisor }: { invoice: AdminInvoiceDetail; gstDivisor: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = invoice.id;

  const [reference, setReference] = useState(invoice.reference ?? '');
  const [dueDate, setDueDate] = useState(invoice.dueDate ? invoice.dueDate.slice(0, 10) : '');
  const [consignment, setConsignment] = useState(invoice.consignment ?? '');
  const [notes, setNotes] = useState(invoice.notes ?? '');
  const [lines, setLines] = useState<EditableLine[]>(() =>
    linesFromInputs(
      invoice.lines.map((l) => ({
        sku: l.sku ?? undefined,
        description: l.description ?? '',
        quantity: l.quantity,
        unitPriceCents: l.unitPriceCents,
        taxable: l.taxable,
      })),
    ),
  );
  const [dirty, setDirty] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  };

  const save = useMutation({
    mutationFn: () => {
      const body: UpdateInvoiceInput = {
        reference: reference || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        consignment: consignment || undefined,
        notes: notes || undefined,
      };
      if (!invoice.locked) body.lines = linesToInputs(lines);
      return api.patch(`/admin/invoices/${id}`, body);
    },
    onSuccess: () => {
      toast.success('Invoice saved');
      setDirty(false);
      invalidate();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to save invoice')),
  });

  const send = useMutation({
    mutationFn: () => api.post(`/admin/invoices/${id}/send`, {}),
    onSuccess: () => {
      toast.success('Invoice sent to customer');
      invalidate();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to send invoice')),
  });

  const [voiding, setVoiding] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const voidInvoice = useMutation({
    mutationFn: () => api.post(`/admin/invoices/${id}/void`, { reason: voidReason || undefined }),
    onSuccess: () => {
      toast.success('Invoice voided');
      setVoiding(false);
      invalidate();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to void invoice')),
  });

  const canSend = invoice.status === 'DRAFT';
  const canVoid = invoice.status !== 'VOID' && invoice.payments.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => router.push('/invoices')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="size-3.5" /> All invoices
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-semibold">
              {invoice.type === 'CREDIT_NOTE' ? 'Credit note' : 'Invoice'} {invoice.invoiceNo}
            </h2>
            {invoice.type === 'CREDIT_NOTE' && <Badge variant="outline">Credit Note</Badge>}
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {invoice.customer?.displayName ?? invoice.customer?.email ?? '—'}
            {invoice.order && (
              <>
                {' · '}
                <a href={`/orders/${invoice.order.id}`} className="hover:underline">
                  Order {invoice.order.orderNo}
                </a>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
            <Save className="size-4" /> {save.isPending ? 'Saving…' : 'Save'}
          </Button>
          {canSend && (
            <Button size="sm" disabled={send.isPending} onClick={() => send.mutate()}>
              <Send className="size-4" /> {send.isPending ? 'Sending…' : 'Send to customer'}
            </Button>
          )}
          {canVoid && (
            <Button variant="destructive" size="sm" onClick={() => setVoiding((v) => !v)}>
              <Ban className="size-4" /> Void
            </Button>
          )}
        </div>
      </div>

      {invoice.status === 'VOID' && (
        <p className="text-sm rounded-md border border-destructive/30 bg-destructive/5 p-3 text-destructive">
          Voided {invoice.voidedAt ? formatDateTime(invoice.voidedAt) : ''}
          {invoice.voidReason && <> — {invoice.voidReason}</>}
        </p>
      )}
      {invoice.locked && invoice.status !== 'VOID' && (
        <p className="text-sm rounded-md border p-3 text-muted-foreground">
          Lines and totals are locked because a payment has been recorded. Reverse the payment to edit them.
        </p>
      )}

      {voiding && (
        <div className="space-y-3 rounded-md border border-destructive/30 p-3">
          <Label htmlFor="void-reason">Reason (optional)</Label>
          <Textarea
            id="void-reason"
            rows={2}
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            placeholder="Why is this invoice being voided?"
          />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setVoiding(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={voidInvoice.isPending}
              onClick={() => voidInvoice.mutate()}
            >
              {voidInvoice.isPending ? 'Voiding…' : 'Confirm void'}
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <section className="rounded-lg border p-4 space-y-4">
            <p className="text-sm font-medium">Details</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="reference">Reference</Label>
                <Input
                  id="reference"
                  value={reference}
                  onChange={(e) => {
                    setReference(e.target.value);
                    setDirty(true);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="due-date">Due date</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    setDirty(true);
                  }}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="consignment">Consignment</Label>
                <Input
                  id="consignment"
                  value={consignment}
                  onChange={(e) => {
                    setConsignment(e.target.value);
                    setDirty(true);
                  }}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Internal notes</Label>
              <Textarea
                id="notes"
                rows={2}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setDirty(true);
                }}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground pt-1 border-t">
              <span>Invoice date: {formatDate(invoice.dateInvoiced)}</span>
              {invoice.sentAt && <span>Sent: {formatDateTime(invoice.sentAt)}</span>}
            </div>
          </section>

          <section className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-medium">Line items</p>
            <InvoiceLinesEditor
              lines={lines}
              onChange={(next) => {
                setLines(next);
                setDirty(true);
              }}
              disabled={invoice.locked}
              gstDivisor={gstDivisor}
            />
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-lg border p-4 space-y-1">
            <p className="text-sm font-medium mb-2">Totals</p>
            <Row label="Subtotal" value={formatMoney(invoice.subtotal)} />
            <Row label="GST" value={formatMoney(invoice.tax)} />
            <Row label="Total" value={formatMoney(invoice.total)} />
            <Row label="Amount received" value={formatMoney(invoice.amountPaid)} />
            <Row label="Balance due" value={formatMoney(invoice.outstanding)} bold />
          </section>

          <InvoicePaymentsCard invoice={invoice} />
          <InvoicePdfCard invoice={invoice} />
        </div>
      </div>

      {dirty && !invoice.locked && (
        <div className="sticky bottom-4 flex justify-end">
          <div className="rounded-lg border bg-popover px-4 py-2 shadow-md flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Unsaved changes</span>
            <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-0.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-right ${bold ? 'font-semibold' : 'font-medium'}`}>{value}</span>
    </div>
  );
}
