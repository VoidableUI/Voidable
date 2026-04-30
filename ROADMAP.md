# Voidable Roadmap

## Current State

**37 components** shipped across `@voidable/ui` + `@voidable/theme`, all with Storybook stories and vitest tests (851 tests passing).

**6 framework adapter packages** scaffolded (empty shells):
- `@voidable/ui-react` — React 18/19
- `@voidable/ui-vue` — Vue 3.4+
- `@voidable/ui-solid` — Solid 1.8+
- `@voidable/ui-svelte` — Svelte 5+
- `@voidable/ui-angular` — Angular 18/19/20
- `@voidable/ui-liveview` — Phoenix LiveView 1.0+

---

## Phase 1: Missing Free/OSS Components

Components commonly found in 3+ major free UI libraries (shadcn, Radix, Chakra, Mantine, DaisyUI, Flowbite, Park UI) that we don't have yet.

### Tier A — Found in 6+ libraries (high priority)

| Component | Description |
|-----------|-------------|
| **Dropdown Menu** | Trigger-based action menu, distinct from select |
| **Toggle / Toggle Group** | Pressable on/off button; group for multi-option |
| **Collapsible** | Simple expand/collapse for a single section |
| **Context Menu** | Right-click menu with nested items + keyboard nav |
| **Date Picker** | Calendar-based date selection input |
| **Number Input** | Numeric input with increment/decrement steppers |
| **Navigation Menu** | Horizontal nav with dropdowns/mega-menus |

### Tier B — Found in 4-5 libraries

| Component | Description |
|-----------|-------------|
| **Aspect Ratio** | Constrains child to a width-to-height ratio |
| **Carousel** | Horizontally scrollable slideshow with prev/next |
| **Rating** | Star/icon-based score input |
| **Timeline** | Vertically ordered event list with connectors |
| **Hover Card** | Rich content preview on hover |
| **Pin Input** | Single-char inputs for OTP/verification codes |
| **Kbd** | Inline keyboard shortcut rendering |
| **Segmented Control** | Pill-style toggle between mutually exclusive options |
| **Resizable / Splitter** | Draggable handle resizing adjacent panels |
| **Color Picker** | Color selection via spectrum, swatches, or hex |

### Tier C — Found in 3 libraries

| Component | Description |
|-----------|-------------|
| **Indicator** | Notification dot/badge overlaid on another element |
| **Menubar** | Persistent horizontal menu bar with sub-menus |
| **Toolbar** | Grouped row of action buttons for editors/views |

---

## Phase 2: Premium Components

Enterprise-grade components that justify paid tiers. These are the components found in Syncfusion, Telerik, AG Grid, DevExtreme, and MUI X but rarely in free libraries.

| Component | Description | Complexity |
|-----------|-------------|------------|
| **Data Grid** | Sortable/filterable/groupable virtual-scroll table with inline editing, column pinning, CSV/Excel export | Million-row perf, complex cell rendering, keyboard nav |
| **Pivot Table** | Drag-and-drop field restructuring with real-time aggregation | OLAP calculation engine + drag-and-drop zones |
| **Scheduler / Calendar** | Full event calendar with day/week/month/timeline views, drag-to-reschedule, recurring events | Date math, timezone handling, collision layout |
| **Gantt Chart** | Project timeline with dependencies, milestones, critical path | Dependency graph resolution, zoom levels |
| **Rich Text Editor** | WYSIWYG with tables, images, mentions, track-changes | ContentEditable cross-browser issues, collaborative editing |
| **Spreadsheet** | Excel-like with formulas, merged cells, freeze panes | Formula parser, dependency graph, cell virtualization |
| **Tree Grid** | Hierarchical data grid with expand/collapse + full grid features | Tree ops reconciled with tabular features at infinite depth |
| **Chart Suite** | Financial charts, real-time streaming, 3D, drill-down | GPU rendering, breadth of chart types |
| **PDF Viewer** | In-browser PDF rendering with annotations, form filling, search | Full rendering engine without server dependencies |
| **File Manager** | Explorer-style file browser with tree/grid, drag-and-drop | Tree+grid sync, lazy loading, backend adapters |

---

## Phase 3: Framework Adapters

All 6 framework packages need implementation. The adapters expose `@voidable/ui` Lit web components to each framework's idioms.

### Adapter Strategy per Framework

| Framework | Strategy | What ships |
|-----------|----------|------------|
| **React** | `createComponent()` wrappers + hooks (useTheme, etc.) | Typed React components wrapping each web component, event mapping (`onVoidChange`), ref forwarding |
| **Vue** | Vue plugin + `defineCustomElement` config | Auto-registered custom elements, `v-model` support, typed props |
| **Solid** | Hooks only (Solid has native CE support via JSX) | Composables (createTheme, etc.), TypeScript module augmentation for JSX |
| **Svelte** | Svelte components wrapping CEs | Typed Svelte wrappers with two-way binding, event forwarding |
| **Angular** | `CUSTOM_ELEMENTS_SCHEMA` + directive wrappers | NgModule/standalone directives, `[(ngModel)]` support, typed templates |
| **LiveView** | JS hooks + HEEx components | Phoenix.LiveView.JS hooks for client-side interactivity, HEEx function components for markup, phx-* event bridging |

### Implementation Order

1. **React** — largest user base, reference adapters exist in `ref/adapters/`
2. **Vue** — second largest, well-defined CE interop
3. **Solid** — minimal work (native CE support), reference adapter exists
4. **Angular** — needs `CUSTOM_ELEMENTS_SCHEMA` + directive wrappers
5. **Svelte** — Svelte 5 has good CE support, thin wrappers
6. **LiveView** — unique Elixir/Phoenix integration, JS hooks pattern

---

## Dependency Graph

```
Phase 1 (free components) ──┐
                             ├──▶ Phase 3 (adapters wrap all components)
Phase 2 (premium components) ┘
```

Phases 1 and 2 can proceed in parallel since both add to `@voidable/ui`. Phase 3 should come after at least Phase 1 is complete so adapters cover the full component set.
