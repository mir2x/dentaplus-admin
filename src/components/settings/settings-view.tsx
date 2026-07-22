'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const EMAIL_EXPORT_RANGES = [
  { value: 'day', label: 'Last day' },
  { value: 'week', label: 'Last week' },
  { value: 'month', label: 'Last month' },
  { value: 'year', label: 'Last year' },
  { value: 'all', label: 'All time' },
] as const;

interface Settings {
  gstDivisor: number;
  invoiceDueDays: number;
  backOrderReplyDays: number;
  cataloguePdfUrl: string | null;
  siteLogoUrl: string | null;
  faviconUrl: string | null;
  siteTitle: string | null;
}

type NumericSettingKeys = keyof Omit<
  Settings,
  'cataloguePdfUrl' | 'siteLogoUrl' | 'faviconUrl' | 'siteTitle'
>;

const FIELDS: { key: NumericSettingKeys; label: string; hint: string }[] = [
  { key: 'gstDivisor', label: 'GST divisor', hint: 'Tax extracted from GST-inclusive totals (11 = 10% GST)' },
  { key: 'invoiceDueDays', label: 'Invoice due (days)', hint: 'Default payment terms for new invoices' },
  { key: 'backOrderReplyDays', label: 'Back order reply window (days)', hint: 'Auto-decline a back order if the customer hasn’t replied within this many days' },
];

export function SettingsView() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const faviconFileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [emailRange, setEmailRange] = useState<(typeof EMAIL_EXPORT_RANGES)[number]['value']>('month');
  const [exportingEmails, setExportingEmails] = useState(false);
  // Edits overlay the fetched values, so we never copy server state into an effect.
  const [edits, setEdits] = useState<Partial<Settings>>({});

  const { data, isLoading } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/admin/settings')).data,
  });

  const save = useMutation({
    mutationFn: (body: Settings) => api.patch('/admin/settings', body),
    onSuccess: () => {
      toast.success('Settings saved');
      setEdits({});
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: () => toast.error('Failed to save settings'),
  });

  async function handlePdfUpload(file: File) {
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'catalogues');
      const { data: uploaded } = await api.post('/admin/upload', form);
      setEdits((prev) => ({ ...prev, cataloguePdfUrl: uploaded.url }));
      toast.success('PDF uploaded. Remember to save settings!');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleLogoUpload(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      return;
    }
    setUploadingLogo(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'branding');
      const { data: uploaded } = await api.post('/admin/upload', form);
      setEdits((prev) => ({ ...prev, siteLogoUrl: uploaded.url }));
      toast.success('Logo uploaded. Remember to save settings!');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploadingLogo(false);
      if (logoFileRef.current) logoFileRef.current.value = '';
    }
  }

  async function handleFaviconUpload(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      return;
    }
    setUploadingFavicon(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'branding');
      const { data: uploaded } = await api.post('/admin/upload', form);
      setEdits((prev) => ({ ...prev, faviconUrl: uploaded.url }));
      toast.success('Favicon uploaded. Remember to save settings!');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploadingFavicon(false);
      if (faviconFileRef.current) faviconFileRef.current.value = '';
    }
  }

  async function handleExportEmails() {
    setExportingEmails(true);
    try {
      const res = await api.get('/admin/settings/export-emails', {
        params: { range: emailRange },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `emails-${emailRange}-${new Date().toISOString().slice(0, 10)}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to export emails');
    } finally {
      setExportingEmails(false);
    }
  }

  if (isLoading || !data) return <Skeleton className="h-72 w-full max-w-xl" />;

  const merged: Settings = { ...data, ...edits };

  return (
    <div className="max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {FIELDS.map(({ key, label, hint }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                type="number"
                value={merged[key]}
                onChange={(e) => setEdits((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
              />
              <p className="text-xs text-muted-foreground">{hint}</p>
            </div>
          ))}

          <div className="space-y-1.5 pt-2 border-t">
            <Label>Catalogue PDF</Label>
            <div className="flex flex-wrap items-center gap-4">
              {merged.cataloguePdfUrl ? (
                <a href={merged.cataloguePdfUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                  View Current PDF
                </a>
              ) : (
                <span className="text-sm text-muted-foreground">No PDF uploaded</span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload New PDF'}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handlePdfUpload(e.target.files[0]);
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">Upload the catalogue PDF (updates the URL field directly)</p>
          </div>

          <Button disabled={save.isPending} onClick={() => save.mutate(merged)}>
            {save.isPending ? 'Saving…' : 'Save settings'}
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Site branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="siteTitle">Tab title</Label>
            <Input
              id="siteTitle"
              value={merged.siteTitle ?? ''}
              placeholder="Dental Supplier & Wholesalers in Australia - DentaPlus"
              onChange={(e) => setEdits((prev) => ({ ...prev, siteTitle: e.target.value || null }))}
            />
            <p className="text-xs text-muted-foreground">
              Shown in the browser tab. Leave blank to use the storefront default.
            </p>
          </div>

          <div className="space-y-1.5 pt-2 border-t">
            <Label>Logo</Label>
            <div className="flex flex-wrap items-center gap-4">
              {merged.siteLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={merged.siteLogoUrl} alt="Site logo" className="h-8 w-auto rounded border bg-muted p-1" />
              ) : (
                <span className="text-sm text-muted-foreground">Using default logo</span>
              )}
              <Button variant="outline" size="sm" onClick={() => logoFileRef.current?.click()} disabled={uploadingLogo}>
                {uploadingLogo ? 'Uploading...' : 'Upload logo'}
              </Button>
              {merged.siteLogoUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEdits((prev) => ({ ...prev, siteLogoUrl: null }))}
                >
                  Reset to default
                </Button>
              )}
              <input
                ref={logoFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]);
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Shown in the storefront header next to the site name.
            </p>
          </div>

          <div className="space-y-1.5 pt-2 border-t">
            <Label>Favicon</Label>
            <div className="flex flex-wrap items-center gap-4">
              {merged.faviconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={merged.faviconUrl} alt="Favicon" className="size-8 rounded border bg-muted p-1" />
              ) : (
                <span className="text-sm text-muted-foreground">Using default favicon</span>
              )}
              <Button variant="outline" size="sm" onClick={() => faviconFileRef.current?.click()} disabled={uploadingFavicon}>
                {uploadingFavicon ? 'Uploading...' : 'Upload favicon'}
              </Button>
              {merged.faviconUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEdits((prev) => ({ ...prev, faviconUrl: null }))}
                >
                  Reset to default
                </Button>
              )}
              <input
                ref={faviconFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFaviconUpload(e.target.files[0]);
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Shown as the browser tab icon. Square images work best.
            </p>
          </div>

          <Button disabled={save.isPending} onClick={() => save.mutate(merged)}>
            {save.isPending ? 'Saving…' : 'Save settings'}
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Export emails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Download a .txt file of unique emails collected from user accounts and contact-us submissions.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={emailRange} onValueChange={(v) => v && setEmailRange(v as typeof emailRange)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMAIL_EXPORT_RANGES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportEmails} disabled={exportingEmails}>
              {exportingEmails ? 'Exporting…' : 'Download .txt'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
