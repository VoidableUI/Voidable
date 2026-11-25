#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
#
# Test, build, verify and (unless DRY_RUN) push the voidable-hotwire gem.
#
#   VERSION=0.8.0 scripts/release/gem.sh
#
# DRY_RUN defaults to true. The gem's VERSION is stamped into the checkout
# (the gemspec reads it) and its CDN pins derive from it; the check below
# loads the built gem and asserts the pins carry VERSION. Credentials come
# from rubygems/configure-rubygems-credentials (trusted publishing) in CI.
set -euo pipefail

VERSION="${VERSION:?set VERSION}"
DRY_RUN="${DRY_RUN:-true}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT="${OUT:-$ROOT/release-artifacts}/gem"
GEM_DIR="$ROOT/packages/hotwire/gem"
cd "$ROOT"

restore() { node "$ROOT/scripts/release/stamp.mjs" 0.0.0 >/dev/null; }
[ "${KEEP_STAMP:-false}" = "true" ] || trap restore EXIT
node scripts/release/stamp.mjs "$VERSION" >/dev/null
node scripts/release/check.mjs --stamped "$VERSION"

cd "$GEM_DIR"
for t in test/*_test.rb; do ruby -Ilib -Itest "$t"; done

mkdir -p "$OUT"
gem="$OUT/voidable-hotwire-$VERSION.gem"
gem build voidable-hotwire.gemspec --output "$gem"

# Inspect the built artefact, not the source tree.
unpacked="$(mktemp -d)"
gem unpack "$gem" --target "$unpacked" >/dev/null
built_version="$(gem spec "$gem" version | sed -n 's/^version: *//p')"
[ "$built_version" = "$VERSION" ] || { echo "built gem version $built_version != $VERSION" >&2; exit 1; }
EXPECT="$VERSION" ruby -I "$unpacked/voidable-hotwire-$VERSION/lib" -e '
  require "voidable/hotwire/cdn"
  c = Voidable::Hotwire::CDN
  v = ENV.fetch("EXPECT")
  pins = { "UI_URL" => c::UI_URL, "UI_HOTWIRE_URL" => c::UI_HOTWIRE_URL, "THEME_CSS_URL" => c::THEME_CSS_URL }
  pins.each { |k, url| puts "#{k} #{url}" }
  bad = pins.reject { |_, url| url.include?("@#{v}/") }
  abort("pins do not carry #{v}: #{bad.keys.join(", ")}") unless bad.empty?
  abort("VERSION is #{Voidable::Hotwire::VERSION}") unless Voidable::Hotwire::VERSION == v
'
grep -q 'Voidable::Hotwire::CDN::UI_URL' "$unpacked/voidable-hotwire-$VERSION/config/importmap.rb"

if [ "$(node "$ROOT/scripts/release/registry.mjs" published gem "$VERSION")" = "true" ]; then
  result="skip     voidable-hotwire $VERSION (already on RubyGems)"
elif [ "$DRY_RUN" = "true" ]; then
  result="would    voidable-hotwire $VERSION ($gem)"
else
  gem push "$gem"
  result="publish  voidable-hotwire $VERSION"
fi
echo "$result"
# shellcheck disable=SC2016 # literal Markdown fences
[ -z "${GITHUB_STEP_SUMMARY:-}" ] || printf '### RubyGems %s\n```\n%s\n```\n' "$VERSION" "$result" >> "$GITHUB_STEP_SUMMARY"
