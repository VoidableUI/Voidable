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
