'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Combobox,
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxChips,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxStatus,
} from '@/components/ui/combobox';

export interface TagOption {
  value: string;
  label: string;
}

const MIN_QUERY_LENGTH = 2;

export function TagPicker({
  selected,
  onChange,
  placeholder = 'Type to search tags…',
}: {
  selected: TagOption[];
  onChange: (tags: TagOption[]) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(handle);
  }, [query]);

  const search = debouncedQuery.length >= MIN_QUERY_LENGTH ? debouncedQuery : '';

  const { data, isFetching } = useQuery({
    queryKey: ['tags', 'browse', search],
    queryFn: async () => {
      const { data } = await api.get<{ data: { id: string; name: string }[] }>(
        '/admin/tags/browse',
        { params: { search, limit: 20 } },
      );
      return data;
    },
    enabled: search.length >= MIN_QUERY_LENGTH,
    staleTime: 30_000,
  });

  const items: TagOption[] = (data?.data ?? []).map((tag) => ({ value: tag.id, label: tag.name }));

  return (
    <Combobox
      multiple
      items={items}
      value={selected}
      onValueChange={(value) => onChange(value)}
      inputValue={query}
      onInputValueChange={setQuery}
      filter={null}
      isItemEqualToValue={(a, b) => a.value === b.value}
    >
      <ComboboxChips>
        {selected.map((tag) => (
          <ComboboxChip key={tag.value} aria-label={tag.label}>
            {tag.label}
            <ComboboxChipRemove aria-label={`Remove ${tag.label}`} />
          </ComboboxChip>
        ))}
        <ComboboxInput placeholder={placeholder} />
      </ComboboxChips>
      <ComboboxContent>
        {search.length < MIN_QUERY_LENGTH ? (
          <ComboboxStatus>Type at least {MIN_QUERY_LENGTH} characters to search</ComboboxStatus>
        ) : isFetching ? (
          <ComboboxStatus>Searching…</ComboboxStatus>
        ) : (
          <>
            <ComboboxEmpty>No matching tags</ComboboxEmpty>
            {items.map((item) => (
              <ComboboxItem key={item.value} value={item}>
                {item.label}
              </ComboboxItem>
            ))}
          </>
        )}
      </ComboboxContent>
    </Combobox>
  );
}
