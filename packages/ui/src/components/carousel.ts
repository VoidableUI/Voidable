import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';
import { actionFor } from '../keyboard.js';
import { KeyboardActivation } from '../keyboard-activation.js';
import { keysConverter, type KeyOverrides } from '../keys.js';
import { activateKeys } from '../keymaps/activation.js';
import { carouselKeys, carouselVerticalKeys } from '../keymaps/carousel.js';
import { PartsController } from '../parts.js';
import { msg } from '../messages.js';

/**
 * Previous-slide control of a `<void-carousel>`: a button the theme draws as an arrow over the slides. Write it
 * as an empty element with an `aria-label` ("Previous slide"); any content you put inside replaces the arrow.
 * It is aria-disabled on the first slide unless the carousel has `loop`.
 */
export class VoidCarouselPrevious extends VoidElement {
  /** Key bindings for this element's actions, as JSON (`{"activate":["Enter"]}`); `[]` switches an action off. See the keyboard guide. */
  @property({ attribute: 'keys', converter: keysConverter }) keys: KeyOverrides | null = null;
  /** @internal The actions of this element and their default keys. */
  static readonly keyMap = activateKeys;

  /** Enter and Space fire a real `click`, as on a native button. */
  protected readonly _activation = new KeyboardActivation(this, {
    disabled: () => this.getAttribute('aria-disabled') === 'true',
  });

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'button');
    this.setHostAttribute('tabindex', '0');
  }
}

if (!customElements.get('void-carousel-previous')) {
  customElements.define('void-carousel-previous', VoidCarouselPrevious);
}

/**
 * Next-slide control of a `<void-carousel>`: a button the theme draws as an arrow over the slides. Write it as an
 * empty element with an `aria-label` ("Next slide"); any content you put inside replaces the arrow. It is
 * aria-disabled on the last slide unless the carousel has `loop`.
 */
export class VoidCarouselNext extends VoidElement {
  /** Key bindings for this element's actions, as JSON (`{"activate":["Enter"]}`); `[]` switches an action off. See the keyboard guide. */
  @property({ attribute: 'keys', converter: keysConverter }) keys: KeyOverrides | null = null;
  /** @internal The actions of this element and their default keys. */
  static readonly keyMap = activateKeys;

  /** Enter and Space fire a real `click`, as on a native button. */
  protected readonly _activation = new KeyboardActivation(this, {
    disabled: () => this.getAttribute('aria-disabled') === 'true',
  });

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'button');
    this.setHostAttribute('tabindex', '0');
  }
}

if (!customElements.get('void-carousel-next')) {
  customElements.define('void-carousel-next', VoidCarouselNext);
}

/**
 * Scrollable content gallery for product photo viewers, onboarding flows, and featured content sliders.
 *
 * Its regions are parts, in this order: the `<void-carousel-content>` holding the `<void-carousel-item>`s (the
 * slides), then the optional controls: `<void-carousel-previous>` and `<void-carousel-next>` (arrows) and
 * `<void-carousel-indicators>` (a row of dots). A control is shown when you write it and absent when you do not.
 * The component moves nothing: the content and the items are CSS-only parts the theme slides with a custom
 * property, and the dots are the only nodes it creates, inside your empty `<void-carousel-indicators>`.
 *
 * @fires {CustomEvent<{ value: number; index: number; previous: number }>} void-change - The shown slide changed;
 * `value` and `index` are both the new slide's index.
 */
export class VoidCarousel extends VoidElement {
  /** Key bindings for this element's actions, as JSON (`{"next":["ArrowRight"]}`); `[]` switches an action off. See the keyboard guide. */
  @property({ attribute: 'keys', converter: keysConverter }) keys: KeyOverrides | null = null;
  /** @internal The actions of this element and their default keys (horizontal; a vertical carousel starts with ArrowDown and ArrowUp). */
  static readonly keyMap = carouselKeys;

