'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api, getApiErrorMessage } from '@/lib/api';
import { Category, Tag } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const NO_PARENT = '__none__';

export function InlineCategoryCreate({
  categories,
  onCreated,
}: {
  categories: Category[];
  onCreated: (category: Category) => void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState(NO_PARENT);
  const create = useMutation({
    mutationFn: async () =>
      (
        await api.post<Category>('/admin/categories', {
          name: name.trim(),
          parentId: parentId === NO_PARENT ? null : parentId,
        })
      ).data,
    onSuccess: (category) => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      onCreated(category);
      setName('');
      setParentId(NO_PARENT);
      setOpen(false);
      toast.success('Category created and selected');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not create category')),
  });

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> New category
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-md border bg-muted/20 p-3">
      <Input
        autoFocus
        value={name}
        placeholder="Category name"
        onChange={(event) => setName(event.target.value)}
      />
      <Select value={parentId} onValueChange={(value) => setParentId(value ?? NO_PARENT)}>
        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_PARENT}>Top-level category</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!name.trim() || create.isPending}
          onClick={() => create.mutate()}
        >
          {create.isPending ? 'Creating…' : 'Create and select'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function InlineTagCreate({ onCreated }: { onCreated: (tag: Tag) => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const create = useMutation({
    mutationFn: async () =>
      (await api.post<Tag>('/admin/tags', { name: name.trim() })).data,
    onSuccess: (tag) => {
      void queryClient.invalidateQueries({ queryKey: ['tags'] });
      onCreated(tag);
      setName('');
      toast.success('Tag created and selected');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Could not create tag')),
  });

  return (
    <div className="flex gap-2">
      <Input
        value={name}
        placeholder="New tag name"
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && name.trim()) {
            event.preventDefault();
            create.mutate();
          }
        }}
      />
      <Button
        type="button"
        variant="outline"
        disabled={!name.trim() || create.isPending}
        onClick={() => create.mutate()}
      >
        <Plus className="size-4" /> Add
      </Button>
    </div>
  );
}
