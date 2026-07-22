'use client';

import { Check } from 'lucide-react';

export function variantLabel(v: { name: string | null; sku: string | null; id: string }): string {
  return v.name || v.sku || v.id.slice(0, 6);
}

/** Toggle-chip multi-select over a product's variants, reused across offer attach/curation UIs. */
export function VariantChipPicker({
  variants,
  selectedIds,
  onToggle,
  disabled,
}: {
  variants: { id: string; name: string | null; sku: string | null }[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  disabled?: boolean;
}) {
  if (!variants.length) {
    return <span className="text-xs text-muted-foreground">No variants to select.</span>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {variants.map((v) => {
        const on = selectedIds.has(v.id);
        return (
          <button
            key={v.id}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(v.id)}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
              on ? 'border-primary bg-primary text-primary-foreground' : 'border-input hover:bg-muted'
            }`}
          >
            {on && <Check className="size-3" />}
            {variantLabel(v)}
          </button>
        );
      })}
    </div>
  );
}