  /**
   * Zero-based index of the slide being shown. Set it to jump to a slide; the arrows, indicators and
   * arrow keys update it and fire `void-change`.
   */
  @property({ type: Number, reflect: true }) index = 0;
  /**
   * Wrap around: Next on the last slide goes to the first, and Previous on the first goes to the last.
   * Without it the arrows stop at the ends.
   */
  @property({ type: Boolean, reflect: true }) loop = false;
  /**
   * Advance to the next slide every `interval` milliseconds. It pauses while the pointer is over the
   * carousel.
   */
  @property({ type: Boolean, reflect: true }) autoplay = false;
  /** Milliseconds between slides when `autoplay` is on. Defaults to 5000. */
  @property({ type: Number }) interval = 5000;
  /** Size step of the carousel: `sm`, `md` (default) or `lg`. */
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  /**
   * Direction slides advance: `horizontal` (default, Left and Right arrow keys) or `vertical` (Up and
   * Down).
   */
  @property({ type: String, reflect: true }) orientation: 'horizontal' | 'vertical' = 'horizontal';

  private _autoplayTimer: ReturnType<typeof setInterval> | null = null;
  private readonly _labels = new WeakMap<Element, string>();
  /** Watches the dots, which the parts controller does not know: a morph that empties the indicators gets them back. */
  private _dots: MutationObserver | null = null;

  protected readonly _parts = new PartsController(this, {
    tags: [
      'void-carousel-content',
      'void-carousel-item',
      'void-carousel-previous',
      'void-carousel-next',
      'void-carousel-indicators',
    ],
    onChange: () => this._wire(),
  });

  /** The name this wrote on the indicators, so one the author wrote is told apart from it. */
  private _indicatorsName: string | null = null;

  /** The slides, in document order. */
  private get _slides(): HTMLElement[] {
    return this._parts.all('void-carousel-item');
  }

  /** Wires the slides, the arrows and the dots to the current slide. Idempotent. */
  private _wire(): void {
    const slides = this._slides;
    const count = slides.length;
    const content = this._parts.one('void-carousel-content');
    // APG: never a live region while the slides rotate on their own, or every change is read out unasked.
    if (content) this._parts.set(content, 'aria-live', this.autoplay ? 'off' : 'polite');
    slides.forEach((slide, i) => {
      this._parts.provide(slide, 'role', 'group');
      this._parts.provide(slide, 'aria-roledescription', 'slide');
      // The numbering follows the slides as they come and go; a label the author wrote is never replaced.
      const label = msg(this, 'carousel.slide', { index: i + 1, count });
      const current = slide.getAttribute('aria-label');
      if (current === null || current === this._labels.get(slide)) {
        this._parts.set(slide, 'aria-label', label);
        this._labels.set(slide, label);
      }
      this._parts.set(slide, 'active', i === this.index);
    });
    const atStart = !this.loop && this.index === 0;
    const atEnd = !this.loop && this.index === count - 1;
    const prev = this._parts.one('void-carousel-previous');
    const next = this._parts.one('void-carousel-next');
    if (prev) {
      this._parts.set(prev, 'aria-disabled', atStart ? 'true' : null);
    }
    if (next) {
      this._parts.set(next, 'aria-disabled', atEnd ? 'true' : null);
    }
    this._syncDots(count);
    this.setHostStyle('--void-carousel-offset', String(this.index));
  }

