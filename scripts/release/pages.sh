#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
#
# Build the GitHub Pages site (docs at the root, Storybook under /storybook)
# into _site. Deploying is the workflow's job.
#
#   VOIDABLE_VERSION=0.8.0 scripts/release/pages.sh
#
# VOIDABLE_VERSION is the version the docs quote; without it the docs read
# the newest vX.Y.Z tag.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

pnpm --filter './packages/*' build

dist="packages/ui/dist"
test -d "$dist" || { echo "::error::$dist missing" >&2; exit 1; }
bytes="$(find "$dist" -name '*.js' -type f -exec cat {} + | gzip -c | wc -c)"
test "$bytes" -gt 0 || { echo "::error::bundle size came up zero" >&2; exit 1; }
VOIDABLE_BUNDLE_SIZE="$(awk -v b="$bytes" 'BEGIN { printf "%.1f kB", b / 1024 }')"
export VOIDABLE_BUNDLE_SIZE
if [ -n "${VOIDABLE_VERSION:-}" ]; then export VOIDABLE_VERSION="v${VOIDABLE_VERSION#v}"; fi
echo "docs: version ${VOIDABLE_VERSION:-(newest tag)}, bundle $VOIDABLE_BUNDLE_SIZE"

# The component pages read the voidable tool's snippets (docs/src/lib/component-data.mjs).
(cd tools/voidable && mise install go && VOIDABLE_SKIP_UI_BUILD=1 mise run build:go)

pnpm --filter docs build
pnpm --filter @voidable/storybook build

rm -rf _site
mkdir -p _site
cp -r docs/dist/. _site/
cp -r storybook-static _site/storybook
