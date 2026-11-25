#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
#
# Attach the voidable binaries to the GitHub release that github-release.sh
# created (unless DRY_RUN).
#
#   VERSION=0.8.0 GH_TOKEN=... scripts/release/binaries-attach.sh [dist-dir]
#
# dist-dir holds what binaries.sh produced: the archives and checksums.txt.
# They are checked against checksums.txt again before anything is uploaded.
# Re-running replaces the files already on the release (--clobber). This is a
# separate step from creating the release on purpose: the release and every
# package publish never wait for, or fail because of, the binaries.
set -euo pipefail

VERSION="${VERSION:?set VERSION}"
DRY_RUN="${DRY_RUN:-true}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIST="${1:-${OUT:-$ROOT/release-artifacts}/binaries/dist}"
TAG="v$VERSION"
cd "$ROOT"

node scripts/release/binaries.mjs verify "$DIST"
shopt -s nullglob
files=("$DIST"/*)
[ "${#files[@]}" -gt 0 ] || { echo "no files in $DIST" >&2; exit 1; }

if [ "$DRY_RUN" = "true" ]; then
  result="would    upload ${#files[@]} binary file(s) to GitHub release $TAG: ${files[*]##*/}"
else
  gh release view "$TAG" >/dev/null 2>&1 || { echo "ERROR: GitHub release $TAG does not exist yet" >&2; exit 1; }
  gh release upload "$TAG" "${files[@]}" --clobber
  result="uploaded ${#files[@]} binary file(s) to GitHub release $TAG"
fi
echo "$result"
# shellcheck disable=SC2016 # literal Markdown fences
[ -z "${GITHUB_STEP_SUMMARY:-}" ] || printf '### Binaries on the release\n```\n%s\n```\n' "$result" >> "$GITHUB_STEP_SUMMARY"
