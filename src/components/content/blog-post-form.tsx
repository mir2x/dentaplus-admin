'use client';

import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { BlogCategory, BlogPost } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { ChevronLeft, ImageIcon, Loader2, X } from 'lucide-react';

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function BlogPostForm({ post }: { post?: BlogPost }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const isEdit = !!post;

  const [title, setTitle] = useState(isEdit ? post.title : '');
  const [slug, setSlug] = useState(isEdit ? post.slug : '');
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [excerpt, setExcerpt] = useState(isEdit ? (post.excerpt ?? '') : '');
  const [body, setBody] = useState(isEdit ? post.body : '');
  const [thumbnailUrl, setThumbnailUrl] = useState(isEdit ? (post.thumbnailUrl ?? '') : '');
  const [featuredImageUrl, setFeaturedImageUrl] = useState(
    isEdit ? (post.featuredImageUrl ?? '') : '',
  );
  const [tags, setTags] = useState<string[]>(isEdit ? (post.tags ?? []) : []);
  const [tagDraft, setTagDraft] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>(
    isEdit ? (post.categories ?? []).map((c) => c.id) : [],
  );
  const [isPublished, setIsPublished] = useState(isEdit ? post.isPublished : false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [featuredUploading, setFeaturedUploading] = useState(false);

  const { data: categories } = useQuery<BlogCategory[]>({
    queryKey: ['blog-categories'],
    queryFn: async () => (await api.get('/admin/blog/categories')).data,
  });

  function addTag(raw: string) {
    const value = raw.trim();
    if (!value || tags.includes(value)) return;
    setTags((cur) => [...cur, value]);
    setTagDraft('');
  }

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        title,
        slug: slug || slugify(title),
        excerpt: excerpt || undefined,
        body,
        thumbnailUrl: thumbnailUrl || undefined,
        featuredImageUrl: featuredImageUrl || undefined,
        tags,
        categoryIds,
        isPublished,
      };
      return isEdit
        ? api.patch(`/admin/blog/posts/${post.id}`, payload)
        : api.post('/admin/blog/posts', payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Post updated' : 'Post created');
      queryClient.invalidateQueries({ queryKey: ['blog'] });
      router.push('/blog');
    },
    onError: () => toast.error('Save failed (slug must be unique)'),
  });

  const del = useMutation({
    mutationFn: () => api.delete(`/admin/blog/posts/${post?.id}`),
    onSuccess: () => {
      toast.success('Post deleted');
      queryClient.invalidateQueries({ queryKey: ['blog'] });
      router.push('/blog');
    },
    onError: () => toast.error('Delete failed'),
  });

  const isUploading = thumbnailUploading || featuredUploading;

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/blog')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{isEdit ? 'Edit post' : 'New post'}</h1>
      </div>

      <div className="space-y-6">
        <Field label="Title">
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            placeholder="Enter post title"
          />
        </Field>

        <Field label="Slug">
          <Input
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            placeholder="my-post-slug"
          />
        </Field>

        <Field label="Excerpt (optional)">
          <RichTextEditor
            value={excerpt}
            onChange={setExcerpt}
            placeholder="A short summary of the post"
            minHeight="5rem"
          />
        </Field>

        <Field label="Body">
          <RichTextEditor
            value={body}
            onChange={setBody}
            placeholder="Write your post content here"
            minHeight="20rem"
          />
        </Field>

        <Field label="Thumbnail">
          <ImageUploadField
            value={thumbnailUrl}
            onChange={setThumbnailUrl}
            uploading={thumbnailUploading}
            setUploading={setThumbnailUploading}
            uploadFolder="blog"
            placeholder="Click to upload thumbnail"
          />
          <p className="text-xs text-muted-foreground">
            Shown on the blog list and post cards.
          </p>
        </Field>

        <Field label="Featured image">
          <ImageUploadField
            value={featuredImageUrl}
            onChange={setFeaturedImageUrl}
            uploading={featuredUploading}
            setUploading={setFeaturedUploading}
            uploadFolder="blog"
            placeholder="Click to upload featured image"
          />
          <p className="text-xs text-muted-foreground">
            Shown at the top of the individual post page.
          </p>
        </Field>

        <Field label="Tags">
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => setTags((cur) => cur.filter((t) => t !== tag))}
                    aria-label={`Remove tag "${tag}"`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <Input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTag(tagDraft);
              }
            }}
            onBlur={() => addTag(tagDraft)}
            placeholder="Type a tag and press Enter"
          />
          <p className="text-xs text-muted-foreground">
            Press Enter (or comma) after each tag to add it.
          </p>
        </Field>

        <Field label="Categories">
          {categories?.length ? (
            <div className="rounded-md border divide-y max-h-48 overflow-y-auto">
              {categories.map((category) => (
                <label
                  key={category.id}
                  className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40"
                >
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={categoryIds.includes(category.id)}
                    onChange={() =>
                      setCategoryIds((cur) =>
                        cur.includes(category.id)
                          ? cur.filter((id) => id !== category.id)
                          : [...cur, category.id],
                      )
                    }
                  />
                  {category.name}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No categories yet — manage them from the blog list page.
            </p>
          )}
        </Field>

        <div className="flex items-center gap-4 rounded-lg border p-4">
          <div className="flex-1 space-y-1">
            <Label className="text-base font-semibold">Published Status</Label>
            <p className="text-sm text-muted-foreground">
              Make this post visible to the public.
            </p>
          </div>
          <Switch checked={isPublished} onCheckedChange={setIsPublished} />
        </div>

        <div className="flex gap-4 pt-4 border-t">
          <Button
            className="flex-1"
            disabled={save.isPending || isUploading || !title || !body}
            onClick={() => save.mutate()}
          >
            {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Post'}
          </Button>
          {isEdit && (
            <Button variant="destructive" disabled={del.isPending} onClick={() => {
              if (confirm('Are you sure you want to delete this post?')) del.mutate();
            }}>
              {del.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : 'Delete'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ImageUploadField({
  value,
  onChange,
  uploading,
  setUploading,
  uploadFolder,
  placeholder,
}: {
  value: string;
  onChange: (url: string) => void;
  uploading: boolean;
  setUploading: (uploading: boolean) => void;
  uploadFolder: string;
  placeholder: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', uploadFolder);

      const res = await api.post<{ key: string; url: string }>('/admin/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onChange(res.data.url);
      toast.success('Image uploaded successfully');
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || 'Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {value ? (
        <div className="relative overflow-hidden rounded-lg border aspect-[2/1] bg-muted/50 max-w-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="w-full h-full object-cover" />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 rounded-full"
            onClick={() => onChange('')}
            title="Remove image"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer max-w-lg"
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="size-8 text-muted-foreground animate-spin" />
          ) : (
            <ImageIcon className="size-8 text-muted-foreground" />
          )}
          <div className="text-sm font-medium">
            {uploading ? 'Uploading...' : placeholder}
          </div>
          <div className="text-xs text-muted-foreground">
            Supports JPEG, PNG, WEBP up to 10MB
          </div>
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileUpload}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-base font-semibold">{label}</Label>
      {children}
    </div>
  );
}
