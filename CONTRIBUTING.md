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
mise run test:server                          # server-backed: starts the Rails demo and drives it (needs Ruby from mise.toml)
mise run test:coverage                        # unit-test coverage per package (reported, not enforced)
```

Locally, an engine that is not installed or cannot load its system libraries is skipped with a warning; in CI every engine must run. If WebKit cannot run on your distribution, run Playwright's server in its Docker image and point the suite at it: `docker run --rm --network host --init mcr.microsoft.com/playwright:v1.65.1-noble npx -y playwright@1.65.1 run-server --port 3333 --host 127.0.0.1`, then `VOID_WEBKIT_WS=ws://127.0.0.1:3333/ mise run test:browser`. A failing run leaves traces and screenshots in `tests/browser/test-results/`; open one with `tests/browser/node_modules/.bin/playwright show-trace <trace.zip>`.

**Adding a test.** Put the markup in `tests/browser/pages/<name>.html` (a fragment; the server wraps it with the theme and `ui.js`, served at `/<name>`), or `pages/<name>.mjs` for a page that keeps server state. Write `specs/<area>.spec.ts` with `test`, `expect`, `load` and `settle` from `helpers/test.ts`. Wait on components, never on time: `settle(page)` resolves every `updateComplete` plus two frames, and `expect(...)` and `expect.poll` retry. Page errors and console errors fail a test automatically. Performance budgets live in `tests/browser/budgets.ts`, and the axe baseline in `tests/browser/axe-baseline.json` (regenerate it with `VOID_UPDATE_AXE_BASELINE=1` after reviewing the change). A server-backed app is an entry in `tests/browser/server/apps.mjs` plus specs in `tests/browser/server/<app>/`.

**Expected failures.** A test for a known defect asserts the correct behaviour and starts with `expectedFailure('#61', 'what is wrong', { browsers? })`, keyed to `helpers/known-issues.ts`. It runs and is reported but does not turn the suite red, and when the defect is fixed the test passes, which Playwright reports as a failure until the marker is removed. Defects without an issue use an `untracked:` key until one is filed. Do not delete or skip a test because it fails.

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

There are no manual version bumps. Each package has its own release workflow in `.github/workflows/`. When a push to `master` changes files under a package's path, its workflow runs the full CI (`mise run ci`, the same check pull requests get), then creates a prefixed git tag (for example `ui-v`, `theme-v`, `ui-react-v`) from the conventional commits since the last tag, and publishes. The version is taken from the tag at publish time. Pushes to `master` that release `@voidable/ui` or `@voidable/theme` also redeploy the docs and Storybook to GitHub Pages, so merge only what you are ready to ship.

## Security

Please report vulnerabilities privately; see [SECURITY.md](SECURITY.md).
