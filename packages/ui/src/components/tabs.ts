import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { ProjectionController } from '../projection.js';

// Counter for generated ids; unique across every tabs instance on the page.
let nextTabId = 0;

/** Individual tab content panel within a VoidTabs component. */
export class VoidTabPanel extends VoidElement {
  @property({ type: String, reflect: true }) tab = '';
  @property({ type: String, reflect: true }) label = '';
  @property({ type: Boolean, reflect: true }) active = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'tabpanel');
  }

  protected override updated(_changed: Map<string, unknown>): void {
    super.updated(_changed);
    this.setHostAttribute('role', 'tabpanel');
  }

  /** @internal Number used to derive this panel's generated tab id; assigned on first use. */
  _tabKey = 0;

}

if (!customElements.get('void-tab-panel')) {
  customElements.define('void-tab-panel', VoidTabPanel);
}

/** Tabbed section navigation for settings pages, detail views, and parallel content categories. */
export class VoidTabs extends VoidElement {
  @property({ type: String }) value = '';
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';

  // Panels stay direct children after the tab list; adding or removing one re-renders the tab buttons.
  protected readonly _projection = new ProjectionController(this, {
    regions: [{ name: 'panels', target: 'after' }],
    onChange: () => {
      this._syncPanels();
      this.requestUpdate();
    },
  });

  private get _panels(): VoidTabPanel[] {
    return Array.from(this.querySelectorAll('void-tab-panel')) as VoidTabPanel[];
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._syncPanels();
  }

  private _syncPanels(): void {
    for (const panel of this._panels) {
      // A panel not upgraded yet would keep this as a stale instance property.
      if (!(panel instanceof VoidTabPanel)) continue;
      panel.active = panel.tab === this.value;
      this._wire(panel);
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
    }
    return panel.id;
  }

  /** Wire the panel back to its tab button (the button points at the panel via aria-controls). */
  private _wire(panel: VoidTabPanel): void {
    this._panelId(panel);
    panel.setAttribute('aria-labelledby', this._tabId(panel));
  }

  protected override updated(_changed: Map<string, unknown>): void {
    super.updated(_changed);
    if (_changed.has('value')) {
      this._syncPanels();
    }
  }

  render() {
    return html`
      <div class="void-tabs-list" role="tablist">
        ${this._panels.map((panel, index) => html`
          <button
            type="button"
            class="void-tabs-tab"
            role="tab"
            id=${this._tabId(panel)}
            aria-selected=${panel.tab === this.value ? 'true' : 'false'}
            aria-controls=${this._panelId(panel)}
            ?active=${panel.tab === this.value}
            tabindex=${panel.tab === this.value ? '0' : '-1'}
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
   * morph. Give each incoming panel the id its live counterpart (same `tab`) has.
   */
  override voidBeforeMorph(incoming?: Element | null): boolean {
    if (incoming) {
      const ids = new Map(this._panels.map(p => [p.getAttribute('tab'), p.id] as const));
      for (const next of Array.from(incoming.querySelectorAll(':scope > void-tab-panel:not([id])'))) {
        const id = ids.get(next.getAttribute('tab'));
        if (id) next.setAttribute('id', id);
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
    const tabs = Array.from(this.querySelectorAll('.void-tabs-tab')) as HTMLElement[];
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = (index + 1) % tabs.length;
      tabs[next].focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = (index - 1 + tabs.length) % tabs.length;
      tabs[prev].focus();
    }
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
