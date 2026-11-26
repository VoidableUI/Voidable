#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
#
# Build, pack, verify and (unless DRY_RUN) publish the npm packages.
#
#   VERSION=0.8.0 scripts/release/npm.sh core      # @voidable/theme, @voidable/ui
#   VERSION=0.8.0 scripts/release/npm.sh adapters  # the four @voidable/ui-* adapters
#   VERSION=0.8.0 scripts/release/npm.sh all
#
# DRY_RUN defaults to true: nothing is published unless DRY_RUN=false.
# Tarballs land in $OUT (default release-artifacts/npm). A version already on
# the registry is skipped, so a re-run after a partial failure continues.
# Publishing uses npm trusted publishing (OIDC), so no token is read here.
set -euo pipefail

GROUP="${1:?usage: npm.sh core|adapters|all}"
VERSION="${VERSION:?set VERSION}"
DRY_RUN="${DRY_RUN:-true}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT="${OUT:-$ROOT/release-artifacts}/npm"
cd "$ROOT"

restore() { node "$ROOT/scripts/release/stamp.mjs" 0.0.0 >/dev/null; }
[ "${KEEP_STAMP:-false}" = "true" ] || trap restore EXIT

mapfile -t PACKAGES < <(GROUP="$GROUP" node --input-type=module -e "
  import { npmPackages, CORE } from './scripts/release/lib.mjs';
  const g = process.env.GROUP;
  for (const p of npmPackages()) {
    const core = CORE.includes(p.name);
    if (g === 'all' || (g === 'core') === core) console.log(p.name + ' ' + p.dir);
  }")
[ "${#PACKAGES[@]}" -gt 0 ] || { echo "no packages for group $GROUP" >&2; exit 1; }

node scripts/release/stamp.mjs "$VERSION"
node scripts/release/check.mjs --stamped "$VERSION"

# Every adapter needs the core's build output (types). Every package in the
# group is built before it is packed, the theme included: its exports point at
# dist/, and 0.8.0 went to npm without it because this step skipped the theme.
pnpm --filter @voidable/ui build
for entry in "${PACKAGES[@]}"; do
  name="${entry%% *}"
  case "$name" in @voidable/ui) ;; *) pnpm --filter "$name" build ;; esac
done

mkdir -p "$OUT"
summary=()
for entry in "${PACKAGES[@]}"; do
  name="${entry%% *}"; dir="${entry#* }"
  slug="${name#@}"; slug="${slug//\//-}"
  tgz="$OUT/$slug-$VERSION.tgz"
  rm -f "$tgz"
  # pnpm pack rewrites workspace:* to the exact stamped sibling version.
  (cd "$dir" && pnpm pack --pack-destination "$OUT" >/dev/null)
  [ -f "$tgz" ] || { echo "pnpm pack did not produce $tgz" >&2; exit 1; }
  node scripts/release/inspect-npm.mjs "$tgz" "$VERSION"

  if [ "$(node scripts/release/registry.mjs published npm "$name" "$VERSION")" = "true" ]; then
    summary+=("skip     $name@$VERSION (already on npm)")
  elif [ "$DRY_RUN" = "true" ]; then
    npm publish "$tgz" --access public --dry-run >/dev/null 2>&1 || { npm publish "$tgz" --access public --dry-run; exit 1; }
    summary+=("would    $name@$VERSION  ($tgz)")
  else
    npm publish "$tgz" --access public --provenance
    summary+=("publish  $name@$VERSION")
  fi
done

printf '%s\n' "${summary[@]}"
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  { echo "### npm ($GROUP) $VERSION$([ "$DRY_RUN" = "true" ] && echo ' (dry run)')"; echo '```'; printf '%s\n' "${summary[@]}"; echo '```'; } >> "$GITHUB_STEP_SUMMARY"
fi
