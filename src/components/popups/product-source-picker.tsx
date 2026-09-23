'use client';

import type { ProductSort, ProductSource } from '@/types/popups';
import { EntityMultiPicker, EntityPicker } from './entity-picker';
import { Field, OptionSelect } from './form-bits';

const MODE_OPTIONS = [
  { value: 'manual', label: 'Hand-picked products' },
  { value: 'category', label: 'From a category' },
  { value: 'collection', label: 'From a collection' },
  { value: 'tag', label: 'From a tag' },
  { value: 'offer', label: 'Products in an offer' },
  { value: 'bestSellers', label: 'Best sellers' },
  { value: 'recentlyViewed', label: "Visitor's recently viewed" },
  { value: 'cartRelated', label: 'Related to their cart' },
  { value: 'currentPage', label: 'Related to the current page' },
] as const;

/** Automatic sources: what the visitor sees, and the preview caveat. */
const AUTO_EXPLANATIONS: Partial<Record<ProductSource['mode'], string>> = {
  bestSellers: 'The store’s best-selling products right now.',
  recentlyViewed:
    'Products this visitor looked at recently (excluding the page they are on). Hidden if they haven’t viewed any.',
  cartRelated:
    'Best sellers from the same categories as the items in their cart, excluding what’s already in it. Hidden when the cart is empty.',
  currentPage:
    'On a product page: related products. On a category page: that category’s best sellers. Hidden on other pages.',
};

const VISITOR_DEPENDENT = new Set<ProductSource['mode']>(['recentlyViewed', 'cartRelated', 'currentPage']);

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'best_selling', label: 'Best selling' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name A–Z' },
];

function emptySource(mode: ProductSource['mode']): ProductSource {
  if (mode === 'manual') return { mode, productIds: [] };
  if (mode === 'offer') return { mode, offerId: '' };
  if (mode === 'bestSellers' || mode === 'recentlyViewed' || mode === 'cartRelated' || mode === 'currentPage') {
    return { mode };
  }
  return { mode, id: '', sort: 'newest' };
}

export function ProductSourcePicker({
  value,
  onChange,
}: {
  value: ProductSource;
  onChange: (s: ProductSource) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="Which products">
        <OptionSelect value={value.mode} options={MODE_OPTIONS} onChange={(m) => onChange(emptySource(m))} />
      </Field>

      {value.mode === 'manual' && (
        <Field label="Products" hint="Shown in this order. Up to 24.">
          <EntityMultiPicker
            kind="product"
            max={24}
            value={value.productIds}
            onChange={(productIds) => onChange({ mode: 'manual', productIds })}
          />
        </Field>
      )}

      {(value.mode === 'category' || value.mode === 'collection' || value.mode === 'tag') && (
        <>
          <Field label={value.mode === 'category' ? 'Category' : value.mode === 'collection' ? 'Collection' : 'Tag'}>
            <EntityPicker
              kind={value.mode}
              value={value.id || undefined}
              onChange={(id) => onChange({ ...value, id: id ?? '' })}
            />
          </Field>
          <Field label="Sort">
            <OptionSelect
              value={value.sort ?? 'newest'}
              options={SORT_OPTIONS}
              onChange={(sort) => onChange({ ...value, sort })}
            />
          </Field>
        </>
      )}

      {value.mode === 'offer' && (
        <Field label="Offer" hint="Shows the offer's trigger products — kept in sync if the offer changes.">
          <EntityPicker
            kind="offer"
            value={value.offerId || undefined}
            onChange={(offerId) => onChange({ mode: 'offer', offerId: offerId ?? '' })}
          />
        </Field>
      )}

      {AUTO_EXPLANATIONS[value.mode] && (
        <div className="space-y-1 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <p>{AUTO_EXPLANATIONS[value.mode]}</p>
          {VISITOR_DEPENDENT.has(value.mode) && (
            <p>The preview here shows best sellers instead, since it has no real visitor.</p>
          )}
        </div>
      )}
    </div>
  );
}
