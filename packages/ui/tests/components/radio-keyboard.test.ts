// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../../src/components/radio-group.js';
import '../../src/components/radio.js';
import type { VoidRadio } from '../../src/components/radio.js';
import type { VoidRadioGroup } from '../../src/components/radio-group.js';

let host: HTMLElement;
beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
afterEach(() => { host.remove(); });

async function mount(html: string): Promise<void> {
  host.innerHTML = html;
  await Promise.all(Array.from(host.querySelectorAll<VoidRadio | VoidRadioGroup>('void-radio, void-radio-group')).map(e => e.updateComplete));
  await Promise.resolve();
}
const radios = (root: ParentNode = host) => Array.from(root.querySelectorAll('void-radio')) as VoidRadio[];
const stops = (root: ParentNode = host) => radios(root).map(r => r.getAttribute('tabindex')).join(',');
const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

const GROUP = '<void-radio-group label="Plan" name="plan" value="b"><void-radio value="a">A</void-radio><void-radio value="b">B</void-radio><void-radio value="c">C</void-radio></void-radio-group>';

describe('radio group: roving tabindex', () => {
  it('only the checked radio is tabbable', async () => {
    await mount(GROUP);
    expect(stops()).toBe('-1,0,-1');
  });

  it('the first enabled radio is tabbable while none is checked', async () => {
    await mount('<void-radio-group name="p"><void-radio value="a" disabled>A</void-radio><void-radio value="b">B</void-radio><void-radio value="c">C</void-radio></void-radio-group>');
    expect(stops()).toBe('-1,0,-1');
  });

  it('the tab stop follows the value, also when the server changes it', async () => {
    await mount(GROUP);
    (host.querySelector('void-radio-group') as VoidRadioGroup).value = 'c';
    await (host.querySelector('void-radio-group') as VoidRadioGroup).updateComplete;
    await Promise.all(radios().map(r => r.updateComplete));
    expect(stops()).toBe('-1,-1,0');
  });

  it('a disabled checked radio leaves the first enabled one tabbable', async () => {
    await mount('<void-radio-group name="p" value="a"><void-radio value="a" disabled>A</void-radio><void-radio value="b">B</void-radio></void-radio-group>');
    expect(stops()).toBe('-1,0');
  });

  it('a disabled group has no tab stop', async () => {
    await mount('<void-radio-group name="p" value="a" disabled><void-radio value="a">A</void-radio><void-radio value="b">B</void-radio></void-radio-group>');
    expect(stops()).toBe('-1,-1');
  });

  it('is right on the first connect, before the first update', () => {
    host.innerHTML = GROUP;
    expect(radios().map(r => r.getAttribute('aria-checked')).join(',')).toBe('false,true,false');
    expect(stops()).toBe('-1,0,-1');
  });
});

describe('radio group: arrow keys', () => {
  it('ArrowDown and ArrowRight check the next radio and fire one void-change', async () => {
    await mount(GROUP);
    const group = host.querySelector('void-radio-group') as VoidRadioGroup;
    const events: unknown[] = [];
    group.addEventListener('void-change', (e) => events.push((e as CustomEvent).detail));
    key(radios()[1]!, 'ArrowDown');
    expect(group.value).toBe('c');
    expect(radios()[2]!.checked).toBe(true);
    key(radios()[2]!, 'ArrowRight');
    expect(group.value).toBe('a');
    expect(events).toEqual([{ value: 'c' }, { value: 'a' }]);
  });

  it('ArrowUp and ArrowLeft check the previous radio and wrap', async () => {
    await mount(GROUP);
    const group = host.querySelector('void-radio-group') as VoidRadioGroup;
    key(radios()[1]!, 'ArrowUp');
    expect(group.value).toBe('a');
    key(radios()[0]!, 'ArrowLeft');
    expect(group.value).toBe('c');
  });

  it('skips disabled radios', async () => {
    await mount('<void-radio-group name="p" value="a"><void-radio value="a">A</void-radio><void-radio value="b" disabled>B</void-radio><void-radio value="c">C</void-radio></void-radio-group>');
    key(radios()[0]!, 'ArrowDown');
    expect((host.querySelector('void-radio-group') as VoidRadioGroup).value).toBe('c');
  });

  it('updates the tab stop and the native radios', async () => {
    await mount(GROUP);
    key(radios()[1]!, 'ArrowDown');
    expect(stops()).toBe('-1,-1,0');
    expect(radios().map(r => r.querySelector<HTMLInputElement>('input')!.checked).join(',')).toBe('false,false,true');
    expect(radios().map(r => r.getAttribute('aria-checked')).join(',')).toBe('false,false,true');
  });

  it('is a click for the consumer, once', async () => {
    await mount(GROUP);
    let clicks = 0;
    radios()[2]!.addEventListener('click', () => clicks++);
    key(radios()[1]!, 'ArrowDown');
    expect(clicks).toBe(1);
  });

  it('ignores modified arrows', async () => {
    await mount(GROUP);
    radios()[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', ctrlKey: true, bubbles: true, cancelable: true }));
    expect((host.querySelector('void-radio-group') as VoidRadioGroup).value).toBe('b');
  });
});

describe('standalone radios sharing a name', () => {
  const FORM = '<form><void-radio name="s" value="a">A</void-radio><void-radio name="s" value="b" checked>B</void-radio><void-radio name="s" value="c">C</void-radio><void-radio name="other" value="x">X</void-radio></form>';

  it('one is tabbable per name', async () => {
    await mount(FORM);
    expect(stops()).toBe('-1,0,-1,0');
  });

  it('arrows move within the name and fire void-change once on the radio', async () => {
    await mount(FORM);
    const events: unknown[] = [];
    host.addEventListener('void-change', (e) => events.push((e as CustomEvent).detail));
    key(radios()[1]!, 'ArrowDown');
    expect(radios().map(r => r.checked).join(',')).toBe('false,false,true,false');
    key(radios()[2]!, 'ArrowDown');
    expect(radios().map(r => r.checked).join(',')).toBe('true,false,false,false');
    expect(events).toEqual([{ value: 'c', checked: true }, { value: 'a', checked: true }]);
  });

  it('the same name in another form is another group', async () => {
    await mount('<form><void-radio name="s" value="a" checked>A</void-radio></form><form><void-radio name="s" value="a">A</void-radio></form>');
    expect(stops()).toBe('0,0');
  });
});
