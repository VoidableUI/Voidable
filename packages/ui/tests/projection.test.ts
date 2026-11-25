// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement, ProjectionController } from '../src/base.js';

/** Test host: a heading region before Lit's chrome, a body container, and a footer region after. */
class ProjectionTestHost extends VoidElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: Boolean }) variant = false;
  changes = 0;

  projection = new ProjectionController(this, {
    regions: [
      { name: 'lead', target: 'before', accepts: n => n instanceof Element && n.getAttribute('region') === 'lead' },
      { name: 'foot', target: 'after', accepts: n => n instanceof Element && n.getAttribute('region') === 'foot' },
      { name: 'body', target: () => this.querySelector(':scope > .chrome > .body') },
    ],
    onChange: () => {
      this.changes++;
    },
  });

  render() {
    // The top-level template switches between two shapes to prove Lit's clears
    // never reach consumer nodes; the container itself is always rendered.
    return html`
      ${this.variant ? html`<span class="variant">v</span>` : nothing}
      <div class="chrome" ?hidden=${!this.open}><div class="body"></div></div>
    `;
  }
}
if (!customElements.get('projection-test-host')) {
  customElements.define('projection-test-host', ProjectionTestHost);
}

/** Host with a single catch-all region and no onChange. */
class ProjectionPlainHost extends VoidElement {
  projection = new ProjectionController(this, {
    regions: [{ name: 'body', target: () => this.querySelector(':scope > .body') }],
  });

  render() {
    return html`<div class="body"></div>`;
  }
}
if (!customElements.get('projection-plain-host')) {
  customElements.define('projection-plain-host', ProjectionPlainHost);
}

async function settle(el: VoidElement): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise(r => setTimeout(r, 0));
    await el.updateComplete;
  }
}

function create(): ProjectionTestHost {
  return document.createElement('projection-test-host') as ProjectionTestHost;
}

