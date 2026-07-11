'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BlogPostForm } from '@/components/content/blog-post-form';
import { BlogPost } from '@/types/api';
import { Loader2 } from 'lucide-react';
import { use } from 'react';

export default function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: post, isLoading } = useQuery<BlogPost>({
    queryKey: ['blog', id],
    queryFn: async () => (await api.get(`/admin/blog/posts/${id}`)).data,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!post) {
    return <div className="text-center py-12 text-muted-foreground">Post not found</div>;
  }

  return <BlogPostForm post={post} />;
}
