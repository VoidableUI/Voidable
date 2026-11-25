// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { placeOverlay } from '../src/overlay.js';
import '../src/components/dialog.js';
import '../src/components/drawer.js';
import '../src/components/popover.js';
import '../src/components/dropdown-menu.js';
import '../src/components/combobox.js';
import '../src/components/toast.js';
import type { VoidDialog } from '../src/components/dialog.js';
import type { VoidDrawer } from '../src/components/drawer.js';
import type { VoidPopover } from '../src/components/popover.js';
import type { VoidDropdownMenu } from '../src/components/dropdown-menu.js';
import { VoidToastContainer } from '../src/components/toast.js';
import { cleanup, flush, locks, pointerdown, press, stack } from './helpers/overlay.js';

afterEach(cleanup);

const anchor = { left: 100, top: 100, right: 180, bottom: 130 };
const vp = { width: 1000, height: 800 };

describe('placeOverlay (the JavaScript positioner)', () => {
  it('places below, start-aligned, with the gap', () => {
    expect(placeOverlay(anchor, { width: 200, height: 100 }, vp, 'bottom', 'start', 8)).toEqual({ x: 100, y: 138, side: 'bottom', align: 'start' });
  });

  it('centres and end-aligns along the side', () => {
    expect(placeOverlay(anchor, { width: 200, height: 100 }, vp, 'bottom', 'center', 8).x).toBe(40);
    // End alignment would leave the viewport (x = -20), so it flips to start.
    expect(placeOverlay(anchor, { width: 200, height: 100 }, vp, 'bottom', 'end', 8)).toMatchObject({ x: 100, align: 'start' });
    expect(placeOverlay(anchor, { width: 50, height: 100 }, vp, 'bottom', 'end', 8)).toMatchObject({ x: 130, align: 'end' });
  });

  it('flips to the opposite side when the preferred side has no room', () => {
    const low = { left: 100, top: 740, right: 180, bottom: 770 };
    expect(placeOverlay(low, { width: 200, height: 100 }, vp, 'bottom', 'start', 8)).toMatchObject({ side: 'top', y: 632 });
    const high = { left: 100, top: 10, right: 180, bottom: 40 };
    expect(placeOverlay(high, { width: 200, height: 100 }, vp, 'top', 'start', 8)).toMatchObject({ side: 'bottom', y: 48 });
    const right = { left: 900, top: 100, right: 980, bottom: 130 };
    expect(placeOverlay(right, { width: 200, height: 100 }, vp, 'right', 'start', 8)).toMatchObject({ side: 'left', x: 692 });
  });

  it('flips the alignment at the inline edge', () => {
    const edge = { left: 900, top: 100, right: 980, bottom: 130 };
    expect(placeOverlay(edge, { width: 200, height: 100 }, vp, 'bottom', 'start', 8)).toMatchObject({ align: 'end', x: 780 });
  });

  it('clamps into the viewport when neither side nor alignment fits', () => {
    const narrow = { width: 390, height: 844 };
    const mid = { left: 150, top: 400, right: 240, bottom: 430 };
    const r = placeOverlay(mid, { width: 360, height: 100 }, narrow, 'bottom', 'start', 8);
    expect(r.x).toBeGreaterThanOrEqual(8);
    expect(r.x + 360).toBeLessThanOrEqual(390 - 8);
  });

  it('mirrors start and end in right-to-left text', () => {
    expect(placeOverlay(anchor, { width: 50, height: 50 }, vp, 'bottom', 'start', 8, true).x).toBe(130);
  });
});

