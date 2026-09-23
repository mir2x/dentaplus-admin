// TS copy of dentaplus-backend/src/popups/popup.schema.ts (schemaVersion 1)
// plus the admin API shapes. Keep in sync with the backend — see
// POPUP_SYSTEM_PLAN.md D2.

export const POPUP_SCHEMA_VERSION = 1;

// ── Target ──────────────────────────────────────────────────────────────────

export const ENTITY_TARGET_KINDS = [
  'product',
  'category',
  'collection',
  'tag',
  'customPage',
  'blogPost',
  'offer',
] as const;
export type EntityTargetKind = (typeof ENTITY_TARGET_KINDS)[number];

export type Target =
  | { kind: EntityTargetKind; id: string }
  | { kind: 'path'; value: string }
  | { kind: 'url'; value: string; newTab?: boolean }
  | { kind: 'action'; value: 'close' | 'openCart' | 'accept' };

// ── Blocks ──────────────────────────────────────────────────────────────────

export type Align = 'left' | 'center' | 'right';

interface BlockBase {
  id: string;
  visibility?: 'all' | 'desktop' | 'mobile';
  style?: { paddingY?: number; background?: string };
}

export type ProductSort = 'newest' | 'price_asc' | 'price_desc' | 'best_selling' | 'name';

export type ProductSource =
  | { mode: 'manual'; productIds: string[] }
  | { mode: 'category' | 'collection' | 'tag'; id: string; sort?: ProductSort }
  | { mode: 'offer'; offerId: string }
  | { mode: 'bestSellers' }
  | { mode: 'recentlyViewed' }
  | { mode: 'cartRelated' }
  | { mode: 'currentPage' };

export interface HeadingBlock extends BlockBase {
  type: 'heading';
  text: string;
  size?: 'md' | 'lg' | 'xl';
  align?: Align;
  color?: string;
}

export interface RichTextBlock extends BlockBase {
  type: 'richText';
  html: string;
}

export interface ImageBlock extends BlockBase {
  type: 'image';
  url: string;
  mobileUrl?: string;
  alt?: string;
  target?: Target;
  aspect?: 'auto' | '1:1' | '4:3' | '16:9' | '3:1';
  rounded?: boolean;
}

export interface ButtonItem {
  id: string;
  label: string;
  target: Target;
  variant?: 'primary' | 'secondary' | 'outline' | 'link';
}

export interface ButtonsBlock extends BlockBase {
  type: 'buttons';
  items: ButtonItem[];
  align?: Align;
  fullWidth?: boolean;
}

export interface ProductsBlock extends BlockBase {
  type: 'products';
  source: ProductSource;
  display?: 'card' | 'grid' | 'carousel' | 'list';
  limit?: number;
  showPrice?: boolean;
  showAddToCart?: boolean;
  showOfferBadge?: boolean;
}

export interface FormField {
  id: string;
  kind: 'email' | 'text' | 'phone' | 'textarea';
  label: string;
  placeholder?: string;
  required?: boolean;
}

export interface FormBlock extends BlockBase {
  type: 'form';
  fields: FormField[];
  consent?: { enabled?: boolean; required?: boolean; text?: string };
  submitLabel?: string;
  success?: { heading?: string; message?: string };
  couponMode?: 'none' | 'shared' | 'unique';
  /** Shared code, or the template cloned for unique codes. */
  couponPromoCodeId?: string;
  uniqueCodePrefix?: string;
  uniqueExpiresInDays?: number;
  sendEmail?: boolean;
  doubleOptIn?: boolean;
  emailSubject?: string;
  emailMessage?: string;
}

export interface CouponBlock extends BlockBase {
  type: 'coupon';
  promoCodeId: string;
  reveal?: 'visible' | 'clickToReveal';
  label?: string;
}

export interface SpacerBlock extends BlockBase {
  type: 'spacer';
  size?: 'sm' | 'md' | 'lg';
}

export interface DividerBlock extends BlockBase {
  type: 'divider';
}

export interface VideoBlock extends BlockBase {
  type: 'video';
  provider: 'youtube' | 'vimeo';
  videoId: string;
  autoplay?: boolean;
  aspect?: '16:9' | '4:3' | '1:1' | '9:16';
}

export interface CountdownBlock extends BlockBase {
  type: 'countdown';
  mode: 'fixed' | 'offerEnd' | 'evergreen';
  endsAt?: string;
  offerId?: string;
  minutes?: number;
  label?: string;
  onExpire?: 'hideBlock' | 'closePopup';
  align?: Align;
}

export interface OfferProgressBlock extends BlockBase {
  type: 'offerProgress';
  offerId: string;
  message?: string;
  unlockedMessage?: string;
}

