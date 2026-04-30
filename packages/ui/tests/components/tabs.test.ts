// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidTabs, VoidTabPanel } from '../../src/components/tabs.js';

if (!customElements.get('void-tab-panel')) {
  customElements.define('void-tab-panel', VoidTabPanel);
}
if (!customElements.get('void-tabs')) {
  customElements.define('void-tabs', VoidTabs);
}

function createTabs(value: string, panels: Array<{ tab: string; label?: string; content?: string }>): VoidTabs {
  const el = document.createElement('void-tabs') as VoidTabs;
  el.value = value;
  for (const p of panels) {
    const panel = document.createElement('void-tab-panel') as VoidTabPanel;
    panel.tab = p.tab;
    if (p.label) panel.label = p.label;
    if (p.content) panel.textContent = p.content;
    el.appendChild(panel);
  }
  return el;
}

describe('VoidTabPanel', () => {
  it('extends VoidElement', () => {
    expect(Object.getPrototypeOf(VoidTabPanel)).toBe(VoidElement);
  });

  it('is registered as void-tab-panel', () => {
    expect(customElements.get('void-tab-panel')).toBe(VoidTabPanel);
  });

  it('tab defaults to empty string', () => {
    const el = document.createElement('void-tab-panel') as VoidTabPanel;
    expect(el.tab).toBe('');
  });

  it('label defaults to empty string', () => {
    const el = document.createElement('void-tab-panel') as VoidTabPanel;
    expect(el.label).toBe('');
  });

  it('active defaults to false', () => {
    const el = document.createElement('void-tab-panel') as VoidTabPanel;
    expect(el.active).toBe(false);
  });

  it('sets role="tabpanel" on connect', async () => {
    const el = document.createElement('void-tab-panel') as VoidTabPanel;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('tabpanel');
    document.body.removeChild(el);
  });

  it('sets id from tab attribute on connect', async () => {
    const el = document.createElement('void-tab-panel') as VoidTabPanel;
    el.tab = 'my-tab';
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.id).toBe('my-tab');
    document.body.removeChild(el);
  });

  it('reflects active attribute', async () => {
    const el = document.createElement('void-tab-panel') as VoidTabPanel;
    document.body.appendChild(el);
    el.active = true;
    await el.updateComplete;
    expect(el.hasAttribute('active')).toBe(true);
    document.body.removeChild(el);
  });
});

