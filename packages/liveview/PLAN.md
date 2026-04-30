# @voidable/ui-liveview Implementation Plan

## Architecture Overview

The LiveView adapter is a **dual-package** approach:
- **Hex package** (`voidable_ui`) — HEEx function components + JS hooks in `priv/static/`
- **npm side** — `@voidable/ui` and `@voidable/theme` imported via the demo app's asset pipeline

Unlike React/Vue/Solid/Svelte adapters which are thin (hooks/stores only), the LiveView adapter is thick — it bridges two runtimes (Elixir server + browser JS).

## How It Works

### 1. HEEx Function Components (Server Side)

Each Voidable web component gets a corresponding HEEx function component:

```elixir
defmodule VoidableUI.Button do
  use Phoenix.Component

  attr :variant, :string, default: "outline", values: ~w(outline filled ghost)
  attr :size, :string, default: "md", values: ~w(sm md lg xl xxl)
  attr :disabled, :boolean, default: false
  attr :rest, :global
  slot :inner_block, required: true

  def button(assigns) do
    ~H"""
    <void-button variant={@variant} size={@size} disabled={@disabled} {@rest}>
      {render_slot(@inner_block)}
    </void-button>
    """
  end
end
```

### 2. JS Hooks (Client Side)

Web components emit CustomEvents (`void-change`, `void-click`, etc.) that LiveView can't listen to natively. JS hooks bridge them:

```javascript
export const VoidHooks = {
  VoidEvent: {
    mounted() {
      const events = (this.el.dataset.voidEvents || "").split(",").filter(Boolean);
      this._listeners = [];
      for (const event of events) {
        const handler = (e) => {
          this.pushEvent(event, e.detail || {});
        };
        this.el.addEventListener(event, handler);
        this._listeners.push([event, handler]);
      }
    },
    destroyed() {
      for (const [event, handler] of this._listeners) {
        this.el.removeEventListener(event, handler);
      }
    },
  },
};
```

Usage in HEEx:
```heex
<void-button phx-hook="VoidEvent" data-void-events="void-click">
  Click me
</void-button>
```

### 3. DOM Patching Protection

LiveView's morphdom patching can clobber web component internal state. Two strategies:

**Option A: `phx-update="ignore"`** — prevents LiveView from touching the element's children after mount. Simple but prevents server-driven updates.

**Option B: `onBeforeElUpdated` callback** (Fluxon pattern) — intercepts DOM patches to preserve client state:

```javascript
export const VoidDOM = {
  onBeforeElUpdated(fromEl, toEl) {
    // Preserve void-* custom element internal state during morphdom patches
    if (fromEl.tagName.startsWith("VOID-")) {
      // Copy client-managed attributes back to the incoming element
      for (const attr of ["aria-expanded", "aria-selected"]) {
        if (fromEl.hasAttribute(attr)) {
          toEl.setAttribute(attr, fromEl.getAttribute(attr));
        }
      }
    }
  },
};
```

### 4. Consumer Setup

```javascript
// app.js
import { VoidHooks, VoidDOM } from "voidable-ui-liveview";
import "@voidable/ui";
import "@voidable/theme";

const liveSocket = new LiveSocket("/live", Socket, {
  hooks: { ...colocatedHooks, ...VoidHooks },
  dom: {
    onBeforeElUpdated(from, to) {
      VoidDOM.onBeforeElUpdated(from, to);
    },
  },
});
```

## Package Structure

```
packages/liveview/
├── package.json          # npm: @voidable/ui-liveview (JS hooks)
├── src/
│   ├── index.ts          # Exports VoidHooks, VoidDOM
│   ├── hooks.ts          # LiveView JS hooks
│   └── dom.ts            # DOM patching callbacks
├── hex/                  # Hex package: voidable_ui
│   ├── mix.exs
│   ├── lib/
│   │   ├── voidable_ui.ex          # Main module
│   │   └── components/
│   │       ├── button.ex
│   │       ├── badge.ex
│   │       └── ... (all 43 components)
│   └── priv/
│       └── static/
│           └── voidable-hooks.js   # Pre-built JS hooks
└── demo/                 # Phoenix demo app for testing
    ├── mix.exs
    ├── lib/demo_web/
    └── assets/
```

## Implementation Phases

### Phase A: JS Hooks (npm side)
1. `src/hooks.ts` — VoidEvent hook that bridges CustomEvents to pushEvent
2. `src/dom.ts` — onBeforeElUpdated callback for DOM patch protection
3. `src/index.ts` — exports

### Phase B: HEEx Components (Hex side)
1. Create `hex/` directory with mix.exs for `voidable_ui` package
2. Implement HEEx function components for all 43 components
3. Each component: `attr` declarations matching @property decorators, slot for children, renders `<void-*>` tag
4. Components that need event bridging add `phx-hook="VoidEvent"` + `data-void-events`

### Phase C: Demo App Integration
1. Wire `@voidable/ui` + `@voidable/theme` into demo app's esbuild
2. Add VoidHooks to LiveSocket config
3. Create demo LiveView pages showcasing each component
4. Test event flow: click → CustomEvent → pushEvent → server handler → assign update → re-render

## Component Categories

**Static (no JS hooks needed):** badge, divider, spinner, skeleton, status-dot, avatar, tag, progress, panel, card, breadcrumbs, stepper, error-fallback, banner, nav-bar

**Interactive (need VoidEvent hook):** button, switch, input, textarea, select, checkbox, radio, radio-group, checkbox-group, field, multiselect, combobox, slider, file-upload, dialog, drawer, tabs, accordion, popover, tooltip, toast, hamburger, pagination, compose-input, list

## Key Decisions

1. **Function components, not LiveComponents** — matches Petal pattern; stateless, composable, no extra server process per component
2. **Generic VoidEvent hook** — one hook handles all event types via `data-void-events`, rather than one hook per component
3. **npm + Hex dual package** — JS hooks ship via npm (importable in esbuild), HEEx components ship via Hex
4. **No Alpine.js dependency** — use vanilla JS hooks, matching Fluxon's approach
