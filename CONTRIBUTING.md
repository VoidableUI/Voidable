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
