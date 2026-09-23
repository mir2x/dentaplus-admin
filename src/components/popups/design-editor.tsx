'use client';

import { Input } from '@/components/ui/input';
import type { PopupDesign } from '@/types/popups';
import { DEFAULT_MOBILE, DEFAULT_TEASER } from '@/types/popups';
import { ColorInput, Field, NumberInput, OptionSelect, SwitchField } from './form-bits';
import { ImageUploadField } from './image-upload-field';

const LAYOUT_OPTIONS = [
  { value: 'modal', label: 'Centered modal' },
  { value: 'slideIn', label: 'Slide-in (corner)' },
  { value: 'bar', label: 'Announcement bar' },
  { value: 'fullscreen', label: 'Full screen takeover' },
  { value: 'teaser', label: 'Teaser tab (expands on click)' },
] as const;

const TEASER_POSITION_OPTIONS = [
  { value: 'bottomLeft', label: 'Bottom left' },
  { value: 'bottomRight', label: 'Bottom right' },
  { value: 'left', label: 'Left edge (middle)' },
  { value: 'right', label: 'Right edge (middle)' },
] as const;

const MOBILE_LAYOUT_OPTIONS = [
  { value: 'same', label: 'Same as desktop' },
  { value: 'bottomSheet', label: 'Bottom sheet' },
  { value: 'modal', label: 'Centered modal' },
  { value: 'fullscreen', label: 'Full screen' },
  { value: 'bar', label: 'Bar' },
] as const;

const CORNER_OPTIONS = [
  { value: 'bottomRight', label: 'Bottom right' },
  { value: 'bottomLeft', label: 'Bottom left' },
  { value: 'topRight', label: 'Top right' },
  { value: 'topLeft', label: 'Top left' },
] as const;

const EDGE_OPTIONS = [
  { value: 'top', label: 'Top of page' },
  { value: 'bottom', label: 'Bottom of page' },
] as const;

export function DesignEditor({ value, onChange }: { value: PopupDesign; onChange: (d: PopupDesign) => void }) {
  const set = <K extends keyof PopupDesign>(k: K, v: PopupDesign[K]) => onChange({ ...value, [k]: v });

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Layout</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <OptionSelect
              value={value.layout}
              options={LAYOUT_OPTIONS}
              onChange={(layout) => {
                // Keep position valid for the new layout.
                const position =
                  layout === 'bar'
                    ? value.position === 'top' || value.position === 'bottom'
                      ? value.position
                      : 'bottom'
                    : value.position === 'top' || value.position === 'bottom'
                      ? 'bottomRight'
                      : value.position;
                onChange({ ...value, layout, position });
              }}
            />
          </Field>
          {(value.layout === 'slideIn' || value.layout === 'teaser') && (
            <Field label="Corner">
              <OptionSelect
                value={value.position as (typeof CORNER_OPTIONS)[number]['value']}
                options={CORNER_OPTIONS}
                onChange={(p) => set('position', p)}
              />
            </Field>
          )}
          {value.layout === 'bar' && (
            <Field label="Edge">
              <OptionSelect
                value={value.position as (typeof EDGE_OPTIONS)[number]['value']}
                options={EDGE_OPTIONS}
                onChange={(p) => set('position', p)}
              />
            </Field>
          )}
          {value.layout !== 'bar' && value.layout !== 'fullscreen' && (
            <Field label="Width">
              <OptionSelect
                value={value.width}
                options={[
                  { value: 'sm', label: 'Small (360px)' },
                  { value: 'md', label: 'Medium (480px)' },
                  { value: 'lg', label: 'Large (640px)' },
                  { value: 'xl', label: 'Extra large (800px)' },
                ]}
                onChange={(w) => set('width', w)}
              />
            </Field>
          )}
          <Field label="Animation">
            <OptionSelect
              value={value.animation}
              options={[
                { value: 'zoom', label: 'Zoom' },
                { value: 'fade', label: 'Fade' },
                { value: 'slide', label: 'Slide' },
                { value: 'none', label: 'None' },
              ]}
              onChange={(a) => set('animation', a)}
            />
          </Field>
        </div>
      </section>

      {value.layout === 'teaser' && <TeaserSection value={value} onChange={onChange} />}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Colours</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Background">
            <ColorInput value={value.backgroundColor} onChange={(v) => set('backgroundColor', v ?? '#ffffff')} />
          </Field>
          <Field label="Text">
            <ColorInput value={value.textColor} onChange={(v) => set('textColor', v ?? '#111111')} />
          </Field>
          <Field label="Accent (buttons)" hint="Defaults to the site's primary colour.">
            <ColorInput allowEmpty value={value.accentColor} onChange={(v) => set('accentColor', v)} />
          </Field>
          {(value.layout === 'modal' || value.layout === 'fullscreen') && (
            <Field label="Backdrop darkness (%)">
              <NumberInput min={0} max={90} value={value.overlayOpacity} onChange={(v) => set('overlayOpacity', v ?? 0)} />
            </Field>
          )}
        </div>
        <Field label="Background image (optional)">
          <ImageUploadField allowClear value={value.backgroundImageUrl} onChange={(v) => set('backgroundImageUrl', v)} />
        </Field>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Shape</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Corner radius (px)">
            <NumberInput min={0} max={32} value={value.radius} onChange={(v) => set('radius', v ?? 0)} />
          </Field>
          <Field label="Inner padding (px)">
            <NumberInput min={0} max={48} value={value.padding} onChange={(v) => set('padding', v ?? 0)} />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Closing</h3>
        <Field label="Close button">
          <OptionSelect
            value={value.closeButton}
            options={[
              { value: 'inside', label: 'Inside the popup' },
              { value: 'outside', label: 'Outside, top corner' },
            ]}
            onChange={(v) => set('closeButton', v)}
          />
        </Field>
        {value.layout === 'modal' && (
          <SwitchField label="Close when clicking the backdrop" checked={value.closeOnOverlay} onChange={(v) => set('closeOnOverlay', v)} />
        )}
        <SwitchField label="Close with the Esc key" checked={value.closeOnEsc} onChange={(v) => set('closeOnEsc', v)} />
      </section>

      <MobileSection value={value} onChange={onChange} />
    </div>
  );
}

