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
import '../src/components/collapsible.js';
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

describe('void-dialog projection', () => {
  it('keeps content across open, close and reopen', async () => {
    const el = mount<LitElement & { open: boolean }>('<void-dialog open heading="H"><p id="c">Body</p></void-dialog>');
    await settle(el);
    const p = el.querySelector('#c')!;
    expect(p.parentElement?.classList.contains('void-dialog-body')).toBe(true);
    el.open = false;
    await settle(el);
    expect(el.contains(p)).toBe(true);
    el.open = true;
    await settle(el);
    expect(el.querySelector('.void-dialog-body #c')).toBe(p);
  });

  it('projects content when it starts closed', async () => {
    const el = mount<LitElement & { open: boolean }>('<void-dialog><p id="c">Body</p></void-dialog>');
    await settle(el);
    el.open = true;
    await settle(el);
    expect(el.querySelector('.void-dialog-body #c')).not.toBeNull();
  });

  it('hides the backdrop while closed instead of removing it', async () => {
    const el = mount<LitElement & { open: boolean }>('<void-dialog><p>Body</p></void-dialog>');
    await settle(el);
    expect(el.querySelector<HTMLElement>('.void-dialog-backdrop')!.hidden).toBe(true);
    el.open = true;
    await settle(el);
    expect(el.querySelector<HTMLElement>('.void-dialog-backdrop')!.hidden).toBe(false);
  });

  it('keeps consumer listeners and does not duplicate on move', async () => {
    const el = mount<LitElement & { open: boolean }>('<void-dialog open><button id="b">Go</button></void-dialog>');
    await settle(el);
    let clicks = 0;
    el.querySelector('#b')!.addEventListener('click', () => clicks++);
    const other = document.createElement('section');
    document.body.appendChild(other);
    other.appendChild(el);
    await settle(el);
    el.remove();
    document.body.appendChild(el);
    await settle(el);
    expect(el.querySelectorAll('.void-dialog-body').length).toBe(1);
    expect(el.querySelectorAll('#b').length).toBe(1);
    el.querySelector<HTMLElement>('#b')!.click();
    expect(clicks).toBe(1);
  });

  it('projects children appended after connect', async () => {
    const el = mount<LitElement & { open: boolean }>('<void-dialog></void-dialog>');
    await settle(el);
    const late = document.createElement('p');
    el.appendChild(late);
    await settle(el);
    expect(late.parentElement?.classList.contains('void-dialog-body')).toBe(true);
  });
});