describe('the shared overlay stack', () => {
  it('adds document listeners only while something is open', async () => {
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');
    document.body.innerHTML = '<void-popover id="p"><void-popover-trigger><button>t</button></void-popover-trigger><void-popover-content><p>x</p></void-popover-content></void-popover><void-popover id="q"><void-popover-trigger><button>t</button></void-popover-trigger><void-popover-content><p>x</p></void-popover-content></void-popover>';
    const p = document.getElementById('p') as VoidPopover;
    const q = document.getElementById('q') as VoidPopover;
    await flush(p, q);
    const kinds = (spy: typeof add) => spy.mock.calls.map(c => c[0]).filter(t => ['keydown', 'pointerdown', 'focusin'].includes(t as string));
    expect(kinds(add), JSON.stringify(stack())).toEqual([]);
    p.open = true;
    q.open = true;
    await flush(p, q);
    expect(kinds(add).sort()).toEqual(['focusin', 'keydown', 'pointerdown']);
    expect(stack()).toEqual(['p', 'q']);
    p.open = false;
    await flush(p, q);
    expect(stack()).toEqual(['q']);
    expect(kinds(remove)).toEqual([]);
    q.open = false;
    await flush(p, q);
    expect(kinds(remove).sort()).toEqual(['focusin', 'keydown', 'pointerdown']);
    add.mockRestore();
    remove.mockRestore();
  });

  it('Escape and outside presses close only the topmost overlay', async () => {
    document.body.innerHTML = `
      <void-drawer id="dr">
        <void-drawer-body>
          <button id="db">x</button>
                  <void-dialog id="dl">
                    <void-dialog-body>
                      <button id="lb">y</button>
                                <void-popover id="po">
                                  <void-popover-trigger><button id="pt">t</button></void-popover-trigger>
                                  <void-popover-content>
                                    <button id="pb">z</button>
                                                                      <void-dropdown-menu id="dd"><void-dropdown-menu-trigger><button id="dt">m</button></void-dropdown-menu-trigger><void-dropdown-menu-content><void-dropdown-menu-item id="di">i</void-dropdown-menu-item></void-dropdown-menu-content></void-dropdown-menu>
                                  </void-popover-content>
                                </void-popover>
                    </void-dialog-body>
                  </void-dialog>
        </void-drawer-body>
      </void-drawer>`;
    const dr = document.getElementById('dr') as VoidDrawer;
    const dl = document.getElementById('dl') as VoidDialog;
    const po = document.getElementById('po') as VoidPopover;
    const dd = document.getElementById('dd') as VoidDropdownMenu;
    const all = [dr, dl, po, dd];
    for (const el of all) {
      el.open = true;
      await flush(...all);
    }
    expect(stack()).toEqual(['dr', 'dl', 'po', 'dd']);
    expect(locks()).toBe(2);
    pointerdown(document.getElementById('pb')!);
    await flush(...all);
    expect(stack()).toEqual(['dr', 'dl', 'po']);
    press('Escape');
    await flush(...all);
    expect(stack()).toEqual(['dr', 'dl']);
    press('Escape');
    await flush(...all);
    expect(stack()).toEqual(['dr']);
    expect(locks()).toBe(1);
    press('Escape');
    await flush(...all);
    expect(stack()).toEqual([]);
    expect(locks()).toBe(0);
  });

  it('a modal opening closes non-modal overlays it is not inside', async () => {
    document.body.innerHTML = '<void-popover id="p"><void-popover-trigger><button>t</button></void-popover-trigger><void-popover-content><p>x</p></void-popover-content></void-popover><void-dialog id="d"><void-dialog-body><input></void-dialog-body></void-dialog>';
    const p = document.getElementById('p') as VoidPopover;
    const d = document.getElementById('d') as VoidDialog;
    p.open = true;
    await flush(p, d);
    const reasons: string[] = [];
    p.addEventListener('void-close', e => reasons.push((e as CustomEvent).detail.reason));
    d.open = true;
    await flush(p, d);
    expect(p.open).toBe(false);
    expect(reasons).toEqual(['parent']);
    expect(stack()).toEqual(['d']);
  });

  it('returns focus to the trigger of the overlay that hid the opener', async () => {
    document.body.innerHTML = `<void-dropdown-menu id="dd"><void-dropdown-menu-trigger><button id="dt">m</button></void-dropdown-menu-trigger><void-dropdown-menu-content><void-dropdown-menu-item id="di">Delete…</void-dropdown-menu-item></void-dropdown-menu-content></void-dropdown-menu>
      <void-dialog id="d"><void-dialog-actions><button id="ok">OK</button></void-dialog-actions></void-dialog>`;
    const dd = document.getElementById('dd') as VoidDropdownMenu;
    const d = document.getElementById('d') as VoidDialog;
    await flush(dd, d);
    // The item opens the dialog; selecting it closes the menu, hiding the opener.
    document.getElementById('di')!.addEventListener('void-select', () => {
      d.open = true;
    });
    document.getElementById('dt')!.click();
    await flush(dd, d);
    expect(document.activeElement?.id).toBe('di');
    document.getElementById('di')!.click();
    await flush(dd, d);
    expect(dd.open).toBe(false);
    expect(d.open).toBe(true);
    expect(document.activeElement?.id).toBe('ok');
    press('Escape');
    await flush(dd, d);
    expect(document.activeElement?.id).toBe('dt');
  });
});

describe('select-like panels', () => {
  it('a combobox panel closes on an outside press and stays out of the stack while closed', async () => {
    document.body.innerHTML = '<void-combobox id="c"><void-combobox-content><void-option value="a">A</void-option></void-combobox-content></void-combobox>';
    const c = document.getElementById('c') as HTMLElement & { updateComplete: Promise<unknown> };
    await flush(c);
    c.querySelector('input')!.dispatchEvent(new FocusEvent('focus'));
    await flush(c);
    expect(stack()).toEqual(['c']);
    const panel = c.querySelector('void-combobox-content')!;
    expect(panel.getAttribute('data-void-side')).toBe('bottom');
    pointerdown(document.body);
    await flush(c);
    expect((c as unknown as { open: boolean }).open).toBe(false);
    expect(stack()).toEqual([]);
  });
});

describe('toast container', () => {
  it('is a manual popover shown only while it holds toasts (when the Popover API exists)', async () => {
    const shown: string[] = [];
    const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
    const had = 'showPopover' in proto;
    if (!had) {
      // happy-dom lacks the Popover API; stub just enough to observe the calls.
      proto.showPopover = function (this: HTMLElement) { shown.push('show'); this.setAttribute('data-open', ''); };
      proto.hidePopover = function (this: HTMLElement) { shown.push('hide'); this.removeAttribute('data-open'); };
    }
    const matches = vi.spyOn(Element.prototype, 'matches').mockImplementation(function (this: Element, sel: string) {
      if (sel === ':popover-open') return this.hasAttribute('data-open');
      if (sel === 'dialog:modal') return false;
      return Element.prototype.closest.call(this, sel) === this;
    });
    try {
      const toast = VoidToastContainer.show({ description: 'Saved', duration: 0 });
      const container = toast.closest('void-toast-container') as VoidToastContainer;
      await flush(container);
      expect(container.getAttribute('popover')).toBe('manual');
      expect(shown).toEqual(['show']);
      toast.remove();
      await flush(container);
      expect(shown).toEqual(['show', 'hide']);
    } finally {
      matches.mockRestore();
      if (!had) {
        delete proto.showPopover;
        delete proto.hidePopover;
      }
    }
  });
});
