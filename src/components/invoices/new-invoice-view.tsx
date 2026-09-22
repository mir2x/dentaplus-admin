'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { AdminInvoiceDetail, CreateInvoiceInput, OrderInvoiceDraft } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CustomerPicker, PickedCustomer } from '@/components/invoices/customer-picker';
import { EditableLine, InvoiceLinesEditor, emptyLine, linesFromInputs, linesToInputs } from '@/components/invoices/invoice-lines-editor';
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge';

interface Settings {
  gstDivisor: number;
}

export function NewInvoiceView() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const { data: draft, isLoading: draftLoading } = useQuery<OrderInvoiceDraft>({
    queryKey: ['invoice-draft', orderId],
    queryFn: async () => (await api.get(`/admin/orders/${orderId}/invoice-draft`)).data,
    enabled: !!orderId,
  });
  const { data: settings } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/admin/settings')).data,
  });

  // Gate on the draft loading (when coming from an order) so the form below
  // always mounts with its final initial values already known — no effect
  // needed to pre-fill it once the draft arrives later.
  if (orderId && draftLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return <InvoiceCreateForm orderId={orderId} draft={draft} gstDivisor={settings?.gstDivisor ?? 11} />;
}

function InvoiceCreateForm({
  orderId,
  draft,
  gstDivisor,
}: {
  orderId: string | null;
  draft: OrderInvoiceDraft | undefined;
  gstDivisor: number;
}) {
  const router = useRouter();

  const [type, setType] = useState<'INVOICE' | 'CREDIT_NOTE'>('INVOICE');
  const [customer, setCustomer] = useState<PickedCustomer | null>(
    draft ? { id: draft.customer.id, email: draft.customer.email, displayName: draft.customer.displayName } : null,
  );
  const [reference, setReference] = useState(draft?.reference ?? '');
  const [dueDate, setDueDate] = useState(draft ? draft.dueDate.slice(0, 10) : '');
  const [consignment, setConsignment] = useState(draft?.consignment ?? '');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<EditableLine[]>(() =>
    draft ? linesFromInputs(draft.lines) : [emptyLine()],
  );

  const create = useMutation({
    mutationFn: () => {
      if (!customer) throw new Error('Select a customer first');
      const body: CreateInvoiceInput = {
        orderId: orderId ?? undefined,
        userId: customer.id,
        reference: reference || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        consignment: consignment || undefined,
        notes: notes || undefined,
        lines: linesToInputs(lines),
      };
      return api.post<AdminInvoiceDetail>(
        type === 'CREDIT_NOTE' ? '/admin/credit-notes' : '/admin/invoices',
        body,
      );
    },
    onSuccess: (res) => {
      toast.success(type === 'CREDIT_NOTE' ? 'Credit note created' : 'Invoice created');
      router.push(`/invoices/${res.data.id}`);
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to create')),
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="size-3.5" /> Back
        </button>
        <h2 className="text-xl font-semibold">New {type === 'CREDIT_NOTE' ? 'credit note' : 'invoice'}</h2>
        {draft && <p className="text-sm text-muted-foreground">From order {draft.orderNo}</p>}
      </div>

      {draft && draft.existingInvoices.length > 0 && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm space-y-1.5">
          <p className="font-medium">This order already has an invoice</p>
          {draft.existingInvoices.map((inv) => (
            <div key={inv.id} className="flex items-center gap-2">
              <a href={`/invoices/${inv.id}`} className="hover:underline">{inv.invoiceNo}</a>
              <InvoiceStatusBadge status={inv.status} className="text-xs" />
            </div>
          ))}
        </div>
      )}

      <section className="rounded-lg border p-4 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType((v as 'INVOICE' | 'CREDIT_NOTE') ?? 'INVOICE')}
              disabled={!!orderId}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INVOICE">Invoice</SelectItem>
                <SelectItem value="CREDIT_NOTE">Credit note</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <CustomerPicker value={customer} onChange={setCustomer} disabled={!!orderId} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="reference">Reference</Label>
            <Input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          {type === 'INVOICE' && (
            <div className="space-y-1.5">
              <Label htmlFor="due-date">Due date</Label>
              <Input id="due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="consignment">Consignment</Label>
            <Input id="consignment" value={consignment} onChange={(e) => setConsignment(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Internal notes</Label>
          <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </section>

      <section className="rounded-lg border p-4 space-y-3">
        <p className="text-sm font-medium">Line items</p>
        <InvoiceLinesEditor lines={lines} onChange={setLines} gstDivisor={gstDivisor} />
      </section>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()} disabled={create.isPending}>
          Cancel
        </Button>
        <Button
          disabled={!customer || linesToInputs(lines).length === 0 || create.isPending}
          onClick={() => create.mutate()}
        >
          {create.isPending ? 'Creating…' : `Create ${type === 'CREDIT_NOTE' ? 'credit note' : 'invoice'}`}
        </Button>
      </div>
    </div>
  );
}
