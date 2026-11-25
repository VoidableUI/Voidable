## What and why

<!-- Summarize the change and link the issue (Refs #123). -->

## Checklist

- [ ] `mise run ci` passes locally
- [ ] Commit messages follow conventional commits (`feat(ui): ...`, `fix(theme): ...`, `docs: ...`)
- [ ] No visual CSS added to `@voidable/ui`; no hardcoded colors (use `var(--void-*)`)
- [ ] Docs and Storybook stories updated if behavior or attributes changed
- [ ] Heads up: merging to `master` triggers package releases for changed paths
