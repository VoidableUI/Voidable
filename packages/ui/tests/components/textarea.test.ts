// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidTextarea } from '../../src/components/textarea.js';
import '../../src/components/field.js';

const TAG = 'void-textarea';

function createElement(): VoidTextarea {
  return document.createElement(TAG) as VoidTextarea;
}

describe('VoidTextarea', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(VoidTextarea.prototype).toBeInstanceOf(VoidElement);
    });

    it('is registered as void-textarea', () => {
      expect(customElements.get(TAG)).toBe(VoidTextarea);
    });
  });

  describe('default property values', () => {
    let el: VoidTextarea;

    beforeEach(() => {
      el = createElement();
    });

    it('value defaults to empty string', () => {
      expect(el.value).toBe('');
    });

    it('placeholder defaults to empty string', () => {
      expect(el.placeholder).toBe('');
    });

    it('disabled defaults to false', () => {
      expect(el.disabled).toBe(false);
    });

    it('readonly defaults to false', () => {
      expect(el.readonly).toBe(false);
    });

    it('required defaults to false', () => {
      expect(el.required).toBe(false);
    });

    it('rows defaults to 3', () => {
      expect(el.rows).toBe(3);
    });

    it('resize defaults to vertical', () => {
      expect(el.resize).toBe('vertical');
    });

    it('size defaults to md', () => {
      expect(el.size).toBe('md');
    });

    it('error defaults to empty string', () => {
      expect(el.error).toBe('');
    });
  });

  describe('native textarea rendering', () => {
    let el: VoidTextarea;

    beforeEach(async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('renders a native textarea element', () => {
      expect(el.querySelector('textarea')).not.toBeNull();
    });

    it('native textarea has no aria-invalid when no error', () => {
      const ta = el.querySelector('textarea')!;
      expect(ta.getAttribute('aria-invalid')).toBe('false');
    });
  });

  describe('ARIA and accessibility', () => {
    let el: VoidTextarea;

    beforeEach(async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('has no role of its own: the native textarea is the textbox', () => {
      expect(el.hasAttribute('role')).toBe(false);
      expect(el.hasAttribute('aria-multiline')).toBe(false);
      expect(el.querySelector('textarea')).not.toBeNull();
    });

    it('is named by void-field through the native textarea', async () => {
      const field = document.createElement('void-field') as HTMLElement & { label: string; updateComplete: Promise<boolean> };
      field.label = 'Notes';
      field.appendChild(el);
      document.body.appendChild(field);
      await field.updateComplete;
      await el.updateComplete;
      await new Promise((r) => setTimeout(r, 0));
      const textarea = el.querySelector('textarea')!;
      const label = field.querySelector('.void-field-label')!;
      expect(textarea.getAttribute('aria-labelledby')).toBe(label.id);
      expect(el.hasAttribute('aria-labelledby')).toBe(false);
    });
  });

  describe('error rendering', () => {
    let el: VoidTextarea;

    beforeEach(async () => {
      el = createElement();
      document.body.appendChild(el);
      await el.updateComplete;
    });

    it('does not render error span when error is empty', () => {
      expect(el.querySelector('.void-textarea-error')).toBeNull();
    });

    it('renders error span when error is set', async () => {
      el.error = 'Something went wrong';
      await el.updateComplete;
      const span = el.querySelector('.void-textarea-error');
      expect(span).not.toBeNull();
      expect(span!.textContent).toBe('Something went wrong');
    });

    it('sets aria-invalid="true" on native textarea when error is set', async () => {
      el.error = 'Required';
      await el.updateComplete;
      const ta = el.querySelector('textarea')!;
      expect(ta.getAttribute('aria-invalid')).toBe('true');
    });

    it('removes error span when error is cleared', async () => {
      el.error = 'Error';
      await el.updateComplete;
      el.error = '';
      await el.updateComplete;
      expect(el.querySelector('.void-textarea-error')).toBeNull();
    });
  });

  describe('autosize', () => {
    const DEV_KEY = Symbol.for('voidable.dev');
    const report = vi.fn();
    const made: VoidTextarea[] = [];
    let observers: Array<{ observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; cb: () => void }>;

    /** The browser cannot size to content, so the component measures. */
    function noFieldSizing(): void {
      vi.stubGlobal('CSS', { supports: () => false });
    }

    async function make(attrs: Record<string, string> = {}): Promise<VoidTextarea> {
      const el = createElement();
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      document.body.appendChild(el);
      made.push(el);
      await el.updateComplete;
      return el;
    }

    beforeEach(() => {
      report.mockClear();
      (globalThis as Record<symbol, unknown>)[DEV_KEY] = { report };
      observers = [];
      vi.stubGlobal('ResizeObserver', class {
        observe = vi.fn();
        disconnect = vi.fn();
        constructor(public cb: () => void) {
          observers.push(this as never);
        }
      });
    });

    afterEach(() => {
      for (const el of made.splice(0)) el.remove();
      delete (globalThis as Record<symbol, unknown>)[DEV_KEY];
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('is off by default and max-rows is unset', () => {
      const el = createElement();
      expect(el.autosize).toBe(false);
      expect(el.maxRows).toBeUndefined();
    });

    it('reflects autosize and max-rows, and the attributes set the properties', async () => {
      const el = await make();
      el.autosize = true;
      el.maxRows = 8;
      await el.updateComplete;
      expect(el.hasAttribute('autosize')).toBe(true);
      expect(el.getAttribute('max-rows')).toBe('8');
      const other = await make({ autosize: '', 'max-rows': '5' });
      expect(other.autosize).toBe(true);
      expect(other.maxRows).toBe(5);
    });

    it('writes the row bounds on the host for the stylesheet; max never goes below rows', async () => {
      const el = await make({ autosize: '', rows: '4', 'max-rows': '10' });
      expect(el.style.getPropertyValue('--_void-textarea-rows')).toBe('4');
      expect(el.style.getPropertyValue('--_void-textarea-max-rows')).toBe('10');
      el.maxRows = 2;
      await el.updateComplete;
      expect(el.style.getPropertyValue('--_void-textarea-max-rows')).toBe('4');
      el.maxRows = undefined;
      await el.updateComplete;
      expect(el.style.getPropertyValue('--_void-textarea-max-rows')).toBe('');
      el.autosize = false;
      await el.updateComplete;
      expect(el.style.getPropertyValue('--_void-textarea-rows')).toBe('');
    });

    it('costs nothing when off: no observer, no host style, no sizer', async () => {
      noFieldSizing();
      const el = await make({ rows: '5', 'max-rows': '9' });
      expect(observers).toHaveLength(0);
      expect(el.getAttribute('style')).toBeNull();
      expect(el.querySelector('.void-textarea-sizer')).toBeNull();
    });

    it('creates no observer where field-sizing works', async () => {
      vi.stubGlobal('CSS', { supports: () => true });
      const el = await make({ autosize: '' });
      expect(observers).toHaveLength(0);
      expect(el.querySelector('.void-textarea-sizer')).toBeNull();
    });

    it('creates one observer, on the sizer, where it does not, and drops it when autosize goes off', async () => {
      noFieldSizing();
      const el = await make({ autosize: '' });
      expect(observers).toHaveLength(1);
      const sizer = el.querySelector('.void-textarea-sizer')!;
      expect(sizer).not.toBeNull();
      expect(observers[0]!.observe).toHaveBeenCalledWith(sizer);
      el.value = 'more';
      await el.updateComplete;
      expect(observers).toHaveLength(1);
      el.autosize = false;
      await el.updateComplete;
      expect(observers[0]!.disconnect).toHaveBeenCalled();
      expect(el.querySelector('.void-textarea-sizer')).toBeNull();
    });

    it('measures once per change, restores what it reset, and writes the fit on the host', async () => {
      noFieldSizing();
      const proto = HTMLTextAreaElement.prototype as unknown as Record<string, unknown>;
      const scrollHeight = vi.fn(() => 90);
      Object.defineProperty(proto, 'clientWidth', { configurable: true, get: () => 200 });
      Object.defineProperty(proto, 'clientHeight', { configurable: true, get: () => 90 });
      Object.defineProperty(proto, 'offsetHeight', { configurable: true, get: () => 92 });
      Object.defineProperty(proto, 'scrollHeight', { configurable: true, get: scrollHeight });
      try {
        const el = await make({ autosize: '' });
        const ta = el.querySelector('textarea')!;
        expect(scrollHeight).toHaveBeenCalledTimes(1);
        // The scroll height plus the border the box adds.
        expect(el.style.getPropertyValue('--_void-textarea-fit')).toBe('92px');
        expect(ta.style.blockSize).toBe('');
        expect(el.style.minBlockSize).toBe('');
        el.value = 'a\nb\nc';
        await el.updateComplete;
        expect(scrollHeight).toHaveBeenCalledTimes(2);
        // An unrelated change measures nothing.
        el.error = 'No';
        await el.updateComplete;
        expect(scrollHeight).toHaveBeenCalledTimes(2);
        // The observer fires with the same width: nothing to do.
        observers[0]!.cb();
        expect(scrollHeight).toHaveBeenCalledTimes(2);
      } finally {
        for (const k of ['clientWidth', 'clientHeight', 'offsetHeight', 'scrollHeight']) delete proto[k];
      }
    });

    it('does not measure a hidden box (no width); the observer does when it shows', async () => {
      noFieldSizing();
      const scrollHeight = vi.fn(() => 90);
      const proto = HTMLTextAreaElement.prototype as unknown as Record<string, unknown>;
      Object.defineProperty(proto, 'scrollHeight', { configurable: true, get: scrollHeight });
      try {
        const el = await make({ autosize: '', value: 'long' });
        expect(scrollHeight).not.toHaveBeenCalled();
        expect(el.style.getPropertyValue('--_void-textarea-fit')).toBe('');
      } finally {
        delete proto.scrollHeight;
      }
    });

    it('warns when resize="both" is set with autosize, and not for none or the default', async () => {
      await make({ autosize: '', resize: 'both' });
      expect(report).toHaveBeenCalledTimes(1);
      expect(report.mock.calls[0]![0]).toMatchObject({ kind: 'attribute-conflict', tag: TAG, subject: 'resize' });
      report.mockClear();
      await make({ autosize: '', resize: 'none' });
      await make({ autosize: '' });
      await make({ resize: 'both' });
      expect(report).not.toHaveBeenCalled();
    });
  });
});
