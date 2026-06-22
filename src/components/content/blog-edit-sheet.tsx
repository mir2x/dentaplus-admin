'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { BlogPost } from '@/types/api';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function BlogEditSheet({
  editing,
  onClose,
}: {
  editing: BlogPost | 'new' | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {editing && (
          <BlogForm key={editing === 'new' ? 'new' : editing.id} editing={editing} onClose={onClose} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function BlogForm({ editing, onClose }: { editing: BlogPost | 'new'; onClose: () => void }) {
  const queryClient = useQueryClient();
  const isEdit = editing !== 'new';

  const [title, setTitle] = useState(isEdit ? editing.title : '');
  const [slug, setSlug] = useState(isEdit ? editing.slug : '');
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [excerpt, setExcerpt] = useState(isEdit ? (editing.excerpt ?? '') : '');
  const [body, setBody] = useState(isEdit ? editing.body : '');
  const [imageUrl, setImageUrl] = useState(isEdit ? (editing.featuredImageUrl ?? '') : '');
  const [isPublished, setIsPublished] = useState(isEdit ? editing.isPublished : false);

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        title,
        slug: slug || slugify(title),
        excerpt: excerpt || undefined,
        body,
        featuredImageUrl: imageUrl || undefined,
        isPublished,
      };
      return isEdit
        ? api.patch(`/admin/blog/posts/${editing.id}`, payload)
        : api.post('/admin/blog/posts', payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Post updated' : 'Post created');
      queryClient.invalidateQueries({ queryKey: ['blog'] });
      onClose();
    },
    onError: () => toast.error('Save failed (slug must be unique)'),
  });

  const del = useMutation({
    mutationFn: () => api.delete(`/admin/blog/posts/${(editing as BlogPost).id}`),
    onSuccess: () => {
      toast.success('Post deleted');
      queryClient.invalidateQueries({ queryKey: ['blog'] });
      onClose();
    },
    onError: () => toast.error('Delete failed'),
  });

  return (
    <>
      <SheetHeader className="mb-4">
        <SheetTitle>{isEdit ? 'Edit post' : 'New post'}</SheetTitle>
      </SheetHeader>

      <div className="space-y-4">
        <Field label="Title">
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
          />
        </Field>
        <Field label="Slug">
          <Input
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
          />
        </Field>
        <Field label="Excerpt (optional)">
          <Textarea rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
        </Field>
        <Field label="Body">
          <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        <Field label="Featured image URL (optional)">
          <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
        </Field>
        <div className="flex items-center justify-between">
          <Label>Published</Label>
          <Switch checked={isPublished} onCheckedChange={setIsPublished} />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1"
            disabled={save.isPending || !title || !body}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
