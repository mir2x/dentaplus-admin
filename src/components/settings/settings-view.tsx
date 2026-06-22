'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

interface Settings {
  gstDivisor: number;
  freeShippingThresholdCents: number;
  flatShippingCents: number;
  invoiceDueDays: number;
}

const FIELDS: { key: keyof Settings; label: string; hint: string }[] = [
  { key: 'gstDivisor', label: 'GST divisor', hint: 'Tax extracted from GST-inclusive totals (11 = 10% GST)' },
  { key: 'freeShippingThresholdCents', label: 'Free shipping threshold (cents)', hint: 'Orders at/above this ship free' },
  { key: 'flatShippingCents', label: 'Flat shipping (cents)', hint: 'Charged below the free-shipping threshold' },
  { key: 'invoiceDueDays', label: 'Invoice due (days)', hint: 'Default payment terms for new invoices' },
];

export function SettingsView() {
  const queryClient = useQueryClient();
  // Edits overlay the fetched values, so we never copy server state into an effect.
  const [edits, setEdits] = useState<Partial<Settings>>({});

  const { data, isLoading } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/admin/settings')).data,
  });

  const save = useMutation({
    mutationFn: (body: Settings) => api.patch('/admin/settings', body),
    onSuccess: () => {
      toast.success('Settings saved');
      setEdits({});
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: () => toast.error('Failed to save settings'),
  });

  if (isLoading || !data) return <Skeleton className="h-72 w-full max-w-xl" />;

  const merged: Settings = { ...data, ...edits };

  return (
    <div className="max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {FIELDS.map(({ key, label, hint }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                type="number"
                value={merged[key]}
                onChange={(e) => setEdits((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
              />
              <p className="text-xs text-muted-foreground">{hint}</p>
            </div>
          ))}
          <Button disabled={save.isPending} onClick={() => save.mutate(merged)}>
            {save.isPending ? 'Saving…' : 'Save settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
