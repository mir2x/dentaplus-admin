'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Badge, Category } from '@/types/api';
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
  editing: Badge | 'new' | null;
  onClose: () => void;
}

export function BadgeEditSheet({ editing, onClose }: Props) {
  return (
    <Sheet open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {editing && (
          <BadgeForm
            key={editing === 'new' ? 'new' : editing.id}
            editing={editing}
            onClose={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

interface FlatCategory {
  id: string;
  name: string;
  parentName?: string;
}

function BadgeForm({ editing, onClose }: { editing: Badge | 'new'; onClose: () => void }) {
  const queryClient = useQueryClient();
  const isEdit = editing !== 'new';

  const [label, setLabel] = useState(isEdit ? editing.label : '');
  const [imageUrl, setImageUrl] = useState(isEdit ? (editing.imageUrl ?? '') : '');
  const [isActive, setIsActive] = useState(isEdit ? editing.isActive : true);
  const [categoryId, setCategoryId] = useState(isEdit ? editing.categoryId : '');
  const [categorySearch, setCategorySearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: allBadges } = useQuery<Badge[]>({
    queryKey: ['badges'],
    queryFn: async () => (await api.get('/admin/badges')).data,
  });
  const { data: allCategories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/admin/categories')).data,
  });

  const usedCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    allBadges?.forEach((b) => {
      if (!isEdit || b.id !== editing.id) ids.add(b.categoryId);
    });
    return ids;
  }, [allBadges, isEdit, editing]);

  const flatCategories = useMemo(() => {
    const flat: FlatCategory[] = [];
    allCategories?.forEach((cat) => {
      flat.push({ id: cat.id, name: cat.name });
      cat.children.forEach((child) => {
        flat.push({ id: child.id, name: child.name, parentName: cat.name });
      });
    });
    const search = categorySearch.trim().toLowerCase();
    return search
      ? flat.filter((c) => c.name.toLowerCase().includes(search))
      : flat;
  }, [allCategories, categorySearch]);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'badges');
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
      const payload = {
        label,
        imageUrl: imageUrl || undefined,
        isActive,
        categoryId,
      };
      return isEdit
        ? api.patch(`/admin/badges/${editing.id}`, payload)
        : api.post('/admin/badges', payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Badge updated' : 'Badge created');
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      onClose();
    },
    onError: () => toast.error('This category may already have a badge assigned'),
  });

  const del = useMutation({
    mutationFn: () => api.delete(`/admin/badges/${(editing as Badge).id}`),
    onSuccess: () => {
      toast.success('Badge deleted');
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      onClose();
    },
    onError: () => toast.error('Delete failed'),
  });

  return (
    <>
      <SheetHeader className="mb-4">
        <SheetTitle>{isEdit ? `Edit ${editing.label}` : 'New badge'}</SheetTitle>
      </SheetHeader>

      <div className="space-y-4 px-4 pb-6">
        <div className="space-y-1.5">
          <Label>Label</Label>
          <Input
            value={label}
            placeholder="e.g. Best Seller"
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Image</Label>
          <div className="flex items-center gap-3">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={label} className="size-12 rounded border object-cover" />
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
            {imageUrl && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-destructive hover:text-destructive"
                onClick={() => setImageUrl('')}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label>Active</Label>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <div className="space-y-1.5">
          <Label>Category</Label>
          <div className="flex h-64 flex-col overflow-hidden rounded-md border">
            <div className="relative border-b shrink-0">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={categorySearch}
                placeholder="Search categories…"
                onChange={(e) => setCategorySearch(e.target.value)}
                className="rounded-none border-0 pl-8 pr-8 focus-visible:ring-0"
              />
              {categorySearch && (
                <button
                  type="button"
                  onClick={() => setCategorySearch('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto divide-y">
              {flatCategories.length ? (
                flatCategories.map((cat) => {
                  const disabled = usedCategoryIds.has(cat.id);
                  const selected = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => setCategoryId(cat.id)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                        disabled
                          ? 'cursor-not-allowed opacity-50'
                          : selected
                            ? 'bg-primary/10'
                            : 'hover:bg-muted/40'
                      }`}
                    >
                      {cat.parentName ? (
                        <span>
                          <span className="text-muted-foreground">{cat.parentName} ›</span> {cat.name}
                        </span>
                      ) : (
                        cat.name
                      )}
                      {disabled && (
                        <span className="ml-auto text-xs text-muted-foreground">Has a badge</span>
                      )}
                    </button>
                  );
                })
              ) : (
                <p className="px-3 py-2 text-xs text-muted-foreground">No categories found.</p>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            A badge can only be attached to a single category.
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1"
            disabled={save.isPending || !label || !categoryId}
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
