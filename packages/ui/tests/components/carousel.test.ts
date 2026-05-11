// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VoidElement } from '../../src/base.js';
import { VoidCarousel, VoidCarouselSlide } from '../../src/components/carousel.js';

if (!customElements.get('void-carousel-slide')) {
  customElements.define('void-carousel-slide', VoidCarouselSlide);
}
if (!customElements.get('void-carousel')) {
  customElements.define('void-carousel', VoidCarousel);
}

function createCarousel(slideCount: number, opts: Partial<{ active: number; loop: boolean; controls: boolean; indicators: boolean; orientation: string }> = {}): VoidCarousel {
  const el = document.createElement('void-carousel') as VoidCarousel;
  if (opts.active !== undefined) el.active = opts.active;
  if (opts.loop !== undefined) el.loop = opts.loop;
  if (opts.controls !== undefined) el.controls = opts.controls;
  if (opts.indicators !== undefined) el.indicators = opts.indicators;
  if (opts.orientation) el.orientation = opts.orientation as 'horizontal' | 'vertical';
  for (let i = 0; i < slideCount; i++) {
    const slide = document.createElement('void-carousel-slide') as VoidCarouselSlide;
    slide.textContent = `Slide ${i + 1}`;
    el.appendChild(slide);
  }
  return el;
}

async function mount(el: VoidCarousel, parent: HTMLElement): Promise<void> {
  parent.appendChild(el);
  await el.updateComplete;
  // Second cycle needed because first render triggers child setup + re-render
  await el.updateComplete;
}

