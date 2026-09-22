'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PaginatedResponse, Statement } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PaginationControls } from '@/components/ui/pagination-controls';

interface GenerateResult {
  created: number;
  candidates: number;
  periodFrom: string;
  periodTo: string;
}

interface AdminStatement extends Statement {
  currency: string;
  customer: { id: string; email: string; displayName: string | null };
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(value);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function StatementsView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const statements = useQuery<PaginatedResponse<AdminStatement>>({
    queryKey: ['statements', search, page],
    queryFn: async () =>
      (
        await api.get('/admin/statements', {
          params: { search: search || undefined, page, limit: 20 },
        })
      ).data,
  });

  const generate = useMutation({
    mutationFn: async () =>
      (await api.post('/admin/statements/generate-monthly')).data as GenerateResult,
    onSuccess: (d) => {
      toast.success(`Generated ${d.created} statement(s) of ${d.candidates} customer(s) with balances`);
      queryClient.invalidateQueries({ queryKey: ['accounts-receivable'] });
      queryClient.invalidateQueries({ queryKey: ['statements'] });
    },
    onError: () => toast.error('Statement generation failed'),
  });

  async function download(path: string, filename: string) {
    try {
      const response = await api.get(path, { responseType: 'blob' });
      downloadBlob(response.data, filename);
    } catch {
      toast.error('Download failed');
    }
  }

  const send = useMutation({
    mutationFn: (id: string) => api.post(`/admin/statements/${id}/send`),
    onSuccess: () => {
      toast.success('Statement emailed to customer');
      queryClient.invalidateQueries({ queryKey: ['statements'] });
    },
    onError: () => toast.error('Failed to send statement'),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly statements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Statements are generated automatically on the 1st of each month for every customer
            with unpaid or partially-paid invoices, rolling the balance forward. You can also
            generate this month&apos;s statements now. Each generated statement is stored and can be
            downloaded below as a PDF, or sent to the customer with the Send button. Use CSV to
            export the statement register to Excel.
          </p>
          <Button disabled={generate.isPending} onClick={() => generate.mutate()}>
            {generate.isPending ? 'Generating…' : 'Generate this month’s statements'}
          </Button>
          {generate.data && (
            <p className="text-muted-foreground">
              Last run: created <strong>{generate.data.created}</strong> of{' '}
              {generate.data.candidates} customers with outstanding balances.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Generated statements</CardTitle>
          <Button
            variant="outline"
            onClick={() => void download('/admin/statements/export.csv', 'statements.csv')}
          >
            <Download className="size-4" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={search}
            placeholder="Search statement, customer, or email…"
            className="max-w-sm"
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Statement</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Closing balance</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statements.data?.data.map((statement) => (
                  <TableRow key={statement.id}>
                    <TableCell className="font-medium">{statement.statementNo}</TableCell>
                    <TableCell>
                      <div>{statement.customer.displayName || statement.customer.email}</div>
                      {statement.customer.displayName && (
                        <div className="text-xs text-muted-foreground">{statement.customer.email}</div>
                      )}
                    </TableCell>
                    <TableCell>{new Date(statement.statementDate).toLocaleDateString('en-AU')}</TableCell>
                    <TableCell>
                      {statement.periodFrom && statement.periodTo
                        ? `${new Date(statement.periodFrom).toLocaleDateString('en-AU')} – ${new Date(statement.periodTo).toLocaleDateString('en-AU')}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {money(statement.closingBalance, statement.currency)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {statement.sentAt ? new Date(statement.sentAt).toLocaleDateString('en-AU') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={send.isPending}
                        onClick={() => send.mutate(statement.id)}
                      >
                        <Mail className="size-3.5" /> Send
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          void download(
                            `/admin/statements/${statement.id}/pdf`,
                            `${statement.statementNo}.pdf`,
                          )
                        }
                      >
                        PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!statements.isLoading && statements.data?.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No statements found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {statements.data && (
              <div className="border-t px-3">
                <PaginationControls
                  page={statements.data.meta.page}
                  pages={statements.data.meta.pages}
                  total={statements.data.meta.total}
                  limit={statements.data.meta.limit}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
