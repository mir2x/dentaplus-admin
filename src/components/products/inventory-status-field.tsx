'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Mutually exclusive stock status. Backend invariant (AdminService.resolveInventoryState):
 * on_backorder nulls inStock/quantity; in_stock requires quantity > 0; out_of_stock forces quantity to 0.
 */
export type InventoryStatus = 'in_stock' | 'out_of_stock' | 'backorder';

const STATUS_OPTIONS: { value: InventoryStatus; label: string }[] = [
  { value: 'in_stock', label: 'In stock' },
  { value: 'out_of_stock', label: 'Out of stock' },
  { value: 'backorder', label: 'On backorder' },
];

// Passed to <Select items> so the trigger shows the label immediately on
// first render — without it, Base UI's Select.Value only learns the label
// once its Select.Item children have mounted (i.e. after the popup has been
// opened once), and falls back to showing the raw value until then.
const STATUS_ITEMS: Record<InventoryStatus, string> = {
  in_stock: 'In stock',
  out_of_stock: 'Out of stock',
  backorder: 'On backorder',
};

export function statusFromInventory(
  inventory: { inStock: boolean | null; backordersAllowed: boolean } | null | undefined,
): InventoryStatus {
  if (inventory?.backordersAllowed) return 'backorder';
  if (inventory?.inStock === false) return 'out_of_stock';
  return 'in_stock';
}

/** Maps a chosen status + quantity string to the fields the API expects (generic `quantity` key — rename to `stockQuantity` for the flat product DTO). */
export function resolveInventoryPayload(
  status: InventoryStatus,
  quantity: string,
): { backordersAllowed: boolean; inStock?: boolean; quantity?: number } {
  if (status === 'backorder') {
    return { backordersAllowed: true };
  }
  if (status === 'out_of_stock') {
    return { backordersAllowed: false, inStock: false };
  }
  return {
    backordersAllowed: false,
    inStock: true,
    quantity: quantity !== '' ? parseInt(quantity, 10) : undefined,
  };
}

type Props = {
  status: InventoryStatus;
  onStatusChange: (status: InventoryStatus) => void;
  quantity: string;
  onQuantityChange: (value: string) => void;
};

export function InventoryStatusField({ status, onStatusChange, quantity, onQuantityChange }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <Label className="text-xs">Stock status</Label>
        <Select
          items={STATUS_ITEMS}
          value={status}
          onValueChange={(v) => onStatusChange((v ?? 'in_stock') as InventoryStatus)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {status === 'in_stock' && (
        <div className="space-y-1">
          <Label className="text-xs">Quantity</Label>
          <Input
            type="number"
            min={1}
            step={1}
            placeholder="Required, greater than 0"
            value={quantity}
            onChange={(e) => onQuantityChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
