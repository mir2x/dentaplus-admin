'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CreditApplication, PaginatedResponse } from '@/types/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import { CreditApplicationDetailSheet } from './credit-application-detail-sheet';

const STATUS_VARIANT = {
  PENDING: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
} as const;

export function CreditApplicationsView() {
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<CreditApplication | null>(null);

  const { data, isLoading } = useQuery<PaginatedResponse<CreditApplication>>({
    queryKey: ['credit-applications', status],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (status !== 'all') params.status = status;
      return (await api.get('/admin/credit-applications', { params })).data;
    },
  });

  return (
    <div className="space-y-4">
      <Select value={status} onValueChange={(v) => setStatus(v ?? 'all')}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="PENDING">Pending</SelectItem>
          <SelectItem value="APPROVED">Approved</SelectItem>
          <SelectItem value="REJECTED">Rejected</SelectItem>
        </SelectContent>
      </Select>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead>ABN</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.data.length ? (
              data.data.map((app) => (
                <TableRow
                  key={app.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(app)}
                >
                  <TableCell className="font-medium">
                    {app.registeredBusinessName}
                    {app.tradingName && (
                      <span className="text-muted-foreground"> · {app.tradingName}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{app.abn}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{app.email}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(app.submittedAt)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={STATUS_VARIANT[app.status]}>{app.status}</Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No applications
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <CreditApplicationDetailSheet
        applicationId={selected?.id ?? null}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
