'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Customer } from '@/types/api';
import { formatDate } from '@/lib/format';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface Props {
  customer: Customer | null;
  onClose: () => void;
}

export function CustomerDetailSheet({ customer, onClose }: Props) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const toggleActive = useMutation({
    mutationFn: (isActive: boolean) =>
      api.patch(`/admin/customers/${customer!.id}`, { isActive }),
    onSuccess: () => {
      toast.success(`Customer ${customer?.isActive ? 'deactivated' : 'activated'}`);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setConfirming(false);
      onClose();
    },
    onError: () => toast.error('Failed to update customer'),
  });

  return (
    <Sheet open={!!customer} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {customer && (
          <>
            <SheetHeader className="mb-4">
              <SheetTitle>
                {customer.displayName ??
                  (`${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() ||
                    customer.email)}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={customer.isActive ? 'default' : 'secondary'}>
                  {customer.isActive ? 'Active' : 'Inactive'}
                </Badge>
                {customer.roles.map(({ role }) => (
                  <Badge key={role.key} variant="outline" className="text-xs capitalize">
                    {role.name}
                  </Badge>
                ))}
              </div>
            </SheetHeader>

            <section className="space-y-1.5 text-sm mb-4">
              <p className="font-medium">Contact</p>
              <p className="text-muted-foreground">{customer.email}</p>
              {customer.phone && (
                <p className="text-muted-foreground">{customer.phone}</p>
              )}
              {customer.profile?.company && (
                <p className="text-muted-foreground">{customer.profile.company}</p>
              )}
            </section>

            <section className="space-y-1.5 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Registered</span>
                <span>{customer.registeredAt ? formatDate(customer.registeredAt) : '—'}</span>
              </div>
              {customer.profile?.legacyOrderCount != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Legacy orders</span>
                  <span>{customer.profile.legacyOrderCount}</span>
                </div>
              )}
            </section>

            <Separator className="mb-4" />

            <section className="space-y-3">
              {!confirming ? (
                <Button
                  variant={customer.isActive ? 'outline' : 'default'}
                  className="w-full"
                  onClick={() => setConfirming(true)}
                >
                  {customer.isActive ? 'Deactivate Account' : 'Activate Account'}
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {customer.isActive
                      ? 'This will prevent the customer from logging in.'
                      : 'This will allow the customer to log in again.'}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      variant={customer.isActive ? 'destructive' : 'default'}
                      disabled={toggleActive.isPending}
                      onClick={() => toggleActive.mutate(!customer.isActive)}
                    >
                      {toggleActive.isPending ? 'Saving…' : 'Confirm'}
                    </Button>
                    <Button
                      className="flex-1"
                      variant="outline"
                      onClick={() => setConfirming(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
