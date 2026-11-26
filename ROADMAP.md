# Voidable Roadmap

What 1.0 promises and what must land before it is on the [Road to 1.0](docs/src/content/docs/guides/road-to-1-0.mdx) page. Browser support is on [Browser support](docs/src/content/docs/guides/browser-support.mdx) and what real screen readers said is on [Screen reader results](docs/src/content/docs/guides/screen-reader-results.mdx); the open decisions on both (the support policy, testing the floor, tests by people) are listed on the road to 1.0.

## Current State

**66 components** (78 custom element tags) shipped across `@voidable/ui` + `@voidable/theme`, all with Storybook stories. Counts are derived from `packages/ui/src` (one file per component in `src/components/`, one tag per `customElements.define`); the docs site computes them at build time.

**Framework adapter packages** (Vue, Solid, Svelte and Angular need no package: `@voidable/ui` ships generated typings in `@voidable/ui/types/*` and an Angular forms accessor in `@voidable/ui/angular`):
- `@voidable/ui-react` — React 18/19 — **implemented** (typed wrappers, event bridging, ref forwarding, useTheme hook)
- `@voidable/ui-liveview` — Phoenix LiveView 1.0+ — **implemented** (VoidHooks JS + HEEx function components)
- `@voidable/ui-hotwire` — Stimulus/Turbo — **implemented** (VoidTurbo morph integration + Ruby gem helpers)
- `@voidable/ui-alpine` — Alpine.js — **implemented** (x-void-on directive, x-void-preserve, $voidable magic)

---

## Phase 1: Free/OSS Components (15 remaining)

Frequency based on survey of 10 OSS libraries (shadcn, Radix, Chakra, Mantine, DaisyUI, Flowbite, Park UI, Headless UI, Ark UI, HeroUI). See [COMPONENT-RESEARCH.md](COMPONENT-RESEARCH.md) for full data.

### Tier A — 8+/10 OSS libraries

| Component | Freq | Description |
|-----------|------|-------------|
| ~~Dropdown Menu~~ | 9/10 | ✅ Shipped — `<void-dropdown-menu>` + `<void-dropdown-menu-item>` |
| ~~Menu~~ | 8/10 | ✅ Shipped — `<void-menu>` + `<void-menu-item>` + `<void-menu-group>` |
| ~~Carousel~~ | 8/10 | ✅ Shipped — `<void-carousel>` + `<void-carousel-item>` |
| ~~Calendar / Date Picker~~ | 8/10 | ✅ Shipped — `<void-calendar>` + `<void-date-picker>` |
| ~~Number Input~~ | 8/10 | ✅ Shipped — `<void-number-input>` |

### Tier B — 6–7/10 OSS libraries

| Component | Freq | Description |
|-----------|------|-------------|
| ~~Toggle / Toggle Group~~ | 7/10 | ✅ Shipped — `<void-toggle>` + `<void-toggle-group>` |
| ~~Collapsible~~ | 7/10 | ✅ Shipped — `<void-collapsible>` |
| ~~Navigation Menu~~ | 7/10 | ✅ Shipped — `<void-nav-menu>` + `<void-nav-menu-item>` |
| ~~Hover Card~~ | 7/10 | ✅ Shipped — `<void-hover-card>` |
| ~~Pin Input / OTP~~ | 7/10 | ✅ Shipped — `<void-pin-input>` |
| ~~Color Picker~~ | 7/10 | ✅ Shipped — `<void-color-picker>` |
| ~~Segmented Control~~ | 7/10 | ✅ Shipped — `<void-segmented-control>` + `<void-segmented-control-item>` |
| ~~Editable~~ | 7/10 | ✅ Shipped — `<void-editable>` |
| ~~Tags Input / Pills~~ | 7/10 | ✅ Shipped — `<void-tags-input>` |
| **Rating** | 6/10 | Star/icon-based score input |
| **Toolbar** | 6/10 | Grouped row of action buttons for editors/views |
| **Fieldset** | 6/10 | Grouped form fields with legend |
| **Clipboard** | 6/10 | Copy-to-clipboard trigger |
| **Tree View** | 6/10 | Hierarchical tree navigation |
| **Listbox** | 6/10 | Accessible listbox component |
| ~~Sidebar~~ | 6/10 | ✅ Shipped — `<void-sidebar>` with configurable width and position |

### Tier C — 4–5/10 OSS libraries

