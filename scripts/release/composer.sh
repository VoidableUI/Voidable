#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
#
# Test and (unless DRY_RUN) release voidable/laravel to its split repository.
#
#   VERSION=0.8.0 scripts/release/composer.sh
#
# Packagist cannot read a package from a monorepo subdirectory, so the
# package lives in a read-only mirror (VoidableUI/laravel) that Packagist
# watches. Composer takes the version from the mirror's git tag, so
# composer.json has no version field and nothing is stamped: this script
# copies the tracked files of packages/alpine/laravel at $SHA into the mirror,
# commits on top of the mirror's history (a fast-forward, never a force push),
# and tags the commit v$VERSION.
#
# SPLIT_REMOTE is the push URL (default: the mirror over SSH, authenticated by
# the deploy key loaded into ssh-agent in CI) and FETCH_REMOTE the anonymous
# read URL. Point both at a local bare repository to exercise the push path
# locally. A tag that already exists on
# the mirror means this version is done, so a re-run skips it.
set -euo pipefail

VERSION="${VERSION:?set VERSION}"
DRY_RUN="${DRY_RUN:-true}"
SKIP_TESTS="${SKIP_TESTS:-false}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PKG_DIR="packages/alpine/laravel"
SPLIT_REPO="VoidableUI/laravel"
SPLIT_REMOTE="${SPLIT_REMOTE:-git@github.com:$SPLIT_REPO.git}"
FETCH_REMOTE="${FETCH_REMOTE:-https://github.com/$SPLIT_REPO.git}"
SPLIT_BRANCH="${SPLIT_BRANCH:-master}"
TAG="v$VERSION"
cd "$ROOT"
SHA="${SHA:-$(git rev-parse HEAD)}"

if [ "$SKIP_TESTS" != "true" ]; then
  (cd "$PKG_DIR" && composer validate --no-check-publish --no-check-lock \
    && composer install --no-interaction --prefer-dist --no-progress \
    && vendor/bin/phpunit)
fi
node -e "if ('version' in require('./$PKG_DIR/composer.json')) { console.error('composer.json must not set a version'); process.exit(1) }"

work="$(mktemp -d)"
# The mirror is public: read it anonymously, push with the deploy key.
git clone --quiet --branch "$SPLIT_BRANCH" "$FETCH_REMOTE" "$work/mirror"

if git -C "$work/mirror" ls-remote --exit-code --tags origin "refs/tags/$TAG" >/dev/null 2>&1; then
  result="skip     voidable/laravel $TAG (tag already on $FETCH_REMOTE)"
else
  # Replace the mirror's tree with the package's tracked files at $SHA.
  find "$work/mirror" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
  git archive "$SHA" "$PKG_DIR" | tar -x -C "$work"
  cp -a "$work/$PKG_DIR/." "$work/mirror/"
  git -C "$work/mirror" add -A
  changes="$(git -C "$work/mirror" status --porcelain | wc -l | tr -d ' ')"
  echo "voidable/laravel $TAG from $SHA: $changes changed path(s) in the mirror"
  git -C "$work/mirror" status --short | head -50

  if [ "$DRY_RUN" = "true" ]; then
    result="would    voidable/laravel $TAG ($changes changed path(s), push to $SPLIT_REMOTE $SPLIT_BRANCH)"
  else
    git -C "$work/mirror" -c user.name="github-actions[bot]" -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
      commit --quiet --allow-empty -m "Release $TAG" -m "From VoidableUI/Voidable@$SHA ($PKG_DIR)."
    git -C "$work/mirror" -c user.name="github-actions[bot]" -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
      tag -a "$TAG" -m "voidable/laravel $TAG"
    git -C "$work/mirror" remote set-url --push origin "$SPLIT_REMOTE"
    git -C "$work/mirror" push --quiet origin "HEAD:refs/heads/$SPLIT_BRANCH"
    git -C "$work/mirror" push --quiet origin "refs/tags/$TAG"
    result="publish  voidable/laravel $TAG (pushed to $SPLIT_REPO; Packagist updates from its webhook)"
  fi
fi
echo "$result"
# shellcheck disable=SC2016 # literal Markdown fences
[ -z "${GITHUB_STEP_SUMMARY:-}" ] || printf '### Composer %s\n```\n%s\n```\n' "$VERSION" "$result" >> "$GITHUB_STEP_SUMMARY"