function TeaserSection({ value, onChange }: { value: PopupDesign; onChange: (d: PopupDesign) => void }) {
  const teaser = { ...DEFAULT_TEASER, ...value.teaser };
  const set = (patch: Partial<typeof teaser>) => onChange({ ...value, teaser: { ...teaser, ...patch } });
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Teaser tab</h3>
        <p className="text-xs text-muted-foreground">
          A small tab stays on screen; clicking it opens the popup as a panel. Closing the panel shrinks it back to the
          tab.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tab label">
          <Input maxLength={40} value={teaser.label} onChange={(e) => set({ label: e.target.value })} />
          {!teaser.label.trim() && <p className="text-xs text-destructive">A label is required.</p>}
        </Field>
        <Field label="Tab position">
          <OptionSelect value={teaser.position} options={TEASER_POSITION_OPTIONS} onChange={(position) => set({ position })} />
        </Field>
        <Field label="Tab colour">
          <ColorInput value={teaser.color} onChange={(color) => set({ color: color ?? DEFAULT_TEASER.color })} />
        </Field>
        <div className="pt-6">
          <SwitchField
            label="Start expanded"
            hint="Open as a panel the first time, then collapse to the tab."
            checked={teaser.startOpen}
            onChange={(startOpen) => set({ startOpen })}
          />
        </div>
      </div>
    </section>
  );
}

function MobileSection({ value, onChange }: { value: PopupDesign; onChange: (d: PopupDesign) => void }) {
  const mobile = { ...DEFAULT_MOBILE, ...value.mobile };
  const set = (patch: Partial<typeof mobile>) => onChange({ ...value, mobile: { ...mobile, ...patch } });
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">On phones</h3>
        <p className="text-xs text-muted-foreground">Overrides used on screens narrower than 768px.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Layout">
          <OptionSelect value={mobile.layout} options={MOBILE_LAYOUT_OPTIONS} onChange={(layout) => set({ layout })} />
        </Field>
        <Field label="Inner padding (px)" hint="Empty = same as desktop.">
          <NumberInput min={0} max={48} value={mobile.padding} onChange={(padding) => set({ padding })} />
        </Field>
      </div>
      <SwitchField
        label="Hide images on phones"
        hint="Keeps the popup short on small screens."
        checked={mobile.hideImages}
        onChange={(hideImages) => set({ hideImages })}
      />
    </section>
  );
}
