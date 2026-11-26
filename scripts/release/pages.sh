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
if [ -n "${VOIDABLE_VERSION:-}" ]; then export VOIDABLE_VERSION="v${VOIDABLE_VERSION#v}"; fi
# The docs measure the bundle themselves (docs/src/lib/stats.ts runs scripts/release/bundle-size.mjs).
echo "docs: version ${VOIDABLE_VERSION:-(newest tag)}, bundle $(node scripts/release/bundle-size.mjs)"

# The component pages read the voidable tool's snippets (docs/src/lib/component-data.mjs).
(cd tools/voidable && mise install go && VOIDABLE_SKIP_UI_BUILD=1 mise run build:go)

pnpm --filter docs build
pnpm --filter @voidable/storybook build

rm -rf _site
mkdir -p _site
cp -r docs/dist/. _site/
cp -r storybook-static _site/storybook

# The visual review gallery of this commit, at /gallery/ (tests/browser/shots): every
# reference page in every theme and skin, dark and light, at 1440 and 390 px. It needs
# Chromium; the images are stored as lossless WebP. A failure here must not stop the docs
# deploying, so it is a warning and the site goes out without /gallery/.
if [ "${VOIDABLE_SKIP_GALLERY:-}" != "1" ]; then
  if node tests/browser/shots/capture.mjs --out tmp/shots/site --gallery _site/gallery --webp; then
    echo "gallery: $(du -sh _site/gallery | cut -f1) at /gallery/"
  else
    echo "::warning::the visual review gallery could not be built; deploying the site without /gallery/" >&2
    rm -rf _site/gallery
  fi
fi