export interface PageEmbedBlock extends BlockBase {
  type: 'pageEmbed';
  target: { kind: 'customPage' | 'blogPost'; id: string };
  mode?: 'excerpt' | 'full';
  showTitle?: boolean;
  readMoreLabel?: string;
}

export type LeafBlock =
  | HeadingBlock
  | RichTextBlock
  | ImageBlock
  | ButtonsBlock
  | ProductsBlock
  | FormBlock
  | CouponBlock
  | SpacerBlock
  | DividerBlock
  | VideoBlock
  | CountdownBlock
  | OfferProgressBlock
  | PageEmbedBlock;

export interface ColumnsBlock extends BlockBase {
  type: 'columns';
  columns: LeafBlock[][];
  gap?: 'sm' | 'md' | 'lg';
  verticalAlign?: 'top' | 'center' | 'bottom';
  stackOnMobile?: boolean;
}

export type Block = LeafBlock | ColumnsBlock;
export type BlockType = Block['type'];
export type LeafBlockType = LeafBlock['type'];

// ── Design ──────────────────────────────────────────────────────────────────

export interface TeaserSettings {
  label: string;
  position: 'left' | 'right' | 'bottomLeft' | 'bottomRight';
  color: string;
  startOpen: boolean;
}

export interface MobileDesign {
  layout: 'same' | 'modal' | 'bottomSheet' | 'fullscreen' | 'bar';
  padding?: number;
  hideImages: boolean;
}

export interface PopupDesign {
  layout: 'modal' | 'slideIn' | 'bar' | 'fullscreen' | 'teaser';
  position: 'bottomRight' | 'bottomLeft' | 'topRight' | 'topLeft' | 'top' | 'bottom';
  width: 'sm' | 'md' | 'lg' | 'xl';
  backgroundColor: string;
  backgroundImageUrl?: string;
  textColor: string;
  accentColor?: string;
  overlayOpacity: number;
  radius: number;
  padding: number;
  closeButton: 'inside' | 'outside';
  closeOnOverlay: boolean;
  closeOnEsc: boolean;
  animation: 'fade' | 'slide' | 'zoom' | 'none';
  teaser?: TeaserSettings;
  mobile?: MobileDesign;
}

export const DEFAULT_TEASER: TeaserSettings = {
  label: 'Get 10% off',
  position: 'bottomLeft',
  color: '#245cd6',
  startOpen: false,
};

export const DEFAULT_MOBILE: MobileDesign = { layout: 'same', hideImages: false };

export const DEFAULT_DESIGN: PopupDesign = {
  layout: 'modal',
  position: 'bottomRight',
  width: 'md',
  backgroundColor: '#ffffff',
  textColor: '#111111',
  overlayOpacity: 60,
  radius: 16,
  padding: 20,
  closeButton: 'inside',
  closeOnOverlay: true,
  closeOnEsc: true,
  animation: 'zoom',
};

// ── Rules ───────────────────────────────────────────────────────────────────

export const PAGE_TYPES = [
  'home',
  'product',
  'category',
  'shop',
  'blog',
  'blogPost',
  'customPage',
  'cart',
  'account',
  'other',
] as const;
export type PageType = (typeof PAGE_TYPES)[number];

export type ServerCondition =
  | { type: 'pageType'; not?: boolean; values: PageType[] }
  | { type: 'product'; not?: boolean; ids: string[] }
  | { type: 'category'; not?: boolean; ids: string[]; includeDescendants?: boolean }
  | { type: 'collection'; not?: boolean; ids: string[] }
  | { type: 'tag'; not?: boolean; ids: string[] }
  | { type: 'customPage'; not?: boolean; ids: string[] }
  | { type: 'blogPost'; not?: boolean; ids: string[] }
  | { type: 'path'; not?: boolean; patterns: string[] }
  | { type: 'auth'; not?: boolean; value: 'guest' | 'loggedIn' }
  | { type: 'customerRole'; not?: boolean; keys: string[] }
  | { type: 'creditAccount'; not?: boolean }
  | { type: 'orderCount'; not?: boolean; op: 'gte' | 'lte' | 'eq'; value: number }
  | { type: 'submittedAnyForm'; not?: boolean }
  | { type: 'cartContainsProduct'; not?: boolean; ids: string[] }
  | { type: 'cartContainsCategory'; not?: boolean; ids: string[]; includeDescendants?: boolean }
  | { type: 'cartContainsOffer'; not?: boolean; ids: string[] }
  | { type: 'timeWindow'; not?: boolean; days: number[]; fromHour: number; toHour: number };