describe('VoidCarouselSlide', () => {
  it('extends VoidElement', () => {
    expect(Object.getPrototypeOf(VoidCarouselSlide)).toBe(VoidElement);
  });

  it('is registered as void-carousel-slide', () => {
    expect(customElements.get('void-carousel-slide')).toBe(VoidCarouselSlide);
  });

  it('sets role="group" on connect', async () => {
    const el = document.createElement('void-carousel-slide') as VoidCarouselSlide;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('group');
    document.body.removeChild(el);
  });

  it('sets aria-roledescription="slide" on connect', async () => {
    const el = document.createElement('void-carousel-slide') as VoidCarouselSlide;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.getAttribute('aria-roledescription')).toBe('slide');
    document.body.removeChild(el);
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
    it('active defaults to 0', () => {
      const el = document.createElement('void-carousel') as VoidCarousel;
      expect(el.active).toBe(0);
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

    it('controls defaults to true', () => {
      const el = document.createElement('void-carousel') as VoidCarousel;
      expect(el.controls).toBe(true);
    });

    it('indicators defaults to true', () => {
      const el = document.createElement('void-carousel') as VoidCarousel;
      expect(el.indicators).toBe(true);
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

  describe('rendering', () => {
    let el: VoidCarousel;

    beforeEach(async () => {
      el = createCarousel(3);
      await mount(el, container);
    });

    it('renders .void-carousel-viewport', () => {
      expect(el.querySelector('.void-carousel-viewport')).not.toBeNull();
    });

    it('renders .void-carousel-track', () => {
      expect(el.querySelector('.void-carousel-track')).not.toBeNull();
    });

    it('renders prev and next buttons by default', () => {
      expect(el.querySelector('.void-carousel-prev')).not.toBeNull();
      expect(el.querySelector('.void-carousel-next')).not.toBeNull();
    });

    it('renders dot indicators by default', () => {
      const dots = el.querySelectorAll('.void-carousel-dot');
      expect(dots.length).toBe(3);
    });

    it('moves slides into the track', () => {
      const track = el.querySelector('.void-carousel-track');
      const slides = track?.querySelectorAll('void-carousel-slide');
      expect(slides?.length).toBe(3);
    });
  });

  describe('controls hidden', () => {
    it('does not render prev/next buttons when controls=false', async () => {
      const el = createCarousel(3, { controls: false });
      await mount(el, container);
      expect(el.querySelector('.void-carousel-prev')).toBeNull();
      expect(el.querySelector('.void-carousel-next')).toBeNull();
    });
  });

  describe('indicators hidden', () => {
    it('does not render dots when indicators=false', async () => {
      const el = createCarousel(3, { indicators: false });
      await mount(el, container);
      expect(el.querySelector('.void-carousel-indicators')).toBeNull();
    });
  });

  describe('slide activation', () => {
    let el: VoidCarousel;

    beforeEach(async () => {
      el = createCarousel(3);
      await mount(el, container);
    });

    it('first slide has active attribute by default', () => {
      const slides = el.querySelectorAll('void-carousel-slide');
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
      const next = el.querySelector('.void-carousel-next') as HTMLButtonElement;
      next.click();
      await el.updateComplete;
      expect(el.active).toBe(1);
    });

    it('clicking prev goes to previous slide', async () => {
      el.active = 2;
      await el.updateComplete;
      const prev = el.querySelector('.void-carousel-prev') as HTMLButtonElement;
      prev.click();
      await el.updateComplete;
      expect(el.active).toBe(1);
    });

    it('prev is disabled at start without loop', async () => {
      const prev = el.querySelector('.void-carousel-prev') as HTMLButtonElement;
      expect(prev.disabled).toBe(true);
    });

    it('next is disabled at end without loop', async () => {
      el.active = 2;
      await el.updateComplete;
      const next = el.querySelector('.void-carousel-next') as HTMLButtonElement;
      expect(next.disabled).toBe(true);
    });
  });

  describe('loop behavior', () => {
    let el: VoidCarousel;

    beforeEach(async () => {
      el = createCarousel(3, { loop: true });
      await mount(el, container);
    });

    it('wraps from last to first on next', async () => {
      el.active = 2;
      await el.updateComplete;
      const next = el.querySelector('.void-carousel-next') as HTMLButtonElement;
      next.click();
      await el.updateComplete;
      expect(el.active).toBe(0);
    });

    it('wraps from first to last on prev', async () => {
      const prev = el.querySelector('.void-carousel-prev') as HTMLButtonElement;
      prev.click();
      await el.updateComplete;
      expect(el.active).toBe(2);
    });

    it('prev is not disabled at start with loop', () => {
      const prev = el.querySelector('.void-carousel-prev') as HTMLButtonElement;
      expect(prev.disabled).toBe(false);
    });

    it('next is not disabled at end with loop', async () => {
      el.active = 2;
      await el.updateComplete;
      const next = el.querySelector('.void-carousel-next') as HTMLButtonElement;
      expect(next.disabled).toBe(false);
    });
  });

  describe('dot indicators', () => {
    let el: VoidCarousel;

    beforeEach(async () => {
      el = createCarousel(3);
      await mount(el, container);
    });

    it('active dot has aria-selected="true"', () => {
      const dots = el.querySelectorAll('.void-carousel-dot');
      expect(dots[0].getAttribute('aria-selected')).toBe('true');
      expect(dots[1].getAttribute('aria-selected')).toBe('false');
    });

    it('clicking a dot navigates to that slide', async () => {
      const dots = el.querySelectorAll('.void-carousel-dot');
      (dots[2] as HTMLElement).click();
      await el.updateComplete;
      expect(el.active).toBe(2);
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
      const next = el.querySelector('.void-carousel-next') as HTMLButtonElement;
      next.click();
      await el.updateComplete;
      expect(fired).toBe(true);
    });

    it('void-change detail contains index and previous', async () => {
      let detail: { index: number; previous: number } | null = null;
      el.addEventListener('void-change', (e) => { detail = (e as CustomEvent).detail; });
      const next = el.querySelector('.void-carousel-next') as HTMLButtonElement;
      next.click();
      await el.updateComplete;
      expect(detail?.index).toBe(1);
      expect(detail?.previous).toBe(0);
    });

    it('void-change bubbles', async () => {
      let firedOnParent = false;
      container.addEventListener('void-change', () => { firedOnParent = true; }, { once: true });
      const next = el.querySelector('.void-carousel-next') as HTMLButtonElement;
      next.click();
      await el.updateComplete;
      expect(firedOnParent).toBe(true);
    });

    it('does not dispatch when already at boundary without loop', async () => {
      let fired = false;
      el.addEventListener('void-change', () => { fired = true; });
      // active is 0, prev should not fire
      const prev = el.querySelector('.void-carousel-prev') as HTMLButtonElement;
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
      expect(el.active).toBe(1);
    });

    it('ArrowLeft goes back in horizontal mode', async () => {
      el.active = 1;
      await el.updateComplete;
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await el.updateComplete;
      expect(el.active).toBe(0);
    });

    it('ArrowDown advances in vertical mode', async () => {
      el.orientation = 'vertical';
      await el.updateComplete;
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await el.updateComplete;
      expect(el.active).toBe(1);
    });

    it('ArrowUp goes back in vertical mode', async () => {
      el.orientation = 'vertical';
      el.active = 1;
      await el.updateComplete;
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      await el.updateComplete;
      expect(el.active).toBe(0);
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
      expect(el.active).toBe(1);
    });

    it('pauses on mouseenter', async () => {
      const el = createCarousel(3, { loop: true });
      el.autoplay = true;
      el.interval = 1000;
      await mount(el, container);
      el.dispatchEvent(new MouseEvent('mouseenter'));
      vi.advanceTimersByTime(2000);
      await el.updateComplete;
      expect(el.active).toBe(0);
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
      expect(el.active).toBe(1);
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