describe('VoidTabs', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidTabs)).toBe(VoidElement);
    });

    it('is registered as void-tabs', () => {
      expect(customElements.get('void-tabs')).toBe(VoidTabs);
    });
  });

  describe('default property values', () => {
    it('value defaults to empty string', () => {
      const el = document.createElement('void-tabs') as VoidTabs;
      expect(el.value).toBe('');
    });

    it('size defaults to "md"', () => {
      const el = document.createElement('void-tabs') as VoidTabs;
      expect(el.size).toBe('md');
    });
  });

  describe('tab list rendering', () => {
    let el: VoidTabs;

    beforeEach(async () => {
      el = createTabs('one', [
        { tab: 'one', label: 'First' },
        { tab: 'two', label: 'Second' },
        { tab: 'three', label: 'Third' },
      ]);
      container.appendChild(el);
      await el.updateComplete;
    });

    it('renders .void-tabs-list with role="tablist"', () => {
      const list = el.querySelector('.void-tabs-list');
      expect(list).not.toBeNull();
      expect(list?.getAttribute('role')).toBe('tablist');
    });

    it('renders one tab button per panel', () => {
      const tabs = el.querySelectorAll('.void-tabs-tab');
      expect(tabs.length).toBe(3);
    });

    it('tab buttons have role="tab"', () => {
      const tabs = el.querySelectorAll('.void-tabs-tab');
      for (const tab of Array.from(tabs)) {
        expect(tab.getAttribute('role')).toBe('tab');
      }
    });

    it('active tab has aria-selected="true"', () => {
      const tabs = el.querySelectorAll('.void-tabs-tab');
      expect(tabs[0].getAttribute('aria-selected')).toBe('true');
      expect(tabs[1].getAttribute('aria-selected')).toBe('false');
    });

    it('active tab has aria-controls matching panel tab id', () => {
      const tabs = el.querySelectorAll('.void-tabs-tab');
      expect(tabs[0].getAttribute('aria-controls')).toBe('one');
    });

    it('tab button text shows label', () => {
      const tabs = el.querySelectorAll('.void-tabs-tab');
      expect(tabs[0].textContent?.trim()).toBe('First');
    });

    it('active tab has tabindex="0", inactive has tabindex="-1"', () => {
      const tabs = el.querySelectorAll('.void-tabs-tab');
      expect(tabs[0].getAttribute('tabindex')).toBe('0');
      expect(tabs[1].getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('label fallback', () => {
    it('falls back to tab id when label is empty', async () => {
      const el = createTabs('alpha', [{ tab: 'alpha' }, { tab: 'beta' }]);
      container.appendChild(el);
      await el.updateComplete;
      const tabs = el.querySelectorAll('.void-tabs-tab');
      expect(tabs[0].textContent?.trim()).toBe('alpha');
    });
  });

  describe('panel activation', () => {
    let el: VoidTabs;

    beforeEach(async () => {
      el = createTabs('one', [
        { tab: 'one', label: 'First', content: 'Content 1' },
        { tab: 'two', label: 'Second', content: 'Content 2' },
      ]);
      container.appendChild(el);
      await el.updateComplete;
    });

    it('active panel has active attribute', () => {
      const panels = el.querySelectorAll('void-tab-panel');
      expect(panels[0].hasAttribute('active')).toBe(true);
      expect(panels[1].hasAttribute('active')).toBe(false);
    });

    it('clicking a tab updates value', async () => {
      const tabs = el.querySelectorAll('.void-tabs-tab');
      (tabs[1] as HTMLElement).click();
      await el.updateComplete;
      expect(el.value).toBe('two');
    });

    it('clicking a tab updates active panel', async () => {
      const tabs = el.querySelectorAll('.void-tabs-tab');
      (tabs[1] as HTMLElement).click();
      await el.updateComplete;
      const panels = el.querySelectorAll('void-tab-panel');
      expect(panels[0].hasAttribute('active')).toBe(false);
      expect(panels[1].hasAttribute('active')).toBe(true);
    });

    it('clicking a tab updates aria-selected', async () => {
      const tabs = el.querySelectorAll('.void-tabs-tab');
      (tabs[1] as HTMLElement).click();
      await el.updateComplete;
      expect(tabs[0].getAttribute('aria-selected')).toBe('false');
      expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('void-change event', () => {
    let el: VoidTabs;

    beforeEach(async () => {
      el = createTabs('one', [
        { tab: 'one', label: 'First' },
        { tab: 'two', label: 'Second' },
      ]);
      container.appendChild(el);
      await el.updateComplete;
    });

    it('dispatches void-change on tab click', async () => {
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      const tabs = el.querySelectorAll('.void-tabs-tab');
      (tabs[1] as HTMLElement).click();
      await el.updateComplete;
      expect(fired).toBe(true);
    });

    it('void-change detail contains value', async () => {
      let detail: { value: string } | null = null;
      el.addEventListener('void-change', (e) => { detail = (e as CustomEvent).detail; });
      const tabs = el.querySelectorAll('.void-tabs-tab');
      (tabs[1] as HTMLElement).click();
      await el.updateComplete;
      expect(detail?.value).toBe('two');
    });

    it('void-change bubbles', async () => {
      let firedOnParent = false;
      container.addEventListener('void-change', () => { firedOnParent = true; }, { once: true });
      const tabs = el.querySelectorAll('.void-tabs-tab');
      (tabs[1] as HTMLElement).click();
      await el.updateComplete;
      expect(firedOnParent).toBe(true);
    });
  });

  describe('keyboard navigation', () => {
    let el: VoidTabs;

    beforeEach(async () => {
      el = createTabs('one', [
        { tab: 'one', label: 'First' },
        { tab: 'two', label: 'Second' },
        { tab: 'three', label: 'Third' },
      ]);
      container.appendChild(el);
      await el.updateComplete;
    });

    it('ArrowRight moves focus to next tab', async () => {
      const tabs = Array.from(el.querySelectorAll('.void-tabs-tab')) as HTMLElement[];
      tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await el.updateComplete;
      expect(document.activeElement).toBe(tabs[1]);
    });

    it('ArrowLeft moves focus to previous tab', async () => {
      const tabs = Array.from(el.querySelectorAll('.void-tabs-tab')) as HTMLElement[];
      tabs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await el.updateComplete;
      expect(document.activeElement).toBe(tabs[0]);
    });

    it('ArrowRight wraps from last to first', async () => {
      const tabs = Array.from(el.querySelectorAll('.void-tabs-tab')) as HTMLElement[];
      tabs[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await el.updateComplete;
      expect(document.activeElement).toBe(tabs[0]);
    });

    it('ArrowLeft wraps from first to last', async () => {
      const tabs = Array.from(el.querySelectorAll('.void-tabs-tab')) as HTMLElement[];
      tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await el.updateComplete;
      expect(document.activeElement).toBe(tabs[2]);
    });
  });

  describe('size reflection', () => {
    it('reflects size attribute', async () => {
      const el = document.createElement('void-tabs') as VoidTabs;
      container.appendChild(el);
      el.size = 'lg';
      await el.updateComplete;
      expect(el.getAttribute('size')).toBe('lg');
    });
  });
});
