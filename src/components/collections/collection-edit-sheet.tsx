'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { Collection } from '@/types/api';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface Props {
  editing: Collection | 'new' | null;
  onClose: () => void;
}

export function CollectionEditSheet({ editing, onClose }: Props) {
  return (
    <Sheet open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {editing && (
          <CollectionForm
            key={editing === 'new' ? 'new' : editing.id}
            editing={editing}
            onClose={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function CollectionForm({ editing, onClose }: { editing: Collection | 'new'; onClose: () => void }) {
  const queryClient = useQueryClient();
  const isEdit = editing !== 'new';
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(isEdit ? editing.title : '');
  const [imageUrl, setImageUrl] = useState(isEdit ? editing.imageUrl : '');
  const [isActive, setIsActive] = useState(isEdit ? editing.isActive : true);
  const [uploading, setUploading] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['collections'] });

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'collections');
      const { data: uploaded } = await api.post('/admin/upload', form);
      setImageUrl(uploaded.url);
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const save = useMutation({
    mutationFn: () => {
      const payload = { title, imageUrl, isActive };
      return isEdit
        ? api.patch(`/admin/collections/${editing.id}`, payload)
        : api.post('/admin/collections', payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Collection updated' : 'Collection created');
      refresh();
      onClose();
    },
    onError: () => toast.error('Save failed'),
  });

  const del = useMutation({
    mutationFn: () => api.delete(`/admin/collections/${(editing as Collection).id}`),
    onSuccess: () => {
      toast.success('Collection deleted');
      refresh();
      onClose();
    },
    onError: () => toast.error('Delete failed'),
  });

  return (
    <>
      <SheetHeader className="mb-4">
        <SheetTitle>{isEdit ? `Edit ${editing.title}` : 'New collection'}</SheetTitle>
      </SheetHeader>

      <div className="space-y-4 px-4 pb-6">
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input
            value={title}
            placeholder="e.g. New Arrivals"
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Image</Label>
          <div className="flex items-center gap-3">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={title} className="size-12 rounded border object-cover" />
            ) : (
              <div className="flex size-12 items-center justify-center rounded border border-dashed text-xs text-muted-foreground">
                None
              </div>
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
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-4" /> {uploading ? 'Uploading…' : imageUrl ? 'Replace' : 'Upload'}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label>Active</Label>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <p className="text-xs text-muted-foreground">
          Products are added to this collection from the product&apos;s edit page.
        </p>

        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1"
            disabled={save.isPending || !title || !imageUrl}
            onClick={() => save.mutate()}
          >
            {save.isPending ? 'Saving…' : isEdit ? 'Save' : 'Create'}
          </Button>
          {isEdit && (
            <Button variant="destructive" disabled={del.isPending} onClick={() => del.mutate()}>
              Delete
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
