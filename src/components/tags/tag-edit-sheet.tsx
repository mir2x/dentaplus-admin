'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Tag } from '@/types/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  editing: Tag | 'new' | null;
  onClose: () => void;
}

export function TagEditSheet({ editing, onClose }: Props) {
  return (
    <Sheet open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {editing && (
          <TagForm key={editing === 'new' ? 'new' : editing.id} editing={editing} onClose={onClose} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function TagForm({ editing, onClose }: { editing: Tag | 'new'; onClose: () => void }) {
  const queryClient = useQueryClient();
  const isEdit = editing !== 'new';

  const [name, setName] = useState(isEdit ? editing.name : '');
  const [slug, setSlug] = useState(isEdit ? editing.slug : '');

  const save = useMutation({
    mutationFn: () => {
      const payload = { name, slug: slug || undefined };
      return isEdit
        ? api.patch(`/admin/tags/${editing.id}`, payload)
        : api.post('/admin/tags', payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Tag updated' : 'Tag created');
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      onClose();
    },
    onError: () => toast.error('Save failed (check the name/slug is unique)'),
  });

  const del = useMutation({
    mutationFn: () => api.delete(`/admin/tags/${(editing as Tag).id}`),
    onSuccess: () => {
      toast.success('Tag deleted');
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      onClose();
    },
    onError: () => toast.error('Delete failed'),
  });

  return (
    <>
      <SheetHeader className="mb-4">
        <SheetTitle>{isEdit ? `Edit ${editing.name}` : 'New tag'}</SheetTitle>
      </SheetHeader>

      <div className="space-y-4 px-4 pb-6">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input
            value={name}
            placeholder="e.g. Sensitive Teeth"
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
