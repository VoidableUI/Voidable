import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { edgeEnabled, stepEnabled } from '../keyboard.js';
import { ProjectionController } from '../projection.js';

// Counter for generated ids; unique across every tabs instance on the page.
let nextTabId = 0;

/** Individual tab content panel within a VoidTabs component; `disabled` disables its tab. */
export class VoidTabPanel extends VoidElement {
  /**
   * Key that identifies this panel: the `value` of the `void-tabs` it belongs to. Must be unique among
   * the panels.
   */
  @property({ type: String, reflect: true }) tab = '';
  /** Text of the panel's tab button. The parent builds the tab list from the panels' labels. */
  @property({ type: String, reflect: true }) label = '';
  /** Whether the panel is the visible one. Set by the parent from its `value`; do not set it yourself. */
  @property({ type: Boolean, reflect: true }) active = false;
  /** A disabled panel's tab is shown but cannot be selected or focused. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'tabpanel');
    this._syncTabindex();
  }

  protected override updated(_changed: Map<string, unknown>): void {
    super.updated(_changed);
    this.setHostAttribute('role', 'tabpanel');
    if (_changed.has('active')) this._syncTabindex();
    if (_changed.has('disabled') || _changed.has('tab') || _changed.has('label')) this.closest('void-tabs')?.requestUpdate();
  }

  /** The visible panel is a tab stop (APG: so keyboard users can reach content that has no focusable element). */
  private _syncTabindex(): void {
    this.setHostAttribute('tabindex', this.active ? '0' : null);
  }

  /** @internal Called by the owning tabs: points the panel at its tab button. */
  _wireTab(tabId: string): void {
    this.setHostAttribute('aria-labelledby', tabId);
  }

  /** @internal Number used to derive this panel's generated tab id; assigned on first use. */
  _tabKey = 0;

  /** @internal The id the owning tabs generated for this panel, if it has not been given one. */
  _generatedId: string | null = null;

}

if (!customElements.get('void-tab-panel')) {
  customElements.define('void-tab-panel', VoidTabPanel);
}

/**
 * Tabbed section navigation for settings pages, detail views, and parallel content categories.
 *
 * Follows the WAI-ARIA tabs pattern: `tablist`, `tab` and `tabpanel` roles, `aria-selected`, `aria-controls`
 * and `aria-labelledby`, and a roving tabindex (the selected tab, or the first enabled tab while none is
 * selected, is the single tab stop; the visible panel is a tab stop too). Keyboard: ArrowRight and ArrowLeft
 * move focus to the next and previous tab (wrapping, skipping disabled tabs), Home and End to the first and
 * last, Enter or Space select the focused tab; with `activation="auto"` moving focus selects the tab.
 */
export class VoidTabs extends VoidElement {
  /**
   * The `tab` key of the selected panel. As an attribute it is the initial tab; selecting a tab updates
   * it and fires `void-change`.
   */
  @property({ type: String }) value = '';
  /** Size step of the tab buttons: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  /**
   * `manual` (default): arrow keys move focus and Enter or Space select the focused tab.
   * `auto`: focusing a tab with the arrow keys selects it.
   */
  @property({ type: String, reflect: true }) activation: 'manual' | 'auto' = 'manual';

