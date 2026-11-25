# voidable-hotwire

Rails integration for [Voidable UI](https://voidable.dev) web components with Hotwire (Stimulus + Turbo).

## Installation

Add to your Gemfile:

    gem "voidable-hotwire"

Run:

    bundle install

## Setup

### With importmap-rails

The gem automatically pins `@voidable/ui` and `@voidable/ui-hotwire` to your importmap.

Start the Turbo morph integration in your `application.js`. No Stimulus
controller is needed: Stimulus handles Voidable's custom events natively via
`data-action`.

```js
import { VoidTurbo } from "@voidable/ui-hotwire"
import "@voidable/ui"

VoidTurbo.start()
```

The gem pins `@voidable/ui`, `@voidable/ui-hotwire` and `@voidable/theme`
from the CDN at the gem's own version: every Voidable package is released
together under one version number, so `voidable-hotwire` 0.8.0 pins the 0.8.0
npm packages (`Voidable::Hotwire::CDN`, derived from `Voidable::Hotwire::VERSION`).
Installed from a git checkout or a path, where the version is the unreleased
placeholder 0.0.0, it pins the latest published packages instead.

To load components on demand instead, run `rails generate voidable:install --components=autoloader`,
or pin the autoloader yourself. It imports each component from a file beside it, so it is
pinned as the raw `dist` file with Lit's entry points pinned next to it
(`Voidable::Hotwire::CDN::AUTOLOADER_PINS` holds the four pins):

```ruby
Voidable::Hotwire::CDN::AUTOLOADER_PINS.each { |name, url| pin name, to: url }
```

```js
import "@voidable/ui/autoloader"
```

Prefer the full `@voidable/ui` import when most pages use most components; see
[Loading components](https://voidable.dev/getting-started/loading/).

### With jsbundling-rails

Install the npm packages:

    yarn add @voidable/ui @voidable/ui-hotwire

### Theming

Voidable components are devoid of style by design. You must provide a theme. The default theme is available via `@voidable/theme`:

    @import "@voidable/theme";

Or use a custom theme — any CSS that sets the `--void-*` custom properties will work. See [Theming](https://voidable.dev/getting-started/theming/) for details.

## View helpers

Use `void_attrs` to generate the Stimulus `data-action` attribute (or write
`data-action="void-click->form#submit"` by hand):

```erb
<%= tag.void_button "Save", variant: "filled",
      **void_attrs("void-click", "form#submit") %>

<%= tag.void_input placeholder: "Search...",
      **void_attrs("void-change", "search#filter") %>
```

## Development warnings

In the development environment the gem loads `@voidable/ui/dev`, so misused `<void-*>` markup (a wrong attribute, a value outside the allowed set, a child in the wrong parent) is reported in the browser console, including markup your views and Turbo Streams render at runtime. The install generator pins it for development only and adds `<%= voidable_dev_tags %>` after `javascript_importmap_tags` in the layouts it writes (Vite apps get `if (import.meta.env.DEV) import("@voidable/ui/dev")` in `application.js`); add the helper by hand to a layout you already have. It renders nothing in other environments.

```ruby
# config/initializers/voidable.rb
Voidable::Hotwire.dev_warnings = false   # off everywhere
Voidable::Hotwire.dev_warnings = true    # on, even outside development
Voidable::Hotwire.dev_warnings = :throw  # thrown errors, for system tests
```

## License

MIT