export type ClientCondition =
  | { type: 'device'; not?: boolean; values: ('desktop' | 'mobile' | 'tablet')[] }
  | { type: 'queryParam'; not?: boolean; key: string; value?: string }
  | { type: 'utm'; not?: boolean; source?: string; medium?: string; campaign?: string }
  | { type: 'referrer'; not?: boolean; hostContains: string }
  | { type: 'visitorType'; not?: boolean; value: 'new' | 'returning' }
  | { type: 'cartSubtotal'; not?: boolean; op: 'gte' | 'lte'; cents: number }
  | { type: 'cartItemCount'; not?: boolean; op: 'gte' | 'lte' | 'eq'; value: number };

export type Condition = ServerCondition | ClientCondition;
export type ConditionType = Condition['type'];

export interface RuleGroup {
  op: 'and' | 'or';
  items: (Condition | RuleGroup)[];
}

export interface PopupRules {
  show: RuleGroup;
  exclude: RuleGroup;
}

export function isRuleGroup(x: Condition | RuleGroup): x is RuleGroup {
  return 'op' in x && 'items' in x;
}

// ── Triggers & frequency ────────────────────────────────────────────────────

export type Trigger =
  | { type: 'pageLoad' }
  | { type: 'delay'; seconds: number }
  | { type: 'scroll'; percent: number }
  | { type: 'exitIntent' }
  | { type: 'click' }
  | { type: 'idle'; seconds: number }
  | { type: 'pageViews'; count: number }
  | { type: 'addToCart' }
  | { type: 'cartValueReached'; cents: number }
  | { type: 'offerUnlocked' }
  | { type: 'login' };
export type TriggerType = Trigger['type'];

export interface PopupFrequency {
  mode: 'always' | 'oncePerSession' | 'once' | 'everyNDays' | 'maxTimes';
  days?: number;
  times?: number;
  stopAfter: ('submit' | 'click' | 'close')[];
}

// ── Admin API ───────────────────────────────────────────────────────────────

export type PopupStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type EffectiveStatus = 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'PAUSED' | 'ENDED' | 'ARCHIVED';

export interface AdminPopupListItem {
  id: string;
  name: string;
  slug: string;
  status: PopupStatus;
  effectiveStatus: EffectiveStatus;
  priority: number;
  startsAt: string | null;
  endsAt: string | null;
  layout: PopupDesign['layout'];
  thumbnailUrl: string | null;
  variantCount: number;
  systemKey: SystemPopupKey | null;
  stats30d: PopupCounts;
  updatedAt: string;
}

export interface PopupVariant {
  /** Absent for variants created in the editor and not yet saved. */
  id?: string;
  name: string;
  weight: number;
  blocks: Block[];
  design: Partial<PopupDesign> | null;
  sortOrder?: number;
}

export const SYSTEM_POPUP_KEYS = ['offer-unlocked', 'sign-in-panel', 'cookie-consent'] as const;
export type SystemPopupKey = (typeof SYSTEM_POPUP_KEYS)[number];

export interface PopupCounts {
  shown: number;
  clicked: number;
  submitted: number;
  closed: number;
  addedToCart: number;
  orders: number;
  revenueCents: number;
}

export interface AdminPopup {
  id: string;
  name: string;
  slug: string;
  systemKey: SystemPopupKey | null;
  status: PopupStatus;
  effectiveStatus: EffectiveStatus;
  priority: number;
  startsAt: string | null;
  endsAt: string | null;
  design: PopupDesign;
  rules: PopupRules;
  triggers: Trigger[];
  frequency: PopupFrequency;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  variants: PopupVariant[];
}

export type LookupKind =
  | 'product'
  | 'category'
  | 'collection'
  | 'tag'
  | 'customPage'
  | 'blogPost'
  | 'offer'
  | 'promoCode'
  | 'customerRole';

export interface LookupItem {
  id: string;
  label: string;
  sublabel?: string;
  imageUrl?: string;
}

export interface PopupValidateResult {
  errors: string[];
  brokenRefs: { path: string; kind: string; id: string }[];
}

export interface PopupStats {
  totals: PopupCounts;
  byVariant: ({ variantId: string; name: string } & PopupCounts)[];
  daily: ({ day: string } & PopupCounts)[];
}

export interface PopupSubmission {
  id: string;
  popupId: string;
  popup: { id: string; name: string };
  email: string;
  fields: Record<string, string>;
  consent: boolean;
  userId: string | null;
  path: string | null;
  couponCode: string | null;
  /** null = single opt-in. */
  optIn: null | 'pending' | 'confirmed';
  createdAt: string;
}

export interface PopupSettings {
  minGapSeconds: number;
  maxPerSession: number;
}

/** Shape returned by POST /admin/popups/hydrate — posted as-is to the storefront preview. */
export interface EligiblePopup {
  popupId: string;
  slug: string;
  variantId: string;
  priority: number;
  design: PopupDesign;
  triggers: Trigger[];
  frequency: PopupFrequency;
  clientRules: RuleGroup | null;
  blocks: unknown[];
}
