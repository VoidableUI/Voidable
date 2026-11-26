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
  dom: VoidDOM, // onBeforeElUpdated
});
```

If you use esbuild without `node_modules`, import the source directly (the demo
does: `import {VoidHooks, VoidDOM} from "../../../src/index.ts"`).

## Development warnings

Render `VoidableUI.Dev.warnings` once in the root layout, after your app script, to have misused `<void-*>` markup (a wrong attribute, a value outside the allowed set, a child in the wrong parent) reported in the browser console, including what LiveView patches in later:

```heex
<script defer phx-track-static type="text/javascript" src={~p"/assets/app.js"}></script>
<VoidableUI.Dev.warnings />
```

It renders nothing outside the `:dev` environment. `config :live_voidable, dev_warnings: false | true | :throw` changes that.

## Events

Use LiveView's own bindings first: `phx-click` works on `button`, `tag`,
`card`, `dropdown_menu_item`, `menu_item` and a `<void-tabs-trigger>`,
and `phx-change` / `phx-submit` on the form around the controls, which all
submit under their `name`.

For a Voidable event no binding covers, opt in per element with `events`:
`events` bridges all of the component's events, `events={["void-close"]}` only
those. The component then renders `phx-hook="VoidEvent"` and
`data-void-events`; without `events` it renders neither. Each bridged event is
pushed to the server as a LiveView event of the same name, after the browser
has handled it (so a `phx-click` on the same element runs first):

```heex
<.dialog id="confirm" events={["void-close"]}><void-dialog-title>Delete?</void-dialog-title>...</.dialog>
```


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

`VoidDOM` calls each component's pre-morph hook during morphdom patches:
client state of every reflected property (`open`, `checked`, `pressed`,
`collapsed`, `value`, ...) is kept only while the server keeps rendering the
same value it rendered last time. When the server renders a different value,
the server wins, so `open={false}` really closes a dialog the client opened.
The rule lives in `@voidable/ui` and is the same for the Turbo and Livewire
adapters.

## Ids and `phx-update="ignore"`

Components that need an id derive a stable one from their kind, `name` and
`phx-*` attributes; pass `id` explicitly for several identical anonymous
components. `phx-update="ignore"` protects the children Voidable components
relocate, but also blocks all server attribute updates, so it is opt-in per
element. See the `VoidableUI.Components` moduledoc for guidance.

## Typing through patches

A patch that arrives while the user types (the echo of an earlier
`phx-change`, a few keys behind) does not rewrite the field with focus in it,
and the clone LiveView patches while it waits for a reply is put back without
losing a key: nothing typed is lost and focus stays in the field.

## Booleans

Every boolean is off when it is absent. Something drawn by default is
turned off with a `hide_*` attribute: `hide_close` on `dialog` and `drawer`,
`hide_border` on `nav_bar`, `hide_input` on `color_picker`, `hide_icon` on
`error_fallback`, and `hide_value`, `hide_tick_min` and `hide_tick_max` on
`gauge`. For example `<.error_fallback hide_icon />`.

## Native input attributes

`input`, `textarea` and `action_input` declare `autocomplete`, `minlength`
and `maxlength` (and `pattern` on the single-line inputs); `inputmode`,
`enterkeyhint`, `autocapitalize` and `spellcheck` pass through as global
attributes. `number_input` accepts `step="any"` and decimal `value`, `min`
and `max`, and `stat` takes `description`.

## For AI agents

`@voidable/ui-liveview/llms.txt` (npm) and `llms.txt` in the `live_voidable` Hex package summarise this adapter's API, including every HEEx component. Every element's parts, attributes and events are in `@voidable/ui/reference.md` (`node_modules/@voidable/ui/dist/reference.md`).
