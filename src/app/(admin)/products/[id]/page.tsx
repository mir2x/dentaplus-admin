'use client';

import { use, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Check, X } from 'lucide-react';
import { api } from '@/lib/api';
import {
  Brand,
  Category,
  ProductBadge,
  ProductDetail,
  ProductType,
  QboProductSnapshot,
  Tag,
} from '@/types/api';
import { formatCents, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProductImagesPanel } from '@/components/products/product-images-panel';
import { ProductBadgeImagesPanel } from '@/components/products/product-badge-images-panel';
import { ProductBannerPanel } from '@/components/products/product-banner-panel';
import { WholesaleRulesPanel } from '@/components/products/wholesale-rules-panel';
import { VariantsManager } from '@/components/products/variants-manager';
import { ProductOffersSection } from '@/components/products/product-offers-section';
import { QuickbooksRefreshCard } from '@/components/shared/quickbooks-refresh-card';

const TYPE_OPTIONS: { value: ProductType; label: string }[] = [
  { value: 'GENERAL', label: 'General' },
  { value: 'MEDICINE', label: 'Medicine' },
  { value: 'PRESCRIPTION_ONLY', label: 'Prescription Only' },
  { value: 'EQUIPMENT', label: 'Equipment' },
];

const CATALOG_VISIBILITY_OPTIONS = [
  { value: 'visible', label: 'Visible (catalog & search)' },
  { value: 'catalog', label: 'Catalog only' },
  { value: 'search', label: 'Search only' },
  { value: 'hidden', label: 'Hidden' },
];

