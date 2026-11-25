// @vitest-environment happy-dom
// Regression tests for issue #4: light-DOM content projection.
import { describe, it, expect, afterEach } from 'vitest';
import type { LitElement } from 'lit';
import '../src/components/dialog.js';
import '../src/components/drawer.js';
import '../src/components/menu.js';
import '../src/components/dropdown-menu.js';
import '../src/components/tabs.js';
import '../src/components/combobox.js';
import '../src/components/multiselect.js';
import '../src/components/select.js';
import '../src/components/popover.js';
import '../src/components/hover-card.js';
import '../src/components/card.js';
import '../src/components/panel.js';
import '../src/components/banner.js';
import '../src/components/alert.js';
import '../src/components/scroll-area.js';
import '../src/components/nav-bar.js';
import '../src/components/accordion.js';
import './helpers/projection-fixture.js';
import '../src/components/radio.js';
import '../src/components/checkbox.js';
import '../src/components/radio-group.js';
import '../src/components/checkbox-group.js';
import '../src/components/tag.js';
import '../src/components/carousel.js';

/** Waits for MutationObserver callbacks and any Lit updates they trigger. */
async function settle(el?: LitElement): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise(r => setTimeout(r, 0));
    if (el) await el.updateComplete;
  }
}

function mount<T extends LitElement>(html: string): T {
  const wrap = document.createElement('div');
  wrap.innerHTML = html.trim();
  const el = wrap.firstElementChild as T;
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
  document.body.style.overflow = '';
});

// Dialog, drawer, dropdown menu, tabs, popover and hover card use explicit
// parts (#52): nothing is projected, so these check that the author's nodes
// stay where they were through the same scenarios.
describe('void-dialog explicit parts', () => {
  type Dialog = LitElement & { open: boolean };
  const surface = (el: Element) => el.shadowRoot!.querySelector('dialog')!;

  it('keeps every node in place across open, close and reopen', async () => {
    const el = mount<Dialog>('<void-dialog open><void-dialog-title>H</void-dialog-title><void-dialog-body><p id="c">Body</p></void-dialog-body></void-dialog>');
    await settle(el);
    const p = el.querySelector('#c')!;
    const parent = p.parentElement;
    el.open = false;
    await settle(el);
    el.open = true;
    await settle(el);
    expect(el.querySelector('#c')).toBe(p);
    expect(p.parentElement).toBe(parent);
    expect(surface(el).open).toBe(true);
  });

  it('keeps the native dialog rendered but closed while closed', async () => {
    const el = mount<Dialog>('<void-dialog><void-dialog-body><p>Body</p></void-dialog-body></void-dialog>');
    await settle(el);
    expect(surface(el).open).toBe(false);
    el.open = true;
    await settle(el);
    expect(surface(el).open).toBe(true);
  });

  it('keeps consumer listeners and does not duplicate on move', async () => {
    const el = mount<Dialog>('<void-dialog open><void-dialog-actions><button id="b">Go</button></void-dialog-actions></void-dialog>');
    await settle(el);
    let clicks = 0;
    el.querySelector('#b')!.addEventListener('click', () => clicks++);
    document.body.appendChild(document.createElement('section')).appendChild(el);
    await settle(el);
    el.remove();
    document.body.appendChild(el);
    await settle(el);
    expect(el.shadowRoot!.querySelectorAll('dialog').length).toBe(1);
    expect(el.querySelectorAll('#b').length).toBe(1);
    el.querySelector<HTMLElement>('#b')!.click();
    expect(clicks).toBe(1);
  });

  it('shows the same content on every one of many open/close cycles (issue #4 production report)', async () => {
    document.body.innerHTML = `
      <button id="opener">Open</button>
      <void-dialog id="d">
        <void-dialog-title>Confirm</void-dialog-title>
        <void-dialog-description id="msg">Are you sure?</void-dialog-description>
        <void-dialog-actions><button id="ok">OK</button></void-dialog-actions>
      </void-dialog>`;
    const el = document.getElementById('d') as Dialog;
    await settle(el);
    const msg = el.querySelector('#msg')!;
    let okClicks = 0;
    el.querySelector('#ok')!.addEventListener('click', () => okClicks++);
    for (let i = 0; i < 10; i++) {
      el.open = true;
      await settle(el);
      expect(surface(el).open).toBe(true);
      expect(el.querySelector('#msg')).toBe(msg);
      el.querySelector<HTMLElement>('#ok')!.click();
      if (i % 3 === 0) el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.click();
      else if (i % 3 === 1) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      else el.open = false;
      await settle(el);
      expect(el.open).toBe(false);
      expect(el.contains(msg)).toBe(true);
    }
    expect(okClicks).toBe(10);
    expect(el.querySelectorAll('#msg').length).toBe(1);
  });

  it('takes framework-style keyed updates of its parts directly (React, Solid)', async () => {
    const el = mount<Dialog>('<void-dialog open></void-dialog>');
    await settle(el);
    const title = document.createElement('void-dialog-title');
    const body = document.createElement('void-dialog-body');
    el.append(title, body);
    await settle(el);
    expect(title.getAttribute('role')).toBe('heading');
    const actions = document.createElement('void-dialog-actions');
    expect(() => el.insertBefore(actions, null)).not.toThrow();
    expect(() => el.removeChild(body)).not.toThrow();
    const other = document.createElement('void-dialog-body');
    expect(() => el.replaceChild(other, actions)).not.toThrow();
    await settle(el);
    expect(Array.from(el.children)).toEqual([title, other]);
  });
});

