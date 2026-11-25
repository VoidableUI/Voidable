#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
#
# Write release notes and (unless DRY_RUN) create or update the GitHub release.
#
#   VERSION=0.8.0 PREVIOUS_TAG=v0.7.0 scripts/release/github-release.sh [files...]
#
# Notes come from the conventional commits since PREVIOUS_TAG (for the first
# unified release, the newest legacy per-package tag). Re-running updates the
# existing release instead of failing. Needs GH_TOKEN with contents: write.
set -euo pipefail

VERSION="${VERSION:?set VERSION}"
DRY_RUN="${DRY_RUN:-true}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT="${OUT:-$ROOT/release-artifacts}"
cd "$ROOT"
TAG="v$VERSION"

mkdir -p "$OUT"
notes="$OUT/release-notes.md"
node scripts/release/notes.mjs "$VERSION" "${PREVIOUS_TAG:-}" "${SHA:-HEAD}" > "$notes"
[ -z "${GITHUB_STEP_SUMMARY:-}" ] || { echo "### Release notes for $TAG"; echo; cat "$notes"; } >> "$GITHUB_STEP_SUMMARY"

if [ "$DRY_RUN" = "true" ]; then
  cat "$notes"
  echo "would    create GitHub release $TAG with $# file(s): $*"
  exit 0
fi

if gh release view "$TAG" >/dev/null 2>&1; then
  gh release edit "$TAG" --title "$TAG" --notes-file "$notes"
  [ "$#" -eq 0 ] || gh release upload "$TAG" "$@" --clobber
  echo "updated  GitHub release $TAG"
else
  gh release create "$TAG" --verify-tag --title "$TAG" --notes-file "$notes" "$@"
  echo "created  GitHub release $TAG"
fi
