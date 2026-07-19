'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { CustomerRole, WholesaleDiscountType, WholesaleRule } from '@/types/api';
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

function describeRule(r: WholesaleRule): string {
  if (r.discountType === 'PERCENTAGE') return `${(r.percentageBps ?? 0) / 100}% off`;
  return `$${((r.amountCents ?? 0) / 100).toFixed(2)} off / unit`;
}

type Owner = { productId: string; variantId?: undefined } | { productId?: undefined; variantId: string };

export function WholesaleRulesPanel(props: Owner) {
  const queryClient = useQueryClient();
  const ownerKey = props.productId ? `product:${props.productId}` : `variant:${props.variantId}`;
  const basePath = props.productId
    ? `/admin/products/${props.productId}/wholesale-rules`
    : `/admin/variants/${props.variantId}/wholesale-rules`;

  const { data: rules } = useQuery<WholesaleRule[]>({
    queryKey: ['wholesale-rules', ownerKey],
    queryFn: async () => (await api.get(basePath)).data,
  });
  const { data: roles } = useQuery<CustomerRole[]>({
    queryKey: ['customer-roles'],
    queryFn: async () => (await api.get('/admin/customer-roles')).data,
  });

  const [roleKey, setRoleKey] = useState('wholesale_customer');
  const [minQuantity, setMinQuantity] = useState('1');
  const [discountType, setDiscountType] = useState<WholesaleDiscountType>('PERCENTAGE');
  const [value, setValue] = useState('');

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['wholesale-rules', ownerKey] });

  const create = useMutation({
    mutationFn: () => {
      const payload = {
        roleKey,
        minQuantity: Number(minQuantity) || 1,
        discountType,
        ...(discountType === 'PERCENTAGE'
          ? { percentageBps: Math.round(parseFloat(value || '0') * 100) }
          : { amountCents: Math.round(parseFloat(value || '0') * 100) }),
      };
      return api.post(basePath, payload);
    },
    onSuccess: () => {
      toast.success('Wholesale rule added');
      setValue('');
      invalidate();
    },
    onError: () => toast.error('Could not add rule (check for a duplicate role + quantity)'),
  });

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/wholesale-rules/${id}`),
    onSuccess: () => {
      toast.success('Rule removed');
      invalidate();
    },
    onError: () => toast.error('Delete failed'),
  });

  return (
    <div className="space-y-3">
      {rules?.length ? (
        <ul className="divide-y rounded-md border text-sm">
          {rules.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-3 py-2">
              <span>
                <span className="font-medium">{r.roleKey}</span>
                <span className="text-muted-foreground"> · {r.minQuantity}+ units · </span>
                {describeRule(r)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                disabled={del.isPending}
                onClick={() => del.mutate(r.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          No wholesale rules for this {props.productId ? 'product' : 'variant'}.
        </p>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Role</Label>
          <Select value={roleKey} onValueChange={(v) => setRoleKey(v ?? 'wholesale_customer')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles?.length ? (
                roles.map((role) => (
                  <SelectItem key={role.id} value={role.key}>
                    {role.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="wholesale_customer">Wholesale customer</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Min quantity</Label>
          <Input
            type="number"
            min={1}
            value={minQuantity}
            onChange={(e) => setMinQuantity(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Discount type</Label>
          <Select
            value={discountType}
            onValueChange={(v) => setDiscountType((v ?? 'PERCENTAGE') as WholesaleDiscountType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENTAGE">Percentage</SelectItem>
              <SelectItem value="FIXED">Fixed ($/unit)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">
            {discountType === 'PERCENTAGE' ? 'Percent off' : 'Dollars off / unit'}
          </Label>
          <Input
            type="number"
            step="0.01"
            placeholder={discountType === 'PERCENTAGE' ? '20' : '5.00'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
      </div>

      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        disabled={create.isPending || !value}
        onClick={() => create.mutate()}
      >
        {create.isPending ? 'Adding…' : 'Add wholesale rule'}
      </Button>
    </div>
  );
}
