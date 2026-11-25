# @voidable/storybook

Storybook for Voidable UI components. This package is private and not published to npm.

## Development

From the repository root, run everything through mise (never call pnpm directly):

```bash
mise run install
mise run storybook
```

Opens Storybook at [http://localhost:6006](http://localhost:6006).

## Build

```bash
mise run storybook_build
```

The task is defined in `.mise/tasks/storybook:build`; run `mise tasks` to see the exact name your mise version exposes. The static site is written to `storybook-static/` at the repository root.

## Documentation

- [Live Storybook](https://voidable.dev/storybook/)
- [Docs](https://voidable.dev)
- [GitHub](https://github.com/VoidableUI/Voidable)
