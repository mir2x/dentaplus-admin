'use client';

import { Plus, Trash2, FolderPlus } from 'lucide-react';
import type { Condition, ConditionType, PopupRules, RuleGroup } from '@/types/popups';
import { PAGE_TYPES, isRuleGroup } from '@/types/popups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { EntityMultiPicker } from './entity-picker';
import { ChipToggleGroup, NumberInput, OptionSelect, SwitchField } from './form-bits';
import {
  CONDITION_GROUPS,
  CONDITION_LABELS,
  PAGE_TYPE_LABELS,
  WEEKDAY_LABELS,
  createCondition,
  describeGroup,
  hourLabel,
} from './popup-utils';

const MAX_DEPTH = 3;

export function RulesEditor({ value, onChange }: { value: PopupRules; onChange: (r: PopupRules) => void }) {
  const show = describeGroup(value.show);
  const exclude = describeGroup(value.exclude);

  return (
    <div className="space-y-6">
      <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
        <span className="font-medium">Shows to </span>
        {show ? <>visitors {show}</> : <>everyone, on every page</>}
        {exclude && <>, except visitors {exclude}</>}.
        <p className="mt-1 text-xs text-muted-foreground">
          Checkout, sign-in and password pages never show popups. Cart conditions update as soon as the cart changes.
        </p>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Show when</h3>
        <p className="text-xs text-muted-foreground">Leave empty to show everywhere, to everyone.</p>
        <GroupEditor group={value.show} onChange={(show) => onChange({ ...value, show })} depth={0} />
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Never show when</h3>
        <p className="text-xs text-muted-foreground">Any match here hides the popup, even if the rules above match.</p>
        <GroupEditor group={value.exclude} onChange={(exclude) => onChange({ ...value, exclude })} depth={0} />
      </section>
    </div>
  );
}

