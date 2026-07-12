'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Category } from '@/types/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CategoryLike {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

const NO_PARENT = '__none__';

interface Props {
  editing: CategoryLike | 'new' | null;
  topLevel: Category[];
  onClose: () => void;
}

export function CategoryEditSheet({ editing, topLevel, onClose }: Props) {
  return (
    <Sheet open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {editing && (
          <CategoryForm
            key={editing === 'new' ? 'new' : editing.id}
            editing={editing}
            topLevel={topLevel}
            onClose={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function CategoryForm({
  editing,
  topLevel,
  onClose,
}: {
  editing: CategoryLike | 'new';
  topLevel: Category[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = editing !== 'new';

  const [name, setName] = useState(isEdit ? editing.name : '');
  const [slug, setSlug] = useState(isEdit ? editing.slug : '');
  const [parentId, setParentId] = useState<string>(
    isEdit ? (editing.parentId ?? NO_PARENT) : NO_PARENT,
  );

  const parentOptions = topLevel.filter((c) => c.id !== (isEdit ? editing.id : null));

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        slug: slug || undefined,
        parentId: parentId === NO_PARENT ? null : parentId,
      };
      return isEdit
        ? api.patch(`/admin/categories/${editing.id}`, payload)
        : api.post('/admin/categories', payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Category updated' : 'Category created');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories-browse'] });
      onClose();
    },
    onError: () => toast.error('Save failed (check the name/slug is unique for this parent)'),
  });

  const del = useMutation({
    mutationFn: () => api.delete(`/admin/categories/${(editing as CategoryLike).id}`),
    onSuccess: () => {
      toast.success('Category deleted');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories-browse'] });
      onClose();
    },
    onError: () => toast.error('Delete failed (remove subcategories first)'),
  });

  return (
    <>
      <SheetHeader className="mb-4">
        <SheetTitle>{isEdit ? `Edit ${editing.name}` : 'New category'}</SheetTitle>
      </SheetHeader>

      <div className="space-y-4 px-4 pb-6">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input
            value={name}
            placeholder="e.g. Dental Instruments"
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Slug</Label>
          <Input
            value={slug}
            placeholder="auto-generated from name if left blank"
            onChange={(e) => setSlug(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Parent category</Label>
          <Select value={parentId} onValueChange={(v) => setParentId(v ?? NO_PARENT)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PARENT}>None (top-level)</SelectItem>
              {parentOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 pt-2">
          <Button className="flex-1" disabled={save.isPending || !name} onClick={() => save.mutate()}>
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
