'use client';

import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

/** Label + control + optional hint, the building block of every popup inspector. */
export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SwitchField({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <Label className="text-xs">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/**
 * Select over a fixed option list. Passes `items` to Base UI so the trigger
 * shows the label before the popup has ever been opened.
 */
export function OptionSelect<T extends string>({
  value,
  options,
  onChange,
  className,
  placeholder,
}: {
  value: T | undefined;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
  placeholder?: string;
}) {
  const items = Object.fromEntries(options.map((o) => [o.value, o.label]));
  return (
    <Select
      items={items}
      value={value ?? null}
      onValueChange={(v) => {
        if (v != null) onChange(v as T);
      }}
    >
      <SelectTrigger className={cn('w-full', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Integer input that keeps its own text while typing and reports clamped numbers. */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  className,
  placeholder,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  min?: number;
  max?: number;
  className?: string;
  placeholder?: string;
}) {
  return (
    <Input
      type="number"
      className={className}
      min={min}
      max={max}
      placeholder={placeholder}
      value={value ?? ''}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === '') return onChange(undefined);
        let n = Math.round(Number(raw));
        if (Number.isNaN(n)) return;
        if (min !== undefined) n = Math.max(min, n);
        if (max !== undefined) n = Math.min(max, n);
        onChange(n);
      }}
    />
  );
}

export function ColorInput({
  value,
  onChange,
  allowEmpty,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  allowEmpty?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        className="h-8 w-10 cursor-pointer rounded border bg-transparent p-0.5"
        value={normalizeHex(value) ?? '#000000'}
        onChange={(e) => onChange(e.target.value)}
      />
      <Input
        className="font-mono text-xs"
        value={value ?? ''}
        placeholder={allowEmpty ? 'Default' : '#ffffff'}
        onChange={(e) => onChange(e.target.value || undefined)}
      />
      {allowEmpty && value && (
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onChange(undefined)}
        >
          Clear
        </button>
      )}
    </div>
  );
}

function normalizeHex(v: string | undefined): string | undefined {
  if (!v) return undefined;
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) return `#${[...v.slice(1)].map((c) => c + c).join('')}`;
  if (/^#[0-9a-fA-F]{8}$/.test(v)) return v.slice(0, 7);
  return undefined;
}

/** Toggle chips for multi-select over a small fixed set. */
export function ChipToggleGroup<T extends string>({
  values,
  options,
  onChange,
}: {
  values: T[];
  options: readonly { value: T; label: string }[];
  onChange: (v: T[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = values.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(on ? values.filter((v) => v !== o.value) : [...values, o.value])}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
              on ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
