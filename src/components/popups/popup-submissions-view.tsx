'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Download, Minus } from 'lucide-react';
import { api } from '@/lib/api';
import type { PaginatedResponse } from '@/types/api';
import type { PopupSubmission } from '@/types/popups';
import { formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PaginationControls } from '@/components/ui/pagination-controls';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const LIMIT = 20;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Popup form submissions — all popups (sidebar page) or one popup (editor tab). */
export function PopupSubmissionsView({ popupId }: { popupId?: string }) {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading } = useQuery({
    queryKey: ['popup-submissions', popupId ?? 'all', debounced, page],
    queryFn: async () =>
      (
        await api.get<PaginatedResponse<PopupSubmission>>('/admin/popups/submissions', {
          params: { popupId, q: debounced || undefined, page, limit: LIMIT },
        })
      ).data,
    placeholderData: keepPreviousData,
  });

  async function exportCsv() {
    try {
      const res = await api.get('/admin/popups/submissions/export', {
        params: { popupId },
        responseType: 'blob',
      });
      downloadBlob(res.data, popupId ? `popup-${popupId}-submissions.csv` : 'popup-submissions.csv');
    } catch {
      toast.error('Export failed');
    }
  }

  const rows = data?.data ?? [];
  const extraKeys = [...new Set(rows.flatMap((r) => Object.keys(r.fields ?? {})))].filter((k) => k !== 'email');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input className="max-w-xs" placeholder="Search email…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="flex-1" />
        <Button variant="outline" onClick={() => void exportCsv()}>
          <Download className="size-4" /> Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              {extraKeys.map((k) => (
                <TableHead key={k} className="capitalize">
                  {k}
                </TableHead>
              ))}
              {!popupId && <TableHead>Popup</TableHead>}
              <TableHead className="text-center">Consent</TableHead>
              <TableHead>Opt-in</TableHead>
              <TableHead>Coupon</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Page</TableHead>
              <TableHead>Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: popupId ? 7 : 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length ? (
              rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.email}</TableCell>
                  {extraKeys.map((k) => (
                    <TableCell key={k} className="max-w-48 truncate text-sm">
                      {s.fields?.[k] ?? '—'}
                    </TableCell>
                  ))}
                  {!popupId && (
                    <TableCell className="text-sm">
                      <Link href={`/popups/${s.popup.id}`} className="hover:underline">
                        {s.popup.name}
                      </Link>
                    </TableCell>
                  )}
                  <TableCell className="text-center">
                    {s.consent ? (
                      <Check className="mx-auto size-4 text-emerald-600" />
                    ) : (
                      <Minus className="mx-auto size-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>
                    <OptInBadge value={s.optIn} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{s.couponCode ?? '—'}</TableCell>
                  <TableCell className="text-sm">
                    {s.userId ? (
                      <Link href={`/customers/${s.userId}`} className="hover:underline">
                        View
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Guest</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-40 truncate font-mono text-xs">{s.path ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDateTime(s.createdAt)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9 + extraKeys.length} className="py-8 text-center text-sm text-muted-foreground">
                  No submissions yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.meta.pages > 1 && (
        <PaginationControls
          page={page}
          pages={data.meta.pages}
          total={data.meta.total}
          limit={LIMIT}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

function OptInBadge({ value }: { value: PopupSubmission['optIn'] }) {
  if (!value) return <span className="text-xs text-muted-foreground">—</span>;
  return value === 'confirmed' ? (
    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
      Confirmed
    </span>
  ) : (
    <span
      className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
      title="Hasn't clicked the confirmation link yet — no coupon issued"
    >
      Pending
    </span>
  );
}