  // Panels stay direct children after the tab list; adding or removing one re-renders the tab buttons.
  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'panels', target: 'after' }],
    onChange: () => {
      this._syncPanels();
      this.requestUpdate();
    },
  });

  /** This tab set's own panels: direct children (a nested tab set's panels are its own). */
  private get _panels(): VoidTabPanel[] {
    return Array.from(this.querySelectorAll(':scope > void-tab-panel')) as VoidTabPanel[];
  }

  /** The value last seen on a panel, to tell a removed selection from a value whose panel has not arrived yet. */
  private _matchedValue: string | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this._syncPanels();
  }

  /** A morph may have replaced or added panels that do not show the selection yet. */
  protected override morphedCallback(): void {
    this._syncPanels();
    this.requestUpdate();
  }

  private _syncPanels(): void {
    this._reconcileRemovedSelection();
    for (const panel of this._panels) {
      // A panel not upgraded yet would keep this as a stale instance property.
      if (!(panel instanceof VoidTabPanel)) continue;
      panel.active = panel.tab === this.value;
      this._wire(panel);
    }
  }

  /**
   * When the panel the value points at has been removed (by the server, a
   * framework), select the panel the `value` attribute names, else the first
   * enabled panel, so a tab stays selected and a panel visible. A value that
   * never had a panel (panels still arriving) is left alone. Programmatic, so
   * no void-change is dispatched.
   */
  private _reconcileRemovedSelection(): void {
    const panels = this._panels;
    const enabled = (p: VoidTabPanel) => !(p instanceof VoidTabPanel) || !p.disabled;
    const tabOf = (p: VoidTabPanel) => p.getAttribute('tab') ?? '';
    if (panels.some(p => tabOf(p) === this.value)) {
      this._matchedValue = this.value;
      return;
    }
    if (this._matchedValue === null || this._matchedValue !== this.value || !panels.length) return;
    const attr = this.getAttribute('value');
    const next = panels.find(p => tabOf(p) === attr && enabled(p)) ?? panels.find(enabled);
    this._matchedValue = null;
    if (next) {
      this.value = tabOf(next);
      this._matchedValue = this.value;
    }
  }

  /** The id of the panel's tab button; stable for the lifetime of the panel. */
  private _tabId(panel: VoidTabPanel): string {
    if (!panel._tabKey) panel._tabKey = ++nextTabId;
    return `void-tab-${panel._tabKey}`;
  }

  /** The panel's id: a consumer-set id is kept, otherwise one is generated once. */
  private _panelId(panel: VoidTabPanel): string {
    if (!panel.id) {
      if (!panel._tabKey) panel._tabKey = ++nextTabId;
      panel.id = `void-tab-panel-${panel._tabKey}`;
      panel._generatedId = panel.id;
    }
    return panel.id;
  }

  /** Wire the panel back to its tab button (the button points at the panel via aria-controls). */
  private _wire(panel: VoidTabPanel): void {
    this._panelId(panel);
    panel._wireTab(this._tabId(panel));
  }

  protected override updated(_changed: Map<string, unknown>): void {
    super.updated(_changed);
    if (_changed.has('value')) {
      this._syncPanels();
    }
  }

  render() {
    const panels = this._panels;
    // Roving tabindex: the selected tab is the single tab stop; with none selected, the first enabled tab.
    let stop = panels.findIndex(p => p.tab === this.value && !p.disabled);
    if (stop < 0) stop = edgeEnabled(panels.map(p => p.disabled), 1);
    return html`
      <div class="void-tabs-list" role="tablist">
        ${panels.map((panel, index) => html`
          <button
            type="button"
            class="void-tabs-tab"
            role="tab"
            id=${this._tabId(panel)}
            aria-selected=${panel.tab === this.value ? 'true' : 'false'}
            aria-controls=${this._panelId(panel)}
            ?active=${panel.tab === this.value}
            ?disabled=${panel.disabled}
            tabindex=${index === stop ? '0' : '-1'}
            @click=${() => this._onTabClick(panel)}
            @keydown=${(e: KeyboardEvent) => this._onTabKeydown(e, index)}
          >${panel.label || panel.tab}</button>
        `)}
      </div>
    `;
  }

  /**
   * Panels carry an id the component gave them (for the tabs' aria-controls).
   * Morphers pair elements by id and never morph an element with an id into one
   * without, so a panel whose server markup has no id would be replaced on every
   * morph. Give each incoming panel without an id the id this component
   * generated for its live counterpart (same `tab`). Only generated ids: an id
   * the server (or consumer) gave a panel is theirs, and wherever the server
   * sends one it wins.
   */
  override voidBeforeMorph(incoming?: Element | null): boolean {
    if (incoming) {
      const sent = new Set(Array.from(incoming.querySelectorAll(':scope > void-tab-panel[id]'), p => p.id));
      const ids = new Map<string | null, string>();
      // LiveView sends an unchanged panel as an empty placeholder (data-phx-skip)
      // that only carries its data-phx-id: pair those by that instead of `tab`.
      const byPhx = new Map<string, string>();
      for (const p of this._panels) {
        if (p instanceof VoidTabPanel && p._generatedId && p.id === p._generatedId && !sent.has(p.id)) {
          ids.set(p.getAttribute('tab'), p.id);
          const phx = p.getAttribute('data-phx-id');
          if (phx) byPhx.set(phx, p.id);
        }
      }
      if (ids.size) {
        for (const next of Array.from(incoming.querySelectorAll(':scope > void-tab-panel:not([id])'))) {
          const tab = next.getAttribute('tab');
          const phx = next.getAttribute('data-phx-id');
          const id = tab !== null ? ids.get(tab) : phx ? byPhx.get(phx) : undefined;
          if (id) {
            next.setAttribute('id', id);
            ids.delete(tab);
            if (phx) byPhx.delete(phx);
          }
        }
      }
    }
    return super.voidBeforeMorph(incoming);
  }

  private _onTabClick(panel: VoidTabPanel): void {
    this.value = panel.tab;
    this.requestUpdate();
    this._syncPanels();
    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: { value: this.value },
    }));
  }

  private _onTabKeydown(e: KeyboardEvent, index: number): void {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const tabs = Array.from(this.querySelectorAll(':scope > .void-tabs-list > .void-tabs-tab')) as HTMLElement[];
    const disabled = this._panels.map(p => p.disabled);
    let next = -1;
    if (e.key === 'ArrowRight') next = stepEnabled(disabled, index, 1);
    else if (e.key === 'ArrowLeft') next = stepEnabled(disabled, index, -1);
    else if (e.key === 'Home') next = edgeEnabled(disabled, 1);
    else if (e.key === 'End') next = edgeEnabled(disabled, -1);
    else return;
    e.preventDefault();
    if (next < 0) return;
    tabs[next]?.focus();
    if (this.activation === 'auto') this._onTabClick(this._panels[next]!);
  }
}

if (!customElements.get('void-tabs')) {
  customElements.define('void-tabs', VoidTabs);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-tab-panel': VoidTabPanel;
    'void-tabs': VoidTabs;
  }
}
