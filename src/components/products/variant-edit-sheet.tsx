'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Upload, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Attribute, ProductVariantDetail } from '@/types/api';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  productId: string;
  editing: ProductVariantDetail | 'new' | null;
  onClose: () => void;
}

export function VariantEditSheet({ productId, editing, onClose }: Props) {
  return (
    <Sheet open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {editing && (
          <VariantForm
            key={editing === 'new' ? 'new' : editing.id}
            productId={productId}
            editing={editing}
            onClose={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

type Option = { attributeName: string; value: string };

function VariantForm({
  productId,
  editing,
  onClose,
}: {
  productId: string;
  editing: ProductVariantDetail | 'new';
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = editing !== 'new';
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [sku, setSku] = useState(isEdit ? (editing.sku ?? '') : '');
  const [name, setName] = useState(isEdit ? (editing.name ?? '') : '');
  const [regularPrice, setRegularPrice] = useState(
    isEdit && editing.regularCents != null ? (editing.regularCents / 100).toFixed(2) : '',
  );
  const [salePrice, setSalePrice] = useState(
    isEdit && editing.saleCents != null ? (editing.saleCents / 100).toFixed(2) : '',
  );
  const [thumbnailUrl, setThumbnailUrl] = useState(isEdit ? (editing.thumbnailUrl ?? '') : '');
  const [isActive, setIsActive] = useState(isEdit ? editing.isActive : true);
  const [options, setOptions] = useState<Option[]>(isEdit ? editing.options : []);

  const { data: attributes } = useQuery<Attribute[]>({
    queryKey: ['attributes'],
    queryFn: async () => (await api.get('/admin/attributes')).data,
  });

  const [newAttrOpen, setNewAttrOpen] = useState(false);
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrValues, setNewAttrValues] = useState('');

  const createAttr = useMutation({
    mutationFn: () =>
      api.post('/admin/attributes', { name: newAttrName, values: newAttrValues }),
    onSuccess: () => {
      toast.success('Attribute created');
      queryClient.invalidateQueries({ queryKey: ['attributes'] });
      setNewAttrOpen(false);
      setNewAttrName('');
      setNewAttrValues('');
    },
    onError: () => toast.error('Could not create attribute (name may already exist)'),
  });

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'variants');
      const { data } = await api.post('/admin/upload', form);
      setThumbnailUrl(data.url);
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
        sku: sku || undefined,
        name: name || undefined,
        regularPrice: regularPrice ? parseFloat(regularPrice) : undefined,
        salePrice: salePrice ? parseFloat(salePrice) : undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        isActive,
        options: options.filter((o) => o.attributeName && o.value),
      };
      return isEdit
        ? api.patch(`/admin/variants/${editing.id}`, payload)
        : api.post(`/admin/products/${productId}/variants`, payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Variant saved' : 'Variant created');
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['variants', productId] });
      onClose();
    },
    onError: () => toast.error('Save failed'),
  });

  const setOption = (i: number, patch: Partial<Option>) =>
    setOptions((cur) => cur.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  const valuesFor = (attrName: string) =>
    attributes?.find((a) => a.name === attrName)?.values ?? [];

  return (
    <>
      <SheetHeader className="mb-4">
        <SheetTitle>{isEdit ? 'Edit variant' : 'New variant'}</SheetTitle>
      </SheetHeader>

      <div className="space-y-4 px-4 pb-6">
        <Field label="SKU (required to sync to QuickBooks)">
          <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. 9514270/DD" />
        </Field>
        <Field label="Variant name (optional)">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 15 White" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Regular ($)">
            <Input type="number" step="0.01" value={regularPrice} onChange={(e) => setRegularPrice(e.target.value)} />
          </Field>
          <Field label="Sale ($)">
            <Input type="number" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
          </Field>
        </div>

        <Field label="Thumbnail">
          <div className="flex items-center gap-3">
            {thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnailUrl} alt="" className="size-14 rounded border object-cover" />
            ) : (
              <div className="size-14 rounded border bg-muted" />
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
            <Button type="button" variant="secondary" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" /> {uploading ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
        </Field>

        {/* Attributes */}
        <div className="space-y-2">
          <Label>Attributes</Label>
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <Select value={o.attributeName} onValueChange={(v) => setOption(i, { attributeName: v ?? '', value: '' })}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Attribute" /></SelectTrigger>
                <SelectContent>
                  {attributes?.map((a) => (
                    <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={o.value} onValueChange={(v) => setOption(i, { value: v ?? '' })}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Value" /></SelectTrigger>
                <SelectContent>
                  {valuesFor(o.attributeName).map((val) => (
                    <SelectItem key={val} value={val}>{val}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button type="button" onClick={() => setOptions((cur) => cur.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOptions((cur) => [...cur, { attributeName: '', value: '' }])}>
              <Plus className="size-4" /> Add attribute
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setNewAttrOpen((v) => !v)}>
              {newAttrOpen ? <X className="size-4" /> : <Plus className="size-4" />} New attribute
            </Button>
          </div>

          {newAttrOpen && (
            <div className="space-y-2 rounded-md border p-2">
              <Input placeholder="Attribute name (e.g. Size)" value={newAttrName} onChange={(e) => setNewAttrName(e.target.value)} />
              <Input placeholder="Values, pipe-separated (e.g. 7 | 8 | 9)" value={newAttrValues} onChange={(e) => setNewAttrValues(e.target.value)} />
              <Button type="button" size="sm" disabled={createAttr.isPending || !newAttrName} onClick={() => createAttr.mutate()}>
                {createAttr.isPending ? 'Saving…' : 'Create attribute'}
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Label>Active</Label>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <Button className="w-full" disabled={save.isPending || !sku} onClick={() => save.mutate()}>
          {save.isPending ? 'Saving…' : isEdit ? 'Save variant' : 'Create variant'}
        </Button>
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
