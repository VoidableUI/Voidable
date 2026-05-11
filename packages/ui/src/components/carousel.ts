import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { VoidElement } from '../base.js';

/** Individual slide within a VoidCarousel; wraps any content for display in the carousel sequence. */
export class VoidCarouselSlide extends VoidElement {
  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'group');
    this.setAttribute('aria-roledescription', 'slide');
  }
}

if (!customElements.get('void-carousel-slide')) {
  customElements.define('void-carousel-slide', VoidCarouselSlide);
}

/** Scrollable content gallery for product photo viewers, onboarding flows, and featured content sliders. */
export class VoidCarousel extends VoidElement {
  @property({ type: Number, reflect: true }) active = 0;
  @property({ type: Boolean, reflect: true }) loop = false;
  @property({ type: Boolean, reflect: true }) autoplay = false;
  @property({ type: Number }) interval = 5000;
  @property({ type: String, reflect: true }) size: 'sm' | 'md' | 'lg' = 'md';
  @property({ type: Boolean, reflect: true }) controls = true;
  @property({ type: Boolean, reflect: true }) indicators = true;
  @property({ type: String, reflect: true }) orientation: 'horizontal' | 'vertical' = 'horizontal';

  private _slides: VoidCarouselSlide[] = [];
  private _autoplayTimer: ReturnType<typeof setInterval> | null = null;
  private _userContent: Node[] = [];
  private _didSetup = false;

  connectedCallback(): void {
    super.connectedCallback();
    if (!this._didSetup) {
      this._userContent = Array.from(this.childNodes);
    }
    this.setAttribute('role', 'region');
    this.setAttribute('aria-roledescription', 'carousel');
    this.addEventListener('mouseenter', this._onMouseEnter);
    this.addEventListener('mouseleave', this._onMouseLeave);
    this.addEventListener('keydown', this._onKeydown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopAutoplay();
    this.removeEventListener('mouseenter', this._onMouseEnter);
    this.removeEventListener('mouseleave', this._onMouseLeave);
    this.removeEventListener('keydown', this._onKeydown);
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);

    let needsRerender = false;

    if (!this._didSetup) {
      this._didSetup = true;
      const track = this.querySelector('.void-carousel-track');
      if (track) {
        for (const node of this._userContent) {
          track.appendChild(node);
        }
      }
      needsRerender = true;
    }

    this._slides = Array.from(this.querySelectorAll('void-carousel-slide')) as VoidCarouselSlide[];
    this._syncSlides();

    if (changed.has('autoplay') || changed.has('interval')) {
      this._stopAutoplay();
      if (this.autoplay) this._startAutoplay();
    }

    this.style.setProperty('--void-carousel-offset', String(this.active));

    if (needsRerender) this.requestUpdate();
  }

  private _syncSlides(): void {
    for (let i = 0; i < this._slides.length; i++) {
      const slide = this._slides[i];
      slide.setAttribute('aria-label', `Slide ${i + 1} of ${this._slides.length}`);
      if (i === this.active) {
        slide.setAttribute('active', '');
      } else {
        slide.removeAttribute('active');
      }
    }
  }

  private _goTo(index: number): void {
    const count = this._slides.length;
    if (count === 0) return;

    const previous = this.active;

    if (this.loop) {
      index = ((index % count) + count) % count;
    } else {
      index = Math.max(0, Math.min(index, count - 1));
    }

    if (index === previous) return;

    this.active = index;
    this.requestUpdate();

    this.dispatchEvent(new CustomEvent('void-change', {
      bubbles: true,
      composed: true,
      detail: { index: this.active, previous },
    }));
  }

  private _prev = (): void => {
    this._goTo(this.active - 1);
  };

  private _next = (): void => {
    this._goTo(this.active + 1);
  };

  private _goToSlide(index: number): void {
    this._goTo(index);
  }

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
    const isHorizontal = this.orientation === 'horizontal';
    const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';
    const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';

    if (e.key === prevKey) {
      e.preventDefault();
      this._prev();
    } else if (e.key === nextKey) {
      e.preventDefault();
      this._next();
    }
  };

  render() {
    const count = this._slides.length;
    const atStart = !this.loop && this.active === 0;
    const atEnd = !this.loop && this.active === count - 1;

    return html`
      <div class="void-carousel-viewport">
        <div class="void-carousel-track" aria-live="polite"></div>
      </div>
      ${this.controls ? html`
        <button
          class="void-carousel-prev"
          aria-label="Previous slide"
          ?disabled=${atStart}
          @click=${this._prev}
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 4L6 8l4 4" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button
          class="void-carousel-next"
          aria-label="Next slide"
          ?disabled=${atEnd}
          @click=${this._next}
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="var(--void-icon-stroke-width)" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      ` : ''}
      ${this.indicators ? html`
        <div class="void-carousel-indicators" role="tablist" aria-label="Slide indicators">
          ${this._slides.map((_, i) => html`
            <button
              class="void-carousel-dot"
              role="tab"
              aria-selected=${i === this.active ? 'true' : 'false'}
              aria-label="Go to slide ${i + 1}"
              ?active=${i === this.active}
              @click=${() => this._goToSlide(i)}
            ></button>
          `)}
        </div>
      ` : ''}
    `;
  }
}

if (!customElements.get('void-carousel')) {
  customElements.define('void-carousel', VoidCarousel);
}

declare global {
  interface HTMLElementTagNameMap {
    'void-carousel-slide': VoidCarouselSlide;
    'void-carousel': VoidCarousel;
  }
}
