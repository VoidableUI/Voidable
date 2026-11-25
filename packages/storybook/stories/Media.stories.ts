import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import '@voidable/ui';
import '@voidable/theme';

// UI over imagery: void-media is a media surface (an image that fills its
// box with content laid over it), void-media-content draws the scrim behind
// the content, and void-glass is a translucent panel. All three are CSS
// only. The photographs are NASA images served from docs/public/media (see
// CREDITS.txt there).
//
// Line comments only in this file: lint:manifest strips block comments with
// a pattern that pairs across files.
const meta: Meta = {
  title: 'Patterns/UI over imagery',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Text and controls over a photograph. The default scrim keeps body text at 4.5:1 over any image, including a white one; lint:contrast checks that for every theme. Photographs: NASA.',
      },
    },
  },
  // Kept by hand on purpose: void-media is a CSS pattern (packages/theme/src/media), not a
  // registered element, so the Custom Elements Manifest does not describe its options.
  argTypes: {
    image: { control: { type: 'select' }, options: ['limb', 'sunrise', 'storm', 'aleutians', 'ice', 'city'] },
    place: { control: { type: 'select' }, options: ['bottom', 'top', 'start', 'end', 'center'] },
    height: { control: { type: 'select' }, options: ['sm', 'md', 'lg', 'screen'] },
    scrim: { control: { type: 'select' }, options: ['gradient', 'flat', 'none'] },
    strength: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
  },
  args: { image: 'limb', place: 'bottom', height: 'lg', scrim: 'gradient', strength: 0 },
};

export default meta;
type Story = StoryObj;

// The default: a band of content along the bottom of the image.
export const Hero: Story = {
  render: (args) => html`
    <void-media place=${args.place} height=${args.height} scrim=${args.scrim} style="--void-scrim-strength: ${args.strength}">
      <img src="media/${args.image}.jpg" alt="" />
      <void-media-content>
        <span data-void-type="label">Meridian ground network</span>
        <h1>Every pass, on one screen</h1>
        <p>Schedule, track and downlink across forty-four stations. Text here is off-white in both colour schemes and sits on a scrim.</p>
        <void-actions>
          <void-button variant="filled" size="lg">Get started</void-button>
          <void-button size="lg">Read the docs</void-button>
          <void-button variant="ghost" size="lg">Watch a pass</void-button>
        </void-actions>
      </void-media-content>
    </void-media>
  `,
};

// The worst case the scrim is designed for: a bright image (ice and cloud).
export const OverABrightImage: Story = {
  args: { image: 'ice' },
  render: Hero.render,
};

// A column on one side, the image clear on the other.
export const ContentAtTheStart: Story = {
  args: { image: 'aleutians', place: 'start' },
  render: (args) => html`
    <void-media place=${args.place} height=${args.height} scrim=${args.scrim} style="--void-scrim-strength: ${args.strength}">
      <img src="media/${args.image}.jpg" alt="" />
      <void-media-content>
        <span data-void-type="label">Request access</span>
        <h2>Bring your first station online</h2>
        <p>Fields, badges and buttons restyle themselves on the image.</p>
        <void-field label="Work email"><void-input type="email" placeholder="you@example.com"></void-input></void-field>
        <void-actions>
          <void-button variant="filled">Request access</void-button>
          <void-badge variant="outline" color="success">Free for one station</void-badge>
        </void-actions>
      </void-media-content>
    </void-media>
  `,
};

// Centred text sits on a soft ellipse of scrim.
export const ContentInTheCentre: Story = {
  args: { image: 'storm', place: 'center', height: 'md' },
  render: (args) => html`
    <void-media place=${args.place} height=${args.height} scrim=${args.scrim} style="--void-scrim-strength: ${args.strength}">
      <img src="media/${args.image}.jpg" alt="" />
      <void-media-content>
        <h2>Weather hold in the South Pacific</h2>
        <p>Three stations paused until 16:40 UTC.</p>
        <void-actions justify="center"><void-button>See affected passes</void-button></void-actions>
      </void-media-content>
    </void-media>
  `,
};

// Glass: a translucent, blurred panel in the page's own colour scheme. It
// is solid where backdrop-filter is unavailable or reduced transparency is
// requested. Switch the colour scheme in the toolbar: the panel follows,
// the text on the image does not.
export const GlassPanel: Story = {
  args: { image: 'sunrise', place: 'bottom' },
  render: (args) => html`
    <void-media place=${args.place} height=${args.height} scrim=${args.scrim} style="--void-scrim-strength: ${args.strength}; --void-media-focal: 50% 36%">
      <img src="media/${args.image}.jpg" alt="" />
      <void-media-content>
        <void-split valign="end">
          <void-stack>
            <span data-void-type="label">Pass MRD-0412</span>
            <h1>Svalbard 1 is tracking</h1>
            <p>Acquisition of signal at 14:02 UTC. Nine minutes forty seconds above the horizon.</p>
          </void-stack>
          <void-glass>
            <void-stack>
              <void-section-head>
                <h2>Link</h2>
                <void-badge variant="outline" color="success">Locked</void-badge>
              </void-section-head>
              <void-description-list>
                <dl>
                  <div><dt>Signal</dt><dd>−84.2 dBm</dd></div>
                  <div><dt>Rate</dt><dd>312 Mbit/s</dd></div>
                  <div><dt>Elevation</dt><dd>41.6°</dd></div>
                </dl>
              </void-description-list>
              <void-progress value="38" size="sm" aria-label="Pass progress, 38%"></void-progress>
              <void-actions justify="end">
                <void-button variant="ghost" size="sm">Details</void-button>
                <void-button variant="filled" size="sm">Open pass</void-button>
              </void-actions>
            </void-stack>
          </void-glass>
        </void-split>
      </void-media-content>
    </void-media>
  `,
};

// stack: below 48rem the image sits on top and the content under it, so a
// long headline never covers a small image. Narrow the viewport to see it.
export const StackedOnNarrowScreens: Story = {
  args: { image: 'city', height: 'md' },
  render: (args) => html`
    <void-media stack place=${args.place} height=${args.height} style="--void-scrim-strength: ${args.strength}">
      <img src="media/${args.image}.jpg" alt="" />
      <void-media-content>
        <h1>Coverage where your users are</h1>
        <p>On a narrow screen this text moves under the photograph.</p>
        <void-actions><void-button variant="filled">See the map</void-button></void-actions>
      </void-media-content>
    </void-media>
  `,
};

// A fixed shape instead of a height, for a card or a tile. On a small
// surface the fade is shortened so the scrim does not cover the picture.
export const AsATile: Story = {
  render: () => html`
    <void-page>
      <void-split>
        <void-media ratio="16:9" style="border-radius: var(--void-radius-xl)">
          <img src="media/aleutians.jpg" alt="" />
          <void-media-content style="--void-media-inset: var(--void-gap-inside); --void-scrim-fade: 3rem">
            <h3>Aleutian relay</h3>
            <void-state color="success">Online</void-state>
          </void-media-content>
        </void-media>
        <void-media ratio="16:9" style="border-radius: var(--void-radius-xl)">
          <img src="media/ice.jpg" alt="" />
          <void-media-content style="--void-media-inset: var(--void-gap-inside); --void-scrim-fade: 3rem">
            <h3>Thurston Island</h3>
            <void-state color="warning">Degraded</void-state>
          </void-media-content>
        </void-media>
      </void-split>
    </void-page>
  `,
};
