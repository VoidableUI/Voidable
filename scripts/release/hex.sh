#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
#
# Test, build, verify and (unless DRY_RUN) publish the live_voidable Hex package.
#
#   VERSION=0.8.0 scripts/release/hex.sh
#
# DRY_RUN defaults to true. Hex evaluates a dependency's mix.exs on the
# consumer's machine, so the version must be a literal in mix.exs: it is
# stamped into the checkout here and travels in the package. Publishing reads
# HEX_API_KEY (Hex has no trusted publishing).
set -euo pipefail

VERSION="${VERSION:?set VERSION}"
DRY_RUN="${DRY_RUN:-true}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT="${OUT:-$ROOT/release-artifacts}/hex"
cd "$ROOT"

restore() { node "$ROOT/scripts/release/stamp.mjs" 0.0.0 >/dev/null; }
[ "${KEEP_STAMP:-false}" = "true" ] || trap restore EXIT
node scripts/release/stamp.mjs "$VERSION" >/dev/null
node scripts/release/check.mjs --stamped "$VERSION"

cd packages/liveview/hex
mix local.hex --force --if-missing >/dev/null
mix deps.get
mix test

mkdir -p "$OUT"
tarball="$OUT/live_voidable-$VERSION.tar"
mix hex.build --output "$tarball"

# The outer tarball's metadata.config is what Hex indexes.
meta="$(tar -xOf "$tarball" metadata.config)"
echo "$meta" | grep -E '<<"(name|version)">>'
echo "$meta" | grep -q "{<<\"version\">>,<<\"$VERSION\">>}" || { echo "hex metadata does not carry $VERSION" >&2; exit 1; }
tar -xOf "$tarball" contents.tar.gz | tar -xzO mix.exs | grep -q "version: \"$VERSION\"" || { echo "packed mix.exs does not carry $VERSION" >&2; exit 1; }
tar -xOf "$tarball" contents.tar.gz | tar -tz | grep -qx llms.txt || { echo "the hex package does not carry llms.txt" >&2; exit 1; }

if [ "$(node "$ROOT/scripts/release/registry.mjs" published hex "$VERSION")" = "true" ]; then
  result="skip     live_voidable $VERSION (already on Hex)"
elif [ "$DRY_RUN" = "true" ]; then
  result="would    live_voidable $VERSION ($tarball)"
else
  : "${HEX_API_KEY:?HEX_API_KEY is not set}"
  mix hex.publish --yes
  result="publish  live_voidable $VERSION"
fi
echo "$result"
# shellcheck disable=SC2016 # literal Markdown fences
[ -z "${GITHUB_STEP_SUMMARY:-}" ] || printf '### Hex %s\n```\n%s\n```\n' "$VERSION" "$result" >> "$GITHUB_STEP_SUMMARY"