describe('void-dialog: persistent declarative dialog (issue #4 production report)', () => {
  type Dialog = LitElement & { open: boolean };

  it('shows its content on every one of many open/close cycles', async () => {
    document.body.innerHTML = `
      <button id="opener">Open</button>
      <void-dialog id="d" heading="Confirm">
        <p id="msg">Are you sure?</p>
        <button id="ok">OK</button>
      </void-dialog>`;
    const el = document.getElementById('d') as Dialog;
    await settle(el);
    const msg = el.querySelector('#msg')!;
    let okClicks = 0;
    el.querySelector('#ok')!.addEventListener('click', () => okClicks++);
    for (let i = 0; i < 10; i++) {
      el.open = true;
      await settle(el);
      const body = el.querySelector('.void-dialog-body')!;
      expect(el.querySelector<HTMLElement>('.void-dialog-backdrop')!.hidden).toBe(false);
      expect(body.querySelector('#msg')).toBe(msg);
      expect(body.textContent).toContain('Are you sure?');
      el.querySelector<HTMLElement>('#ok')!.click();
      // alternate between the close button, Escape and setting the property
      if (i % 3 === 0) el.querySelector<HTMLElement>('.void-dialog-close')!.click();
      else if (i % 3 === 1) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      else el.open = false;
      await settle(el);
      expect(el.open).toBe(false);
      expect(el.contains(msg)).toBe(true);
    }
    expect(okClicks).toBe(10);
    expect(el.querySelectorAll('#msg').length).toBe(1);
    expect(el.querySelectorAll('.void-dialog-body').length).toBe(1);
  });

  it('re-routes original children appended back onto the host without duplicating them', async () => {
    const el = mount<Dialog>('<void-dialog open><p id="a">A</p><p id="b">B</p></void-dialog>');
    await settle(el);
    const a = el.querySelector('#a')!;
    const b = el.querySelector('#b')!;
    // Same nodes moved back onto the host (chrome left intact); real morph coverage is below.
    el.appendChild(a);
    el.appendChild(b);
    await settle(el);
    const body = el.querySelector('.void-dialog-body')!;
    expect(Array.from(body.children)).toEqual([a, b]);
    expect(el.querySelectorAll('p').length).toBe(2);
  });

  it('re-routes original children reordered through the host', async () => {
    const el = mount<Dialog>('<void-dialog open><p id="a">A</p><p id="b">B</p></void-dialog>');
    await settle(el);
    const a = el.querySelector('#a')!;
    const b = el.querySelector('#b')!;
    // Reorder through the host with the chrome left intact.
    el.insertBefore(b, a);
    await settle(el);
    expect(Array.from(el.querySelector('.void-dialog-body')!.children)).toEqual([b, a]);
    el.appendChild(b);
    await settle(el);
    expect(Array.from(el.querySelector('.void-dialog-body')!.children)).toEqual([a, b]);
    expect(el.querySelectorAll('p').length).toBe(2);
  });

  it('supports framework-style keyed child updates through the host', async () => {
    const el = mount<Dialog>('<void-dialog open></void-dialog>');
    await settle(el);
    // What React/Solid do: treat the host as the parent of the nodes they render.
    const one = document.createElement('li');
    const two = document.createElement('li');
    el.appendChild(one);
    el.appendChild(two);
    await settle(el);
    const three = document.createElement('li');
    expect(() => el.insertBefore(three, two)).not.toThrow();
    expect(() => el.removeChild(one)).not.toThrow();
    const four = document.createElement('li');
    expect(() => el.replaceChild(four, two)).not.toThrow();
    expect(Array.from(el.querySelector('.void-dialog-body')!.children)).toEqual([three, four]);
  });
});

describe('void-drawer projection', () => {
  it('projects content when it starts closed and keeps it on reopen', async () => {
    const el = mount<LitElement & { open: boolean }>('<void-drawer><p id="c">Body</p></void-drawer>');
    await settle(el);
    el.open = true;
    await settle(el);
    const p = el.querySelector('.void-drawer-body #c');
    expect(p).not.toBeNull();
    el.open = false;
    await settle(el);
    el.open = true;
    await settle(el);
    expect(el.querySelector('.void-drawer-body #c')).toBe(p);
  });
});

describe('void-menu projection', () => {
  it('projects items when it starts closed', async () => {
    const el = mount<LitElement & { open: boolean }>(
      '<void-menu><void-menu-item value="a">A</void-menu-item></void-menu>'
    );
    await settle(el);
    el.open = true;
    await settle(el);
    expect(el.querySelector('.void-menu-list void-menu-item')).not.toBeNull();
    el.open = false;
    await settle(el);
    el.open = true;
    await settle(el);
    expect(el.querySelectorAll('.void-menu-list void-menu-item').length).toBe(1);
  });
});

describe('void-menu-item projection', () => {
  it('does not clone children on reconnect, so listeners survive', async () => {
    const el = mount<LitElement>('<void-menu-item icon="*" shortcut="K"><b id="x">Label</b></void-menu-item>');
    await settle(el);
    const b = el.querySelector('#x')!;
    let clicks = 0;
    b.addEventListener('click', () => clicks++);
    el.remove();
    document.body.appendChild(el);
    await settle(el);
    expect(el.querySelector('#x')).toBe(b);
    expect(el.querySelectorAll('.void-menu-item-label').length).toBe(1);
    expect(el.querySelectorAll('.void-menu-item-icon').length).toBe(1);
    (b as HTMLElement).click();
    expect(clicks).toBe(1);
  });
});

describe('void-dropdown-menu projection', () => {
  it('does not nest panels or duplicate trigger listeners when moved', async () => {
    const el = mount<LitElement & { open: boolean }>(
      '<void-dropdown-menu><button id="t">Menu</button><void-dropdown-menu-item>One</void-dropdown-menu-item></void-dropdown-menu>'
    );
    await settle(el);
    const other = document.createElement('div');
    document.body.appendChild(other);
    other.appendChild(el);
    await settle(el);
    expect(el.querySelectorAll('.void-dropdown-menu-panel').length).toBe(1);
    expect(el.querySelectorAll('.void-dropdown-menu-panel void-dropdown-menu-item').length).toBe(1);
    el.querySelector<HTMLElement>('#t')!.click();
    expect(el.open).toBe(true);
  });
});

