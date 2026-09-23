'use client';

import type { PopupFrequency, Trigger, TriggerType } from '@/types/popups';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ChipToggleGroup, Field, NumberInput, OptionSelect } from './form-bits';
import { TRIGGER_LABELS, createTrigger } from './popup-utils';

const TRIGGER_TYPES = Object.keys(TRIGGER_LABELS) as TriggerType[];

const FREQUENCY_OPTIONS = [
  { value: 'oncePerSession', label: 'Once per visit' },
  { value: 'once', label: 'Only once, ever' },
  { value: 'everyNDays', label: 'At most every N days' },
  { value: 'maxTimes', label: 'Up to N times in total' },
  { value: 'always', label: 'Every time the trigger fires' },
] as const;

export interface WhenValue {
  triggers: Trigger[];
  frequency: PopupFrequency;
  startsAt: string | null;
  endsAt: string | null;
  priority: number;
  slug: string;
}

/** ISO → value for <input type="datetime-local"> in the browser's timezone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

function fromLocalInput(v: string): string | null {
  return v ? new Date(v).toISOString() : null;
}

export function WhenEditor({ value, onChange }: { value: WhenValue; onChange: (v: WhenValue) => void }) {
  const { triggers, frequency } = value;
  const has = (t: TriggerType) => triggers.some((x) => x.type === t);
  const setTrigger = (t: Trigger) => onChange({ ...value, triggers: triggers.map((x) => (x.type === t.type ? t : x)) });
  const toggle = (t: TriggerType, on: boolean) =>
    onChange({
      ...value,
      triggers: on ? [...triggers, createTrigger(t)] : triggers.filter((x) => x.type !== t),
    });
  const setFreq = (f: Partial<PopupFrequency>) => onChange({ ...value, frequency: { ...frequency, ...f } });

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Triggers</h3>
          <p className="text-xs text-muted-foreground">The popup opens when any selected trigger fires.</p>
        </div>
        {TRIGGER_TYPES.map((t) => {
          const current = triggers.find((x) => x.type === t);
          return (
            <div key={t} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm">{TRIGGER_LABELS[t]}</span>
                <Switch
                  checked={has(t)}
                  onCheckedChange={(on) => {
                    // At least one trigger is required.
                    if (!on && triggers.length === 1) return;
                    toggle(t, on);
                  }}
                />
              </div>
              {current?.type === 'delay' && (
                <Field label="Seconds after the page loads">
                  <NumberInput
                    min={1}
                    max={3600}
                    value={current.seconds}
                    onChange={(seconds) => setTrigger({ type: 'delay', seconds: seconds ?? 1 })}
                  />
                </Field>
              )}
              {current?.type === 'scroll' && (
                <Field label="Percent of the page scrolled">
                  <NumberInput
                    min={1}
                    max={100}
                    value={current.percent}
                    onChange={(percent) => setTrigger({ type: 'scroll', percent: percent ?? 50 })}
                  />
                </Field>
              )}
              {current?.type === 'exitIntent' && (
                <p className="text-xs text-muted-foreground">
                  Desktop: mouse leaves toward the browser bar. Mobile: quick scroll back up.
                </p>
              )}
              {current?.type === 'idle' && (
                <Field label="Seconds without any mouse, keyboard, scroll or touch activity">
                  <NumberInput
                    min={5}
                    max={3600}
                    value={current.seconds}
                    onChange={(seconds) => setTrigger({ type: 'idle', seconds: seconds ?? 30 })}
                  />
                </Field>
              )}
              {current?.type === 'pageViews' && (
                <Field label="Open on page number" hint="Counts pages viewed in this visit, e.g. 3 = on the third page.">
                  <NumberInput
                    min={1}
                    max={100}
                    value={current.count}
                    onChange={(count) => setTrigger({ type: 'pageViews', count: count ?? 3 })}
                  />
                </Field>
              )}
              {current?.type === 'cartValueReached' && (
                <Field label="Cart subtotal reaches ($)" hint="Fires once, when the subtotal goes over this amount.">
                  <Input
                    type="number"
                    min={0.01}
                    step="0.01"
                    defaultValue={(current.cents / 100).toFixed(2)}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isNaN(n) && n > 0) setTrigger({ type: 'cartValueReached', cents: Math.round(n * 100) });
                    }}
                  />
                </Field>
              )}
              {current?.type === 'addToCart' && (
                <p className="text-xs text-muted-foreground">Fires right after any product is added to the cart.</p>
              )}
              {current?.type === 'offerUnlocked' && (
                <p className="text-xs text-muted-foreground">
                  Fires when the cart crosses an offer&apos;s threshold (e.g. &ldquo;Buy 3 get 1 free&rdquo;).
                </p>
              )}
              {current?.type === 'login' && (
                <p className="text-xs text-muted-foreground">Fires once, straight after a guest signs in.</p>
              )}
              {current?.type === 'click' && (
                <p className="text-xs text-muted-foreground">
                  Add <code className="rounded bg-muted px-1">data-popup=&quot;{value.slug}&quot;</code> to any link or
                  button on the site (e.g. in a page or banner) to open this popup.
                </p>
              )}
            </div>
          );
        })}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">How often</h3>
        <Field label="Show">
          <OptionSelect value={frequency.mode} options={FREQUENCY_OPTIONS} onChange={(mode) => setFreq({ mode })} />
        </Field>
        {frequency.mode === 'everyNDays' && (
          <Field label="Days between showings">
            <NumberInput min={1} max={365} value={frequency.days ?? 7} onChange={(days) => setFreq({ days: days ?? 7 })} />
          </Field>
        )}
        {frequency.mode === 'maxTimes' && (
          <Field label="Maximum times per visitor">
            <NumberInput min={1} max={100} value={frequency.times ?? 3} onChange={(times) => setFreq({ times: times ?? 3 })} />
          </Field>
        )}
        <Field label="Stop showing after the visitor…" hint="Applies on top of the frequency above.">
          <ChipToggleGroup
            values={frequency.stopAfter}
            options={[
              { value: 'submit', label: 'Submits the form' },
              { value: 'click', label: 'Clicks a link/button' },
              { value: 'close', label: 'Closes it' },
            ]}
            onChange={(stopAfter) => setFreq({ stopAfter })}
          />
        </Field>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Schedule</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts" hint="Empty = as soon as it's published.">
            <Input
              type="datetime-local"
              value={toLocalInput(value.startsAt)}
              onChange={(e) => onChange({ ...value, startsAt: fromLocalInput(e.target.value) })}
            />
          </Field>
          <Field label="Ends" hint="Empty = runs until paused.">
            <Input
              type="datetime-local"
              value={toLocalInput(value.endsAt)}
              onChange={(e) => onChange({ ...value, endsAt: fromLocalInput(e.target.value) })}
            />
          </Field>
        </div>
        {value.startsAt && value.endsAt && value.endsAt <= value.startsAt && (
          <p className="text-xs text-destructive">End must be after start.</p>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Advanced</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Priority" hint="When several popups qualify, the highest wins.">
            <NumberInput value={value.priority} onChange={(priority) => onChange({ ...value, priority: priority ?? 0 })} />
          </Field>
          <Field label="Slug" hint="Used by data-popup click triggers.">
            <Input
              className="font-mono text-xs"
              value={value.slug}
              onChange={(e) =>
                onChange({ ...value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })
              }
            />
          </Field>
        </div>
      </section>
    </div>
  );
}
