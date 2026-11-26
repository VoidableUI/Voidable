# Agent evals

Does an AI coding agent build working interfaces with Voidable? This harness answers that functionally: it gives a model a UI task, renders what the model wrote in headless Chromium against the built library and theme, and scores whether it works. It is the measuring half of #54 and #27.

It costs money in live mode and is not deterministic, so it is **not** part of `mise run ci`. Its own unit tests are (`mise run evals:test`).

## Run it

```bash
mise run evals:setup                       # build the library and the voidable CLI, install the Blade fixture, warm HEEx
mise run evals -- list                     # the task set
mise run evals -- run --tasks pilot --mode stub          # harness check, no key, no cost
export ANTHROPIC_API_KEY=...               # only read from the environment; never written anywhere
mise run evals -- run --tasks pilot --models claude-haiku-5-5 --run-id pilot-haiku
mise run evals -- estimate pilot-haiku --reps 3 --models claude-haiku-5-5,claude-sonnet-5-5
mise run evals -- run --reps 3 --models claude-haiku-5-5,claude-sonnet-5-5 --run-id full
mise run evals -- report full --baseline --label "first live baseline"
```

`run` options: `--tasks pilot|<id>,...` (default all), `--conditions none,ref,skill` (default all three), `--models` (default `claude-haiku-5-5`, the cheapest that gives a stable signal; `claude-sonnet-5-5`, `claude-opus-5-5` and `claude-fable-5-2` are priced in `lib/report.mjs`), `--reps N`, `--effort low|medium|high` (default `medium`), `--concurrency N` (default 4), `--mode live|stub|replay`, `--from <run>` (for replay), `--run-id`, `--resume` (skip cases already in the run).

Each run writes `results/runs/<run-id>/` (gitignored): `results.jsonl` (one line per case, streamed, so an interrupted run keeps what it finished), `outputs/` (what the agent wrote), `cassettes/` (the API exchange), `cases/` (the rendered pages), and `summary.md` + `results.json` from the report.

### Modes

- **live**: the Claude API through the official TypeScript SDK (`@anthropic-ai/sdk`) and its tool runner (`client.beta.messages.toolRunner`, full history every turn). Needs `ANTHROPIC_API_KEY`; the key is passed explicitly, so a local profile is never picked up. Every exchange is recorded as a cassette with request bodies and responses only, never headers.
- **replay**: answers from the cassettes of an earlier run (`--from`). The real tool runner and tools run again, so a recorded run re-scores exactly, offline and for free, after a change to the scorer or the library.
- **stub**: a local scripted agent (`lib/stub.mjs`) that looks up the task's components, checks and writes the task's reference solution. It tests the harness end to end. Its numbers say nothing about any model and its token counts are byte estimates; the report says so.

## Conditions

What the agent knows about Voidable besides the task. Everything else (the project description, the `write_file` tool) is identical, so comparing conditions isolates the value of the reference and the skill.

| Condition | System prompt | Tools |
|---|---|---|
| `none` | the package names `@voidable/ui` and `@voidable/theme` | `write_file` |
| `ref` | plus the `voidable ref` index (one line per element) | plus `voidable_ref(tag)` |
| `skill` | plus the generated skill (`voidable skill install`, SKILL.md) | plus `voidable_ref`, `voidable_check`, `voidable_snippet`, `read_skill_file`: what an agent with `voidable mcp` has |

The tools call the same `voidable` binary the CLI and MCP server use, so the agent sees exactly the shipped reference.

## Tasks

28 tasks in `tasks/`, one file each, phrased as a developer would and without Voidable specifics (`lib/tasks.mjs` rejects a prompt that mentions `void-` or `slot=`). They cover a sign-in form, settings sections, a data table with toolbar, row actions and pagination, dashboards with stats and charts, confirm dialogs, a multi-step form with validation, sidebar app shells, tabs, filterable comboboxes, toasts, a date range, an empty state, file uploads, master-detail drawers, a dark/light toggle, radio and checkbox groups, server validation errors and a pricing switcher, across six formats:

