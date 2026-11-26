// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidCarousel, VoidCarouselPrevious, VoidCarouselNext } from '../../src/components/carousel.js';

type Opts = Partial<{ active: number; loop: boolean; controls: boolean; indicators: boolean; orientation: string }>;

/** A carousel written with its parts; `controls` and `indicators` default to present, as in the usual markup. */
function createCarousel(slideCount: number, opts: Opts = {}): VoidCarousel {
  const el = document.createElement('void-carousel') as VoidCarousel;
  if (opts.active !== undefined) el.index = opts.active;
  if (opts.loop !== undefined) el.loop = opts.loop;
  if (opts.orientation) el.orientation = opts.orientation as 'horizontal' | 'vertical';
  const content = document.createElement('void-carousel-content');
  for (let i = 0; i < slideCount; i++) {
    const slide = document.createElement('void-carousel-item');
    slide.textContent = `Slide ${i + 1}`;
    content.appendChild(slide);
  }
  el.appendChild(content);
  if (opts.controls !== false) {
    const prev = document.createElement('void-carousel-previous');
    prev.setAttribute('aria-label', 'Previous slide');
    const next = document.createElement('void-carousel-next');
    next.setAttribute('aria-label', 'Next slide');
    el.append(prev, next);
  }
  if (opts.indicators !== false) el.appendChild(document.createElement('void-carousel-indicators'));
  return el;
}

async function mount(el: VoidCarousel, parent: HTMLElement): Promise<void> {
  parent.appendChild(el);
  await el.updateComplete;
  await el.updateComplete;
}

const prevOf = (el: Element) => el.querySelector('void-carousel-previous') as VoidCarouselPrevious;
const nextOf = (el: Element) => el.querySelector('void-carousel-next') as VoidCarouselNext;

describe('VoidCarouselPrevious and VoidCarouselNext', () => {
  it('extend VoidElement and are registered', () => {
    expect(Object.getPrototypeOf(VoidCarouselPrevious)).toBe(VoidElement);
    expect(Object.getPrototypeOf(VoidCarouselNext)).toBe(VoidElement);
    expect(customElements.get('void-carousel-previous')).toBe(VoidCarouselPrevious);
    expect(customElements.get('void-carousel-next')).toBe(VoidCarouselNext);
  });

  it('are buttons: role and tab stop', async () => {
    const el = document.createElement('void-carousel-next') as VoidCarouselNext;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('button');
    expect(el.getAttribute('tabindex')).toBe('0');
    el.remove();
  });

  it('turn Enter into one click and Space (on keyup) into one click, and do nothing when disabled', async () => {
    const el = document.createElement('void-carousel-next') as VoidCarouselNext;
    document.body.appendChild(el);
    await el.updateComplete;
    let clicks = 0;
    el.addEventListener('click', () => clicks++);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(clicks).toBe(1);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    expect(clicks).toBe(1);
    el.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true, cancelable: true }));
    expect(clicks).toBe(2);
    el.setAttribute('aria-disabled', 'true');
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(clicks).toBe(2);
    el.remove();
  });
});

