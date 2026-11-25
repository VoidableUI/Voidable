// @vitest-environment happy-dom
// The checks behind `@voidable/ui/dev`, against a small hand-written table so each
// rule is tested on its own. (dev-runtime.test.ts uses the generated table.)
import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkAttribute,
  checkAttributes,
  checkDefined,
  checkEvent,
  checkParent,
  checkRequired,
  isForeignAttribute,
  keyOf,
  suggest,
} from '../src/dev/rules.js';
import type { DevTable } from '../src/dev/types.js';

const table: DevTable = {
  'void-button': {
    m: 'button',
    a: { color: ['default', 'error', 'warning', 'success'], variant: ['outline', 'filled', 'ghost'], disabled: 1, loading: 1, size: ['sm', 'md', 'lg'] },
    e: ['void-click'],
  },
  'void-input': {
    m: 'input',
    a: { value: 0, max: 3, closable: 2, type: ['text', 'email'] },
    h: ['dragging'],
    e: ['void-input', 'void-change'],
    x: { label: 'wrap the control in <void-field label="...">' },
  },
  'void-sidebar': { m: 'sidebar', a: { collapsedwidth: 3, side: ['left', 'right'] }, e: [] },
  'void-select': { m: 'select', a: {}, e: ['void-change'] },
  'void-multiselect': { m: 'multiselect', a: {}, e: ['void-change'] },
  'void-option': { m: 'multiselect', a: { value: 0 }, e: [], p: ['void-multiselect', 'void-combobox'] },
  'void-combobox': { m: 'combobox', a: {}, e: [] },
  'void-tabs': { m: 'tabs', a: {}, e: [], r: ['void-tab-panel'] },
  'void-tab-panel': { m: 'tabs', a: {}, e: [], p: ['void-tabs'] },
};

const make = (html: string): Element => {
  document.body.innerHTML = html;
  return document.body.firstElementChild!;
};

describe('attributes', () => {
  it('does not report a declared attribute with a valid value', () => {
    const el = make('<void-button color="error" variant="ghost" disabled></void-button>');
    expect(checkAttributes(table, el)).toEqual([]);
  });

  it('reports an unknown attribute with the declared names', () => {
    const el = make('<void-button tone="x"></void-button>');
    const [w] = checkAttributes(table, el);
    expect(w.kind).toBe('unknown-attribute');
    expect(w.message).toContain('"tone" is not an attribute of void-button');
    expect(w.message).toContain('Valid attributes: color, disabled, loading, size, variant');
  });

  it('suggests the real name for a hyphenated or misspelled one', () => {
    expect(checkAttribute(table, make('<void-sidebar collapsed-width="64"></void-sidebar>'), 'collapsed-width')?.message).toContain('Did you mean "collapsedwidth"?');
    expect(checkAttribute(table, make('<void-button colour="error"></void-button>'), 'colour')?.message).toContain('Did you mean "color"?');
  });

  it('shows the manifest hint for a commonly guessed attribute', () => {
    const w = checkAttribute(table, make('<void-input label="Email"></void-input>'), 'label')!;
    expect(w.message).toContain('"label" is not an attribute of void-input');
    expect(w.message).toContain('wrap the control in <void-field label="...">');
  });

  it('reports a value outside the set, lists the valid ones and suggests', () => {
    const w = checkAttribute(table, make('<void-button color="primary"></void-button>'), 'color')!;
    expect(w.kind).toBe('invalid-value');
    expect(w.message).toContain('"primary" is not a valid value for color');
    expect(w.message).toContain('Valid values: default, error, warning, success');
    expect(w.message).toContain('Did you mean "default"?');
    expect(checkAttribute(table, make('<void-button size="lrg"></void-button>'), 'size')?.message).toContain('Did you mean "lg"?');
    expect(checkAttribute(table, make('<void-button color="danger"></void-button>'), 'color')?.message).toContain('Did you mean "error"?');
  });

  it('reports a non-number for a number attribute', () => {
    expect(checkAttribute(table, make('<void-input max="ten"></void-input>'), 'max')?.message).toContain('"ten" is not a number');
    expect(checkAttribute(table, make('<void-input max="10"></void-input>'), 'max')).toBeUndefined();
    expect(checkAttribute(table, make('<void-input max="-1.5"></void-input>'), 'max')).toBeUndefined();
  });

  it('reports a boolean set to "false" unless the component reads it', () => {
    const w = checkAttribute(table, make('<void-button disabled="false"></void-button>'), 'disabled')!;
    expect(w.kind).toBe('boolean-false');
    expect(w.message).toContain('disabled="false" does not turn it off');
    expect(checkAttribute(table, make('<void-input closable="false"></void-input>'), 'closable')).toBeUndefined();
    expect(checkAttribute(table, make('<void-button disabled="true"></void-button>'), 'disabled')).toBeUndefined();
    expect(checkAttribute(table, make('<void-button disabled=""></void-button>'), 'disabled')).toBeUndefined();
  });

  it('ignores global, aria, data and framework attributes', () => {
    const names = [
      'id', 'class', 'style', 'slot', 'role', 'tabindex', 'hidden', 'aria-label', 'data-turbo-permanent', 'data-controller',
      'x-data', 'x-on:click', '@click', ':disabled', 'wire:model', 'phx-click', 'v-model', 'ng-reflect-name', '_ngcontent-abc-c1',
      'client:load', 'hx-get', 'onclick', 'title', 'part', 'is',
    ];
    for (const n of names) expect(isForeignAttribute(n), n).toBe(true);
    const el = make('<void-button></void-button>');
    for (const n of ['id', 'aria-label', 'x-data', 'wire:model', 'phx-click', '_ngcontent-a-c1', 'data-x']) {
      el.setAttribute(n, 'v');
      expect(checkAttribute(table, el, n), n).toBeUndefined();
    }
    expect(isForeignAttribute('label')).toBe(false);
    expect(isForeignAttribute('colour')).toBe(false);
  });

  it('ignores attributes the component sets on itself', () => {
    expect(checkAttribute(table, make('<void-input dragging=""></void-input>'), 'dragging')).toBeUndefined();
    expect(checkAttribute(table, make('<void-button dragging=""></void-button>'), 'dragging')).toBeDefined();
  });

  it('leaves non-void elements alone', () => {
    expect(checkAttributes(table, make('<div label="x"></div>'))).toEqual([]);
  });

  it('keys one warning per element type and attribute, not per value or instance', () => {
    const a = checkAttribute(table, make('<void-button color="primary"></void-button>'), 'color')!;
    const b = checkAttribute(table, make('<void-button color="other"></void-button>'), 'color')!;
    const c = checkAttribute(table, make('<void-button size="xl"></void-button>'), 'size')!;
    expect(keyOf(a)).toBe(keyOf(b));
    expect(keyOf(a)).not.toBe(keyOf(c));
  });
});