describe('void-drawer explicit parts', () => {
  it('keeps its content in place when it starts closed and on reopen', async () => {
    const el = mount<LitElement & { open: boolean }>('<void-drawer><void-drawer-body><p id="c">Body</p></void-drawer-body></void-drawer>');
    await settle(el);
    const p = el.querySelector('#c');
    el.open = true;
    await settle(el);
    el.open = false;
    await settle(el);
    el.open = true;
    await settle(el);
    expect(el.querySelector('void-drawer-body > #c')).toBe(p);
  });
});

describe('void-menu explicit parts', () => {
  it('keeps its items where they are when it starts closed, and across open and close', async () => {
    const el = mount<LitElement & { open: boolean }>(
      '<void-menu><void-menu-content><void-menu-item value="a">A</void-menu-item></void-menu-content></void-menu>'
    );
    const item = el.querySelector('void-menu-item');
    await settle(el);
    el.open = true;
    await settle(el);
    expect(el.querySelector('void-menu-content > void-menu-item')).toBe(item);
    el.open = false;
    await settle(el);
    el.open = true;
    await settle(el);
    expect(el.querySelectorAll('void-menu-content > void-menu-item').length).toBe(1);
  });
});

describe('void-menu-item explicit parts', () => {
  it('does not clone children on reconnect, so listeners survive', async () => {
    const el = mount<LitElement>(
      '<void-menu-item><void-menu-item-icon>*</void-menu-item-icon><b id="x">Label</b><void-menu-item-shortcut>K</void-menu-item-shortcut></void-menu-item>'
    );
    await settle(el);
    const b = el.querySelector('#x')!;
    const before = [...el.children];
    let clicks = 0;
    b.addEventListener('click', () => clicks++);
    el.remove();
    document.body.appendChild(el);
    await settle(el);
    expect(el.querySelector('#x')).toBe(b);
    expect([...el.children]).toEqual(before);
    (b as HTMLElement).click();
    expect(clicks).toBe(1);
  });
});

