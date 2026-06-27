'use client';

import { use, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import {
  AdminInvoiceDetail,
  InvoiceSyncStatus,
  QboInvoice,
  QboInvoiceSnapshot,
} from '@/types/api';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_VARIANT: Record<InvoiceSyncStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'secondary',
  OPEN: 'outline',
  OVERDUE: 'destructive',
  PARTIAL: 'outline',
  PAID: 'default',
  VOID: 'secondary',
};

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<AdminInvoiceDetail>({
    queryKey: ['invoice', id],
    queryFn: async () => (await api.get(`/admin/invoices/${id}`)).data,
  });

  // Live-fetch the full QBO invoice (which also refreshes the cached snapshot),
  // then re-pull the mirror so the page shows the freshest data.
  const { data: snap, isFetching: syncing, refetch } = useQuery<QboInvoiceSnapshot>({
    queryKey: ['invoice-qbo', id],
    queryFn: async () => (await api.get(`/admin/invoices/${id}/quickbooks`)).data,
    enabled: false,
  });

  useEffect(() => {
    refetch().then(() => queryClient.invalidateQueries({ queryKey: ['invoice', id] }));
  }, [id, refetch, queryClient]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        </div>
      </div>
    );
  }
  if (!data) return null;

  const connected = snap?.linked === true && snap.connected === true;
  const liveInvoice = connected ? snap.invoice : null;
  const qbo: QboInvoice | null = liveInvoice ?? data.quickbooks.raw;
  const skuByItemRef = connected ? snap.skuByItemRef : {};
  const lines = (qbo?.Line ?? []).filter((l) => l.DetailType === 'SalesItemLineDetail');
  const amountReceived =
    qbo?.TotalAmt != null && qbo?.Balance != null ? qbo.TotalAmt - qbo.Balance : null;

  async function downloadPdf() {
    const res = await api.get(`/admin/invoices/${id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${data!.invoiceNo}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => router.push('/invoices')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="size-3.5" /> All invoices
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-semibold">Invoice {data.invoiceNo}</h2>
            {data.type === 'CREDIT_NOTE' && <Badge variant="outline">Credit Note</Badge>}
            {data.status && <Badge variant={STATUS_VARIANT[data.status]}>{data.status}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {data.customer?.displayName ?? data.customer?.email ?? '—'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadPdf}>
            <Download className="size-4" /> PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={syncing}
            onClick={() =>
              refetch().then(() => queryClient.invalidateQueries({ queryKey: ['invoice', id] }))
            }
          >
            <RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Refresh from QuickBooks'}
          </Button>
        </div>
      </div>

      {snap?.linked === true && snap.connected === false && (
        <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 p-3">
          Couldn&apos;t reach QuickBooks — showing the last synced snapshot. {snap.error}
        </p>
      )}
      {snap?.linked === false && (
        <p className="text-sm text-muted-foreground rounded-md border p-3">
          This invoice isn&apos;t linked to QuickBooks; showing local data only.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Section title="Details">
            <Row label="Invoice no" value={qbo?.DocNumber ?? data.invoiceNo} />
            <Row label="Customer" value={qbo?.CustomerRef?.name ?? data.customer?.displayName} />
            <Row label="Customer email" value={qbo?.BillEmail?.Address ?? data.customer?.email} />
            <Row label="Terms" value={qbo?.SalesTermRef?.name} />
            <Row label="Invoice date" value={qbo?.TxnDate ? formatDate(qbo.TxnDate) : formatDate(data.dateInvoiced)} />
            <Row label="Due date" value={qbo?.DueDate ? formatDate(qbo.DueDate) : data.dueDate ? formatDate(data.dueDate) : null} />
            <Row label="Ship via" value={qbo?.ShipMethodRef?.name} />
            <Row label="Shipping date" value={qbo?.ShipDate ? formatDate(qbo.ShipDate) : null} />
            <Row label="Tracking no" value={qbo?.TrackingNum} />
            {qbo?.CustomField?.filter((f) => f.StringValue).map((f) => (
              <Row key={f.Name} label={f.Name ?? 'Custom'} value={f.StringValue} />
            ))}
          </Section>

          {(qbo?.BillAddr || qbo?.ShipAddr) && (
            <Section title="Addresses">
              <div className="grid sm:grid-cols-2 gap-3">
                {qbo?.BillAddr && <AddressBlock title="Billing" a={qbo.BillAddr} />}
                {qbo?.ShipAddr && <AddressBlock title="Shipping" a={qbo.ShipAddr} />}
              </div>
            </Section>
          )}

          <Section title="Line items">
            {lines.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-1.5 pr-2 font-medium">#</th>
                      <th className="py-1.5 pr-2 font-medium">Product / SKU</th>
                      <th className="py-1.5 pr-2 font-medium">Description</th>
                      <th className="py-1.5 px-2 font-medium text-right">Qty</th>
                      <th className="py-1.5 px-2 font-medium text-right">Rate</th>
                      <th className="py-1.5 pl-2 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, i) => {
                      const d = l.SalesItemLineDetail;
                      const sku = d?.ItemRef?.value ? skuByItemRef[d.ItemRef.value] : undefined;
                      return (
                        <tr key={l.Id ?? i} className="border-b last:border-0 align-top">
                          <td className="py-2 pr-2 text-muted-foreground">{l.LineNum ?? i + 1}</td>
                          <td className="py-2 pr-2">
                            <div className="font-medium">{d?.ItemRef?.name ?? '—'}</div>
                            {sku && <div className="text-xs text-muted-foreground">{sku}</div>}
                          </td>
                          <td className="py-2 pr-2 text-muted-foreground">{l.Description ?? '—'}</td>
                          <td className="py-2 px-2 text-right">{d?.Qty ?? '—'}</td>
                          <td className="py-2 px-2 text-right">{d?.UnitPrice != null ? formatMoney(d.UnitPrice) : '—'}</td>
                          <td className="py-2 pl-2 text-right">{l.Amount != null ? formatMoney(l.Amount) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {qbo ? 'No line items.' : 'Line items load from QuickBooks…'}
              </p>
            )}
          </Section>

          {(qbo?.CustomerMemo?.value || qbo?.PrivateNote || data.notes) && (
            <Section title="Messages">
              {qbo?.CustomerMemo?.value && <Row label="Message on invoice" value={qbo.CustomerMemo.value} />}
              {qbo?.PrivateNote && <Row label="Statement / private note" value={qbo.PrivateNote} />}
              {data.notes && <Row label="Internal notes" value={data.notes} />}
            </Section>
          )}
        </div>

        <div className="space-y-5">
          <Section title="Totals">
            <Row label="Subtotal" value={formatMoney(data.subtotal)} />
            <Row label="GST" value={qbo?.TxnTaxDetail?.TotalTax != null ? formatMoney(qbo.TxnTaxDetail.TotalTax) : formatMoney(data.tax)} />
            <Row label="Total" value={formatMoney(qbo?.TotalAmt ?? data.total)} />
            <Row label="Amount received" value={formatMoney(amountReceived ?? data.amountPaid)} />
            <Row label="Balance due" value={formatMoney(qbo?.Balance ?? data.outstanding)} bold />
          </Section>

          <Section title="Payments">
            {data.payments.length ? (
              <ul className="divide-y rounded-md border text-sm">
                {data.payments.map((p, i) => (
                  <li key={i} className="flex justify-between px-3 py-2">
                    <span className="text-muted-foreground">{formatDate(p.paidAt)} · {p.source}</span>
                    <span className="font-medium">{formatMoney(p.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-sm text-muted-foreground">No payments recorded</span>
            )}
          </Section>

          <Section title="QuickBooks">
            <Row label="Linked" value={data.payViaQuickbooks ? 'Yes' : 'No'} />
            <Row
              label="Synced"
              value={data.quickbooks.syncedAt ? formatDateTime(data.quickbooks.syncedAt) : 'Never'}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border p-4">
      <p className="text-sm font-medium mb-3">{title}</p>
      {children}
    </section>
  );
}

function Row({ label, value, bold }: { label: string; value: string | null | undefined; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-0.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-right ${bold ? 'font-semibold' : 'font-medium'}`}>{value || '—'}</span>
    </div>
  );
}

function AddressBlock({
  title,
  a,
}: {
  title: string;
  a: { Line1?: string; Line2?: string; City?: string; CountrySubDivisionCode?: string; PostalCode?: string; Country?: string };
}) {
  return (
    <div className="rounded-md border p-3 text-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{title}</p>
      {a.Line1 && <p>{a.Line1}</p>}
      {a.Line2 && <p>{a.Line2}</p>}
      <p className="text-muted-foreground">
        {[a.City, a.CountrySubDivisionCode, a.PostalCode].filter(Boolean).join(', ')}
        {a.Country ? ` ${a.Country}` : ''}
      </p>
    </div>
  );
}