describe('VoidCarousel', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('class', () => {
    it('extends VoidElement', () => {
      expect(Object.getPrototypeOf(VoidCarousel)).toBe(VoidElement);
    });

    it('is registered as void-carousel', () => {
      expect(customElements.get('void-carousel')).toBe(VoidCarousel);
    });
  });

  describe('default property values', () => {
    it('index defaults to 0', () => {
      const el = document.createElement('void-carousel') as VoidCarousel;
      expect(el.index).toBe(0);
    });

    it('loop defaults to false', () => {
      const el = document.createElement('void-carousel') as VoidCarousel;
      expect(el.loop).toBe(false);
    });

    it('autoplay defaults to false', () => {
      const el = document.createElement('void-carousel') as VoidCarousel;
      expect(el.autoplay).toBe(false);
    });

    it('interval defaults to 5000', () => {
      const el = document.createElement('void-carousel') as VoidCarousel;
      expect(el.interval).toBe(5000);
    });

    it('size defaults to "md"', () => {
      const el = document.createElement('void-carousel') as VoidCarousel;
      expect(el.size).toBe('md');
    });

    it('has no controls or indicators property: the parts present are the parts shown', () => {
      const el = document.createElement('void-carousel') as VoidCarousel;
      expect('controls' in el).toBe(false);
      expect('indicators' in el).toBe(false);
    });

    it('orientation defaults to "horizontal"', () => {
      const el = document.createElement('void-carousel') as VoidCarousel;
      expect(el.orientation).toBe('horizontal');
    });
  });

  describe('ARIA attributes', () => {
    it('sets role="region" on connect', async () => {
      const el = createCarousel(3);
      await mount(el, container);
      expect(el.getAttribute('role')).toBe('region');
    });

    it('sets aria-roledescription="carousel" on connect', async () => {
      const el = createCarousel(3);
      await mount(el, container);
      expect(el.getAttribute('aria-roledescription')).toBe('carousel');
    });
  });

  describe('parts', () => {
    let el: VoidCarousel;

    beforeEach(async () => {
      el = createCarousel(3);
      await mount(el, container);
    });

    it('renders no viewport or track and moves no node: the author elements are the DOM', () => {
      expect(el.querySelector('.void-carousel-viewport, .void-carousel-track')).toBeNull();
      expect(Array.from(el.children).map(c => c.localName)).toEqual([
        'void-carousel-content', 'void-carousel-previous', 'void-carousel-next', 'void-carousel-indicators',
      ]);
      expect(el.querySelectorAll('void-carousel-content > void-carousel-item')).toHaveLength(3);
    });

    it('makes one dot per slide inside the indicators part, as a tablist of tabs', () => {
      const indicators = el.querySelector('void-carousel-indicators')!;
      expect(indicators.getAttribute('role')).toBe('tablist');
      const dots = indicators.querySelectorAll('button');
      expect(dots).toHaveLength(3);
      expect(dots[0]!.getAttribute('role')).toBe('tab');
    });

    it('gives each slide a group role, a slide role description and a numbered label unless it has its own', async () => {
      const own = document.createElement('void-carousel-item');
      own.setAttribute('aria-label', 'Mine');
      el.querySelector('void-carousel-content')!.appendChild(own);
      await new Promise(r => setTimeout(r));
      const slides = Array.from(el.querySelectorAll('void-carousel-item'));
      expect(slides[0]!.getAttribute('role')).toBe('group');
      expect(slides[0]!.getAttribute('aria-roledescription')).toBe('slide');
      expect(slides[0]!.getAttribute('aria-label')).toBe('Slide 1 of 4');
      expect(slides[3]!.getAttribute('aria-label')).toBe('Mine');
    });
  });

  describe('controls and indicators are optional parts', () => {
    it('writes no arrows when the author wrote none', async () => {
      const el = createCarousel(3, { controls: false });
      await mount(el, container);
      expect(el.querySelector('void-carousel-previous')).toBeNull();
      expect(el.querySelector('void-carousel-next')).toBeNull();
    });

    it('writes no dots when the author wrote no indicators part', async () => {
      const el = createCarousel(3, { indicators: false });
      await mount(el, container);
      expect(el.querySelector('button')).toBeNull();
    });

    it('shows the arrows and dots of a part that arrives late', async () => {
      const el = createCarousel(3, { controls: false, indicators: false });
      await mount(el, container);
      el.appendChild(document.createElement('void-carousel-indicators'));
      await new Promise(r => setTimeout(r));
      expect(el.querySelectorAll('void-carousel-indicators > button')).toHaveLength(3);
    });

    it('makes the dots again when a morph empties the indicators', async () => {
      const el = createCarousel(3);
      await mount(el, container);
      el.querySelector('void-carousel-indicators')!.replaceChildren();
      await new Promise(r => setTimeout(r, 5));
      expect(el.querySelectorAll('void-carousel-indicators > button')).toHaveLength(3);
    });
  });

  describe('slide activation', () => {
    let el: VoidCarousel;

    beforeEach(async () => {
      el = createCarousel(3);
      await mount(el, container);
    });

    it('first slide has active attribute by default', () => {
      const slides = el.querySelectorAll('void-carousel-item');
      expect(slides[0].hasAttribute('active')).toBe(true);
      expect(slides[1].hasAttribute('active')).toBe(false);
      expect(slides[2].hasAttribute('active')).toBe(false);
    });

    it('sets --void-carousel-offset custom property', () => {
      expect(el.style.getPropertyValue('--void-carousel-offset')).toBe('0');
    });
  });

  describe('navigation via buttons', () => {
    let el: VoidCarousel;

    beforeEach(async () => {
      el = createCarousel(3);
      await mount(el, container);
    });

    it('clicking next advances to next slide', async () => {
      const next = nextOf(el);
      next.click();
      await el.updateComplete;
      expect(el.index).toBe(1);
    });

    it('clicking prev goes to previous slide', async () => {
      el.index = 2;
      await el.updateComplete;
      const prev = prevOf(el);
      prev.click();
      await el.updateComplete;
      expect(el.index).toBe(1);
    });

    it('prev is disabled at start without loop', async () => {
      const prev = prevOf(el);
      expect(prev.getAttribute('aria-disabled')).toBe('true');
      expect(prev.getAttribute('aria-disabled')).toBe('true');
    });

    it('next is disabled at end without loop', async () => {
      el.index = 2;
      await el.updateComplete;
      const next = nextOf(el);
      expect(next.getAttribute('aria-disabled')).toBe('true');
    });

    it('a disabled arrow does nothing when clicked', async () => {
      prevOf(el).click();
      await el.updateComplete;
      expect(el.index).toBe(0);
    });
  });

  describe('loop behavior', () => {
    let el: VoidCarousel;

    beforeEach(async () => {
      el = createCarousel(3, { loop: true });
      await mount(el, container);
    });

    it('wraps from last to first on next', async () => {
      el.index = 2;
      await el.updateComplete;
      const next = nextOf(el);
      next.click();
      await el.updateComplete;
      expect(el.index).toBe(0);
    });

    it('wraps from first to last on prev', async () => {
      const prev = prevOf(el);
      prev.click();
      await el.updateComplete;
      expect(el.index).toBe(2);
    });

    it('prev is not disabled at start with loop', () => {
      const prev = prevOf(el);
      expect(prev.hasAttribute('aria-disabled')).toBe(false);
    });

    it('next is not disabled at end with loop', async () => {
      el.index = 2;
      await el.updateComplete;
      const next = nextOf(el);
      expect(next.hasAttribute('aria-disabled')).toBe(false);
    });
  });

  describe('dot indicators', () => {
    let el: VoidCarousel;

    beforeEach(async () => {
      el = createCarousel(3);
      await mount(el, container);
    });

    it('active dot has aria-selected="true"', () => {
      const dots = el.querySelectorAll('void-carousel-indicators > button');
      expect(dots[0].getAttribute('aria-selected')).toBe('true');
      expect(dots[1].getAttribute('aria-selected')).toBe('false');
    });

    it('clicking a dot navigates to that slide', async () => {
      const dots = el.querySelectorAll('void-carousel-indicators > button');
      (dots[2] as HTMLElement).click();
      await el.updateComplete;
      expect(el.index).toBe(2);
    });
  });

  describe('void-change event', () => {
    let el: VoidCarousel;

    beforeEach(async () => {
      el = createCarousel(3);
      await mount(el, container);
    });

    it('dispatches void-change on navigation', async () => {
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      const next = nextOf(el);
      next.click();
      await el.updateComplete;
      expect(fired).toBe(true);
    });

    it('void-change detail contains index and previous', async () => {
      let detail: { index: number; previous: number } | null = null;
      el.addEventListener('void-change', (e) => { detail = (e as CustomEvent).detail; });
      const next = nextOf(el);
      next.click();
      await el.updateComplete;
      expect(detail?.index).toBe(1);
      expect(detail?.previous).toBe(0);
    });

    it('void-change bubbles', async () => {
      let firedOnParent = false;
      container.addEventListener('void-change', () => { firedOnParent = true; }, { once: true });
      const next = nextOf(el);
      next.click();
      await el.updateComplete;
      expect(firedOnParent).toBe(true);
    });

    it('does not dispatch when already at boundary without loop', async () => {
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      // active is 0, prev should not fire
      const prev = prevOf(el);
      prev.click();
      await el.updateComplete;
      expect(fired).toBe(false);
    });
  });

  describe('keyboard navigation', () => {
    let el: VoidCarousel;

    beforeEach(async () => {
      el = createCarousel(3, { loop: true });
      await mount(el, container);
    });

    it('ArrowRight advances in horizontal mode', async () => {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await el.updateComplete;
      expect(el.index).toBe(1);
    });

    it('ArrowLeft goes back in horizontal mode', async () => {
      el.index = 1;
      await el.updateComplete;
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await el.updateComplete;
      expect(el.index).toBe(0);
    });

    it('ArrowDown advances in vertical mode', async () => {
      el.orientation = 'vertical';
      await el.updateComplete;
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await el.updateComplete;
      expect(el.index).toBe(1);
    });

    it('ArrowUp goes back in vertical mode', async () => {
      el.orientation = 'vertical';
      el.index = 1;
      await el.updateComplete;
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      await el.updateComplete;
      expect(el.index).toBe(0);
    });
  });

  describe('autoplay', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('advances slides automatically when autoplay is true', async () => {
      const el = createCarousel(3, { loop: true });
      el.autoplay = true;
      el.interval = 1000;
      await mount(el, container);
      vi.advanceTimersByTime(1000);
      await el.updateComplete;
      expect(el.index).toBe(1);
    });

    it('pauses on mouseenter', async () => {
      const el = createCarousel(3, { loop: true });
      el.autoplay = true;
      el.interval = 1000;
      await mount(el, container);
      el.dispatchEvent(new MouseEvent('mouseenter'));
      vi.advanceTimersByTime(2000);
      await el.updateComplete;
      expect(el.index).toBe(0);
    });

    it('resumes on mouseleave', async () => {
      const el = createCarousel(3, { loop: true });
      el.autoplay = true;
      el.interval = 1000;
      await mount(el, container);
      el.dispatchEvent(new MouseEvent('mouseenter'));
      vi.advanceTimersByTime(2000);
      el.dispatchEvent(new MouseEvent('mouseleave'));
      vi.advanceTimersByTime(1000);
      await el.updateComplete;
      expect(el.index).toBe(1);
    });
  });

  describe('size reflection', () => {
    it('reflects size attribute', async () => {
      const el = document.createElement('void-carousel') as VoidCarousel;
      container.appendChild(el);
      el.size = 'lg';
      await el.updateComplete;
      expect(el.getAttribute('size')).toBe('lg');
    });
  });

  describe('orientation reflection', () => {
    it('reflects orientation attribute', async () => {
      const el = document.createElement('void-carousel') as VoidCarousel;
      container.appendChild(el);
      el.orientation = 'vertical';
      await el.updateComplete;
      expect(el.getAttribute('orientation')).toBe('vertical');
    });
  });
});
