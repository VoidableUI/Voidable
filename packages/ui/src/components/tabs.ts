import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Individual tab content panel within a VoidTabs component. */
export class VoidTabPanel extends VoidElement {
  @property({ type: String, reflect: true }) tab = '';
  @property({ type: String, reflect: true }) label = '';
  @property({ type: Boolean, reflect: true }) active = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'tabpanel');
    if (this.tab) this.id = this.tab;
  }

  protected override updated(_changed: Map<string, unknown>): void {
    super.updated(_changed);
    this.setAttribute('role', 'tabpanel');
    if (_changed.has('tab') && this.tab) this.id = this.tab;
  }

}

if (!customElements.get('void-tab-panel')) {
  customElements.define('void-tab-panel', VoidTabPanel);
}

/** Tabbed section navigation for settings pages, detail views, and parallel content categories. */
export class VoidTabs extends VoidElement {
  @property({ type: String }) value = '';
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';

  private _panels: VoidTabPanel[] = [];

  connectedCallback(): void {
    super.connectedCallback();
    this._panels = Array.from(this.querySelectorAll('void-tab-panel')) as VoidTabPanel[];
    this._syncPanels();
  }

  private _syncPanels(): void {
    for (const panel of this._panels) {
      panel.active = panel.tab === this.value;
    }
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
            aria-selected=${panel.tab === this.value ? 'true' : 'false'}
            aria-controls=${panel.tab}
            ?active=${panel.tab === this.value}
            tabindex=${panel.tab === this.value ? '0' : '-1'}
            @click=${() => this._onTabClick(panel)}
            @keydown=${(e: KeyboardEvent) => this._onTabKeydown(e, index)}
          >${panel.label || panel.tab}</button>
        `)}
      </div>
    `;
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