describe('void-dropdown-menu explicit parts', () => {
  it('does not duplicate trigger listeners when moved', async () => {
    const el = mount<LitElement & { open: boolean }>(
      '<void-dropdown-menu><void-dropdown-menu-trigger><button id="t">Menu</button></void-dropdown-menu-trigger><void-dropdown-menu-content><void-dropdown-menu-item>One</void-dropdown-menu-item></void-dropdown-menu-content></void-dropdown-menu>'
    );
    await settle(el);
    document.body.appendChild(document.createElement('div')).appendChild(el);
    await settle(el);
    expect(el.children.length).toBe(2);
    el.querySelector<HTMLElement>('#t')!.click();
    expect(el.open).toBe(true);
    el.querySelector<HTMLElement>('#t')!.click();
    expect(el.open).toBe(false);
  });
});

describe('void-combobox projection', () => {
  it('offers options added after connect', async () => {
    const el = mount<LitElement>('<void-combobox><void-option value="a">Alpha</void-option></void-combobox>');
    await settle(el);
    const opt = document.createElement('void-option');
    opt.setAttribute('value', 'b');
    opt.textContent = 'Beta';
    el.appendChild(opt);
    await settle(el);
    el.querySelector<HTMLInputElement>('.void-combobox-input')!.dispatchEvent(new Event('focus'));
    await settle(el);
    expect(el.querySelectorAll('.void-combobox-option').length).toBe(2);
  });
});

describe('void-multiselect projection', () => {
  it('offers options added after connect', async () => {
    const el = mount<LitElement>('<void-multiselect><void-option value="a">Alpha</void-option></void-multiselect>');
    await settle(el);
    const opt = document.createElement('void-option');
    opt.setAttribute('value', 'b');
    opt.textContent = 'Beta';
    el.appendChild(opt);
    await settle(el);
    el.querySelector<HTMLElement>('.void-multiselect-trigger')!.click();
    await settle(el);
    expect(el.querySelectorAll('.void-multiselect-option').length).toBe(2);
  });
});

describe('void-select projection', () => {
  it('projects options added after connect into the native select', async () => {
    const el = mount<LitElement>('<void-select value="b"><option value="a">A</option></void-select>');
    await settle(el);
    const opt = document.createElement('option');
    opt.value = 'b';
    opt.textContent = 'B';
    el.appendChild(opt);
    await settle(el);
    const select = el.querySelector('select')!;
    expect(select.options.length).toBe(2);
    expect(select.value).toBe('b');
  });

  it('does not duplicate options on reconnect', async () => {
    const el = mount<LitElement>('<void-select><option value="a">A</option></void-select>');
    await settle(el);
    el.remove();
    document.body.appendChild(el);
    await settle(el);
    expect(el.querySelectorAll('select').length).toBe(1);
    expect(el.querySelector('select')!.options.length).toBe(1);
  });
});

describe('void-popover explicit parts', () => {
  it('toggles from the trigger, not from clicks inside the content, and survives moves', async () => {
    const el = mount<LitElement & { open: boolean }>('<void-popover><void-popover-trigger><button id="t">T</button></void-popover-trigger><void-popover-content><p id="c">C</p></void-popover-content></void-popover>');
    await settle(el);
    document.body.appendChild(document.createElement('div')).appendChild(el);
    await settle(el);
    expect(el.children.length).toBe(2);
    el.querySelector<HTMLElement>('#t')!.click();
    expect(el.open).toBe(true);
    el.querySelector<HTMLElement>('#c')!.click();
    expect(el.open).toBe(true);
  });
});

describe('void-hover-card explicit parts', () => {
  it('adds nothing on reconnect', async () => {
    const el = mount<LitElement>('<void-hover-card><void-hover-card-trigger><a id="t">T</a></void-hover-card-trigger><void-hover-card-content><p id="c">C</p></void-hover-card-content></void-hover-card>');
    await settle(el);
    const before = [...el.querySelectorAll('*')];
    el.remove();
    document.body.appendChild(el);
    await settle(el);
    expect([...el.querySelectorAll('*')]).toEqual(before);
  });
});

