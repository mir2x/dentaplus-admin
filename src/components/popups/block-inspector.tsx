'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type {
  Block,
  ButtonItem,
  ButtonsBlock,
  ColumnsBlock,
  CountdownBlock,
  CouponBlock,
  FormBlock,
  FormField,
  HeadingBlock,
  ImageBlock,
  LeafBlock,
  OfferProgressBlock,
  PageEmbedBlock,
  ProductsBlock,
  RichTextBlock,
  SpacerBlock,
  VideoBlock,
} from '@/types/popups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { EntityPicker } from './entity-picker';
import { ColorInput, Field, NumberInput, OptionSelect, SwitchField } from './form-bits';
import { ImageUploadField } from './image-upload-field';
import { newId } from './popup-utils';
import { ProductSourcePicker } from './product-source-picker';
import { TargetPicker } from './target-picker';
import { BlockList } from './block-builder';

const ALIGN_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
] as const;

const VISIBILITY_OPTIONS = [
  { value: 'all', label: 'All devices' },
  { value: 'desktop', label: 'Desktop only' },
  { value: 'mobile', label: 'Mobile only' },
] as const;

type Props<T> = { block: T; onChange: (b: T) => void };

/** Inspector for any block — dispatches on type, plus common visibility/style. */
export function BlockInspector({ block, onChange }: Props<Block>) {
  return (
    <div className="space-y-4">
      {renderSpecific(block, onChange)}
      <details className="rounded-md border px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Visibility &amp; spacing</summary>
        <div className="mt-3 space-y-3">
          <Field label="Show on">
            <OptionSelect
              value={block.visibility ?? 'all'}
              options={VISIBILITY_OPTIONS}
              onChange={(visibility) => onChange({ ...block, visibility })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vertical padding (px)">
              <NumberInput
                min={0}
                max={64}
                value={block.style?.paddingY}
                onChange={(paddingY) => onChange({ ...block, style: { ...block.style, paddingY } })}
              />
            </Field>
            <Field label="Background">
              <ColorInput
                allowEmpty
                value={block.style?.background}
                onChange={(background) => onChange({ ...block, style: { ...block.style, background } })}
              />
            </Field>
          </div>
        </div>
      </details>
    </div>
  );
}

function renderSpecific(block: Block, onChange: (b: Block) => void) {
  switch (block.type) {
    case 'heading':
      return <HeadingInspector block={block} onChange={onChange} />;
    case 'richText':
      return <RichTextInspector block={block} onChange={onChange} />;
    case 'image':
      return <ImageInspector block={block} onChange={onChange} />;
    case 'buttons':
      return <ButtonsInspector block={block} onChange={onChange} />;
    case 'products':
      return <ProductsInspector block={block} onChange={onChange} />;
    case 'form':
      return <FormInspector block={block} onChange={onChange} />;
    case 'coupon':
      return <CouponInspector block={block} onChange={onChange} />;
    case 'spacer':
      return <SpacerInspector block={block} onChange={onChange} />;
    case 'divider':
      return <p className="text-xs text-muted-foreground">A thin horizontal line. No settings.</p>;
    case 'video':
      return <VideoInspector block={block} onChange={onChange} />;
    case 'countdown':
      return <CountdownInspector block={block} onChange={onChange} />;
    case 'offerProgress':
      return <OfferProgressInspector block={block} onChange={onChange} />;
    case 'pageEmbed':
      return <PageEmbedInspector block={block} onChange={onChange} />;
    case 'columns':
      return <ColumnsInspector block={block} onChange={onChange} />;
  }
}

/** Pulls the id out of a pasted YouTube/Vimeo URL so admins can paste either. */
function extractVideoId(provider: VideoBlock['provider'], raw: string): string {
  const v = raw.trim();
  try {
    const url = new URL(v);
    if (provider === 'youtube') {
      if (url.hostname.includes('youtu.be')) return url.pathname.slice(1).split('/')[0] ?? '';
      const fromQuery = url.searchParams.get('v');
      if (fromQuery) return fromQuery;
      const parts = url.pathname.split('/').filter(Boolean);
      const i = parts.findIndex((p) => p === 'embed' || p === 'shorts');
      return i >= 0 ? (parts[i + 1] ?? '') : '';
    }
    return url.pathname.split('/').filter(Boolean).find((p) => /^\d+$/.test(p)) ?? '';
  } catch {
    return v;
  }
}

function VideoInspector({ block, onChange }: Props<VideoBlock>) {
  const valid = /^[\w-]{3,32}$/.test(block.videoId);
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Provider">
          <OptionSelect
            value={block.provider}
            options={[
              { value: 'youtube', label: 'YouTube' },
              { value: 'vimeo', label: 'Vimeo' },
            ]}
            onChange={(provider) => onChange({ ...block, provider })}
          />
        </Field>
        <Field label="Shape">
          <OptionSelect
            value={block.aspect ?? '16:9'}
            options={[
              { value: '16:9', label: 'Widescreen 16:9' },
              { value: '4:3', label: '4:3' },
              { value: '1:1', label: 'Square' },
              { value: '9:16', label: 'Vertical 9:16' },
            ]}
            onChange={(aspect) => onChange({ ...block, aspect })}
          />
        </Field>
      </div>
      <Field label="Video link or id" hint="Paste the video's URL — the id is extracted automatically.">
        <Input
          className="font-mono text-xs"
          value={block.videoId}
          placeholder={block.provider === 'youtube' ? 'https://youtu.be/…' : 'https://vimeo.com/…'}
          onChange={(e) => onChange({ ...block, videoId: extractVideoId(block.provider, e.target.value) })}
        />
        {!valid && <p className="text-xs text-destructive">Enter a valid {block.provider === 'youtube' ? 'YouTube' : 'Vimeo'} link.</p>}
      </Field>
      <SwitchField
        label="Autoplay (muted)"
        hint="Browsers only allow autoplay with the sound off."
        checked={block.autoplay ?? false}
        onChange={(autoplay) => onChange({ ...block, autoplay })}
      />
    </>
  );
}

