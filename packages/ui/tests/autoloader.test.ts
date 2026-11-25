// @vitest-environment happy-dom
// The real entry: the generated table and the real components. Requires a prior
// build (the table is generated from the manifest); `mise run test` depends on it.
import { describe, it, expect } from 'vitest';
import { autoloader, ready } from '../src/autoloader.js';
import { tags, modules } from '../src/autoloader-table.generated.js';

describe('@voidable/ui/autoloader', () => {
  it('registers nothing up front', () => {
    expect(customElements.get('void-badge')).toBeUndefined();
    expect(customElements.get('void-dialog')).toBeUndefined();
  });

  it('defines only the tags the page uses', async () => {
    document.body.innerHTML = '<void-badge>New</void-badge>';
    await ready();
    expect(customElements.get('void-badge')).toBeDefined();
    expect(customElements.get('void-dialog')).toBeUndefined();
    expect([...autoloader.loaded]).toEqual(['badge']);
  });

  it('picks up a component inserted after load upgraded', async () => {
    document.body.insertAdjacentHTML('beforeend', '<void-button>Go</void-button>');
    await ready();
    expect(customElements.get('void-button')).toBeDefined();
    expect(document.querySelector('void-button')?.getAttribute('role')).toBe('button');
  });

  it('maps every generated tag to a module with a loader', () => {
    expect(Object.keys(tags).length).toBeGreaterThan(60);
    for (const [tag, name] of Object.entries(tags)) {
      expect(tag).toMatch(/^void-[a-z0-9-]+$/);
      expect(typeof modules[name], `${tag} -> ${name}`).toBe('function');
    }
    expect(tags['void-option']).toBe('multiselect');
  });
});
