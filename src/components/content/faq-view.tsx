'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { FaqItem } from '@/types/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function FaqView() {
  const [editing, setEditing] = useState<FaqItem | 'new' | null>(null);

  const { data, isLoading } = useQuery<FaqItem[]>({
    queryKey: ['faq'],
    queryFn: async () => (await api.get('/admin/faq')).data,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing('new')}>
          <Plus className="size-4" /> New FAQ
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Question</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 3 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.length ? (
              data.map((f) => (
                <TableRow key={f.id} className="cursor-pointer" onClick={() => setEditing(f)}>
                  <TableCell className="text-muted-foreground">{f.sortOrder}</TableCell>
                  <TableCell className="font-medium max-w-xl truncate">{f.question}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={f.isActive ? 'default' : 'secondary'}>
                      {f.isActive ? 'Active' : 'Hidden'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  No FAQ items
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {editing && (
            <FaqForm
              key={editing === 'new' ? 'new' : editing.id}
              editing={editing}
              onClose={() => setEditing(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function FaqForm({ editing, onClose }: { editing: FaqItem | 'new'; onClose: () => void }) {
  const queryClient = useQueryClient();
  const isEdit = editing !== 'new';
  const [question, setQuestion] = useState(isEdit ? editing.question : '');
  const [answer, setAnswer] = useState(isEdit ? editing.answer : '');
  const [sortOrder, setSortOrder] = useState(isEdit ? editing.sortOrder : 0);
  const [isActive, setIsActive] = useState(isEdit ? editing.isActive : true);

  const save = useMutation({
    mutationFn: () => {
      const payload = { question, answer, sortOrder, isActive };
      return isEdit
        ? api.patch(`/admin/faq/${editing.id}`, payload)
        : api.post('/admin/faq', payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'FAQ updated' : 'FAQ created');
      queryClient.invalidateQueries({ queryKey: ['faq'] });
      onClose();
    },
    onError: () => toast.error('Save failed'),
  });

  const del = useMutation({
    mutationFn: () => api.delete(`/admin/faq/${(editing as FaqItem).id}`),
    onSuccess: () => {
      toast.success('FAQ deleted');
      queryClient.invalidateQueries({ queryKey: ['faq'] });
      onClose();
    },
    onError: () => toast.error('Delete failed'),
  });

  return (
    <>
      <SheetHeader className="mb-4">
        <SheetTitle>{isEdit ? 'Edit FAQ' : 'New FAQ'}</SheetTitle>
      </SheetHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Question</Label>
          <Input value={question} onChange={(e) => setQuestion(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Answer</Label>
          <Textarea rows={5} value={answer} onChange={(e) => setAnswer(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Sort order</Label>
          <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Active</Label>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
        <div className="flex gap-2 pt-2">
          <Button className="flex-1" disabled={save.isPending || !question || !answer} onClick={() => save.mutate()}>
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
