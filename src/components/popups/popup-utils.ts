import type {
  Block,
  BlockType,
  Condition,
  ConditionType,
  EffectiveStatus,
  LeafBlock,
  LeafBlockType,
  PageType,
  RuleGroup,
  Target,
  Trigger,
  TriggerType,
} from '@/types/popups';
import { isRuleGroup } from '@/types/popups';

/** Short random id for blocks, buttons and form fields. */
export function newId(prefix = 'b'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export const BLOCK_LABELS: Record<BlockType, string> = {
  heading: 'Heading',
  richText: 'Text',
  image: 'Image',
  buttons: 'Buttons',
  products: 'Products',
  form: 'Email form',
  coupon: 'Coupon',
  spacer: 'Spacer',
  divider: 'Divider',
  video: 'Video',
  countdown: 'Countdown',
  offerProgress: 'Offer progress',
  pageEmbed: 'Page / blog post',
  columns: 'Columns',
};

export const LEAF_BLOCK_TYPES: LeafBlockType[] = [
  'heading',
  'richText',
  'image',
  'buttons',
  'products',
  'form',
  'coupon',
  'video',
  'countdown',
  'offerProgress',
  'pageEmbed',
  'spacer',
  'divider',
];

export const BLOCK_TYPES: BlockType[] = [...LEAF_BLOCK_TYPES, 'columns'];

/**
 * New blocks start valid except where the admin must pick something (image
 * url, products, promo code) — the inspector highlights those, and the
 * backend rejects the save with a precise path if left empty.
 */
export function createLeafBlock(type: LeafBlockType): LeafBlock {
  const id = newId();
  switch (type) {
    case 'heading':
      return { id, type, text: 'Your headline here', size: 'lg', align: 'center' };
    case 'richText':
      return { id, type, html: '<p style="text-align: center">Tell visitors why they should care.</p>' };
    case 'image':
      return { id, type, url: '', alt: '', aspect: 'auto', rounded: true };
    case 'buttons':
      return {
        id,
        type,
        align: 'center',
        fullWidth: false,
        items: [{ id: newId('btn'), label: 'Shop now', variant: 'primary', target: { kind: 'path', value: '/shop' } }],
      };
    case 'products':
      return {
        id,
        type,
        source: { mode: 'manual', productIds: [] },
        display: 'grid',
        limit: 4,
        showPrice: true,
        showAddToCart: true,
        showOfferBadge: true,
      };
    case 'form':
      return {
        id,
        type,
        fields: [{ id: 'email', kind: 'email', label: 'Email', placeholder: 'you@example.com', required: true }],
        consent: {
          enabled: true,
          required: true,
          text: 'I agree to receive marketing emails from DentaPlus. Unsubscribe at any time.',
        },
        submitLabel: 'Subscribe',
        success: { heading: 'Thanks!', message: "You're on the list." },
        couponMode: 'none',
        uniqueCodePrefix: 'WELCOME',
        sendEmail: false,
        doubleOptIn: false,
        emailSubject: 'Thanks for subscribing to DentaPlus',
        emailMessage: 'Thanks for joining the DentaPlus list.',
      };
    case 'coupon':
      return { id, type, promoCodeId: '', reveal: 'visible', label: 'Use code at checkout' };
    case 'spacer':
      return { id, type, size: 'md' };
    case 'divider':
      return { id, type };
    case 'video':
      return { id, type, provider: 'youtube', videoId: '', autoplay: false, aspect: '16:9' };
    case 'countdown': {
      // Default: a fixed countdown ending a week from now, so it validates immediately.
      const endsAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
      return { id, type, mode: 'fixed', endsAt, label: 'Offer ends in', onExpire: 'hideBlock', align: 'center' };
    }
    case 'offerProgress':
      return {
        id,
        type,
        offerId: '',
        message: 'Add {remaining} more to get {reward}',
        unlockedMessage: "You've unlocked {reward}!",
      };
    case 'pageEmbed':
      return { id, type, target: { kind: 'customPage', id: '' }, mode: 'excerpt', showTitle: true, readMoreLabel: 'Read more' };
  }
}

export function createBlock(type: BlockType): Block {
  if (type === 'columns') {
    return {
      id: newId(),
      type: 'columns',
      columns: [[createLeafBlock('image')], [createLeafBlock('heading'), createLeafBlock('buttons')]],
      gap: 'md',
      verticalAlign: 'center',
      stackOnMobile: true,
    };
  }
  return createLeafBlock(type);
}

/** Deep copy with fresh ids — used by "duplicate block". */
export function cloneBlock<T extends Block>(block: T): T {
  const copy = structuredClone(block);
  copy.id = newId();
  if (copy.type === 'columns') {
    copy.columns = copy.columns.map((col) => col.map((b) => ({ ...b, id: newId() })));
  }
  if (copy.type === 'buttons') copy.items = copy.items.map((i) => ({ ...i, id: newId('btn') }));
  return copy;
}

/** One-line description shown on a collapsed block row. */
export function blockSummary(block: Block): string {
  switch (block.type) {
    case 'heading':
      return block.text;
    case 'richText':
      return block.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Empty';
    case 'image':
      return block.url ? block.alt || 'Image' : 'No image yet';
    case 'buttons':
      return block.items.map((i) => i.label).join(' · ');
    case 'products': {
      const s = block.source;
      if (s.mode === 'manual') return `${s.productIds.length} hand-picked product(s)`;
      if (s.mode === 'offer') return 'Products in an offer';
      if (s.mode === 'bestSellers') return 'Best sellers';
      if (s.mode === 'recentlyViewed') return "Visitor's recently viewed";
      if (s.mode === 'cartRelated') return 'Related to the cart';
      if (s.mode === 'currentPage') return 'Related to the current page';
      return `From ${s.mode}`;
    }
    case 'form': {
      const extras = [
        block.couponMode === 'unique' ? 'unique coupon' : block.couponMode === 'shared' ? 'coupon' : '',
        block.doubleOptIn ? 'double opt-in' : block.sendEmail ? 'sends email' : '',
      ].filter(Boolean);
      return block.fields.map((f) => f.label).join(', ') + (extras.length ? ` · ${extras.join(', ')}` : '');
    }
    case 'video':
      return block.videoId ? `${block.provider === 'youtube' ? 'YouTube' : 'Vimeo'} ${block.videoId}` : 'No video yet';
    case 'countdown':
      return block.mode === 'fixed'
        ? `Until ${block.endsAt ? new Date(block.endsAt).toLocaleString('en-AU') : '…'}`
        : block.mode === 'offerEnd'
          ? 'Until the offer ends'
          : `${block.minutes ?? '?'} min per visitor`;
    case 'offerProgress':
      return block.offerId ? 'Progress toward an offer' : 'No offer picked';
    case 'pageEmbed':
      return block.target.id ? `${block.target.kind === 'customPage' ? 'Info page' : 'Blog post'} (${block.mode ?? 'excerpt'})` : 'Nothing picked';
    case 'coupon':
      return block.promoCodeId ? 'Promo code' : 'No promo code picked';
    case 'spacer':
      return `Size ${block.size ?? 'md'}`;
    case 'divider':
      return 'Line';
    case 'columns':
      return `${block.columns.length} columns`;
  }
}

// ── Status ──────────────────────────────────────────────────────────────────

export const EFFECTIVE_STATUS_STYLES: Record<EffectiveStatus, { label: string; className: string }> = {
  LIVE: { label: 'Live', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  SCHEDULED: { label: 'Scheduled', className: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300' },
  DRAFT: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  PAUSED: { label: 'Paused', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  ENDED: { label: 'Ended', className: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300' },
  ARCHIVED: { label: 'Archived', className: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-500' },
};

// ── Labels ──────────────────────────────────────────────────────────────────

export const PAGE_TYPE_LABELS: Record<PageType, string> = {
  home: 'Home page',
  product: 'Product pages',
  category: 'Category pages',
  shop: 'Shop',
  blog: 'Blog index',
  blogPost: 'Blog posts',
  customPage: 'Info pages',
  cart: 'Cart',
  account: 'Account',
  other: 'Other pages',
};

export const CONDITION_LABELS: Record<ConditionType, string> = {
  pageType: 'Page type',
  product: 'Specific products',
  category: 'Categories',
  collection: 'Collections',
  tag: 'Tags',
  customPage: 'Info pages',
  blogPost: 'Blog posts',
  path: 'URL path',
  auth: 'Signed in / guest',
  customerRole: 'Customer role',
  creditAccount: 'Has credit account',
  orderCount: 'Number of orders',
  submittedAnyForm: 'Already signed up via a popup',
  cartContainsProduct: 'Cart contains products',
  cartContainsCategory: 'Cart contains category',
  cartContainsOffer: 'Cart has an offer item',
  timeWindow: 'Day & time',
  device: 'Device',
  queryParam: 'URL parameter',
  utm: 'Campaign (UTM)',
  referrer: 'Came from site',
  visitorType: 'New / returning',
  cartSubtotal: 'Cart subtotal',
  cartItemCount: 'Items in cart',
};

export const CONDITION_GROUPS: { label: string; types: ConditionType[] }[] = [
  { label: 'Where', types: ['pageType', 'product', 'category', 'collection', 'tag', 'customPage', 'blogPost', 'path'] },
  { label: 'Who', types: ['auth', 'customerRole', 'creditAccount', 'orderCount', 'submittedAnyForm'] },
  { label: 'Cart', types: ['cartContainsProduct', 'cartContainsCategory', 'cartContainsOffer', 'cartSubtotal', 'cartItemCount'] },
  { label: 'Context', types: ['timeWindow', 'device', 'visitorType', 'utm', 'referrer', 'queryParam'] },
];

export function createCondition(type: ConditionType): Condition {
  switch (type) {
    case 'pageType':
      return { type, not: false, values: ['home'] };
    case 'product':
    case 'collection':
    case 'tag':
    case 'customPage':
    case 'blogPost':
      return { type, not: false, ids: [] };
    case 'category':
      return { type, not: false, ids: [], includeDescendants: true };
    case 'path':
      return { type, not: false, patterns: ['/products/*'] };
    case 'auth':
      return { type, not: false, value: 'guest' };
    case 'customerRole':
      return { type, not: false, keys: [] };
    case 'creditAccount':
    case 'submittedAnyForm':
      return { type, not: false };
    case 'orderCount':
      return { type, not: false, op: 'eq', value: 0 };
    case 'device':
      return { type, not: false, values: ['mobile'] };
    case 'queryParam':
      return { type, not: false, key: 'utm_campaign' };
    case 'cartContainsProduct':
    case 'cartContainsOffer':
      return { type, not: false, ids: [] };
    case 'cartContainsCategory':
      return { type, not: false, ids: [], includeDescendants: true };
    case 'timeWindow':
      return { type, not: false, days: [1, 2, 3, 4, 5], fromHour: 9, toHour: 17 };
    case 'utm':
      return { type, not: false, source: '' };
    case 'referrer':
      return { type, not: false, hostContains: 'google.' };
    case 'visitorType':
      return { type, not: false, value: 'new' };
    case 'cartSubtotal':
      return { type, not: false, op: 'gte', cents: 10000 };
    case 'cartItemCount':
      return { type, not: false, op: 'gte', value: 1 };
  }
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "9am", "12pm", "midnight" for 0/24. */
export function hourLabel(h: number): string {
  if (h === 0 || h === 24) return 'midnight';
  if (h === 12) return 'noon';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

export function formatDollars(cents: number): string {
  return (cents / 100).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
}

function describeCondition(c: Condition): string {
  const n = c.not;
  const list = (ids: string[], noun: string) => `${ids.length} ${noun}${ids.length === 1 ? '' : 's'}`;
  switch (c.type) {
    case 'pageType':
      return `${n ? 'not on' : 'on'} ${c.values.map((v) => PAGE_TYPE_LABELS[v].toLowerCase()).join(' or ')}`;
    case 'product':
      return `${n ? 'not viewing' : 'viewing'} ${list(c.ids, 'selected product')}`;
    case 'category':
      return `${n ? 'not in' : 'in'} ${list(c.ids, 'category')}${c.includeDescendants === false ? '' : ' (incl. subcategories)'}`;
    case 'collection':
      return `${n ? 'not in' : 'in'} ${list(c.ids, 'collection')}`;
    case 'tag':
      return `${n ? 'without' : 'with'} ${list(c.ids, 'tag')}`;
    case 'customPage':
      return `${n ? 'not on' : 'on'} ${list(c.ids, 'info page')}`;
    case 'blogPost':
      return `${n ? 'not on' : 'on'} ${list(c.ids, 'blog post')}`;
    case 'path':
      return `URL ${n ? "doesn't match" : 'matches'} ${c.patterns.join(', ')}`;
    case 'auth': {
      const who = c.value === 'guest' ? 'guest' : 'signed in';
      return n ? `not ${who}` : who;
    }
    case 'customerRole':
      return `${n ? 'without' : 'with'} role ${c.keys.join(' / ') || '…'}`;
    case 'creditAccount':
      return n ? 'without a credit account' : 'with a credit account';
    case 'orderCount': {
      const op = { gte: 'at least', lte: 'at most', eq: 'exactly' }[c.op];
      return `${n ? 'not ' : ''}with ${op} ${c.value} order${c.value === 1 ? '' : 's'}`;
    }
    case 'submittedAnyForm':
      return n ? 'not yet signed up' : 'already signed up';
    case 'device':
      return `${n ? 'not on' : 'on'} ${c.values.join(' or ')}`;
    case 'queryParam':
      return `URL ${n ? 'without' : 'with'} ?${c.key}${c.value ? `=${c.value}` : ''}`;
    case 'cartContainsProduct':
      return `${n ? "whose cart doesn't contain" : 'whose cart contains'} any of ${list(c.ids, 'product')}`;
    case 'cartContainsCategory':
      return `${n ? "whose cart has nothing from" : 'whose cart has something from'} ${list(c.ids, 'category')}`;
    case 'cartContainsOffer':
      return `${n ? "whose cart has no item from" : 'whose cart has an item from'} ${list(c.ids, 'offer')}`;
    case 'timeWindow': {
      const days =
        c.days.length === 7
          ? 'any day'
          : c.days
              .slice()
              .sort()
              .map((d) => WEEKDAY_LABELS[d])
              .join('/');
      const hours = c.fromHour === 0 && c.toHour === 24 ? 'all day' : `${hourLabel(c.fromHour)}–${hourLabel(c.toHour)}`;
      return `${n ? 'outside' : 'during'} ${days}, ${hours} (Sydney time)`;
    }
    case 'utm': {
      const parts = [
        c.source && `source "${c.source}"`,
        c.medium && `medium "${c.medium}"`,
        c.campaign && `campaign "${c.campaign}"`,
      ].filter(Boolean);
      return `${n ? 'not arriving' : 'arriving'} from a campaign${parts.length ? ` with ${parts.join(', ')}` : ''}`;
    }
    case 'referrer':
      return `${n ? 'not referred' : 'referred'} by a site containing "${c.hostContains}"`;
    case 'visitorType':
      return n ? `not a ${c.value} visitor` : `a ${c.value} visitor`;
    case 'cartSubtotal':
      return `${n ? 'without' : 'with'} a cart subtotal ${c.op === 'gte' ? 'of at least' : 'of at most'} ${formatDollars(c.cents)}`;
    case 'cartItemCount': {
      const op = { gte: 'at least', lte: 'at most', eq: 'exactly' }[c.op];
      return `${n ? 'without' : 'with'} ${op} ${c.value} item${c.value === 1 ? '' : 's'} in the cart`;
    }
  }
}

/** Plain-English rendering of a rule tree ("" when the group is empty). */
export function describeGroup(group: RuleGroup): string {
  const parts = group.items
    .map((item) => (isRuleGroup(item) ? describeGroup(item) : describeCondition(item)))
    .filter(Boolean);
  if (!parts.length) return '';
  const joined = parts.join(group.op === 'and' ? ' and ' : ' or ');
  return parts.length > 1 ? `(${joined})` : joined;
}

// ── Triggers ────────────────────────────────────────────────────────────────

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  pageLoad: 'As soon as the page loads',
  delay: 'After a delay',
  scroll: 'After scrolling',
  exitIntent: 'When the visitor is about to leave',
  click: 'When an element with data-popup is clicked',
  idle: 'When the visitor goes idle',
  pageViews: 'On the Nth page of a visit',
  addToCart: 'When something is added to the cart',
  cartValueReached: 'When the cart reaches an amount',
  offerUnlocked: 'When a cart offer is unlocked',
  login: 'Right after the visitor signs in',
};

export function createTrigger(type: TriggerType): Trigger {
  switch (type) {
    case 'delay':
      return { type, seconds: 5 };
    case 'scroll':
      return { type, percent: 50 };
    case 'idle':
      return { type, seconds: 30 };
    case 'pageViews':
      return { type, count: 3 };
    case 'cartValueReached':
      return { type, cents: 10000 };
    default:
      return { type } as Trigger;
  }
}

// ── Targets ─────────────────────────────────────────────────────────────────

export const TARGET_KIND_LABELS: Record<Target['kind'], string> = {
  product: 'Product',
  category: 'Category',
  collection: 'Collection',
  tag: 'Tag',
  customPage: 'Info page',
  blogPost: 'Blog post',
  offer: 'Offer',
  path: 'Site path',
  url: 'External URL',
  action: 'Action',
};