function GroupEditor({
  group,
  onChange,
  onRemove,
  depth,
}: {
  group: RuleGroup;
  onChange: (g: RuleGroup) => void;
  onRemove?: () => void;
  depth: number;
}) {
  const setItem = (i: number, item: Condition | RuleGroup) =>
    onChange({ ...group, items: group.items.map((x, j) => (j === i ? item : x)) });
  const removeItem = (i: number) => onChange({ ...group, items: group.items.filter((_, j) => j !== i) });

  return (
    <div className={cn('space-y-2 rounded-lg border p-3', depth > 0 && 'bg-muted/30')}>
      <div className="flex items-center gap-2">
        {group.items.length > 1 || depth > 0 ? (
          <div className="inline-flex rounded-md border p-0.5 text-xs">
            {(['and', 'or'] as const).map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => onChange({ ...group, op })}
                className={cn(
                  'rounded px-2 py-0.5',
                  group.op === op ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
              >
                {op === 'and' ? 'All of' : 'Any of'}
              </button>
            ))}
          </div>
        ) : null}
        <span className="flex-1" />
        {onRemove && (
          <Button variant="ghost" size="icon-sm" aria-label="Remove group" onClick={onRemove}>
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>

      {group.items.map((item, i) => (
        <div key={i}>
          {i > 0 && (
            <p className="py-1 text-center text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              {group.op}
            </p>
          )}
          {isRuleGroup(item) ? (
            <GroupEditor group={item} onChange={(g) => setItem(i, g)} onRemove={() => removeItem(i)} depth={depth + 1} />
          ) : (
            <ConditionRow condition={item} onChange={(c) => setItem(i, c)} onRemove={() => removeItem(i)} />
          )}
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <AddConditionMenu onAdd={(t) => onChange({ ...group, items: [...group.items, createCondition(t)] })} />
        {depth < MAX_DEPTH - 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({
                ...group,
                items: [...group.items, { op: group.op === 'and' ? 'or' : 'and', items: [] }],
              })
            }
          >
            <FolderPlus className="size-4" /> Add group
          </Button>
        )}
      </div>
    </div>
  );
}

function AddConditionMenu({ onAdd }: { onAdd: (t: ConditionType) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <Plus className="size-4" /> Add condition
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60">
        {CONDITION_GROUPS.map((g, gi) => (
          <DropdownMenuGroup key={g.label}>
            {gi > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{g.label}</DropdownMenuLabel>
            {g.types.map((t) => (
              <DropdownMenuItem key={t} onClick={() => onAdd(t)}>
                {CONDITION_LABELS[t]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const PAGE_TYPE_OPTIONS = PAGE_TYPES.map((p) => ({ value: p, label: PAGE_TYPE_LABELS[p] }));

const WEEKDAY_OPTIONS = [1, 2, 3, 4, 5, 6, 0].map((d) => ({ value: String(d), label: WEEKDAY_LABELS[d] }));
const FROM_HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: hourLabel(h) }));
const TO_HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({ value: String(i + 1), label: hourLabel(i + 1) }));

/** Dollar input over an integer-cents value. */
function DollarsInput({ cents, onChange }: { cents: number; onChange: (cents: number) => void }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-muted-foreground">$</span>
      <Input
        type="number"
        min={0}
        step="0.01"
        className="pl-6"
        defaultValue={(cents / 100).toFixed(2)}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n) && n >= 0) onChange(Math.round(n * 100));
        }}
      />
    </div>
  );
}

function ConditionRow({
  condition: c,
  onChange,
  onRemove,
}: {
  condition: Condition;
  onChange: (c: Condition) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2 rounded-md border bg-background p-2.5">
      <div className="flex items-center gap-2">
        <span className="flex-1 text-xs font-semibold">{CONDITION_LABELS[c.type]}</span>
        <div className="inline-flex rounded-md border p-0.5 text-xs">
          {[false, true].map((not) => (
            <button
              key={String(not)}
              type="button"
              onClick={() => onChange({ ...c, not })}
              className={cn(
                'rounded px-2 py-0.5',
                (c.not ?? false) === not ? 'bg-foreground text-background' : 'hover:bg-muted',
              )}
            >
              {not ? 'is not' : 'is'}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Remove condition" onClick={onRemove}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <ConditionValue condition={c} onChange={onChange} />
    </div>
  );
}

function ConditionValue({ condition: c, onChange }: { condition: Condition; onChange: (c: Condition) => void }) {
  switch (c.type) {
    case 'pageType':
      return (
        <ChipToggleGroup values={c.values} options={PAGE_TYPE_OPTIONS} onChange={(values) => onChange({ ...c, values })} />
      );
    case 'product':
    case 'collection':
    case 'tag':
    case 'customPage':
    case 'blogPost':
      return (
        <>
          <EntityMultiPicker kind={c.type} value={c.ids} onChange={(ids) => onChange({ ...c, ids })} />
          <p className="text-xs text-muted-foreground">
            {c.type === 'collection' || c.type === 'tag'
              ? `Matches product pages of products in the selected ${c.type === 'tag' ? 'tags' : 'collections'}.`
              : c.type === 'product'
                ? 'Matches while the visitor is on one of these product pages.'
                : 'Matches while the visitor is on one of these pages.'}
          </p>
        </>
      );
    case 'category':
      return (
        <>
          <EntityMultiPicker kind="category" value={c.ids} onChange={(ids) => onChange({ ...c, ids })} />
          <SwitchField
            label="Include subcategories"
            hint="Matches the category page and product pages in it."
            checked={c.includeDescendants ?? true}
            onChange={(includeDescendants) => onChange({ ...c, includeDescendants })}
          />
        </>
      );
    case 'path':
      return (
        <>
          <Input
            className="font-mono text-xs"
            value={c.patterns.join(', ')}
            placeholder="/products/*, /blog/**"
            onChange={(e) =>
              onChange({
                ...c,
                patterns: e.target.value.split(',').map((p) => p.trim()).filter(Boolean),
              })
            }
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated. <code>*</code> matches one path segment, <code>**</code> matches anything.
          </p>
        </>
      );
    case 'auth':
      return (
        <OptionSelect
          value={c.value}
          options={[
            { value: 'guest', label: 'Guest (not signed in)' },
            { value: 'loggedIn', label: 'Signed in' },
          ]}
          onChange={(value) => onChange({ ...c, value })}
        />
      );
    case 'customerRole':
      return <EntityMultiPicker kind="customerRole" value={c.keys} onChange={(keys) => onChange({ ...c, keys })} />;
    case 'creditAccount':
      return <p className="text-xs text-muted-foreground">Visitor has an approved credit account.</p>;
    case 'submittedAnyForm':
      return <p className="text-xs text-muted-foreground">Visitor has already submitted any popup form.</p>;
    case 'orderCount':
      return (
        <div className="grid grid-cols-2 gap-2">
          <OptionSelect
            value={c.op}
            options={[
              { value: 'eq', label: 'Exactly' },
              { value: 'gte', label: 'At least' },
              { value: 'lte', label: 'At most' },
            ]}
            onChange={(op) => onChange({ ...c, op })}
          />
          <NumberInput min={0} value={c.value} onChange={(v) => onChange({ ...c, value: v ?? 0 })} />
        </div>
      );
    case 'device':
      return (
        <ChipToggleGroup
          values={c.values}
          options={[
            { value: 'desktop', label: 'Desktop' },
            { value: 'tablet', label: 'Tablet' },
            { value: 'mobile', label: 'Mobile' },
          ]}
          onChange={(values) => onChange({ ...c, values })}
        />
      );
    case 'queryParam':
      return (
        <div className="grid grid-cols-2 gap-2">
          <Input
            className="font-mono text-xs"
            placeholder="utm_campaign"
            value={c.key}
            onChange={(e) => onChange({ ...c, key: e.target.value })}
          />
          <Input
            className="font-mono text-xs"
            placeholder="any value"
            value={c.value ?? ''}
            onChange={(e) => onChange({ ...c, value: e.target.value || undefined })}
          />
        </div>
      );
    case 'cartContainsProduct':
      return (
        <>
          <EntityMultiPicker kind="product" value={c.ids} onChange={(ids) => onChange({ ...c, ids })} />
          <p className="text-xs text-muted-foreground">Matches when any of these products is in the cart.</p>
        </>
      );
    case 'cartContainsCategory':
      return (
        <>
          <EntityMultiPicker kind="category" value={c.ids} onChange={(ids) => onChange({ ...c, ids })} />
          <SwitchField
            label="Include subcategories"
            checked={c.includeDescendants ?? true}
            onChange={(includeDescendants) => onChange({ ...c, includeDescendants })}
          />
        </>
      );
    case 'cartContainsOffer':
      return (
        <>
          <EntityMultiPicker kind="offer" value={c.ids} onChange={(ids) => onChange({ ...c, ids })} />
          <p className="text-xs text-muted-foreground">
            Matches when the cart has a product that triggers one of these (live) offers.
          </p>
        </>
      );
    case 'timeWindow':
      return (
        <>
          <ChipToggleGroup
            values={c.days.map(String)}
            options={WEEKDAY_OPTIONS}
            onChange={(days) => onChange({ ...c, days: days.map(Number) })}
          />
          {c.days.length === 0 && <p className="text-xs text-destructive">Pick at least one day.</p>}
          <div className="grid grid-cols-2 gap-2">
            <OptionSelect
              value={String(c.fromHour)}
              options={FROM_HOUR_OPTIONS}
              onChange={(v) => onChange({ ...c, fromHour: Number(v) })}
            />
            <OptionSelect value={String(c.toHour)} options={TO_HOUR_OPTIONS} onChange={(v) => onChange({ ...c, toHour: Number(v) })} />
          </div>
          <p className="text-xs text-muted-foreground">
            Store time (Sydney). A range like 10pm–6am wraps past midnight; midnight–midnight means all day.
          </p>
        </>
      );
    case 'utm':
      return (
        <>
          <div className="grid grid-cols-3 gap-2">
            {(['source', 'medium', 'campaign'] as const).map((k) => (
              <Input
                key={k}
                className="font-mono text-xs"
                placeholder={`utm_${k}`}
                value={c[k] ?? ''}
                onChange={(e) => onChange({ ...c, [k]: e.target.value || undefined })}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Taken from the link the visitor arrived on. Leave a box empty to match any value.
          </p>
        </>
      );
    case 'referrer':
      return (
        <>
          <Input
            className="font-mono text-xs"
            placeholder="google."
            value={c.hostContains}
            onChange={(e) => onChange({ ...c, hostContains: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Matches when the site the visitor came from contains this text (e.g. <code>facebook.</code>).
          </p>
        </>
      );
    case 'visitorType':
      return (
        <OptionSelect
          value={c.value}
          options={[
            { value: 'new', label: 'New visitor (first visit)' },
            { value: 'returning', label: 'Returning visitor' },
          ]}
          onChange={(value) => onChange({ ...c, value })}
        />
      );
    case 'cartSubtotal':
      return (
        <div className="grid grid-cols-2 gap-2">
          <OptionSelect
            value={c.op}
            options={[
              { value: 'gte', label: 'At least' },
              { value: 'lte', label: 'At most' },
            ]}
            onChange={(op) => onChange({ ...c, op })}
          />
          <DollarsInput cents={c.cents} onChange={(cents) => onChange({ ...c, cents })} />
        </div>
      );
    case 'cartItemCount':
      return (
        <div className="grid grid-cols-2 gap-2">
          <OptionSelect
            value={c.op}
            options={[
              { value: 'gte', label: 'At least' },
              { value: 'lte', label: 'At most' },
              { value: 'eq', label: 'Exactly' },
            ]}
            onChange={(op) => onChange({ ...c, op })}
          />
          <NumberInput min={0} value={c.value} onChange={(v) => onChange({ ...c, value: v ?? 0 })} />
        </div>
      );
  }
}