| Format | Rendered by | Notes |
|---|---|---|
| HTML | the document as written, library injected into `<head>` | |
| React (TSX) | esbuild, React 19, mounted into `#root` | `@voidable/ui-react` is available |
| Svelte 5 | `svelte/compiler` + esbuild, mounted into `#app` | |
| Rails ERB + Turbo | ActionView 8 (`fixtures/erb/render.rb`) | route helpers answered from task data; Turbo helpers shimmed; Turbo JS not loaded |
| Phoenix HEEx | Phoenix LiveView 1.1's HEEx engine (`fixtures/heex/render.exs`, versions from `packages/liveview/hex/mix.lock`) | no socket: the dead render is tested |
| Laravel Blade + Livewire | Illuminate View 13 (`fixtures/blade/render.php`) | Livewire directives render nothing; `wire:*` attributes pass through |

The server templates are rendered by the real template engines with the task's `data` as assigns and then loaded as static pages. Server round-trips (Turbo responses, LiveView events, Livewire requests) are not exercised, which the task prompts state as "client-side behaviour must work before the socket connects".

`pilot` is five tasks across formats: `sign-in-html`, `confirm-dialog-html`, `data-table-react`, `tabs-heex`, `settings-erb`.

### Add a task

1. Create `tasks/<id>.mjs` exporting `{ id, title, format, components, prompt, data?, file?, checks }`. `components` are the elements a good solution uses (for the per-component report). `data` becomes the assigns of server templates; put client data in the prompt.
2. Write each check as `{ id, title, run: async (t) => ... }` against roles, labels and visible text. `t` (`lib/expect.mjs`) has `t.role`, `t.label`, `t.text`, `t.visible`, `t.hidden`, `t.click(role, name)`, `t.fill(label, value)`, `t.choose(label, option)` (select, radio, segmented, listbox), `t.pickDate(label, iso)` (types or pages a calendar), `t.submission()` (the last form submit or fetch body as `{ field: [values] }`), `t.field(sub, name, expected)`, `t.description(el)`, `t.chart(name)`, `t.navigations()`. Never select by `void-*` tag or internal class.
3. Write the reference solution `solutions/<id>.<ext>` the way a careful author who knows the library would.
4. `mise run evals:calibrate`: the reference must pass every check. A check the reference cannot pass is either a broken check or a library defect; fix the check, or leave it and it is reported as "library-blocked".
5. `mise run evals:test`.

## Scoring

Every case gets these assertions, each pass or fail:

| Assertion | Pass when |
|---|---|
| `static` | `voidable check` reports nothing; findings are kept with rule, element, attribute and value |
| `render` | the bundler or template engine accepted the file |
| task checks | each check passes in Chromium at 1280×800 (submissions are captured client-side, nothing reaches a server) |
| `console` | no console error and no uncaught exception while loading and using the page |
| `layout` | the page is not wider than the viewport at 390 px |
| `a11y` | axe-core (WCAG 2.x A/AA) reports no serious or critical violation |

A case passes when all of its assertions pass. The report gives the task pass rate (share of cases that pass) and the assertion pass rate, with mean, standard deviation and range over repetitions, per model and condition; then by format, by component and by assertion kind; token use, cache reads, turns, tool calls and cost per case; and the failure clusters: wrong markup by rule/element/attribute/value, functional failures by check, render errors, console errors, axe violations and overflow, each with example cases.

**Calibration.** `results/calibration.json` holds how the reference solutions score. A check that the reference also fails is "library-blocked" and left out of the agent's score. axe violations on a `void-*` element that the references also trigger (for example the unnamed host `role="textbox"` of `void-input`) are library defects and not held against the agent; violations in the agent's own markup still count. Both are listed in the report.

**Baseline.** `report --baseline` appends the run's summary per model and condition to `results/baseline.json` (committed). The next report shows the change in task pass rate against the last baseline of the same kind (stub runs are never compared with real ones).

## Selector and state contract

`CONTRACT.md` (generated from `contract/contract.mjs` with `mise run evals -- contract`) lists for every element its role, where its accessible name comes from, the stable handles for its state, and the gaps where nothing stable exists. `test/contract.test.mjs` checks it against the manifest and in Chromium. It also checks the value reflection rule (`contract/value.mjs`): every control with a `value` reflects it to the attribute after a user change, a property set and an attribute write, or is listed there with the reason it does not, so a control that stops following the rule fails the test.

## Layout

```
bin/evals.mjs        CLI
lib/                 agent (SDK tool runner), conditions, formats, cassette, stub, render, browser, score, expect, report, calibrate
tasks/  solutions/   the task set and its reference solutions
fixtures/            ERB, HEEx and Blade renderers; shared task data
contract/            selector and state contract
results/             calibration.json, baseline.json (committed); runs/ (gitignored)
test/                unit, scoring and contract tests
```
