'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { QuickbooksStatus } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';

export function QuickbooksView() {
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery<QuickbooksStatus>({
    queryKey: ['qbo-status'],
    queryFn: async () => (await api.get('/admin/quickbooks/status')).data,
  });

  const connect = useMutation({
    mutationFn: async () => (await api.get('/admin/quickbooks/connect')).data as { url: string },
    onSuccess: ({ url }) => window.open(url, '_blank', 'noopener'),
    onError: () => toast.error('Could not start QuickBooks connection'),
  });

  const reconcile = useMutation({
    mutationFn: async () => (await api.post('/admin/quickbooks/reconcile')).data,
    onSuccess: (d: { processed?: number }) =>
      toast.success(`Reconcile complete — ${d?.processed ?? 0} change(s) applied`),
    onError: () => toast.error('Reconcile failed'),
  });

  const disconnect = useMutation({
    mutationFn: async () => (await api.post('/admin/quickbooks/disconnect')).data,
    onSuccess: () => {
      toast.success('Disconnected from QuickBooks');
      queryClient.invalidateQueries({ queryKey: ['qbo-status'] });
    },
    onError: () => toast.error('Disconnect failed'),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            Connection
            {!isLoading && status && (
              <Badge variant={status.connected ? 'default' : 'secondary'}>
                {status.connected ? (
                  <CheckCircle2 className="size-3.5" />
                ) : (
                  <XCircle className="size-3.5" />
                )}
                {status.connected ? 'Connected' : 'Not connected'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading || !status ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <>
              <dl className="space-y-1.5 text-sm">
                <Row label="Configured" value={status.configured ? 'Yes' : 'No (set QBO env keys)'} />
                <Row label="Environment" value={status.environment} />
                <Row label="Realm ID" value={status.realmId ?? '—'} />
                {status.accessExpiresAt && (
                  <Row label="Access token expires" value={formatDateTime(status.accessExpiresAt)} />
                )}
                {status.refreshExpiresAt && (
                  <Row label="Refresh token expires" value={formatDateTime(status.refreshExpiresAt)} />
                )}
              </dl>

              <div className="flex flex-wrap gap-2 pt-2">
                {status.connected ? (
                  <Button
                    variant="outline"
                    disabled={disconnect.isPending}
                    onClick={() => disconnect.mutate()}
                  >
                    {disconnect.isPending ? 'Disconnecting…' : 'Disconnect'}
                  </Button>
                ) : (
                  <Button
                    disabled={!status.configured || connect.isPending}
                    onClick={() => connect.mutate()}
                  >
                    {connect.isPending ? 'Opening…' : 'Connect to QuickBooks'}
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sync</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Invoices, payments, items and customers sync automatically via webhooks. Run a
            reconcile to pull any changes missed since the last sync.
          </p>
          <Button
            variant="outline"
            disabled={!status?.connected || reconcile.isPending}
            onClick={() => reconcile.mutate()}
          >
            {reconcile.isPending ? 'Reconciling…' : 'Run reconcile now'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium break-all">{value}</span>
    </div>
  );
}