  /** One dot (`<button role="tab">`) per slide inside the author's empty indicators part. */
  private _syncDots(count: number): void {
    const indicators = this._parts.one('void-carousel-indicators');
    if (!indicators) return;
    this._parts.provide(indicators, 'role', 'tablist');
    const name = msg(this, 'carousel.indicators');
    const named = indicators.getAttribute('aria-label');
    if (named === null || named === this._indicatorsName) {
      this._parts.set(indicators, 'aria-label', name);
      this._indicatorsName = name;
    }
    const dots = Array.from(indicators.children).filter((c): c is HTMLButtonElement => c.localName === 'button');
    while (dots.length > count) dots.pop()!.remove();
    while (dots.length < count) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('role', 'tab');
      indicators.appendChild(dot);
      dots.push(dot);
    }
    dots.forEach((dot, i) => {
      const selected = i === this.index;
      if (dot.getAttribute('aria-selected') !== String(selected)) dot.setAttribute('aria-selected', String(selected));
      if (dot.hasAttribute('active') !== selected) dot.toggleAttribute('active', selected);
      const label = msg(this, 'carousel.goTo', { index: i + 1, count });
      if (dot.getAttribute('aria-label') !== label) dot.setAttribute('aria-label', label);
    });
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.setHostAttribute('role', 'region');
    this.setHostAttribute('aria-roledescription', 'carousel');
    this.addEventListener('mouseenter', this._onMouseEnter);
    this.addEventListener('mouseleave', this._onMouseLeave);
    this.addEventListener('keydown', this._onKeydown);
    this.addEventListener('click', this._onClick);
    this._dots ??= new MutationObserver(records => {
      if (records.some(r => (r.target as Element).localName === 'void-carousel-indicators')) this._parts.requestSync();
    });
    this._dots.observe(this, { childList: true, subtree: true });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopAutoplay();
    this.removeEventListener('mouseenter', this._onMouseEnter);
    this.removeEventListener('mouseleave', this._onMouseLeave);
    this.removeEventListener('keydown', this._onKeydown);
    this.removeEventListener('click', this._onClick);
    this._dots?.disconnect();
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    this._parts.sync();

    if (changed.has('autoplay') || changed.has('interval')) {
      this._stopAutoplay();
      if (this.autoplay) this._startAutoplay();
    }
  }

  private _goTo(index: number): void {
    const count = this._slides.length;
    if (count === 0) return;

    const previous = this.index;

    if (this.loop) {
      index = ((index % count) + count) % count;
    } else {
      index = Math.max(0, Math.min(index, count - 1));
    }

    if (index === previous) return;

    this.index = index;
    this._parts.sync();

    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: { value: this.index, index: this.index, previous },
    }));
  }

  private _prev = (): void => {
    this._goTo(this.index - 1);
  };

  private _next = (): void => {
    this._goTo(this.index + 1);
  };

  /** Clicks on this carousel's arrows and dots (delegated, so replaced controls keep working). */
  private _onClick = (e: Event): void => {
    const target = e.target as Element;
    const control = target.closest('void-carousel-previous, void-carousel-next, void-carousel-indicators > button');
    if (!control || !this._parts.owns(control)) return;
    if (control.getAttribute('aria-disabled') === 'true') return;
    if (control.localName === 'void-carousel-previous') this._prev();
    else if (control.localName === 'void-carousel-next') this._next();
    else this._goTo(Array.from(control.parentElement!.children).indexOf(control));
  };

  private _startAutoplay(): void {
    if (this._autoplayTimer) return;
    this._autoplayTimer = setInterval(() => {
      this._next();
    }, this.interval);
  }

  private _stopAutoplay(): void {
    if (this._autoplayTimer) {
      clearInterval(this._autoplayTimer);
      this._autoplayTimer = null;
    }
  }

  private _onMouseEnter = (): void => {
    if (this.autoplay) this._stopAutoplay();
  };

  private _onMouseLeave = (): void => {
    if (this.autoplay) this._startAutoplay();
  };

  private _onKeydown = (e: KeyboardEvent): void => {
    const action = actionFor(this, e, this.orientation === 'horizontal' ? carouselKeys : carouselVerticalKeys);

    if (action === 'previous') {
      e.preventDefault();
      this._prev();
    } else if (action === 'next') {
      e.preventDefault();
      this._next();
    }
  };
}

if (!customElements.get('void-carousel')) {
  customElements.define('void-carousel', VoidCarousel);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-carousel': VoidCarousel;
    'void-carousel-previous': VoidCarouselPrevious;
    'void-carousel-next': VoidCarouselNext;
  }
}
