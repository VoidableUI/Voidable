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

The CDN versions the gem pins live in one place:
`Voidable::Hotwire::Versions` (`lib/voidable/hotwire/versions.rb`).

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

## License

MIT
