'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface GenerateResult {
  created: number;
  candidates: number;
  periodFrom: string;
  periodTo: string;
}

export function StatementsView() {
  const queryClient = useQueryClient();

  const generate = useMutation({
    mutationFn: async () =>
      (await api.post('/admin/statements/generate-monthly')).data as GenerateResult,
    onSuccess: (d) => {
      toast.success(`Generated ${d.created} statement(s) of ${d.candidates} customer(s) with balances`);
      queryClient.invalidateQueries({ queryKey: ['accounts-receivable'] });
    },
    onError: () => toast.error('Statement generation failed'),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly statements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Statements are generated automatically on the 1st of each month for every customer
            with unpaid or partially-paid invoices, rolling the balance forward. You can also
            generate this month&apos;s statements now. They are then <strong>sent to customers
            manually from QuickBooks</strong> (Create Statements → Save and send).
          </p>
          <Button disabled={generate.isPending} onClick={() => generate.mutate()}>
            {generate.isPending ? 'Generating…' : 'Generate this month’s statements'}
          </Button>
          {generate.data && (
            <p className="text-muted-foreground">
              Last run: created <strong>{generate.data.created}</strong> of{' '}
              {generate.data.candidates} customers with outstanding balances.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
