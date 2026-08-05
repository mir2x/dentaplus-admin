'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { QboPickerOption } from '@/types/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type QboRefKind = 'income' | 'expense' | 'asset' | 'taxcode';

const DEFAULT_VALUE = '__default__';

/**
 * Picker for a QuickBooks Account (income/expense/asset) or TaxCode id,
 * backed by GET /admin/quickbooks/accounts|tax-codes. These lists mirror the
 * business's existing QuickBooks setup — never created from here, only
 * selected — so a blank selection means "use the account/tax code DentaPlus
 * already falls back to" rather than "no account".
 */
export function QuickbooksRefSelect({
  kind,
  value,
  onChange,
  disabled,
}: {
  kind: QboRefKind;
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const { data, isLoading, isError } = useQuery<QboPickerOption[]>({
    queryKey: ['qbo-ref-options', kind],
    queryFn: async () =>
      (
        await api.get(
          kind === 'taxcode' ? '/admin/quickbooks/tax-codes' : '/admin/quickbooks/accounts',
          kind === 'taxcode' ? undefined : { params: { type: kind } },
        )
      ).data,
  });

  return (
    <Select
      value={value || DEFAULT_VALUE}
      onValueChange={(v) => onChange(v && v !== DEFAULT_VALUE ? v : '')}
      disabled={disabled || isLoading || isError}
    >
      <SelectTrigger className="w-full">
        <SelectValue
          placeholder={isError ? 'QuickBooks not connected' : isLoading ? 'Loading…' : 'Default'}
        />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={DEFAULT_VALUE}>Use default</SelectItem>
        {data?.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.name}
          </SelectItem>
        ))}
        {data?.length === 0 && (
          <div className="px-3 py-1.5 text-sm text-muted-foreground">No accounts found</div>
        )}
      </SelectContent>
    </Select>
  );
}
