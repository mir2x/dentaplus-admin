'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { hasPageAccess } from '@/lib/admin-pages';
import { useAuthStore } from '@/stores/auth';

interface SearchResult {
  type: 'order' | 'customer' | 'product' | 'invoice';
  title: string;
  subtitle: string;
  href: string;
}

const RESULT_LABELS: Record<SearchResult['type'], string> = {
  order: 'Order',
  customer: 'Customer',
  product: 'Product',
  invoice: 'Invoice',
};

const TITLES: { match: (p: string) => boolean; title: string }[] = [
  { match: (p) => p === '/dashboard', title: 'Dashboard' },
  { match: (p) => p.startsWith('/credit-applications'), title: 'Credit Applications' },
  { match: (p) => p === '/invoices/new', title: 'New Invoice' },
  { match: (p) => p.startsWith('/invoices/'), title: 'Invoice Detail' },
  { match: (p) => p.startsWith('/invoices'), title: 'Invoices' },
  { match: (p) => p.startsWith('/statements'), title: 'Statements' },
  { match: (p) => p.startsWith('/accounts-receivable'), title: 'Accounts Receivable' },
  { match: (p) => p.startsWith('/orders/'), title: 'Order Detail' },
  { match: (p) => p === '/orders', title: 'Orders' },
  { match: (p) => /\/products\/[^/]+\/variants\//.test(p), title: 'Variant Detail' },
  { match: (p) => p === '/products/new', title: 'New Product' },
  { match: (p) => p.startsWith('/products/'), title: 'Product Detail' },
  { match: (p) => p === '/products', title: 'Products' },
  { match: (p) => p.startsWith('/categories'), title: 'Categories' },
  { match: (p) => p.startsWith('/tags'), title: 'Tags' },
  { match: (p) => p.startsWith('/customers/'), title: 'Customer Detail' },
  { match: (p) => p === '/customers', title: 'Customers' },
  { match: (p) => p.startsWith('/promo-codes'), title: 'Promo Codes' },
  { match: (p) => p.startsWith('/offers'), title: 'Offers' },
  { match: (p) => p.startsWith('/badges'), title: 'Badges' },
  { match: (p) => p.startsWith('/blog'), title: 'Blog' },
  { match: (p) => p.startsWith('/faq'), title: 'FAQ' },
  { match: (p) => p.startsWith('/contact-messages'), title: 'Contact Messages' },
  { match: (p) => p.startsWith('/reviews'), title: 'Reviews' },
  { match: (p) => p.startsWith('/shipping'), title: 'Shipping' },
  { match: (p) => p === '/settings', title: 'Settings' },
];

function getTitle(pathname: string): string {
  return TITLES.find(({ match }) => match(pathname))?.title ?? 'Admin';
}

export function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const allowedPages = useAuthStore((state) => state.user?.allowedPages ?? []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const title = getTitle(pathname);
  const results = useQuery<SearchResult[]>({
    queryKey: ['admin-search', query],
    queryFn: async () => (await api.get('/admin/search', { params: { q: query } })).data,
    enabled: query.trim().length >= 2,
  });
  const visibleResults = (results.data ?? []).filter((result) =>
    hasPageAccess(allowedPages, result.href),
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function selectResult(result: SearchResult) {
    router.push(result.href);
    setQuery('');
    setOpen(false);
  }

  return (
    <header className="relative flex items-center gap-3 border-b px-4 py-3">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      <h1 className="text-sm font-medium">{title}</h1>
      <div className="relative ml-auto w-full max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          placeholder="Search admin…  Ctrl K"
          className="pl-8"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        />
        {open && query.trim().length >= 2 && (
          <div className="absolute right-0 top-full z-50 mt-1 max-h-96 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-lg">
            {results.isLoading ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>
            ) : visibleResults.length ? (
              visibleResults.map((result) => (
                <button
                  key={`${result.type}:${result.href}`}
                  type="button"
                  className="flex w-full items-start gap-3 rounded-sm px-3 py-2 text-left hover:bg-muted"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectResult(result)}
                >
                  <span className="mt-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                    {RESULT_LABELS[result.type]}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{result.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{result.subtitle}</span>
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-sm text-muted-foreground">No matching records.</p>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
