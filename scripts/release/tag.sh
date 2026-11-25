#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
#
# Create and push the unified release tag v$VERSION at $SHA (unless DRY_RUN).
#
#   VERSION=0.8.0 SHA=<commit> scripts/release/tag.sh
#
# Idempotent: if the tag already exists on origin at $SHA, nothing happens;
# if it exists at another commit, the release stops (a version is never
# reassigned). The tag is pushed with the workflow's GITHUB_TOKEN, and tags
# pushed that way do not start other workflows, so this cannot loop.
set -euo pipefail

VERSION="${VERSION:?set VERSION}"
DRY_RUN="${DRY_RUN:-true}"
REMOTE="${REMOTE:-origin}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
SHA="$(git rev-parse "${SHA:-HEAD}^{commit}")"
TAG="v$VERSION"

existing="$(git ls-remote --tags "$REMOTE" "refs/tags/$TAG^{}" "refs/tags/$TAG" | awk '{print $1}' | head -n1 || true)"
if [ -n "$existing" ]; then
  # Prefer the peeled commit of an annotated tag.
  peeled="$(git ls-remote --tags "$REMOTE" "refs/tags/$TAG^{}" | awk '{print $1}')"
  target="${peeled:-$existing}"
  if [ "$target" != "$SHA" ]; then
    echo "ERROR: $TAG already exists on $REMOTE at $target, not $SHA" >&2
    exit 1
  fi
  result="exists   $TAG at $SHA"
elif [ "$DRY_RUN" = "true" ]; then
  result="would    tag $TAG at $SHA and push it to $REMOTE"
else
  git -c user.name="github-actions[bot]" -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
    tag -a "$TAG" "$SHA" -m "Voidable $TAG"
  git push "$REMOTE" "refs/tags/$TAG"
  result="created  $TAG at $SHA"
fi
echo "$result"
# shellcheck disable=SC2016 # literal Markdown fences
[ -z "${GITHUB_STEP_SUMMARY:-}" ] || printf '### Tag\n```\n%s\n```\n' "$result" >> "$GITHUB_STEP_SUMMARY"