/** ISO ↔ <input type="datetime-local"> in the admin's timezone. */
function toLocalInput(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function CountdownInspector({ block, onChange }: Props<CountdownBlock>) {
  return (
    <>
      <Field label="Counts down to">
        <OptionSelect
          value={block.mode}
          options={[
            { value: 'fixed', label: 'A fixed date & time' },
            { value: 'offerEnd', label: "An offer's end date" },
            { value: 'evergreen', label: 'N minutes after each visitor first sees it' },
          ]}
          onChange={(mode) => onChange({ ...block, mode })}
        />
      </Field>
      {block.mode === 'fixed' && (
        <Field label="Ends at">
          <Input
            type="datetime-local"
            value={toLocalInput(block.endsAt)}
            onChange={(e) =>
              onChange({ ...block, endsAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })
            }
          />
          {!block.endsAt && <p className="text-xs text-destructive">Pick an end date.</p>}
        </Field>
      )}
      {block.mode === 'offerEnd' && (
        <Field label="Offer" hint="The block hides if the offer has no end date or isn't live.">
          <EntityPicker kind="offer" value={block.offerId || undefined} onChange={(offerId) => onChange({ ...block, offerId })} />
          {!block.offerId && <p className="text-xs text-destructive">Pick an offer.</p>}
        </Field>
      )}
      {block.mode === 'evergreen' && (
        <Field label="Minutes per visitor" hint="Each visitor gets their own timer, starting the first time they see it.">
          <NumberInput min={1} max={10080} value={block.minutes} onChange={(minutes) => onChange({ ...block, minutes })} />
          {!block.minutes && <p className="text-xs text-destructive">Set the minutes.</p>}
        </Field>
      )}
      <Field label="Label">
        <Input value={block.label ?? ''} onChange={(e) => onChange({ ...block, label: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="When it reaches zero">
          <OptionSelect
            value={block.onExpire ?? 'hideBlock'}
            options={[
              { value: 'hideBlock', label: 'Hide the countdown' },
              { value: 'closePopup', label: 'Close the popup' },
            ]}
            onChange={(onExpire) => onChange({ ...block, onExpire })}
          />
        </Field>
        <Field label="Align">
          <OptionSelect value={block.align ?? 'center'} options={ALIGN_OPTIONS} onChange={(align) => onChange({ ...block, align })} />
        </Field>
      </div>
    </>
  );
}

const OFFER_TOKENS_HINT = (
  <>
    Placeholders: <code>{'{remaining}'}</code> items still needed, <code>{'{reward}'}</code> the reward,{' '}
    <code>{'{offer}'}</code> the offer name.
  </>
);

function OfferProgressInspector({ block, onChange }: Props<OfferProgressBlock>) {
  return (
    <>
      <Field label="Offer" hint="Shows live progress from the visitor's cart toward this offer.">
        <EntityPicker kind="offer" value={block.offerId || undefined} onChange={(offerId) => onChange({ ...block, offerId: offerId ?? '' })} />
        {!block.offerId && <p className="text-xs text-destructive">Pick an offer.</p>}
      </Field>
      <Field label="Message while in progress" hint={OFFER_TOKENS_HINT}>
        <Input value={block.message ?? ''} onChange={(e) => onChange({ ...block, message: e.target.value })} />
      </Field>
      <Field label="Message once unlocked">
        <Input value={block.unlockedMessage ?? ''} onChange={(e) => onChange({ ...block, unlockedMessage: e.target.value })} />
      </Field>
    </>
  );
}

function PageEmbedInspector({ block, onChange }: Props<PageEmbedBlock>) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Show">
          <OptionSelect
            value={block.target.kind}
            options={[
              { value: 'customPage', label: 'An info page' },
              { value: 'blogPost', label: 'A blog post' },
            ]}
            onChange={(kind) => onChange({ ...block, target: { kind, id: '' } })}
          />
        </Field>
        <Field label="Content">
          <OptionSelect
            value={block.mode ?? 'excerpt'}
            options={[
              { value: 'excerpt', label: 'Short excerpt + link' },
              { value: 'full', label: 'Full content' },
            ]}
            onChange={(mode) => onChange({ ...block, mode })}
          />
        </Field>
      </div>
      <Field label={block.target.kind === 'customPage' ? 'Info page' : 'Blog post'}>
        <EntityPicker
          kind={block.target.kind}
          value={block.target.id || undefined}
          onChange={(id) => onChange({ ...block, target: { ...block.target, id: id ?? '' } })}
        />
        {!block.target.id && <p className="text-xs text-destructive">Pick a page.</p>}
      </Field>
      <SwitchField label="Show the title" checked={block.showTitle ?? true} onChange={(showTitle) => onChange({ ...block, showTitle })} />
      <Field label="Link label">
        <Input value={block.readMoreLabel ?? ''} onChange={(e) => onChange({ ...block, readMoreLabel: e.target.value })} />
      </Field>
    </>
  );
}

function HeadingInspector({ block, onChange }: Props<HeadingBlock>) {
  return (
    <>
      <Field label="Text">
        <Input value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Size">
          <OptionSelect
            value={block.size ?? 'lg'}
            options={[
              { value: 'md', label: 'Medium' },
              { value: 'lg', label: 'Large' },
              { value: 'xl', label: 'Extra large' },
            ]}
            onChange={(size) => onChange({ ...block, size })}
          />
        </Field>
        <Field label="Align">
          <OptionSelect value={block.align ?? 'center'} options={ALIGN_OPTIONS} onChange={(align) => onChange({ ...block, align })} />
        </Field>
      </div>
      <Field label="Colour">
        <ColorInput allowEmpty value={block.color} onChange={(color) => onChange({ ...block, color })} />
      </Field>
    </>
  );
}

function RichTextInspector({ block, onChange }: Props<RichTextBlock>) {
  return (
    <Field label="Text" hint="Alignment, links and lists are supported.">
      <RichTextEditor value={block.html} onChange={(html) => onChange({ ...block, html })} minHeight="8rem" />
    </Field>
  );
}

function ImageInspector({ block, onChange }: Props<ImageBlock>) {
  return (
    <>
      <Field label="Image">
        <ImageUploadField value={block.url || undefined} onChange={(url) => onChange({ ...block, url: url ?? '' })} />
        {!block.url && <p className="text-xs text-destructive">An image is required.</p>}
      </Field>
      <Field label="Mobile image (optional)" hint="Used on phones instead of the main image.">
        <ImageUploadField allowClear value={block.mobileUrl} onChange={(mobileUrl) => onChange({ ...block, mobileUrl })} />
      </Field>
      <Field label="Alt text">
        <Input value={block.alt ?? ''} onChange={(e) => onChange({ ...block, alt: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Shape">
          <OptionSelect
            value={block.aspect ?? 'auto'}
            options={[
              { value: 'auto', label: 'Original' },
              { value: '1:1', label: 'Square' },
              { value: '4:3', label: '4:3' },
              { value: '16:9', label: '16:9' },
              { value: '3:1', label: 'Wide strip 3:1' },
            ]}
            onChange={(aspect) => onChange({ ...block, aspect })}
          />
        </Field>
        <div className="pt-6">
          <SwitchField label="Rounded corners" checked={block.rounded ?? true} onChange={(rounded) => onChange({ ...block, rounded })} />
        </div>
      </div>
      <Field label="When clicked, go to">
        <TargetPicker allowNone value={block.target} onChange={(target) => onChange({ ...block, target })} />
      </Field>
    </>
  );
}

function ButtonsInspector({ block, onChange }: Props<ButtonsBlock>) {
  const setItem = (i: number, item: ButtonItem) =>
    onChange({ ...block, items: block.items.map((x, j) => (j === i ? item : x)) });

  return (
    <>
      {block.items.map((item, i) => (
        <div key={item.id} className="space-y-3 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Button {i + 1}</span>
            {block.items.length > 1 && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Remove button"
                onClick={() => onChange({ ...block, items: block.items.filter((_, j) => j !== i) })}
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Label">
              <Input value={item.label} onChange={(e) => setItem(i, { ...item, label: e.target.value })} />
            </Field>
            <Field label="Style">
              <OptionSelect
                value={item.variant ?? 'primary'}
                options={[
                  { value: 'primary', label: 'Primary' },
                  { value: 'secondary', label: 'Secondary' },
                  { value: 'outline', label: 'Outline' },
                  { value: 'link', label: 'Text link' },
                ]}
                onChange={(variant) => setItem(i, { ...item, variant })}
              />
            </Field>
          </div>
          <Field label="Goes to">
            <TargetPicker value={item.target} onChange={(t) => t && setItem(i, { ...item, target: t })} />
          </Field>
        </div>
      ))}
      {block.items.length < 3 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({
              ...block,
              items: [
                ...block.items,
                { id: newId('btn'), label: 'No thanks', variant: 'outline', target: { kind: 'action', value: 'close' } },
              ],
            })
          }
        >
          <Plus className="size-4" /> Add button
        </Button>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Align">
          <OptionSelect value={block.align ?? 'center'} options={ALIGN_OPTIONS} onChange={(align) => onChange({ ...block, align })} />
        </Field>
        <div className="pt-6">
          <SwitchField label="Full width" checked={block.fullWidth ?? false} onChange={(fullWidth) => onChange({ ...block, fullWidth })} />
        </div>
      </div>
    </>
  );
}

function ProductsInspector({ block, onChange }: Props<ProductsBlock>) {
  return (
    <>
      <ProductSourcePicker value={block.source} onChange={(source) => onChange({ ...block, source })} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Display">
          <OptionSelect
            value={block.display ?? 'grid'}
            options={[
              { value: 'grid', label: 'Grid' },
              { value: 'carousel', label: 'Carousel' },
              { value: 'list', label: 'List' },
              { value: 'card', label: 'Single large card' },
            ]}
            onChange={(display) => onChange({ ...block, display })}
          />
        </Field>
        <Field label="Max products">
          <NumberInput min={1} max={12} value={block.limit ?? 4} onChange={(limit) => onChange({ ...block, limit: limit ?? 4 })} />
        </Field>
      </div>
      <SwitchField label="Show price" checked={block.showPrice ?? true} onChange={(showPrice) => onChange({ ...block, showPrice })} />
      <SwitchField
        label="Add to cart button"
        hint="Customers can add to cart without leaving the popup."
        checked={block.showAddToCart ?? true}
        onChange={(showAddToCart) => onChange({ ...block, showAddToCart })}
      />
      <SwitchField
        label="Show offer badge"
        checked={block.showOfferBadge ?? true}
        onChange={(showOfferBadge) => onChange({ ...block, showOfferBadge })}
      />
    </>
  );
}

function FormInspector({ block, onChange }: Props<FormBlock>) {
  const setField = (i: number, f: FormField) =>
    onChange({ ...block, fields: block.fields.map((x, j) => (j === i ? f : x)) });
  const move = (i: number, dir: -1 | 1) => {
    const fields = [...block.fields];
    const j = i + dir;
    if (j < 0 || j >= fields.length) return;
    [fields[i], fields[j]] = [fields[j], fields[i]];
    onChange({ ...block, fields });
  };
  const consent = block.consent ?? {};
  const success = block.success ?? {};

  return (
    <>
      <div className="space-y-2">
        <p className="text-xs font-medium">Fields</p>
        {block.fields.map((f, i) => (
          <div key={f.id} className="space-y-2 rounded-md border p-3">
            <div className="flex items-center gap-1">
              <span className="flex-1 text-xs text-muted-foreground">
                {f.kind === 'email' ? 'Email (required)' : `Field ${i + 1}`}
              </span>
              <Button variant="ghost" size="icon-sm" aria-label="Move up" onClick={() => move(i, -1)}>
                <ArrowUp className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Move down" onClick={() => move(i, 1)}>
                <ArrowDown className="size-3.5" />
              </Button>
              {f.kind !== 'email' && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove field"
                  onClick={() => onChange({ ...block, fields: block.fields.filter((_, j) => j !== i) })}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Label">
                <Input value={f.label} onChange={(e) => setField(i, { ...f, label: e.target.value })} />
              </Field>
              {f.kind === 'email' ? (
                <Field label="Type">
                  <Input disabled value="Email" />
                </Field>
              ) : (
                <Field label="Type">
                  <OptionSelect
                    value={f.kind}
                    options={[
                      { value: 'text', label: 'Text' },
                      { value: 'phone', label: 'Phone' },
                      { value: 'textarea', label: 'Long text' },
                    ]}
                    onChange={(kind) => setField(i, { ...f, kind })}
                  />
                </Field>
              )}
            </div>
            <Field label="Placeholder">
              <Input value={f.placeholder ?? ''} onChange={(e) => setField(i, { ...f, placeholder: e.target.value })} />
            </Field>
            {f.kind !== 'email' && (
              <SwitchField label="Required" checked={f.required ?? false} onChange={(required) => setField(i, { ...f, required })} />
            )}
          </div>
        ))}
        {block.fields.length < 8 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onChange({
                ...block,
                fields: [...block.fields, { id: newId('f'), kind: 'text', label: 'Name', placeholder: '', required: false }],
              })
            }
          >
            <Plus className="size-4" /> Add field
          </Button>
        )}
      </div>

      <Field label="Submit button label">
        <Input value={block.submitLabel ?? ''} onChange={(e) => onChange({ ...block, submitLabel: e.target.value })} />
      </Field>

      <div className="space-y-3 rounded-md border p-3">
        <SwitchField
          label="Consent checkbox"
          hint="Recommended — required for marketing email under the Spam Act."
          checked={consent.enabled ?? true}
          onChange={(enabled) => onChange({ ...block, consent: { ...consent, enabled } })}
        />
        {(consent.enabled ?? true) && (
          <>
            <SwitchField
              label="Must be ticked to submit"
              checked={consent.required ?? true}
              onChange={(required) => onChange({ ...block, consent: { ...consent, required } })}
            />
            <Field label="Consent text">
              <Textarea
                rows={2}
                value={consent.text ?? ''}
                onChange={(e) => onChange({ ...block, consent: { ...consent, text: e.target.value } })}
              />
            </Field>
          </>
        )}
      </div>

      <div className="space-y-3 rounded-md border p-3">
        <p className="text-xs font-medium">After submitting</p>
        <Field label="Heading">
          <Input value={success.heading ?? ''} onChange={(e) => onChange({ ...block, success: { ...success, heading: e.target.value } })} />
        </Field>
        <Field label="Message">
          <Textarea
            rows={2}
            value={success.message ?? ''}
            onChange={(e) => onChange({ ...block, success: { ...success, message: e.target.value } })}
          />
        </Field>
      </div>

      <FormCouponSection block={block} onChange={onChange} />
      <FormEmailSection block={block} onChange={onChange} />
    </>
  );
}

function FormCouponSection({ block, onChange }: Props<FormBlock>) {
  const mode = block.couponMode ?? 'none';
  return (
    <div className="space-y-3 rounded-md border p-3">
      <p className="text-xs font-medium">Coupon</p>
      <Field label="Give a coupon after signing up">
        <OptionSelect
          value={mode}
          options={[
            { value: 'none', label: 'No coupon' },
            { value: 'shared', label: 'The same code for everyone' },
            { value: 'unique', label: 'A unique single-use code per person' },
          ]}
          onChange={(couponMode) =>
            onChange({
              ...block,
              couponMode,
              ...(couponMode === 'none' ? { couponPromoCodeId: undefined } : {}),
            })
          }
        />
      </Field>
      {mode !== 'none' && (
        <Field
          label={mode === 'shared' ? 'Promo code' : 'Template promo code'}
          hint={
            mode === 'shared'
              ? 'Revealed after the visitor submits (and emailed if email is on).'
              : 'Each sign-up gets a copy of this code (same discount and minimum order) that works once. The template itself can stay inactive.'
          }
        >
          <EntityPicker
            kind="promoCode"
            value={block.couponPromoCodeId}
            onChange={(couponPromoCodeId) => onChange({ ...block, couponPromoCodeId })}
          />
          {!block.couponPromoCodeId && <p className="text-xs text-destructive">Pick a promo code.</p>}
        </Field>
      )}
      {mode === 'unique' && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Code prefix" hint={`e.g. ${block.uniqueCodePrefix || 'WELCOME'}-7KQ4XZ`}>
            <Input
              className="font-mono text-xs uppercase"
              maxLength={12}
              value={block.uniqueCodePrefix ?? ''}
              onChange={(e) =>
                onChange({ ...block, uniqueCodePrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) })
              }
            />
          </Field>
          <Field label="Valid for (days)" hint="Empty = the template's own expiry.">
            <NumberInput
              min={1}
              max={365}
              value={block.uniqueExpiresInDays}
              onChange={(uniqueExpiresInDays) => onChange({ ...block, uniqueExpiresInDays })}
            />
          </Field>
        </div>
      )}
    </div>
  );
}

function FormEmailSection({ block, onChange }: Props<FormBlock>) {
  const sendEmail = block.sendEmail ?? false;
  return (
    <div className="space-y-3 rounded-md border p-3">
      <p className="text-xs font-medium">Email</p>
      <SwitchField
        label="Email the person who signed up"
        hint="Sends your message below, plus their coupon if there is one."
        checked={sendEmail}
        onChange={(v) => onChange({ ...block, sendEmail: v, ...(v ? {} : { doubleOptIn: false }) })}
      />
      <SwitchField
        label="Double opt-in"
        hint={
          sendEmail
            ? 'They must click a link in the email to confirm. The coupon is only issued after confirming.'
            : 'Turn on "Email the person" first.'
        }
        checked={block.doubleOptIn ?? false}
        onChange={(doubleOptIn) => sendEmail && onChange({ ...block, doubleOptIn })}
      />
      {sendEmail && (
        <>
          <Field label="Email subject">
            <Input value={block.emailSubject ?? ''} maxLength={150} onChange={(e) => onChange({ ...block, emailSubject: e.target.value })} />
          </Field>
          <Field label="Email message" hint="Plain text. Blank lines start a new paragraph.">
            <Textarea
              rows={4}
              maxLength={2000}
              value={block.emailMessage ?? ''}
              onChange={(e) => onChange({ ...block, emailMessage: e.target.value })}
            />
          </Field>
        </>
      )}
    </div>
  );
}

function CouponInspector({ block, onChange }: Props<CouponBlock>) {
  return (
    <>
      <Field label="Promo code">
        <EntityPicker
          kind="promoCode"
          value={block.promoCodeId || undefined}
          onChange={(promoCodeId) => onChange({ ...block, promoCodeId: promoCodeId ?? '' })}
        />
        {!block.promoCodeId && <p className="text-xs text-destructive">Pick a promo code.</p>}
      </Field>
      <Field label="Label">
        <Input value={block.label ?? ''} onChange={(e) => onChange({ ...block, label: e.target.value })} />
      </Field>
      <Field label="Reveal">
        <OptionSelect
          value={block.reveal ?? 'visible'}
          options={[
            { value: 'visible', label: 'Always visible' },
            { value: 'clickToReveal', label: 'Click to reveal' },
          ]}
          onChange={(reveal) => onChange({ ...block, reveal })}
        />
      </Field>
    </>
  );
}

function SpacerInspector({ block, onChange }: Props<SpacerBlock>) {
  return (
    <Field label="Size">
      <OptionSelect
        value={block.size ?? 'md'}
        options={[
          { value: 'sm', label: 'Small' },
          { value: 'md', label: 'Medium' },
          { value: 'lg', label: 'Large' },
        ]}
        onChange={(size) => onChange({ ...block, size })}
      />
    </Field>
  );
}

function ColumnsInspector({ block, onChange }: Props<ColumnsBlock>) {
  const setColumn = (i: number, col: LeafBlock[]) =>
    onChange({ ...block, columns: block.columns.map((c, j) => (j === i ? col : c)) });

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Columns">
          <OptionSelect
            value={String(block.columns.length) as '2' | '3'}
            options={[
              { value: '2', label: '2 columns' },
              { value: '3', label: '3 columns' },
            ]}
            onChange={(n) => {
              const count = Number(n);
              const columns =
                count > block.columns.length
                  ? [...block.columns, []]
                  : [...block.columns.slice(0, count - 1), block.columns.slice(count - 1).flat()];
              onChange({ ...block, columns });
            }}
          />
        </Field>
        <Field label="Gap">
          <OptionSelect
            value={block.gap ?? 'md'}
            options={[
              { value: 'sm', label: 'Small' },
              { value: 'md', label: 'Medium' },
              { value: 'lg', label: 'Large' },
            ]}
            onChange={(gap) => onChange({ ...block, gap })}
          />
        </Field>
        <Field label="Vertical align">
          <OptionSelect
            value={block.verticalAlign ?? 'top'}
            options={[
              { value: 'top', label: 'Top' },
              { value: 'center', label: 'Center' },
              { value: 'bottom', label: 'Bottom' },
            ]}
            onChange={(verticalAlign) => onChange({ ...block, verticalAlign })}
          />
        </Field>
        <div className="pt-6">
          <SwitchField
            label="Stack on mobile"
            checked={block.stackOnMobile ?? true}
            onChange={(stackOnMobile) => onChange({ ...block, stackOnMobile })}
          />
        </div>
      </div>
      {block.columns.map((col, i) => (
        <div key={i} className="space-y-2 rounded-md border border-dashed p-2">
          <p className="px-1 text-xs font-medium text-muted-foreground">Column {i + 1}</p>
          <BlockList<LeafBlock> blocks={col} onChange={(c) => setColumn(i, c)} leafOnly />
        </div>
      ))}
    </>
  );
}
