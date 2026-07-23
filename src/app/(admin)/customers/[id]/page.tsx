'use client';

import { use, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, X } from 'lucide-react';
import { api } from '@/lib/api';
import {
  Customer360,
  CustomerAddress,
  QboCustomerSnapshot,
} from '@/types/api';
import { formatCents, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { QuickbooksRefreshCard } from '@/components/shared/quickbooks-refresh-card';
import { LoginAsButton } from '@/components/customers/login-as-button';

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const { data: c, isLoading } = useQuery<Customer360>({
    queryKey: ['customer-360', id],
    queryFn: async () => (await api.get(`/admin/customers/${id}`)).data,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['customer-360', id] });
    queryClient.invalidateQueries({ queryKey: ['customers'] });
  };

  const toggleActive = useMutation({
    mutationFn: (isActive: boolean) => api.patch(`/admin/customers/${id}`, { isActive }),
    onSuccess: () => {
      toast.success('Customer updated');
      setConfirming(false);
      refresh();
    },
    onError: () => toast.error('Failed to update customer'),
  });
  const addRole = useMutation({
    mutationFn: (roleKey: string) => api.post(`/admin/customers/${id}/roles`, { roleKey }),
    onSuccess: () => { toast.success('Role added'); refresh(); },
    onError: () => toast.error('Failed to add role'),
  });
  const removeRole = useMutation({
    mutationFn: (roleKey: string) => api.delete(`/admin/customers/${id}/roles/${roleKey}`),
    onSuccess: () => { toast.success('Role removed'); refresh(); },
    onError: () => toast.error('Failed to remove role'),
  });

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
  if (!c) return null;

  const name =
    c.displayName ?? (`${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.email);
  const balance = c.accountBalance;
  const balanceTotal = balance
    ? balance.bucket0 + balance.bucket30 + balance.bucket60 + balance.bucket90 + balance.bucket120 + balance.bucket120plus
    : 0;
  const hasWholesale = c.roles.some((r) => r.role.key === 'wholesale_customer');
  const hasLoyal = c.roles.some((r) => r.role.key === 'loyal_customer');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => router.push('/customers')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="size-3.5" /> All customers
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-semibold">{name}</h2>
            <Badge variant={c.isActive ? 'default' : 'secondary'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
            {c.dentaplusId && <Badge variant="outline">{c.dentaplusId}</Badge>}
            {c.creditAccountStatus !== 'NONE' && (
              <Badge variant="outline">Credit: {c.creditAccountStatus}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{c.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <LoginAsButton customerId={c.id} variant="default" size="default" />
          <Button variant={editing ? 'default' : 'outline'} onClick={() => setEditing((e) => !e)}>
            {editing ? 'Done' : 'Edit'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Section title="Identity (synced from QuickBooks)">
            <Row label="Display name" value={c.displayName} />
            <Row label="First name" value={c.firstName} />
            <Row label="Last name" value={c.lastName} />
            <Row label="Email" value={c.email} />
            <Row label="Phone" value={c.phone} />
            <Row label="Company" value={c.profile?.company} />
            <Row label="Registered" value={c.registeredAt ? formatDate(c.registeredAt) : null} />
            <Row label="Last active" value={c.lastActiveAt ? formatDate(c.lastActiveAt) : null} />
          </Section>

          <Section title="Addresses">
            {c.addresses.length ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {c.addresses.map((a) => <AddressBlock key={a.id} a={a} />)}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">No addresses</span>
            )}
          </Section>

          <Section title="Account balance">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Outstanding</span>
              <span className="font-medium">{formatCents(balanceTotal)}</span>
            </div>
            {balance && balanceTotal > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-muted-foreground">
                <Bucket label="Current" v={balance.bucket0} />
                <Bucket label="1–30" v={balance.bucket30} />
                <Bucket label="31–60" v={balance.bucket60} />
                <Bucket label="61–90" v={balance.bucket90} />
                <Bucket label="91–120" v={balance.bucket120} />
                <Bucket label="120+" v={balance.bucket120plus} />
              </div>
            )}
          </Section>

          <MiniList title="Recent orders" rows={c.orders} empty="No orders"
            render={(o) => <Line key={o.id} left={o.orderNo} mid={o.fulfillmentStatus} right={formatCents(o.totalCents)} />} />
          <MiniList title="Invoices" rows={c.invoices} empty="No invoices"
            render={(i) => <Line key={i.id} left={i.invoiceNo} mid={i.syncStatus ?? i.type} right={`${formatCents(i.outstandingCents)} due`} />} />
          <MiniList title="Statements" rows={c.statements} empty="No statements"
            render={(s) => <Line key={s.id} left={s.statementNo} mid={formatDate(s.statementDate)} right={formatCents(s.closingBalance)} />} />
        </div>

        <div className="space-y-5">
          <Section title="Roles & wholesale">
            <div className="flex flex-wrap items-center gap-2">
              {c.roles.length ? (
                c.roles.map(({ role }) => (
                  <Badge key={role.key} variant="secondary" className="gap-1">
                    {role.name}
                    {editing && (
                      <button onClick={() => removeRole.mutate(role.key)} className="hover:text-destructive">
                        <X className="size-3" />
                      </button>
                    )}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No roles</span>
              )}
            </div>
            {editing && (
              <div className="mt-3 flex items-center gap-2">
                {!hasWholesale && (
                  <Button size="sm" variant="outline" onClick={() => addRole.mutate('wholesale_customer')}>
                    Mark as wholesale
                  </Button>
                )}
                {!hasLoyal && (
                  <Button size="sm" variant="outline" onClick={() => addRole.mutate('loyal_customer')}>
                    Mark as loyal customer
                  </Button>
                )}
              </div>
            )}
          </Section>

          {editing && (
            <Section title="Account status">
              {!confirming ? (
                <Button
                  variant={c.isActive ? 'outline' : 'default'}
                  className="w-full"
                  onClick={() => setConfirming(true)}
                >
                  {c.isActive ? 'Deactivate account' : 'Activate account'}
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {c.isActive ? 'This prevents the customer from logging in.' : 'This lets the customer log in again.'}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      variant={c.isActive ? 'destructive' : 'default'}
                      disabled={toggleActive.isPending}
                      onClick={() => toggleActive.mutate(!c.isActive)}
                    >
                      {toggleActive.isPending ? 'Saving…' : 'Confirm'}
                    </Button>
                    <Button className="flex-1" variant="outline" onClick={() => setConfirming(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </Section>
          )}

          <QuickbooksRefreshCard<QboCustomerSnapshot>
            endpoint={`/admin/customers/${c.id}/quickbooks`}
            queryKey={['customer-qbo', c.id]}
            render={(snap) => <QboCustomerView snap={snap} />}
          />

          <Section title="Meta">
            <Row label="QuickBooks customer ID" value={c.quickbooksCustomerId} />
            <Row label="Username" value={c.username} />
            <Row label="Created" value={formatDate(c.createdAt)} />
          </Section>
        </div>
      </div>
    </div>
  );
}

function QboCustomerView({ snap }: { snap: QboCustomerSnapshot }) {
  if (!snap.linked) return <p className="text-sm text-muted-foreground">Not linked to QuickBooks.</p>;
  if (!snap.connected) return <p className="text-sm text-destructive">Could not reach QuickBooks. {snap.error}</p>;
  const q = snap.customer;
  return (
    <div className="space-y-1.5 text-sm">
      <Row label="Display name" value={q.DisplayName} />
      <Row label="Company" value={q.CompanyName} />
      <Row label="Email" value={q.PrimaryEmailAddr?.Address} />
      <Row label="Phone" value={q.PrimaryPhone?.FreeFormNumber} />
      <Row label="Balance" value={q.Balance != null ? `$${q.Balance.toFixed(2)}` : null} />
      <Row label="Active" value={q.Active == null ? null : q.Active ? 'Yes' : 'No'} />
    </div>
  );
}

function AddressBlock({ a }: { a: CustomerAddress }) {
  return (
    <div className="rounded-md border p-3 text-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
        {a.type}{a.isDefault ? ' · default' : ''}
      </p>
      <p className="font-medium">{[a.firstName, a.lastName].filter(Boolean).join(' ') || '—'}</p>
      {a.company && <p className="text-muted-foreground">{a.company}</p>}
      {a.address1 && <p className="text-muted-foreground">{a.address1}</p>}
      {a.address2 && <p className="text-muted-foreground">{a.address2}</p>}
      <p className="text-muted-foreground">
        {[a.city, a.state, a.postcode].filter(Boolean).join(', ')}{a.country ? ` ${a.country}` : ''}
      </p>
      {a.phone && <p className="text-muted-foreground">{a.phone}</p>}
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
function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 py-0.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || '—'}</span>
    </div>
  );
}
function Bucket({ label, v }: { label: string; v: number }) {
  return (<div><p>{label}</p><p className="text-foreground">{formatCents(v)}</p></div>);
}
function MiniList<T>({ title, rows, empty, render }: { title: string; rows: T[]; empty: string; render: (row: T) => React.ReactNode }) {
  return (
    <Section title={title}>
      {rows.length ? <div className="divide-y rounded-md border">{rows.map(render)}</div> : <p className="text-sm text-muted-foreground">{empty}</p>}
    </Section>
  );
}
function Line({ left, mid, right }: { left: string; mid: string; right: string }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
      <span className="font-medium">{left}</span>
      <span className="text-muted-foreground text-xs capitalize">{mid.toLowerCase()}</span>
      <span>{right}</span>
    </div>
  );
}
