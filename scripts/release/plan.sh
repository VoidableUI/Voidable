#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
#
# The release workflow's first job: decide what this run does.
#
#   EVENT=push BEFORE=<sha> scripts/release/plan.sh
#   EVENT=workflow_dispatch DRY_RUN_INPUT=true DEPLOY_PAGES_INPUT=false scripts/release/plan.sh
#
# Prints key=value lines (and appends them to $GITHUB_OUTPUT when set):
#   release       true when this commit releases (see version.mjs)
#   version, tag  the unified version and its vX.Y.Z tag
#   previous_tag  where the release notes start
#   dry_run       true for a manual dry run
#   publish       true when the package jobs run (a release, or any dry run)
#   pages         true when the docs and Storybook should be deployed
# Locally EVENT defaults to workflow_dispatch with a dry run.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
EVENT="${EVENT:-workflow_dispatch}"
REF="${REF:-refs/heads/master}"

dry_run=false
if [ "$EVENT" = "workflow_dispatch" ] && [ "${DRY_RUN_INPUT:-true}" = "true" ]; then dry_run=true; fi

args=(plan)
[ "$EVENT" != "push" ] || args+=(--before "${BEFORE:-}")
plan="$(node scripts/release/version.mjs "${args[@]}")"
get() { sed -n "s/^$1=//p" <<<"$plan"; }
release="$(get release)"
version="$(get version)"

# A real release runs from master, or from its own vX.Y.Z tag (to resume a
# release whose commit is no longer master's head).
if [ "$dry_run" = "false" ] && [ "$release" = "true" ] \
  && [ "$REF" != "refs/heads/master" ] && [ "$REF" != "refs/tags/v$version" ]; then
  echo "ERROR: a real release runs only from master or its own tag (this run is on $REF); use a dry run" >&2
  exit 1
fi

publish=false
if [ "$release" = "true" ] || [ "$dry_run" = "true" ]; then publish=true; fi

pages=false
case "$EVENT" in
  push) if [ "$release" = "true" ] || [ "$(get pages_changed)" = "true" ]; then pages=true; fi ;;
  workflow_dispatch)
    if [ "${DEPLOY_PAGES_INPUT:-false}" = "true" ]; then pages=true; fi
    if [ "$dry_run" = "false" ] && [ "$release" = "true" ]; then pages=true; fi
    ;;
esac
# A dry run never deploys.
[ "$dry_run" = "false" ] || pages=false

if [ "$publish" = "true" ]; then
  # Refuse a version some registry is already past (it would go backwards).
  node scripts/release/registry.mjs guard "$version"
fi

out="$(printf '%s\n' "$plan" | grep -v '^pages_changed=')
dry_run=$dry_run
publish=$publish
pages=$pages"
echo "$out"
[ -z "${GITHUB_OUTPUT:-}" ] || echo "$out" >> "$GITHUB_OUTPUT"
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "### Release plan"
    echo
    get reason
    echo
    echo '```'
    echo "$out"
    echo '```'
  } >> "$GITHUB_STEP_SUMMARY"
fi
