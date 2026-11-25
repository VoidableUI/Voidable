# Voidable UI for Phoenix LiveView

Two packages work together:

- **Hex** `live_voidable` (`hex/`): HEEx function components that render the
  `<void-*>` custom elements (`use VoidableUI`).
- **npm** `@voidable/ui-liveview` (`src/`): `VoidHooks` (bridges Voidable
  custom events to `pushEvent`) and `VoidDOM` (keeps client state across
  LiveView patches).

Load `@voidable/ui` and a theme such as `@voidable/theme` in your asset
pipeline as usual; the components have no styling without a theme. To load each
component only when its tag first appears (in the page or in a LiveView patch),
import `@voidable/ui/autoloader` instead of `@voidable/ui`; see
[Loading components](https://voidable.dev/getting-started/loading/).

## Setup

```js
import { Socket } from "phoenix";
import { LiveSocket } from "phoenix_live_view";
import { VoidHooks, VoidDOM } from "@voidable/ui-liveview";

const liveSocket = new LiveSocket("/live", Socket, {
  hooks: { ...VoidHooks },
  dom: VoidDOM, // onBeforeElUpdated + onNodeAdded
});
```

If you use esbuild without `node_modules`, import the source directly (the demo
does: `import {VoidHooks, VoidDOM} from "../../../src/index.ts"`).

## Events

Interactive components render `phx-hook="VoidEvent"` and `data-void-events`.
Each listed event is pushed to the server as a LiveView event of the same name:

```elixir
def handle_event("void-change", %{"id" => id, "name" => name, "detail" => detail}, socket) do
  ...
end
```

The payload is `%{"id", "name", "event", "detail"}`; the fields of `detail`
(for example `"value"`) are also available at the top level. Set `phx-target`
on the component (a `@myself` cid or a selector) to route the event to a
LiveComponent.

## State across patches

`VoidDOM` keeps client-managed attributes (`open`, `checked`, `selected`,
`aria-*`) only while the server keeps rendering the same value it rendered
last time. When the server renders a different value, the server wins, so
`open={false}` really closes a dialog the client opened.

## Ids and `phx-update="ignore"`

Components that need an id derive a stable one from their kind, `name` and
`phx-*` attributes; pass `id` explicitly for several identical anonymous
components. `phx-update="ignore"` protects the children Voidable components
relocate, but also blocks all server attribute updates, so it is opt-in per
element. See the `VoidableUI.Components` moduledoc for guidance.

## `closable={false}`

`dialog` and `drawer` render `closable="false"`, which the core components
read as false (any other value, or no attribute, means true).
