'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, ExternalLink, Info, Pause, Play, Plus, Save, Trash2, TriangleAlert } from 'lucide-react';
import axios from 'axios';
import { api, getApiErrorMessage } from '@/lib/api';
import { STOREFRONT_URL } from '@/lib/storefront';
import type { AdminPopup, PopupDesign, PopupStatus, PopupVariant, SystemPopupKey } from '@/types/popups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { BlockList } from './block-builder';
import { DesignEditor } from './design-editor';
import { Field, NumberInput, SwitchField } from './form-bits';
import { PopupAnalytics } from './popup-analytics';
import { PopupPreviewFrame } from './popup-preview-frame';
import { PopupSubmissionsView } from './popup-submissions-view';
import { RulesEditor } from './rule-builder';
import { WhenEditor } from './when-editor';
import { EffectiveStatusBadge } from './popups-view';

const TABS = [
  { key: 'content', label: 'Content' },
  { key: 'design', label: 'Design' },
  { key: 'rules', label: 'Where & who' },
  { key: 'when', label: 'When' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'submissions', label: 'Submissions' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

/** Rules/triggers/schedule don't apply to built-ins — they render in fixed places. */
const SYSTEM_HIDDEN_TABS: TabKey[] = ['rules', 'when'];

const SYSTEM_NOTES: Record<SystemPopupKey, { where: string; tips: string[] }> = {
  'offer-unlocked': {
    where: 'Shown the moment a cart offer threshold is crossed (e.g. the 3rd item of "Buy 3 get 1 free").',
    tips: [
      'Use {reward} for what was unlocked (e.g. "1 free item") and {offer} for the offer name — in headings, text and button labels.',
      'Add a button with the "Close the popup" action so customers can continue shopping.',
    ],
  },
  'sign-in-panel': {
    where: 'Replaces the blue promo panel on the left of the /sign-in page (desktop only). Shown inline — no overlay.',
    tips: [
      'Background colour, text colour and padding come from the Design tab.',
      'Images, headings, text and buttons all work here; forms are not recommended on the sign-in page.',
    ],
  },
  'cookie-consent': {
    where: 'Shown on every page until the visitor accepts. It does not count toward popup limits.',
    tips: [
      'Include a button with the action "Accept & close (cookie consent)" — that is what records consent.',
      'Link to your cookie policy (/cookie-policy) in the text.',
    ],
  },
};

/** Fields sent on save — everything the editor can change. */
function toPayload(p: AdminPopup) {
  return {
    name: p.name,
    slug: p.slug,
    priority: p.priority,
    startsAt: p.startsAt,
    endsAt: p.endsAt,
    design: p.design,
    rules: p.rules,
    triggers: p.triggers,
    frequency: p.frequency,
    variants: p.variants.map((v) => ({
      ...(v.id ? { id: v.id } : {}),
      name: v.name,
      weight: v.weight,
      blocks: v.blocks,
      design: v.design,
    })),
  };
}

function errorLines(err: unknown): string[] {
  if (axios.isAxiosError(err)) {
    const m = err.response?.data?.message;
    if (Array.isArray(m)) return m.map(String);
    if (typeof m === 'string') return [m];
  }
  return ['Save failed'];
}

export function PopupEditor({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const { data: saved, isLoading, error } = useQuery({
    queryKey: ['popup', id],
    queryFn: async () => (await api.get<AdminPopup>(`/admin/popups/${id}`)).data,
  });

  const [draft, setDraft] = useState<AdminPopup | null>(null);
  const [tab, setTab] = useState<TabKey>('content');
  const [variantIdx, setVariantIdx] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  // Seed the draft from the server copy (first load and after each save).
  const [seededFrom, setSeededFrom] = useState<string | null>(null);
  if (saved && seededFrom !== saved.updatedAt) {
    setSeededFrom(saved.updatedAt);
    setDraft(structuredClone(saved));
  }

  const dirty = useMemo(
    () => !!saved && !!draft && JSON.stringify(toPayload(saved)) !== JSON.stringify(toPayload(draft)),
    [saved, draft],
  );

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const save = useMutation({
    mutationFn: async ({ status }: { status?: PopupStatus }) => {
      if (!draft) throw new Error('No draft');
      const body = { ...toPayload(draft), ...(status ? { status } : {}) };
      return (await api.patch<AdminPopup>(`/admin/popups/${id}`, body)).data;
    },
    onSuccess: (p, { status }) => {
      setErrors([]);
      queryClient.setQueryData(['popup', id], p);
      void queryClient.invalidateQueries({ queryKey: ['popups'] });
      setVariantIdx((i) => Math.min(i, p.variants.length - 1));
      toast.success(status === 'ACTIVE' ? 'Published' : status === 'PAUSED' ? 'Paused' : 'Saved');
    },
    onError: (err) => {
      setErrors(errorLines(err));
      toast.error('Could not save — see the errors above the editor');
    },
  });

  const openOnSite = useMutation({
    mutationFn: async () => {
      if (dirty) await save.mutateAsync({});
      return (await api.post<{ token: string }>(`/admin/popups/${id}/preview-token`)).data;
    },
    onSuccess: ({ token }) => window.open(`${STOREFRONT_URL}/?popup_preview=${encodeURIComponent(token)}`, '_blank'),
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not open preview')),
  });

  if (isLoading) return <Skeleton className="h-[600px] w-full" />;
  if (error || !saved) return <p className="text-sm text-destructive">Popup not found.</p>;
  if (!draft) return null;

  const systemKey = draft.systemKey;
  const tabs = systemKey ? TABS.filter((t) => !SYSTEM_HIDDEN_TABS.includes(t.key)) : TABS;
  const variant = draft.variants[Math.min(variantIdx, draft.variants.length - 1)];
  const setVariant = (v: PopupVariant) =>
    setDraft({ ...draft, variants: draft.variants.map((x, i) => (i === variantIdx ? v : x)) });
  const totalWeight = draft.variants.reduce((s, v) => s + (v.weight || 0), 0);
  const wide = tab === 'analytics' || tab === 'submissions';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/popups"
          onClick={(e) => {
            if (dirty && !confirm('Discard unsaved changes?')) e.preventDefault();
          }}
          className="rounded-md p-1.5 hover:bg-muted"
          aria-label="Back to popups"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <Input
          className="h-9 max-w-sm text-base font-semibold"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        <EffectiveStatusBadge status={saved.effectiveStatus} />
        {dirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
        <span className="flex-1" />
        <Button variant="outline" disabled={openOnSite.isPending} onClick={() => openOnSite.mutate()}>
          <ExternalLink className="size-4" /> Preview on site
        </Button>
        <Button variant="outline" disabled={!dirty || save.isPending} onClick={() => save.mutate({})}>
          <Save className="size-4" /> Save
        </Button>
        {saved.status === 'ACTIVE' ? (
          <Button variant="secondary" disabled={save.isPending} onClick={() => save.mutate({ status: 'PAUSED' })}>
            <Pause className="size-4" /> Pause
          </Button>
        ) : (
          <Button disabled={save.isPending} onClick={() => save.mutate({ status: 'ACTIVE' })}>
            <Play className="size-4" /> {saved.systemKey ? 'Activate' : saved.status === 'DRAFT' ? 'Publish' : 'Resume'}
          </Button>
        )}
      </div>

      {systemKey && (
        <div className="rounded-md border border-sky-300/60 bg-sky-50 p-3 text-sm dark:border-sky-800 dark:bg-sky-950/40">
          <p className="flex items-center gap-1.5 font-medium">
            <Info className="size-4" /> Built-in popup
          </p>
          <p className="mt-1 text-xs">{SYSTEM_NOTES[systemKey].where}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
            {SYSTEM_NOTES[systemKey].tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
            <li>While it is not live, the site keeps using its original built-in version.</li>
          </ul>
        </div>
      )}

      {errors.length > 0 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <p className="mb-1 flex items-center gap-1.5 font-medium text-destructive">
            <TriangleAlert className="size-4" /> Fix these before saving:
          </p>
          <ul className="list-disc space-y-0.5 pl-5 font-mono text-xs">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap',
              tab === t.key
                ? 'border-primary font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {wide ? (
        tab === 'analytics' ? (
          <PopupAnalytics popupId={id} />
        ) : (
          <PopupSubmissionsView popupId={id} />
        )
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="min-w-0 space-y-4">
            {tab === 'content' && (
              <>
                <div className="space-y-3 rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {draft.variants.map((v, i) => (
                      <button
                        key={v.id ?? `new-${i}`}
                        type="button"
                        onClick={() => setVariantIdx(i)}
                        className={cn(
                          'rounded-md border px-2.5 py-1 text-xs',
                          i === variantIdx ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
                        )}
                      >
                        {v.name || `Variant ${i + 1}`}
                        {draft.variants.length > 1 && totalWeight > 0 && (
                          <span className="ml-1 opacity-70">{Math.round(((v.weight || 0) / totalWeight) * 100)}%</span>
                        )}
                      </button>
                    ))}
                    {draft.variants.length < 4 && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => {
                          const next: PopupVariant = {
                            name: String.fromCharCode(65 + draft.variants.length),
                            weight: 100,
                            blocks: structuredClone(variant.blocks),
                            design: variant.design ? { ...variant.design } : null,
                          };
                          setDraft({ ...draft, variants: [...draft.variants, next] });
                          setVariantIdx(draft.variants.length);
                        }}
                      >
                        <Plus className="size-3" /> A/B variant
                      </Button>
                    )}
                  </div>
                  {draft.variants.length > 1 && (
                    <div className="grid grid-cols-[1fr_7rem_auto] items-end gap-2">
                      <Field label="Variant name">
                        <Input value={variant.name} onChange={(e) => setVariant({ ...variant, name: e.target.value })} />
                      </Field>
                      <Field label="Traffic weight">
                        <NumberInput
                          min={0}
                          max={1000}
                          value={variant.weight}
                          onChange={(w) => setVariant({ ...variant, weight: w ?? 0 })}
                        />
                      </Field>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete variant"
                        onClick={() => {
                          setDraft({ ...draft, variants: draft.variants.filter((_, i) => i !== variantIdx) });
                          setVariantIdx(0);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                  {draft.variants.length > 1 && (
                    <p className="text-xs text-muted-foreground">
                      New variants start as a copy of the one you were on. Each visitor always sees the same variant.
                    </p>
                  )}
                </div>
                <BlockList blocks={variant.blocks} onChange={(blocks) => setVariant({ ...variant, blocks })} />
              </>
            )}
            {tab === 'design' && (
              <VariantDesignTab
                base={draft.design}
                onBaseChange={(design) => setDraft({ ...draft, design })}
                variant={variant}
                showVariantToggle={draft.variants.length > 1}
                onVariantChange={setVariant}
              />
            )}
            {tab === 'rules' && <RulesEditor value={draft.rules} onChange={(rules) => setDraft({ ...draft, rules })} />}
            {tab === 'when' && (
              <WhenEditor
                value={{
                  triggers: draft.triggers,
                  frequency: draft.frequency,
                  startsAt: draft.startsAt,
                  endsAt: draft.endsAt,
                  priority: draft.priority,
                  slug: draft.slug,
                }}
                onChange={(w) => setDraft({ ...draft, ...w })}
              />
            )}
          </div>
          <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
            <PopupPreviewFrame design={{ ...draft.design, ...(variant.design ?? {}) }} blocks={variant.blocks} />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Design tab: the popup's shared design, or — when "custom design for this
 * variant" is on — a per-variant override stored as a full design snapshot in
 * `variant.design` (a valid partial; the backend merges it over the base).
 */
function VariantDesignTab({
  base,
  onBaseChange,
  variant,
  showVariantToggle,
  onVariantChange,
}: {
  base: PopupDesign;
  onBaseChange: (d: PopupDesign) => void;
  variant: PopupVariant;
  showVariantToggle: boolean;
  onVariantChange: (v: PopupVariant) => void;
}) {
  const custom = !!variant.design;
  const label = variant.name || 'this variant';
  return (
    <div className="space-y-4">
      {(showVariantToggle || custom) && (
        <div className="space-y-1 rounded-lg border p-3">
          <SwitchField
            label={`Custom design for variant ${label}`}
            hint={
              custom
                ? `Changes below only affect variant ${label}. Turn off to go back to the shared design.`
                : 'Off: every variant uses the shared design below. Turn on to test a different look in this variant.'
            }
            checked={custom}
            onChange={(on) => onVariantChange({ ...variant, design: on ? { ...base, ...(variant.design ?? {}) } : null })}
          />
        </div>
      )}
      {custom ? (
        <DesignEditor
          value={{ ...base, ...variant.design }}
          onChange={(design) => onVariantChange({ ...variant, design })}
        />
      ) : (
        <DesignEditor value={base} onChange={onBaseChange} />
      )}
    </div>
  );
}