| Component | Freq | Description |
|-----------|------|-------------|
| **Context Menu** | 5/10 | Right-click menu with nested items + keyboard nav |
| **Menubar** | 5/10 | Persistent horizontal menu bar with sub-menus |
| **Alert Dialog** | 5/10 | Confirmation/destructive dialog variant |
| **Timeline** | 5/10 | Vertically ordered event list with connectors |
| ~~Stat / Statistic~~ | 5/10 | ✅ Shipped — `<void-stat>` with label, value, delta, and trend |
| **Password Input** | 5/10 | Input with show/hide toggle |
| **Splitter / Resizable** | 5/10 | Draggable handle resizing adjacent panels |
| ~~Indicator~~ | 4/10 | ✅ Shipped — `<void-indicator>` with count, ping animation, and color variants |
| **KBD** | 4/10 | Inline keyboard shortcut rendering |
| **Speed Dial / FAB** | 4/10 | Floating action button with radial menu |
| **QR Code** | 4/10 | QR code generator display |

---

### Named in the API review (#23)

The API review before 1.0 listed what is still missing against mainstream libraries. Each is in the tiers above or here; the review normalised the existing components and added none of these.

| Component | Where |
|-----------|-------|
| Rating, Toolbar, Fieldset, Tree View, Listbox | Tier B above |
| Context Menu, Menubar, Alert Dialog, Timeline, Password Input, Splitter, KBD | Tier C above |
| Area, pie, scatter and sparkline charts | Not yet tiered: chart types beside bar, donut, line and gauge |
| Data grid | Partly shipped ([#89](https://github.com/VoidableUI/Voidable/issues/89)): `void-table` sorts (one column, text, number and date), filters (all or chosen columns, an empty part, a live count), selects (rows, range, select-all with a mixed state, form value, "all N rows" across server pages) and has a `manual` server mode for LiveView, Livewire and Turbo, with its words in the messages catalogue and select-all by keyboard as an opt-in key action. Remaining, not tiered: virtualised rows, per-column filters, multi-column sort, column resizing and reordering, inline editing, grouping, export, and client-side pagination of filtered rows |
| A visually hidden data table for charts | Shipped in 0.10: a chart is a `figure` with a visually hidden data table |
| Translatable built-in strings ("Close", "No options found", "Calendar", "PIN input") | Shipped in 0.12.0: the messages registry (`@voidable/ui/messages`) with French and Arabic, following `lang`; every built-in string, the table's included, is a message |

The renames of what authors write shipped in 0.8 ([API conventions](docs/src/content/docs/guides/conventions.mdx)). Left for a later release, because they add rather than rename:

- **Naming**: `aria-label` on the host as the accessible name everywhere, and `label` only where visible label text is rendered (spinner, table, number input).
- **Manifest types** that say what markup can express (tags input `value`, colour picker `swatches`).
- **Error fallback** heading as a part only.

Shipped from this list ([#67](https://github.com/VoidableUI/Voidable/issues/67)): value reflection as one rule (every control reflects its current `value`; the exceptions are a password field, a masked PIN input and the file upload, written in the [API conventions](docs/src/content/docs/guides/conventions.mdx) and checked in a browser by the eval contract), and the leftover `falseString` support, removed from the manifest build, the checker and the generators.

---

## Phase 2: Premium Components (17 remaining, 1 partially shipped)

Enterprise-grade components surveyed across 10 premium libraries (Syncfusion, Telerik/Kendo, AG Grid, DevExtreme, MUI X, Ant Design Pro, PrimeReact/Vue, Vaadin, Infragistics, Wijmo). See [COMPONENT-RESEARCH.md](COMPONENT-RESEARCH.md) for full data.

### Tier A — 8+/10 premium libraries

| Component | Freq | Description | Complexity |
|-----------|------|-------------|------------|
| **Data Grid** | 10/10 | Sortable/filterable/groupable virtual-scroll table with inline editing, column pinning, CSV/Excel export | Million-row perf, complex cell rendering, keyboard nav |
| **Chart Suite** | 10/10 | Line, bar, area, pie, scatter, financial, sparklines, gauges, real-time streaming, drill-down | GPU rendering, breadth of chart types. **Partially shipped:** `<void-bar-chart>`, `<void-line-chart>`, `<void-donut-chart>`, `<void-gauge>`. Remaining: area, scatter, sparklines, financial, streaming, drill-down |
| **Tree Grid** | 9/10 | Hierarchical data grid with expand/collapse + full grid features | Tree ops reconciled with tabular features at infinite depth |

### Tier B — 6–7/10 premium libraries

| Component | Freq | Description | Complexity |
|-----------|------|-------------|------------|
| **Pivot Table** | 7/10 | Drag-and-drop field restructuring with real-time aggregation | OLAP calculation engine + drag-and-drop zones |
| **Gantt Chart** | 6/10 | Project timeline with dependencies, milestones, critical path | Dependency graph resolution, zoom levels |
| **Scheduler / Calendar** | 6/10 | Full event calendar with day/week/month/timeline views, drag-to-reschedule, recurring events | Date math, timezone handling, collision layout |
| **Rich Text Editor** | 6/10 | WYSIWYG with tables, images, mentions, track-changes | ContentEditable cross-browser issues, collaborative editing |

### Tier C — 4–5/10 premium libraries

| Component | Freq | Description | Complexity |
|-----------|------|-------------|------------|
| **Spreadsheet** | 5/10 | Excel-like with formulas, merged cells, freeze panes | Formula parser, dependency graph, cell virtualization |
| **File Manager** | 5/10 | Explorer-style file browser with tree/grid, drag-and-drop | Tree+grid sync, lazy loading, backend adapters |
| **Map / Geo Visualization** | 5/10 | Interactive map with markers, regions, heatmaps | Tile rendering, GeoJSON, projection math |
| **PDF Viewer** | 4/10 | In-browser PDF rendering with annotations, form filling, search | Full rendering engine without server dependencies |
| **Kanban / Task Board** | 4/10 | Drag-and-drop card lanes with swimlanes and WIP limits | Drag-and-drop between columns, state persistence |
| **Diagram / Flowchart** | 4/10 | Node-and-edge canvas with auto-layout and snap-to-grid | Graph layout algorithms, SVG/Canvas rendering |
| **OrgChart** | 4/10 | Hierarchical org tree with expand/collapse and card nodes | Tree layout, zoom/pan, responsive resizing |

### Tier D — 2–3/10 premium libraries

| Component | Freq | Description | Complexity |
|-----------|------|-------------|------------|
| **Barcode** | 3/10 | 1D/2D barcode generator (Code128, EAN, DataMatrix) | Encoding standards, print-resolution rendering |
| **Document Editor** | 2/10 | Word-processor-style WYSIWYG with pagination and print layout | Pagination engine, import/export docx |
| **Image Editor** | 2/10 | Crop, rotate, filter, annotate with undo/redo | Canvas rendering, filter pipeline, touch support |

---

## Phase 3: Framework Adapters

Framework adapter packages (`@voidable/ui-*`) expose `@voidable/ui` Lit web components to each framework's idioms. Guides for Vue, Solid, Svelte, Angular, Lit, Qwik, Astro and vanilla JS exist on the docs site; they are guides, not packages. Server-side companions: `live_voidable` (Hex), `voidable-hotwire` (RubyGems), `voidable/laravel` (Composer).

### Adapter Status

| Framework | Status | What's shipped | What's remaining |
|-----------|--------|----------------|------------------|
| **React** | ✅ Done | Typed wrappers for the UI components (chart elements not yet wrapped), `onVoidX` event bridging, ref forwarding, `useTheme` hook | — |
| **LiveView** | ✅ Done | `VoidHooks` JS (mount/update/destroy lifecycle, listener diffing), HEEx function components for the UI components (chart elements not yet covered) with phx-hook wiring | — |
| **Hotwire** | ✅ Done | `VoidTurbo` morph integration, Ruby gem `Helpers` module (`void_attrs`) | — |
| **Alpine** | ✅ Done | `VoidableAlpine` plugin, `x-void-on` directive, `x-void-preserve`, `$voidable` magic | — |
| **Angular** | ✅ No package | Guide: `CUSTOM_ELEMENTS_SCHEMA`, `VoidValueAccessor` in `@voidable/ui/angular` (`ngModel`, `formControl`, `formControlName` on every form control, generated from the manifest) | Typed templates (Angular does not type-check custom element bindings) |
| **Vue** | ✅ No package | Guide, generated typings (`@voidable/ui/types/vue`) | `v-model` (use property + event) |
| **Solid** | ✅ No package | Guide, generated typings for Solid 1 and 2 (`@voidable/ui/types/solid`, `solid2`) | — |
| **Svelte** | ✅ No package | Guide, generated typings (`@voidable/ui/types/svelte`) | `bind:` (not possible on custom elements; use property + event) |

---

## Dependency Graph

```
Phase 1 (free components) ──┐
                             ├──▶ Phase 3 (adapters wrap all components)
Phase 2 (premium components) ┘
```

Phases 1 and 2 can proceed in parallel since both add to `@voidable/ui`. Phase 3 should come after at least Phase 1 is complete so adapters cover the full component set.
