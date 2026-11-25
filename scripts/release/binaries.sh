#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
#
# Build the `voidable` binaries for the release at $VERSION.
#
#   VERSION=0.8.0 scripts/release/binaries.sh
#
# Output: $OUT/binaries/dist (archives and checksums.txt, what is released)
# and $OUT/binaries/raw (bare executables). Nothing is published here: the
# workflow attests and uploads them in separate steps (see release.yml).
#
# Order matters, and it is what keeps the embedded library in step with the
# release: stamp the version, build @voidable/ui and the theme from that
# stamped checkout, copy manifest and assets into the Go embed directory
# (`build:assets`, which also writes the VERSION file `voidable install`
# vendors), and only then compile. binaries.mjs ends by running the built
# binary's `install` and comparing the files with this checkout's build.
set -euo pipefail

VERSION="${VERSION:?set VERSION}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export OUT="${OUT:-$ROOT/release-artifacts}"
cd "$ROOT"

restore() { node "$ROOT/scripts/release/stamp.mjs" 0.0.0 >/dev/null; }
[ "${KEEP_STAMP:-false}" = "true" ] || trap restore EXIT

node scripts/release/stamp.mjs "$VERSION" >/dev/null
node scripts/release/check.mjs --stamped "$VERSION"

# Only what tools/voidable/mise.toml adds for the build (the pinned Go), explicitly:
# CI runs with MISE_TASK_RUN_AUTO_INSTALL=false.
(cd tools/voidable && mise install go)
# Builds @voidable/ui (stamped) and the theme, then copies manifest and assets.
(cd tools/voidable && mise run build:assets)

grep -qx "$VERSION" tools/voidable/internal/infra/embedded/data/assets/VERSION \
  || { echo "embedded assets are not at $VERSION" >&2; exit 1; }

# The pinned Go itself, without `mise x` installing the other tools of that directory.
GO="$(cd tools/voidable && mise which go)"
export GO VERSION
node scripts/release/binaries.mjs build
