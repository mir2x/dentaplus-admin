'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Skeleton } from '@/components/ui/skeleton';

const CUSTOM_PAGES = [
  { slug: 'refund-policy', label: 'Refund and Returns Policy' },
  { slug: 'conditions-of-sale', label: 'Conditions of Sale' },
  { slug: 'about', label: 'About Us' },
  { slug: 'delivery-policy', label: 'Delivery Policy' },
  { slug: 'cookie-policy', label: 'Cookie Policy' },
  { slug: 'privacy-policy', label: 'Privacy Policy' },
];

export function PagesView() {
  const [selectedSlug, setSelectedSlug] = useState<string>(CUSTOM_PAGES[0].slug);
  const [contentHtml, setContentHtml] = useState<string>('');

  const { data: pageData, isLoading } = useQuery({
    queryKey: ['custom-page', selectedSlug],
    queryFn: async () => {
      try {
        const res = await api.get<{ content: string }>(`/pages/${selectedSlug}`);
        return res.data;
      } catch (err: any) {
        if (err.response?.status === 404) return { content: '' };
        throw err;
      }
    },
  });

  useEffect(() => {
    if (pageData !== undefined) {
      setContentHtml(pageData.content || '');
    }
  }, [pageData, selectedSlug]);

  const save = useMutation({
    mutationFn: async (html: string) => {
      await api.patch(`/admin/pages/${selectedSlug}`, { contentHtml: html });
    },
    onSuccess: () => toast.success('Page saved successfully'),
    onError: () => toast.error('Failed to save page'),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Custom Pages</h1>
        <p className="text-muted-foreground text-sm">
          Manage rich text content for quick link pages.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Page Editor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1.5 max-w-sm">
            <Label>Select Page</Label>
            <Select value={selectedSlug} onValueChange={setSelectedSlug}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CUSTOM_PAGES.map((page) => (
                  <SelectItem key={page.slug} value={page.slug}>
                    {page.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Page Content</Label>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <RichTextEditor
                value={contentHtml}
                onChange={setContentHtml}
                placeholder="Write the page content here..."
                minHeight="20rem"
              />
            )}
          </div>

          <Button disabled={save.isPending || isLoading} onClick={() => save.mutate(contentHtml)}>
            {save.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
