import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { edgeEnabled, stepEnabled } from '../keyboard.js';
import { PartsController } from '../parts.js';

const LIST = 'void-tabs-list';
const TRIGGER = 'void-tabs-trigger';
const CONTENT = 'void-tabs-content';

/**
 * Tabbed section navigation for settings pages, detail views, and parallel content categories.
 *
 * Three parts, all written by the author and never moved: `<void-tabs-list>` holding one `<void-tabs-trigger>`
 * per tab (its `value` names the tab, its text is the label, `disabled` disables it), and one
 * `<void-tabs-content>` per panel, matched to its trigger by `value`. Follows the WAI-ARIA tabs pattern: the list is the
 * `tablist`, triggers are `tab`s and contents `tabpanel`s, wired with `aria-selected`, `aria-controls` and
 * `aria-labelledby` (ids are generated only where the author gave none), and a roving tabindex (the selected tab,
 * or the first enabled tab while none is selected, is the single tab stop; the visible panel is a tab stop too).
 * Keyboard: ArrowRight and ArrowLeft move focus to the next and previous tab (wrapping, skipping disabled tabs),
 * Home and End to the first and last, Enter or Space select the focused tab; with `activation="auto"` moving focus
 * selects the tab. The selected trigger and the visible content carry `active` (for the theme and for server
 * markup that must look right before the script loads).
 *
 * @fires {CustomEvent<{ value: string }>} void-change - The user selected a tab.
 */
export class VoidTabs extends VoidElement {
  /**
   * The `value` of the selected tab. As an attribute it is the initial tab; selecting a tab updates it (it
   * reflects) and fires `void-change`.
   */
  @property({ type: String, reflect: true }) value = '';
  /** Size step of the tabs: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  /**
   * `manual` (default): arrow keys move focus and Enter or Space select the focused tab.
   * `auto`: focusing a tab with the arrow keys selects it.
   */
  @property({ type: String, reflect: true }) activation: 'manual' | 'auto' = 'manual';

  protected readonly _parts = new PartsController(this, {
    tags: [LIST, TRIGGER, CONTENT],
    onChange: () => this._wire(),
  });

  /** The value last seen on a trigger, to tell a removed selection from a value whose tab has not arrived yet. */
  private _matchedValue: string | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('click', this._onClick);
    this.addEventListener('keydown', this._onKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this._onClick);
    this.removeEventListener('keydown', this._onKeydown);
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('value')) this._wire();
  }

  private _triggers(): HTMLElement[] {
    return this._parts.within(this._parts.one(LIST), TRIGGER);
  }

  private _disabled(trigger: Element): boolean {
    return trigger.hasAttribute('disabled');
  }

  private _valueOf(el: Element): string {
    return el.getAttribute('value') ?? '';
  }

  /**
   * When the tab the value points at has been removed (by the server, a
   * framework), select the tab the `value` attribute names, else the first
   * enabled tab, so a tab stays selected and a panel visible. A value that
   * never had a tab (tabs still arriving) is left alone. Programmatic, so no
   * void-change is dispatched.
   */
  private _reconcileRemovedSelection(triggers: HTMLElement[]): void {
    if (triggers.some(t => this._valueOf(t) === this.value)) {
      this._matchedValue = this.value;
      return;
    }
    if (this._matchedValue === null || this._matchedValue !== this.value || !triggers.length) return;
    const next = triggers.find(t => !this._disabled(t));
    this._matchedValue = null;
    if (next) {
      this.value = this._valueOf(next);
      this._matchedValue = this.value;
    }
  }

  /** Writes roles, ids, selection, the roving tab stop and the panel links onto the parts. */
  private _wire(): void {
    const list = this._parts.one(LIST);
    const triggers = this._triggers();
    const contents = this._parts.all(CONTENT);
    this._reconcileRemovedSelection(triggers);
    if (list) this._parts.set(list, 'role', 'tablist');
    const disabled = triggers.map(t => this._disabled(t));
    let stop = triggers.findIndex((t, i) => this._valueOf(t) === this.value && !disabled[i]);
    if (stop < 0) stop = edgeEnabled(disabled, 1);
    const byValue = new Map<string, HTMLElement>();
    for (const c of contents) if (!byValue.has(this._valueOf(c))) byValue.set(this._valueOf(c), c);
    const triggerIds = new Map<string, string>();
    triggers.forEach((t, i) => {
      const value = this._valueOf(t);
      const selected = value === this.value;
      const id = this._parts.id(t, 'void-tabs-trigger');
      if (!triggerIds.has(value)) triggerIds.set(value, id);
      const panel = byValue.get(value);
      this._parts.set(t, 'role', 'tab');
      this._parts.set(t, 'aria-selected', selected ? 'true' : 'false');
      this._parts.set(t, 'active', selected);
      this._parts.set(t, 'tabindex', i === stop ? '0' : '-1');
      this._parts.set(t, 'aria-disabled', disabled[i] ? 'true' : null);
      this._parts.set(t, 'aria-controls', panel ? this._parts.id(panel, 'void-tabs-content') : null);
    });
    for (const c of contents) {
      const value = this._valueOf(c);
      const active = value === this.value;
      this._parts.id(c, 'void-tabs-content');
      this._parts.set(c, 'role', 'tabpanel');
      this._parts.set(c, 'active', active);
      // The visible panel is a tab stop (APG: so keyboard users can reach content that has no focusable element).
      this._parts.set(c, 'tabindex', active ? '0' : null);
      this._parts.set(c, 'aria-labelledby', triggerIds.get(value) ?? null);
    }
  }

  private _select(trigger: HTMLElement): void {
    if (this._disabled(trigger)) return;
    const value = this._valueOf(trigger);
    this.value = value;
    this._wire();
    this.dispatchEvent(new CustomEvent('void-change', { bubbles: true, composed: true, detail: { value } }));
  }

  private _triggerOf(target: EventTarget | null): HTMLElement | null {
    const trigger = target instanceof Element ? target.closest<HTMLElement>(TRIGGER) : null;
    return trigger && this._parts.owns(trigger) ? trigger : null;
  }

  private _onClick = (e: Event): void => {
    const trigger = this._triggerOf(e.target);
    if (trigger) this._select(trigger);
  };

  private _onKeydown = (e: KeyboardEvent): void => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented) return;
    const trigger = this._triggerOf(e.target);
    if (!trigger) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._select(trigger);
      return;
    }
    const triggers = this._triggers();
    const index = triggers.indexOf(trigger);
    const disabled = triggers.map(t => this._disabled(t));
    let next = -1;
    if (e.key === 'ArrowRight') next = stepEnabled(disabled, index, 1);
    else if (e.key === 'ArrowLeft') next = stepEnabled(disabled, index, -1);
    else if (e.key === 'Home') next = edgeEnabled(disabled, 1);
    else if (e.key === 'End') next = edgeEnabled(disabled, -1);
    else return;
    e.preventDefault();
    if (next < 0) return;
    triggers[next]!.focus();
    if (this.activation === 'auto') this._select(triggers[next]!);
  };
}

if (!customElements.get('void-tabs')) {
  customElements.define('void-tabs', VoidTabs);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-tabs': VoidTabs;
  }
}
