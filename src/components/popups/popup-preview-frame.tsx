'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Monitor, Smartphone } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { STOREFRONT_URL } from '@/lib/storefront';
import type { Block, EligiblePopup, LeafBlock, PopupDesign } from '@/types/popups';
import { cn } from '@/lib/utils';

/** Drops blocks the admin hasn't finished yet so the preview doesn't 400 mid-edit. */
function isPreviewable(b: LeafBlock): boolean {
  switch (b.type) {
    case 'image':
      return !!b.url;
    case 'coupon':
      return !!b.promoCodeId;
    case 'products': {
      const s = b.source;
      if (s.mode === 'manual') return s.productIds.length > 0;
      if (s.mode === 'offer') return !!s.offerId;
      if (s.mode === 'category' || s.mode === 'collection' || s.mode === 'tag') return !!s.id;
      return true; // visitor-dependent sources: the backend previews best sellers
    }
    case 'buttons':
      return b.items.every((i) => !('id' in i.target) || !!i.target.id);
    case 'form':
      return b.couponMode === 'none' || !b.couponMode || !!b.couponPromoCodeId;
    case 'video':
      return /^[\w-]{3,32}$/.test(b.videoId);
    case 'countdown':
      return b.mode === 'fixed' ? !!b.endsAt : b.mode === 'offerEnd' ? !!b.offerId : !!b.minutes;
    case 'offerProgress':
      return !!b.offerId;
    case 'pageEmbed':
      return !!b.target.id;
    default:
      return true;
  }
}

function previewBlocks(blocks: Block[]): Block[] {
  return blocks.flatMap((b): Block[] => {
    if (b.type === 'columns') return [{ ...b, columns: b.columns.map((col) => col.filter(isPreviewable)) }];
    if (b.type === 'image' && b.target && 'id' in b.target && !b.target.id) return isPreviewable(b) ? [{ ...b, target: undefined }] : [];
    return isPreviewable(b) ? [b] : [];
  });
}

const STOREFRONT_ORIGIN = (() => {
  try {
    return new URL(STOREFRONT_URL).origin;
  } catch {
    return '*';
  }
})();

/**
 * Live preview: the real storefront renderer in an iframe
 * (`/popup-preview`), fed the draft via postMessage after the backend
 * hydrates it (products, links, coupon codes). See POPUP_API_CONTRACT
 * "Live preview protocol".
 */
export function PopupPreviewFrame({ design, blocks }: { design: PopupDesign; blocks: Block[] }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [ready, setReady] = useState(false);
  const [hydrated, setHydrated] = useState<EligiblePopup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (STOREFRONT_ORIGIN !== '*' && e.origin !== STOREFRONT_ORIGIN) return;
      if ((e.data as { type?: string } | null)?.type === 'dp-popup-preview-ready') setReady(true);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Debounced hydrate of the draft.
  const draftKey = JSON.stringify({ design, blocks });
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.post<EligiblePopup>('/admin/popups/hydrate', {
          design,
          blocks: previewBlocks(blocks),
        });
        if (!cancelled) {
          setHydrated(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, 'Preview unavailable'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // draftKey captures design + blocks by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  useEffect(() => {
    if (!ready || !hydrated) return;
    frameRef.current?.contentWindow?.postMessage(
      { type: 'dp-popup-preview', popup: hydrated, device },
      STOREFRONT_ORIGIN,
    );
  }, [ready, hydrated, device]);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-md border p-0.5">
          {(
            [
              ['desktop', Monitor],
              ['mobile', Smartphone],
            ] as const
          ).map(([d, Icon]) => (
            <button
              key={d}
              type="button"
              aria-label={`${d} preview`}
              onClick={() => setDevice(d)}
              className={cn('rounded px-2 py-1', device === d ? 'bg-muted' : 'text-muted-foreground hover:bg-muted/50')}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
        {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        {error && <span className="truncate text-xs text-destructive">{error}</span>}
      </div>
      <div className="flex min-h-[560px] flex-1 justify-center overflow-hidden rounded-lg border bg-muted/40">
        <iframe
          ref={frameRef}
          title="Popup preview"
          src={`${STOREFRONT_URL}/popup-preview`}
          className={cn('h-full min-h-[560px] bg-white transition-all', device === 'mobile' ? 'w-[390px] border-x' : 'w-full')}
          onLoad={() => {
            // The storefront posts "ready" on load; re-send in case we missed it.
            setReady(true);
          }}
        />
      </div>
    </div>
  );
}