const TAX_STATUS_OPTIONS = [
  { value: 'taxable', label: 'Taxable' },
  { value: 'shipping', label: 'Shipping only' },
  { value: 'none', label: 'None' },
];

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: product, isLoading } = useQuery<ProductDetail>({
    queryKey: ['product', id],
    queryFn: async () => (await api.get(`/admin/products/${id}`)).data,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => router.push('/products')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="size-3.5" /> All products
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-semibold">{product.name}</h2>
            {!product.published && <Badge variant="secondary">Draft</Badge>}
            {product.featured && <Badge>Featured</Badge>}
            {product.hasVariant ? (
              <Badge variant="outline">Variant product</Badge>
            ) : (
              product.quickbooksItemId && <Badge variant="outline">QuickBooks-synced</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {product.hasVariant ? 'SKUs on variants' : `SKU ${product.sku ?? '—'}`}
          </p>
        </div>
        {!editing && (
          <div className="flex items-center gap-2">
            <Button onClick={() => setEditing(true)}>Edit</Button>
            <DeleteProductButton productId={product.id} />
          </div>
        )}
      </div>

      {editing ? (
        <ProductEditForm
          product={product}
          onDone={() => {
            setEditing(false);
            queryClient.invalidateQueries({ queryKey: ['product', id] });
          }}
        />
      ) : (
        <ProductView product={product} />
      )}
    </div>
  );
}

/* ─────────────────────────── View mode ─────────────────────────── */

function ProductView({ product }: { product: ProductDetail }) {
  const regular = product.prices.find((p) => p.type === 'REGULAR');
  const sale = product.prices.find((p) => p.type === 'SALE');
  const currency = product.prices[0]?.currency ?? 'AUD';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <Section title="Identity">
          <Row label="Name" value={product.name} />
          <Row label="Slug" value={product.slug} />
          <Row label="SKU" value={product.sku} />
          <Row label="GTIN" value={product.gtin} />
          <Row label="Type" value={product.type} />
          <Row label="Brand" value={product.brand?.name} />
          <Row label="Position" value={product.position?.toString()} />
          <Row label="Catalog visibility" value={product.catalogVisibility} />
          <Row label="Requires prescription" value={product.requiresPrescription ? 'Yes' : 'No'} />
          <Row label="Allow reviews" value={product.allowReviews ? 'Yes' : 'No'} />
        </Section>

        <Section title="Tax">
          <Row label="Tax status" value={product.taxStatus} />
          <Row label="Tax class" value={product.taxClass} />
        </Section>

        <Section title="Pricing & inventory">
          <Row label="Regular" value={regular ? formatCents(regular.amountCents, currency) : null} />
          <Row label="Sale" value={sale ? formatCents(sale.amountCents, currency) : null} />
          <Row label="In stock" value={product.inventory ? (product.inventory.inStock ? 'Yes' : 'No') : '—'} />
          <Row label="Quantity" value={product.inventory?.quantity?.toString()} />
          <Row label="Low-stock threshold" value={product.inventory?.lowStockAmount?.toString()} />
          <Row label="Backorders allowed" value={product.inventory ? (product.inventory.backordersAllowed ? 'Yes' : 'No') : '—'} />
        </Section>

        <Section title="Descriptions">
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">Short</p>
            {product.shortDescription
              ? <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: product.shortDescription.replace(/\\n/g, '') }} />
              : <p>—</p>}
            <p className="text-muted-foreground pt-2">Full</p>
            {product.description
              ? <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: product.description.replace(/\\n/g, '') }} />
              : <p>—</p>}
          </div>
        </Section>

        <Section title="Dimensions">
          <Row label="Weight (kg)" value={product.weightKg} />
          <Row label="Length (cm)" value={product.lengthCm} />
          <Row label="Width (cm)" value={product.widthCm} />
          <Row label="Height (cm)" value={product.heightCm} />
        </Section>

        <Section title="Categories & tags">
          <div className="flex flex-wrap gap-1.5">
            {product.categories.length ? (
              product.categories.map(({ category }) => (
                <Badge key={category.id} variant="secondary">{category.name}</Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No categories</span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {product.tags.length ? (
              product.tags.map(({ tag }) => (
                <Badge key={tag.id} variant="outline">{tag.name}</Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No tags</span>
            )}
          </div>
        </Section>

        {product.attributes.length > 0 && (
          <Section title="Attributes">
            {product.attributes.map((a) => (
              <Row key={a.name} label={a.name} value={a.values.join(', ')} />
            ))}
          </Section>
        )}

        <VariantsManager productId={product.id} />

        <ProductOffersSection productId={product.id} />
      </div>

      <div className="space-y-5">
        <Section title="Images">
          <ProductImagesPanel productId={product.id} />
        </Section>

        <Section title="Banner">
          <ProductBannerPanel productId={product.id} />
        </Section>

        <Section title="Badges">
          <div className="flex flex-wrap gap-2">
            {product.badges.length ? (
              product.badges.map(({ badge, imageUrl }) => (
                <div key={badge.id} className="flex items-center gap-1.5">
                  {imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt={badge.label} className="size-6 rounded object-cover" />
                  )}
                  <span
                    className="rounded-full px-2 py-0.5 text-xs text-white"
                    style={{ backgroundColor: badge.color ?? '#2563eb' }}
                  >
                    {badge.label}
                  </span>
                </div>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No badges</span>
            )}
          </div>
        </Section>

        <Section title="Wholesale pricing">
          {product.wholesaleRules.length ? (
            <ul className="divide-y rounded-md border text-sm">
              {product.wholesaleRules.map((r) => (
                <li key={r.id} className="px-3 py-2">
                  <span className="font-medium">{r.roleKey}</span>
                  <span className="text-muted-foreground"> · {r.minQuantity}+ · </span>
                  {r.discountType === 'PERCENTAGE'
                    ? `${(r.percentageBps ?? 0) / 100}% off`
                    : `${formatCents(r.amountCents ?? 0)} off/unit`}
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-sm text-muted-foreground">No wholesale rules</span>
          )}
        </Section>

        <QuickbooksRefreshCard<QboProductSnapshot>
          endpoint={`/admin/products/${product.id}/quickbooks`}
          queryKey={['product-qbo', product.id]}
          render={(snap) => <QboItemView snap={snap} />}
        />

        <Section title="Meta">
          <Row label="Created" value={formatDate(product.createdAt)} />
          <Row label="Updated" value={formatDate(product.updatedAt)} />
          <Row label="QuickBooks item ID" value={product.quickbooksItemId} />
          <Row label="Legacy Woo ID" value={product.legacyWooId?.toString()} />
        </Section>
      </div>
    </div>
  );
}

function QboItemView({ snap }: { snap: QboProductSnapshot }) {
  if (!snap.linked) return <p className="text-sm text-muted-foreground">Not linked to QuickBooks.</p>;
  if (!snap.connected)
    return <p className="text-sm text-destructive">Could not reach QuickBooks. {snap.error}</p>;
  const i = snap.item;
  return (
    <div className="space-y-1.5 text-sm">
      <Row label="Name" value={i.Name} />
      <Row label="SKU" value={i.Sku} />
      <Row label="Type" value={i.Type} />
      <Row label="Unit price" value={i.UnitPrice != null ? `$${i.UnitPrice.toFixed(2)}` : null} />
      <Row label="Qty on hand" value={i.QtyOnHand?.toString()} />
      <Row label="Active" value={i.Active == null ? null : i.Active ? 'Yes' : 'No'} />
    </div>
  );
}

/* ─────────────────────────── Edit mode ─────────────────────────── */

function ProductEditForm({ product, onDone }: { product: ProductDetail; onDone: () => void }) {
  const queryClient = useQueryClient();
  const isQbo = !!product.quickbooksItemId;
  const currency = product.prices[0]?.currency ?? 'AUD';
  const regular = product.prices.find((p) => p.type === 'REGULAR');
  const sale = product.prices.find((p) => p.type === 'SALE');

  const [name, setName] = useState(product.name);
  const [sku, setSku] = useState(product.sku ?? '');
  const [gtin, setGtin] = useState(product.gtin ?? '');
  const [type, setType] = useState<ProductType>(product.type);
  const [published, setPublished] = useState(product.published);
  const [featured, setFeatured] = useState(product.featured);
  const [catalogVisibility, setCatalogVisibility] = useState(product.catalogVisibility ?? 'visible');
  const [requiresPrescription, setRequiresPrescription] = useState(product.requiresPrescription);
  const [allowReviews, setAllowReviews] = useState(product.allowReviews);
  const [position, setPosition] = useState(product.position?.toString() ?? '');
  const [shortDesc, setShortDesc] = useState(product.shortDescription ?? '');
  const [description, setDescription] = useState(product.description ?? '');
  const [brandId, setBrandId] = useState(product.brand?.id ?? '');
  const [regularPrice, setRegularPrice] = useState(regular ? (regular.amountCents / 100).toFixed(2) : '');
  const [salePrice, setSalePrice] = useState(sale ? (sale.amountCents / 100).toFixed(2) : '');
  const [stock, setStock] = useState(product.inventory?.quantity?.toString() ?? '');
  const [taxStatus, setTaxStatus] = useState(product.taxStatus ?? 'taxable');
  const [taxClass, setTaxClass] = useState(product.taxClass ?? '');
  const [weightKg, setWeightKg] = useState(product.weightKg ?? '');
  const [lengthCm, setLengthCm] = useState(product.lengthCm ?? '');
  const [widthCm, setWidthCm] = useState(product.widthCm ?? '');
  const [heightCm, setHeightCm] = useState(product.heightCm ?? '');

  const [badgeIds, setBadgeIds] = useState<string[]>(product.badges.map((b) => b.badge.id));
  const [categoryIds, setCategoryIds] = useState<string[]>(
    product.categories.map((c) => c.category.id),
  );
  const [tagIds, setTagIds] = useState<string[]>(product.tags.map((t) => t.tag.id));

  const { data: brands } = useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: async () => (await api.get('/admin/brands')).data,
  });
  const { data: allBadges } = useQuery<ProductBadge[]>({
    queryKey: ['badges'],
    queryFn: async () => (await api.get('/admin/badges')).data,
  });
  const { data: allCategories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/admin/categories')).data,
  });
  const { data: allTags } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: async () => (await api.get('/admin/tags')).data,
  });

  const save = useMutation({
    mutationFn: async () => {
      const storefront = {
        type,
        published,
        featured,
        gtin: gtin || undefined,
        catalogVisibility,
        requiresPrescription,
        allowReviews,
        position: position !== '' ? parseInt(position, 10) : undefined,
        shortDescription: shortDesc || undefined,
        description: description || undefined,
        brandId: brandId || undefined,
        salePrice: salePrice ? parseFloat(salePrice) : undefined,
        taxStatus,
        taxClass: taxClass || undefined,
        weightKg: weightKg !== '' ? parseFloat(weightKg) : null,
        lengthCm: lengthCm !== '' ? parseFloat(lengthCm) : null,
        widthCm: widthCm !== '' ? parseFloat(widthCm) : null,
        heightCm: heightCm !== '' ? parseFloat(heightCm) : null,
      };
      const core = isQbo
        ? {}
        : {
            name,
            sku: sku || undefined,
            regularPrice: regularPrice ? parseFloat(regularPrice) : undefined,
            stockQuantity: stock !== '' ? parseInt(stock, 10) : undefined,
          };
      await api.patch(`/admin/products/${product.id}`, { ...storefront, ...core });
      await api.put(`/admin/products/${product.id}/categories`, { categoryIds });
      await api.put(`/admin/products/${product.id}/tags`, { tagIds });
    },
    onSuccess: () => {
      toast.success('Product saved');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onDone();
    },
    onError: () => toast.error('Failed to save product'),
  });

  const toggleBadgeMutation = useMutation({
    mutationFn: (next: string[]) => api.put(`/admin/products/${product.id}/badges`, { badgeIds: next }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-badges', product.id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => toast.error('Failed to update badges'),
  });

  // Badge membership is applied immediately (unlike the rest of the form) so an
  // assignment row exists right away for ProductBadgeImagesPanel to attach an image to.
  const toggleBadge = (id: string) =>
    setBadgeIds((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      toggleBadgeMutation.mutate(next);
      return next;
    });

  const categoryNameById = new Map<string, string>();
  const categoryParentNameById = new Map<string, string>();
  const categoryChildIds = new Map<string, string[]>();
  allCategories?.forEach((cat) => {
    categoryNameById.set(cat.id, cat.name);
    categoryChildIds.set(
      cat.id,
      cat.children.map((child) => child.id),
    );
    cat.children.forEach((child) => {
      categoryNameById.set(child.id, child.name);
      categoryParentNameById.set(child.id, cat.name);
    });
  });

  // Removing a parent category also drops any of its subcategories that are assigned,
  // since a subcategory shouldn't remain assigned once its parent is gone.
  const toggleCategory = (id: string) =>
    setCategoryIds((cur) => {
      if (cur.includes(id)) {
        const childIds = categoryChildIds.get(id) ?? [];
        return cur.filter((x) => x !== id && !childIds.includes(x));
      }
      return [...cur, id];
    });

  const tagNameById = new Map<string, string>();
  allTags?.forEach((tag) => tagNameById.set(tag.id, tag.name));

  const toggleTag = (id: string) =>
    setTagIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-5">
        {isQbo && (
          <p className="text-xs text-muted-foreground rounded-md bg-muted/50 p-3">
            Name, SKU, price and stock are managed in QuickBooks and synced here. Edit the
            storefront fields (type, brand, sale price, descriptions, visibility).
          </p>
        )}

        <Section title="Identity">
          <FieldRow label="Name">
            <Input value={name} disabled={isQbo} onChange={(e) => setName(e.target.value)} />
          </FieldRow>
          {product.hasVariant ? (
            <p className="text-xs text-muted-foreground mb-3">
              This is a variant product — SKUs live on each variant (managed below).
            </p>
          ) : (
            <FieldRow label="SKU">
              <Input value={sku} disabled={isQbo} onChange={(e) => setSku(e.target.value)} />
            </FieldRow>
          )}
          <FieldRow label="GTIN / EAN / Barcode">
            <Input value={gtin} onChange={(e) => setGtin(e.target.value)} />
          </FieldRow>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Type">
              <Select value={type} onValueChange={(v) => setType((v ?? 'GENERAL') as ProductType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Brand">
              <Select value={brandId} onValueChange={(v) => setBrandId(v ?? '')}>
                <SelectTrigger><SelectValue placeholder="No brand" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No brand</SelectItem>
                  {brands
                    ? brands.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))
                    : product.brand && (
                        <SelectItem value={product.brand.id}>{product.brand.name}</SelectItem>
                      )}
                </SelectContent>
              </Select>
            </FieldRow>
          </div>
        </Section>

        <Section title="Pricing & inventory">
          <div className="grid grid-cols-3 gap-3">
            <FieldRow label={`Regular (${currency})`}>
              <Input type="number" step="0.01" value={regularPrice} disabled={isQbo} onChange={(e) => setRegularPrice(e.target.value)} />
            </FieldRow>
            <FieldRow label={`Sale (${currency})`}>
              <Input type="number" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
            </FieldRow>
            <FieldRow label="Stock">
              <Input type="number" value={stock} disabled={isQbo} onChange={(e) => setStock(e.target.value)} />
            </FieldRow>
          </div>
        </Section>

        <Section title="Descriptions">
          <FieldRow label="Short description">
            <Textarea rows={2} value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} />
          </FieldRow>
          <FieldRow label="Full description">
            <Textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
          </FieldRow>
        </Section>

        <Section title="Dimensions">
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Weight (kg)">
              <Input type="number" step="0.001" min="0" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
            </FieldRow>
            <FieldRow label="Length (cm)">
              <Input type="number" step="0.1" min="0" value={lengthCm} onChange={(e) => setLengthCm(e.target.value)} />
            </FieldRow>
            <FieldRow label="Width (cm)">
              <Input type="number" step="0.1" min="0" value={widthCm} onChange={(e) => setWidthCm(e.target.value)} />
            </FieldRow>
            <FieldRow label="Height (cm)">
              <Input type="number" step="0.1" min="0" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
            </FieldRow>
          </div>
        </Section>

        <Section title="Tax">
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Tax status">
              <Select value={taxStatus} onValueChange={(v) => setTaxStatus(v ?? 'taxable')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TAX_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Tax class">
              <Input placeholder="e.g. standard" value={taxClass} onChange={(e) => setTaxClass(e.target.value)} />
            </FieldRow>
          </div>
        </Section>

        <Section title="Visibility">
          <div className="flex items-center justify-between">
            <Label>Published</Label>
            <Switch checked={published} onCheckedChange={setPublished} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <Label>Featured</Label>
            <Switch checked={featured} onCheckedChange={setFeatured} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <div>
              <Label>Requires prescription</Label>
              <p className="text-xs text-muted-foreground">Customers must upload a script to purchase</p>
            </div>
            <Switch checked={requiresPrescription} onCheckedChange={setRequiresPrescription} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <Label>Allow reviews</Label>
            <Switch checked={allowReviews} onCheckedChange={setAllowReviews} />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <FieldRow label="Catalog visibility">
              <Select value={catalogVisibility} onValueChange={(v) => setCatalogVisibility(v ?? 'visible')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATALOG_VISIBILITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Sort position">
              <Input type="number" min="0" step="1" value={position} onChange={(e) => setPosition(e.target.value)} />
            </FieldRow>
          </div>
        </Section>

        <div className="flex gap-2">
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? 'Saving…' : 'Save changes'}
          </Button>
          <Button variant="outline" onClick={onDone}>Cancel</Button>
        </div>
      </div>

      <div className="space-y-5">
        <Section title="Images">
          <ProductImagesPanel productId={product.id} />
        </Section>

        <Section title="Banner">
          <ProductBannerPanel productId={product.id} />
        </Section>

        <Section title="Badges / Stickers">
          {allBadges?.length ? (
            <div className="flex flex-wrap gap-2">
              {allBadges.map((b) => {
                const active = badgeIds.includes(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggleBadge(b.id)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
                      active ? 'border-transparent text-white' : 'border-input text-muted-foreground hover:bg-muted'
                    }`}
                    style={active ? { backgroundColor: b.color ?? '#2563eb' } : undefined}
                  >
                    {active && <Check className="size-3" />}
                    {b.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No badges defined yet — create them under Marketing → Badges.</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">Applied immediately.</p>

          <div className="mt-3 border-t pt-3">
            <ProductBadgeImagesPanel productId={product.id} />
          </div>
        </Section>

        <Section title="Categories">
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Assigned ({categoryIds.length})
            </p>
            {categoryIds.length ? (
              <div className="flex flex-wrap gap-1.5">
                {categoryIds.map((id) => {
                  const name = categoryNameById.get(id) ?? id;
                  const parentName = categoryParentNameById.get(id);
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2.5 py-1 text-xs"
                    >
                      {parentName ? (
                        <>
                          <span className="text-muted-foreground">{parentName} ›</span> {name}
                        </>
                      ) : (
                        name
                      )}
                      <button
                        type="button"
                        onClick={() => toggleCategory(id)}
                        aria-label={`Remove ${name}`}
                        className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No categories assigned.</p>
            )}
          </div>

          {allCategories?.length ? (
            <div className="rounded-md border divide-y max-h-56 overflow-y-auto">
              {allCategories.map((cat) => (
                <div key={cat.id}>
                  <PickerRow
                    id={cat.id}
                    name={cat.name}
                    selected={categoryIds.includes(cat.id)}
                    onToggle={toggleCategory}
                  />
                  {cat.children.map((child) => (
                    <PickerRow
                      key={child.id}
                      id={child.id}
                      name={child.name}
                      selected={categoryIds.includes(child.id)}
                      indent
                      onToggle={toggleCategory}
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No categories defined.</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">Saved with the product.</p>
        </Section>

        <Section title="Tags">
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Assigned ({tagIds.length})
            </p>
            {tagIds.length ? (
              <div className="flex flex-wrap gap-1.5">
                {tagIds.map((id) => {
                  const name = tagNameById.get(id) ?? id;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2.5 py-1 text-xs"
                    >
                      {name}
                      <button
                        type="button"
                        onClick={() => toggleTag(id)}
                        aria-label={`Remove ${name}`}
                        className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No tags assigned.</p>
            )}
          </div>

          {allTags?.length ? (
            <div className="rounded-md border divide-y max-h-56 overflow-y-auto">
              {allTags.map((tag) => (
                <PickerRow
                  key={tag.id}
                  id={tag.id}
                  name={tag.name}
                  selected={tagIds.includes(tag.id)}
                  onToggle={toggleTag}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No tags defined.</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">Saved with the product.</p>
        </Section>

        <Section title="Wholesale pricing">
          <WholesaleRulesPanel productId={product.id} />
        </Section>
      </div>
    </div>
  );
}

/* ─────────────────────────── helpers ─────────────────────────── */

function DeleteProductButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const del = useMutation({
    mutationFn: () => api.delete(`/admin/products/${productId}`),
    onSuccess: () => {
      toast.success('Product deleted');
      router.push('/products');
    },
    onError: () => toast.error('Delete failed'),
  });
  if (!confirming) {
    return (
      <Button variant="outline" onClick={() => setConfirming(true)}>
        Delete
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Button variant="destructive" disabled={del.isPending} onClick={() => del.mutate()}>
        {del.isPending ? 'Deleting…' : 'Confirm delete'}
      </Button>
      <Button variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border p-4">
      <p className="text-sm font-medium mb-3">{title}</p>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 py-0.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || '—'}</span>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 mb-3">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function PickerRow({
  id,
  name,
  selected,
  indent = false,
  onToggle,
}: {
  id: string;
  name: string;
  selected: boolean;
  indent?: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <label
      className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40 ${indent ? 'pl-7' : ''}`}
    >
      <input
        type="checkbox"
        className="accent-primary"
        checked={selected}
        onChange={() => onToggle(id)}
      />
      {name}
    </label>
  );
}
