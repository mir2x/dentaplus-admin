// Public customer-facing site — used to link "View on site" actions from the
// admin panel back to the live product/category page.
export const STOREFRONT_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? 'http://localhost:3001';

export function storefrontProductUrl(slug: string): string {
  return `${STOREFRONT_URL}/products/${slug}`;
}

export function storefrontCategoryUrl(slug: string): string {
  return `${STOREFRONT_URL}/categories/${slug}`;
}
