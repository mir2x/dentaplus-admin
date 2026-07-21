'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Paperclip, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Order } from '@/types/api';
import { formatCents, formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface Attachment {
  key: string;
  fileName: string;
  mimeType: string;
}

// Standalone record of money staff returned outside the platform — zero
// automation. Recording a refund here never touches order status, invoice,
// or backorder; staff separately set Payment Status = Refunded (and/or
// cancel the order) below if that's warranted. See SYSTEM_MODEL.md "Refund".
export function RefundPanel({ order }: { order: Order }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [fullRefund, setFullRefund] = useState(false);
  const [notes, setNotes] = useState('');
  const [reference, setReference] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refunds = order.refunds ?? [];

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'refunds');
      const { data: uploaded } = await api.post('/admin/upload', form);
      setAttachments((prev) => [
        ...prev,
        { key: uploaded.key, fileName: file.name, mimeType: file.type },
      ]);
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const create = useMutation({
    mutationFn: () =>
      api.post(`/admin/orders/${order.id}/refunds`, {
        amountCents: Math.round(Number(amount) * 100),
        fullRefund,
        notes: notes || undefined,
        reference: reference || undefined,
        attachments: attachments.length ? attachments : undefined,
      }),
    onSuccess: () => {
      toast.success('Refund recorded');
      queryClient.invalidateQueries({ queryKey: ['order', order.id] });
      setOpen(false);
      setAmount('');
      setFullRefund(false);
      setNotes('');
      setReference('');
      setAttachments([]);
    },
    onError: () => toast.error('Failed to record refund'),
  });

  return (
    <section className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Refunds</p>
        {!open && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            Record Refund
          </Button>
        )}
      </div>

      {refunds.length === 0 && !open && (
        <p className="text-sm text-muted-foreground">No refunds recorded.</p>
      )}

      {refunds.length > 0 && (
        <div className="divide-y rounded-md border">
          {refunds.map((r) => (
            <div key={r.id} className="px-3 py-2 space-y-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium">
                  {formatCents(r.amount * 100, r.currency)}
                  {r.fullRefund && <span className="ml-1.5 text-xs text-muted-foreground">(full)</span>}
                </span>
                <span className="text-xs text-muted-foreground">{formatDateTime(r.refundedAt)}</span>
              </div>
              {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
              {r.reference && (
                <p className="text-xs text-muted-foreground font-mono">Ref: {r.reference}</p>
              )}
              {r.recordedBy && (
                <p className="text-xs text-muted-foreground">Recorded by {r.recordedBy}</p>
              )}
              {r.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {r.attachments.map((a) => (
                    <a
                      key={a.id}
                      href={a.url ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Paperclip className="size-3" />
                      {a.fileName ?? 'attachment'}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="space-y-3 rounded-md border p-3">
          <div className="space-y-1.5">
            <Label htmlFor="refund-amount">Amount ({order.currency})</Label>
            <Input
              id="refund-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="refund-full">Full refund</Label>
            <Switch id="refund-full" checked={fullRefund} onCheckedChange={setFullRefund} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="refund-reference">Reference (optional)</Label>
            <Input
              id="refund-reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="eWay/bank reference"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="refund-notes">Notes (optional)</Label>
            <Textarea
              id="refund-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was refunded and why…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Proof (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {attachments.map((a) => (
                <span
                  key={a.key}
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground"
                >
                  <Paperclip className="size-3" />
                  {a.fileName}
                </span>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="size-3.5" />
                {uploading ? 'Uploading…' : 'Attach file'}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={create.isPending}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={!amount || Number(amount) <= 0 || create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? 'Saving…' : 'Save Refund'}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
