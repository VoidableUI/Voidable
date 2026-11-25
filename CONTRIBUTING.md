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

**What a release does**, in order: CI once; create and push the `vX.Y.Z` tag; publish `@voidable/theme` and `@voidable/ui`; publish the eight adapters; push the gem, publish the Hex package and split `voidable/laravel` to its mirror; create the GitHub release with notes generated from the commits since the previous release; deploy the docs and Storybook.

### How to cut a release

1. Merge to `master` with at least one releasing commit (`feat:`, `fix:`, ...) under `packages/`. That is all: the push releases.
2. To see what would happen first, run `mise run release:plan` locally (prints the version and why), or `mise run release:dry-run` to build, pack and verify every package at that version without publishing anything.
3. To dry-run on GitHub, run the **Release** workflow manually (Actions, Release, Run workflow) with *dry run* ticked. It builds and packs everything, prints what would be published to the run summary, and publishes nothing.

### When a release fails partway

Fix the cause, then either use **Re-run failed jobs** on the failed run, or run the **Release** workflow manually on `master` with *dry run* unticked. The tag is created before anything is published, so the commit resolves to the same version again, and every step skips what is already on its registry. If `master` has moved on since, run the workflow from the release tag instead (*Use workflow from*: `v0.8.0`), which resumes exactly that release; the next push to `master` then releases the newer commits as the next version. Do not delete a published tag: a version number is never reused.

Write breaking changes as `type!:` (or a `BREAKING CHANGE:` footer). While Voidable is 0.x they bump the minor version, never 1.0.0.

## Security

Please report vulnerabilities privately; see [SECURITY.md](SECURITY.md).
