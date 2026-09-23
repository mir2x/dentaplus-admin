'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** Upload (same flow as banners: POST /admin/upload) or paste an image URL. */
export function ImageUploadField({
  value,
  onChange,
  allowClear,
}: {
  value: string | undefined;
  onChange: (url: string | undefined) => void;
  allowClear?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'popups');
      const { data } = await api.post('/admin/upload', form);
      onChange(data.url);
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="max-h-32 w-full rounded border object-contain bg-muted/30" />
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="size-4" /> {uploading ? 'Uploading…' : value ? 'Replace' : 'Upload'}
        </Button>
        {allowClear && value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>
            <X className="size-4" /> Remove
          </Button>
        )}
      </div>
      <Input
        className="font-mono text-xs"
        placeholder="…or paste an image URL"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
      />
    </div>
  );
}
