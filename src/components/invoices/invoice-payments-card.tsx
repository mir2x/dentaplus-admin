'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, getApiErrorMessage } from '@/lib/api';
import { AdminInvoiceDetail, PaymentMethod } from '@/types/api';
import { formatDate, formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'CARD', label: 'Card (recorded manually)' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
];

const SOURCE_LABEL: Record<string, string> = {
  MANUAL: 'Recorded by staff',
  EWAY: 'Paid online (card)',
  CREDIT_NOTE: 'Credit note applied',
  QBO: 'QuickBooks (historical)',
};

export function InvoicePaymentsCard({ invoice }: { invoice: AdminInvoiceDetail }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['invoice', invoice.id] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  };

  const record = useMutation({
    mutationFn: () =>
      api.post(`/admin/invoices/${invoice.id}/payments`, {
        amountCents: Math.round(Number(amount) * 100),
        method,
        paidAt: paidAt ? new Date(paidAt).toISOString() : undefined,
        reference: reference || undefined,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Payment recorded');
      invalidate();
      setOpen(false);
      setAmount('');
      setReference('');
      setNotes('');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to record payment')),
  });

  const reverse = useMutation({
    mutationFn: (paymentId: string) =>
      api.delete(`/admin/invoices/${invoice.id}/payments/${paymentId}`),
    onSuccess: () => {
      toast.success('Payment reversed');
      invalidate();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to reverse payment')),
  });

  const canRecord = invoice.status === 'OPEN' || invoice.status === 'PARTIAL' || invoice.status === 'OVERDUE';

  return (
    <section className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Payments</p>
        {!open && canRecord && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            Record payment
          </Button>
        )}
      </div>

      {invoice.payments.length ? (
        <ul className="divide-y rounded-md border text-sm">
          {invoice.payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div>
                <div className="font-medium">{formatMoney(p.amount)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(p.paidAt)} · {SOURCE_LABEL[p.source] ?? p.source}
                  {p.reference && <> · {p.reference}</>}
                </div>
              </div>
              {p.reversible && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={reverse.isPending}
                  onClick={() => reverse.mutate(p.id)}
                >
                  Reverse
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No payments recorded.</p>
      )}

      {open && (
        <div className="space-y-3 rounded-md border p-3">
          <div className="space-y-1.5">
            <Label htmlFor="pay-amount">Amount (max {formatMoney(invoice.outstanding)})</Label>
            <Input
              id="pay-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Method</Label>
            <Select value={method} onValueChange={(v) => setMethod((v as PaymentMethod) ?? 'BANK_TRANSFER')}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-date">Date paid</Label>
            <Input
              id="pay-date"
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-reference">Reference (optional)</Label>
            <Input
              id="pay-reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Bank receipt no."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-notes">Notes (optional)</Label>
            <Textarea
              id="pay-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" disabled={record.isPending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={!amount || Number(amount) <= 0 || record.isPending}
              onClick={() => record.mutate()}
            >
              {record.isPending ? 'Saving…' : 'Save payment'}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
