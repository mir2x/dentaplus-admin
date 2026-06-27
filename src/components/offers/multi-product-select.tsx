'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { Product } from '@/types/api';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Props {
  products: Product[];
  selected: string[];
  onChange: (ids: string[]) => void;
}

/**
 * Searchable multi-select (checkbox dropdown) for offer trigger products.
 * Search matches product name or SKU. An empty selection means a general offer.
 */
export function MultiProductSelect({ products, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || (p.sku?.toLowerCase().includes(q) ?? false),
    );
  }, [products, query]);

  const selectedSet = new Set(selected);
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const summary =
    selected.length === 0
      ? 'General offer (applies to the whole cart)'
      : `${selected.length} product${selected.length > 1 ? 's' : ''} selected`;

  const selectedProducts = products.filter((p) => selectedSet.has(p.id));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 py-1 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className={cn('truncate', selected.length === 0 && 'text-muted-foreground')}>
          {summary}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </button>

      {selectedProducts.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {selectedProducts.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs"
            >
              {p.name}
              <button type="button" onClick={() => toggle(p.id)} className="hover:text-destructive">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-md">
          <div className="flex items-center gap-2 border-b px-2.5 py-1.5">
            <Search className="size-4 shrink-0 opacity-50" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or SKU…"
              className="h-7 border-0 px-0 focus-visible:ring-0"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length ? (
              filtered.map((p) => {
                const active = selectedSet.has(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => toggle(p.id)}
                      className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-accent"
                    >
                      <span
                        className={cn(
                          'flex size-4 shrink-0 items-center justify-center rounded border',
                          active ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
                        )}
                      >
                        {active && <Check className="size-3" />}
                      </span>
                      <span className="truncate">
                        {p.name}
                        {p.sku && (
                          <span className="text-muted-foreground"> · {p.sku}</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="px-2.5 py-3 text-center text-sm text-muted-foreground">
                No products match “{query}”
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