describe('void-tabs projection', () => {
  it('adds and removes a tab when panels are added and removed after connect', async () => {
    const el = mount<LitElement & { value: string }>(
      '<void-tabs value="a"><void-tab-panel tab="a" label="A">A</void-tab-panel></void-tabs>'
    );
    await settle(el);
    expect(el.querySelectorAll('.void-tabs-tab').length).toBe(1);
    const panel = document.createElement('void-tab-panel');
    panel.setAttribute('tab', 'b');
    panel.setAttribute('label', 'B');
    el.appendChild(panel);
    await settle(el);
    expect(el.querySelectorAll('.void-tabs-tab').length).toBe(2);
    panel.remove();
    await settle(el);
    expect(el.querySelectorAll('.void-tabs-tab').length).toBe(1);
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

describe('void-popover projection', () => {
  it('keeps the trigger first, projects the body and survives moves', async () => {
    const el = mount<LitElement & { open: boolean }>('<void-popover><button id="t">T</button><p id="c">C</p></void-popover>');
    await settle(el);
    expect(el.firstElementChild?.id).toBe('t');
    expect(el.querySelector('.void-popover-body #c')).not.toBeNull();
    document.body.appendChild(document.createElement('div')).appendChild(el);
    await settle(el);
    expect(el.querySelectorAll('.void-popover-body').length).toBe(1);
    el.querySelector<HTMLElement>('#t')!.click();
    expect(el.open).toBe(true);
    // clicks inside the body do not toggle
    el.querySelector<HTMLElement>('#c')!.click();
    expect(el.open).toBe(true);
  });
});

describe('void-hover-card projection', () => {
  it('projects trigger and body once and does not duplicate wrappers on reconnect', async () => {
    const el = mount<LitElement>('<void-hover-card><a id="t">T</a><p id="c">C</p></void-hover-card>');
    await settle(el);
    el.remove();
    document.body.appendChild(el);
    await settle(el);
    expect(el.querySelectorAll('.void-hover-card-trigger').length).toBe(1);
    expect(el.querySelector('.void-hover-card-trigger #t')).not.toBeNull();
    expect(el.querySelector('.void-hover-card-body #c')).not.toBeNull();
  });
});

describe('container components project late children and survive reconnect', () => {
  const cases: Array<[string, string]> = [
    ['void-card', '.void-card-body'],
    ['void-scroll-area', '.void-scroll-area-viewport'],
    ['void-nav-bar', '.void-nav-bar-content'],
    ['void-accordion-item', '.void-accordion-content'],
    ['void-collapsible', '.void-collapsible-inner'],
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
    ['void-banner', 'dismissable'],
    ['void-alert', 'dismissible'],
    ['void-tag', 'removable'],
    ['void-panel', 'label'],
  ];
  for (const [tag, prop] of cases) {
    it(`${tag} (${prop})`, async () => {
      const el = mount<LitElement>(`<${tag}><b id="c">content</b></${tag}>`);
      await settle(el);
      const c = el.querySelector('#c')!;
      const host = el as unknown as Record<string, unknown>;
      host[prop] = prop === 'label' ? 'Label' : true;
      await settle(el);
      host[prop] = prop === 'label' ? '' : false;
      await settle(el);
      host[prop] = prop === 'label' ? 'Again' : true;
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

describe('void-carousel projection', () => {
  it('adds an indicator for a slide added after connect', async () => {
    const el = mount<LitElement>('<void-carousel><void-carousel-slide>1</void-carousel-slide></void-carousel>');
    await settle(el);
    expect(el.querySelectorAll('.void-carousel-dot').length).toBe(1);
    el.appendChild(document.createElement('void-carousel-slide'));
    await settle(el);
    expect(el.querySelectorAll('.void-carousel-track > void-carousel-slide').length).toBe(2);
    expect(el.querySelectorAll('.void-carousel-dot').length).toBe(2);
  });
});
