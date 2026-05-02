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

Register the Stimulus controller and start Turbo integration in your `application.js`:

```js
import { VoidEventController } from "@voidable/ui-hotwire"
import { VoidTurbo } from "@voidable/ui-hotwire"
import "@voidable/ui"

application.register("void-event", VoidEventController)
VoidTurbo.start()
```

### With jsbundling-rails

Install the npm packages:

    yarn add @voidable/ui @voidable/ui-hotwire

### Theming

Voidable components are devoid of style by design. You must provide a theme. The default theme is available via `@voidable/theme`:

    @import "@voidable/theme";

Or use a custom theme — any CSS that sets the `--void-*` custom properties will work. See [Theming](https://voidable.dev/getting-started/theming/) for details.

## View helpers

Use `void_attrs` to generate Stimulus data attributes:

```erb
<%= tag.void_button "Save", variant: "filled",
      **void_attrs("void-click", "form#submit") %>

<%= tag.void_input placeholder: "Search...",
      **void_attrs("void-change", "search#filter") %>
```

## License

MIT
