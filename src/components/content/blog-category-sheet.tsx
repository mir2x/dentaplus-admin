'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronLeft, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { BlogCategory } from '@/types/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

type View = 'list' | 'new' | BlogCategory;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BlogCategorySheet({ open, onOpenChange }: Props) {
  const [view, setView] = useState<View>('list');

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) setView('list');
        onOpenChange(o);
      }}
    >
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {view === 'list' ? (
          <BlogCategoryList onNew={() => setView('new')} onEdit={setView} />
        ) : (
          <BlogCategoryForm
            key={view === 'new' ? 'new' : view.id}
            editing={view}
            onBack={() => setView('list')}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function BlogCategoryList({
  onNew,
  onEdit,
}: {
  onNew: () => void;
  onEdit: (category: BlogCategory) => void;
}) {
  const { data, isLoading } = useQuery<BlogCategory[]>({
    queryKey: ['blog-categories'],
    queryFn: async () => (await api.get('/admin/blog/categories')).data,
  });

  return (
    <>
      <SheetHeader className="mb-4">
        <SheetTitle>Blog categories</SheetTitle>
      </SheetHeader>

      <div className="space-y-3 px-4 pb-6">
        <Button className="w-full" onClick={onNew}>
          <Plus className="size-4" /> New category
        </Button>

        <div className="rounded-md border divide-y">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-3 py-2.5">
                <Skeleton className="h-4 w-full" />
              </div>
            ))
          ) : data?.length ? (
            data.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => onEdit(category)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-muted/40"
              >
                <span>
                  <span className="font-medium">{category.name}</span>{' '}
                  <span className="text-muted-foreground">({category.slug})</span>
                </span>
                <span className="text-muted-foreground text-xs">
                  {category._count?.posts ?? 0} posts
                </span>
              </button>
            ))
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">No categories yet</p>
          )}
        </div>
      </div>
    </>
  );
}

function BlogCategoryForm({
  editing,
  onBack,
}: {
  editing: 'new' | BlogCategory;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = editing !== 'new';

  const [name, setName] = useState(isEdit ? editing.name : '');
  const [slug, setSlug] = useState(isEdit ? editing.slug : '');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['blog-categories'] });
    queryClient.invalidateQueries({ queryKey: ['blog'] });
  };

  const save = useMutation({
    mutationFn: () => {
      const payload = { name, slug: slug || undefined };
      return isEdit
        ? api.patch(`/admin/blog/categories/${editing.id}`, payload)
        : api.post('/admin/blog/categories', payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Category updated' : 'Category created');
      invalidate();
      onBack();
    },
    onError: () => toast.error('Save failed (name/slug must be unique)'),
  });

  const del = useMutation({
    mutationFn: () => api.delete(`/admin/blog/categories/${(editing as BlogCategory).id}`),
    onSuccess: () => {
      toast.success('Category deleted');
      invalidate();
      onBack();
    },
    onError: () => toast.error('Delete failed'),
  });

  return (
    <>
      <SheetHeader className="mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="size-7" onClick={onBack}>
            <ChevronLeft className="size-4" />
          </Button>
          <SheetTitle>{isEdit ? `Edit ${editing.name}` : 'New category'}</SheetTitle>
        </div>
      </SheetHeader>

      <div className="space-y-4 px-4 pb-6">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input
            value={name}
            placeholder="e.g. Oral Health Tips"
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
