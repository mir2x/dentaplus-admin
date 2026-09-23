'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Archive,
  Copy,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Settings2,
  Trash2,
} from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import type { AdminPopup, AdminPopupListItem, PopupSettings, PopupStatus, SystemPopupKey } from '@/types/popups';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Field, NumberInput, OptionSelect } from './form-bits';
import { EFFECTIVE_STATUS_STYLES, formatDollars } from './popup-utils';
import { cn } from '@/lib/utils';

const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'ARCHIVED', label: 'Archived' },
] as const;

const LAYOUT_LABELS = {
  modal: 'Modal',
  slideIn: 'Slide-in',
  bar: 'Bar',
  fullscreen: 'Full screen',
  teaser: 'Teaser tab',
} as const;

function pct(n: number, d: number) {
  return d ? `${((n / d) * 100).toFixed(1)}%` : '—';
}

export function EffectiveStatusBadge({ status }: { status: AdminPopupListItem['effectiveStatus'] }) {
  const s = EFFECTIVE_STATUS_STYLES[status];
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', s.className)}>{s.label}</span>
  );
}

export function PopupsView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]['value']>('all');
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [deleting, setDeleting] = useState<AdminPopupListItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading } = useQuery({
    queryKey: ['popups', status, debounced],
    queryFn: async () =>
      (
        await api.get<AdminPopupListItem[]>('/admin/popups', {
          params: { status: status === 'all' ? undefined : status, q: debounced || undefined },
        })
      ).data,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['popups'] });

  const setPopupStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PopupStatus }) => api.patch(`/admin/popups/${id}`, { status }),
    onSuccess: (_d, v) => {
      toast.success(
        v.status === 'ACTIVE' ? 'Popup published' : v.status === 'PAUSED' ? 'Popup paused' : 'Popup archived',
      );
      void refresh();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Update failed')),
  });

  const duplicate = useMutation({
    mutationFn: async (id: string) => (await api.post<AdminPopup>(`/admin/popups/${id}/duplicate`)).data,
    onSuccess: (p) => {
      toast.success('Popup duplicated');
      void refresh();
      router.push(`/popups/${p.id}`);
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Duplicate failed')),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/popups/${id}`),
    onSuccess: () => {
      toast.success('Popup deleted');
      setDeleting(null);
      void refresh();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Delete failed')),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input className="max-w-xs" placeholder="Search popups…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="w-44">
          <OptionSelect value={status} options={STATUS_FILTERS} onChange={setStatus} />
        </div>
        <span className="flex-1" />
        <Button variant="outline" onClick={() => setSettingsOpen(true)}>
          <Settings2 className="size-4" /> Settings
        </Button>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" /> New popup
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Preview</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Layout</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead className="text-center">Priority</TableHead>
              <TableHead className="text-right">Shown (30d)</TableHead>
              <TableHead className="text-right">Click rate</TableHead>
              <TableHead className="text-right">Sign-ups</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 12 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.length ? (
              data.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => router.push(`/popups/${p.id}`)}>
                  <TableCell>
                    {p.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.thumbnailUrl} alt="" className="h-10 w-20 rounded border object-cover" />
                    ) : (
                      <div className="h-10 w-20 rounded border bg-muted" />
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{p.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {p.slug}
                      {p.variantCount > 1 && ` · ${p.variantCount} variants`}
                    </p>
                  </TableCell>
                  <TableCell>
                    <EffectiveStatusBadge status={p.effectiveStatus} />
                  </TableCell>
                  <TableCell className="text-sm">{LAYOUT_LABELS[p.layout]}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.startsAt || p.endsAt ? (
                      <>
                        {p.startsAt ? formatDate(p.startsAt) : 'Now'} → {p.endsAt ? formatDate(p.endsAt) : 'No end'}
                      </>
                    ) : (
                      'Always'
                    )}
                  </TableCell>
                  <TableCell className="text-center">{p.priority}</TableCell>
                  <TableCell className="text-right">{p.stats30d.shown.toLocaleString('en-AU')}</TableCell>
                  <TableCell className="text-right">{pct(p.stats30d.clicked, p.stats30d.shown)}</TableCell>
                  <TableCell className="text-right">{p.stats30d.submitted.toLocaleString('en-AU')}</TableCell>
                  <TableCell className="text-right">{p.stats30d.orders.toLocaleString('en-AU')}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatDollars(p.stats30d.revenueCents)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Actions" />}>
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => router.push(`/popups/${p.id}`)}>
                          <Pencil className="size-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicate.mutate(p.id)}>
                          <Copy className="size-4" /> Duplicate
                        </DropdownMenuItem>
                        {p.status === 'ACTIVE' ? (
                          <DropdownMenuItem onClick={() => setPopupStatus.mutate({ id: p.id, status: 'PAUSED' })}>
                            <Pause className="size-4" /> Pause
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => setPopupStatus.mutate({ id: p.id, status: 'ACTIVE' })}>
                            <Play className="size-4" /> {p.status === 'DRAFT' ? 'Publish' : 'Resume'}
                          </DropdownMenuItem>
                        )}
                        {p.status !== 'ARCHIVED' && (
                          <DropdownMenuItem onClick={() => setPopupStatus.mutate({ id: p.id, status: 'ARCHIVED' })}>
                            <Archive className="size-4" /> Archive
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleting(p)}>
                          <Trash2 className="size-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={12} className="py-10 text-center text-sm text-muted-foreground">
                  No popups yet.{' '}
                  <button type="button" className="text-primary hover:underline" onClick={() => setCreating(true)}>
                    Create your first popup
                  </button>
                  .
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Stats cover the last 30 days. Orders and revenue are credited to the last popup a customer interacted with in
        the 7 days before ordering. Email sign-ups are listed under{' '}
        <Link href="/popup-submissions" className="text-primary hover:underline">
          Popup Submissions
        </Link>
        .
      </p>

      <BuiltInPopupsSection />

      <CreatePopupDialog open={creating} onOpenChange={setCreating} />
      <PopupSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete popup?</DialogTitle>
            <DialogDescription>
              &ldquo;{deleting?.name}&rdquo; and all its analytics and form submissions will be permanently deleted.
              Archive it instead to keep the data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => deleting && remove.mutate(deleting.id)}
            >
              {remove.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreatePopupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [name, setName] = useState('');

  const create = useMutation({
    mutationFn: async () => (await api.post<AdminPopup>('/admin/popups', { name: name.trim() })).data,
    onSuccess: (p) => {
      onOpenChange(false);
      setName('');
      router.push(`/popups/${p.id}`);
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not create popup')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New popup</DialogTitle>
          <DialogDescription>Give it an internal name — visitors never see it.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) create.mutate();
          }}
          className="space-y-4"
        >
          <Input autoFocus placeholder="e.g. Implant week — 10% off" value={name} onChange={(e) => setName(e.target.value)} />
          <DialogFooter>
            <Button type="submit" disabled={!name.trim() || create.isPending}>
              {create.isPending ? 'Creating…' : 'Create & edit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PopupSettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['popup-settings'],
    queryFn: async () => (await api.get<PopupSettings>('/admin/popups/settings')).data,
    enabled: open,
  });
  const [draft, setDraft] = useState<PopupSettings | null>(null);
  const value = draft ?? data;

  const save = useMutation({
    mutationFn: async (v: PopupSettings) => (await api.patch<PopupSettings>('/admin/popups/settings', v)).data,
    onSuccess: (v) => {
      queryClient.setQueryData(['popup-settings'], v);
      toast.success('Popup settings saved');
      setDraft(null);
      onOpenChange(false);
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Save failed')),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setDraft(null);
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Popup settings</DialogTitle>
          <DialogDescription>Site-wide limits that stop visitors being flooded with popups.</DialogDescription>
        </DialogHeader>
        {value ? (
          <div className="space-y-4">
            <Field label="Minimum seconds between two popups">
              <NumberInput
                min={0}
                max={3600}
                value={value.minGapSeconds}
                onChange={(v) => setDraft({ ...value, minGapSeconds: v ?? 0 })}
              />
            </Field>
            <Field label="Maximum popups per visit">
              <NumberInput
                min={1}
                max={20}
                value={value.maxPerSession}
                onChange={(v) => setDraft({ ...value, maxPerSession: v ?? 1 })}
              />
            </Field>
          </div>
        ) : (
          <Skeleton className="h-24 w-full" />
        )}
        <DialogFooter>
          <Button disabled={!draft || save.isPending} onClick={() => draft && save.mutate(draft)}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const SYSTEM_DESCRIPTIONS: Record<SystemPopupKey, string> = {
  'offer-unlocked': 'Celebration shown when a cart offer is unlocked',
  'sign-in-panel': 'Promo panel on the sign-in page',
  'cookie-consent': 'Cookie notice shown until accepted',
};

/** Built-in popups: fixed placements whose content the admin can take over. */
function BuiltInPopupsSection() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['popups', 'system'],
    queryFn: async () => (await api.get<AdminPopupListItem[]>('/admin/popups', { params: { system: true } })).data,
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PopupStatus }) => api.patch(`/admin/popups/${id}`, { status }),
    onSuccess: (_d, v) => {
      toast.success(v.status === 'ACTIVE' ? 'Now using your version' : 'Back to the original built-in version');
      void queryClient.invalidateQueries({ queryKey: ['popups'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Update failed')),
  });

  return (
    <section className="space-y-2 pt-4">
      <div>
        <h2 className="text-base font-semibold">Built-in popups</h2>
        <p className="text-xs text-muted-foreground">
          Popups the site shows in fixed places. Edit and activate one to replace the original; pause it to go back.
        </p>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Popup</TableHead>
              <TableHead>Where</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Shown (30d)</TableHead>
              <TableHead className="text-right">Click rate</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              </TableRow>
            ) : data?.length ? (
              data.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => router.push(`/popups/${p.id}`)}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.systemKey ? SYSTEM_DESCRIPTIONS[p.systemKey] : '—'}
                  </TableCell>
                  <TableCell>
                    {p.status === 'ACTIVE' ? (
                      <EffectiveStatusBadge status={p.effectiveStatus} />
                    ) : (
                      <span className="text-xs text-muted-foreground">Using original</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{p.stats30d.shown.toLocaleString('en-AU')}</TableCell>
                  <TableCell className="text-right">{pct(p.stats30d.clicked, p.stats30d.shown)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()} className="space-x-1 text-right">
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/popups/${p.id}`)}>
                      <Pencil className="size-3.5" /> Edit
                    </Button>
                    {p.status === 'ACTIVE' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={setStatus.isPending}
                        onClick={() => setStatus.mutate({ id: p.id, status: 'PAUSED' })}
                      >
                        <Pause className="size-3.5" /> Pause
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={setStatus.isPending}
                        onClick={() => setStatus.mutate({ id: p.id, status: 'ACTIVE' })}
                      >
                        <Play className="size-3.5" /> Activate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                  No built-in popups found — run the latest database migration.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
