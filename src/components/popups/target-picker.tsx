'use client';

import type { EntityTargetKind, Target } from '@/types/popups';
import { ENTITY_TARGET_KINDS } from '@/types/popups';
import { Input } from '@/components/ui/input';
import { EntityPicker } from './entity-picker';
import { OptionSelect, SwitchField } from './form-bits';
import { TARGET_KIND_LABELS } from './popup-utils';

const KIND_OPTIONS = (Object.keys(TARGET_KIND_LABELS) as Target['kind'][]).map((k) => ({
  value: k,
  label: TARGET_KIND_LABELS[k],
}));

const ACTION_OPTIONS = [
  { value: 'close', label: 'Close the popup' },
  { value: 'openCart', label: 'Open the cart' },
  { value: 'accept', label: 'Accept & close (cookie consent)' },
] as const;

function isEntityKind(kind: Target['kind']): kind is EntityTargetKind {
  return (ENTITY_TARGET_KINDS as readonly string[]).includes(kind);
}

function emptyTarget(kind: Target['kind']): Target {
  if (isEntityKind(kind)) return { kind, id: '' };
  if (kind === 'path') return { kind, value: '/' };
  if (kind === 'url') return { kind, value: 'https://', newTab: true };
  return { kind: 'action', value: 'close' };
}

/**
 * "Link to anything": pick a kind, then the entity / path / URL / action.
 * `allowNone` adds a "No link" option (image blocks).
 */
export function TargetPicker({
  value,
  onChange,
  allowNone,
}: {
  value: Target | undefined;
  onChange: (t: Target | undefined) => void;
  allowNone?: boolean;
}) {
  const options = allowNone ? [{ value: 'none' as const, label: 'No link' }, ...KIND_OPTIONS] : KIND_OPTIONS;
  const kind = value?.kind ?? 'none';

  return (
    <div className="space-y-2">
      <OptionSelect
        value={kind as Target['kind'] | 'none'}
        options={options}
        onChange={(k) => onChange(k === 'none' ? undefined : emptyTarget(k))}
      />
      {value && isEntityKind(value.kind) && 'id' in value && (
        <EntityPicker
          kind={value.kind}
          value={value.id || undefined}
          onChange={(id) => onChange({ kind: value.kind as EntityTargetKind, id: id ?? '' })}
        />
      )}
      {value?.kind === 'path' && (
        <Input
          className="font-mono text-xs"
          value={value.value}
          placeholder="/shop?featured=true"
          onChange={(e) => onChange({ kind: 'path', value: e.target.value })}
        />
      )}
      {value?.kind === 'url' && (
        <>
          <Input
            className="font-mono text-xs"
            value={value.value}
            placeholder="https://example.com"
            onChange={(e) => onChange({ ...value, value: e.target.value })}
          />
          <SwitchField
            label="Open in a new tab"
            checked={value.newTab ?? true}
            onChange={(newTab) => onChange({ ...value, newTab })}
          />
        </>
      )}
      {value?.kind === 'action' && (
        <OptionSelect
          value={value.value}
          options={ACTION_OPTIONS}
          onChange={(v) => onChange({ kind: 'action', value: v })}
        />
      )}
    </div>
  );
}
