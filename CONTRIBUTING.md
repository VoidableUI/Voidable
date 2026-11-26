# Contributing

Thanks for helping. This is a short guide; [AGENTS.md](AGENTS.md) has the full architecture and conventions.

## Workflow

All tooling runs through [mise](https://mise.jdx.dev). Do not call npm or pnpm directly.

```bash
mise run install   # install dependencies
mise run build     # build all packages
mise run test      # run tests
mise run lint      # ESLint with lit-a11y
mise run ci        # everything CI runs
mise run storybook # develop components in Storybook
mise run docs      # docs dev server
```

Run `mise tasks` for the complete list. Run `mise run ci` before opening a pull request.

## Browser tests

`tests/browser` is a [Playwright](https://playwright.dev) suite that loads the built packages into Chromium, Firefox and WebKit and drives them with real input. CI runs it as its own `browser` job; `mise run ci` does not, because it would need browsers.

```bash
mise run test:browser:install                 # once: download the browsers (add -- --with-deps on Debian/Ubuntu)
mise run test:browser                         # build, then run every spec on every engine, then the perf budgets
VOID_BROWSERS=chromium mise run test:browser  # one engine
mise run test:browser -- specs/forms.spec.ts --project=firefox
mise run test:server                          # server-backed: starts the Rails, Phoenix and Laravel demos and drives each (needs Ruby, Erlang/Elixir and PHP from mise.toml)
VOID_SERVER_APPS=phoenix mise run test:server # one app (rails, phoenix, laravel)
mise run test:coverage                        # unit-test coverage per package (reported, not enforced)
```

Locally, an engine that is not installed or cannot load its system libraries is skipped with a warning; in CI every engine must run. If WebKit cannot run on your distribution, run Playwright's server in its Docker image and point the suite at it: `docker run --rm --network host --init mcr.microsoft.com/playwright:v1.65.1-noble npx -y playwright@1.65.1 run-server --port 3333 --host 127.0.0.1`, then `VOID_WEBKIT_WS=ws://127.0.0.1:3333/ mise run test:browser`. A failing run leaves traces and screenshots in `tests/browser/test-results/`; open one with `tests/browser/node_modules/.bin/playwright show-trace <trace.zip>`.

**Adding a test.** Put the markup in `tests/browser/pages/<name>.html` (a fragment; the server wraps it with the theme and `ui.js`, served at `/<name>`), or `pages/<name>.mjs` for a page that keeps server state. Write `specs/<area>.spec.ts` with `test`, `expect`, `load` and `settle` from `helpers/test.ts`. Wait on components, never on time: `settle(page)` resolves every `updateComplete` plus two frames, and `expect(...)` and `expect.poll` retry. Page errors and console errors fail a test automatically. Performance budgets live in `tests/browser/budgets.ts`, and the axe baseline in `tests/browser/axe-baseline.json` (regenerate it with `VOID_UPDATE_AXE_BASELINE=1` after reviewing the change). A server-backed app is an entry in `tests/browser/server/apps.mjs` plus specs in `tests/browser/server/<app>/`.

**Expected failures.** A test for a known defect asserts the correct behaviour and starts with `expectedFailure('#61', 'what is wrong', { browsers? })`, keyed to `helpers/known-issues.ts`. It runs and is reported but does not turn the suite red, and when the defect is fixed the test passes, which Playwright reports as a failure until the marker is removed. Defects without an issue use an `untracked:` key until one is filed. Do not delete or skip a test because it fails. `VOID_RUN_EXPECTED=1 mise run test:browser` runs the marked tests as ordinary tests, which shows whether each still fails for the reason it names. The `browser`, `server` (Rails), `phoenix` and `laravel` jobs of `.github/workflows/ci.yml` must all pass before a release is tagged, because `release.yml` calls `ci.yml`.

**Overlay coverage.** `specs/overlays.spec.ts` covers each overlay on its own page (`pages/overlays.html`). `specs/overlay-stress.spec.ts` covers what only shows under load, with real input and on all three engines: four overlays nested (`pages/overlay-deep.html`), overlays inside `overflow: hidden`, transformed and scrolled containers, every overlay at all four viewport corners at 1440x900 and 390x844 (`pages/overlay-corners.html`, `?corner=tl|tr|bl|br&only=<kind>`), focus return when the opener was removed, a `void-close` the page cancels, the `detail.reason` of every close route, no leaked nodes, listeners, top-layer entries or scroll lock after fifty open and close cycles, and the same overlays through a Turbo, morphdom and Alpine morph while open. A failure that shows in one engine only is an expected failure whose `{ browsers: [...] }` names it.

**Server toolchains.** `mise run test:server` uses Ruby, Erlang/Elixir and PHP from `mise` when installed, and otherwise from `PATH` (as CI provides them through `ruby/setup-ruby`, `erlef/setup-beam` and `shivammathur/setup-php`, with versions read from `mise.toml`). Steps that touch a package registry (bundler, hex, composer) are retried up to three times, so a registry blip does not fail the run. The apps listen on 4520 (Rails), 4530 (Phoenix) and 4540 (Laravel), and the browser suite's server on 4417; set `VOID_RAILS_PORT`, `VOID_PHOENIX_PORT`, `VOID_LARAVEL_PORT` and `VOID_TEST_PORT` to run two checkouts side by side. A busy port fails the run and an existing server is never reused.

## Screen readers

`tests/browser/screen-readers` drives a real screen reader by script, VoiceOver on macOS and NVDA on Windows through [Guidepup](https://www.guidepup.dev), and asserts on what is spoken. The scenarios are data (a page and steps such as reach the next form control, activate, hear this) and each is replayed twice from the same definition: against the browser's accessibility tree in the normal browser suite (Linux, every engine, gating like any spec), and with the real screen reader.

```bash
mise run test:browser -- specs/screen-reader-tree.spec.ts   # the tree replay, any machine
mise run test:screen-readers:setup                          # once, on a Mac or a Windows machine: configure the OS, fetch the screen reader and browser
mise run test:screen-readers                                # then run the scenarios with the screen reader
mise run test:screen-readers -- --grep dialog               # one scenario
```

Do not type during a run: the screen reader owns the keyboard. A failure says which step, what was expected and the last phrases heard; every test also keeps a transcript (`spoken-phrases.json`), the spoken log, a trace and a video under `tests/browser/test-results-screen-readers/`. If the tree replay of the same scenario passes, the page is right and the wording is the screen reader's: widen the vocabulary in `screen-readers/words.ts`, never match a whole phrase. `tests/browser/screen-readers/README.md` has the tooling and versions, how to read a failure and how to add a scenario (markup on `pages/sr-<area>.html`, a `Scenario` in `scenarios.ts`, tree replay green first).

CI runs the real screen readers in `.github/workflows/screen-readers.yml` (macOS 15 with VoiceOver and WebKit, Windows Server 2025 with NVDA and Chromium) on pull requests that touch `packages/ui`, `packages/theme` or the screen-reader tests, weekly, and on demand. It is separate from `ci.yml`, has no `workflow_call`, and is not part of any release: it never gates a release. After a run, `mise run test:screen-readers:record -- <downloaded artifacts>` merges the results into `docs/src/data/screen-reader-results.json`, which the [accessibility statement](docs/src/content/docs/guides/accessibility-statement.mdx) shows; commit that file.

## Visual review

A component that works can still look wrong on a page. `tests/browser/shots` photographs the reference pages (`packages/storybook/stories/reference/`: dashboard, queue table, form, form with an open dialog, settings, empty states, a page over a photograph, a component sheet with every component in its variants, the three sizes and the eight colours, the interaction states hover, focus, pressed, disabled and invalid, and each open overlay) at 1440x900 and 390x844, in dark and light, in every theme and skin the theme package ships (read from `packages/theme/dist/exports.json`, so a new theme or skin is captured without touching the tooling). The markup lives only in those HTML files; Storybook (Reference/Screens), the docs theme builder and the capture all render them.

```bash
mise run test:browser:install                 # once; VOID_BROWSERS=chromium fetches only Chromium
mise run shots                                # the whole matrix, then the gallery: tmp/shots/gallery/index.html
mise run shots -- --page sheet,form --theme void,paper --scheme dark --width 390   # filters (comma lists): --page --theme --skin --look --scheme --width
mise run shots -- --smoke                     # a few pages in the default theme and Loft
mise run shots:compare -- master              # before/after: master against the working tree
mise run shots:compare -- v0.3.0 master       # or two refs; add the same filters
mise run shots:check                          # check a gallery in Chromium: layout, keyboard, every view, axe
```

`shots:compare` builds each ref in a temporary git worktree (`mise run build` there), photographs it with this checkout's tooling (the ref needs none of this code) and writes `tmp/shots/compare/gallery/index.html`: the images that changed, worst first, each as side by side, an overlay slider and a highlighted difference, with a count of how many changed, plus `summary.md`. Nothing but the gallery is a baseline: no screenshot is committed.

**Determinism.** A capture is repeatable on one machine: byte-identical, which two consecutive runs of the whole matrix (648 images) confirm, at any `--jobs`. It uses Chromium with software rendering (no GPU), hinting and LCD text off, sRGB, scale 1; animations and transitions finished, reduced motion, caret and scrollbars hidden; the Inter, JetBrains Mono and (for Paper's serif stack) Source Serif 4 faces bundled from `@fontsource-variable` and awaited with `document.fonts.ready`, so no network is used; a fixed clock (2026-01-15T12:00:00Z), `en-US` and UTC; the data is in the HTML. It is not identical across machines (font rasterisation and the Chromium build differ), which is why nothing is stored.

**Pull requests.** CI's `visual` job photographs the pull request's base commit and the merged head on the same runner and compares them; an image that differs differs because of the change, whatever the machine draws like. The before/after gallery is uploaded as the `visual-review` artifact (unzip, open `index.html`) and a summary is written to the run page. The verdict: if the change touches `packages/theme/`, `packages/ui/src/`, `packages/storybook/stories/reference/` a difference is expected, the job reports it and passes, and the reviewer looks at the gallery. If it touches none of those, a difference is an accident and the job fails; a commit message trailer `Visual-Change: <why>` says it is intended and turns that failure into a pass. A change that can alter the look runs the full matrix and the stories, anything else only the smoke subset. The job runs on pull requests only: it is skipped in the release path, so it cannot hold up or fail a release.

**Reviewing a design change.** Run `mise run shots:compare -- <base>` and look at the changed images at both widths, both schemes, the default theme and Loft, before opening the pull request. A pull request that changes the theme says what changed and links or attaches the gallery.

**Stories.** `--stories` also photographs every Storybook story at the default theme (dark and light, both widths) for regression only; they stay out of the gallery's main view. It needs `mise run storybook_build`.

## Tenets

These are enforced in review and partly by `lint:styles`, `lint:tokens`, `lint:undefined-tokens` and `lint:exports`:

- **No visual CSS in `@voidable/ui`.** Components are unstyled without a theme. All styling lives in `@voidable/theme`.
- **Light DOM only.** Components extend `VoidElement`; never use Shadow DOM.
- **Tokens, not literals.** Use `var(--void-*)`; never hardcode color values. Tokens have no fallbacks in the component package.
- **Theme CSS uses tag and attribute selectors** (`void-button[color="error"]`), not BEM classes.
- **Idempotent registration.** Guard `customElements.define()` with `customElements.get()`.
- **No CSS imports in the `@voidable/ui` entry point.** Loading a theme is the consumer's job.
- **No external component dependencies.** Everything is built from scratch.
- **Naming:** `--void-*` properties, `void-*` elements and events, `Void*` classes.

## Commits

Use [conventional commits](https://www.conventionalcommits.org) (Angular convention): `feat:`, `fix:`, `docs:`, `chore:`, `ci:`. Scope to the package where possible, for example `feat(ui): add void-dialog`. Reference issues in the body (`Refs #12`).

## Releases

Releasing is automatic on merge, and every package shares one version number: the npm packages, `voidable-hotwire` (RubyGems), `live_voidable` (Hex) and `voidable/laravel` (Composer) are always released together at the same version, even a package with no changes.

**How the version is chosen.** On each push to `master`, `.github/workflows/release.yml` looks at the conventional commits since the last `vX.Y.Z` tag that touch `packages/**` (Storybook excluded) or the release workflow itself:

| Commits | Bump |
|---------|------|
| `feat` | minor |
| `fix`, `perf`, `revert` | patch |
| breaking (`type!:` or a `BREAKING CHANGE:` footer) | major, but **minor** while the major version is 0 |
| anything else (`docs`, `chore`, `ci`, `test`, ...) | no release |

The highest bump wins. Docs-only pushes release nothing but redeploy the docs site and Storybook. The first unified release is 0.8.0 (above every earlier per-package version); after that the tags are plain `vX.Y.Z`.

**Nothing to bump by hand.** Every `package.json`, the gem's `VERSION` and `mix.exs` carry the placeholder `0.0.0` in the repository. The workflow stamps the computed version into its checkout before building, `pnpm pack` turns each `workspace:*` dependency into that exact version, and the gem's CDN pins derive from its own version. Composer needs no stamp: Packagist reads the tag on the `VoidableUI/laravel` mirror. `mise run lint:versions` (part of `mise run ci`) fails if a manifest holds a real version or a file hand-types one (a CDN URL, a Gemfile or `mix.exs` requirement, a demo pin): link to the latest release, derive the number, or leave it out.

**What a release does**, in order: CI once; create and push the `vX.Y.Z` tag; publish `@voidable/theme` and `@voidable/ui`; publish the four npm adapters; push the gem, publish the Hex package and split `voidable/laravel` to its mirror; create the GitHub release with notes generated from the commits since the previous release; deploy the docs and Storybook.

### How to cut a release

1. Merge to `master` with at least one releasing commit (`feat:`, `fix:`, ...) under `packages/`. That is all: the push releases.
2. To see what would happen first, run `mise run release:plan` locally (prints the version and why), or `mise run release:dry-run` to build, pack and verify every package at that version without publishing anything.
3. To dry-run on GitHub, run the **Release** workflow manually (Actions, Release, Run workflow) with *dry run* ticked. It builds and packs everything, prints what would be published to the run summary, and publishes nothing.

### When a release fails partway

Fix the cause, then either use **Re-run failed jobs** on the failed run, or run the **Release** workflow manually on `master` with *dry run* unticked. The tag is created before anything is published, so the commit resolves to the same version again, and every step skips what is already on its registry. If `master` has moved on since, run the workflow from the release tag instead (*Use workflow from*: `v0.8.0`), which resumes exactly that release; the next push to `master` then releases the newer commits as the next version. Do not delete a published tag: a version number is never reused.

Write breaking changes as `type!:` (or a `BREAKING CHANGE:` footer). While Voidable is 0.x they bump the minor version, never 1.0.0.

## Security

Please report vulnerabilities privately; see [SECURITY.md](SECURITY.md).
