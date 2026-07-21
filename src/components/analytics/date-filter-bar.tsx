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
  onCustomRange: (from: string, to: string) => void;
}

export function DateFilterBar({ preset, onChange, onCustomRange }: Props) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  function handleCustomClick() {
    setShowCustomInput(true);
  }

  function handleGo() {
    if (!from || !to || from > to) return;
    onChange('custom');
    onCustomRange(from, to);
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
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            className="w-auto"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            className="w-auto"
          />
          <Button size="sm" onClick={handleGo} disabled={!from || !to || from > to}>
            Go
          </Button>
        </div>
      )}
    </div>
  );
}
