'use client';

import { DatePreset } from '@/types/api';
import { Button } from '@/components/ui/button';

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'ytd', label: 'This year' },
  { value: 'last_year', label: 'Last year' },
];

interface Props {
  preset: DatePreset;
  onChange: (preset: DatePreset) => void;
}

export function DateFilterBar({ preset, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESETS.map((p) => (
        <Button
          key={p.value}
          variant={preset === p.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(p.value)}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}