describe('container components project late children and survive reconnect', () => {
  const cases: Array<[string, string]> = [
    ['void-scroll-area', '.void-scroll-area-viewport'],
    ['void-projection-fixture', '.void-projection-fixture-inner'],
    ['void-checkbox-group', '.void-checkbox-group-items'],
  ];
  for (const [tag, selector] of cases) {
    it(tag, async () => {
      const el = mount<LitElement>(`<${tag}><span id="first">1</span></${tag}>`);
      await settle(el);
      expect(el.querySelector(`${selector} #first`)).not.toBeNull();
      const late = document.createElement('span');
      el.appendChild(late);
      await settle(el);
      expect(late.parentElement?.matches(selector), el.innerHTML).toBe(true);
      el.remove();
      document.body.appendChild(el);
      await settle(el);
      expect(el.querySelectorAll(selector).length).toBe(1);
      expect(el.querySelectorAll('#first').length).toBe(1);
    });
  }
});

describe('host-region components keep content when their chrome toggles', () => {
  const cases: Array<[string, string]> = [
    ['void-alert', 'dismissible'],
    ['void-tag', 'removable'],
  ];
  for (const [tag, prop] of cases) {
    it(`${tag} (${prop})`, async () => {
      const el = mount<LitElement>(`<${tag}><b id="c">content</b></${tag}>`);
      await settle(el);
      const c = el.querySelector('#c')!;
      const host = el as unknown as Record<string, unknown>;
      host[prop] = true;
      await settle(el);
      host[prop] = false;
      await settle(el);
      host[prop] = true;
      await settle(el);
      expect(el.querySelector('#c')).toBe(c);
      expect(c.parentNode).toBe(el);
    });
  }

  it('void-tag keeps content before the remove button', async () => {
    const el = mount<LitElement>('<void-tag removable>Label</void-tag>');
    await settle(el);
    const close = el.querySelector('.void-tag-close')!;
    const text = Array.from(el.childNodes).find(n => n.nodeType === Node.TEXT_NODE && n.textContent === 'Label')!;
    expect(text.compareDocumentPosition(close) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('void-checkbox keeps label content after the control on reconnect', async () => {
    const el = mount<LitElement>('<void-checkbox>Accept</void-checkbox>');
    await settle(el);
    el.remove();
    document.body.appendChild(el);
    await settle(el);
    expect(el.querySelectorAll('input').length).toBe(1);
    expect(el.textContent?.trim()).toBe('Accept');
    expect(el.lastChild?.textContent).toBe('Accept');
  });
});

describe('void-radio-group projection', () => {
  it('gives radios added after connect the group name and checked state', async () => {
    const el = mount<LitElement>('<void-radio-group name="g" value="b"><void-radio value="a">A</void-radio></void-radio-group>');
    await settle(el);
    const radio = document.createElement('void-radio') as LitElement & { value: string; name: string; checked: boolean };
    radio.value = 'b';
    el.appendChild(radio);
    await settle(el);
    expect(radio.parentElement?.classList.contains('void-radio-group-options')).toBe(true);
    expect(radio.name).toBe('g');
    expect(radio.checked).toBe(true);
  });
});

describe('void-carousel explicit parts', () => {
  it('adds a dot for a slide added after connect, into the author indicators part', async () => {
    const el = mount<LitElement>(
      '<void-carousel><void-carousel-content><void-carousel-item>1</void-carousel-item></void-carousel-content><void-carousel-indicators></void-carousel-indicators></void-carousel>'
    );
    await settle(el);
    expect(el.querySelectorAll('void-carousel-indicators > button').length).toBe(1);
    el.querySelector('void-carousel-content')!.appendChild(document.createElement('void-carousel-item'));
    await settle(el);
    await settle(el);
    expect(el.querySelectorAll('void-carousel-content > void-carousel-item').length).toBe(2);
    expect(el.querySelectorAll('void-carousel-indicators > button').length).toBe(2);
  });
});
