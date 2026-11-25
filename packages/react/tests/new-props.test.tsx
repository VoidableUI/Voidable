import { describe, it, expect, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Card, Pagination, Popover, DropdownMenu, DropdownMenuItem, Select, SegmentedControl, Switch, Button } from '../src/index.js';
import type { VoidPagination, VoidSegmentedControl, VoidSwitch, VoidDropdownMenu } from '@voidable/ui';

// Props added in core by #37 (align, scrollable, link mode), #5 (form props)
// and #4 (slot="trigger") reach the element through the wrappers.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLElement | undefined;

async function render(node: React.ReactElement): Promise<HTMLElement> {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(node);
  });
  return container;
}

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

describe('new core props', () => {
  it('Popover align and Card scrollable reach the element', async () => {
    const c = await render(
      <>
        <Popover align="end">
          <Button slot="trigger">T</Button>
          Body
        </Popover>
        <Card scrollable heading="h">x</Card>
      </>,
    );
    expect(c.querySelector('void-popover')!.getAttribute('align')).toBe('end');
    // CSS-only attribute (no property): set as an attribute.
    expect(c.querySelector('void-card')!.hasAttribute('scrollable')).toBe(true);
  });

  it('Pagination hrefTemplate and param are set on the element', async () => {
    const c = await render(<Pagination total={5} value={2} hrefTemplate="/p/{page}" />);
    const el = c.querySelector('void-pagination') as VoidPagination;
    expect(el.hrefTemplate).toBe('/p/{page}');
    await el.updateComplete;
    expect(el.querySelector('a[href="/p/3"]')).not.toBeNull();
    await act(async () => root!.render(<Pagination total={5} value={2} param="page" />));
    expect(el.param).toBe('page');
  });

  it('form props from the forms branch reach the element', async () => {
    const c = await render(
      <form>
        <Select name="s" required>
          <option value="a">A</option>
        </Select>
        <SegmentedControl name="seg" disabled required />
        <Switch name="sw" value="yes" required />
      </form>,
    );
    expect(c.querySelector('void-select')!.getAttribute('name')).toBe('s');
    const seg = c.querySelector('void-segmented-control') as VoidSegmentedControl;
    expect([seg.name, seg.disabled, seg.required]).toEqual(['seg', true, true]);
    const sw = c.querySelector('void-switch') as VoidSwitch;
    expect([sw.name, sw.value, sw.required]).toEqual(['sw', 'yes', true]);
  });

  it('slot="trigger" picks the DropdownMenu trigger', async () => {
    const c = await render(
      <DropdownMenu>
        <DropdownMenuItem>One</DropdownMenuItem>
        <Button slot="trigger">Actions</Button>
      </DropdownMenu>,
    );
    const menu = c.querySelector('void-dropdown-menu') as VoidDropdownMenu;
    await menu.updateComplete;
    await act(async () => (c.querySelector('void-button') as HTMLElement).click());
    expect(menu.open).toBe(true);
  });
});
