# Voidable Roadmap

## Current State

**43 components** shipped across `@voidable/ui` + `@voidable/theme`, all with Storybook stories and vitest tests.

**6 framework adapter packages** scaffolded (empty shells):
- `@voidable/ui-react` — React 18/19
- `@voidable/ui-vue` — Vue 3.4+
- `@voidable/ui-solid` — Solid 1.8+
- `@voidable/ui-svelte` — Svelte 5+
- `@voidable/ui-angular` — Angular 18/19/20
- `@voidable/ui-liveview` — Phoenix LiveView 1.0+

---

## Phase 1: Free/OSS Components (32 remaining)

Frequency based on survey of 10 OSS libraries (shadcn, Radix, Chakra, Mantine, DaisyUI, Flowbite, Park UI, Headless UI, Ark UI, HeroUI). See [COMPONENT-RESEARCH.md](COMPONENT-RESEARCH.md) for full data.

### Tier A — 8+/10 OSS libraries

| Component | Freq | Description |
|-----------|------|-------------|
| **Dropdown Menu** | 9/10 | Trigger-based action menu, distinct from select |
| **Menu** | 8/10 | Contextual/command palette menu |
| **Carousel** | 8/10 | Horizontally scrollable slideshow with prev/next |
| **Calendar / Date Picker** | 8/10 | Calendar-based date selection input |
| **Number Input** | 8/10 | Numeric input with increment/decrement steppers |

### Tier B — 6–7/10 OSS libraries

| Component | Freq | Description |
|-----------|------|-------------|
| **Toggle / Toggle Group** | 7/10 | Pressable on/off button; group for multi-option |
| **Collapsible** | 7/10 | Simple expand/collapse for a single section |
| **Navigation Menu** | 7/10 | Horizontal nav with dropdowns/mega-menus |
| **Hover Card** | 7/10 | Rich content preview on hover |
| **Pin Input / OTP** | 7/10 | Single-char inputs for verification codes |
| **Color Picker** | 7/10 | Color selection via spectrum, swatches, or hex |
| **Segmented Control** | 7/10 | Pill-style toggle between mutually exclusive options |
| **Editable** | 7/10 | Inline editable text field |
| **Tags Input / Pills** | 7/10 | Multi-tag input with add/remove |
| **Rating** | 6/10 | Star/icon-based score input |
| **Toolbar** | 6/10 | Grouped row of action buttons for editors/views |
| **Fieldset** | 6/10 | Grouped form fields with legend |
| **Clipboard** | 6/10 | Copy-to-clipboard trigger |
| **Tree View** | 6/10 | Hierarchical tree navigation |
| **Listbox** | 6/10 | Accessible listbox component |
| **Sidebar** | 6/10 | Collapsible side navigation shell |

### Tier C — 4–5/10 OSS libraries

| Component | Freq | Description |
|-----------|------|-------------|
| **Context Menu** | 5/10 | Right-click menu with nested items + keyboard nav |
| **Menubar** | 5/10 | Persistent horizontal menu bar with sub-menus |
| **Alert Dialog** | 5/10 | Confirmation/destructive dialog variant |
| **Timeline** | 5/10 | Vertically ordered event list with connectors |
| **Stat / Statistic** | 5/10 | KPI display block with value + delta |
| **Password Input** | 5/10 | Input with show/hide toggle |
| **Splitter / Resizable** | 5/10 | Draggable handle resizing adjacent panels |
| **Indicator** | 4/10 | Notification dot/badge overlaid on another element |
| **KBD** | 4/10 | Inline keyboard shortcut rendering |
| **Speed Dial / FAB** | 4/10 | Floating action button with radial menu |
| **QR Code** | 4/10 | QR code generator display |

---

## Phase 2: Premium Components (17 remaining)

Enterprise-grade components surveyed across 10 premium libraries (Syncfusion, Telerik/Kendo, AG Grid, DevExtreme, MUI X, Ant Design Pro, PrimeReact/Vue, Vaadin, Infragistics, Wijmo). See [COMPONENT-RESEARCH.md](COMPONENT-RESEARCH.md) for full data.

### Tier A — 8+/10 premium libraries

| Component | Freq | Description | Complexity |
|-----------|------|-------------|------------|
| **Data Grid** | 10/10 | Sortable/filterable/groupable virtual-scroll table with inline editing, column pinning, CSV/Excel export | Million-row perf, complex cell rendering, keyboard nav |
| **Chart Suite** | 10/10 | Line, bar, area, pie, scatter, financial, sparklines, gauges, real-time streaming, drill-down | GPU rendering, breadth of chart types |
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

1. **React** — largest user base
2. **Vue** — second largest, well-defined CE interop
3. **Solid** — minimal work (native CE support)
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