describe('parents and children', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('reports a child in the wrong parent and says what is allowed', () => {
    const el = make('<void-select><void-option value="a">A</void-option></void-select>').firstElementChild!;
    const w = checkParent(table, el)!;
    expect(w.kind).toBe('wrong-parent');
    expect(w.message).toContain('only works inside <void-multiselect> or <void-combobox>');
    expect(w.message).toContain('it is inside <void-select>');
    expect(w.message).toContain('takes native <option> children');
  });

  it('accepts the allowed parent at any depth', () => {
    expect(checkParent(table, make('<void-multiselect><void-option></void-option></void-multiselect>').firstElementChild!)).toBeUndefined();
    expect(checkParent(table, make('<void-combobox><div><void-option></void-option></div></void-combobox>').querySelector('void-option')!)).toBeUndefined();
  });

  it('says there is no parent at all', () => {
    expect(checkParent(table, make('<void-option></void-option>'))!.message).toContain('it has no void-* parent');
  });

  it('does not judge a child parked by a morph', () => {
    document.body.innerHTML = '<void-projection-park><void-option></void-option></void-projection-park>';
    expect(checkParent(table, document.querySelector('void-option')!)).toBeUndefined();
  });

  it('reports a missing required child, and not a present one', () => {
    const empty = make('<void-tabs></void-tabs>');
    const [w] = checkRequired(table, empty);
    expect(w.kind).toBe('missing-child');
    expect(w.message).toContain('<void-tabs> has no <void-tab-panel> child');
    expect(checkRequired(table, make('<void-tabs><div><void-tab-panel></void-tab-panel></div></void-tabs>'))).toEqual([]);
  });
});

describe('undefined tags', () => {
  it('names the import for a known tag that is not defined', () => {
    const w = checkDefined(table, make('<void-sidebar></void-sidebar>'), false)!;
    expect(w.message).toContain('is a Void UI element but it is not defined');
    expect(w.message).toContain('@voidable/ui/components/sidebar.js');
    expect(checkDefined(table, make('<void-sidebar></void-sidebar>'), true)!.message).toContain('The autoloader did not load it');
  });

  it('suggests the real tag for a typo', () => {
    const w = checkDefined(table, make('<void-buton></void-buton>'), false)!;
    expect(w.message).toContain('is not a Void UI element');
    expect(w.message).toContain('Did you mean <void-button>?');
  });

  it('is quiet for a CSS-only styled element, and still suggests it for a typo', () => {
    const styled = ['void-page-head', 'void-shell'];
    const el = make('<void-page-head></void-page-head>');
    expect(checkDefined(table, el, false, styled)).toBeUndefined();
    expect(checkDefined(table, el, false)).toBeDefined();
    const typo = checkDefined(table, make('<void-pag-head></void-pag-head>'), false, styled)!;
    expect(typo.message).toContain('Did you mean <void-page-head>?');
  });

  it('is quiet for a defined element and for non-void tags', () => {
    customElements.define('void-input', class extends HTMLElement {});
    expect(checkDefined(table, make('<void-input></void-input>'), false)).toBeUndefined();
    expect(checkDefined(table, make('<my-thing></my-thing>'), false)).toBeUndefined();
  });
});

describe('events', () => {
  it('reports an event nothing dispatches, with the element events and a suggestion', () => {
    const el = make('<void-input></void-input>');
    const w = checkEvent(table, el, 'void-chnage')!;
    expect(w.kind).toBe('unknown-event');
    expect(w.message).toContain('no Void UI element dispatches an event with that name');
    expect(w.message).toContain('Did you mean "void-change"?');
    expect(w.message).toContain('void-input dispatches: void-input, void-change');
  });

  it('accepts real events on any target and ignores other event names', () => {
    expect(checkEvent(table, make('<void-input></void-input>'), 'void-change')).toBeUndefined();
    expect(checkEvent(table, document, 'void-change')).toBeUndefined();
    expect(checkEvent(table, document.body, 'click')).toBeUndefined();
  });
});

describe('suggest', () => {
  it('matches by normalised spelling, then by distance, and gives up on unrelated words', () => {
    expect(suggest('collapsed-width', ['collapsedwidth', 'side'])).toBe('collapsedwidth');
    expect(suggest('colour', ['color', 'size'])).toBe('color');
    expect(suggest('banana', ['color', 'size'])).toBeUndefined();
    expect(suggest('primary', ['default', 'error'])).toBeUndefined();
    expect(suggest('primary', ['default', 'error'], true)).toBe('default');
  });
});
