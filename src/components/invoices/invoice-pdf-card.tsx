'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, Trash2, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { AdminInvoiceDetail } from '@/types/api';
import { Button } from '@/components/ui/button';

export function InvoicePdfCard({ invoice }: { invoice: AdminInvoiceDetail }) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['invoice', invoice.id] });

  async function handleFile(file: File) {
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are accepted');
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post(`/admin/invoices/${invoice.id}/pdf`, form);
      toast.success(invoice.hasPdf ? 'PDF replaced' : 'PDF uploaded');
      invalidate();
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const remove = useMutation({
    mutationFn: () => api.delete(`/admin/invoices/${invoice.id}/pdf`),
    onSuccess: () => {
      toast.success('PDF removed');
      invalidate();
    },
    onError: () => toast.error('Failed to remove PDF'),
  });

  async function download() {
    const res = await api.get(`/admin/invoices/${invoice.id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.invoiceNo}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-lg border p-4 space-y-3">
      <p className="text-sm font-medium">PDF</p>

      {invoice.hasPdf ? (
        <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
          <span className="text-muted-foreground">{invoice.invoiceNo}.pdf</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={download}>
              <Download className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={remove.isPending}
              onClick={() => remove.mutate()}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No PDF uploaded yet.</p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="size-4" />
        {uploading ? 'Uploading…' : invoice.hasPdf ? 'Replace PDF' : 'Upload PDF'}
      </Button>
    </section>
  );
}
