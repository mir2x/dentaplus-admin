'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import type { LookupItem, LookupKind } from '@/types/popups';
import { Input } from '@/components/ui/input';

const KIND_NOUN: Record<LookupKind, string> = {
  product: 'products',
  category: 'categories',
  collection: 'collections',
  tag: 'tags',
  customPage: 'pages',
  blogPost: 'blog posts',
  offer: 'offers',
  promoCode: 'promo codes',
  customerRole: 'customer roles',
};

async function lookup(kind: LookupKind, params: { q?: string; ids?: string[] }): Promise<LookupItem[]> {
  const { data } = await api.get<LookupItem[]>('/admin/popups/lookup', {
    params: { kind, q: params.q || undefined, ids: params.ids?.length ? params.ids.join(',') : undefined },
  });
  return data;
}

/** Resolves saved ids to labels so chips show names, not cuids. */
function useLabels(kind: LookupKind, ids: string[]) {
  const key = [...ids].sort().join(',');
  return useQuery({
    queryKey: ['popup-lookup-ids', kind, key],
    queryFn: () => lookup(kind, { ids }),
    enabled: ids.length > 0,
    staleTime: 5 * 60_000,
  });
}

function SearchDropdown({
  kind,
  exclude,
  onPick,
  placeholder,
}: {
  kind: LookupKind;
  exclude: string[];
  onPick: (item: LookupItem) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ['popup-lookup', kind, debounced],
    queryFn: () => lookup(kind, { q: debounced }),
    enabled: open,
    staleTime: 30_000,
  });

  const results = (data ?? []).filter((i) => !exclude.includes(i.id));

  return (
    <div ref={ref} className="relative">
      <Input
        value={query}
        placeholder={placeholder ?? `Search ${KIND_NOUN[kind]}…`}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
          {isFetching && !data ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>
          ) : results.length ? (
            results.map((item) => (
              <button
                key={item.id}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onPick(item);
                  setQuery('');
                  setOpen(false);
                }}
              >
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="size-7 shrink-0 rounded border object-cover" />
                )}
                <span className="min-w-0">
                  <span className="block truncate font-medium">{item.label}</span>
                  {item.sublabel && (
                    <span className="block truncate text-xs text-muted-foreground">{item.sublabel}</span>
                  )}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">No {KIND_NOUN[kind]} found</p>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ item, fallback, onRemove }: { item?: LookupItem; fallback: string; onRemove: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md border bg-muted/50 py-0.5 pr-1 pl-2 text-xs">
      {item?.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt="" className="size-4 rounded object-cover" />
      )}
      <span className={item ? 'truncate' : 'truncate text-destructive'} title={item ? item.label : 'Not found — deleted?'}>
        {item?.label ?? fallback}
      </span>
      <button type="button" onClick={onRemove} className="rounded p-0.5 hover:bg-muted" aria-label="Remove">
        <X className="size-3" />
      </button>
    </span>
  );
}

export function EntityPicker({
  kind,
  value,
  onChange,
  placeholder,
}: {
  kind: LookupKind;
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  placeholder?: string;
}) {
  const ids = value ? [value] : [];
  const { data: labels, isLoading } = useLabels(kind, ids);

  if (value) {
    const item = labels?.find((l) => l.id === value);
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          {item?.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt="" className="size-6 shrink-0 rounded border object-cover" />
          )}
          <span className={item || isLoading ? 'truncate font-medium' : 'truncate text-destructive'}>
            {item?.label ?? (isLoading ? 'Loading…' : 'Not found — deleted?')}
          </span>
        </span>
        <button
          type="button"
          className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onChange(undefined)}
        >
          Change
        </button>
      </div>
    );
  }

  return <SearchDropdown kind={kind} exclude={[]} onPick={(i) => onChange(i.id)} placeholder={placeholder} />;
}

export function EntityMultiPicker({
  kind,
  value,
  onChange,
  placeholder,
  max,
}: {
  kind: LookupKind;
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  max?: number;
}) {
  const { data: labels } = useLabels(kind, value);
  const full = max !== undefined && value.length >= max;

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => (
            <Chip
              key={id}
              item={labels?.find((l) => l.id === id)}
              fallback={labels ? 'Not found' : '…'}
              onRemove={() => onChange(value.filter((v) => v !== id))}
            />
          ))}
        </div>
      )}
      {!full && (
        <SearchDropdown
          kind={kind}
          exclude={value}
          onPick={(i) => onChange([...value, i.id])}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
