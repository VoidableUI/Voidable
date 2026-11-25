// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  Dialog,
  DialogBody,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Button,
  type OverlayCloseReason,
} from '../src/index.js';
import type { VoidDialog, VoidDropdownMenu, VoidTooltip } from '@voidable/ui';

// Controlled open state through the wrappers (React 19): React owns `open`, the overlay reports
// user closes with a cancelable `void-close` carrying a reason, and the state stays the source of truth.

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

const escape = (target: Element) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));

describe('controlled overlays', () => {
  it('a Dialog follows React state and reports Escape with its reason', async () => {
    const reasons: OverlayCloseReason[] = [];
    let setOpen!: (v: boolean) => void;
    function App() {
      const [open, set] = useState(false);
      setOpen = set;
      return (
        <Dialog
          open={open}
          onVoidClose={(e) => {
            reasons.push(e.detail.reason);
            set(false);
          }}
        >
          <DialogTitle>Edit</DialogTitle>
          <DialogBody>
            <input id="name" aria-label="Name" />
          </DialogBody>
        </Dialog>
      );
    }
    const c = await render(<App />);
    const el = c.querySelector('void-dialog') as VoidDialog;
    expect(el.open).toBe(false);

    await act(async () => setOpen(true));
    await el.updateComplete;
    expect(el.open).toBe(true);
    expect(el.shadowRoot!.querySelector('dialog')!.open).toBe(true);

    await act(async () => {
      escape(document.activeElement ?? el);
    });
    await el.updateComplete;
    expect(reasons).toEqual(['escape']);
    expect(el.open).toBe(false);
    expect(el.shadowRoot!.querySelector('dialog')!.open).toBe(false);
  });

  it('a controlled Dialog can refuse a close by cancelling void-close', async () => {
    function App() {
      const [open] = useState(true);
      return (
        <Dialog open={open} onVoidClose={(e) => e.preventDefault()}>
          <DialogTitle>Locked</DialogTitle>
          <DialogBody>
            <p>Body</p>
          </DialogBody>
        </Dialog>
      );
    }
    const c = await render(<App />);
    const el = c.querySelector('void-dialog') as VoidDialog;
    await el.updateComplete;
    await act(async () => {
      escape(el);
    });
    expect(el.open).toBe(true);
  });

  it('a DropdownMenu closes on item selection and reports it to React state', async () => {
    const log: string[] = [];
    function App() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <span id="state">{String(open)}</span>
          <DropdownMenu
            open={open}
            align="end"
            onVoidOpen={() => setOpen(true)}
            onVoidClose={(e) => {
              log.push(e.detail.reason);
              setOpen(false);
            }}
          >
            <DropdownMenuTrigger>
              <Button>Actions</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem keepOpen>Pin</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      );
    }
    const c = await render(<App />);
    const el = c.querySelector('void-dropdown-menu') as VoidDropdownMenu;
    await el.updateComplete;
    expect(el.getAttribute('align')).toBe('end');
    const [edit, pin] = Array.from(el.querySelectorAll('void-dropdown-menu-item')) as HTMLElement[];
    expect(pin!.hasAttribute('keep-open')).toBe(true);

    await act(async () => pin!.click());
    expect(el.open).toBe(true);
    await act(async () => edit!.click());
    expect(log).toEqual(['select']);
    expect(el.open).toBe(false);
    expect(c.querySelector('#state')!.textContent).toBe('false');
  });

  it('Tooltip takes align and open as props', async () => {
    const c = await render(
      <Tooltip align="start" open>
        <TooltipTrigger>
          <button type="button">?</button>
        </TooltipTrigger>
        <TooltipContent>Hint</TooltipContent>
      </Tooltip>,
    );
    const el = c.querySelector('void-tooltip') as VoidTooltip;
    await el.updateComplete;
    expect(el.open).toBe(true);
    expect(el.getAttribute('align')).toBe('start');
  });
});
