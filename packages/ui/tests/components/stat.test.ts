// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidStat } from '../../src/components/stat.js';

const TAG = 'void-stat';

async function mount(props: Partial<VoidStat> = {}): Promise<VoidStat> {
  const el = document.createElement(TAG) as VoidStat;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

const label = (el: Element) => el.querySelector('.void-stat-label');
const value = (el: Element) => el.querySelector('.void-stat-value');
const delta = (el: Element) => el.querySelector('.void-stat-delta');

afterEach(() => {
  document.body.innerHTML = '';
});

describe('VoidStat', () => {
  describe('class', () => {
    it('extends VoidElement', () => {
      expect(VoidStat.prototype).toBeInstanceOf(VoidElement);
    });

    it('is registered as void-stat', () => {
      expect(customElements.get(TAG)).toBe(VoidStat);
    });
  });

  describe('default property values', () => {
    const el = document.createElement(TAG) as VoidStat;
    it('label, value and delta default to empty strings', () => {
      expect(el.label).toBe('');
      expect(el.value).toBe('');
      expect(el.delta).toBe('');
    });
    it('trend defaults to null', () => expect(el.trend).toBeNull());
    it('color defaults to "default"', () => expect(el.color).toBe('default'));
    it('size defaults to "md"', () => expect(el.size).toBe('md'));
  });

  describe('attribute reflection', () => {
    it('reflects all properties', async () => {
      const el = await mount({ label: 'Revenue', value: '$1k', delta: '+3%', trend: 'up', color: 'success', size: 'lg' });
      expect(el.getAttribute('label')).toBe('Revenue');
      expect(el.getAttribute('value')).toBe('$1k');
      expect(el.getAttribute('delta')).toBe('+3%');
      expect(el.getAttribute('trend')).toBe('up');
      expect(el.getAttribute('color')).toBe('success');
      expect(el.getAttribute('size')).toBe('lg');
    });

    it('does not set a trend attribute while trend is null', async () => {
      const el = await mount();
      expect(el.hasAttribute('trend')).toBe(false);
    });

    it('renders from attributes', async () => {
      const el = document.createElement(TAG) as VoidStat;
      el.setAttribute('label', 'Users');
      el.setAttribute('value', '42');
      document.body.appendChild(el);
      await el.updateComplete;
      expect(label(el)!.textContent).toBe('Users');
      expect(value(el)!.textContent).toBe('42');
    });

    it('accepts every documented trend', async () => {
      for (const t of ['up', 'down', 'flat', 'error', 'warning', 'success', 'info', 'notice', 'highlight'] as const) {
        const el = await mount({ trend: t });
        expect(el.getAttribute('trend')).toBe(t);
      }
    });
  });

  describe('ARIA', () => {
    it('has role="figure"', async () => {
      const el = await mount();
      expect(el.getAttribute('role')).toBe('figure');
    });
  });

  describe('rendered structure', () => {
    it('always renders the value element, even when empty', async () => {
      const el = await mount();
      expect(value(el)).not.toBeNull();
      expect(value(el)!.textContent).toBe('');
    });

    it('omits label and delta elements when empty', async () => {
      const el = await mount({ value: '5' });
      expect(label(el)).toBeNull();
      expect(delta(el)).toBeNull();
    });

    it('renders label, value and delta in that order', async () => {
      const el = await mount({ label: 'L', value: 'V', delta: 'D' });
      const classes = Array.from(el.querySelectorAll('span')).map((s) => s.className);
      expect(classes).toEqual(['void-stat-label', 'void-stat-value', 'void-stat-delta']);
      expect(label(el)!.textContent).toBe('L');
      expect(value(el)!.textContent).toBe('V');
      expect(delta(el)!.textContent).toBe('D');
    });

    it('shows the delta without a trend (trend only affects styling)', async () => {
      const el = await mount({ value: '1', delta: '+1' });
      expect(delta(el)!.textContent).toBe('+1');
    });

    it('escapes HTML in text', async () => {
      const el = await mount({ label: '<b>x</b>', value: '<i>y</i>' });
      expect(label(el)!.querySelector('b')).toBeNull();
      expect(value(el)!.textContent).toBe('<i>y</i>');
    });

    it('does not mutate sibling content', async () => {
      const el = await mount({ value: '1' });
      expect(el.children).toHaveLength(1);
    });
  });

  describe('reactivity', () => {
    it('updates the value text', async () => {
      const el = await mount({ value: '1' });
      el.value = '2';
      await el.updateComplete;
      expect(value(el)!.textContent).toBe('2');
    });

    it('adds and removes the label', async () => {
      const el = await mount({ value: '1' });
      el.label = 'New';
      await el.updateComplete;
      expect(label(el)!.textContent).toBe('New');
      el.label = '';
      await el.updateComplete;
      expect(label(el)).toBeNull();
    });

    it('adds and removes the delta', async () => {
      const el = await mount({ value: '1' });
      el.delta = '-4%';
      await el.updateComplete;
      expect(delta(el)!.textContent).toBe('-4%');
      el.delta = '';
      await el.updateComplete;
      expect(delta(el)).toBeNull();
    });

    it('updating the trend does not re-render content', async () => {
      const el = await mount({ value: '1', delta: '+1' });
      const before = delta(el);
      el.trend = 'down';
      await el.updateComplete;
      expect(delta(el)).toBe(before);
    });
  });
});

describe('VoidStat description', () => {
  const description = (el: Element) => el.querySelector('.void-stat-description');

  it('renders no description line by default', async () => {
    expect(description(await mount({ value: '12' }))).toBeNull();
  });

  it('renders the description under the value', async () => {
    const el = await mount({ value: '12', delta: '+3', description: 'vs. last month' });
    expect(description(el)!.textContent).toBe('vs. last month');
    expect(el.getAttribute('description')).toBe('vs. last month');
  });

  it('reads the description attribute from markup', async () => {
    document.body.innerHTML = '<void-stat value="12" description="per day"></void-stat>';
    const el = document.body.firstElementChild as VoidStat;
    await el.updateComplete;
    expect(description(el)!.textContent).toBe('per day');
  });

  it('accepts color caution and highlight', async () => {
    const el = await mount({ color: 'caution' });
    expect(el.getAttribute('color')).toBe('caution');
    el.color = 'highlight';
    await el.updateComplete;
    expect(el.getAttribute('color')).toBe('highlight');
  });
});
