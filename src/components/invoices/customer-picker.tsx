'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Customer, PaginatedResponse } from '@/types/api';
import { Input } from '@/components/ui/input';

export interface PickedCustomer {
  id: string;
  email: string;
  displayName: string | null;
}

/** Debounced customer search + dropdown. Selecting one clears the query and shows a read-only chip. */
export function CustomerPicker({
  value,
  onChange,
  disabled,
}: {
  value: PickedCustomer | null;
  onChange: (customer: PickedCustomer | null) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const { data, isFetching } = useQuery<PaginatedResponse<Customer>>({
    queryKey: ['customer-picker', debounced],
    queryFn: async () =>
      (await api.get('/admin/customers', { params: { q: debounced, limit: 10 } })).data,
    enabled: debounced.length >= 2,
  });

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
        <span>
          <span className="font-medium">{value.displayName ?? value.email}</span>
          {value.displayName && <span className="text-muted-foreground"> · {value.email}</span>}
        </span>
        {!disabled && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onChange(null)}
          >
            Change
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search customer by name or email…"
      />
      {open && debounced.length >= 2 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md max-h-64 overflow-y-auto">
          {isFetching ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>
          ) : data?.data.length ? (
            data.data.map((c) => (
              <button
                key={c.id}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onChange({ id: c.id, email: c.email, displayName: c.displayName });
                  setQuery('');
                  setOpen(false);
                }}
              >
                <span className="font-medium">{c.displayName ?? c.email}</span>
                {c.displayName && <span className="text-muted-foreground"> · {c.email}</span>}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">No customers found</p>
          )}
        </div>
      )}
    </div>
  );
}