const body = (el: Element) => el.querySelector(':scope > .chrome > .body')!;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ProjectionController', () => {
  describe('initial projection', () => {
    it('moves existing children into the body container without cloning', async () => {
      const el = create();
      const p = document.createElement('p');
      const text = document.createTextNode('hello');
      el.append(p, text);
      document.body.appendChild(el);
      await settle(el);
      expect(p.parentNode).toBe(body(el));
      expect(text.parentNode).toBe(body(el));
      expect(Array.from(body(el).childNodes)).toEqual([p, text]);
    });

    it('projects into a container that is hidden (starts closed)', async () => {
      const el = create();
      el.innerHTML = '<p>closed content</p>';
      document.body.appendChild(el);
      await settle(el);
      expect(el.querySelector<HTMLElement>('.chrome')!.hidden).toBe(true);
      expect(body(el).textContent).toBe('closed content');
    });

    it('routes children to named regions by accepts()', async () => {
      const el = create();
      el.innerHTML = '<i region="foot">f</i><b region="lead">l</b><p>b</p>';
      document.body.appendChild(el);
      await settle(el);
      const lead = el.querySelector('[region="lead"]')!;
      const foot = el.querySelector('[region="foot"]')!;
      expect(lead.parentNode).toBe(el);
      expect(foot.parentNode).toBe(el);
      // lead sits before Lit's chrome, foot after it
      expect(lead.compareDocumentPosition(el.querySelector('.chrome')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(foot.compareDocumentPosition(el.querySelector('.chrome')!) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
      expect(el.projection.nodes('lead')).toEqual([lead]);
      expect(el.projection.nodes('foot')).toEqual([foot]);
      expect(el.projection.nodes('body').map(n => n.textContent)).toEqual(['b']);
      expect(el.projection.regionOf(lead)).toBe('lead');
    });

    it('handles children appended by the parser after upgrade (connected while empty)', async () => {
      const el = create();
      document.body.appendChild(el);
      await settle(el);
      // simulate the parser appending children after the element connected
      el.appendChild(document.createElement('p'));
      el.appendChild(document.createTextNode('later'));
      await settle(el);
      expect(body(el).childNodes.length).toBe(2);
    });

    it('projects children of an element that is upgraded after it was parsed', async () => {
      document.body.innerHTML = '<projection-late-host><p id="x">x</p>text</projection-late-host>';
      class ProjectionLateHost extends ProjectionPlainHost {}
      customElements.define('projection-late-host', ProjectionLateHost);
      const el = document.querySelector('projection-late-host') as ProjectionLateHost;
      // happy-dom swaps in a new instance on define rather than upgrading in place,
      // so only the resulting structure is asserted here.
      await settle(el);
      expect(el.querySelector(':scope > .body')!.innerHTML).toBe('<p id="x">x</p>text');
    });

    it('handles children appended before the first render', async () => {
      const el = create();
      document.body.appendChild(el);
      el.appendChild(document.createElement('p'));
      await settle(el);
      expect(body(el).querySelector('p')).not.toBeNull();
    });
  });

  describe('Lit / consumer separation', () => {
    it('Lit template changes never remove consumer nodes', async () => {
      const el = create();
      el.innerHTML = '<p id="a">a</p><i region="foot" id="f">f</i>';
      document.body.appendChild(el);
      await settle(el);
      el.variant = true;
      await settle(el);
      el.variant = false;
      await settle(el);
      el.open = true;
      await settle(el);
      expect(el.querySelector('#a')!.parentNode).toBe(body(el));
      expect(el.querySelector('#f')!.parentNode).toBe(el);
    });

    it('nodes appended while Lit re-renders are not lost', async () => {
      const el = create();
      document.body.appendChild(el);
      await settle(el);
      const p = document.createElement('p');
      el.appendChild(p);
      el.variant = true; // render and mutation in the same tick
      await settle(el);
      expect(p.parentNode).toBe(body(el));
    });
  });

  describe('later mutations', () => {
    it('projects later additions and reports them through onChange', async () => {
      const el = create();
      el.innerHTML = '<p>first</p>';
      document.body.appendChild(el);
      await settle(el);
      expect(el.changes).toBe(0);
      const p = document.createElement('p');
      el.appendChild(p);
      await settle(el);
      expect(p.parentNode).toBe(body(el));
      expect(el.changes).toBe(1);
    });

    it('reports removals from a container through onChange', async () => {
      const el = create();
      el.innerHTML = '<p id="x">first</p>';
      document.body.appendChild(el);
      await settle(el);
      el.querySelector('#x')!.remove();
      await settle(el);
      expect(el.changes).toBe(1);
      expect(el.projection.nodes('body')).toEqual([]);
    });

    it('does not report Lit re-renders as changes', async () => {
      const el = create();
      el.innerHTML = '<p>x</p>';
      document.body.appendChild(el);
      await settle(el);
      el.open = true;
      el.variant = true;
      await settle(el);
      expect(el.changes).toBe(0);
    });

    it('re-routes a projected node the consumer moves back onto the host', async () => {
      const el = create();
      el.innerHTML = '<p id="x">x</p><p id="y">y</p>';
      document.body.appendChild(el);
      await settle(el);
      const x = el.querySelector('#x')!;
      el.appendChild(x);
      await settle(el);
      expect(x.parentNode).toBe(body(el));
      expect(Array.from(body(el).children).map(c => c.id)).toEqual(['y', 'x']);
    });
  });

  describe('lifecycle', () => {
    it('does not duplicate sentinels, containers or content on reconnect and move', async () => {
      const el = create();
      el.innerHTML = '<p id="x">x</p>';
      document.body.appendChild(el);
      await settle(el);
      const before = el.childNodes.length;
      const other = document.createElement('section');
      document.body.appendChild(other);
      other.appendChild(el);
      await settle(el);
      el.remove();
      await settle(el);
      document.body.appendChild(el);
      await settle(el);
      expect(el.childNodes.length).toBe(before);
      expect(el.querySelectorAll('.body').length).toBe(1);
      expect(el.querySelectorAll('#x').length).toBe(1);
    });

    it('projects children added while disconnected once reconnected', async () => {
      const el = create();
      document.body.appendChild(el);
      await settle(el);
      el.remove();
      const p = document.createElement('p');
      el.appendChild(p);
      await settle(el);
      expect(p.parentNode).toBe(el);
      document.body.appendChild(el);
      await settle(el);
      expect(p.parentNode).toBe(body(el));
      expect(el.changes).toBe(1);
    });

    it('stops observing while disconnected', async () => {
      const el = create();
      document.body.appendChild(el);
      await settle(el);
      el.remove();
      el.appendChild(document.createElement('p'));
      await settle(el);
      expect(el.changes).toBe(0);
    });

    it('preserves consumer listeners through projection and moves', async () => {
      const el = create();
      const button = document.createElement('button');
      let clicks = 0;
      button.addEventListener('click', () => clicks++);
      el.appendChild(button);
      document.body.appendChild(el);
      await settle(el);
      document.body.appendChild(document.createElement('div')).appendChild(el);
      await settle(el);
      button.click();
      expect(clicks).toBe(1);
      expect(button.parentNode).toBe(body(el));
    });
  });

  describe('framework-style host operations', () => {
    it('insertBefore with a projected reference node inserts next to it', async () => {
      const el = create();
      el.innerHTML = '<p id="a">a</p><p id="c">c</p>';
      document.body.appendChild(el);
      await settle(el);
      const b = document.createElement('p');
      b.id = 'b';
      el.insertBefore(b, el.querySelector('#c'));
      expect(Array.from(body(el).children).map(c => c.id)).toEqual(['a', 'b', 'c']);
    });

    it('insertBefore routes a node for another region to that region', async () => {
      const el = create();
      el.innerHTML = '<p id="a">a</p>';
      document.body.appendChild(el);
      await settle(el);
      const lead = document.createElement('b');
      lead.setAttribute('region', 'lead');
      el.insertBefore(lead, el.querySelector('#a'));
      expect(lead.parentNode).toBe(el);
      expect(el.projection.nodes('lead')).toEqual([lead]);
    });

    it('insertBefore with a fragment inserts each child', async () => {
      const el = create();
      el.innerHTML = '<p id="z">z</p>';
      document.body.appendChild(el);
      await settle(el);
      const frag = document.createDocumentFragment();
      const x = document.createElement('p');
      x.id = 'x';
      const y = document.createElement('p');
      y.id = 'y';
      frag.append(x, y);
      el.insertBefore(frag, el.querySelector('#z'));
      expect(Array.from(body(el).children).map(c => c.id)).toEqual(['x', 'y', 'z']);
    });

    it('removeChild with a projected node removes it from its container', async () => {
      const el = create();
      el.innerHTML = '<p id="a">a</p>';
      document.body.appendChild(el);
      await settle(el);
      const a = el.querySelector('#a')!;
      expect(el.removeChild(a)).toBe(a);
      expect(a.parentNode).toBeNull();
    });

    it('replaceChild with a projected node replaces it in place', async () => {
      const el = create();
      el.innerHTML = '<p id="a">a</p><p id="b">b</p>';
      document.body.appendChild(el);
      await settle(el);
      const x = document.createElement('p');
      x.id = 'x';
      el.replaceChild(x, el.querySelector('#a')!);
      expect(Array.from(body(el).children).map(c => c.id)).toEqual(['x', 'b']);
    });

    it('still throws for nodes that are not children at all', async () => {
      const el = create();
      document.body.appendChild(el);
      await settle(el);
      expect(() => el.removeChild(document.createElement('p'))).toThrow();
    });

    it('works with a catch-all region and no onChange', async () => {
      const el = document.createElement('projection-plain-host') as ProjectionPlainHost;
      el.innerHTML = 'text<em>x</em>';
      document.body.appendChild(el);
      await settle(el);
      expect(el.querySelector(':scope > .body')!.innerHTML).toBe('text<em>x</em>');
      el.appendChild(document.createElement('hr'));
      await settle(el);
      expect(el.querySelector(':scope > .body > hr')).not.toBeNull();
    });
  });
});
