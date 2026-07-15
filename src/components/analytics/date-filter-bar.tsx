'use client';

import { useState } from 'react';
import { DatePreset } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  onCustomDays: (days: number) => void;
}

export function DateFilterBar({ preset, onChange, onCustomDays }: Props) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [days, setDays] = useState('');

  function handleCustomClick() {
    setShowCustomInput(true);
  }

  function handleGo() {
    const parsed = Number(days);
    if (!Number.isInteger(parsed) || parsed < 1) return;
    onChange('custom');
    onCustomDays(parsed);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <Button
          key={p.value}
          variant={preset === p.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setShowCustomInput(false);
            onChange(p.value);
          }}
        >
          {p.label}
        </Button>
      ))}
      <Button
        variant={preset === 'custom' ? 'default' : 'outline'}
        size="sm"
        onClick={handleCustomClick}
      >
        Custom
      </Button>
      {showCustomInput && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            placeholder="Days"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleGo();
            }}
            className="w-20"
          />
          <span className="text-sm text-muted-foreground">days</span>
          <Button size="sm" onClick={handleGo}>
            Go
          </Button>
        </div>
      )}
    </div>
  );
}
