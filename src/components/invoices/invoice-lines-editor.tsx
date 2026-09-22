'use client';

import { useId } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { InvoiceLineInput } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { formatMoney } from '@/lib/format';

/** Local editable copy of a line — strings while typing, parsed on save. */
export interface EditableLine {
  key: string;
  sku: string;
  description: string;
  quantity: string;
  unitPrice: string; // dollars, e.g. "11.00"
  taxable: boolean;
}

export function emptyLine(): EditableLine {
  return {
    key: crypto.randomUUID(),
    sku: '',
    description: '',
    quantity: '1',
    unitPrice: '',
    taxable: true,
  };
}

export function linesFromInputs(lines: InvoiceLineInput[]): EditableLine[] {
  if (lines.length === 0) return [emptyLine()];
  return lines.map((l) => ({
    key: crypto.randomUUID(),
    sku: l.sku ?? '',
    description: l.description,
    quantity: String(l.quantity),
    unitPrice: (l.unitPriceCents / 100).toFixed(2),
    taxable: l.taxable !== false,
  }));
}

/** Drops blank rows and converts to the wire shape. Throws nothing — validation happens in the parent. */
export function linesToInputs(lines: EditableLine[]): InvoiceLineInput[] {
  return lines
    .filter((l) => l.description.trim() && Number(l.quantity) > 0)
    .map((l) => ({
      sku: l.sku.trim() || undefined,
      description: l.description.trim(),
      quantity: Math.round(Number(l.quantity)),
      unitPriceCents: Math.round(Number(l.unitPrice || 0) * 100),
      taxable: l.taxable,
    }));
}

/** Client-side preview only — the server recomputes and returns the authoritative totals on save. */
export function previewTotals(lines: EditableLine[], gstDivisor: number) {
  let totalCents = 0;
  let taxableCents = 0;
  for (const l of linesToInputs(lines)) {
    const amount = l.unitPriceCents * l.quantity;
    totalCents += amount;
    if (l.taxable !== false) taxableCents += amount;
  }
  const taxCents = Math.round(taxableCents / gstDivisor);
  return { subtotalCents: totalCents - taxCents, taxCents, totalCents };
}

export function InvoiceLinesEditor({
  lines,
  onChange,
  disabled,
  gstDivisor,
}: {
  lines: EditableLine[];
  onChange: (lines: EditableLine[]) => void;
  disabled?: boolean;
  gstDivisor: number;
}) {
  const idBase = useId();

  function update(key: string, patch: Partial<EditableLine>) {
    onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }
  function remove(key: string) {
    const next = lines.filter((l) => l.key !== key);
    onChange(next.length ? next : [emptyLine()]);
  }

  const totals = previewTotals(lines, gstDivisor);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="py-2 px-2 font-medium">SKU</th>
              <th className="py-2 px-2 font-medium">Description</th>
              <th className="py-2 px-2 font-medium text-right w-20">Qty</th>
              <th className="py-2 px-2 font-medium text-right w-28">Unit price</th>
              <th className="py-2 px-2 font-medium text-center w-20">GST</th>
              <th className="py-2 px-2 font-medium text-right w-28">Amount</th>
              <th className="w-9" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const amountCents = Math.round(Number(l.unitPrice || 0) * 100) * Math.round(Number(l.quantity || 0));
              return (
                <tr key={l.key} className="border-b last:border-0 align-top">
                  <td className="p-1.5">
                    <Input
                      value={l.sku}
                      disabled={disabled}
                      onChange={(e) => update(l.key, { sku: e.target.value })}
                      placeholder="Optional"
                      className="h-8"
                    />
                  </td>
                  <td className="p-1.5">
                    <Input
                      value={l.description}
                      disabled={disabled}
                      onChange={(e) => update(l.key, { description: e.target.value })}
                      placeholder="Item description"
                      className="h-8"
                    />
                  </td>
                  <td className="p-1.5">
                    <Input
                      type="number"
                      min="1"
                      value={l.quantity}
                      disabled={disabled}
                      onChange={(e) => update(l.key, { quantity: e.target.value })}
                      className="h-8 text-right"
                    />
                  </td>
                  <td className="p-1.5">
                    <Input
                      type="number"
                      step="0.01"
                      value={l.unitPrice}
                      disabled={disabled}
                      onChange={(e) => update(l.key, { unitPrice: e.target.value })}
                      placeholder="0.00"
                      className="h-8 text-right"
                    />
                  </td>
                  <td className="p-1.5 text-center">
                    <Switch
                      id={`${idBase}-tax-${l.key}`}
                      checked={l.taxable}
                      disabled={disabled}
                      onCheckedChange={(v) => update(l.key, { taxable: v })}
                    />
                  </td>
                  <td className="p-1.5 text-right font-medium">
                    {Number.isFinite(amountCents) ? formatMoney(amountCents / 100) : '—'}
                  </td>
                  <td className="p-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={disabled}
                      onClick={() => remove(l.key)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => onChange([...lines, emptyLine()])}
      >
        <Plus className="size-3.5" /> Add line
      </Button>

      <div className="flex justify-end">
        <div className="w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatMoney(totals.subtotalCents / 100)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>GST</span>
            <span>{formatMoney(totals.taxCents / 100)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-1">
            <span>Total</span>
            <span>{formatMoney(totals.totalCents / 100)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
